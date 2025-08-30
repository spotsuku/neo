'use client';

import { lazy } from 'react';
import { PageWrapper } from '@/components/lazy/page-wrapper';

// 遅延読み込みでプロフィールコンポーネントをインポート
const ProfileComponent = lazy(() => 
  import('./_components/profile-component').then(module => ({ 
    default: module.ProfileComponent 
  }))
);

export default function ProfilePage() {
  return (
    <PageWrapper loadingText="プロフィールを読み込み中...">
      <ProfileComponent />
    </PageWrapper>
  );
}