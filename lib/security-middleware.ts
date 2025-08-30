/**
 * セキュリティ統合ミドルウェア
 * セキュリティヘッダー、レート制限、入力バリデーションを統合
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  applySecurityHeaders, 
  getSecurityConfig, 
  generateNonce,
  type SecurityConfig 
} from './security-headers'
import { 
  createRateLimiter, 
  createBruteForceProtection, 
  RATE_LIMIT_PRESETS,
  type RateLimitConfig 
} from './rate-limiter'
import { 
  validateRequestData, 
  detectMaliciousPatterns,
  sanitizeString 
} from './input-validation'
import { ApiError } from './api-error'
import { errorReporter, ErrorLevel } from './error-reporting'

// セキュリティ設定の型定義
export interface SecurityMiddlewareConfig {
  security: {
    enabled: boolean
    config?: Partial<SecurityConfig>
    nonce?: boolean
  }
  rateLimit: {
    enabled: boolean
    preset?: keyof typeof RATE_LIMIT_PRESETS
    custom?: RateLimitConfig
  }
  bruteForce: {
    enabled: boolean
    maxAttempts?: number
    windowMs?: number
    blockDurationMs?: number
  }
  validation: {
    enabled: boolean
    sanitizeInput?: boolean
    detectMalicious?: boolean
    logSuspiciousActivity?: boolean
  }
  monitoring: {
    enabled: boolean
    reportSecurityEvents?: boolean
    logLevel?: 'basic' | 'detailed'
  }
}

// デフォルト設定
const defaultConfig: SecurityMiddlewareConfig = {
  security: {
    enabled: true,
    nonce: process.env.NODE_ENV === 'production'
  },
  rateLimit: {
    enabled: true,
    preset: 'api'
  },
  bruteForce: {
    enabled: true,
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15分
    blockDurationMs: 60 * 60 * 1000 // 1時間
  },
  validation: {
    enabled: true,
    sanitizeInput: true,
    detectMalicious: true,
    logSuspiciousActivity: true
  },
  monitoring: {
    enabled: true,
    reportSecurityEvents: true,
    logLevel: 'detailed'
  }
}

// セキュリティイベントタイプ
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  MALICIOUS_INPUT_DETECTED = 'malicious_input_detected',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation'
}

// セキュリティイベント
interface SecurityEvent {
  type: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  clientIP: string
  userAgent: string | null
  url: string
  method: string
  details: Record<string, any>
  timestamp: Date
}

/**
 * セキュリティイベントの記録
 */
async function recordSecurityEvent(
  event: SecurityEvent,
  config: SecurityMiddlewareConfig
): Promise<void> {
  if (!config.monitoring.enabled) return

  // 基本ログ出力
  const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warn'
  console[logLevel]('[Security Event]', {
    type: event.type,
    severity: event.severity,
    ip: event.clientIP,
    url: event.url,
    details: config.monitoring.logLevel === 'detailed' ? event.details : undefined
  })

  // エラー報告システムへの通知（高・重大レベルのみ）
  if (config.monitoring.reportSecurityEvents && 
      (event.severity === 'high' || event.severity === 'critical')) {
    try {
      const error = new Error(`Security Event: ${event.type}`)
      await errorReporter.reportError(error, {
        url: event.url,
        userAgent: event.userAgent,
        extra: {
          securityEvent: event,
          clientIP: event.clientIP
        }
      }, ErrorLevel.WARNING)
    } catch (reportError) {
      console.error('[Security] Failed to report security event:', reportError)
    }
  }
}

/**
 * クライアントIP取得
 */
function getClientIP(request: NextRequest): string {
  // Cloudflare環境
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  
  // プロキシ環境
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  const xRealIP = request.headers.get('x-real-ip')
  if (xRealIP) return xRealIP
  
  return request.ip || 'unknown'
}

/**
 * リクエスト本文の検証とサニタイズ
 */
