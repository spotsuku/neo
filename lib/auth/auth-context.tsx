/**
 * 認証状態管理Context - NEO Digital Platform
 * JWT認証・リフレッシュトークン・ユーザー状態管理
 */
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'secretariat' | 'company_admin' | 'student'
  company_id: string
  region_id: string
  avatar_url?: string
  email_verified: boolean
  totp_enabled: boolean
  last_login_at?: string
  created_at: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string, totpCode?: string) => Promise<{success: boolean, error?: string}>
  logout: () => void
  signup: (invitationCode: string, userData: {
    name: string
    email: string
    password: string
  }) => Promise<{success: boolean, error?: string}>
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatar_url'>>) => Promise<{success: boolean, error?: string}>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, error?: string}>
  requestPasswordReset: (email: string) => Promise<{success: boolean, error?: string}>
  resetPassword: (token: string, newPassword: string) => Promise<{success: boolean, error?: string}>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })
  const router = useRouter()

  // トークン管理
  const getAccessToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const getRefreshToken = () => typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
  
  const setTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }
  }
  
  const clearTokens = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  // APIリクエスト共通関数
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = getAccessToken()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers
      }
    })

    if (response.status === 401) {
      // アクセストークン期限切れ - リフレッシュ試行
      const refreshResult = await refreshAuth()
      if (refreshResult) {
        // リフレッシュ成功 - 元のリクエスト再試行
        const newAccessToken = getAccessToken()
        return fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(newAccessToken && { Authorization: `Bearer ${newAccessToken}` }),
            ...options.headers
          }
        })
      } else {
        // リフレッシュ失敗 - ログアウト
        logout()
        throw new Error('認証が期限切れです。再度ログインしてください。')
      }
    }

    return response
  }

  // 認証状態の更新
  const updateAuthState = (user: User | null) => {
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: !!user
    })
  }

  // ログイン
  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totp_code: totpCode })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTokens(result.data.access_token, result.data.refresh_token)
        updateAuthState(result.data.user)
        return { success: true }
      } else {
        updateAuthState(null)
        return { success: false, error: result.message || 'ログインに失敗しました' }
      }
    } catch (error) {
      updateAuthState(null)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // ログアウト
  const logout = () => {
    clearTokens()
    updateAuthState(null)
    router.push('/auth/login')
  }

  // サインアップ
  const signup = async (invitationCode: string, userData: {
    name: string
    email: string
    password: string
  }) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const requestBody: any = { ...userData }
      
      // 招待コードが空でない場合のみ追加
      if (invitationCode && invitationCode.trim()) {
        requestBody.invitation_code = invitationCode.trim()
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTokens(result.tokens.access_token, result.tokens.refresh_token)
        updateAuthState(result.user)
        return { success: true }
      } else {
        updateAuthState(null)
        return { success: false, error: result.message || 'アカウント作成に失敗しました' }
      }
    } catch (error) {
      updateAuthState(null)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // プロフィール更新
  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'avatar_url'>>) => {
    try {
      const response = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        updateAuthState({ ...authState.user!, ...updates })
        return { success: true }
      } else {
        return { success: false, error: result.message || 'プロフィール更新に失敗しました' }
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // パスワード変更
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.message || 'パスワード変更に失敗しました' }
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // パスワードリセット要求
  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.message || 'パスワードリセット要求に失敗しました' }
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // パスワードリセット実行
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.message || 'パスワードリセットに失敗しました' }
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // 認証状態の更新（リフレッシュトークン使用）
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return false

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTokens(result.data.access_token, result.data.refresh_token)
        updateAuthState(result.data.user)
        return true
      } else {
        clearTokens()
        return false
      }
    } catch (error) {
      clearTokens()
      return false
    }
  }

  // 初期化時の認証状態確認
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getAccessToken()
      if (accessToken) {
        const success = await refreshAuth()
        if (!success) {
          updateAuthState(null)
        }
      } else {
        updateAuthState(null)
      }
    }

    initAuth()
  }, [])

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    signup,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    refreshAuth
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}