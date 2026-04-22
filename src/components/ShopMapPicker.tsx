import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation, MapPin, Check, Phone, Mail } from "lucide-react";
import type { PrintShop } from "@/integrations/supabase/types";
import { useLanguage } from "@/i18n/LanguageContext";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeShopIcon(selected: boolean, rank: number | null) {
  // rank: 1 = nearest (green), 2-5 = teal, null = gray
  const color = selected
    ? "#3b82f6"
    : rank === 1
    ? "#10b981"
    : rank != null
    ? "#14b8a6"
    : "#9ca3af";
  const size = selected ? 36 : rank === 1 ? 34 : rank != null ? 30 : 26;
  const label = rank != null ? `<text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="${selected ? "#3b82f6" : rank === 1 ? "#10b981" : "#14b8a6"}" font-family="sans-serif">${rank}</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="6" fill="white"/>
    ${label}
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, Math.round(size * 1.3)],
    iconAnchor: [size / 2, Math.round(size * 1.3)],
    popupAnchor: [0, -Math.round(size * 1.3)],
  });
}

function makeUserIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="9" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
    <circle cx="11" cy="11" r="4" fill="white"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

interface ShopWithDist extends PrintShop {
  distKm: number;
}

interface Props {
  shops: PrintShop[];
  selected: PrintShop | null;
  onSelect: (shop: PrintShop) => void;
}

export default function ShopMapPicker({ shops, selected, onSelect }: Props) {
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [closestFive, setClosestFive] = useState<ShopWithDist[]>([]);

  const shopsWithCoords = shops.filter((s) => s.lat != null && s.lng != null);

  // rank map: shopId -> 1-5 (only set after GPS)
  const rankMap = new Map<string, number>();
  closestFive.forEach((s, i) => rankMap.set(s.id, i + 1));

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Add/update markers whenever shops, selection, or closest-five changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      if (!shopsWithCoords.find((s) => s.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    shopsWithCoords.forEach((shop) => {
      const isSelected = selected?.id === shop.id;
      const rank = rankMap.get(shop.id) ?? null;
      const icon = makeShopIcon(isSelected, rank);

      if (markersRef.current.has(shop.id)) {
        markersRef.current.get(shop.id)!.setIcon(icon);
      } else {
        const marker = L.marker([shop.lat!, shop.lng!], { icon })
          .addTo(map)
          .on("click", () => onSelect(shop));
        markersRef.current.set(shop.id, marker);
      }
    });

    if (!selected && closestFive.length === 0 && shopsWithCoords.length > 0) {
      const bounds = L.latLngBounds(shopsWithCoords.map((s) => [s.lat!, s.lng!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [shopsWithCoords, selected, closestFive]);

  // Pan to selected shop when it changes
  useEffect(() => {
    if (selected?.lat != null && selected?.lng != null && mapRef.current) {
      mapRef.current.setView([selected.lat, selected.lng], 14, { animate: true });
    }
  }, [selected?.id]);

  function locateUser() {
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        setGpsLoading(false);

        const map = mapRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userMarkerRef.current = L.marker([lat, lng], {
            icon: makeUserIcon(),
            zIndexOffset: 1000,
          }).addTo(map);
        }

        // Sort all shops by distance, take top 5
        const sorted = shopsWithCoords
          .map((shop) => ({ ...shop, distKm: distanceKm(lat, lng, shop.lat!, shop.lng!) }))
          .sort((a, b) => a.distKm - b.distKm)
          .slice(0, 5) as ShopWithDist[];

        setClosestFive(sorted);

        // Auto-select nearest
        if (sorted.length > 0) {
          onSelect(sorted[0]);
          // Fit map to user + top 5
          const points: [number, number][] = [[lat, lng], ...sorted.map((s) => [s.lat!, s.lng!] as [number, number])];
          map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 13, animate: true });
        } else {
          map.setView([lat, lng], 12, { animate: true });
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? t("gpsPermissionDenied") : t("gpsUnavailable"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const listToShow = closestFive.length > 0 ? closestFive : [];

  return (
    <div className="flex flex-col gap-3">
      {/* GPS button */}
      <button
        onClick={locateUser}
        disabled={gpsLoading}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {gpsLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("locatingYou")}</>
          : <><Navigation className="w-4 h-4" /> {t("findNearestShop")}</>}
      </button>

      {gpsError && <p className="text-xs text-red-500 text-center -mt-1">{gpsError}</p>}

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: 240 }}
      />

      {/* 5 closest shops list */}
      {listToShow.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
            {t("closestLocations")}
          </p>
          {listToShow.map((shop, i) => {
            const isSelected = selected?.id === shop.id;
            const rank = i + 1;
            const rankColor =
              rank === 1 ? "bg-green-100 text-green-700" : "bg-teal-50 text-teal-600";
            return (
              <button
                key={shop.id}
                onClick={() => onSelect(shop)}
                className={`w-full flex items-start gap-3 rounded-2xl px-4 py-3.5 border-2 transition-all text-left ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {/* Rank badge */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-extrabold ${isSelected ? "bg-blue-500 text-white" : rankColor}`}>
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                      {shop.name}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {formatDist(shop.distKm)}
                    </span>
                    {rank === 1 && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                        {t("nearest")}
                      </span>
                    )}
                  </div>
                  {shop.address && <p className="text-xs text-gray-500 mt-0.5">{shop.address}</p>}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {shop.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{shop.phone}</span>}
                    {shop.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{shop.email}</span>}
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 justify-center py-2">
          <MapPin className="w-4 h-4 text-gray-300" />
          <p className="text-sm text-gray-400">{t("tapMapToSelect")}</p>
        </div>
      )}
    </div>
  );
}
