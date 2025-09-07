/**
 * Database Service - NEO Portal
 * D1データベースの共通操作・クエリー実行
 */
import { D1Database } from '@cloudflare/workers-types'

export interface DatabaseService {
  db: D1Database
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// データベース接続取得
export function getDatabase(env: { DB: D1Database }): DatabaseService {
  return {
    db: env.DB
  }
}

// 一時的なDatabaseServiceクラス（後で適切に実装）
export class DatabaseService {
  constructor(private db?: D1Database) {}
  
  async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED')
    }
    return executeQuery(this.db, sql, params)
  }
}

// 共通クエリー実行関数
export async function executeQuery<T = any>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).all()
    
    if (!result.success) {
      throw new DatabaseError(
        'Database query failed',
        'QUERY_FAILED',
        result.error
      )
    }
    
    return result.results as T[]
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(
      'Database execution error',
      'EXECUTION_ERROR',
      error
    )
  }
}

// 単一レコード取得
export async function executeQueryFirst<T = any>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).first()
    return result as T | null
  } catch (error) {
    throw new DatabaseError(
      'Database query first error',
      'QUERY_FIRST_ERROR',
      error
    )
  }
}

// INSERT/UPDATE/DELETE実行
export async function executeStatement(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<{ success: boolean; meta?: any }> {
  try {
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).run()
    
    if (!result.success) {
      throw new DatabaseError(
        'Database statement failed',
        'STATEMENT_FAILED',
        result.error
      )
    }
    
    return {
      success: true,
      meta: result.meta
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error
    }
    throw new DatabaseError(
      'Database statement execution error',
      'STATEMENT_ERROR',
      error
    )
  }
}

// トランザクション実行
export async function executeTransaction(
  db: D1Database,
  operations: Array<{ query: string; params?: any[] }>
): Promise<{ success: boolean; results: any[] }> {
  try {
    const statements = operations.map(op => {
      const stmt = db.prepare(op.query)
      return op.params ? stmt.bind(...op.params) : stmt
    })
    
    const results = await db.batch(statements)
    
    return {
      success: results.every(r => r.success),
      results: results.map(r => r.results || r.meta)
    }
  } catch (error) {
    throw new DatabaseError(
      'Database transaction error',
      'TRANSACTION_ERROR',
      error
    )
  }
}

// ヘルスチェック
export async function checkDatabaseHealth(db: D1Database): Promise<boolean> {
  try {
    const result = await executeQueryFirst(db, 'SELECT 1 as health')
    return result?.health === 1
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// デフォルトエクスポート
export default {
  getDatabase,
  executeQuery,
  executeQueryFirst,
  executeStatement,
  executeTransaction,
  checkDatabaseHealth,
  DatabaseError
}