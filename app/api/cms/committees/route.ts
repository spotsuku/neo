/**
 * CMS 委員会管理 API - 一覧・作成エンドポイント
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { CommitteeService, CommitteeSchema } from '@/lib/cms/committee-service'
import { withAuth } from '@/lib/auth/middleware'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api'

/**
 * GET /api/cms/committees - 委員会一覧取得
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const { user, db } = request as any

    const committeeService = new CommitteeService(db)

    // フィルタパラメータ取得
    const filters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      committee_status: searchParams.get('committee_status') || undefined,
      chairperson_id: searchParams.get('chairperson_id') || undefined,
      member_id: searchParams.get('member_id') || undefined,
      established_after: searchParams.get('established_after') || undefined,
      established_before: searchParams.get('established_before') || undefined,
      user_role: user.role,
      user_id: user.id,
      region_id: user.region_id
    }

    const committees = await committeeService.searchCommittees(filters)

    // 権限チェック: 各委員会の表示権限をフィルタリング
    const visibleCommittees = committees.filter(committee => 
      committeeService.canAccess(committee, user.role, user.id, user.region_id)
    )

    return createSuccessResponse({
      committees: visibleCommittees,
      total: visibleCommittees.length,
      filters
    })
  } catch (error) {
    console.error('Committees list error:', error)
    return createErrorResponse('委員会一覧の取得に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat', 'company_admin', 'student'],
  requireRegion: true
})

/**
 * POST /api/cms/committees - 委員会作成
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user, db } = request as any
    const committeeService = new CommitteeService(db)

    // リクエストボディのバリデーション
    const body = await request.json()
    const createData = CommitteeSchema.omit({ 
      id: true, 
      created_at: true, 
      updated_at: true,
      view_count: true,
      meeting_count: true,
      member_count: true
    }).parse({
      ...body,
      author_id: user.id,
      author_name: user.name,
      chairperson_id: body.chairperson_id || user.id,
      chairperson_name: body.chairperson_name || user.name
    })

    // 権限チェック: 作成権限（所有者・事務局のみ）
    const canCreate = user.role === 'owner' || user.role === 'secretariat'

    if (!canCreate) {
      return createErrorResponse('委員会作成の権限がありません', 403)
    }

    // 地域制限チェック
    if (createData.visibility_scope === 'region_based') {
      if (!createData.visibility_regions.includes(user.region_id)) {
        createData.visibility_regions.push(user.region_id)
      }
    }

    const newCommittee = await committeeService.create(createData)

    return createSuccessResponse({
      committee: newCommittee,
      message: '委員会が作成されました'
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('入力データが無効です', 400, {
        validation_errors: error.errors
      })
    }
    
    console.error('Committee creation error:', error)
    return createErrorResponse('委員会の作成に失敗しました', 500)
  }
}, {
  requiredRoles: ['owner', 'secretariat'],
  requireRegion: true
})