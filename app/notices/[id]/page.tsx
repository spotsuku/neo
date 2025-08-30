/**
 * お知らせ詳細画面 - NEO Digital Platform
 * マークダウン対応・ファイル添付・権限別アクション表示
 */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Users, Edit, Trash2, AlertCircle, FileText, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth/auth-context'
import type { Notice } from '@/types/notices'

// 優先度別の設定
const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: '低' },
  normal: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: '通常' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: '高' },
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', label: '緊急' }
}

// カテゴリ別の設定
const categoryConfig = {
  general: { color: 'bg-slate-100 text-slate-700', label: '一般' },
  event: { color: 'bg-purple-100 text-purple-700', label: 'イベント' },
  system: { color: 'bg-yellow-100 text-yellow-700', label: 'システム' },
  academic: { color: 'bg-green-100 text-green-700', label: '学習' },
  important: { color: 'bg-red-100 text-red-700', label: '重要' }
}

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  const noticeId = params.id as string

  // お知らせ詳細を取得
  const fetchNotice = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/notices/${noticeId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'お知らせの取得に失敗しました')
      }

      setNotice(data.notice)
    } catch (error) {
      console.error('お知らせ取得エラー:', error)
      setError(error instanceof Error ? error.message : 'お知らせの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // お知らせ削除
  const handleDelete = async () => {
    if (!confirm('このお知らせを削除してもよろしいですか？')) {
      return
    }

    try {
      setDeleting(true)

      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'お知らせの削除に失敗しました')
      }

      router.push('/notices')
    } catch (error) {
      console.error('お知らせ削除エラー:', error)
      alert(error instanceof Error ? error.message : 'お知らせの削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (noticeId) {
      fetchNotice()
    }
  }, [noticeId])

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 権限チェック
  const canEdit = user && notice && (
    user.role === 'owner' || 
    (user.role === 'secretariat' && (notice.author_role === 'secretariat' || notice.author_role === 'owner'))
  )

  const canDelete = user && notice && (
    user.role === 'owner' || 
    (user.role === 'secretariat' && notice.author_id === user.id)
  )

  // 有効期限チェック
  const isExpired = notice?.expires_at && new Date(notice.expires_at) < new Date()

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="text-lg font-medium text-red-800">エラーが発生しました</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/notices">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    お知らせ一覧に戻る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // お知らせが見つからない場合
  if (!notice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                お知らせが見つかりません
              </h3>
              <p className="text-gray-600">
                指定されたお知らせは存在しないか、削除された可能性があります。
              </p>
              <div className="mt-6">
                <Link href="/notices">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    お知らせ一覧に戻る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ナビゲーション */}
        <div className="mb-6">
          <Link href="/notices">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              お知らせ一覧に戻る
            </Button>
          </Link>
        </div>

        {/* お知らせ詳細 */}
        <div className="space-y-6">
          {/* ヘッダー */}
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge 
                      variant="outline" 
                      className={priorityConfig[notice.priority].color}
                    >
                      {priorityConfig[notice.priority].label}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className={categoryConfig[notice.category].color}
                    >
                      {categoryConfig[notice.category].label}
                    </Badge>
                    {isExpired && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        期限切れ
                      </Badge>
                    )}
                  </div>
                  <CardTitle className={`text-2xl lg:text-3xl leading-tight ${isExpired ? 'line-through opacity-60' : ''}`}>
                    {notice.title}
                  </CardTitle>
                </div>
                
                {/* アクションボタン */}
                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Link href={`/notices/${notice.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          編集
                        </Button>
                      </Link>
                    )}
                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleting ? '削除中...' : '削除'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* メタ情報 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>公開: {formatDate(notice.published_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>更新: {formatDate(notice.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{notice.read_count} 回閲覧</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>投稿者: {notice.author_name}</span>
                </div>
              </div>

              {/* 有効期限 */}
              {notice.expires_at && (
                <div className="mt-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    isExpired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Clock className="h-4 w-4" />
                    <span>
                      有効期限: {formatDate(notice.expires_at)}
                      {isExpired && ' (期限切れ)'}
                    </span>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* コンテンツ */}
          <Card>
            <CardContent className="p-6">
              <div 
                className="prose prose-lg max-w-none"
                style={{
                  lineHeight: '1.8',
                  fontSize: '16px'
                }}
              >
                {notice.content.split('\n').map((line, index) => {
                  // マークダウン風の簡単な処理
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
                  if (line.match(/^\d+\. /)) {
                    return (
                      <div key={index} className="mb-1 ml-4">
                        {line}
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
                })}
              </div>
            </CardContent>
          </Card>

          {/* 添付ファイル（将来実装予定） */}
          {notice.attachments && notice.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">添付ファイル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notice.attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="font-medium">{attachment.file_name}</p>
                        <p className="text-sm text-gray-600">
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        ダウンロード
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}