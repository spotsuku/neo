'use client';

import { lazy } from 'react';
import { AdminPageWrapper } from '@/components/lazy/admin-layout-wrapper';

// 遅延読み込みでダッシュボードコンポーネントをインポート
const AdminDashboardComponent = lazy(() => 
  import('./_components/dashboard-component').then(module => ({ 
    default: module.AdminDashboardComponent 
  }))
);

export default function AdminDashboard() {
  return (
    <AdminPageWrapper>
      <AdminDashboardComponent />
    </AdminPageWrapper>
  );
}