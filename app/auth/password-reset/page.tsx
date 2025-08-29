/**
 * パスワードリセット画面 - NEO Digital Platform
 * メール送信によるパスワードリセット
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'

interface FormData {
  email: string
}

interface FormErrors {
  email?: string
  general?: string
}

export default function PasswordResetPage() {
  const { requestPasswordReset } = useAuth()
  
  const [formData, setFormData] = useState<FormData>({
    email: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // バリデーション
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
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
      const result = await requestPasswordReset(formData.email.trim())

      if (result.success) {
        setIsSuccess(true)
      } else {
        setErrors({ general: result.error || 'パスワードリセット要求に失敗しました' })
      }
    } catch (error) {
      setErrors({ general: 'ネットワークエラーが発生しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 入力値変更
  const handleInputChange = (value: string) => {
    setFormData({ email: value })
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
  }

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
              <CardTitle className="text-center">メールを送信しました</CardTitle>
              <CardDescription className="text-center">
                パスワードリセットのご案内をお送りしました
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  <strong>{formData.email}</strong> にパスワードリセット用のリンクを送信しました。
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">次の手順に従ってください：</p>
                      <ol className="list-decimal list-inside space-y-1 text-left">
                        <li>メールボックスを確認してください</li>
                        <li>「パスワードリセット」のメールを開いてください</li>
                        <li>メール内のリンクをクリックしてください</li>
                        <li>新しいパスワードを設定してください</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-2">
                  <p>メールが届かない場合は、迷惑メールフォルダをご確認ください。</p>
                  <p>リンクの有効期限は24時間です。</p>
                </div>

                <div className="pt-4">
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
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
          <p className="text-sm text-gray-600">パスワードをリセットします</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">パスワードリセット</CardTitle>
            <CardDescription className="text-center">
              アカウントに登録されているメールアドレスを入力してください
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
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="example@company.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  アカウント登録時に使用したメールアドレスを入力してください
                </p>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>送信中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>リセットメールを送信</span>
                  </div>
                )}
              </Button>
            </form>

            {/* リンク */}
            <div className="mt-6 text-center">
              <Link 
                href="/auth/login" 
                className="text-sm text-blue-600 hover:text-blue-500 hover:underline font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
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