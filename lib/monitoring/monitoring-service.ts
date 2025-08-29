/**
 * 監視・ログ・エラー追跡サービス - Step 15 Monitoring & Error Tracking
 * NEO Digital Platform
 */
export class MonitoringService {
  static logError(error: Error, context?: Record<string, any>): void {
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    })
  }

  static logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    console.log('Performance Log:', {
      operation,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      metadata
    })
  }

  static logSecurity(event: string, userId?: string, details?: Record<string, any>): void {
    console.warn('Security Event:', {
      event,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details
    })
  }
}