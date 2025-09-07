'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { filterNavigationItems, NavigationItem } from '@/lib/auth/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  BarChart3,
  User,
  Shield,
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  Home,
  Briefcase,
  Upload,
  ChevronDown
} from 'lucide-react';

// ナビゲーション構造定義
const navigationStructure: NavigationItem[] = [
  {
    label: 'ホーム',
    href: '/',
    permissions: [],
    icon: 'Home'
  },
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    permissions: ['dashboard.view'],
    icon: 'BarChart3'
  },
  {
    label: '管理',
    href: '/admin',
    permissions: ['admin.dashboard'],
    icon: 'Shield',
    children: [
      { label: 'ユーザー管理', href: '/admin/users', permissions: ['users.manage'], icon: 'User' },
      { label: 'システム設定', href: '/admin/settings', permissions: ['system.settings'], icon: 'Settings' },
      { label: 'システム監視', href: '/admin/monitoring', permissions: ['admin.monitoring'], icon: 'BarChart3' },
      { label: '分析', href: '/admin/analytics', permissions: ['admin.analytics'], icon: 'BarChart3' }
    ]
  },
  {
    label: '学生',
    href: '/students',
    permissions: ['students.manage', 'students.view'],
    icon: 'BookOpen',
    children: [
      { label: '学生一覧', href: '/students', permissions: ['students.manage'], icon: 'BookOpen' },
      { label: 'クラス管理', href: '/classes', permissions: ['classes.manage'], icon: 'GraduationCap' },
      { label: '成績管理', href: '/grades', permissions: ['students.grades'], icon: 'FileText' }
    ]
  },
  {
    label: '企業',
    href: '/companies', 
    permissions: ['companies.manage', 'companies.dashboard'],
    icon: 'Building2',
    children: [
      { label: '企業一覧', href: '/companies', permissions: ['companies.manage'], icon: 'Building2' },
      { label: '企業ダッシュボード', href: '/dashboard?view=company', permissions: ['companies.dashboard'], icon: 'BarChart3' }
    ]
  },
  {
    label: '委員会',
    href: '/committees',
    permissions: ['committees.manage', 'committees.member'],
    icon: 'Users',
    children: [
      { label: '委員会一覧', href: '/committees', permissions: ['committees.manage'], icon: 'Users' },
      { label: 'イベント', href: '/events', permissions: ['events.manage'], icon: 'Calendar' }
    ]
  },
  {
    label: 'プロジェクト',
    href: '/projects',
    permissions: ['projects.view', 'projects.manage'],
    icon: 'Briefcase'
  },
  {
    label: 'ファイル',
    href: '/files',
    permissions: ['files.upload', 'files.manage'],
    icon: 'FileText',
    children: [
      { label: 'ファイル管理', href: '/files', permissions: ['files.manage'], icon: 'FileText' },
      { label: 'アップロード', href: '/files/upload', permissions: ['files.upload'], icon: 'Upload' }
    ]
  }
];

// アイコンマッピング
const iconMap = {
  Home,
  BarChart3,
  Shield,
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Briefcase,
  User,
  Settings,
  Upload
};

interface IntegratedHeaderProps {
  className?: string;
}

export default function IntegratedHeader({ className }: IntegratedHeaderProps) {
  const router = useRouter();
  const { user, loading, filterNavigationItems, primaryRole, roleLevel, isAdmin } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  // 権限に基づいてナビゲーションアイテムをフィルタリング
  const visibleNavigationItems = user ? filterNavigationItems(navigationStructure) : [];

  const handleLogout = async () => {
    try {
      // ログアウト処理（実装は認証システムに依存）
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderIcon = (iconName: string, className: string = 'h-5 w-5') => {
    const Icon = iconMap[iconName as keyof typeof iconMap];
    return Icon ? <Icon className={className} /> : <Home className={className} />;
  };

  const renderNavigationItem = (item: NavigationItem, isMobile: boolean = false) => {
    if (item.children && item.children.length > 0) {
      return (
        <DropdownMenu key={item.href}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1">
              {renderIcon(item.icon || 'Home', 'h-4 w-4')}
              <span>{item.label}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.children.map((child) => (
              <DropdownMenuItem key={child.href} asChild>
                <Link href={child.href} className="flex items-center space-x-2">
                  {renderIcon(child.icon || 'Home', 'h-4 w-4')}
                  <span>{child.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
      >
        {renderIcon(item.icon || 'Home', 'h-4 w-4')}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ・ブランド */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">NEOポータル</h1>
                <p className="text-xs text-gray-500">統合管理プラットフォーム</p>
              </div>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center space-x-1">
            {visibleNavigationItems.map(renderNavigationItem)}
          </nav>

          {/* ユーザーエリア */}
          <div className="flex items-center space-x-4">
            {/* 通知ベル */}
            {user && (
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            )}

            {user ? (
              /* ユーザーメニュー */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={isAdmin ? 'destructive' : 'secondary'} className="text-xs">
                          {primaryRole}
                        </Badge>
                        <span className="text-xs text-gray-500">Lv.{roleLevel}</span>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>プロフィール</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>設定</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* ログインボタン */
              <Button asChild>
                <Link href="/login">ログイン</Link>
              </Button>
            )}

            {/* モバイルメニュー */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>メニュー</SheetTitle>
                  <SheetDescription>
                    NEOポータル ナビゲーション
                  </SheetDescription>
                </SheetHeader>
                <nav className="mt-6 space-y-2">
                  {visibleNavigationItems.map((item) => (
                    <div key={item.href} className="space-y-1">
                      <Link
                        href={item.href}
                        className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {renderIcon(item.icon || 'Home', 'h-4 w-4')}
                        <span>{item.label}</span>
                      </Link>
                      {item.children && (
                        <div className="ml-6 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="flex items-center space-x-3 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {renderIcon(child.icon || 'Home', 'h-3 w-3')}
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}