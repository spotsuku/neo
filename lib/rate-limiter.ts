/**
 * レート制限システム
 * IP別、ユーザー別、エンドポイント別の制限を管理
 */

import { NextRequest } from 'next/server'
import { ApiError } from './api-error'

// レート制限設定の型定義
export interface RateLimitConfig {
  windowMs: number // 制限期間（ミリ秒）
  maxRequests: number // 最大リクエスト数
  keyGenerator?: (request: NextRequest) => string // キー生成関数
  skipSuccessfulRequests?: boolean // 成功リクエストをスキップ
  skipFailedRequests?: boolean // 失敗リクエストをスキップ
  message?: string // 制限時のメッセージ
}

// レート制限状態
interface RateLimitState {
  count: number
  resetTime: number
  firstRequest: number
}

// メモリベースストレージ（本番環境ではRedis/KV推奨）
const rateLimitStore = new Map<string, RateLimitState>()

// プリセット設定
export const RATE_LIMIT_PRESETS = {
  // 一般API
  api: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 60,
    message: 'APIリクエストが多すぎます。しばらく時間を置いてから再試行してください。'
  },
  
  // 認証系API（厳しく制限）
  auth: {
    windowMs: 15 * 60 * 1000, // 15分
    maxRequests: 5,
    message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。'
  },
  
  // パスワードリセット（非常に厳しく制限）
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1時間
    maxRequests: 3,
    message: 'パスワードリセット要求が多すぎます。1時間後に再試行してください。'
  },
  
  // ファイルアップロード
  upload: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 10,
    message: 'ファイルアップロードが多すぎます。しばらく時間を置いてください。'
  },
  
  // 検索・データ取得
  search: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 100,
    message: '検索リクエストが多すぎます。しばらく時間を置いてください。'
  },
  
  // 管理者操作
  admin: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 30,
    message: '管理者操作が多すぎます。しばらく時間を置いてください。'
  }
} as const

/**
 * IPアドレス取得
 */
function getClientIP(request: NextRequest): string {
  // Cloudflare環境での実IP取得
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  
  // プロキシ環境での実IP取得
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  const xRealIP = request.headers.get('x-real-ip')
  if (xRealIP) return xRealIP
  
  // フォールバック
  return request.ip || 'unknown'
}

/**
 * デフォルトキー生成（IP別）
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request)
  const path = new URL(request.url).pathname
  return `rate_limit:${ip}:${path}`
}

/**
 * ユーザー別キー生成
 */
export function userKeyGenerator(userId: string) {
  return (request: NextRequest): string => {
    const path = new URL(request.url).pathname
    return `rate_limit:user:${userId}:${path}`
  }
}

/**
 * パス別キー生成
 */
export function pathKeyGenerator(request: NextRequest): string {
  const path = new URL(request.url).pathname
  return `rate_limit:path:${path}`
}

/**
 * レート制限チェック
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { 
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const key = config.keyGenerator ? 
    config.keyGenerator(request) : 
    defaultKeyGenerator(request)
  
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  // 既存の状態を取得またはクリーンアップ
  const existing = rateLimitStore.get(key)
  
  if (!existing || existing.resetTime <= now) {
    // 新しいウィンドウまたは期限切れ
    const newState: RateLimitState = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    }
    rateLimitStore.set(key, newState)
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newState.resetTime
    }
  }
  
  // カウント増加
  existing.count++
  
  if (existing.count > config.maxRequests) {
    // 制限を超過
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    }
  }
  
  // 制限内
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  }
}

/**
 * レート制限ミドルウェア
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const result = checkRateLimit(request, config)
    
    if (!result.allowed) {
      throw ApiError.tooManyRequests(
        config.message || 'リクエストが多すぎます',
        {
          retryAfter: result.retryAfter,
          resetTime: new Date(result.resetTime).toISOString()
        }
      )
    }
    
    return {
      rateLimitHeaders: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'X-RateLimit-Window': config.windowMs.toString()
      }
    }
  }
}

/**
 * 複数レート制限の組み合わせ
 */
