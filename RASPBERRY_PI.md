# Running Golf Scorecard on Raspberry Pi — Complete Beginner's Guide

This guide walks you through everything from an empty SD card to having the Golf Scorecard app running on your Raspberry Pi's touchscreen. Every step is explained in plain language — no prior Linux or coding experience needed.

---

## What You Will Need

| Item | Notes |
|------|-------|
| Raspberry Pi 4 (2 GB RAM or more) or Pi 5 | Pi 3 will also work but is slower |
| MicroSD card | 16 GB or larger (32 GB recommended) |
| MicroSD card reader | To plug the card into your Windows PC |
| Power supply | Official Pi USB-C power supply recommended |
| HDMI display or Pi touchscreen | Any monitor works for setup |
| USB keyboard and mouse | Only needed during setup |
| Internet connection | Pi needs Wi-Fi or an Ethernet cable during setup |
| This project folder on your Windows PC | `E:\Golf Cart\Software\Golf-Score-Cart` |

---

## Part 1 — Flash Raspberry Pi OS onto Your SD Card

This is done on your **Windows PC**, not on the Pi.

### Step 1 — Download Raspberry Pi Imager

1. Go to **https://www.raspberrypi.com/software/** on your Windows PC.
2. Click **Download for Windows** and run the installer.

### Step 2 — Flash the SD card

1. Insert your SD card into the card reader and plug it into your PC.
2. Open **Raspberry Pi Imager**.
3. Click **Choose Device** → select your Pi model (e.g. **Raspberry Pi 4**).
4. Click **Choose OS** → **Raspberry Pi OS (other)** → **Raspberry Pi OS (64-bit)**.
   - Pick the **Desktop** version if you want the kiosk touchscreen feature.
   - Pick **Lite** if you only need the app accessible from another device's browser.
5. Click **Choose Storage** → select your SD card (be careful — this will erase it).
6. Click **Next**.
7. When asked "Would you like to apply OS customisation settings?" click **Edit Settings**.
   - **General tab:**
     - Set a hostname, e.g. `golfcart`
     - Set a username, e.g. `pi`, and choose a password you will remember
     - Enter your Wi-Fi network name (SSID) and password
     - Set your country/timezone
   - **Services tab:** Turn on **Enable SSH** → **Use password authentication**
   - Click **Save**, then **Yes** to apply the settings.
8. Click **Yes** to confirm erasing the card. Wait for it to finish (takes a few minutes).
9. Remove the SD card from your PC.

### Step 3 — Boot the Pi for the first time

1. Insert the SD card into the bottom of the Pi.
2. Connect your display, keyboard, and mouse.
3. Plug in the power supply. The Pi will boot automatically.
4. Wait about 60–90 seconds for the first boot to complete. You may see a lot of scrolling text — that is normal.
5. If using the Desktop version you will see a colourful desktop. If using Lite you will see a black terminal login prompt.

---

## Part 2 — Connect to the Pi from Your Windows PC (Optional but Convenient)

Once the Pi is on your Wi-Fi you can control it from your Windows PC using **SSH** — this means you type commands on your PC and they run on the Pi, so you don't need a keyboard/mouse connected to the Pi.

1. On your Windows PC, open **Command Prompt** (press `Windows key`, type `cmd`, press Enter).
2. Type the following and press Enter (replace `pi` and `golfcart` with the username and hostname you chose):
   ```
   ssh pi@golfcart.local
   ```
3. The first time you connect it will ask "Are you sure you want to continue connecting?" — type `yes` and press Enter.
4. Enter your password when prompted (nothing will appear as you type — that is normal).
5. You are now controlling your Pi from your Windows PC. Every command from here on is typed in this window.

> **Tip:** If `golfcart.local` doesn't work, try the Pi's IP address instead. You can find it by typing `hostname -I` directly on the Pi.

---

## Part 3 — Install Required Software on the Pi

All of these commands are run in the Pi's terminal (either directly on the Pi or via SSH from Step above).

### Step 4 — Update the Pi's software list

Always do this first on a fresh Pi:

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

This may take several minutes. Wait until it finishes.

### Step 5 — Install Node.js (the app runs on Node.js)

Copy and paste these commands one at a time, pressing Enter after each:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify it installed correctly:
```bash
node -v
```
You should see something like `v20.x.x`. If you do, Node.js is installed.

### Step 6 — Install pnpm (the package manager this project uses)

Using `npm install -g` requires root permissions and can cause errors. Use the official pnpm installer instead — it installs into your home folder and needs no special permissions:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

After it finishes, reload your shell so the `pnpm` command is found:
```bash
source ~/.bashrc
```

Verify:
```bash
pnpm -v
```
You should see `9.x.x` or later.

---

## Part 4 — Copy the Project to the Pi

### Step 7 — Copy the project files from your Windows PC to the Pi

On your **Windows PC**, open a **new** Command Prompt window (keep the SSH window open in another window).

Run this command (it copies the whole project folder over your network to the Pi):

```powershell
scp -r "E:\Golf Cart\Software\Golf-Score-Cart" pi@golfcart.local:~/Golf-Score-Cart
```

- Replace `pi` and `golfcart` with your username and hostname if different.
- Enter your Pi password when prompted.
- This will take a minute or two depending on your network speed.

> **Alternative:** If you have the project in a Git repository, you can clone it directly on the Pi instead:
> ```bash
> cd ~
> git clone <your-repo-url> Golf-Score-Cart
> ```

---

## Part 5 — Build and Run the App

