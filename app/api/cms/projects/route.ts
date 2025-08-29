/**
 * CMS プロジェクト管理 API - 一覧・作成エンドポイント
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ProjectService, ProjectSchema } from '@/lib/cms/project-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * GET /api/cms/projects - プロジェクト一覧取得
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const { user, db } = request as any

    const projectService = new ProjectService(db)

    // フィルタパラメータ取得
    const filters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      project_status: searchParams.get('project_status') || undefined,
      priority: searchParams.get('priority') || undefined,
      manager_id: searchParams.get('manager_id') || undefined,
      participant_id: searchParams.get('participant_id') || undefined,
      start_date_from: searchParams.get('start_date_from') || undefined,
      start_date_to: searchParams.get('start_date_to') || undefined,
      user_role: user.role,
      user_id: user.id,
      region_id: user.region_id
    }

    const projects = await projectService.searchProjects(filters)

    // 権限チェック: 各プロジェクトの表示権限をフィルタリング
    const visibleProjects = projects.filter(project => 
      projectService.canAccess(project, user.role, user.id, user.region_id)
    )

    return createSuccessResponse({
      projects: visibleProjects,
      total: visibleProjects.length,
      filters
    })
  } catch (error) {
    console.error('Projects list error:', error)
    return createErrorResponse('プロジェクト一覧の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student'],
  requireRegion: true
})

/**
 * POST /api/cms/projects - プロジェクト作成
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user, db } = request as any
    const projectService = new ProjectService(db)

    // リクエストボディのバリデーション
    const body = await request.json()
    const createData = ProjectSchema.omit({ 
      id: true, 
      created_at: true, 
      updated_at: true,
      actual_hours: true,
      progress_percentage: true,
      view_count: true,
      participant_count: true
    }).parse({
      ...body,
      author_id: user.id,
      author_name: user.name,
      manager_id: body.manager_id || user.id,
      manager_name: body.manager_name || user.name
    })

    // 権限チェック: 作成権限
    const canCreate = user.role === 'owner' || 
                     user.role === 'secretariat' || 
                     user.role === 'company_admin'

    if (!canCreate) {
      return createErrorResponse('プロジェクト作成の権限がありません', 403)
    }

    // 地域制限チェック
    if (createData.visibility_scope === 'region_based') {
      if (!createData.visibility_regions.includes(user.region_id)) {
        createData.visibility_regions.push(user.region_id)
      }
    }

    const newProject = await projectService.create(createData)

    return createSuccessResponse({
      project: newProject,
      message: 'プロジェクトが作成されました'
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('入力データが無効です', 400, {
        validation_errors: error.errors
      })
    }
    
    console.error('Project creation error:', error)
    return createErrorResponse('プロジェクトの作成に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin'],
  requireRegion: true
})