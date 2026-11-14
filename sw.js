// Cool Caps offline helper: keeps the app and its fonts on the phone so it opens without internet.
const CACHE = "coolcaps-v18";
const SHELL = ["./", "index.html", "manifest.webmanifest", "coolcaps-icon-192.png", "coolcaps-icon-512.png", "coolcaps-apple-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const sameOrigin = url.origin === location.origin;
  const cacheable = sameOrigin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdn.jsdelivr.net";
  if (!cacheable) return;  // the speech model caches itself
  // network first for the app itself (so updates arrive), cache first for fonts and libraries
  if (sameOrigin) {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return isolate(r); }).catch(() => caches.match(e.request).then(isolate)));
  } else {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })));
  }
});

// Speed: these two headers switch on "cross-origin isolation", which lets the speech engine use
// all of the phone's CPU cores instead of one. GitHub Pages can't send them, so we add them here.
function isolate(r) {
  if (!r || r.status === 0 || r.type === "opaque") return r;
  const h = new Headers(r.headers);
  h.set("Cross-Origin-Embedder-Policy", "credentialless");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
