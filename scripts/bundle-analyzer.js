#!/usr/bin/env node

/**
 * バンドル分析とレポート生成スクリプト
 * Webpack Bundle Analyzerの結果を解析し、最適化提案を生成
 */

const fs = require('fs');
const path = require('path');

// バンドル分析レポートのパス
const ANALYZE_DIR = '.next/analyze';
const REPORT_PATH = 'bundle-analysis-report.json';

/**
 * ビルド情報を解析
 */
function analyzeBuildInfo() {
  const buildInfoPath = '.next/build-manifest.json';
  
  if (!fs.existsSync(buildInfoPath)) {
    console.log('ビルド情報が見つかりません');
    return null;
  }

  try {
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    return buildInfo;
  } catch (error) {
    console.error('ビルド情報の解析エラー:', error);
    return null;
  }
}

/**
 * チャンクサイズを解析
 */
function analyzeChunkSizes() {
  const statsPath = '.next/server/chunks-manifest.json';
  
  if (!fs.existsSync(statsPath)) {
    console.log('チャンク情報が見つかりません');
    return {};
  }

  try {
    const chunks = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    return chunks;
  } catch (error) {
    console.error('チャンク情報の解析エラー:', error);
    return {};
  }
}

/**
 * 静的ファイルサイズを分析
 */
function analyzeStaticFiles() {
  const staticDir = '.next/static';
  const analysis = {
    totalSize: 0,
    chunks: {},
    css: {},
    media: {}
  };

  if (!fs.existsSync(staticDir)) {
    return analysis;
  }

  function scanDirectory(dirPath, category = 'chunks') {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        scanDirectory(filePath, category);
      } else {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        analysis.totalSize += size;
        
        if (file.name.endsWith('.js')) {
          analysis.chunks[file.name] = size;
        } else if (file.name.endsWith('.css')) {
          analysis.css[file.name] = size;
        } else {
          analysis.media[file.name] = size;
        }
      }
    });
  }

  scanDirectory(staticDir);
  return analysis;
}

/**
 * 最適化提案を生成
 */
function generateOptimizationSuggestions(analysis) {
  const suggestions = [];
  
  // 大きなチャンクを特定
  const largeChunks = Object.entries(analysis.chunks)
    .filter(([name, size]) => size > 100000) // 100KB以上
    .sort((a, b) => b[1] - a[1]);

  if (largeChunks.length > 0) {
    suggestions.push({
      type: 'large-chunks',
      severity: 'warning',
      message: `大きなチャンクが検出されました (${largeChunks.length}個)`,
      details: largeChunks.map(([name, size]) => ({
        file: name,
        size: `${(size / 1024).toFixed(1)}KB`,
        suggestion: size > 500000 ? 'コード分割を検討' : '動的インポートを検討'
      }))
    });
  }

  // CSS ファイルサイズ
  const totalCSSSize = Object.values(analysis.css).reduce((sum, size) => sum + size, 0);
  if (totalCSSSize > 50000) { // 50KB以上
    suggestions.push({
      type: 'css-size',
      severity: 'info',
      message: `CSSファイルが大きいです (${(totalCSSSize / 1024).toFixed(1)}KB)`,
      details: [{
        suggestion: '未使用CSSの削除、Critical CSS抽出を検討'
      }]
    });
  }

  // 総バンドルサイズ
  if (analysis.totalSize > 1000000) { // 1MB以上
    suggestions.push({
      type: 'total-size',
      severity: 'warning',
      message: `総バンドルサイズが大きいです (${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB)`,
      details: [{
        suggestion: 'Tree shaking、依存関係の見直し、遅延読み込みを検討'
      }]
    });
  }

  return suggestions;
}

/**
 * パフォーマンス指標を算出
 */
