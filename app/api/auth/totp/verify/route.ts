// NEO Digital Platform - TOTP 2FA Verification API
// POST /api/auth/totp/verify

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  TOTPService,
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';

// リクエストバリデーションスキーマ
const totpVerifySchema = z.object({
  token: z.string().min(6, '認証トークンは6文字以上である必要があります').max(8, '認証トークンは8文字以下である必要があります'),
  backup_code: z.boolean().default(false), // バックアップコード使用フラグ
});

type TOTPVerifyRequest = z.infer<typeof totpVerifySchema>;

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

  const authService = new AuthService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // 認証チェック（部分認証を許可）
    const authUser = await authService.getAuthUser(request);
    if (!authUser) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: '認証が必要です'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // リクエストボディ解析
    let body: TOTPVerifyRequest;
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
    const result = totpVerifySchema.safeParse(body);
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

    const { token, backup_code } = result.data;

    // TOTP設定確認
    const totpConfig = await env.DB.prepare(`
      SELECT * FROM user_totp WHERE user_id = ? AND is_enabled = 1
    `).bind(authUser.id).first<{
      secret_key: string;
      backup_codes: string;
      last_used_counter: number;
    }>();

    if (!totpConfig) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'TOTP_NOT_ENABLED',
          message: '2段階認証が有効化されていません'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    let isVerified = false;
    let usedBackupCode = false;

    if (backup_code) {
      // バックアップコード検証
      const backupCodes = JSON.parse(totpConfig.backup_codes || '[]');
      const backupCodeIndex = await TOTPService.verifyBackupCode(token.toUpperCase(), backupCodes);
      
      if (backupCodeIndex !== null) {
        // バックアップコードを削除（一回限り）
        backupCodes.splice(backupCodeIndex, 1);
        
        await env.DB.prepare(`
          UPDATE user_totp 
          SET backup_codes = ? 
          WHERE user_id = ?
        `).bind(JSON.stringify(backupCodes), authUser.id).run();

        isVerified = true;
        usedBackupCode = true;

        await securityLogger.log({
          userId: authUser.id,
          action: 'TOTP_BACKUP_CODE_USED',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          details: { 
            remainingCodes: backupCodes.length,
            codeIndex: backupCodeIndex
          },
          riskLevel: 'MEDIUM'
        });
      }
    } else {
      // 通常のTOTPトークン検証
      if (token.length !== 6 || !/^\d{6}$/.test(token)) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'INVALID_TOKEN_FORMAT',
            message: 'TOTPトークンは6桁の数字である必要があります'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      isVerified = TOTPService.verifyToken(token, totpConfig.secret_key, 1); // 前後30秒許容

      if (isVerified) {
        // リプレイ攻撃防止のためカウンター更新
        await env.DB.prepare(`
          UPDATE user_totp 
          SET last_used_counter = last_used_counter + 1 
          WHERE user_id = ?
        `).bind(authUser.id).run();

        await securityLogger.log({
          userId: authUser.id,
          action: 'TOTP_TOKEN_VERIFIED',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          riskLevel: 'LOW'
        });
      }
    }

    if (!isVerified) {
      await securityLogger.log({
        userId: authUser.id,
        action: backup_code ? 'TOTP_INVALID_BACKUP_CODE' : 'TOTP_INVALID_TOKEN',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          tokenLength: token.length,
          isBackupCode: backup_code
        },
        riskLevel: 'HIGH'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_TOKEN',
          message: backup_code 
            ? 'バックアップコードが正しくありません'
            : '認証トークンが正しくありません'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ユーザー情報取得
    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(authUser.id).first<any>();

    if (!user) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 新しいアクセストークン生成（TOTP検証済み）
    const newAccessToken = await authService.generateAccessToken(user, authUser.session_id, true);

    // バックアップコード残り数確認
    const remainingBackupCodes = usedBackupCode 
      ? JSON.parse(totpConfig.backup_codes || '[]').length - 1
      : JSON.parse(totpConfig.backup_codes || '[]').length;

    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'TOTP認証に成功しました',
        data: {
          totp_verified: true,
          access_token: newAccessToken,
          expires_in: 900, // 15分
          backup_code_used: usedBackupCode,
          remaining_backup_codes: remainingBackupCodes,
          warning: remainingBackupCodes <= 2 && usedBackupCode 
            ? 'バックアップコードの残りが少なくなりました。新しいバックアップコードを生成してください。'
            : undefined
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `neo-auth-token=${newAccessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=900; Path=/`
        }
      }
    );

    return setSecurityHeaders(response);

  } catch (error) {
    console.error('TOTP verify error:', error);
    
    await securityLogger.log({
      userId: (await authService.getAuthUser(request))?.id,
      action: 'TOTP_VERIFY_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'TOTP認証中にエラーが発生しました'
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