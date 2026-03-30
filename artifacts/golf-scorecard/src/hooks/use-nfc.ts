import { useState, useEffect, useCallback, useRef } from "react";

export interface NfcTag {
  /** Player name parsed from the tag (before the colon) */
  playerName: string;
  /** Club name parsed from the tag (after the colon) */
  clubCode: string;
  /** Raw text content of the NDEF record, e.g. "John:Driver" */
  raw: string;
}

// Minimal Web NFC type declarations (not yet in the standard TypeScript lib)
declare global {
  class NDEFReader extends EventTarget {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
  }
}

interface NDEFReadingEventDetail {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      data?: DataView;
      encoding?: string;
      lang?: string;
    }>;
  };
}

function parseTag(text: string): NfcTag | null {
  const colonIdx = text.indexOf(":");
  if (colonIdx <= 0) return null;
  const playerName = text.slice(0, colonIdx).trim();
  const clubCode = text.slice(colonIdx + 1).trim();
  if (!playerName || !clubCode) return null;
  return { playerName, clubCode, raw: text };
}

/**
 * Web NFC hook — reads NDEF text records and parses them as "PlayerName:ClubCode".
 *
 * Programme each Ntag213 with a plain text NDEF record in that format:
 *   "John:Driver"  |  "Sarah:Putter"  |  "Mike:7-Iron"
 *
 * Supported in Chrome on Android only (not desktop, not Safari).
 * Falls back gracefully: `isSupported = false` when unavailable.
 */
export function useNfc(onScan: (tag: NfcTag) => void) {
  const isSupported = typeof window !== "undefined" && "NDEFReader" in window;
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep a stable ref to the callback so startScanning doesn't need it as a dep
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const startScanning = useCallback(async () => {
    if (!isSupported) return;

    // Abort any existing session before starting a new one
    abortRef.current?.abort();
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reader = new NDEFReader();

      reader.addEventListener("reading", (event: Event) => {
        const e = event as unknown as NDEFReadingEventDetail & Event;
        for (const record of e.message.records) {
          if (record.recordType === "text" && record.data) {
            const decoder = new TextDecoder(record.encoding ?? "utf-8");
            const text = decoder.decode(record.data);
            const tag = parseTag(text);
            if (tag) onScanRef.current(tag);
          }
        }
      });

      reader.addEventListener("readingerror", () => {
        setError("Could not read NFC tag — try again");
      });

      await reader.scan({ signal: controller.signal });
      setIsScanning(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message || "NFC scan failed");
      }
      setIsScanning(false);
    }
  }, [isSupported]);

  const stopScanning = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsScanning(false);
    setError(null);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return { isSupported, isScanning, error, startScanning, stopScanning };
}
