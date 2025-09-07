#!/usr/bin/env node
/**
 * 負荷テストスクリプト
 * APIエンドポイントとWebページの負荷テスト
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// 負荷テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  production: {
    baseUrl: 'https://neo-portal.pages.dev'
  },
  scenarios: [
    {
      name: 'Light Load',
      concurrent_users: 10,
      duration_seconds: 60,
      ramp_up_seconds: 10
    },
    {
      name: 'Medium Load',
      concurrent_users: 50,
      duration_seconds: 180,
      ramp_up_seconds: 30
    },
    {
      name: 'Heavy Load',
      concurrent_users: 100,
      duration_seconds: 300,
      ramp_up_seconds: 60
    },
    {
      name: 'Stress Test',
      concurrent_users: 200,
      duration_seconds: 120,
      ramp_up_seconds: 30
    }
  ],
  endpoints: [
    { path: '/', method: 'GET', name: 'Homepage' },
    { path: '/api/health', method: 'GET', name: 'Health Check' },
    { path: '/api/monitoring/dashboard', method: 'GET', name: 'Monitoring Dashboard', auth: true },
    { path: '/login', method: 'GET', name: 'Login Page' },
    { path: '/admin/dashboard', method: 'GET', name: 'Admin Dashboard', auth: true }
  ]
};

/**
 * 負荷テスト実行クラス
 */
