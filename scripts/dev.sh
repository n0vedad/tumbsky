#!/bin/bash
# tumbsky - THE ONLY script you need
# handles EVERYTHING: setup, OAuth, dev server
# runs ONLY on the Pi

set -e

# colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="tumbsky"
PI_PROJECT_PATH="/var/www/oauth/$PROJECT_NAME"
TUNNEL_LOG="/tmp/cloudflared-$PROJECT_NAME-tunnel.log"
TUNNEL_PID_FILE="/tmp/cloudflared-$PROJECT_NAME.pid"
VITE_PID=""

# header
clear
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}         🎨 Tumbsky Development${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 shutting down...${NC}"

    if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
        echo -e "${YELLOW}  stopping vite${NC}"
        kill "$VITE_PID" 2>/dev/null || true
    fi

    if [ -f "$TUNNEL_PID_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo -e "${YELLOW}  stopping tunnel${NC}"
            kill "$TUNNEL_PID" 2>/dev/null || true
        fi
        rm -f "$TUNNEL_PID_FILE"
    fi

    if [ "$MODE" = "tunnel" ]; then
        echo -e "${YELLOW}  restoring .env${NC}"
        sed -i 's|^OAUTH_PUBLIC_URL=.*|OAUTH_PUBLIC_URL=http://localhost:5173|' .env 2>/dev/null || true
    fi

    echo -e "${GREEN}✅ cleanup complete${NC}"
    exit 0
}

trap cleanup INT TERM

# step 1: setup .env
echo -e "${BLUE}📋 step 1/8: checking environment...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}   creating .env from .env.example...${NC}"
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
    cp .env.example .env
    echo -e "${GREEN}✅ .env created${NC}"

    # generate secrets using pnpm/npm
    echo -e "${YELLOW}   generating OAuth keys...${NC}"
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

# step 2: set mode (named tunnel only)
echo ""
echo -e "${BLUE}📋 step 2/8: setting mode...${NC}"
MODE="named"
TUNNEL_URL="https://tumbsky.katerstrophal.world"
echo -e "${GREEN}✅ mode: named tunnel${NC}"

# step 3: check Pi setup
echo ""
echo -e "${BLUE}📋 step 3/8: checking Pi setup...${NC}"

if [ ! -d "$PI_PROJECT_PATH" ]; then
    echo -e "${YELLOW}   creating $PI_PROJECT_PATH...${NC}"
    sudo -u web mkdir -p "$PI_PROJECT_PATH" || exit 1
    echo -e "${GREEN}✅ directory created${NC}"
else
    echo -e "${GREEN}✅ directory exists${NC}"
fi

if ! systemctl is-active caddy.service &>/dev/null; then
    echo -e "${YELLOW}   caddy not running (required for OAuth metadata)${NC}"
    echo -e "${RED}❌ please ensure caddy is running: sudo systemctl status caddy${NC}"
    exit 1
fi
echo -e "${GREEN}✅ caddy running (OAuth metadata)${NC}"

# step 4: setup OAuth metadata
echo ""
echo -e "${BLUE}📋 step 4/8: OAuth metadata...${NC}"

METADATA_EXISTS=false
if [ -f "$PI_PROJECT_PATH/client-metadata.json" ] && [ -f "$PI_PROJECT_PATH/jwks.json" ]; then
    METADATA_EXISTS=true
    echo -e "${GREEN}✅ metadata exists${NC}"
fi

if [ "$METADATA_EXISTS" = false ]; then
    echo -e "${YELLOW}   generating metadata...${NC}"

    # extract private key from .env
    PRIVATE_KEY=$(grep "^OAUTH_PRIVATE_KEY_JWK=" .env | cut -d "'" -f2)
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌ OAUTH_PRIVATE_KEY_JWK not found in .env${NC}"
        exit 1
    fi

    # generate metadata using python
    python3 << PYEOF
import json

private_key = json.loads('$PRIVATE_KEY')

# extract public key
public_key = {
    'kty': private_key['kty'],
    'x': private_key['x'],
    'y': private_key['y'],
    'crv': private_key['crv'],
    'kid': private_key['kid'],
    'alg': private_key['alg']
}

# client metadata
client_metadata = {
    'client_id': 'https://oauth.katerstrophal.world/$PROJECT_NAME/client-metadata.json',
    'client_name': '$PROJECT_NAME',
    'redirect_uris': ['https://placeholder.example.com/oauth/callback'],
    'scope': 'atproto',
    'jwks_uri': 'https://oauth.katerstrophal.world/$PROJECT_NAME/jwks.json'
}

# jwks
jwks = {'keys': [public_key]}

# write to temp files
with open('/tmp/client-metadata.json', 'w') as f:
    json.dump(client_metadata, f, indent=2)

with open('/tmp/jwks.json', 'w') as f:
    json.dump(jwks, f, indent=2)

print('✓ generated')
PYEOF

    # copy files
    echo -e "${YELLOW}   copying files...${NC}"
    sudo -u web cp /tmp/client-metadata.json "$PI_PROJECT_PATH/client-metadata.json"
    sudo -u web cp /tmp/jwks.json "$PI_PROJECT_PATH/jwks.json"
    echo '<!DOCTYPE html><html><head><title>404</title></head><body><h1>404</h1><p>Not Found</p></body></html>' | sudo -u web tee "$PI_PROJECT_PATH/index.html" > /dev/null
    rm -f /tmp/client-metadata.json /tmp/jwks.json
    echo -e "${GREEN}✅ files created${NC}"
fi

# step 5: prepare URL
echo ""
echo -e "${BLUE}📋 step 5/8: preparing URL...${NC}"
PUBLIC_URL="$TUNNEL_URL"
REDIRECT_URI="${TUNNEL_URL}/oauth/callback"
echo -e "${GREEN}✅ URL: $TUNNEL_URL${NC}"

# step 6: update redirect_uri
if true; then
    echo ""
    echo -e "${BLUE}📋 step 6/8: updating redirect_uri...${NC}"

    python3 << PYEOF
import json
import os

PI_PROJECT_PATH = '$PI_PROJECT_PATH'
redirect_uri = '$REDIRECT_URI'

with open(os.path.join(PI_PROJECT_PATH, 'client-metadata.json'), 'r') as f:
    metadata = json.load(f)

if redirect_uri not in metadata['redirect_uris']:
    metadata['redirect_uris'] = [uri for uri in metadata['redirect_uris'] if 'placeholder' not in uri]
    metadata['redirect_uris'].append(redirect_uri)
    print('added')
else:
    print('exists')

target_path = os.path.join(PI_PROJECT_PATH, "client-metadata.json")
with open(target_path, 'w') as f:
    json.dump(metadata, f, indent=2)
    f.write('\n')
PYEOF

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ failed${NC}"
        cleanup
    fi

    echo -e "${GREEN}✅ updated${NC}"

    # update .env
    if grep -q "^OAUTH_PUBLIC_URL=" .env; then
        sed -i "s|^OAUTH_PUBLIC_URL=.*|OAUTH_PUBLIC_URL=${PUBLIC_URL}|" .env
    else
        echo "OAUTH_PUBLIC_URL=${PUBLIC_URL}" >> .env
    fi
fi

# step 7: install dependencies
echo ""
echo -e "${BLUE}📋 step 7/8: installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   running pnpm install...${NC}"
    pnpm install || npm install
    echo -e "${GREEN}✅ installed${NC}"
else
    echo -e "${GREEN}✅ already installed${NC}"
fi

# step 8: migrations
echo ""
echo -e "${BLUE}📋 step 8/8: migrations...${NC}"
if pnpm db:migrate 2>/dev/null || npm run db:migrate 2>/dev/null; then
    echo -e "${GREEN}✅ done${NC}"
else
    echo -e "${YELLOW}⚠️  skipped${NC}"
fi

# start vite
echo ""
echo -e "${BLUE}🚀 starting vite...${NC}"
echo ""

# named tunnel - just run vite normally
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 ready!${NC}"
echo ""
echo -e "  ${BLUE}tunnel:${NC} $TUNNEL_URL"
echo -e "  ${BLUE}login:${NC}  ${TUNNEL_URL}/login"
echo ""
echo -e "${YELLOW}press Ctrl+C to stop${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v pnpm &>/dev/null; then
    pnpm dev:local
else
    npm run dev:local
fi

# old tunnel mode code (not used anymore)
if false; then
    # start vite in background
    pnpm dev:local > /tmp/vite-$PROJECT_NAME.log 2>&1 &
    VITE_PID=$!

    # wait for vite to be ready
    echo -e "${YELLOW}   waiting for vite...${NC}"
    TIMEOUT=30
    ELAPSED=0

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if nc -z localhost 5173 2>/dev/null; then
            echo -e "${GREEN}✅ vite ready${NC}"
            break
        fi
        sleep 1
        ELAPSED=$((ELAPSED + 1))
    done

    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo -e "${RED}❌ vite timeout${NC}"
        kill $VITE_PID 2>/dev/null || true
        cleanup
    fi

    # now start tunnel
    echo ""
    echo -e "${BLUE}🌐 starting tunnel...${NC}"

    # kill any existing tunnels owned by this user first
    echo -e "${YELLOW}   cleaning up old tunnels...${NC}"
    pkill -f 'cloudflared tunnel --url' 2>/dev/null || true
    sleep 1

    rm -f "$TUNNEL_LOG"
    cloudflared tunnel --url http://localhost:5173 > "$TUNNEL_LOG" 2>&1 &
    echo $! > "$TUNNEL_PID_FILE"

    echo -e "${YELLOW}   waiting for URL...${NC}"
    TIMEOUT=15
    ELAPSED=0
    TUNNEL_URL=""

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if [ -f "$TUNNEL_LOG" ]; then
            TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
            if [ -n "$TUNNEL_URL" ]; then
                break
            fi
        fi
        sleep 1
        ELAPSED=$((ELAPSED + 1))
    done

    if [ -z "$TUNNEL_URL" ]; then
        echo -e "${RED}❌ tunnel timeout${NC}"
        kill $VITE_PID 2>/dev/null || true
        cleanup
    fi

    echo -e "${GREEN}✅ $TUNNEL_URL${NC}"
    PUBLIC_URL="$TUNNEL_URL"
    REDIRECT_URI="${TUNNEL_URL}/oauth/callback"

    # update redirect_uri
    echo ""
    echo -e "${BLUE}📋 updating redirect_uri...${NC}"

    python3 << PYEOF
import json
import os

PI_PROJECT_PATH = '$PI_PROJECT_PATH'
redirect_uri = '$REDIRECT_URI'

with open(os.path.join(PI_PROJECT_PATH, 'client-metadata.json'), 'r') as f:
    metadata = json.load(f)

if redirect_uri not in metadata['redirect_uris']:
    metadata['redirect_uris'] = [uri for uri in metadata['redirect_uris'] if 'placeholder' not in uri]
    metadata['redirect_uris'].append(redirect_uri)
    print('added')
else:
    print('exists')

target_path = os.path.join(PI_PROJECT_PATH, "client-metadata.json")
with open(target_path, 'w') as f:
    json.dump(metadata, f, indent=2)
    f.write('\n')
PYEOF

    echo -e "${GREEN}✅ updated${NC}"

    # update .env
    if grep -q "^OAUTH_PUBLIC_URL=" .env; then
        sed -i "s|^OAUTH_PUBLIC_URL=.*|OAUTH_PUBLIC_URL=${PUBLIC_URL}|" .env
    else
        echo "OAUTH_PUBLIC_URL=${PUBLIC_URL}" >> .env
    fi

    # summary
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ready!${NC}"
    echo ""
    echo -e "  ${BLUE}tunnel:${NC} $TUNNEL_URL"
    echo -e "  ${BLUE}login:${NC}  ${TUNNEL_URL}/login"
    echo ""
    echo -e "${YELLOW}press Ctrl+C to stop${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # tail vite log
    tail -f /tmp/vite-$PROJECT_NAME.log
fi

cleanup
