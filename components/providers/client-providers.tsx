/**
 * クライアントプロバイダー - NEO Portal
 * 認証プロバイダー、エラーバウンダリー、エラー報告システムを統合管理
 */
'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/lib/auth/auth-context'
import { AppWithErrorBoundaries } from '@/components/app-error-boundary'
import { initializeErrorReporting, developmentConfig } from '@/lib/error-config'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // エラー報告システムの初期化
  useEffect(() => {
    // 開発環境では開発用設定を使用
    // 本番環境では環境変数から設定を取得
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      initializeErrorReporting(developmentConfig)
    } else {
      initializeErrorReporting()
    }
    
    console.log('[ClientProviders] Error reporting initialized for', 
      isDevelopment ? 'development' : 'production')
  }, [])

  return (
    <AppWithErrorBoundaries>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppWithErrorBoundaries>
  )
}