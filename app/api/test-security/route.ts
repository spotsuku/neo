/**
 * セキュリティ機能テスト用API Route
 * レート制限、入力バリデーション、セキュリティヘッダーの動作確認
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecurityMiddleware, applySecurityToResponse, SECURITY_PRESETS } from '@/lib/security-middleware'
import { ApiError } from '@/lib/api-error'
import { detectMaliciousPatterns, validateRequestData, secureValidators } from '@/lib/input-validation'
import { z } from 'zod'

// テスト用のスキーマ
const testSchema = z.object({
  message: secureValidators.safeString({ min: 1, max: 500 }),
  email: secureValidators.email().optional(),
  url: secureValidators.url().optional(),
  type: z.enum(['safe', 'xss', 'sql', 'command']).optional()
})

// セキュリティミドルウェアインスタンス
const securityMiddleware = createSecurityMiddleware(SECURITY_PRESETS.public)

export async function GET(request: NextRequest) {
  try {
    // セキュリティミドルウェア適用
    const securityResult = await securityMiddleware(request)
    
    if (!securityResult.proceed) {
      return securityResult.response!
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type')
    const input = searchParams.get('input')

    let result: any = {
      message: 'セキュリティテストAPI',
      timestamp: new Date().toISOString(),
      clientIP: securityResult.securityContext.clientIP,
      rateLimitInfo: securityResult.securityContext.rateLimitHeaders
    }

    switch (testType) {
      case 'headers':
        result = {
          ...result,
          description: 'セキュリティヘッダーのテスト',
          headers: Object.fromEntries(request.headers.entries())
        }
        break

      case 'validation':
        if (input) {
          const maliciousCheck = detectMaliciousPatterns(input)
          result = {
            ...result,
            description: '入力バリデーションテスト',
            input,
            validation: maliciousCheck,
            safe: !maliciousCheck.isMalicious
          }
        }
        break

      case 'ratelimit':
        result = {
          ...result,
          description: 'レート制限テスト',
          rateLimitStatus: securityResult.securityContext.rateLimitHeaders,
          note: '連続してリクエストを送信してレート制限を確認してください'
        }
        break

      default:
        result.availableTests = [
          'headers - セキュリティヘッダーの確認',
          'validation - 入力バリデーションテスト (?type=validation&input=<test_string>)',
          'ratelimit - レート制限テスト'
        ]
    }

    const response = NextResponse.json(result)
    return applySecurityToResponse(response, request, securityResult.securityContext)

  } catch (error) {
    console.error('[Security Test API]', error)
    
    if (error instanceof ApiError) {
      return error.toResponse()
    }
    
    return NextResponse.json(
      { error: 'セキュリティテスト中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // セキュリティミドルウェア適用
    const securityResult = await securityMiddleware(request)
    
    if (!securityResult.proceed) {
      return securityResult.response!
    }

    // リクエストボディの取得と検証
    let data: any
    try {
      data = await request.json()
    } catch (error) {
      throw ApiError.validation('無効なJSONデータです')
    }

    // バリデーション実行
    const validatedData = validateRequestData(data, testSchema, {
      sanitizeStrings: true,
      logValidationErrors: true
    })

    // テストタイプ別の処理
    let result: any = {
      message: 'POSTリクエストが正常に処理されました',
      timestamp: new Date().toISOString(),
      receivedData: validatedData,
      securityInfo: {
        clientIP: securityResult.securityContext.clientIP,
        validationIssues: securityResult.securityContext.validationIssues,
        rateLimitHeaders: securityResult.securityContext.rateLimitHeaders
      }
    }

    // 意図的な脆弱性テスト（テスト環境でのみ使用）
    if (validatedData.type) {
      result.testResult = await performSecurityTest(validatedData.type, validatedData.message)
    }

    const response = NextResponse.json(result, { status: 201 })
    return applySecurityToResponse(response, request, securityResult.securityContext)

  } catch (error) {
    console.error('[Security Test API POST]', error)
    
    if (error instanceof ApiError) {
      return error.toResponse()
    }
    
    return NextResponse.json(
      { error: 'セキュリティテスト中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * セキュリティテストの実行
 */
async function performSecurityTest(
  type: string, 
  input: string
): Promise<{
  testType: string
  input: string
  result: 'blocked' | 'sanitized' | 'passed'
  details: any
}> {
  const maliciousCheck = detectMaliciousPatterns(input)
  
  switch (type) {
    case 'xss':
      return {
        testType: 'XSS Detection Test',
        input,
        result: maliciousCheck.detectedPatterns.includes('XSS') ? 'blocked' : 'passed',
        details: {
          patterns: maliciousCheck.detectedPatterns,
          riskLevel: maliciousCheck.riskLevel,
          isMalicious: maliciousCheck.isMalicious
        }
      }

    case 'sql':
      return {
        testType: 'SQL Injection Detection Test',
        input,
        result: maliciousCheck.detectedPatterns.includes('SQL Injection') ? 'blocked' : 'passed',
        details: {
          patterns: maliciousCheck.detectedPatterns,
          riskLevel: maliciousCheck.riskLevel,
          isMalicious: maliciousCheck.isMalicious
        }
      }

    case 'command':
      return {
        testType: 'Command Injection Detection Test',
        input,
        result: maliciousCheck.detectedPatterns.includes('Command Injection') ? 'blocked' : 'passed',
        details: {
          patterns: maliciousCheck.detectedPatterns,
          riskLevel: maliciousCheck.riskLevel,
          isMalicious: maliciousCheck.isMalicious
        }
      }

    case 'safe':
    default:
      return {
        testType: 'Safe Input Test',
        input,
        result: 'passed',
        details: {
          patterns: maliciousCheck.detectedPatterns,
          riskLevel: maliciousCheck.riskLevel,
          isMalicious: maliciousCheck.isMalicious
        }
      }
  }
}