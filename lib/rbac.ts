// NEO Portal - RBAC (Role-Based Access Control) System
// 型安全な権限管理とアクセス制御

import type { UserRole, RegionId, User } from '@/types/database';
import type { AuthUser } from './auth-enhanced';

// リソースタイプ定義
export type ResourceType = 
  | 'user'
  | 'company'
  | 'member'
  | 'announcement' 
  | 'notice'
  | 'class'
  | 'project'
  | 'committee'
  | 'event'
  | 'attendance'
  | 'audit'
  | 'file'
  | 'invitation'
  | 'session';

// アクションタイプ定義
export type ActionType =
  | 'create'
  | 'read'
  | 'update' 
  | 'delete'
  | 'publish'
  | 'invite'
  | 'manage'
  | 'approve'
  | 'attend';

// リソース権限設定
export interface ResourcePermission {
  resource: ResourceType;
  actions: {
    [K in ActionType]?: UserRole[];
  };
  regionRestricted?: boolean; // 地域制限あり
  ownershipRequired?: boolean; // 所有者制限あり
}

// RBAC権限マトリックス定義
export const PERMISSION_MATRIX: ResourcePermission[] = [
  // ユーザー管理
  {
    resource: 'user',
    actions: {
      create: ['owner', 'secretariat'], // 招待・作成
      read: ['owner', 'secretariat', 'company_admin', 'student'], // 読み取り
      update: ['owner', 'secretariat'], // プロフィール編集（管理者）
      delete: ['owner'], // 削除
      invite: ['owner', 'secretariat'], // 招待送信
      manage: ['owner', 'secretariat'], // アカウント管理
    },
    regionRestricted: true,
    ownershipRequired: true, // 自分のプロフィール編集は可能
  },
  
  // 企業管理
  {
    resource: 'company',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat', 'company_admin'],
      update: ['owner', 'secretariat', 'company_admin'],
      delete: ['owner'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // メンバー管理
  {
    resource: 'member',
    actions: {
      create: ['owner', 'secretariat', 'company_admin'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat', 'company_admin'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat', 'company_admin'],
    },
    regionRestricted: true,
  },
  
  // お知らせ管理
  {
    resource: 'announcement',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      publish: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // 通知管理（company_admin は会社限定配信可能）
  {
    resource: 'notice',
    actions: {
      create: ['owner', 'secretariat', 'company_admin'], // 会社管理者も作成可
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat', 'company_admin'],
      delete: ['owner', 'secretariat'],
      publish: ['owner', 'secretariat', 'company_admin'], // 配信
    },
    regionRestricted: true,
  },
  
  // クラス管理
  {
    resource: 'class',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // プロジェクト管理
  {
    resource: 'project',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // 委員会管理
  {
    resource: 'committee',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // イベント管理
  {
    resource: 'event',
    actions: {
      create: ['owner', 'secretariat', 'company_admin'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat', 'company_admin'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // 出席管理
  {
    resource: 'attendance',
    actions: {
      create: ['owner', 'secretariat', 'company_admin', 'student'], // 出席登録
      read: ['owner', 'secretariat', 'company_admin'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      attend: ['student'], // 学生の出席
    },
    regionRestricted: true,
    ownershipRequired: true, // 自分の出席は管理可能
  },
  
  // 監査ログ
  {
    resource: 'audit',
    actions: {
      read: ['owner', 'secretariat'], // 監査ログ閲覧
      manage: ['owner'], // 監査ログ管理
    },
    regionRestricted: true,
  },
  
  // ファイル管理
  {
    resource: 'file',
    actions: {
      create: ['owner', 'secretariat', 'company_admin', 'student'],
      read: ['owner', 'secretariat', 'company_admin', 'student'],
      update: ['owner', 'secretariat', 'company_admin'],
      delete: ['owner', 'secretariat'],
    },
    regionRestricted: true,
    ownershipRequired: true, // 自分のファイルは管理可能
  },
  
  // 招待管理
  {
    resource: 'invitation',
    actions: {
      create: ['owner', 'secretariat'],
      read: ['owner', 'secretariat'],
      update: ['owner', 'secretariat'],
      delete: ['owner', 'secretariat'],
      manage: ['owner', 'secretariat'],
    },
    regionRestricted: true,
  },
  
  // セッション管理
  {
    resource: 'session',
    actions: {
      read: ['owner', 'secretariat'], // セッション一覧
      delete: ['owner', 'secretariat'], // 強制ログアウト
      manage: ['owner'], // セッション管理
    },
    regionRestricted: true,
    ownershipRequired: true, // 自分のセッションは管理可能
  },
];

// 権限チェック関数
export interface PermissionContext {
  user: AuthUser;
  resource: ResourceType;
  action: ActionType;
  targetUserId?: string;     // 対象ユーザーID（所有者チェック用）
  targetRegionId?: RegionId; // 対象地域ID（地域制限チェック用）
  targetCompanyId?: string;  // 対象企業ID（会社制限チェック用）
}

/**
 * ユーザーが特定のアクションを実行する権限があるかチェック
 */
export function can(context: PermissionContext): boolean {
  const { user, resource, action, targetUserId, targetRegionId, targetCompanyId } = context;
  
  // 権限マトリックスから対象リソースの設定を取得
  const permission = PERMISSION_MATRIX.find(p => p.resource === resource);
  if (!permission) return false;
  
  // 基本ロール権限チェック
  const allowedRoles = permission.actions[action];
  if (!allowedRoles || !allowedRoles.includes(user.role)) {
    // 所有者制限がある場合は自分のリソースかチェック
    if (permission.ownershipRequired && targetUserId === user.id) {
      // 自分のリソースに対する基本的な操作は許可
      if (['read', 'update'].includes(action)) return true;
    }
    return false;
  }
  
  // 地域制限チェック
  if (permission.regionRestricted && targetRegionId) {
    // ALL権限を持つユーザーは全地域アクセス可
    if (!user.accessible_regions.includes('ALL') && 
        !user.accessible_regions.includes(targetRegionId)) {
      return false;
    }
  }
  
  // 会社制限チェック（company_adminの場合）
  if (user.role === 'company_admin' && targetCompanyId) {
    // company_adminは自分の会社のみアクセス可能
    // TODO: ユーザーと企業の関連をチェックする仕組みが必要
  }
  
  return true;
}

/**
 * 複数ロールのいずれかを要求する権限チェック
 */
export function canAny(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * 特定ロールを要求する権限チェック
 */
export function requireRole(user: AuthUser, role: UserRole | UserRole[]): boolean {
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  return user.role === role;
}

/**
 * 管理者権限チェック（owner, secretariat）
 */
export function isAdmin(user: AuthUser): boolean {
  return ['owner', 'secretariat'].includes(user.role);
}

/**
 * 企業権限チェック（company_admin以上）
 */
export function isCompanyLevel(user: AuthUser): boolean {
  return ['owner', 'secretariat', 'company_admin'].includes(user.role);
}

/**
 * 地域アクセス権限チェック
 */
export function canAccessRegion(user: AuthUser, regionId: RegionId): boolean {
  return user.accessible_regions.includes('ALL') || 
         user.accessible_regions.includes(regionId);
}

/**
 * リソース作成権限チェック
 */
export function canCreate(user: AuthUser, resource: ResourceType, regionId?: RegionId): boolean {
  return can({
    user,
    resource,
    action: 'create',
    targetRegionId: regionId,
  });
}

/**
 * リソース読み取り権限チェック
 */
export function canRead(user: AuthUser, resource: ResourceType, regionId?: RegionId, targetUserId?: string): boolean {
  return can({
    user,
    resource,
    action: 'read',
    targetRegionId: regionId,
    targetUserId,
  });
}

/**
 * リソース更新権限チェック
 */
export function canUpdate(user: AuthUser, resource: ResourceType, regionId?: RegionId, targetUserId?: string): boolean {
  return can({
    user,
    resource,
    action: 'update',
    targetRegionId: regionId,
    targetUserId,
  });
}

/**
 * リソース削除権限チェック
 */
export function canDelete(user: AuthUser, resource: ResourceType, regionId?: RegionId, targetUserId?: string): boolean {
  return can({
    user,
    resource,
    action: 'delete',
    targetRegionId: regionId,
    targetUserId,
  });
}

/**
 * 権限エラー
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly context: PermissionContext
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 権限チェックアサーション（権限がない場合はエラーを投げる）
 */
export function assertPermission(context: PermissionContext): void {
  if (!can(context)) {
    throw new PermissionError(
      `Permission denied: ${context.user.role} cannot ${context.action} ${context.resource}`,
      context
    );
  }
}