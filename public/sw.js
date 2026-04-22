importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function broadcast(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: "sw-log", ...payload });
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  event.respondWith(
    (async () => {
      try {
        await scramjet.loadConfig();
        if (scramjet.route(event)) {
          try {
            return await scramjet.fetch(event);
          } catch (err) {
            broadcast({ level: "err", msg: `scramjet.fetch threw for ${url.pathname.slice(0, 120)}: ${err?.message ?? err}` });
            return new Response(`scramjet.fetch threw: ${err?.message ?? err}`, {
              status: 500,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }
        }
        return fetch(event.request);
      } catch (err) {
        broadcast({ level: "err", msg: `SW outer threw for ${url.pathname.slice(0, 120)}: ${err?.message ?? err}` });
        return new Response(`SW outer threw: ${err?.message ?? err}`, {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});
