import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface BallMark {
  playerName: string;
  playerIndex: number;
  lat: number;
  lng: number;
  club: string;
  distanceToPin: number;
}

interface HoleMapProps {
  pinLat: number;
  pinLng: number;
  teeLat: number;
  teeLng: number;
  userLat?: number | null;
  userLng?: number | null;
  ballMarks?: BallMark[];
  playerColors?: string[];
}

const PLAYER_COLORS = ["#2563eb", "#dc2626", "#d97706", "#16a34a"];

export function HoleMap({
  pinLat, pinLng,
  teeLat, teeLng,
  userLat, userLng,
  ballMarks = [],
  playerColors = PLAYER_COLORS,
}: HoleMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current!, {
        center: [pinLat, pinLng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      });

      mapRef.current = map;

      // Satellite-style tiles from ESRI
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "© Esri" }
      ).addTo(map);

      // Tee marker (white flag)
      const teeIcon = L.divIcon({
        html: `<div style="width:20px;height:20px;background:#fff;border:3px solid #166534;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,.4);font-weight:bold;color:#166534">T</div>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([teeLat, teeLng], { icon: teeIcon })
        .addTo(map)
        .bindPopup("🟩 Tee Box");

      // Tee-to-pin dotted line
      L.polyline([[teeLat, teeLng], [pinLat, pinLng]], {
        color: "#ffffff",
        weight: 2,
        dashArray: "6 6",
        opacity: 0.5,
      }).addTo(map);

      // Pin marker (flag icon)
      const pinIcon = L.divIcon({
        html: `<div style="font-size:26px;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,.6)">🏌️</div>`,
        className: "",
        iconSize: [26, 26],
        iconAnchor: [6, 22],
      });
      L.marker([pinLat, pinLng], { icon: pinIcon })
        .addTo(map)
        .bindPopup("📍 Pin");

      // User GPS marker
      if (userLat != null && userLng != null) {
        const userIcon = L.divIcon({
          html: `<div style="width:22px;height:22px;background:#22c55e;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(34,197,94,.4),0 2px 8px rgba(0,0,0,.4)"></div>`,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup("📡 Your position");

        // Line from user to pin
        L.polyline([[userLat, userLng], [pinLat, pinLng]], {
          color: "#22c55e",
          weight: 2,
          dashArray: "8 5",
          opacity: 0.8,
        }).addTo(map);
      }

      // Ball marks per player
      ballMarks.forEach((mark, i) => {
        const color = playerColors[mark.playerIndex] || PLAYER_COLORS[i % PLAYER_COLORS.length];
        const ballIcon = L.divIcon({
          html: `<div style="width:18px;height:18px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:bold">${mark.playerIndex + 1}</div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([mark.lat, mark.lng], { icon: ballIcon })
          .addTo(map)
          .bindPopup(`<b>${mark.playerName}</b><br>${mark.club} · ${mark.distanceToPin}m to pin`);

        // Ball to pin distance line
        L.polyline([[mark.lat, mark.lng], [pinLat, pinLng]], {
          color,
          weight: 1.5,
          dashArray: "4 4",
          opacity: 0.6,
        }).addTo(map);
      });

      // Fit bounds to show all relevant markers
      const latlngs: [number, number][] = [
        [teeLat, teeLng],
        [pinLat, pinLng],
      ];
      if (userLat != null && userLng != null) latlngs.push([userLat, userLng]);
      ballMarks.forEach(m => latlngs.push([m.lat, m.lng]));
      if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 18 });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pinLat, pinLng, teeLat, teeLng, userLat, userLng, ballMarks.length]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
  );
}
