import { useState, useCallback, useEffect, useRef } from "react";

export interface BleImuShot {
  playerName: string;
  /** SWING = full shot or chip (high accel peak); STROKE = gentle stroke (putt or soft chip) */
  type: "SWING" | "STROKE";
  /** Peak net g-force detected by the IMU */
  magnitude: number;
  timestamp: number;
}

// ── Minimal Web Bluetooth type shims ──────────────────────────────────────────
// The Web Bluetooth API is not yet in the standard TypeScript lib.
type GATTCharacteristic = {
  startNotifications(): Promise<GATTCharacteristic>;
  stopNotifications(): Promise<GATTCharacteristic>;
  value: DataView | undefined;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
};

type GATTService = {
  getCharacteristic(name: string): Promise<GATTCharacteristic>;
};

type GATTServer = {
  connected: boolean;
  connect(): Promise<GATTServer>;
  disconnect(): void;
  getPrimaryService(name: string): Promise<GATTService>;
};

type BLEDevice = {
  name: string | undefined;
  gatt: GATTServer;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
};

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: {
        filters?: Array<{ namePrefix?: string; services?: string[] }>;
        optionalServices?: string[];
        acceptAllDevices?: boolean;
      }): Promise<BLEDevice>;
    };
  }
}

// ── BLE UUIDs — must match the Arduino firmware ────────────────────────────────
// Service: golf shot detection
const SERVICE_UUID   = "19b10000-e8f2-537e-4f6c-d104768a1214";
// Characteristic: notified on every detected shot
const SHOT_CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

/**
 * Parse the BLE payload written by the XIAO firmware.
 * Format: "PlayerName:TYPE:magnitude"
 * Example: "John:SWING:5.2"   "Sarah:STROKE:1.1"
 */
function parsePayload(raw: string): BleImuShot | null {
  const parts = raw.split(":");
  if (parts.length < 3) return null;
  const playerName = parts[0].trim();
  const typeRaw    = parts[1].trim().toUpperCase();
  const magnitude  = parseFloat(parts[2]);
  if (!playerName || isNaN(magnitude)) return null;
  return {
    playerName,
    type: typeRaw === "STROKE" ? "STROKE" : "SWING",
    magnitude,
    timestamp: Date.now(),
  };
}

/**
 * Web Bluetooth hook for the Seeed XIAO nRF52840 Sense golf IMU sensor.
 *
 * Each XIAO board is programmed with a player name. When the board detects a
 * swing (SWING) or putt stroke (STROKE) it sends a BLE notification which this
 * hook parses and forwards to `onShot`.
 *
 * Supported browsers: Chrome on Android, Chrome desktop (flag: #enable-experimental-web-platform-features).
 * Not supported in Safari or Firefox — `isSupported` will be false.
 */
export function useBleImu(onShot: (shot: BleImuShot) => void) {
  const isSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;

  const [device, setDevice]               = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected]     = useState(false);
  const [isConnecting, setIsConnecting]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Stable ref so the BLE notification handler always calls the latest callback
  const onShotRef = useRef(onShot);
  onShotRef.current = onShot;

  const charRef = useRef<GATTCharacteristic | null>(null);

  const disconnect = useCallback(() => {
    charRef.current?.stopNotifications().catch(() => {});
    charRef.current = null;
    if (device?.gatt.connected) device.gatt.disconnect();
    setIsConnected(false);
    setDevice(null);
    setError(null);
  }, [device]);

  const connect = useCallback(async () => {
    if (!isSupported || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      // Show browser device-picker filtered to boards advertising "Golf-" prefix
      const dev = await navigator.bluetooth!.requestDevice({
        filters: [{ namePrefix: "Golf-" }],
        optionalServices: [SERVICE_UUID],
      });

      setDevice(dev);

      // Auto-reflect in UI when the board goes out of range
      dev.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        charRef.current = null;
        setError("Sensor disconnected — tap Reconnect to try again");
      });

      const server  = await dev.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const char    = await service.getCharacteristic(SHOT_CHAR_UUID);
      charRef.current = char;

      await char.startNotifications();

      char.addEventListener("characteristicvaluechanged", (event: Event) => {
        const target = event.target as unknown as GATTCharacteristic;
        if (!target.value) return;
        const text = new TextDecoder().decode(target.value);
        const shot = parsePayload(text);
        if (shot) onShotRef.current(shot);
      });

      setIsConnected(true);
    } catch (err: unknown) {
      // NotFoundError = user dismissed the device picker — not a real error
      if (err instanceof Error && err.name !== "NotFoundError") {
        setError(err.message || "BLE connection failed");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, isConnecting]);

  // Stop notifications cleanly on unmount
  useEffect(
    () => () => { charRef.current?.stopNotifications().catch(() => {}); },
    [],
  );

  return { isSupported, device, isConnected, isConnecting, error, connect, disconnect };
}
