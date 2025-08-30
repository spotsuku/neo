import { NextRequest, NextResponse } from 'next/server';

/**
 * Web Vitalsメトリクス収集API
 * フロントエンドからのパフォーマンスメトリクスを受信・記録
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const metric: WebVitalMetric = await request.json();
    
    // 基本的なバリデーション
    if (!metric.name || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // 本番環境では外部分析サービスに送信
    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vital Received:', {
        name: metric.name,
        value: `${metric.value.toFixed(2)}ms`,
        rating: metric.rating,
        url: metric.url,
        timestamp: new Date(metric.timestamp).toISOString()
      });
    }

    // ここで外部分析サービス（Google Analytics、DataDog等）に送信
    await sendToExternalService(metric);
    
    // メトリクスをローカルストレージに保存（開発用）
    await storeMetricLocally(metric);

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Web Vitals API エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 外部分析サービスへの送信
 */
async function sendToExternalService(metric: WebVitalMetric) {
  // Google Analytics 4 Measurement Protocol
  if (process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) {
    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: generateClientId(metric.userAgent),
            events: [{
              name: 'web_vital',
              params: {
                metric_name: metric.name,
                metric_value: Math.round(metric.value),
                metric_rating: metric.rating,
                page_url: metric.url
              }
            }]
          })
        }
      );

      if (!response.ok) {
        console.warn('Google Analytics送信エラー:', response.status);
      }
    } catch (error) {
      console.warn('Google Analytics送信エラー:', error);
    }
  }

  // DataDog RUM API
  if (process.env.DATADOG_CLIENT_TOKEN) {
    try {
      await fetch('https://rum-http-intake.logs.datadoghq.com/v1/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_CLIENT_TOKEN,
        },
        body: JSON.stringify({
          service: 'neo-digital-platform',
          message: `Web Vital: ${metric.name}`,
          level: metric.rating === 'poor' ? 'warning' : 'info',
          timestamp: metric.timestamp,
          attributes: {
            metric_name: metric.name,
            metric_value: metric.value,
            metric_rating: metric.rating,
            url: metric.url
          }
        })
      });
    } catch (error) {
      console.warn('DataDog送信エラー:', error);
    }
  }
}

/**
 * メトリクスをローカルファイルに保存（開発・デバッグ用）
 */
async function storeMetricLocally(metric: WebVitalMetric) {
  if (process.env.NODE_ENV === 'development') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, 'web-vitals.jsonl');
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // JSONL形式でログファイルに追記
      const logEntry = JSON.stringify({
        ...metric,
        timestamp: new Date(metric.timestamp).toISOString()
      }) + '\n';
      
      fs.appendFileSync(logFile, logEntry);
      
    } catch (error) {
      console.warn('ローカルログ保存エラー:', error);
    }
  }
}

/**
 * UserAgentからクライアントIDを生成
 */
function generateClientId(userAgent?: string): string {
  if (!userAgent) {
    return 'unknown-client';
  }
  
  // 簡単なハッシュ生成（本番では適切なハッシュライブラリを使用）
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  
  return Math.abs(hash).toString(36);
}

// GET要求の処理（ヘルスチェック用）
export async function GET() {
  return NextResponse.json({
    service: 'Web Vitals Collection API',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'メトリクス収集',
      GET: 'ヘルスチェック'
    }
  });
}