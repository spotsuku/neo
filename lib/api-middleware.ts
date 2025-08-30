/**
 * API エラーハンドリングミドルウェア
 * Next.jsのAPI RoutesでApiErrorクラスを使用した統一エラー処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ErrorType } from './api-error'
import { errorReporter, ErrorLevel } from './error-reporting'

/**
 * API Route ハンドラーの型定義
 */
export type ApiHandler = (
  request: NextRequest,
  context: { params: Record<string, string> } | { params?: any } | undefined
) => Promise<NextResponse> | NextResponse

/**
 * エラーハンドリングミドルウェア
 * API Route関数をラップしてエラーを統一的に処理
 */
export function withErrorHandling(handler: ApiHandler) {
  return async (request: NextRequest, context?: { params?: any }) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('[API Error]', error)
      
      // ApiErrorの場合はそのまま使用
      if (error instanceof ApiError) {
        // Sentryに報告（サーバーサイドエラーの場合）
        if (error.statusCode >= 500) {
          await reportServerError(error, request)
        }
        
        return error.toResponse()
      }
      
      // その他のエラーは内部サーバーエラーとして処理
      const internalError = ApiError.internal(
        'サーバーで予期しない問題が発生しました',
        error instanceof Error ? error.message : String(error)
      )
      
      // Sentryに報告
      await reportServerError(internalError, request, error as Error)
      
      return internalError.toResponse()
    }
  }
}

/**
 * サーバーサイドエラーの報告
 */
async function reportServerError(
  apiError: ApiError, 
  request: NextRequest, 
  originalError?: Error
): Promise<void> {
  try {
    const errorLevel = apiError.statusCode >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARNING
    
    await errorReporter.reportError(originalError || apiError, {
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      extra: {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        apiError: {
          type: apiError.type,
          statusCode: apiError.statusCode,
          message: apiError.message,
          details: apiError.details
        }
      }
    }, errorLevel)
  } catch (reportingError) {
    console.error('Failed to report server error:', reportingError)
  }
}

/**
 * リクエストバリデーションミドルウェア
 */
export function withValidation<T>(
  schema: (data: any) => T,
  handler: (request: NextRequest, data: T, context?: { params?: any }) => Promise<NextResponse>
): ApiHandler {
  return withErrorHandling(async (request: NextRequest, context?: { params?: any }) => {
    try {
      // リクエストボディの解析
      let data: any = {}
      
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        const contentType = request.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
          data = await request.json()
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData()
          data = Object.fromEntries(formData.entries())
        }
      }
      
      // URLパラメータの追加
      if (context?.params) {
        data = { ...data, ...context.params }
      }
      
      // バリデーション実行
      const validatedData = schema(data)
      
      return await handler(request, validatedData, context)
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw ApiError.validation('リクエストデータが無効です', error.message)
      }
      throw error
    }
  })
}

/**
 * レート制限ミドルウェア（簡易版）
 * 本番環境ではRedisやCloudflare KVを使用することを推奨
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60 * 1000, // 1分
  keyGenerator?: (request: NextRequest) => string
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return withErrorHandling(async (request: NextRequest, context?: { params?: any }) => {
      const key = keyGenerator 
        ? keyGenerator(request)
        : request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
      
      const now = Date.now()
      const record = requestCounts.get(key)
      
      if (!record || now > record.resetTime) {
        // 新しいウィンドウ
        requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      } else {
        // 既存のウィンドウ内
        record.count++
        
        if (record.count > maxRequests) {
          throw ApiError.tooManyRequests(
            'リクエストが多すぎます。しばらく時間を置いてから再試行してください。'
          )
        }
      }
      
      // 古いレコードのクリーンアップ（メモリ使用量の制御）
      if (requestCounts.size > 10000) {
        for (const [k, v] of requestCounts) {
          if (now > v.resetTime) {
            requestCounts.delete(k)
          }
        }
      }
      
      return await handler(request, context)
    })
  }
}

/**
 * CORS ミドルウェア
 */
export function withCORS(
  origins: string[] = ['*'],
  methods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: string[] = ['Content-Type', 'Authorization']
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: { params?: any }) => {
      // プリフライトリクエストの処理
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origins.includes('*') ? '*' : origins.join(','),
            'Access-Control-Allow-Methods': methods.join(','),
            'Access-Control-Allow-Headers': headers.join(','),
            'Access-Control-Max-Age': '86400',
          }
        })
      }
      
      // 実際のリクエストの処理
      const response = await handler(request, context)
      
      // CORSヘッダーの追加
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', origins.includes('*') ? '*' : origins.join(','))
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }
  }
}

/**
 * 認証ミドルウェア
 */
export function withAuth(
  handler: (request: NextRequest, userId: string, context?: { params?: any }) => Promise<NextResponse>
): ApiHandler {
  return withErrorHandling(async (request: NextRequest, context?: { params?: any }) => {
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      throw ApiError.unauthorized('認証が必要です')
    }
    
    const token = authorization.replace('Bearer ', '')
    
    // TODO: JWT検証ロジックを実装
    // 現在はプレースホルダー
    if (!token || token === 'invalid') {
      throw ApiError.unauthorized('無効な認証トークンです')
    }
    
    // トークンからユーザーIDを取得（実際のJWT検証実装時に置き換え）
    const userId = 'user_' + token.substring(0, 8)
    
    return await handler(request, userId, context)
  })
}

/**
 * 複数のミドルウェアを組み合わせるヘルパー関数
 */
export function compose(...middlewares: Array<(handler: ApiHandler) => ApiHandler>) {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

/**
 * 使用例:
 * 
 * export const POST = compose(
 *   withCORS(['http://localhost:3000']),
 *   withRateLimit(50, 60000),
 *   withAuth,
 *   withValidation(createUserSchema)
 * )(async (request, data, context) => {
 *   // ハンドラーロジック
 *   return NextResponse.json({ success: true })
 * })
 */