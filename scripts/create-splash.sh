#!/bin/bash
# Creates and installs a custom Golf Scorecard boot splash screen.
# Run once on the Pi after cloning the repo.

set -e

SPLASH_OUT="/tmp/golf-splash.png"
PLYMOUTH_SPLASH="/usr/share/plymouth/themes/pix/splash.png"

echo "Installing ImageMagick..."
sudo apt-get install -y imagemagick

echo "Generating splash image..."
convert -size 1280x720 \
  gradient:'#1a5c1a-#0a2e0a' \
  \
  -fill '#ffffff18' \
  -draw "circle 640,900 640,500" \
  \
  -font DejaVu-Sans-Bold \
  -pointsize 100 \
  -fill white \
  -gravity center \
  -annotate +0-80 "Golf Scorecard" \
  \
  -font DejaVu-Sans \
  -pointsize 36 \
  -fill '#90ee90' \
  -annotate +0+30 "Starting up, please wait..." \
  \
  -fill '#5aaa5a' \
  -draw "line 620,460 620,560" \
  -fill '#e8e8e8' \
  -draw "polygon 620,460 660,480 620,500" \
  -fill '#3a7a3a' \
  -draw "ellipse 620,568 18,6 0,360" \
  \
  "$SPLASH_OUT"

echo "Installing splash screen..."
sudo cp "$SPLASH_OUT" "$PLYMOUTH_SPLASH"

echo "Updating Plymouth..."
sudo plymouth-set-default-theme pix
sudo update-initramfs -u 2>/dev/null || true

echo ""
echo "Done! The custom Golf Scorecard boot screen will show on next reboot."
