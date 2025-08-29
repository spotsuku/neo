// NEO Digital Platform - ログインAPI
// POST /api/auth/login

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/database';
import { generateJWT, verifyPassword } from '@/lib/auth';
import type { LoginRequest, LoginResponse } from '@/types/database';

// リクエストバリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string() // 開発用：パスワード長制限なし
});

// モック D1 データベース（開発用）
const mockDB = {
  prepare: (sql: string) => ({
    bind: (...params: any[]) => ({
      first: async () => {
        // 開発用のモックユーザーデータ
        if (sql.includes('SELECT * FROM users WHERE email = ?')) {
          const email = params[0];
          if (email === 'admin@neo-fukuoka.jp') {
            return {
              id: 'user_admin001',
              email: 'admin@neo-fukuoka.jp',
              password_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // 空文字のハッシュ（開発用）
              name: '福岡管理者',
              role: 'owner',
              region_id: 'FUK',
              accessible_regions: '["FUK","ISK","NIG"]',
              profile_image: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          if (email === 'company1@example.com') {
            return {
              id: 'user_comp001',
              email: 'company1@example.com',
              password_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              name: '田中企業管理者',
              role: 'company_admin',
              region_id: 'FUK',
              accessible_regions: '["FUK"]',
              profile_image: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          if (email === 'student1@example.com') {
            return {
              id: 'user_stu001',
              email: 'student1@example.com',
              password_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              name: '山田学生',
              role: 'student',
              region_id: 'FUK',
              accessible_regions: '["FUK"]',
              profile_image: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        }
        return null;
      }
    })
  })
};

export async function POST(request: NextRequest) {
  try {
    // リクエストボディ解析
    const body = await request.json();
    
    // バリデーション
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR',
          message: '入力データが無効です',
          details: result.error.errors
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // ユーザー検索
    const userService = new UserService(mockDB as any);
    const user = await userService.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { 
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが間違っています'
        },
        { status: 401 }
      );
    }

    // アクティブユーザーチェック
    if (!user.is_active) {
      return NextResponse.json(
        { 
          error: 'ACCOUNT_DISABLED',
          message: 'アカウントが無効化されています'
        },
        { status: 401 }
      );
    }

    // パスワード検証（開発用：空文字で認証成功）
    const isValidPassword = password === '' || await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが間違っています'
        },
        { status: 401 }
      );
    }

    // JWT トークン生成
    const token = await generateJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region_id: user.region_id,
      accessible_regions: user.accessible_regions,
      profile_image: user.profile_image
    });

    // レスポンス生成
    const loginResponse: LoginResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        region_id: user.region_id,
        accessible_regions: user.accessible_regions,
        profile_image: user.profile_image,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // HTTPOnlyクッキーでトークンを設定
    const response = NextResponse.json(loginResponse);
    response.cookies.set('neo-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7日間
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: 'ログイン処理中にエラーが発生しました'
      },
      { status: 500 }
    );
  }
}