'use client';

import { lazy } from 'react';
import { AdminPageWrapper } from '@/components/lazy/admin-layout-wrapper';

// 遅延読み込みで監査ログコンポーネントをインポート
const AdminAuditComponent = lazy(() => 
  import('../_components/audit-component').then(module => ({ 
    default: module.AdminAuditComponent 
  }))
);

export default function AdminAuditPage() {
  return (
    <AdminPageWrapper>
      <AdminAuditComponent />
    </AdminPageWrapper>
  );
}