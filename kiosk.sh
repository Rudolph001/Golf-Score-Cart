#!/bin/bash
# Golf Scorecard — Chromium kiosk launcher for Raspberry Pi
# Launches fullscreen kiosk browser pointed at the local app.

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

# Remove any leftover Chromium lock files that can block startup after a crash
rm -f ~/.config/chromium/SingletonLock
rm -f ~/.config/chromium/SingletonCookie
rm -f ~/.config/chromium/SingletonSocket

# Launch Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --no-first-run \
  "$APP_URL"
