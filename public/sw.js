// ============================================
// 1. CONFIGURATION
// ============================================

const CACHE_NAME = 'bavel-pwa-v6';
const PRECACHE_MANIFEST = '/precache-manifest.json';
const OFFLINE_PAGE = '/offline.html';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.png',
  '/pwa-icon-512.png',
  OFFLINE_PAGE,
];

// Stratégies de cache
const STRATEGIES = {
  HTML: 'html',           // Network First
  STATIC: 'static',       // Stale-While-Revalidate
  IMAGES: 'images',       // Cache First
  API: 'api',             // Network Only
  FONTS: 'fonts',         // Cache First
  VIDEOS: 'videos',       // Cache First
};

// ============================================
// 2. UTILITAIRES
// ============================================

const getStrategy = (url) => {
  const pathname = url.pathname;
  const hostname = url.hostname;

  // API et Supabase - Network Only
  if (pathname.startsWith('/api/') || 
      hostname.includes('supabase.co') ||
      hostname.includes('vercel') ||
      pathname.includes('/auth/')) {
    return STRATEGIES.API;
  }

  // Images - Cache First
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|ico|bmp)$/i)) {
    return STRATEGIES.IMAGES;
  }

  // Vidéos - Cache First
  if (pathname.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
    return STRATEGIES.VIDEOS;
  }

  // Fonts - Cache First
  if (pathname.match(/\.(woff|woff2|ttf|eot|otf)$/i)) {
    return STRATEGIES.FONTS;
  }

  // CSS/JS - Stale-While-Revalidate
  if (pathname.match(/\.(css|js|mjs|map)$/i)) {
    return STRATEGIES.STATIC;
  }

  // HTML - Network First
  if (pathname.endsWith('.html') || pathname === '/') {
    return STRATEGIES.HTML;
  }

  // Fallback
  return STRATEGIES.STATIC;
};

const isDevelopmentRequest = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname === '/@vite/client' ||
    url.pathname === '/@react-refresh' ||
    /\.(ts|tsx|jsx)$/.test(url.pathname) ||
    url.searchParams.has('t'));

// ============================================
// 3. INSTALL
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installation started...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Pre-caching app shell and build assets');
        const manifestResponse = await fetch(PRECACHE_MANIFEST, { cache: 'no-store' });
        if (!manifestResponse.ok) {
          throw new Error(`Precache manifest request failed (${manifestResponse.status}).`);
        }
        const buildAssets = await manifestResponse.json();
        if (!Array.isArray(buildAssets) || !buildAssets.every(asset =>
          typeof asset === 'string' && asset.startsWith('/') && !asset.startsWith('//')
        )) {
          throw new Error('Precache manifest is invalid.');
        }
        await cache.addAll([...new Set([...CORE_ASSETS, ...buildAssets, PRECACHE_MANIFEST])]);
      })
      .then(() => {
        console.log('[SW] Installation complete');
      })
  );
});

