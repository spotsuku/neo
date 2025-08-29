// NEO Digital Platform - OpenAPI Schema Generator
// Zodスキーマから自動でOpenAPI仕様を生成

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Schemas } from './schema-validation';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * ZodスキーマをOpenAPIスキーマに変換
 */
function zodToOpenApiSchema(zodSchema: z.ZodTypeAny): OpenAPIV3.SchemaObject {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });
  
  // OpenAPI形式に調整
  return {
    ...jsonSchema,
    // 不要なプロパティを削除
    $schema: undefined,
    definitions: undefined,
  } as OpenAPIV3.SchemaObject;
}

/**
 * 認証関連のOpenAPIパス定義
 */
function generateAuthPaths(): Record<string, OpenAPIV3.PathItemObject> {
  return {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'ユーザー登録',
        description: '新しいユーザーアカウントを作成します。招待トークンが必要な場合があります。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.Auth.registerRequest),
              example: {
                email: 'user@example.com',
                password: 'SecurePass123!@#',
                name: '山田太郎',
                invitation_token: 'optional-invitation-token'
              }
            }
          }
        },
        responses: {
          '201': {
            description: '登録成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  user: z.object({
                    id: z.string(),
                    email: z.string(),
                    name: z.string(),
                    role: Schemas.UserRole,
                  }),
                  access_token: z.string(),
                  refresh_token: z.string(),
                }))),
              }
            }
          },
          '400': {
            description: 'バリデーションエラー',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          },
          '409': {
            description: 'ユーザー既存エラー',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          }
        }
      }
    },
    
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'ログイン',
        description: 'メールアドレスとパスワードでログインします。2FA有効ユーザーはTOTPコードが必要です。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.Auth.loginRequest),
              example: {
                email: 'user@example.com',
                password: 'SecurePass123!@#',
                totp_code: '123456',
                remember: true
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'ログイン成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  user: z.object({
                    id: z.string(),
                    email: z.string(),
                    name: z.string(),
                    role: Schemas.UserRole,
                    totp_enabled: z.boolean(),
                  }),
                  access_token: z.string(),
                  refresh_token: z.string(),
                  expires_in: z.number(),
                })))
              }
            }
          },
          '401': {
            description: '認証失敗',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          },
          '423': {
            description: 'アカウントロック',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          },
          '429': {
            description: 'レート制限',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          }
        }
      }
    },
    
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'トークンリフレッシュ',
        description: 'リフレッシュトークンを使用して新しいアクセストークンを取得します。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: z.object({
                refresh_token: z.string(),
              }),
            }
          }
        },
        responses: {
          '200': {
            description: 'リフレッシュ成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  access_token: z.string(),
                  refresh_token: z.string(),
                  expires_in: z.number(),
                })))
              }
            }
          },
          '401': {
            description: '無効なリフレッシュトークン',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          }
        }
      }
    },
    
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'ログアウト',
        description: '現在のセッションを無効化してログアウトします。',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'ログアウト成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  message: z.string(),
                })))
              }
            }
          },
          '401': {
            description: '認証が必要',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.error)
              }
            }
          }
        }
      }
    },
    
    '/auth/totp/setup': {
      post: {
        tags: ['Two-Factor Authentication'],
        summary: 'TOTP 2FA設定',
        description: 'TOTPベースの二段階認証を設定します。QRコードとバックアップコードを生成します。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.Auth.totpSetup),
            }
          }
        },
        responses: {
          '200': {
            description: 'TOTP設定成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  qr_code_url: z.string(),
                  backup_codes: z.array(z.string()),
                  secret_key: z.string(),
                })))
              }
            }
          }
        }
      }
    },
    
    '/auth/totp/verify': {
      post: {
        tags: ['Two-Factor Authentication'],
        summary: 'TOTP認証',
        description: 'TOTPコードまたはバックアップコードで二段階認証を行います。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.Auth.totpVerify),
            }
          }
        },
        responses: {
          '200': {
            description: 'TOTP認証成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  verified: z.boolean(),
                  backup_code_used: z.boolean().optional(),
                })))
              }
            }
          }
        }
      }
    },
  };
}

/**
 * ユーザー管理のOpenAPIパス定義
 */
