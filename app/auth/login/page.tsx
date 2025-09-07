/**
 * ログイン画面 - NEO Portal
 * メール+パスワード認証、TOTP対応
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'

interface LoginFormData {
  email: string
  password: string
  totpCode: string
}

interface FormErrors {
  email?: string
  password?: string
  totpCode?: string
  general?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    totpCode: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showTotpField, setShowTotpField] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 既にログイン済みの場合はリダイレクト
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  // バリデーション
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください'
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上である必要があります'
    }

    if (showTotpField && !formData.totpCode.trim()) {
      newErrors.totpCode = '認証コードを入力してください'
    } else if (showTotpField && !/^\d{6}$/.test(formData.totpCode)) {
      newErrors.totpCode = '認証コードは6桁の数字で入力してください'
    }

    return newErrors
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await login(
        formData.email,
        formData.password,
        showTotpField ? formData.totpCode : undefined
      )

      if (result.success) {
        router.push('/')
      } else {
        // TOTP要求の場合
        if (result.error?.includes('TOTP') || result.error?.includes('認証コード')) {
          setShowTotpField(true)
          setErrors({ totpCode: result.error })
        } else {
          setErrors({ general: result.error || 'ログインに失敗しました' })
        }
      }
    } catch (error) {
      setErrors({ general: 'ネットワークエラーが発生しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 入力値変更
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Portal</h1>
          <p className="text-sm text-gray-600">アカウントにログインしてください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">ログイン</CardTitle>
            <CardDescription className="text-center">
              メールアドレスとパスワードを入力してください
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 全般エラー表示 */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              )}

              {/* メールアドレス */}
              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@company.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="パスワードを入力"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* TOTP認証コード（必要時のみ表示） */}
              {showTotpField && (
                <div>
                  <Label htmlFor="totpCode">認証コード</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    value={formData.totpCode}
                    onChange={(e) => handleInputChange('totpCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6桁のコードを入力"
                    autoComplete="one-time-code"
                    aria-invalid={!!errors.totpCode}
                    aria-describedby={errors.totpCode ? 'totp-error' : undefined}
                    className={errors.totpCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {errors.totpCode && (
                    <p id="totp-error" className="text-sm text-red-600 mt-1">{errors.totpCode}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    認証アプリで生成された6桁のコードを入力してください
                  </p>
                </div>
              )}

              {/* ログインボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>ログイン</span>
                  </div>
                )}
              </Button>
            </form>

            {/* リンク */}
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <Link 
                  href="/auth/password-reset" 
                  className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                >
                  パスワードを忘れた方
                </Link>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">または</span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-600">アカウントをお持ちでない方は </span>
                <Link 
                  href="/auth/signup" 
                  className="text-sm text-blue-600 hover:text-blue-500 hover:underline font-medium"
                >
                  サインアップ
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>&copy; 2024 NEO Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}