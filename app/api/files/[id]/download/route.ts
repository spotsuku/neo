/**
 * ファイルダウンロード API
 * NEO Portal - Step 7 File Upload Implementation
 */
import { NextRequest } from 'next/server'
import { FileStorageService } from '@/lib/file-storage/file-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse } from '@/lib/utils/api'

/**
 * GET /api/files/[id]/download - ファイルダウンロード
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db, r2 } = request as any
    const fileService = new FileStorageService(db, r2)
    const fileId = params.id

    const result = await fileService.downloadFile(fileId, user)
    if (!result) {
      return createErrorResponse('ファイルが見つかりません', 404)
    }

    const { file, data } = result

    // レスポンスヘッダー設定
    const headers = new Headers({
      'Content-Type': file.mime_type,
      'Content-Length': file.size_bytes.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_name)}"`,
      'Cache-Control': 'public, max-age=31536000', // 1年
      'Last-Modified': new Date(file.updated_at).toUTCString()
    })

    // 画像ファイルの場合はインライン表示も許可
    if (file.file_type === 'image') {
      const { searchParams } = new URL(request.url)
      const inline = searchParams.get('inline')
      
      if (inline === 'true') {
        headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`)
      }
    }

    return new Response(data, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('File download error:', error)
    
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return createErrorResponse(error.message, 404)
    }
    
    return createErrorResponse('ファイルのダウンロードに失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student']
})