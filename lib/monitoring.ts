// NEO Digital Platform - Monitoring & Observability System
// 監視・可観測性システム

import { SecurityLogger, getClientIP } from './security';
import type { NextRequest } from 'next/server';

// ログレベル定義
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// メトリクス定義
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  unit?: string;
}

// エラー分類
export type ErrorCategory = 
  | 'authentication'
  | 'authorization' 
  | 'validation'
  | 'database'
  | 'external_api'
  | 'business_logic'
  | 'system'
  | 'unknown';

// パフォーマンス測定
export interface PerformanceMetric {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// アラート設定
export interface AlertRule {
  name: string;
  condition: (metric: Metric) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  enabled: boolean;
}

/**
 * 統合ロガー
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private enableConsole: boolean = process.env.NODE_ENV !== 'production';
  
  static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
  
  private formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const meta = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
  }
  
  debug(message: string, metadata?: any): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, metadata);
      if (this.enableConsole) console.debug(formatted);
      // TODO: 外部ログサービス送信
    }
  }
  
  info(message: string, metadata?: any): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, metadata);
      if (this.enableConsole) console.info(formatted);
      // TODO: 外部ログサービス送信
    }
  }
  
  warn(message: string, metadata?: any): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, metadata);
      if (this.enableConsole) console.warn(formatted);
      // TODO: 外部ログサービス送信
    }
  }
  
  error(message: string, error?: Error, metadata?: any): void {
    if (this.shouldLog('error')) {
      const errorMeta = error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...metadata
      } : metadata;
      
      const formatted = this.formatMessage('error', message, errorMeta);
      if (this.enableConsole) console.error(formatted);
      
      // セキュリティログにも記録（重要なエラーの場合）
      if (this.isSensitiveError(message, error)) {
        SecurityLogger.logSecurityEvent(
          'system',
          'error_occurred',
          message,
          null,
          errorMeta
        ).catch(console.error);
      }
    }
  }
  
  fatal(message: string, error?: Error, metadata?: any): void {
    const errorMeta = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...metadata
    } : metadata;
    
    const formatted = this.formatMessage('fatal', message, errorMeta);
    console.error(formatted); // 常に出力
    
    // 重大エラーは常にセキュリティログに記録
    SecurityLogger.logSecurityEvent(
      'system',
      'fatal_error',
      message,
      null,
      errorMeta
    ).catch(console.error);
  }
  
  private isSensitiveError(message: string, error?: Error): boolean {
    const sensitiveKeywords = [
      'authentication', 'authorization', 'security', 'permission',
      'token', 'password', 'unauthorized', 'forbidden'
    ];
    
    const text = `${message} ${error?.message || ''}`.toLowerCase();
    return sensitiveKeywords.some(keyword => text.includes(keyword));
  }
}

/**
 * メトリクス収集システム
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, Metric[]> = new Map();
  private maxMetricsPerName = 1000; // メモリ制限
  
  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector();
    }
    return this.instance;
  }
  
  /**
   * メトリクスを記録
   */
  record(metric: Metric): void {
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);
    
    // メモリ制限のため古いメトリクスを削除
    if (existing.length > this.maxMetricsPerName) {
      existing.shift();
    }
    
    this.metrics.set(metric.name, existing);
    
    Logger.getInstance().debug(`Metric recorded: ${metric.name}`, metric);
  }
  
  /**
   * カウンターメトリクス
   */
  increment(name: string, labels?: Record<string, string>): void {
    this.record({
      name,
      value: 1,
      timestamp: Date.now(),
      labels,
      unit: 'count'
    });
  }
  
  /**
   * ゲージメトリクス
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      labels,
      unit: 'gauge'
    });
  }
  
  /**
   * ヒストグラムメトリクス（レスポンス時間など）
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      labels,
      unit: 'milliseconds'
    });
  }
  
  /**
   * メトリクス取得
   */
  getMetrics(name?: string, since?: number): Metric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return since ? metrics.filter(m => m.timestamp >= since) : metrics;
    }
    
    const allMetrics: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return since ? allMetrics.filter(m => m.timestamp >= since) : allMetrics;
  }
  
  /**
   * メトリクス集計
   */
  aggregate(name: string, since?: number): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const metrics = this.getMetrics(name, since);
    
    if (metrics.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }
    
    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

