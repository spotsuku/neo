// NEO Digital Platform - セッション管理システム
// JWT + Cookie ベースのセッション管理

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { generateJWT, verifyJWT, getCurrentUser } from './auth';
import type { AuthUser, JWTPayload } from './auth';
import type { User } from '@/types/database';

// セッション設定
export const SESSION_CONFIG = {
  cookieName: 'neo-auth-token',
  maxAge: 7 * 24 * 60 * 60, // 7日間（秒）
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/'
};

// セッション作成
export async function createSession(user: Omit<User, 'password_hash' | 'created_at' | 'updated_at' | 'is_active'>): Promise<string> {
  const token = await generateJWT(user);
  return token;
}

// セッション検証
export async function validateSession(token: string): Promise<AuthUser | null> {
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
    console.error('Session validation failed:', error);
    return null;
  }
}

// クッキーからセッション取得
export async function getSessionFromCookies(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_CONFIG.cookieName)?.value;
    
    if (!token) {
      return null;
    }
    
    return await validateSession(token);
  } catch (error) {
    console.error('Failed to get session from cookies:', error);
    return null;
  }
}

// レスポンスにセッションCookie設定
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_CONFIG.cookieName, token, {
    maxAge: SESSION_CONFIG.maxAge,
    httpOnly: SESSION_CONFIG.httpOnly,
    secure: SESSION_CONFIG.secure,
    sameSite: SESSION_CONFIG.sameSite,
    path: SESSION_CONFIG.path
  });
}

// セッションCookie削除
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_CONFIG.cookieName);
}

// セッション更新（トークンリフレッシュ）
export async function refreshSession(currentToken: string): Promise<string | null> {
  try {
    const user = await validateSession(currentToken);
    if (!user) {
      return null;
    }
    
    // 新しいトークン生成
    const newToken = await createSession(user);
    return newToken;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
}

// セッション情報付きレスポンス生成
export function createAuthenticatedResponse(
  data: any,
  user: AuthUser,
  status: number = 200
): NextResponse {
  const response = NextResponse.json({
    ...data,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region_id: user.region_id,
      accessible_regions: user.accessible_regions
    },
    authenticated: true
  }, { status });
  
  return response;
}

// セッション有効期限チェック
export function isSessionExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

// セッション有効期限の残り時間（秒）
export function getSessionTimeRemaining(payload: JWTPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

// セッション自動更新が必要かチェック
export function shouldRefreshSession(payload: JWTPayload, refreshThreshold: number = 24 * 60 * 60): boolean {
  const timeRemaining = getSessionTimeRemaining(payload);
  return timeRemaining > 0 && timeRemaining < refreshThreshold;
}

// ミドルウェア用セッション管理
export class SessionManager {
  private request: NextRequest;
  
  constructor(request: NextRequest) {
    this.request = request;
  }
  
  async getUser(): Promise<AuthUser | null> {
    return await getCurrentUser(this.request);
  }
  
  async refreshIfNeeded(response: NextResponse): Promise<NextResponse> {
    try {
      const user = await this.getUser();
      if (!user) {
        return response;
      }
      
      // 現在のトークン取得
      const currentToken = this.extractToken();
      if (!currentToken) {
        return response;
      }
      
      // トークンペイロード検証
      const payload = await verifyJWT(currentToken);
      
      // 自動更新が必要かチェック
      if (shouldRefreshSession(payload)) {
        const newToken = await refreshSession(currentToken);
        if (newToken) {
          setSessionCookie(response, newToken);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Session refresh middleware failed:', error);
      return response;
    }
  }
  
  private extractToken(): string | null {
    // Authorization ヘッダーから抽出
    const authHeader = this.request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Cookieから抽出
    const cookieHeader = this.request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      return cookies[SESSION_CONFIG.cookieName] || null;
    }
    
    return null;
  }
}

// セッション統計情報
export interface SessionStats {
  isAuthenticated: boolean;
  user?: AuthUser;
  tokenExpiry?: string;
  timeRemaining?: number;
  needsRefresh?: boolean;
}

// セッション状態取得
export async function getSessionStats(request: NextRequest): Promise<SessionStats> {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return { isAuthenticated: false };
    }
    
    // トークン情報取得
    const sessionManager = new SessionManager(request);
    const token = sessionManager['extractToken']();
    
    if (!token) {
      return { isAuthenticated: true, user };
    }
    
    const payload = await verifyJWT(token);
    
    return {
      isAuthenticated: true,
      user,
      tokenExpiry: new Date(payload.exp * 1000).toISOString(),
      timeRemaining: getSessionTimeRemaining(payload),
      needsRefresh: shouldRefreshSession(payload)
    };
  } catch (error) {
    console.error('Failed to get session stats:', error);
    return { isAuthenticated: false };
  }
}

// セッション管理用のUtilityフック（クライアントサイド用の型定義）
export interface UseSessionReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}