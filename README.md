# NEO デジタルプラットフォーム

## プロジェクト概要
- **名前**: NEO デジタルプラットフォーム（マルチテナント統合システム）
- **目的**: 企業マイページとアカデミア生ポータルを統合した地域展開対応プラットフォーム
- **特徴**: マルチテナント・4ロール対応・地域別データ分離・セキュアなアクセス制御

## 完了した機能（MVP + フル統合版 + メンバーカルテ機能）

### 🌐 マルチテナント基盤
- ✅ 地域別データ分離（FUK・ISK・NIG地域対応）
- ✅ region_id による全APIスコープ管理
- ✅ 地域スイッチャー（権限別アクセス制御）
- ✅ 地域横断比較ビュー（統計のみ、匿名化対応）

### 🔐 認証・権限システム
- ✅ 4ロール完全対応（company_admin / student / secretariat / owner）
- ✅ 地域別アクセス権限制御
- ✅ ロール別データフィルタリング
- ✅ セキュアなデータマスキング（統計値のみ表示）
- ✅ 監査ログ機能（アクセス記録）

### 📊 データベース連携
- ✅ 13のNotion DB対応（private/public分離）
- ✅ 地域フィルタ付きデータ取得
- ✅ パフォーマンス最適化（バッチ処理・キャッシュ）
- ✅ エラーハンドリング・再試行機能

### 🎯 メンバーカルテ機能（NEW!）
- ✅ 受講生一覧ページ（検索・フィルタ機能付き）
- ✅ 氏名クリックでメンバーカルテ詳細ページへ遷移
- ✅ 3クラス編成・5人1チーム自動分類
- ✅ 日本語五十音順出席番号付与アルゴリズム
- ✅ 7セクション構成メンバーカルテ
  - 基本プロフィール（年齢・出身地・学歴・スキル・関心分野）
  - 個人アンケート結果（時系列表示）
  - アンケート比較分析（パーセンタイル・成長トレンド）
  - 事務局コメント（プライベート・パブリック分離）
  - 目標設定（進捗管理・マイルストーン）
  - チームメンバー（クラス・チーム情報）
  - 学習ログ（カテゴリ別・時間記録）
- ✅ 役割別アクセス制御（学生: 自分のみ、企業管理者: 自社メンバーのみ、事務局・オーナー: 全員）
- ✅ アンケート統計分析・パーセンタイル計算機能

### 🎯 企業マイページ（company_admin）
- ✅ 自社詳細データ + 他社統計表示
- ✅ 所属メンバー受講状況管理
- ✅ ヒーロージャーニー進捗追跡
- ✅ 地域・全体統計比較機能
- ✅ 講義サマリー（満足度・理解度・NPS）

### 🎓 学生ポータル（student）
- ✅ 授業一覧・スケジュール表示
- ✅ お知らせ（カテゴリ・優先度別）
- ✅ NEO公認プロジェクト参加募集
- ✅ 個人プロフィール管理
- ✅ 委員会情報・応募導線
- ✅ 企業情報検索（基本情報のみ）
- ✅ 資料アクセス（権限別）

### 🏢 事務局機能（secretariat）
- ✅ 地域ダッシュボード（全データアクセス）
- ✅ メンバー管理・検索機能
- ✅ 相談・マッチング管理
- ✅ アンケート分析機能
- ✅ 複数地域アクセス権限

### 👑 オーナー機能（owner）
- ✅ 監査ログ閲覧
- ✅ 地域横断比較ダッシュボード
- ✅ 全権限アクセス
- ✅ システム設定管理

## API エンドポイント

### 基本データ取得
- `GET /api/dashboard?region_id={region}` - 地域別ダッシュボード
- `GET /api/companies?region_id={region}` - 企業一覧（ロール別フィルタ）
- `GET /api/members?region_id={region}` - メンバー一覧（ロール別フィルタ）
- `GET /api/attendance?region_id={region}` - 出欠データ（ロール別フィルタ）

