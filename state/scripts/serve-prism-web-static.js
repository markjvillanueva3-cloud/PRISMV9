const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 3100;
const API_HOST = "127.0.0.1";
const API_PORT = 3000;
const WEB_ROOT = "C:\\PRISM\\mcp-server\\dist\\web";
const INDEX_PATH = path.join(WEB_ROOT, "index.html");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
    });
    res.end(data);
  });
}

function proxyRequest(req, res) {
  const upstream = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: `API proxy failed: ${error.message}` }));
  });

  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    proxyRequest(req, res);
    return;
  }

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok", frontend: true, backend_proxy: `${API_HOST}:${API_PORT}` }));
    return;
  }

  const cleanPath = decodeURIComponent(url.pathname);
  const requestedPath = cleanPath === "/" ? INDEX_PATH : path.join(WEB_ROOT, cleanPath.replace(/^\/+/, ""));
  const normalizedRoot = path.resolve(WEB_ROOT);
  const normalizedRequested = path.resolve(requestedPath);

  if (!normalizedRequested.startsWith(normalizedRoot)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(normalizedRequested, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, normalizedRequested);
      return;
    }
    sendFile(res, INDEX_PATH);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`PRISM static web server listening on http://${HOST}:${PORT}`);
});
