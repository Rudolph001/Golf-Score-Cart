import { useState, useEffect, useCallback } from "react";
import { generateId } from "@/lib/utils";

/** Haversine great-circle distance in metres (rounded to nearest metre). */
function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isPutter(clubCode: string): boolean {
  const c = clubCode.toLowerCase().trim();
  return c === "putter" || c === "pt" || c === "putt";
}

export interface TrackedShot {
  id: string;
  playerName: string;
  clubCode: string;
  /** GPS position where the scan happened (where the player stood to play). */
  position: { lat: number; lng: number } | null;
  timestamp: number;
  /** 1-based shot index for this player on this hole. */
  shotIndex: number;
  /**
   * Distance in metres from the previous scan position to this one.
   * This equals how far the *previous* shot carried.
   * null for the first scan on a hole, or when GPS was unavailable.
   */
  distanceCarried: number | null;
  isPutt: boolean;
}

export interface PlayerShotSummary {
  playerName: string;
  shots: TrackedShot[];
  /** Number of putter scans = number of putts taken. */
  puttCount: number;
  /** GPS position of the last scan. */
  lastPosition: { lat: number; lng: number } | null;
  /** True when the player's last recorded shot was a putt (on the green). */
  isPutting: boolean;
  /**
   * Total number of NFC scans for this player on this hole.
   * Equals the suggested score: each scan = one stroke played.
   */
  totalShotCount: number;
}

/**
 * Tracks NFC club scans and computes GPS shot distances for each player.
 *
 * Flow per hole:
 *   1. Player stands at ball, pulls out club, scans NFC tag → scan recorded.
 *   2. Player hits, walks to ball, scans next club → distance A→B computed.
 *   3. distanceCarried on shot N = GPS distance from scan N-1 to scan N
 *      (i.e. how far shot N-1 travelled).
 *
 * Putter:
 *   - Each putt scan = 1 putt.  puttCount = number of putter scans.
 *   - totalShotCount = total suggestedScore for the hole.
 *
 * State resets automatically when holeNumber changes.
 */
export function useShotTracker(holeNumber: number) {
  const [shots, setShots] = useState<TrackedShot[]>([]);

  useEffect(() => {
    setShots([]);
  }, [holeNumber]);

  const recordScan = useCallback(
    (
      playerName: string,
      clubCode: string,
      position: { lat: number; lng: number } | null,
    ) => {
      setShots((prev) => {
        const playerShots = prev.filter((s) => s.playerName === playerName);
        const lastShot = playerShots.length > 0 ? playerShots[playerShots.length - 1] : null;

        let distanceCarried: number | null = null;
        if (lastShot?.position && position) {
          const d = haversineMetres(
            lastShot.position.lat, lastShot.position.lng,
            position.lat, position.lng,
          );
          // Ignore sub-metre GPS noise
          distanceCarried = d >= 1 ? d : null;
        }

        return [
          ...prev,
          {
            id: generateId(),
            playerName,
            clubCode,
            position,
            timestamp: Date.now(),
            shotIndex: playerShots.length + 1,
            distanceCarried,
            isPutt: isPutter(clubCode),
          },
        ];
      });
    },
    [],
  );

  const clearPlayer = useCallback((playerName: string) => {
    setShots((prev) => prev.filter((s) => s.playerName !== playerName));
  }, []);

  const getPlayerSummary = useCallback(
    (playerName: string): PlayerShotSummary => {
      const playerShots = shots.filter((s) => s.playerName === playerName);
      const lastShot = playerShots.length > 0 ? playerShots[playerShots.length - 1] : null;
      const puttCount = playerShots.filter((s) => s.isPutt).length;
      return {
        playerName,
        shots: playerShots,
        puttCount,
        lastPosition: lastShot?.position ?? null,
        isPutting: lastShot?.isPutt ?? false,
        totalShotCount: playerShots.length,
      };
    },
    [shots],
  );

  return { shots, recordScan, clearPlayer, getPlayerSummary };
}
