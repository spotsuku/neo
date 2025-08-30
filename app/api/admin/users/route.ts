import { NextRequest, NextResponse } from 'next/server';
import { UserWithRoles, User } from '@/types/database';
import { PaginatedResponse, FilterOptions, UserCreationData } from '@/types/admin';

// ユーザー一覧を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // クエリパラメータを取得
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const region = url.searchParams.get('region') || '';
    const status = url.searchParams.get('status') || '';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // TODO: 実際のデータベースからユーザー情報を取得
    // 現在はモックデータを返す
    const mockUsers: UserWithRoles[] = [
      {
        id: '1',
        email: 'owner@neo.com',
        password_hash: 'hashed',
        name: '田中太郎',
        role: 'owner',
        region_id: 'ALL',
        accessible_regions: '["FUK", "ISK", "NIG"]',
        accessible_regions_parsed: ['FUK', 'ISK', 'NIG'],
        profile_image: null,
        is_active: true,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z',
        roles: [
          {
            id: '1',
            key: 'owner',
            label: 'オーナー',
            description: 'システム全体の管理権限',
            level: 100,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        id: '2',
        email: 'secretary@neo.com',
        password_hash: 'hashed',
        name: '佐藤花子',
        role: 'secretariat',
        region_id: 'FUK',
        accessible_regions: '["FUK"]',
        accessible_regions_parsed: ['FUK'],
        profile_image: null,
        is_active: true,
        created_at: '2024-01-20T10:30:00Z',
        updated_at: '2024-01-20T10:30:00Z',
        roles: [
          {
            id: '2',
            key: 'secretariat',
            label: '事務局',
            description: '地域の事務局管理権限',
            level: 80,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        id: '3',
        email: 'company@example.com',
        password_hash: 'hashed',
        name: '鈴木一郎',
        role: 'company_admin',
        region_id: 'FUK',
        accessible_regions: '["FUK"]',
        accessible_regions_parsed: ['FUK'],
        profile_image: null,
        is_active: true,
        created_at: '2024-02-01T14:15:00Z',
        updated_at: '2024-02-01T14:15:00Z',
        roles: [
          {
            id: '3',
            key: 'company_admin',
            label: '企業管理者',
            description: '企業内の管理権限',
            level: 60,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        id: '4',
        email: 'student1@example.com',
        password_hash: 'hashed',
        name: '高橋美咲',
        role: 'student',
        region_id: 'FUK',
        accessible_regions: '["FUK"]',
        accessible_regions_parsed: ['FUK'],
        profile_image: null,
        is_active: true,
        created_at: '2024-02-10T11:45:00Z',
        updated_at: '2024-02-10T11:45:00Z',
        roles: [
          {
            id: '4',
            key: 'student',
            label: '学生',
            description: '一般ユーザー権限',
            level: 10,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        id: '5',
        email: 'student2@example.com',
        password_hash: 'hashed',
        name: '山田次郎',
        role: 'student',
        region_id: 'ISK',
        accessible_regions: '["ISK"]',
        accessible_regions_parsed: ['ISK'],
        profile_image: null,
        is_active: false,
        created_at: '2024-03-01T08:20:00Z',
        updated_at: '2024-03-01T08:20:00Z',
        roles: [
          {
            id: '4',
            key: 'student',
            label: '学生',
            description: '一般ユーザー権限',
            level: 10,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        id: '6',
        email: 'admin@company2.com',
        password_hash: 'hashed',
        name: '渡辺三郎',
        role: 'company_admin',
        region_id: 'NIG',
        accessible_regions: '["NIG"]',
        accessible_regions_parsed: ['NIG'],
        profile_image: null,
        is_active: true,
        created_at: '2024-02-25T16:30:00Z',
        updated_at: '2024-02-25T16:30:00Z',
        roles: [
          {
            id: '3',
            key: 'company_admin',
            label: '企業管理者',
            description: '企業内の管理権限',
            level: 60,
            created_at: '2024-01-15T09:00:00Z'
          }
        ]
      }
    ];

    // フィルタリング
    let filteredUsers = mockUsers;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    if (region) {
      filteredUsers = filteredUsers.filter(user => user.region_id === region);
    }

    if (status) {
      const isActive = status === 'active';
      filteredUsers = filteredUsers.filter(user => user.is_active === isActive);
    }

    // ソート
    filteredUsers.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const response: PaginatedResponse<UserWithRoles> = {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
        hasNext: endIndex < filteredUsers.length,
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
    console.error('ユーザー一覧の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザー一覧の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// 新規ユーザーを作成するAPI
export async function POST(request: NextRequest) {
  try {
    const userData: UserCreationData = await request.json();

    // バリデーション
    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json(
        { error: 'Bad Request', message: '必須フィールドが入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック（実装時にはデータベースでチェック）
    // TODO: データベースでメールアドレスの重複をチェック

    // パスワードハッシュ化（実装時には適切なライブラリを使用）
    // TODO: bcryptなどでパスワードをハッシュ化

    // ユーザーをデータベースに挿入
    // TODO: データベースに新しいユーザーを挿入
    const newUserId = `user_${Date.now()}`;

    console.log('新規ユーザー作成:', {
      id: newUserId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      regionId: userData.regionId
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'ユーザーを正常に作成しました',
        userId: newUserId
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('ユーザー作成でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザーの作成に失敗しました'
      },
      { status: 500 }
    );
  }
}