async function validateRequestBody(
  request: NextRequest,
  config: SecurityMiddlewareConfig
): Promise<{ body: any; issues: string[] }> {
  if (!config.validation.enabled) {
    return { body: null, issues: [] }
  }

  let body: any = null
  const issues: string[] = []

  try {
    // Content-Typeに基づいて解析
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      const text = await request.text()
      
      if (config.validation.detectMalicious) {
        const maliciousCheck = detectMaliciousPatterns(text)
        if (maliciousCheck.isMalicious) {
          issues.push(`Malicious patterns detected: ${maliciousCheck.detectedPatterns.join(', ')}`)
        }
      }
      
      body = JSON.parse(text)
      
      if (config.validation.sanitizeInput) {
        body = sanitizeObjectRecursively(body)
      }
      
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
      
      if (config.validation.sanitizeInput) {
        body = sanitizeObjectRecursively(body)
      }
    }
  } catch (error) {
    issues.push('Invalid request body format')
  }

  return { body, issues }
}

/**
 * オブジェクトの再帰的サニタイズ
 */
function sanitizeObjectRecursively(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj, { escapeHTML: true, maxLength: 10000 })
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectRecursively)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // キー名もサニタイズ
      const safeKey = sanitizeString(String(key), { 
        escapeHTML: false, 
        removeDangerousChars: true 
      })
      sanitized[safeKey] = sanitizeObjectRecursively(value)
    }
    return sanitized
  }
  
  return obj
}

/**
 * セキュリティミドルウェアファクトリー
 */
export function createSecurityMiddleware(
  userConfig: Partial<SecurityMiddlewareConfig> = {}
) {
  const config: SecurityMiddlewareConfig = {
    security: { ...defaultConfig.security, ...userConfig.security },
    rateLimit: { ...defaultConfig.rateLimit, ...userConfig.rateLimit },
    bruteForce: { ...defaultConfig.bruteForce, ...userConfig.bruteForce },
    validation: { ...defaultConfig.validation, ...userConfig.validation },
    monitoring: { ...defaultConfig.monitoring, ...userConfig.monitoring }
  }

  // レート制限設定
  let rateLimiter: ((request: NextRequest) => Promise<any>) | null = null
  if (config.rateLimit.enabled) {
    const rateLimitConfig = config.rateLimit.custom || 
      RATE_LIMIT_PRESETS[config.rateLimit.preset || 'api']
    rateLimiter = createRateLimiter(rateLimitConfig)
  }

  // ブルートフォース保護
  let bruteForceProtection: any | null = null
  if (config.bruteForce.enabled) {
    bruteForceProtection = createBruteForceProtection({
      maxAttempts: config.bruteForce.maxAttempts || 5,
      windowMs: config.bruteForce.windowMs || 15 * 60 * 1000,
      blockDurationMs: config.bruteForce.blockDurationMs || 60 * 60 * 1000
    })
  }

  return async function securityMiddleware(
    request: NextRequest
  ): Promise<{
    proceed: boolean
    response?: NextResponse
    securityContext: {
      clientIP: string
      nonce?: string
      rateLimitHeaders?: Record<string, string>
      validationIssues: string[]
    }
  }> {
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent')
    const url = request.url
    const method = request.method

    let nonce: string | undefined
    let rateLimitHeaders: Record<string, string> = {}
    const validationIssues: string[] = []

    try {
      // 1. ブルートフォース保護チェック
      if (bruteForceProtection) {
        try {
          bruteForceProtection.checkBlocked(request)
        } catch (error) {
          if (error instanceof ApiError) {
            await recordSecurityEvent({
              type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
              severity: 'high',
              clientIP,
              userAgent,
              url,
              method,
              details: { blocked: true, error: error.message },
              timestamp: new Date()
            }, config)

            return {
              proceed: false,
              response: error.toResponse(),
              securityContext: { clientIP, validationIssues }
            }
          }
          throw error
        }
      }

      // 2. レート制限チェック
      if (rateLimiter) {
        try {
          const rateLimitResult = await rateLimiter(request)
          rateLimitHeaders = rateLimitResult.rateLimitHeaders || {}
        } catch (error) {
          if (error instanceof ApiError) {
            await recordSecurityEvent({
              type: SecurityEventType.RATE_LIMIT_EXCEEDED,
              severity: 'medium',
              clientIP,
              userAgent,
              url,
              method,
              details: { 
                limit: rateLimitHeaders['X-RateLimit-Limit'],
                remaining: rateLimitHeaders['X-RateLimit-Remaining']
              },
              timestamp: new Date()
            }, config)

            const response = error.toResponse()
            
            // レート制限ヘッダーを追加
            Object.entries(rateLimitHeaders).forEach(([key, value]) => {
              response.headers.set(key, value)
            })

            return {
              proceed: false,
              response,
              securityContext: { clientIP, rateLimitHeaders, validationIssues }
            }
          }
          throw error
        }
      }

      // 3. リクエスト本文の検証（POST/PUT/PATCHのみ）
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const { body, issues } = await validateRequestBody(request, config)
        validationIssues.push(...issues)

        if (issues.length > 0 && config.validation.logSuspiciousActivity) {
          await recordSecurityEvent({
            type: SecurityEventType.MALICIOUS_INPUT_DETECTED,
            severity: 'medium',
            clientIP,
            userAgent,
            url,
            method,
            details: { issues, bodyPreview: JSON.stringify(body).substring(0, 200) },
            timestamp: new Date()
          }, config)

          // 悪意のある入力が検出された場合はリクエストを拒否
          const hasHighRiskPatterns = issues.some(issue => 
            issue.includes('SQL Injection') || issue.includes('Command Injection')
          )

          if (hasHighRiskPatterns) {
            return {
              proceed: false,
              response: ApiError.validation(
                '不正な入力が検出されました',
                'セキュリティ上の理由によりリクエストが拒否されました'
              ).toResponse(),
              securityContext: { clientIP, validationIssues }
            }
          }
        }
      }

      // 4. セキュリティヘッダー用のNonce生成
      if (config.security.enabled && config.security.nonce) {
        nonce = generateNonce()
      }

      // セキュリティチェック完了
      return {
        proceed: true,
        securityContext: {
          clientIP,
          nonce,
          rateLimitHeaders,
          validationIssues
        }
      }

    } catch (error) {
      // 予期しないエラー
      await recordSecurityEvent({
        type: SecurityEventType.SECURITY_VIOLATION,
        severity: 'critical',
        clientIP,
        userAgent,
        url,
        method,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      }, config)

      console.error('[Security Middleware] Unexpected error:', error)
      
      return {
        proceed: false,
        response: NextResponse.json(
          { error: 'セキュリティ処理でエラーが発生しました' },
          { status: 500 }
        ),
        securityContext: { clientIP, validationIssues }
      }
    }
  }
}

