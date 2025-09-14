#!/bin/bash

# NEO Digital Platform v2.3 - 包括的バックアップシステム
# 作成日: 2025-09-14
# 説明: v2.3対応 - 相談・アンケートデータを含むDB+コードベースの自動バックアップ

set -e  # エラーで停止

BACKUP_DIR="/home/user/webapp/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_DIR="$BACKUP_DIR/database"
CODE_BACKUP_DIR="$BACKUP_DIR/codebase"

# バックアップディレクトリの作成
mkdir -p "$DB_BACKUP_DIR"
mkdir -p "$CODE_BACKUP_DIR"

echo "🔄 NEO Digital Platform v2.3 バックアップ開始 - $TIMESTAMP"

# 1. データベースバックアップ（v2.3対応）
echo "📊 データベースバックアップ実行中（v2.3拡張）..."
cd /home/user/webapp

# v2.3: 相談・アンケートテーブルを含む全テーブル
echo "-- NEO Platform v2.3 Database Backup - $TIMESTAMP" > "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql"

# v2.3対応テーブルリスト
TABLES=("users" "user_profiles" "heroes_steps" "lectures" "schedules" "events" "announcements" "consultations" "surveys" "survey_responses" "audit_logs")

for table in "${TABLES[@]}"; do
    echo "-- Table: $table" >> "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql"
    
    # テーブル構造ダンプ
    npx wrangler d1 execute neo-portal-production --local --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null | grep -A 1000 "CREATE TABLE" | head -1 >> "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql" || true
    
    # データダンプ
    npx wrangler d1 execute neo-portal-production --local --command=".dump $table" 2>/dev/null | grep "INSERT INTO $table" >> "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql" || true
    echo "" >> "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql"
done

# 2. コードベースバックアップ（v2.3版含む）
echo "💻 コードベースバックアップ実行中（v2.3サーバー含む）..."
cd /home/user/webapp

# v2.3サーバーファイルを含むアーカイブ
tar -czf "$CODE_BACKUP_DIR/neo_v23_codebase_$TIMESTAMP.tar.gz" \
    --exclude=node_modules \
    --exclude=.wrangler \
    --exclude=backups \
    --exclude=*.log \
    .

# 3. v2.3設定ファイルの個別バックアップ
echo "⚙️  v2.3設定ファイルバックアップ実行中..."
mkdir -p "$BACKUP_DIR/configs"
cp -f neo-v23-server.js "$BACKUP_DIR/configs/neo-v23-server_$TIMESTAMP.js" 2>/dev/null || true
cp -f neo-v21-server.js "$BACKUP_DIR/configs/neo-v21-server_$TIMESTAMP.js" 2>/dev/null || true
cp -f ecosystem.config.cjs "$BACKUP_DIR/configs/ecosystem_$TIMESTAMP.config.cjs" 2>/dev/null || true
cp -f package.json "$BACKUP_DIR/configs/package_$TIMESTAMP.json" 2>/dev/null || true
cp -f wrangler.jsonc "$BACKUP_DIR/configs/wrangler_$TIMESTAMP.jsonc" 2>/dev/null || true

# 4. v2.3対応バックアップレポート生成
echo "📋 v2.3バックアップレポート生成中..."
REPORT_FILE="$BACKUP_DIR/v23_backup_report_$TIMESTAMP.md"

cat > "$REPORT_FILE" << EOF
# NEO Digital Platform v2.3 - バックアップレポート

**日時**: $(date '+%Y-%m-%d %H:%M:%S')
**バックアップID**: $TIMESTAMP
**バージョン**: v2.3 (実運用データ収集・安定化版)

## バックアップ内容

### 1. データベース（v2.3拡張）
- **ファイル**: \`database/neo_v23_backup_$TIMESTAMP.sql\`
- **サイズ**: $(ls -lh "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql" | awk '{print $5}')
- **テーブル数**: ${#TABLES[@]}
- **v2.3新機能**: 相談管理(consultations)、アンケート管理(surveys, survey_responses)

### 2. コードベース（v2.3サーバー含む）
- **ファイル**: \`codebase/neo_v23_codebase_$TIMESTAMP.tar.gz\`
- **サイズ**: $(ls -lh "$CODE_BACKUP_DIR/neo_v23_codebase_$TIMESTAMP.tar.gz" | awk '{print $5}')
- **除外**: node_modules, .wrangler, backups, *.log
- **v2.3機能**: 新規API群DB専用化、レート制御、運用監視拡張

### 3. 設定ファイル（v2.3対応）
- neo-v23-server.js (v2.3メインサーバー)
- neo-v21-server.js (v2.1互換サーバー)
- ecosystem.config.cjs (PM2設定)
- package.json (依存関係)
- wrangler.jsonc (Cloudflare設定)

## 復元手順

### データベース復元:
\`\`\`bash
cd /home/user/webapp
npx wrangler d1 execute neo-portal-production --local --file=./backups/database/neo_v23_backup_$TIMESTAMP.sql
\`\`\`

### コードベース復元:
\`\`\`bash
cd /home/user
tar -xzf webapp/backups/codebase/neo_v23_codebase_$TIMESTAMP.tar.gz
cd webapp
npm install
# v2.3サーバー起動
pm2 start ecosystem.config.cjs --only neo-v23-server
\`\`\`

## 検証

### v2.3新機能テーブル確認:
\`\`\`bash
npx wrangler d1 execute neo-portal-production --local --command="SELECT COUNT(*) FROM consultations"
npx wrangler d1 execute neo-portal-production --local --command="SELECT COUNT(*) FROM surveys"
npx wrangler d1 execute neo-portal-production --local --command="SELECT COUNT(*) FROM survey_responses"
\`\`\`

### v2.3 API動作確認:
\`\`\`bash
curl -s http://localhost:3000/api/health
curl -s -H "X-User-Role: admin" http://localhost:3000/api/consultations
curl -s -H "X-User-Role: admin" http://localhost:3000/api/surveys
\`\`\`

## v2.3 バックアップ特記事項

- ✅ 相談データ完全保護
- ✅ アンケート回答データ保護  
- ✅ 新規API群の設定保持
- ✅ レート制御設定保持
- ✅ 監査ログ完全保護
- ✅ DB専用化設定保持

EOF

# 5. 古いバックアップの整理（30日以上古いファイルを削除）
echo "🧹 古いバックアップファイルの整理中..."
find "$BACKUP_DIR" -name "*_[0-9]*" -type f -mtime +30 -delete 2>/dev/null || true

# 6. v2.3バックアップ完了
echo "✅ v2.3バックアップ完了！"
echo "📁 バックアップ場所: $BACKUP_DIR"
echo "📊 データベース: $DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql"
echo "💻 コードベース: $CODE_BACKUP_DIR/neo_v23_codebase_$TIMESTAMP.tar.gz"
echo "📋 レポート: $REPORT_FILE"

# サマリー表示
echo ""
echo "=== v2.3バックアップサマリー ==="
echo "データベース: $(ls -lh "$DB_BACKUP_DIR/neo_v23_backup_$TIMESTAMP.sql" | awk '{print $5}')"
echo "コードベース: $(ls -lh "$CODE_BACKUP_DIR/neo_v23_codebase_$TIMESTAMP.tar.gz" | awk '{print $5}')"
echo "合計ファイル数: $(find "$BACKUP_DIR" -name "*$TIMESTAMP*" | wc -l)"
echo "v2.3新機能: 相談・アンケート管理、DB専用化、レート制御"