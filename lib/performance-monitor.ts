/**
 * パフォーマンス監視とメトリクス収集
 * Web Vitals、バンドル読み込み時間、API応答時間を監視
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
  userAgent?: string;
}

interface BundleLoadMetric {
  chunkName: string;
  loadTime: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

interface APIMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private bundleMetrics: BundleLoadMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private isClient = typeof window !== 'undefined';

  constructor() {
    if (this.isClient) {
      this.initWebVitalsMonitoring();
      this.initBundleMonitoring();
      this.initNavigationMonitoring();
    }
  }

  /**
   * Web Vitals監視の初期化
   */
  private initWebVitalsMonitoring() {
    // CLS (Cumulative Layout Shift)
    if ('LayoutShift' in window) {
      let clsValue = 0;
      let clsEntries: LayoutShift[] = [];

      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as LayoutShift[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // ページアンロード時にCLS値を記録
      window.addEventListener('beforeunload', () => {
        this.recordWebVital('CLS', clsValue);
      });
    }

    // LCP (Largest Contentful Paint)
    if ('LargestContentfulPaint' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordWebVital('LCP', lastEntry.startTime);
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }

    // FID (First Input Delay)
    if ('FirstInputDelay' in window) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = entry.processingStart - entry.startTime;
            this.recordWebVital('FID', fid);
          }
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
    }

    // INP (Interaction to Next Paint) - 新しいメトリクス
    if ('PerformanceEventTiming' in window) {
      const observer = new PerformanceObserver((entryList) => {
        let maxDuration = 0;
        for (const entry of entryList.getEntries()) {
          if (entry.duration > maxDuration) {
            maxDuration = entry.duration;
          }
        }
        if (maxDuration > 0) {
          this.recordWebVital('INP', maxDuration);
        }
      });

      observer.observe({ type: 'event', buffered: true });
    }
  }

  /**
   * バンドル読み込み監視の初期化
   */
  private initBundleMonitoring() {
    if (!this.isClient) return;

    // Resource Timing APIを使用してJSチャンクの読み込み時間を監視
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name.includes('_next/static/chunks/') && entry.name.endsWith('.js')) {
          const chunkName = this.extractChunkName(entry.name);
          const loadTime = entry.responseEnd - entry.startTime;
          const cached = entry.transferSize === 0;
          
          this.recordBundleLoad({
            chunkName,
            loadTime,
            size: entry.transferSize || entry.decodedBodySize,
            cached,
            timestamp: Date.now()
          });
        }
      }
    });

    observer.observe({ type: 'navigation', buffered: true });
    observer.observe({ type: 'resource', buffered: true });
  }

  /**
   * ナビゲーション監視の初期化
   */
  private initNavigationMonitoring() {
    if (!this.isClient) return;

    // ページ読み込み時間の監視
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordWebVital('FCP', navigation.responseStart - navigation.fetchStart);
          this.recordWebVital('TTFB', navigation.responseStart - navigation.requestStart);
          this.recordWebVital('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
          this.recordWebVital('Load', navigation.loadEventEnd - navigation.fetchStart);
        }
      }, 0);
    });
  }

  /**
   * Web Vitalメトリクスの記録
   */
  private recordWebVital(name: string, value: number) {
    const rating = this.getWebVitalRating(name, value);
    
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: this.isClient ? window.location.href : undefined,
      userAgent: this.isClient ? navigator.userAgent : undefined
    };

    this.metrics.push(metric);
    
    // 開発環境でのコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Web Vital - ${name}: ${value.toFixed(2)}ms (${rating})`);
    }

    // 本番環境では分析サービスに送信（例：Google Analytics 4）
    if (process.env.NODE_ENV === 'production' && this.isClient) {
      this.sendToAnalytics(metric);
    }
  }

  /**
   * バンドル読み込みメトリクスの記録
   */
  private recordBundleLoad(metric: BundleLoadMetric) {
    this.bundleMetrics.push(metric);
    
    if (process.env.NODE_ENV === 'development') {
      const cacheStatus = metric.cached ? '(cached)' : '(network)';
      console.log(`📦 Bundle Load - ${metric.chunkName}: ${metric.loadTime.toFixed(2)}ms ${cacheStatus}`);
    }
  }

  /**
   * API応答時間の記録
   */
  public recordAPICall(endpoint: string, method: string, responseTime: number, status: number) {
    const metric: APIMetric = {
      endpoint,
      method,
      responseTime,
      status,
      timestamp: Date.now()
    };

    this.apiMetrics.push(metric);

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔗 API Call - ${method} ${endpoint}: ${responseTime}ms (${status})`);
    }
  }

  /**
   * Web Vitalレーティングの判定
   */
  private getWebVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      'CLS': [0.1, 0.25],
      'LCP': [2500, 4000],
      'FID': [100, 300],
      'INP': [200, 500],
      'FCP': [1800, 3000],
      'TTFB': [800, 1800]
    };

    const [good, poor] = thresholds[name] || [1000, 3000];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * チャンク名の抽出
   */
  private extractChunkName(url: string): string {
    const match = url.match(/chunks\/(.+)\.js/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 分析サービスへの送信
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    // Google Analytics 4 の例
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.url,
        value: Math.round(metric.value),
        custom_map: { metric_rating: metric.rating }
      });
    }

    // カスタム分析エンドポイントへの送信
    if (navigator.sendBeacon) {
      const data = JSON.stringify(metric);
      navigator.sendBeacon('/api/analytics/web-vitals', data);
    }
  }

  /**
   * パフォーマンスレポートの生成
   */
  public generateReport() {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;

    const recentMetrics = this.metrics.filter(m => m.timestamp > last5Minutes);
    const recentBundleMetrics = this.bundleMetrics.filter(m => m.timestamp > last5Minutes);
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > last5Minutes);

    return {
      webVitals: {
        metrics: recentMetrics,
        summary: this.summarizeWebVitals(recentMetrics)
      },
      bundleLoads: {
        metrics: recentBundleMetrics,
        summary: this.summarizeBundleLoads(recentBundleMetrics)
      },
      apiCalls: {
        metrics: recentAPIMetrics,
        summary: this.summarizeAPICalls(recentAPIMetrics)
      },
      timestamp: now
    };
  }

  /**
   * Web Vitalsサマリーの生成
   */
  private summarizeWebVitals(metrics: PerformanceMetric[]) {
    const byName = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(byName).map(([name, values]) => ({
      name,
      count: values.length,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.percentile(values, 95)
    }));
  }

  /**
   * バンドル読み込みサマリーの生成
   */
  private summarizeBundleLoads(metrics: BundleLoadMetric[]) {
    const totalLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0);
    const cachedCount = metrics.filter(m => m.cached).length;
    
    return {
      totalChunks: metrics.length,
      averageLoadTime: metrics.length > 0 ? totalLoadTime / metrics.length : 0,
      cacheHitRate: metrics.length > 0 ? (cachedCount / metrics.length) * 100 : 0,
      slowestChunk: metrics.reduce((slowest, current) => 
        current.loadTime > slowest.loadTime ? current : slowest, 
        { chunkName: 'none', loadTime: 0 }
      )
    };
  }

  /**
   * API呼び出しサマリーの生成
   */
  private summarizeAPICalls(metrics: APIMetric[]) {
    const responseTimes = metrics.map(m => m.responseTime);
    const errorCount = metrics.filter(m => m.status >= 400).length;
    
    return {
      totalCalls: metrics.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      errorRate: metrics.length > 0 ? (errorCount / metrics.length) * 100 : 0,
      p95ResponseTime: this.percentile(responseTimes, 95)
    };
  }

  /**
   * パーセンタイル計算
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (p / 100)) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * メトリクスのクリア
   */
  public clearMetrics() {
    this.metrics = [];
    this.bundleMetrics = [];
    this.apiMetrics = [];
  }
}

// グローバルインスタンス
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * パフォーマンスモニターのシングルトンインスタンスを取得
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * API呼び出し時間を測定するヘルパー関数
 */
export function measureAPICall<T>(
  endpoint: string,
  method: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return apiCall()
    .then((result) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      getPerformanceMonitor().recordAPICall(endpoint, method, responseTime, 200);
      return result;
    })
    .catch((error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const status = error?.status || error?.response?.status || 500;
      getPerformanceMonitor().recordAPICall(endpoint, method, responseTime, status);
      throw error;
    });
}

/**
 * React Hookでパフォーマンスレポートを取得
 */
export function usePerformanceReport() {
  const monitor = getPerformanceMonitor();
  
  const getReport = () => monitor.generateReport();
  const clearMetrics = () => monitor.clearMetrics();
  
  return { getReport, clearMetrics };
}

export default PerformanceMonitor;