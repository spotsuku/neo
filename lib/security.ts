// NEO Digital Platform Security Utilities
// Argon2id, TOTP, Rate Limiting, 暗号化機能

import { hash, verify } from '@node-rs/argon2';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes, createHash, createHmac } from 'crypto';
import type { D1Database } from '@/types/database';

// Argon2id設定 (OWASP推奨)
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19MB
  timeCost: 2,       // 2回の反復
  outputLen: 32,     // 32バイト出力
  parallelism: 1,    // 並列度1
};

/**
 * パスワード強度バリデーション
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // 最小長
  if (password.length < 8) {
    feedback.push('パスワードは8文字以上である必要があります');
    return { isValid: false, score: 0, feedback };
  }
  if (password.length >= 12) score++;

  // 文字種類チェック
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasNumbers) score++;
  if (hasSymbols) score++;

  // 最低要件
  const meetsCriteria = hasLower && hasUpper && hasNumbers;
  if (!meetsCriteria) {
    if (!hasLower) feedback.push('小文字を含む必要があります');
    if (!hasUpper) feedback.push('大文字を含む必要があります');
    if (!hasNumbers) feedback.push('数字を含む必要があります');
    return { isValid: false, score, feedback };
  }

  // 推奨要件
  if (!hasSymbols) {
    feedback.push('記号を含むことを推奨します');
  }

  // 一般的なパスワードチェック
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'password123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    feedback.push('一般的なパスワードは避けてください');
    score = Math.max(0, score - 2);
  }

  const isValid = score >= 3 && meetsCriteria;
  if (isValid && feedback.length === 0) {
    feedback.push(score >= 4 ? '強力なパスワードです' : '良好なパスワードです');
  }

  return { isValid, score, feedback };
}

/**
 * パスワードハッシュ化 (Argon2id)
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * パスワード検証
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await verify(hashedPassword, password);
  } catch {
    return false;
  }
}

/**
 * TOTP 2FA ユーティリティ
 */
export class TOTPService {
  private static readonly SERVICE_NAME = 'NEO Digital Platform';
  
  /**
   * TOTP秘密鍵生成
   */
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * QRコード生成
   */
  static async generateQRCode(userEmail: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(userEmail, this.SERVICE_NAME, secret);
    return await QRCode.toDataURL(otpauth);
  }

  /**
   * TOTPトークン検証
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    // window: 前後の時間窓を許容 (デフォルト30秒×1 = 前後30秒)
    return authenticator.verify({ token, secret, window });
  }

  /**
   * バックアップコード生成 (10個)
   */
  static generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );
  }

  /**
   * バックアップコードハッシュ化
   */
  static async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => hashPassword(code)));
  }

  /**
   * バックアップコード検証
   */
  static async verifyBackupCode(code: string, hashedCodes: string[]): Promise<number | null> {
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await verifyPassword(code, hashedCodes[i])) {
        return i; // 使用されたコードのインデックス
      }
    }
    return null;
  }
}

/**
 * セキュアトークン生成
 */
export class TokenService {
  /**
   * セキュアランダムトークン生成
   */
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * トークンハッシュ化 (SHA-256)
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * HMAC署名生成
   */
  static generateHMAC(data: string, secret: string): string {
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * HMAC署名検証
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return expectedSignature === signature;
  }
}

/**
 * Rate Limiting Service
 */
export class RateLimitService {
  constructor(private db: D1Database) {}

  /**
   * レート制限チェック
   */
  async checkRateLimit(
    keyType: 'ip' | 'user' | 'email',
    keyValue: string,
    endpoint: string,
    maxAttempts: number = 5,
    windowMinutes: number = 15
  ): Promise<{ allowed: boolean; attemptsRemaining: number; resetAt: Date }> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

    // 既存のレコードを取得
    const existing = await this.db.prepare(`
      SELECT * FROM rate_limits 
      WHERE key_type = ? AND key_value = ? AND endpoint = ?
    `).bind(keyType, keyValue, endpoint).first<{
      attempts: number;
      reset_at: string;
    }>();

    if (!existing) {
      // 新規作成
      await this.db.prepare(`
        INSERT INTO rate_limits (id, key_type, key_value, endpoint, attempts, reset_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).bind(
        `rl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        keyType,
        keyValue,
        endpoint,
        resetAt.toISOString()
      ).run();

      return {
        allowed: true,
        attemptsRemaining: maxAttempts - 1,
        resetAt
      };
    }

    const existingResetAt = new Date(existing.reset_at);
    
    // リセット時刻を過ぎている場合
    if (now > existingResetAt) {
      await this.db.prepare(`
        UPDATE rate_limits 
        SET attempts = 1, reset_at = ?
        WHERE key_type = ? AND key_value = ? AND endpoint = ?
      `).bind(resetAt.toISOString(), keyType, keyValue, endpoint).run();

      return {
        allowed: true,
        attemptsRemaining: maxAttempts - 1,
        resetAt
      };
    }

    // 試行回数が上限を超えている場合
    if (existing.attempts >= maxAttempts) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetAt: existingResetAt
      };
    }

    // 試行回数をインクリメント
    await this.db.prepare(`
      UPDATE rate_limits 
      SET attempts = attempts + 1
      WHERE key_type = ? AND key_value = ? AND endpoint = ?
    `).bind(keyType, keyValue, endpoint).run();

    return {
      allowed: true,
      attemptsRemaining: maxAttempts - existing.attempts - 1,
      resetAt: existingResetAt
    };
  }

  /**
   * レート制限リセット
   */
  async resetRateLimit(keyType: 'ip' | 'user' | 'email', keyValue: string, endpoint: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM rate_limits
      WHERE key_type = ? AND key_value = ? AND endpoint = ?
    `).bind(keyType, keyValue, endpoint).run();
  }
}

/**
 * セキュリティログ記録
 */
export interface SecurityLogEntry {
  userId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class SecurityLogger {
  constructor(private db: D1Database) {}

  async log(entry: SecurityLogEntry): Promise<void> {
    const id = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.prepare(`
      INSERT INTO security_logs (id, user_id, action, ip_address, user_agent, details, risk_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.userId || null,
      entry.action,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.riskLevel || 'LOW'
    ).run();
  }
}

/**
 * IPアドレス取得ユーティリティ
 */
export function getClientIP(request: Request): string | null {
  // Cloudflare Workers環境での実際のIPアドレス取得
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;

  // フォールバック
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;

  return null;
}

/**
 * セキュリティヘッダー設定
 */
export function setSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // XSS Protection
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // HTTPS Enforcement
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy
  headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'"
  );
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}