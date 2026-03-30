import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Nfc, Bluetooth, Cpu, Wifi, Zap, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_CLUBS } from "@/lib/club-recommendation";

// ── Simple accordion section ──────────────────────────────────────────────────
function Section({
  icon, title, badge, badgeColor = "bg-primary/10 text-primary", children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">{title}</p>
          {badge && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5", badgeColor)}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 space-y-3 text-sm text-muted-foreground border-t border-border/60">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <p className="flex-1 text-sm text-foreground">{text}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted text-foreground font-mono text-xs px-2 py-0.5 rounded-md">
      {children}
    </code>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-xl px-3 py-2.5 font-mono text-xs text-foreground whitespace-pre leading-relaxed">
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Sensors() {
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl">Sensors &amp; Tags</h1>
            <p className="text-xs text-primary-foreground/80 font-medium">Setup guide for NFC &amp; BLE shot tracking</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-3">

        {/* ── Overview cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Nfc className="w-4 h-4 text-green-700" />
              <p className="font-bold text-green-900 text-sm">NFC Tags</p>
            </div>
            <p className="text-xs text-green-700">Ntag213 sticker on each club. Scan to select club + record position.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Bluetooth className="w-4 h-4 text-blue-700" />
              <p className="font-bold text-blue-900 text-sm">BLE Sensor</p>
            </div>
            <p className="text-xs text-blue-700">XIAO nRF52840 Sense worn by players. Auto-detects swings &amp; putts.</p>
          </div>
        </div>

        {/* ── How Shot Tracking Works ───────────────────────────────────── */}
        <Section
          icon={<BookOpen className="w-4 h-4 text-primary" />}
          title="How Shot Tracking Works"
          badge="Read this first"
        >
          <div className="space-y-3">
            <p className="font-semibold text-foreground">Two methods — use either or both:</p>

            <div className="bg-green-50 rounded-xl p-3 space-y-1.5">
              <p className="font-bold text-green-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Nfc className="w-3.5 h-3.5" /> Method 1 — NFC Club Tags
              </p>
              <ol className="space-y-1 text-xs text-green-700">
                <li>1. Stand at your ball, take out the club you'll use</li>
                <li>2. Hold the club NFC tag near the back of your phone</li>
                <li>3. App records: player, club, GPS position</li>
                <li>4. Hit the shot, walk to ball, scan next club</li>
                <li>5. App calculates how far the previous shot carried</li>
                <li className="font-semibold">🏳️ Putter tags count putts automatically</li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
              <p className="font-bold text-blue-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Bluetooth className="w-3.5 h-3.5" /> Method 2 — BLE Wearable Sensor
              </p>
              <ol className="space-y-1 text-xs text-blue-700">
                <li>1. Player wears the XIAO board on their wrist/glove</li>
                <li>2. Connect the sensor from the NFC Clubs tab in-round</li>
                <li>3. Every swing detected → 1 shot added automatically</li>
                <li>4. Gentle stroke near the pin → counted as a putt</li>
                <li>5. "Fill Score" button copies the shot count to the scorecard</li>
              </ol>
            </div>

            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">Both methods feed into the same shot log.</p>
              <p className="text-xs text-muted-foreground mt-1">
                During a round open <strong>Play Hole → NFC Clubs tab</strong> to see real-time shot counts, carry distances, and putt counts for all players.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════ NFC ════════════════════════════ */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 pt-2">NFC Club Tags</p>

        <Section
          icon={<Nfc className="w-4 h-4 text-green-700" />}
          title="What you need"
          badge="Ntag213"
          badgeColor="bg-green-100 text-green-700"
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Ntag213 NFC stickers</strong> — one per club (14 clubs max per player). Available from AliExpress, Amazon etc. for ~$0.10 each.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">NFC Tools app</strong> — free on Android &amp; iOS — used to write text to the tags.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Android phone with Chrome</strong> — required for the in-app NFC scanning (Web NFC is Chrome/Android only).</p>
            </div>
          </div>
        </Section>

        <Section
          icon={<Zap className="w-4 h-4 text-green-700" />}
          title="Programming the tags"
        >
          <div className="space-y-3">
            <Step n={1} text={<>Install <strong>NFC Tools</strong> from the Play Store / App Store.</>} />
            <Step n={2} text={<>Open NFC Tools → <strong>Write</strong> → <strong>Add a record</strong> → <strong>Text</strong>.</>} />
            <Step n={3} text={<>Enter the text in this exact format (case-insensitive):</>} />
            <Mono>PlayerName:ClubName</Mono>
            <Step n={4} text={<>Tap <strong>Write / OK</strong> then hold the phone over the sticker until it beeps.</>} />
            <Step n={5} text={<>Stick the tag on the club grip, just below where you grip — easy to reach without adjusting your hand.</>} />

            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs font-bold text-foreground mb-2">Example tags (valid club names)</p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  "John:Driver", "John:3-Wood", "John:5-Iron",
                  "John:7-Iron", "John:SW", "John:Putter",
                  "Sarah:Driver", "Sarah:Putter",
                ] as string[]).map(t => (
                  <Code key={t}>{t}</Code>
                ))}
              </div>
            </div>

            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs font-bold text-foreground mb-1.5">All supported club names</p>
              <div className="flex flex-wrap gap-1">
                {ALL_CLUBS.map(c => <Code key={c}>{c}</Code>)}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                The player name on the tag must match the player name added to the round (case-insensitive). E.g. tag says <Code>john:Driver</Code> → player in round is <strong>John</strong> ✓
              </p>
            </div>
          </div>
        </Section>

        <Section
          icon={<Wifi className="w-4 h-4 text-green-700" />}
          title="Enabling NFC scanning in the app"
        >
          <div className="space-y-3">
            <Step n={1} text="Start or join a round and navigate to a hole." />
            <Step n={2} text={<>Tap the <strong>NFC Clubs</strong> tab at the top.</>} />
            <Step n={3} text={<>Tap <strong>Start Scanning</strong> — green pulsing dot appears.</>} />
            <Step n={4} text="Before each shot: pull out the club you want to play, hold the grip tag near the back of the phone." />
            <Step n={5} text="The app beeps / vibrates and shows your name + club. Walk to the ball and scan the next club after the shot." />
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">Web NFC only works in Chrome on Android.</p>
              <p className="text-xs text-muted-foreground mt-1">
                On an iPhone or Safari, the NFC tab will show a guide but won't scan automatically. You can still use the BLE sensor or the Track Shot tab for manual tracking.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════ BLE ════════════════════════════ */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 pt-2">BLE Wearable Sensor — XIAO nRF52840 Sense</p>

        <Section
          icon={<Cpu className="w-4 h-4 text-blue-700" />}
          title="What you need"
          badge="1 board per player"
          badgeColor="bg-blue-100 text-blue-700"
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Seeed XIAO nRF52840 Sense</strong> — ~$15 per board. Has built-in IMU (LSM6DS3TR-C) + Bluetooth 5.0.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Arduino IDE 2</strong> — free download from arduino.cc — used to flash the firmware once.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Small LiPo battery</strong> (100–500 mAh, 3.7 V) — optional, XIAO has built-in charging. Lasts a full round on any small battery.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p><strong className="text-foreground">Wristband or glove mount</strong> — attach the board to the player's lead wrist for best swing detection. A simple elastic band works fine.</p>
            </div>
          </div>
        </Section>

        <Section
          icon={<Zap className="w-4 h-4 text-blue-700" />}
          title="Flashing the firmware"
        >
          <div className="space-y-3">
            <Step n={1} text={<>In Arduino IDE: <strong>File → Preferences</strong> → Additional Boards URLs, add:</>} />
            <Mono>{"https://files.seeedstudio.com/arduino/\npackage_seeeduino_boards_index.json"}</Mono>

            <Step n={2} text={<><strong>Tools → Board Manager</strong> → search <em>Seeed nRF52 mbed-enabled Boards</em> → Install.</>} />

            <Step n={3} text={<>Install libraries via <strong>Sketch → Library Manager</strong>:</>} />
            <div className="pl-9 space-y-1">
              <Code>ArduinoBLE</Code>
              <span> and </span>
              <Code>Seeed_Arduino_LSM6DS3</Code>
            </div>

            <Step n={4} text={<>Select board: <strong>Tools → Board → Seeed nRF52 mbed-enabled → XIAO nRF52840 Sense</strong>.</>} />

            <Step n={5} text={<>Open the firmware file <Code>firmware/golf-imu-sensor/golf-imu-sensor.ino</Code> and set the player name (line 62):</>} />
            <Mono>{'const char* PLAYER_NAME = "John";'}</Mono>

            <Step n={6} text="Connect the XIAO via USB-C, click Upload. LED blinks 3 times = ready." />
            <Step n={7} text="Repeat for each player's board with their name." />

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-800 mb-1">Detection thresholds (optional tuning)</p>
              <p className="text-xs text-blue-700 mb-2">If the sensor misses swings or triggers falsely, adjust these two lines in the sketch:</p>
              <Mono>{"const float SWING_THRESHOLD  = 3.5f;  // g\nconst float STROKE_THRESHOLD = 0.7f;  // g"}</Mono>
              <p className="text-xs text-blue-600 mt-2">Increase SWING_THRESHOLD if walking motion triggers it. Decrease STROKE_THRESHOLD if putts are missed.</p>
            </div>
          </div>
        </Section>

        <Section
          icon={<Bluetooth className="w-4 h-4 text-blue-700" />}
          title="Connecting during a round"
        >
          <div className="space-y-3">
            <Step n={1} text="Power on the board (USB or battery). LED blinks 3 times." />
            <Step n={2} text={<>In the round, open <strong>Play Hole → NFC Clubs tab</strong>.</>} />
            <Step n={3} text={<>Tap <strong>Connect</strong> next to <em>IMU Wearable Sensor</em>. Chrome shows a device picker.</>} />
            <Step n={4} text={<>Select <strong>Golf-PlayerName</strong> (e.g. Golf-John) → Connect.</>} />
            <Step n={5} text="Blue dot pulses = connected. Every swing or putt now shows in the shot log." />

            <div className="bg-muted rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-foreground">What each detection means</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">🏌️ SWING (&gt;3.5g)</span>
                <span className="text-muted-foreground">Full shot → "Swing (IMU)"</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">🏳️ STROKE near pin</span>
                <span className="text-muted-foreground">≤25 m → "Putter"</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">🏳️ STROKE far</span>
                <span className="text-muted-foreground">&gt;25 m → "Chip (IMU)"</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">Enable GPS on the hole screen for automatic putt detection.</p>
            </div>

            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs font-bold text-foreground">Multiple players</p>
              <p className="text-xs text-muted-foreground mt-1">Each player's board sends their own player name. Up to 4 boards can be connected to the same phone simultaneously.</p>
            </div>
          </div>
        </Section>

        <Section
          icon={<AlertCircle className="w-4 h-4 text-blue-700" />}
          title="Troubleshooting"
        >
          <div className="space-y-3">
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">BLE device doesn't appear in picker</p>
              <p className="text-xs">Make sure the board is powered on and advertising. Check Serial Monitor at 115200 baud — should print "BLE advertising as Golf-Name".</p>
            </div>
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">Sensor disconnects mid-round</p>
              <p className="text-xs">Board went out of BLE range (&gt;~10 m). Tap Reconnect in the NFC Clubs tab. All previous shots are preserved.</p>
            </div>
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">Too many false detections</p>
              <p className="text-xs">Increase <Code>SWING_THRESHOLD</Code> from 3.5g to 4.5g or higher and re-flash.</p>
            </div>
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">Putts not auto-detected as Putter</p>
              <p className="text-xs">Enable GPS on the hole screen. Without GPS the app can't know you're near the pin, so all soft strokes are recorded as "Chip (IMU)".</p>
            </div>
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">NFC scan not recognised</p>
              <p className="text-xs">Check the tag text matches <Code>Name:Club</Code> format exactly. Re-write the tag with NFC Tools if needed.</p>
            </div>
            <div className="border-l-2 border-amber-400 pl-3 space-y-0.5">
              <p className="text-xs font-bold text-foreground">Web NFC / Bluetooth not supported</p>
              <p className="text-xs">Both require Chrome on Android. On iOS/Safari use the manual Track Shot tab instead.</p>
            </div>
          </div>
        </Section>

        {/* ── Bottom padding ── */}
        <div className="h-4" />
      </div>
    </div>
  );
}
