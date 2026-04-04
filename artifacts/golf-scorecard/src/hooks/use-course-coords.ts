import { useState, useCallback } from "react";

const STORAGE_KEY = "golf_course_coords";

interface LatLng { lat: number; lng: number }
interface HoleOverride { tee?: LatLng; pin?: LatLng }

function load(): Record<number, HoleOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(coords: Record<number, HoleOverride>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
}

/**
 * Returns effective pin/tee coordinates for a hole, with localStorage overrides
 * taking priority over the server-provided defaults.  Call `setTeeHere` /
 * `setPinHere` with the user's current GPS position to save calibrated coords.
 */
export function useCourseCoords(
  holeNumber: number,
  defaults: { pinLat: number; pinLng: number; teeLat: number; teeLng: number },
) {
  const [overrides, setOverrides] = useState<Record<number, HoleOverride>>(load);

  const hole = overrides[holeNumber] ?? {};

  const pinLat = hole.pin?.lat ?? defaults.pinLat;
  const pinLng = hole.pin?.lng ?? defaults.pinLng;
  const teeLat = hole.tee?.lat ?? defaults.teeLat;
  const teeLng = hole.tee?.lng ?? defaults.teeLng;

  const setTeeHere = useCallback((lat: number, lng: number) => {
    setOverrides(prev => {
      const next = { ...prev, [holeNumber]: { ...prev[holeNumber], tee: { lat, lng } } };
      persist(next);
      return next;
    });
  }, [holeNumber]);

  const setPinHere = useCallback((lat: number, lng: number) => {
    setOverrides(prev => {
      const next = { ...prev, [holeNumber]: { ...prev[holeNumber], pin: { lat, lng } } };
      persist(next);
      return next;
    });
  }, [holeNumber]);

  const clearHole = useCallback(() => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[holeNumber];
      persist(next);
      return next;
    });
  }, [holeNumber]);

  return {
    pinLat, pinLng, teeLat, teeLng,
    hasCustomTee: !!hole.tee,
    hasCustomPin: !!hole.pin,
    setTeeHere, setPinHere, clearHole,
  };
}
