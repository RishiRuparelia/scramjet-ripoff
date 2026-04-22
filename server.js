import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, resolve } from "node:path";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const modules = join(__dirname, "node_modules");

const staticRoutes = [
  { prefix: "/scram/", dir: join(modules, "@mercuryworkshop", "scramjet", "dist") },
  { prefix: "/bm/", dir: join(modules, "@mercuryworkshop", "bare-mux", "dist") },
  { prefix: "/lc/", dir: join(modules, "@mercuryworkshop", "libcurl-transport", "dist") },
];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

async function tryServe(absPath, res) {
  try {
    const data = await readFile(absPath);
    res.writeHead(200, {
      "Content-Type": mime[extname(absPath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function safeResolve(baseDir, relative) {
  const target = resolve(baseDir, "." + relative);
  if (!target.startsWith(baseDir)) return null;
  return target;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

  for (const { prefix, dir } of staticRoutes) {
    if (pathname.startsWith(prefix)) {
      const target = safeResolve(dir, "/" + pathname.slice(prefix.length));
      if (!target) return void res.writeHead(403).end();
      if (await tryServe(target, res)) return;
      return void res.writeHead(404).end("Not found");
    }
  }

  const target = safeResolve(publicDir, pathname);
  if (!target) return void res.writeHead(403).end();
  if (await tryServe(target, res)) return;

  res.writeHead(404).end("Not found");
});

server.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

const port = Number(process.env.PORT) || 8080;
server.listen(port, () => {
  console.log(`Scramjet proxy listening on http://localhost:${port}`);
});