class LoadTester {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.responseTimes = [];
  }

  /**
   * シングルリクエストの実行
   */
  async executeRequest(endpoint, authToken = null) {
    const startTime = performance.now();
    this.activeRequests++;
    this.totalRequests++;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTester/1.0'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.responseTimes.push(responseTime);

      const result = {
        endpoint: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: response.status,
        responseTime,
        timestamp: new Date().toISOString(),
        success: response.ok
      };

      if (!response.ok) {
        this.totalErrors++;
        result.error = `HTTP ${response.status}`;
      }

      return result;

    } catch (error) {
      this.totalErrors++;
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        endpoint: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: 0,
        responseTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * 並行リクエストの実行
   */
  async executeConcurrentRequests(endpoint, concurrency, duration) {
    const endTime = Date.now() + duration * 1000;
    const requests = [];

    console.log(`🚀 ${endpoint.name} への負荷テスト開始: ${concurrency} 並行リクエスト`);

    while (Date.now() < endTime) {
      // 並行数の調整
      while (this.activeRequests < concurrency && Date.now() < endTime) {
        const requestPromise = this.executeRequest(endpoint)
          .then(result => this.results.push(result))
          .catch(error => console.error('Request failed:', error));
        
        requests.push(requestPromise);
        
        // リクエスト間隔の調整（100ms）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 短い待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 残りのリクエストの完了を待機
    await Promise.all(requests);
    console.log(`✅ ${endpoint.name} の負荷テスト完了`);
  }

  /**
   * 段階的負荷テスト
   */
  async executeRampUpTest(endpoint, maxConcurrency, rampUpTime) {
    console.log(`📈 段階的負荷テスト開始: ${endpoint.name} (最大${maxConcurrency}並行)`);
    
    const stepDuration = rampUpTime / maxConcurrency;
    
    for (let currentLoad = 1; currentLoad <= maxConcurrency; currentLoad++) {
      console.log(`📊 負荷レベル: ${currentLoad}/${maxConcurrency}`);
      await this.executeConcurrentRequests(endpoint, currentLoad, stepDuration);
    }
    
    console.log(`✅ 段階的負荷テスト完了: ${endpoint.name}`);
  }

  /**
   * 統計計算
   */
  calculateStats() {
    if (this.responseTimes.length === 0) {
      return null;
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const totalTime = this.responseTimes.reduce((sum, time) => sum + time, 0);

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate: this.totalErrors / this.totalRequests,
      avgResponseTime: totalTime / this.responseTimes.length,
      minResponseTime: Math.min(...this.responseTimes),
      maxResponseTime: Math.max(...this.responseTimes),
      p50: this.getPercentile(sorted, 50),
      p90: this.getPercentile(sorted, 90),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
      throughput: this.totalRequests / (sorted.length > 0 ? (sorted[sorted.length - 1] - sorted[0]) / 1000 : 1)
    };
  }

  /**
   * パーセンタイル計算
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * レポート生成
   */
  generateReport(scenario, stats) {
    const report = {
      scenario: scenario.name,
      timestamp: new Date().toISOString(),
      configuration: {
        concurrent_users: scenario.concurrent_users,
        duration_seconds: scenario.duration_seconds,
        ramp_up_seconds: scenario.ramp_up_seconds
      },
      statistics: stats,
      results: this.results.slice(-100) // 最新100件のみ
    };

    return report;
  }

  /**
   * 結果のクリア
   */
  clearResults() {
    this.results = [];
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.responseTimes = [];
  }
}

/**
 * スパイクテスト
 */
async function runSpikeTest(endpoint, baseLoad, spikeLoad, spikeDuration) {
  console.log('⚡ スパイクテスト開始');
  
  const tester = new LoadTester(TEST_CONFIG);
  
  // ベース負荷
  console.log(`📊 ベース負荷: ${baseLoad} 並行リクエスト`);
  const baseLoadPromise = tester.executeConcurrentRequests(endpoint, baseLoad, spikeDuration * 3);
  
  // スパイク負荷を途中で追加
  setTimeout(async () => {
    console.log(`🌋 スパイク負荷追加: +${spikeLoad} 並行リクエスト`);
    await tester.executeConcurrentRequests(endpoint, spikeLoad, spikeDuration);
  }, spikeDuration * 1000);
  
  await baseLoadPromise;
  
  const stats = tester.calculateStats();
  console.log('⚡ スパイクテスト完了');
  
  return { stats, results: tester.results };
}

/**
 * エンドポイント可用性テスト
 */
async function testEndpointAvailability() {
  console.log('🔍 エンドポイント可用性テスト開始');
  
  const tester = new LoadTester(TEST_CONFIG);
  const availabilityResults = [];

  for (const endpoint of TEST_CONFIG.endpoints) {
    console.log(`📡 テスト中: ${endpoint.name} (${endpoint.path})`);
    
    const result = await tester.executeRequest(endpoint);
    availabilityResults.push({
      endpoint: endpoint.name,
      path: endpoint.path,
      available: result.success,
      responseTime: result.responseTime,
      status: result.status,
      error: result.error
    });

    console.log(`${result.success ? '✅' : '❌'} ${endpoint.name}: ${result.status} (${result.responseTime.toFixed(2)}ms)`);
  }

  return availabilityResults;
}

/**
 * メモリリークテスト
 */
async function runMemoryLeakTest(endpoint, duration) {
  console.log('🧠 メモリリークテスト開始');
  
  const tester = new LoadTester(TEST_CONFIG);
  const memorySnapshots = [];
  
  const startTime = Date.now();
  const endTime = startTime + duration * 1000;
  
  // 定期的なメモリ測定
  const memoryInterval = setInterval(() => {
    if (typeof performance !== 'undefined' && performance.memory) {
      memorySnapshots.push({
        timestamp: Date.now() - startTime,
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      });
    }
  }, 5000);

  // 継続的なリクエスト
  while (Date.now() < endTime) {
    await tester.executeRequest(endpoint);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  clearInterval(memoryInterval);
  
  console.log('🧠 メモリリークテスト完了');
  
  return {
    memorySnapshots,
    leakDetected: memorySnapshots.length > 1 && 
      memorySnapshots[memorySnapshots.length - 1].used > memorySnapshots[0].used * 1.5
  };
}

/**
 * メイン実行関数
 */
async function runLoadTests() {
  console.log('🏋️  NEO Platform 負荷テスト開始');
  console.log('========================================');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    scenarios: [],
    availability: null,
    spike_test: null,
    memory_test: null
  };

  try {
    // 1. エンドポイント可用性テスト
    console.log('\n1️⃣ エンドポイント可用性テスト');
    testResults.availability = await testEndpointAvailability();

    // 2. 段階的負荷テスト
    for (const scenario of TEST_CONFIG.scenarios) {
      console.log(`\n2️⃣ シナリオ実行: ${scenario.name}`);
      
      const tester = new LoadTester(TEST_CONFIG);
      
      // 各エンドポイントに対してテスト実行
      for (const endpoint of TEST_CONFIG.endpoints.slice(0, 2)) { // 最初の2つのみ
        await tester.executeRampUpTest(endpoint, scenario.concurrent_users, scenario.ramp_up_seconds);
      }

      const stats = tester.calculateStats();
      const report = tester.generateReport(scenario, stats);
      testResults.scenarios.push(report);

      // 結果の表示
      if (stats) {
        console.log(`📊 結果: ${scenario.name}`);
        console.log(`   総リクエスト数: ${stats.totalRequests}`);
        console.log(`   エラー率: ${(stats.errorRate * 100).toFixed(2)}%`);
        console.log(`   平均レスポンス時間: ${stats.avgResponseTime.toFixed(2)}ms`);
        console.log(`   95パーセンタイル: ${stats.p95.toFixed(2)}ms`);
        console.log(`   スループット: ${stats.throughput.toFixed(2)} req/s`);
      }

      // シナリオ間の休憩
      console.log('😴 30秒休憩中...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    // 3. スパイクテスト
    console.log('\n3️⃣ スパイクテスト');
    const spikeResult = await runSpikeTest(
      TEST_CONFIG.endpoints[0], // ホームページ
      10, // ベース負荷
      50, // スパイク負荷
      30  // スパイク継続時間
    );
    testResults.spike_test = spikeResult;

    // 4. メモリリークテスト
    console.log('\n4️⃣ メモリリークテスト');
    const memoryResult = await runMemoryLeakTest(
      TEST_CONFIG.endpoints[1], // ヘルスチェック
      120 // 2分間
    );
    testResults.memory_test = memoryResult;

  } catch (error) {
    console.error('❌ 負荷テストでエラーが発生しました:', error.message);
    testResults.error = error.message;
  }

  // 結果の保存
  const reportPath = path.join(__dirname, '..', 'test-results', `load-test-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  console.log('\n========================================');
  console.log('🎯 負荷テスト完了');
  console.log(`📄 レポート保存先: ${reportPath}`);

  // 総合評価
  const overallHealth = evaluateOverallHealth(testResults);
  console.log(`🏆 総合評価: ${overallHealth.grade} (${overallHealth.score}/100)`);
  
  if (overallHealth.issues.length > 0) {
    console.log('⚠️  改善が必要な項目:');
    overallHealth.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return testResults;
}

/**
 * 総合評価
 */
function evaluateOverallHealth(results) {
  let score = 100;
  const issues = [];

  // 可用性評価
  if (results.availability) {
    const unavailable = results.availability.filter(ep => !ep.available);
    if (unavailable.length > 0) {
      score -= 20;
      issues.push(`${unavailable.length}個のエンドポイントが利用不可`);
    }
  }

  // パフォーマンス評価
  for (const scenario of results.scenarios) {
    if (scenario.statistics) {
      if (scenario.statistics.errorRate > 0.05) {
        score -= 15;
        issues.push(`${scenario.scenario}でエラー率が高い (${(scenario.statistics.errorRate * 100).toFixed(1)}%)`);
      }
      
      if (scenario.statistics.p95 > 2000) {
        score -= 10;
        issues.push(`${scenario.scenario}でレスポンス時間が遅い (P95: ${scenario.statistics.p95.toFixed(0)}ms)`);
      }
    }
  }

  // メモリリーク評価
  if (results.memory_test && results.memory_test.leakDetected) {
    score -= 25;
    issues.push('メモリリークの可能性が検出されました');
  }

  // グレード判定
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score: Math.max(0, score), grade, issues };
}

/**
 * 使用方法表示
 */
function showUsage() {
  console.log('');
  console.log('NEO Platform Load Tester');
  console.log('');
  console.log('使用方法:');
  console.log('  node load-test.js [options]');
  console.log('');
  console.log('オプション:');
  console.log('  --production    本番環境でテスト実行');
  console.log('  --scenario=NAME 特定のシナリオのみ実行');
  console.log('  --endpoint=PATH 特定のエンドポイントのみ実行');
  console.log('  --duration=SEC  テスト実行時間を指定');
  console.log('  --help          このヘルプを表示');
  console.log('');
}

// メイン処理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showUsage();
    process.exit(0);
  }
  
  // 本番環境設定
  if (args.includes('--production')) {
    TEST_CONFIG.baseUrl = TEST_CONFIG.production.baseUrl;
    console.log('🌐 本番環境でのテストを実行します');
  }

  runLoadTests().catch(error => {
    console.error('❌ テスト実行エラー:', error.message);
    process.exit(1);
  });
}