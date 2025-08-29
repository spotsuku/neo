// NEO Digital Platform - TOTP 2FA Setup API
// POST /api/auth/totp/setup

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  TOTPService,
  SecurityLogger,
  getClientIP,
  setSecurityHeaders
} from '@/lib/security';
import { generateId } from '@/lib/db';

// リクエストバリデーションスキーマ
const totpSetupSchema = z.object({
  action: z.enum(['generate', 'verify']),
  token: z.string().length(6, 'TOTPトークンは6桁である必要があります').optional(),
});

type TOTPSetupRequest = z.infer<typeof totpSetupSchema>;

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
    // 認証チェック
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
    let body: TOTPSetupRequest;
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
    const result = totpSetupSchema.safeParse(body);
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

    const { action, token } = result.data;

    if (action === 'generate') {
      // TOTP設定の初期化・生成
      
      // 既存のTOTP設定確認
      const existingTotp = await env.DB.prepare(`
        SELECT is_enabled FROM user_totp WHERE user_id = ?
      `).bind(authUser.id).first<{ is_enabled: boolean }>();

      if (existingTotp?.is_enabled) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'TOTP_ALREADY_ENABLED',
            message: '2段階認証は既に有効化されています'
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // 新しいTOTP秘密鍵を生成
      const secretKey = TOTPService.generateSecret();
      const qrCodeUrl = await TOTPService.generateQRCode(authUser.email, secretKey);
      const backupCodes = TOTPService.generateBackupCodes();
      const hashedBackupCodes = await TOTPService.hashBackupCodes(backupCodes);

      // 一時的にDBに保存（未有効化状態）
      if (existingTotp) {
        // 更新
        await env.DB.prepare(`
          UPDATE user_totp 
          SET secret_key = ?, backup_codes = ?, is_enabled = 0, last_used_counter = 0
          WHERE user_id = ?
        `).bind(secretKey, JSON.stringify(hashedBackupCodes), authUser.id).run();
      } else {
        // 新規作成
        await env.DB.prepare(`
          INSERT INTO user_totp (id, user_id, secret_key, backup_codes, is_enabled, last_used_counter)
          VALUES (?, ?, ?, ?, 0, 0)
        `).bind(
          generateId('totp'),
          authUser.id,
          secretKey,
          JSON.stringify(hashedBackupCodes)
        ).run();
      }

      await securityLogger.log({
        userId: authUser.id,
        action: 'TOTP_SETUP_GENERATED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        riskLevel: 'LOW'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          success: true,
          message: 'TOTP設定を初期化しました。認証アプリでQRコードをスキャンしてください',
          data: {
            qr_code: qrCodeUrl,
            secret_key: secretKey,
            backup_codes: backupCodes, // 初回表示のみ
            service_name: 'NEO Digital Platform',
            account_name: authUser.email
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

    } else if (action === 'verify') {
      // TOTP検証・有効化
      
      if (!token) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'MISSING_TOKEN',
            message: '認証トークンを入力してください'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // 設定中のTOTP情報取得
      const totpConfig = await env.DB.prepare(`
        SELECT * FROM user_totp WHERE user_id = ?
      `).bind(authUser.id).first<{
        secret_key: string;
        is_enabled: boolean;
      }>();

      if (!totpConfig) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'TOTP_NOT_INITIALIZED',
            message: 'TOTP設定が初期化されていません'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      if (totpConfig.is_enabled) {
        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'TOTP_ALREADY_ENABLED',
            message: '2段階認証は既に有効化されています'
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // TOTPトークン検証
      const isTokenValid = TOTPService.verifyToken(token, totpConfig.secret_key);
      if (!isTokenValid) {
        await securityLogger.log({
          userId: authUser.id,
          action: 'TOTP_SETUP_INVALID_TOKEN',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          riskLevel: 'MEDIUM'
        });

        return setSecurityHeaders(new Response(
          JSON.stringify({
            error: 'INVALID_TOKEN',
            message: '認証トークンが正しくありません'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // TOTP有効化
      await env.DB.prepare(`
        UPDATE user_totp 
        SET is_enabled = 1, enabled_at = datetime('now'), last_used_counter = 1
        WHERE user_id = ?
      `).bind(authUser.id).run();

      // ユーザーテーブルも更新
      await env.DB.prepare(`
        UPDATE users SET totp_enabled = 1 WHERE id = ?
      `).bind(authUser.id).run();

      await securityLogger.log({
        userId: authUser.id,
        action: 'TOTP_ENABLED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        riskLevel: 'LOW'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          success: true,
          message: '2段階認証が正常に有効化されました',
          data: {
            totp_enabled: true,
            enabled_at: new Date().toISOString()
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

    } else {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'INVALID_ACTION',
          message: '無効なアクションです'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

  } catch (error) {
    console.error('TOTP setup error:', error);
    
    await securityLogger.log({
      userId: (await authService.getAuthUser(request))?.id,
      action: 'TOTP_SETUP_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'TOTP設定中にエラーが発生しました'
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