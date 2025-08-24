// セッション管理サービス
import { UserSession, UserRole, RegionId, MemberStatus } from '../types';
import { generateSessionToken } from './registration';

// セッションストレージ（Cloudflare Workers の場合は KV または メモリ）
const sessions = new Map<string, UserSession>();

// セッション作成
export function createSession(userSession: UserSession): string {
  const sessionToken = generateSessionToken();
  sessions.set(sessionToken, userSession);
  
  // TODO: Cloudflare KV に保存（永続化）
  return sessionToken;
}

// セッション取得
export function getSession(sessionToken: string): UserSession | null {
  const session = sessions.get(sessionToken);
  
  if (!session) {
    return null;
  }
  
  // 有効期限チェック
  if (new Date() > new Date(session.expiresAt)) {
    sessions.delete(sessionToken);
    return null;
  }
  
  return session;
}

// セッション更新
export function updateSession(sessionToken: string, updates: Partial<UserSession>): boolean {
  const session = sessions.get(sessionToken);
  if (!session) {
    return false;
  }
  
  const updatedSession = { ...session, ...updates };
  sessions.set(sessionToken, updatedSession);
  
  // TODO: Cloudflare KV に保存
  return true;
}

// セッション削除（ログアウト）
export function deleteSession(sessionToken: string): boolean {
  const deleted = sessions.delete(sessionToken);
  // TODO: Cloudflare KV から削除
  return deleted;
}

// セッション有効性検証
export function validateSession(sessionToken: string): UserSession | null {
  return getSession(sessionToken);
}

// 期限切れセッション削除
export function cleanupExpiredSessions(): number {
  let deletedCount = 0;
  const now = new Date();
  
  for (const [token, session] of sessions.entries()) {
    if (now > new Date(session.expiresAt)) {
      sessions.delete(token);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

// セッションからのユーザー情報抽出
export function getUserInfoFromSession(sessionToken: string): {
  userId: string;
  email: string;
  role: UserRole;
  regionId: RegionId;
  companyId?: string;
  memberId?: string;
  status: MemberStatus;
  isFirstLogin: boolean;
} | null {
  const session = getSession(sessionToken);
  if (!session) {
    return null;
  }
  
  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
    regionId: session.regionId,
    companyId: session.companyId,
    memberId: session.memberId,
    status: session.status,
    isFirstLogin: session.isFirstLogin
  };
}

// ロールベースアクセス制御
export function checkAccess(
  sessionToken: string,
  requiredRoles: UserRole[],
  requiredStatus?: MemberStatus[]
): boolean {
  const session = getSession(sessionToken);
  if (!session) {
    return false;
  }
  
  // ロールチェック
  if (!requiredRoles.includes(session.role)) {
    return false;
  }
  
  // ステータスチェック
  if (requiredStatus && !requiredStatus.includes(session.status)) {
    return false;
  }
  
  return true;
}

// 地域アクセス権限チェック
export function checkRegionAccess(sessionToken: string, targetRegionId: RegionId): boolean {
  const session = getSession(sessionToken);
  if (!session) {
    return false;
  }
  
  // 事務局とオーナーは全地域アクセス可能
  if (session.role === 'secretariat' || session.role === 'owner') {
    return true;
  }
  
  // その他は所属地域のみ
  return session.regionId === targetRegionId;
}

// 初回ログイン後のリダイレクト先決定
export function getRedirectUrl(session: UserSession): string {
  // 仮登録状態で初回ログインの場合はプロフィール補完画面
  if (session.status === 'tentative' && session.isFirstLogin) {
    return '/profile-completion';
  }
  
  // 有効メンバーの場合はロール別のダッシュボード
  if (session.status === 'active') {
    switch (session.role) {
      case 'secretariat':
      case 'owner':
        return '/admin/dashboard';
      case 'company_admin':
        return '/company/dashboard';
      case 'student':
        return '/member/dashboard';
      default:
        return '/dashboard';
    }
  }
  
  // デフォルト
  return '/dashboard';
}

// セッション延長
export function extendSession(sessionToken: string, hours: number = 24): boolean {
  const session = getSession(sessionToken);
  if (!session) {
    return false;
  }
  
  const newExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return updateSession(sessionToken, { 
    expiresAt: newExpiresAt.toISOString() 
  });
}

// 全セッション統計
export function getSessionStats(): {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  sessionsByRole: Record<UserRole, number>;
} {
  let activeSessions = 0;
  let expiredSessions = 0;
  const sessionsByRole: Record<UserRole, number> = {
    'student': 0,
    'company_admin': 0,
    'secretariat': 0,
    'owner': 0
  };
  
  const now = new Date();
  for (const session of sessions.values()) {
    if (now > new Date(session.expiresAt)) {
      expiredSessions++;
    } else {
      activeSessions++;
      sessionsByRole[session.role]++;
    }
  }
  
  return {
    totalSessions: sessions.size,
    activeSessions,
    expiredSessions,
    sessionsByRole
  };
}