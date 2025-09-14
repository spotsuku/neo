import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/analytics/engagement-distribution - 関与度ステータス分布取得
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

    // 関与度ステータス別の会員数集計
    const statusCounts = await prisma.user.groupBy({
      by: ['engagement_status'],
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

    // 4つのステータス全てを含む配列を作成
    const validStatuses = ['core', 'active', 'peripheral', 'at_risk']
    const buckets = []
    const ratios = []
    
    for (const status of validStatuses) {
      const statusData = statusCounts.find(s => s.engagement_status === status)
      const count = statusData?._count.id || 0
      const ratio = totalMembers > 0 ? (count / totalMembers) * 100 : 0
      
      buckets.push({
        status: status,
        count: count
      })
      
      ratios.push(parseFloat(ratio.toFixed(1)))
    }

    // 既存engagement_statusがnullの場合はactiveとして扱う
    const nullStatusCount = statusCounts.find(s => s.engagement_status === null)?._count.id || 0
    if (nullStatusCount > 0) {
      const activeIndex = buckets.findIndex(b => b.status === 'active')
      if (activeIndex !== -1) {
        buckets[activeIndex].count += nullStatusCount
        const newRatio = totalMembers > 0 ? (buckets[activeIndex].count / totalMembers) * 100 : 0
        ratios[activeIndex] = parseFloat(newRatio.toFixed(1))
      }
    }

    return NextResponse.json({
      total: totalMembers,
      buckets: buckets,
      ratio: ratios
    })
    
  } catch (error) {
    console.error('GET /api/analytics/engagement-distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch engagement distribution' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}