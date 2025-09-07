/**
 * プロフィール管理画面 - NEO Portal
 * 名前・アバター・パスワード変更機能
 */
'use client'

import React, { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Shield, 
  Building2, 
  MapPin, 
  Camera, 
  Save, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface PasswordRequirement {
  met: boolean
  text: string
}

export function ProfileComponent() {
  const { user, updateProfile, changePassword } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // プロフィール更新状態
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    avatar_url: user?.avatar_url || ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // パスワード変更状態
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  // パスワード強度チェック
  const getPasswordRequirements = (password: string): PasswordRequirement[] => [
    { met: password.length >= 8, text: '8文字以上' },
    { met: /[a-z]/.test(password), text: '小文字を含む' },
    { met: /[A-Z]/.test(password), text: '大文字を含む' },
    { met: /\d/.test(password), text: '数字を含む' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: '特殊文字を含む' }
  ]

  const passwordRequirements = getPasswordRequirements(passwordForm.newPassword)
  const isPasswordValid = passwordRequirements.every(req => req.met)
  const isPasswordFormValid = 
    passwordForm.currentPassword &&
    isPasswordValid &&
    passwordForm.newPassword === passwordForm.confirmPassword

  // ロール表示名
  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      'owner': 'オーナー',
      'secretariat': '事務局',
      'company_admin': '企業管理者',
      'student': '学生'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  // アバターファイル選択
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 実際の実装では、ファイルをR2にアップロードしてURLを取得
      // ここではプレビューのみ実装
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileForm(prev => ({ ...prev, avatar_url: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  // プロフィール更新処理
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMessage(null)

    const result = await updateProfile({
      name: profileForm.name,
      avatar_url: profileForm.avatar_url
    })

    setProfileLoading(false)

    if (result.success) {
      setProfileMessage({ type: 'success', text: 'プロフィールを更新しました' })
    } else {
      setProfileMessage({ type: 'error', text: result.error || 'プロフィール更新に失敗しました' })
    }
  }

  // パスワード変更処理
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordFormValid) return

    setPasswordLoading(true)
    setPasswordMessage(null)

    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)

    setPasswordLoading(false)

    if (result.success) {
      setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      setPasswordMessage({ type: 'error', text: result.error || 'パスワード変更に失敗しました' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">プロフィール管理</h1>
          <p className="text-muted-foreground">アカウント情報の確認・更新</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* 左カラム: 基本情報・プロフィール更新 */}
          <div className="space-y-6">
            {/* 基本情報表示 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  基本情報
                </CardTitle>
                <CardDescription>
                  現在のアカウント情報
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="text-2xl">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{getRoleDisplayName(user.role)}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">企業ID: {user.company_id}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">地域ID: {user.region_id}</span>
                  </div>

                  {user.last_login_at && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        最終ログイン: {new Date(user.last_login_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* プロフィール更新フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  プロフィール更新
                </CardTitle>
                <CardDescription>
                  名前とアバター画像を変更できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profileMessage && (
                  <Alert className={`mb-4 ${profileMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {profileMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={profileMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {profileMessage.text}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {/* 名前 */}
                  <div className="space-y-2">
                    <Label htmlFor="name">表示名</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="表示名を入力"
                      required
                    />
                  </div>

                  {/* アバター */}
                  <div className="space-y-2">
                    <Label>アバター画像</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profileForm.avatar_url} alt="プレビュー" />
                        <AvatarFallback>
                          {profileForm.name.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        画像を選択
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPG、PNG形式の画像ファイル（最大5MB）
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={profileLoading || !profileForm.name.trim()}
                  >
                    {profileLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    プロフィールを更新
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* 右カラム: パスワード変更 */}
          <div className="space-y-6">
            {/* パスワード変更フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  パスワード変更
                </CardTitle>
                <CardDescription>
                  セキュリティのため定期的にパスワードを変更してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordMessage && (
                  <Alert className={`mb-4 ${passwordMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={passwordMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {passwordMessage.text}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* 現在のパスワード */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">現在のパスワード</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="現在のパスワードを入力"
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* 新しいパスワード */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新しいパスワード</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="新しいパスワードを入力"
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* パスワード要件 */}
                    {passwordForm.newPassword && (
                      <div className="space-y-1 text-xs">
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className={`flex items-center gap-2 ${req.met ? 'text-green-600' : 'text-red-500'}`}>
                            {req.met ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            <span>{req.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* パスワード確認 */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">パスワード確認</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="新しいパスワードを再入力"
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* パスワード一致確認 */}
                    {passwordForm.confirmPassword && (
                      <div className={`text-xs flex items-center gap-2 ${
                        passwordForm.newPassword === passwordForm.confirmPassword ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {passwordForm.newPassword === passwordForm.confirmPassword ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>
                          {passwordForm.newPassword === passwordForm.confirmPassword ? 'パスワードが一致しています' : 'パスワードが一致しません'}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={passwordLoading || !isPasswordFormValid}
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    パスワードを変更
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* セキュリティ情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  セキュリティ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">メール認証</span>
                  <Badge variant={user.email_verified ? "default" : "destructive"}>
                    {user.email_verified ? "認証済み" : "未認証"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">二段階認証</span>
                  <Badge variant={user.totp_enabled ? "default" : "outline"}>
                    {user.totp_enabled ? "有効" : "無効"}
                  </Badge>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground">
                  <p>アカウント作成日: {new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
                  <p>ユーザーID: {user.id}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ナビゲーション */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  ダッシュボードに戻る
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">
                  ログアウト
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}