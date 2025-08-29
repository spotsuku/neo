// NEO Digital Platform - Authentication Guards & Middleware
// サーバー側RBAC権限ガード

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, type AuthUser } from './auth-enhanced';
import { 
  can, 
  requireRole, 
  canAny, 
  isAdmin, 
  isCompanyLevel,
  PermissionError,
  type ResourceType, 
  type ActionType, 
  type UserRole,
  type PermissionContext 
} from './rbac';
import { SecurityLogger } from './security';

// 認証が必要なAPIのレスポンス型
export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

// 権限チェック結果
export interface AuthGuardResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  status?: number;
}

// 認証ガード設定
export interface AuthGuardOptions {
  required?: boolean; // 認証必須
  roles?: UserRole[]; // 必要なロール
  resource?: ResourceType; // チェック対象リソース
  action?: ActionType; // チェック対象アクション
  adminOnly?: boolean; // 管理者限定
  companyLevel?: boolean; // 企業レベル以上
}

/**
 * 基本認証ガード - JWTトークン検証
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthGuardResult> {
  try {
    // Authorization ヘッダーまたはCookieからトークンを取得
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Cookieからアクセストークンを取得
      token = request.cookies.get('access-token')?.value;
    }
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
        status: 401
      };
    }
    
    // トークン検証
    const authService = new AuthService();
    const payload = await authService.verifyToken(token, 'access');
    
    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      };
    }
    
    // AuthUserオブジェクト構築
    const user: AuthUser = {
      id: payload.sub!,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      region_id: payload.region_id,
      accessible_regions: payload.accessible_regions,
      session_id: payload.session_id,
      totp_verified: payload.totp_verified,
    };
    
    return {
      success: true,
      user
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    };
  }
}

/**
 * 権限ガード - RBAC権限チェック
 */
export async function authorizeRequest(
  request: NextRequest, 
  options: AuthGuardOptions
): Promise<AuthGuardResult> {
  
  // まず認証チェック
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }
  
  const user = authResult.user;
  
  try {
    // 基本ロール権限チェック
    if (options.roles && options.roles.length > 0) {
      if (!canAny(user, options.roles)) {
        await SecurityLogger.logSecurityEvent(
          user.id, 
          'permission_denied', 
          `Role check failed: required ${options.roles.join('|')}, has ${user.role}`,
          request
        );
        
        return {
          success: false,
          error: `Insufficient role permissions. Required: ${options.roles.join(' | ')}`,
          status: 403
        };
      }
    }
    
    // 管理者限定チェック
    if (options.adminOnly && !isAdmin(user)) {
      await SecurityLogger.logSecurityEvent(
        user.id,
        'permission_denied',
        'Admin access required',
        request
      );
      
      return {
        success: false,
        error: 'Admin privileges required',
        status: 403
      };
    }
    
    // 企業レベル以上チェック
    if (options.companyLevel && !isCompanyLevel(user)) {
      await SecurityLogger.logSecurityEvent(
        user.id,
        'permission_denied', 
        'Company level access required',
        request
      );
      
      return {
        success: false,
        error: 'Company level privileges required',
        status: 403
      };
    }
    
    // リソース・アクション権限チェック
    if (options.resource && options.action) {
      const permissionContext: PermissionContext = {
        user,
        resource: options.resource,
        action: options.action,
        // 追加のコンテキストはリクエストパラメータから取得可能
        targetRegionId: request.nextUrl.searchParams.get('region') as any,
        targetUserId: request.nextUrl.searchParams.get('userId') || undefined,
      };
      
      if (!can(permissionContext)) {
        await SecurityLogger.logSecurityEvent(
          user.id,
          'permission_denied',
          `Resource access denied: ${options.action} ${options.resource}`,
          request
        );
        
        return {
          success: false,
          error: `Permission denied: cannot ${options.action} ${options.resource}`,
          status: 403
        };
      }
    }
    
    // 権限チェック成功
    await SecurityLogger.logSecurityEvent(
      user.id,
      'api_access_granted',
      `API access granted: ${request.method} ${request.nextUrl.pathname}`,
      request
    );
    
    return {
      success: true,
      user
    };
    
  } catch (error) {
    console.error('Authorization error:', error);
    
    if (error instanceof PermissionError) {
      return {
        success: false,
        error: error.message,
        status: 403
      };
    }
    
    return {
      success: false,
      error: 'Authorization failed',
      status: 500
    };
  }
}

