# scramjet-ripoff

A minimal web proxy built on [Scramjet](https://github.com/MercuryWorkshop/scramjet).
Requests from the browser are rewritten by Scramjet inside a service worker and
tunneled out over [wisp](https://github.com/MercuryWorkshop/wisp-protocol) via
[epoxy](https://github.com/MercuryWorkshop/EpoxyTransport).

## Run it

```bash
npm install
npm start
```

Then open <http://localhost:8080>, type a URL, and hit **Go**.

Set `PORT=3000 npm start` to change the port.

## Layout

- `server.js` — Node HTTP server. Serves the UI, exposes Scramjet and
  epoxy-transport assets, and upgrades `/wisp/` websocket requests to a wisp
  server.
- `public/index.html` — Boot UI. Registers the service worker, boots an
  in-page Epoxy transport, and bridges proxied requests that the service
  worker forwards via the `bare-mux` BroadcastChannel. Navigates the iframe
  through `__scramjet$bundle.rewriters.url.encodeUrl`.
- `public/sw.js` — Service worker. Loads `scramjet.worker.js` and hands
  matching fetches to `ScramjetServiceWorker`.

## How the request path works

1. The page loads `scramjet.bundle.js` and `scramjet.codecs.js`, and registers
   `/sw.js` which loads `scramjet.worker.js`.
2. The SW creates a bare-mux `Switcher` on the `bare-mux` BroadcastChannel.
   The page broadcasts `{type: "setremote"}` on the same channel so the SW
   installs a `RemoteTransport` that fans requests back out to page clients.
3. When the iframe fetches a rewritten URL, the SW matches the `/scramjet/`
   prefix, decodes it, and asks its `RemoteTransport` to fetch the target.
4. The `RemoteTransport` posts a `{type: "request"}` message to every client.
   The page's message listener drives the real Epoxy client, which tunnels
   the request over the `/wisp/` WebSocket on this server.
5. The page posts the response back. The SW rewrites the response and hands
   it to the iframe.
