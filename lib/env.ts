/**
 * 環境変数とCloudflareバインディングの型定義
 */

// Cloudflareバインディングの型定義
export interface CloudflareBindings {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace
  KV: KVNamespace;
  
  // R2 Object Storage
  R2: R2Bucket;
  
  // 環境変数
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  BCRYPT_ROUNDS?: string;
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW?: string;
  
  // SMTP設定
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  
  // 外部API設定
  OPENAI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  
  // セキュリティ設定
  CORS_ORIGINS?: string;
  CSP_NONCE?: string;
  
  // ファイルアップロード設定
  MAX_FILE_SIZE?: string;
  ALLOWED_FILE_TYPES?: string;
  
  // 監査・ログ設定
  LOG_LEVEL?: string;
  AUDIT_LOG_RETENTION?: string;
  
  // 通知設定
  NOTIFICATION_EMAIL?: string;
  WEBHOOK_URL?: string;
}

/**
 * 環境設定管理クラス
 */
export class Environment {
  private env: CloudflareBindings;

  constructor(env: CloudflareBindings) {
    this.env = env;
  }

  // 環境判定
  get isDevelopment(): boolean {
    return this.env.ENVIRONMENT === 'development' || !this.env.ENVIRONMENT;
  }

  get isProduction(): boolean {
    return this.env.ENVIRONMENT === 'production';
  }

  get isStaging(): boolean {
    return this.env.ENVIRONMENT === 'staging';
  }

  // データベース
  get database(): D1Database {
    return this.env.DB;
  }

  // KVストレージ
  get kv(): KVNamespace {
    return this.env.KV;
  }

  // R2ストレージ
  get r2(): R2Bucket {
    return this.env.R2;
  }

  // JWT設定
  get jwtSecret(): string {
    return this.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
  }

  // パスワードハッシュ設定
  get bcryptRounds(): number {
    return parseInt(this.env.BCRYPT_ROUNDS || '10', 10);
  }

  // レート制限設定
  get rateLimitRequests(): number {
    return parseInt(this.env.RATE_LIMIT_REQUESTS || '100', 10);
  }

  get rateLimitWindow(): number {
    return parseInt(this.env.RATE_LIMIT_WINDOW || '3600', 10); // 1時間
  }

  // SMTP設定
  get smtp(): {
    host: string;
    port: number;
    user: string;
    password: string;
    enabled: boolean;
  } {
    return {
      host: this.env.SMTP_HOST || '',
      port: parseInt(this.env.SMTP_PORT || '587', 10),
      user: this.env.SMTP_USER || '',
      password: this.env.SMTP_PASSWORD || '',
      enabled: !!(this.env.SMTP_HOST && this.env.SMTP_USER && this.env.SMTP_PASSWORD)
    };
  }

  // ファイルアップロード設定
  get fileUpload(): {
    maxSize: number;
    allowedTypes: string[];
  } {
    const maxSize = parseInt(this.env.MAX_FILE_SIZE || '10485760', 10); // 10MB
    const allowedTypes = this.env.ALLOWED_FILE_TYPES 
      ? this.env.ALLOWED_FILE_TYPES.split(',').map(t => t.trim())
      : ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'];

    return {
      maxSize,
      allowedTypes
    };
  }

  // CORS設定
  get corsOrigins(): string[] {
    if (!this.env.CORS_ORIGINS) {
      return this.isDevelopment ? ['http://localhost:3000', 'http://localhost:3001'] : [];
    }
    return this.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
  }

