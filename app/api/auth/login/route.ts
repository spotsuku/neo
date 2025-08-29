// NEO Digital Platform - User Login API
// POST /api/auth/login

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDbService } from '@/lib/db';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  verifyPassword, 
  TOTPService,
  RateLimitService, 
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
  totp_token: z.string().length(6, 'TOTPトークンは6桁である必要があります').optional(),
  remember_me: z.boolean().default(false),
});

type LoginRequest = z.infer<typeof loginSchema>;

interface CloudflareBindings {
  DB: D1Database;
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

  const db = getDbService(env.DB);
  const authService = new AuthService(env.DB);
  const rateLimitService = new RateLimitService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // リクエストボディ解析
    let body: LoginRequest;
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
    const result = loginSchema.safeParse(body);
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

    const { email, password, totp_token, remember_me } = result.data;
    const emailLower = email.toLowerCase();

    // IPレート制限チェック (IP: 10回/15分)
    const ipRateLimit = await rateLimitService.checkRateLimit(
      'ip', 
      clientIP || 'unknown', 
      '/auth/login', 
      10, 
      15
    );

    if (!ipRateLimit.allowed) {
      await securityLogger.log({
        action: 'LOGIN_RATE_LIMITED_IP',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `ログイン試行回数が上限を超えました。${ipRateLimit.resetAt.toLocaleString('ja-JP')}後にお試しください`,
          resetAt: ipRateLimit.resetAt.toISOString()
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // メールレート制限チェック (メール: 5回/15分)
    const emailRateLimit = await rateLimitService.checkRateLimit(
      'email',
      emailLower,
      '/auth/login',
      5,
      15
    );

    if (!emailRateLimit.allowed) {
      await securityLogger.log({
        action: 'LOGIN_RATE_LIMITED_EMAIL',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'ACCOUNT_RATE_LIMIT',
          message: 'このアカウントのログイン試行回数が上限を超えました'
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ユーザー情報取得
    const user = await db.getUserByEmail(emailLower);
    if (!user) {
      await securityLogger.log({
        action: 'LOGIN_USER_NOT_FOUND',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが間違っています'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // アカウント無効・ロックチェック
    if (!user.is_active) {
      await securityLogger.log({
        userId: user.id,
        action: 'LOGIN_ACCOUNT_DISABLED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'ACCOUNT_DISABLED',
          message: 'アカウントが無効化されています'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // アカウントロック状態チェック
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await securityLogger.log({
        userId: user.id,
        action: 'LOGIN_ACCOUNT_LOCKED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: emailLower,
          lockedUntil: user.locked_until
        },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'ACCOUNT_LOCKED',
          message: `アカウントがロックされています。${new Date(user.locked_until).toLocaleString('ja-JP')}後にお試しください`,
          lockedUntil: user.locked_until
        }),
        { status: 423, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // パスワード検証
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // ログイン試行回数をインクリメント
      const newAttempts = (user.login_attempts || 0) + 1;
      const shouldLock = newAttempts >= 5;

      await env.DB.prepare(`
        UPDATE users 
        SET login_attempts = ?, 
            locked_until = ${shouldLock ? 'datetime("now", "+30 minutes")' : 'NULL'}
        WHERE id = ?
      `).bind(newAttempts, user.id).run();

      await securityLogger.log({
        userId: user.id,
        action: shouldLock ? 'LOGIN_ACCOUNT_LOCKED_ATTEMPTS' : 'LOGIN_INVALID_PASSWORD',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: emailLower,
          attempts: newAttempts,
          locked: shouldLock
        },
        riskLevel: shouldLock ? 'HIGH' : 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          message: shouldLock 
            ? 'パスワードが間違っています。アカウントが30分間ロックされました'
            : 'メールアドレスまたはパスワードが間違っています'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // TOTP設定確認
    const totpConfig = await env.DB.prepare(`
      SELECT * FROM user_totp WHERE user_id = ? AND is_enabled = 1
    `).bind(user.id).first<any>();

    let totpVerified = false;

    if (totpConfig) {
      // TOTP必須、トークンが提供されていない場合
      if (!totp_token) {
        await securityLogger.log({
          userId: user.id,
          action: 'LOGIN_TOTP_REQUIRED',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          details: { email: emailLower },
          riskLevel: 'LOW'
        });

        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'TOTP_REQUIRED',
            message: '2段階認証コードを入力してください',
            requires_totp: true
          }),
          { status: 428, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // TOTPトークン検証
      const isTokenValid = TOTPService.verifyToken(totp_token, totpConfig.secret_key);
      if (!isTokenValid) {
        await securityLogger.log({
          userId: user.id,
          action: 'LOGIN_INVALID_TOTP',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          details: { email: emailLower },
          riskLevel: 'HIGH'
        });

        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'INVALID_TOTP',
            message: '2段階認証コードが間違っています'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      totpVerified = true;

      // TOTP使用カウンター更新（リプレイ攻撃防止）
      await env.DB.prepare(`
        UPDATE user_totp 
        SET last_used_counter = last_used_counter + 1 
        WHERE user_id = ?
      `).bind(user.id).run();
    }

    // ログイン成功：試行回数リセット、最終ログイン更新
    await env.DB.prepare(`
      UPDATE users 
      SET login_attempts = 0, 
          locked_until = NULL,
          last_login_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run();

    // セッション作成
    const sessionId = await authService.createSession(
      user.id,
      request.headers.get('user-agent') || 'Unknown',
      clientIP
    );

    // トークン生成
    const accessToken = await authService.generateAccessToken(user, sessionId, totpVerified);
    const refreshToken = await authService.generateRefreshToken(user, sessionId);

    // レート制限リセット（成功時）
    await rateLimitService.resetRateLimit('email', emailLower, '/auth/login');

    // セキュリティログ記録
    await securityLogger.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { 
        email: emailLower,
        totpUsed: totpVerified,
        rememberMe: remember_me
      },
      riskLevel: 'LOW'
    });

    const accessibleRegions = typeof user.accessible_regions === 'string' 
      ? JSON.parse(user.accessible_regions) 
      : user.accessible_regions;

    const cookieMaxAge = remember_me ? 604800 : 900; // 7日 or 15分

    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'ログインに成功しました',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          region_id: user.region_id,
          accessible_regions: accessibleRegions,
          totp_enabled: !!totpConfig,
          totp_verified: totpVerified,
          email_verified: user.email_verified || false,
          last_login_at: user.last_login_at
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

    return setSecurityHeaders(response);

  } catch (error) {
    console.error('Login error:', error);
    
    await securityLogger.log({
      action: 'LOGIN_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'ログイン中にエラーが発生しました'
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