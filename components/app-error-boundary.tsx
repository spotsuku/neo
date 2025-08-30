/**
 * アプリケーション全体のエラーバウンダリー統合
 * 複数レベルのエラー処理とフォールバック管理
 */

'use client'

import React, { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AppErrorBoundaryProps {
  children: ReactNode
}

/**
 * 最上位レベル - クリティカルエラー用
 * アプリケーション全体が動作しない場合のフォールバック
 */
export function CriticalErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="critical"
      fallback={
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-800">重大なエラーが発生しました</CardTitle>
              <CardDescription className="text-red-600">
                アプリケーションを正常に読み込むことができません
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-700">
                システムで予期しない問題が発生しています。
                技術チームに自動的に通知されました。
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  再読み込み
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  ホームに戻る
                </Button>
              </div>
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                エラーID: {`error_${Date.now()}_critical`}
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * ページレベル - ページ全体のエラー用
 * 個別ページで問題が発生した場合のフォールバック
 */
export function PageErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="page"
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <CardTitle className="text-gray-800">ページの読み込みエラー</CardTitle>
              <CardDescription>
                このページの表示で問題が発生しました
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                一時的な問題の可能性があります。
                ページを再読み込みするか、しばらく時間を置いてからお試しください。
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  再読み込み
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  ホームに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * コンポーネントレベル - 個別コンポーネントのエラー用
 * コンポーネント単位でのエラー分離
 */
export function ComponentErrorBoundary({ 
  children, 
  componentName 
}: AppErrorBoundaryProps & { 
  componentName?: string 
}) {
  return (
    <ErrorBoundary
      level="component"
      fallback={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-800">
              コンポーネントエラー
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            {componentName ? `${componentName}コンポーネント` : 'このコンポーネント'}で問題が発生しました
          </p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            再読み込み
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * 非同期エラーバウンダリー
 * Promise拒否やAPI呼び出しエラー用
 */
interface AsyncErrorBoundaryState {
  error: Error | null
}

export class AsyncErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('AsyncErrorBoundary caught error:', error)
    
    // 非同期エラーの報告
    if (typeof window !== 'undefined') {
      import('@/lib/error-reporting').then(({ errorReporter, ErrorLevel }) => {
        errorReporter.reportError(error, {
          extra: { boundaryType: 'async' }
        }, ErrorLevel.WARNING)
      })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              通信エラー
            </span>
          </div>
          <p className="text-xs text-blue-700 mb-3">
            データの読み込みで問題が発生しました
          </p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            再試行
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * アプリケーション全体のエラーバウンダリー構成
 * 階層的なエラー処理を提供
 */
export function AppWithErrorBoundaries({ children }: AppErrorBoundaryProps) {
  return (
    <CriticalErrorBoundary>
      <PageErrorBoundary>
        <AsyncErrorBoundary>
          {children}
        </AsyncErrorBoundary>
      </PageErrorBoundary>
    </CriticalErrorBoundary>
  )
}

/**
 * ユーティリティ関数：React外でのエラー報告
 */
export const reportAsyncError = (error: Error, context?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    import('@/lib/error-reporting').then(({ errorReporter, ErrorLevel }) => {
      errorReporter.reportError(error, {
        extra: { ...context, reportedFrom: 'manual' }
      }, ErrorLevel.WARNING)
    })
  }
}

/**
 * カスタムフック：エラー報告
 */
export const useErrorReporting = () => {
  return {
    reportError: reportAsyncError,
    reportInfo: (message: string, context?: Record<string, any>) => {
      reportAsyncError(new Error(message), { level: 'info', ...context })
    },
    reportWarning: (message: string, context?: Record<string, any>) => {
      reportAsyncError(new Error(message), { level: 'warning', ...context })
    }
  }
}