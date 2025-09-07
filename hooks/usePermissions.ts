'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import {
  hasPermission,
  hasAnyPermission,
  hasRole,
  hasMinimumRoleLevel,
  getDashboardPermissions,
  filterNavigationItems,
  UserWithPermissions,
  NavigationItem,
} from '@/lib/auth/permissions';

export interface UsePermissionsReturn {
  user: UserWithPermissions | null;
  loading: boolean;
  // 権限チェック関数
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRoleLevel: (level: number) => boolean;
  // ダッシュボード権限
  dashboardPermissions: {
    canViewAdmin: boolean;
    canViewStudent: boolean;
    canViewCompany: boolean;
    canViewCommittee: boolean;
    canViewTeacher: boolean;
    defaultView: string;
  };
  // ナビゲーション
  filterNavigationItems: (items: NavigationItem[]) => NavigationItem[];
  // ロール情報
  primaryRole: string | null;
  roleLevel: number;
  isAdmin: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  isCompanyUser: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user, loading } = useAuth();
  const [userWithPermissions, setUserWithPermissions] = useState<UserWithPermissions | null>(null);

  useEffect(() => {
    if (user && !loading) {
      // ユーザーの権限情報を取得
      fetchUserPermissions(user.id).then(setUserWithPermissions);
    } else {
      setUserWithPermissions(null);
    }
  }, [user, loading]);

  const checkPermission = (permission: string): boolean => {
    return hasPermission(userWithPermissions, permission);
  };

  const checkAnyPermission = (permissions: string[]): boolean => {
    return hasAnyPermission(userWithPermissions, permissions);
  };

  const checkRole = (role: string): boolean => {
    return hasRole(userWithPermissions, role);
  };

  const checkMinimumRoleLevel = (level: number): boolean => {
    return hasMinimumRoleLevel(userWithPermissions, level);
  };

  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return filterNavigationItems(items, userWithPermissions);
  };

  const dashboardPermissions = getDashboardPermissions(userWithPermissions);

  // 主要ロール（最高レベル）を取得
  const primaryRole = userWithPermissions?.roles?.length 
    ? userWithPermissions.roles.reduce((prev, current) => 
        prev.level > current.level ? prev : current
      ).name
    : null;

  // 最高ロールレベルを取得
  const roleLevel = userWithPermissions?.roles?.length
    ? Math.max(...userWithPermissions.roles.map(role => role.level))
    : 0;

  // 特定ロールのクイックチェック
  const isAdmin = checkRole('admin') || checkRole('super_admin');
  const isStudent = checkRole('student') || checkRole('student_leader');
  const isTeacher = checkRole('teacher');
  const isCompanyUser = checkRole('company_user') || checkRole('company_admin');

  return {
    user: userWithPermissions,
    loading,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasRole: checkRole,
    hasMinimumRoleLevel: checkMinimumRoleLevel,
    dashboardPermissions,
    filterNavigationItems: filterNavigation,
    primaryRole,
    roleLevel,
    isAdmin,
    isStudent,
    isTeacher,
    isCompanyUser,
  };
};

// ユーザーの権限情報を取得する関数
async function fetchUserPermissions(userId: number): Promise<UserWithPermissions | null> {
  try {
    // 実際の実装では API から権限情報を取得
    // ここではモックデータで実装
    const response = await fetch(`/api/users/${userId}/permissions`);
    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    
    // フォールバック: 基本権限のモックユーザーを返す
    return {
      id: userId,
      email: 'user@example.com',
      name: '一般ユーザー',
      role: 'user',
      status: 'active',
      roles: [
        {
          id: 11,
          name: 'user',
          display_name: '一般ユーザー',
          level: 10,
          is_system_role: true,
          permissions: [
            { id: 1, name: 'dashboard.view', resource: 'dashboard', action: 'view' }
          ]
        }
      ],
      permissions: [
        { id: 1, name: 'dashboard.view', resource: 'dashboard', action: 'view' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

// 権限ガードコンポーネント用のフック
export const usePermissionGuard = (requiredPermissions: string[], fallbackPermissions?: string[]) => {
  const { hasAnyPermission } = usePermissions();
  
  const hasAccess = hasAnyPermission(requiredPermissions);
  const hasFallbackAccess = fallbackPermissions ? hasAnyPermission(fallbackPermissions) : false;
  
  return {
    hasAccess,
    hasFallbackAccess,
    canAccess: hasAccess || hasFallbackAccess
  };
};