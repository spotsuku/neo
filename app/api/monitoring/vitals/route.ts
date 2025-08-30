/**
 * Web Vitals監視API
 * クライアントサイドからのパフォーマンス指標を収集
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMonitoringSystem } from '@/lib/monitoring';
import { createEnvironment } from '@/lib/env';
import { checkRateLimit, addRateLimitHeaders, addSecurityHeaders, getClientIP, sanitizeInput } from '@/lib/auth';

interface CloudflareBindings {
  DB: any;
  KV: any;
  R2: any;
}

interface WebVitalData {
  name: string;      // FCP, LCP, CLS, FID, INP
  value: number;     // 測定値
  id?: string;       // 測定ID
  delta?: number;    // 前回からの差分
  rating?: 'good' | 'needs-improvement' | 'poor';
  url?: string;      // 測定されたページURL
  userAgent?: string;
}

export const runtime = 'edge';

// Web Vitalsデータの受信
export async function POST(request: NextRequest) {
  try {
    // レート制限チェック（Web Vitalsは頻繁に送信される可能性があるため）
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`vitals:${clientIP}`, 200, 60000); // 1分間に200回
    
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    const rawBody = await request.json();
    const sanitizedBody = sanitizeInput(rawBody);
    const { name, value, id, delta, rating } = sanitizedBody as WebVitalData;

    // バリデーション
    if (!name || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid vitals data' },
        { status: 400 }
      );
    }

    // サポートされているWeb Vitals指標のチェック
    const supportedMetrics = ['FCP', 'LCP', 'CLS', 'FID', 'INP', 'TTFB'];
    if (!supportedMetrics.includes(name)) {
      return NextResponse.json(
        { error: 'Unsupported metric' },
        { status: 400 }
      );
    }

    const env = {
      DB: null,
      KV: null,
      R2: null,
    } as CloudflareBindings;

    // クライアント情報の取得
    const url = request.headers.get('referer') || request.url;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    // Web Vitals評価の計算
    const calculatedRating = rating || calculateVitalRating(name, value);

    const vitalData = {
      name,
      value,
      id: id || `vital_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      delta: delta || 0,
      rating: calculatedRating,
      url,
      userAgent,
      timestamp,
      clientIP: request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown'
    };

    // モック環境での処理
    if (!env.KV) {
      console.log('Web Vital recorded (mock):', vitalData);
      
      let response = NextResponse.json({
        success: true,
        message: 'Web vital recorded successfully',
        data: vitalData
      });
      
      response = addSecurityHeaders(response);
      response = addRateLimitHeaders(response, rateLimit);
      
      return response;
    }

    // 本番環境での処理
    const environment = createEnvironment(env);
    const monitoring = createMonitoringSystem(env);

    // Web Vitalsデータをパフォーマンス監視に記録
    monitoring.performance.recordCustomMetric(
      `web_vital_${name.toLowerCase()}`,
      value,
      getMetricUnit(name),
      {
        rating: calculatedRating,
        page: url,
        userAgent: userAgent.substring(0, 100) // 長いUA文字列を短縮
      }
    );

    // KVストレージに生データも保存（分析用）
    const kvKey = `vital:${name}:${Date.now()}`;
    await env.KV.put(
      kvKey,
      JSON.stringify(vitalData),
      { expirationTtl: 7 * 24 * 60 * 60 } // 7日間保持
    );

    // 異常値の検出とアラート
    if (calculatedRating === 'poor') {
      await monitoring.errors.recordError(
        `Poor Web Vital detected: ${name} = ${value}${getMetricUnit(name)}`,
        'warning',
        {
          type: 'web_vital',
          metric: name,
          value,
          rating: calculatedRating,
          url
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Web vital recorded successfully',
      data: {
        id: vitalData.id,
        rating: calculatedRating,
        timestamp
      }
    });

  } catch (error) {
    console.error('Web Vitals API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Web Vitals統計の取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
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

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const timeRange = searchParams.get('timeRange') || '24h';
    const page = searchParams.get('page');

    // モック環境での処理
    if (!env.KV) {
      const mockStats = {
        FCP: { avg: 1200, p75: 1800, p90: 2400, good: 85, needsImprovement: 12, poor: 3 },
        LCP: { avg: 2100, p75: 2800, p90: 3500, good: 78, needsImprovement: 18, poor: 4 },
        CLS: { avg: 0.08, p75: 0.12, p90: 0.18, good: 92, needsImprovement: 6, poor: 2 },
        FID: { avg: 45, p75: 80, p90: 120, good: 95, needsImprovement: 4, poor: 1 },
        INP: { avg: 150, p75: 220, p90: 300, good: 88, needsImprovement: 9, poor: 3 }
      };

      const responseData = metric && mockStats[metric as keyof typeof mockStats]
        ? { [metric]: mockStats[metric as keyof typeof mockStats] }
        : mockStats;

      return NextResponse.json({
        timeRange,
        page,
        stats: responseData,
        timestamp: new Date().toISOString()
      });
    }

    // 本番環境での処理
    const environment = createEnvironment(env);
    const monitoring = createMonitoringSystem(env);

    // 時間範囲の計算
    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };

    const hours = hoursMap[timeRange] || 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    // Web Vitals統計の計算
    const stats: Record<string, any> = {};
    const metrics = metric ? [metric] : ['FCP', 'LCP', 'CLS', 'FID', 'INP'];

    for (const metricName of metrics) {
      const metricKey = `web_vital_${metricName.toLowerCase()}`;
      const metricData = monitoring.performance.getMetrics(metricKey, { start: startTime, end: endTime });

      if (metricData.length > 0) {
        const values = metricData.map(m => m.value);
        const sortedValues = values.sort((a, b) => a - b);

        stats[metricName] = {
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          p75: getPercentileValue(sortedValues, 75),
          p90: getPercentileValue(sortedValues, 90),
          p95: getPercentileValue(sortedValues, 95),
          count: values.length,
          good: metricData.filter(m => m.labels?.rating === 'good').length,
          needsImprovement: metricData.filter(m => m.labels?.rating === 'needs-improvement').length,
          poor: metricData.filter(m => m.labels?.rating === 'poor').length
        };
      }
    }

    return NextResponse.json({
      timeRange,
      page,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Web Vitals stats API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Web Vitalsの評価を計算
function calculateVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    FCP: { good: 1800, needsImprovement: 3000 },      // First Contentful Paint (ms)
    LCP: { good: 2500, needsImprovement: 4000 },      // Largest Contentful Paint (ms)
    CLS: { good: 0.1, needsImprovement: 0.25 },       // Cumulative Layout Shift
    FID: { good: 100, needsImprovement: 300 },        // First Input Delay (ms)
    INP: { good: 200, needsImprovement: 500 },        // Interaction to Next Paint (ms)
    TTFB: { good: 800, needsImprovement: 1800 }       // Time to First Byte (ms)
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// メトリクス単位の取得
function getMetricUnit(name: string): string {
  const units = {
    FCP: 'ms',
    LCP: 'ms',
    CLS: '',
    FID: 'ms',
    INP: 'ms',
    TTFB: 'ms'
  };

  return units[name as keyof typeof units] || '';
}

// パーセンタイル値の計算
function getPercentileValue(sortedValues: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}