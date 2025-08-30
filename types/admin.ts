// 管理機能用型定義
// Admin functionality type definitions

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  totalMembers: number;
  activeMembers: number;
  totalProjects: number;
  activeProjects: number;
  totalEvents: number;
  upcomingEvents: number;
  totalNotices: number;
  publishedNotices: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdated: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  email: string;
  role: string;
  lastLogin?: string;
  loginCount: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  category: 'general' | 'security' | 'email' | 'api' | 'storage';
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isEditable: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'user' | 'data' | 'system' | 'security';
}

export interface BulkUserAction {
  action: 'activate' | 'deactivate' | 'delete' | 'changeRole' | 'exportData';
  userIds: string[];
  parameters?: Record<string, any>;
  reason?: string;
}

export interface DataExportRequest {
  type: 'users' | 'companies' | 'members' | 'projects' | 'audit';
  format: 'csv' | 'json' | 'xlsx';
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
  columns?: string[];
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: 'system' | 'security' | 'performance' | 'database';
  timestamp: string;
  isRead: boolean;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export interface BackupStatus {
  id: string;
  type: 'database' | 'files' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  size?: number;
  filePath?: string;
  error?: string;
  triggeredBy: 'manual' | 'scheduled' | 'auto';
  triggeredByUser?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RolePermission {
  id: string;
  roleKey: string;
  permission: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  conditions?: Record<string, any>;
}

export interface UserCreationData {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'secretariat' | 'company_admin' | 'student';
  regionId: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  accessibleRegions: string[];
  profileImage?: string;
  isActive: boolean;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: 'owner' | 'secretariat' | 'company_admin' | 'student';
  regionId?: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  accessibleRegions?: string[];
  profileImage?: string;
  isActive?: boolean;
}

// パジネーション用の共通型
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// フィルター条件用の共通型
export interface FilterOptions {
  search?: string;
  role?: string;
  region?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 管理者権限レベル定義
export const ADMIN_PERMISSIONS = {
  // ユーザー管理
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_BULK_ACTIONS: 'users:bulk_actions',
  
  // システム設定
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  
  // 監査ログ
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
  
  // バックアップ
  BACKUP_VIEW: 'backup:view',
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  
  // システム監視
  MONITORING_VIEW: 'monitoring:view',
  MONITORING_ALERTS: 'monitoring:alerts',
  
  // データエクスポート
  DATA_EXPORT: 'data:export',
  
  // 全体管理（オーナーのみ）
  SYSTEM_ADMIN: 'system:admin',
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];