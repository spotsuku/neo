// NEO Digital Platform - Password Reset Confirm API
// POST /api/auth/password-reset/confirm

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDbService } from '@/lib/db';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  validatePasswordStrength,
  hashPassword,
  TokenService,
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'リセットトークンが必要です'),
  new_password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
});

type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmSchema>;

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
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // リクエストボディ解析
    let body: PasswordResetConfirmRequest;
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
    const result = passwordResetConfirmSchema.safeParse(body);
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

    const { token, new_password } = result.data;

    // トークン検証
    const tokenHash = TokenService.hashToken(token);
    const resetRecord = await env.DB.prepare(`
      SELECT prt.*, u.* FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = ? 
        AND prt.expires_at > datetime('now') 
        AND prt.used_at IS NULL
    `).bind(tokenHash).first<any>();

    if (!resetRecord) {
      await securityLogger.log({
        action: 'PASSWORD_RESET_INVALID_TOKEN',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { tokenProvided: !!token },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_TOKEN',
          message: '無効または期限切れのリセットトークンです'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // パスワード強度チェック
    const passwordStrength = validatePasswordStrength(new_password);
    if (!passwordStrength.isValid) {
      await securityLogger.log({
        userId: resetRecord.user_id,
        action: 'PASSWORD_RESET_WEAK_PASSWORD',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: resetRecord.email,
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

    // 現在のパスワードと同じかチェック
    const user = await db.getUserById(resetRecord.user_id);
    if (!user) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // パスワードハッシュ化
    const newPasswordHash = await hashPassword(new_password);

    // パスワード更新
    await env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, 
          password_changed_at = datetime('now'),
          login_attempts = 0,
          locked_until = NULL
      WHERE id = ?
    `).bind(newPasswordHash, user.id).run();

    // リセットトークンを使用済みにマーク
    await env.DB.prepare(`
      UPDATE password_reset_tokens 
      SET used_at = datetime('now')
      WHERE id = ?
    `).bind(resetRecord.id).run();

    // 全セッション無効化（セキュリティのため）
    await authService.revokeAllUserSessions(user.id);

    // TOTP無効化（パスワード変更時は2FAもリセット）
    await env.DB.prepare(`
      UPDATE user_totp 
      SET is_enabled = 0 
      WHERE user_id = ?
    `).bind(user.id).run();

    await env.DB.prepare(`
      UPDATE users 
      SET totp_enabled = 0 
      WHERE id = ?
    `).bind(user.id).run();

    // セキュリティログ記録
    await securityLogger.log({
      userId: user.id,
      action: 'PASSWORD_RESET_SUCCESS',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { 
        email: user.email,
        sessionsRevoked: true,
        totpDisabled: true
      },
      riskLevel: 'MEDIUM'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        success: true,
        message: 'パスワードが正常に変更されました',
        data: {
          password_changed_at: new Date().toISOString(),
          sessions_revoked: true,
          totp_disabled: true,
          next_steps: [
            '新しいパスワードでログインしてください',
            '必要に応じて2段階認証を再設定してください'
          ]
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('Password reset confirm error:', error);
    
    await securityLogger.log({
      action: 'PASSWORD_RESET_CONFIRM_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'パスワード変更中にエラーが発生しました'
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  }));
};