function generateUserPaths(): Record<string, OpenAPIV3.PathItemObject> {
  return {
    '/users': {
      get: {
        tags: ['User Management'],
        summary: 'ユーザー一覧取得',
        description: 'ユーザー一覧を取得します。検索・フィルタリング・ページネーション対応。',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: '検索キーワード',
            schema: { type: 'string' }
          },
          {
            name: 'role',
            in: 'query',
            description: 'ロールフィルター',
            schema: zodToOpenApiSchema(Schemas.UserRole)
          },
          {
            name: 'region_id',
            in: 'query',
            description: '地域フィルター',
            schema: zodToOpenApiSchema(Schemas.RegionId)
          },
          {
            name: 'page',
            in: 'query',
            description: 'ページ番号',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: '1ページあたりの件数',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          }
        ],
        responses: {
          '200': {
            description: 'ユーザー一覧取得成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.paginated(z.object({
                  id: z.string(),
                  email: z.string(),
                  name: z.string(),
                  role: Schemas.UserRole,
                  region_id: Schemas.RegionId,
                  is_active: z.boolean(),
                  created_at: z.string(),
                })))
              }
            }
          }
        }
      },
      post: {
        tags: ['User Management'],
        summary: 'ユーザー作成',
        description: '新しいユーザーを作成します（管理者限定）。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.User.createUser),
            }
          }
        },
        responses: {
          '201': {
            description: 'ユーザー作成成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  id: z.string(),
                  email: z.string(),
                  name: z.string(),
                  role: Schemas.UserRole,
                })))
              }
            }
          }
        }
      }
    },
    
    '/users/{id}': {
      get: {
        tags: ['User Management'],
        summary: 'ユーザー詳細取得',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'ユーザー詳細取得成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  id: z.string(),
                  email: z.string(),
                  name: z.string(),
                  role: Schemas.UserRole,
                  region_id: Schemas.RegionId,
                  accessible_regions: z.array(Schemas.RegionId),
                  is_active: z.boolean(),
                  totp_enabled: z.boolean(),
                  last_login_at: z.string().nullable(),
                  created_at: z.string(),
                  updated_at: z.string(),
                })))
              }
            }
          }
        }
      },
      put: {
        tags: ['User Management'],
        summary: 'ユーザー更新',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(Schemas.User.updateUser),
            }
          }
        },
        responses: {
          '200': {
            description: 'ユーザー更新成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  message: z.string(),
                })))
              }
            }
          }
        }
      }
    }
  };
}

/**
 * システム監視のOpenAPIパス定義
 */
function generateSystemPaths(): Record<string, OpenAPIV3.PathItemObject> {
  return {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'ヘルスチェック',
        description: 'システムの稼働状況を確認します。',
        responses: {
          '200': {
            description: 'システム正常',
            content: {
              'application/json': {
                schema: z.object({
                  status: z.enum(['healthy', 'unhealthy']),
                  timestamp: z.string(),
                  version: z.string(),
                  environment: z.string(),
                  responseTime: z.string(),
                  uptime: z.string(),
                  checks: z.array(z.object({
                    name: z.string(),
                    status: z.enum(['healthy', 'unhealthy']),
                    details: z.any(),
                    timestamp: z.string(),
                  }))
                })
              }
            }
          },
          '503': {
            description: 'システム異常',
            content: {
              'application/json': {
                schema: z.object({
                  status: z.literal('unhealthy'),
                  error: z.string(),
                  timestamp: z.string(),
                })
              }
            }
          }
        }
      }
    },
    
    '/metrics': {
      get: {
        tags: ['System'],
        summary: 'メトリクス取得',
        description: 'システムメトリクスを取得します（管理者限定）。',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'name',
            in: 'query',
            description: 'メトリクス名',
            schema: { type: 'string' }
          },
          {
            name: 'since',
            in: 'query',
            description: '開始時刻（Unix timestamp）',
            schema: { type: 'integer' }
          },
          {
            name: 'format',
            in: 'query',
            description: '出力形式',
            schema: { type: 'string', enum: ['json', 'prometheus'], default: 'json' }
          }
        ],
        responses: {
          '200': {
            description: 'メトリクス取得成功',
            content: {
              'application/json': {
                schema: zodToOpenApiSchema(Schemas.Response.success(z.object({
                  timestamp: z.string(),
                  period: z.object({
                    since: z.string(),
                    until: z.string(),
                  }),
                  summary: z.record(z.any()),
                  totalMetrics: z.number(),
                })))
              },
              'text/plain': {
                schema: {
                  type: 'string',
                  description: 'Prometheus形式のメトリクス'
                }
              }
            }
          }
        }
      }
    }
  };
}

