'use client';

import { lazy } from 'react';
import { AdminPageWrapper } from '@/components/lazy/admin-layout-wrapper';

// 遅延読み込みでユーザー管理コンポーネントをインポート
const AdminUsersComponent = lazy(() => 
  import('../_components/users-component').then(module => ({ 
    default: module.AdminUsersComponent 
  }))
);

export default function AdminUsersPage() {
  return (
    <AdminPageWrapper>
      <AdminUsersComponent />
    </AdminPageWrapper>
  );
}