// NEO Digital Platform Enhanced Authentication System
// JWT + Refresh Token + 2FA + Security

import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import { cookies } from 'next/headers';
import type { User, D1Database, Session, UserRole, RegionId } from '@/types/database';
import { TokenService, SecurityLogger, getClientIP } from './security';
import { randomBytes } from 'crypto';

// JWT設定
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'neo-digital-platform-secret-key-2024-enhanced'
);
const JWT_ALGORITHM = 'HS256';
const JWT_ACCESS_EXPIRATION = '15m';  // アクセストークン: 15分
const JWT_REFRESH_EXPIRATION = '7d';   // リフレッシュトークン: 7日間

// JWTペイロード型定義
export interface JWTPayload extends JoseJWTPayload {
  sub: string;        // ユーザーID
  email: string;      // メールアドレス  
  name: string;       // 表示名
  role: UserRole;     // ユーザーロール
  region_id: RegionId; // 地域ID
  accessible_regions: RegionId[];  // アクセス可能地域
  session_id: string; // セッションID
  type: 'access' | 'refresh'; // トークン種別
  totp_verified?: boolean; // 2FA認証済みか
  iat: number;        // 発行日時
  exp: number;        // 有効期限
  nbf: number;        // 有効開始時刻
}

// 認証済みユーザー情報
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  region_id: RegionId;
  accessible_regions: RegionId[];
  session_id: string;
  totp_verified?: boolean;
  totp_enabled?: boolean;
}

// 認証結果
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  requiresTOTP?: boolean;
  error?: string;
}

/**
 * Enhanced JWT Authentication Service
 */
export class AuthService {
  constructor(private db: D1Database) {}

  /**
   * アクセストークン生成
   */
  async generateAccessToken(
    user: User, 
    sessionId: string, 
    totpVerified: boolean = false
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (15 * 60); // 15分後

    const accessibleRegions = typeof user.accessible_regions === 'string' 
      ? JSON.parse(user.accessible_regions) 
      : user.accessible_regions;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region_id: user.region_id,
      accessible_regions: accessibleRegions,
      session_id: sessionId,
      type: 'access',
      totp_verified: totpVerified,
      iat: now,
      exp,
      nbf: now,
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setNotBefore(now)
      .sign(JWT_SECRET);
  }

  /**
   * リフレッシュトークン生成
   */
  async generateRefreshToken(user: User, sessionId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (7 * 24 * 60 * 60); // 7日後

    const accessibleRegions = typeof user.accessible_regions === 'string' 
      ? JSON.parse(user.accessible_regions) 
      : user.accessible_regions;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region_id: user.region_id,
      accessible_regions: accessibleRegions,
      session_id: sessionId,
      type: 'refresh',
      iat: now,
      exp,
      nbf: now,
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setNotBefore(now)
      .sign(JWT_SECRET);
  }

