// NEO Portal - RBAC権限管理システム
// Role-Based Access Control (RBAC) 実装

import type { UserRole, RegionId, AuthUser } from '@/types/database';

// 権限レベル定義
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

// リソース種別定義
export enum ResourceType {
  USER = 'user',
  COMPANY = 'company',
  MEMBER = 'member',
  ANNOUNCEMENT = 'announcement',
  CLASS = 'class',
  PROJECT = 'project',
  COMMITTEE = 'committee',
  ATTENDANCE = 'attendance'
}

// 権限マトリックス定義
type PermissionMatrix = {
  [role in UserRole]: {
    [resource in ResourceType]: {
      [level in PermissionLevel]: boolean;
    };
  };
};

// NEO Portal 権限マトリックス
export const PERMISSION_MATRIX: PermissionMatrix = {
  // オーナー：全権限
  owner: {
    user: { read: true, write: true, delete: true, admin: true },
    company: { read: true, write: true, delete: true, admin: true },
    member: { read: true, write: true, delete: true, admin: true },
    announcement: { read: true, write: true, delete: true, admin: true },
    class: { read: true, write: true, delete: true, admin: true },
    project: { read: true, write: true, delete: true, admin: true },
    committee: { read: true, write: true, delete: true, admin: true },
    attendance: { read: true, write: true, delete: true, admin: true }
  },

  // 事務局：管理者レベル（削除は制限）
  secretariat: {
    user: { read: true, write: true, delete: false, admin: true },
    company: { read: true, write: true, delete: false, admin: true },
    member: { read: true, write: true, delete: false, admin: true },
    announcement: { read: true, write: true, delete: true, admin: true },
    class: { read: true, write: true, delete: true, admin: true },
    project: { read: true, write: true, delete: false, admin: true },
    committee: { read: true, write: true, delete: false, admin: true },
    attendance: { read: true, write: true, delete: false, admin: true }
  },

  // 企業管理者：自社関連データのみ
  company_admin: {
    user: { read: false, write: false, delete: false, admin: false },
    company: { read: true, write: true, delete: false, admin: false }, // 自社のみ
    member: { read: true, write: true, delete: false, admin: false }, // 自社メンバーのみ
    announcement: { read: true, write: false, delete: false, admin: false },
    class: { read: true, write: false, delete: false, admin: false },
    project: { read: true, write: true, delete: false, admin: false }, // 参加プロジェクトのみ
    committee: { read: true, write: false, delete: false, admin: false },
    attendance: { read: true, write: true, delete: false, admin: false } // 自社メンバーのみ
  },

  // 学生：限定的な読み取り・自分の更新のみ
  student: {
    user: { read: false, write: false, delete: false, admin: false }, // 自分のみ
    company: { read: true, write: false, delete: false, admin: false },
    member: { read: true, write: false, delete: false, admin: false }, // 自分のみ更新可
    announcement: { read: true, write: false, delete: false, admin: false },
    class: { read: true, write: false, delete: false, admin: false },
    project: { read: true, write: false, delete: false, admin: false },
    committee: { read: true, write: false, delete: false, admin: false },
    attendance: { read: true, write: true, delete: false, admin: false } // 自分の出欠のみ
  }
};

// 権限チェック関数
export function hasResourcePermission(
  user: AuthUser,
  resource: ResourceType,
  level: PermissionLevel,
  targetRegion?: RegionId,
  resourceOwnerId?: string
): boolean {
  // 地域アクセス権限チェック
  if (targetRegion && targetRegion !== 'ALL') {
    if (!user.accessible_regions.includes(targetRegion) && !user.accessible_regions.includes('ALL')) {
      return false;
    }
  }

  // 基本権限チェック
  const userPermissions = PERMISSION_MATRIX[user.role];
  const resourcePermissions = userPermissions[resource];
  
  if (!resourcePermissions[level]) {
    return false;
  }

  // 特別な権限チェック
  return checkSpecialPermissions(user, resource, level, resourceOwnerId);
}

