/**
 * セキュリティダッシュボード
 * リアルタイムセキュリティ監視とレート制限状況表示
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Lock, 
  Eye,
  RefreshCw,
  TrendingUp,
  Server,
  Users,
  Zap
} from 'lucide-react'
import { ComponentErrorBoundary } from '@/components/app-error-boundary'

interface SecurityStats {
  timestamp: string
  rateLimiting: {
    totalKeys: number
    activeKeys: number
    topLimitedKeys: Array<{
      key: string
      count: number
      resetTime: number
      keyType: string
      resetIn: number
    }>
    efficiency: number
  }
  securityHeaders: {
    isSecure: boolean
    issues: string[]
    recommendations: string[]
    headers: Record<string, string>
  }
  threatDetection: {
    last24Hours: {
      totalEvents: number
      maliciousInputs: number
      rateLimitExceeded: number
      bruteForceAttempts: number
      blockedIPs: number
    }
    lastHour: {
      totalEvents: number
      maliciousInputs: number
      rateLimitExceeded: number
      bruteForceAttempts: number
      blockedIPs: number
    }
    topThreats: Array<{
      type: string
      count: number
      lastSeen: string
    }>
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  systemHealth: {
    uptime: number
    memoryUsage: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
    }
    nodeVersion: string
    environment: string
    securityFeatures: Record<string, string>
    lastUpdated: string
  }
}

export function SecurityDashboardComponent() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/security/stats')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計の取得に失敗しました')
      console.error('[Security Dashboard] Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (action: string) => {
    try {
      const response = await fetch('/api/security/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (!response.ok) {
        throw new Error('操作に失敗しました')
      }
      
      // 統計を再取得
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作に失敗しました')
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchStats, 30000) // 30秒毎に更新
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}時間${minutes}分`
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)}MB`
  }

  if (loading && !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">
              エラーが発生しました
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchStats} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <ComponentErrorBoundary componentName="SecurityDashboard">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">セキュリティダッシュボード</h1>
              <p className="text-muted-foreground">
                リアルタイムセキュリティ監視とシステム状況
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                自動更新
              </Button>
              <Button onClick={fetchStats} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
          </div>
          {stats && (
            <p className="text-sm text-muted-foreground mt-2">
              最終更新: {new Date(stats.timestamp).toLocaleString('ja-JP')}
            </p>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* リスクレベル */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">リスクレベル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-4 h-4 rounded-full ${getRiskLevelColor(stats.threatDetection.riskLevel)}`}
                  />
                  <span className="text-2xl font-bold capitalize">
                    {stats.threatDetection.riskLevel}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 24時間統計 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">24時間統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {stats.threatDetection.last24Hours.totalEvents}
                </div>
                <div className="text-sm text-muted-foreground">
                  セキュリティイベント
                </div>
              </CardContent>
            </Card>

            {/* アクティブ制限 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">アクティブ制限</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {stats.rateLimiting.activeKeys}
                </div>
                <div className="text-sm text-muted-foreground">
                  / {stats.rateLimiting.totalKeys} 総数
                </div>
              </CardContent>
            </Card>

            {/* システム稼働時間 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">稼働時間</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold mb-1">
                  {formatUptime(stats.systemHealth.uptime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.systemHealth.environment}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* 脅威検知 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  脅威検知
                </CardTitle>
                <CardDescription>
                  過去24時間と1時間の脅威検知状況
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">過去24時間</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>悪意ある入力</span>
                        <Badge variant="outline">{stats.threatDetection.last24Hours.maliciousInputs}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>レート制限超過</span>
                        <Badge variant="outline">{stats.threatDetection.last24Hours.rateLimitExceeded}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>ブルートフォース</span>
                        <Badge variant="destructive">{stats.threatDetection.last24Hours.bruteForceAttempts}</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">過去1時間</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>悪意ある入力</span>
                        <Badge variant="outline">{stats.threatDetection.lastHour.maliciousInputs}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>レート制限超過</span>
                        <Badge variant="outline">{stats.threatDetection.lastHour.rateLimitExceeded}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>ブルートフォース</span>
                        <Badge variant="destructive">{stats.threatDetection.lastHour.bruteForceAttempts}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">上位脅威</div>
                  <div className="space-y-2">
                    {stats.threatDetection.topThreats.slice(0, 3).map((threat, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{threat.type}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{threat.count}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(threat.lastSeen).toLocaleTimeString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* レート制限状況 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  レート制限状況
                </CardTitle>
                <CardDescription>
                  アクティブなレート制限と効率性
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{stats.rateLimiting.efficiency}%</div>
                    <div className="text-sm text-muted-foreground">効率性</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.rateLimiting.activeKeys}</div>
                    <div className="text-sm text-muted-foreground">アクティブキー</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">制限中のキー</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {stats.rateLimiting.topLimitedKeys.slice(0, 5).map((key, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex justify-between items-center">
                          <span className="truncate flex-1">{key.keyType}</span>
                          <Badge variant="outline" className="text-xs">
                            {key.count}回
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          リセット: {key.resetIn}秒後
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => performAction('cleanup')} 
                    size="sm" 
                    variant="outline"
                  >
                    クリーンアップ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* セキュリティヘッダー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  セキュリティヘッダー
                </CardTitle>
                <CardDescription>
                  セキュリティヘッダーの設定状況
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    stats.securityHeaders.isSecure ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`font-medium ${
                    stats.securityHeaders.isSecure ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {stats.securityHeaders.isSecure ? 'セキュア' : '要改善'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.securityHeaders.headers).map(([header, status]) => (
                    <div key={header} className="flex justify-between items-center text-sm">
                      <span className="uppercase">{header}</span>
                      <Badge variant={status === 'enabled' ? 'default' : 'destructive'}>
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>

                {stats.securityHeaders.issues.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-2">問題</div>
                    <ul className="text-sm text-red-600 space-y-1">
                      {stats.securityHeaders.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {stats.securityHeaders.recommendations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-700 mb-2">推奨事項</div>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {stats.securityHeaders.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* システム情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  システム情報
                </CardTitle>
                <CardDescription>
                  システムリソースとセキュリティ機能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">メモリ使用量</div>
                    <div className="text-sm font-medium">
                      {formatBytes(stats.systemHealth.memoryUsage.heapUsed)} / 
                      {formatBytes(stats.systemHealth.memoryUsage.heapTotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Node.js</div>
                    <div className="text-sm font-medium">{stats.systemHealth.nodeVersion}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">セキュリティ機能</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(stats.systemHealth.securityFeatures).map(([feature, status]) => (
                      <div key={feature} className="flex justify-between items-center text-xs">
                        <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <Badge 
                          variant={status === 'enabled' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    最終更新: {new Date(stats.systemHealth.lastUpdated).toLocaleString('ja-JP')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </ComponentErrorBoundary>
    </div>
  )
}