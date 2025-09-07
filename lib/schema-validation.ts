// NEO Portal - Schema Validation System
// APIスキーマ自動生成とリクエスト/レスポンスバリデーション

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './monitoring';

// 共通バリデーションスキーマ

// 日本語エラーメッセージ
const errorMessages = {
  required: '必須項目です',
  invalid_type: '正しい形式で入力してください',
  email: '有効なメールアドレスを入力してください',
  min_length: (min: number) => `${min}文字以上で入力してください`,
  max_length: (max: number) => `${max}文字以下で入力してください`,
  password: 'パスワードは8文字以上で、大文字・小文字・数字・記号を含む必要があります',
  uuid: '有効なID形式ではありません',
  phone: '有効な電話番号を入力してください',
  url: '有効なURLを入力してください',
  date: '有効な日付を入力してください',
};

// 基本型定義
export const BaseSchema = {
  // ID系
  id: z.string().uuid({ message: errorMessages.uuid }),
  email: z.string().email({ message: errorMessages.email }),
  
  // パスワード（強度チェック付き）
  password: z.string()
    .min(8, { message: errorMessages.min_length(8) })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: errorMessages.password
    }),
  
  // 名前
  name: z.string()
    .min(1, { message: errorMessages.required })
    .max(100, { message: errorMessages.max_length(100) }),
  
  // 電話番号（日本の形式）
  phone: z.string()
    .regex(/^(0[5-9]0[0-9]{8}|0[1-9][1-9][0-9]{7})$/, { 
      message: errorMessages.phone 
    })
    .optional(),
  
  // URL
  url: z.string().url({ message: errorMessages.url }).optional(),
  
  // 日付
  date: z.coerce.date({ 
    errorMap: () => ({ message: errorMessages.date }) 
  }),
  
  // ページネーション
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  
  // ソート
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().optional(),
};

// ユーザーロール
export const UserRoleSchema = z.enum(['owner', 'secretariat', 'company_admin', 'student']);

// 地域ID
export const RegionIdSchema = z.enum(['ALL', 'FUK', 'ISK', 'NIG']);

// 認証関連スキーマ
export const AuthSchemas = {
  // ログインリクエスト
  loginRequest: z.object({
    email: BaseSchema.email,
    password: z.string().min(1, { message: errorMessages.required }),
    totp_code: z.string().length(6).optional(),
    remember: z.boolean().optional(),
  }),
  
  // 登録リクエスト
  registerRequest: z.object({
    email: BaseSchema.email,
    password: BaseSchema.password,
    name: BaseSchema.name,
    invitation_token: z.string().optional(),
  }),
  
  // パスワードリセット要求
  passwordResetRequest: z.object({
    email: BaseSchema.email,
  }),
  
  // パスワードリセット確認
  passwordResetConfirm: z.object({
    token: z.string().min(1, { message: errorMessages.required }),
    password: BaseSchema.password,
  }),
  
  // TOTP設定
  totpSetup: z.object({
    secret_key: z.string().min(1, { message: errorMessages.required }),
    totp_code: z.string().length(6, { message: '6桁のコードを入力してください' }),
  }),
  
  // TOTP認証
  totpVerify: z.object({
    totp_code: z.string().length(6, { message: '6桁のコードを入力してください' }),
    backup_code: z.string().optional(),
  }),
};

// ユーザー関連スキーマ
export const UserSchemas = {
  // ユーザー作成
  createUser: z.object({
    email: BaseSchema.email,
    name: BaseSchema.name,
    role: UserRoleSchema,
    region_id: RegionIdSchema,
    accessible_regions: z.array(RegionIdSchema),
    company_id: BaseSchema.id.optional(),
  }),
  
  // ユーザー更新
  updateUser: z.object({
    name: BaseSchema.name.optional(),
    role: UserRoleSchema.optional(),
    region_id: RegionIdSchema.optional(),
    accessible_regions: z.array(RegionIdSchema).optional(),
    is_active: z.boolean().optional(),
    profile_image: BaseSchema.url,
  }),
  
  // ユーザー検索
  searchUsers: z.object({
    q: z.string().optional(),
    role: UserRoleSchema.optional(),
    region_id: RegionIdSchema.optional(),
    is_active: z.boolean().optional(),
    page: BaseSchema.page,
    limit: BaseSchema.limit,
    sort: BaseSchema.sort,
  }),
};

// 企業関連スキーマ
export const CompanySchemas = {
  createCompany: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    website: BaseSchema.url,
    phone: BaseSchema.phone,
    email: BaseSchema.email.optional(),
    address: z.string().max(500).optional(),
    region_id: RegionIdSchema,
  }),
  
  updateCompany: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    website: BaseSchema.url,
    phone: BaseSchema.phone,
    email: BaseSchema.email.optional(),
    address: z.string().max(500).optional(),
  }),
};

