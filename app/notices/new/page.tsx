/**
 * お知らせ作成画面 - NEO Digital Platform
 * 権限チェック・ファイルアップロード・プレビュー対応
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, Upload, X, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/auth-context'
import type { NoticeFormData, Notice } from '@/types/notices'

export default function NewNoticePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState('edit')

  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    content: '',
    summary: '',
    priority: 'normal',
    category: 'general',
    expires_at: '',
    attachments: []
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 権限チェック
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role !== 'owner' && user.role !== 'secretariat') {
        router.push('/notices')
        return
      }
    } else if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
  }, [isAuthenticated, user, router])

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = 'タイトルを入力してください'
    } else if (formData.title.length > 200) {
      errors.title = 'タイトルは200文字以内で入力してください'
    }

    if (!formData.content.trim()) {
      errors.content = 'コンテンツを入力してください'
    }

    if (formData.summary && formData.summary.length > 500) {
      errors.summary = '概要は500文字以内で入力してください'
    }

    if (formData.expires_at) {
      const expireDate = new Date(formData.expires_at)
      const now = new Date()
      if (expireDate <= now) {
        errors.expires_at = '有効期限は現在時刻より後の日時を指定してください'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const requestData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || undefined,
        priority: formData.priority,
        category: formData.category,
        expires_at: formData.expires_at || undefined
        // ファイルアップロードは将来実装
      }

      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'お知らせの作成に失敗しました')
      }

      // 作成成功 - 詳細ページにリダイレクト
      router.push(`/notices/${data.notice.id}`)
    } catch (error) {
      console.error('お知らせ作成エラー:', error)
      setError(error instanceof Error ? error.message : 'お知らせの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 入力値変更
  const handleInputChange = (field: keyof NoticeFormData, value: string | File[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // エラークリア
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // ファイルアップロード処理（将来実装）
  const handleFileUpload = (files: FileList) => {
    // TODO: ファイルアップロード実装
    console.log('ファイルアップロード:', files)
  }

  // プレビュー用の簡単なマークダウン変換
  const renderPreview = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-gray-800">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-800">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('- **') && line.endsWith('**')) {
        const match = line.match(/- \*\*(.*?)\*\*: (.*)/)
        if (match) {
          return (
            <div key={index} className="mb-2">
              <strong>{match[1]}</strong>: {match[2]}
            </div>
          )
        }
      }
      if (line.startsWith('- ')) {
        return (
          <div key={index} className="mb-1 ml-4">
            • {line.replace('- ', '')}
          </div>
        )
      }
      if (line.trim() === '') {
        return <div key={index} className="h-4"></div>
      }
      return (
        <p key={index} className="mb-3">
          {line}
        </p>
      )
    })
  }

  // 権限チェック中の表示
  if (!isAuthenticated || (user && user.role !== 'owner' && user.role !== 'secretariat')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ナビゲーション */}
        <div className="mb-6">
          <Link href="/notices">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              お知らせ一覧に戻る
            </Button>
          </Link>
        </div>

        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">お知らせ作成</h1>
          <p className="mt-2 text-gray-600">
            新しいお知らせを作成して公開します
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* メインコンテンツ */}
            <div className="lg:col-span-2 space-y-6">
              {/* タイトル */}
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">タイトル *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="お知らせのタイトルを入力"
                      className={formErrors.title ? 'border-red-500' : ''}
                      maxLength={200}
                    />
                    {formErrors.title && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.title}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.title.length}/200文字
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="summary">概要</Label>
                    <Textarea
                      id="summary"
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      placeholder="お知らせの概要を入力（省略可）"
                      className={formErrors.summary ? 'border-red-500' : ''}
                      rows={3}
                      maxLength={500}
                    />
                    {formErrors.summary && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.summary}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.summary.length}/500文字（省略した場合、本文から自動生成されます）
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* コンテンツ編集 */}
              <Card>
                <CardHeader>
                  <CardTitle>コンテンツ</CardTitle>
                  <CardDescription>
                    マークダウン記法が使用できます（## 見出し、- リスト、**太字**など）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="edit">編集</TabsTrigger>
                      <TabsTrigger value="preview">プレビュー</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="edit" className="mt-4">
                      <Textarea
                        value={formData.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        placeholder="お知らせの内容を入力してください..."
                        className={`min-h-[400px] ${formErrors.content ? 'border-red-500' : ''}`}
                      />
                      {formErrors.content && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.content}</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="preview" className="mt-4">
                      <div className="min-h-[400px] p-4 border rounded-md bg-white">
                        {formData.content ? (
                          <div className="prose max-w-none">
                            {renderPreview(formData.content)}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">
                            プレビューするには、コンテンツを入力してください
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* ファイルアップロード（将来実装） */}
              <Card>
                <CardHeader>
                  <CardTitle>添付ファイル</CardTitle>
                  <CardDescription>
                    画像、PDF、その他のファイルを添付できます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">
                      ファイルをドラッグ＆ドロップまたはクリックして選択
                    </p>
                    <Button type="button" variant="outline" disabled>
                      <FileText className="h-4 w-4 mr-2" />
                      ファイル選択（実装予定）
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* サイドバー */}
            <div className="space-y-6">
              {/* 設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="priority">優先度</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleInputChange('priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="normal">通常</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">緊急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">カテゴリ</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">一般</SelectItem>
                        <SelectItem value="event">イベント</SelectItem>
                        <SelectItem value="system">システム</SelectItem>
                        <SelectItem value="academic">学習</SelectItem>
                        <SelectItem value="important">重要</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expires_at">有効期限</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => handleInputChange('expires_at', e.target.value)}
                      className={formErrors.expires_at ? 'border-red-500' : ''}
                    />
                    {formErrors.expires_at && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.expires_at}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      指定しない場合は期限なしになります
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* アクション */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>作成中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        <span>公開</span>
                      </div>
                    )}
                  </Button>
                  
                  <Button type="button" variant="outline" className="w-full" disabled>
                    下書き保存（実装予定）
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}