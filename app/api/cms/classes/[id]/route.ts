/**
 * CMS クラス管理 API - 個別操作エンドポイント
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ClassService, ClassSchema } from '@/lib/cms/class-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * GET /api/cms/classes/[id] - クラス詳細取得
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db } = request as any
    const classService = new ClassService(db)
    const classId = params.id

    const classItem = await classService.getById(classId)
    if (!classItem) {
      return createErrorResponse('クラスが見つかりません', 404)
    }

    // 権限チェック
    if (!classService.canAccess(classItem, user.role, user.id, user.region_id)) {
      return createErrorResponse('このクラスにアクセスする権限がありません', 403)
    }

    // 閲覧数カウントアップ
    await classService.incrementViewCount(classId)

    // 参加者一覧取得（権限がある場合）
    let enrollments = []
    if (user.role === 'owner' || user.role === 'secretariat' || classItem.instructor_id === user.id) {
      enrollments = await classService.getEnrollments(classId)
    }

    return createSuccessResponse({
      class: classItem,
      enrollments,
      can_edit: classService.canEdit(classItem, user.role, user.id, user.region_id),
      can_enroll: user.role === 'student' && !enrollments.find(e => e.user_id === user.id)
    })
  } catch (error) {
    console.error('Class detail error:', error)
    return createErrorResponse('クラス詳細の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student'],
  requireRegion: true
})

/**
 * PUT /api/cms/classes/[id] - クラス更新
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { user, db } = request as any
    const classService = new ClassService(db)
    const classId = params.id

    const classItem = await classService.getById(classId)
    if (!classItem) {
      return createErrorResponse('クラスが見つかりません', 404)
    }

    // 編集権限チェック
    if (!classService.canEdit(classItem, user.role, user.id, user.region_id)) {
      return createErrorResponse('このクラスを編集する権限がありません', 403)
    }

    // リクエストボディのバリデーション
    const body = await request.json()
    const updateData = ClassSchema.partial().omit({ 
      id: true, 
      created_at: true,
      author_id: true,
      author_name: true
    }).parse({
      ...body,
      updated_at: new Date().toISOString()
    })

    const updatedClass = await classService.update(classId, updateData)

    return createSuccessResponse({
      class: updatedClass,
      message: 'クラスが更新されました'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('入力データが無効です', 400, {
        validation_errors: error.errors
      })
    }
    
    console.error('Class update error:', error)
    return createErrorResponse('クラスの更新に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin'],
  requireRegion: true
})

/**
 * DELETE /api/cms/classes/[id] - クラス削除
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

    // 削除権限チェック（所有者・事務局・作成者のみ）
    const canDelete = user.role === 'owner' || 
                     user.role === 'secretariat' || 
                     classItem.author_id === user.id

    if (!canDelete) {
      return createErrorResponse('このクラスを削除する権限がありません', 403)
    }

    await classService.delete(classId)

    return createSuccessResponse({
      message: 'クラスが削除されました'
    })
  } catch (error) {
    console.error('Class deletion error:', error)
    return createErrorResponse('クラスの削除に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin'],
  requireRegion: true
})