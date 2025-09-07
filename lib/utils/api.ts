/**
 * API ユーティリティ - NEO Portal
 * API レスポンス・エラーハンドリング共通機能
 */
import { NextRequest, NextResponse } from 'next/server'

// API レスポンス型定義
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
  timestamp?: string
}

// API エラー型定義
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 成功レスポンス生成
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status })
}

// エラーレスポンス生成
export function createErrorResponse(
  message: string,
  status: number = 500,
  code: string = 'INTERNAL_ERROR'
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status })
}

// APIエラーハンドラー
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)
  
  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.status, error.code)
  }
  
  if (error instanceof Error) {
    return createErrorResponse(error.message, 500, 'INTERNAL_ERROR')
  }
  
  return createErrorResponse('Unknown error occurred', 500, 'UNKNOWN_ERROR')
}

// リクエストボディ解析
export async function parseRequestBody<T>(
  request: NextRequest
): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    throw new ApiError('Invalid JSON body', 400, 'INVALID_BODY')
  }
}

// クエリパラメーター取得
export function getQueryParam(
  request: NextRequest,
  key: string,
  defaultValue?: string
): string | undefined {
  const { searchParams } = new URL(request.url)
  return searchParams.get(key) || defaultValue
}

// ページネーション計算
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export function parsePaginationParams(
  request: NextRequest,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(getQueryParam(request, 'page', '1') || '1'))
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(getQueryParam(request, 'limit', defaultLimit.toString()) || defaultLimit.toString()))
  )
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

// リクエストバリデーション
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })
  
  if (missingFields.length > 0) {
    throw new ApiError(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'MISSING_REQUIRED_FIELDS'
    )
  }
}

// HTTP メソッド許可チェック
export function ensureHttpMethod(
  request: NextRequest,
  allowedMethods: string[]
): void {
  if (!allowedMethods.includes(request.method)) {
    throw new ApiError(
      `Method ${request.method} not allowed`,
      405,
      'METHOD_NOT_ALLOWED'
    )
  }
}

// CORS ヘッダー設定
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// OPTIONS プリフライトリクエスト処理
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 200 })
  return setCorsHeaders(response)
}

// API ルート用ラッパー
export function withApiHandler<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // OPTIONS リクエスト処理
      if (request.method === 'OPTIONS') {
        return handleOptionsRequest()
      }
      
      const response = await handler(request, ...args)
      return setCorsHeaders(response)
    } catch (error) {
      const errorResponse = handleApiError(error)
      return setCorsHeaders(errorResponse)
    }
  }
}

// デフォルトエクスポート
export default {
  ApiError,
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  getQueryParam,
  parsePaginationParams,
  validateRequiredFields,
  ensureHttpMethod,
  setCorsHeaders,
  handleOptionsRequest,
  withApiHandler
}