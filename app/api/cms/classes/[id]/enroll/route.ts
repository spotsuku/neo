/**
 * CMS クラス参加申し込み API
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { NextRequest } from 'next/server'
import { ClassService } from '@/lib/cms/class-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * POST /api/cms/classes/[id]/enroll - クラス参加申し込み
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db } = request as any
    const classService = new ClassService(db)
    const classId = params.id

    const classItem = await classService.getById(classId)
    if (!classItem) {
      return createErrorResponse('クラスが見つかりません', 404)
    }

    // 学生のみ参加申し込み可能
    if (user.role !== 'student') {
      return createErrorResponse('学生のみ参加申し込みができます', 403)
    }

    // 公開状態のクラスのみ申し込み可能
    if (classItem.status !== 'published') {
      return createErrorResponse('このクラスは現在申し込みできません', 400)
    }

    // 参加申し込み実行
    const enrollment = await classService.enrollUser(classId, user.id, user.name)

    return createSuccessResponse({
      enrollment,
      message: 'クラスに申し込みました'
    }, 201)
  } catch (error) {
    console.error('Class enrollment error:', error)
    
    // ビジネスロジックエラーはそのままメッセージを返す
    if (error instanceof Error && error.message.includes('定員') || 
        error.message.includes('既に申し込み')) {
      return createErrorResponse(error.message, 400)
    }
    
    return createErrorResponse('参加申し込みに失敗しました', 500)
  }
}, {
  requiredRoles: ['student'],
  requireRegion: true
})

/**
 * DELETE /api/cms/classes/[id]/enroll - クラス参加キャンセル
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db } = request as any
    const classService = new ClassService(db)
    const classId = params.id

    const classItem = await classService.getById(classId)
    if (!classItem) {
      return createErrorResponse('クラスが見つかりません', 404)
    }

    // 参加キャンセル実行
    await classService.cancelEnrollment(classId, user.id)

    return createSuccessResponse({
      message: 'クラスの参加をキャンセルしました'
    })
  } catch (error) {
    console.error('Class enrollment cancellation error:', error)
    
    if (error instanceof Error && error.message.includes('申し込みが見つかりません')) {
      return createErrorResponse(error.message, 400)
    }
    
    return createErrorResponse('参加キャンセルに失敗しました', 500)
  }
}, {
  requiredRoles: ['student'],
  requireRegion: true
})