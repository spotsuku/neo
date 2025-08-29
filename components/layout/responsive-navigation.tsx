// レスポンシブナビゲーションコンポーネント - モバイル・タブレット・デスクトップ対応
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  Building2, 
  Megaphone, 
  Calendar,
  FolderOpen,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFocusManagement, useKeyboardShortcuts, useBreakpoint } from '@/lib/hooks/use-focus-management';
import type { AuthUser } from '@/lib/auth';

interface NavigationProps {
  user?: AuthUser | null;
  onNavigate?: (href: string) => void;
}

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  requiredRoles?: string[];
  shortcut?: string;
  category: 'primary' | 'secondary';
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', icon: Home, label: 'ダッシュボード', shortcut: 'D', category: 'primary' },
  { href: '/members', icon: Users, label: 'メンバー管理', shortcut: 'M', category: 'primary' },
  { href: '/companies', icon: Building2, label: '企業管理', requiredRoles: ['owner', 'secretariat'], shortcut: 'C', category: 'primary' },
  { href: '/announcements', icon: Megaphone, label: 'お知らせ', shortcut: 'A', category: 'primary' },
  { href: '/classes', icon: Calendar, label: 'クラス・イベント', shortcut: 'E', category: 'secondary' },
  { href: '/projects', icon: FolderOpen, label: 'プロジェクト', shortcut: 'P', category: 'secondary' },
  { href: '/settings', icon: Settings, label: '設定', shortcut: 'S', category: 'secondary' },
];

export function MobileNavigation({ user, onNavigate }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  
  // ユーザーロールによるメニューフィルタリング
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredRoles) return true;
    return user && item.requiredRoles.includes(user.role);
  });

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    onNavigate?.(href);
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <AccessibleButton
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50"
            aria-label="メインメニューを開く"
            srOnlyText="ナビゲーションメニュー"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </AccessibleButton>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 neo-gradient rounded-lg flex items-center justify-center" aria-hidden="true">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span>NEO Platform</span>
            </SheetTitle>
          </SheetHeader>
          
          <nav 
            className="p-4 space-y-1"
            role="navigation"
            aria-label="主要機能メニュー"
          >
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring touch-target ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => handleNavigation(item.href)}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.shortcut ? `${item.label} (Alt+${item.shortcut})` : item.label}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded opacity-60">
                      Alt+{item.shortcut}
                    </kbd>
                  )}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function TabletNavigation({ user, onNavigate }: NavigationProps) {
  const [activeTab, setActiveTab] = useState('primary');
  const pathname = usePathname();
  
  // ユーザーロールによるメニューフィルタリング
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredRoles) return true;
    return user && item.requiredRoles.includes(user.role);
  });

  const primaryItems = filteredMenuItems.filter(item => item.category === 'primary');
  const secondaryItems = filteredMenuItems.filter(item => item.category === 'secondary');

  return (
    <nav className="hidden sm:block md:hidden bg-card border-b border-border" role="navigation" aria-label="タブレット用ナビゲーション">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="primary" className="touch-target">
            主要機能
          </TabsTrigger>
          <TabsTrigger value="secondary" className="touch-target">
            設定・その他
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="primary" className="mt-0">
          <div className="flex space-x-2 overflow-x-auto pb-4" role="menubar">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring touch-target ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => onNavigate?.(item.href)}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="secondary" className="mt-0">
          <div className="flex space-x-2 overflow-x-auto pb-4" role="menubar">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring touch-target ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => onNavigate?.(item.href)}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </nav>
  );
}

export function DesktopNavigation({ user, onNavigate }: NavigationProps) {
  const pathname = usePathname();
  
  // ユーザーロールによるメニューフィルタリング
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredRoles) return true;
    return user && item.requiredRoles.includes(user.role);
  });

  // キーボードショートカット
  const shortcuts = filteredMenuItems.reduce((acc, item) => {
    if (item.shortcut) {
      acc[`alt+${item.shortcut.toLowerCase()}`] = () => {
        onNavigate?.(item.href);
      };
    }
    return acc;
  }, {} as Record<string, () => void>);

  useKeyboardShortcuts(shortcuts);

  return (
    <nav className="p-4 space-y-1" role="navigation" aria-label="メイン機能">
      {filteredMenuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 group ${
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            onClick={() => onNavigate?.(item.href)}
            aria-current={isActive ? 'page' : undefined}
            title={item.shortcut ? `${item.label} (Alt+${item.shortcut})` : item.label}
          >
            <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium flex-1">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-80">
                Alt+{item.shortcut}
              </kbd>
            )}
          </Link>
        );
      })}
    </nav>
  );
}