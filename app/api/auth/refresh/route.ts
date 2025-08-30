// NEO Digital Platform - Token Refresh API
// POST /api/auth/refresh

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'リフレッシュトークンが必要です'),
});

type RefreshRequest = z.infer<typeof refreshSchema>;

interface CloudflareBindings {
  DB: any; // D1Database type placeholder
}

export const POST = async (request: NextRequest) => {
  const env = process.env as any as CloudflareBindings;
  
  if (!env.DB) {
    return setSecurityHeaders(new Response(
      JSON.stringify({ 
        error: 'DATABASE_UNAVAILABLE', 
        message: 'データベースに接続できません' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const authService = new AuthService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // リクエストボディ解析
    let body: RefreshRequest;
    try {
      body = await request.json();
    } catch {
      return setSecurityHeaders(new Response(
        JSON.stringify({ 
          error: 'INVALID_JSON', 
          message: '無効なJSONデータです' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // バリデーション
    const result = refreshSchema.safeParse(body);
    if (!result.success) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { refresh_token } = result.data;

    // トークンリフレッシュ実行
    const refreshResult = await authService.refreshTokens(refresh_token, request);

    if (!refreshResult.success) {
      await securityLogger.log({
        action: 'REFRESH_TOKEN_INVALID',
        ipAddress: clientIP || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        details: { error: refreshResult.error },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_REFRESH_TOKEN',
          message: refreshResult.error || 'リフレッシュトークンが無効です'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!refreshResult.user || !refreshResult.accessToken || !refreshResult.refreshToken) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'REFRESH_FAILED',
          message: 'トークンのリフレッシュに失敗しました'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'トークンを更新しました',
        user: {
          id: refreshResult.user.id,
          email: refreshResult.user.email,
          name: refreshResult.user.name,
          role: refreshResult.user.role,
          region_id: refreshResult.user.region_id,
          accessible_regions: refreshResult.user.accessible_regions,
          totp_enabled: refreshResult.user.totp_enabled || false,
          totp_verified: refreshResult.user.totp_verified || false,
        },
        tokens: {
          access_token: refreshResult.accessToken,
          refresh_token: refreshResult.refreshToken,
          expires_in: 900 // 15分
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `neo-auth-token=${refreshResult.accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=900; Path=/`
        }
      }
    );

    return setSecurityHeaders(response);

  } catch (error) {
    console.error('Token refresh error:', error);
    
    await securityLogger.log({
      action: 'REFRESH_TOKEN_ERROR',
      ipAddress: clientIP || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'トークンリフレッシュ中にエラーが発生しました'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
};

// OPTIONS method for CORS
export const OPTIONS = async () => {
  return setSecurityHeaders(new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  }));
};