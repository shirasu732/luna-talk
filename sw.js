// Luna service worker
const V = 'luna-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const CDN = /^(unpkg\.com|cdn\.jsdelivr\.net|esm\.(sh|run)|fonts\.(googleapis|gstatic)\.com|cubism\.live2d\.com|cdnjs\.cloudflare\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('luna-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.headers.has('range')) return;
  // 画面(index.html): まずネット、だめなら保存分
  if (req.mode === 'navigate' || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(V).then(c => c.put('./index.html', r.clone())); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 同じサイトのファイルと、決まったCDN: 保存分を先に使う
  if (u.origin === location.origin || CDN.test(u.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c2 = r.clone(); caches.open(V).then(c => c.put(req, c2)); }
      return r;
    })));
  }
  // それ以外(AI・天気・検索・localhost など)は触らない
});
