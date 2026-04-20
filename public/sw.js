importScripts("/scram/scramjet.codecs.js");

self.__scramjet$config = {
  prefix: "/scramjet/",
  codec: self.__scramjet$codecs.plain,
  config: "/scram/scramjet.config.js",
  bundle: "/scram/scramjet.bundle.js",
  worker: "/scram/scramjet.worker.js",
  client: "/scram/scramjet.client.js",
  codecs: "/scram/scramjet.codecs.js",
};

importScripts("/scram/scramjet.bundle.js");
importScripts("/scram/scramjet.worker.js");

const scramjet = new self.ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (scramjet.route(event)) {
    event.respondWith(scramjet.fetch(event));
  }
});
