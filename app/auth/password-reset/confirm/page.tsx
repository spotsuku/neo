/**
 * パスワードリセット確認画面 - NEO Portal
 * トークン確認後の新パスワード設定
 */
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, AlertCircle, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'

interface FormData {
  password: string
  confirmPassword: string
}

interface FormErrors {
  password?: string
  confirmPassword?: string
  general?: string
}

interface PasswordRequirement {
  met: boolean
  text: string
}

function PasswordResetConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { login } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // トークン取得と検証
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (!urlToken) {
      setIsValidating(false)
      return
    }

    setToken(urlToken)
    validateToken(urlToken)
  }, [searchParams])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setIsTokenValid(true)
      } else {
        setIsTokenValid(false)
      }
    } catch (error) {
      console.error('Token validation error:', error)
      setIsTokenValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  // パスワード要件チェック
  const passwordRequirements = [
    { met: formData.password.length >= 8, text: '8文字以上' },
    { met: /[A-Z]/.test(formData.password), text: '大文字を含む' },
    { met: /[a-z]/.test(formData.password), text: '小文字を含む' },
    { met: /\d/.test(formData.password), text: '数字を含む' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password), text: '記号を含む' }
  ]

  const isPasswordValid = passwordRequirements.every(req => req.met)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください'
    } else if (!isPasswordValid) {
      newErrors.password = 'パスワードの要件を満たしていません'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード確認を入力してください'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !token) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // パスワード更新成功 - 自動ログイン
        if (data.user && data.accessToken) {
          await login(data.user, data.accessToken, data.refreshToken)
          router.push('/dashboard')
        } else {
          // ログイン画面にリダイレクト
          router.push('/auth/login?message=password-updated')
        }
      } else {
        setErrors({
          general: data.message || 'パスワードの更新に失敗しました'
        })
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setErrors({
        general: 'ネットワークエラーが発生しました'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 検証中
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">トークンを確認しています...</p>
        </div>
      </div>
    )
  }

  // 無効なトークン
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Portal</h1>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">無効なリンクです</h2>
              <p className="text-gray-600 mb-6">
                このパスワードリセットリンクは無効か期限切れです。<br />
                新しいリンクを要請してください。
              </p>
              <div className="space-y-3">
                <Link href="/auth/password-reset">
                  <Button className="w-full">
                    新しいリンクを要請する
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    ログイン画面に戻る
                  </Button>
                </Link>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Portal</h1>
          <p className="text-sm text-gray-600">新しいパスワードを設定してください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              パスワードリセット
            </CardTitle>
            <CardDescription>
              セキュリティのため、強力なパスワードを設定してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* エラーメッセージ */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-800">{errors.general}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 新しいパスワード */}
              <div>
                <Label htmlFor="password">新しいパスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="新しいパスワードを入力"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : 'password-requirements'}
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
                
                {/* パスワード要件表示 */}
                {formData.password && (
                  <div id="password-requirements" className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-gray-300" />
                        )}
                        <span className={req.met ? 'text-green-600' : 'text-gray-600'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {errors.password && (
                  <p id="password-error" className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* パスワード確認 */}
              <div>
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="パスワードを再入力"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    className={errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* 更新ボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isPasswordValid}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>更新中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span>パスワードを変更</span>
                  </div>
                )}
              </Button>
            </form>

            {/* リンク */}
            <div className="mt-6 text-center">
              <Link 
                href="/auth/login" 
                className="text-sm text-blue-600 hover:text-blue-500 hover:underline font-medium"
              >
                ログイン画面に戻る
              </Link>
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

export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <PasswordResetConfirmContent />
    </Suspense>
  )
}