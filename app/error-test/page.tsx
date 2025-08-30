/**
 * エラーハンドリングテストページ
 * Error Boundary、API エラー、Sentry統合の動作確認
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Bug, Zap, Network, Shield } from 'lucide-react'
import { ComponentErrorBoundary, useErrorReporting } from '@/components/app-error-boundary'
import { ApiError } from '@/lib/api-error'

export default function ErrorTestPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const { reportError, reportInfo } = useErrorReporting()

  const addResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev])
  }

  // React Error Boundary テスト
  const testReactError = () => {
    throw new Error('テスト用React例外: Error Boundaryの動作確認')
  }

  // API エラーテスト
  const testApiError = async (errorType: string) => {
    try {
      const response = await fetch(`/api/test-error?type=${errorType}`)
      const data = await response.json()
      
      if (!response.ok) {
        addResult(`APIエラー (${response.status}): ${data.message}`)
      } else {
        addResult(`API成功: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      addResult(`ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`)
      reportError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // 手動エラー報告テスト
  const testManualReporting = () => {
    const testError = new Error('手動報告テストエラー')
    reportError(testError, { source: 'manual_test', timestamp: Date.now() })
    addResult('手動エラー報告を送信しました')
  }

  // 非同期エラーテスト
  const testAsyncError = () => {
    setTimeout(() => {
      throw new Error('非同期エラーのテスト (setTimeout)')
    }, 100)
    addResult('非同期エラーを発生させました（100ms後）')
  }

  // Promise拒否テスト
  const testPromiseRejection = () => {
    Promise.reject(new Error('Promise拒否テスト'))
    addResult('Promise拒否を発生させました')
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">エラーハンドリングテスト</h1>
        <p className="text-muted-foreground">
          Error Boundary、API エラー、Sentry統合の動作確認
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* React Error Boundary テスト */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              React Error Boundary
            </CardTitle>
            <CardDescription>
              React コンポーネント内での例外処理テスト
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={testReactError}
              variant="destructive"
              className="w-full"
            >
              React例外を発生させる
            </Button>
            
            <ComponentErrorBoundary componentName="TestComponent">
              <TestComponentWithError />
            </ComponentErrorBoundary>
            
            <Button 
              onClick={testAsyncError}
              variant="outline"
              className="w-full"
            >
              非同期エラーを発生させる
            </Button>
            
            <Button 
              onClick={testPromiseRejection}
              variant="outline" 
              className="w-full"
            >
              Promise拒否を発生させる
            </Button>
          </CardContent>
        </Card>

        {/* API エラーテスト */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              API エラーハンドリング
            </CardTitle>
            <CardDescription>
              各種APIエラーレスポンスの動作確認
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { type: 'validation', label: 'バリデーションエラー (400)' },
              { type: 'unauthorized', label: '認証エラー (401)' },
              { type: 'forbidden', label: '認可エラー (403)' },
              { type: 'notfound', label: 'Not Found (404)' },
              { type: 'conflict', label: '競合エラー (409)' },
              { type: 'ratelimit', label: 'レート制限 (429)' },
              { type: 'internal', label: '内部サーバーエラー (500)' },
              { type: 'network', label: 'ネットワークエラー' }
            ].map(({ type, label }) => (
              <Button
                key={type}
                onClick={() => testApiError(type)}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start"
              >
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* エラー報告テスト */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              エラー報告システム
            </CardTitle>
            <CardDescription>
              Sentry統合とSlack通知の動作確認
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={testManualReporting}
              className="w-full"
            >
              手動エラー報告
            </Button>
            
            <Button
              onClick={() => reportInfo('情報レベルのテストメッセージ')}
              variant="outline"
              className="w-full"
            >
              情報レベル報告
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>• 開発環境: コンソール出力</p>
              <p>• 本番環境: Sentry + Slack通知</p>
            </div>
          </CardContent>
        </Card>

        {/* テスト結果 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              テスト結果ログ
            </CardTitle>
            <CardDescription>
              実行したテストの結果一覧
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  テストを実行すると結果がここに表示されます
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="text-xs bg-muted p-2 rounded font-mono"
                  >
                    {result}
                  </div>
                ))
              )}
            </div>
            {testResults.length > 0 && (
              <Button
                onClick={() => setTestResults([])}
                variant="outline"
                size="sm"
                className="mt-3 w-full"
              >
                ログをクリア
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// エラー発生用のテストコンポーネント
function TestComponentWithError() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error('ComponentErrorBoundary テスト用エラー')
  }

  return (
    <Button
      onClick={() => setShouldError(true)}
      variant="outline"
      size="sm"
      className="w-full"
    >
      コンポーネントエラーを発生させる
    </Button>
  )
}