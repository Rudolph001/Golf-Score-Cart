# Fix: Pi Build Crashes (Out of Memory / Missing Rollup Module)

The lockfile (`pnpm-lock.yaml`) was generated on Windows and is missing the
Linux ARM64 native binaries (e.g. `@rollup/rollup-linux-arm64-gnu`). This causes
the Pi to crash during `pnpm install` because it has to re-resolve everything
from scratch with limited memory.

The fix is done **once on your Windows PC**. After that, the Pi install will be
fast and will never crash again.

---

## Step 1 — The `.npmrc` file has already been updated

The file `.npmrc` in the project root now contains these lines:

```
supportedArchitectures[os]=win32
supportedArchitectures[os]=linux
supportedArchitectures[cpu]=x64
supportedArchitectures[cpu]=arm64
```

This tells pnpm to include both Windows and Linux ARM64 packages in the lockfile.

---

## Step 2 — Regenerate the lockfile on your Windows PC

Open a terminal in the project folder (`E:\Golf Cart\Software\Golf-Score-Cart`) and run:

```powershell
pnpm install
```

This will regenerate `pnpm-lock.yaml` to include the Linux ARM64 packages.
It will download a few extra packages — that is normal.

---

## Step 3 — Commit and push to GitHub

```powershell
git add .npmrc pnpm-lock.yaml
git commit -m "fix: include linux-arm64 packages in lockfile for Raspberry Pi"
git push
```

---

## Step 4 — On the Pi, pull and install

```bash
cd ~/Golf-Score-Cart
git pull
pnpm install
pnpm run build:prod
```

This time `pnpm install` will reuse the lockfile and only download what is needed —
no re-resolution, no memory crash. It should complete in under 2 minutes.

---

## If the Pi still has node_modules from a failed attempt, clean first:

```bash
cd ~/Golf-Score-Cart && rm -rf node_modules && pnpm install && pnpm run build:prod
```