// 特別な権限チェック（自分のデータ、自社データなど）
function checkSpecialPermissions(
  user: AuthUser,
  resource: ResourceType,
  level: PermissionLevel,
  resourceOwnerId?: string
): boolean {
  // オーナー・事務局は常に許可（削除権限除く）
  if (user.role === 'owner' || (user.role === 'secretariat' && level !== PermissionLevel.DELETE)) {
    return true;
  }

  // 企業管理者の特別ルール
  if (user.role === 'company_admin') {
    switch (resource) {
      case ResourceType.MEMBER:
      case ResourceType.ATTENDANCE:
        // 自社メンバーのデータのみアクセス可能
        // 実際の実装では company_id の照合が必要
        return level === PermissionLevel.READ || level === PermissionLevel.WRITE;
      
      case ResourceType.COMPANY:
        // 自社データのみ更新可能
        return resourceOwnerId === user.id || level === PermissionLevel.READ;
        
      case ResourceType.PROJECT:
        // 参加プロジェクトのみ更新可能
        return level === PermissionLevel.READ || 
               (level === PermissionLevel.WRITE && resourceOwnerId === user.id);
    }
  }

  // 学生の特別ルール
  if (user.role === 'student') {
    switch (resource) {
      case ResourceType.USER:
      case ResourceType.MEMBER:
        // 自分のデータのみ更新可能
        return resourceOwnerId === user.id;
        
      case ResourceType.ATTENDANCE:
        // 自分の出欠のみ更新可能
        return resourceOwnerId === user.id;
        
      default:
        // その他は読み取りのみ
        return level === PermissionLevel.READ;
    }
  }

  return true;
}

// 地域フィルタリング関数
export function getAccessibleRegions(user: AuthUser): RegionId[] {
  return user.accessible_regions;
}

// データフィルタリング用のWHERE句生成
export function buildRegionFilter(user: AuthUser, tableAlias: string = ''): { 
  whereClause: string; 
  params: string[];
} {
  const regions = getAccessibleRegions(user);
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  if (regions.includes('ALL')) {
    // ALL権限を持つ場合は制限なし
    return { whereClause: '', params: [] };
  }
  
  const placeholders = regions.map(() => '?').join(',');
  return {
    whereClause: `${prefix}region_id IN (${placeholders}) OR ${prefix}region_id = 'ALL'`,
    params: regions
  };
}

// ユーザーコンテキスト用フィルタ生成
export function buildUserContextFilter(
  user: AuthUser,
  resource: ResourceType,
  tableAlias: string = ''
): { whereClause: string; params: any[] } {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const clauses: string[] = [];
  const params: any[] = [];

  // 地域フィルタ
  const regionFilter = buildRegionFilter(user, tableAlias);
  if (regionFilter.whereClause) {
    clauses.push(`(${regionFilter.whereClause})`);
    params.push(...regionFilter.params);
  }

  // ロール別フィルタ
  switch (user.role) {
    case 'company_admin':
      if (resource === ResourceType.MEMBER || resource === ResourceType.ATTENDANCE) {
        // 自社メンバーのみ
        clauses.push(`${prefix}company_id = ?`);
        params.push(user.id); // 実際は user.company_id を使用
      }
      break;
      
    case 'student':
      if (resource === ResourceType.USER || resource === ResourceType.MEMBER || resource === ResourceType.ATTENDANCE) {
        // 自分のデータのみ
        clauses.push(`${prefix}user_id = ?`);
        params.push(user.id);
      }
      break;
  }

  return {
    whereClause: clauses.length > 0 ? clauses.join(' AND ') : '',
    params
  };
}

// 権限エラーメッセージ生成
export function getPermissionErrorMessage(
  resource: ResourceType,
  level: PermissionLevel,
  reason?: string
): string {
  const resourceNames = {
    user: 'ユーザー',
    company: '企業',
    member: 'メンバー',
    announcement: 'お知らせ',
    class: 'クラス',
    project: 'プロジェクト',
    committee: '委員会',
    attendance: '出欠'
  };

  const levelNames = {
    read: '閲覧',
    write: '編集',
    delete: '削除',
    admin: '管理'
  };

  const resourceName = resourceNames[resource] || resource;
  const levelName = levelNames[level] || level;

  if (reason) {
    return `${resourceName}の${levelName}権限がありません: ${reason}`;
  }

  return `${resourceName}の${levelName}権限がありません`;
}