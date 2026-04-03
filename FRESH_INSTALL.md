# Golf Scorecard — Fresh Install Guide for Raspberry Pi

Follow the steps **in order**. Do not skip steps.
The Windows PC steps must happen before touching the Pi.

**Recommended hardware:**
- Raspberry Pi 4 or Pi 5 (4GB RAM)
- Raspberry Pi OS Desktop 64-bit (not Lite — the Desktop version includes all the graphics drivers needed)

---

## PART 1 — Prepare the Windows PC

This step generates a package lockfile that includes Raspberry Pi ARM64 packages.
Without this, the Pi tries to download everything itself and fails.

### Step 1 — Open a terminal on your Windows PC

Press the Windows key, type `cmd`, press Enter.

Navigate to the project folder:

    cd "E:\Golf Cart\Software\Golf-Score-Cart"

### Step 2 — Delete the old lockfile

    del pnpm-lock.yaml

### Step 3 — Regenerate the lockfile

    npx pnpm install --ignore-scripts

Wait for it to finish. You will see:

    Progress: resolved 492, reused 0, downloaded 492, added 492

### Step 4 — Push to GitHub

    git add pnpm-lock.yaml .npmrc
    git commit -m "fix: regenerate lockfile with arm64 packages"
    git push

Use your GitHub **Personal Access Token** as the password when asked.

That is all on Windows. Now go to the Pi.

---

## PART 2 — Flash the Pi and First Boot

### Step 5 — Flash Raspberry Pi OS

Use **Raspberry Pi Imager** on your Windows PC:

1. Download from https://www.raspberrypi.com/software/
2. Choose OS: **Raspberry Pi OS (64-bit)** — the one labelled "Desktop"
3. Before writing, click the settings gear icon and set:
   - Hostname: `golfcart`
   - Username: `pi`
   - Password: your choice
   - Enable SSH: yes
   - Wi-Fi: enter your network name and password
4. Write to SD card and insert into the Pi

### Step 6 — SSH into the Pi

On your Windows PC open a new Command Prompt:

    ssh pi@golfcart.local

If that does not work, find the Pi's IP from your router and use:

    ssh pi@192.168.x.x

---

## PART 3 — Configure the Pi (One Time Only)

### Step 7 — Add swap memory

The Pi needs extra memory breathing room during the build.

    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

Confirm it worked:

    free -h

You should see a `Swap:` row showing `1.0G`.

### Step 8 — Install required tools

    sudo apt-get update
    sudo apt-get install -y tmux curl cage chromium

- `tmux` — protects long installs from SSH disconnects
- `cage` — Wayland kiosk compositor for fullscreen display
- `chromium` — the browser shown on the Pi's screen

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

You should see `10.x.x`.

### Step 11 — Give the pi user access to graphics hardware

    sudo usermod -aG video,input,render pi

---

## PART 4 — Install and Build the App

### Step 12 — Start tmux

Always do this before long commands. If SSH drops you can reconnect and resume.

    tmux

To reconnect after a dropout: `tmux attach`

### Step 13 — Clone the project

    cd ~
    git clone https://github.com/Rudolph001/Golf-Score-Cart.git Golf-Score-Cart

Use your GitHub Personal Access Token as the password.

### Step 14 — Install and build

    cd ~/Golf-Score-Cart && pnpm install && pnpm run build:prod

This will take a while on first run. When done you will see output like:

    dist/public/index.html    x.xx kB
    dist/public/assets/...    xxx kB

### Step 15 — Test the app

    bash ~/Golf-Score-Cart/start-pi.sh

You should see:

    Golf Scorecard
    URL  : http://localhost:3000
    Mode : production

Open a browser on your phone or laptop and go to `http://golfcart.local:3000`.
You should see the Golf Scorecard app. Press Ctrl+C to stop it.

---

## PART 5 — Auto-Start on Boot

### Step 16 — Install the service

    sudo cp ~/Golf-Score-Cart/golf-scorecard.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable golf-scorecard
    sudo systemctl start golf-scorecard

### Step 17 — Confirm it is running

    sudo systemctl status golf-scorecard

You should see `Active: active (running)` in green. Press `q` to exit.

The app now starts automatically on every boot and is accessible from any device on the same Wi-Fi at `http://golfcart.local:3000`.

---

## PART 6 — Kiosk Mode (App on Pi's Own Screen)

This makes the Pi boot straight into the Golf Scorecard app fullscreen — no desktop, no browser bar, no popups.

### Step 18 — Boot to console instead of desktop

    sudo raspi-config nonint do_boot_behaviour B2

