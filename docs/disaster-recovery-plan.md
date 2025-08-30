# NEO Digital Platform - ディザスタリカバリ計画

## 概要

このドキュメントは、NEO Digital Platformのディザスタリカバリ（災害復旧）計画を定めています。システム障害、データ損失、セキュリティインシデントなどの緊急事態に対する対応手順を記載しています。

## 目次

1. [リスク評価](#リスク評価)
2. [復旧目標](#復旧目標)
3. [バックアップ戦略](#バックアップ戦略)
4. [緊急時対応手順](#緊急時対応手順)
5. [復旧手順](#復旧手順)
6. [テスト計画](#テスト計画)
7. [連絡体制](#連絡体制)
8. [定期見直し](#定期見直し)

## リスク評価

### 高リスク

- **Cloudflareサービス停止**: プラットフォーム全体の停止
- **データベース破損**: ユーザーデータの損失
- **セキュリティ侵害**: データ漏洩、改ざん
- **デプロイメント失敗**: アプリケーションの動作不良

### 中リスク

- **ストレージ障害**: ファイルデータの損失
- **認証システム障害**: ログイン不能
- **API制限超過**: サービス一時停止
- **設定ミス**: 機能の部分停止

### 低リスク

- **パフォーマンス低下**: レスポンス時間の増加
- **監視システム障害**: 状況把握の困難
- **第三者サービス停止**: 一部機能の制限

## 復旧目標

### RTO (Recovery Time Objective) - 復旧時間目標

| コンポーネント | 緊急度 | RTO |
|----------------|--------|-----|
| 認証システム | 最高 | 15分 |
| 基幹機能 | 高 | 30分 |
| ファイルアクセス | 高 | 1時間 |
| レポート機能 | 中 | 4時間 |
| 管理機能 | 中 | 8時間 |

### RPO (Recovery Point Objective) - 復旧時点目標

| データタイプ | 許容データ損失 |
|--------------|----------------|
| ユーザーデータ | 1時間以内 |
| システム設定 | 4時間以内 |
| ログデータ | 12時間以内 |
| 統計データ | 24時間以内 |

## バックアップ戦略

### 自動バックアップスケジュール

```bash
# データベースフルバックアップ（毎日）
0 2 * * * /usr/local/bin/node /app/scripts/backup-manager.js backup-db

# システムバックアップ（毎週）
0 1 * * 0 /usr/local/bin/node /app/scripts/backup-manager.js backup-system

# 期限切れバックアップの削除（毎月）
0 3 1 * * /usr/local/bin/node /app/scripts/backup-manager.js cleanup
```

### バックアップの保存場所

1. **プライマリ**: Cloudflare R2 (暗号化済み)
2. **セカンダリ**: ローカルストレージ (開発環境)
3. **オフサイト**: 外部ストレージサービス (本番環境のみ)

### バックアップ検証

- 毎週自動整合性チェック
- 月次復元テスト
- 四半期フル復旧テスト

## 緊急時対応手順

### Phase 1: 初期対応（発生から15分以内）

#### 1. インシデント検出

```bash
# システムヘルスチェック
curl -f https://your-platform.pages.dev/api/health

# 監視ダッシュボード確認
open https://your-platform.pages.dev/admin/monitoring

# Cloudflareステータス確認
open https://www.cloudflarestatus.com/
```

#### 2. 緊急連絡

1. **システム管理者への通知**
   - 電話: [管理者電話番号]
   - Email: admin@your-platform.com
   - Slack: #emergency-alerts

2. **ステークホルダーへの報告**
   - 事業責任者
   - 技術責任者
   - カスタマーサポート

#### 3. 影響範囲の特定

```bash
# アクセスログの確認
tail -f /var/log/cloudflare/access.log

# エラーログの確認  
tail -f /var/log/app/error.log

# パフォーマンス監視
node scripts/monitoring-setup.js stats
```

### Phase 2: 詳細調査（15-60分）

#### 1. 根本原因分析

```bash
# データベース接続テスト
wrangler d1 execute webapp-production --command="SELECT 1"

# ストレージ接続テスト
wrangler r2 object head neo-platform-files/test-file

# KV接続テスト
wrangler kv:key get --binding=KV test-key
```

#### 2. 暫定対応の実施

```bash
# メンテナンスモードの有効化
echo "true" | wrangler kv:key put --binding=KV maintenance_mode

# 緊急修正のデプロイ
npm run build:prod
wrangler pages deploy out --project-name neo-platform
```

### Phase 3: 本格復旧（1-4時間）

#### 1. バックアップからの復旧

```bash
# 利用可能なバックアップの確認
node scripts/backup-manager.js list

# データベースの復元
node scripts/backup-manager.js restore database_backup_latest.sql.gz

# システムファイルの復元（必要な場合）
node scripts/backup-manager.js restore system_backup_latest.tar.gz
```

#### 2. データ整合性の確認

```bash
# データベース整合性チェック
wrangler d1 execute webapp-production --command="PRAGMA integrity_check"

# ユーザーデータの検証
node scripts/data-validation.js --check-users --check-files

# システム設定の検証
node scripts/config-validation.js
```

## 復旧手順

### データベース復旧

#### 完全復旧

```bash
# 1. 現在のデータベースのバックアップ作成
node scripts/backup-manager.js backup-db

# 2. 最新のクリーンなバックアップから復元
node scripts/backup-manager.js restore database_backup_[timestamp].sql.gz

# 3. マイグレーションの適用
npm run db:migrate:prod

# 4. データ整合性チェック
wrangler d1 execute webapp-production --command="
  SELECT COUNT(*) as user_count FROM users;
  SELECT COUNT(*) as settings_count FROM system_settings;
"

# 5. アプリケーションテスト
npm test
```

#### 部分復旧（特定テーブル）

```bash
# 1. 問題のあるテーブルのバックアップ
wrangler d1 execute webapp-production --command="
  CREATE TABLE users_backup AS SELECT * FROM users;
"

# 2. テーブルの再作成
wrangler d1 migrations apply webapp-production

# 3. バックアップからデータ復元
node scripts/selective-restore.js --table=users --backup=latest
```

### ファイルストレージ復旧

```bash
# R2バケットの状態確認
wrangler r2 bucket list

# ファイルリストの取得
wrangler r2 object list neo-platform-files

# 損失ファイルの特定
node scripts/file-integrity-check.js

# バックアップからの復元
node scripts/restore-files.js --from-backup --verify-checksums
```

### アプリケーション復旧

```bash
# 1. 最新の安定版への切り戻し
git checkout tags/v1.0.0-stable
npm install
npm run build:prod

# 2. 緊急デプロイ
wrangler pages deploy out --project-name neo-platform

# 3. 動作確認
curl -f https://neo-platform.pages.dev/api/health
curl -f https://neo-platform.pages.dev/api/monitoring/dashboard

# 4. 段階的機能復旧
# - 認証システム
# - 基幹機能
# - 管理機能
```

## テスト計画

### 月次復旧テスト

```bash
#!/bin/bash
# monthly-dr-test.sh

echo "=== 月次災害復旧テスト開始 ==="

# 1. テスト環境の準備
export ENVIRONMENT=test
wrangler pages deploy out --project-name neo-platform-test

# 2. バックアップ作成テスト
node scripts/backup-manager.js backup-all

# 3. 復旧テスト
node scripts/backup-manager.js restore database_backup_latest.sql.gz

# 4. 機能テスト
npm run test:e2e:dr

# 5. レポート生成
node scripts/generate-dr-report.js --test-date=$(date +%Y-%m-%d)

echo "=== テスト完了 ==="
```

### 四半期フル復旧テスト

```bash
#!/bin/bash
# quarterly-full-dr-test.sh

echo "=== 四半期フル復旧テスト開始 ==="

# 1. 完全な本番環境シミュレーション
# 2. 全コンポーネントの停止・復旧
# 3. データ整合性の完全チェック
# 4. パフォーマンステスト
# 5. 復旧時間の測定
# 6. 改善提案の作成

echo "=== フルテスト完了 ==="
```

## 連絡体制

### 緊急連絡先

| 役割 | 氏名 | 電話 | Email | 責任範囲 |
|------|------|------|-------|----------|
| システム管理者 | [氏名] | [電話] | [Email] | 全体統括 |
| データベース管理者 | [氏名] | [電話] | [Email] | DB復旧 |
| セキュリティ担当 | [氏名] | [電話] | [Email] | セキュリティ |
| 事業責任者 | [氏名] | [電話] | [Email] | 事業判断 |

### エスカレーション手順

1. **レベル1** (0-30分): 現場での対応
2. **レベル2** (30分-2時間): 管理者による対応
3. **レベル3** (2時間以上): 経営層を含む対応

### 外部ベンダー連絡先

- **Cloudflare Support**: [サポートURL]
- **外部セキュリティ会社**: [連絡先]
- **法的相談先**: [弁護士事務所]

## 事後対応

### インシデント後レビュー

```bash
# 1. インシデントレポート作成
node scripts/incident-report.js --incident-id=[ID] --generate-report

# 2. 根本原因分析
node scripts/root-cause-analysis.js --logs --timeline --impact

# 3. 改善計画立案
# - 技術的改善
# - プロセス改善  
# - 予防策の実装

# 4. ステークホルダーへの報告
# - 影響範囲
# - 復旧時間
# - 再発防止策
```

### 学習・改善

- **技術的改善**: システム構成、監視強化
- **プロセス改善**: 手順の見直し、自動化推進
- **トレーニング**: チームメンバーのスキル向上
- **ドキュメント更新**: 手順書、連絡先の最新化

## 定期見直し

### 月次レビュー

- バックアップ状況の確認
- 復旧テスト結果の評価
- 連絡先情報の更新
- 手順書の修正

### 四半期レビュー

- リスク評価の見直し
- RTO/RPOの再評価
- 技術環境の変化への対応
- トレーニング計画の策定

### 年次レビュー

- DR計画の全面見直し
- 予算の再評価
- 組織体制の最適化
- 外部監査の実施

## 関連ドキュメント

- [システム運用手順書](./operational-procedures.md)
- [セキュリティインシデント対応手順](./security-incident-response.md)
- [バックアップ運用マニュアル](./backup-operations.md)
- [監視・アラート設定ガイド](./monitoring-guide.md)

## 更新履歴

| 日付 | バージョン | 更新内容 | 更新者 |
|------|------------|----------|--------|
| 2024-08-30 | 1.0.0 | 初版作成 | システム管理者 |

---

**重要**: このドキュメントは機密情報を含みます。適切な権限を持つ担当者のみがアクセスし、定期的な更新と訓練を実施してください。