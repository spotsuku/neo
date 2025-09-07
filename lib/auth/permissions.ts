// 権限管理システム - 拡張RBAC対応
import { User, Role, Permission } from '@/types/auth';

export interface UserWithPermissions extends User {
  roles: Role[];
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  is_system_role: boolean;
  permissions: Permission[];
}

// 権限チェック関数
export const hasPermission = (
  user: UserWithPermissions | null,
  permissionName: string
): boolean => {
  if (!user || !user.permissions) return false;
  
  return user.permissions.some(permission => permission.name === permissionName);
};

export const hasAnyPermission = (
  user: UserWithPermissions | null,
  permissionNames: string[]
): boolean => {
  if (!user || !user.permissions) return false;
  
  return permissionNames.some(permissionName => 
    user.permissions.some(permission => permission.name === permissionName)
  );
};

export const hasRole = (
  user: UserWithPermissions | null,
  roleName: string
): boolean => {
  if (!user || !user.roles) return false;
  
  return user.roles.some(role => role.name === roleName);
};

export const hasMinimumRoleLevel = (
  user: UserWithPermissions | null,
  minimumLevel: number
): boolean => {
  if (!user || !user.roles) return false;
  
  return user.roles.some(role => role.level >= minimumLevel);
};

// ダッシュボード表示権限チェック
export const getDashboardPermissions = (user: UserWithPermissions | null) => {
  if (!user) {
    return {
      canViewAdmin: false,
      canViewStudent: false,
      canViewCompany: false,
      canViewCommittee: false,
      canViewTeacher: false,
      defaultView: 'user'
    };
  }

  const canViewAdmin = hasAnyPermission(user, ['admin.dashboard', 'system.manage']);
  const canViewStudent = hasAnyPermission(user, ['students.manage', 'students.view']) || hasRole(user, 'student');
  const canViewCompany = hasAnyPermission(user, ['companies.manage', 'companies.dashboard']) || hasRole(user, 'company_user');
  const canViewCommittee = hasAnyPermission(user, ['committees.manage', 'committees.member']);
  const canViewTeacher = hasRole(user, 'teacher') || hasPermission(user, 'classes.manage');

  // デフォルトビューの決定（権限レベルに基づく）
  let defaultView = 'user';
  if (canViewAdmin) defaultView = 'admin';
  else if (canViewTeacher) defaultView = 'teacher';
  else if (canViewCompany) defaultView = 'company';
  else if (canViewCommittee) defaultView = 'committee';
  else if (canViewStudent) defaultView = 'student';

  return {
    canViewAdmin,
    canViewStudent,
    canViewCompany,
    canViewCommittee,
    canViewTeacher,
    defaultView
  };
};

// ナビゲーションメニューの権限フィルタリング
export interface NavigationItem {
  label: string;
  href: string;
  permissions: string[];
  roles?: string[];
  children?: NavigationItem[];
  icon?: string;
}

export const filterNavigationItems = (
  items: NavigationItem[],
  user: UserWithPermissions | null
): NavigationItem[] => {
  if (!user) return [];

  return items.filter(item => {
    // 権限チェック
    const hasRequiredPermission = item.permissions.length === 0 || 
      hasAnyPermission(user, item.permissions);
    
    // ロールチェック
    const hasRequiredRole = !item.roles || item.roles.length === 0 || 
      item.roles.some(roleName => hasRole(user, roleName));
    
    if (hasRequiredPermission && hasRequiredRole) {
      // 子アイテムも再帰的にフィルタリング
      if (item.children) {
        item.children = filterNavigationItems(item.children, user);
      }
      return true;
    }
    
    return false;
  });
};

// 権限レベル定義
export const ROLE_LEVELS = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  COMPANY_ADMIN: 80,
  COMMITTEE_ADMIN: 70,
  EDITOR: 60,
  TEACHER: 50,
  COMMITTEE_MEMBER: 40,
  STUDENT_LEADER: 30,
  COMPANY_USER: 25,
  STUDENT: 20,
  USER: 10
} as const;

// 共通権限定数
export const PERMISSIONS = {
  // システム管理
  SYSTEM_MANAGE: 'system.manage',
  SYSTEM_SETTINGS: 'system.settings',
  
  // ユーザー管理
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE: 'users.manage',
  
  // 管理ダッシュボード
  ADMIN_DASHBOARD: 'admin.dashboard',
  ADMIN_ANALYTICS: 'admin.analytics',
  ADMIN_MONITORING: 'admin.monitoring',
  
  // 学生管理
  STUDENTS_MANAGE: 'students.manage',
  STUDENTS_GRADES: 'students.grades',
  CLASSES_MANAGE: 'classes.manage',
  
  // 企業管理
  COMPANIES_MANAGE: 'companies.manage',
  COMPANIES_DASHBOARD: 'companies.dashboard',
  
  // 委員会管理
  COMMITTEES_MANAGE: 'committees.manage',
  COMMITTEES_MEMBER: 'committees.member',
  
  // イベント管理
  EVENTS_CREATE: 'events.create',
  EVENTS_MANAGE: 'events.manage',
  EVENTS_ATTEND: 'events.attend',
  
  // ファイル管理
  FILES_UPLOAD: 'files.upload',
  FILES_MANAGE: 'files.manage',
  
  // プロジェクト管理
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_MANAGE: 'projects.manage',
  PROJECTS_VIEW: 'projects.view',
  
  // お知らせ管理
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  ANNOUNCEMENTS_MANAGE: 'announcements.manage'
} as const;