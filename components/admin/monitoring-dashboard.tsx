/**
 * 管理者用モニタリングダッシュボード
 * システムの健全性とパフォーマンスを監視
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  Server,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';

// 型定義（実際のlib/monitoring.tsから）
interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
  responseTime?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface SystemStats {
  memoryUsage?: number;
  cpuUsage?: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: string;
}

interface ErrorEvent {
  id: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  timestamp: string;
  userId?: number;
}

interface DashboardData {
  health: HealthCheck[];
  stats: SystemStats;
  recentErrors: ErrorEvent[];
  performanceMetrics: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

export default function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  // ダッシュボードデータの取得
  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const response = await fetch('/api/monitoring/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      setDashboardData(data);

      // アラート条件のチェック
      const alertResponse = await fetch('/api/monitoring/alerts');
      if (alertResponse.ok) {
        const alertData = await alertResponse.json();
        setAlerts(alertData.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // 30秒ごとに自動更新
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatResponseTime = (time: number | undefined) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">監視データを読み込み中...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
        <p className="text-gray-600">監視データの取得に失敗しました</p>
        <Button onClick={() => fetchDashboardData()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">システム監視ダッシュボード</h1>
          <p className="text-gray-600">
            最終更新: {new Date(dashboardData.stats.timestamp).toLocaleString('ja-JP')}
          </p>
        </div>
        <Button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* アラート */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              アラート ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="text-red-700 text-sm">
                  • {alert}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* システム概要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均レスポンス時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatResponseTime(dashboardData.stats.responseTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">スループット</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.stats.throughput.toFixed(1)}/分
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className={`h-8 w-8 ${dashboardData.stats.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">エラー率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(dashboardData.stats.errorRate * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">アクティブ接続</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.stats.activeConnections}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">ヘルスチェック</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="errors">エラーログ</TabsTrigger>
          <TabsTrigger value="resources">リソース</TabsTrigger>
        </TabsList>

        {/* ヘルスチェックタブ */}
        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboardData.health.map((healthCheck, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={getStatusColor(healthCheck.status)}>
                        {healthCheck.status === 'healthy' && <Database className="h-5 w-5" />}
                        {healthCheck.status === 'warning' && <Server className="h-5 w-5" />}
                        {healthCheck.status === 'critical' && <HardDrive className="h-5 w-5" />}
                      </div>
                      <span className="ml-2 capitalize">{healthCheck.service.replace('_', ' ')}</span>
                    </div>
                    <Badge 
                      variant={
                        healthCheck.status === 'healthy' ? 'default' : 
                        healthCheck.status === 'warning' ? 'secondary' : 'destructive'
                      }
                    >
                      {healthCheck.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">{healthCheck.message}</p>
                  {healthCheck.responseTime && (
                    <p className="text-xs text-gray-500">
                      レスポンス時間: {formatResponseTime(healthCheck.responseTime)}
                    </p>
                  )}
                  {healthCheck.metadata && Object.keys(healthCheck.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {Object.entries(healthCheck.metadata).map(([key, value]) => (
                        <div key={key}>{key}: {typeof value === 'number' ? formatBytes(value) : String(value)}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* パフォーマンスタブ */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  レスポンス時間
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>平均</span>
                      <span>{formatResponseTime(dashboardData.performanceMetrics.avgResponseTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((dashboardData.performanceMetrics.avgResponseTime / 2000) * 100, 100)} 
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>95パーセンタイル</span>
                      <span>{formatResponseTime(dashboardData.performanceMetrics.p95ResponseTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((dashboardData.performanceMetrics.p95ResponseTime / 2000) * 100, 100)} 
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>99パーセンタイル</span>
                      <span>{formatResponseTime(dashboardData.performanceMetrics.p99ResponseTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((dashboardData.performanceMetrics.p99ResponseTime / 2000) * 100, 100)} 
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  スループット分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboardData.stats.throughput.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">リクエスト/分</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    過去1時間の平均値
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  エラー統計
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {(dashboardData.stats.errorRate * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600">エラー率</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    目標: &lt; 1%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* エラーログタブ */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  最近のエラー
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  エクスポート
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.recentErrors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">エラーはありません</p>
              ) : (
                <div className="space-y-4">
                  {dashboardData.recentErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`border-l-4 pl-4 py-2 ${
                        error.level === 'error' 
                          ? 'border-red-500 bg-red-50' 
                          : error.level === 'warning'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <Badge 
                              variant={error.level === 'error' ? 'destructive' : 'secondary'}
                              className="mr-2"
                            >
                              {error.level.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(error.timestamp).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{error.message}</p>
                          {error.context && (
                            <p className="text-xs text-gray-600 mt-1">
                              {JSON.stringify(error.context, null, 2)}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* リソースタブ */}
        <TabsContent value="resources">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  システムリソース
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.stats.memoryUsage && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>メモリ使用量</span>
                        <span>{formatBytes(dashboardData.stats.memoryUsage)}</span>
                      </div>
                      <Progress 
                        value={Math.min((dashboardData.stats.memoryUsage / (100 * 1024 * 1024)) * 100, 100)} 
                      />
                    </div>
                  )}
                  {dashboardData.stats.cpuUsage && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU使用率</span>
                        <span>{dashboardData.stats.cpuUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={dashboardData.stats.cpuUsage} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  ストレージ使用状況
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Cloudflare D1, KV, R2の使用状況は
                    <br />
                    Cloudflareダッシュボードで確認できます。
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Cloudflareダッシュボードを開く
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}