  // ログレベル
  get logLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const level = this.env.LOG_LEVEL?.toLowerCase() || 'info';
    return ['debug', 'info', 'warn', 'error'].includes(level) 
      ? level as any 
      : 'info';
  }

  // 監査ログ保持期間（日数）
  get auditLogRetention(): number {
    return parseInt(this.env.AUDIT_LOG_RETENTION || '90', 10);
  }

  // 通知設定
  get notification(): {
    email: string;
    webhookUrl: string;
  } {
    return {
      email: this.env.NOTIFICATION_EMAIL || '',
      webhookUrl: this.env.WEBHOOK_URL || ''
    };
  }

  // 外部API設定
  get openaiApiKey(): string {
    return this.env.OPENAI_API_KEY || '';
  }

  get stripeSecretKey(): string {
    return this.env.STRIPE_SECRET_KEY || '';
  }

  get cloudflareApiToken(): string {
    return this.env.CLOUDFLARE_API_TOKEN || '';
  }

  // CSPノンス
  get cspNonce(): string {
    return this.env.CSP_NONCE || '';
  }

  // 環境変数の検証
  validate(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須チェック（本番環境）
    if (this.isProduction) {
      if (this.jwtSecret === 'default-jwt-secret-change-in-production') {
        errors.push('JWT_SECRET must be set in production');
      }

      if (!this.env.DB) {
        errors.push('DB (D1 Database) binding is required');
      }

      if (!this.env.KV) {
        errors.push('KV (KV Namespace) binding is required');
      }

      if (!this.env.R2) {
        errors.push('R2 (R2 Bucket) binding is required');
      }
    }

    // 警告チェック
    if (!this.smtp.enabled) {
      warnings.push('SMTP settings not configured - email notifications disabled');
    }

    if (!this.openaiApiKey) {
      warnings.push('OpenAI API key not set - AI features disabled');
    }

    if (this.corsOrigins.length === 0 && !this.isProduction) {
      warnings.push('CORS origins not configured');
    }

    // ファイルサイズチェック
    if (this.fileUpload.maxSize > 50 * 1024 * 1024) { // 50MB
      warnings.push('MAX_FILE_SIZE is very large - consider reducing for better performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // デバッグ情報（本番環境では機密情報を除外）
  getDebugInfo(): Record<string, any> {
    const debugInfo: Record<string, any> = {
      environment: this.env.ENVIRONMENT || 'development',
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isStaging: this.isStaging,
      logLevel: this.logLevel,
      fileUpload: this.fileUpload,
      rateLimits: {
        requests: this.rateLimitRequests,
        window: this.rateLimitWindow
      },
      smtp: {
        enabled: this.smtp.enabled,
        host: this.smtp.host,
        port: this.smtp.port,
        // パスワードは除外
      },
      bindings: {
        hasDB: !!this.env.DB,
        hasKV: !!this.env.KV,
        hasR2: !!this.env.R2
      }
    };

    // 本番環境では機密情報を除外
    if (!this.isProduction) {
      debugInfo.corsOrigins = this.corsOrigins;
      debugInfo.validation = this.validate();
    }

    return debugInfo;
  }
}

/**
 * 環境設定のヘルパー関数
 */
export function createEnvironment(env: CloudflareBindings): Environment {
  return new Environment(env);
}

/**
 * 環境変数の型安全な取得
 */
export function getEnvVar(env: CloudflareBindings, key: keyof CloudflareBindings, defaultValue?: string): string {
  return env[key] || defaultValue || '';
}

/**
 * 数値型環境変数の取得
 */
export function getEnvNumber(env: CloudflareBindings, key: keyof CloudflareBindings, defaultValue = 0): number {
  const value = env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * ブール型環境変数の取得
 */
export function getEnvBoolean(env: CloudflareBindings, key: keyof CloudflareBindings, defaultValue = false): boolean {
  const value = env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * JSON型環境変数の取得
 */
export function getEnvJson<T = any>(env: CloudflareBindings, key: keyof CloudflareBindings, defaultValue: T): T {
  const value = env[key];
  if (value === undefined || value === '') return defaultValue;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON from env var ${key}:`, error);
    return defaultValue;
  }
}

/**
 * 環境設定のバリデーター
 */
export class EnvironmentValidator {
  private env: Environment;

  constructor(env: Environment) {
    this.env = env;
  }

  // セキュリティ設定の検証
  validateSecurity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // JWT秘密鍵の強度チェック
    if (this.env.jwtSecret.length < 32) {
      issues.push('JWT secret should be at least 32 characters long');
    }

    // bcryptラウンド数の適切性チェック
    if (this.env.bcryptRounds < 10) {
      issues.push('bcrypt rounds should be at least 10 for security');
    }

    if (this.env.bcryptRounds > 15) {
      issues.push('bcrypt rounds above 15 may cause performance issues');
    }

    // レート制限の設定チェック
    if (this.env.rateLimitRequests > 1000) {
      issues.push('Rate limit is very high - consider reducing for better protection');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // パフォーマンス設定の検証
  validatePerformance(): { valid: boolean; suggestions: string[] } {
    const suggestions: string[] = [];

    // ファイルサイズ制限
    const maxFileSize = this.env.fileUpload.maxSize;
    if (maxFileSize > 25 * 1024 * 1024) { // 25MB
      suggestions.push('Consider reducing MAX_FILE_SIZE for better upload performance');
    }

    // ログレベル
    if (this.env.logLevel === 'debug' && this.env.isProduction) {
      suggestions.push('Debug log level should not be used in production');
    }

    return {
      valid: suggestions.length === 0,
      suggestions
    };
  }
}