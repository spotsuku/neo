// NEO Digital Platform - User Registration API
// POST /api/auth/register

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDbService, generateId } from '@/lib/db';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  validatePasswordStrength, 
  hashPassword, 
  RateLimitService, 
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
  name: z.string().min(1, '名前を入力してください').max(100, '名前は100文字以下である必要があります'),
  invitation_token: z.string().optional(), // 招待トークン（オプション）
});

type RegisterRequest = z.infer<typeof registerSchema>;

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
    // レート制限チェック (IP: 5回/15分)
    const ipRateLimit = await rateLimitService.checkRateLimit(
      'ip', 
      clientIP || 'unknown', 
      '/auth/register', 
      5, 
      15
    );

    if (!ipRateLimit.allowed) {
      await securityLogger.log({
        action: 'REGISTER_RATE_LIMITED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { attemptsRemaining: 0 },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `登録試行回数が上限を超えました。${ipRateLimit.resetAt.toLocaleString('ja-JP')}後にお試しください`,
          resetAt: ipRateLimit.resetAt.toISOString()
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // リクエストボディ解析
    let body: RegisterRequest;
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
    const result = registerSchema.safeParse(body);
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

    const { email, password, name, invitation_token } = result.data;

    // メールレート制限チェック (メールアドレス: 3回/1時間)
    const emailRateLimit = await rateLimitService.checkRateLimit(
      'email',
      email.toLowerCase(),
      '/auth/register',
      3,
      60
    );

    if (!emailRateLimit.allowed) {
      await securityLogger.log({
        action: 'REGISTER_EMAIL_RATE_LIMITED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: email.toLowerCase() },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'EMAIL_RATE_LIMIT',
          message: 'このメールアドレスでの登録試行回数が上限を超えました'
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // パスワード強度チェック
    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      await securityLogger.log({
        action: 'REGISTER_WEAK_PASSWORD',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: email.toLowerCase(),
          feedback: passwordStrength.feedback
        },
        riskLevel: 'LOW'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'WEAK_PASSWORD',
          message: 'パスワードが要件を満たしていません',
          feedback: passwordStrength.feedback
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 既存ユーザーチェック
    const existingUser = await db.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      await securityLogger.log({
        userId: existingUser.id,
        action: 'REGISTER_EMAIL_EXISTS',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: email.toLowerCase() },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'EMAIL_EXISTS',
          message: 'このメールアドレスは既に使用されています'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 招待トークンの処理
    let role: 'owner' | 'secretariat' | 'company_admin' | 'student' = 'student';
    let regionId: 'FUK' | 'ISK' | 'NIG' | 'ALL' = 'FUK';
    let invitedBy: string | null = null;

    if (invitation_token) {
      const invitation = await env.DB.prepare(`
        SELECT * FROM invitation_tokens 
        WHERE token_hash = ? AND expires_at > datetime('now') AND used_at IS NULL
      `).bind(invitation_token).first<any>();

      if (!invitation) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'INVALID_INVITATION',
            message: '無効または期限切れの招待トークンです'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'EMAIL_MISMATCH',
            message: '招待されたメールアドレスと一致しません'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      role = invitation.role;
      regionId = invitation.region_id;
      invitedBy = invitation.invited_by;

      // 招待トークンを使用済みにマーク
      await env.DB.prepare(`
        UPDATE invitation_tokens 
        SET used_at = datetime('now'), used_by = ?
        WHERE id = ?
      `).bind(generateId('user'), invitation.id).run();
    }

    // パスワードハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザー作成
    const userId = generateId('user');
    const accessibleRegions = role === 'owner' ? ['FUK', 'ISK', 'NIG', 'ALL'] : [regionId];

    await env.DB.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, role, region_id, accessible_regions,
        is_active, email_verified, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))
    `).bind(
      userId,
      email.toLowerCase(),
      hashedPassword,
      name,
      role,
      regionId,
      JSON.stringify(accessibleRegions)
    ).run();

    // ユーザー・ロール関連付け
    const roleRecord = await env.DB.prepare(`
      SELECT id FROM roles WHERE key = ?
    `).bind(role).first<{ id: string }>();

    if (roleRecord) {
      await env.DB.prepare(`
        INSERT INTO user_roles (id, user_id, role_id, assigned_by, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).bind(
        generateId('ur'),
        userId,
        roleRecord.id,
        invitedBy || userId
      ).run();
    }

    // セッション作成
    const sessionId = await authService.createSession(
      userId,
      `${request.headers.get('user-agent') || 'Unknown'} (Registration)`,
      clientIP
    );

    // トークン生成
    const user = await db.getUserById(userId);
    if (!user) {
      throw new Error('ユーザー作成後の取得に失敗しました');
    }

    const accessToken = await authService.generateAccessToken(user, sessionId);
    const refreshToken = await authService.generateRefreshToken(user, sessionId);

    // セキュリティログ記録
    await securityLogger.log({
      userId,
      action: 'REGISTER_SUCCESS',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { 
        email: email.toLowerCase(),
        role,
        regionId,
        invitedBy: invitedBy || 'self-registration'
      },
      riskLevel: 'LOW'
    });

    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'ユーザー登録が完了しました',
        user: {
          id: userId,
          email: email.toLowerCase(),
          name,
          role,
          region_id: regionId,
          accessible_regions: accessibleRegions,
          totp_enabled: false,
          email_verified: false
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900 // 15分
        }
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `neo-auth-token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=900; Path=/`
        }
      }
    );

    return setSecurityHeaders(response);

  } catch (error) {
    console.error('Registration error:', error);
    
    await securityLogger.log({
      action: 'REGISTER_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'ユーザー登録中にエラーが発生しました'
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