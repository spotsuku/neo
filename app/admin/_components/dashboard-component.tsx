'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  UserCheck, 
  FolderOpen, 
  Calendar, 
  Bell, 
  Settings, 
  Shield,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Download
} from 'lucide-react';
import { AdminStats, SystemAlert, UserActivity, PerformanceMetrics } from '@/types/admin';
import { OptimizedAvatar } from '@/components/ui/optimized-image';

export function AdminDashboardComponent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // 30秒ごとに更新
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes, activityRes, performanceRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/alerts'),
        fetch('/api/admin/activity'),
        fetch('/api/admin/performance')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData);
      }

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json();
        setPerformance(performanceData);
      }
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <p className="text-gray-600 mt-1">NEO Digital Platform システム管理</p>
        </div>
        <div className="flex items-center space-x-2">
          {stats && (
            <Badge variant="outline" className="flex items-center space-x-1">
              {getStatusIcon(stats.systemHealth)}
              <span>システム状態: {stats.systemHealth === 'healthy' ? '正常' : stats.systemHealth === 'warning' ? '警告' : 'エラー'}</span>
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <Activity className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* 重要なアラート */}
      {alerts.filter(alert => alert.type === 'critical' || alert.type === 'error').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              重要なアラート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.filter(alert => alert.type === 'critical' || alert.type === 'error').slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex justify-between items-center p-3 bg-white rounded border">
                <div>
                  <p className="font-medium text-red-800">{alert.title}</p>
                  <p className="text-sm text-red-600">{alert.message}</p>
                </div>
                <Badge className={getAlertColor(alert.type)}>
                  {alert.type === 'critical' ? '緊急' : 'エラー'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats?.activeUsers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">企業数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats?.activeCompanies || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats?.activeMembers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">プロジェクト数</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats?.activeProjects || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブ式コンテンツ */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          <TabsTrigger value="system">システム</TabsTrigger>
          <TabsTrigger value="logs">監査ログ</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* パフォーマンス指標 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  パフォーマンス指標
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {performance && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>応答時間</span>
                        <span>{performance.responseTime}ms</span>
                      </div>
                      <Progress value={Math.min(performance.responseTime / 10, 100)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>エラー率</span>
                        <span>{(performance.errorRate * 100).toFixed(2)}%</span>
                      </div>
                      <Progress value={performance.errorRate * 100} className="bg-red-100" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>スループット</span>
                        <span>{performance.throughput} req/min</span>
                      </div>
                      <Progress value={Math.min(performance.throughput / 10, 100)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 最近のアクティビティ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  最近のアクティビティ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{activity.userName}</p>
                        <p className="text-xs text-gray-600">{activity.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                          {activity.status === 'active' ? 'アクティブ' : '非アクティブ'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.lastLogin ? new Date(activity.lastLogin).toLocaleDateString('ja-JP') : '未ログイン'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ユーザー管理タブ */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  ユーザー管理
                </span>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                </Button>
              </CardTitle>
              <CardDescription>
                システム内の全ユーザーを管理します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">フィルター</Button>
                  <Button variant="outline" size="sm">検索</Button>
                </div>
                <Button>新規ユーザー追加</Button>
              </div>
              <div className="text-center py-8 text-gray-500">
                ユーザー管理機能は個別ページで実装されます
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* システムタブ */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                システム設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Database className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">データベース管理</div>
                    <div className="text-sm text-gray-500">バックアップ、復元、メンテナンス</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Shield className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">セキュリティ設定</div>
                    <div className="text-sm text-gray-500">認証、権限、アクセス制御</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Bell className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">通知設定</div>
                    <div className="text-sm text-gray-500">メール、Slack、アラート</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Activity className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">モニタリング</div>
                    <div className="text-sm text-gray-500">パフォーマンス、ログ、メトリクス</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 監査ログタブ */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                監査ログ
              </CardTitle>
              <CardDescription>
                システム内の全ての操作ログを確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                監査ログビューアーは個別ページで実装されます
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}