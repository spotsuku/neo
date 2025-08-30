/**
 * エラーハンドリングテスト用API Route
 * 各種エラータイプの動作確認
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/api-error'

// 各エラータイプのテスト
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const errorType = searchParams.get('type')
    const delay = searchParams.get('delay')
    
    // 遅延テスト
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, parseInt(delay)))
    }
    
    switch (errorType) {
      case 'validation':
        throw ApiError.validation('テスト用バリデーションエラー', '必須フィールドが不足しています')
        
      case 'unauthorized':
        throw ApiError.unauthorized('テスト用認証エラー')
        
      case 'forbidden':
        throw ApiError.forbidden('テスト用認可エラー')
        
      case 'notfound':
        throw ApiError.notFound('テスト用404エラー')
        
      case 'conflict':
        throw ApiError.conflict('テスト用競合エラー')
        
      case 'ratelimit':
        throw ApiError.tooManyRequests('テスト用レート制限エラー')
        
      case 'internal':
        throw ApiError.internal('テスト用内部サーバーエラー')
        
      case 'javascript':
        // JavaScript例外のテスト
        throw new Error('テスト用JavaScript例外')
        
      case 'timeout':
        // タイムアウトシミュレーション
        await new Promise(resolve => setTimeout(resolve, 30000))
        break
        
      case 'network':
        // ネットワークエラーのシミュレーション
        throw new Error('Network Error: Failed to fetch')
        
      default:
        return NextResponse.json({
          message: 'エラーハンドリングテスト',
          availableTypes: [
            'validation',
            'unauthorized', 
            'forbidden',
            'notfound',
            'conflict',
            'ratelimit',
            'internal',
            'javascript',
            'timeout',
            'network'
          ],
          usage: '/api/test-error?type=validation&delay=1000'
        })
    }
  } catch (error) {
    console.error('[API Error]', error)
    
    // ApiErrorの場合はそのまま使用
    if (error instanceof ApiError) {
      return error.toResponse()
    }
    
    // その他のエラーは内部サーバーエラーとして処理
    const internalError = ApiError.internal(
      'サーバーで予期しない問題が発生しました',
      error instanceof Error ? error.message : String(error)
    )
    
    return internalError.toResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json().catch(() => ({}))
    
    // POST用のエラーテスト
    if (!data.name) {
      throw ApiError.validation('名前は必須です', 'name field is required')
    }
    
    if (data.name === 'error') {
      throw ApiError.internal('テスト用エラー')
    }
    
    return NextResponse.json({
      message: 'POSTリクエスト成功',
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[API Error]', error)
    
    // ApiErrorの場合はそのまま使用
    if (error instanceof ApiError) {
      return error.toResponse()
    }
    
    // その他のエラーは内部サーバーエラーとして処理
    const internalError = ApiError.internal(
      'サーバーで予期しない問題が発生しました',
      error instanceof Error ? error.message : String(error)
    )
    
    return internalError.toResponse()
  }
}