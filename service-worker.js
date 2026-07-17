const CACHE = "daymark-v74-sunday-streak-balance";
const VERSION = "20260717-32";
const ASSETS = [
  "./", "./index.html", `./styles.css?v=${VERSION}`, `./app.js?v=${VERSION}`, "./model.js", "./storage.js", "./icons.js",
  "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./screenshots/dashboard-mobile.png", "./screenshots/dashboard-wide.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put("./index.html",copy)); return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  const url=new URL(event.request.url);
  const coreAsset=url.origin===self.location.origin && (/\.(?:css|js)$/.test(url.pathname) || ["style","script"].includes(event.request.destination));
  if(coreAsset){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => {
    const network=fetch(event.request).then(response => {
      if(response.ok && new URL(event.request.url).origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>cached);
    return cached || network;
  }));
});
