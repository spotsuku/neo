'use client';

import { lazy } from 'react';
import { PageWrapper } from '@/components/lazy/page-wrapper';

// 遅延読み込みでセキュリティダッシュボードコンポーネントをインポート
const SecurityDashboardComponent = lazy(() => 
  import('./_components/security-component').then(module => ({ 
    default: module.SecurityDashboardComponent 
  }))
);

export default function SecurityDashboardPage() {
  return (
    <PageWrapper loadingText="セキュリティダッシュボードを読み込み中...">
      <SecurityDashboardComponent />
    </PageWrapper>
  );
}