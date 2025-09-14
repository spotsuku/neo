import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/members/:id/hero-step - ヒーローステップ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = parseInt(params.id)
    const body = await request.json()
    
    // 必須フィールドバリデーション
    const { current_step, notes, step_updated_by } = body
    
    if (current_step === undefined || current_step < 0 || current_step > 5) {
      return NextResponse.json(
        { error: 'Invalid hero step: must be 0-5' },
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
      where: { id: memberId }
    })
    
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // 現在のヒーローステップを取得
    const currentHeroStep = await prisma.heroes_step.findFirst({
      where: { user_id: memberId },
      orderBy: { created_at: 'desc' }
    })

    // ヒーローステップを更新または新規作成
    const updatedHeroStep = await prisma.heroes_step.create({
      data: {
        user_id: memberId,
        current_step: current_step,
        previous_step: currentHeroStep?.current_step || 0,
        notes: notes || '',
        step_updated_by: step_updated_by || 1, // TODO: 実際のセッションから取得
        updated_at: new Date(),
        created_at: new Date()
      }
    })

    // users テーブルのhero_stepも更新
    await prisma.user.update({
      where: { id: memberId },
      data: { 
        hero_step: current_step,
        updated_at: new Date()
      }
    })

    // 監査ログ記録
    await prisma.audit_log.create({
      data: {
        action: 'hero_step_update',
        resource_type: 'user',
        resource_id: memberId.toString(),
        user_id: step_updated_by || 1, // TODO: 実際のセッションから取得
        details: {
          member_id: memberId,
          previous_step: currentHeroStep?.current_step || 0,
          new_step: current_step,
          notes: notes
        },
        created_at: new Date()
      }
    })

    return NextResponse.json({
      id: updatedHeroStep.id,
      current_step: current_step,
      previous_step: currentHeroStep?.current_step || 0,
      message: 'Hero step updated successfully'
    })
    
  } catch (error) {
    console.error('PATCH /api/members/:id/hero-step error:', error)
    return NextResponse.json(
      { error: 'Failed to update hero step' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}