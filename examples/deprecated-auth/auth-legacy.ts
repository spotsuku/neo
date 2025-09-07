/**
 * 認証・認可ライブラリ
 * セキュアなJWT認証と権限チェック
 */
import { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * JWT トークンの検証
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    // 基本的な入力検証
    if (!token || 
        token === 'null' || 
        token === 'undefined' || 
        token === 'Bearer' || 
        token.trim() === '') {
      throw new Error('Invalid token format');
    }

    // Bearer prefix の処理
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
      if (!token.trim()) {
        throw new Error('Empty token after Bearer prefix');
      }
    }

    // JWT形式の基本チェック（3つの部分がピリオドで区切られている）
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // 開発環境用の簡単なトークン検証
    // 本番環境では実際のJWT秘密鍵を使用
    if (process.env.NODE_ENV === 'development') {
      // テスト用トークンの処理
      if (token === 'test-token' || token === 'admin-token') {
        return {
          id: 'test-user-123',
          email: 'test@neo-portal.com',
          role: token === 'admin-token' ? 'admin' : 'user',
          permissions: token === 'admin-token' ? ['admin:read', 'admin:write'] : ['user:read'],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1時間後
        };
      }
    }

    // 本番環境では実際のJWT検証を実装
    // const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthUser;
    // return decoded;

    // 不正なトークンは拒否
    throw new Error('Token verification failed');

  } catch (error) {
    console.warn('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * 認証が必要なAPIエンドポイント用ミドルウェア
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'MISSING_TOKEN' },
      { status: 401 }
    );
  }

  const user = verifyToken(authHeader);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      { status: 401 }
    );
  }

  // トークンの期限チェック
  if (user.exp && user.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.json(
      { error: 'Token expired', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * 管理者権限が必要なAPIエンドポイント用ミドルウェア
 */
export function requireAdmin(request: NextRequest): AuthUser | NextResponse {
  const authResult = requireAuth(request);
  
  // 認証エラーの場合はそのまま返す
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult as AuthUser;

  // 管理者権限チェック
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * 特定の権限が必要なAPIエンドポイント用ミドルウェア
 */
export function requirePermission(request: NextRequest, permission: string): AuthUser | NextResponse {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult as AuthUser;

  // 権限チェック
  if (!user.permissions.includes(permission)) {
    return NextResponse.json(
      { 
        error: `Forbidden: Permission '${permission}' required`, 
        code: 'INSUFFICIENT_PERMISSIONS',
        required_permission: permission 
      },
      { status: 403 }
    );
  }

  return user;
}

/**
 * レート制限機能
 * 簡易版 - 本番環境ではRedisやKVストレージを使用
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  limit: number = 100, 
  windowMs: number = 60 * 1000 // 1分
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  let record = rateLimitStore.get(key);
  
  // レコードが存在しない、または期間が過ぎている場合は新規作成
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime
  };
}

/**
 * API レスポンスにレート制限ヘッダーを追加
 */
export function addRateLimitHeaders(
  response: NextResponse, 
  rateLimit: { allowed: boolean; remaining: number; resetTime: number }
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
  
  return response;
}

/**
 * セキュリティヘッダーの追加
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com; " +
    "style-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net; " +
    "font-src 'self' cdn.jsdelivr.net; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );

  // Strict Transport Security
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

/**
 * 入力値サニタイゼーション
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * IPアドレス取得（プロキシ対応）
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return (
    cfConnectingIP ||
    realIP ||
    forwarded?.split(',')[0] ||
    '127.0.0.1'
  ).trim();
}