/**
 * レスポンスにセキュリティヘッダーを適用
 */
export function applySecurityToResponse(
  response: NextResponse,
  request: NextRequest,
  securityContext: {
    nonce?: string
    rateLimitHeaders?: Record<string, string>
  },
  config: Partial<SecurityMiddlewareConfig> = {}
): NextResponse {
  // セキュリティヘッダーの適用
  if (config.security?.enabled !== false) {
    const securityConfig = getSecurityConfig(process.env.NODE_ENV)
    response = applySecurityHeaders(response, request, securityConfig, securityContext.nonce)
  }

  // レート制限ヘッダーの追加
  if (securityContext.rateLimitHeaders) {
    Object.entries(securityContext.rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}

/**
 * エンドポイント別セキュリティ設定プリセット
 */
export const SECURITY_PRESETS = {
  // 認証API（厳格）
  auth: {
    rateLimit: { enabled: true, preset: 'auth' as const },
    bruteForce: { enabled: true, maxAttempts: 3, blockDurationMs: 30 * 60 * 1000 },
    validation: { enabled: true, detectMalicious: true, logSuspiciousActivity: true }
  },
  
  // 管理者API（非常に厳格）
  admin: {
    rateLimit: { enabled: true, preset: 'admin' as const },
    bruteForce: { enabled: true, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 },
    validation: { enabled: true, detectMalicious: true, logSuspiciousActivity: true },
    monitoring: { enabled: true, reportSecurityEvents: true, logLevel: 'detailed' as const }
  },
  
  // ファイルアップロード
  upload: {
    rateLimit: { enabled: true, preset: 'upload' as const },
    validation: { enabled: true, detectMalicious: true, sanitizeInput: true }
  },
  
  // 公開API（緩やか）
  public: {
    rateLimit: { enabled: true, preset: 'search' as const },
    validation: { enabled: true, detectMalicious: false, sanitizeInput: true },
    monitoring: { enabled: true, logLevel: 'basic' as const }
  }
} as const