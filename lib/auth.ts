// NEO Digital Platform - 統一認証システム
// Enhanced認証システムへのエイリアス（後方互換性）

// Enhanced認証システムをメイン認証として使用
export { 
  AuthService,
  AuthUser,
  AuthResult,
  JWTPayload,
  hasPermission,
  hasRegionAccess,
  isAdmin,
  requiresTOTP,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createTOTPRequiredResponse
} from './auth-enhanced';

import { AuthService } from './auth-enhanced';

/**
 * 現在のユーザーを取得（後方互換性）
 * @deprecated Use AuthService.getAuthUser() directly for better type safety
 */
export async function getCurrentUser(request?: Request) {
  // TODO: Cloudflare Workers環境では env.DB を使用
  // 開発環境では一時的にモック
  const authService = new AuthService(null as any);
  return await authService.getAuthUser(request);
}

/**
 * 旧認証インターフェース（非推奨）
 * @deprecated Use AuthService and auth-enhanced.ts instead
 */
export function verifyToken(token: string) {
  console.warn('verifyToken() is deprecated. Use AuthService.verifyToken() instead.');
  return null;
}

/**
 * 旧認証ミドルウェア（非推奨）
 * @deprecated Use auth-guards.ts middleware instead
 */
export function requireAuth(request: Request) {
  console.warn('requireAuth() is deprecated. Use auth-guards.ts middleware instead.');
  return null;
}

/**
 * 旧管理者認証（非推奨）
 * @deprecated Use auth-guards.ts with role-based access control instead
 */
export function requireAdmin(request: Request) {
  console.warn('requireAdmin() is deprecated. Use auth-guards.ts RBAC instead.');
  return null;
}

// その他の旧機能を非推奨として保持
export * from './security-headers';
export * from './rate-limiter';