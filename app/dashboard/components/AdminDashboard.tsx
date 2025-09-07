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
  heroStepDistribution: Array<{
    step: number;
    count: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
    label: string;
    color: string;
  }>;
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
        heroStepDistribution: [
          { step: 1, count: 354, percentage: 28.4 },
          { step: 2, count: 298, percentage: 23.9 },
          { step: 3, count: 267, percentage: 21.4 },
          { step: 4, count: 198, percentage: 15.9 },
          { step: 5, count: 130, percentage: 10.4 }
        ],
        statusDistribution: [
          { status: 'core', count: 125, percentage: 10.0, label: 'コア', color: '#ef4444' },
          { status: 'active', count: 498, percentage: 39.9, label: 'アクティブ', color: '#3b82f6' },
          { status: 'peripheral', count: 374, percentage: 30.0, label: '周辺', color: '#6b7280' },
          { status: 'at_risk', count: 187, percentage: 15.0, label: '離脱予備軍', color: '#f59e0b' },
          { status: 'inactive', count: 63, percentage: 5.1, label: '非アクティブ', color: '#9ca3af' }
        ],
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

          {/* ヒーローステップ分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                ヒーローステップ分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.heroStepDistribution.map((item) => (
                  <div key={item.step}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        ステップ {item.step}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.count}人 ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">ステップ説明</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>ステップ1: エントリー - 新規参加者</div>
                    <div>ステップ2: 基礎学習 - 学習フェーズ</div>
                    <div>ステップ3: 実践参加 - 実践フェーズ</div>
                    <div>ステップ4: プロジェクト実行 - 実行フェーズ</div>
                    <div>ステップ5: リーダーシップ - 指導的役割</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* エンゲージメント ステータス分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-500" />
                エンゲージメント分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.statusDistribution.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.count}人 ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">ステータス説明</h4>
                  <div className="text-xs text-green-700 space-y-1">
                    <div><strong>コア:</strong> 最重要メンバー、高い貢献度</div>
                    <div><strong>アクティブ:</strong> 活発に参加している一般メンバー</div>
                    <div><strong>周辺:</strong> 時々参加、軽い関与レベル</div>
                    <div><strong>離脱予備軍:</strong> 活動減少傾向、要注意</div>
                    <div><strong>非アクティブ:</strong> 長期間活動停止</div>
                  </div>
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