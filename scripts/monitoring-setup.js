#!/usr/bin/env node
/**
 * モニタリング設定スクリプト
 * アラート閾値やWebhookの設定、テスト実行
 */

const fs = require('fs');
const path = require('path');

// 設定ファイルのパス
const CONFIG_PATH = path.join(__dirname, '..', 'monitoring-config.json');

// デフォルト設定
const DEFAULT_CONFIG = {
  alerts: {
    responseTimeThreshold: 2000,     // 2秒
    errorRateThreshold: 0.05,        // 5%
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    diskUsageThreshold: 0.80,        // 80%
    healthCheckInterval: 30000,      // 30秒
    alertCooldown: 300000           // 5分
  },
  notifications: {
    email: {
      enabled: false,
      recipients: [],
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: ''
    },
    webhook: {
      enabled: false,
      url: '',
      headers: {},
      retryCount: 3,
      timeout: 5000
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#alerts',
      username: 'NEO Platform Monitor'
    }
  },
  retention: {
    metricsRetentionDays: 30,
    errorLogRetentionDays: 90,
    vitalsRetentionDays: 7
  },
  performance: {
    enableWebVitals: true,
    enableRUM: true,        // Real User Monitoring
    samplingRate: 0.1,      // 10%のトラフィックを監視
    excludePatterns: [
      '/health',
      '/metrics',
      '/_next',
      '/favicon.ico'
    ]
  }
};

/**
 * 設定の初期化
 */
function initConfig() {
  console.log('🔧 モニタリング設定を初期化しています...');
  
  if (fs.existsSync(CONFIG_PATH)) {
    console.log('⚠️  既存の設定ファイルが見つかりました');
    const answer = prompt('既存の設定を上書きしますか？ (y/N): ');
    if (answer?.toLowerCase() !== 'y') {
      console.log('初期化をキャンセルしました');
      return;
    }
  }

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('✅ 設定ファイルを作成しました:', CONFIG_PATH);
    console.log('📝 設定を編集して monitoring-config.json を確認してください');
  } catch (error) {
    console.error('❌ 設定ファイルの作成に失敗しました:', error.message);
  }
}

/**
 * 設定の検証
 */
