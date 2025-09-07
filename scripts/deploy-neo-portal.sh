#!/bin/bash
# NEOポータル Cloudflare Pages デプロイスクリプト
# 使用方法: ./scripts/deploy-neo-portal.sh [staging|production]

set -e

# 引数チェック
ENVIRONMENT=${1:-production}
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "❌ 使用方法: $0 [staging|production]"
  exit 1
fi

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 NEOポータル デプロイ開始 (${ENVIRONMENT})${NC}"

# プロジェクト名設定
if [ "$ENVIRONMENT" = "staging" ]; then
  PROJECT_NAME="neo-portal-staging"
else
  PROJECT_NAME="neo-portal"
fi

echo -e "${YELLOW}📦 依存関係インストール...${NC}"
npm ci

echo -e "${YELLOW}🔨 Next.js ビルド・エクスポート実行...${NC}"
npm run build

echo -e "${YELLOW}☁️  Cloudflare Pages デプロイ...${NC}"
npx wrangler pages deploy ./out --project-name "$PROJECT_NAME"

echo -e "${GREEN}✅ デプロイ完了!${NC}"
echo -e "${BLUE}🌐 確認URL:${NC}"
if [ "$ENVIRONMENT" = "staging" ]; then
  echo "   Staging: https://$PROJECT_NAME.pages.dev"
else
  echo "   Production: https://app.neo-portal.jp"
  echo "   Backup: https://$PROJECT_NAME.pages.dev"
fi

echo -e "${YELLOW}📋 次の確認項目:${NC}"
echo "1. DNS設定: app.neo-portal.jp → Pages CNAME (Proxy ON)"
echo "2. Custom Domain: app.neo-portal.jp が Active"
echo "3. Workers ルート: app.neo-portal.jp/api/* → api.neo-portal.jp/*"
echo "4. CORS設定: API サーバーでapp.neo-portal.jp許可"
echo "5. 動作確認: https://app.neo-portal.jp でUI表示"