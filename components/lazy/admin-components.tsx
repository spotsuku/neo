import { lazy } from 'react';

// 管理者ダッシュボード関連コンポーネントの遅延読み込み
export const LazyAdminDashboard = lazy(() => 
  import('@/app/admin/page').then(module => ({ default: module.default }))
);

export const LazyUserManagement = lazy(() => 
  import('@/app/admin/users/page').then(module => ({ default: module.default }))
);

export const LazySystemSettings = lazy(() => 
  import('@/app/admin/settings/page').then(module => ({ default: module.default }))
);

export const LazyAuditLog = lazy(() => 
  import('@/app/admin/audit/page').then(module => ({ default: module.default }))
);

// セキュリティダッシュボード
export const LazySecurityDashboard = lazy(() => 
  import('@/app/security-dashboard/page').then(module => ({ default: module.default }))
);

// プロフィール画面
export const LazyProfile = lazy(() => 
  import('@/app/profile/page').then(module => ({ default: module.default }))
);

// 通知管理
export const LazyNotices = lazy(() => 
  import('@/app/notices/page').then(module => ({ default: module.default }))
);

export const LazyNoticeNew = lazy(() => 
  import('@/app/notices/new/page').then(module => ({ default: module.default }))
);

// アナウンスメント
export const LazyAnnouncements = lazy(() => 
  import('@/app/announcements/page').then(module => ({ default: module.default }))
);

// ダッシュボード
export const LazyDashboard = lazy(() => 
  import('@/app/dashboard/page').then(module => ({ default: module.default }))
);