import { events, type ThermalEvent } from "./thermalDataService";

export type FirmsBounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };
export type FirmsService = {
  getRecentFirmsEvents(): Promise<ThermalEvent[]>;
  getFirmsEventsByBounds(bounds: FirmsBounds): Promise<ThermalEvent[]>;
  getFirmsEventsByDateRange(start: Date, end: Date): Promise<ThermalEvent[]>;
  getFirmsEvent(id: string): Promise<ThermalEvent | null>;
};

/** Adapter boundary for future NASA FIRMS credentials. Demo mode is explicit and never labeled as live FIRMS data. */
export const firmsService: FirmsService = {
  async getRecentFirmsEvents() { return events; },
  async getFirmsEventsByBounds(bounds) { return events.filter((event) => event.longitude >= bounds.minLng && event.longitude <= bounds.maxLng && event.latitude >= bounds.minLat && event.latitude <= bounds.maxLat); },
  async getFirmsEventsByDateRange(_start, _end) { return events; },
  async getFirmsEvent(id) { return events.find((event) => event.id === id || event.eventId === id) ?? null; },
};
