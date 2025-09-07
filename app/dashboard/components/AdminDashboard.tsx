'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Server,
  TrendingUp,
  UserPlus,
  Settings,
  FileText,
  Eye
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  systemLoad: number;
  uptime: number;
  alerts: number;
  storage: number;
  recentActivities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    type: 'info' | 'warning' | 'success' | 'error';
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      // モックデータ（実際の実装では API から取得）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalUsers: 1247,
        activeUsers: 892,
        adminUsers: 3,
        systemLoad: 12,
        uptime: 99.9,
        alerts: 0,
        storage: 45,
        recentActivities: [
          {
            id: '1',
            action: '新規ユーザー登録',
            user: 'tanaka@example.com',
            timestamp: '5分前',
            type: 'info'
          },
          {
            id: '2',
            action: 'システム設定変更',
            user: 'admin@neo-portal.local',
            timestamp: '15分前',
            type: 'warning'
          },
          {
            id: '3',
            action: 'データベースバックアップ完了',
            user: 'system',
            timestamp: '30分前',
            type: 'success'
          },
          {
            id: '4',
            action: '権限変更',
            user: 'manager@example.com',
            timestamp: '1時間前',
            type: 'info'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">システム統計の取得に失敗しました。</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <Activity className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* システム統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              アクティブ: {stats.activeUsers.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理者数</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.adminUsers}</div>
            <p className="text-xs text-gray-600">システム管理者</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">システム負荷</CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemLoad}%</div>
            <p className="text-xs text-green-600">良好</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働時間</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uptime}%</div>
            <p className="text-xs text-gray-600">今月の平均</p>
          </CardContent>
        </Card>
      </div>

      {/* メイン管理エリア */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 管理機能 */}
        <div className="lg:col-span-2 space-y-6">
          {/* ユーザー管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-500" />
                ユーザー管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-16 flex flex-col items-center justify-center">
                  <UserPlus className="h-5 w-5 mb-1" />
                  新規ユーザー
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                  <Eye className="h-5 w-5 mb-1" />
                  ユーザー一覧
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                  <Shield className="h-5 w-5 mb-1" />
                  権限管理
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* システム管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-orange-500" />
                システム管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                  <Database className="h-5 w-5 mb-1" />
                  データベース
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                  <Shield className="h-5 w-5 mb-1" />
                  セキュリティ
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                  <TrendingUp className="h-5 w-5 mb-1" />
                  パフォーマンス
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* システムヘルス */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-500" />
                システムヘルス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CPU使用率</span>
                  <Badge variant="secondary">{stats.systemLoad}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">メモリ使用率</span>
                  <Badge variant="outline">68%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ストレージ使用率</span>
                  <Badge variant="secondary">{stats.storage}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ネットワーク</span>
                  <Badge variant="default">正常</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* アラート */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                セキュリティアラート
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.alerts === 0 ? (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">アラートはありません</p>
                  <p className="text-xs text-gray-500">システムは正常に稼働中</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* アラート一覧（実際のアラートがある場合） */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近のアクティビティ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                最近のアクティビティ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">{activity.timestamp}</span>
                        <Badge variant={getActivityBadgeColor(activity.type) as any} className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 管理ツール */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-purple-500" />
                管理ツール
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  ログエクスポート
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm">
                  <Database className="h-4 w-4 mr-2" />
                  DBメンテナンス
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm">
                  <Activity className="h-4 w-4 mr-2" />
                  キャッシュクリア
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}