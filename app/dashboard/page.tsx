'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { 
  User, 
  Shield, 
  BookOpen, 
  Building2, 
  Users, 
  GraduationCap,
  BarChart3,
  Settings,
  Bell,
  FileText
} from 'lucide-react';

// 各ダッシュボードコンポーネントのインポート
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import CommitteeDashboard from './components/CommitteeDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import UserDashboard from './components/UserDashboard';

export default function IntegratedDashboard() {
  const searchParams = useSearchParams();
  const { 
    user, 
    loading, 
    dashboardPermissions,
    primaryRole,
    roleLevel,
    isAdmin,
    isStudent,
    isTeacher,
    isCompanyUser
  } = usePermissions();

  const [activeView, setActiveView] = useState<string>('');

  // URLパラメータまたはデフォルトビューを設定
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) {
      setActiveView(viewParam);
    } else {
      setActiveView(dashboardPermissions.defaultView);
    }
  }, [searchParams, dashboardPermissions.defaultView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">アクセス拒否</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              ダッシュボードにアクセスするには認証が必要です。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 利用可能なタブを生成
  const availableTabs = [
    {
      id: 'admin',
      label: '管理者',
      icon: Shield,
      enabled: dashboardPermissions.canViewAdmin,
      description: 'システム管理とユーザー管理'
    },
    {
      id: 'teacher',
      label: '教師',
      icon: GraduationCap,
      enabled: dashboardPermissions.canViewTeacher,
      description: '授業と学生管理'
    },
    {
      id: 'company',
      label: '企業',
      icon: Building2,
      enabled: dashboardPermissions.canViewCompany,
      description: '企業ダッシュボード'
    },
    {
      id: 'committee',
      label: '委員会',
      icon: Users,
      enabled: dashboardPermissions.canViewCommittee,
      description: '委員会活動管理'
    },
    {
      id: 'student',
      label: '学生',
      icon: BookOpen,
      enabled: dashboardPermissions.canViewStudent,
      description: '学習進捗と活動'
    },
    {
      id: 'user',
      label: '個人',
      icon: User,
      enabled: true, // 全ユーザーがアクセス可能
      description: '個人設定と基本情報'
    }
  ].filter(tab => tab.enabled);

  const renderDashboard = () => {
    switch (activeView) {
      case 'admin':
        return <AdminDashboard />;
      case 'student':
        return <StudentDashboard />;
      case 'company':
        return <CompanyDashboard />;
      case 'committee':
        return <CommitteeDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <MainLayout>
      <PermissionGuard permissions={['dashboard.view']} fallbackPermissions={[]}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
            {/* ユーザー情報ヘッダー */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      NEOポータル ダッシュボード
                    </h1>
                    <p className="text-sm text-gray-500">統合管理プラットフォーム</p>
                  </div>
                </div>
                
                {user && (
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={isAdmin ? 'destructive' : isTeacher ? 'default' : 'secondary'}>
                          {primaryRole}
                        </Badge>
                        <span className="text-xs text-gray-500">レベル {roleLevel}</span>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* タブリスト */}
          <TabsList className="grid grid-cols-2 lg:grid-cols-6 gap-2 h-auto bg-transparent">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center justify-center p-4 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
                >
                  <Icon className="h-5 w-5 mb-2" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  <span className="text-xs text-gray-500 hidden lg:block mt-1">
                    {tab.description}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* タブコンテンツ */}
          {availableTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {renderDashboard()}
            </TabsContent>
          ))}
          </Tabs>

          {/* クイックアクション（フローティング） */}
          <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
            {isAdmin && (
              <button className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            )}
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors">
              <FileText className="h-5 w-5" />
            </button>
          </div>
        </div>

      {/* クイックアクション（フローティング） */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
        {isAdmin && (
          <button className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        )}
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors">
          <Bell className="h-5 w-5" />
        </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors">
              <FileText className="h-5 w-5" />
            </button>
          </div>
        </div>
      </PermissionGuard>
    </MainLayout>
  );
}