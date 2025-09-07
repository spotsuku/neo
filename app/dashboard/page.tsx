// NEO Portal - ダッシュボードページ
// 認証済みユーザー向けメインダッシュボード

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Building2, 
  Megaphone, 
  Calendar,
  FolderOpen,
  TrendingUp,
  AlertCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard-layout';
import type { AuthUser } from '@/lib/auth';

interface DashboardStats {
  totalMembers: number;
  activeCompanies: number;
  recentAnnouncements: number;
  upcomingClasses: number;
  activeProjects: number;
}

interface RecentAnnouncement {
  id: string;
  title: string;
  summary?: string;
  is_important: boolean;
  created_at: string;
  author_name?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<RecentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // 認証状態確認とデータ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ユーザー情報取得
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
          
          // ダッシュボード統計データ（モック）
          setStats({
            totalMembers: 127,
            activeCompanies: 42,
            recentAnnouncements: 8,
            upcomingClasses: 5,
            activeProjects: 12
          });

          // 最近のお知らせ取得
          const announcementsResponse = await fetch('/api/announcements?limit=5');
          if (announcementsResponse.ok) {
            const announcementsData = await announcementsResponse.json();
            setAnnouncements(announcementsData.announcements || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ロール別クイックアクション
  const getQuickActions = () => {
    if (!user) return [];

    const baseActions = [
      { icon: Users, label: 'メンバー', href: '/members', color: 'bg-blue-500' },
      { icon: Megaphone, label: 'お知らせ', href: '/announcements', color: 'bg-green-500' },
      { icon: Calendar, label: 'クラス', href: '/classes', color: 'bg-purple-500' },
      { icon: FolderOpen, label: 'プロジェクト', href: '/projects', color: 'bg-orange-500' },
    ];

    if (user.role === 'owner' || user.role === 'secretariat') {
      baseActions.push({
        icon: Building2,
        label: '企業管理',
        href: '/companies',
        color: 'bg-red-500'
      });
    }

    return baseActions;
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">認証が必要です</CardTitle>
            <CardDescription className="text-center">
              ダッシュボードにアクセスするにはログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth">
              <Button className="w-full">ログインページへ</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            おかえりなさい、{user.name}さん
          </h1>
          <p className="text-gray-600 mt-1">
            <MapPin className="inline h-4 w-4 mr-1" />
            {user.accessible_regions.join('・')} 地域 • {user.role}
          </p>
        </div>

        {/* 統計カード */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">メンバー</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">企業</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCompanies}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">お知らせ</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.recentAnnouncements}</p>
                  </div>
                  <Megaphone className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">予定クラス</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.upcomingClasses}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">プロジェクト</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* メインコンテンツエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 最近のお知らせ */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Megaphone className="h-5 w-5" />
                <span>最近のお知らせ</span>
              </CardTitle>
              <CardDescription>
                あなた向けの最新のお知らせです
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {announcement.title}
                          </h4>
                          {announcement.is_important && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {announcement.summary && (
                          <p className="text-sm text-gray-600 mt-1">
                            {announcement.summary}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>{announcement.author_name || '管理者'}</span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  新しいお知らせはありません
                </p>
              )}
              <div className="pt-4 border-t">
                <Link href="/announcements">
                  <Button variant="outline" className="w-full">
                    すべてのお知らせを見る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>クイックアクション</span>
              </CardTitle>
              <CardDescription>
                よく使う機能への素早いアクセス
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getQuickActions().map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <Button variant="outline" className="w-full justify-start">
                      <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mr-3`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      {action.label}
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}