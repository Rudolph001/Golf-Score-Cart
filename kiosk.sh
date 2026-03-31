#!/bin/bash
# Golf Scorecard — Kiosk launcher for Raspberry Pi
# Uses cage (Wayland kiosk compositor) + epiphany-browser
# Works on Raspberry Pi OS Bookworm which uses Wayland (labwc) by default

PORT="${PORT:-3000}"
APP_URL="http://localhost:$PORT"

# Wait until the app server actually responds (up to 3 minutes)
echo "Waiting for Golf Scorecard server..."
for i in $(seq 1 90); do
  if curl -sf "$APP_URL" > /dev/null 2>&1; then
    echo "Server is ready."
    break
  fi
  sleep 2
done

# Create fresh epiphany profile directory
rm -rf /tmp/epiphany-kiosk
mkdir -p /tmp/epiphany-kiosk

# cage is a Wayland compositor that runs one app fullscreen — no desktop, no taskbar
exec cage -- epiphany-browser \
  --application-mode \
  --profile=/tmp/epiphany-kiosk \
  "$APP_URL"
