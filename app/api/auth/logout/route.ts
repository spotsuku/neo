// NEO Portal - User Logout API
// POST /api/auth/logout

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const logoutSchema = z.object({
  all_sessions: z.boolean().default(false), // 全セッション無効化
});

type LogoutRequest = z.infer<typeof logoutSchema>;

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
    // 認証チェック
    const authUser = await authService.getAuthUser(request);
    
    // リクエストボディ解析（オプション）
    let body: LogoutRequest = { all_sessions: false };
    try {
      const requestBody = await request.json();
      const result = logoutSchema.safeParse(requestBody);
      if (result.success) {
        body = result.data;
      }
    } catch {
      // JSONパース失敗は無視（ボディなしでもログアウト可能）
    }

    const { all_sessions } = body;

    if (authUser) {
      // 認証済みユーザーのログアウト処理
      
      if (all_sessions) {
        // 全セッション無効化
        await authService.revokeAllUserSessions(authUser.id);
        
        await securityLogger.log({
          userId: authUser.id,
          action: 'LOGOUT_ALL_SESSIONS',
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          riskLevel: 'LOW'
        });
      } else {
        // 現在のセッションのみ無効化
        await authService.revokeSession(authUser.session_id);
        
        await securityLogger.log({
          userId: authUser.id,
          action: 'LOGOUT_SUCCESS',
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          details: { sessionId: authUser.session_id },
          riskLevel: 'LOW'
        });
      }
    } else {
      // 認証されていないユーザーのログアウト試行
      await securityLogger.log({
        action: 'LOGOUT_NO_SESSION',
        ipAddress: clientIP || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        riskLevel: 'LOW'
      });
    }

    // Cookieクリア
    const response = new Response(
      JSON.stringify({
        success: true,
        message: all_sessions 
          ? 'すべてのセッションからログアウトしました'
          : 'ログアウトしました'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'neo-auth-token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
            'neo-refresh-token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
          ].join(', ')
        }
      }
    );

    return setSecurityHeaders(response);

  } catch (error) {
    console.error('Logout error:', error);
    
    await securityLogger.log({
      userId: (await authService.getAuthUser(request))?.id,
      action: 'LOGOUT_ERROR',
      ipAddress: clientIP || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      details: { error: String(error) },
      riskLevel: 'MEDIUM'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'ログアウト中にエラーが発生しました'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
};

// GET method for simple logout (without body)
export const GET = async (request: NextRequest) => {
  return POST(request);
};

// OPTIONS method for CORS
export const OPTIONS = async () => {
  return setSecurityHeaders(new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  }));
};