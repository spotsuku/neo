// Node.jsでログインフローをテスト
const fs = require('fs');

console.log('🔐 認証フローテスト開始');

// 1. auth.jsの内容確認
console.log('\n📄 auth.js の getCurrentUser メソッド:');
const authContent = fs.readFileSync('./out/auth.js', 'utf8');
const currentUserMatch = authContent.match(/getCurrentUser\(\)\s*{[^}]+}/);
if (currentUserMatch) {
    console.log(currentUserMatch[0]);
}

// 2. login.html の保存処理確認
console.log('\n📄 login.html のセッション保存処理:');
const loginContent = fs.readFileSync('./out/login.html', 'utf8');
const storageMatch = loginContent.match(/localStorage\.setItem\('neo_token'[^;]+;/);
if (storageMatch) {
    console.log('✅ neo_token 保存処理あり');
} else {
    console.log('❌ neo_token 保存処理なし');
}

// 3. admin-dashboard.html の認証チェック確認
console.log('\n📄 admin-dashboard.html の認証チェック:');
const adminContent = fs.readFileSync('./out/admin-dashboard.html', 'utf8');
const authCheckMatch = adminContent.match(/authManager\.isLoggedIn\(\)/);
if (authCheckMatch) {
    console.log('✅ isLoggedIn() チェックあり');
} else {
    console.log('❌ isLoggedIn() チェックなし');
}

console.log('\n🎯 テスト完了');
