'use client';

// NEO Portal - Client-side RBAC Components
// フロントエンド権限制御コンポーネント

import React, { createContext, useContext, ReactNode } from 'react';
import type { UserRole, RegionId } from '@/types/database';
import type { AuthUser } from '@/lib/auth-enhanced';
import { 
  can, 
  canAny,
  requireRole, 
  isAdmin, 
  isCompanyLevel,
  canAccessRegion,
  type ResourceType, 
  type ActionType,
  type PermissionContext 
} from '@/lib/rbac';

// 権限プロバイダーコンテキスト
interface RBACContextType {
  user: AuthUser | null;
  isLoading: boolean;
  can: (resource: ResourceType, action: ActionType, context?: Partial<PermissionContext>) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isCompanyLevel: () => boolean;
  canAccessRegion: (regionId: RegionId) => boolean;
}

const RBACContext = createContext<RBACContextType | null>(null);

// 権限プロバイダープロップス
interface RBACProviderProps {
  user: AuthUser | null;
  isLoading?: boolean;
  children: ReactNode;
}

/**
 * RBAC権限プロバイダー
 * アプリケーション全体の権限コンテキストを提供
 */
export function RBACProvider({ user, isLoading = false, children }: RBACProviderProps) {
  const contextValue: RBACContextType = {
    user,
    isLoading,
    
    can: (resource, action, context = {}) => {
      if (!user) return false;
      return can({
        user,
        resource,
        action,
        ...context,
      });
    },
    
    hasRole: (role) => {
      if (!user) return false;
      return requireRole(user, role);
    },
    
    hasAnyRole: (roles) => {
      if (!user) return false;
      return canAny(user, roles);
    },
    
    isAdmin: () => {
      if (!user) return false;
      return isAdmin(user);
    },
    
    isCompanyLevel: () => {
      if (!user) return false;
      return isCompanyLevel(user);
    },
    
    canAccessRegion: (regionId) => {
      if (!user) return false;
      return canAccessRegion(user, regionId);
    },
  };
  
  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

/**
 * RBAC権限フック
 */
export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

// 条件付きレンダリングコンポーネントのプロップス
interface ConditionalProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

// 権限チェックコンポーネントのプロップス
interface PermissionCheckProps extends ConditionalProps {
  resource: ResourceType;
  action: ActionType;
  targetUserId?: string;
  targetRegionId?: RegionId;
  targetCompanyId?: string;
}

/**
 * 権限ベース条件付きレンダリングコンポーネント
 * 指定したリソース・アクションへの権限がある場合のみ子要素を表示
 */
export function IfCan({ 
  resource, 
  action, 
  targetUserId, 
  targetRegionId, 
  targetCompanyId,
  children, 
  fallback = null,
  loading = null 
}: PermissionCheckProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  const hasPermission = rbac.can(resource, action, {
    targetUserId,
    targetRegionId, 
    targetCompanyId,
  });
  
  return <>{hasPermission ? children : fallback}</>;
}

// ロールチェックコンポーネントのプロップス
interface RoleCheckProps extends ConditionalProps {
  roles: UserRole | UserRole[];
  requireAll?: boolean; // 全てのロールが必要（デフォルト：いずれかのロールがあればOK）
}

/**
 * ロールベース条件付きレンダリングコンポーネント
 * 指定したロールを持つ場合のみ子要素を表示
 */
export function IfRole({ 
  roles, 
  requireAll = false,
  children, 
  fallback = null,
  loading = null 
}: RoleCheckProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const hasRole = requireAll 
    ? roleArray.every(role => rbac.hasRole(role))
    : rbac.hasAnyRole(roleArray);
  
  return <>{hasRole ? children : fallback}</>;
}

/**
 * 管理者限定コンポーネント
 * 管理者権限（owner, secretariat）を持つ場合のみ子要素を表示
 */
export function IfAdmin({ children, fallback = null, loading = null }: ConditionalProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  return <>{rbac.isAdmin() ? children : fallback}</>;
}

/**
 * 企業レベル限定コンポーネント  
 * 企業レベル権限（owner, secretariat, company_admin）を持つ場合のみ子要素を表示
 */
export function IfCompanyLevel({ children, fallback = null, loading = null }: ConditionalProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  return <>{rbac.isCompanyLevel() ? children : fallback}</>;
}

// 地域アクセスチェックプロップス
interface RegionCheckProps extends ConditionalProps {
  regionId: RegionId;
}

/**
 * 地域アクセス限定コンポーネント
 * 指定した地域へのアクセス権限がある場合のみ子要素を表示
 */
export function IfRegion({ regionId, children, fallback = null, loading = null }: RegionCheckProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  return <>{rbac.canAccessRegion(regionId) ? children : fallback}</>;
}

// 認証チェックプロップス
interface AuthCheckProps extends ConditionalProps {
  requireAuth?: boolean; // 認証が必要（デフォルト：true）
}

/**
 * 認証チェックコンポーネント
 * ログイン済みの場合のみ子要素を表示
 */
export function IfAuthenticated({ 
  requireAuth = true, 
  children, 
  fallback = null, 
  loading = null 
}: AuthCheckProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  const isAuthenticated = !!rbac.user;
  
  return <>{
    requireAuth 
      ? (isAuthenticated ? children : fallback)
      : (!isAuthenticated ? children : fallback)
  }</>;
}

/**
 * 未認証チェックコンポーネント
 * 未ログインの場合のみ子要素を表示
 */
export function IfGuest({ children, fallback = null, loading = null }: ConditionalProps) {
  return (
    <IfAuthenticated requireAuth={false} fallback={fallback} loading={loading}>
      {children}
    </IfAuthenticated>
  );
}

// コンポーネント組み合わせ例
interface ComplexPermissionProps extends ConditionalProps {
  user?: AuthUser;
  conditions: {
    roles?: UserRole[];
    resources?: { resource: ResourceType; action: ActionType }[];
    regions?: RegionId[];
    adminRequired?: boolean;
    companyLevelRequired?: boolean;
  };
  operator?: 'AND' | 'OR'; // 条件の組み合わせ方法（デフォルト：AND）
}

/**
 * 複合権限チェックコンポーネント
 * 複数の権限条件を組み合わせてチェック
 */
export function IfPermission({ 
  conditions, 
  operator = 'AND',
  children, 
  fallback = null, 
  loading = null 
}: ComplexPermissionProps) {
  const rbac = useRBAC();
  
  if (rbac.isLoading) {
    return <>{loading}</>;
  }
  
  if (!rbac.user) {
    return <>{fallback}</>;
  }
  
  const checks: boolean[] = [];
  
  // ロールチェック
  if (conditions.roles) {
    checks.push(rbac.hasAnyRole(conditions.roles));
  }
  
  // リソース権限チェック
  if (conditions.resources) {
    const resourceChecks = conditions.resources.map(({ resource, action }) =>
      rbac.can(resource, action)
    );
    checks.push(operator === 'AND' ? resourceChecks.every(Boolean) : resourceChecks.some(Boolean));
  }
  
  // 地域アクセスチェック
  if (conditions.regions) {
    const regionChecks = conditions.regions.map(regionId => rbac.canAccessRegion(regionId));
    checks.push(operator === 'AND' ? regionChecks.every(Boolean) : regionChecks.some(Boolean));
  }
  
  // 管理者チェック
  if (conditions.adminRequired) {
    checks.push(rbac.isAdmin());
  }
  
  // 企業レベルチェック
  if (conditions.companyLevelRequired) {
    checks.push(rbac.isCompanyLevel());
  }
  
  const hasPermission = operator === 'AND' 
    ? checks.every(Boolean)
    : checks.some(Boolean);
  
  return <>{hasPermission ? children : fallback}</>;
}

// 権限情報表示用デバッグコンポーネント（開発時のみ使用）
export function RBACDebugInfo() {
  const rbac = useRBAC();
  
  if (!rbac.user || process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded text-xs max-w-sm">
      <div className="font-bold mb-2">RBAC Debug Info</div>
      <div>User: {rbac.user.name}</div>
      <div>Role: {rbac.user.role}</div>
      <div>Region: {rbac.user.region_id}</div>
      <div>Accessible: {rbac.user.accessible_regions.join(', ')}</div>
      <div>Admin: {rbac.isAdmin() ? 'Yes' : 'No'}</div>
      <div>Company: {rbac.isCompanyLevel() ? 'Yes' : 'No'}</div>
    </div>
  );
}

// 使用例のエクスポート（TypeScript型推論のため）
export type {
  RBACContextType,
  PermissionCheckProps,
  RoleCheckProps,
  ConditionalProps,
  ComplexPermissionProps,
};

/* 
使用例:

// 基本的な権限チェック
<IfCan resource="notice" action="create">
  <CreateNoticeButton />
</IfCan>

// ロールチェック
<IfRole roles={['owner', 'secretariat']}>
  <AdminPanel />
</IfRole>

// 管理者限定
<IfAdmin>
  <UserManagement />
</IfAdmin>

// 企業レベル限定
<IfCompanyLevel>
  <CompanySettings />
</IfCompanyLevel>

// 地域制限
<IfRegion regionId="FUK">
  <FukuokaOnlyContent />
</IfRegion>

// 複合条件
<IfPermission 
  conditions={{
    roles: ['company_admin'], 
    resources: [{ resource: 'notice', action: 'publish' }],
    regions: ['FUK']
  }}
  operator="AND"
>
  <PublishNoticeButton />
</IfPermission>

// フォールバック付き
<IfCan 
  resource="user" 
  action="manage"
  fallback={<div>権限がありません</div>}
>
  <UserManagementPanel />
</IfCan>
*/