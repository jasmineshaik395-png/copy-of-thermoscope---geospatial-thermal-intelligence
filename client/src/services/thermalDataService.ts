export type EventStatus = "High" | "Medium" | "Low";
export type EventClass = "Industrial fire candidate" | "Normal industrial heat" | "Persistent thermal source" | "Wildfire candidate" | "Agricultural burning" | "Mining-related activity" | "Unknown";
export type VerificationStatus = "Pending" | "Verified" | "False positive";

export type ThermalEvent = {
  id: string; eventId: string; title: string; location: string; region: string; className: EventClass; status: EventStatus; verification: VerificationStatus;
  latitude: number; longitude: number; frp: number; brightnessTemperature: number; confidence: "High" | "Medium" | "Low";
  baseline: number; delta: number; persistence: number; observations: number; timestamp: string; satellite: string; sensor: "VIIRS" | "MODIS";
  facility: string; facilityId?: string; facilityType: string; distance: string; coords: string; accent: string; demoData: boolean; dataSource: "DEMO" | "NASA FIRMS"; source: "DEMO" | "NASA FIRMS";
};

export type Facility = { id: string; name: string; type: string; region: string; latitude: number; longitude: number; activeEvents: number; baseline: string; anomaly: "ABNORMAL" | "NORMAL" | "WATCH"; trend: string; demoData: true };

