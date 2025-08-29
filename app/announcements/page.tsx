// NEO Digital Platform - お知らせ管理ページ
// お知らせ一覧・作成・編集機能

'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import type { AuthUser } from '@/lib/auth';

interface Announcement {
  id: string;
  region_id: string;
  title: string;
  content: string;
  summary?: string;
  author_id: string;
  author_name?: string;
  target_roles: string[];
  is_published: boolean;
  is_important: boolean;
  publish_date?: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementFilter {
  search: string;
  region: string;
  important: boolean;
}

export default function AnnouncementsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AnnouncementFilter>({
    search: '',
    region: 'ALL',
    important: false
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ユーザー情報取得
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
        }

        // お知らせ一覧取得
        const params = new URLSearchParams({
          limit: '20',
          ...(filter.region !== 'ALL' && { region: filter.region }),
          ...(filter.important && { important: 'true' })
        });

        const announcementsResponse = await fetch(`/api/announcements?${params}`);
        if (announcementsResponse.ok) {
          const data = await announcementsResponse.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter.region, filter.important]);

  // 検索フィルタリング
  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(filter.search.toLowerCase()) ||
    (announcement.summary && announcement.summary.toLowerCase().includes(filter.search.toLowerCase()))
  );

  // 地域名変換
  const getRegionName = (regionId: string) => {
    switch (regionId) {
      case 'FUK': return '福岡';
      case 'ISK': return '石川';
      case 'NIG': return '新潟';
      case 'ALL': return '全地域';
      default: return regionId;
    }
  };

  // ロール名変換
  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー';
      case 'secretariat': return '事務局';
      case 'company_admin': return '企業管理者';
      case 'student': return '学生';
      default: return role;
    }
  };

  // 作成権限チェック
  const canCreate = user && ['owner', 'secretariat', 'company_admin'].includes(user.role as string);

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">お知らせ管理</h1>
            <p className="text-gray-600 mt-1">
              最新のお知らせと重要な情報をチェックしましょう
            </p>
          </div>
          {canCreate && (
            <Button 
              className="mt-4 sm:mt-0"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              お知らせ作成
            </Button>
          )}
        </div>

        {/* フィルター */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="お知らせを検索..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filter.region}
                  onChange={(e) => setFilter(prev => ({ ...prev, region: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">全地域</option>
                  <option value="FUK">福岡</option>
                  <option value="ISK">石川</option>
                  <option value="NIG">新潟</option>
                </select>

                <Button
                  variant={filter.important ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(prev => ({ ...prev, important: !prev.important }))}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  重要
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* お知らせ一覧 */}
        <div className="space-y-4">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* タイトルと重要マーク */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {announcement.title}
                        </h3>
                        {announcement.is_important && (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                              重要
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 要約 */}
                      {announcement.summary && (
                        <p className="text-gray-600 mb-3 text-sm">
                          {announcement.summary}
                        </p>
                      )}

                      {/* メタ情報 */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {announcement.author_name || '管理者'}
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {getRegionName(announcement.region_id)}
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* 対象ロール */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-500">対象:</span>
                        <div className="flex flex-wrap gap-1">
                          {announcement.target_roles.map((role) => (
                            <span
                              key={role}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                            >
                              {getRoleName(role)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    {canCreate && (
                      <div className="flex space-x-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* コンテンツプレビュー */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        詳細を表示
                      </summary>
                      <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                        {announcement.content}
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  お知らせがありません
                </h3>
                <p className="text-gray-600">
                  {filter.search || filter.important 
                    ? '検索条件に一致するお知らせがありません' 
                    : 'まだお知らせが投稿されていません'
                  }
                </p>
                {canCreate && !filter.search && (
                  <Button 
                    className="mt-4"
                    onClick={() => setShowCreateForm(true)}
                  >
                    最初のお知らせを作成
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 作成フォーム（モーダル的表示） */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>新しいお知らせ作成</CardTitle>
                <CardDescription>
                  メンバーに向けた重要な情報を共有しましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  ※ お知らせ作成フォームは次のフェーズで実装予定です
                </p>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button disabled>
                    作成
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}