### コンテンツ・学習関連
- `GET /api/classes?region_id={region}` - 授業・講義データ
- `GET /api/announcements?region_id={region}` - お知らせ（ロール別フィルタ）
- `GET /api/neo-projects?region_id={region}` - NEO公認プロジェクト
- `GET /api/committees?region_id={region}` - 委員会情報
- `GET /api/documents?region_id={region}` - 資料・ドキュメント

### メンバーカルテ機能（NEW!）
- `GET /api/member-card/{memberId}?region_id={region}` - メンバーカルテ詳細取得（役割別アクセス制御）
- `PUT /api/member-card/{memberId}?region_id={region}` - メンバーカルテ更新（secretariat/owner限定）
- `GET /api/class-assignments?region_id={region}&year={year}` - クラス編成情報取得（secretariat/owner限定）
- `GET /api/survey-analytics?region_id={region}` - アンケート分析統計（secretariat/owner限定）

### 特殊機能
- `GET /api/cross-region-stats` - 地域横断比較（owner/secretariat限定）

## デモアクセス方法

**本番URL**: https://3000-i76ahk7safxyzeqgo88vc-6532622b.e2b.dev

### 地域・ロール別デモURL（メンバーカルテ機能対応）
**福岡地域（FUK）**:
- 学生: `?demo_role=student&demo_region=FUK&member_id=member-FUK-001`
  - 受講生一覧から氏名クリックで自分のメンバーカルテ表示
- 企業管理者: `?demo_role=company_admin&demo_region=FUK&company_id=company-FUK-001`
  - 自社メンバーのカルテのみアクセス可能
- 事務局: `?demo_role=secretariat&demo_region=FUK`
  - 全メンバーカルテ閲覧・編集・クラス編成表示可能
- オーナー: `?demo_role=owner&demo_region=FUK`
  - 全権限・クラス編成・アンケート分析機能

**石川地域（ISK）**:
- 学生: `?demo_role=student&demo_region=ISK&member_id=member-ISK-001`
- 企業管理者: `?demo_role=company_admin&demo_region=ISK&company_id=company-ISK-001`

**新潟地域（NIG）**:
- 学生: `?demo_role=student&demo_region=NIG&member_id=member-NIG-001`
- 企業管理者: `?demo_role=company_admin&demo_region=NIG&company_id=company-NIG-001`

### メンバーカルテ機能テスト
1. 学生ロールで「受講生一覧」をクリック
2. メンバーカード内の氏名をクリック
3. 7セクション構成のメンバーカルテ詳細ページを確認
4. 事務局ロールで「クラス編成表示」ボタンをテスト

## 第2スプリント（未実装）
- ❌ 非公開DB完全連携（企業カルテ・アンケート・相談・ヒーロー候補）
- ❌ 企業CSステップ管理（①〜⑩フェーズ）
- ❌ 相談・マッチング詳細管理（カンバン形式）
- ❌ ヒーロー候補詳細管理
- ❌ 本格認証システム（JWT/OAuth）
- ❌ リアルタイム通知システム
- ❌ 統計エクスポート機能

## システム仕様

### 技術スタック
- **バックエンド**: Hono (Cloudflare Workers)
- **フロントエンド**: Vanilla JS + TailwindCSS
- **データベース**: Notion API (13データベース)
- **認証**: デモモード（本番はJWT予定）
- **デプロイ**: Cloudflare Pages

### セキュリティ・データ保護
- **地域分離**: 全データにregion_idスコープ適用
- **最小権限**: ロール別最小限データアクセス
- **統計化**: 他社・他地域データは統計値のみ
- **監査ログ**: 全アクセス記録・追跡可能
- **マスキング**: 機密データ自動マスク

### パフォーマンス
- **エッジ配信**: Cloudflare Workers活用
- **キャッシュ**: セッションレベルキャッシュ
- **バッチ処理**: 重い統計は定期バッチ処理
- **遅延読み込み**: 必要時オンデマンド取得

