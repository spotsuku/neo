// 配信キュー管理API
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-guards';
import { DatabaseService } from '@/lib/database-service';

const db = new DatabaseService();

const NotificationQueueSchema = z.object({
  id: z.string(),
  content_type: z.enum(['announcement', 'class', 'project', 'committee']),
  content_id: z.string(),
  target_roles: z.array(z.string()),
  target_regions: z.array(z.string()),
  scheduled_at: z.string(),
  status: z.enum(['pending', 'sent', 'failed']).default('pending'),
  created_at: z.string(),
});

// キューアイテム追加
export const POST = withAuth({ requiredRoles: ['owner', 'secretariat'] }, async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validatedData = NotificationQueueSchema.parse(body);

    await db.execute(`
      INSERT INTO notification_queue (
        id, content_type, content_id, target_roles, target_regions,
        scheduled_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.id,
      validatedData.content_type,
      validatedData.content_id,
      JSON.stringify(validatedData.target_roles),
      JSON.stringify(validatedData.target_regions),
      validatedData.scheduled_at,
      validatedData.status,
      validatedData.created_at
    ]);

    return NextResponse.json({
      message: '配信キューに追加しました'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Notification queue creation error:', error);
    return NextResponse.json(
      { error: '配信キューの追加に失敗しました' },
      { status: 500 }
    );
  }
});

// キュー一覧取得
export const GET = withAuth({ requiredRoles: ['owner', 'secretariat'] }, async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contentType = searchParams.get('content_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT nq.*, 
             CASE 
               WHEN nq.content_type = 'announcement' THEN a.title
               WHEN nq.content_type = 'class' THEN c.title
               WHEN nq.content_type = 'project' THEN p.title
               WHEN nq.content_type = 'committee' THEN comm.name
             END as content_title
      FROM notification_queue nq
      LEFT JOIN announcements a ON nq.content_type = 'announcement' AND nq.content_id = a.id
      LEFT JOIN classes c ON nq.content_type = 'class' AND nq.content_id = c.id
      LEFT JOIN projects p ON nq.content_type = 'project' AND nq.content_id = p.id
      LEFT JOIN committees comm ON nq.content_type = 'committee' AND nq.content_id = comm.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND nq.status = ?';
      params.push(status);
    }

    if (contentType) {
      query += ' AND nq.content_type = ?';
      params.push(contentType);
    }

    query += ' ORDER BY nq.scheduled_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json({
      queue_items: result.results,
      pagination: {
        limit,
        offset,
        total: result.results.length
      }
    });

  } catch (error) {
    console.error('Notification queue fetch error:', error);
    return NextResponse.json(
      { error: '配信キューの取得に失敗しました' },
      { status: 500 }
    );
  }
});