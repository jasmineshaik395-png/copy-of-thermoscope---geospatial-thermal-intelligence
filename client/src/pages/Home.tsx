import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import { events, facilities, thermalDataService, type ThermalEvent, type Facility } from "../services/thermalDataService";
import { satelliteImageryService } from "../services/satelliteImageryService";
import { firmsService } from "../services/firmsService";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bolt,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Cloud,
  CloudRain,
  Crosshair,
  Database,
  Download,
  Eye,
  Factory,
  FileCheck2,
  Filter,
  Flame,
  Globe2,
  Info,
  Layers3,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Navigation,
  PanelRight,
  Radio,
  RefreshCw,
  Search,
  Satellite,
  ScanLine,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  Thermometer,
  Timer,
  TrendingUp,
  UserRound,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

const timeline = [
  { label: "14:00", value: 48 },
  { label: "15:00", value: 54 },
  { label: "16:00", value: 51 },
  { label: "17:00", value: 76 },
  { label: "18:00", value: 68 },
  { label: "19:00", value: 91 },
  { label: "20:00", value: 84 },
  { label: "21:00", value: 118 },
];

const thermalFingerprint = [
  { label: "-6d", current: 38, baseline: 42 },
  { label: "-5d", current: 44, baseline: 42 },
  { label: "-4d", current: 40, baseline: 42 },
  { label: "-3d", current: 43, baseline: 42 },
  { label: "-2d", current: 58, baseline: 42 },
  { label: "-1d", current: 73, baseline: 42 },
  { label: "Now", current: 118, baseline: 42 },
];

const chartBars = [
  { label: "Fire", value: 12, color: "#f2a23a" },
  { label: "Normal", value: 27, color: "#40d3c0" },
  { label: "Source", value: 19, color: "#8fa4ff" },
  { label: "Wildfire", value: 8, color: "#ef786c" },
  { label: "Agri", value: 16, color: "#bb8af3" },
];

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <i />
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const demoTitle = tone === "demo" ? "Prototype demonstration data. Values are simulated for interface testing and are not live NASA FIRMS observations." : undefined;
  return <span title={demoTitle} className={`status-pill status-${tone}`}>{children}</span>;
}

