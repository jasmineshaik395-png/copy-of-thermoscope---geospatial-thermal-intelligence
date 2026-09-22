import L from "leaflet";

const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const imageryDate = "2026-09-21";

export const satelliteImageryService = {
  provider: "NASA GIBS",
  getStreetLayer() {
    return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 });
  },
  getSatelliteLayer() {
    return L.tileLayer(`${GIBS_BASE}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${imageryDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, { attribution: "NASA GIBS / NASA Earthdata · Satellite visual context", maxZoom: 9, minZoom: 1, opacity: 0.92, updateWhenIdle: true, keepBuffer: 3, noWrap: true });
  },
};
