#!/usr/bin/env node
/**
 * セキュリティテストスクリプト
 * 脆弱性スキャンとセキュリティチェック
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// セキュリティテスト設定
const SECURITY_CONFIG = {
  baseUrl: 'http://localhost:3000',
  production: {
    baseUrl: 'https://neo-portal.pages.dev'
  },
  testCategories: [
    'authentication',
    'authorization', 
    'input_validation',
    'sql_injection',
    'xss',
    'csrf',
    'headers',
    'information_disclosure',
    'file_upload',
    'rate_limiting'
  ]
};

/**
 * セキュリティテストエンジン
 */
class SecurityTester {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.vulnerabilities = [];
  }

  /**
   * HTTPリクエストの実行
   */
  async makeRequest(path, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      expectError = false
    } = options;

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          'User-Agent': 'SecurityTester/1.0',
          ...headers
        },
        body: body ? JSON.stringify(body) : null
      });

      const text = await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        success: !expectError ? response.ok : !response.ok
      };
    } catch (error) {
      return {
        status: 0,
        headers: {},
        body: '',
        error: error.message,
        success: expectError
      };
    }
  }

  /**
   * 脆弱性レポートの追加
   */
  addVulnerability(severity, category, title, description, evidence = null) {
    this.vulnerabilities.push({
      id: crypto.randomUUID(),
      severity, // 'critical', 'high', 'medium', 'low', 'info'
      category,
      title,
      description,
      evidence,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * テスト結果の追加
   */
  addResult(test, passed, details = null) {
    this.results.push({
      test,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 認証テスト
   */
  async testAuthentication() {
    console.log('🔐 認証システムテスト開始');

    // 1. 未認証でのアクセステスト
    const protectedPaths = ['/admin/dashboard', '/api/monitoring/dashboard'];
    
    for (const path of protectedPaths) {
      const response = await this.makeRequest(path);
      
      if (response.status !== 401 && response.status !== 403) {
        this.addVulnerability(
          'high',
          'authentication',
          '認証なしでの保護リソースアクセス',
          `保護されるべきパス ${path} に認証なしでアクセス可能: HTTP ${response.status}`
        );
        this.addResult(`Auth check: ${path}`, false, response.status);
      } else {
        this.addResult(`Auth check: ${path}`, true, response.status);
      }
    }

    // 2. 不正なトークンテスト
    const invalidTokens = [
      'invalid-token',
      'Bearer invalid',
      'Bearer ',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      'null',
      'undefined'
    ];

    for (const token of invalidTokens) {
      const response = await this.makeRequest('/api/monitoring/dashboard', {
        headers: { 'Authorization': token }
      });

      if (response.status === 200) {
        this.addVulnerability(
          'critical',
          'authentication',
          '不正トークンでの認証迂回',
          `不正なトークン "${token}" で認証が成功`
        );
        this.addResult(`Invalid token: ${token}`, false);
      } else {
        this.addResult(`Invalid token: ${token}`, true);
      }
    }

    console.log('✅ 認証システムテスト完了');
  }

  /**
   * 入力値検証テスト
   */
  async testInputValidation() {
    console.log('📝 入力値検証テスト開始');

    // SQLインジェクションペイロード
    const sqlPayloads = [
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'/*",
      "' OR 'x'='x",
      "1'; WAITFOR DELAY '00:00:05' --"
    ];

    // XSSペイロード
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'; alert('XSS'); //"
    ];

    // APIエンドポイントでのテスト
    const testEndpoints = [
      { path: '/api/search', param: 'q' },
      { path: '/api/users', param: 'email' }
    ];

    for (const endpoint of testEndpoints) {
      // SQLインジェクションテスト
      for (const payload of sqlPayloads) {
        const testPath = `${endpoint.path}?${endpoint.param}=${encodeURIComponent(payload)}`;
        const response = await this.makeRequest(testPath);

        if (this.detectSQLError(response.body)) {
          this.addVulnerability(
            'high',
            'sql_injection',
            'SQLインジェクション脆弱性',
            `エンドポイント ${endpoint.path} でSQLエラーを検出`,
            payload
          );
          this.addResult(`SQL injection: ${endpoint.path}`, false, payload);
        } else {
          this.addResult(`SQL injection: ${endpoint.path}`, true, payload);
        }
      }

      // XSSテスト
      for (const payload of xssPayloads) {
        const testPath = `${endpoint.path}?${endpoint.param}=${encodeURIComponent(payload)}`;
        const response = await this.makeRequest(testPath);

        if (response.body.includes(payload.replace(/[<>"]/g, ''))) {
          this.addVulnerability(
            'medium',
            'xss',
            'クロスサイトスクリプティング脆弱性',
            `エンドポイント ${endpoint.path} でXSS脆弱性を検出`,
            payload
          );
          this.addResult(`XSS: ${endpoint.path}`, false, payload);
        } else {
          this.addResult(`XSS: ${endpoint.path}`, true, payload);
        }
      }
    }

    console.log('✅ 入力値検証テスト完了');
  }

  /**
   * セキュリティヘッダーテスト
   */
  async testSecurityHeaders() {
    console.log('🛡️ セキュリティヘッダーテスト開始');

    const response = await this.makeRequest('/');
    const headers = response.headers;

    // 必須セキュリティヘッダーのチェック
    const requiredHeaders = {
      'strict-transport-security': {
        severity: 'medium',
        description: 'HTTPS強制のためのHSTSヘッダーが不足'
      },
      'content-security-policy': {
        severity: 'high', 
        description: 'XSS防止のためのCSPヘッダーが不足'
      },
      'x-content-type-options': {
        severity: 'medium',
        description: 'MIMEタイプスニッフィング防止ヘッダーが不足'
      },
      'x-frame-options': {
        severity: 'medium',
        description: 'クリックジャッキング防止ヘッダーが不足'
      },
      'x-xss-protection': {
        severity: 'low',
        description: 'XSS保護ヘッダーが不足'
      },
      'referrer-policy': {
        severity: 'low',
        description: 'リファラーポリシーヘッダーが不足'
      }
    };

    for (const [header, config] of Object.entries(requiredHeaders)) {
      if (!headers[header]) {
        this.addVulnerability(
          config.severity,
          'headers',
          `セキュリティヘッダー不足: ${header}`,
          config.description
        );
        this.addResult(`Security header: ${header}`, false);
      } else {
        this.addResult(`Security header: ${header}`, true, headers[header]);
      }
    }

    // 情報漏洩ヘッダーのチェック
    const informationHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
    
    for (const header of informationHeaders) {
      if (headers[header]) {
        this.addVulnerability(
          'info',
          'information_disclosure',
          `情報漏洩ヘッダー: ${header}`,
          `サーバー情報が漏洩している: ${headers[header]}`
        );
        this.addResult(`Info disclosure: ${header}`, false, headers[header]);
      } else {
        this.addResult(`Info disclosure: ${header}`, true);
      }
    }

    console.log('✅ セキュリティヘッダーテスト完了');
  }

  /**
   * CSRF保護テスト
   */
  async testCSRFProtection() {
    console.log('🔒 CSRF保護テスト開始');

    const statefulEndpoints = [
      { path: '/api/users', method: 'POST' },
      { path: '/api/settings', method: 'PUT' },
      { path: '/api/files', method: 'DELETE' }
    ];

    for (const endpoint of statefulEndpoints) {
      // CSRFトークンなしでのリクエスト
      const response = await this.makeRequest(endpoint.path, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://malicious-site.com'
        },
        body: { test: 'data' },
        expectError: true
      });

      if (response.status === 200) {
        this.addVulnerability(
          'high',
          'csrf',
          'CSRF保護の不備',
          `エンドポイント ${endpoint.path} でCSRF保護が不十分`
        );
        this.addResult(`CSRF protection: ${endpoint.path}`, false);
      } else {
        this.addResult(`CSRF protection: ${endpoint.path}`, true);
      }
    }

    console.log('✅ CSRF保護テスト完了');
  }

  /**
   * レート制限テスト
   */
  async testRateLimit() {
    console.log('⏱️ レート制限テスト開始');

    const testEndpoints = ['/api/login', '/api/health'];
    
    for (const endpoint of testEndpoints) {
      console.log(`📊 ${endpoint} のレート制限テスト`);
      
      const requests = [];
      const startTime = Date.now();
      
      // 短時間で多数のリクエストを送信
      for (let i = 0; i < 20; i++) {
        requests.push(this.makeRequest(endpoint));
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status === 200);
      
      if (rateLimited.length === 0 && successful.length > 10) {
        this.addVulnerability(
          'medium',
          'rate_limiting',
          'レート制限の不備',
          `エンドポイント ${endpoint} でレート制限が適用されていない`
        );
        this.addResult(`Rate limiting: ${endpoint}`, false, 
          `${successful.length} successful requests in ${endTime - startTime}ms`);
      } else {
        this.addResult(`Rate limiting: ${endpoint}`, true,
          `${rateLimited.length} rate limited, ${successful.length} successful`);
      }
    }

    console.log('✅ レート制限テスト完了');
  }

  /**
   * ファイルアップロードセキュリティテスト
   */
  async testFileUploadSecurity() {
    console.log('📤 ファイルアップロードセキュリティテスト開始');

    const maliciousFiles = [
      { name: 'test.php', content: '<?php phpinfo(); ?>', type: 'application/x-php' },
      { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
      { name: 'test.js', content: 'alert("XSS")', type: 'application/javascript' },
      { name: '../../../etc/passwd', content: 'root:x:0:0', type: 'text/plain' },
      { name: 'test.svg', content: '<svg onload=alert("XSS")></svg>', type: 'image/svg+xml' }
    ];

    for (const file of maliciousFiles) {
      const formData = new FormData();
      formData.append('file', new Blob([file.content], { type: file.type }), file.name);

      try {
        const response = await fetch(`${this.config.baseUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          this.addVulnerability(
            'high',
            'file_upload',
            '危険なファイルアップロードを許可',
            `危険なファイル ${file.name} のアップロードが許可された`
          );
          this.addResult(`File upload: ${file.name}`, false);
        } else {
          this.addResult(`File upload: ${file.name}`, true);
        }
      } catch (error) {
        this.addResult(`File upload: ${file.name}`, true, 'Upload endpoint not available');
      }
    }

    console.log('✅ ファイルアップロードセキュリティテスト完了');
  }

  /**
   * 情報漏洩テスト
   */
  async testInformationDisclosure() {
    console.log('🔍 情報漏洩テスト開始');

    const sensitivePaths = [
      '/.env',
      '/.git/config',
      '/config.json',
      '/package.json',
      '/admin',
      '/debug',
      '/.well-known/security.txt',
      '/robots.txt',
      '/sitemap.xml'
    ];

    for (const path of sensitivePaths) {
      const response = await this.makeRequest(path);
      
      if (response.status === 200 && this.containsSensitiveInfo(response.body, path)) {
        this.addVulnerability(
          path.includes('.env') || path.includes('.git') ? 'critical' : 'medium',
          'information_disclosure',
          `機密情報の漏洩: ${path}`,
          `機密ファイル ${path} にアクセス可能`
        );
        this.addResult(`Info disclosure: ${path}`, false);
      } else {
        this.addResult(`Info disclosure: ${path}`, true);
      }
    }

    console.log('✅ 情報漏洩テスト完了');
  }

  /**
   * SQLエラーの検出
   */
  detectSQLError(body) {
    const sqlErrors = [
      'mysql_fetch_array',
      'ORA-01756',
      'Microsoft OLE DB Provider',
      'Unclosed quotation mark',
      'quoted string not properly terminated',
      'SQL syntax.*MySQL',
      'Warning.*mysql_.*',
      'valid MySQL result',
      'PostgreSQL.*ERROR',
      'Warning.*pg_.*',
      'valid PostgreSQL result',
      'OLE DB.*error'
    ];

    return sqlErrors.some(pattern => 
      new RegExp(pattern, 'i').test(body)
    );
  }

  /**
   * 機密情報の検出
   */
  containsSensitiveInfo(body, path) {
    if (path.includes('.env')) {
      return /[A-Z_]+=/.test(body);
    }
    if (path.includes('.git')) {
      return body.includes('[core]') || body.includes('repositoryformatversion');
    }
    if (path.includes('package.json')) {
      return body.includes('"dependencies"') || body.includes('"devDependencies"');
    }
    return false;
  }

  /**
   * 全テストの実行
   */
  async runAllTests() {
    console.log('🛡️ セキュリティテスト開始');
    console.log('=====================================');

    await this.testAuthentication();
    await this.testInputValidation();
    await this.testSecurityHeaders();
    await this.testCSRFProtection();
    await this.testRateLimit();
    await this.testFileUploadSecurity();
    await this.testInformationDisclosure();

    console.log('\n=====================================');
    console.log('🛡️ セキュリティテスト完了');

    return this.generateReport();
  }

  /**
   * レポート生成
   */
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const severityCounts = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        success_rate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0
      },
      vulnerabilities: {
        total: this.vulnerabilities.length,
        by_severity: severityCounts,
        list: this.vulnerabilities
      },
      test_results: this.results,
      security_score: this.calculateSecurityScore()
    };
  }

  /**
   * セキュリティスコア計算
   */
  calculateSecurityScore() {
    let score = 100;

    for (const vuln of this.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
        case 'info': score -= 1; break;
      }
    }

    return Math.max(0, score);
  }
}

/**
 * メイン実行関数
 */
async function runSecurityTests() {
  const args = process.argv.slice(2);
  
  // 本番環境設定
  if (args.includes('--production')) {
    SECURITY_CONFIG.baseUrl = SECURITY_CONFIG.production.baseUrl;
    console.log('🌐 本番環境でのセキュリティテストを実行します');
  }

  const tester = new SecurityTester(SECURITY_CONFIG);
  const report = await tester.runAllTests();

  // レポートの保存
  const reportPath = path.join(__dirname, '..', 'test-results', `security-test-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 結果の表示
  console.log('\n📊 テスト結果サマリー');
  console.log(`✅ 成功: ${report.summary.passed_tests}/${report.summary.total_tests} (${report.summary.success_rate}%)`);
  console.log(`🛡️ セキュリティスコア: ${report.security_score}/100`);
  
  if (report.vulnerabilities.total > 0) {
    console.log(`⚠️  脆弱性: ${report.vulnerabilities.total}件発見`);
    
    Object.entries(report.vulnerabilities.by_severity).forEach(([severity, count]) => {
      console.log(`   ${severity.toUpperCase()}: ${count}件`);
    });

    console.log('\n🔍 主要な脆弱性:');
    report.vulnerabilities.list
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .slice(0, 5)
      .forEach(vuln => {
        console.log(`   [${vuln.severity.toUpperCase()}] ${vuln.title}`);
      });
  } else {
    console.log('✅ 深刻な脆弱性は発見されませんでした');
  }

  console.log(`\n📄 詳細レポート: ${reportPath}`);

  // 終了コードの設定
  if (report.vulnerabilities.by_severity.critical > 0) {
    console.log('\n❌ クリティカルな脆弱性が発見されました');
    process.exit(1);
  }

  return report;
}

/**
 * 使用方法表示
 */
function showUsage() {
  console.log('');
  console.log('NEO Platform Security Tester');
  console.log('');
  console.log('使用方法:');
  console.log('  node security-test.js [options]');
  console.log('');
  console.log('オプション:');
  console.log('  --production  本番環境でテスト実行');
  console.log('  --help        このヘルプを表示');
  console.log('');
}

// メイン処理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showUsage();
    process.exit(0);
  }

  runSecurityTests().catch(error => {
    console.error('❌ セキュリティテストでエラーが発生しました:', error.message);
    process.exit(1);
  });
}

module.exports = { SecurityTester, runSecurityTests };