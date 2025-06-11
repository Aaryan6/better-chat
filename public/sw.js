// Enhanced service worker for offline functionality
const CACHE_NAME = "better-chat-offline-v2";

// Cache essential resources on install
const urlsToCache = ["/", "/favicon.ico"];

// Install and cache essential resources
self.addEventListener("install", (event) => {
  console.log("Service Worker: Install");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching essential files");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker: Skip waiting");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Cache failed", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate");
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Handle fetch events
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip non-HTTP requests
  if (!url.startsWith("http")) {
    return;
  }

  // Handle Clerk authentication requests
  if (
    url.includes("clerk.accounts.dev") ||
    url.includes("/v1/client/handshake") ||
    url.includes("clerk.com")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log(
          "Service Worker: Clerk request failed, returning mock response"
        );
        return new Response(
          JSON.stringify({
            error: "offline",
            message: "Authentication service unavailable offline",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      })
    );
    return;
  }

  // Handle page navigation requests (like reloads)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, cache the response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log(
            "Service Worker: Navigation request failed, serving from cache"
          );
          // If network fails, try to serve from cache
          return caches.match("/").then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, return a basic offline page
            return new Response(
              `
              <!DOCTYPE html>
              <html>
              <head>
                <title>Better Chat - Offline</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: system-ui, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    margin: 0; 
                    background: #111; 
                    color: white; 
                    text-align: center;
                  }
                  .container { max-width: 400px; padding: 2rem; }
                  .button { 
                    background: #0070f3; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    margin-top: 1rem;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Better Chat - Offline Mode</h1>
                  <p>The app is currently offline. Please ensure:</p>
                  <ul style="text-align: left;">
                    <li>Your development server is running</li>
                    <li>Ollama is running (ollama serve)</li>
                  </ul>
                  <button class="button" onclick="window.location.reload()">Try Again</button>
                </div>
              </body>
              </html>
            `,
              {
                headers: { "Content-Type": "text/html" },
              }
            );
          });
        })
    );
    return;
  }

  // Handle API requests
  if (url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.log("Service Worker: API request failed:", url, error);
        return new Response(
          JSON.stringify({
            error: "offline",
            message: "API request failed - offline mode",
            offline: true,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // For all other requests, try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try to serve from cache
        return caches.match(event.request);
      })
  );
});
