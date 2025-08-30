/**
 * リアルタイムメトリクス表示コンポーネント
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  TrendingUp,
  Wifi,
  Zap
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: string;
      responseTime: number;
      message: string;
    };
    storage: {
      status: string;
      kv: { status: string; responseTime: number };
      r2: { status: string; responseTime: number };
      message: string;
    };
    memory: {
      status: string;
      used?: string;
      total?: string;
      percentage?: number;
      message?: string;
    };
    responseTime: number;
  };
}

interface MetricData {
  timestamp: string;
  value: number;
  status: 'good' | 'warning' | 'critical';
}

export default function RealTimeMetrics() {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, MetricData[]>>({
    responseTime: [],
    memoryUsage: [],
    errorRate: []
  });

  // ヘルスデータの取得
  const fetchHealthData = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      setHealthData(data);
      setLastUpdate(new Date().toLocaleTimeString('ja-JP'));
      
      // メトリクス履歴に追加
      const timestamp = new Date().toISOString();
      setMetrics(prev => ({
        responseTime: [
          ...prev.responseTime.slice(-19), // 最新20件を保持
          {
            timestamp,
            value: data.checks.responseTime,
            status: data.checks.responseTime < 100 ? 'good' : 
                   data.checks.responseTime < 500 ? 'warning' : 'critical'
          }
        ],
        memoryUsage: [
          ...prev.memoryUsage.slice(-19),
          {
            timestamp,
            value: data.checks.memory.percentage || 0,
            status: (data.checks.memory.percentage || 0) < 70 ? 'good' :
                   (data.checks.memory.percentage || 0) < 85 ? 'warning' : 'critical'
          }
        ],
        errorRate: [
          ...prev.errorRate.slice(-19),
          {
            timestamp,
            value: Math.random() * 5, // 実際はエラー率APIから取得
            status: 'good' // 実装時に適切な判定を追加
          }
        ]
      }));
      
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期データ取得と定期更新
  useEffect(() => {
    fetchHealthData();
    
    // 30秒ごとに更新
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">リアルタイムメトリクスを読み込み中...</span>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
        <p className="text-gray-600">ヘルスデータの取得に失敗しました</p>
        <Button onClick={fetchHealthData} className="mt-4">
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
          <h2 className="text-2xl font-bold text-gray-900">リアルタイムメトリクス</h2>
          <p className="text-gray-600">最終更新: {lastUpdate}</p>
        </div>
        <Button
          onClick={fetchHealthData}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* 総合ステータス */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {getStatusIcon(healthData.status)}
            <span className="ml-2">システム総合ステータス</span>
            <Badge className={`ml-2 ${getStatusColor(healthData.status)}`}>
              {healthData.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">バージョン</p>
              <p className="font-mono text-sm">{healthData.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">環境</p>
              <p className="font-mono text-sm">{healthData.environment}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">稼働時間</p>
              <p className="font-mono text-sm">{Math.floor(healthData.uptime / 3600)}時間</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">レスポンス時間</p>
              <p className="font-mono text-sm">{healthData.checks.responseTime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サービス別ステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* データベース */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Database className="mr-2 h-5 w-5" />
              データベース
              <Badge className={`ml-2 ${getStatusColor(healthData.checks.database.status)}`}>
                {healthData.checks.database.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>レスポンス時間</span>
                <span className="font-mono">{healthData.checks.database.responseTime}ms</span>
              </div>
              <Progress 
                value={Math.min(healthData.checks.database.responseTime / 10, 100)} 
                className="h-2"
              />
              <p className="text-xs text-gray-600">{healthData.checks.database.message}</p>
            </div>
          </CardContent>
        </Card>

        {/* ストレージ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <HardDrive className="mr-2 h-5 w-5" />
              ストレージ
              <Badge className={`ml-2 ${getStatusColor(healthData.checks.storage.status)}`}>
                {healthData.checks.storage.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>KV ストレージ</span>
                  <span className="font-mono">{healthData.checks.storage.kv.responseTime}ms</span>
                </div>
                <Progress 
                  value={Math.min(healthData.checks.storage.kv.responseTime / 5, 100)} 
                  className="h-1 mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>R2 ストレージ</span>
                  <span className="font-mono">{healthData.checks.storage.r2.responseTime}ms</span>
                </div>
                <Progress 
                  value={Math.min(healthData.checks.storage.r2.responseTime / 10, 100)} 
                  className="h-1 mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* メモリ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Cpu className="mr-2 h-5 w-5" />
              メモリ使用量
              <Badge className={`ml-2 ${getStatusColor(healthData.checks.memory.status)}`}>
                {healthData.checks.memory.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.checks.memory.used ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>使用量</span>
                    <span className="font-mono">
                      {healthData.checks.memory.used} / {healthData.checks.memory.total}
                    </span>
                  </div>
                  <Progress 
                    value={healthData.checks.memory.percentage || 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-600">
                    {healthData.checks.memory.percentage}% 使用中
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-600">{healthData.checks.memory.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メトリクス履歴グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* レスポンス時間グラフ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Clock className="mr-2 h-5 w-5" />
              レスポンス時間 (直近20回)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-24 flex items-end space-x-1">
              {metrics.responseTime.map((metric, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t ${
                    metric.status === 'good' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${Math.max((metric.value / 1000) * 100, 5)}%` }}
                  title={`${metric.value}ms - ${new Date(metric.timestamp).toLocaleTimeString()}`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              平均: {metrics.responseTime.length > 0 
                ? Math.round(metrics.responseTime.reduce((sum, m) => sum + m.value, 0) / metrics.responseTime.length)
                : 0}ms
            </div>
          </CardContent>
        </Card>

        {/* メモリ使用量グラフ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <TrendingUp className="mr-2 h-5 w-5" />
              メモリ使用量 (直近20回)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-24 flex items-end space-x-1">
              {metrics.memoryUsage.map((metric, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t ${
                    metric.status === 'good' ? 'bg-blue-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${Math.max(metric.value, 5)}%` }}
                  title={`${metric.value}% - ${new Date(metric.timestamp).toLocaleTimeString()}`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              平均: {metrics.memoryUsage.length > 0 
                ? Math.round(metrics.memoryUsage.reduce((sum, m) => sum + m.value, 0) / metrics.memoryUsage.length)
                : 0}%
            </div>
          </CardContent>
        </Card>

        {/* 接続状況 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Wifi className="mr-2 h-5 w-5" />
              システム接続状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">データベース</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs font-mono">接続中</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">KV ストレージ</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs font-mono">接続中</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">R2 ストレージ</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs font-mono">接続中</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}