const CACHE_NAME = 'duoduo-cre-v9-20261030';
const CORE = [
  './', './index.html', './styles.css?v=20261031-static7', './app.js?v=20261031-static7',
  './backend.js', './pyodide-loader.js?v=20261031-static7', './engine.py',
  './pyodide/pyodide.mjs', './pyodide/pyodide.asm.js', './pyodide/pyodide-lock.json', './pyodide/chunk-manifest.json',
  './vendor/xlsx.full.min.js', './vendor/pptxgen.bundle.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];
const CORE_URLS = CORE.map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

const MIRROR_TARBALL = 'https://registry.npmmirror.com/pyodide/-/pyodide-0.27.7.tgz';
let runtimeBundlePromise = null;

function parseTarFile(buffer, wantedName) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const name = decoder.decode(bytes.subarray(offset, offset + 100)).replace(/\0.*$/, '');
    if (!name) break;
    const sizeText = decoder.decode(bytes.subarray(offset + 124, offset + 136)).replace(/\0.*$/, '').trim();
    const size = parseInt(sizeText || '0', 8) || 0;
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (name === wantedName) return bytes.slice(dataStart, dataEnd);
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  throw new Error(`Mirror archive missing ${wantedName}`);
}

async function loadRuntimeBundle() {
  if (!runtimeBundlePromise) {
    runtimeBundlePromise = (async () => {
      if (!self.DecompressionStream) throw new Error('DecompressionStream unavailable');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(MIRROR_TARBALL, { signal: controller.signal, cache: 'force-cache' });
        if (!response.ok) throw new Error(`Mirror HTTP ${response.status}`);
        const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'));
        const tarBuffer = await new Response(decompressed).arrayBuffer();
        const wasm = parseTarFile(tarBuffer, 'package/pyodide.asm.wasm');
        const stdlib = parseTarFile(tarBuffer, 'package/python_stdlib.zip');
        const cache = await caches.open(CACHE_NAME);
        await Promise.all([
          cache.put(new URL('./pyodide/pyodide.asm.wasm', self.registration.scope).href,
            new Response(wasm, { headers: { 'Content-Type': 'application/wasm' } })),
          cache.put(new URL('./pyodide/python_stdlib.zip', self.registration.scope).href,
            new Response(stdlib, { headers: { 'Content-Type': 'application/zip' } }))
        ]);
        return { wasm, stdlib };
      } finally {
        clearTimeout(timer);
      }
    })().catch(error => {
      runtimeBundlePromise = null;
      throw error;
    });
  }
  return runtimeBundlePromise;
}

async function fetchParts(cache, base, partCount) {
  return Promise.all(Array.from({ length: partCount }, async (_, i) => {
    const partUrl = `${base}.part${String(i).padStart(2, '0')}`;
    let response = await cache.match(partUrl);
    if (!response) {
      response = await fetch(partUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Runtime part unavailable: ${partUrl}`);
      await cache.put(partUrl, response.clone());
    }
    return response.arrayBuffer();
  }));
}

async function compressedWasmResponse(cache, url) {
  const base = `${String(url).split('?')[0]}.gz`;
  const chunks = await fetchParts(cache, base, 3);
  const gzipBlob = new Blob(chunks, { type: 'application/gzip' });
  if (!self.DecompressionStream) {
    throw new Error('当前浏览器版本过旧，请升级 Safari、Chrome 或 Edge 后重试');
  }
  const stream = gzipBlob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
}

async function chunkedResponse(cache, url, partCount, mime) {
  const base = String(url).split('?')[0];
  const chunks = await fetchParts(cache, base, partCount);
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  return new Response(new Blob(chunks, { type: mime }), {
    status: 200,
    headers: { 'Content-Type': mime, 'Content-Length': String(size) }
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.endsWith('/pyodide/pyodide.asm.wasm')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      let response;
      try {
        const bundle = await loadRuntimeBundle();
        response = new Response(bundle.wasm, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
      } catch {
        response = await compressedWasmResponse(cache, event.request.url);
      }
      await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (requestUrl.pathname.endsWith('/pyodide/python_stdlib.zip')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      let response;
      try {
        const bundle = await loadRuntimeBundle();
        response = new Response(bundle.stdlib, { status: 200, headers: { 'Content-Type': 'application/zip' } });
      } catch {
        response = await chunkedResponse(cache, event.request.url, 6, 'application/zip');
      }
      await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(new URL('./index.html', self.registration.scope).href)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(new URL('./index.html', self.registration.scope).href)))
  );
});
