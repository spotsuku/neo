#!/usr/bin/env node
/**
 * パフォーマンス監査スクリプト
 * Lighthouse監査とCore Web Vitals測定
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// パフォーマンス監査設定
const AUDIT_CONFIG = {
  baseUrl: 'http://localhost:3000',
  production: {
    baseUrl: 'https://neo-platform.pages.dev'
  },
  pages: [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login Page' },
    { path: '/admin/dashboard', name: 'Admin Dashboard' },
    { path: '/admin/monitoring', name: 'Monitoring Dashboard' }
  ],
  thresholds: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 85,
    fcp: 1800,      // First Contentful Paint (ms)
    lcp: 2500,      // Largest Contentful Paint (ms)
    cls: 0.1,       // Cumulative Layout Shift
    fid: 100,       // First Input Delay (ms)
    ttfb: 600       // Time to First Byte (ms)
  }
};

/**
 * パフォーマンス監査クラス
 */
class PerformanceAuditor {
  constructor(config) {
    this.config = config;
    this.results = [];
  }

  /**
   * Lighthouseを使用したページ監査
   */
  async auditWithLighthouse(url, pageName) {
    console.log(`🔍 Lighthouse監査実行中: ${pageName}`);
    
    try {
      // Lighthouseがインストールされているかチェック
      try {
        execSync('lighthouse --version', { stdio: 'pipe' });
      } catch (error) {
        console.log('📦 Lighthouseをインストール中...');
        execSync('npm install -g lighthouse', { stdio: 'inherit' });
      }

      // 一時的な結果ファイル
      const tempFile = path.join(__dirname, `lighthouse-${Date.now()}.json`);
      
      // Lighthouse実行
      const lighthouseCmd = [
        'lighthouse',
        url,
        '--output=json',
        `--output-path=${tempFile}`,
        '--chrome-flags="--headless --no-sandbox"',
        '--quiet'
      ].join(' ');

      execSync(lighthouseCmd, { stdio: 'pipe' });

      // 結果の読み込み
      const reportData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
      
      // 一時ファイルの削除
      fs.unlinkSync(tempFile);

      const audit = {
        page: pageName,
        url,
        timestamp: new Date().toISOString(),
        scores: {
          performance: Math.round(reportData.categories.performance.score * 100),
          accessibility: Math.round(reportData.categories.accessibility.score * 100),
          bestPractices: Math.round(reportData.categories['best-practices'].score * 100),
          seo: Math.round(reportData.categories.seo.score * 100)
        },
        metrics: this.extractMetrics(reportData.audits),
        opportunities: this.extractOpportunities(reportData.audits),
        diagnostics: this.extractDiagnostics(reportData.audits)
      };

      this.results.push(audit);
      
      console.log(`✅ ${pageName} 監査完了`);
      console.log(`   Performance: ${audit.scores.performance}/100`);
      console.log(`   Accessibility: ${audit.scores.accessibility}/100`);
      console.log(`   Best Practices: ${audit.scores.bestPractices}/100`);
      console.log(`   SEO: ${audit.scores.seo}/100`);

      return audit;

    } catch (error) {
      console.error(`❌ ${pageName} の監査に失敗:`, error.message);
      
      // フォールバック: 基本的なパフォーマンステスト
      return await this.basicPerformanceTest(url, pageName);
    }
  }

  /**
   * メトリクスの抽出
   */
  extractMetrics(audits) {
    const metricKeys = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'first-input-delay',
      'total-blocking-time',
      'speed-index',
      'server-response-time'
    ];

    const metrics = {};
    
    for (const key of metricKeys) {
      if (audits[key] && audits[key].numericValue !== undefined) {
        metrics[key] = {
          value: audits[key].numericValue,
          displayValue: audits[key].displayValue,
          score: audits[key].score
        };
      }
    }

