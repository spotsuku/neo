// お知らせ既読管理API
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-guards';
import { DatabaseService } from '@/lib/database-service';

const db = new DatabaseService();

interface RouteContext {
  params: { id: string };
}

// 既読マーク
export const POST = withAuth(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = context.params;
    const user = (request as any).user;

    // お知らせの存在確認
    const announcement = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (announcement.results.length === 0) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    // 既読レコードをUPSERT（すでに存在する場合は更新）
    await db.execute(`
      INSERT INTO announcement_reads (id, announcement_id, user_id, read_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at = ?
    `, [
      crypto.randomUUID(),
      id,
      user.id,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    return NextResponse.json({
      message: '既読にしました'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json(
      { error: '既読の更新に失敗しました' },
      { status: 500 }
    );
  }
});

// 未読に戻す
export const DELETE = withAuth(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = context.params;
    const user = (request as any).user;

    await db.execute(
      'DELETE FROM announcement_reads WHERE announcement_id = ? AND user_id = ?',
      [id, user.id]
    );

    return NextResponse.json({
      message: '未読に戻しました'
    });

  } catch (error) {
    console.error('Mark as unread error:', error);
    return NextResponse.json(
      { error: '未読の更新に失敗しました' },
      { status: 500 }
    );
  }
});