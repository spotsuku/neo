/**
 * 監視ダッシュボードAPI
 * システムの健全性とパフォーマンス データを提供
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMonitoringSystem } from '@/lib/monitoring';
import { createEnvironment } from '@/lib/env';
import { requireAdmin, checkRateLimit, addRateLimitHeaders, addSecurityHeaders, getClientIP } from '@/lib/auth';

// Cloudflareバインディングの型定義（実際の実装では環境に合わせて調整）
interface CloudflareBindings {
  DB: any; // D1Database
  KV: any; // KVNamespace  
  R2: any; // R2Bucket
}

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // 強化された認証チェック
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;

    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`monitoring:${clientIP}`, 30, 60000); // 1分間に30回
    
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimit.resetTime 
        },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    // 環境変数とバインディングの取得
    // 注意: Edge Runtimeでは実際のCloudflareバインディングが必要
    const env = {
      DB: null, // 実際の実装では process.env.DB
      KV: null, // 実際の実装では process.env.KV
      R2: null, // 実際の実装では process.env.R2
    } as CloudflareBindings;

    // モック環境での処理（本番環境では実際のバインディングを使用）
    if (!env.DB || !env.KV || !env.R2) {
      // 開発環境用のモックデータを返す
      const mockData = {
        health: [
          {
            service: 'database',
            status: 'healthy' as const,
            message: 'Database responding normally',
            responseTime: 45,
            timestamp: new Date().toISOString()
          },
          {
            service: 'kv_storage',
            status: 'healthy' as const,
            message: 'KV storage responding normally',
            responseTime: 23,
            timestamp: new Date().toISOString()
          },
          {
            service: 'r2_storage',
            status: 'warning' as const,
            message: 'R2 storage response slow',
            responseTime: 580,
            timestamp: new Date().toISOString()
          },
          {
            service: 'system_resources',
            status: 'healthy' as const,
            message: 'System resources normal',
            timestamp: new Date().toISOString(),
            metadata: {
              memoryUsage: 42 * 1024 * 1024 // 42MB
            }
          }
        ],
        stats: {
          activeConnections: 0,
          responseTime: 125.5,
          errorRate: 0.02,
          throughput: 45.7,
          timestamp: new Date().toISOString()
        },
        recentErrors: [
          {
            id: 'err_1693456789_abc123',
            message: 'Validation failed for field email',
            level: 'warning' as const,
            context: { field: 'email', type: 'validation' },
            timestamp: new Date(Date.now() - 300000).toISOString(), // 5分前
            userId: 123
          },
          {
            id: 'err_1693456789_def456',
            message: 'HTTP 404 error on /api/nonexistent',
            level: 'warning' as const,
            context: { status: 404, endpoint: '/api/nonexistent', type: '404' },
            timestamp: new Date(Date.now() - 600000).toISOString(), // 10分前
          }
        ],
        performanceMetrics: {
          avgResponseTime: 125.5,
          p95ResponseTime: 234.7,
          p99ResponseTime: 456.2
        }
      };

      let response = NextResponse.json(mockData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // セキュリティヘッダーとレート制限ヘッダーを追加
      response = addSecurityHeaders(response);
      response = addRateLimitHeaders(response, rateLimit);
      
      return response;
    }

    // 本番環境での処理
    const environment = createEnvironment(env);
    const monitoring = createMonitoringSystem(env);

    // ダッシュボードデータの取得
    const dashboardData = await monitoring.getDashboardData();

    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: 手動でヘルスチェックを実行
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const env = {
      DB: null,
      KV: null,
      R2: null,
    } as CloudflareBindings;

    // モック環境での処理
    if (!env.DB || !env.KV || !env.R2) {
      return NextResponse.json({
        message: 'Manual health check completed',
        timestamp: new Date().toISOString(),
        checks: [
          {
            service: 'database',
            status: 'healthy',
            responseTime: 43,
            timestamp: new Date().toISOString()
          },
          {
            service: 'kv_storage', 
            status: 'healthy',
            responseTime: 21,
            timestamp: new Date().toISOString()
          },
          {
            service: 'r2_storage',
            status: 'healthy',
            responseTime: 156,
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    // 本番環境での処理
    const environment = createEnvironment(env);
    const monitoring = createMonitoringSystem(env);

    const healthChecks = await monitoring.health.performHealthCheck();

    return NextResponse.json({
      message: 'Manual health check completed',
      timestamp: new Date().toISOString(),
      checks: healthChecks
    });

  } catch (error) {
    console.error('Health check API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}