This makes the Pi boot to a text console and auto-login as `pi`.
The desktop will not load — all RAM is kept free for the app.

### Step 19 — Remove any old kiosk setup

    sudo systemctl disable golf-kiosk 2>/dev/null || true
    sed -i '/kiosk/d' ~/.bash_profile

### Step 20 — Add the kiosk launch line

    echo '[[ -z $DISPLAY && -z $WAYLAND_DISPLAY && $XDG_VTNR -eq 1 ]] && bash /home/pi/Golf-Score-Cart/kiosk.sh' >> ~/.bash_profile

### Step 21 — Confirm it was added correctly

    tail -3 ~/.bash_profile

The last line must be exactly:

    [[ -z $DISPLAY && -z $WAYLAND_DISPLAY && $XDG_VTNR -eq 1 ]] && bash /home/pi/Golf-Score-Cart/kiosk.sh

### Step 22 — Reboot

    sudo reboot

On next boot the Pi will:
1. Boot to console and auto-login as `pi`
2. Start the Golf Scorecard server in the background
3. Wait until the server is responding (up to 3 minutes)
4. Open Chromium fullscreen showing the app

SSH still works normally from other computers at all times.

---

## PART 7 — Enable HTTPS for GPS on Your Phone

Android Chrome blocks the GPS / Geolocation API on plain HTTP pages.
To use shot distance measurement and club recommendations on your phone you must enable HTTPS.
This is a one-time setup. After accepting the certificate warning once on your phone, GPS works permanently.

### Step 23 — Pull the latest code and rebuild

    cd ~/Golf-Score-Cart && git pull && pnpm run build:prod

Then update the installed service file:

    sudo cp ~/Golf-Score-Cart/golf-scorecard.service /etc/systemd/system/

### Step 24 — Generate a self-signed certificate on the Pi

    mkdir -p ~/ssl
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
      -subj "/CN=golfcart.local" \
      -addext "subjectAltName=DNS:golfcart.local,DNS:localhost" \
      -keyout ~/ssl/golfcart.key \
      -out ~/ssl/golfcart.crt

### Step 25 — Enable HTTPS in the service

    sudo sed -i 's/#Environment=SSL_CERT/Environment=SSL_CERT/; s/#Environment=SSL_KEY/Environment=SSL_KEY/; s/#Environment=HTTPS_PORT/Environment=HTTPS_PORT/' /etc/systemd/system/golf-scorecard.service

### Step 26 — Reload and restart the service

    sudo systemctl daemon-reload
    sudo systemctl restart golf-scorecard

### Step 27 — Confirm HTTPS is working

    curl -k https://localhost:3443/api/health

You should see a response like `{"status":"ok"}`. If you do, HTTPS is running.

### Step 28 — Open the app on your phone using HTTPS

On your phone open a browser and go to:

    https://golfcart.local:3443

Android Chrome will show a security warning ("Your connection is not private").
Tap **Advanced** → **Proceed to golfcart.local (unsafe)**.

After that, tap **Enable GPS** in the app and allow location when the browser asks. GPS and shot distance will now work.

> **Note:** You only need to accept the warning once per phone. After that, `https://golfcart.local:3443` loads normally with GPS working. The app also still works at `http://golfcart.local:3000` (without GPS) for devices not needing it.

---

## PART 8 — Remote Access From Anywhere (Optional)

Tailscale lets you access the Golf Scorecard app from your phone on any network — mobile data, different Wi-Fi, anywhere in the world. It is free for personal use and requires no router configuration.

### Step 29 — Create a Tailscale account

Go to https://tailscale.com and sign up with Google or GitHub. Remember which account you use.

### Step 30 — Install Tailscale on the Pi

    curl -fsSL https://tailscale.com/install.sh | sh

### Step 31 — Connect the Pi to Tailscale

    sudo tailscale up

It will print a URL like:

    https://login.tailscale.com/a/xxxxx

Open that URL in a browser on your phone or PC and log in with the same account from Step 29.

### Step 32 — Make Tailscale start automatically on boot

    sudo systemctl enable --now tailscaled

### Step 33 — Find the Pi’s Tailscale IP address

    tailscale status

You will see output like:

    100.x.x.x   golfcart   pi@ linux   -

Write down the IP that starts with `100.` — that is your Pi's permanent Tailscale address.

### Step 34 — Install Tailscale on your phone

**iPhone:** Search "Tailscale" in the App Store and install it.

**Android:** Search "Tailscale" in the Play Store and install it.

1. Open the Tailscale app
2. Tap **Sign in** and use the same account from Step 29
3. Tap the toggle to turn Tailscale on
4. You will see `golfcart` appear in the device list — that is your Pi