// お知らせ関連スキーマ
export const AnnouncementSchemas = {
  createAnnouncement: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(10000),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    target_regions: z.array(RegionIdSchema).optional(),
    target_roles: z.array(UserRoleSchema).optional(),
    published_at: BaseSchema.date.optional(),
    expires_at: BaseSchema.date.optional(),
  }),
  
  updateAnnouncement: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    target_regions: z.array(RegionIdSchema).optional(),
    target_roles: z.array(UserRoleSchema).optional(),
    published_at: BaseSchema.date.optional(),
    expires_at: BaseSchema.date.optional(),
  }),
};

// 共通レスポンススキーマ
export const ResponseSchemas = {
  // 成功レスポンス
  success: <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string(),
  }),
  
  // エラーレスポンス
  error: z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string(),
    details: z.record(z.any()).optional(),
    timestamp: z.string(),
  }),
  
  // ページネーションレスポンス
  paginated: <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    timestamp: z.string(),
  }),
};

/**
 * リクエストバリデーションミドルウェア
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return async (request: NextRequest): Promise<{
    success: boolean;
    data?: z.infer<T>;
    error?: string;
    details?: any;
  }> => {
    try {
      const contentType = request.headers.get('content-type');
      let body: any;
      
      if (contentType?.includes('application/json')) {
        body = await request.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData);
      } else {
        // GET リクエストの場合はクエリパラメータを使用
        const url = new URL(request.url);
        body = Object.fromEntries(url.searchParams);
      }
      
      const result = schema.safeParse(body);
      
      if (!result.success) {
        const errorDetails = result.error.errors.reduce((acc, error) => {
          const path = error.path.join('.');
          acc[path] = error.message;
          return acc;
        }, {} as Record<string, string>);
        
        logger.warn('Request validation failed', {
          path: new URL(request.url).pathname,
          method: request.method,
          errors: errorDetails,
        });
        
        return {
          success: false,
          error: 'バリデーションエラー',
          details: errorDetails,
        };
      }
      
      return {
        success: true,
        data: result.data,
      };
      
    } catch (error) {
      logger.error('Request parsing failed', error as Error);
      
      return {
        success: false,
        error: 'リクエストの解析に失敗しました',
      };
    }
  };
}

/**
 * レスポンスバリデーション
 */
export function validateResponse<T extends z.ZodTypeAny>(
  schema: T, 
  data: unknown
): {
  success: boolean;
  data?: z.infer<T>;
  error?: string;
} {
  try {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      logger.error('Response validation failed', undefined, {
        errors: result.error.errors,
        data,
      });
      
      return {
        success: false,
        error: 'レスポンス形式エラー',
      };
    }
    
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    logger.error('Response validation error', error as Error);
    
    return {
      success: false,
      error: 'レスポンス検証エラー',
    };
  }
}

/**
 * APIエンドポイント用バリデーションヘルパー
 */
export function createValidatedHandler<
  TRequest extends z.ZodTypeAny,
  TResponse extends z.ZodTypeAny
>(
  requestSchema: TRequest,
  responseSchema: TResponse,
  handler: (
    data: z.infer<TRequest>,
    request: NextRequest
  ) => Promise<z.infer<TResponse>>
) {
  return async (request: NextRequest) => {
    // リクエストバリデーション
    const validation = await validateRequest(requestSchema);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        code: 'VALIDATION_ERROR',
        details: validation.details,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    try {
      // ハンドラー実行
      const result = await handler(validation.data!, request);
      
      // レスポンスバリデーション（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        const responseValidation = validateResponse(responseSchema, result);
        if (!responseValidation.success) {
          logger.error('Response schema mismatch', undefined, { result });
        }
      }
      
      return NextResponse.json(result);
      
    } catch (error) {
      logger.error('Handler execution failed', error as Error);
      
      return NextResponse.json({
        success: false,
        error: 'サーバーエラー',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  };
}

/**
 * スキーマからTypeScript型生成（ビルド時実行）
 */
export function generateTypeDefinitions() {
  // TODO: ビルド時にTypeScript型定義ファイルを生成
  // zodスキーマから自動でinterface定義を作成
}

/**
 * データベーススキーマとの整合性チェック
 */
export async function validateDatabaseSchema() {
  // TODO: データベーススキーマとAPIスキーマの整合性確認
  // マイグレーションファイルとzodスキーマの比較
}

// スキーマエクスポート
export const Schemas = {
  Base: BaseSchema,
  Auth: AuthSchemas,
  User: UserSchemas,
  Company: CompanySchemas,
  Announcement: AnnouncementSchemas,
  Response: ResponseSchemas,
  UserRole: UserRoleSchema,
  RegionId: RegionIdSchema,
};

// バリデーション関数は上記で既に個別エクスポート済み