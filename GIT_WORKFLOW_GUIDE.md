# NEO Portal バージョン管理・Git ワークフローガイド

## 🎯 ブランチ戦略概要

NEOポータルでは**GitFlow**ベースの本番・ステージング環境分離戦略を採用しています。

### 🌳 ブランチ構成

| ブランチ名 | 環境 | 用途 | 保護レベル |
|-----------|------|------|----------|
| `main` | **本番環境** | 本番デプロイ用 | 🔒 保護ブランチ |
| `staging` | **ステージング環境** | テスト・検証用 | ⚠️ レビュー必須 |
| `feature/*` | 開発環境 | 機能開発用 | 📝 開発用 |
| `hotfix/*` | 緊急対応 | 緊急修正用 | 🚨 緊急用 |

## 🚀 デプロイメント環境

### 本番環境 (main ブランチ)
- **URL**: `https://neo.pages.dev` (Cloudflare Pages)
- **データベース**: Cloudflare D1 本番インスタンス
- **デプロイ条件**: staging からのマージ後のみ
- **自動デプロイ**: main ブランチへのプッシュ時

### ステージング環境 (staging ブランチ)  
- **URL**: `https://staging.neo.pages.dev`
- **データベース**: Cloudflare D1 ステージング用
- **デプロイ条件**: Pull Request 承認後
- **自動デプロイ**: staging ブランチへのプッシュ時

## 📋 開発ワークフロー

### 1️⃣ 新機能開発

```bash
# 1. 最新のstagingブランチから機能ブランチを作成
git checkout staging
git pull origin staging
git checkout -b feature/新機能名

# 2. 開発作業を実施
# コード実装、テスト追加、ドキュメント更新

# 3. コミット（コミットメッセージ規約に従う）
git add .
git commit -m "feat: 新機能の実装

- 具体的な変更内容
- 追加した機能の説明
- 関連するファイルの更新"

# 4. プッシュしてPull Request作成
git push origin feature/新機能名
# GitHub上でPull Request作成: feature/新機能名 → staging
```

### 2️⃣ ステージング環境へのデプロイ

```bash
# 1. Pull Requestレビュー・承認後
# 2. stagingブランチにマージ
git checkout staging
git merge feature/新機能名
git push origin staging

# 3. ステージング環境で検証
# URL: https://staging.neo.pages.dev
# 動作確認、統合テスト実施
```

### 3️⃣ 本番環境へのデプロイ

```bash
# 1. ステージング環境での検証完了後
git checkout main
git merge staging
git push origin main

# 2. 本番環境に自動デプロイ実行
# URL: https://neo.pages.dev
# 本番環境での最終確認
```

### 4️⃣ 緊急修正（Hotfix）

```bash
# 1. mainブランチから緊急修正ブランチ作成
git checkout main
git pull origin main
git checkout -b hotfix/緊急修正内容

# 2. 修正実装・テスト
git add .
git commit -m "fix: 緊急修正の内容"

# 3. main/stagingの両方にマージ
git checkout main
git merge hotfix/緊急修正内容
git push origin main

git checkout staging  
git merge hotfix/緊急修正内容
git push origin staging
```

## 📝 コミットメッセージ規約

### フォーマット
```
<type>: <subject>

<body>

<footer>
```

### タイプ一覧
- `feat`: 新機能追加
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードフォーマット変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

### 例
```
feat: ユーザー管理機能に権限フィルタリング機能を追加

- 管理者権限でのユーザー一覧表示機能
- 役職別フィルタリング機能
- 検索機能の改善

Fixes #123
```

## 🔐 ブランチ保護ルール

### main ブランチ
- ✅ Pull Request必須
- ✅ レビュー承認必須（1名以上）
- ✅ ステータスチェック必須
- ✅ 管理者による直接プッシュ禁止
- ✅ Force Push禁止

### staging ブランチ  
- ✅ Pull Request必須
- ✅ ステータスチェック必須
- ✅ Force Push禁止

## 🚦 CI/CD パイプライン

### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build application  
        run: npm run build
      - name: Deploy to Cloudflare Pages
        run: npx wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 📊 リリース管理

### バージョニング
- **メジャー**: v1.0.0, v2.0.0（破壊的変更）
- **マイナー**: v1.1.0, v1.2.0（新機能追加）  
- **パッチ**: v1.0.1, v1.0.2（バグ修正）

### リリースプロセス
1. **開発完了**: staging ブランチでの検証完了
2. **リリース準備**: CHANGELOG.md 更新
3. **バージョンタグ**: `git tag v1.2.0`
4. **本番デプロイ**: main ブランチにマージ
5. **リリースノート**: GitHub Releases で公開

## 🔧 ローカル開発環境

```bash
# プロジェクトクローン
git clone https://github.com/spotsuku/neo.git
cd neo

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集

# データベースマイグレーション
npm run db:migrate:local

# 開発サーバー起動
npm run dev:sandbox
```

## 🆘 トラブルシューティング

### よくある問題

**1. マージコンフリクト**
```bash
git status
git diff
# コンフリクト解消後
git add .
git commit -m "resolve: マージコンフリクト解消"
```

**2. ブランチ同期ずれ**  
```bash
git fetch origin
git rebase origin/staging
```

**3. 間違ったコミット**
```bash
# 直前のコミット取り消し
git reset --soft HEAD~1

# 強制的に戻す（注意）
git reset --hard HEAD~1
```

## 📞 サポート・質問

- **技術的質問**: GitHub Issues
- **緊急時対応**: プロジェクト管理者へ直接連絡
- **ドキュメント更新**: Pull Request でご提案

---

**最終更新**: 2024-09-07  
**ドキュメントバージョン**: v1.0.0