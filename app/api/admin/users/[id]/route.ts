import { NextRequest, NextResponse } from 'next/server';
import { UserUpdateData } from '@/types/admin';

// 特定のユーザー情報を取得するAPI
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // TODO: データベースから特定のユーザー情報を取得
    // 現在はモックデータを返す
    const mockUser = {
      id: userId,
      email: 'user@example.com',
      name: 'サンプルユーザー',
      role: 'student',
      region_id: 'FUK',
      accessible_regions: '["FUK"]',
      accessible_regions_parsed: ['FUK'],
      profile_image: null,
      is_active: true,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z',
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
    };

    return NextResponse.json(mockUser);

  } catch (error) {
    console.error('ユーザー情報の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザー情報の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// ユーザー情報を更新するAPI
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const updateData: UserUpdateData = await request.json();

    // バリデーション
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return NextResponse.json(
          { error: 'Bad Request', message: '有効なメールアドレスを入力してください' },
          { status: 400 }
        );
      }
    }

    // TODO: データベースでユーザー情報を更新
    console.log('ユーザー更新:', {
      userId,
      updateData
    });

    // メールアドレスの重複チェック（実装時）
    // TODO: 他のユーザーと重複しないかチェック

    // データベース更新（実装時）
    // TODO: データベースのユーザー情報を更新

    return NextResponse.json({
      success: true,
      message: 'ユーザー情報を正常に更新しました'
    });

  } catch (error) {
    console.error('ユーザー更新でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザー情報の更新に失敗しました'
      },
      { status: 500 }
    );
  }
}

// ユーザーを削除するAPI
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // TODO: ユーザーに関連するデータの確認
    // 関連データがある場合は論理削除、ない場合は物理削除を検討

    // TODO: データベースからユーザーを削除
    console.log('ユーザー削除:', { userId });

    return NextResponse.json({
      success: true,
      message: 'ユーザーを正常に削除しました'
    });

  } catch (error) {
    console.error('ユーザー削除でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'ユーザーの削除に失敗しました'
      },
      { status: 500 }
    );
  }
}