function validateConfig() {
  console.log('🔍 設定を検証しています...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const errors = [];
    
    // アラート設定の検証
    if (config.alerts.responseTimeThreshold <= 0) {
      errors.push('responseTimeThreshold は正の数値である必要があります');
    }
    
    if (config.alerts.errorRateThreshold <= 0 || config.alerts.errorRateThreshold >= 1) {
      errors.push('errorRateThreshold は 0 から 1 の間の数値である必要があります');
    }
    
    if (config.alerts.memoryThreshold <= 0) {
      errors.push('memoryThreshold は正の数値である必要があります');
    }

    // 通知設定の検証
    if (config.notifications.email.enabled) {
      if (!config.notifications.email.smtpHost) {
        errors.push('Email通知が有効な場合、SMTPホストは必須です');
      }
      if (config.notifications.email.recipients.length === 0) {
        errors.push('Email通知が有効な場合、受信者リストは必須です');
      }
    }

    if (config.notifications.webhook.enabled && !config.notifications.webhook.url) {
      errors.push('Webhook通知が有効な場合、URLは必須です');
    }

    if (config.notifications.slack.enabled && !config.notifications.slack.webhookUrl) {
      errors.push('Slack通知が有効な場合、Webhook URLは必須です');
    }

    if (errors.length > 0) {
      console.error('❌ 設定に問題があります:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }

    console.log('✅ 設定の検証が完了しました');
    return true;
  } catch (error) {
    console.error('❌ 設定ファイルの解析に失敗しました:', error.message);
    return false;
  }
}

/**
 * テスト通知の送信
 */
async function testNotifications() {
  console.log('🧪 通知機能をテストしています...');
  
  if (!validateConfig()) {
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  // Webhook通知のテスト
  if (config.notifications.webhook.enabled) {
    console.log('📡 Webhook通知をテスト中...');
    
    try {
      const testPayload = {
        alert: 'Test Alert',
        message: 'This is a test notification from NEO Platform Monitor',
        timestamp: new Date().toISOString(),
        level: 'info'
      };

      const response = await fetch(config.notifications.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.notifications.webhook.headers
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        console.log('✅ Webhook通知のテストが成功しました');
      } else {
        console.error('❌ Webhook通知のテストが失敗しました:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Webhook通知のテストでエラーが発生しました:', error.message);
    }
  }

  // Slack通知のテスト
  if (config.notifications.slack.enabled) {
    console.log('💬 Slack通知をテスト中...');
    
    try {
      const slackPayload = {
        channel: config.notifications.slack.channel,
        username: config.notifications.slack.username,
        text: 'テスト通知: NEO Platform Monitorからのテストメッセージです',
        attachments: [{
          color: 'good',
          title: 'Monitor Test',
          text: 'システム監視機能が正常に動作しています',
          timestamp: Math.floor(Date.now() / 1000)
        }]
      };

      const response = await fetch(config.notifications.slack.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slackPayload)
      });

      if (response.ok) {
        console.log('✅ Slack通知のテストが成功しました');
      } else {
        console.error('❌ Slack通知のテストが失敗しました:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Slack通知のテストでエラーが発生しました:', error.message);
    }
  }

  if (!config.notifications.webhook.enabled && !config.notifications.slack.enabled) {
    console.log('ℹ️  有効な通知方法が設定されていません');
  }
}

/**
 * ヘルスチェックのテスト実行
 */
async function testHealthCheck() {
  console.log('🏥 ヘルスチェックをテスト中...');
  
  try {
    // ローカルのヘルスチェックエンドポイントをテスト
    const healthEndpoints = [
      'http://localhost:3000/api/health',
      'http://localhost:3000/api/monitoring/dashboard'
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': 'Bearer test-token' // テスト用トークン
          }
        });
        const responseTime = Date.now() - startTime;

        console.log(`📊 ${endpoint}:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response Time: ${responseTime}ms`);
        
        if (response.ok) {
          console.log('   ✅ OK');
        } else {
          console.log('   ❌ Error');
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ ヘルスチェックテストでエラーが発生しました:', error.message);
  }
}

/**
 * 監視統計の表示
 */
function showStats() {
  console.log('📈 監視統計を表示しています...');
  
  // これは実際の本番環境ではAPIから取得
  const mockStats = {
    uptime: '99.9%',
    avgResponseTime: '125ms',
    errorRate: '0.02%',
    lastAlert: '2時間前',
    totalRequests: '1,234,567',
    totalErrors: '247'
  };

  console.log('');
  console.log('=== システム統計 ===');
  console.log(`稼働率: ${mockStats.uptime}`);
  console.log(`平均レスポンス時間: ${mockStats.avgResponseTime}`);
  console.log(`エラー率: ${mockStats.errorRate}`);
  console.log(`最後のアラート: ${mockStats.lastAlert}`);
  console.log(`総リクエスト数: ${mockStats.totalRequests}`);
  console.log(`総エラー数: ${mockStats.totalErrors}`);
  console.log('');
}

/**
 * 使用方法の表示
 */
function showUsage() {
  console.log('');
  console.log('NEO Platform Monitoring Setup');
  console.log('');
  console.log('使用方法:');
  console.log('  node monitoring-setup.js <command>');
  console.log('');
  console.log('コマンド:');
  console.log('  init              設定ファイルを初期化');
  console.log('  validate          設定ファイルを検証');
  console.log('  test-notifications 通知機能をテスト');
  console.log('  test-health       ヘルスチェックをテスト');
  console.log('  stats             監視統計を表示');
  console.log('  help              このヘルプを表示');
  console.log('');
}

// メイン処理
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      initConfig();
      break;
    case 'validate':
      validateConfig();
      break;
    case 'test-notifications':
      await testNotifications();
      break;
    case 'test-health':
      await testHealthCheck();
      break;
    case 'stats':
      showStats();
      break;
    case 'help':
    case undefined:
      showUsage();
      break;
    default:
      console.error('❌ 不明なコマンド:', command);
      showUsage();
      process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  });
}

module.exports = {
  initConfig,
  validateConfig,
  testNotifications,
  testHealthCheck,
  showStats
};