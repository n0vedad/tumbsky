#!/bin/bash
# Tumbsky Development Setup Script
# Automatically sets up environment and starts the dev server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Header
clear
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}         🎨 Tumbsky Development Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check/Create .env
echo -e "${BLUE}📋 Step 1/3: Checking environment...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}   Creating .env from .env.example...${NC}"
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
    cp .env.example .env
    echo -e "${GREEN}✅ .env created${NC}"

    # Generate secrets
    echo -e "${YELLOW}   Generating OAuth keys and secrets...${NC}"
    if command -v pnpm &>/dev/null; then
        pnpm env:setup
    elif command -v npm &>/dev/null; then
        npm run env:setup
    else
        echo -e "${RED}❌ npm/pnpm not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env exists${NC}"
fi

# Step 2: Check OAUTH_PUBLIC_URL
echo ""
echo -e "${BLUE}📋 Step 2/3: Checking OAuth configuration...${NC}"

OAUTH_URL=$(grep "^OAUTH_PUBLIC_URL=" .env | cut -d '=' -f2- || echo "")

# Check if configured
if [ -z "$OAUTH_URL" ] || [ "$OAUTH_URL" = "http://localhost:5173" ] || [ "$OAUTH_URL" = "" ]; then
    echo -e "${RED}❌ OAUTH_PUBLIC_URL not configured${NC}"
    echo ""
    echo -e "${CYAN}OAuth requires a public HTTPS URL. Choose one option:${NC}"
    echo ""
    echo -e "  ${GREEN}Option 1: Use a tunnel service${NC}"
    echo -e "    • ngrok: ${CYAN}ngrok http 5173${NC}"
    echo -e "    • cloudflared: ${CYAN}cloudflared tunnel --url http://localhost:5173${NC}"
    echo ""
    echo -e "  ${GREEN}Option 2: Manual setup${NC}"
    echo -e "    • Set up your own public server with nginx/caddy"
    echo -e "    • Configure DNS and SSL certificate"
    echo ""
    echo -e "${YELLOW}Then update .env with:${NC}"
    echo -e "  ${CYAN}OAUTH_PUBLIC_URL=https://your-tunnel-url.example.com${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ OAUTH_PUBLIC_URL configured: ${OAUTH_URL}${NC}"

# Check if URL is reachable
echo -e "${YELLOW}   Checking if URL is reachable...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$OAUTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌ Cannot connect to ${OAUTH_URL}${NC}"
    echo -e "${YELLOW}   Make sure your tunnel/server is running${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ URL is reachable (HTTP $HTTP_CODE)${NC}"

# Step 3: Start dev server
echo ""
echo -e "${BLUE}📋 Step 3/3: Starting development server...${NC}"
echo ""

# Check for pnpm/npm
if command -v pnpm &>/dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &>/dev/null; then
    PKG_MANAGER="npm run"
else
    echo -e "${RED}❌ npm/pnpm not found${NC}"
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Ready to start!${NC}"
echo ""
echo -e "  ${BLUE}Development server:${NC} http://localhost:5173"
if [ -n "$OAUTH_URL" ] && [ "$OAUTH_URL" != "http://localhost:5173" ]; then
    echo -e "  ${BLUE}Public URL:${NC} $OAUTH_URL"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start vite
$PKG_MANAGER dev:local
