/**
 * ユーザー登録API - NEO Digital Platform
 * Next.js環境対応版
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// リクエストバリデーション
const registerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
  invitation_code: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // リクエストボディ解析
    const body = await request.json()
    
    // バリデーション
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: 'バリデーションエラー',
        errors: result.error.issues
      }, { status: 400 })
    }

    const { name, email, password, invitation_code } = result.data

    // パスワード強度チェック（簡易版）
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'パスワードは8文字以上である必要があります'
      }, { status: 400 })
    }

    // 招待コードチェック（簡易版）
    let role = 'student'
    let region_id = 'FUK'

    if (invitation_code) {
      if (invitation_code === 'STUDENT2024') {
        role = 'student'
        region_id = 'FUK'
      } else if (invitation_code === 'ADMIN2024') {
        role = 'company_admin'
        region_id = 'FUK'
      } else {
        return NextResponse.json({
          success: false,
          message: '無効な招待コードです'
        }, { status: 400 })
      }
    }

    // 開発環境用のモックユーザー作成
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const accessToken = `mock_access_token_${userId}`
    const refreshToken = `mock_refresh_token_${userId}`

    // モックユーザーデータ
    const user = {
      id: userId,
      email: email.toLowerCase(),
      name,
      role,
      company_id: 'mock_company_001',
      region_id,
      avatar_url: null,
      email_verified: false,
      totp_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString()
    }

    console.log('Mock user created:', { userId, email, role, invitation_code })

    return NextResponse.json({
      success: true,
      message: 'アカウントが作成されました',
      user,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました'
    }, { status: 500 })
  }
}

// OPTIONS method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}