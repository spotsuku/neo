/**
 * クライアントプロバイダー - NEO Digital Platform
 * 認証プロバイダーなどのクライアント専用プロバイダーをまとめて管理
 */
'use client'

import { AuthProvider } from '@/lib/auth/auth-context'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}