#!/usr/bin/env node

/**
 * 依存関係分析とTree shaking最適化スクリプト
 * package.jsonの依存関係を分析し、未使用依存関係を検出
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * package.jsonから依存関係を読み取り
 */
function getDependencies() {
  const packagePath = 'package.json';
  
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json が見つかりません');
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  return {
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    peerDependencies: packageJson.peerDependencies || {}
  };
}

/**
 * プロジェクト内で使用されているインポートを検索
 */
function scanImports() {
  const imports = new Set();
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  function scanDirectory(dir) {
    if (dir.includes('node_modules') || dir.includes('.next')) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        scanFile(fullPath);
      }
    });
  }
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // import文を検索
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
      const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      
      let match;
      
      // ES6 import
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          const packageName = importPath.split('/')[0];
          if (packageName.startsWith('@')) {
            imports.add(`${packageName}/${importPath.split('/')[1]}`);
          } else {
            imports.add(packageName);
          }
        }
      }
      
      // CommonJS require
      while ((match = requireRegex.exec(content)) !== null) {
        const requirePath = match[1];
        if (!requirePath.startsWith('.') && !requirePath.startsWith('/')) {
          const packageName = requirePath.split('/')[0];
          if (packageName.startsWith('@')) {
            imports.add(`${packageName}/${requirePath.split('/')[1]}`);
          } else {
            imports.add(packageName);
          }
        }
      }
    } catch (error) {
      console.warn(`ファイル読み取りエラー: ${filePath}`, error.message);
    }
  }
  
  scanDirectory('.');
  return imports;
}

/**
 * 未使用依存関係を検出
 */
function findUnusedDependencies(dependencies, usedImports) {
  const unused = [];
  const used = [];
  
  Object.keys(dependencies).forEach(dep => {
    if (usedImports.has(dep)) {
      used.push(dep);
    } else {
      // 一部の依存関係は直接インポートされないが必要な場合がある
      const alwaysNeeded = [
        'next',
        'react',
        'react-dom',
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'typescript',
        'eslint',
        'tailwindcss'
      ];
      
      if (!alwaysNeeded.includes(dep)) {
        unused.push(dep);
      } else {
        used.push(dep);
      }
    }
  });
  
  return { unused, used };
}

/**
 * 大きな依存関係を特定
 */
function findLargeDependencies(dependencies) {
  const largeDeps = [];
  
  // よく知られている大きなライブラリ
  const knownLargeLibraries = {
    'moment': '2.3MB',
    'lodash': '1.4MB',
    '@fortawesome/fontawesome-free': '2.1MB',
    'bootstrap': '1.2MB',
    'jquery': '280KB',
    'axios': '120KB',
    'date-fns': '200KB'
  };
  
  Object.keys(dependencies).forEach(dep => {
    if (knownLargeLibraries[dep]) {
      largeDeps.push({
        name: dep,
        estimatedSize: knownLargeLibraries[dep],
        suggestion: getLargeDependencySuggestion(dep)
      });
    }
  });
  
  return largeDeps;
}

/**
 * 大きな依存関係の最適化提案
 */
function getLargeDependencySuggestion(depName) {
  const suggestions = {
    'moment': 'date-fns や dayjs への移行を検討（90%サイズ削減）',
    'lodash': '必要な関数のみ個別インポート（lodash/get など）',
    '@fortawesome/fontawesome-free': 'アイコンの個別インポートやSVGアイコンの使用',
    'bootstrap': 'Tailwind CSS への移行、または必要なコンポーネントのみ使用',
    'jquery': 'Vanilla JavaScriptやモダンフレームワーク機能への移行',
    'axios': '必要に応じて fetch API の使用を検討'
  };
  
  return suggestions[depName] || '代替ライブラリの検討や必要な機能のみの使用';
}

/**
 * Tree shaking最適化の提案生成
 */
