/**
 * API エラーハンドリング統一化 - NEO Digital Platform
 * 統一されたエラーレスポンス形式・エラー分類・ハンドリング
 */

// 標準APIエラーレスポンス形式
export interface ApiErrorResponse {
  error: string
  message: string
  details?: Array<{
    field: string
    message: string
  }>
  code?: string
  statusCode: number
  timestamp: string
  requestId?: string
}

// エラー分類
export enum ErrorType {
  // 認証・認可エラー
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // バリデーションエラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // リソースエラー
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // サーバーエラー
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // ネットワークエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // レート制限
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // その他
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// エラーメッセージマッピング
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTHENTICATION_ERROR]: 'ログインが必要です',
  [ErrorType.AUTHORIZATION_ERROR]: 'この操作を実行する権限がありません',
  [ErrorType.TOKEN_EXPIRED]: 'ログイン有効期限が切れました。再度ログインしてください',
  [ErrorType.VALIDATION_ERROR]: '入力内容に不備があります',
  [ErrorType.REQUIRED_FIELD_MISSING]: '必須項目が入力されていません',
  [ErrorType.INVALID_FORMAT]: '入力形式が正しくありません',
  [ErrorType.NOT_FOUND]: '要求されたリソースが見つかりません',
  [ErrorType.ALREADY_EXISTS]: '指定されたリソースは既に存在します',
  [ErrorType.CONFLICT]: 'データの競合が発生しました',
  [ErrorType.INTERNAL_ERROR]: 'サーバー内部エラーが発生しました',
  [ErrorType.DATABASE_ERROR]: 'データベース接続エラーが発生しました',
  [ErrorType.EXTERNAL_SERVICE_ERROR]: '外部サービス連携でエラーが発生しました',
  [ErrorType.NETWORK_ERROR]: 'ネットワーク接続エラーが発生しました',
  [ErrorType.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました',
  [ErrorType.RATE_LIMIT_EXCEEDED]: 'リクエスト制限に達しました。しばらく時間を置いてから再試行してください',
  [ErrorType.UNKNOWN_ERROR]: '予期しないエラーが発生しました'
}

// カスタムAPIエラークラス
export class ApiError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly details?: Array<{ field: string; message: string }>
  public readonly code?: string
  public readonly timestamp: string
  public readonly requestId?: string

  constructor(
    type: ErrorType,
    statusCode: number,
    message?: string,
    details?: Array<{ field: string; message: string }>,
    code?: string,
    requestId?: string
  ) {
    const finalMessage = message || ERROR_MESSAGES[type]
    super(finalMessage)
    
    this.name = 'ApiError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.code = code
    this.timestamp = new Date().toISOString()
    this.requestId = requestId

    // スタックトレースの設定（V8エンジン）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  // JSONシリアライゼーション用
  toJSON(): ApiErrorResponse {
    return {
      error: this.type,
      message: this.message,
      details: this.details,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      requestId: this.requestId
    }
  }

  // Response生成用ヘルパー
  toResponse(): Response {
    return new Response(
      JSON.stringify(this.toJSON()),
      {
        status: this.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Type': this.type,
          ...(this.requestId && { 'X-Request-ID': this.requestId })
        }
      }
    )
  }
}

// よく使用されるエラー生成ヘルパー
export const createApiError = {
  // 認証エラー
  unauthorized: (message?: string) => 
    new ApiError(ErrorType.AUTHENTICATION_ERROR, 401, message),
  
  forbidden: (message?: string) => 
    new ApiError(ErrorType.AUTHORIZATION_ERROR, 403, message),
  
  tokenExpired: (message?: string) => 
    new ApiError(ErrorType.TOKEN_EXPIRED, 401, message),

  // バリデーションエラー
  validation: (details?: Array<{ field: string; message: string }>, message?: string) => 
    new ApiError(ErrorType.VALIDATION_ERROR, 400, message, details),
  
  requiredField: (field: string) => 
    new ApiError(
      ErrorType.REQUIRED_FIELD_MISSING, 
      400, 
      undefined, 
      [{ field, message: `${field}は必須です` }]
    ),

  // リソースエラー
  notFound: (resource?: string, message?: string) => 
    new ApiError(
      ErrorType.NOT_FOUND, 
      404, 
      message || (resource ? `${resource}が見つかりません` : undefined)
    ),
  
  alreadyExists: (resource?: string, message?: string) => 
    new ApiError(
      ErrorType.ALREADY_EXISTS, 
      409, 
      message || (resource ? `${resource}は既に存在します` : undefined)
    ),

  conflict: (message?: string) => 
    new ApiError(ErrorType.CONFLICT, 409, message),

  // サーバーエラー
  internal: (message?: string, code?: string) => 
    new ApiError(ErrorType.INTERNAL_ERROR, 500, message, undefined, code),
  
  database: (message?: string) => 
    new ApiError(ErrorType.DATABASE_ERROR, 500, message),

  // レート制限
  rateLimit: (resetTime?: Date, message?: string) => {
    const baseMessage = message || ERROR_MESSAGES[ErrorType.RATE_LIMIT_EXCEEDED]
    const finalMessage = resetTime 
      ? `${baseMessage} ${resetTime.toLocaleString('ja-JP')}以降に再試行してください`
      : baseMessage
    
    return new ApiError(ErrorType.RATE_LIMIT_EXCEEDED, 429, finalMessage)
  }
}

// フロントエンド用: Fetchエラーからの変換
export const parseApiError = async (response: Response): Promise<ApiError> => {
  try {
    const errorData: ApiErrorResponse = await response.json()
    
    // APIエラーレスポンス形式の場合
    if (errorData.error && errorData.message) {
      return new ApiError(
        errorData.error as ErrorType,
        response.status,
        errorData.message,
        errorData.details,
        errorData.code,
        errorData.requestId
      )
    }
  } catch {
    // JSON解析に失敗した場合
  }

  // ステータスコードベースのエラー生成
  switch (response.status) {
    case 400:
      return createApiError.validation()
    case 401:
      return createApiError.unauthorized()
    case 403:
      return createApiError.forbidden()
    case 404:
      return createApiError.notFound()
    case 409:
      return createApiError.conflict()
    case 429:
      return createApiError.rateLimit()
    case 500:
    default:
      return createApiError.internal()
  }
}

// ネットワークエラーの検出と変換
export const handleFetchError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return new ApiError(ErrorType.NETWORK_ERROR, 0, 'ネットワーク接続に問題があります')
    }
    
    if (message.includes('timeout')) {
      return new ApiError(ErrorType.TIMEOUT_ERROR, 0, 'リクエストがタイムアウトしました')
    }
    
    return new ApiError(ErrorType.UNKNOWN_ERROR, 0, error.message)
  }

  return new ApiError(ErrorType.UNKNOWN_ERROR, 0, '予期しないエラーが発生しました')
}

// APIクライアント用の統一エラーハンドリング
export const apiRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const apiError = await parseApiError(response)
      throw apiError
    }

    return response
  } catch (error) {
    throw handleFetchError(error)
  }
}

// ユーザーフレンドリーなエラーメッセージ生成
export const getUserFriendlyMessage = (error: ApiError | Error): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  // 一般的なエラーメッセージの変換
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('connection')) {
    return 'インターネット接続を確認してください'
  }
  
  if (message.includes('timeout')) {
    return 'しばらく時間を置いてから再試行してください'
  }
  
  return '問題が発生しました。サポートまでお問い合わせください'
}