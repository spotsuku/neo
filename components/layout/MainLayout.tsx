'use client';

import { ReactNode } from 'react';
import IntegratedHeader from './IntegratedHeader';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
}

export default function MainLayout({ 
  children, 
  className = '', 
  showHeader = true 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && <IntegratedHeader />}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
    </div>
  );
}