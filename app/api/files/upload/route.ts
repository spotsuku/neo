/**
 * ファイルアップロード API
 * NEO Portal - Step 7 File Upload Implementation
 */
import { NextRequest } from 'next/server'
import { FileStorageService } from '@/lib/file-storage/file-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * POST /api/files/upload - ファイルアップロード
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user, db, r2 } = request as any
    const fileService = new FileStorageService(db, r2)

    // FormDataからファイルとメタデータ取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return createErrorResponse('ファイルが選択されていません', 400)
    }

    // メタデータ解析
    const metadata = {
      category: formData.get('category') as string || undefined,
      related_type: formData.get('related_type') as string || undefined,
      related_id: formData.get('related_id') as string || undefined,
      access_level: (formData.get('access_level') as 'public' | 'authenticated' | 'private' | 'restricted') || 'authenticated',
      allowed_roles: formData.get('allowed_roles') ? JSON.parse(formData.get('allowed_roles') as string) : [],
      allowed_users: formData.get('allowed_users') ? JSON.parse(formData.get('allowed_users') as string) : [],
      description: formData.get('description') as string || undefined,
      alt_text: formData.get('alt_text') as string || undefined,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : []
    }

    // アップロード権限チェック
    const canUpload = user.role === 'owner' || 
                     user.role === 'secretariat' || 
                     user.role === 'company_admin' ||
                     (user.role === 'student' && metadata.access_level !== 'public')

    if (!canUpload) {
      return createErrorResponse('ファイルアップロードの権限がありません', 403)
    }

    // ファイルアップロード実行
    const uploadedFile = await fileService.uploadFile(
      file,
      metadata,
      { id: user.id, name: user.name }
    )

    return createSuccessResponse({
      file: uploadedFile,
      message: 'ファイルがアップロードされました'
    }, 201)

  } catch (error) {
    console.error('File upload error:', error)
    
    if (error instanceof Error) {
      // ビジネスロジックエラーはそのままメッセージを返す
      if (error.message.includes('ファイルサイズ') || 
          error.message.includes('ファイル形式') ||
          error.message.includes('サポートされていない')) {
        return createErrorResponse(error.message, 400)
      }
    }
    
    return createErrorResponse('ファイルのアップロードに失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student'],
  requireRegion: true
})

/**
 * GET /api/files/upload - アップロード可能設定取得
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { user } = request as any
    
    // ユーザーのアップロード設定取得
    const uploadSettings = {
      can_upload: ['owner', 'secretariat', 'company_admin', 'student'].includes(user.role),
      max_file_size: 100 * 1024 * 1024, // 100MB
      allowed_types: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv'
      ],
      access_levels_available: user.role === 'owner' || user.role === 'secretariat' ?
        ['public', 'authenticated', 'private', 'restricted'] :
        user.role === 'company_admin' ?
        ['authenticated', 'private', 'restricted'] :
        ['private']
    }

    return createSuccessResponse({
      settings: uploadSettings
    })
  } catch (error) {
    console.error('Upload settings error:', error)
    return createErrorResponse('アップロード設定の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student']
})