function Sparkline({ color = "#40d3c0", points = "0,20 18,17 36,22 54,10 72,14 90,4" }: { color?: string; points?: string }) {
  return (
    <svg className="sparkline" viewBox="0 0 90 24" role="img" aria-label="Trend sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FirmsConnection({ status, onConnect }: { status: "demo" | "live" | "loading" | "error"; onConnect: (key: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(() => firmsService.getMapKey());
  const labels = { demo: "Demo fallback", live: "NASA FIRMS live", loading: "Connecting…", error: "FIRMS error" };
  const connect = async () => { await onConnect(key); setOpen(false); };
  return <div className="firms-connection">
    <button className={`firms-status firms-${status}`} onClick={() => setOpen((value) => !value)} aria-expanded={open}><span className="pulse-dot" /> {labels[status]} <ChevronDown size={13} /></button>
    {open && <div className="firms-popover"><strong>NASA FIRMS CONNECTION</strong><p>Live VIIRS-NPP detections for India. A free MAP_KEY is required.</p><label>MAP_KEY<input value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste your FIRMS MAP_KEY" type="password" autoComplete="off" /></label><div className="firms-popover-actions"><a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer">Get a free key ↗</a><button className="primary-button mini" onClick={() => void connect()} disabled={status === "loading"}>{status === "loading" ? "Connecting…" : "Connect & refresh"}</button></div><small>Key is stored only in this browser. For production, proxy FIRMS requests through a server so the key is not exposed to users.</small></div>}
  </div>;
}

function KpiCard({ label, value, delta, icon: Icon, tone, points, onClick }: { label: string; value: string; delta: string; icon: React.ElementType; tone: string; points?: string; onClick?: () => void }) {
  return (
    <button className="kpi-card" onClick={onClick} aria-label={`${label}: ${value}`}>
      <div className="kpi-topline">
        <span>{label}</span>
        <span className={`kpi-icon ${tone}`}><Icon size={16} strokeWidth={1.8} /></span>
      </div>
      <div className="kpi-value-row">
        <strong>{value}</strong>
        <Sparkline color={tone === "amber" ? "#f2a23a" : tone === "coral" ? "#ef786c" : "#40d3c0"} points={points} />
      </div>
      <div className="kpi-foot"><span className={delta.startsWith("+") ? "up" : "muted"}>{delta}</span><span>vs. prior 24h</span></div>
    </button>
  );
}

function TopBar({ onMenu, activeView, onSearch, onOpenInvestigation, onOpenFacility, onRangeChange, live }: { onMenu: () => void; activeView: string; onSearch: (value: string) => void; onOpenInvestigation: (event: ThermalEvent) => void; onOpenFacility: (facility: Facility) => void; onRangeChange: (range: string) => void; live: boolean }) {
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("Today");
  const [utcNow, setUtcNow] = useState(() => new Date());
  const profileRef = useRef<HTMLDivElement | null>(null);
  const matches = events.filter((event) => `${event.eventId} ${event.id} ${event.title} ${event.location} ${event.region} ${event.facility} ${event.facilityType}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  const rangeLabel = selectedRange === "Today" ? "22 Sep 2026" : selectedRange === "Yesterday" ? "21 Sep 2026" : selectedRange === "Last 7 days" ? "16 Sep – 22 Sep 2026" : selectedRange === "Last 30 days" ? "24 Aug – 22 Sep 2026" : selectedRange;
  useEffect(() => { const timer = window.setInterval(() => setUtcNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); window.setTimeout(() => document.querySelector<HTMLInputElement>(".global-palette-input")?.focus(), 0); } if (event.key === "Escape") { setPaletteOpen(false); setProfileOpen(false); setDateOpen(false); } };
    const onClick = (event: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false); };
    window.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick); return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, []);
  const chooseRange = (range: string) => { setSelectedRange(range); setDateOpen(false); onRangeChange(range); };
  return <>
    <header className="topbar">
      <div className="mobile-brand"><button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button><LogoMark /><strong>THERMOSCOPE</strong></div>
      <div className="breadcrumb"><span>Operations</span><ChevronRight size={14} /><strong>{activeView}</strong></div>
      <div className="topbar-actions">
        <label className="search-box"><Search size={15} /><input value={query} onFocus={() => setPaletteOpen(true)} onChange={(event) => { setQuery(event.target.value); onSearch(event.target.value); setPaletteOpen(true); }} placeholder="Search events, facilities..." aria-label="Global search" /><kbd>⌘ K</kbd></label>
        <button className="date-control" onClick={() => setDateOpen((open) => !open)} aria-expanded={dateOpen}><CalendarGlyph /><span>{rangeLabel}</span><ChevronDown size={14} /></button>
        <div className="utc-clock" title="Local application clock">{utcNow.toISOString().slice(0, 10) + " · " + utcNow.toISOString().slice(11, 19)} UTC</div><div className="top-divider" /><button className="source-status" title={live ? "NASA FIRMS VIIRS-NPP detections are active" : "Interactive prototype with simulated event data"}><span className="pulse-dot" /> <span>{live ? "NASA FIRMS live" : "Demo sources active"}</span></button>
        <div className="profile-wrap" ref={profileRef}><button className="avatar" onClick={() => setProfileOpen((open) => !open)} aria-label="Open analyst profile" aria-expanded={profileOpen}><UserRound size={16} /></button>{profileOpen && <div className="profile-menu"><strong>ANALYST</strong><span className="profile-online"><i /> Online</span><button>Profile</button><button>Settings</button><button>Sign out</button></div>}</div>
      </div>
      {dateOpen && <div className="date-menu"><strong>DATE RANGE</strong>{["Today", "Yesterday", "Last 24 hours", "Last 7 days", "Last 30 days", "Custom range"].map((range) => <button key={range} className={selectedRange === range ? "active" : ""} onClick={() => chooseRange(range)}>{range}<ChevronRight size={13} /></button>)}</div>}
    </header>
    {paletteOpen && <div className="palette-scrim" onMouseDown={() => setPaletteOpen(false)}><div className="search-palette" onMouseDown={(event) => event.stopPropagation()}><div className="palette-title"><Search size={15} /><strong>Search THERMOSCOPE</strong><button onClick={() => setPaletteOpen(false)}><X size={15} /></button></div><input className="global-palette-input" autoFocus value={query} onChange={(event) => { setQuery(event.target.value); onSearch(event.target.value); }} placeholder="Search events, facilities, locations..." />{query ? <div className="palette-results">{matches.length ? matches.map((event) => <button key={event.id} onClick={() => { setPaletteOpen(false); onOpenInvestigation(event); }}><span><strong>#{event.id} · {event.location}</strong><small>{event.className} · {event.frp} MW</small></span><ChevronRight size={15} /></button>) : <span className="palette-empty">No matching events or facilities.</span>}</div> : <div className="palette-recent"><span>RECENT SEARCHES</span><button onClick={() => { setQuery("Jamnagar"); onSearch("Jamnagar"); }}><strong>#1042 · Jamnagar</strong><small>Industrial Fire Candidate</small></button><button onClick={() => { setQuery("Korba"); onSearch("Korba"); }}><strong>#1037 · Korba</strong><small>Persistent Thermal Source</small></button></div>}</div></div>}
  </>;
}
function CalendarGlyph() {
  return <span className="calendar-glyph"><span /></span>;
}

const navItems = [
  { label: "Command Center", icon: Crosshair },
  { label: "Thermal Events", icon: Flame, count: "42" },
  { label: "Event Investigation", icon: ScanLine },
  { label: "Facilities", icon: Factory },
  { label: "Thermal History", icon: TrendingUp },
  { label: "Verification Center", icon: ClipboardCheck, count: "08" },
  { label: "Analytics", icon: BarChart3 },
  { label: "Alerts", icon: Bell, count: "03", alert: true },
];

function Sidebar({ activeView, setActiveView, open, onClose, live, eventCount }: { activeView: string; setActiveView: (value: string) => void; open: boolean; onClose: () => void; live: boolean; eventCount: number }) {
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <LogoMark />
          <div><strong>THERMOSCOPE</strong><span>THERMAL INTELLIGENCE FOR A SAFER WORLD</span></div>
        </div>
        <div className="online-strip"><span className="pulse-dot" /> SYSTEM ONLINE <span className={live ? "demo-badge live-badge" : "demo-badge"}>{live ? "LIVE" : "DEMO"}</span></div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">WORKSPACE</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.label} className={`nav-item ${activeView === item.label ? "active" : ""}`} onClick={() => { setActiveView(item.label); onClose(); }}><Icon size={17} strokeWidth={1.7} /><span>{item.label}</span>{item.count && <em className={item.alert ? "nav-count alert" : "nav-count"}>{item.label === "Thermal Events" ? eventCount : item.count}</em>}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-card"><div className="scope-heading"><span className="scope-ring"><Target size={13} /></span><span>CONTEXT SCOPE</span><MoreHorizontal size={15} /></div><strong>5 km radius</strong><p>Context only · not proof of causation</p><div className="scope-meter"><span /></div></div>
          <button className="nav-item compact"><Database size={16} /><span>Data sources</span><span className="source-count">5/5</span></button>
          <button className="nav-item compact"><SlidersHorizontal size={16} /><span>System settings</span></button>
          <div className="analyst-card"><div className="avatar small"><UserRound size={15} /></div><div><strong>ANALYST</strong><span>Online · {live ? "live mode" : "demo mode"}</span></div><ChevronDown size={14} /></div>
        </div>
      </aside>
    </>
  );
}

type MapLayerState = {
  thermalEvents: boolean;
  eventClusters: boolean;
  persistentSources: boolean;
  industrialFireCandidates: boolean;
  wildfireCandidates: boolean;
  normalIndustrialHeat: boolean;
  agriculturalBurning: boolean;
  facilities: boolean;
  refineries: boolean;
  powerPlants: boolean;
  miningAreas: boolean;
  lngFacilities: boolean;
  roads: boolean;
  forest: boolean;
  agriculture: boolean;
  waterBodies: boolean;
  settlements: boolean;
  contextRadius: boolean;
  wind: boolean;
};

const defaultMapLayers: MapLayerState = {
  thermalEvents: true, eventClusters: true, persistentSources: true, industrialFireCandidates: true, wildfireCandidates: true, normalIndustrialHeat: true, agriculturalBurning: true,
  facilities: false, refineries: false, powerPlants: false, miningAreas: false, lngFacilities: false, roads: true, forest: false, agriculture: false, waterBodies: false, settlements: false, contextRadius: true, wind: false,
};

const indiaBounds = L.latLngBounds([6, 68], [36, 97]);

const htmlEscape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] ?? char));
const eventPopup = (event: ThermalEvent) => `<div class="leaflet-popup-card"><div class="leaflet-popup-kicker">THERMAL EVENT ${htmlEscape(event.eventId)}</div><strong>${htmlEscape(event.title)}</strong><div class="leaflet-popup-grid"><span>FRP<b>${event.frp} MW</b></span><span>Brightness<b>${event.brightnessTemperature} K</b></span><span>Confidence<b>${event.confidence}</b></span><span>Priority<b class="popup-amber">${event.status.toUpperCase()}</b></span><span>Detected<b>${htmlEscape(event.timestamp)}</b></span><span>Location<b>${htmlEscape(event.location)}</b></span></div><div class="leaflet-popup-foot"><span>Facility distance <b>${htmlEscape(event.distance)}</b></span><button class="popup-investigate" data-event-id="${event.id}">Open Investigation <span>→</span></button></div></div>`;
const facilityPopup = (facility: Facility) => `<div class="leaflet-popup-card facility-popup"><div class="leaflet-popup-kicker">FACILITY INTELLIGENCE ${htmlEscape(facility.id)}</div><strong>${htmlEscape(facility.name)}</strong><p>${htmlEscape(facility.type)} · ${htmlEscape(facility.region)}</p><div class="leaflet-popup-grid"><span>Active events<b>${facility.activeEvents}</b></span><span>Typical FRP<b>${htmlEscape(facility.baseline)}</b></span><span>Anomaly<b class="popup-amber">${facility.anomaly}</b></span></div><div class="leaflet-popup-foot"><span>Data source: DEMO</span><button class="popup-facility">Open Facility Intelligence <span>→</span></button></div></div>`;
const parseCoordinateSearch = (value: string) => {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude, label: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°` };
};
const markerIcon = (event: ThermalEvent) => L.divIcon({ className: `thermo-marker-wrap marker-${event.accent}`, html: `<span class="thermo-marker"><i></i></span>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
const facilityIcon = (facility: Facility) => L.divIcon({ className: "facility-marker-wrap", html: `<span class="facility-marker"><i></i></span>`, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });

function MapView({ selected, onSelect, onOpenInvestigation, onOpenFacility, onResetSelection }: { selected: ThermalEvent | null; onSelect: (event: ThermalEvent) => void; onOpenInvestigation: (event: ThermalEvent) => void; onOpenFacility: (facility: Facility) => void; onResetSelection: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const eventLayerRef = useRef<L.LayerGroup | null>(null);
  const facilityLayerRef = useRef<L.LayerGroup | null>(null);
  const contextLayerRef = useRef<L.LayerGroup | null>(null);
  const locationLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const [baseMap, setBaseMap] = useState<"street" | "satellite">("street");
  const [layersOpen, setLayersOpen] = useState(false);
  const [layerState, setLayerState] = useState<MapLayerState>(defaultMapLayers);
  const layerStateRef = useRef<MapLayerState>(defaultMapLayers);
  layerStateRef.current = layerState;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchError, setSearchError] = useState("");
  const [viewportCount, setViewportCount] = useState(events.length);
  const [viewCenter, setViewCenter] = useState({ latitude: 22.9734, longitude: 78.6569 });
  const [locationError, setLocationError] = useState("");

  const updateViewport = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const layers = layerStateRef.current;
    const activeEvents = events.filter((event) => {
      if (!layers.thermalEvents || !bounds.contains([event.latitude, event.longitude])) return false;
      if (event.className === "Persistent thermal source" && !layers.persistentSources) return false;
      if (event.className === "Industrial fire candidate" && !layers.industrialFireCandidates) return false;
      if (event.className === "Wildfire candidate" && !layers.wildfireCandidates) return false;
      if (event.className === "Normal industrial heat" && !layers.normalIndustrialHeat) return false;
      if (event.className === "Agricultural burning" && !layers.agriculturalBurning) return false;
      return true;
    });
    setViewportCount(activeEvents.length);
    const center = map.getCenter();
    setViewCenter({ latitude: center.lat, longitude: center.lng });
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: false, preferCanvas: true, worldCopyJump: true }).setView([22.9734, 78.6569], 5);
    mapRef.current = map;
    L.control.zoom({ position: "topleft" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false, updateWhenIdle: false, maxWidth: 120 }).addTo(map);
    streetLayerRef.current = satelliteImageryService.getStreetLayer();
    satelliteLayerRef.current = satelliteImageryService.getSatelliteLayer();
    streetLayerRef.current.addTo(map);
    eventLayerRef.current = L.layerGroup().addTo(map);
    facilityLayerRef.current = L.layerGroup();
    contextLayerRef.current = L.layerGroup().addTo(map);
    locationLayerRef.current = L.layerGroup().addTo(map);
    map.on("moveend zoomend", updateViewport);
    map.on("resize", updateViewport);
    updateViewport();
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !streetLayerRef.current || !satelliteLayerRef.current) return;
    const nextLayer = baseMap === "satellite" ? satelliteLayerRef.current : streetLayerRef.current;
    const otherLayer = baseMap === "satellite" ? streetLayerRef.current : satelliteLayerRef.current;
    if (map.hasLayer(otherLayer)) map.removeLayer(otherLayer);
    if (!map.hasLayer(nextLayer)) nextLayer.addTo(map);
  }, [baseMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const oldLayer = eventLayerRef.current;
    if (oldLayer) map.removeLayer(oldLayer);
    const eventGroup = layerState.eventClusters ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44, spiderfyOnMaxZoom: true }) : L.layerGroup();
    const matchingEvents = events.filter((event) => {
      if (!layerState.thermalEvents) return false;
      if (event.className === "Persistent thermal source" && !layerState.persistentSources) return false;
      if (event.className === "Industrial fire candidate" && !layerState.industrialFireCandidates) return false;
      if (event.className === "Wildfire candidate" && !layerState.wildfireCandidates) return false;
      if (event.className === "Normal industrial heat" && !layerState.normalIndustrialHeat) return false;
      if (event.className === "Agricultural burning" && !layerState.agriculturalBurning) return false;
      return true;
    });
    matchingEvents.forEach((event) => {
      const marker = L.marker([event.latitude, event.longitude], { icon: markerIcon(event), title: `${event.eventId} · ${event.title}` });
      marker.bindTooltip(`<span class="map-tooltip-title">Event ${htmlEscape(event.eventId)}</span><br/><span>${htmlEscape(event.title)}</span><br/><span>FRP ${event.frp} MW · ${htmlEscape(event.timestamp)}</span>`, { direction: "top", offset: [0, -10], className: "thermo-tooltip" });
      marker.bindPopup(eventPopup(event), { maxWidth: 320, minWidth: 270, className: "thermo-popup", closeButton: true });
      marker.on("click", () => { onSelect(event); map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 8), { duration: .6 }); });
      marker.on("popupopen", (popupEvent) => {
        const button = popupEvent.popup.getElement()?.querySelector<HTMLButtonElement>(".popup-investigate");
        button?.addEventListener("click", () => onOpenInvestigation(event), { once: true });
      });
      eventGroup.addLayer(marker);
    });
    eventLayerRef.current = eventGroup;
    if (matchingEvents.length) eventGroup.addTo(map);
    updateViewport();
    return undefined;
  }, [layerState.thermalEvents, layerState.eventClusters, layerState.persistentSources, layerState.industrialFireCandidates, layerState.wildfireCandidates, layerState.normalIndustrialHeat, layerState.agriculturalBurning, onSelect, onOpenInvestigation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !facilityLayerRef.current) return;
    map.removeLayer(facilityLayerRef.current);
    const facilityTypes = new Set<string>();
    if (layerState.refineries) facilityTypes.add("Refinery");
    if (layerState.powerPlants) facilityTypes.add("Thermal power plant");
    if (layerState.miningAreas) facilityTypes.add("Mining area");
    if (layerState.lngFacilities) facilityTypes.add("LNG facility");
    const visibleFacilities = facilities.filter((facility) => {
      const explicitlyEnabled = layerState.facilities && (facilityTypes.size === 0 || facilityTypes.has(facility.type));
      const selectedContext = selected && map.distance([selected.latitude, selected.longitude], [facility.latitude, facility.longitude]) <= 5000;
      return explicitlyEnabled || selectedContext;
    });
    const group = L.layerGroup();
    visibleFacilities.forEach((facility) => {
      const marker = L.marker([facility.latitude, facility.longitude], { icon: facilityIcon(facility), title: facility.name });
      marker.bindTooltip(`<span>${htmlEscape(facility.name)}</span><br/><span>${htmlEscape(facility.type)}</span>`, { direction: "top", offset: [0, -10], className: "facility-tooltip" });
      marker.bindPopup(facilityPopup(facility), { maxWidth: 320, minWidth: 270, className: "thermo-popup" });
      marker.on("click", () => map.flyTo([facility.latitude, facility.longitude], Math.max(map.getZoom(), 10), { duration: .6 }));
      marker.on("popupopen", (popupEvent) => popupEvent.popup.getElement()?.querySelector<HTMLButtonElement>(".popup-facility")?.addEventListener("click", () => onOpenFacility(facility), { once: true }));
      group.addLayer(marker);
    });
    facilityLayerRef.current = group;
    if (visibleFacilities.length) group.addTo(map);
    return () => { map.removeLayer(group); };
  }, [selected, layerState.facilities, layerState.refineries, layerState.powerPlants, layerState.miningAreas, layerState.lngFacilities, onOpenFacility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !contextLayerRef.current) return;
    contextLayerRef.current.clearLayers();
    if (selected && layerState.contextRadius) {
      L.circle([selected.latitude, selected.longitude], { radius: 5000, color: "#40d3c0", weight: 1.4, dashArray: "5 6", fillColor: "#40d3c0", fillOpacity: .08 }).bindTooltip("5 km Context Radius · Context only · not proof of causation", { sticky: true, className: "context-tooltip" }).addTo(contextLayerRef.current);
    }
    if (selected && layerState.wind) {
      L.polyline([[selected.latitude, selected.longitude], [selected.latitude + .55, selected.longitude + .95]], { color: "#f2a23a", weight: 2, opacity: .8, dashArray: "3 5" }).bindTooltip("Wind direction · NE · 14 km/h", { sticky: true, className: "context-tooltip" }).addTo(contextLayerRef.current);
    }
  }, [selected, layerState.contextRadius, layerState.wind]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 9), { duration: .65 });
    window.setTimeout(() => {
      const markerLayer = eventLayerRef.current;
      markerLayer?.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.getLatLng().lat === selected.latitude && layer.getLatLng().lng === selected.longitude) layer.openPopup();
        else if ("getLayers" in layer && typeof (layer as L.LayerGroup).getLayers === "function") (layer as L.LayerGroup).eachLayer((child) => { if (child instanceof L.Marker && child.getLatLng().lat === selected.latitude && child.getLatLng().lng === selected.longitude) child.openPopup(); });
      });
    }, 700);
  }, [selected]);

  const searchLocation = async () => {
    const map = mapRef.current;
    const query = searchInput.trim();
    if (!map || !query) return;
    const coordinate = parseCoordinateSearch(query);
    setSearchError("");
    if (coordinate) {
      const latLng = L.latLng(coordinate.latitude, coordinate.longitude);
      map.flyTo(latLng, 11, { duration: .6 });
      searchMarkerRef.current?.remove();
      searchMarkerRef.current = L.marker(latLng, { icon: L.divIcon({ className: "search-marker-wrap", html: "<span class=\"search-marker\"></span>", iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindPopup(`<strong>Search location</strong><br/>${coordinate.label}`).openPopup();
      setViewCenter({ latitude: coordinate.latitude, longitude: coordinate.longitude });
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Geocoding request failed");
      const results = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
      setSearchResults(results);
      if (!results.length) setSearchError("No matching location found. Try a city or coordinates.");
    } catch { setSearchError("Location search is temporarily unavailable. Try coordinates instead."); }
  };

  const chooseSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const map = mapRef.current;
    if (!map) return;
    const latitude = Number(result.lat); const longitude = Number(result.lon); const latLng = L.latLng(latitude, longitude);
    map.flyTo(latLng, 11, { duration: .6 });
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = L.marker(latLng, { icon: L.divIcon({ className: "search-marker-wrap", html: "<span class=\"search-marker\"></span>", iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindPopup(`<strong>Search location</strong><br/>${htmlEscape(result.display_name)}<br/>${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`).openPopup();
    setSearchInput(result.display_name.split(",")[0]); setSearchResults([]); setViewCenter({ latitude, longitude });
  };

  const goHome = () => { onResetSelection(); mapRef.current?.setView([22.9734, 78.6569], 5, { animate: true, duration: .6 }); };
  const focusSearch = () => { setSearchOpen(true); window.setTimeout(() => searchInputRef.current?.focus(), 0); };
  const locateUser = () => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) { setLocationError("Location permission is unavailable. Search for a location instead."); return; }
    setLocationError("");
    navigator.geolocation.getCurrentPosition((position) => {
      const latLng = L.latLng(position.coords.latitude, position.coords.longitude);
      locationLayerRef.current?.clearLayers();
      const accuracy = position.coords.accuracy || 250;
      L.circle(latLng, { radius: accuracy, color: "#66a7ff", fillColor: "#66a7ff", fillOpacity: .12, weight: 1 }).addTo(locationLayerRef.current!);
      L.circleMarker(latLng, { radius: 6, color: "#fff", weight: 2, fillColor: "#3c91ff", fillOpacity: 1 }).bindPopup(`<strong>Your location</strong><br/>Accuracy: ±${Math.round(accuracy)} m`).addTo(locationLayerRef.current!).openPopup();
      map.flyTo(latLng, 13, { duration: .6 });
    }, () => setLocationError("Location permission is unavailable. Search for a location instead."), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  };
  useEffect(() => { const map = mapRef.current; if (!map || !mapContainerRef.current) return; const node = mapContainerRef.current; node.tabIndex = 0; const onKey = (event: KeyboardEvent) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return; const distance = Math.round(Math.min(node.clientWidth, node.clientHeight) * 0.3); if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); map.panBy([event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0, event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0]); } if (event.key === "+" || event.key === "=") map.zoomIn(); if (event.key === "-") map.zoomOut(); }; node.addEventListener("keydown", onKey); return () => node.removeEventListener("keydown", onKey); }, []);
  const panMap = (direction: "up" | "down" | "left" | "right") => { const map = mapRef.current; const distance = Math.round(Math.min(mapContainerRef.current?.clientWidth ?? 400, mapContainerRef.current?.clientHeight ?? 300) * 0.3); map?.panBy([direction === "left" ? -distance : direction === "right" ? distance : 0, direction === "up" ? -distance : direction === "down" ? distance : 0]); };
  const toggleFullscreen = async () => { const target = mapContainerRef.current?.parentElement?.parentElement; if (!target) return; if (!document.fullscreenElement) await target.requestFullscreen?.(); else await document.exitFullscreen?.(); window.setTimeout(() => mapRef.current?.invalidateSize(), 300); };
  const toggleLayer = (key: keyof MapLayerState) => setLayerState((current) => ({ ...current, [key]: !current[key] }));
  const selectedCoords = selected ? `${selected.latitude.toFixed(4)}° N, ${selected.longitude.toFixed(4)}° E` : `${viewCenter.latitude.toFixed(4)}° N, ${viewCenter.longitude.toFixed(4)}° E`;

  const layerGroups: Array<{ title: string; items: Array<[keyof MapLayerState, string]> }> = [
    { title: "THERMAL INTELLIGENCE", items: [["thermalEvents", "Thermal events"], ["eventClusters", "Event clusters"], ["persistentSources", "Persistent thermal sources"], ["industrialFireCandidates", "Industrial fire candidates"], ["wildfireCandidates", "Wildfire candidates"], ["normalIndustrialHeat", "Normal industrial heat"], ["agriculturalBurning", "Agricultural burning"]] },
    { title: "INFRASTRUCTURE", items: [["facilities", "Industrial facilities"], ["refineries", "Refineries"], ["powerPlants", "Power plants"], ["miningAreas", "Mining areas"], ["lngFacilities", "LNG facilities"], ["roads", "Roads"]] },
    { title: "ENVIRONMENTAL CONTEXT", items: [["forest", "Forest"], ["agriculture", "Agriculture"], ["waterBodies", "Water bodies"], ["settlements", "Population / settlements"]] },
    { title: "INVESTIGATION", items: [["contextRadius", "5 km Context Radius"], ["wind", "Wind direction"]] },
  ];

  return <section className="panel map-panel">
    <div className="panel-heading map-heading"><div><span className="eyebrow"><MapPin size={12} /> SPATIAL OVERVIEW</span><h2>Thermal activity map</h2></div><div className="map-actions"><button className={`map-control ${baseMap === "street" ? "active" : ""}`} onClick={() => setBaseMap("street")} title="Street map" aria-label="Street map"><Globe2 size={14} /> Streets</button><button className={`map-control ${baseMap === "satellite" ? "active" : ""}`} onClick={() => setBaseMap("satellite")} title="NASA GIBS Satellite Imagery · visual context only" aria-label="NASA GIBS satellite imagery"><Satellite size={14} /> Satellite</button><button className={`map-control ${layersOpen ? "active" : ""}`} onClick={() => setLayersOpen((open) => !open)} title="Map layers" aria-label="Map layers"><Layers3 size={14} /> Layers</button><button className={`map-control ${searchOpen ? "active" : ""}`} onClick={focusSearch} title="Search location" aria-label="Search location"><Search size={14} /> Search</button><button className="map-control map-tool" onClick={locateUser} title="Show my location" aria-label="Show my location"><Navigation size={14} /> Locate</button><button className="icon-button" title="Reset map view" aria-label="Reset map view" onClick={goHome}><Target size={15} /></button><button className="icon-button" title="Fullscreen" aria-label="Fullscreen" onClick={toggleFullscreen}><PanelRight size={15} /></button></div>{layersOpen && <div className="layer-popover real-layer-panel"><strong>MAP LAYERS</strong>{layerGroups.map((group) => <div key={group.title} className="layer-section"><span>{group.title}</span>{group.items.map(([key, label]) => <label key={key}><input type="checkbox" checked={layerState[key]} onChange={() => toggleLayer(key)} /><span>{label}</span></label>)}</div>)}</div>}</div>
    <div className="map-toolbar"><div className={`map-search real-search ${searchOpen ? "search-visible" : "search-collapsed"}`}><Search size={14} /><input ref={searchInputRef} value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setSearchResults([]); setSearchError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void searchLocation(); }} placeholder="Search location or lat, lng" aria-label="Search location or coordinates" /><button onClick={() => void searchLocation()} aria-label="Run location search"><Search size={13} /></button><div className="search-results">{searchResults.map((result) => <button key={`${result.lat}-${result.lon}`} onClick={() => chooseSearchResult(result)}><MapPin size={12} /><span>{result.display_name}</span></button>)}</div></div><span className="map-coords"><Crosshair size={13} /> {selected ? "Selected event" : "Current view"}: {selectedCoords}</span><span className="map-updated">{baseMap === "satellite" ? "Imagery: NASA GIBS" : "Basemap: OpenStreetMap"} · Thermal events: DEMO</span></div>
    {searchError && <div className="map-inline-message error"><Info size={13} /> {searchError}</div>}{locationError && <div className="map-inline-message warning"><Info size={13} /> {locationError}</div>}
    <div className="map-canvas leaflet-canvas" aria-label="Interactive thermal event map with OpenStreetMap Streets and NASA GIBS Satellite Imagery"><div className="map-dpad" aria-label="Map navigation"><button onClick={() => panMap("up")} aria-label="Pan north">↑</button><div><button onClick={() => panMap("left")} aria-label="Pan west">←</button><button className="dpad-center" aria-label="Map focus" onClick={() => mapContainerRef.current?.focus()}>●</button><button onClick={() => panMap("right")} aria-label="Pan east">→</button></div><button onClick={() => panMap("down")} aria-label="Pan south">↓</button><button className="dpad-home" onClick={goHome} aria-label="Reset India View" title="Reset India View">⌂</button></div><div id="thermoscope-map" ref={mapContainerRef} tabIndex={0} /></div>
    <div className="map-legend leaflet-legend"><strong>THERMAL ASSESSMENT</strong><span><i className="legend-dot industrial" />Industrial Fire Candidate</span><span><i className="legend-dot persistent" />Persistent Thermal Source</span><span><i className="legend-dot wildfire" />Wildfire Candidate</span><span><i className="legend-dot normal" />Normal Industrial Heat</span><span><i className="legend-dot agricultural" />Agricultural Burning</span></div>
    <div className="map-status"><span className="pulse-dot" /> {viewportCount === events.length ? `${events.length} events available` : `${viewportCount} events in viewport · ${events.length} total`} <span className="status-sep" /> <span className={events[0]?.dataSource === "NASA FIRMS" ? "status-cyan" : "status-demo"}>{events[0]?.dataSource === "NASA FIRMS" ? "NASA FIRMS LIVE" : "DEMO DATA"}</span></div>
    <div className="map-footer"><span><Info size={13} /> <b>5 km Context Radius</b> · Context only · not proof of causation.</span><button onClick={() => setLayersOpen(true)}>Manage layers <ChevronRight size={14} /></button></div>
  </section>;
}

function EventRow({ event, onSelect }: { event: ThermalEvent; onSelect: (event: ThermalEvent) => void }) {
  const tone = event.status === "High" ? "high" : event.status === "Medium" ? "medium" : "low";
  return <button className="event-row" onClick={() => onSelect(event)}><span className={`event-signal ${event.accent}`}><Flame size={14} /></span><span className="event-row-main"><strong>{event.title}</strong><span>{event.location} <i /> {event.timestamp}</span></span><span className="event-frp"><strong>{event.frp} MW</strong><span>FRP</span></span><StatusPill tone={tone}>{event.status}</StatusPill><ChevronRight size={15} className="row-chevron" /></button>;
}

function EvidenceItem({ children, limit = false }: { children: React.ReactNode; limit?: boolean }) {
  return <li className={limit ? "limit" : "support"}><span>{limit ? "!" : "✓"}</span>{children}</li>;
}

function InvestigationDrawer({ event, onClose, onVerify, onOpenInvestigation, onViewOnMap }: { event: ThermalEvent; onClose: () => void; onVerify: (label: ThermalEvent["verification"]) => void; onOpenInvestigation: (event: ThermalEvent) => void; onViewOnMap: (event: ThermalEvent) => void }) {
  const [tab, setTab] = useState("Overview");
  const [note, setNote] = useState("");
  const ratio = (event.frp / event.baseline).toFixed(1);
  return <aside className="investigation-drawer">
    <div className="drawer-head"><div><span className="eyebrow"><ScanLine size={12} /> EVENT INVESTIGATION</span><h2>Thermal Event #{event.id}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close investigation"><X size={17} /></button></div>
    <div className="drawer-meta"><StatusPill tone="high">{event.status} priority</StatusPill><StatusPill tone="neutral">{event.verification}</StatusPill><span className="drawer-time"><Timer size={13} /> {event.timestamp}</span><button className="text-button drawer-map-link" onClick={() => onViewOnMap(event)}><MapPin size={12} /> View on Map</button></div>
    <div className="assessment-box"><div className="assessment-icon"><ShieldAlert size={21} /></div><div><span>ASSESSMENT</span><strong>{event.title}</strong><small>Assessment method: Evidence-based analysis</small></div><button className="icon-button"><MoreHorizontal size={16} /></button></div>
    <div className="drawer-tabs">{["Overview", "Evidence", "Satellite"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Overview" && <div className="drawer-body">
      <div className="metric-grid"><div><span>Current FRP</span><strong>{event.frp} <em>MW</em></strong></div><div><span>Historical baseline</span><strong>{event.baseline} <em>MW</em></strong></div><div><span>Deviation</span><strong className="text-amber">+{event.delta}%</strong></div><div><span>Persistence</span><strong>{event.persistence} <em>obs.</em></strong></div></div>
      <div className="section-rule"><span>THERMAL FINGERPRINT</span><span className="text-amber">{ratio}× baseline</span></div>
      <div className="fingerprint-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={thermalFingerprint} margin={{ top: 10, right: 5, left: -27, bottom: 0 }}><CartesianGrid stroke="#24323b" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#7f919b", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide domain={[0, 130]} /><ChartTooltip contentStyle={{ background: "#121a20", border: "1px solid #2b3b45", borderRadius: 8, color: "#dfe9ec", fontSize: 11 }} /><Area type="monotone" dataKey="current" fill="#f2a23a" fillOpacity={0.12} stroke="none" /><Line type="monotone" dataKey="baseline" stroke="#40d3c0" strokeWidth={1.5} strokeDasharray="4 4" dot={false} /><Line type="monotone" dataKey="current" stroke="#f2a23a" strokeWidth={2.5} dot={{ r: 2.5, fill: "#f2a23a", stroke: "#121a20", strokeWidth: 1 }} /></ComposedChart></ResponsiveContainer></div>
      <div className="chart-legend"><span><i className="legend-line amber-line" /> Current thermal intensity</span><span><i className="legend-line cyan-line" /> Historical baseline</span></div>
      <div className="section-rule"><span>EVENT DETAILS</span><button className="text-button">Expand <ChevronRight size={13} /></button></div>
      <div className="detail-grid"><span>Detection timestamp<strong>{event.timestamp}</strong></span><span>Coordinates<strong>{event.coords}</strong></span><span>Satellite<strong>{event.satellite}</strong></span><span>Observations<strong>{event.observations} clustered detections</strong></span><span>Facility context<strong>{event.facility} · {event.distance}</strong></span><span>Land cover<strong>{event.facilityType}</strong></span><span>Wind<strong>NE · 14 km/h</strong></span><span>Data quality<strong className="text-cyan">GOOD · 96%</strong></span></div>
      <div className="section-rule"><span>WHY WAS THIS FLAGGED?</span></div>
      <ol className="explain-list"><li><b>01</b> FRP is {event.delta}% above the historical baseline.</li><li><b>02</b> {event.persistence} consecutive observations form one cluster.</li><li><b>03</b> Spatial context is relevant, but not causal proof.</li><li><b>04</b> Current thermal behavior differs from the 90-day profile.</li></ol>
      <div className="interpretation"><Sparkles size={15} /><span><b>Interpretation</b> {event.className === "Wildfire candidate" ? "Non-industrial thermal event candidate requiring verification." : "Thermal anomaly requiring human verification."}</span></div>
    </div>}
    {tab === "Evidence" && <div className="drawer-body"><div className="section-rule"><span>SUPPORTING EVIDENCE</span><StatusPill tone="cyan">4 signals</StatusPill></div><ul className="evidence-list"><EvidenceItem>FRP significantly above historical baseline (+{event.delta}%)</EvidenceItem><EvidenceItem>{event.persistence} consecutive observations detected</EvidenceItem><EvidenceItem>Industrial context within {event.distance}</EvidenceItem><EvidenceItem>Historical thermal behavior available for comparison</EvidenceItem></ul><div className="section-rule"><span>CONTRADICTING / LIMITING</span><StatusPill tone="medium">2 limits</StatusPill></div><ul className="evidence-list"><EvidenceItem limit>Satellite visual confirmation unavailable</EvidenceItem><EvidenceItem limit>Cloud cover may affect optical comparison</EvidenceItem></ul><div className="evidence-note"><Info size={14} /><span>Evidence is weighted transparently. No calibrated fire probability is displayed.</span></div></div>}
    {tab === "Satellite" && <div className="drawer-body"><div className="satellite-placeholder"><div className="sat-grid" /><Satellite size={32} /><strong>Satellite Visual Evidence</strong><span>NASA GIBS imagery is available from the Command Center satellite context layer.</span><StatusPill tone="neutral">NASA GIBS · LIVE CONTEXT</StatusPill></div><div className="section-rule"><span>PROVENANCE</span></div><div className="provenance-row"><span><Satellite size={14} /> NASA GIBS / Worldview</span><StatusPill tone="cyan">Available</StatusPill></div><div className="provenance-row"><span><Eye size={14} /> Automated computer vision</span><StatusPill tone="neutral">Not implemented</StatusPill></div><p className="small-note">Satellite imagery is geographic context from NASA GIBS. Thermal event records remain explicitly marked DEMO and are not live NASA FIRMS observations.</p></div>}
    <div className="drawer-footer"><button className="secondary-button drawer-open-investigation" onClick={() => onOpenInvestigation(event)}><ScanLine size={14} /> Open Investigation · {event.eventId}</button><div className="verify-select"><span>VERIFICATION ACTION</span><select defaultValue="pending"><option value="pending">Pending review</option><option value="confirmed">Confirm industrial fire</option><option value="normal">Confirm normal heat</option><option value="wildfire">Confirm wildfire</option><option value="false">False positive</option></select></div><div className="drawer-actions"><button className="secondary-button" onClick={() => setNote(note ? "" : "Analyst note ready")}>{note ? "Note added" : "Add note"}</button><button className="primary-button" onClick={() => onVerify("Verified")}><Check size={15} /> Verify event</button></div></div>
  </aside>;
}

function Dashboard({ onSelect, onOpenInvestigation, onOpenFacility, onResetSelection, selected, search, onRunAnalysis, onExport, onRefresh, analysisState, lastRefreshed, firmsStatus, onConnectFirms }: { onSelect: (event: ThermalEvent) => void; onOpenInvestigation: (event: ThermalEvent) => void; onOpenFacility: (facility: Facility) => void; onResetSelection: () => void; selected: ThermalEvent | null; search: string; onRunAnalysis: () => void; onExport: () => void; onRefresh: () => void; analysisState: string; lastRefreshed: string; firmsStatus: "demo" | "live" | "loading" | "error"; onConnectFirms: (key: string) => Promise<void> }) {
  const filteredEvents = events.filter((event) => `${event.title} ${event.location} ${event.id}`.toLowerCase().includes(search.toLowerCase()));
  const highCount = events.filter((event) => event.status === "High").length;
  const pendingCount = events.filter((event) => event.verification === "Pending").length;
  const verifiedCount = events.filter((event) => event.verification === "Verified").length;
  return <>
    <div className="page-intro"><div><span className="eyebrow"><Activity size={13} /> LIVE THERMAL INTELLIGENCE</span><h1>Command Center</h1><p>Interactive command center · dynamic prototype workflow.</p></div><div className="intro-actions"><FirmsConnection status={firmsStatus} onConnect={onConnectFirms} /><button className="secondary-button" onClick={onExport}><Download size={14} /> Export view</button><button className="secondary-button" onClick={onRefresh}><RefreshCw size={14} /> Refresh</button><button className="primary-button" onClick={onRunAnalysis} disabled={analysisState === "running"}><Zap size={14} /> {analysisState === "running" ? "Running..." : "Run analysis"}</button></div></div><div className="analysis-status" aria-live="polite">{analysisState === "running" ? "Running thermal intelligence analysis..." : analysisState === "complete" ? `Analysis complete · ${events.length} events analyzed` : firmsStatus === "live" ? `NASA FIRMS live feed · ${events.length} detections · refreshed ${lastRefreshed}` : `Demo fallback active · connect NASA FIRMS to replace simulated events · ${lastRefreshed}`}</div>
    <div className="kpi-grid"><KpiCard label="Active thermal events" value={String(events.length)} delta="+8.4%" tone="cyan" icon={Flame} points="0,18 18,20 36,12 54,14 72,7 90,4" /><KpiCard label="Industrial candidates" value="11" delta="+2 today" tone="amber" icon={Factory} points="0,20 18,18 36,20 54,12 72,15 90,8" onClick={() => onSelect(events[0])} /><KpiCard label="Persistent sources" value="08" delta="-1.2%" tone="cyan" icon={Radio} points="0,9 18,12 36,9 54,11 72,8 90,10" /><KpiCard label="High priority" value={String(highCount).padStart(2, "0")} delta="+3 today" tone="coral" icon={ShieldAlert} points="0,20 18,17 36,20 54,14 72,9 90,5" onClick={() => onSelect(events[2])} /><KpiCard label="Under review" value={String(pendingCount).padStart(2, "0")} delta="+2 today" tone="violet" icon={ClipboardCheck} points="0,17 18,16 36,10 54,14 72,9 90,8" /><KpiCard label="Verified events" value={String(verifiedCount)} delta="+12.5%" tone="green" icon={FileCheck2} points="0,21 18,18 36,19 54,11 72,12 90,3" /></div>
    <div className="main-grid"><MapView selected={selected} onSelect={onSelect} onOpenInvestigation={onOpenInvestigation} onOpenFacility={onOpenFacility} onResetSelection={onResetSelection} /><section className="panel events-panel"><div className="panel-heading"><div><span className="eyebrow"><ShieldAlert size={12} /> ATTENTION QUEUE</span><h2>Recent high-priority events</h2></div><button className="icon-button"><MoreHorizontal size={17} /></button></div><div className="list-filter"><span>Top priority events · {filteredEvents.length} of {events.length} available</span><button><Filter size={13} /> All assessments <ChevronDown size={13} /></button></div><div className="event-list">{filteredEvents.slice(0, 5).map((event) => <EventRow event={event} key={event.id} onSelect={onSelect} />)}</div><button className="view-all" onClick={() => onSelect(events[0])}>Open event workspace <ArrowUpRight size={14} /></button></section></div>
    <div className="lower-grid"><section className="panel timeline-panel"><div className="panel-heading"><div><span className="eyebrow"><TrendingUp size={12} /> LAST 8 HOURS</span><h2>Thermal activity timeline</h2></div><div className="chart-toggle"><button className="active">FRP / MW</button><button>Events</button></div></div><div className="large-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2a23a" stopOpacity={0.28} /><stop offset="100%" stopColor="#f2a23a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#223039" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#7f919b", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#7f919b", fontSize: 10 }} axisLine={false} tickLine={false} /><ChartTooltip contentStyle={{ background: "#121a20", border: "1px solid #2b3b45", borderRadius: 8, color: "#dfe9ec", fontSize: 11 }} /><Area type="monotone" dataKey="value" stroke="#f2a23a" strokeWidth={2} fill="url(#timelineFill)" dot={{ fill: "#f2a23a", r: 3, stroke: "#121a20", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div><div className="chart-summary"><span><i className="legend-line amber-line" /> All thermal observations</span><span>Peak intensity <b>118 MW</b> at 21:00 UTC</span></div></section><section className="panel status-panel"><div className="panel-heading"><div><span className="eyebrow"><Database size={12} /> SYSTEM HEALTH</span><h2>Data & service status</h2></div><StatusPill tone="cyan">Good</StatusPill></div><div className="health-list"><div><span className="health-source"><span className={`health-dot ${events[0]?.dataSource === "NASA FIRMS" ? "good" : "warn"}`} /> Thermal observations</span><strong>{events[0]?.dataSource === "NASA FIRMS" ? "NASA FIRMS" : "DEMO"}</strong></div><div><span className="health-source"><span className="health-dot good" /> OpenStreetMap</span><strong>DEMO DATA</strong></div><div><span className="health-source"><span className="health-dot warn" /> Weather context</span><strong>DEMO DATA</strong></div><div><span className="health-source"><span className="health-dot good" /> NASA GIBS satellite imagery</span><strong>Visual context</strong></div></div><div className="quality-footer"><div><span>DATA QUALITY</span><strong>96%</strong></div><div className="quality-bar"><span /></div><p>1,284 observations · 12 duplicates removed · 0.8% missing values</p></div></section></div>
  </>;
}

function EventsView({ onOpenInvestigation, search }: { onOpenInvestigation: (event: ThermalEvent) => void; search: string }) {
  const filtered = events.filter((event) => `${event.title} ${event.location} ${event.className}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="page-intro"><div><span className="eyebrow"><Flame size={13} /> THERMAL EVENT REGISTER</span><h1>Thermal Events</h1><p>Clustered observations with transparent assessments.</p></div><div className="intro-actions"><StatusPill tone="demo">DEMO DATA</StatusPill><button className="secondary-button"><Download size={14} /> Export CSV</button></div></div><div className="toolbar-row"><div className="filter-chip active"><Filter size={14} /> All events <span>{events.length}</span></div><div className="filter-chip">High priority <span>{events.filter((event) => event.status === "High").length.toString().padStart(2, "0")}</span></div><div className="filter-chip">Pending verification <span>{events.filter((event) => event.verification === "Pending").length.toString().padStart(2, "0")}</span></div><div className="filter-chip">Last 24 hours <ChevronDown size={13} /></div></div><section className="panel full-table-panel"><div className="table-caption"><div><strong>Clustered thermal events</strong><span>Each row represents a spatial-temporal cluster, not a single satellite detection.</span></div><button className="icon-button"><MoreHorizontal size={17} /></button></div><div className="event-table"><div className="table-head"><span>Event</span><span>Assessment</span><span>FRP / baseline</span><span>Persistence</span><span>Verification</span><span /></div>{filtered.map((event) => <button className="table-row" key={event.id} onClick={() => onOpenInvestigation(event)}><span className="table-event"><i className={`event-signal small ${event.accent}`}><Flame size={12} /></i><span><strong>#{event.id} · {event.location}</strong><small>{event.timestamp} · {event.satellite}</small></span></span><span><StatusPill tone={event.status === "High" ? "high" : event.status === "Medium" ? "medium" : "low"}>{event.className}</StatusPill></span><span className="table-metric"><strong>{event.frp} MW</strong><small>{event.baseline} MW baseline</small></span><span><strong>{event.persistence}</strong><small>observations</small></span><span><StatusPill tone={event.verification === "Verified" ? "cyan" : event.verification === "False positive" ? "neutral" : "violet"}>{event.verification}</StatusPill></span><ChevronRight size={16} /></button>)}</div></section></>;
}

function FacilitiesView({ onOpenInvestigation }: { onOpenInvestigation: (event: ThermalEvent) => void }) {
  return <><div className="page-intro"><div><span className="eyebrow"><Factory size={13} /> FACILITY INTELLIGENCE</span><h1>Facilities</h1><p>Industrial context and thermal fingerprints across the watch area.</p></div><div className="intro-actions"><StatusPill tone="demo">DEMO DATA</StatusPill><button className="primary-button"><Building2 size={14} /> Add facility</button></div></div><div className="facility-summary"><div><span>Monitored facilities</span><strong>184</strong><small>Across 7 facility types</small></div><div><span>With active events</span><strong>17</strong><small className="text-amber">+4 since yesterday</small></div><div><span>Abnormal behavior</span><strong>06</strong><small className="text-coral">Requires attention</small></div><div><span>Coverage match</span><strong>92%</strong><small className="text-cyan">Good spatial match</small></div></div><div className="facility-grid">{facilities.map((facility, index) => <button key={facility.name} className="facility-card" onClick={() => onOpenInvestigation(events[index % events.length])}><div className="facility-card-top"><span className={`facility-glyph ${index === 0 ? "amber" : "cyan"}`}><Factory size={19} /></span><StatusPill tone={facility.anomaly === "ABNORMAL" ? "high" : facility.anomaly === "WATCH" ? "medium" : "cyan"}>{facility.anomaly}</StatusPill></div><strong>{facility.name}</strong><span className="facility-type"><Building2 size={12} /> {facility.type} · {facility.region}</span><div className="facility-card-metrics"><span><small>Active events</small><b>{facility.activeEvents}</b></span><span><small>Typical FRP</small><b>{facility.baseline}</b></span><span><small>Deviation</small><b className={facility.anomaly === "ABNORMAL" ? "text-amber" : "text-cyan"}>{facility.trend}</b></span></div><div className="facility-card-foot"><span><TrendingUp size={13} /> View thermal fingerprint</span><ChevronRight size={14} /></div></button>)}</div></>;
}

function AnalyticsView() {
  return <><div className="page-intro"><div><span className="eyebrow"><BarChart3 size={13} /> EXPLAINABLE ANALYTICS</span><h1>Analytics</h1><p>Patterns, outcomes, and verification quality across the observation window.</p></div><div className="intro-actions"><button className="date-control"><CalendarGlyph /> 01 Sep — 22 Sep <ChevronDown size={14} /></button><button className="secondary-button"><Download size={14} /> Export report</button></div></div><div className="analytics-grid"><section className="panel analytics-chart-panel"><div className="panel-heading"><div><span className="eyebrow">CLASSIFICATION MIX</span><h2>Events by assessment</h2></div><span className="text-muted">Last 30 days</span></div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartBars} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}><CartesianGrid stroke="#223039" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#8a9aa3", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8a9aa3", fontSize: 10 }} axisLine={false} tickLine={false} /><ChartTooltip cursor={{ fill: "#1b2a31" }} contentStyle={{ background: "#121a20", border: "1px solid #2b3b45", borderRadius: 8, color: "#dfe9ec", fontSize: 11 }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{chartBars.map((entry) => <Cell key={entry.label} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div></section><section className="panel analytics-score"><div className="panel-heading"><div><span className="eyebrow"><Target size={12} /> VERIFICATION QUALITY</span><h2>Analyst outcomes</h2></div><MoreHorizontal size={16} /></div><div className="score-ring"><div><strong>84%</strong><span>verified fit</span></div></div><div className="score-stats"><span><i className="legend-dot normal" /> Confirmed / normal <b>27</b></span><span><i className="legend-dot industrial" /> Industrial fire <b>06</b></span><span><i className="legend-dot wildfire" /> False positive <b>09</b></span></div></section><section className="panel wide-analytics"><div className="panel-heading"><div><span className="eyebrow"><TrendingUp size={12} /> THERMAL BEHAVIOR</span><h2>Average vs. maximum FRP</h2></div><div className="chart-legend"><span><i className="legend-line cyan-line" /> Avg FRP</span><span><i className="legend-line amber-line" /> Max FRP</span></div></div><div className="analytics-line"><ResponsiveContainer width="100%" height="100%"><LineChart data={[{ l: "01 Sep", a: 42, m: 82 }, { l: "05 Sep", a: 49, m: 103 }, { l: "09 Sep", a: 44, m: 97 }, { l: "13 Sep", a: 58, m: 128 }, { l: "17 Sep", a: 51, m: 112 }, { l: "22 Sep", a: 63, m: 148 }]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#223039" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="l" tick={{ fill: "#8a9aa3", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8a9aa3", fontSize: 10 }} axisLine={false} tickLine={false} /><ChartTooltip contentStyle={{ background: "#121a20", border: "1px solid #2b3b45", borderRadius: 8, color: "#dfe9ec", fontSize: 11 }} /><Line type="monotone" dataKey="a" stroke="#40d3c0" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="m" stroke="#f2a23a" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></section></div></>;
}

function VerificationView({ onOpenInvestigation, verifiedCount, setVerifiedCount }: { onOpenInvestigation: (event: ThermalEvent) => void; verifiedCount: number; setVerifiedCount: (count: number) => void }) {
  const pending = events.filter((event) => event.verification === "Pending");
  return <><div className="page-intro"><div><span className="eyebrow"><ClipboardCheck size={13} /> HUMAN-IN-THE-LOOP REVIEW</span><h1>Verification Center</h1><p>Analyst labels create the feedback loop for future model improvement.</p></div><div className="intro-actions"><StatusPill tone="violet">{pending.length} pending</StatusPill><button className="secondary-button"><Download size={14} /> Export labels</button></div></div><div className="learning-strip"><div className="learning-icon"><Sparkles size={17} /></div><div><span>MODEL LEARNING PIPELINE</span><strong>Verification improves the next intelligence cycle</strong></div><div className="pipeline"><span>Low confidence</span><i /><span>Human label</span><i /><span>Training set</span><i /><span>Model update</span></div><StatusPill tone="neutral">Concept only</StatusPill></div><section className="panel verification-panel"><div className="table-caption"><div><strong>Events requiring analyst review</strong><span>Choose a label only when evidence supports the assessment.</span></div><div className="verification-count"><strong>{verifiedCount}</strong><span>labels today</span></div></div><div className="review-grid">{pending.map((event) => <div className="review-card" key={event.id}><div className="review-card-head"><div><span className={`event-signal small ${event.accent}`}><Flame size={12} /></span><strong>#{event.id}</strong></div><StatusPill tone={event.status === "High" ? "high" : "medium"}>{event.status} priority</StatusPill></div><h3>{event.title}</h3><p><MapPin size={12} /> {event.location} · {event.frp} MW · {event.persistence} observations</p><div className="review-card-actions"><button className="text-button" onClick={() => onOpenInvestigation(event)}>Inspect evidence <ChevronRight size={13} /></button><button className="primary-button mini" onClick={() => setVerifiedCount(verifiedCount + 1)}><Check size={13} /> Label</button></div></div>)}</div></section></>;
}

function AlertsView({ onOpenInvestigation }: { onOpenInvestigation: (event: ThermalEvent) => void }) {
  return <><div className="page-intro"><div><span className="eyebrow"><Bell size={13} /> OPERATIONS ALERTS</span><h1>Alert Center</h1><p>Track the event lifecycle from detection through verification.</p></div><div className="intro-actions"><StatusPill tone="high">3 active</StatusPill><button className="secondary-button"><SlidersHorizontal size={14} /> Alert rules</button></div></div><div className="alert-lifecycle"><span className="complete">DETECTED</span><i /><span className="complete">ASSESSING</span><i /><span className="active">PRIORITIZED</span><i /><span>UNDER REVIEW</span><i /><span>VERIFIED</span><i /><span>CLOSED</span></div><section className="panel alerts-panel">{[
    { event: events[0], reason: "FRP 2.8× above 90-day baseline", time: "8 min ago", type: "Abnormal thermal intensity" },
    { event: events[2], reason: "Event cluster near protected forest region", time: "22 min ago", type: "New wildfire candidate" },
    { event: events[5], reason: "11 consecutive observations at mining context", time: "1h ago", type: "Persistent thermal source" },
  ].map((alert) => <button className="alert-row" key={alert.event.id} onClick={() => onOpenInvestigation(alert.event)}><span className="alert-icon"><AlertTriangle size={16} /></span><span className="alert-main"><strong>{alert.type}</strong><span>{alert.reason}</span></span><span className="alert-location"><MapPin size={12} /> {alert.event.location}</span><span className="alert-time">{alert.time}</span><StatusPill tone="high">ACTIVE</StatusPill><ChevronRight size={15} /></button>)}</section></>;
}

function InvestigationView({ event, onViewOnMap }: { event: ThermalEvent; onViewOnMap: (event: ThermalEvent) => void }) {
  return <><div className="page-intro"><div><span className="eyebrow"><ScanLine size={13} /> EVENT INVESTIGATION · {event.eventId}</span><h1>{event.title}</h1><p>{event.location} · {event.coords} · {event.timestamp}</p></div><div className="intro-actions"><StatusPill tone="high">{event.status} PRIORITY</StatusPill><StatusPill tone="neutral">DEMO DATA</StatusPill><button className="primary-button" onClick={() => onViewOnMap(event)}><MapPin size={14} /> View on Map</button></div></div><div className="investigation-page-grid"><section className="panel investigation-page-card"><div className="panel-heading"><div><span className="eyebrow"><ShieldAlert size={12} /> EVIDENCE-BASED ASSESSMENT</span><h2>{event.title}</h2></div><StatusPill tone="neutral">Assessment method: Evidence-based analysis</StatusPill></div><div className="investigation-page-metrics"><div><span>FRP</span><strong>{event.frp} MW</strong></div><div><span>Brightness</span><strong>{event.brightnessTemperature} K</strong></div><div><span>Confidence</span><strong>{event.confidence}</strong></div><div><span>Facility distance</span><strong>{event.distance}</strong></div></div><div className="section-rule"><span>WHY WAS THIS FLAGGED?</span></div><ol className="explain-list"><li><b>01</b> FRP is {event.delta}% above the historical baseline.</li><li><b>02</b> {event.persistence} consecutive observations form one spatial-temporal cluster.</li><li><b>03</b> {event.facility === "No relevant facility identified" ? "No relevant industrial facility was identified within the context radius." : `The event is within ${event.distance} of relevant infrastructure; proximity is contextual, not causal proof.`}</li><li><b>04</b> Current thermal behavior differs from the historical profile.</li></ol><div className="interpretation"><Sparkles size={15} /><span><b>Interpretation</b> Thermal anomaly requiring human verification.</span></div></section><section className="panel investigation-page-card"><div className="panel-heading"><div><span className="eyebrow"><Database size={12} /> EVENT DETAILS</span><h2>{event.eventId}</h2></div><StatusPill tone="demo">Data source: DEMO</StatusPill></div><div className="detail-grid"><span>Detection timestamp<strong>{event.timestamp}</strong></span><span>Coordinates<strong>{event.coords}</strong></span><span>Satellite<strong>{event.satellite}</strong></span><span>Observations<strong>{event.observations} clustered detections</strong></span><span>Facility context<strong>{event.facility} · {event.facilityType}</strong></span><span>Land cover<strong>{event.facilityType}</strong></span><span>Priority score<strong className="text-amber">{event.status}</strong></span><span>Verification<strong>{event.verification}</strong></span></div><div className="section-rule"><span>CONTEXT RADIUS</span></div><div className="context-note"><Target size={16} /><span><strong>5 km Context Radius</strong><br />Context only · not proof of causation.</span></div><button className="primary-button investigation-view-map" onClick={() => onViewOnMap(event)}><MapPin size={14} /> Center event on live map</button></section></div></>;
}

function PlaceholderView({ activeView, onSelect }: { activeView: string; onSelect: (event: ThermalEvent) => void }) {
  const configs: Record<string, { icon: React.ElementType; kicker: string; text: string; cta: string }> = {
    "Event Investigation": { icon: ScanLine, kicker: "INVESTIGATION WORKSPACE", text: "Select any event from the map or event register to open a full evidence workspace.", cta: "Open priority event" },
    "Thermal History": { icon: TrendingUp, kicker: "THERMAL FINGERPRINTS", text: "Compare current thermal intensity against historical facility baselines and recurrence patterns.", cta: "Inspect Jamnagar profile" },
  };
  const config = configs[activeView] || { icon: Database, kicker: "DATA PROVENANCE", text: "Data source health, coverage, and ingestion provenance for the intelligence workspace.", cta: "Open source status" };
  const Icon = config.icon;
  return <div className="placeholder-page"><div className="placeholder-orbit"><Icon size={38} /></div><span className="eyebrow">{config.kicker}</span><h1>{activeView}</h1><p>{config.text}</p><button className="primary-button" onClick={() => onSelect(events[0])}>{config.cta} <ChevronRight size={15} /></button><div className="placeholder-note"><Info size={14} /> This prototype keeps the workflow connected through the live command center and demo dataset.</div></div>;
}

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const initialEvent = events.find((event) => window.location.pathname.toLowerCase() === `/events/${event.eventId.toLowerCase()}` || window.location.pathname.toLowerCase() === `/events/${event.id.toLowerCase()}`) ?? null;
  const [verifiedCount, setVerifiedCount] = useState(() => events.filter((event) => event.verification === "Verified").length);
  const [analysisState, setAnalysisState] = useState<"idle" | "running" | "complete">("idle");
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date().toISOString().slice(11, 19) + " UTC");
  const [firmsStatus, setFirmsStatus] = useState<"demo" | "live" | "loading" | "error">(() => firmsService.getMapKey() ? "loading" : "demo");
  const [, forceDataUpdate] = useState(0);
  const [, setRange] = useState("Today");
  const [selected, setSelected] = useState<ThermalEvent | null>(initialEvent);
  const [activeView, setActiveView] = useState(initialEvent ? "Event Investigation" : "Command Center");
  const activeTitle = useMemo(() => activeView, [activeView]);
  const selectEvent = (event: ThermalEvent) => { setSelected(event); setActiveView("Command Center"); window.history.pushState({ eventId: event.eventId }, "", "/"); };
  const openInvestigation = (event: ThermalEvent) => { setSelected(event); setActiveView("Event Investigation"); window.history.pushState({ eventId: event.eventId }, "", `/events/${event.eventId}`); };
  const viewOnMap = (event: ThermalEvent) => { setSelected(event); setActiveView("Command Center"); window.history.pushState({ eventId: event.eventId }, "", "/"); };
  const resetMapView = () => { setSelected(null); setActiveView("Command Center"); window.history.pushState({}, "", "/"); };
  const openFacility = (_facility: Facility) => { setActiveView("Facilities"); window.history.pushState({}, "", "/facilities"); };
  const verifyEvent = (label: ThermalEvent["verification"]) => { if (label === "Verified") setVerifiedCount((count) => count + 1); };
  const runAnalysis = () => { setAnalysisState("running"); window.setTimeout(() => setAnalysisState("complete"), 1100); };
  const ingestFirms = async (key?: string) => {
    if (key !== undefined) firmsService.setMapKey(key);
    if (!firmsService.getMapKey()) { setFirmsStatus("demo"); return; }
    setFirmsStatus("loading");
    try {
      const liveEvents = await firmsService.getRecentFirmsEvents();
      if (liveEvents.length) { events.splice(0, events.length, ...liveEvents); forceDataUpdate((value) => value + 1); setFirmsStatus("live"); setLastRefreshed(new Date().toISOString().slice(11, 19) + " UTC"); setSelected(null); }
      else setFirmsStatus("error");
    } catch { setFirmsStatus("error"); }
  };
  useEffect(() => { if (firmsService.getMapKey()) void ingestFirms(); }, []);
  useEffect(() => { if (firmsStatus !== "live") return; const timer = window.setInterval(() => void ingestFirms(), 15 * 60 * 1000); return () => window.clearInterval(timer); }, [firmsStatus]);
  const refreshData = () => { void ingestFirms(); setAnalysisState("idle"); setSelected(null); };
  const exportData = () => { const header = ["event_id","title","location","class","status","verification","latitude","longitude","frp_mw","baseline_mw","timestamp"]; const rows = events.map((event) => [event.eventId,event.title,event.location,event.className,event.status,event.verification,event.latitude,event.longitude,event.frp,event.baseline,event.timestamp]); const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "thermoscope-thermal-events.csv"; anchor.click(); URL.revokeObjectURL(url); };

  return <div className="app-shell"><Sidebar activeView={activeView} setActiveView={setActiveView} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} live={firmsStatus === "live"} eventCount={events.length} /><div className="app-main"><TopBar onMenu={() => setMobileNavOpen(true)} activeView={activeTitle} onSearch={setSearch} onOpenInvestigation={openInvestigation} onOpenFacility={openFacility} onRangeChange={setRange} live={firmsStatus === "live"} /><main className="content-wrap">
    {activeView === "Command Center" && <Dashboard onSelect={selectEvent} onOpenInvestigation={openInvestigation} onOpenFacility={openFacility} onResetSelection={resetMapView} selected={selected} search={search} onRunAnalysis={runAnalysis} onExport={exportData} onRefresh={refreshData} analysisState={analysisState} lastRefreshed={lastRefreshed} firmsStatus={firmsStatus} onConnectFirms={ingestFirms} />}
    {activeView === "Thermal Events" && <EventsView onOpenInvestigation={openInvestigation} search={search} />}
    {activeView === "Facilities" && <FacilitiesView onOpenInvestigation={openInvestigation} />}
    {activeView === "Analytics" && <AnalyticsView />}
    {activeView === "Verification Center" && <VerificationView onOpenInvestigation={openInvestigation} verifiedCount={verifiedCount} setVerifiedCount={setVerifiedCount} />}
    {activeView === "Alerts" && <AlertsView onOpenInvestigation={openInvestigation} />}
    {activeView === "Event Investigation" && <InvestigationView event={selected ?? events[0]} onViewOnMap={viewOnMap} />}
    {!["Command Center", "Thermal Events", "Event Investigation", "Facilities", "Analytics", "Verification Center", "Alerts"].includes(activeView) && <PlaceholderView activeView={activeView} onSelect={selectEvent} />}
  </main><footer className="app-footer"><span><span className="pulse-dot" /> THERMOSCOPE operational console</span><span>{events[0]?.dataSource === "NASA FIRMS" ? "NASA FIRMS live mode · VIIRS NOAA-21 detections" : "Demo mode · Data provenance visible in every workspace"}</span><span>v0.9.4-prototype</span></footer></div>{selected && activeView === "Command Center" && <InvestigationDrawer event={selected} onClose={() => setSelected(null)} onVerify={verifyEvent} onOpenInvestigation={openInvestigation} onViewOnMap={viewOnMap} />}</div>;
}
