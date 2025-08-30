/**
 * 入力バリデーション強化システム
 * Zod統合、XSS防止、SQLインジェクション防止、データ無害化
 */

import { z } from 'zod'
import { ApiError } from './api-error'

// HTMLエスケープマッピング
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

// 危険なパターン
const DANGEROUS_PATTERNS = {
  // SQLインジェクション検出
  sqlInjection: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(;|\-\-|\/\*|\*\/)/,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/i,
    /('|")\s*(or|and|union)/i
  ],
  
  // XSS検出
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<[^>]*\s(onerror|onload|onclick|onmouseover|onfocus|onblur)\s*=/i
  ],
  
  // パストラバーサル
  pathTraversal: [
    /\.\.[\/\\]/,
    /(\.\.\\|\.\.\/)/,
    /[\/\\]\.\.[\/\\]/,
    /%2e%2e[\/\\]/i
  ],
  
  // コマンドインジェクション
  commandInjection: [
    /[;&|`$]/,
    /\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat)\b/i,
    /(\|\||&&)/
  ]
}

/**
 * HTML文字のエスケープ
 */
export function escapeHTML(input: string): string {
  return input.replace(/[&<>"'`=\/]/g, (match) => HTML_ESCAPE_MAP[match] || match)
}

/**
 * HTMLエスケープの解除
 */
export function unescapeHTML(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
}

/**
 * 危険なパターンの検出
 */
export function detectMaliciousPatterns(
  input: string,
  options: {
    checkSQLInjection?: boolean
    checkXSS?: boolean
    checkPathTraversal?: boolean
    checkCommandInjection?: boolean
  } = {}
): {
  isMalicious: boolean
  detectedPatterns: string[]
  riskLevel: 'low' | 'medium' | 'high'
} {
  const {
    checkSQLInjection = true,
    checkXSS = true,
    checkPathTraversal = true,
    checkCommandInjection = true
  } = options

  const detectedPatterns: string[] = []
  
  // SQLインジェクション検出
  if (checkSQLInjection) {
    for (const pattern of DANGEROUS_PATTERNS.sqlInjection) {
      if (pattern.test(input)) {
        detectedPatterns.push('SQL Injection')
        break
      }
    }
  }
  
  // XSS検出
  if (checkXSS) {
    for (const pattern of DANGEROUS_PATTERNS.xss) {
      if (pattern.test(input)) {
        detectedPatterns.push('XSS')
        break
      }
    }
  }
  
  // パストラバーサル検出
  if (checkPathTraversal) {
    for (const pattern of DANGEROUS_PATTERNS.pathTraversal) {
      if (pattern.test(input)) {
        detectedPatterns.push('Path Traversal')
        break
      }
    }
  }
  
  // コマンドインジェクション検出
  if (checkCommandInjection) {
    for (const pattern of DANGEROUS_PATTERNS.commandInjection) {
      if (pattern.test(input)) {
        detectedPatterns.push('Command Injection')
        break
      }
    }
  }
  
  // リスクレベル判定
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (detectedPatterns.length > 0) {
    if (detectedPatterns.includes('SQL Injection') || detectedPatterns.includes('Command Injection')) {
      riskLevel = 'high'
    } else if (detectedPatterns.includes('XSS') || detectedPatterns.includes('Path Traversal')) {
      riskLevel = 'medium'
    }
  }
  
  return {
    isMalicious: detectedPatterns.length > 0,
    detectedPatterns,
    riskLevel
  }
}

/**
 * 文字列のサニタイズ
 */
