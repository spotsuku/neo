// NEO Portal - 認証・RBAC Middleware
// Next.js API Routes用の認証・権限チェックミドルウェア

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createUnauthorizedResponse, createForbiddenResponse, hasPermission, hasRegionAccess } from './auth';
import type { UserRole, RegionId, AuthUser } from '@/types/database';

// ミドルウェア設定型
export interface MiddlewareConfig {
  requireAuth?: boolean;
  requiredRoles?: UserRole | UserRole[];
  requiredRegion?: RegionId;
  allowedMethods?: string[];
}

// 拡張されたRequest型（認証ユーザー情報付き）
export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

// API ハンドラー型
export type ApiHandler = (req: AuthenticatedRequest, context?: any) => Promise<NextResponse> | NextResponse;

// 認証ミドルウェア生成関数
export function withAuth(handler: ApiHandler, config: MiddlewareConfig = {}) {
  return async (request: NextRequest, context?: any) => {
    const {
      requireAuth = true,
      requiredRoles,
      requiredRegion,
      allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    } = config;

    try {
      // HTTPメソッドチェック
      if (!allowedMethods.includes(request.method)) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'METHOD_NOT_ALLOWED',
            message: `${request.method} method is not allowed`
          }),
          { 
            status: 405, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // 認証不要の場合はそのまま実行
      if (!requireAuth) {
        return handler(request as AuthenticatedRequest, context);
      }

      // 認証ユーザー取得
      const user = await getCurrentUser(request);

      if (!user) {
        return createUnauthorizedResponse('認証が必要です');
      }

      // ロール権限チェック
      if (requiredRoles && !hasPermission(user, requiredRoles)) {
        const roleList = Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles;
        return createForbiddenResponse(`必要な権限: ${roleList}`);
      }

      // 地域アクセス権限チェック
      if (requiredRegion && !hasRegionAccess(user, requiredRegion)) {
        return createForbiddenResponse(`${requiredRegion}地域へのアクセス権限がありません`);
      }

      // 認証ユーザー情報をリクエストに追加
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return handler(authenticatedRequest, context);

    } catch (error) {
      console.error('Middleware error:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'INTERNAL_ERROR',
          message: 'サーバー内部エラーが発生しました'
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  };
}

// 管理者限定ミドルウェア
export function withAdminAuth(handler: ApiHandler) {
  return withAuth(handler, {
    requireAuth: true,
    requiredRoles: ['owner', 'secretariat']
  });
}

// 企業管理者以上限定ミドルウェア
export function withCompanyAdminAuth(handler: ApiHandler) {
  return withAuth(handler, {
    requireAuth: true,
    requiredRoles: ['owner', 'secretariat', 'company_admin']
  });
}

// 地域限定アクセスミドルウェア
export function withRegionAuth(regionId: RegionId) {
  return (handler: ApiHandler) => withAuth(handler, {
    requireAuth: true,
    requiredRegion: regionId
  });
}

// CORS対応ミドルウェア
export function withCors(handler: ApiHandler, origin: string = '*') {
  return async (request: NextRequest, context?: any) => {
    // プリフライトリクエスト処理
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 実際のリクエスト処理
    const response = await handler(request, context);
    
    // CORS ヘッダー追加
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  };
}

// レート制限ミドルウェア（簡易版）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(handler: ApiHandler, maxRequests: number = 100, windowMs: number = 60 * 1000) {
  return async (request: NextRequest, context?: any) => {
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const clientData = requestCounts.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      // 新しいウィンドウの開始
      requestCounts.set(clientIP, { 
        count: 1, 
        resetTime: now + windowMs 
      });
    } else {
      // 既存ウィンドウ内での追加リクエスト
      clientData.count++;
      
      if (clientData.count > maxRequests) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'リクエスト回数の上限に達しました。しばらく待ってから再試行してください。'
          }),
          { 
            status: 429, 
            headers: { 
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
            } 
          }
        );
      }
    }
    
    return handler(request, context);
  };
}

// ミドルウェア合成ヘルパー
export function compose(...middlewares: ((handler: ApiHandler) => ApiHandler)[]) {
  return (handler: ApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}