  /**
   * JWTトークン検証
   */
  async verifyToken(token: string, expectedType?: 'access' | 'refresh'): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: [JWT_ALGORITHM],
      });

      const jwtPayload = payload as JWTPayload;

      // トークン種別チェック
      if (expectedType && jwtPayload.type !== expectedType) {
        return null;
      }

      // セッション有効性チェック
      const session = await this.getValidSession(jwtPayload.session_id);
      if (!session) {
        return null;
      }

      return jwtPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * セッション作成
   */
  async createSession(
    userId: string, 
    deviceInfo?: string, 
    ipAddress?: string
  ): Promise<string> {
    const sessionId = TokenService.generateSecureToken(32);
    const refreshToken = TokenService.generateSecureToken(48);
    const refreshTokenHash = TokenService.hashToken(refreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日後

    await this.db.prepare(`
      INSERT INTO sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, session_type)
      VALUES (?, ?, ?, ?, ?, ?, 'web')
    `).bind(
      sessionId,
      userId,
      refreshTokenHash,
      deviceInfo || null,
      ipAddress || null,
      expiresAt.toISOString()
    ).run();

    return sessionId;
  }

  /**
   * 有効セッション取得
   */
  async getValidSession(sessionId: string): Promise<Session | null> {
    const session = await this.db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ? AND expires_at > datetime('now') AND is_revoked = 0
    `).bind(sessionId).first<Session>();

    if (session) {
      // 最終アクティビティ更新
      await this.db.prepare(`
        UPDATE sessions SET last_activity = datetime('now') WHERE id = ?
      `).bind(sessionId).run();
    }

    return session || null;
  }

  /**
   * セッション無効化
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sessions SET is_revoked = 1 WHERE id = ?
    `).bind(sessionId).run();
  }

  /**
   * ユーザーの全セッション無効化
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sessions SET is_revoked = 1 WHERE user_id = ?
    `).bind(userId).run();
  }

  /**
   * トークンリフレッシュ
   */
  async refreshTokens(refreshToken: string, request: Request): Promise<AuthResult> {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return { success: false, error: 'Invalid refresh token' };
    }

    // ユーザー情報取得
    const user = await this.db.prepare(`
      SELECT * FROM users WHERE id = ? AND is_active = 1
    `).bind(payload.sub).first<User>();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // TOTP有効性確認
    const totpEnabled = await this.db.prepare(`
      SELECT is_enabled FROM user_totp WHERE user_id = ?
    `).bind(user.id).first<{ is_enabled: boolean }>();

    // 新しいトークン生成
    const newAccessToken = await this.generateAccessToken(
      user, 
      payload.session_id, 
      payload.totp_verified || false
    );
    const newRefreshToken = await this.generateRefreshToken(user, payload.session_id);

    // セキュリティログ記録
    const securityLogger = new SecurityLogger(this.db);
    await securityLogger.log({
      userId: user.id,
      action: 'TOKEN_REFRESH',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      riskLevel: 'LOW'
    });

    const accessibleRegions = typeof user.accessible_regions === 'string' 
      ? JSON.parse(user.accessible_regions) 
      : user.accessible_regions;

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        region_id: user.region_id,
        accessible_regions: accessibleRegions,
        session_id: payload.session_id,
        totp_verified: payload.totp_verified,
        totp_enabled: totpEnabled?.is_enabled || false,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * 認証状態取得 (Cookie & Header対応)
   */
  async getAuthUser(request?: Request): Promise<AuthUser | null> {
    let token: string | undefined;

    // Cookieから取得を試行
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('neo-auth-token')?.value;
    } catch {
      // Cookie取得失敗時はHeaderから取得
    }

    // Authorizationヘッダーから取得
    if (!token && request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    const payload = await this.verifyToken(token, 'access');
    if (!payload) {
      return null;
    }

    // TOTP有効性確認
    const totpEnabled = await this.db.prepare(`
      SELECT is_enabled FROM user_totp WHERE user_id = ?
    `).bind(payload.sub).first<{ is_enabled: boolean }>();

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      region_id: payload.region_id,
      accessible_regions: payload.accessible_regions,
      session_id: payload.session_id,
      totp_verified: payload.totp_verified,
      totp_enabled: totpEnabled?.is_enabled || false,
    };
  }

  /**
   * デバイストークン生成（ヘッドレス認証用）
   */
  async generateDeviceToken(userId: string, deviceName: string): Promise<string> {
    // 30日間有効なデバイストークン
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (30 * 24 * 60 * 60);

    const payload = {
      sub: userId,
      type: 'device',
      device: deviceName,
      iat: now,
      exp,
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(JWT_SECRET);
  }
}

/**
 * 権限チェック関数
 */
export function hasPermission(user: AuthUser, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

export function hasRegionAccess(user: AuthUser, targetRegion: RegionId): boolean {
  if (targetRegion === 'ALL') return true;
  return user.accessible_regions.includes(targetRegion) || user.accessible_regions.includes('ALL');
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'owner' || user.role === 'secretariat';
}

export function requiresTOTP(user: AuthUser): boolean {
  return user.totp_enabled && !user.totp_verified;
}

/**
 * エラー応答生成
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ 
      error: 'UNAUTHORIZED', 
      message,
      code: 401,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

export function createForbiddenResponse(message: string = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ 
      error: 'FORBIDDEN', 
      message,
      code: 403,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

export function createTOTPRequiredResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'TOTP_REQUIRED',
      message: '2FA認証が必要です',
      code: 428,
      timestamp: new Date().toISOString()
    }),
    {
      status: 428,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}