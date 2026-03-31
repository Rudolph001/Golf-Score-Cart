#!/bin/bash
# Golf Scorecard — Kiosk launcher for Raspberry Pi
# Uses epiphany-browser (WebKitGTK) — much lighter than Chromium, no RAM warnings.

PORT="${PORT:-3000}"
APP_URL="http://localhost:$PORT"

# Disable screen blanking and power saving
xset s off
xset -dpms
xset s noblank

# Wait until the app server actually responds (up to 3 minutes)
echo "Waiting for Golf Scorecard server..."
for i in $(seq 1 90); do
  if curl -sf "$APP_URL" > /dev/null 2>&1; then
    echo "Server is ready."
    break
  fi
  sleep 2
done

# Start matchbox window manager — forces every window fullscreen with no titlebar
matchbox-window-manager -use_titlebar no &

# Remove stale profile lock if left over from a crash
rm -rf /tmp/epiphany-kiosk

# Launch epiphany in application mode (no address bar, no tabs, no browser chrome)
exec epiphany-browser \
  --application-mode \
  --profile=/tmp/epiphany-kiosk \
  "$APP_URL"
