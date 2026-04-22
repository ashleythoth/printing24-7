import { createContext, useContext, useState, type ReactNode } from "react";

export type Units = "imperial" | "metric";

interface UnitsContextType {
  units: Units;
  setUnits: (u: Units) => void;
  formatDist: (km: number) => string;
}

const UnitsContext = createContext<UnitsContextType | null>(null);

const STORAGE_KEY = "printing247_units";

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "metric" ? "metric" : "imperial"; // default imperial
  });

  function setUnits(u: Units) {
    setUnitsState(u);
    localStorage.setItem(STORAGE_KEY, u);
  }

  function formatDist(km: number): string {
    if (units === "imperial") {
      const miles = km * 0.621371;
      if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
      return `${miles.toFixed(1)} mi`;
    } else {
      if (km < 1) return `${Math.round(km * 1000)} m`;
      return `${km.toFixed(1)} km`;
    }
  }

  return (
    <UnitsContext.Provider value={{ units, setUnits, formatDist }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
