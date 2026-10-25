const CACHE="eleicoes-2026-v12-region-drilldown-geography";
const STATIC=["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-180.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.hostname==="resultados.tse.jus.br")return;
  if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(!response.ok)return response;
    const copy=response.clone();
    caches.open(CACHE).then(c=>c.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))));
});