export function sanitizeString(
  input: string,
  options: {
    escapeHTML?: boolean
    removeDangerousChars?: boolean
    maxLength?: number
    allowedChars?: RegExp
  } = {}
): string {
  let sanitized = input
  
  // HTMLエスケープ
  if (options.escapeHTML !== false) {
    sanitized = escapeHTML(sanitized)
  }
  
  // 危険な文字の除去
  if (options.removeDangerousChars) {
    sanitized = sanitized.replace(/[<>\"'`&]/g, '')
  }
  
  // 許可文字以外の除去
  if (options.allowedChars) {
    sanitized = sanitized.replace(new RegExp(`[^${options.allowedChars.source}]`, 'g'), '')
  }
  
  // 長さ制限
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }
  
  return sanitized
}

/**
 * カスタムZodバリデーター
 */
export const secureValidators = {
  // 安全な文字列
  safeString: (options?: {
    min?: number
    max?: number
    pattern?: RegExp
    disallowHTML?: boolean
  }) => z.string()
    .min(options?.min || 0)
    .max(options?.max || 1000)
    .refine((val) => {
      if (options?.pattern && !options.pattern.test(val)) {
        return false
      }
      
      if (options?.disallowHTML !== false) {
        const maliciousCheck = detectMaliciousPatterns(val)
        if (maliciousCheck.isMalicious) {
          return false
        }
      }
      
      return true
    }, {
      message: '不正な文字または危険なパターンが含まれています'
    }),
  
  // メールアドレス
  email: () => z.string()
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます')
    .refine((val) => {
      // メール内の危険なパターンチェック
      const maliciousCheck = detectMaliciousPatterns(val, {
        checkSQLInjection: true,
        checkXSS: false,
        checkPathTraversal: false,
        checkCommandInjection: true
      })
      return !maliciousCheck.isMalicious
    }, {
      message: '無効なメールアドレス形式です'
    }),
  
  // パスワード
  password: (options?: {
    minLength?: number
    requireNumbers?: boolean
    requireSymbols?: boolean
    requireUppercase?: boolean
  }) => z.string()
    .min(options?.minLength || 8, `パスワードは${options?.minLength || 8}文字以上である必要があります`)
    .max(128, 'パスワードが長すぎます')
    .refine((val) => {
      if (options?.requireNumbers && !/\d/.test(val)) {
        return false
      }
      if (options?.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val)) {
        return false
      }
      if (options?.requireUppercase && !/[A-Z]/.test(val)) {
        return false
      }
      return true
    }, {
      message: 'パスワードの要件を満たしていません'
    }),
  
  // ファイル名
  filename: () => z.string()
    .min(1, 'ファイル名を入力してください')
    .max(255, 'ファイル名が長すぎます')
    .refine((val) => {
      // 危険なファイル名パターンをチェック
      const dangerousPatterns = [
        /[<>:"|?*]/,
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
        /\.\./,
        /^\./,
        /\.$|\.$/
      ]
      
      return !dangerousPatterns.some(pattern => pattern.test(val))
    }, {
      message: '無効なファイル名です'
    }),
  
  // URL
  url: () => z.string()
    .url('有効なURLを入力してください')
    .refine((val) => {
      try {
        const url = new URL(val)
        // HTTPSまたはHTTPのみ許可
        if (!['http:', 'https:'].includes(url.protocol)) {
          return false
        }
        // JavaScriptスキームなどを禁止
        if (url.protocol === 'javascript:' || url.protocol === 'data:') {
          return false
        }
        return true
      } catch {
        return false
      }
    }, {
      message: '許可されていないURLスキームです'
    }),
  
  // 日本語文字を含むテキスト
  japaneseText: (options?: { min?: number; max?: number }) => z.string()
    .min(options?.min || 0)
    .max(options?.max || 1000)
    .refine((val) => {
      // 日本語文字（ひらがな、カタカナ、漢字）または英数字のみ許可
      // Unicode Categoryを使わない単純な範囲指定
      const allowedPattern = /^[あ-んア-ヶ一-龠々a-zA-Z0-9\s\-_.,!?（）()「」【】\n]*$/
      return allowedPattern.test(val)
    }, {
      message: '許可されていない文字が含まれています'
    })
}

/**
 * リクエストデータの一括バリデーション
 */
export function validateRequestData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: {
    stripUnknown?: boolean
    sanitizeStrings?: boolean
    logValidationErrors?: boolean
  } = {}
): T {
  try {
    // 文字列のサニタイズ（オプション）
    if (options.sanitizeStrings && typeof data === 'object' && data !== null) {
      data = sanitizeObjectStrings(data)
    }
    
    // バリデーション実行
    const result = schema.parse(data)
    
    return result
  } catch (error) {
    if (options.logValidationErrors && error instanceof z.ZodError) {
      console.warn('[Validation Error]', {
        errors: error.errors,
        data: typeof data === 'object' ? Object.keys(data as any) : typeof data
      })
    }
    
    throw ApiError.validation(
      'リクエストデータが無効です',
      error instanceof z.ZodError ? 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') :
        'バリデーションエラー'
    )
  }
}

/**
 * オブジェクト内の文字列をサニタイズ
 */
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj === 'string') {
    const maliciousCheck = detectMaliciousPatterns(obj)
    if (maliciousCheck.isMalicious) {
      // 危険なパターンが検出された場合はエスケープ
      return sanitizeString(obj, { escapeHTML: true })
    }
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectStrings(value)
    }
    return sanitized
  }
  
  return obj
}

/**
 * ファイルアップロードバリデーション
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number // bytes
    allowedTypes?: string[]
    allowedExtensions?: string[]
    scanForMalicious?: boolean
  } = {}
): {
  isValid: boolean
  errors: string[]
  sanitizedName: string
} {
  const errors: string[] = []
  
  // ファイルサイズチェック
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`ファイルサイズが制限を超えています (最大: ${options.maxSize / 1024 / 1024}MB)`)
  }
  
  // MIMEタイプチェック
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`許可されていないファイルタイプです (許可: ${options.allowedTypes.join(', ')})`)
  }
  
  // 拡張子チェック
  if (options.allowedExtensions) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !options.allowedExtensions.includes(extension)) {
      errors.push(`許可されていないファイル拡張子です (許可: ${options.allowedExtensions.join(', ')})`)
    }
  }
  
  // ファイル名のサニタイズ
  const sanitizedName = sanitizeString(file.name, {
    escapeHTML: false,
    removeDangerousChars: true,
    maxLength: 255
  }).replace(/[^\w\-_. ]/g, '_')
  
  // 悪意のあるファイル名パターンチェック
  if (options.scanForMalicious) {
    const maliciousCheck = detectMaliciousPatterns(file.name)
    if (maliciousCheck.isMalicious) {
      errors.push('危険なファイル名パターンが検出されました')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName
  }
}

/**
 * バリデーションレポート生成
 */
export function generateValidationReport(
  data: any,
  validationResults: any[]
): {
  summary: {
    total: number
    valid: number
    invalid: number
    malicious: number
  }
  details: Array<{
    field: string
    status: 'valid' | 'invalid' | 'malicious'
    issues?: string[]
  }>
} {
  const summary = {
    total: validationResults.length,
    valid: 0,
    invalid: 0,
    malicious: 0
  }
  
  const details = validationResults.map(result => {
    if (result.isMalicious) {
      summary.malicious++
      return {
        field: result.field,
        status: 'malicious' as const,
        issues: result.detectedPatterns
      }
    } else if (result.isValid) {
      summary.valid++
      return {
        field: result.field,
        status: 'valid' as const
      }
    } else {
      summary.invalid++
      return {
        field: result.field,
        status: 'invalid' as const,
        issues: result.errors
      }
    }
  })
  
  return { summary, details }
}