# Golf Scorecard — Fresh Install Guide for Raspberry Pi

This guide fixes every problem we encountered and walks you through a clean install from scratch.
Follow the steps **in order** — the Windows PC steps must happen before touching the Pi.

---

## PART 1 — Fix the Windows PC First (Do This Before Anything on the Pi)

This step generates a proper install list (lockfile) that includes the Pi's ARM64 packages.
Without this, the Pi tries to download 492 packages on its own and fails every time.

### Step 1 — Open a terminal on your Windows PC

Press the Windows key, type `cmd`, press Enter.

Navigate to the project folder:

    cd "E:\Golf Cart\Software\Golf-Score-Cart"

### Step 2 — Delete the old broken lockfile

    del pnpm-lock.yaml

### Step 3 — Regenerate the lockfile with Pi-compatible packages

    npx pnpm install --ignore-scripts

This will take a few minutes. Wait for it to finish completely.
You will see output like: `Progress: resolved 492, reused 0, downloaded 492, added 492`

### Step 4 — Commit and push the new lockfile to GitHub

    git add pnpm-lock.yaml .npmrc
    git commit -m "fix: add linux-arm64 packages to lockfile"
    git push

GitHub will ask for your username and password.
Use your **Personal Access Token** as the password (not your GitHub account password).

That is all you need to do on Windows. Now go to the Pi.

---

## PART 2 — Clean Up the Pi

### Step 5 — SSH into the Pi from your Windows PC

Open a new Command Prompt window and type:

    ssh pi@golfcart.local

If that does not work, use the Pi's IP address:

    ssh pi@192.168.x.x

### Step 6 — Remove the old broken installation

    rm -rf ~/Golf-Score-Cart

This deletes the old project folder with all its broken files. This is safe — the project code is on GitHub.

---

## PART 3 — Set Up the Pi (Only Needed Once)

### Step 7 — Add swap memory (prevents crashes during build)

The Pi has limited RAM. A swap file gives it extra breathing room.

    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

Confirm it worked:

    free -h

You should see a `Swap:` line showing about `1.0G`.

### Step 8 — Install tmux (protects against SSH disconnections)

If the SSH connection drops during a long install, tmux lets you reconnect and continue.

    sudo apt-get install -y tmux

### Step 9 — Install Node.js v20

    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

Verify:

    node -v

You should see `v20.x.x`.

### Step 10 — Install pnpm

    curl -fsSL https://get.pnpm.io/install.sh | sh -
    source ~/.bashrc

Verify:

    pnpm -v

You should see `10.x.x` or similar.

---

## PART 4 — Install and Build the App

### Step 11 — Start tmux (do this before anything else)

    tmux

You are now inside a protected session. If SSH drops, reconnect and type `tmux attach` to resume.

### Step 12 — Clone the project

    cd ~
    git clone https://github.com/Rudolph001/Golf-Score-Cart.git Golf-Score-Cart

GitHub will ask for your username and password.
Use your **Personal Access Token** as the password.

### Step 13 — Install packages and build

    cd ~/Golf-Score-Cart && pnpm install && pnpm run build:prod

Because of the lockfile you generated on Windows in Part 1, this will be fast.
pnpm will only download ~20 ARM64-specific files instead of 500+ packages.

Wait for the build to finish. You will see output ending with something like:

    dist/public/index.html    x.xx kB
    dist/public/assets/...    xxx kB

That means the build succeeded.

### Step 14 — Test the app manually

    bash ~/Golf-Score-Cart/start-pi.sh

You should see:

    Golf Scorecard
    URL  : http://localhost:3000
    Mode : production

Open a browser on your phone or laptop (on the same Wi-Fi) and go to:

    http://golfcart.local:3000

You should see the Golf Scorecard app. Press Ctrl+C to stop it.

---

## PART 5 — Make the App Start Automatically on Boot

### Step 15 — Install the auto-start service

    sudo cp ~/Golf-Score-Cart/golf-scorecard.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable golf-scorecard
    sudo systemctl start golf-scorecard

### Step 16 — Confirm it is running

    sudo systemctl status golf-scorecard

You should see `Active: active (running)` in green. Press `q` to exit.

The app now starts automatically every time the Pi powers on.

---

## PART 6 — Updating the App in the Future

The Pi is set up to **automatically check for updates every time it boots**. When it starts up it will:
1. Pull the latest code from GitHub
2. Reinstall packages if anything changed
3. Rebuild the app if anything changed
4. Start the app

So in most cases, all you need to do is:

**On your Windows PC — push your changes:**

    cd "E:\Golf Cart\Software\Golf-Score-Cart"
    git add .
    git commit -m "describe what you changed"
    git push

**Then reboot the Pi:**

    sudo reboot

