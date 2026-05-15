#!/usr/bin/env node
// PRISM hook broker — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1).
// Persistent HTTP server holding all .claude/hooks/*.mjs warm in one Node process.
// Eliminates per-event fork-storm. Spec: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md

import { createServer } from "node:http";
import { readdir, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import path from "node:path";

const HOOKS_DIR = process.env.PRISM_HOOKS_DIR || "/app/.claude/hooks";
const PORT = parseInt(process.env.PRISM_HOOKS_BROKER_PORT || "9876", 10);
const HOST = process.env.PRISM_HOOKS_BROKER_HOST || "0.0.0.0";
const LOAD_TIMEOUT_MS = parseInt(process.env.PRISM_HOOKS_LOAD_TIMEOUT_MS || "10000", 10);
const HOOK_EXEC_TIMEOUT_MS = parseInt(process.env.PRISM_HOOK_EXEC_TIMEOUT_MS || "30000", 10);
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const SHUTDOWN_GRACE_MS = 5000;

const hookCache = new Map();
const loadErrors = new Map();

// Hook name whitelist — mirrors .claude/helpers/docker-hook-broker.mjs client validator.
// Rejects path-traversal (`..`), absolute paths, separators, null bytes, dotfiles BEFORE
// the name reaches path.join or dynamic import. Two-layer defense.
const HOOK_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function isValidHookName(name) {
  if (typeof name !== "string" || !name) return false;
  const bare = name.endsWith(".mjs") ? name.slice(0, -4) : name;
  if (!HOOK_NAME_RE.test(bare)) return false;
  if (bare.includes("..")) return false;
  return true;
}

async function discoverHooks() {
  let entries;
  try { entries = await readdir(HOOKS_DIR); }
  catch { return []; }
  return entries.filter((f) => f.endsWith(".mjs") && !f.startsWith("_") && !f.endsWith(".test.mjs"));
}

async function loadHook(name) {
  if (!isValidHookName(name)) return { ok: false, error: "invalid-hook-name: " + name };
  const baseDir = path.resolve(HOOKS_DIR);
  const filePath = path.resolve(baseDir, name);
  if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
    return { ok: false, error: "path-escapes-hooks-dir: " + filePath };
  }
  let st;
  try { st = await stat(filePath); }
  catch { return { ok: false, error: "ENOENT: " + filePath }; }

  const cached = hookCache.get(name);
  if (cached && cached.mtimeMs === st.mtimeMs) return { ok: true, cached: true };

  try {
    const url = pathToFileURL(filePath).href + "?t=" + st.mtimeMs;
    const mod = await import(url);
    hookCache.set(name, { module: mod, mtimeMs: st.mtimeMs, loadedAt: Date.now(), callCount: 0, errorCount: 0 });
    loadErrors.delete(name);
    return { ok: true, cached: false };
  } catch (e) {
    loadErrors.set(name, String(e?.stack || e?.message || e));
    return { ok: false, error: String(e?.message || e) };
  }
}

async function loadAllHooks() {
  const names = await discoverHooks();
  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  const results = await Promise.all(names.map(async (n) => {
    if (Date.now() > deadline) return { ok: false, error: "load-timeout" };
    return loadHook(n);
  }));
  let loaded = 0, failed = 0;
  for (const r of results) { if (r.ok) loaded++; else failed++; }
  return { discovered: names.length, loaded, failed };
}

async function executeHook(name, payload) {
  if (!hookCache.has(name)) {
    const r = await loadHook(name);
    if (!r.ok) return { ok: false, status: 502, error: "hook-load-failed: " + r.error };
  }
  const entry = hookCache.get(name);
  if (!entry) return { ok: false, status: 502, error: "hook-not-loaded" };

  entry.callCount++;
  const mod = entry.module;
  // Broker accepts ONLY default-export hooks. Legacy stdio hooks (top-level
  // process.stdin/stdout side-effects) cannot be re-entered safely from one process
  // → client falls back to direct execution for those.
  if (typeof mod.default !== "function") {
    return { ok: false, status: 501, error: "legacy-stdio-hook-not-broker-eligible" };
  }

  let timeoutHandle;
  const timeoutP = new Promise((_, rej) => {
    timeoutHandle = setTimeout(() => rej(new Error("hook-exec-timeout")), HOOK_EXEC_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([Promise.resolve(mod.default(payload)), timeoutP]);
    return { ok: true, status: 200, result: result ?? {} };
  } catch (e) {
    entry.errorCount++;
    return { ok: false, status: 500, error: String(e?.message || e) };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.setEncoding("utf8");
    req.on("data", (c) => {
      buf += c;
      if (buf.length > MAX_BODY_BYTES) { req.destroy(); reject(new Error("body-too-large")); }
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const p = url.pathname;

    if (p === "/" || p === "/healthz") {
      json(res, 200, {
        ok: true,
        loaded: hookCache.size,
        failed: Object.fromEntries(loadErrors),
        port: PORT,
        uptime_s: Math.round(process.uptime()),
      });
      return;
    }

    if (req.method === "POST" && p === "/reload") {
      hookCache.clear(); loadErrors.clear();
      const r = await loadAllHooks();
      json(res, 200, { ok: true, reloaded: r });
      return;
    }

    const hookMatch = p.match(/^\/hook\/([A-Za-z0-9._-]+)$/);
    if (req.method === "POST" && hookMatch) {
      const rawName = hookMatch[1];
      if (!isValidHookName(rawName)) {
        json(res, 400, { ok: false, error: "invalid-hook-name", name: rawName });
        return;
      }
      const name = rawName.endsWith(".mjs") ? rawName : rawName + ".mjs";
      const payload = await readBody(req);
      const r = await executeHook(name, payload);
      if (r.ok) {
        const body = JSON.stringify(r.result);
        res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
        res.end(body);
      } else {
        json(res, r.status, { ok: false, error: r.error, hook: name });
      }
      return;
    }

    json(res, 404, { ok: false, error: "not-found", path: p });
  } catch (e) {
    json(res, 500, { ok: false, error: String(e?.message || e) });
  }
});

server.listen(PORT, HOST, async () => {
  const r = await loadAllHooks();
  process.stdout.write(JSON.stringify({
    ready: true, host: HOST, port: PORT, hooks_dir: HOOKS_DIR,
    discovered: r.discovered, loaded: r.loaded, failed: r.failed,
  }) + "\n");
});

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
  });
}

export default async function brokerEntryPoint() {
  // Marker export so test harness / introspection tools can detect this as a script entry.
  // The actual server is the `createServer().listen()` side-effect above.
  return { kind: "prism-hooks-broker", port: PORT, host: HOST };
}
