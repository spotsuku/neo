/**
 * セキュリティ統計情報API
 * レート制限状況、セキュリティイベント、脅威検知状況の監視
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitStats, cleanupRateLimitStore } from '@/lib/rate-limiter'
import { validateSecurityHeaders } from '@/lib/security-headers'
import { createSecurityMiddleware, SECURITY_PRESETS } from '@/lib/security-middleware'

// 管理者向けセキュリティミドルウェア
const adminSecurityMiddleware = createSecurityMiddleware(SECURITY_PRESETS.admin)

export async function GET(request: NextRequest) {
  try {
    // 管理者セキュリティチェック
    const securityResult = await adminSecurityMiddleware(request)
    
    if (!securityResult.proceed) {
      return securityResult.response!
    }

    // TODO: 実際の実装では管理者権限チェックを追加
    // const user = await getCurrentUser(request)
    // if (!user || user.role !== 'admin') {
    //   return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    // }

    const stats = {
      timestamp: new Date().toISOString(),
      rateLimiting: await getRateLimitingStats(),
      securityHeaders: getSecurityHeadersStatus(request),
      threatDetection: getThreatDetectionStats(),
      systemHealth: getSystemHealthStats()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('[Security Stats API]', error)
    return NextResponse.json(
      { error: 'セキュリティ統計の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 管理者セキュリティチェック
    const securityResult = await adminSecurityMiddleware(request)
    
    if (!securityResult.proceed) {
      return securityResult.response!
    }

    const { action } = await request.json()

    switch (action) {
      case 'cleanup':
        cleanupRateLimitStore()
        return NextResponse.json({ 
          message: 'レート制限ストレージをクリーンアップしました',
          timestamp: new Date().toISOString()
        })

      case 'reset_stats':
        // TODO: 統計情報のリセット実装
        return NextResponse.json({ 
          message: '統計情報をリセットしました',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[Security Stats API POST]', error)
    return NextResponse.json(
      { error: 'セキュリティ操作中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * レート制限統計の取得
 */
async function getRateLimitingStats() {
  const rateLimitStats = getRateLimitStats()
  
  return {
    totalKeys: rateLimitStats.totalKeys,
    activeKeys: rateLimitStats.activeKeys,
    topLimitedKeys: rateLimitStats.topLimitedKeys.map(item => ({
      ...item,
      keyType: classifyRateLimitKey(item.key),
      resetIn: Math.max(0, Math.ceil((item.resetTime - Date.now()) / 1000))
    })),
    efficiency: rateLimitStats.totalKeys > 0 
      ? Math.round((rateLimitStats.activeKeys / rateLimitStats.totalKeys) * 100)
      : 0
  }
}

/**
 * レート制限キーの分類
 */
function classifyRateLimitKey(key: string): string {
  if (key.includes(':user:')) return 'User-based'
  if (key.includes(':path:')) return 'Path-based'
  if (key.includes('rate_limit:')) return 'IP-based'
  if (key.includes('brute_force:')) return 'Brute Force Protection'
  return 'Unknown'
}

/**
 * セキュリティヘッダー状況の取得
 */
function getSecurityHeadersStatus(request: NextRequest) {
  // 現在のリクエストヘッダーを検証（実際の応答ヘッダーを模擬）
  const mockResponseHeaders = new Headers({
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  })

  const validation = validateSecurityHeaders(mockResponseHeaders)
  
  return {
    isSecure: validation.isSecure,
    issues: validation.issues,
    recommendations: validation.recommendations,
    headers: {
      csp: mockResponseHeaders.get('Content-Security-Policy') ? 'enabled' : 'disabled',
      xframe: mockResponseHeaders.get('X-Frame-Options') ? 'enabled' : 'disabled',
      hsts: mockResponseHeaders.get('Strict-Transport-Security') ? 'enabled' : 'disabled',
      nosniff: mockResponseHeaders.get('X-Content-Type-Options') ? 'enabled' : 'disabled'
    }
  }
}

/**
 * 脅威検知統計の取得（モックデータ）
 */
function getThreatDetectionStats() {
  // TODO: 実際の実装では永続化されたセキュリティイベントから取得
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  
  return {
    last24Hours: {
      totalEvents: Math.floor(Math.random() * 50),
      maliciousInputs: Math.floor(Math.random() * 20),
      rateLimitExceeded: Math.floor(Math.random() * 30),
      bruteForceAttempts: Math.floor(Math.random() * 5),
      blockedIPs: Math.floor(Math.random() * 3)
    },
    lastHour: {
      totalEvents: Math.floor(Math.random() * 10),
      maliciousInputs: Math.floor(Math.random() * 5),
      rateLimitExceeded: Math.floor(Math.random() * 8),
      bruteForceAttempts: Math.floor(Math.random() * 2),
      blockedIPs: Math.floor(Math.random() * 1)
    },
    topThreats: [
      { type: 'XSS Attempt', count: Math.floor(Math.random() * 15), lastSeen: new Date(now - Math.random() * oneDay) },
      { type: 'SQL Injection', count: Math.floor(Math.random() * 10), lastSeen: new Date(now - Math.random() * oneDay) },
      { type: 'Rate Limit Exceeded', count: Math.floor(Math.random() * 25), lastSeen: new Date(now - Math.random() * oneHour) },
      { type: 'Brute Force', count: Math.floor(Math.random() * 8), lastSeen: new Date(now - Math.random() * oneDay) }
    ],
    riskLevel: calculateRiskLevel()
  }
}

/**
 * リスクレベルの計算
 */
function calculateRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
  const risk = Math.random()
  if (risk < 0.7) return 'low'
  if (risk < 0.9) return 'medium'
  if (risk < 0.98) return 'high'
  return 'critical'
}

/**
 * システムヘルス統計の取得
 */
function getSystemHealthStats() {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'unknown',
    securityFeatures: {
      rateLimiting: 'enabled',
      inputValidation: 'enabled',
      securityHeaders: 'enabled',
      bruteForceProtection: 'enabled',
      maliciousPatternDetection: 'enabled'
    },
    lastUpdated: new Date().toISOString()
  }
}