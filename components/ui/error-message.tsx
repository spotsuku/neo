/**
 * エラーメッセージUI - NEO Digital Platform
 * 統一されたエラー表示・分類別スタイリング・操作ガイダンス
 */
'use client'

import { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info, XCircle, RefreshCw, Home, Mail, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ApiError, ErrorType, getUserFriendlyMessage } from '@/lib/api-error'

// エラーレベル定義
export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical'

// エラーメッセージプロパティ
export interface ErrorMessageProps {
  error?: ApiError | Error | string
  level?: ErrorLevel
  title?: string
  message?: string
  showRetry?: boolean
  showGoHome?: boolean
  showReload?: boolean
  showSupport?: boolean
  onRetry?: () => void
  onGoHome?: () => void
  onReload?: () => void
  className?: string
  children?: ReactNode
}

// レベル別設定
const levelConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    descColor: 'text-blue-700'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    descColor: 'text-yellow-700'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    descColor: 'text-red-700'
  },
  critical: {
    icon: XCircle,
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    iconColor: 'text-red-700',
    titleColor: 'text-red-900',
    descColor: 'text-red-800'
  }
}

// エラータイプからレベルを推定
const getErrorLevel = (error: ApiError | Error): ErrorLevel => {
  if (error instanceof ApiError) {
    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.TOKEN_EXPIRED:
        return 'warning'
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.REQUIRED_FIELD_MISSING:
      case ErrorType.INVALID_FORMAT:
        return 'info'
      
      case ErrorType.NOT_FOUND:
      case ErrorType.ALREADY_EXISTS:
      case ErrorType.CONFLICT:
        return 'warning'
      
      case ErrorType.INTERNAL_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.EXTERNAL_SERVICE_ERROR:
        return 'critical'
      
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return 'error'
      
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return 'warning'
      
      default:
        return 'error'
    }
  }
  
  return 'error'
}

// メインエラーメッセージコンポーネント
export function ErrorMessage({
  error,
  level,
  title,
  message,
  showRetry = false,
  showGoHome = false,
  showReload = false,
  showSupport = false,
  onRetry,
  onGoHome,
  onReload,
  className = '',
  children
}: ErrorMessageProps) {
  // エラーからレベルとメッセージを推定
  const finalLevel = level || (error ? getErrorLevel(error instanceof Error || error instanceof ApiError ? error : new Error(String(error))) : 'error')
  const config = levelConfig[finalLevel]
  const Icon = config.icon

  // メッセージ決定
  const finalMessage = message || (
    error 
      ? error instanceof ApiError || error instanceof Error 
        ? getUserFriendlyMessage(error)
        : String(error)
      : '問題が発生しました'
  )

  // タイトル決定
  const finalTitle = title || (() => {
    switch (finalLevel) {
      case 'info':
        return '情報'
      case 'warning':
        return '注意'
      case 'error':
        return 'エラー'
      case 'critical':
        return '重要なエラー'
      default:
        return 'エラー'
    }
  })()

  // アクションハンドラー
  const handleGoHome = onGoHome || (() => window.location.href = '/')
  const handleReload = onReload || (() => window.location.reload())

  return (
    <Alert className={`${config.bgColor} ${config.borderColor} ${className}`}>
      <Icon className={`h-5 w-5 ${config.iconColor}`} />
      <AlertTitle className={config.titleColor}>
        {finalTitle}
      </AlertTitle>
      <AlertDescription className={config.descColor}>
        <div className="space-y-3">
          <p>{finalMessage}</p>
          
          {/* バリデーションエラー詳細 */}
          {error instanceof ApiError && error.details && error.details.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">詳細:</p>
              <ul className="text-sm space-y-1">
                {error.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="font-medium min-w-0 flex-shrink-0">{detail.field}:</span>
                    <span>{detail.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 開発モード詳細情報 */}
          {process.env.NODE_ENV === 'development' && error instanceof Error && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">
                開発者向け詳細情報
              </summary>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs">
                <p className="font-mono break-words">{error.message}</p>
                {error instanceof ApiError && (
                  <div className="mt-1 space-y-1">
                    <p><strong>Type:</strong> {error.type}</p>
                    <p><strong>Status:</strong> {error.statusCode}</p>
                    {error.code && <p><strong>Code:</strong> {error.code}</p>}
                    {error.requestId && <p><strong>Request ID:</strong> {error.requestId}</p>}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* カスタムコンテンツ */}
          {children}

          {/* アクションボタン */}
          {(showRetry || showReload || showGoHome || showSupport) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {showRetry && onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  再試行
                </Button>
              )}
              
              {showReload && (
                <Button size="sm" variant="outline" onClick={handleReload}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  再読み込み
                </Button>
              )}
              
              {showGoHome && (
                <Button size="sm" variant="outline" onClick={handleGoHome}>
                  <Home className="w-3 h-3 mr-1" />
                  ホーム
                </Button>
              )}
              
              {showSupport && (
                <Button size="sm" variant="outline" asChild>
                  <a href="mailto:support@neo-platform.jp">
                    <Mail className="w-3 h-3 mr-1" />
                    サポート
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// 特定用途向けのプリセットコンポーネント
export function NetworkErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      level="error"
      title="接続エラー"
      message="インターネット接続を確認してください"
      showRetry={!!onRetry}
      showReload={true}
      onRetry={onRetry}
    />
  )
}

export function NotFoundMessage({ resourceName }: { resourceName?: string }) {
  return (
    <ErrorMessage
      level="warning"
      title="見つかりません"
      message={resourceName ? `${resourceName}が見つかりません` : 'ページが見つかりません'}
      showGoHome={true}
    />
  )
}

export function UnauthorizedMessage() {
  return (
    <ErrorMessage
      level="warning"
      title="認証エラー"
      message="ログインが必要です。再度ログインしてください"
      showGoHome={true}
    />
  )
}

export function ValidationErrorMessage({ 
  details 
}: { 
  details?: Array<{ field: string; message: string }> 
}) {
  const error = new (Error as any)('入力内容を確認してください') as ApiError
  error.type = ErrorType.VALIDATION_ERROR
  error.details = details
  
  return (
    <ErrorMessage
      error={error}
      level="info"
      title="入力エラー"
    />
  )
}

export function ServerErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      level="critical"
      title="サーバーエラー"
      message="サーバーで問題が発生しています。しばらく時間を置いてから再試行してください"
      showRetry={!!onRetry}
      showSupport={true}
      onRetry={onRetry}
    />
  )
}

// フルページエラー表示用
export function ErrorPage({
  error,
  title = 'エラーが発生しました',
  showActions = true
}: {
  error?: ApiError | Error | string
  title?: string
  showActions?: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage
            error={error}
            showRetry={showActions}
            showReload={showActions}
            showGoHome={showActions}
            showSupport={showActions}
          />
        </CardContent>
      </Card>
    </div>
  )
}