export function createMultiRateLimiter(...configs: Array<{ 
  config: RateLimitConfig
  name: string 
}>) {
  return async (request: NextRequest) => {
    const results: Record<string, any> = {}
    
    for (const { config, name } of configs) {
      const result = checkRateLimit(request, config)
      
      if (!result.allowed) {
        throw ApiError.tooManyRequests(
          config.message || `${name}制限に達しました`,
          {
            limitType: name,
            retryAfter: result.retryAfter,
            resetTime: new Date(result.resetTime).toISOString()
          }
        )
      }
      
      results[name] = result
    }
    
    // 最も厳しい制限の情報を返す
    const strictest = Object.values(results).reduce((prev: any, curr: any) => 
      curr.remaining < prev.remaining ? curr : prev
    )
    
    return {
      rateLimitHeaders: {
        'X-RateLimit-Limit': configs[0].config.maxRequests.toString(),
        'X-RateLimit-Remaining': strictest.remaining.toString(),
        'X-RateLimit-Reset': strictest.resetTime.toString()
      }
    }
  }
}

/**
 * ブルートフォース攻撃検出
 */
export function createBruteForceProtection(config: {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  keyGenerator?: (request: NextRequest) => string
}) {
  const blockedIPs = new Map<string, number>()
  
  return {
    // 失敗試行記録
    recordFailedAttempt: (request: NextRequest) => {
      const key = config.keyGenerator ? 
        config.keyGenerator(request) : 
        `brute_force:${getClientIP(request)}`
      
      const result = checkRateLimit(request, {
        windowMs: config.windowMs,
        maxRequests: config.maxAttempts,
        keyGenerator: () => key
      })
      
      if (!result.allowed) {
        // ブロックリストに追加
        const blockUntil = Date.now() + config.blockDurationMs
        blockedIPs.set(key, blockUntil)
        
        throw ApiError.tooManyRequests(
          'セキュリティ上の理由によりアクセスが制限されました',
          {
            blockDurationMinutes: Math.ceil(config.blockDurationMs / 60000),
            type: 'brute_force_protection'
          }
        )
      }
    },
    
    // ブロック状態確認
    checkBlocked: (request: NextRequest): boolean => {
      const key = config.keyGenerator ? 
        config.keyGenerator(request) : 
        `brute_force:${getClientIP(request)}`
      
      const blockUntil = blockedIPs.get(key)
      if (blockUntil && blockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((blockUntil - Date.now()) / 60000)
        throw ApiError.tooManyRequests(
          'アクセスが一時的にブロックされています',
          {
            remainingMinutes,
            type: 'blocked'
          }
        )
      }
      
      // 期限切れのブロックを削除
      if (blockUntil && blockUntil <= Date.now()) {
        blockedIPs.delete(key)
      }
      
      return false
    },
    
    // 成功時のクリア
    clearFailedAttempts: (request: NextRequest) => {
      const key = config.keyGenerator ? 
        config.keyGenerator(request) : 
        `brute_force:${getClientIP(request)}`
      
      rateLimitStore.delete(key)
      blockedIPs.delete(key)
    }
  }
}

/**
 * レート制限状態の取得
 */
export function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig
): {
  key: string
  current: RateLimitState | null
  allowed: boolean
  remaining: number
} {
  const key = config.keyGenerator ? 
    config.keyGenerator(request) : 
    defaultKeyGenerator(request)
  
  const current = rateLimitStore.get(key)
  const result = checkRateLimit(request, config)
  
  return {
    key,
    current: current || null,
    allowed: result.allowed,
    remaining: result.remaining
  }
}

/**
 * レート制限ストレージのクリーンアップ
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  const expiredKeys: string[] = []
  
  for (const [key, state] of rateLimitStore.entries()) {
    if (state.resetTime <= now) {
      expiredKeys.push(key)
    }
  }
  
  expiredKeys.forEach(key => rateLimitStore.delete(key))
  
  console.log(`[RateLimit] Cleaned up ${expiredKeys.length} expired entries`)
}

// 定期クリーンアップ（5分毎）
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

/**
 * レート制限統計の取得
 */
export function getRateLimitStats(): {
  totalKeys: number
  activeKeys: number
  topLimitedKeys: Array<{ key: string; count: number; resetTime: number }>
} {
  const now = Date.now()
  const activeKeys = Array.from(rateLimitStore.entries())
    .filter(([_, state]) => state.resetTime > now)
  
  const topLimited = activeKeys
    .map(([key, state]) => ({ key, count: state.count, resetTime: state.resetTime }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalKeys: rateLimitStore.size,
    activeKeys: activeKeys.length,
    topLimitedKeys: topLimited
  }
}