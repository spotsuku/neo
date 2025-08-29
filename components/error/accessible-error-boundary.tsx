// アクセシブルエラー境界コンポーネント
'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class AccessibleErrorBoundary extends Component<Props, State> {
  private errorAnnouncementRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorId: `error-${Date.now()}`
    };
    this.errorAnnouncementRef = React.createRef();
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: `error-${Date.now()}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // スクリーンリーダーにエラーを通知
    this.announceError();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError) {
      // エラー発生時にフォーカスを移動
      this.errorAnnouncementRef.current?.focus();
    }
  }

  private announceError = () => {
    const announcer = document.getElementById('alerts');
    if (announcer) {
      announcer.textContent = 'アプリケーションでエラーが発生しました。詳細を確認してください。';
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    
    if (error?.name === 'ChunkLoadError') {
      return 'アプリケーションの更新が利用可能です。ページを再読み込みしてください。';
    }
    
    if (error?.message?.includes('Network')) {
      return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    }
    
    return 'アプリケーションで予期しないエラーが発生しました。';
  };

  private getErrorSolutions = (): string[] => {
    const { error } = this.state;
    
    if (error?.name === 'ChunkLoadError') {
      return [
        'ページを再読み込みしてください',
        'ブラウザのキャッシュをクリアしてください',
        '問題が続く場合は、システム管理者にお問い合わせください'
      ];
    }
    
    if (error?.message?.includes('Network')) {
      return [
        'インターネット接続を確認してください',
        'しばらく待ってから再度お試しください',
        'VPN接続をしている場合は、一度切断してお試しください'
      ];
    }
    
    return [
      'ページを再読み込みしてください',
      '問題が続く場合は、システム管理者にお問い合わせください',
      'ブラウザを再起動してお試しください'
    ];
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen bg-background flex items-center justify-center p-4"
          role="alert"
          aria-labelledby={`${this.state.errorId}-title`}
          aria-describedby={`${this.state.errorId}-description`}
        >
          <div
            ref={this.errorAnnouncementRef}
            tabIndex={-1}
            className="focus:outline-none"
          >
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-destructive/10 p-3">
                    <AlertTriangle 
                      className="h-8 w-8 text-destructive" 
                      aria-hidden="true"
                    />
                  </div>
                </div>
                
                <CardTitle 
                  id={`${this.state.errorId}-title`}
                  className="text-xl font-semibold text-foreground"
                >
                  エラーが発生しました
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div 
                  id={`${this.state.errorId}-description`}
                  className="text-center"
                >
                  <p className="text-muted-foreground mb-4">
                    {this.getErrorMessage()}
                  </p>
                  
                  <div className="text-left">
                    <h3 className="font-medium text-sm text-foreground mb-2">
                      解決方法:
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {this.getErrorSolutions().map((solution, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2 mt-0.5">•</span>
                          <span>{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <AccessibleButton
                    onClick={this.handleRetry}
                    className="flex-1"
                    aria-describedby={`${this.state.errorId}-retry-help`}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    再試行
                  </AccessibleButton>
                  
                  <AccessibleButton
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="flex-1"
                    aria-describedby={`${this.state.errorId}-home-help`}
                  >
                    <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                    ホームに戻る
                  </AccessibleButton>
                </div>
                
                <div className="sr-only">
                  <p id={`${this.state.errorId}-retry-help`}>
                    このボタンを押すと、エラーの発生したコンテンツを再度読み込みます
                  </p>
                  <p id={`${this.state.errorId}-home-help`}>
                    このボタンを押すと、ダッシュボードのホーム画面に戻ります
                  </p>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      技術的な詳細（開発用）
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {this.state.error.name}: {this.state.error.message}
                      {this.state.error.stack && `\n\n${this.state.error.stack}`}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}