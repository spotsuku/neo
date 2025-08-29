'use client';

// NEO Digital Platform - Error Boundary Components
// エラー境界とエラーハンドリングコンポーネント

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { logger, metrics } from '@/lib/monitoring';

// エラー境界のプロップス
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  showDetails?: boolean;
}

// エラー境界の状態
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// エラーカテゴリ分類
type ErrorCategory = 
  | 'render'
  | 'network' 
  | 'auth'
  | 'permission'
  | 'validation'
  | 'system'
  | 'unknown';

/**
 * エラー分類ユーティリティ
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  
  if (message.includes('auth') || message.includes('unauthorized')) {
    return 'auth';
  }
  
  if (message.includes('permission') || message.includes('forbidden')) {
    return 'permission';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }
  
  if (stack.includes('react') || stack.includes('render')) {
    return 'render';
  }
  
  return 'unknown';
}

/**
 * メインエラー境界コンポーネント
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    const errorId = this.state.errorId!;
    const category = categorizeError(error);
    
    // エラー情報の拡張
    const enhancedError = {
      ...error,
      errorId,
      category,
      level,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
    
    // ログ記録
    const logLevel = level === 'critical' ? 'fatal' : 'error';
    logger[logLevel](`Error Boundary caught ${category} error`, error, {
      errorId,
      category,
      level,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
    
    // メトリクス記録
    metrics.increment('frontend_errors_total', {
      category,
      level,
      component: errorInfo.componentStack.split('\n')[1]?.trim() || 'unknown',
    });
    
    // 状態更新
    this.setState({ errorInfo });
    
    // カスタムエラーハンドラー実行
    if (onError) {
      onError(error, errorInfo);
    }
    
    // クリティカルエラーの場合は即座にレポート
    if (level === 'critical') {
      this.reportCriticalError(enhancedError, errorInfo);
    }
  }
  
  private async reportCriticalError(error: any, errorInfo: ErrorInfo): Promise<void> {
    try {
      // TODO: 外部エラー監視サービス（Sentry等）への送信
      console.error('Critical error reported:', { error, errorInfo });
    } catch (reportError) {
      console.error('Failed to report critical error:', reportError);
    }
  }
  
  private handleRetry = (): void => {
    // エラー再試行メトリクス
    metrics.increment('error_boundary_retry', {
      errorId: this.state.errorId!,
    });
    
    logger.info(`Error boundary retry attempted`, {
      errorId: this.state.errorId,
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  }
  
  private handleReload = (): void => {
    metrics.increment('error_boundary_reload', {
      errorId: this.state.errorId!,
    });
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
  
  private handleGoHome = (): void => {
    metrics.increment('error_boundary_home', {
      errorId: this.state.errorId!,
    });
    
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
  
  render() {
    if (this.state.hasError) {
      const { fallback, level = 'component', showDetails = false } = this.props;
      const { error, errorInfo, errorId } = this.state;
      
      // カスタムフォールバックがある場合は使用
      if (fallback) {
        return fallback;
      }
      
      // レベル別のエラー表示
      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          level={level}
          showDetails={showDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }
    
    return this.props.children;
  }
}

/**
 * エラー表示コンポーネント
 */
interface ErrorDisplayProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  level: 'page' | 'component' | 'critical';
  showDetails: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

function ErrorDisplay({
  error,
  errorInfo,
  errorId,
  level,
  showDetails,
  onRetry,
  onReload,
  onGoHome,
}: ErrorDisplayProps) {
  const category = error ? categorizeError(error) : 'unknown';
  
  // レベル別のスタイルと内容
  const getErrorConfig = () => {
    switch (level) {
      case 'critical':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          title: 'システムエラーが発生しました',
          description: 'システムに重大なエラーが発生しました。しばらくしてからもう一度お試しください。',
        };
      case 'page':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          title: 'ページでエラーが発生しました',
          description: 'このページの表示中にエラーが発生しました。ページを再読み込みしてください。',
        };
      default:
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          title: 'コンポーネントエラー',
          description: '一部の機能でエラーが発生しました。もう一度お試しください。',
        };
    }
  };
  
  const config = getErrorConfig();
  
  return (
    <div className={`min-h-[400px] flex items-center justify-center p-4`}>
      <div className={`max-w-md w-full ${config.bgColor} ${config.borderColor} border rounded-lg p-6`}>
        <div className="flex items-center mb-4">
          <AlertTriangle className={`h-6 w-6 ${config.iconColor} mr-3`} />
          <h2 className="text-lg font-semibold text-gray-900">
            {config.title}
          </h2>
        </div>
        
        <p className="text-gray-700 mb-6">
          {config.description}
        </p>
        
        {/* エラーID表示 */}
        {errorId && (
          <div className="bg-gray-100 rounded p-3 mb-4 text-sm">
            <div className="flex items-center text-gray-600">
              <Bug className="h-4 w-4 mr-2" />
              <span>エラーID: {errorId}</span>
            </div>
          </div>
        )}
        
        {/* 詳細表示（開発環境またはshowDetailsがtrue） */}
        {showDetails && error && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-gray-600 mb-2">
              技術的な詳細を表示
            </summary>
            <div className="bg-gray-100 rounded p-3 text-xs font-mono">
              <div className="mb-2">
                <strong>エラー:</strong> {error.message}
              </div>
              {error.stack && (
                <div className="mb-2">
                  <strong>スタックトレース:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>コンポーネントスタック:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
        
        {/* アクションボタン */}
        <div className="space-y-2">
          {level === 'component' && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              もう一度試す
            </button>
          )}
          
          {level === 'page' && (
            <button
              onClick={onReload}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              ページを再読み込み
            </button>
          )}
          
          <button
            onClick={onGoHome}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            ホームに戻る
          </button>
          
          {level === 'critical' && (
            <button
              onClick={() => {
                const subject = `エラー報告 - ID: ${errorId}`;
                const body = `エラーが発生しました。\n\nエラーID: ${errorId}\n時刻: ${new Date().toLocaleString()}\nURL: ${window.location.href}`;
                const mailto = `mailto:support@neo-digital.jp?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailto;
              }}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <Mail className="h-4 w-4 mr-2" />
              サポートに連絡
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 特定用途向けエラー境界
 */

// ページレベルエラー境界
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="page"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

// コンポーネントレベルエラー境界
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="component">
      {children}
    </ErrorBoundary>
  );
}

// クリティカルエラー境界
export function CriticalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      level="critical"
      showDetails={true}
      onError={(error, errorInfo) => {
        // クリティカルエラーの特別処理
        console.error('CRITICAL ERROR:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * エラーレポートフック
 */
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    const errorId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.error('Manual error report', error, {
      errorId,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
    
    metrics.increment('manual_error_reports', {
      category: categorizeError(error),
    });
    
    return errorId;
  };
  
  return { reportError };
}

/**
 * エラー境界HOC（High-Order Component）
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryConfig?: {
    level?: 'page' | 'component' | 'critical';
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
) {
  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryConfig}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
  
  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
}