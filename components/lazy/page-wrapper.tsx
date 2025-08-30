'use client';

import { Suspense, ReactNode } from 'react';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';

interface PageWrapperProps {
  children: ReactNode;
  loadingText?: string;
}

/**
 * メインアプリケーションのページ用Suspenseラッパー
 */
export function PageWrapper({ children, loadingText = "ページを読み込み中..." }: PageWrapperProps) {
  return (
    <Suspense fallback={<PageLoadingSpinner text={loadingText} />}>
      {children}
    </Suspense>
  );
}

/**
 * 軽量コンポーネント用Suspenseラッパー
 */
export function ComponentWrapper({ children, loadingText = "読み込み中..." }: PageWrapperProps) {
  return (
    <Suspense fallback={<PageLoadingSpinner size="sm" text={loadingText} />}>
      {children}
    </Suspense>
  );
}