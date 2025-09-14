import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/analytics/hero-steps-distribution - ヒーローステップ分布取得
export async function GET(request: NextRequest) {
  try {
    // RBAC認証チェック（admin|editor|staff のみ）
    const userRole = request.headers.get('x-user-role') || 'guest'
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // ヒーローステップ別の会員数集計
    const stepCounts = await prisma.user.groupBy({
      by: ['hero_step'],
      _count: {
        id: true
      },
      where: {
        // アクティブな会員のみ
        status: 'active'
      }
    })

    // 全体の会員数
    const totalMembers = await prisma.user.count({
      where: {
        status: 'active'
      }
    })

    // 0-5のステップ全てを含む配列を作成
    const buckets = []
    const ratios = []
    
    for (let step = 0; step <= 5; step++) {
      const stepData = stepCounts.find(s => s.hero_step === step)
      const count = stepData?._count.id || 0
      const ratio = totalMembers > 0 ? (count / totalMembers) * 100 : 0
      
      buckets.push({
        step: step,
        count: count
      })
      
      ratios.push(parseFloat(ratio.toFixed(1)))
    }

    return NextResponse.json({
      total: totalMembers,
      buckets: buckets,
      ratio: ratios
    })
    
  } catch (error) {
    console.error('GET /api/analytics/hero-steps-distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hero steps distribution' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}