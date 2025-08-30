/**
 * セキュリティヘッダー設定
 * CSP、CORS、その他のセキュリティヘッダーを統一管理
 */

import { NextResponse } from 'next/server'

// セキュリティ設定の型定義
export interface SecurityConfig {
  csp: {
    enabled: boolean
    directives: Record<string, string[]>
    reportOnly: boolean
  }
  cors: {
    enabled: boolean
    origins: string[]
    methods: string[]
    headers: string[]
    credentials: boolean
  }
  headers: {
    xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
    xContentTypeOptions: boolean
    referrerPolicy: string
    strictTransportSecurity: {
      enabled: boolean
      maxAge: number
      includeSubDomains: boolean
      preload: boolean
    }
    permissionsPolicy: Record<string, string[]>
  }
}

// デフォルトセキュリティ設定
export const defaultSecurityConfig: SecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Next.jsで必要
        "'unsafe-eval'", // 開発環境で必要
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Tailwind CSSで必要
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      'connect-src': [
        "'self'",
        'https://api.openai.com',
        'https://api.anthropic.com',
        'wss://localhost:*', // WebSocket開発環境
        'ws://localhost:*'
      ],
      'media-src': ["'self'", 'data:', 'blob:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    }
  },
  cors: {
    enabled: true,
    origins: ['http://localhost:3000', 'https://*.pages.dev'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    headers: [
      'Accept',
      'Accept-Language',
      'Content-Language',
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key'
    ],
    credentials: true
  },
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: {
      enabled: true,
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },
    permissionsPolicy: {
      'camera': [],
      'microphone': [],
      'geolocation': [],
      'interest-cohort': [], // FLoC無効化
      'payment': ["'self'"],
      'usb': [],
      'fullscreen': ["'self'"]
    }
  }
}

// 本番環境用の厳格な設定
export const productionSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  csp: {
    ...defaultSecurityConfig.csp,
    reportOnly: false,
    directives: {
      ...defaultSecurityConfig.csp.directives,
      'script-src': [
        "'self'",
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net',
        "'nonce-[NONCE]'" // 本番環境ではnonce使用
      ],
      'style-src': [
        "'self'",
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
        "'nonce-[NONCE]'"
      ]
    }
  },
  cors: {
    ...defaultSecurityConfig.cors,
    origins: [] // 本番では明示的に設定
  }
}

/**
 * CSPヘッダー文字列を生成
 */
function generateCSPHeader(directives: Record<string, string[]>, nonce?: string): string {
  return Object.entries(directives)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive
      }
      
      const processedValues = values.map(value => 
        nonce && value === "'nonce-[NONCE]'" ? `'nonce-${nonce}'` : value
      )
      
      return `${directive} ${processedValues.join(' ')}`
    })
    .join('; ')
}

/**
 * CORS検証
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true
    if (allowed.includes('*')) {
      // ワイルドカード対応
      const pattern = allowed.replace(/\*/g, '.*')
      return new RegExp(`^${pattern}$`).test(origin)
    }
    return allowed === origin
  })
}

/**
 * セキュリティヘッダーを設定
 */
export function setSecurityHeaders(
  response: NextResponse, 
  config: SecurityConfig = defaultSecurityConfig,
  nonce?: string
): NextResponse {
  const headers = new Headers(response.headers)

  // CSP (Content Security Policy)
  if (config.csp.enabled) {
    const cspHeader = generateCSPHeader(config.csp.directives, nonce)
    const headerName = config.csp.reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy'
    headers.set(headerName, cspHeader)
  }

  // X-Frame-Options
  headers.set('X-Frame-Options', config.headers.xFrameOptions)

  // X-Content-Type-Options
  if (config.headers.xContentTypeOptions) {
    headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Referrer-Policy
  headers.set('Referrer-Policy', config.headers.referrerPolicy)

  // Strict-Transport-Security (HTTPS環境のみ)
  if (config.headers.strictTransportSecurity.enabled) {
    const { maxAge, includeSubDomains, preload } = config.headers.strictTransportSecurity
    let hstsValue = `max-age=${maxAge}`
    if (includeSubDomains) hstsValue += '; includeSubDomains'
    if (preload) hstsValue += '; preload'
    headers.set('Strict-Transport-Security', hstsValue)
  }

  // Permissions-Policy
  const permissionsPolicyValue = Object.entries(config.headers.permissionsPolicy)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return `${directive}=()`
      }
      return `${directive}=(${values.join(' ')})`
    })
    .join(', ')
  
  if (permissionsPolicyValue) {
    headers.set('Permissions-Policy', permissionsPolicyValue)
  }

  // X-Powered-By を削除
  headers.delete('X-Powered-By')

  // Server情報を削除/変更
  headers.set('Server', 'NEO Platform')

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * CORS ヘッダーを設定
 */
export function setCORSHeaders(
  response: NextResponse,
  request: Request,
  config: SecurityConfig['cors'] = defaultSecurityConfig.cors
): NextResponse {
  if (!config.enabled) return response

  const origin = request.headers.get('origin')
  const headers = new Headers(response.headers)

  // Origin検証
  if (origin && isOriginAllowed(origin, config.origins)) {
    headers.set('Access-Control-Allow-Origin', origin)
  } else if (config.origins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*')
  }

  // Methods
  headers.set('Access-Control-Allow-Methods', config.methods.join(', '))

  // Headers
  headers.set('Access-Control-Allow-Headers', config.headers.join(', '))

  // Credentials
  if (config.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Preflight cache
  headers.set('Access-Control-Max-Age', '86400') // 24時間

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * セキュリティヘッダー統合設定
 */
export function applySecurityHeaders(
  response: NextResponse,
  request: Request,
  config: SecurityConfig = defaultSecurityConfig,
  nonce?: string
): NextResponse {
  // セキュリティヘッダー設定
  let secureResponse = setSecurityHeaders(response, config, nonce)
  
  // CORS設定
  secureResponse = setCORSHeaders(secureResponse, request, config.cors)
  
  return secureResponse
}

/**
 * 環境別設定取得
 */
export function getSecurityConfig(env: string = 'development'): SecurityConfig {
  switch (env) {
    case 'production':
      return productionSecurityConfig
    case 'development':
    default:
      return defaultSecurityConfig
  }
}

/**
 * Nonce生成
 */
export function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
}

/**
 * セキュリティヘッダー検証
 */
export function validateSecurityHeaders(headers: Headers): {
  isSecure: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // 必須ヘッダーのチェック
  if (!headers.get('Content-Security-Policy') && !headers.get('Content-Security-Policy-Report-Only')) {
    issues.push('Content Security Policy not set')
  }

  if (!headers.get('X-Frame-Options')) {
    issues.push('X-Frame-Options not set')
  }

  if (!headers.get('X-Content-Type-Options')) {
    issues.push('X-Content-Type-Options not set')
  }

  if (!headers.get('Referrer-Policy')) {
    recommendations.push('Consider setting Referrer-Policy')
  }

  if (headers.get('X-Powered-By')) {
    recommendations.push('Remove X-Powered-By header for security')
  }

  return {
    isSecure: issues.length === 0,
    issues,
    recommendations
  }
}