The Pi will boot, detect the new code, rebuild automatically, and start the app. No other input needed.

---

### If you want the update to happen without rebooting

SSH into the Pi and run:

    sudo systemctl restart golf-scorecard

This restarts the service which runs the update script again — it will pull, rebuild if needed, and restart the app.

To watch the update progress live:

    journalctl -u golf-scorecard -f

Press Ctrl+C when done watching.

---

## PART 7 — Show the App on the Pi's Own Screen (Kiosk Mode)

If the Pi has a screen connected (HDMI or touchscreen), you can make the app open fullscreen automatically on boot.
The app will be the ONLY thing on screen — no desktop, no taskbar, no icons.

### Step 17 — Pull the latest files from GitHub

    cd ~/Golf-Score-Cart && git pull

### Step 18 — Disable the old kiosk service (if you ran it before)

    sudo systemctl disable golf-kiosk

If you see `Failed to disable: Unit file golf-kiosk.service does not exist` that is fine, just continue.

### Step 19 — Set the Pi to boot to console (no desktop)

    sudo raspi-config nonint do_boot_behaviour B2

This makes the Pi boot straight to a text login and auto-login as `pi`.
No desktop loads — this is intentional. The app will take over the screen instead.

### Step 20 — Install the lightweight browser and window manager

Chromium is too heavy for Pi devices with less than 1GB of RAM.
Instead this setup uses `epiphany-browser` (WebKitGTK) — much lighter, no warnings, no dialogs.
`matchbox-window-manager` forces the browser window to fill the entire screen automatically.

    sudo apt-get install -y epiphany-browser matchbox-window-manager

### Step 21 — Create a minimal display session that runs only the app

    echo 'exec bash /home/pi/Golf-Score-Cart/kiosk.sh' > ~/.xinitrc

### Step 22 — Start the display automatically when the Pi logs in

    echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx -- -nocursor' >> ~/.bash_profile

### Step 23 — Reboot

    sudo reboot

On next boot the Pi will:
1. Boot to console and auto-login as `pi`
2. Automatically start the display system (`startx`)
3. Start the Golf Scorecard app server in the background (via the existing service)
4. Wait until the server is ready (up to 3 minutes)
5. Open Chromium fullscreen — the app fills the entire screen with nothing else visible

SSH still works normally from other computers at all times.
The app is also still accessible from other devices at `http://golfcart.local:3000`.

### Optional — Hide the mouse cursor on touchscreen

    sudo apt-get install -y unclutter
    echo 'unclutter -idle 0.5 -root &' >> ~/.xinitrc

### Optional — Custom Golf Scorecard boot splash screen

This replaces the Raspberry Pi logo on boot with a green Golf Scorecard screen.
Run this once on the Pi:

    bash ~/Golf-Score-Cart/scripts/create-splash.sh

The script installs ImageMagick, draws the splash image, and installs it.
After the next reboot you will see the Golf Scorecard boot screen instead of the Pi logo.

---

## Troubleshooting

### SSH drops during install
Use `tmux` before running long commands. If SSH drops, reconnect and run:

    tmux attach

### Kiosk screen not showing — how to diagnose

Run these on the Pi via SSH. Copy the output and share it to get help.

Check the xsession error log:

    cat ~/.xsession-errors

Check whether the app server is actually running and responding:

    curl http://localhost:3000

Check the app service status:

    sudo systemctl status golf-scorecard

View the full contents of the kiosk script to confirm it was updated:

    cat ~/Golf-Score-Cart/kiosk.sh

### "Cannot find module @rollup/rollup-linux-arm64-gnu"
This means Part 1 was skipped or the lockfile was not pushed.
Go back to Part 1 and run it on Windows, then pull on the Pi and reinstall.

### "Killed" during install or build (Out of Memory)
The swap file from Step 7 prevents this. If it still happens:

    sudo swapon --show

If swap is not listed, re-run Step 7.

### App not loading in browser
Check the service is running:

    sudo systemctl status golf-scorecard

Check logs for errors:

    journalctl -u golf-scorecard -n 50

### Cannot connect to golfcart.local
Find the Pi's IP address by typing this on the Pi:

    hostname -I

Then use that IP in the browser: `http://192.168.x.x:3000`

### Port 3000 already in use
    sudo reboot

---

## Quick Reference — Commands at a Glance

| What | Command (on Pi) |
|------|----------------|
| Start tmux | `tmux` |
| Reconnect to tmux after SSH drop | `tmux attach` |
| Check app service status | `sudo systemctl status golf-scorecard` |
| Restart app service | `sudo systemctl restart golf-scorecard` |
| View app logs | `journalctl -u golf-scorecard -n 50` |
| Find Pi's IP address | `hostname -I` |
| Check available memory | `free -h` |
