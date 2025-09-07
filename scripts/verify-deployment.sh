#!/bin/bash
# NEOポータル 配信経路検証スクリプト
# 正しい配信経路が確立されているかを確認

set -e

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 NEOポータル 配信経路検証開始${NC}"
echo "=================================================="

# 検証対象ドメイン
UI_DOMAIN="https://app.neo-portal.jp"
API_DOMAIN="https://api.neo-portal.jp"

echo -e "${YELLOW}1. UI ドメイン検証 (Pages経由確認)${NC}"
echo "URL: $UI_DOMAIN"
echo "--------------------------------------------------"

# UIドメインの検証
UI_RESPONSE=$(curl -sI "$UI_DOMAIN" 2>/dev/null || echo "FAILED")
if [[ "$UI_RESPONSE" == "FAILED" ]]; then
  echo -e "${RED}❌ UI ドメインにアクセスできません${NC}"
else
  echo "$UI_RESPONSE" | sed -n '1p;/^server:/Ip;/^cf-cache-status:/Ip'
  
  if echo "$UI_RESPONSE" | grep -q "cf-cache-status"; then
    echo -e "${GREEN}✅ Cloudflare経由で配信されています${NC}"
  else
    echo -e "${RED}❌ Cloudflare経由ではありません${NC}"
  fi
fi

echo ""
echo -e "${YELLOW}2. API ドメイン検証 (/status エンドポイント)${NC}"
echo "URL: $API_DOMAIN/status"
echo "--------------------------------------------------"

# API /status の検証
API_STATUS_RESPONSE=$(curl -sI "$API_DOMAIN/status" 2>/dev/null || echo "FAILED")
if [[ "$API_STATUS_RESPONSE" == "FAILED" ]]; then
  echo -e "${RED}❌ API /status エンドポイントにアクセスできません${NC}"
else
  echo "$API_STATUS_RESPONSE" | sed -n '1p;/^server:/Ip'
  
  if echo "$API_STATUS_RESPONSE" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ API /status は正常に応答しています${NC}"
  else
    echo -e "${RED}❌ API /status が 200 OK を返していません${NC}"
  fi
fi

echo ""
echo -e "${YELLOW}3. API ルート検証 (/ は404であることを確認)${NC}"
echo "URL: $API_DOMAIN/"
echo "--------------------------------------------------"

# API root の検証
API_ROOT_RESPONSE=$(curl -sI "$API_DOMAIN/" 2>/dev/null || echo "FAILED")
if [[ "$API_ROOT_RESPONSE" == "FAILED" ]]; then
  echo -e "${RED}❌ API ルートにアクセスできません${NC}"
else
  echo "$API_ROOT_RESPONSE" | sed -n '1p'
  
  if echo "$API_ROOT_RESPONSE" | grep -q "404\|301\|302"; then
    echo -e "${GREEN}✅ API ルート (/) は正しく制限されています${NC}"
  else
    echo -e "${RED}❌ API ルート (/) がUIコンテンツを返している可能性があります${NC}"
  fi
fi

echo ""
echo -e "${YELLOW}4. API ヘルスチェック検証${NC}"
echo "URL: $API_DOMAIN/api/health"
echo "--------------------------------------------------"

# API health の検証
API_HEALTH_RESPONSE=$(curl -sI "$API_DOMAIN/api/health" 2>/dev/null || echo "FAILED")
if [[ "$API_HEALTH_RESPONSE" == "FAILED" ]]; then
  echo -e "${YELLOW}⚠️  API /api/health エンドポイントにアクセスできません (実装待ちの可能性)${NC}"
else
  echo "$API_HEALTH_RESPONSE" | sed -n '1p'
  
  if echo "$API_HEALTH_RESPONSE" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ API /api/health は正常に応答しています${NC}"
  else
    echo -e "${YELLOW}⚠️  API /api/health が期待される応答ではありません${NC}"
  fi
fi

echo ""
echo -e "${YELLOW}5. CORS ヘッダー検証${NC}"
echo "Origin: $UI_DOMAIN → API"
echo "--------------------------------------------------"

# CORS検証
CORS_RESPONSE=$(curl -sI -H "Origin: $UI_DOMAIN" "$API_DOMAIN/status" 2>/dev/null || echo "FAILED")
if [[ "$CORS_RESPONSE" == "FAILED" ]]; then
  echo -e "${RED}❌ CORS検証に失敗しました${NC}"
else
  if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS ヘッダーが設定されています${NC}"
    echo "$CORS_RESPONSE" | grep "Access-Control-Allow-Origin"
  else
    echo -e "${RED}❌ CORS ヘッダーが設定されていません${NC}"
  fi
fi

echo ""
echo "=================================================="
echo -e "${BLUE}🎯 検証完了${NC}"
echo ""
echo -e "${YELLOW}📋 期待される結果:${NC}"
echo "✅ UI: Cloudflare/Pages 経由で配信"
echo "✅ API /status: 200 OK"
echo "✅ API /: 404 または 301/302 リダイレクト"
echo "✅ CORS: Access-Control-Allow-Origin ヘッダーあり"
echo ""

# 最終判定
if [[ "$UI_RESPONSE" != "FAILED" ]] && echo "$UI_RESPONSE" | grep -q "cf-cache-status" && \
   [[ "$API_STATUS_RESPONSE" != "FAILED" ]] && echo "$API_STATUS_RESPONSE" | grep -q "200 OK" && \
   [[ "$API_ROOT_RESPONSE" != "FAILED" ]] && echo "$API_ROOT_RESPONSE" | grep -q "404\|301\|302"; then
  echo -e "${GREEN}🎉 基本的な配信経路は正しく設定されています！${NC}"
else
  echo -e "${RED}⚠️  配信経路に問題がある可能性があります。上記の結果を確認してください。${NC}"
  echo -e "${YELLOW}📚 詳細な対処法: DEPLOYMENT_CHECKLIST.md を参照${NC}"
fi