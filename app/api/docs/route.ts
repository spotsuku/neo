// NEO Portal - API Documentation (Swagger UI)
// GET /api/docs

import { NextRequest } from 'next/server';
import generateOpenApiSpec from '@/lib/openapi-generator';

export const GET = async (request: NextRequest) => {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  // JSON形式でのOpenAPI仕様書
  if (format === 'json') {
    return new Response(JSON.stringify(generateOpenApiSpec(), null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  // Swagger UI HTML
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEO Portal API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
    <style>
      html {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
      }
      
      *, *:before, *:after {
        box-sizing: inherit;
      }

      body {
        margin:0;
        background: #fafafa;
      }

      .swagger-ui .topbar {
        background-color: #2563eb;
      }

      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }

      .custom-header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 20px;
        text-align: center;
        margin-bottom: 0;
      }

      .custom-header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: bold;
      }

      .custom-header p {
        margin: 10px 0 0 0;
        opacity: 0.9;
        font-size: 1.1rem;
      }

      .auth-info {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin: 20px auto;
        max-width: 1200px;
      }

      .auth-info h3 {
        margin-top: 0;
        color: #1e293b;
      }

      .auth-info code {
        background: #e2e8f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
      }
    </style>
</head>
<body>
    <div class="custom-header">
        <h1>🚀 NEO Portal API</h1>
        <p>認証・セキュリティAPI仕様書 v1.0.0</p>
    </div>

    <div class="auth-info">
        <h3>🔐 認証テスト方法</h3>
        <p><strong>1. ログインしてトークンを取得:</strong></p>
        <p>POST <code>/api/auth/login</code> で以下のテストユーザーでログイン</p>
        <ul>
            <li><code>owner@neo-digital.jp</code> (パスワード: password123) - オーナー権限</li>
            <li><code>secretariat-fuk@neo-digital.jp</code> (パスワード: password123) - 事務局権限</li>
            <li><code>company.admin@example-corp.jp</code> (パスワード: password123) - 企業管理者権限</li>
        </ul>
        <p><strong>2. 認証が必要なAPIをテスト:</strong></p>
        <p>Swagger UIの「Authorize」ボタンをクリックし、レスポンスの <code>access_token</code> を入力</p>
        <p>形式: <code>Bearer eyJhbGciOiJIUzI1NiI...</code></p>
    </div>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function() {
        const ui = SwaggerUIBundle({
          spec: ${JSON.stringify(generateOpenApiSpec())},
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.presets.standalone
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: 'list',
          filter: true,
          showRequestHeaders: true,
          showCommonExtensions: true,
          tryItOutEnabled: true,
          requestInterceptor: function(req) {
            // リクエストログ
            console.log('API Request:', req);
            return req;
          },
          responseInterceptor: function(res) {
            // レスポンスログ
            console.log('API Response:', res);
            return res;
          },
          onComplete: function() {
            console.log('Swagger UI loaded successfully');
          }
        });

        // カスタマイゼーション
        window.ui = ui;
      }
    </script>
</body>
</html>
  `;

  return new Response(swaggerHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

// OPTIONS method for CORS
export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
};