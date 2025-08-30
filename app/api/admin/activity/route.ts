import { NextRequest, NextResponse } from 'next/server';
import { UserActivity } from '@/types/admin';

// ユーザーアクティビティ情報を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    // TODO: 実際のデータベースから users テーブルと sessions テーブルの結合データを取得
    // 現在はモックデータを返す
    const mockActivities: UserActivity[] = [
      {
        userId: '1',
        userName: '田中太郎',
        email: 'tanaka@example.com',
        role: 'owner',
        lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
        loginCount: 234,
        status: 'active',
        createdAt: '2024-01-15T09:00:00Z'
      },
      {
        userId: '2',
        userName: '佐藤花子',
        email: 'sato@example.com',
        role: 'secretariat',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2時間前
        loginCount: 156,
        status: 'active',
        createdAt: '2024-01-20T10:30:00Z'
      },
      {
        userId: '3',
        userName: '鈴木一郎',
        email: 'suzuki@company.com',
        role: 'company_admin',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1日前
        loginCount: 89,
        status: 'active',
        createdAt: '2024-02-01T14:15:00Z'
      },
      {
        userId: '4',
        userName: '高橋美咲',
        email: 'takahashi@student.com',
        role: 'student',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3日前
        loginCount: 45,
        status: 'active',
        createdAt: '2024-02-10T11:45:00Z'
      },
      {
        userId: '5',
        userName: '山田次郎',
        email: 'yamada@inactive.com',
        role: 'student',
        lastLogin: undefined, // 未ログイン
        loginCount: 0,
        status: 'inactive',
        createdAt: '2024-03-01T08:20:00Z'
      },
      {
        userId: '6',
        userName: '渡辺三郎',
        email: 'watanabe@suspended.com',
        role: 'student',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1週間前
        loginCount: 12,
        status: 'suspended',
        createdAt: '2024-02-25T16:30:00Z'
      },
      {
        userId: '7',
        userName: '伊藤恵',
        email: 'ito@company2.com',
        role: 'company_admin',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8時間前
        loginCount: 67,
        status: 'active',
        createdAt: '2024-01-30T13:10:00Z'
      },
      {
        userId: '8',
        userName: '中村大輔',
        email: 'nakamura@student2.com',
        role: 'student',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4時間前
        loginCount: 78,
        status: 'active',
        createdAt: '2024-02-05T12:00:00Z'
      },
      {
        userId: '9',
        userName: '小林雅子',
        email: 'kobayashi@secretariat.com',
        role: 'secretariat',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12時間前
        loginCount: 203,
        status: 'active',
        createdAt: '2024-01-18T15:45:00Z'
      },
      {
        userId: '10',
        userName: '加藤智子',
        email: 'kato@company3.com',
        role: 'company_admin',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2日前
        loginCount: 34,
        status: 'active',
        createdAt: '2024-02-15T09:30:00Z'
      }
    ];

    let filteredActivities = mockActivities;

    // ステータスフィルター
    if (status) {
      filteredActivities = filteredActivities.filter(activity => activity.status === status);
    }

    // 検索フィルター
    if (search) {
      const searchLower = search.toLowerCase();
      filteredActivities = filteredActivities.filter(activity => 
        activity.userName.toLowerCase().includes(searchLower) ||
        activity.email.toLowerCase().includes(searchLower) ||
        activity.role.toLowerCase().includes(searchLower)
      );
    }

    // 最新のログインから順にソート（未ログインは最後）
    filteredActivities = filteredActivities.sort((a, b) => {
      if (!a.lastLogin && !b.lastLogin) return 0;
      if (!a.lastLogin) return 1;
      if (!b.lastLogin) return -1;
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
    });

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

    const response = {
      data: paginatedActivities,
      pagination: {
        page,
        limit,
        total: filteredActivities.length,
        totalPages: Math.ceil(filteredActivities.length / limit),
        hasNext: endIndex < filteredActivities.length,
        hasPrev: page > 1
      }
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('ユーザーアクティビティの取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザーアクティビティの取得に失敗しました'
      },
      { status: 500 }
    );
  }
}