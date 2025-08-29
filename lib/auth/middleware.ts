/**
 * 認証ミドルウェア - NEO Digital Platform
 * API ルート用認証・認可機能
 */
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: 'owner' | 'secretariat' | 'company_admin' | 'student'
  company_id: string
  region_id: string
  email_verified: boolean
  totp_enabled: boolean
}

export interface AuthMiddlewareConfig {
  requiredRoles?: string[]
  requireEmailVerification?: boolean
  requireTOTP?: boolean
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// JWT トークン検証
export async function verifyAuthToken(
  token: string,
  secret: string
): Promise<AuthenticatedUser> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    
    if (!payload.user || typeof payload.user !== 'object') {
      throw new AuthError('Invalid token payload', 'INVALID_PAYLOAD')
    }
    
    return payload.user as AuthenticatedUser
  } catch (error) {
    throw new AuthError(
      'Invalid or expired token',
      'TOKEN_VERIFICATION_FAILED'
    )
  }
}

// リクエストから認証情報を抽出
export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7)
}

// 認証ミドルウェア
export async function authenticateRequest(
  request: NextRequest,
  env: { JWT_SECRET?: string },
  config: AuthMiddlewareConfig = {}
): Promise<AuthenticatedUser> {
  const token = extractAuthToken(request)
  
  if (!token) {
    throw new AuthError('Authentication required', 'NO_TOKEN', 401)
  }
  
  const jwtSecret = env.JWT_SECRET
  if (!jwtSecret) {
    throw new AuthError('Server configuration error', 'NO_SECRET', 500)
  }
  
  const user = await verifyAuthToken(token, jwtSecret)
  
  // ロール確認
  if (config.requiredRoles && !config.requiredRoles.includes(user.role)) {
    throw new AuthError(
      'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS',
      403
    )
  }
  
  // メール認証確認
  if (config.requireEmailVerification && !user.email_verified) {
    throw new AuthError(
      'Email verification required',
      'EMAIL_NOT_VERIFIED',
      403
    )
  }
  
  // TOTP確認
  if (config.requireTOTP && !user.totp_enabled) {
    throw new AuthError(
      'Two-factor authentication required',
      'TOTP_REQUIRED',
      403
    )
  }
  
  return user
}

// APIルート用認証デコレータ
export function withAuth(
  handler: (request: NextRequest, context: { params: any }, user: AuthenticatedUser) => Promise<Response>,
  config: AuthMiddlewareConfig = {}
) {
  return async function(request: NextRequest, context: { params: any }) {
    try {
      // 環境変数の取得（実際の実装では適切な方法で取得）
      const env = {
        JWT_SECRET: process.env.JWT_SECRET
      }
      
      const user = await authenticateRequest(request, env, config)
      return await handler(request, context, user)
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            code: error.code
          }),
          {
            status: error.status,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.error('Auth middleware error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

// ロール権限チェック関数
export function hasPermission(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole)
}

// 管理者権限チェック
export function isAdmin(userRole: string): boolean {
  return hasPermission(userRole, ['owner', 'secretariat'])
}

// 企業管理者以上の権限チェック
export function isCompanyAdmin(userRole: string): boolean {
  return hasPermission(userRole, ['owner', 'secretariat', 'company_admin'])
}

// デフォルトエクスポート
export default {
  authenticateRequest,
  withAuth,
  verifyAuthToken,
  extractAuthToken,
  hasPermission,
  isAdmin,
  isCompanyAdmin,
  AuthError
}