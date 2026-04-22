import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation, MapPin, Check, Phone, Mail } from "lucide-react";
import type { PrintShop } from "@/integrations/supabase/types";
import { useLanguage } from "@/i18n/LanguageContext";

// Fix Leaflet default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeShopIcon(selected: boolean, nearest: boolean) {
  const color = selected ? "#3b82f6" : nearest ? "#10b981" : "#6b7280";
  const size = selected ? 36 : nearest ? 32 : 28;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.3}" viewBox="0 0 24 32">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
    popupAnchor: [0, -(size * 1.3)],
  });
}

function makeUserIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
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
  const [nearestShop, setNearestShop] = useState<PrintShop | null>(null);
  const [bottomShop, setBottomShop] = useState<PrintShop | null>(selected);

  const shopsWithCoords = shops.filter((s) => s.lat != null && s.lng != null);

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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update shop markers whenever shops or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers not in current shops
    markersRef.current.forEach((marker, id) => {
      if (!shopsWithCoords.find((s) => s.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    shopsWithCoords.forEach((shop) => {
      const isSelected = selected?.id === shop.id;
      const isNearest = nearestShop?.id === shop.id;
      const icon = makeShopIcon(isSelected, isNearest);

      if (markersRef.current.has(shop.id)) {
        markersRef.current.get(shop.id)!.setIcon(icon);
      } else {
        const marker = L.marker([shop.lat!, shop.lng!], { icon })
          .addTo(map)
          .on("click", () => {
            onSelect(shop);
            setBottomShop(shop);
          });
        markersRef.current.set(shop.id, marker);
      }
    });

    // Fit bounds to all shops if nothing selected yet
    if (!selected && shopsWithCoords.length > 0) {
      const bounds = L.latLngBounds(shopsWithCoords.map((s) => [s.lat!, s.lng!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [shopsWithCoords, selected, nearestShop]);

  // Pan to selected shop
  useEffect(() => {
    if (selected && mapRef.current) {
      if (selected.lat != null && selected.lng != null) {
        mapRef.current.setView([selected.lat, selected.lng], 14, { animate: true });
      }
      setBottomShop(selected);
    }
  }, [selected]);

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

        // Place / move user dot
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userMarkerRef.current = L.marker([lat, lng], { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);
        }

        // Find nearest shop
        let nearest: PrintShop | null = null;
        let minDist = Infinity;
        shopsWithCoords.forEach((shop) => {
          const d = distanceKm(lat, lng, shop.lat!, shop.lng!);
          if (d < minDist) { minDist = d; nearest = shop; }
        });

        setNearestShop(nearest);

        if (nearest) {
          onSelect(nearest);
          setBottomShop(nearest);
          map.setView([(lat + nearest.lat!) / 2, (lng + nearest.lng!) / 2], 12, { animate: true });
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

  const distToSelected =
    userPos && selected?.lat != null && selected?.lng != null
      ? distanceKm(userPos.lat, userPos.lng, selected.lat, selected.lng)
      : null;

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

      {gpsError && (
        <p className="text-xs text-red-500 text-center -mt-1">{gpsError}</p>
      )}

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: 260 }}
      />

      {/* Selected shop card */}
      {bottomShop && (
        <div className={`rounded-2xl border-2 px-4 py-3.5 transition-all ${selected?.id === bottomShop.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${selected?.id === bottomShop.id ? "bg-blue-100" : "bg-gray-100"}`}>
              <MapPin className={`w-5 h-5 ${selected?.id === bottomShop.id ? "text-blue-500" : "text-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-bold ${selected?.id === bottomShop.id ? "text-blue-700" : "text-gray-800"}`}>
                  {bottomShop.name}
                </p>
                {nearestShop?.id === bottomShop.id && (
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                    {t("nearest")}
                  </span>
                )}
                {distToSelected != null && selected?.id === bottomShop.id && (
                  <span className="text-xs text-gray-400 font-medium">{formatDist(distToSelected)}</span>
                )}
              </div>
              {bottomShop.address && <p className="text-xs text-gray-500 mt-0.5">{bottomShop.address}</p>}
              <div className="flex flex-wrap gap-3 mt-1">
                {bottomShop.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{bottomShop.phone}</span>}
                {bottomShop.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{bottomShop.email}</span>}
              </div>
            </div>
            {selected?.id === bottomShop.id && (
              <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            )}
          </div>
          {selected?.id !== bottomShop.id && (
            <button
              onClick={() => onSelect(bottomShop)}
              className="mt-2.5 w-full py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              {t("selectThisShop")}
            </button>
          )}
        </div>
      )}

      {!bottomShop && (
        <p className="text-center text-sm text-gray-400">{t("tapMapToSelect")}</p>
      )}
    </div>
  );
}