Switch back to your **SSH terminal** (or the Pi's keyboard).

### Step 8 — Install the project's dependencies

```bash
cd ~/Golf-Score-Cart
pnpm install
```

This downloads all the code libraries the app needs. It may take a few minutes the first time.

### Step 9 — Build the app for production

```bash
pnpm run build:prod
```

This compiles the app into optimised files the Pi can run. You will see a lot of output — wait until it finishes and returns you to the prompt. This step needs to be repeated any time you update the project.

### Step 10 — Test that the app starts

```bash
bash start-pi.sh
```

You should see:
```
  ⛳ Golf Scorecard
  ─────────────────────────────────────
  URL  : http://localhost:3000
  Mode : production
```

Open a browser on **any device on the same Wi-Fi** (your phone, laptop, etc.) and go to:
```
http://golfcart.local:3000
```
or use the Pi's IP address:
```
http://192.168.x.x:3000
```

You should see the Golf Scorecard app. Press `Ctrl + C` in the terminal to stop it for now.

---

## Part 6 — Make the App Start Automatically When the Pi Powers On

This is the "set it and forget it" step. After this, every time you plug in the Pi it will start the app automatically.

### Step 11 — Install the auto-start service

```bash
sudo cp ~/Golf-Score-Cart/golf-scorecard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable golf-scorecard
sudo systemctl start golf-scorecard
```

Check it is running:
```bash
sudo systemctl status golf-scorecard
```

You should see `Active: active (running)` in green. Press `q` to exit.

From now on the app will start on its own every time the Pi boots. You never need to run `bash start-pi.sh` manually again.

---

## Part 7 — Kiosk Mode (Touchscreen / Full-Screen Display)

If you have an HDMI display or the official Pi touchscreen attached to the Pi and you are using the **Desktop** version of Raspberry Pi OS, you can make the Pi open the Golf Scorecard app automatically in full-screen mode when it boots — like a dedicated app kiosk.

> **Skip this part** if you only want to access the app from a phone or laptop browser over Wi-Fi.

### Step 12 — Test kiosk mode manually first

Make sure the app service from Step 11 is running, then:
```bash
bash ~/Golf-Score-Cart/kiosk.sh
```

The browser should open full-screen showing the app. Press `Alt + F4` to close it.

### Step 13 — Make kiosk mode start automatically on boot

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
echo '@bash /home/pi/Golf-Score-Cart/kiosk.sh' >> ~/.config/lxsession/LXDE-pi/autostart
```

### Step 14 — (Optional) Hide the mouse cursor for a cleaner look

```bash
sudo apt-get install -y unclutter
echo '@unclutter -idle 0' >> ~/.config/lxsession/LXDE-pi/autostart
```

### Step 15 — Reboot and confirm everything works

```bash
sudo reboot
```

The Pi will restart. Within about 30 seconds the app should launch automatically in full-screen.

---

## Part 8 — Updating the App in the Future

Whenever you make changes to the project on your Windows PC and want them on the Pi:

### Step 16 — Copy the updated files to the Pi

On your **Windows PC** Command Prompt:
```powershell
scp -r "E:\Golf Cart\Software\Golf-Score-Cart" pi@golfcart.local:~/Golf-Score-Cart
```

### Step 17 — Rebuild and restart on the Pi

In the **SSH terminal**:
```bash
cd ~/Golf-Score-Cart
pnpm install
pnpm run build:prod
sudo systemctl restart golf-scorecard
```

The updated app is now live.

---

## Part 9 — Troubleshooting

### The app won't open in the browser
- Make sure the service is running: `sudo systemctl status golf-scorecard`
- Make sure your phone/laptop is on the **same Wi-Fi network** as the Pi.
- Try using the Pi's IP address instead of `golfcart.local`. Find it by typing `hostname -I` on the Pi.

### Check the app's error logs
```bash
journalctl -u golf-scorecard -n 50
```
This shows the last 50 lines of log output which usually explains what went wrong.

### Port 3000 is already in use
```bash
sudo lsof -i :3000
```
This shows what is using the port. Restart the Pi with `sudo reboot` to clear it.

### "Cannot find package" errors after build
Make sure you ran `pnpm install` from inside `~/Golf-Score-Cart` (the project root folder), not from inside a subfolder.

### Score data disappears after restarting the Pi
Score data entered during a round is saved in the **browser's local storage**. This means it persists as long as you use the same browser on the same device. It is not stored in a permanent database on the Pi, so switching browsers or devices will show a fresh start.

### Forgot the Pi's IP address
Type this on the Pi (or via SSH):
```bash
hostname -I
```
The first address shown (e.g. `192.168.1.45`) is the one to use in your browser.

### Slow first load
The first page load after a fresh start may take a few seconds while Node.js JIT-compiles the bundle. Subsequent loads are fast.

### Touchscreen tap not registering correctly
Calibrate the screen:
```bash
sudo apt-get install -y xinput-calibrator
xinput_calibrator
```

---

## File Reference

| File | Purpose |
|------|---------|
| `start-pi.sh` | Start the production server (sets `NODE_ENV=production`, `PORT=3000`) |
| `kiosk.sh` | Launch Chromium in kiosk/full-screen mode |
| `golf-scorecard.service` | systemd unit file for auto-start on boot |
| `artifacts/api-server/dist/index.mjs` | Bundled server (generated by `pnpm run build:prod`) |
| `artifacts/golf-scorecard/dist/public/` | Built frontend files (served by the server) |
