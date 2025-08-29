// NEO Digital Platform - レスポンシブ・A11y完全対応ダッシュボードレイアウト
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  User,
  ChevronDown,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { MobileNavigation, TabletNavigation, DesktopNavigation } from './responsive-navigation';
import { useFocusManagement, useScreenReaderAnnouncements, useBreakpoint } from '@/lib/hooks/use-focus-management';
import type { AuthUser } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: AuthUser | null;
}

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  requiredRoles?: string[];
  shortcut?: string;
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', icon: Home, label: 'ダッシュボード', shortcut: 'D' },
  { href: '/members', icon: Users, label: 'メンバー管理', shortcut: 'M' },
  { href: '/companies', icon: Building2, label: '企業管理', requiredRoles: ['owner', 'secretariat'], shortcut: 'C' },
  { href: '/announcements', icon: Megaphone, label: 'お知らせ', shortcut: 'A' },
  { href: '/classes', icon: Calendar, label: 'クラス・イベント', shortcut: 'E' },
  { href: '/projects', icon: FolderOpen, label: 'プロジェクト', shortcut: 'P' },
  { href: '/settings', icon: Settings, label: '設定', shortcut: 'S' },
];

export default function ResponsiveDashboardLayout({ children, user }: DashboardLayoutProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLMainElement>(null);
  const { announce } = useScreenReaderAnnouncements();
  const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();

  // ナビゲーション処理
  const handleNavigation = (href: string) => {
    router.push(href);
    const item = menuItems.find(item => item.href === href);
    if (item) {
      announce(`${item.label}に移動しました`);
    }
  };

  // ユーザーメニュー制御
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);





  // ログアウト処理
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      announce('ログアウトしました');
      router.push('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      announce('ログアウトに失敗しました', 'assertive');
    }
  };

  // 現在のページタイトル取得
  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.href === pathname);
    return currentItem?.label || 'NEO Digital Platform';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* スキップリンク */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-[100] focus:z-[101]"
      >
        メインコンテンツにスキップ
      </a>

      {/* デスクトップサイドバー */}
      {isDesktop && (
        <aside
          ref={sidebarRef}
          className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col"
          role="complementary"
          aria-label="メインナビゲーション"
        >
          <div className="flex flex-col flex-1 bg-card border-r border-border shadow-sm">
            {/* サイドバーヘッダー */}
            <div className="flex items-center h-16 px-4 border-b border-border">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                aria-label="NEO Digital Platform ダッシュボードへ"
                onClick={() => handleNavigation('/dashboard')}
              >
                <div className="w-8 h-8 neo-gradient rounded-lg flex items-center justify-center" aria-hidden="true">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="font-bold text-foreground">NEO Platform</span>
              </Link>
            </div>

            {/* ユーザー情報 */}
            {user && (
              <div className="p-4 border-b border-border bg-muted/10" role="banner" aria-label="ユーザー情報">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center" aria-hidden="true">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.role} • {user.region_id}地域
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ナビゲーションメニュー */}
            <div className="flex-1">
              <DesktopNavigation user={user} onNavigate={handleNavigation} />
            </div>

            {/* ログアウトボタン */}
            <div className="p-4 border-t border-border">
              <AccessibleButton
                variant="outline"
                className="w-full"
                onClick={handleLogout}
                aria-label="アカウントからログアウト"
                srOnlyText="現在のセッションを終了します"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                ログアウト
              </AccessibleButton>
            </div>
          </div>
        </aside>
      )}

      {/* モバイルナビゲーション */}
      {isMobile && (
        <MobileNavigation user={user} onNavigate={handleNavigation} />
      )}

      {/* タブレットナビゲーション */}
      {isTablet && (
        <TabletNavigation user={user} onNavigate={handleNavigation} />
      )}

      {/* メインコンテンツエリア */}
      <div className={isDesktop ? 'ml-64' : ''}>
        {/* ヘッダー */}
        <header 
          className="bg-card shadow-sm border-b border-border sticky top-0 z-30"
          role="banner"
        >
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-foreground ml-12 md:ml-0">
                {getCurrentPageTitle()}
              </h1>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative focus:ring-2 focus:ring-ring"
                  aria-label="通知"
                >
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">通知（0件）</span>
                </Button>
                
                <div className="hidden sm:flex items-center text-sm text-muted-foreground">
                  {user.accessible_regions.join('・')} 地域
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 focus:ring-2 focus:ring-ring"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="ユーザーメニュー"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" aria-hidden="true">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* メインコンテンツ */}
        <main 
          id="main-content"
          ref={mainContentRef}
          className="p-4 sm:p-6 lg:p-8 focus:outline-none"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}