// NEO Portal OpenAPI Specification
// Swagger/OpenAPI 3.0 仕様書生成

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NEO Portal API',
    version: '1.0.0',
    description: `
NEO Portal の認証・セキュリティAPI仕様書

## 特徴
- JWT + Refresh Token による安全な認証
- TOTP 2FA (Time-based One-Time Password) サポート
- Argon2id パスワードハッシュ化
- レート制限とセキュリティログ
- RBAC (Role-Based Access Control) 権限管理

## 認証フロー
1. \`/auth/register\` または \`/auth/login\` でアクセストークン取得
2. APIリクエストにJWTトークンを \`Authorization: Bearer <token>\` で送信
3. トークン期限切れ時は \`/auth/refresh\` でリフレッシュ
4. 2FA有効ユーザーは \`/auth/totp/verify\` で追加認証が必要

## エラーレスポンス
すべてのエラーは以下の形式で返されます:
\`\`\`json
{
  "error": "ERROR_CODE",
  "message": "エラーの説明",
  "details": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`
    `,
    contact: {
      name: 'NEO Portal Support',
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
      url: 'https://neo-portal.pages.dev/api',
      description: '本番環境'
    }
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'ユーザー登録',
        description: '新規ユーザーアカウントを作成します。招待トークンがある場合は適切なロールが付与されます。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'メールアドレス'
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'パスワード（8文字以上、英大小文字・数字含む）'
                  },
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: '表示名'
                  },
                  invitation_token: {
                    type: 'string',
                    description: '招待トークン（オプション）'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: '登録成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { $ref: '#/components/responses/Conflict' },
          429: { $ref: '#/components/responses/RateLimit' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'ログイン',
        description: 'メールアドレスとパスワードでログインします。2FA有効ユーザーはTOTPトークンも必要です。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'メールアドレス'
                  },
                  password: {
                    type: 'string',
                    description: 'パスワード'
                  },
                  totp_token: {
                    type: 'string',
                    pattern: '^[0-9]{6}$',
                    description: 'TOTP認証コード（2FA有効時必須）'
                  },
                  remember_me: {
                    type: 'boolean',
                    default: false,
                    description: 'ログイン状態を長期保持'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'ログイン成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          423: { $ref: '#/components/responses/AccountLocked' },
          428: { $ref: '#/components/responses/TOTPRequired' },
          429: { $ref: '#/components/responses/RateLimit' }
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
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: {
                  refresh_token: {
                    type: 'string',
                    description: 'リフレッシュトークン'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'リフレッシュ成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'ログアウト',
        description: 'セッションを無効化してログアウトします。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  all_sessions: {
                    type: 'boolean',
                    default: false,
                    description: '全デバイスからログアウト'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'ログアウト成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        tags: ['Authentication'],
        summary: 'ログアウト（GET）',
        description: 'GETメソッドでのシンプルログアウト',
        responses: {
          200: {
            description: 'ログアウト成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                  }
                }
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
        description: 'TOTP 2段階認証を設定します。QRコード生成と検証の2段階プロセス。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: {
                    type: 'string',
                    enum: ['generate', 'verify'],
                    description: 'generate: QRコード生成, verify: 設定確定'
                  },
                  token: {
                    type: 'string',
                    pattern: '^[0-9]{6}$',
                    description: '認証コード（verify時必須）'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'TOTP設定成功',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      title: 'QR生成レスポンス',
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                          type: 'object',
                          properties: {
                            qr_code: { type: 'string', description: 'QRコードDataURL' },
                            secret_key: { type: 'string', description: '秘密鍵' },
                            backup_codes: {
                              type: 'array',
                              items: { type: 'string' },
                              description: 'バックアップコード'
                            }
                          }
                        }
                      }
                    },
                    {
                      title: '設定確定レスポンス',
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                          type: 'object',
                          properties: {
                            totp_enabled: { type: 'boolean' },
                            enabled_at: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { $ref: '#/components/responses/Conflict' }
        }
      }
    },
    '/auth/totp/verify': {
      post: {
        tags: ['Two-Factor Authentication'],
        summary: 'TOTP認証',
        description: 'TOTP認証コードまたはバックアップコードで2段階認証を完了します。',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: {
                    type: 'string',
                    description: '6桁の認証コードまたはバックアップコード'
                  },
                  backup_code: {
                    type: 'boolean',
                    default: false,
                    description: 'バックアップコード使用フラグ'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'TOTP認証成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        totp_verified: { type: 'boolean' },
                        access_token: { type: 'string' },
                        expires_in: { type: 'integer' },
                        backup_code_used: { type: 'boolean' },
                        remaining_backup_codes: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/password-reset/request': {
      post: {
        tags: ['Password Reset'],
        summary: 'パスワードリセット要求',
        description: 'パスワードリセット用のメールを送信します。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'リセット対象のメールアドレス'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'リセット要求受付（メール送信）',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        expires_in: { type: 'integer', description: '有効期限（秒）' },
                        expires_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          429: { $ref: '#/components/responses/RateLimit' }
        }
      }
    },
    '/auth/password-reset/confirm': {
      post: {
        tags: ['Password Reset'],
        summary: 'パスワードリセット実行',
        description: 'リセットトークンを使用してパスワードを変更します。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'new_password'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'パスワードリセットトークン'
                  },
                  new_password: {
                    type: 'string',
                    minLength: 8,
                    description: '新しいパスワード'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'パスワード変更成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        password_changed_at: { type: 'string', format: 'date-time' },
                        sessions_revoked: { type: 'boolean' },
                        totp_disabled: { type: 'boolean' },
                        next_steps: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWTアクセストークンを使用します'
      }
    },
    schemas: {
      AuthSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['owner', 'secretariat', 'company_admin', 'student'] },
              region_id: { type: 'string', enum: ['FUK', 'ISK', 'NIG', 'ALL'] },
              accessible_regions: {
                type: 'array',
                items: { type: 'string', enum: ['FUK', 'ISK', 'NIG', 'ALL'] }
              },
              totp_enabled: { type: 'boolean' },
              totp_verified: { type: 'boolean' },
              email_verified: { type: 'boolean' }
            }
          },
          tokens: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
              expires_in: { type: 'integer', description: '有効期限（秒）' }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'リクエストエラー',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Unauthorized: {
        description: '認証エラー',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Forbidden: {
        description: '権限不足',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Conflict: {
        description: 'データ競合',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      AccountLocked: {
        description: 'アカウントロック',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    lockedUntil: { type: 'string', format: 'date-time' }
                  }
                }
              ]
            }
          }
        }
      },
      TOTPRequired: {
        description: '2FA認証必須',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    requires_totp: { type: 'boolean' }
                  }
                }
              ]
            }
          }
        }
      },
      RateLimit: {
        description: 'レート制限',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    resetAt: { type: 'string', format: 'date-time' }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: '基本認証機能（登録・ログイン・ログアウト）'
    },
    {
      name: 'Two-Factor Authentication',
      description: 'TOTP 2段階認証機能'
    },
    {
      name: 'Password Reset',
      description: 'パスワードリセット機能'
    }
  ]
} as const;