/**
 * APIルートハンドラー用権限ガードデコレーター
 */
export function withAuth(options: AuthGuardOptions = {}) {
  return function <T extends Function>(handler: T): T {
    return (async (request: NextRequest, context: any) => {
      const authResult = await authorizeRequest(request, options);
      
      if (!authResult.success) {
        return NextResponse.json(
          { 
            error: authResult.error,
            code: 'AUTHORIZATION_FAILED' 
          },
          { status: authResult.status || 403 }
        );
      }
      
      // リクエストにユーザー情報を追加
      (request as any).user = authResult.user;
      
      // 元のハンドラーを実行
      return handler(request, context);
      
    }) as any;
  };
}

/**
 * 管理者権限が必要なAPIルートハンドラー用デコレーター
 */
export function withAdminAuth() {
  return withAuth({ 
    adminOnly: true,
    roles: ['owner', 'secretariat']
  });
}

/**
 * 企業レベル権限が必要なAPIルートハンドラー用デコレーター
 */
export function withCompanyAuth() {
  return withAuth({ 
    companyLevel: true,
    roles: ['owner', 'secretariat', 'company_admin']
  });
}

/**
 * 特定ロール権限が必要なAPIルートハンドラー用デコレーター
 */
export function withRoleAuth(roles: UserRole[]) {
  return withAuth({ roles });
}

/**
 * リソース権限が必要なAPIルートハンドラー用デコレーター
 */
export function withResourceAuth(resource: ResourceType, action: ActionType) {
  return withAuth({ 
    resource, 
    action,
    required: true
  });
}

/**
 * リクエストからユーザー情報を取得
 */
export function getRequestUser(request: NextRequest): AuthUser | null {
  return (request as any).user || null;
}

/**
 * 権限チェック付きレスポンスヘルパー
 */
export class AuthorizedResponse {
  
  /**
   * 権限不足エラーレスポンス
   */
  static forbidden(message = 'Permission denied') {
    return NextResponse.json(
      { 
        error: message,
        code: 'PERMISSION_DENIED' 
      },
      { status: 403 }
    );
  }
  
  /**
   * 認証エラーレスポンス
   */
  static unauthorized(message = 'Authentication required') {
    return NextResponse.json(
      { 
        error: message,
        code: 'AUTHENTICATION_REQUIRED' 
      },
      { status: 401 }
    );
  }
  
  /**
   * 成功レスポンス
   */
  static success(data: any) {
    return NextResponse.json({
      success: true,
      data
    });
  }
  
  /**
   * エラーレスポンス
   */
  static error(message: string, status = 400) {
    return NextResponse.json(
      { 
        error: message,
        code: 'REQUEST_ERROR' 
      },
      { status }
    );
  }
}

// 使用例のコメント
/*
使用例：

// 基本認証が必要
export const GET = withAuth()(async (request: NextRequest) => {
  const user = getRequestUser(request);
  return AuthorizedResponse.success({ user });
});

// 管理者権限が必要  
export const POST = withAdminAuth()(async (request: NextRequest) => {
  const user = getRequestUser(request);
  // 管理者のみ実行可能な処理
  return AuthorizedResponse.success({ message: 'Admin action completed' });
});

// 特定リソースへの権限が必要
export const PUT = withResourceAuth('user', 'update')(async (request: NextRequest) => {
  const user = getRequestUser(request);
  // ユーザー更新処理
  return AuthorizedResponse.success({ message: 'User updated' });
});

// 複数ロール権限が必要
export const DELETE = withRoleAuth(['owner', 'secretariat'])(async (request: NextRequest) => {
  const user = getRequestUser(request);
  // 削除処理
  return AuthorizedResponse.success({ message: 'Resource deleted' });
});
*/