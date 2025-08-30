#!/usr/bin/env node
/**
 * バックアップ管理スクリプト
 * データベースとシステムのバックアップ・リストア機能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 設定ファイルのパス
const CONFIG_PATH = path.join(__dirname, '..', 'backup-config.json');

// デフォルトバックアップ設定
const DEFAULT_BACKUP_CONFIG = {
  database: {
    enabled: true,
    schedule: '0 2 * * *',        // 毎日午前2時
    retention_days: 90,
    backup_path: './backups/database',
    compression: true
  },
  files: {
    enabled: true,
    schedule: '0 3 * * 0',        // 毎週日曜日午前3時
    retention_days: 30,
    backup_path: './backups/files',
    exclude_patterns: [
      '.git',
      'node_modules',
      '.next',
      '.wrangler',
      '*.log',
      'tmp/*'
    ]
  },
  system: {
    enabled: true,
    schedule: '0 1 * * 0',        // 毎週日曜日午前1時
    retention_days: 60,
    backup_path: './backups/system'
  },
  storage: {
    type: 'local',               // 'local' | 'r2' | 's3'
    encryption: true,
    compression: true
  },
  notifications: {
    on_success: false,
    on_failure: true,
    webhook_url: '',
    email: ''
  }
};

/**
 * 設定の初期化
 */
