#!/bin/bash
# Golf Scorecard — auto-update and start script
# This runs every time the Pi boots.
# It pulls the latest code from GitHub, rebuilds if anything changed, then starts the app.

set -e

cd /home/pi/Golf-Score-Cart

# Make sure pnpm is available
export PATH="/home/pi/.local/share/pnpm:$PATH"

echo ""
echo "  ⛳ Golf Scorecard — checking for updates..."
echo ""

# Remember the current commit before pulling
OLD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Pull latest changes from GitHub (silently)
git pull --quiet

# Get the new commit
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
  echo "  New update found — installing and rebuilding..."
  echo ""

  # Reinstall packages in case lockfile changed
  pnpm install

  # Rebuild the app
  pnpm run build:prod

  echo ""
  echo "  Update complete."
else
  echo "  Already up to date."
fi

echo ""
echo "  ⛳ Golf Scorecard"
echo "  ─────────────────────────────────────"
echo "  URL  : http://localhost:${PORT:-3000}"
echo "  Mode : production"
echo ""

export NODE_ENV=production
export PORT="${PORT:-3000}"
exec node --enable-source-maps /home/pi/Golf-Score-Cart/artifacts/api-server/dist/index.mjs
