/**
 * ファイル管理 API - 個別操作
 * NEO Digital Platform - Step 7 File Upload Implementation
 */
import { NextRequest } from 'next/server'
import { FileStorageService } from '@/lib/file-storage/file-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * GET /api/files/[id] - ファイル情報取得
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db, r2 } = request as any
    const fileService = new FileStorageService(db, r2)
    const fileId = params.id

    const file = await fileService.getFile(fileId, user)
    if (!file) {
      return createErrorResponse('ファイルが見つかりません', 404)
    }

    return createSuccessResponse({
      file,
      can_delete: file.uploaded_by === user.id || 
                 user.role === 'owner' || 
                 user.role === 'secretariat'
    })
  } catch (error) {
    console.error('File info error:', error)
    return createErrorResponse('ファイル情報の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student']
})

/**
 * DELETE /api/files/[id] - ファイル削除
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db, r2 } = request as any
    const fileService = new FileStorageService(db, r2)
    const fileId = params.id

    await fileService.deleteFile(fileId, user)

    return createSuccessResponse({
      message: 'ファイルが削除されました'
    })
  } catch (error) {
    console.error('File deletion error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('見つかりません') || error.message.includes('権限がありません')) {
        return createErrorResponse(error.message, error.message.includes('権限') ? 403 : 404)
      }
    }
    
    return createErrorResponse('ファイルの削除に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student']
})