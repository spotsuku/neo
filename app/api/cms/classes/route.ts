/**
 * CMS クラス管理 API - 一覧・作成エンドポイント
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ClassService, ClassSchema } from '@/lib/cms/class-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * GET /api/cms/classes - クラス一覧取得
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const { user, db } = request as any

    const classService = new ClassService(db)

    // フィルタパラメータ取得
    const filters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      level: searchParams.get('level') || undefined,
      instructor_id: searchParams.get('instructor_id') || undefined,
      start_date_from: searchParams.get('start_date_from') || undefined,
      start_date_to: searchParams.get('start_date_to') || undefined,
      is_online: searchParams.get('is_online') ? searchParams.get('is_online') === 'true' : undefined,
      status: searchParams.get('status') as any || undefined,
      user_role: user.role,
      user_id: user.id,
      region_id: user.region_id
    }

    const classes = await classService.searchClasses(filters)

    // 権限チェック: 各クラスの表示権限をフィルタリング
    const visibleClasses = classes.filter(cls => 
      classService.canAccess(cls, user.role, user.id, user.region_id)
    )

    return createSuccessResponse({
      classes: visibleClasses,
      total: visibleClasses.length,
      filters
    })
  } catch (error) {
    console.error('Classes list error:', error)
    return createErrorResponse('クラス一覧の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student'],
  requireRegion: true
})

/**
 * POST /api/cms/classes - クラス作成
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user, db } = request as any
    const classService = new ClassService(db)

    // リクエストボディのバリデーション
    const body = await request.json()
    const createData = ClassSchema.omit({ 
      id: true, 
      created_at: true, 
      updated_at: true,
      current_participants: true,
      view_count: true,
      enrollment_count: true
    }).parse({
      ...body,
      author_id: user.id,
      author_name: user.name
    })

    // 権限チェック: 作成権限
    const canCreate = user.role === 'owner' || 
                     user.role === 'secretariat' || 
                     (user.role === 'company_admin' && createData.visibility_scope !== 'public')

    if (!canCreate) {
      return createErrorResponse('クラス作成の権限がありません', 403)
    }

    // 地域制限チェック
    if (createData.visibility_scope === 'region_based') {
      if (!createData.visibility_regions.includes(user.region_id)) {
        createData.visibility_regions.push(user.region_id)
      }
    }

    const newClass = await classService.create(createData)

    return createSuccessResponse({
      class: newClass,
      message: 'クラスが作成されました'
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('入力データが無効です', 400, {
        validation_errors: error.errors
      })
    }
    
    console.error('Class creation error:', error)
    return createErrorResponse('クラスの作成に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin'],
  requireRegion: true
})