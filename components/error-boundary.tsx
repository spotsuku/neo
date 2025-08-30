/**
 * React Error Boundary - NEO Digital Platform
 * 包括的エラーハンドリング・Sentry連携・ユーザーフレンドリー表示
 */
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home, Bug, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { errorReporter, ErrorLevel } from '@/lib/error-reporting'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'critical'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // エラーID生成（報告用）
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー情報を状態に保存
    this.setState({
      error,
      errorInfo
    })

    // Sentry連携（将来実装）
    this.logErrorToSentry(error, errorInfo)
    
    // カスタムエラーハンドラー実行
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 開発環境ではコンソールに詳細表示
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  private logErrorToSentry = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // エラーレベルの判定
      const level = this.props.level || 'component'
      const errorLevel = level === 'critical' ? ErrorLevel.FATAL : 
                        level === 'page' ? ErrorLevel.ERROR : ErrorLevel.WARNING

      // Sentryに自動報告
      errorReporter.reportError(error, {
        componentStack: errorInfo.componentStack,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        extra: {
          errorBoundaryLevel: level,
          errorId: this.state.errorId,
          timestamp: new Date().toISOString()
        }
      }, errorLevel).catch(reportError => {
        console.error('Failed to report error to Sentry:', reportError)
      })
      
    } catch (sentryError) {
      console.error('Sentry logging failed:', sentryError)
    }
  }

  // ユーザーIDの取得（セッション管理システムと連携）
  private getUserId(): string | undefined {
    // TODO: 実際のユーザー管理システムと連携
    try {
      return localStorage.getItem('userId') || undefined
    } catch {
      return undefined
    }
  }

  // セッションIDの取得
  private getSessionId(): string | undefined {
    try {
      let sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
        sessionStorage.setItem('sessionId', sessionId)
      }
      return sessionId
    } catch {
      return undefined
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private getErrorMessage = (error: Error): string => {
    // よくあるエラーパターンのユーザーフレンドリーメッセージ
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワーク接続に問題が発生しました。インターネット接続を確認してください。'
    }
    
    if (message.includes('timeout')) {
      return 'リクエストがタイムアウトしました。しばらく時間を置いてから再試行してください。'
    }
    
    if (message.includes('unauthorized') || message.includes('403')) {
      return 'このページにアクセスする権限がありません。ログインし直してください。'
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return '要求されたページまたはリソースが見つかりません。'
    }
    
    if (message.includes('server') || message.includes('500')) {
      return 'サーバーで問題が発生しています。しばらく時間を置いてから再試行してください。'
    }
    
    // デフォルトメッセージ
    return 'アプリケーションで予期しない問題が発生しました。'
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback
      }

      // レベル別のエラー表示
      const level = this.props.level || 'component'
      const userMessage = this.getErrorMessage(this.state.error)

      // 重要なエラーの場合はフルページ表示
      if (level === 'critical') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-red-200">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-800">システムエラーが発生しました</CardTitle>
                <CardDescription className="text-gray-600">
                  {userMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-gray-100 p-3 rounded text-xs">
                    <p className="font-mono text-red-600">{this.state.error.message}</p>
                    {this.state.errorId && (
                      <p className="text-gray-500 mt-1">エラーID: {this.state.errorId}</p>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    再試行
                  </Button>
                  <Button 
                    onClick={this.handleReload} 
                    variant="outline" 
                    className="w-full"
                  >
                    ページを再読み込み
                  </Button>
                  <Button 
                    onClick={this.handleGoHome} 
                    variant="ghost" 
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    ホームに戻る
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-500">
                  問題が解決しない場合は、<br />
                  <a 
                    href="mailto:support@neo-platform.jp" 
                    className="text-blue-600 hover:underline inline-flex items-center"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    サポートまでお問い合わせください
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // ページレベルのエラー
      if (level === 'page') {
        return (
          <div className="min-h-[50vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-orange-200">
              <CardHeader className="text-center">
                <div className="mx-auto w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-lg text-orange-800">ページの読み込みに失敗しました</CardTitle>
                <CardDescription>
                  {userMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-gray-100 p-2 rounded text-xs text-left">
                    <p className="font-mono text-red-600 break-words">{this.state.error.message}</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} size="sm" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    再試行
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" size="sm" className="flex-1">
                    <Home className="w-4 h-4 mr-1" />
                    ホーム
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // コンポーネントレベルのエラー（インライン表示）
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                コンポーネントエラー
              </h3>
              <p className="text-sm text-yellow-700">
                {userMessage}
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800">
                    開発者向け詳細
                  </summary>
                  <div className="mt-1 p-2 bg-yellow-100 rounded text-xs">
                    <p className="font-mono text-red-600 break-words">{this.state.error.message}</p>
                    {this.state.errorId && (
                      <p className="text-gray-600 mt-1">ID: {this.state.errorId}</p>
                    )}
                  </div>
                </details>
              )}
            </div>
            <Button 
              onClick={this.handleRetry} 
              size="sm" 
              variant="outline"
              className="flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// エクスポート用のヘルパーコンポーネント
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">{children}</ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">{children}</ErrorBoundary>
)

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical">{children}</ErrorBoundary>
)