    return metrics;
  }

  /**
   * 改善提案の抽出
   */
  extractOpportunities(audits) {
    const opportunityKeys = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'efficient-animated-content',
      'uses-optimized-images',
      'modern-image-formats',
      'uses-text-compression'
    ];

    const opportunities = [];

    for (const key of opportunityKeys) {
      if (audits[key] && audits[key].score !== null && audits[key].score < 1) {
        opportunities.push({
          audit: key,
          title: audits[key].title,
          description: audits[key].description,
          score: audits[key].score,
          savings: audits[key].details?.overallSavingsMs || 0,
          displayValue: audits[key].displayValue
        });
      }
    }

    return opportunities.sort((a, b) => b.savings - a.savings);
  }

  /**
   * 診断結果の抽出
   */
  extractDiagnostics(audits) {
    const diagnosticKeys = [
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-passive-event-listeners',
      'no-document-write',
      'uses-http2',
      'uses-rel-preconnect',
      'font-display'
    ];

    const diagnostics = [];

    for (const key of diagnosticKeys) {
      if (audits[key] && audits[key].score !== null) {
        diagnostics.push({
          audit: key,
          title: audits[key].title,
          description: audits[key].description,
          score: audits[key].score,
          displayValue: audits[key].displayValue
        });
      }
    }

    return diagnostics;
  }

  /**
   * 基本的なパフォーマンステスト（Lighthouseのフォールバック）
   */
  async basicPerformanceTest(url, pageName) {
    console.log(`⚡ 基本パフォーマンステスト実行中: ${pageName}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PerformanceAuditor/1.0'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const text = await response.text();

      // 基本的な分析
      const analysis = {
        responseTime,
        contentLength,
        status: response.status,
        hasGzip: response.headers.get('content-encoding') === 'gzip',
        cacheControl: response.headers.get('cache-control'),
        contentType: response.headers.get('content-type'),
        // 簡易的なDOM解析
        scriptTags: (text.match(/<script/g) || []).length,
        styleTags: (text.match(/<link[^>]*stylesheet/g) || []).length,
        imageTags: (text.match(/<img/g) || []).length
      };

      const audit = {
        page: pageName,
        url,
        timestamp: new Date().toISOString(),
        scores: {
          performance: this.calculateBasicScore(analysis),
          accessibility: 0, // 基本テストでは測定不可
          bestPractices: this.calculateBasicBestPractices(analysis),
          seo: 0 // 基本テストでは測定不可
        },
        metrics: {
          'server-response-time': {
            value: responseTime,
            displayValue: `${responseTime}ms`,
            score: responseTime < 600 ? 1 : responseTime < 1000 ? 0.5 : 0
          }
        },
        basicAnalysis: analysis,
        opportunities: this.generateBasicOpportunities(analysis),
        diagnostics: []
      };

      this.results.push(audit);
      
      console.log(`✅ ${pageName} 基本テスト完了`);
      console.log(`   レスポンス時間: ${responseTime}ms`);
      console.log(`   コンテンツサイズ: ${contentLength} bytes`);

      return audit;

    } catch (error) {
      console.error(`❌ ${pageName} の基本テストに失敗:`, error.message);
      return null;
    }
  }

  /**
   * 基本スコア計算
   */
  calculateBasicScore(analysis) {
    let score = 100;
    
    // レスポンス時間による減点
    if (analysis.responseTime > 1000) score -= 30;
    else if (analysis.responseTime > 600) score -= 15;
    
    // 圧縮の有無
    if (!analysis.hasGzip) score -= 10;
    
    // キャッシュ設定
    if (!analysis.cacheControl) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * 基本ベストプラクティススコア
   */
  calculateBasicBestPractices(analysis) {
    let score = 100;
    
    // HTTPS使用（URLから判定）
    if (!analysis.url?.startsWith('https://')) score -= 20;
    
    // 圧縮設定
    if (!analysis.hasGzip) score -= 15;
    
    // キャッシュ設定
    if (!analysis.cacheControl) score -= 15;
    
    return Math.max(0, score);
  }

  /**
   * 基本的な改善提案生成
   */
  generateBasicOpportunities(analysis) {
    const opportunities = [];
    
    if (!analysis.hasGzip) {
      opportunities.push({
        title: 'テキスト圧縮を有効にする',
        description: 'gzip圧縮により転送サイズを削減できます',
        score: 0,
        savings: analysis.contentLength * 0.7 // 推定70%削減
      });
    }
    
    if (!analysis.cacheControl) {
      opportunities.push({
        title: 'キャッシュポリシーを設定する',
        description: '静的リソースのキャッシュポリシーを設定してください',
        score: 0,
        savings: 500 // 推定節約時間
      });
    }
    
    if (analysis.scriptTags > 10) {
      opportunities.push({
        title: 'JavaScriptファイルを統合する',
        description: '複数のJavaScriptファイルを統合して、HTTP リクエスト数を削減してください',
        score: 0.5,
        savings: analysis.scriptTags * 50 // 推定節約時間
      });
    }
    
    return opportunities;
  }

  /**
   * Web Vitalsテスト
   */
  async testWebVitals(url, pageName) {
    console.log(`📊 Web Vitals測定中: ${pageName}`);
    
    try {
      // Puppeteerを使用したWeb Vitals測定
      const { execSync } = require('child_process');
      
      // web-vitalsパッケージをインストール（必要に応じて）
      try {
        execSync('npm list web-vitals', { stdio: 'pipe' });
      } catch {
        console.log('📦 web-vitalsをインストール中...');
        execSync('npm install web-vitals puppeteer', { stdio: 'inherit' });
      }

      // Web Vitals測定スクリプトを実行
      const script = `
        const puppeteer = require('puppeteer');
        
        (async () => {
          const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          
          const page = await browser.newPage();
          
          const vitals = {};
          
          // Web Vitalsの測定
          await page.evaluateOnNewDocument(() => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js';
            document.head.appendChild(script);
            
            script.onload = () => {
              webVitals.getFCP(metric => window.vitals = {...window.vitals, fcp: metric.value});
              webVitals.getLCP(metric => window.vitals = {...window.vitals, lcp: metric.value});
              webVitals.getCLS(metric => window.vitals = {...window.vitals, cls: metric.value});
              webVitals.getFID(metric => window.vitals = {...window.vitals, fid: metric.value});
              webVitals.getTTFB(metric => window.vitals = {...window.vitals, ttfb: metric.value});
            };
          });
          
          await page.goto('${url}', { waitUntil: 'networkidle0' });
          
          // しばらく待機してメトリクス収集
          await page.waitForTimeout(3000);
          
          const vitalsResult = await page.evaluate(() => window.vitals || {});
          console.log(JSON.stringify(vitalsResult));
          
          await browser.close();
        })().catch(console.error);
      `;

      const tempScript = path.join(__dirname, `web-vitals-${Date.now()}.js`);
      fs.writeFileSync(tempScript, script);
      
      const result = execSync(`node "${tempScript}"`, { encoding: 'utf8' });
      fs.unlinkSync(tempScript);
      
      const vitals = JSON.parse(result.trim() || '{}');
      
      console.log(`✅ ${pageName} Web Vitals測定完了`);
      if (vitals.fcp) console.log(`   FCP: ${vitals.fcp}ms`);
      if (vitals.lcp) console.log(`   LCP: ${vitals.lcp}ms`);
      if (vitals.cls) console.log(`   CLS: ${vitals.cls}`);
      
      return vitals;

    } catch (error) {
      console.error(`❌ ${pageName} のWeb Vitals測定に失敗:`, error.message);
      return {};
    }
  }

  /**
   * 全監査の実行
   */
  async runFullAudit() {
    console.log('🏃 パフォーマンス監査開始');
    console.log('=====================================');

    for (const page of this.config.pages) {
      const url = `${this.config.baseUrl}${page.path}`;
      
      console.log(`\n📄 ページ監査: ${page.name}`);
      
      // Lighthouse監査
      const audit = await this.auditWithLighthouse(url, page.name);
      
      // Web Vitals測定
      if (audit) {
        const vitals = await this.testWebVitals(url, page.name);
        audit.webVitals = vitals;
      }
    }

    console.log('\n=====================================');
    console.log('🎯 パフォーマンス監査完了');

    return this.generateAuditReport();
  }

  /**
   * 監査レポート生成
   */
  generateAuditReport() {
    const summary = {
      total_pages: this.results.length,
      average_scores: this.calculateAverageScores(),
      issues: this.identifyIssues(),
      recommendations: this.generateRecommendations()
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      detailed_results: this.results,
      thresholds: this.config.thresholds
    };
  }

  /**
   * 平均スコア計算
   */
  calculateAverageScores() {
    if (this.results.length === 0) return null;

    const totals = this.results.reduce((acc, result) => {
      acc.performance += result.scores.performance || 0;
      acc.accessibility += result.scores.accessibility || 0;
      acc.bestPractices += result.scores.bestPractices || 0;
      acc.seo += result.scores.seo || 0;
      return acc;
    }, { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 });

    return {
      performance: Math.round(totals.performance / this.results.length),
      accessibility: Math.round(totals.accessibility / this.results.length),
      bestPractices: Math.round(totals.bestPractices / this.results.length),
      seo: Math.round(totals.seo / this.results.length)
    };
  }

  /**
   * 問題の特定
   */
  identifyIssues() {
    const issues = [];

    for (const result of this.results) {
      const { page, scores, metrics } = result;
      
      // スコアの問題
      if (scores.performance < this.config.thresholds.performance) {
        issues.push({
          severity: 'high',
          page,
          category: 'performance',
          message: `パフォーマンススコアが低い (${scores.performance}/100)`
        });
      }
      
      if (scores.accessibility < this.config.thresholds.accessibility) {
        issues.push({
          severity: 'medium',
          page,
          category: 'accessibility',
          message: `アクセシビリティスコアが低い (${scores.accessibility}/100)`
        });
      }

      // Web Vitalsの問題
      if (metrics && metrics['first-contentful-paint']) {
        const fcp = metrics['first-contentful-paint'].value;
        if (fcp > this.config.thresholds.fcp) {
          issues.push({
            severity: 'medium',
            page,
            category: 'web-vitals',
            message: `First Contentful Paint が遅い (${fcp}ms > ${this.config.thresholds.fcp}ms)`
          });
        }
      }
    }

    return issues;
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations() {
    const recommendations = new Set();

    for (const result of this.results) {
      // 共通の改善提案
      if (result.opportunities) {
        for (const opp of result.opportunities.slice(0, 3)) {
          recommendations.add(opp.title);
        }
      }
      
      // スコアベースの推奨事項
      if (result.scores.performance < 80) {
        recommendations.add('JavaScript バンドルサイズを最適化する');
        recommendations.add('画像を次世代フォーマット（WebP、AVIF）に変換する');
        recommendations.add('未使用のCSS/JavaScriptを削除する');
      }
    }

    return Array.from(recommendations);
  }
}

/**
 * メイン実行関数
 */
async function runPerformanceAudit() {
  const args = process.argv.slice(2);
  
  // 本番環境設定
  if (args.includes('--production')) {
    AUDIT_CONFIG.baseUrl = AUDIT_CONFIG.production.baseUrl;
    console.log('🌐 本番環境でのパフォーマンス監査を実行します');
  }

  const auditor = new PerformanceAuditor(AUDIT_CONFIG);
  const report = await auditor.runFullAudit();

  // レポートの保存
  const reportPath = path.join(__dirname, '..', 'test-results', `performance-audit-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 結果の表示
  console.log('\n📊 監査結果サマリー');
  if (report.summary.average_scores) {
    console.log(`🚀 平均パフォーマンススコア: ${report.summary.average_scores.performance}/100`);
    console.log(`♿ 平均アクセシビリティスコア: ${report.summary.average_scores.accessibility}/100`);
    console.log(`✅ 平均ベストプラクティススコア: ${report.summary.average_scores.bestPractices}/100`);
    console.log(`🔍 平均SEOスコア: ${report.summary.average_scores.seo}/100`);
  }
  
  if (report.summary.issues.length > 0) {
    console.log(`\n⚠️  発見された問題: ${report.summary.issues.length}件`);
    report.summary.issues.slice(0, 5).forEach(issue => {
      console.log(`   [${issue.severity.toUpperCase()}] ${issue.page}: ${issue.message}`);
    });
  }

  if (report.summary.recommendations.length > 0) {
    console.log('\n💡 推奨事項:');
    report.summary.recommendations.slice(0, 5).forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }

  console.log(`\n📄 詳細レポート: ${reportPath}`);

  return report;
}

/**
 * 使用方法表示
 */
function showUsage() {
  console.log('');
  console.log('NEO Platform Performance Auditor');
  console.log('');
  console.log('使用方法:');
  console.log('  node performance-audit.js [options]');
  console.log('');
  console.log('オプション:');
  console.log('  --production  本番環境で監査実行');
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

  runPerformanceAudit().catch(error => {
    console.error('❌ パフォーマンス監査でエラーが発生しました:', error.message);
    process.exit(1);
  });
}

module.exports = { PerformanceAuditor, runPerformanceAudit };