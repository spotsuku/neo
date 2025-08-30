'use client';

import { Suspense, ReactNode } from 'react';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';

interface AdminLayoutWrapperProps {
  children: ReactNode;
}

/**
 * 管理画面専用のSuspenseラッパー
 * 遅延読み込みされるコンポーネントを適切なローディング状態で包む
 */
export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  return (
    <Suspense fallback={<PageLoadingSpinner text="管理画面を読み込み中..." />}>
      {children}
    </Suspense>
  );
}

/**
 * ページレベルのSuspenseラッパー（個別コンポーネント用）
 */
export function AdminPageWrapper({ children }: AdminLayoutWrapperProps) {
  return (
    <Suspense fallback={<PageLoadingSpinner text="ページを読み込み中..." />}>
      {children}
    </Suspense>
  );
}

/**
 * コンポーネントレベルのSuspenseラッパー（小さなコンポーネント用）
 */
export function AdminComponentWrapper({ children }: AdminLayoutWrapperProps) {
  return (
    <Suspense fallback={<PageLoadingSpinner size="sm" text="読み込み中..." />}>
      {children}
    </Suspense>
  );
}