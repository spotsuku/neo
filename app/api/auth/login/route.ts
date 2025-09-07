// NEO Portal - User Login API (Next.js Development Version)
// POST /api/auth/login

import { NextRequest } from 'next/server';
import { z } from 'zod';

// リクエストバリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
  totp_token: z.string().length(6, 'TOTPトークンは6桁である必要があります').optional(),
  remember_me: z.boolean().default(false),
});

type LoginRequest = z.infer<typeof loginSchema>;

// モック用のユーザーデータ（開発環境用）
const mockUsers = [
  {
    id: 1,
    email: 'admin@neo-portal.jp',
    name: '管理者',
    password: 'password123', // 実際の環境ではハッシュ化される
    role: 'admin',
    region_id: 1,
    accessible_regions: [1, 2, 3],
    is_active: true,
    email_verified: true,
    totp_enabled: false
  },
  {
    id: 2,
    email: 'user@neo-portal.jp',
    name: '一般ユーザー',
    password: 'password123',
    role: 'user',
    region_id: 2,
    accessible_regions: [2],
    is_active: true,
    email_verified: true,
    totp_enabled: false
  }
];

export const POST = async (request: NextRequest) => {

  try {
    // リクエストボディ解析
    let body: LoginRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          error: 'INVALID_JSON', 
          message: '無効なJSONデータです' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // バリデーション
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, remember_me } = result.data;
    const emailLower = email.toLowerCase();

    // モックユーザー検索
    const user = mockUsers.find(u => u.email === emailLower);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが間違っています'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // パスワード検証（実際の環境ではハッシュ比較）
    if (password !== user.password) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが間違っています'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // モック用のトークン生成
    const accessToken = 'mock-access-token-' + user.id + '-' + Date.now();
    const refreshToken = 'mock-refresh-token-' + user.id + '-' + Date.now();

    console.log(`ログイン成功: ${user.email} (${user.name})`);

    const cookieMaxAge = remember_me ? 604800 : 900; // 7日 or 15分

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ログインに成功しました',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          region_id: user.region_id,
          accessible_regions: user.accessible_regions,
          totp_enabled: user.totp_enabled,
          totp_verified: false,
          email_verified: user.email_verified,
          last_login_at: new Date().toISOString()
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900 // 15分
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `neo-auth-token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookieMaxAge}; Path=/`
        }
      }
    );

  } catch (error) {
    console.error('Login error:', error);

    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'ログイン中にエラーが発生しました'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// OPTIONS method for CORS
export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};