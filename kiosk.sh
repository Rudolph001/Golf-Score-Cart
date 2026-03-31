#!/bin/bash
# Golf Scorecard — Kiosk launcher for Raspberry Pi
# Uses cage (Wayland kiosk compositor) + epiphany-browser
# Works on Raspberry Pi OS Bookworm which uses Wayland (labwc) by default

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

# Create fresh epiphany profile directory
rm -rf /tmp/epiphany-kiosk
mkdir -p /tmp/epiphany-kiosk

echo "$(date): Launching cage..." >> "$LOG"

# cage is a Wayland compositor that runs one app fullscreen — no desktop, no taskbar
# Note: no 'exec' here so the shell survives if cage crashes (prevents infinite loop)
cage -- epiphany-browser \
  --application-mode \
  --profile=/tmp/epiphany-kiosk \
  "$APP_URL" >> "$LOG" 2>&1

echo "$(date): cage exited with code $?" >> "$LOG"
sleep 5