// ============================================
// 4. ACTIVATE
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation started...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const deletePromises = keys.map((key) => {
          if (key.startsWith('bavel-pwa-') && key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        });
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================
// 5. FETCH - AVEC STRATÉGIES
// ============================================

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Ignorer les protocoles non-HTTP
  if (!['http:', 'https:'].includes(url.protocol)) return;
  if (url.origin !== self.location.origin) return;
  if (isDevelopmentRequest(url)) return;

  const strategy = getStrategy(url);

  // ============================================
  // 5.1 STRATÉGIE: NETWORK ONLY
  // ============================================
  if (strategy === STRATEGIES.API) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.warn('[SW] API fetch failed:', error);
        return new Response(
          JSON.stringify({ 
            error: true, 
            message: 'Network error', 
            offline: true 
          }),
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }

  // ============================================
  // 5.2 STRATÉGIE: NETWORK FIRST (HTML)
  // ============================================
  if (strategy === STRATEGIES.HTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          // Mettre en cache la réponse
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(async () => {
          // Fallback offline
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_PAGE);
          if (cachedResponse) return cachedResponse;
          
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head><title>Hors ligne</title></head>
              <body>
                <h1>🌐 Bavel - Hors ligne</h1>
                <p>Veuillez vérifier votre connexion internet.</p>
                <button onclick="location.reload()">Réessayer</button>
              </body>
            </html>`,
            { 
              status: 503, 
              headers: { 'Content-Type': 'text/html' } 
            }
          );
        })
    );
    return;
  }

  // ============================================
  // 5.3 STRATÉGIE: CACHE FIRST (Images, Fonts, Videos)
  // ============================================
  if ([STRATEGIES.IMAGES, STRATEGIES.FONTS, STRATEGIES.VIDEOS].includes(strategy)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          const cachedAt = Date.parse(cachedResponse.headers.get('date') || '');
          const cacheAge = Number.isFinite(cachedAt) ? Date.now() - cachedAt : 0;
          const maxAge = strategy === STRATEGIES.IMAGES ? 86400000 : 2592000000; // 1 jour vs 30 jours
          
          if (cacheAge < maxAge) {
            return cachedResponse;
          }
        }

        try {
          const networkResponse = await fetch(event.request);
          const cacheControl = networkResponse.headers.get('Cache-Control') || '';
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            !/\b(private|no-store)\b/i.test(cacheControl)
          ) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          if (strategy === STRATEGIES.IMAGES) {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#f1f5f9"/><path d="M16 46 29 31l8 9 5-6 8 12H16Z" fill="#cbd5e1"/></svg>',
              { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } }
            );
          }
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // ============================================
  // 5.4 STRATÉGIE: STALE-WHILE-REVALIDATE (Static)
  // ============================================
  if (strategy === STRATEGIES.STATIC) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // En cas d'erreur réseau, retourner le cache si disponible
            if (cachedResponse) return cachedResponse;
            
            // Fallback pour les navigateurs
            if (event.request.mode === 'navigate') {
              return cache.match(OFFLINE_PAGE);
            }
            
            return new Response('Resource unavailable offline', { status: 503 });
          });

        // Retourner le cache immédiatement si disponible
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Fallback - fetch normal
  event.respondWith(fetch(event.request));
});

// ============================================
// 6. PUSH NOTIFICATIONS AVANCÉES & APPELS WEB PUSH
// ============================================

const VIBRATION_PATTERNS = {
  match: [200, 100, 200, 100, 300],
  message: [100, 50, 100, 50, 100],
  like: [50, 30, 50],
  superlike: [150, 75, 150, 75, 200],
  call: [500, 250, 500, 250, 500, 250, 500, 250, 500], // 🚨 Sonnerie continue / vibrations fortes
  default: [100, 50, 100],
};

const NOTIFICATION_SOUNDS = {
  match: '/sounds/match.mp3',
  message: '/sounds/message.mp3',
  like: '/sounds/like.mp3',
  superlike: '/sounds/superlike.mp3',
  call: '/sounds/call.mp3',
};

self.addEventListener('push', (event) => {
  let data = {};
  
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      const text = event.data ? event.data.text() : '';
      data = JSON.parse(text);
    } catch {
      data = {
        title: '📞 Appel entrant',
        body: "Ton partenaire t'appelle en direct !",
        type: 'call',
        silent: false,
      };
    }
  }

  const type = data.type || (data.callType ? 'call' : 'default');
  const isCall = type === 'call' || !!data.callType;
  const title = data.title || (isCall ? `📞 Appel ${data.callType === 'video' ? 'vidéo' : 'vocal'} entrant` : 'Bavel 🇨🇮');
  const body = data.body || (isCall ? "Ton partenaire t'appelle en direct !" : 'Vous avez une nouvelle notification !');
  const vibration = data.vibrate || VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.default;
  const icon = data.icon || '/pwa-icon.png';
  const tag = data.tag || (isCall ? 'incoming-call' : `notification-${Date.now()}`);
  const sound = data.sound || NOTIFICATION_SOUNDS[type];

  const callActions = [
    { 
      action: 'answer', 
      title: '📞 Décrocher' 
    },
    { 
      action: 'decline', 
      title: '❌ Refuser' 
    }
  ];

  const defaultActions = [
    { 
      action: 'open', 
      title: '📱 Ouvrir' 
    },
    { 
      action: 'reply', 
      title: '💬 Répondre' 
    },
    { 
      action: 'close', 
      title: '❌ Fermer' 
    }
  ];

  const options = {
    body,
    icon,
    badge: data.badge || '/pwa-icon.png',
    vibrate: vibration,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || Date.now().toString(),
      url: data.url || '/',
      type,
      callType: data.callType || 'video',
      callerName: data.callerName || data.name || 'Partenaire',
      userId: data.userId || null,
      matchId: data.matchId || null,
      chatId: data.chatId || null,
      deepLink: data.deepLink || null,
    },
    actions: isCall ? callActions : defaultActions,
    requireInteraction: isCall || ['match', 'superlike'].includes(type),
    tag,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    image: data.image || null,
  };

  // Ajouter le son si disponible
  if (sound) {
    options.sound = sound;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================
// 7. NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Action: Refuser ou Fermer
  if (action === 'decline' || action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        // Construction de l'URL cible
        let targetUrl = data.url || '/';
        
        if (data.deepLink) {
          targetUrl = data.deepLink;
        } else if (data.chatId) {
          targetUrl = `/chat/${data.chatId}`;
        } else if (data.matchId) {
          targetUrl = `/match/${data.matchId}`;
        } else if (data.userId) {
          targetUrl = `/profile/${data.userId}`;
        }

        // Si l'utilisateur a cliqué sur "Décrocher"
        if (action === 'answer') {
          targetUrl = targetUrl.includes('?') 
            ? `${targetUrl}&action=autoanswer` 
            : `${targetUrl}?action=autoanswer`;
        } else if (action === 'reply') {
          targetUrl = `/chat/${data.chatId || data.matchId || ''}`;
        }

        // Trouver un client existant ou en ouvrir un nouveau
        for (const client of clientList) {
          if ('focus' in client) {
            await client.focus();
            client.postMessage({ 
              type: 'NAVIGATE_TO', 
              payload: { url: targetUrl, action, data } 
            });
            if (action === 'answer') {
              client.postMessage({
                type: 'INCOMING_CALL_ANSWER',
                payload: data
              });
            }
            return;
          }
        }

        // Ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          const newClient = await clients.openWindow(targetUrl);
          if (newClient) {
            newClient.postMessage({ 
              type: 'NOTIFICATION_DATA', 
              payload: { ...data, action } 
            });
            if (action === 'answer') {
              newClient.postMessage({
                type: 'INCOMING_CALL_ANSWER',
                payload: data
              });
            }
          }
        }
      })
  );
});

// ============================================
// 8. BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-likes') {
    event.waitUntil(syncLikes());
  } else if (event.tag === 'sync-matches') {
    event.waitUntil(syncMatches());
  } else if (event.tag === 'sync-profiles') {
    event.waitUntil(syncProfiles());
  }
});

// 8.1 Sync Messages
async function syncMessages() {
  const cache = await caches.open('bavel-offline-queue');
  const requests = await cache.keys();
  
  console.log(`[SW] Syncing ${requests.length} offline messages`);

  let successCount = 0;
  let failCount = 0;

  for (const request of requests) {
    if (request.url.includes('/api/messages')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          successCount++;
          console.log('[SW] Message synced successfully');
        } else {
          failCount++;
          console.warn('[SW] Message sync failed with status:', response.status);
        }
      } catch (error) {
        failCount++;
        console.warn('[SW] Network error during message sync:', error);
      }
    }
  }

  console.log(`[SW] Sync complete: ${successCount} success, ${failCount} failed`);
  
  // Notifier le client du résultat
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      payload: { 
        type: 'messages',
        successCount,
        failCount,
        total: requests.length 
      }
    });
  });
}

// 8.2 Sync Likes
async function syncLikes() {
  const cache = await caches.open('bavel-offline-queue');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/likes')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Like synced successfully');
        }
      } catch (error) {
        console.warn('[SW] Like sync error:', error);
      }
    }
  }
}

// 8.3 Sync Matches
async function syncMatches() {
  const cache = await caches.open('bavel-offline-queue');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/matches')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Match synced successfully');
        }
      } catch (error) {
        console.warn('[SW] Match sync error:', error);
      }
    }
  }
}

// 8.4 Sync Profiles
async function syncProfiles() {
  const cache = await caches.open('bavel-offline-queue');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/profiles')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Profile synced successfully');
        }
      } catch (error) {
        console.warn('[SW] Profile sync error:', error);
      }
    }
  }
}

// ============================================
// 9. PERIODIC BACKGROUND SYNC
// ============================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      Promise.all([
        syncMessages(),
        syncLikes(),
        syncMatches(),
        updateCache(),
      ])
    );
  }
});

async function updateCache() {
  console.log('[SW] Periodic cache update started');
  
  const cache = await caches.open(CACHE_NAME);
  const urls = [
    '/',
    '/manifest.json',
  ];
  
  try {
    await cache.addAll(urls);
    console.log('[SW] Periodic cache update complete');
  } catch (error) {
    console.warn('[SW] Periodic cache update error:', error);
  }
}

// ============================================
// 10. MESSAGES FROM CLIENT
// ============================================

self.addEventListener('message', (event) => {
  const data = event.data || {};

  // Skip waiting
  if (data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }

  // Register sync
  if (data.type === 'REGISTER_SYNC') {
    if (data.tag) {
      event.waitUntil(self.registration.sync.register(data.tag));
    }
  }

  // Get offline queue
  if (data.type === 'GET_OFFLINE_QUEUE') {
    event.waitUntil(
      caches.open('bavel-offline-queue')
        .then((cache) => cache.keys())
        .then((keys) => {
          if (event.ports && event.ports.length > 0) {
            event.ports[0].postMessage({ 
              queueSize: keys.length,
              requests: keys.map((req) => ({
                url: req.url,
                method: req.method,
                headers: Object.fromEntries(req.headers.entries()),
              }))
            });
          }
        })
    );
  }

  // Clear offline queue
  if (data.type === 'CLEAR_OFFLINE_QUEUE') {
    event.waitUntil(
      caches.delete('bavel-offline-queue')
    );
  }

  // Cache current URL
  if (data.type === 'CACHE_CURRENT_URL') {
    if (data.url) {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => cache.add(data.url))
      );
    }
  }

  // Invalidate cache
  if (data.type === 'INVALIDATE_CACHE') {
    if (data.url) {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => cache.delete(data.url))
      );
    }
  }

  // Update version
  if (data.type === 'UPDATE_VERSION') {
    event.waitUntil(
      caches.keys()
        .then((keys) => {
          const deletePromises = keys.map((key) => {
            if (key.startsWith('bavel-pwa-') && key !== data.version) {
              return caches.delete(key);
            }
          });
          return Promise.all(deletePromises);
        })
    );
  }
});

// ============================================
// 13. ERROR HANDLING
// ============================================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// ============================================
// 14. LOGGING
// ============================================

const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

if (isDevelopment) {
  console.log('[SW] Running in development mode');
  console.log(`[SW] Cache name: ${CACHE_NAME}`);
  console.log('[SW] Core assets:', CORE_ASSETS);
}

// ============================================
// 15. EXPORT
// ============================================

// Le Service Worker s'auto-enregistre
console.log('[SW] Service Worker initialized successfully');