function initConfig() {
  console.log('🔧 バックアップ設定を初期化しています...');
  
  if (fs.existsSync(CONFIG_PATH)) {
    console.log('⚠️  既存の設定ファイルが見つかりました');
    const answer = require('readline-sync').question('既存の設定を上書きしますか？ (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('初期化をキャンセルしました');
      return;
    }
  }

  try {
    // バックアップディレクトリの作成
    const backupDirs = [
      DEFAULT_BACKUP_CONFIG.database.backup_path,
      DEFAULT_BACKUP_CONFIG.files.backup_path,
      DEFAULT_BACKUP_CONFIG.system.backup_path
    ];

    for (const dir of backupDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 ディレクトリを作成しました: ${dir}`);
      }
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_BACKUP_CONFIG, null, 2));
    console.log('✅ 設定ファイルを作成しました:', CONFIG_PATH);
    console.log('📝 設定を編集して backup-config.json を確認してください');
  } catch (error) {
    console.error('❌ 設定ファイルの作成に失敗しました:', error.message);
  }
}

/**
 * データベースバックアップの作成
 */
async function createDatabaseBackup() {
  console.log('🗄️  データベースバックアップを作成中...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  if (!config.database.enabled) {
    console.log('ℹ️  データベースバックアップは無効になっています');
    return;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `database_backup_${timestamp}.sql`;
    const backupPath = path.join(config.database.backup_path, backupFileName);

    // Wranglerを使用したD1データベースのエクスポート
    console.log('📦 D1データベースをエクスポート中...');
    
    // ローカルD1データベースのバックアップ
    try {
      execSync('npm run db:migrate:local', { stdio: 'inherit' });
      
      // SQLiteデータベースファイルをコピー
      const localDbPath = './.wrangler/state/v3/d1/local-development-db.sqlite';
      if (fs.existsSync(localDbPath)) {
        fs.copyFileSync(localDbPath, backupPath.replace('.sql', '.sqlite'));
        console.log(`✅ ローカルデータベースをバックアップしました: ${backupPath.replace('.sql', '.sqlite')}`);
      }
    } catch (error) {
      console.error('❌ ローカルデータベースバックアップでエラー:', error.message);
    }

    // 本番データベースのバックアップ（手動実行時）
    try {
      const dumpCommand = `wrangler d1 execute webapp-production --remote --command=".dump" > "${backupPath}"`;
      execSync(dumpCommand, { stdio: 'pipe' });
      console.log(`✅ 本番データベースをバックアップしました: ${backupPath}`);
    } catch (error) {
      console.warn('⚠️  本番データベースバックアップでエラー（認証が必要な場合があります）:', error.message);
    }

    // バックアップの圧縮
    if (config.database.compression && fs.existsSync(backupPath)) {
      try {
        execSync(`gzip "${backupPath}"`, { stdio: 'inherit' });
        console.log(`🗜️  バックアップファイルを圧縮しました: ${backupPath}.gz`);
      } catch (error) {
        console.warn('⚠️  圧縮に失敗しました:', error.message);
      }
    }

    // メタデータファイルの作成
    const metadata = {
      timestamp: new Date().toISOString(),
      type: 'database',
      file: backupFileName,
      size: fs.existsSync(backupPath) ? fs.statSync(backupPath).size : 0,
      compressed: config.database.compression,
      retention_until: new Date(Date.now() + config.database.retention_days * 24 * 60 * 60 * 1000).toISOString()
    };

    const metadataPath = path.join(config.database.backup_path, `${backupFileName}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log('✅ データベースバックアップが完了しました');
  } catch (error) {
    console.error('❌ データベースバックアップでエラーが発生しました:', error.message);
  }
}

/**
 * システムバックアップの作成
 */
async function createSystemBackup() {
  console.log('🖥️  システムバックアップを作成中...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  if (!config.system.enabled) {
    console.log('ℹ️  システムバックアップは無効になっています');
    return;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `system_backup_${timestamp}.tar.gz`;
    const backupPath = path.join(config.system.backup_path, backupFileName);

    // システムファイルのアーカイブ作成
    const projectRoot = path.join(__dirname, '..');
    const excludePatterns = [
      '--exclude=node_modules',
      '--exclude=.next',
      '--exclude=.wrangler',
      '--exclude=.git',
      '--exclude=backups',
      '--exclude=*.log',
      '--exclude=.env.local'
    ].join(' ');

    const tarCommand = `tar -czf "${backupPath}" ${excludePatterns} -C "${projectRoot}" .`;
    
    console.log('📦 システムファイルをアーカイブ中...');
    execSync(tarCommand, { stdio: 'inherit' });

    // 設定ファイルのバックアップ
    const configBackupDir = path.join(config.system.backup_path, 'configs');
    if (!fs.existsSync(configBackupDir)) {
      fs.mkdirSync(configBackupDir, { recursive: true });
    }

    const configFiles = [
      'wrangler.jsonc',
      'package.json',
      'next.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      '.gitignore'
    ];

    for (const configFile of configFiles) {
      const sourcePath = path.join(projectRoot, configFile);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(configBackupDir, `${configFile}_${timestamp}`);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`📄 設定ファイルをバックアップ: ${configFile}`);
      }
    }

    // メタデータファイルの作成
    const metadata = {
      timestamp: new Date().toISOString(),
      type: 'system',
      file: backupFileName,
      size: fs.statSync(backupPath).size,
      includes: [
        'Application source code',
        'Configuration files',
        'Database migrations',
        'Static assets'
      ],
      excludes: config.files.exclude_patterns,
      retention_until: new Date(Date.now() + config.system.retention_days * 24 * 60 * 60 * 1000).toISOString()
    };

    const metadataPath = path.join(config.system.backup_path, `${backupFileName}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`✅ システムバックアップが完了しました: ${backupPath}`);
    console.log(`📊 ファイルサイズ: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ システムバックアップでエラーが発生しました:', error.message);
  }
}

/**
 * バックアップリストの表示
 */
