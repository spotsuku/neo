// NEO Digital Platform - お知らせAPI
// GET /api/announcements - お知らせ一覧取得
// POST /api/announcements - お知らせ作成

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, withCompanyAdminAuth } from '@/lib/middleware';
import { hasResourcePermission, ResourceType, PermissionLevel } from '@/lib/permissions';
import { createAuthenticatedResponse } from '@/lib/session';
import type { Announcement, UserRole, RegionId } from '@/types/database';

// リクエストバリデーションスキーマ
const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  content: z.string().min(1, 'コンテンツは必須です'),
  summary: z.string().max(100, '要約は100文字以内で入力してください').optional(),
  target_roles: z.array(z.enum(['owner', 'secretariat', 'company_admin', 'student'])),
  is_important: z.boolean().default(false),
  region_id: z.enum(['FUK', 'ISK', 'NIG', 'ALL']).default('ALL'),
  publish_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().optional()
});

// モックデータベース（開発用）
const mockAnnouncements: (Announcement & { author_name?: string })[] = [
  {
    id: 'ann_001',
    region_id: 'FUK',
    title: '第3回NEO福岡セッション開催のお知らせ',
    content: 'NEO Digital Platform活用セッションを以下の日程で開催いたします。\n\n日時: 2024年9月15日(日) 13:00-17:00\n場所: 福岡市スタートアップカフェ\n\n今回のテーマ「地域DX推進戦略」について、各地域の取り組み事例を共有し、相互学習を深めます。',
    summary: 'NEO福岡セッション - 地域DX推進戦略',
    author_id: 'user_sec001',
    author_name: '事務局担当者',
    target_roles: ['student', 'company_admin'],
    is_published: true,
    is_important: true,
    publish_date: '2024-08-29T14:00:00Z',
    created_at: '2024-08-29T14:00:00Z',
    updated_at: '2024-08-29T14:00:00Z'
  },
  {
    id: 'ann_002',
    region_id: 'ALL',
    title: '新機能「メンバーカルテ」リリースのご案内',
    content: 'NEO Digital Platformに新機能「メンバーカルテ」を追加いたします。\n\n機能概要:\n- 個人プロフィール詳細表示\n- 学習進捗追跡\n- チーム編成情報\n\nリリース日: 2024年9月20日予定',
    summary: 'メンバーカルテ機能リリース予定',
    author_id: 'user_admin001',
    author_name: '福岡管理者',
    target_roles: ['student', 'company_admin', 'secretariat'],
    is_published: true,
    is_important: false,
    publish_date: '2024-08-29T15:00:00Z',
    created_at: '2024-08-29T15:00:00Z',
    updated_at: '2024-08-29T15:00:00Z'
  },
  {
    id: 'ann_003',
    region_id: 'ISK',
    title: '石川地域限定ワークショップのご案内',
    content: '石川地域メンバー限定でワークショップを開催します。\n\n内容: 地域ブランディング戦略\n講師: マーケティング専門家\n\n参加希望の方はお早めにお申し込みください。',
    summary: '石川地域限定ワークショップ',
    author_id: 'user_sec001', 
    author_name: '事務局担当者',
    target_roles: ['student', 'company_admin'],
    is_published: true,
    is_important: false,
    publish_date: '2024-08-29T16:00:00Z',
    created_at: '2024-08-29T16:00:00Z',
    updated_at: '2024-08-29T16:00:00Z'
  }
];

// お知らせ一覧取得
export const GET = withAuth(async (request) => {
  const user = request.user!;
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const regionFilter = searchParams.get('region') as RegionId || undefined;
  const importantOnly = searchParams.get('important') === 'true';

  try {
    // 権限チェック
    if (!hasResourcePermission(user, ResourceType.ANNOUNCEMENT, PermissionLevel.READ)) {
      return new Response(JSON.stringify({ 
        error: 'FORBIDDEN', 
        message: 'お知らせの閲覧権限がありません' 
      }), { status: 403 });
    }

    // データフィルタリング
    let filteredAnnouncements = mockAnnouncements.filter(announcement => {
      // 地域フィルタ
      const regionMatch = announcement.region_id === 'ALL' || 
                         user.accessible_regions.includes(announcement.region_id) ||
                         (!regionFilter || announcement.region_id === regionFilter);
      
      // ロールフィルタ
      const roleMatch = announcement.target_roles.includes(user.role);
      
      // 公開状態フィルタ
      const publishedMatch = announcement.is_published;
      
      // 重要度フィルタ
      const importantMatch = !importantOnly || announcement.is_important;
      
      return regionMatch && roleMatch && publishedMatch && importantMatch;
    });

    // ソート（重要度 → 作成日時）
    filteredAnnouncements.sort((a, b) => {
      if (a.is_important !== b.is_important) {
        return b.is_important ? 1 : -1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredAnnouncements.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(filteredAnnouncements.length / limit);

    return createAuthenticatedResponse({
      announcements: paginatedData,
      pagination: {
        page,
        limit,
        total: filteredAnnouncements.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, user);

  } catch (error) {
    console.error('Get announcements error:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR',
      message: 'お知らせの取得中にエラーが発生しました'
    }), { status: 500 });
  }
});

// お知らせ作成
export const POST = withCompanyAdminAuth(async (request) => {
  const user = request.user!;

  try {
    // 権限チェック
    if (!hasResourcePermission(user, ResourceType.ANNOUNCEMENT, PermissionLevel.WRITE)) {
      return new Response(JSON.stringify({ 
        error: 'FORBIDDEN', 
        message: 'お知らせの作成権限がありません' 
      }), { status: 403 });
    }

    const body = await request.json();
    const result = createAnnouncementSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: '入力データが無効です',
        details: result.error.errors
      }), { status: 400 });
    }

    const data = result.data;

    // 地域アクセス権限チェック
    if (data.region_id !== 'ALL' && !user.accessible_regions.includes(data.region_id)) {
      return new Response(JSON.stringify({ 
        error: 'FORBIDDEN', 
        message: `${data.region_id}地域への投稿権限がありません` 
      }), { status: 403 });
    }

    // 新しいお知らせ作成
    const newAnnouncement: Announcement & { author_name?: string } = {
      id: `ann_${Date.now()}`,
      region_id: data.region_id,
      title: data.title,
      content: data.content,
      summary: data.summary,
      author_id: user.id,
      author_name: user.name,
      target_roles: data.target_roles,
      is_published: true, // デフォルトで公開
      is_important: data.is_important,
      publish_date: data.publish_date || new Date().toISOString(),
      expiry_date: data.expiry_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // モックデータに追加（本番では DB 保存）
    mockAnnouncements.unshift(newAnnouncement);

    return createAuthenticatedResponse({
      message: 'お知らせを作成しました',
      announcement: newAnnouncement
    }, user, 201);

  } catch (error) {
    console.error('Create announcement error:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR',
      message: 'お知らせの作成中にエラーが発生しました'
    }), { status: 500 });
  }
});