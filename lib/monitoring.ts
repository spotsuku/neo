/**
 * システム監視とアラート機能
 * パフォーマンス監視、エラートラッキング、ヘルスチェック
 */

import { CloudflareBindings } from './env';

// メトリクス型定義
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  labels?: Record<string, string>;
}

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  timestamp: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
  responseTime?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemStats {
  memoryUsage?: number;
  cpuUsage?: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: string;
}

/**
 * パフォーマンス監視クラス
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  // レスポンス時間の記録
  recordResponseTime(endpoint: string, duration: number): void {
    this.addMetric({
      name: 'response_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      labels: {
        endpoint,
        method: 'GET' // 実際のHTTPメソッドを使用
      }
    });
  }

  // メモリ使用量の記録（概算）
  recordMemoryUsage(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.addMetric({
        name: 'memory_usage',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        timestamp: new Date().toISOString()
      });
    }
  }

  // データベースクエリ時間の記録
  recordDbQueryTime(query: string, duration: number): void {
    this.addMetric({
      name: 'db_query_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      labels: {
        query_type: this.extractQueryType(query)
      }
    });
  }

  // ファイルアップロード時間の記録
  recordFileUploadTime(fileName: string, fileSize: number, duration: number): void {
    this.addMetric({
      name: 'file_upload_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      labels: {
        file_name: fileName,
        file_size: fileSize.toString()
      }
    });
  }

  // カスタムメトリクスの追加
  recordCustomMetric(name: string, value: number, unit: string, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      labels
    });
  }

  // メトリクスの取得
  getMetrics(name?: string, timeRange?: { start: string; end: string }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }

  // 平均値の計算
  getAverageMetric(name: string, timeRange?: { start: string; end: string }): number {
    const metrics = this.getMetrics(name, timeRange);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  // パーセンタイル計算
  getPercentile(name: string, percentile: number, timeRange?: { start: string; end: string }): number {
    const metrics = this.getMetrics(name, timeRange);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // メトリクス数の制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private extractQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
}

/**
 * エラートラッキングクラス
 */