function listBackups() {
  console.log('📋 バックアップリストを表示中...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  const backupTypes = [
    { name: 'Database', path: config.database.backup_path, pattern: /database_backup_.*\.(sql|sqlite)(\.gz)?$/ },
    { name: 'System', path: config.system.backup_path, pattern: /system_backup_.*\.tar\.gz$/ }
  ];

  for (const type of backupTypes) {
    console.log(`\n=== ${type.name} Backups ===`);
    
    if (!fs.existsSync(type.path)) {
      console.log('バックアップディレクトリが見つかりません');
      continue;
    }

    const files = fs.readdirSync(type.path)
      .filter(file => type.pattern.test(file))
      .map(file => {
        const filePath = path.join(type.path, file);
        const stats = fs.statSync(filePath);
        const metadataPath = path.join(type.path, `${file}.meta.json`);
        
        let metadata = {};
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          } catch (error) {
            console.error(`メタデータの読み込みに失敗: ${error.message}`);
          }
        }

        return {
          file,
          size: stats.size,
          created: stats.ctime,
          metadata
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    if (files.length === 0) {
      console.log('バックアップファイルが見つかりません');
      continue;
    }

    for (const backup of files) {
      const sizeStr = (backup.size / 1024 / 1024).toFixed(2) + ' MB';
      const dateStr = backup.created.toLocaleString('ja-JP');
      console.log(`📦 ${backup.file}`);
      console.log(`   サイズ: ${sizeStr}`);
      console.log(`   作成日: ${dateStr}`);
      
      if (backup.metadata.retention_until) {
        const retentionDate = new Date(backup.metadata.retention_until);
        const isExpired = retentionDate < new Date();
        console.log(`   保持期限: ${retentionDate.toLocaleDateString('ja-JP')} ${isExpired ? '(期限切れ)' : ''}`);
      }
      console.log('');
    }
  }
}

/**
 * 期限切れバックアップの削除
 */
function cleanupExpiredBackups() {
  console.log('🧹 期限切れバックアップを削除中...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const now = new Date();
  let totalDeleted = 0;

  const backupDirs = [
    config.database.backup_path,
    config.system.backup_path
  ];

  for (const backupDir of backupDirs) {
    if (!fs.existsSync(backupDir)) continue;

    const files = fs.readdirSync(backupDir);
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const metadataPath = path.join(backupDir, `${file}.meta.json`);

      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          if (metadata.retention_until && new Date(metadata.retention_until) < now) {
            // メインファイルの削除
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️  削除しました: ${file}`);
            }
            
            // メタデータファイルの削除
            fs.unlinkSync(metadataPath);
            totalDeleted++;
          }
        } catch (error) {
          console.error(`メタデータの処理でエラー (${file}):`, error.message);
        }
      }
    }
  }

  console.log(`✅ 期限切れバックアップの削除が完了しました (削除数: ${totalDeleted})`);
}

/**
 * バックアップの復元
 */
async function restoreBackup(backupFile) {
  console.log(`🔄 バックアップを復元中: ${backupFile}`);
  
  if (!backupFile) {
    console.error('❌ バックアップファイルが指定されていません');
    return;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません。init コマンドを実行してください');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  try {
    // バックアップファイルの検索
    let backupPath = null;
    const searchDirs = [
      config.database.backup_path,
      config.system.backup_path
    ];

    for (const dir of searchDirs) {
      const fullPath = path.join(dir, backupFile);
      if (fs.existsSync(fullPath)) {
        backupPath = fullPath;
        break;
      }
    }

    if (!backupPath) {
      console.error('❌ バックアップファイルが見つかりません:', backupFile);
      return;
    }

    // バックアップタイプの判定
    if (backupFile.includes('database_backup')) {
      await restoreDatabaseBackup(backupPath);
    } else if (backupFile.includes('system_backup')) {
      await restoreSystemBackup(backupPath);
    } else {
      console.error('❌ 不明なバックアップタイプです');
    }

  } catch (error) {
    console.error('❌ バックアップの復元でエラーが発生しました:', error.message);
  }
}

/**
 * データベースバックアップの復元
 */
async function restoreDatabaseBackup(backupPath) {
  console.log('🗄️  データベースバックアップを復元中...');
  
  try {
    let sqlFile = backupPath;

    // 圧縮ファイルの場合は展開
    if (backupPath.endsWith('.gz')) {
      console.log('📦 圧縮ファイルを展開中...');
      execSync(`gunzip -k "${backupPath}"`, { stdio: 'inherit' });
      sqlFile = backupPath.replace('.gz', '');
    }

    // SQLファイルの場合
    if (sqlFile.endsWith('.sql')) {
      console.log('📥 SQLファイルからデータベースを復元中...');
      
      // 開発環境のデータベースリセット
      execSync('npm run db:reset', { stdio: 'inherit' });
      
      // SQLファイルをD1データベースに適用
      const restoreCommand = `wrangler d1 execute webapp-production --local --file="${sqlFile}"`;
      execSync(restoreCommand, { stdio: 'inherit' });
      
      console.log('✅ データベースの復元が完了しました');
    }
    
    // SQLiteファイルの場合
    else if (sqlFile.endsWith('.sqlite')) {
      console.log('📥 SQLiteファイルからデータベースを復元中...');
      
      const localDbPath = './.wrangler/state/v3/d1/local-development-db.sqlite';
      const localDbDir = path.dirname(localDbPath);
      
      // ディレクトリの作成
      if (!fs.existsSync(localDbDir)) {
        fs.mkdirSync(localDbDir, { recursive: true });
      }
      
      // SQLiteファイルをコピー
      fs.copyFileSync(sqlFile, localDbPath);
      
      console.log('✅ SQLiteデータベースの復元が完了しました');
    }

  } catch (error) {
    console.error('❌ データベース復元でエラーが発生しました:', error.message);
  }
}

/**
 * システムバックアップの復元
 */
async function restoreSystemBackup(backupPath) {
  console.log('🖥️  システムバックアップを復元中...');
  
  try {
    const projectRoot = path.join(__dirname, '..');
    const tempDir = path.join(__dirname, '..', 'temp_restore');

    // 一時ディレクトリの作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // バックアップファイルの展開
    console.log('📦 バックアップファイルを展開中...');
    execSync(`tar -xzf "${backupPath}" -C "${tempDir}"`, { stdio: 'inherit' });

    // 確認プロンプト
    console.log('⚠️  システムファイルの復元は既存のファイルを上書きします');
    const answer = require('readline-sync').question('続行しますか？ (y/N): ');
    
    if (answer.toLowerCase() !== 'y') {
      console.log('復元をキャンセルしました');
      // 一時ディレクトリの削除
      execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
      return;
    }

    // システムファイルの復元（慎重に）
    console.log('🔄 システムファイルを復元中...');
    
    // 重要でないファイルのみ復元（設定ファイルは除く）
    const safeFiles = [
      'components',
      'lib',
      'app',
      'public',
      'styles',
      'types',
      'hooks',
      'utils'
    ];

    for (const fileOrDir of safeFiles) {
      const sourcePath = path.join(tempDir, fileOrDir);
      const destPath = path.join(projectRoot, fileOrDir);
      
      if (fs.existsSync(sourcePath)) {
        execSync(`cp -r "${sourcePath}" "${destPath}"`, { stdio: 'inherit' });
        console.log(`✅ 復元しました: ${fileOrDir}`);
      }
    }

    // 一時ディレクトリの削除
    execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });

    console.log('✅ システムバックアップの復元が完了しました');
    console.log('🔄 依存関係の再インストールを推奨します: npm install');

  } catch (error) {
    console.error('❌ システム復元でエラーが発生しました:', error.message);
  }
}

/**
 * 使用方法の表示
 */
function showUsage() {
  console.log('');
  console.log('NEO Platform Backup Manager');
  console.log('');
  console.log('使用方法:');
  console.log('  node backup-manager.js <command> [options]');
  console.log('');
  console.log('コマンド:');
  console.log('  init                設定ファイルを初期化');
  console.log('  backup-db           データベースバックアップを作成');
  console.log('  backup-system       システムバックアップを作成');
  console.log('  backup-all          全てのバックアップを作成');
  console.log('  list                バックアップリストを表示');
  console.log('  cleanup             期限切れバックアップを削除');
  console.log('  restore <file>      バックアップを復元');
  console.log('  help                このヘルプを表示');
  console.log('');
  console.log('例:');
  console.log('  node backup-manager.js backup-db');
  console.log('  node backup-manager.js restore database_backup_2024-01-15T10-30-00-000Z.sql.gz');
  console.log('');
}

// メイン処理
async function main() {
  const command = process.argv[2];
  const argument = process.argv[3];

  switch (command) {
    case 'init':
      initConfig();
      break;
    case 'backup-db':
      await createDatabaseBackup();
      break;
    case 'backup-system':
      await createSystemBackup();
      break;
    case 'backup-all':
      await createDatabaseBackup();
      await createSystemBackup();
      break;
    case 'list':
      listBackups();
      break;
    case 'cleanup':
      cleanupExpiredBackups();
      break;
    case 'restore':
      await restoreBackup(argument);
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
  createDatabaseBackup,
  createSystemBackup,
  listBackups,
  cleanupExpiredBackups,
  restoreBackup
};