import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/members/:id/status - 関与度ステータス更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = parseInt(params.id)
    const body = await request.json()
    
    // 必須フィールドバリデーション
    const { engagement_status } = body
    
    const validStatuses = ['core', 'active', 'peripheral', 'at_risk']
    if (!engagement_status || !validStatuses.includes(engagement_status)) {
      return NextResponse.json(
        { error: 'Invalid engagement status: must be core|active|peripheral|at_risk' },
        { status: 400 }
      )
    }

    // RBAC認証チェック（admin|editor|staff のみ）
    const userRole = request.headers.get('x-user-role') || 'guest'
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // 会員存在確認
    const existingMember = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, engagement_status: true }
    })
    
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const previousStatus = existingMember.engagement_status || 'active'

    // ステータス更新
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { 
        engagement_status: engagement_status,
        updated_at: new Date()
      },
      select: {
        id: true,
        name: true,
        engagement_status: true
      }
    })

    // 監査ログ記録
    await prisma.audit_log.create({
      data: {
        action: 'member_status_update',
        resource_type: 'user',
        resource_id: memberId.toString(),
        user_id: 1, // TODO: 実際のセッションから取得
        details: {
          member_id: memberId,
          previous_status: previousStatus,
          new_status: engagement_status
        },
        created_at: new Date()
      }
    })

    return NextResponse.json({
      id: updatedMember.id,
      name: updatedMember.name,
      engagement_status: updatedMember.engagement_status,
      message: 'Member status updated successfully'
    })
    
  } catch (error) {
    console.error('PATCH /api/members/:id/status error:', error)
    return NextResponse.json(
      { error: 'Failed to update member status' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}