export class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private maxErrors = 500;
  private env?: CloudflareBindings;

  constructor(env?: CloudflareBindings) {
    this.env = env;
  }

  // エラーの記録
  async recordError(
    error: Error | string,
    level: 'error' | 'warning' | 'info' = 'error',
    context?: Record<string, any>,
    userId?: number,
    request?: Request
  ): Promise<void> {
    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      level,
      context,
      timestamp: new Date().toISOString(),
      userId,
      ip: request ? this.getClientIP(request) : undefined,
      userAgent: request ? request.headers.get('User-Agent') || undefined : undefined
    };

    this.addError(errorEvent);

    // KVストレージに保存（環境が利用可能な場合）
    if (this.env?.KV) {
      try {
        await this.env.KV.put(
          `error:${errorEvent.id}`,
          JSON.stringify(errorEvent),
          { expirationTtl: 7 * 24 * 60 * 60 } // 7日間保持
        );
      } catch (kvError) {
        console.error('Failed to store error in KV:', kvError);
      }
    }

    // 重要なエラーの場合は通知を送信
    if (level === 'error') {
      await this.sendAlert(errorEvent);
    }
  }

  // 404エラーの記録
  async record404(path: string, request?: Request): Promise<void> {
    await this.recordError(
      `404 Not Found: ${path}`,
      'warning',
      { path, type: '404' },
      undefined,
      request
    );
  }

  // バリデーションエラーの記録
  async recordValidationError(field: string, value: any, rule: string, request?: Request): Promise<void> {
    await this.recordError(
      `Validation failed for field '${field}': ${rule}`,
      'warning',
      { field, value, rule, type: 'validation' },
      undefined,
      request
    );
  }

  // 認証エラーの記録
  async recordAuthError(message: string, userId?: number, request?: Request): Promise<void> {
    await this.recordError(
      `Authentication error: ${message}`,
      'warning',
      { type: 'auth' },
      userId,
      request
    );
  }

  // エラー統計の取得
  getErrorStats(timeRange?: { start: string; end: string }): {
    total: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    recent: ErrorEvent[];
  } {
    let filtered = this.errors;

    if (timeRange) {
      filtered = filtered.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const byLevel = filtered.reduce((acc, e) => {
      acc[e.level] = (acc[e.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = filtered.reduce((acc, e) => {
      const type = e.context?.type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: filtered.length,
      byLevel,
      byType,
      recent: filtered.slice(-10).reverse() // 最新10件
    };
  }

  private addError(error: ErrorEvent): void {
    this.errors.push(error);
    
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }

  private async sendAlert(error: ErrorEvent): Promise<void> {
    // 実際の本番環境では、メール通知やSlack通知などを実装
    console.error('ALERT:', error);
    
    // 環境設定から通知URLを取得して送信
    // if (this.env?.WEBHOOK_URL) {
    //   await fetch(this.env.WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(error)
    //   });
    // }
  }
}

/**
 * ヘルスチェック監視クラス
 */
export class HealthMonitor {
  private env: CloudflareBindings;

  constructor(env: CloudflareBindings) {
    this.env = env;
  }

  // 総合ヘルスチェック
  async performHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // データベース接続チェック
    checks.push(await this.checkDatabase());

    // KVストレージチェック
    checks.push(await this.checkKVStorage());

    // R2ストレージチェック
    checks.push(await this.checkR2Storage());

    // システムリソースチェック
    checks.push(await this.checkSystemResources());

    return checks;
  }

  // データベース接続チェック
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.env.DB.prepare('SELECT 1').first();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime < 100 ? 'healthy' : 'warning',
        message: responseTime < 100 ? 'Database responding normally' : 'Database response slow',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'critical',
        message: `Database connection failed: ${error}`,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // KVストレージチェック
  private async checkKVStorage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health_check_' + Date.now();
      await this.env.KV.put(testKey, 'test');
      const value = await this.env.KV.get(testKey);
      await this.env.KV.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const status = value === 'test' && responseTime < 200 ? 'healthy' : 'warning';
      
      return {
        service: 'kv_storage',
        status,
        message: status === 'healthy' ? 'KV storage responding normally' : 'KV storage response issues',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'kv_storage',
        status: 'critical',
        message: `KV storage failed: ${error}`,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // R2ストレージチェック
  private async checkR2Storage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health_check_' + Date.now() + '.txt';
      await this.env.R2.put(testKey, 'health check');
      const object = await this.env.R2.get(testKey);
      if (object) {
        await this.env.R2.delete(testKey);
      }
      
      const responseTime = Date.now() - startTime;
      const status = object && responseTime < 500 ? 'healthy' : 'warning';
      
      return {
        service: 'r2_storage',
        status,
        message: status === 'healthy' ? 'R2 storage responding normally' : 'R2 storage response issues',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'r2_storage',
        status: 'critical',
        message: `R2 storage failed: ${error}`,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // システムリソースチェック
  private async checkSystemResources(): Promise<HealthCheck> {
    try {
      const memoryUsage = typeof performance !== 'undefined' && (performance as any).memory 
        ? (performance as any).memory.usedJSHeapSize 
        : 0;
      
      const status = memoryUsage < 50 * 1024 * 1024 ? 'healthy' : 'warning'; // 50MB threshold
      
      return {
        service: 'system_resources',
        status,
        message: status === 'healthy' ? 'System resources normal' : 'High memory usage detected',
        timestamp: new Date().toISOString(),
        metadata: {
          memoryUsage: memoryUsage
        }
      };
    } catch (error) {
      return {
        service: 'system_resources',
        status: 'warning',
        message: `Unable to check system resources: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * 統合監視システム
 */
export class MonitoringSystem {
  public performance: PerformanceMonitor;
  public errors: ErrorTracker;
  public health: HealthMonitor;
  private env: CloudflareBindings;

  constructor(env: CloudflareBindings) {
    this.env = env;
    this.performance = new PerformanceMonitor();
    this.errors = new ErrorTracker(env);
    this.health = new HealthMonitor(env);
  }

  // リクエスト監視の開始
  startRequestMonitoring(request: Request): {
    endMonitoring: (response: Response) => Promise<void>;
  } {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    return {
      endMonitoring: async (response: Response) => {
        const duration = Date.now() - startTime;
        const endpoint = url.pathname;
        
        // レスポンス時間の記録
        this.performance.recordResponseTime(endpoint, duration);
        
        // エラーレスポンスの記録
        if (response.status >= 400) {
          await this.errors.recordError(
            `HTTP ${response.status} error on ${endpoint}`,
            response.status >= 500 ? 'error' : 'warning',
            { 
              status: response.status,
              method: request.method,
              endpoint,
              duration 
            },
            undefined,
            request
          );
        }
      }
    };
  }

  // システム統計の取得
  async getSystemStats(): Promise<SystemStats> {
    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const timeRange = { start: oneHourAgo, end: now };

    const errorStats = this.errors.getErrorStats(timeRange);
    const avgResponseTime = this.performance.getAverageMetric('response_time', timeRange);
    
    return {
      activeConnections: 0, // Cloudflare Workersでは取得困難
      responseTime: avgResponseTime,
      errorRate: errorStats.total / Math.max(1, this.performance.getMetrics('response_time', timeRange).length),
      throughput: this.performance.getMetrics('response_time', timeRange).length / 60, // per minute
      timestamp: now
    };
  }

  // ダッシュボード用データの取得
  async getDashboardData(): Promise<{
    health: HealthCheck[];
    stats: SystemStats;
    recentErrors: ErrorEvent[];
    performanceMetrics: {
      avgResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
  }> {
    const health = await this.health.performHealthCheck();
    const stats = await this.getSystemStats();
    const errorStats = this.errors.getErrorStats();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const timeRange = { start: oneHourAgo, end: new Date().toISOString() };

    return {
      health,
      stats,
      recentErrors: errorStats.recent,
      performanceMetrics: {
        avgResponseTime: this.performance.getAverageMetric('response_time', timeRange),
        p95ResponseTime: this.performance.getPercentile('response_time', 95, timeRange),
        p99ResponseTime: this.performance.getPercentile('response_time', 99, timeRange)
      }
    };
  }

  // アラート条件のチェック
  async checkAlertConditions(): Promise<string[]> {
    const alerts: string[] = [];
    
    // ヘルスチェックでcriticalなサービスがないかチェック
    const healthChecks = await this.health.performHealthCheck();
    const criticalServices = healthChecks.filter(hc => hc.status === 'critical');
    
    criticalServices.forEach(service => {
      alerts.push(`Critical: ${service.service} - ${service.message}`);
    });

    // エラー率のチェック
    const stats = await this.getSystemStats();
    if (stats.errorRate > 0.05) { // 5%以上のエラー率
      alerts.push(`High error rate detected: ${(stats.errorRate * 100).toFixed(2)}%`);
    }

    // レスポンス時間のチェック
    if (stats.responseTime > 2000) { // 2秒以上の平均レスポンス時間
      alerts.push(`High response time detected: ${stats.responseTime}ms`);
    }

    return alerts;
  }
}

/**
 * 監視システムのヘルパー関数
 */
export function createMonitoringSystem(env: CloudflareBindings): MonitoringSystem {
  return new MonitoringSystem(env);
}

// Web Vitals測定用のクライアントサイド関数
export const webVitalsScript = `
// Web Vitals測定スクリプト
(function() {
  function sendMetric(name, value, id) {
    fetch('/api/monitoring/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value, id })
    }).catch(console.error);
  }

  // Core Web Vitals
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        sendMetric('FCP', entry.startTime, entry.name);
      }
    }
  }).observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    sendMetric('LCP', lastEntry.startTime, lastEntry.id);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        sendMetric('CLS', clsValue, 'cls-total');
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
})();
`;