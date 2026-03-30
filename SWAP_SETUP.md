# Fix: Build Gets Killed (Out of Memory)

If `pnpm install` or `pnpm run build:prod` gets **Killed**, the Pi ran out of RAM.
The fix is to add swap space — this uses part of the SD card as extra memory.

---

## Run These Commands One at a Time

### 1. Create a 1 GB swap file
```bash
sudo fallocate -l 1G /swapfile
```

### 2. Set correct permissions
```bash
sudo chmod 600 /swapfile
```

### 3. Format it as swap
```bash
sudo mkswap /swapfile
```

### 4. Turn it on
```bash
sudo swapon /swapfile
```

### 5. Make it survive reboots
```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 6. Confirm swap is active
```bash
free -h
```
You should see a `Swap:` line showing `1.0G`. If it shows `0`, repeat steps 1–4.

---

## Now Retry the Build

```bash
cd ~/Golf-Score-Cart && pnpm install && pnpm run build:prod
```

This will take **10–20 minutes**. Leave it running — do not close the window or press any keys.

When it finishes successfully you will see:
```
✓ built in XXs
```
and the command prompt will return. Then continue with Step 10 in RASPBERRY_PI.md.
