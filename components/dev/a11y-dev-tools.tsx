// A11y 開発ツールコンポーネント（開発環境専用）
'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Bug, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { enableA11yDevMode, performA11yCheck, logA11yIssues } from '@/lib/utils/a11y-testing';

interface A11yIssue {
  element: HTMLElement;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

export function A11yDevTools() {
  const [isVisible, setIsVisible] = useState(false);
  const [issues, setIssues] = useState<A11yIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  useEffect(() => {
    // 自動A11yモードを有効化
    enableA11yDevMode();
    
    // キーボードショートカット (Alt + Shift + A)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setIsVisible(!isVisible);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const runA11yCheck = async () => {
    setIsChecking(true);
    
    // 少し待機してから実行（DOM更新のため）
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = performA11yCheck();
    setIssues(result);
    setLastCheckTime(new Date());
    setIsChecking(false);
    
    // コンソールにも出力
    logA11yIssues(result);
  };

  const highlightElement = (element: HTMLElement) => {
    // 既存のハイライトをクリア
    document.querySelectorAll('.a11y-highlight').forEach(el => {
      el.classList.remove('a11y-highlight');
    });

    // 新しい要素をハイライト
    element.classList.add('a11y-highlight');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 3秒後にハイライトを削除
    setTimeout(() => {
      element.classList.remove('a11y-highlight');
    }, 3000);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <AccessibleButton
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="icon"
          className="bg-background shadow-lg border-2"
          title="A11yツールを開く (Alt+Shift+A)"
          aria-label="アクセシビリティチェックツールを開く"
        >
          <Eye className="h-4 w-4" />
        </AccessibleButton>
      </div>
    );
  }

  return (
    <>
      {/* A11yハイライト用CSS */}
      <style jsx global>{`
        .a11y-highlight {
          outline: 3px solid #ff0000 !important;
          outline-offset: 2px !important;
          background-color: rgba(255, 0, 0, 0.1) !important;
          animation: a11y-pulse 1s ease-in-out infinite;
        }
        
        @keyframes a11y-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="fixed bottom-4 right-4 z-[9999] max-w-md w-full">
        <Card className="bg-background shadow-xl border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4" />
                A11yチェックツール
              </CardTitle>
              <AccessibleButton
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="A11yツールを閉じる"
              >
                <EyeOff className="h-3 w-3" />
              </AccessibleButton>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {/* チェック実行ボタン */}
            <div className="flex items-center gap-2">
              <AccessibleButton
                onClick={runA11yCheck}
                loading={isChecking}
                loadingText="チェック中..."
                className="flex-1 text-xs"
                size="sm"
              >
                A11yチェック実行
              </AccessibleButton>
              
              {lastCheckTime && (
                <span className="text-xs text-muted-foreground">
                  {lastCheckTime.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* サマリー */}
            {issues.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  検出された問題: {issues.length}件
                </span>
                <div className="flex gap-1">
                  {['error', 'warning', 'info'].map(severity => {
                    const count = issues.filter(issue => issue.severity === severity).length;
                    if (count === 0) return null;
                    
                    return (
                      <span 
                        key={severity}
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          severity === 'error' ? 'bg-red-100 text-red-700' :
                          severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 問題リスト */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {issues.length === 0 && lastCheckTime && (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-green-600 font-medium">
                    問題は見つかりませんでした！
                  </p>
                </div>
              )}

              {issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-2 border-l-2 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow ${getSeverityColor(issue.severity)}`}
                  onClick={() => highlightElement(issue.element)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      highlightElement(issue.element);
                    }
                  }}
                  aria-label={`問題 ${index + 1}: ${issue.issue}. クリックして要素をハイライト`}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-2">
                        {issue.issue}
                      </p>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {issue.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 使い方 */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>💡 問題をクリックすると対象要素がハイライトされます</p>
              <p>⌨️ Alt+Shift+A でツールの表示切替</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}