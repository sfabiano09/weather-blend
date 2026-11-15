// Weather Blend: lets the app open with no signal.
// The app's own files: network first (so updates show up right away), saved copy when offline.
// Chart and map libraries never change for a given version, so they're served from the saved copy.
// Weather data is not handled here; the app keeps its own last-good copies.
const CACHE = "weather-blend-v1";
const OWN = ["./", "index.html", "icon.png", "manifest.json"];
const LIBS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.addAll(OWN).catch(() => {}),
    ...LIBS.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {}))
  ])));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("weather-blend") && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (LIBS.includes(u.href)) {
    e.respondWith(caches.match(u.href).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(u.href, c)); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;   // weather data and map tiles go straight to the network
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
