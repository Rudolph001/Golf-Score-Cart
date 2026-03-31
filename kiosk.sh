#!/bin/bash
# Golf Scorecard — Kiosk launcher for Raspberry Pi
# Uses cage (Wayland kiosk compositor) + epiphany-browser
# cage handles fullscreen — no need for epiphany application-mode

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

echo "$(date): Launching cage..." >> "$LOG"

# cage runs epiphany fullscreen in a minimal Wayland session
# WLR_RENDERER=pixman forces software rendering (avoids EGL/GL errors on Pi)
# GTK_A11Y=none suppresses accessibility bus pop-up warnings
WLR_RENDERER=pixman GTK_A11Y=none cage -- epiphany-browser "$APP_URL" >> "$LOG" 2>&1

echo "$(date): cage exited with code $?" >> "$LOG"
sleep 5