### Step 35 — Access the app from anywhere (Tailscale)

With Tailscale running on your phone, open any browser and go to:

    https://golfcart.local:3443

Or if using a Tailscale IP:

    http://100.x.x.x:3000

Replace `100.x.x.x` with the IP you wrote down in Step 33.

> **GPS over Tailscale:** If you set up HTTPS in Part 7, GPS also works over Tailscale — use `https://golfcart.local:3443` instead of `http://100.x.x.x:3000`.

This works on mobile data, on a different Wi-Fi network, or anywhere in the world.

---

## PART 9 — SSH Into the Pi (Remote Terminal Access)

SSH lets you control the Pi via a terminal from any other device. You need this to run commands, check logs, and update the app.

### From your Windows PC (on the same Wi-Fi)

Open Command Prompt and type:

    ssh pi@golfcart.local

If that does not work, use the Pi's IP address instead:

    ssh pi@192.168.x.x

Find the IP by running this on the Pi's screen or another SSH session:

    hostname -I

### From your Windows PC (from anywhere via Tailscale)

With Tailscale running on both your PC and the Pi, open Command Prompt and type:

    ssh pi@100.x.x.x

Replace `100.x.x.x` with the Pi's Tailscale IP from Step 33.

### From your phone (on the same Wi-Fi or via Tailscale)

Install an SSH app on your phone:

- **iPhone:** Download **Terminus** or **Prompt 3** from the App Store
- **Android:** Download **JuiceSSH** or **Termius** from the Play Store

Connect using these settings:

    Host:     golfcart.local   (or the Pi's IP or Tailscale IP)
    Port:     22
    Username: pi
    Password: your Pi password

### SSH password-free login (optional, more convenient)

On your Windows PC, run once to set up a key so you never need to type a password:

    ssh-keygen -t ed25519
    type %USERPROFILE%\.ssh\id_ed25519.pub | ssh pi@golfcart.local "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

After this, `ssh pi@golfcart.local` logs in automatically with no password.

---



On your **Windows PC** push your changes:

    cd "E:\Golf Cart\Software\Golf-Score-Cart"
    git add .
    git commit -m "describe what changed"
    git push

Then reboot the Pi:

    sudo reboot

The Pi will automatically pull the latest code, rebuild if needed, and start the app.

**To update without rebooting:**

    sudo systemctl restart golf-scorecard

**To watch the update live:**

    journalctl -u golf-scorecard -f

Press Ctrl+C when done.

---

## Troubleshooting

### SSH drops during install

Reconnect and run:

    tmux attach

### Check the kiosk log

If the screen is blank or showing errors run this via SSH:

    cat ~/kiosk.log

### Check the app server

    sudo systemctl status golf-scorecard
    journalctl -u golf-scorecard -n 50

### App not loading in browser

    curl http://localhost:3000

### Cannot connect to golfcart.local

Find the IP:

    hostname -I

Then use `http://192.168.x.x:3000` in your browser.

### "Cannot find module @rollup/rollup-linux-arm64-gnu"

Part 1 was skipped or the lockfile was not pushed. Go back to Part 1 on Windows, then on Pi:

    cd ~/Golf-Score-Cart && git pull && pnpm install && pnpm run build:prod

### Out of memory during build

    sudo swapon --show

If swap is not listed, re-run Step 7.

### Re-enable the desktop (if needed for troubleshooting)

    sudo raspi-config nonint do_boot_behaviour B4
    sudo reboot

---

## Quick Reference

| What | Command (on Pi via SSH) |
|------|------------------------|
| Start tmux | `tmux` |
| Reconnect to tmux | `tmux attach` |
| Check app status | `sudo systemctl status golf-scorecard` |
| Restart app | `sudo systemctl restart golf-scorecard` |
| View app logs | `journalctl -u golf-scorecard -n 50` |
| View kiosk log | `cat ~/kiosk.log` |
| Find Pi IP address | `hostname -I` |
| Check memory | `free -h` |
| Enable desktop | `sudo raspi-config nonint do_boot_behaviour B4` |
| Disable desktop | `sudo raspi-config nonint do_boot_behaviour B2` |
| Check Tailscale IP | `tailscale status` |
| Reconnect Tailscale | `sudo tailscale up` |
| App URL (HTTP, all devices) | `http://golfcart.local:3000` |
| App URL (HTTPS, GPS enabled) | `https://golfcart.local:3443` |
| SSH from Windows (local) | `ssh pi@golfcart.local` |
| SSH from Windows (Tailscale) | `ssh pi@100.x.x.x` |
