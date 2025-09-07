// Jest テスト環境用の環境変数設定

process.env.NODE_ENV = 'test';
process.env.NEXT_RUNTIME = 'nodejs';

// JWT設定
process.env.JWT_SECRET = 'test-jwt-secret-key-for-jest-testing-only';

// データベース設定（テスト用）
process.env.DATABASE_URL = ':memory:';

// メール設定（テスト用）
process.env.EMAIL_FROM = 'test@neo-digital.jp';

// 2FA設定（テスト用）
process.env.TOTP_SERVICE_NAME = 'NEO Portal (Test)';
process.env.TOTP_ISSUER = 'NEO Digital Test';

// レート制限設定（テスト用：より緩い制限）
process.env.RATE_LIMIT_LOGIN_ATTEMPTS = '10';
process.env.RATE_LIMIT_LOGIN_WINDOW = '300'; // 5分
process.env.RATE_LIMIT_API_REQUESTS = '1000';
process.env.RATE_LIMIT_API_WINDOW = '60'; // 1分

// セキュリティ設定
process.env.BCRYPT_ROUNDS = '4'; // テスト用：高速化のため少ない回数
process.env.ARGON2_MEMORY = '1024'; // テスト用：メモリ使用量を削減

// Cloudflare設定（テスト用ダミー値）
process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
process.env.CLOUDFLARE_DATABASE_ID = 'test-database-id';

// Next.js設定
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// ログレベル（テスト時は警告以上のみ）
process.env.LOG_LEVEL = 'warn';

// タイムゾーン設定
process.env.TZ = 'Asia/Tokyo';