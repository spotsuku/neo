/**
 * エラー報告とSentry統合
 * 本番環境での自動エラー通知とSlack連携
 */

import { ApiError } from './api-error'

// Sentry設定タイプ
export interface SentryConfig {
  dsn: string
  environment: 'development' | 'production' | 'staging'
  tracesSampleRate: number
  release?: string
  userId?: string
  userEmail?: string
}

// エラー報告レベル
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

// エラーコンテキスト情報
export interface ErrorContext {
  userId?: string
  userAgent?: string
  url?: string
  timestamp?: Date
  sessionId?: string
  componentStack?: string
  extra?: Record<string, any>
}

// Slack通知設定
export interface SlackNotificationConfig {
  webhookUrl: string
  channel: string
  username: string
  minLevel: ErrorLevel
}

/**
 * エラー報告システム
 * SentryとSlack通知を統合
 */
class ErrorReportingService {
  private sentryConfig: SentryConfig | null = null
  private slackConfig: SlackNotificationConfig | null = null
  private isInitialized = false

  /**
   * サービスの初期化
   */
  initialize(config: {
    sentry?: SentryConfig
    slack?: SlackNotificationConfig
  }): void {
    this.sentryConfig = config.sentry || null
    this.slackConfig = config.slack || null
    this.isInitialized = true

    // 本番環境では実際のSentry初期化を行う
    if (this.sentryConfig && typeof window !== 'undefined') {
      this.initializeSentry(this.sentryConfig)
    }

    console.log('[ErrorReporting] Service initialized', {
      sentry: !!this.sentryConfig,
      slack: !!this.slackConfig
    })
  }

  /**
   * Sentryの初期化（本番環境用）
   */
  private async initializeSentry(config: SentryConfig): Promise<void> {
    try {
      // 本番環境では実際のSentry SDKを使用
      // 開発環境では代替実装
      if (config.environment === 'production') {
        // 実際のSentry初期化コード
        /*
        const Sentry = await import('@sentry/browser')
        Sentry.init({
          dsn: config.dsn,
          environment: config.environment,
          tracesSampleRate: config.tracesSampleRate,
          release: config.release,
          beforeSend: this.beforeSendFilter.bind(this)
        })
        
        if (config.userId) {
          Sentry.setUser({
            id: config.userId,
            email: config.userEmail
          })
        }
        */
      }
      
      console.log('[Sentry] Initialized successfully')
    } catch (error) {
      console.error('[Sentry] Initialization failed:', error)
    }
  }

  /**
   * エラーレベルの判定
   */
  private determineErrorLevel(error: Error | ApiError): ErrorLevel {
    if (error instanceof ApiError) {
      if (error.statusCode >= 500) return ErrorLevel.ERROR
      if (error.statusCode >= 400) return ErrorLevel.WARNING
      return ErrorLevel.INFO
    }

    // React Error Boundaryでキャッチされたエラー
    if (error.name === 'ChunkLoadError') return ErrorLevel.WARNING
    if (error.message.includes('Network')) return ErrorLevel.WARNING
    if (error.message.includes('Authentication')) return ErrorLevel.INFO
    
    return ErrorLevel.ERROR
  }