/**
 * 完全なOpenAPI仕様を生成
 */
export function generateOpenApiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'NEO Digital Platform API',
      version: '1.0.0',
      description: `
NEO Digital Platform の包括的API仕様書

## 特徴
- JWT + Refresh Token による安全な認証
- TOTP 2FA (Time-based One-Time Password) サポート
- Argon2id パスワードハッシュ化
- レート制限とセキュリティログ
- RBAC (Role-Based Access Control) 権限管理
- 自動スキーマバリデーション

## 認証フロー
1. \`/auth/register\` または \`/auth/login\` でアクセストークン取得
2. APIリクエストにJWTトークンを \`Authorization: Bearer <token>\` で送信
3. トークン期限切れ時は \`/auth/refresh\` でリフレッシュ
4. 2FA有効ユーザーは \`/auth/totp/verify\` で追加認証が必要

## エラーレスポンス
すべてのエラーは統一された形式で返されます:
\`\`\`json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## テスト用アカウント
- **Owner**: owner@neo-digital.jp / SecurePass123!@#
- **事務局**: secretariat-fuk@neo-digital.jp / SecurePass123!@#
- **企業管理者**: company.admin@example-corp.jp / SecurePass123!@#
- **学生**: student01@neo-digital.jp / SecurePass123!@#
      `,
      contact: {
        name: 'NEO Digital Platform Support',
        email: 'support@neo-digital.jp'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '開発環境'
      },
      {
        url: 'https://neo-platform.pages.dev/api',
        description: '本番環境'
      }
    ],
    paths: {
      ...generateAuthPaths(),
      ...generateUserPaths(),
      ...generateSystemPaths(),
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /auth/login or /auth/register'
        }
      },
      schemas: {
        // 共通スキーマを自動生成
        UserRole: zodToOpenApiSchema(Schemas.UserRole),
        RegionId: zodToOpenApiSchema(Schemas.RegionId),
        LoginRequest: zodToOpenApiSchema(Schemas.Auth.loginRequest),
        RegisterRequest: zodToOpenApiSchema(Schemas.Auth.registerRequest),
        CreateUserRequest: zodToOpenApiSchema(Schemas.User.createUser),
        UpdateUserRequest: zodToOpenApiSchema(Schemas.User.updateUser),
        SuccessResponse: zodToOpenApiSchema(Schemas.Response.success(z.any())),
        ErrorResponse: zodToOpenApiSchema(Schemas.Response.error),
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: '認証・セッション管理API'
      },
      {
        name: 'Two-Factor Authentication',
        description: 'TOTP二段階認証API'
      },
      {
        name: 'User Management',
        description: 'ユーザー管理API'
      },
      {
        name: 'System',
        description: 'システム監視・メトリクスAPI'
      }
    ]
  };
}

/**
 * スキーマ整合性検証
 */
export function validateApiSchemas(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // OpenAPI仕様の構文チェック
    const spec = generateOpenApiSpec();
    
    // 必須フィールドの確認
    if (!spec.info?.title) errors.push('API title is missing');
    if (!spec.info?.version) errors.push('API version is missing');
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No API paths defined');
    }
    
    // セキュリティスキームの確認
    if (!spec.components?.securitySchemes?.BearerAuth) {
      warnings.push('Bearer authentication scheme is not defined');
    }
    
    // パス別検証
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) {
        errors.push(`Path ${path} has no operations`);
        return;
      }
      
      // HTTP メソッド検証
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      const hasOperations = methods.some(method => method in pathItem);
      
      if (!hasOperations) {
        warnings.push(`Path ${path} has no HTTP operations`);
      }
    });
    
  } catch (error) {
    errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// デフォルトエクスポート
export default generateOpenApiSpec;