const seeds: Array<Omit<ThermalEvent, "demoData" | "dataSource" | "source" | "eventId" | "coords">> = [
  { id: "1042", title: "Industrial Fire Candidate", location: "Jamnagar, Gujarat", region: "West Coast", className: "Industrial fire candidate", status: "High", verification: "Pending", latitude: 22.4707, longitude: 70.0577, frp: 118, brightnessTemperature: 327.4, confidence: "High", baseline: 42, delta: 181, persistence: 6, observations: 14, timestamp: "22 Sep 2026 · 14:32 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "Jamnagar Refining Complex", facilityId: "FAC-001", facilityType: "Refinery", distance: "1.8 km", accent: "amber" },
  { id: "1037", title: "Persistent Thermal Source", location: "Korba, Chhattisgarh", region: "Central Belt", className: "Persistent thermal source", status: "Medium", verification: "Pending", latitude: 22.3595, longitude: 82.7501, frp: 76, brightnessTemperature: 319.2, confidence: "High", baseline: 69, delta: 10, persistence: 22, observations: 48, timestamp: "22 Sep 2026 · 13:58 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "Korba Super Thermal Power", facilityId: "FAC-002", facilityType: "Thermal power plant", distance: "0.6 km", accent: "cyan" },
  { id: "1033", title: "Wildfire Candidate", location: "Bandipur, Karnataka", region: "South Forest", className: "Wildfire candidate", status: "High", verification: "Pending", latitude: 11.7012, longitude: 76.629, frp: 94, brightnessTemperature: 324.8, confidence: "Medium", baseline: 28, delta: 236, persistence: 3, observations: 7, timestamp: "22 Sep 2026 · 12:41 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "No relevant facility identified", facilityType: "Forest region", distance: "12.4 km", accent: "coral" },
  { id: "1029", title: "Normal Industrial Heat", location: "Angul, Odisha", region: "East Corridor", className: "Normal industrial heat", status: "Low", verification: "Verified", latitude: 20.84, longitude: 85.151, frp: 51, brightnessTemperature: 311.4, confidence: "High", baseline: 48, delta: 6, persistence: 17, observations: 38, timestamp: "22 Sep 2026 · 11:19 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "Angul Steel & Power Cluster", facilityId: "FAC-003", facilityType: "Steel plant", distance: "0.9 km", accent: "green" },
  { id: "1021", title: "Agricultural Burning", location: "Bathinda, Punjab", region: "North Plains", className: "Agricultural burning", status: "Medium", verification: "False positive", latitude: 30.211, longitude: 74.9455, frp: 39, brightnessTemperature: 305.8, confidence: "Medium", baseline: 18, delta: 117, persistence: 2, observations: 4, timestamp: "22 Sep 2026 · 10:46 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "No relevant facility identified", facilityType: "Agriculture", distance: "19.6 km", accent: "violet" },
  { id: "1018", title: "Mining-related Activity", location: "Singrauli, Madhya Pradesh", region: "Central Belt", className: "Mining-related activity", status: "Medium", verification: "Pending", latitude: 24.199, longitude: 82.673, frp: 63, brightnessTemperature: 315.6, confidence: "High", baseline: 55, delta: 15, persistence: 11, observations: 24, timestamp: "22 Sep 2026 · 09:08 UTC", satellite: "Simulated VIIRS", sensor: "VIIRS", facility: "Singrauli Coal Operations", facilityId: "FAC-004", facilityType: "Mining area", distance: "2.4 km", accent: "purple" },
];

const extraLocations: Array<readonly [number, number, string]> = [
  [19.076,72.878,"Mumbai, Maharashtra"],[18.520,73.856,"Pune, Maharashtra"],[21.146,79.088,"Nagpur, Maharashtra"],[23.259,77.412,"Bhopal, Madhya Pradesh"],[22.307,73.181,"Vadodara, Gujarat"],[23.022,72.571,"Ahmedabad, Gujarat"],[24.585,73.712,"Udaipur, Rajasthan"],[26.912,75.787,"Jaipur, Rajasthan"],[28.459,77.026,"Gurugram, Haryana"],[29.969,76.878,"Panipat, Haryana"],[26.846,80.946,"Lucknow, Uttar Pradesh"],[25.435,81.846,"Prayagraj, Uttar Pradesh"],[22.572,88.363,"Kolkata, West Bengal"],[23.344,85.309,"Ranchi, Jharkhand"],[22.804,86.202,"Jamshedpur, Jharkhand"],[21.251,81.629,"Raipur, Chhattisgarh"],[21.466,84.010,"Sambalpur, Odisha"],[19.813,85.831,"Puri, Odisha"],[17.686,83.218,"Visakhapatnam, Andhra Pradesh"],[16.506,80.648,"Vijayawada, Andhra Pradesh"],[17.385,78.486,"Hyderabad, Telangana"],[15.828,78.037,"Kurnool, Andhra Pradesh"],[12.971,77.594,"Bengaluru, Karnataka"],[15.317,75.713,"Hubballi, Karnataka"],[13.082,80.270,"Chennai, Tamil Nadu"],[11.016,76.955,"Coimbatore, Tamil Nadu"],[26.238,73.024,"Jodhpur, Rajasthan"],[27.176,78.008,"Agra, Uttar Pradesh"],[25.594,85.137,"Patna, Bihar"],[24.817,93.936,"Imphal, Manipur"],[20.296,85.824,"Bhubaneswar, Odisha"],[18.989,73.117,"Navi Mumbai, Maharashtra"],[20.593,78.963,"Wardha, Maharashtra"],[14.467,78.824,"Kadapa, Andhra Pradesh"],[10.790,78.704,"Tiruchirappalli, Tamil Nadu"],[15.490,73.827,"Goa, India"] as const,
];

const classes: EventClass[] = ["Industrial fire candidate", "Persistent thermal source", "Normal industrial heat", "Agricultural burning", "Mining-related activity", "Unknown"];
const accents = ["amber", "cyan", "green", "violet", "purple", "coral"];
const generated: ThermalEvent[] = extraLocations.map(([latitude, longitude, location], index) => {
  const className = classes[index % classes.length];
  const status: EventStatus = index < 4 ? "High" : index < 8 ? "Medium" : "Low";
  const verification: VerificationStatus = index < 4 ? "Pending" : index < 30 ? "Verified" : "False positive";
  const frp = 28 + (index * 13) % 82;
  const baseline = 18 + (index * 7) % 42;
  const id = String(1100 + index);
  return { id, eventId: `TH-${id}`, title: className.replace(/\b\w/g, (char) => char.toUpperCase()), location, region: "India watch area", className, status, verification, latitude, longitude, frp, brightnessTemperature: 304 + (index % 22), confidence: index % 3 === 0 ? "High" : "Medium", baseline, delta: Math.round(((frp - baseline) / baseline) * 100), persistence: 2 + (index % 9), observations: 4 + (index % 18), timestamp: `22 Sep 2026 · ${String(8 + (index % 11)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")} UTC`, satellite: index % 2 ? "Simulated MODIS" : "Simulated VIIRS", sensor: index % 2 ? "MODIS" : "VIIRS", facility: "No relevant facility identified", facilityType: className === "Agricultural burning" ? "Agriculture" : "Industrial context", distance: `${(3 + index % 18).toFixed(1)} km`, accent: accents[index % accents.length], demoData: true, dataSource: "DEMO", source: "DEMO", coords: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E` };
});

export const events: ThermalEvent[] = [...seeds.map((event) => ({ ...event, eventId: `TH-${event.id}`, demoData: true as const, dataSource: "DEMO" as const, source: "DEMO" as const, coords: `${event.latitude.toFixed(4)}° N, ${event.longitude.toFixed(4)}° E` })), ...generated];

export const facilities: Facility[] = [
  { id: "FAC-001", name: "Jamnagar Refining Complex", type: "Refinery", region: "Gujarat", latitude: 22.4707, longitude: 70.0577, activeEvents: 2, baseline: "42 MW", anomaly: "ABNORMAL", trend: "+181%", demoData: true },
  { id: "FAC-002", name: "Korba Super Thermal Power", type: "Thermal power plant", region: "Chhattisgarh", latitude: 22.3595, longitude: 82.7501, activeEvents: 1, baseline: "69 MW", anomaly: "NORMAL", trend: "+10%", demoData: true },
  { id: "FAC-003", name: "Angul Steel & Power Cluster", type: "Steel plant", region: "Odisha", latitude: 20.84, longitude: 85.151, activeEvents: 1, baseline: "48 MW", anomaly: "NORMAL", trend: "+6%", demoData: true },
  { id: "FAC-004", name: "Singrauli Coal Operations", type: "Mining area", region: "Madhya Pradesh", latitude: 24.199, longitude: 82.673, activeEvents: 2, baseline: "55 MW", anomaly: "WATCH", trend: "+15%", demoData: true },
  { id: "FAC-005", name: "Dahej LNG Terminal", type: "LNG facility", region: "Gujarat", latitude: 21.708, longitude: 72.555, activeEvents: 0, baseline: "31 MW", anomaly: "NORMAL", trend: "+2%", demoData: true },
  { id: "FAC-006", name: "Visakhapatnam Steel Works", type: "Steel plant", region: "Andhra Pradesh", latitude: 17.6868, longitude: 83.2185, activeEvents: 1, baseline: "57 MW", anomaly: "WATCH", trend: "+12%", demoData: true },
];

export const thermalDataService = {
  source: "DemoFirmsService" as const,
  async getThermalEvents() { return events; },
  async getThermalEvent(id: string) { return events.find((event) => event.id === id || event.eventId === id) ?? null; },
  async getThermalEventsInBounds(bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) { return events.filter((event) => event.longitude >= bounds.minLng && event.longitude <= bounds.maxLng && event.latitude >= bounds.minLat && event.latitude <= bounds.maxLat); },
  async getThermalEventsNearLocation(lat: number, lon: number, radiusKm: number) { return events.filter((event) => Math.hypot((event.latitude - lat) * 111, (event.longitude - lon) * 104) <= radiusKm); },
  async getFacilities() { return facilities; },
};

export const dataSourceStatus = { firms: { source: "NASA FIRMS", status: "demo", label: "Prototype demonstration data" }, osm: { source: "OpenStreetMap", status: "demo", label: "Map context" }, weather: { source: "Weather context", status: "demo", label: "Prototype demonstration data" }, satellite: { source: "NASA GIBS", status: "live", label: "Satellite imagery" } } as const;
