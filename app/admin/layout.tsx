'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Activity, 
  Shield,
  Database,
  Bell,
  FileText,
  Menu,
  X,
  ChevronRight,
  Home
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: '概要',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'システム全体の状況'
  },
  {
    title: 'ユーザー管理',
    href: '/admin/users',
    icon: Users,
    description: 'ユーザーの管理と権限設定',
    badge: 'New'
  },
  {
    title: 'システム設定',
    href: '/admin/settings',
    icon: Settings,
    description: 'アプリケーション設定'
  },
  {
    title: '監査ログ',
    href: '/admin/audit',
    icon: Activity,
    description: '操作履歴とセキュリティログ'
  },
  {
    title: 'パフォーマンス分析',
    href: '/admin/performance',
    icon: LayoutDashboard,
    description: 'バンドル最適化と依存関係管理',
    badge: 'Beta'
  },
  {
    title: 'セキュリティ',
    href: '/security-dashboard',
    icon: Shield,
    description: 'セキュリティ監視とアラート',
    external: true
  },
  {
    title: 'データベース',
    href: '/admin/database',
    icon: Database,
    description: 'データベース管理とバックアップ',
    disabled: true
  },
  {
    title: 'レポート',
    href: '/admin/reports',
    icon: FileText,
    description: 'システムレポートと分析',
    disabled: true
  }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActiveRoute = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モバイル用サイドバーオーバーレイ */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* サイドバーヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">管理画面</h1>
            <p className="text-sm text-gray-500">NEO Portal</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {/* メインサイトへのリンク */}
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start mb-4 text-gray-600 hover:text-gray-900"
              >
                <Home className="w-4 h-4 mr-2" />
                メインサイトに戻る
                <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>

            {navigationItems.map((item) => {
              const isActive = isActiveRoute(item.href);
              const isDisabled = item.disabled;
              
              const content = (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-3",
                    isActive && "bg-blue-50 text-blue-700 border-blue-200",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isDisabled}
                >
                  <item.icon className="w-4 h-4 mr-3 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  {item.external && (
                    <ChevronRight className="w-3 h-3 ml-2 shrink-0" />
                  )}
                </Button>
              );

              if (isDisabled) {
                return (
                  <div key={item.href} className="relative">
                    {content}
                  </div>
                );
              }

              if (item.external) {
                return (
                  <Link key={item.href} href={item.href}>
                    {content}
                  </Link>
                );
              }

              return (
                <Link key={item.href} href={item.href}>
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* サイドバーフッター */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Version 1.0.0</div>
            <div>© 2024 NEO Portal</div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="lg:pl-64">
        {/* トップバー */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
              
              {/* パンくずナビ */}
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                      管理画面
                    </Link>
                  </li>
                  {pathname !== '/admin' && (
                    <>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <li>
                        <span className="text-gray-900 font-medium">
                          {navigationItems.find(item => isActiveRoute(item.href))?.title || 'ページ'}
                        </span>
                      </li>
                    </>
                  )}
                </ol>
              </nav>
            </div>

            {/* アクション */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">アラート</span>
                <Badge variant="destructive" className="ml-1 px-1 text-xs">2</Badge>
              </Button>
              <Button variant="outline" size="sm">
                <Shield className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">セキュリティ</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ページコンテンツ */}
        <main className="flex-1">
          <Suspense fallback={<PageLoadingSpinner text="管理画面を読み込み中..." />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}