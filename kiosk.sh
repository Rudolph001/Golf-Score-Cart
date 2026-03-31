#!/bin/bash
# Golf Scorecard — Kiosk launcher for Raspberry Pi
# Uses cage (Wayland kiosk compositor) + Chromium in kiosk mode

PORT="${PORT:-3000}"
APP_URL="http://localhost:$PORT"
LOG="$HOME/kiosk.log"

echo "$(date): kiosk.sh started" >> "$LOG"

# Wait until the app server actually responds (up to 3 minutes)
echo "Waiting for Golf Scorecard server..."
for i in $(seq 1 90); do
  if curl -sf "$APP_URL" > /dev/null 2>&1; then
    echo "Server is ready."
    echo "$(date): Server ready after $((i * 2))s" >> "$LOG"
    break
  fi
  sleep 2
done

echo "$(date): Launching cage + chromium..." >> "$LOG"

# Use the real chromium binary directly to bypass the Pi OS RAM-check wrapper
# The wrapper at /usr/bin/chromium shows a "less than 1GB" dialog we can't dismiss
CHROMIUM_BIN="/usr/lib/chromium/chromium"
if [ ! -x "$CHROMIUM_BIN" ]; then
  CHROMIUM_BIN=$(find /usr/lib/chromium* -maxdepth 1 -type f -name 'chrom*' 2>/dev/null | head -1)
fi
if [ ! -x "$CHROMIUM_BIN" ]; then
  CHROMIUM_BIN="chromium"
fi
echo "$(date): Using browser: $CHROMIUM_BIN" >> "$LOG"

# --kiosk         : true fullscreen, suppresses unresponsive-page dialogs
# --noerrdialogs  : suppresses all error pop-ups
# --disable-infobars : hides "Chrome is not your default browser" bar
cage -- "$CHROMIUM_BIN" \
  --ozone-platform=wayland \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --no-first-run \
  --no-default-browser-check \
  --password-store=basic \
  --use-mock-keychain \
  --disable-gpu \
  --disable-gpu-sandbox \
  --disable-software-rasterizer=false \
  "$APP_URL" >> "$LOG" 2>&1

echo "$(date): cage exited with code $?" >> "$LOG"
sleep 5
