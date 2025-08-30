/**
 * エラー報告システムの設定
 * 環境変数に基づいてSentryとSlackの設定を管理
 */

import { errorReporter } from './error-reporting'
import type { SentryConfig, SlackNotificationConfig, ErrorLevel } from './error-reporting'

// 環境変数の型定義
interface EnvironmentConfig {
  SENTRY_DSN?: string
  SENTRY_ENVIRONMENT?: 'development' | 'production' | 'staging'
  SENTRY_RELEASE?: string
  SLACK_WEBHOOK_URL?: string
  SLACK_CHANNEL?: string
  SLACK_USERNAME?: string
  SLACK_MIN_ERROR_LEVEL?: string
}

/**
 * 環境変数からSentry設定を生成
 */
function createSentryConfig(env: EnvironmentConfig): SentryConfig | null {
  if (!env.SENTRY_DSN) {
    console.warn('[ErrorConfig] Sentry DSN not configured')
    return null
  }

  return {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: env.SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    release: env.SENTRY_RELEASE || `webapp@${process.env.VERCEL_GIT_COMMIT_SHA || 'dev'}`
  }
}

/**
 * 環境変数からSlack設定を生成
 */
function createSlackConfig(env: EnvironmentConfig): SlackNotificationConfig | null {
  if (!env.SLACK_WEBHOOK_URL) {
    console.warn('[ErrorConfig] Slack webhook URL not configured')
    return null
  }

  // エラーレベルの文字列をEnumに変換
  const minLevelStr = env.SLACK_MIN_ERROR_LEVEL?.toLowerCase() || 'error'
  const minLevel = (Object.values(ErrorLevel) as string[]).includes(minLevelStr) 
    ? (minLevelStr as ErrorLevel) 
    : ErrorLevel.ERROR

  return {
    webhookUrl: env.SLACK_WEBHOOK_URL,
    channel: env.SLACK_CHANNEL || '#alerts',
    username: env.SLACK_USERNAME || 'NEO Digital Platform Bot',
    minLevel
  }
}

/**
 * Cloudflare Workersの環境変数からの設定読み込み
 */
function getCloudflareEnv(): EnvironmentConfig {
  // Cloudflare Workersでは環境変数は実行時にenvオブジェクトから取得
  // ここではプレースホルダーとして設定
  return {
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: (process.env.SENTRY_ENVIRONMENT as any) || 'development',
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    SLACK_CHANNEL: process.env.SLACK_CHANNEL,
    SLACK_USERNAME: process.env.SLACK_USERNAME,
    SLACK_MIN_ERROR_LEVEL: process.env.SLACK_MIN_ERROR_LEVEL
  }
}

/**
 * エラー報告システムの初期化
 * アプリケーション起動時に呼び出す
 */
export function initializeErrorReporting(env?: EnvironmentConfig): void {
  const config = env || getCloudflareEnv()
  
  const sentryConfig = createSentryConfig(config)
  const slackConfig = createSlackConfig(config)

  errorReporter.initialize({
    sentry: sentryConfig,
    slack: slackConfig
  })

  console.log('[ErrorConfig] Error reporting initialized', {
    sentry: !!sentryConfig,
    slack: !!slackConfig,
    environment: sentryConfig?.environment || 'unknown'
  })

  // グローバルエラーハンドラーの設定
  if (typeof window !== 'undefined') {
    setupGlobalErrorHandlers()
  }
}

/**
 * グローバルエラーハンドラーの設定
 * React Error Boundaryでキャッチできないエラーを捕捉
 */
function setupGlobalErrorHandlers(): void {
  // 未処理のPromise拒否
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason)
    
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    
    errorReporter.reportError(error, {
      extra: { 
        type: 'unhandledrejection',
        promise: event.promise 
      }
    })
  })

  // 未処理のJavaScriptエラー
  window.addEventListener('error', (event) => {
    console.error('Unhandled JavaScript Error:', event.error)
    
    const error = event.error || new Error(event.message)
    
    errorReporter.reportError(error, {
      url: event.filename,
      extra: {
        type: 'javascript',
        lineno: event.lineno,
        colno: event.colno
      }
    })
  })

  console.log('[ErrorConfig] Global error handlers set up')
}

/**
 * 開発環境用の設定
 */
export const developmentConfig: EnvironmentConfig = {
  SENTRY_ENVIRONMENT: 'development',
  SLACK_MIN_ERROR_LEVEL: 'warning'
  // 開発環境ではSentry DSNとSlack Webhook URLは設定しない
  // （コンソール出力のみ）
}

/**
 * 本番環境用の設定テンプレート
 * 実際の値は環境変数から取得
 */
export const productionConfigTemplate: EnvironmentConfig = {
  SENTRY_DSN: 'https://your-sentry-dsn@sentry.io/project-id',
  SENTRY_ENVIRONMENT: 'production',
  SENTRY_RELEASE: 'webapp@1.0.0',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/your/webhook/url',
  SLACK_CHANNEL: '#neo-alerts',
  SLACK_USERNAME: 'NEO Digital Platform Bot',
  SLACK_MIN_ERROR_LEVEL: 'error'
}

/**
 * ユーザー情報の設定（認証後に呼び出し）
 */
export function setUserContext(user: {
  id: string
  email?: string
  name?: string
}): void {
  // ローカルストレージに保存してError Boundaryから参照
  try {
    localStorage.setItem('userId', user.id)
    if (user.email) {
      localStorage.setItem('userEmail', user.email)
    }
    if (user.name) {
      localStorage.setItem('userName', user.name)
    }
    
    console.log('[ErrorConfig] User context set:', { id: user.id, email: user.email })
  } catch (error) {
    console.warn('[ErrorConfig] Failed to set user context:', error)
  }
}

/**
 * ユーザー情報のクリア（ログアウト時に呼び出し）
 */
export function clearUserContext(): void {
  try {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    
    console.log('[ErrorConfig] User context cleared')
  } catch (error) {
    console.warn('[ErrorConfig] Failed to clear user context:', error)
  }
}