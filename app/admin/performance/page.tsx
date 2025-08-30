'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  BarChart3, 
  Package, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Settings
} from 'lucide-react';
import { usePerformanceReport } from '@/lib/performance-monitor';

interface BundleAnalysisReport {
  summary: {
    totalFiles: number;
    totalSizeMB: string;
    estimatedGzipSize: string;
    suggestionCount: number;
    performanceScore: number;
  };
  suggestions: Array<{
    type: string;
    severity: 'warning' | 'info';
    message: string;
    details?: Array<{
      file?: string;
      size?: string;
      suggestion?: string;
    }>;
  }>;
  metrics: {
    totalBundleSize: number;
    jsChunkCount: number;
    cssFileCount: number;
    averageChunkSize: number;
    largestChunk: number;
    estimatedLoadTime: number;
  };
}

interface DependencyReport {
  summary: {
    totalPackages: number;
    usedPackages: number;
    unusedPackages: number;
    usageRate: string;
    suggestionCount: number;
    estimatedSavings: string;
  };
  suggestions: Array<{
    type: string;
    severity: 'warning' | 'info';
    message: string;
    details?: Array<{
      package?: string;
      command?: string;
      suggestion?: string;
    }>;
  }>;
}

export default function PerformancePage() {
  const [bundleReport, setBundleReport] = useState<BundleAnalysisReport | null>(null);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  const { getReport, clearMetrics } = usePerformanceReport();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      // バンドル分析レポートの読み込み
      const bundleResponse = await fetch('/bundle-analysis-report.json');
      if (bundleResponse.ok) {
        const bundleData = await bundleResponse.json();
        setBundleReport(bundleData);
      }

      // 依存関係分析レポートの読み込み
      const depResponse = await fetch('/dependency-analysis-report.json');
      if (depResponse.ok) {
        const depData = await depResponse.json();
        setDependencyReport(depData);
      }

      setLastUpdate(new Date().toLocaleString('ja-JP'));
    } catch (error) {
      console.error('レポート読み込みエラー:', error);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // バンドル分析の実行
      await fetch('/api/admin/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' })
      });
      
      // レポートの再読み込み
      setTimeout(loadReports, 2000);
    } catch (error) {
      console.error('分析エラー:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityBadge = (severity: 'warning' | 'info') => {
    return severity === 'warning' 
      ? <Badge variant="destructive">警告</Badge>
      : <Badge variant="outline">情報</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            パフォーマンス分析
          </h1>
          <p className="text-gray-600">
            バンドル最適化と依存関係管理
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-sm text-gray-500">
              最終更新: {lastUpdate}
            </div>
          )}
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                分析中...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                分析実行
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="bundle">バンドル分析</TabsTrigger>
          <TabsTrigger value="dependencies">依存関係</TabsTrigger>
          <TabsTrigger value="realtime">リアルタイム</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* パフォーマンススコア */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  パフォーマンススコア
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bundleReport ? (
                  <div className={`text-center p-4 rounded-lg ${getScoreColor(bundleReport.summary.performanceScore)}`}>
                    <div className="text-3xl font-bold mb-2">
                      {bundleReport.summary.performanceScore}/100
                    </div>
                    <Progress 
                      value={bundleReport.summary.performanceScore} 
                      className="mb-2"
                    />
                    <div className="text-sm">
                      {bundleReport.summary.performanceScore >= 80 ? '優秀' :
                       bundleReport.summary.performanceScore >= 60 ? '改善の余地あり' : '要改善'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    分析データなし
                  </div>
                )}
              </CardContent>
            </Card>

            {/* バンドルサイズ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  バンドルサイズ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bundleReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">総サイズ</span>
                      <span className="font-medium">{bundleReport.summary.totalSizeMB}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gzip圧縮後</span>
                      <span className="font-medium">{bundleReport.summary.estimatedGzipSize}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ファイル数</span>
                      <span className="font-medium">{bundleReport.summary.totalFiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">読み込み時間</span>
                      <span className="font-medium">{bundleReport.metrics.estimatedLoadTime.toFixed(2)}秒</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">分析データなし</div>
                )}
              </CardContent>
            </Card>

            {/* 依存関係 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  依存関係
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dependencyReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">総パッケージ</span>
                      <span className="font-medium">{dependencyReport.summary.totalPackages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">使用中</span>
                      <span className="font-medium">{dependencyReport.summary.usedPackages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">未使用</span>
                      <span className="font-medium text-red-600">{dependencyReport.summary.unusedPackages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">削減可能サイズ</span>
                      <span className="font-medium">{dependencyReport.summary.estimatedSavings}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">分析データなし</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 最適化提案サマリー */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                最適化提案サマリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundleReport?.suggestions.slice(0, 4).map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getSeverityBadge(suggestion.severity)}
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        {suggestion.message}
                      </div>
                      {suggestion.details && (
                        <div className="text-xs text-gray-600">
                          {suggestion.details.length}件の項目
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* バンドル分析タブ */}
        <TabsContent value="bundle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                バンドル分析詳細
              </CardTitle>
              <CardDescription>
                JavaScriptバンドルの最適化提案とメトリクス
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bundleReport ? (
                <div className="space-y-6">
                  {bundleReport.suggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getSeverityBadge(suggestion.severity)}
                        <h4 className="font-medium">{suggestion.message}</h4>
                      </div>
                      
                      {suggestion.details && (
                        <div className="space-y-2">
                          {suggestion.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span className="font-mono">{detail.file}</span>
                              <div className="flex items-center gap-2">
                                {detail.size && (
                                  <Badge variant="outline">{detail.size}</Badge>
                                )}
                                <span className="text-gray-600">{detail.suggestion}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  バンドル分析データがありません。分析を実行してください。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 依存関係タブ */}
        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                依存関係分析
              </CardTitle>
              <CardDescription>
                未使用パッケージと最適化提案
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dependencyReport ? (
                <div className="space-y-6">
                  {dependencyReport.suggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getSeverityBadge(suggestion.severity)}
                        <h4 className="font-medium">{suggestion.message}</h4>
                      </div>
                      
                      {suggestion.details && (
                        <div className="space-y-2">
                          {suggestion.details.slice(0, 10).map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span className="font-mono">{detail.package}</span>
                              <div className="text-gray-600">
                                {detail.command || detail.suggestion}
                              </div>
                            </div>
                          ))}
                          {suggestion.details.length > 10 && (
                            <div className="text-sm text-gray-500 text-center">
                              ... その他 {suggestion.details.length - 10} 件
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  依存関係分析データがありません。分析を実行してください。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* リアルタイムタブ */}
        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                リアルタイムメトリクス
              </CardTitle>
              <CardDescription>
                現在のパフォーマンス状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                リアルタイムメトリクス機能は開発中です
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}