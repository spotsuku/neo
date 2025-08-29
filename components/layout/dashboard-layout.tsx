// NEO Digital Platform - ダッシュボードレイアウト
// レスポンシブ・アクセシブル対応

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Building2, 
  Megaphone, 
  Calendar,
  FolderOpen,
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: AuthUser | null;
}

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiredRoles?: string[];
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', icon: Home, label: 'ダッシュボード' },
  { href: '/members', icon: Users, label: 'メンバー管理' },
  { href: '/companies', icon: Building2, label: '企業管理', requiredRoles: ['owner', 'secretariat'] },
  { href: '/announcements', icon: Megaphone, label: 'お知らせ' },
  { href: '/classes', icon: Calendar, label: 'クラス・イベント' },
  { href: '/projects', icon: FolderOpen, label: 'プロジェクト' },
  { href: '/profile', icon: User, label: 'プロフィール' },
  { href: '/settings', icon: Settings, label: '設定' },
];

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // ユーザーロールによるメニューフィルタリング
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredRoles) return true;
    return user && item.requiredRoles.includes(user.role);
  });

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // モバイル時のサイドバー閉じる処理
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* サイドバー */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* サイドバーヘッダー */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 neo-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-gray-900">NEO Platform</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* ユーザー情報 */}
        {user && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role} • {user.region_id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ログアウトボタン */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      {/* オーバーレイ（モバイル時のサイドバー背景） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <div className="md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open sidebar</span>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                NEO Digital Platform
              </h1>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.accessible_regions.join('・')} 地域
                </span>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* メインコンテンツエリア */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}