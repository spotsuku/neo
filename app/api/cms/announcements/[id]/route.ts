// 個別お知らせCMS API - 取得・更新・削除
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-guards';
import { DatabaseService } from '@/lib/database-service';
import { AnnouncementFormSchema, ContentStatus } from '@/lib/cms/announcement-service';

const db = new DatabaseService();

interface RouteContext {
  params: { id: string };
}

// 個別お知らせ取得
export const GET = withAuth(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = context.params;
    const user = (request as any).user;

    // お知らせを取得
    const result = await db.query(`
      SELECT a.*, u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    if (result.results.length === 0) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    const announcement = result.results[0];

    // 権限チェック
    const canView = canAccessAnnouncement(announcement, user);
    if (!canView) {
      return NextResponse.json(
        { error: 'このお知らせを閲覧する権限がありません' },
        { status: 403 }
      );
    }

    // ファイル添付を取得
    const attachments = await db.query(
      'SELECT id, filename, original_filename, mime_type, size FROM files WHERE content_type = ? AND content_id = ?',
      ['announcement', id]
    );
    announcement.attachments = attachments.results;

    // 既読状態を取得
    const readStatus = await db.query(
      'SELECT id FROM announcement_reads WHERE announcement_id = ? AND user_id = ?',
      [id, user.id]
    );
    announcement.is_read = readStatus.results.length > 0;

    return NextResponse.json({ announcement });

  } catch (error) {
    console.error('Announcement fetch error:', error);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました' },
      { status: 500 }
    );
  }
});

// お知らせ更新
export const PUT = withAuth(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = context.params;
    const user = (request as any).user;
    const body = await request.json();

    // 既存データを取得
    const existing = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    if (existing.results.length === 0) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    const announcement = existing.results[0];

    // 編集権限チェック
    const canEdit = canEditAnnouncement(announcement, user);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'このお知らせを編集する権限がありません' },
        { status: 403 }
      );
    }

    // バリデーション
    const validatedData = AnnouncementFormSchema.partial().parse(body);

    // 更新するフィールドを構築
    const updateFields = [];
    const updateParams = [];

    if (validatedData.title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(validatedData.title);
    }
    if (validatedData.content !== undefined) {
      updateFields.push('content = ?');
      updateParams.push(validatedData.content);
    }
    if (validatedData.priority !== undefined) {
      updateFields.push('priority = ?');
      updateParams.push(validatedData.priority);
    }
    if (validatedData.category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(validatedData.category);
    }
    if (validatedData.visibility_scope !== undefined) {
      updateFields.push('visibility_scope = ?');
      updateParams.push(validatedData.visibility_scope);
    }
    if (validatedData.target_roles !== undefined) {
      updateFields.push('target_roles = ?');
      updateParams.push(JSON.stringify(validatedData.target_roles));
    }
    if (validatedData.target_regions !== undefined) {
      updateFields.push('target_regions = ?');
      updateParams.push(JSON.stringify(validatedData.target_regions));
    }
    if (validatedData.is_pinned !== undefined) {
      updateFields.push('is_pinned = ?');
      updateParams.push(validatedData.is_pinned ? 1 : 0);
    }
    if (validatedData.read_confirmation_required !== undefined) {
      updateFields.push('read_confirmation_required = ?');
      updateParams.push(validatedData.read_confirmation_required ? 1 : 0);
    }
    if (validatedData.published_at !== undefined) {
      updateFields.push('published_at = ?', 'status = ?');
      updateParams.push(
        validatedData.published_at,
        validatedData.published_at ? ContentStatus.PUBLISHED : ContentStatus.DRAFT
      );
    }
    if (validatedData.expires_at !== undefined) {
      updateFields.push('expires_at = ?');
      updateParams.push(validatedData.expires_at);
    }

    // updated_at を追加
    updateFields.push('updated_at = ?');
    updateParams.push(new Date().toISOString());

    // クエリ実行
    updateParams.push(id);
    await db.execute(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // 新規公開時は配信キューに追加
    if (validatedData.published_at && announcement.status !== ContentStatus.PUBLISHED) {
      await db.execute(`
        INSERT INTO notification_queue (
          id, content_type, content_id, target_roles, target_regions,
          scheduled_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        'announcement',
        id,
        JSON.stringify(validatedData.target_roles || ['all']),
        JSON.stringify(validatedData.target_regions || [user.region_id]),
        validatedData.published_at,
        'pending',
        new Date().toISOString()
      ]);
    }

    // 更新されたデータを取得
    const updated = await db.query(`
      SELECT a.*, u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    return NextResponse.json({
      announcement: updated.results[0],
      message: 'お知らせを更新しました'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Announcement update error:', error);
    return NextResponse.json(
      { error: 'お知らせの更新に失敗しました' },
      { status: 500 }
    );
  }
});

// お知らせ削除
export const DELETE = withAuth(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = context.params;
    const user = (request as any).user;

    // 既存データを取得
    const existing = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    if (existing.results.length === 0) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    const announcement = existing.results[0];

    // 削除権限チェック
    const canDelete = canEditAnnouncement(announcement, user);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'このお知らせを削除する権限がありません' },
        { status: 403 }
      );
    }

    // 関連データを削除
    await db.execute('DELETE FROM announcement_reads WHERE announcement_id = ?', [id]);
    await db.execute('DELETE FROM notification_queue WHERE content_type = ? AND content_id = ?', ['announcement', id]);
    await db.execute('DELETE FROM files WHERE content_type = ? AND content_id = ?', ['announcement', id]);
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);

    return NextResponse.json({
      message: 'お知らせを削除しました'
    });

  } catch (error) {
    console.error('Announcement deletion error:', error);
    return NextResponse.json(
      { error: 'お知らせの削除に失敗しました' },
      { status: 500 }
    );
  }
});

// 権限チェック関数
function canAccessAnnouncement(announcement: any, user: any): boolean {
  // 下書きは作者のみ
  if (announcement.status === 'draft') {
    return announcement.author_id === user.id;
  }

  // アーカイブは管理者のみ
  if (announcement.status === 'archived') {
    return ['owner', 'secretariat'].includes(user.role);
  }

  // 地域制限チェック
  if (announcement.region_id !== 'ALL' && announcement.region_id !== user.region_id) {
    return false;
  }

  // ロール可視性チェック
  const targetRoles = JSON.parse(announcement.target_roles || '[]');
  if (targetRoles.length > 0 && !targetRoles.includes(user.role) && !targetRoles.includes('all')) {
    return false;
  }

  return true;
}

function canEditAnnouncement(announcement: any, user: any): boolean {
  // 作者は常に編集可能
  if (announcement.author_id === user.id) {
    return true;
  }

  // 管理者権限
  return ['owner', 'secretariat'].includes(user.role);
}