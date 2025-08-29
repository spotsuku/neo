// お知らせCMS API - 一覧取得・作成
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-guards';
import { DatabaseService } from '@/lib/database-service';
import { AnnouncementSchema, AnnouncementFormSchema, ContentStatus, VisibilityScope } from '@/lib/cms/announcement-service';

const db = new DatabaseService();

// お知らせ一覧取得
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const user = (request as any).user;

    // パラメータ解析
    const status = searchParams.get('status')?.split(',') as ContentStatus[];
    const visibility = searchParams.get('visibility')?.split(',') as VisibilityScope[];
    const region = searchParams.get('region')?.split(',');
    const author = searchParams.get('author');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // SQLクエリ構築
    let query = `
      SELECT a.*, u.name as author_name,
             COUNT(ar.id) as read_count,
             COUNT(CASE WHEN ar.user_id = ? THEN 1 END) as user_read
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
      WHERE 1=1
    `;
    const params = [user.id];

    // フィルター条件追加
    if (status?.length) {
      query += ` AND a.status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    }

    if (visibility?.length) {
      query += ` AND a.visibility_scope IN (${visibility.map(() => '?').join(',')})`;
      params.push(...visibility);
    }

    if (region?.length && !region.includes('ALL')) {
      query += ` AND a.region_id IN (${region.map(() => '?').join(',')})`;
      params.push(...region);
    }

    if (author) {
      query += ` AND a.author_id = ?`;
      params.push(author);
    }

    if (search) {
      query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // 権限チェック - 非公開コンテンツの制限
    if (!['owner', 'secretariat'].includes(user.role)) {
      query += ` AND (a.status = 'published' OR a.author_id = ?)`;
      params.push(user.id);
    }

    // 地域制限
    if (user.region_id !== 'ALL') {
      query += ` AND (a.region_id = ? OR a.region_id = 'ALL')`;
      params.push(user.region_id);
    }

    query += `
      GROUP BY a.id, u.name
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // ファイル添付情報を取得
    for (const announcement of result.results) {
      const attachments = await db.query(
        'SELECT id, filename, original_filename, mime_type, size FROM files WHERE content_type = ? AND content_id = ?',
        ['announcement', announcement.id]
      );
      announcement.attachments = attachments.results;
    }

    return NextResponse.json({
      announcements: result.results,
      pagination: {
        limit,
        offset,
        total: result.results.length, // 実際の実装では COUNT クエリを別途実行
      }
    });

  } catch (error) {
    console.error('Announcements fetch error:', error);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました' },
      { status: 500 }
    );
  }
});

// お知らせ作成
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const body = await request.json();

    // 権限チェック
    if (!['owner', 'secretariat', 'company_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'お知らせの作成権限がありません' },
        { status: 403 }
      );
    }

    // バリデーション
    const validatedData = AnnouncementFormSchema.parse(body);

    // データベースに挿入
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO announcements (
        id, title, content, status, priority, category,
        visibility_scope, target_roles, target_regions,
        is_pinned, read_confirmation_required,
        published_at, expires_at, author_id, region_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      validatedData.title,
      validatedData.content,
      validatedData.published_at ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
      validatedData.priority,
      validatedData.category,
      validatedData.visibility_scope,
      JSON.stringify(validatedData.target_roles || []),
      JSON.stringify(validatedData.target_regions || [user.region_id]),
      validatedData.is_pinned ? 1 : 0,
      validatedData.read_confirmation_required ? 1 : 0,
      validatedData.published_at || null,
      validatedData.expires_at || null,
      user.id,
      user.region_id,
      now,
      now
    ]);

    // 作成されたお知らせを取得
    const created = await db.query(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );

    // 公開時は配信キューに追加
    if (validatedData.published_at) {
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
        now
      ]);
    }

    return NextResponse.json({
      announcement: created.results[0],
      message: 'お知らせを作成しました'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Announcement creation error:', error);
    return NextResponse.json(
      { error: 'お知らせの作成に失敗しました' },
      { status: 500 }
    );
  }
});