// NomaDomo Service Worker - Web Push only.
// Intentionally minimal: no caching strategy, no offline fallback.
// Goal: receive push events and forward clicks to the app.
//
// IMPORTANT: this SW does NOT cache app code. If we ever add caching,
// version the cache and clean up old versions on activate, or users
// get stuck on stale builds.

self.addEventListener("install", (event) => {
  // 即時アクティベート (古い SW を強制退場)
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "NomaDomo", body: "", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    payload.body = event.data ? event.data.text() : "";
  }
  const title = payload.title || "NomaDomo";
  const options = {
    body: payload.body || "",
    icon: "/logo-2.png",
    badge: "/logo-camel.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 既に開いてるタブがあれば focus
      for (const c of clientList) {
        try {
          const u = new URL(c.url);
          if (u.origin === self.location.origin) {
            c.focus();
            if ("navigate" in c) c.navigate(url);
            return;
          }
        } catch {}
      }
      // 無ければ新規 open
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
