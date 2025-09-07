// NEO Portal - Metrics API
// システムメトリクス取得API（管理者限定）

import { NextRequest } from 'next/server';
import { withAdminAuth, AuthorizedResponse } from '@/lib/auth-guards';
import { metrics, logger } from '@/lib/monitoring';

/**
 * GET /api/metrics - システムメトリクス取得
 * 管理者権限が必要
 */
export const GET = withAdminAuth()(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const metricName = url.searchParams.get('name');
    const since = url.searchParams.get('since');
    const format = url.searchParams.get('format') || 'json';
    
    const sinceTimestamp = since ? parseInt(since, 10) : Date.now() - (60 * 60 * 1000); // デフォルト1時間前
    
    // メトリクス取得
    const metricsData = metrics.getMetrics(metricName || undefined, sinceTimestamp);
    
    // レスポンス形式選択
    if (format === 'prometheus') {
      return getPrometheusFormat(metricsData);
    }
    
    // JSON形式（デフォルト）
    const summary = getSummaryMetrics(sinceTimestamp);
    
    logger.info('Metrics accessed', {
      metricName,
      since: sinceTimestamp,
      format,
      count: metricsData.length,
    });
    
    return AuthorizedResponse.success({
      timestamp: new Date().toISOString(),
      period: {
        since: new Date(sinceTimestamp).toISOString(),
        until: new Date().toISOString(),
      },
      summary,
      metrics: metricName ? metricsData : undefined,
      totalMetrics: metricsData.length,
    });
    
  } catch (error) {
    logger.error('Metrics API error', error as Error);
    return AuthorizedResponse.error('Failed to retrieve metrics', 500);
  }
});

/**
 * サマリーメトリクス取得
 */
function getSummaryMetrics(since: number) {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  return {
    // API関連メトリクス
    api: {
      requests: {
        total: metrics.aggregate('api_requests_total', since),
        lastHour: metrics.aggregate('api_requests_total', oneHourAgo),
        last5Minutes: metrics.aggregate('api_requests_total', fiveMinutesAgo),
      },
      responses: {
        total: metrics.aggregate('api_responses_total', since),
        lastHour: metrics.aggregate('api_responses_total', oneHourAgo),
        last5Minutes: metrics.aggregate('api_responses_total', fiveMinutesAgo),
      },
      errors: {
        total: metrics.aggregate('api_errors_total', since),
        lastHour: metrics.aggregate('api_errors_total', oneHourAgo),
        last5Minutes: metrics.aggregate('api_errors_total', fiveMinutesAgo),
      },
      responseTime: {
        average: metrics.aggregate('api_response_time_ms', since),
        lastHour: metrics.aggregate('api_response_time_ms', oneHourAgo),
        last5Minutes: metrics.aggregate('api_response_time_ms', fiveMinutesAgo),
      },
    },
    
    // 認証関連メトリクス
    auth: {
      loginAttempts: metrics.aggregate('auth_login_attempts', since),
      loginFailures: metrics.aggregate('auth_login_failures', since),
      tokenRefreshes: metrics.aggregate('auth_token_refreshes', since),
      logouts: metrics.aggregate('auth_logouts', since),
    },
    
    // エラー関連メトリクス
    errors: {
      frontend: metrics.aggregate('frontend_errors_total', since),
      backend: metrics.aggregate('backend_errors_total', since),
      database: metrics.aggregate('database_errors_total', since),
    },
    
    // パフォーマンス関連
    performance: {
      operationDuration: metrics.aggregate('operation_duration_ms', since),
      healthCheckDuration: metrics.aggregate('health_check_duration_ms', since),
    },
    
    // セキュリティ関連
    security: {
      rateLimitHits: metrics.aggregate('rate_limit_hits', since),
      suspiciousRequests: metrics.aggregate('suspicious_requests', since),
      blockedRequests: metrics.aggregate('blocked_requests', since),
    },
    
    // システム関連
    system: {
      healthChecks: metrics.aggregate('health_checks_total', since),
      alertsFired: metrics.aggregate('alerts_fired', since),
    },
  };
}

/**
 * Prometheus形式でメトリクス出力
 */
function getPrometheusFormat(metricsData: any[]) {
  let output = '';
  
  // メトリクス名でグループ化
  const groupedMetrics = new Map<string, any[]>();
  
  metricsData.forEach(metric => {
    const existing = groupedMetrics.get(metric.name) || [];
    existing.push(metric);
    groupedMetrics.set(metric.name, existing);
  });
  
  // Prometheus形式で出力
  for (const [name, metrics] of groupedMetrics) {
    // メタデータ
    output += `# HELP ${name} ${getMetricDescription(name)}\n`;
    output += `# TYPE ${name} ${getMetricType(name)}\n`;
    
    // データポイント
    metrics.forEach(metric => {
      const labels = formatPrometheusLabels(metric.labels || {});
      const value = metric.value;
      const timestamp = metric.timestamp;
      
      output += `${name}${labels} ${value} ${timestamp}\n`;
    });
    
    output += '\n';
  }
  
  return new Response(output, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * メトリクスの説明を取得
 */
function getMetricDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'api_requests_total': 'Total number of API requests',
    'api_responses_total': 'Total number of API responses',
    'api_errors_total': 'Total number of API errors',
    'api_response_time_ms': 'API response time in milliseconds',
    'auth_login_attempts': 'Total login attempts',
    'auth_login_failures': 'Total login failures',
    'frontend_errors_total': 'Total frontend errors',
    'health_checks_total': 'Total health checks performed',
    'operation_duration_ms': 'Operation duration in milliseconds',
  };
  
  return descriptions[name] || 'No description available';
}

/**
 * メトリクスタイプを取得
 */
function getMetricType(name: string): string {
  if (name.endsWith('_total')) return 'counter';
  if (name.includes('_duration_') || name.includes('_time_')) return 'histogram';
  return 'gauge';
}

/**
 * Prometheusラベル形式でフォーマット
 */
function formatPrometheusLabels(labels: Record<string, string>): string {
  const labelPairs = Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');
  
  return labelPairs ? `{${labelPairs}}` : '';
}

/**
 * POST /api/metrics - 特定メトリクスの手動記録（管理者限定）
 */
export const POST = withAdminAuth()(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, value, labels } = body;
    
    if (!name || typeof value !== 'number') {
      return AuthorizedResponse.error('Invalid metric data', 400);
    }
    
    // メトリクス記録
    metrics.record({
      name,
      value,
      timestamp: Date.now(),
      labels: labels || {},
    });
    
    logger.info('Manual metric recorded', { name, value, labels });
    
    return AuthorizedResponse.success({
      message: 'Metric recorded successfully',
      metric: { name, value, labels },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Manual metric recording failed', error as Error);
    return AuthorizedResponse.error('Failed to record metric', 500);
  }
});

/**
 * DELETE /api/metrics - メトリクスデータクリア（管理者限定）
 */
export const DELETE = withAdminAuth()(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const metricName = url.searchParams.get('name');
    
    if (metricName) {
      // 特定メトリクスをクリア
      (metrics as any).metrics.delete(metricName);
      logger.info(`Metrics cleared for: ${metricName}`);
      
      return AuthorizedResponse.success({
        message: `Metrics cleared for: ${metricName}`,
      });
    } else {
      // 全メトリクスをクリア
      (metrics as any).metrics.clear();
      logger.info('All metrics cleared');
      
      return AuthorizedResponse.success({
        message: 'All metrics cleared',
      });
    }
    
  } catch (error) {
    logger.error('Metrics clearing failed', error as Error);
    return AuthorizedResponse.error('Failed to clear metrics', 500);
  }
});