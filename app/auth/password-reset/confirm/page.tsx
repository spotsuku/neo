/**
 * パスワードリセット確認画面 - NEO Digital Platform
 * トークン確認後の新パスワード設定
 */
'use client'

import { useState, useEffect } from 'react'
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

export default function PasswordResetConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPassword } = useAuth()
  
  const [token, setToken] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // URLパラメータからトークン取得
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setTokenError('無効なリセットリンクです。')
    }
  }, [searchParams])

  // パスワード要件チェック
  const getPasswordRequirements = (password: string): PasswordRequirement[] => [
    { met: password.length >= 8, text: '8文字以上' },
    { met: /[a-z]/.test(password), text: '小文字を含む' },
    { met: /[A-Z]/.test(password), text: '大文字を含む' },
    { met: /\d/.test(password), text: '数字を含む' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: '記号を含む' }
  ]

  const passwordRequirements = getPasswordRequirements(formData.password)
  const isPasswordValid = passwordRequirements.every(req => req.met)

  // バリデーション
  const validateForm = (): FormErrors => {
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

    return newErrors
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setErrors({ general: '無効なリセットリンクです。' })
      return
    }

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await resetPassword(token, formData.password)

      if (result.success) {
        setIsSuccess(true)
      } else {
        setErrors({ general: result.error || 'パスワードリセットに失敗しました' })
      }
    } catch (error) {
      setErrors({ general: 'ネットワークエラーが発生しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 入力値変更
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 成功画面
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Digital Platform</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-center">パスワードを変更しました</CardTitle>
              <CardDescription className="text-center">
                新しいパスワードでログインできます
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  パスワードが正常に変更されました。<br />
                  新しいパスワードでログインしてください。
                </p>

                <Button 
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  ログイン画面へ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* フッター */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>&copy; 2024 NEO Digital Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  // トークンエラー画面
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Digital Platform</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-center">無効なリンクです</CardTitle>
              <CardDescription className="text-center">
                パスワードリセットリンクが無効です
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  このリンクは無効、または期限が切れています。<br />
                  新しいパスワードリセットを要求してください。
                </p>

                <div className="space-y-2">
                  <Link href="/auth/password-reset">
                    <Button className="w-full">
                      パスワードリセットを再試行
                    </Button>
                  </Link>
                  
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full">
                      ログイン画面に戻る
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* フッター */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>&copy; 2024 NEO Digital Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NEO Digital Platform</h1>
          <p className="text-sm text-gray-600">新しいパスワードを設定してください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">新しいパスワード</CardTitle>
            <CardDescription className="text-center">
              セキュリティ要件を満たすパスワードを設定してください
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

              {/* パスワード */}
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
          <p>&copy; 2024 NEO Digital Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}