function generateTreeShakingSuggestions(analysis) {
  const suggestions = [];
  
  // 未使用依存関係
  if (analysis.unusedDependencies.length > 0) {
    suggestions.push({
      type: 'unused-dependencies',
      severity: 'warning',
      message: `未使用の依存関係が見つかりました (${analysis.unusedDependencies.length}個)`,
      details: analysis.unusedDependencies.map(dep => ({
        package: dep,
        action: 'npm uninstall',
        command: `npm uninstall ${dep}`
      }))
    });
  }
  
  // 大きな依存関係
  if (analysis.largeDependencies.length > 0) {
    suggestions.push({
      type: 'large-dependencies',
      severity: 'info',
      message: `大きな依存関係が使用されています (${analysis.largeDependencies.length}個)`,
      details: analysis.largeDependencies.map(dep => ({
        package: dep.name,
        size: dep.estimatedSize,
        suggestion: dep.suggestion
      }))
    });
  }
  
  // インポート最適化
  const needsOptimization = ['lodash', '@fortawesome/fontawesome-free', 'date-fns'];
  const usedLargeLibs = analysis.largeDependencies
    .filter(dep => needsOptimization.includes(dep.name))
    .map(dep => dep.name);
    
  if (usedLargeLibs.length > 0) {
    suggestions.push({
      type: 'import-optimization',
      severity: 'info',
      message: 'インポート最適化が可能です',
      details: usedLargeLibs.map(lib => ({
        library: lib,
        suggestion: `個別インポートの使用: import { specific } from '${lib}/specific'`
      }))
    });
  }
  
  return suggestions;
}

/**
 * 依存関係分析レポート生成
 */
function generateDependencyReport() {
  console.log('🔍 依存関係分析を開始...');
  
  const dependencies = getDependencies();
  const usedImports = scanImports();
  
  const allDeps = {
    ...dependencies.dependencies,
    ...dependencies.devDependencies
  };
  
  const { unused, used } = findUnusedDependencies(allDeps, usedImports);
  const largeDependencies = findLargeDependencies(allDeps);
  
  const analysis = {
    totalDependencies: Object.keys(allDeps).length,
    usedDependencies: used,
    unusedDependencies: unused,
    largeDependencies,
    usageRate: (used.length / Object.keys(allDeps).length * 100).toFixed(1)
  };
  
  const suggestions = generateTreeShakingSuggestions(analysis);
  
  const report = {
    timestamp: new Date().toISOString(),
    analysis,
    suggestions,
    dependencies,
    usedImports: Array.from(usedImports),
    summary: {
      totalPackages: analysis.totalDependencies,
      usedPackages: used.length,
      unusedPackages: unused.length,
      usageRate: analysis.usageRate,
      suggestionCount: suggestions.length,
      estimatedSavings: calculateEstimatedSavings(unused, largeDependencies)
    }
  };
  
  // レポートファイルを保存
  fs.writeFileSync('dependency-analysis-report.json', JSON.stringify(report, null, 2));
  
  // コンソール出力
  console.log('📦 依存関係分析レポート');
  console.log('='.repeat(50));
  console.log(`📊 総パッケージ数: ${report.summary.totalPackages}`);
  console.log(`✅ 使用中: ${report.summary.usedPackages} (${report.summary.usageRate}%)`);
  console.log(`❌ 未使用: ${report.summary.unusedPackages}`);
  console.log(`💾 推定削減可能サイズ: ${report.summary.estimatedSavings}`);
  console.log(`💡 最適化提案: ${report.summary.suggestionCount}件`);
  
  if (suggestions.length > 0) {
    console.log('\n📝 最適化提案:');
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. [${suggestion.severity.toUpperCase()}] ${suggestion.message}`);
      if (suggestion.details && suggestion.details.length > 0) {
        suggestion.details.slice(0, 3).forEach(detail => {
          if (detail.command) {
            console.log(`   → ${detail.package}: ${detail.command}`);
          } else if (detail.suggestion) {
            console.log(`   → ${detail.library || detail.package}: ${detail.suggestion}`);
          }
        });
        if (suggestion.details.length > 3) {
          console.log(`   → ... その他 ${suggestion.details.length - 3} 件`);
        }
      }
    });
  }
  
  console.log(`\n📄 詳細レポート: dependency-analysis-report.json`);
  
  return report;
}

/**
 * 推定削減可能サイズ計算
 */
function calculateEstimatedSavings(unusedDeps, largeDeps) {
  // 簡易的な計算（平均的なパッケージサイズを仮定）
  const avgPackageSize = 50; // KB
  const unusedSavings = unusedDeps.length * avgPackageSize;
  
  const largeSavings = largeDeps.reduce((total, dep) => {
    const sizeMatch = dep.estimatedSize.match(/(\d+\.?\d*)([KM]B)/);
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      return total + (unit === 'MB' ? size * 1024 : size);
    }
    return total;
  }, 0);
  
  const totalSavings = unusedSavings + (largeSavings * 0.3); // 30%削減可能と仮定
  
  if (totalSavings > 1024) {
    return `${(totalSavings / 1024).toFixed(2)}MB`;
  } else {
    return `${totalSavings.toFixed(0)}KB`;
  }
}

// スクリプト実行
if (require.main === module) {
  try {
    generateDependencyReport();
  } catch (error) {
    console.error('❌ 依存関係分析エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateDependencyReport, getDependencies, scanImports };