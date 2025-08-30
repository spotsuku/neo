import { NextRequest, NextResponse } from 'next/server';
import { PerformanceMetrics } from '@/types/admin';

// システムパフォーマンス指標を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('range') || '1h'; // 1h, 6h, 24h, 7d

    // TODO: 実際のメトリクス収集システム（Prometheus、Cloudflare Analytics等）からデータを取得
    // 現在はモックデータを返す

    const now = Date.now();
    const generateMetrics = (timestamp: number): PerformanceMetrics => {
      // リアルなパフォーマンスデータをシミュレート
      const baseResponseTime = 150;
      const variation = Math.random() * 100 - 50; // -50 to +50ms の変動
      
      return {
        timestamp: new Date(timestamp).toISOString(),
        responseTime: Math.max(50, baseResponseTime + variation), // 最低50ms
        errorRate: Math.random() * 0.05, // 0-5% のエラー率
        throughput: Math.floor(100 + Math.random() * 200), // 100-300 req/min
        activeConnections: Math.floor(50 + Math.random() * 100), // 50-150 接続
        memoryUsage: 0.3 + Math.random() * 0.4, // 30-70% メモリ使用率
        cpuUsage: 0.2 + Math.random() * 0.3, // 20-50% CPU使用率
        diskUsage: 0.45 + Math.random() * 0.1 // 45-55% ディスク使用率
      };
    };

    let metricsData: PerformanceMetrics[];

    switch (timeRange) {
      case '1h':
        // 過去1時間のデータ（5分間隔）
        metricsData = Array.from({ length: 12 }, (_, i) => 
          generateMetrics(now - (11 - i) * 5 * 60 * 1000)
        );
        break;
      case '6h':
        // 過去6時間のデータ（30分間隔）
        metricsData = Array.from({ length: 12 }, (_, i) => 
          generateMetrics(now - (11 - i) * 30 * 60 * 1000)
        );
        break;
      case '24h':
        // 過去24時間のデータ（2時間間隔）
        metricsData = Array.from({ length: 12 }, (_, i) => 
          generateMetrics(now - (11 - i) * 2 * 60 * 60 * 1000)
        );
        break;
      case '7d':
        // 過去7日間のデータ（12時間間隔）
        metricsData = Array.from({ length: 14 }, (_, i) => 
          generateMetrics(now - (13 - i) * 12 * 60 * 60 * 1000)
        );
        break;
      default:
        metricsData = [generateMetrics(now)];
    }

    // 最新の単一メトリクスも提供（ダッシュボード用）
    const latestMetrics = generateMetrics(now);

    const response = {
      current: latestMetrics,
      history: metricsData,
      timeRange,
      summary: {
        avgResponseTime: metricsData.reduce((sum, m) => sum + m.responseTime, 0) / metricsData.length,
        maxResponseTime: Math.max(...metricsData.map(m => m.responseTime)),
        avgErrorRate: metricsData.reduce((sum, m) => sum + m.errorRate, 0) / metricsData.length,
        avgThroughput: metricsData.reduce((sum, m) => sum + m.throughput, 0) / metricsData.length,
        avgMemoryUsage: metricsData.reduce((sum, m) => sum + m.memoryUsage, 0) / metricsData.length,
        avgCpuUsage: metricsData.reduce((sum, m) => sum + m.cpuUsage, 0) / metricsData.length,
        totalRequests: metricsData.reduce((sum, m) => sum + m.throughput, 0) * (timeRange === '1h' ? 5 : timeRange === '6h' ? 30 : timeRange === '24h' ? 120 : 720) / 60
      }
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=30, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    console.error('パフォーマンス指標の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'パフォーマンス指標の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}