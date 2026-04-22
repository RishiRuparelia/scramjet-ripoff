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
  const interesting = url.pathname.startsWith("/scramjet/") || event.request.mode === "navigate";
  event.respondWith(
    (async () => {
      try {
        await scramjet.loadConfig();
        const routed = scramjet.route(event);
        if (interesting) {
          broadcast({ level: "dim", msg: `fetch ${event.request.mode} ${url.pathname.slice(0, 80)} → route=${routed}` });
        }
        if (routed) {
          try {
            const res = await scramjet.fetch(event);
            if (interesting) broadcast({ level: "dim", msg: `→ ${res.status} ${url.pathname.slice(0, 80)}` });
            return res;
          } catch (err) {
            broadcast({ level: "err", msg: `scramjet.fetch threw for ${url.pathname}: ${err?.message ?? err}` });
            return new Response(`scramjet.fetch threw: ${err?.message ?? err}`, {
              status: 500,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }
        }
        return fetch(event.request);
      } catch (err) {
        broadcast({ level: "err", msg: `SW outer threw for ${url.pathname}: ${err?.message ?? err}` });
        return new Response(`SW outer threw: ${err?.message ?? err}`, {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});
