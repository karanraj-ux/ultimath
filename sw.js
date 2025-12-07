const CACHE_NAME = 'ultimath-ecosystem-v2-final';
const ASSETS = [
  '/',
  '/index.html',      // Public Calculator
  '/jee.html',        // Study OS
  '/titan.html',      // Shop OS
  '/print.html',      // P2P Printer
  '/omega.html',      // Brother Control
  '/Security.html',   //security app
  '/Sync.html',       // UltiSync (Conference)
  '/lazy.html',       // lazy focus tool
  '/neuro.html',      //neuro
  '/manifest.json',

  
  // LIBRARIES (Cached for Speed)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://unpkg.com/tesseract.js@4.1.1/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
