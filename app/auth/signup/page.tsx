/**
 * サインアップ画面 - NEO Portal
 * 招待コードによる新規登録
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'

interface SignupFormData {
  invitationCode: string
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  invitationCode?: string
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

interface PasswordRequirement {
  met: boolean
  text: string
}

export default function SignupPage() {
  // 一時的に無効化
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">サインアップ</h1>
        <p className="text-gray-600">現在メンテナンス中です</p>
      </div>
    </div>
  )
}

function SignupPageOld() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup, isAuthenticated, isLoading } = useAuth()
  
  const [formData, setFormData] = useState<SignupFormData>({
    invitationCode: searchParams.get('code') || '',
    name: '',
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 既にログイン済みの場合はリダイレクト
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

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

    // 招待コードは任意項目
    // if (!formData.invitationCode.trim()) {
    //   newErrors.invitationCode = '招待コードを入力してください'
    // }

    if (!formData.name.trim()) {
      newErrors.name = '名前を入力してください'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '名前は2文字以上で入力してください'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

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
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await signup(formData.invitationCode.trim(), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      })

      if (result.success) {
        router.push('/')
      } else {
        setErrors({ general: result.error || 'アカウント作成に失敗しました' })
      }
    } catch (error) {
      setErrors({ general: 'ネットワークエラーが発生しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 入力値変更
  const handleInputChange = (field: keyof SignupFormData, value: string) => {
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
          <p className="text-sm text-gray-600">新しいアカウントを作成してください</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">アカウント作成</CardTitle>
            <CardDescription className="text-center">
              必要な情報を入力してアカウントを作成します
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

              {/* 招待コード */}
              <div>
                <Label htmlFor="invitationCode">招待コード（任意）</Label>
                <Input
                  id="invitationCode"
                  type="text"
                  value={formData.invitationCode}
                  onChange={(e) => handleInputChange('invitationCode', e.target.value)}
                  placeholder="お持ちの場合は招待コードを入力"
                  aria-invalid={!!errors.invitationCode}
                  aria-describedby={errors.invitationCode ? 'invitation-error' : 'invitation-help'}
                  className={errors.invitationCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.invitationCode ? (
                  <p id="invitation-error" className="text-sm text-red-600 mt-1">{errors.invitationCode}</p>
                ) : (
                  <p id="invitation-help" className="text-xs text-gray-600 mt-1">
                    招待コードをお持ちの場合は入力してください。空欄でも登録可能です。
                  </p>
                )}
              </div>

              {/* 名前 */}
              <div>
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="山田 太郎"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

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

              {/* 作成ボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isPasswordValid}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>作成中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>アカウント作成</span>
                  </div>
                )}
              </Button>
            </form>

            {/* リンク */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">既にアカウントをお持ちですか？ </span>
              <Link 
                href="/auth/login" 
                className="text-sm text-blue-600 hover:text-blue-500 hover:underline font-medium"
              >
                ログイン
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