/**
 * パフォーマンス測定ユーティリティ
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();
  
  /**
   * 操作開始時間を記録
   */
  static start(operationId: string): void {
    this.measurements.set(operationId, performance.now());
  }
  
  /**
   * 操作終了時間を記録してメトリクス出力
   */
  static end(
    operationId: string, 
    operation: string, 
    success: boolean = true,
    metadata?: Record<string, any>
  ): PerformanceMetric | null {
    const startTime = this.measurements.get(operationId);
    if (!startTime) {
      Logger.getInstance().warn(`Performance measurement not found: ${operationId}`);
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const metric: PerformanceMetric = {
      operation,
      duration,
      startTime,
      endTime,
      success,
      metadata,
    };
    
    // メトリクス記録
    MetricsCollector.getInstance().histogram(
      `operation_duration_ms`,
      duration,
      { 
        operation,
        success: success.toString(),
        ...metadata 
      }
    );
    
    // ログ記録
    const level = duration > 5000 ? 'warn' : 'debug'; // 5秒以上は警告
    Logger.getInstance()[level](
      `Operation ${operation} ${success ? 'completed' : 'failed'} in ${duration.toFixed(2)}ms`,
      metadata
    );
    
    // クリーンアップ
    this.measurements.delete(operationId);
    
    return metric;
  }
  
  /**
   * 非同期関数のパフォーマンス測定デコレーター
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operation}-${Date.now()}-${Math.random()}`;
    
    this.start(operationId);
    
    try {
      const result = await fn();
      this.end(operationId, operation, true, metadata);
      return result;
    } catch (error) {
      this.end(operationId, operation, false, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

/**
 * アラートシステム
 */
export class AlertManager {
  private static instance: AlertManager;
  private rules: AlertRule[] = [];
  private alerts: Map<string, number> = new Map(); // 最後のアラート発火時刻
  private cooldownMs = 300000; // 5分のクールダウン
  
  static getInstance(): AlertManager {
    if (!this.instance) {
      this.instance = new AlertManager();
      this.instance.initializeDefaultRules();
    }
    return this.instance;
  }
  
  private initializeDefaultRules(): void {
    // デフォルトのアラートルール
    this.addRule({
      name: 'high_error_rate',
      condition: (metric) => 
        metric.name === 'api_errors' && metric.value > 10,
      severity: 'high',
      description: 'API error rate is too high',
      enabled: true,
    });
    
    this.addRule({
      name: 'slow_response_time',
      condition: (metric) =>
        metric.name === 'operation_duration_ms' && metric.value > 10000,
      severity: 'medium',
      description: 'Response time is too slow',
      enabled: true,
    });
    
    this.addRule({
      name: 'authentication_failures',
      condition: (metric) =>
        metric.name === 'auth_failures' && metric.value > 5,
      severity: 'high',
      description: 'Too many authentication failures',
      enabled: true,
    });
  }
  
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }
  
  removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }
  
  checkAlerts(metric: Metric): void {
    const now = Date.now();
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      // クールダウンチェック
      const lastAlert = this.alerts.get(rule.name);
      if (lastAlert && (now - lastAlert) < this.cooldownMs) {
        continue;
      }
      
      // アラート条件チェック
      if (rule.condition(metric)) {
        this.fireAlert(rule, metric);
        this.alerts.set(rule.name, now);
      }
    }
  }
  
  private fireAlert(rule: AlertRule, metric: Metric): void {
    const alertMessage = `ALERT [${rule.severity.toUpperCase()}] ${rule.name}: ${rule.description}`;
    
    Logger.getInstance().error(alertMessage, undefined, {
      rule: rule.name,
      severity: rule.severity,
      metric,
    });
    
    // セキュリティログにも記録
    SecurityLogger.logSecurityEvent(
      'system',
      'alert_fired',
      alertMessage,
      null,
      {
        rule: rule.name,
        severity: rule.severity,
        metric,
      }
    ).catch(console.error);
    
    // TODO: 外部アラートシステム通知（Slack, Email等）
    this.notifyExternal(rule, metric);
  }
  
  private async notifyExternal(rule: AlertRule, metric: Metric): Promise<void> {
    // TODO: 外部通知システムの実装
    // - Slack webhook
    // - Email notification
    // - PagerDuty integration
  }
}

/**
 * API監視ミドルウェア
 */
export function createApiMonitoringMiddleware() {
  return async (request: NextRequest, response: Response) => {
    const startTime = performance.now();
    const operationId = `api-${Date.now()}-${Math.random()}`;
    const method = request.method;
    const path = new URL(request.url).pathname;
    const clientIP = getClientIP(request);
    
    PerformanceMonitor.start(operationId);
    
    // リクエストメトリクス
    MetricsCollector.getInstance().increment('api_requests_total', {
      method,
      path,
    });
    
    Logger.getInstance().info(`API Request: ${method} ${path}`, {
      clientIP,
      userAgent: request.headers.get('user-agent'),
    });
    
    try {
      // レスポンス監視
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      PerformanceMonitor.end(operationId, `api_${method}_${path}`, true, {
        method,
        path,
        clientIP,
        status: response.status,
      });
      
      // ステータス別メトリクス
      MetricsCollector.getInstance().increment('api_responses_total', {
        method,
        path,
        status: response.status.toString(),
      });
      
      // レスポンス時間メトリクス
      MetricsCollector.getInstance().histogram('api_response_time_ms', duration, {
        method,
        path,
      });
      
      Logger.getInstance().info(`API Response: ${method} ${path} - ${response.status} (${duration.toFixed(2)}ms)`);
      
    } catch (error) {
      PerformanceMonitor.end(operationId, `api_${method}_${path}`, false, {
        method,
        path,
        clientIP,
        error: error instanceof Error ? error.message : String(error),
      });
      
      MetricsCollector.getInstance().increment('api_errors_total', {
        method,
        path,
      });
      
      Logger.getInstance().error(`API Error: ${method} ${path}`, error as Error, {
        clientIP,
      });
      
      throw error;
    }
  };
}

// エクスポート用のシングルトンインスタンス
export const logger = Logger.getInstance();
export const metrics = MetricsCollector.getInstance();
export const performance = PerformanceMonitor;
export const alerts = AlertManager.getInstance();

// メトリクス自動チェック（アラート用）
setInterval(() => {
  const recentMetrics = metrics.getMetrics(undefined, Date.now() - 60000); // 過去1分
  recentMetrics.forEach(metric => alerts.checkAlerts(metric));
}, 30000); // 30秒ごとにチェック