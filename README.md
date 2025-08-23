# NEO福岡 企業マイページ

## プロジェクト概要
- **名前**: NEO福岡 企業マイページ
- **目的**: 会員企業向けの学習進捗・受講状況管理システム
- **主要機能**: ロール別ダッシュボード、講義サマリー、受講状況管理、ヒーロージャーニー進捗

## 現在完了している機能
- ✅ 基本認証システム（デモモード）
- ✅ ロール別データアクセス制御（会員企業管理者・アカデミア生）
- ✅ Notion API連携（公開企業DB・メンバーDB・出欠管理DB）
- ✅ レスポンシブUIレイアウト（左メニュー・中央パネル・右フィルタ）
- ✅ ホーム画面（統計サマリー・ヒーロージャーニー進捗）
- ✅ 講義サマリー画面（表形式表示・満足度・理解度・NPS）
- ✅ 受講状況画面（ロール別表示）
- ✅ マイ学習画面（アカデミア生専用）

## 機能API エンドポイント
- `GET /api/dashboard` - ダッシュボード統計データ取得
- `GET /api/companies` - 企業一覧取得（ロール別フィルタリング）
- `GET /api/members` - メンバー一覧取得（ロール別フィルタリング）
- `GET /api/attendance` - 出欠データ取得（ロール別フィルタリング）
- `GET /api/lectures` - 講義サマリー取得

### デモモード URL パラメータ
- `?demo_role=company_admin&company_id=company-001` - 企業管理者モード
- `?demo_role=academia_student&member_id=member-001` - アカデミア生モード

## まだ実装されていない機能
- ❌ 本格的な認証システム（JWT/OAuth実装）
- ❌ 非公開DBとの連携（企業カルテ・アンケート・相談・ヒーロー候補）
- ❌ 企業CSステップ管理
- ❌ 共創・相談状況管理
- ❌ ヒーロー候補状況管理
- ❌ 事務局・オーナーロールの実装

## 推奨される次の開発ステップ
1. **Notion API連携の設定** - .dev.varsファイルに実際のAPIキーとデータベースIDを設定
2. **データベース構造の確認** - Notion DBのプロパティ名とコードの整合性確認
3. **認証システムの強化** - JWT実装、セキュリティ向上
4. **第2スプリント機能追加** - 非公開DB連携、CSステップ、相談機能
5. **モバイル対応の改善** - カード表示、操作性向上

## データアーキテクチャ
- **データソース**: Notion API (8つのデータベース)
- **ストレージ**: Cloudflare Workers (エッジコンピューティング)
- **認証**: ロールベースアクセス制御
- **データ保護**: ロール別フィルタリング、統計値のみ表示機能

## ユーザーガイド
1. **企業管理者**: 自社の詳細データ確認、所属メンバーの受講状況管理
2. **アカデミア生**: 個人の出席履歴、学習進捗、フィードバック確認
3. **デモモード**: URLパラメータでロール切り替え可能
4. **ナビゲーション**: 左メニューから各機能へアクセス

## デプロイメント
- **プラットフォーム**: Cloudflare Pages
- **ステータス**: 🚧 開発中
- **技術スタック**: Hono + TypeScript + TailwindCSS + Notion API
- **最終更新**: 2024-08-23

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.dev.vars` ファイルにNotion APIキーとデータベースIDを設定:
```bash
NOTION_API_KEY=your_notion_api_key_here
PUBLIC_COMPANIES_DB=your_public_companies_database_id
PUBLIC_MEMBERS_DB=your_public_members_database_id
PUBLIC_ATTENDANCE_DB=your_public_attendance_database_id
```

### 3. 開発サーバーの起動
```bash
npm run build
npm run clean-port
pm2 start ecosystem.config.cjs
```

### 4. アクセス
- デモ（企業管理者）: http://localhost:3000?demo_role=company_admin&company_id=company-001
- デモ（アカデミア生）: http://localhost:3000?demo_role=academia_student&member_id=member-001

### 5. デプロイ
```bash
npm run deploy
```
