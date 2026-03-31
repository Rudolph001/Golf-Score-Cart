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

# --kiosk         : true fullscreen, suppresses unresponsive-page dialogs
# --noerrdialogs  : suppresses all error pop-ups
# --disable-infobars : hides "Chrome is not your default browser" bar
cage -- chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --no-first-run \
  --no-default-browser-check \
  "$APP_URL" >> "$LOG" 2>&1

echo "$(date): cage exited with code $?" >> "$LOG"
sleep 5
