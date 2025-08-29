// NEO Digital Platform - JWT認証システム
// Cloudflare Workers対応のJWT認証ライブラリ

import { SignJWT, jwtVerify } from 'jose';
import type { User, UserRole, RegionId } from '@/types/database';

// JWT設定
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'neo-platform-jwt-secret-key-development-only'
);
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = '7d'; // 7日間有効

// JWT ペイロード型定義
export interface JWTPayload {
  sub: string; // user.id
  email: string;
  name: string;
  role: UserRole;
  region_id: RegionId;
  accessible_regions: RegionId[];
  iat: number;
  exp: number;
}

// 認証結果型
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  region_id: RegionId;
  accessible_regions: RegionId[];
}

// JWT トークン生成
export async function generateJWT(user: Omit<User, 'password_hash' | 'created_at' | 'updated_at' | 'is_active'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (7 * 24 * 60 * 60); // 7日後

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    region_id: user.region_id,
    accessible_regions: user.accessible_regions,
    iat: now,
    exp
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(JWT_SECRET);

  return jwt;
}

// JWT トークン検証
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid JWT token: ${error.message}`);
  }
}

// パスワードハッシュ化（開発用簡易版）
export async function hashPassword(password: string): Promise<string> {
  // 本番環境では bcrypt や scrypt を使用
  // Cloudflare Workers環境での簡易実装
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-neo-platform');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// パスワード検証
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hashedPassword;
}

// リクエストからJWTトークン抽出
export function extractTokenFromRequest(request: Request): string | null {
  // Authorization ヘッダーから抽出
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Cookieから抽出（フォールバック）
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    return cookies['neo-auth-token'] || null;
  }

  return null;
}

// 認証ユーザー情報取得
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyJWT(token);
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      region_id: payload.region_id,
      accessible_regions: payload.accessible_regions
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// 権限チェック関数
export function hasPermission(user: AuthUser, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

// 地域アクセス権限チェック
export function hasRegionAccess(user: AuthUser, targetRegion: RegionId): boolean {
  // ALLは全ユーザーアクセス可能
  if (targetRegion === 'ALL') {
    return true;
  }
  
  // ユーザーのアクセス可能地域に含まれているか
  return user.accessible_regions.includes(targetRegion) || user.accessible_regions.includes('ALL');
}

// 管理者権限チェック
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'owner' || user.role === 'secretariat';
}

// 企業管理者権限チェック
export function isCompanyAdmin(user: AuthUser): boolean {
  return user.role === 'company_admin';
}

// 学生権限チェック
export function isStudent(user: AuthUser): boolean {
  return user.role === 'student';
}

// エラー応答生成
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