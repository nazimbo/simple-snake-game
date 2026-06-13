const CACHE_NAME = 'snake-game-v9';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/snake.js',
    '/food.js',
    '/themes.js',
    '/game.js',
    '/main.js'
];

// Install: pre-cache assets and activate immediately (don't wait for old tabs)
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Activate: drop old caches and take control of open pages right away
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// Network-first: always try the network so updated code is picked up,
// falling back to the cache only when offline. Keeps the cache fresh.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(request, copy))
                    .catch(() => {});
                return response;
            })
            .catch(() => caches.match(request))
    );
});
