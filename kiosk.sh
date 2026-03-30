#!/bin/bash
# Golf Scorecard — Chromium kiosk launcher for Raspberry Pi
# Launches fullscreen kiosk browser pointed at the local app.
# Run AFTER the server is already started (or alongside it via autostart).

PORT="${PORT:-3000}"
APP_URL="http://localhost:$PORT"

# Give the server a moment to be ready (adjust if needed)
sleep 5

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
