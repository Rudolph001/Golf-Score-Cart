#!/bin/bash
# Golf Scorecard — production startup script for Raspberry Pi
# Run this from the project root:  bash start-pi.sh

set -e

# Always execute from the directory containing this script
cd "$(dirname "$0")"

export NODE_ENV=production
export PORT="${PORT:-3000}"

echo ""
echo "  ⛳ Golf Scorecard"
echo "  ─────────────────────────────────────"
echo "  URL  : http://localhost:$PORT"
echo "  Mode : production"
echo ""

exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
