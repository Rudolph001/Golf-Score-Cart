import { useState, useEffect, useCallback } from "react";

interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

interface GpsState {
  position: GpsPosition | null;
  error: string | null;
  loading: boolean;
  supported: boolean;
}

export function useGpsDistance(pinLat: number, pinLng: number) {
  const [gpsState, setGpsState] = useState<GpsState>({
    position: null,
    error: null,
    loading: false,
    supported: "geolocation" in navigator,
  });

  const [watchId, setWatchId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setGpsState(s => ({ ...s, loading: true, error: null }));
    setEnabled(true);

    const watch = (highAccuracy: boolean) => navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState({
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          error: null,
          loading: false,
          supported: true,
        });
      },
      (err) => {
        if (err.code === 3 && highAccuracy) {
          // High-accuracy timed out — retry with network/IP location
          const id2 = watch(false);
          setWatchId(id2);
          return;
        }
        let msg = "Location unavailable";
        if (err.code === 1) msg = "Location permission denied";
        else if (err.code === 2) msg = "Position unavailable";
        else if (err.code === 3) msg = "Location request timed out";
        setGpsState(s => ({ ...s, error: msg, loading: false }));
      },
      { enableHighAccuracy: highAccuracy, maximumAge: 10000, timeout: highAccuracy ? 10000 : 20000 }
    );

    const id = watch(true);
    setWatchId(id);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setEnabled(false);
    setGpsState(s => ({ ...s, position: null, loading: false }));
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Haversine formula — returns metres
  function distanceTo(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const R = 6371000;
    const dLat = (toLat - fromLat) * (Math.PI / 180);
    const dLng = (toLng - fromLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat * (Math.PI / 180)) *
        Math.cos(toLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const distanceToPin = gpsState.position
    ? Math.round(distanceTo(gpsState.position.lat, gpsState.position.lng, pinLat, pinLng))
    : null;

  return {
    ...gpsState,
    distanceToPin,
    enabled,
    startTracking,
    stopTracking,
  };
}
