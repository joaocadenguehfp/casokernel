/* Service worker: o jogo funciona offline depois da primeira visita.
   Estratégia "rede primeiro": online, sempre pega a versão nova (sem cache velho
   durante o desenvolvimento); sem rede, usa a cópia salva. Troque VERSAO ao
   mudar a lista de arquivos. O Three.js (vendor/) não é pré-baixado: entra no
   cache na primeira vez que uma ferramenta 3D abre (a busca abaixo guarda tudo). */
const VERSAO="caso-kernel-v6-3";
const ARQUIVOS=["./","index.html","style.css","cases.js","scenes.js","tools2d.js","tools3d.js","script.js",
  "fonts/cinzel-latin.woff2","fonts/rajdhani-500-latin.woff2","fonts/rajdhani-600-latin.woff2","fonts/rajdhani-700-latin.woff2"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  e.respondWith(
    fetch(r).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(VERSAO).then(c=>c.put(r,cp))}
      return res;
    }).catch(()=>caches.match(r,{ignoreSearch:true}))
  );
});
