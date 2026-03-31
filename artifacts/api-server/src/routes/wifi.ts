import { Router, type IRouter } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router: IRouter = Router();

// GET /api/wifi/status — returns the currently connected network name
router.get("/status", async (_req, res) => {
  try {
    const { stdout } = await execAsync(
      "nmcli -t -f NAME,TYPE,STATE connection show --active"
    );
    const lines = stdout.trim().split("\n");
    const wifiLine = lines.find((l) => l.includes(":wifi:") && l.includes("activated"));
    const ssid = wifiLine ? wifiLine.split(":")[0] : null;
    res.json({ ssid });
  } catch {
    res.json({ ssid: null });
  }
});

// GET /api/wifi/networks — scans and returns nearby networks
router.get("/networks", async (_req, res) => {
  try {
    // Trigger a fresh scan first (ignore errors — may need root)
    await execAsync("sudo nmcli dev wifi rescan").catch(() => {});

    const { stdout } = await execAsync(
      "nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list"
    );

    const seen = new Set<string>();
    const networks = stdout
      .trim()
      .split("\n")
      .map((line) => {
        // Handle escaped colons in SSIDs (nmcli escapes them as \:)
        const parts = line.split(/(?<!\\):/);
        const ssid = parts[0]?.replace(/\\:/g, ":").trim();
        const signal = parseInt(parts[1] ?? "0", 10);
        const security = parts[2]?.trim() ?? "";
        return { ssid, signal, secured: security !== "--" && security !== "" };
      })
      .filter((n) => n.ssid && n.ssid !== "--")
      .filter((n) => {
        if (seen.has(n.ssid)) return false;
        seen.add(n.ssid);
        return true;
      })
      .sort((a, b) => b.signal - a.signal);

    res.json({ networks });
  } catch (err) {
    res.status(500).json({ error: "Failed to scan networks", networks: [] });
  }
});

// POST /api/wifi/connect — connects to a network
// Body: { ssid: string, password: string }
router.post("/connect", async (req, res) => {
  const { ssid, password } = req.body as { ssid?: string; password?: string };

  if (!ssid || typeof ssid !== "string") {
    res.status(400).json({ error: "ssid is required" });
    return;
  }

  try {
    // Sanitise inputs — only allow safe characters
    const safeSsid = ssid.replace(/['"\\`$]/g, "");
    const safePassword = (password ?? "").replace(/['"\\`$]/g, "");

    if (safePassword.length > 0) {
      await execAsync(
        `sudo nmcli dev wifi connect "${safeSsid}" password "${safePassword}"`
      );
    } else {
      // Open network
      await execAsync(`sudo nmcli dev wifi connect "${safeSsid}"`);
    }

    res.json({ success: true, ssid: safeSsid });
  } catch (err: any) {
    const message: string = err?.stderr ?? err?.message ?? "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
