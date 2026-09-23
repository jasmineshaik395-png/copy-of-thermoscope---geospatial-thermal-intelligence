import { events, type EventClass, type EventStatus, type ThermalEvent } from "./thermalDataService";

export type FirmsBounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };
export type FirmsService = {
  getRecentFirmsEvents(): Promise<ThermalEvent[]>;
  getFirmsEventsByBounds(bounds: FirmsBounds): Promise<ThermalEvent[]>;
  getFirmsEventsByDateRange(start: Date, end: Date): Promise<ThermalEvent[]>;
  getFirmsEvent(id: string): Promise<ThermalEvent | null>;
  getMapKey(): string;
  setMapKey(key: string): void;
};

type FirmsRow = {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  frp: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  daynight: string;
};

const INDIA_BOUNDS: FirmsBounds = { minLng: 68, minLat: 6, maxLng: 97, maxLat: 36 };
const STORAGE_KEY = "thermoscope.firms.mapKey";
const ENV_KEY = (import.meta.env.VITE_FIRMS_MAP_KEY as string | undefined)?.trim() ?? "";
const API_ROOT = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

function parseCsv(csv: string): FirmsRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { values.push(current); current = ""; }
      else current += char;
    }
    values.push(current);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
    return {
      latitude: Number(row.latitude), longitude: Number(row.longitude), bright_ti4: Number(row.bright_ti4 ?? row.brightness), frp: Number(row.frp),
      confidence: row.confidence, acq_date: row.acq_date, acq_time: row.acq_time, satellite: row.satellite,
      instrument: row.instrument, daynight: row.daynight,
    };
  }).filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && Number.isFinite(row.frp));
}

function confidenceFor(value: string): ThermalEvent["confidence"] {
  const normalized = value.toLowerCase();
  return normalized === "h" || normalized === "high" ? "High" : normalized === "l" || normalized === "low" ? "Low" : "Medium";
}

function classFor(row: FirmsRow): EventClass {
  if (row.frp >= 80) return "Wildfire candidate";
  if (row.frp >= 35) return "Industrial fire candidate";
  return "Unknown";
}

function statusFor(frp: number): EventStatus {
  return frp >= 80 ? "High" : frp >= 35 ? "Medium" : "Low";
}

function liveEvent(row: FirmsRow, index: number): ThermalEvent {
  const frp = Math.round(row.frp * 10) / 10;
  const baseline = Math.max(10, Math.round(frp / 1.65));
  const dateTime = `${row.acq_date} · ${row.acq_time.padStart(4, "0").slice(0, 2)}:${row.acq_time.padStart(4, "0").slice(2)} UTC`;
  const id = `F${row.acq_date.replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`;
  const className = classFor(row);
  const accent = className === "Wildfire candidate" ? "coral" : className === "Industrial fire candidate" ? "amber" : "cyan";
  return {
    id, eventId: `FIRMS-${id}`, title: className === "Unknown" ? "Thermal anomaly" : className,
    location: "India · FIRMS detection", region: "India watch area", className, status: statusFor(frp), verification: "Pending",
    latitude: row.latitude, longitude: row.longitude, frp, brightnessTemperature: Number.isFinite(row.bright_ti4) ? row.bright_ti4 : 0,
    confidence: confidenceFor(row.confidence), baseline, delta: Math.round(((frp - baseline) / baseline) * 100), persistence: 1, observations: 1,
    timestamp: dateTime, satellite: `NASA ${row.satellite}`, sensor: row.instrument.toUpperCase().includes("MODIS") ? "MODIS" : "VIIRS",
    facility: "No facility enrichment in FIRMS feed", facilityType: "Satellite-detected hotspot", distance: "—",
    coords: `${row.latitude.toFixed(4)}° N, ${row.longitude.toFixed(4)}° E`, accent, demoData: false, dataSource: "NASA FIRMS", source: "NASA FIRMS",
  };
}

function mapKey() { return localStorage.getItem(STORAGE_KEY)?.trim() || ENV_KEY; }

async function requestFirms(start: Date, end: Date, bounds = INDIA_BOUNDS): Promise<ThermalEvent[]> {
  const key = mapKey();
  if (!key) return events;
  const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
  const days = Math.max(1, Math.min(10, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1));
  const url = `${API_ROOT}/${encodeURIComponent(key)}/VIIRS_NOAA21_NRT/${bbox}/${days}`;
  const response = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!response.ok) throw new Error(`NASA FIRMS returned HTTP ${response.status}`);
  const rows = parseCsv(await response.text());
  return rows.map(liveEvent);
}

export const firmsService: FirmsService = {
  async getRecentFirmsEvents() { return requestFirms(new Date(Date.now() - 86400000), new Date()); },
  async getFirmsEventsByBounds(bounds) { return requestFirms(new Date(Date.now() - 86400000), new Date(), bounds); },
  async getFirmsEventsByDateRange(start, end) { return requestFirms(start, end); },
  async getFirmsEvent(id) { return (await this.getRecentFirmsEvents()).find((event) => event.id === id || event.eventId === id) ?? null; },
  getMapKey: mapKey,
  setMapKey(key) { const trimmed = key.trim(); if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed); else localStorage.removeItem(STORAGE_KEY); },
};
