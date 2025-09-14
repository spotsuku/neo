import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/members - 会員一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const membership = searchParams.get('membership') || ''

    const skip = (page - 1) * limit
    
    // 検索条件構築
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ]
    }
    
    if (role) {
      where.role = role
    }
    
    if (status) {
      where.status = status
    }

    // 会員データ取得
    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          hero_step: true,
          membership_types: true,
          affiliation: true,
          last_login_at: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('GET /api/members error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// POST /api/members - 新規会員作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 必須フィールドバリデーション
    const { email, name, role, status } = body
    
    if (!email || !name || !role || !status) {
      return NextResponse.json(
        { error: 'Required fields missing: email, name, role, status' },
        { status: 400 }
      )
    }

    // メールアドレス重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email address already exists' },
        { status: 400 }
      )
    }

    // 新規会員作成
    const newMember = await prisma.user.create({
      data: {
        email,
        name,
        role,
        status,
        hero_step: parseInt(body.hero_step) || 0,
        membership_types: body.membership_types || '',
        affiliation: body.affiliation || '',
        tagline: body.tagline || '',
        hometown: body.hometown || '',
        high_school: body.high_school || '',
        university: body.university || '',
        title: body.title || '',
        profile_text: body.profile_text || '',
        sns_x: body.sns_x || '',
        sns_instagram: body.sns_instagram || '',
        sns_tiktok: body.sns_tiktok || '',
        neo_motivation: body.neo_motivation || '',
        birthdate: body.birthdate ? new Date(body.birthdate) : null,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // 監査ログ記録
    await prisma.audit_log.create({
      data: {
        action: 'member_create',
        resource_type: 'user',
        resource_id: newMember.id.toString(),
        user_id: 1, // TODO: 実際のセッションから取得
        details: {
          created_member: {
            id: newMember.id,
            email: newMember.email,
            name: newMember.name,
            role: newMember.role
          }
        },
        created_at: new Date()
      }
    })

    return NextResponse.json(
      { id: newMember.id, message: 'Member created successfully' },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('POST /api/members error:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}