## セットアップ・開発

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.dev.vars` ファイルに13のNotion DBのAPIキー・IDを設定:
```bash
NOTION_API_KEY=your_notion_api_key_here

# 企業関連
PRIVATE_COMPANY_CARDS_DB=your_private_company_cards_database_id
PUBLIC_COMPANIES_DB=your_public_companies_database_id

# メンバー関連  
PRIVATE_MEMBER_CARDS_DB=your_private_member_cards_database_id
PUBLIC_MEMBERS_DB=your_public_members_database_id

# 学習・出欠関連
PRIVATE_SURVEYS_DB=your_private_surveys_database_id
PUBLIC_ATTENDANCE_DB=your_public_attendance_database_id
CLASSES_DB=your_classes_database_id

# 相談・マッチング関連
PRIVATE_MATCHING_DB=your_private_matching_database_id
PRIVATE_HERO_CANDIDATES_DB=your_private_hero_candidates_database_id

# コンテンツ・お知らせ関連
ANNOUNCEMENTS_DB=your_announcements_database_id
NEO_OFFICIAL_PROJECTS_DB=your_neo_official_projects_database_id
COMMITTEES_DB=your_committees_database_id
SYLLABUS_AND_DOCS_DB=your_syllabus_and_docs_database_id
```

### 3. 開発サーバーの起動
```bash
npm run build
pm2 start ecosystem.config.cjs
```

### 4. 本番デプロイ
```bash
npm run deploy
```

## データアーキテクチャ

### マルチテナント設計
- **地域分離**: region_id による完全データ分離
- **権限制御**: ロール×地域マトリクス管理
- **統計処理**: 匿名化・集計データ提供
- **監査証跡**: 全操作ログ記録

### ロール・権限マトリクス
| ロール | 自地域詳細 | 他地域詳細 | 自社詳細 | 他社詳細 | 非公開DB | 横断比較 |
|--------|------------|------------|-----------|-----------|----------|----------|
| student | ○ | × | × | × | × | × |
| company_admin | ○ | 統計のみ | ○ | 統計のみ | 一部 | × |
| secretariat | ○ | ○ | ○ | ○ | ○ | × |
| owner | ○ | ○ | ○ | ○ | ○ | ○ |

## 今後の展開
1. **第2スプリント機能完成** - 全非公開DB連携、CSステップ管理
2. **本格認証導入** - JWT/OAuth/SSO対応
3. **追加地域展開** - 他地域（関西・関東等）への拡張
4. **モバイルアプリ** - React Native/Flutter対応
5. **AI機能統合** - レコメンド・分析機能強化

## ユーザーガイド（メンバーカルテ機能）

### 受講生一覧の利用方法
1. **学生ロール**: サイドメニューから「受講生一覧」をクリック
2. **検索・フィルタ**: 氏名検索、選抜区分、ヒーローステップでフィルタ可能
3. **メンバーカルテアクセス**: 氏名をクリックして詳細ページへ遷移

### メンバーカルテの7セクション
1. **基本プロフィール**: 年齢・出身地・学歴・スキル・関心分野
2. **個人アンケート結果**: 過去のアンケート回答履歴
3. **アンケート比較分析**: 地域内パーセンタイル・成長トレンド表示
4. **事務局コメント**: プライベート・パブリック分離（権限別表示）
5. **目標設定**: 個人目標・進捗管理・マイルストーン
6. **チームメンバー**: クラス編成・チーム情報表示
7. **学習ログ**: カテゴリ別学習記録・時間管理

### クラス編成機能（事務局・オーナー限定）
- 3クラス・5人1チーム自動編成
- 日本語五十音順出席番号付与
- クラス編成表モーダル表示

## 最終更新
- **バージョン**: v2.1.0（メンバーカルテ機能追加）
- **更新日**: 2024-08-24
- **ライセンス**: Proprietary (NEO)
- **メンテナー**: NEO開発チーム