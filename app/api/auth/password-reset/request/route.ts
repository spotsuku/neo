// NEO Digital Platform - Password Reset Request API
// POST /api/auth/password-reset/request

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDbService, generateId } from '@/lib/db';
import { 
  TokenService,
  RateLimitService,
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const passwordResetRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

interface CloudflareBindings {
  DB: D1Database;
}

/**
 * メール送信ダミー実装 (M1で本番プロバイダーに接続)
 */
async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  userName: string
): Promise<{ success: boolean; messageId?: string }> {
  // M0: ローカルアダプタ（ログ出力のみ）
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  
  console.log(`
=== パスワードリセットメール (開発環境) ===
宛先: ${email}
件名: 【NEO Digital Platform】パスワードリセットのご案内

${userName} 様

NEO Digital Platformのパスワードリセットをご依頼いただきありがとうございます。

以下のリンクをクリックして、パスワードの再設定を行ってください：
${resetLink}

このリンクは24時間有効です。

※このメールに心当たりがない場合は、このメールを無視してください。

NEO Digital Platform サポートチーム
==========================================
  `);

  // M1では実際のメール送信プロバイダー (SendGrid, Resend等) を使用
  return { success: true, messageId: `mock_${Date.now()}` };
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
  const rateLimitService = new RateLimitService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // リクエストボディ解析
    let body: PasswordResetRequest;
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
    const result = passwordResetRequestSchema.safeParse(body);
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

    const { email } = result.data;
    const emailLower = email.toLowerCase();

    // IPレート制限チェック (IP: 5回/15分)
    const ipRateLimit = await rateLimitService.checkRateLimit(
      'ip',
      clientIP || 'unknown',
      '/auth/password-reset/request',
      5,
      15
    );

    if (!ipRateLimit.allowed) {
      await securityLogger.log({
        action: 'PASSWORD_RESET_RATE_LIMITED_IP',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `リセット要求回数が上限を超えました。${ipRateLimit.resetAt.toLocaleString('ja-JP')}後にお試しください`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // メールレート制限チェック (メール: 3回/1時間)
    const emailRateLimit = await rateLimitService.checkRateLimit(
      'email',
      emailLower,
      '/auth/password-reset/request',
      3,
      60
    );

    if (!emailRateLimit.allowed) {
      await securityLogger.log({
        action: 'PASSWORD_RESET_RATE_LIMITED_EMAIL',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'EMAIL_RATE_LIMIT',
          message: 'このメールアドレスへのリセット要求回数が上限を超えました'
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ユーザー存在確認
    const user = await db.getUserByEmail(emailLower);
    
    // セキュリティ上、ユーザーが存在しない場合も成功レスポンスを返す
    // （アカウント存在チェック攻撃を防ぐため）
    if (!user) {
      await securityLogger.log({
        action: 'PASSWORD_RESET_USER_NOT_FOUND',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'LOW'
      });

      // 実際にはメールを送信せず、成功レスポンスを返す
      return setSecurityHeaders(new Response(
        JSON.stringify({
          success: true,
          message: 'パスワードリセットメールを送信しました（該当するアカウントが存在する場合）'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // アカウント無効チェック
    if (!user.is_active) {
      await securityLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_ACCOUNT_DISABLED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { email: emailLower },
        riskLevel: 'MEDIUM'
      });

      // 無効アカウントでも成功レスポンス（情報漏洩防止）
      return setSecurityHeaders(new Response(
        JSON.stringify({
          success: true,
          message: 'パスワードリセットメールを送信しました（該当するアカウントが存在する場合）'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 既存のリセットトークンを無効化
    await env.DB.prepare(`
      DELETE FROM password_reset_tokens 
      WHERE user_id = ? AND expires_at > datetime('now')
    `).bind(user.id).run();

    // リセットトークン生成
    const resetToken = TokenService.generateSecureToken(32);
    const tokenHash = TokenService.hashToken(resetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24時間有効

    // トークンをDBに保存
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      generateId('pwrt'),
      user.id,
      tokenHash,
      expiresAt.toISOString()
    ).run();

    // メール送信
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name
      );

      if (!emailResult.success) {
        throw new Error('メール送信に失敗しました');
      }

      await securityLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_EMAIL_SENT',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: emailLower,
          messageId: emailResult.messageId,
          expiresAt: expiresAt.toISOString()
        },
        riskLevel: 'LOW'
      });

    } catch (emailError) {
      console.error('Password reset email error:', emailError);
      
      // メール送信失敗時はトークンも削除
      await env.DB.prepare(`
        DELETE FROM password_reset_tokens WHERE user_id = ? AND token_hash = ?
      `).bind(user.id, tokenHash).run();

      await securityLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_EMAIL_FAILED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          email: emailLower,
          error: String(emailError)
        },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'EMAIL_SEND_FAILED',
          message: 'メール送信中にエラーが発生しました'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return setSecurityHeaders(new Response(
      JSON.stringify({
        success: true,
        message: 'パスワードリセットメールを送信しました。メール内のリンクからパスワードを再設定してください。',
        data: {
          expires_in: 24 * 60 * 60, // 24時間（秒）
          expires_at: expiresAt.toISOString()
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('Password reset request error:', error);
    
    await securityLogger.log({
      action: 'PASSWORD_RESET_REQUEST_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'パスワードリセット要求中にエラーが発生しました'
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