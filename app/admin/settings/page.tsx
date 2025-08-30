'use client';

import { lazy } from 'react';
import { AdminPageWrapper } from '@/components/lazy/admin-layout-wrapper';

// 遅延読み込みで設定コンポーネントをインポート
const AdminSettingsComponent = lazy(() => 
  import('../_components/settings-component').then(module => ({ 
    default: module.AdminSettingsComponent 
  }))
);

export default function AdminSettingsPage() {
  return (
    <AdminPageWrapper>
      <AdminSettingsComponent />
    </AdminPageWrapper>
  );
}