/* eslint-disable no-restricted-globals */
// Messaging service worker — handles ONLY push + notificationclick.
// No app-shell caching, no fetch interception (intentional per PWA skill).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Rancho Digital", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Rancho Digital";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/vacunas" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/vacunas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            const u = new URL(client.url);
            if (u.origin === self.location.origin) {
              client.navigate(url);
              return client.focus();
            }
          } catch {}
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});