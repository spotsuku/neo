#!/usr/bin/env node

const DB = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// ローカルD1データベースへの接続
const dbPath = path.join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject', 'local-development-db.sqlite');

console.log('🔍 認証システムセキュリティテスト開始');
console.log('📁 データベースパス:', dbPath);

try {
  const db = new DB(dbPath);
  
  // 1. データベース接続テスト
  console.log('\n1️⃣ データベース接続テスト');
  const users = db.prepare('SELECT id, email, name, role, totp_enabled FROM users').all();
  console.log('✅ ユーザー一覧:', users.length, '人');
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) [${user.role}] 2FA: ${user.totp_enabled ? '有効' : '無効'}`);
  });
  
  // 2. セッション管理テスト
  console.log('\n2️⃣ セッション管理テスト');
  const sessions = db.prepare('SELECT * FROM auth_sessions').all();
  console.log('✅ 既存セッション数:', sessions.length);
  
  // 3. レート制限テスト
  console.log('\n3️⃣ レート制限テスト');
  const rateLimits = db.prepare('SELECT * FROM rate_limits').all();
  console.log('✅ レート制限エントリ数:', rateLimits.length);
  
  // 4. 招待トークンテスト
  console.log('\n4️⃣ 招待トークンテスト');
  const invitations = db.prepare('SELECT * FROM invitations').all();
  console.log('✅ 招待トークン数:', invitations.length);
  
  // 5. TOTP設定テスト
  console.log('\n5️⃣ TOTP設定テスト');
  const totpConfigs = db.prepare('SELECT * FROM totp_configs').all();
  console.log('✅ TOTP設定数:', totpConfigs.length);
  
  // 6. セキュリティログテスト
  console.log('\n6️⃣ セキュリティログテスト');
  const securityLogs = db.prepare('SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 5').all();
  console.log('✅ 最新セキュリティログ:', securityLogs.length, 'エントリ');
  
  db.close();
  console.log('\n🎉 認証システムの基本データベース構造は正常です！');
  
} catch (error) {
  console.error('❌ データベーステスト失敗:', error.message);
  console.log('💡 Next.jsアプリケーションの動的テストが必要です。');
}

console.log('\n📝 次のステップ:');
console.log('1. 認証APIエンドポイントの動的テスト');
console.log('2. JWT トークン生成・検証テスト');
console.log('3. TOTP 2FA機能テスト');
console.log('4. レート制限機能テスト');
console.log('5. OpenAPI/Swagger ドキュメント確認');