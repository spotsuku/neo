'use client';

import MainLayout from '@/components/layout/MainLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import AdminDashboard from '@/app/dashboard/components/AdminDashboard';

export default function AdminPage() {
  return (
    <MainLayout>
      <PermissionGuard permissions={['admin.dashboard']}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard />
        </div>
      </PermissionGuard>
    </MainLayout>
  );
}