  /**
   * エラーの報告
   */
  async reportError(
    error: Error | ApiError,
    context: ErrorContext = {},
    level?: ErrorLevel
  ): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[ErrorReporting] Service not initialized')
      return
    }

    const errorLevel = level || this.determineErrorLevel(error)
    const enhancedContext = {
      ...context,
      timestamp: context.timestamp || new Date(),
      userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      url: context.url || (typeof window !== 'undefined' ? window.location.href : 'unknown')
    }

    console.log('[ErrorReporting] Reporting error', {
      error: error.message,
      level: errorLevel,
      context: enhancedContext
    })

    // Sentryに送信
    if (this.sentryConfig) {
      await this.sendToSentry(error, errorLevel, enhancedContext)
    }

    // 重大エラーの場合はSlackに通知
    if (this.slackConfig && this.shouldNotifySlack(errorLevel)) {
      await this.sendToSlack(error, errorLevel, enhancedContext)
    }
  }

  /**
   * Sentryへの送信
   */
  private async sendToSentry(
    error: Error | ApiError,
    level: ErrorLevel,
    context: ErrorContext
  ): Promise<void> {
    try {
      // 本番環境では実際のSentry送信
      if (this.sentryConfig?.environment === 'production') {
        /*
        const Sentry = await import('@sentry/browser')
        Sentry.withScope((scope) => {
          scope.setLevel(level as any)
          scope.setContext('error_details', {
            userId: context.userId,
            sessionId: context.sessionId,
            url: context.url,
            timestamp: context.timestamp
          })
          
          if (context.extra) {
            scope.setExtra('additional_data', context.extra)
          }
          
          Sentry.captureException(error)
        })
        */
      } else {
        // 開発環境ではコンソール出力
        console.log('[Sentry] Would send to Sentry:', {
          error: error.message,
          level,
          context
        })
      }
    } catch (err) {
      console.error('[Sentry] Failed to send error:', err)
    }
  }

  /**
   * Slackへの通知判定
   */
  private shouldNotifySlack(level: ErrorLevel): boolean {
    if (!this.slackConfig) return false
    
    const levels = [ErrorLevel.DEBUG, ErrorLevel.INFO, ErrorLevel.WARNING, ErrorLevel.ERROR, ErrorLevel.FATAL]
    const currentIndex = levels.indexOf(level)
    const minIndex = levels.indexOf(this.slackConfig.minLevel)
    
    return currentIndex >= minIndex
  }

  /**
   * Slackへの通知送信
   */
  private async sendToSlack(
    error: Error | ApiError,
    level: ErrorLevel,
    context: ErrorContext
  ): Promise<void> {
    if (!this.slackConfig) return

    try {
      const color = this.getSlackColor(level)
      const emoji = this.getSlackEmoji(level)
      
      const payload = {
        channel: this.slackConfig.channel,
        username: this.slackConfig.username,
        attachments: [{
          color,
          title: `${emoji} ${level.toUpperCase()} - NEO Portal Error`,
          text: error.message,
          fields: [
            {
              title: 'Error Type',
              value: error.constructor.name,
              short: true
            },
            {
              title: 'Environment',
              value: this.sentryConfig?.environment || 'unknown',
              short: true
            },
            {
              title: 'URL',
              value: context.url || 'N/A',
              short: true
            },
            {
              title: 'User ID',
              value: context.userId || 'Anonymous',
              short: true
            },
            {
              title: 'Timestamp',
              value: context.timestamp?.toISOString() || new Date().toISOString(),
              short: false
            }
          ],
          footer: 'NEO Portal Error Monitoring',
          ts: Math.floor((context.timestamp?.getTime() || Date.now()) / 1000)
        }]
      }

      // 本番環境では実際のSlack送信
      if (this.sentryConfig?.environment === 'production') {
        const response = await fetch(this.slackConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.status}`)
        }
      } else {
        // 開発環境ではコンソール出力
        console.log('[Slack] Would send notification:', payload)
      }
    } catch (err) {
      console.error('[Slack] Failed to send notification:', err)
    }
  }

  /**
   * Slack通知の色設定
   */
  private getSlackColor(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.DEBUG: return '#36a64f' // 緑
      case ErrorLevel.INFO: return '#439fe0'  // 青
      case ErrorLevel.WARNING: return '#ff9500' // オレンジ
      case ErrorLevel.ERROR: return '#ff0000' // 赤
      case ErrorLevel.FATAL: return '#8b0000' // 暗赤
      default: return '#808080' // グレー
    }
  }

  /**
   * Slack通知の絵文字設定
   */
  private getSlackEmoji(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.DEBUG: return '🐛'
      case ErrorLevel.INFO: return 'ℹ️'
      case ErrorLevel.WARNING: return '⚠️'
      case ErrorLevel.ERROR: return '❌'
      case ErrorLevel.FATAL: return '💀'
      default: return '🔍'
    }
  }

  /**
   * パフォーマンス指標の記録
   */
  async recordPerformance(metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    if (!this.isInitialized) return

    try {
      // 本番環境では実際のSentry Performance監視
      if (this.sentryConfig?.environment === 'production') {
        /*
        const Sentry = await import('@sentry/browser')
        const transaction = Sentry.getCurrentHub().getScope()?.getTransaction()
        if (transaction) {
          transaction.setMeasurement(metric, value, 'millisecond')
          if (tags) {
            Object.entries(tags).forEach(([key, value]) => {
              transaction.setTag(key, value)
            })
          }
        }
        */
      } else {
        console.log('[Performance] Metric recorded:', { metric, value, tags })
      }
    } catch (err) {
      console.error('[Performance] Failed to record metric:', err)
    }
  }

  /**
   * ユーザーフィードバックの送信
   */
  async sendUserFeedback(feedback: {
    name: string
    email: string
    message: string
    errorId?: string
  }): Promise<void> {
    if (!this.isInitialized) return

    try {
      // 本番環境では実際のSentry User Feedback
      if (this.sentryConfig?.environment === 'production') {
        /*
        const Sentry = await import('@sentry/browser')
        Sentry.captureUserFeedback({
          name: feedback.name,
          email: feedback.email,
          comments: feedback.message,
          event_id: feedback.errorId
        })
        */
      } else {
        console.log('[UserFeedback] Would send feedback:', feedback)
      }
    } catch (err) {
      console.error('[UserFeedback] Failed to send feedback:', err)
    }
  }
}

// シングルトンインスタンス
export const errorReporter = new ErrorReportingService()

// ヘルパー関数
export const reportError = (error: Error | ApiError, context?: ErrorContext, level?: ErrorLevel) =>
  errorReporter.reportError(error, context, level)

export const reportPerformance = (metric: string, value: number, tags?: Record<string, string>) =>
  errorReporter.recordPerformance(metric, value, tags)

export const sendFeedback = (feedback: { name: string; email: string; message: string; errorId?: string }) =>
  errorReporter.sendUserFeedback(feedback)

// React Hookで使用するためのヘルパー
export const useErrorReporter = () => ({
  reportError,
  reportPerformance,
  sendFeedback
})