function calculatePerformanceMetrics(analysis) {
  const metrics = {
    totalBundleSize: analysis.totalSize,
    jsChunkCount: Object.keys(analysis.chunks).length,
    cssFileCount: Object.keys(analysis.css).length,
    averageChunkSize: 0,
    largestChunk: 0,
    compressionRatio: 0.7, // 推定gzip圧縮率
  };

  if (metrics.jsChunkCount > 0) {
    const sizes = Object.values(analysis.chunks);
    metrics.averageChunkSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    metrics.largestChunk = Math.max(...sizes);
  }

  // 推定読み込み時間（3G環境想定：1.6Mbps）
  const estimatedLoadTime = (analysis.totalSize * metrics.compressionRatio * 8) / (1.6 * 1024 * 1024);
  metrics.estimatedLoadTime = estimatedLoadTime;

  return metrics;
}

/**
 * レポート生成
 */
function generateReport() {
  console.log('🔍 バンドル分析を開始...');
  
  const buildInfo = analyzeBuildInfo();
  const staticAnalysis = analyzeStaticFiles();
  const chunks = analyzeChunkSizes();
  const suggestions = generateOptimizationSuggestions(staticAnalysis);
  const metrics = calculatePerformanceMetrics(staticAnalysis);

  const report = {
    timestamp: new Date().toISOString(),
    buildInfo,
    staticAnalysis,
    chunks,
    suggestions,
    metrics,
    summary: {
      totalFiles: Object.keys(staticAnalysis.chunks).length + Object.keys(staticAnalysis.css).length,
      totalSize: staticAnalysis.totalSize,
      totalSizeMB: (staticAnalysis.totalSize / 1024 / 1024).toFixed(2),
      estimatedGzipSize: (staticAnalysis.totalSize * metrics.compressionRatio / 1024 / 1024).toFixed(2),
      suggestionCount: suggestions.length,
      performanceScore: calculatePerformanceScore(metrics, suggestions)
    }
  };

  // レポートファイルを保存
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  
  // コンソール出力
  console.log('📊 バンドル分析レポート');
  console.log('='.repeat(50));
  console.log(`📦 総ファイル数: ${report.summary.totalFiles}`);
  console.log(`📏 総サイズ: ${report.summary.totalSizeMB}MB`);
  console.log(`🗜️  推定Gzipサイズ: ${report.summary.estimatedGzipSize}MB`);
  console.log(`⚡ 推定読み込み時間: ${metrics.estimatedLoadTime.toFixed(2)}秒 (3G環境)`);
  console.log(`🎯 パフォーマンススコア: ${report.summary.performanceScore}/100`);
  console.log(`💡 最適化提案: ${report.summary.suggestionCount}件`);
  
  if (suggestions.length > 0) {
    console.log('\n📝 最適化提案:');
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. [${suggestion.severity.toUpperCase()}] ${suggestion.message}`);
      if (suggestion.details) {
        suggestion.details.forEach(detail => {
          console.log(`   → ${detail.suggestion || detail.file}`);
        });
      }
    });
  }

  console.log(`\n📄 詳細レポート: ${REPORT_PATH}`);
  console.log(`🌐 バンドル分析: ${ANALYZE_DIR}/client.html`);
  
  return report;
}

/**
 * パフォーマンススコア算出
 */
function calculatePerformanceScore(metrics, suggestions) {
  let score = 100;
  
  // サイズペナルティ
  if (metrics.totalBundleSize > 2000000) score -= 30; // 2MB以上で大幅減点
  else if (metrics.totalBundleSize > 1000000) score -= 15; // 1MB以上で減点
  else if (metrics.totalBundleSize > 500000) score -= 5;  // 500KB以上で軽微減点
  
  // チャンク数ペナルティ
  if (metrics.jsChunkCount > 20) score -= 10;
  else if (metrics.jsChunkCount > 10) score -= 5;
  
  // 読み込み時間ペナルティ
  if (metrics.estimatedLoadTime > 5) score -= 20; // 5秒以上で大幅減点
  else if (metrics.estimatedLoadTime > 3) score -= 10; // 3秒以上で減点
  
  // 提案ペナルティ
  const severeSuggestions = suggestions.filter(s => s.severity === 'warning').length;
  score -= severeSuggestions * 10;
  
  return Math.max(0, Math.min(100, score));
}

// スクリプト実行
if (require.main === module) {
  try {
    generateReport();
  } catch (error) {
    console.error('❌ バンドル分析エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateReport, analyzeBuildInfo, analyzeStaticFiles };