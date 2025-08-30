'use client';

import { lazy } from 'react';

// メインアプリケーションの遅延読み込みコンポーネント

/**
 * プロフィールページの遅延読み込み
 * サイズが大きく、初回アクセス時のみ必要
 */
export const LazyProfile = lazy(() => 
  import('@/app/profile/_components/profile-component').then(module => ({ 
    default: module.ProfileComponent 
  }))
);

/**
 * セキュリティダッシュボードの遅延読み込み
 * 管理者専用機能で、一般ユーザーはアクセスしない
 */
export const LazySecurityDashboard = lazy(() => 
  import('@/app/security-dashboard/_components/security-component').then(module => ({ 
    default: module.SecurityDashboardComponent 
  }))
);

/**
 * 新規お知らせ作成ページの遅延読み込み
 * 管理者専用機能
 */
export const LazyNoticeCreator = lazy(() => 
  import('@/app/notices/new/_components/notice-creator-component').then(module => ({ 
    default: module.NoticeCreatorComponent 
  }))
);

/**
 * お知らせ詳細ページの遅延読み込み
 * ユーザーが特定のお知らせを選択した時のみ必要
 */
export const LazyNoticeDetail = lazy(() => 
  import('@/app/notices/[id]/_components/notice-detail-component').then(module => ({ 
    default: module.NoticeDetailComponent 
  }))
);

/**
 * お知らせ一覧ページの遅延読み込み
 */
export const LazyNoticesList = lazy(() => 
  import('@/app/notices/_components/notices-list-component').then(module => ({ 
    default: module.NoticesListComponent 
  }))
);

/**
 * お知らせ管理ページの遅延読み込み
 */
export const LazyAnnouncementsList = lazy(() => 
  import('@/app/announcements/_components/announcements-component').then(module => ({ 
    default: module.AnnouncementsComponent 
  }))
);