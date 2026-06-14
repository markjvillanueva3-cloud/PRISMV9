#!/usr/bin/env node
/**
 * server.mjs — U-DOCKER-HOOK-BROKER-P2 (Tier-1 broker daemon)
 *
 * HTTP server that holds module-safe `.claude/hooks/*.mjs` warm in memory.
 * Reads `state/shared/HOOK-BROKER-COMPAT-REPORT.json` (produced by
 * `scripts/classify-hooks-for-broker.mjs`), dynamic-imports every hook
 * classified as `module-safe`, caches the exports, and routes incoming
 * POSTs to the cached handler.
 *
 * THIS IS STANDALONE — it does NOT yet ship with a Dockerfile (P3) or a
 * docker-compose stanza (P3). You can run it directly:
 *   node docker/hook-broker/server.mjs                 # port 9876 (default)
 *   node docker/hook-broker/server.mjs --port 9999     # custom port
 *   PRISM_BROKER_PORT=9999 node docker/hook-broker/server.mjs
 *
 * Routes:
 *   GET  /healthz       — 200 with {loaded, failed, ready} once all hooks imported
 *   POST /hook/:name    — body=stdin JSON, returns the handler's resolved value
 *   POST /reload        — re-imports every cached hook (picks up edits)
 *   GET  /loaded        — list of currently-cached hook names
 *
 * Handler contract — a `module-safe` hook must expose a callable default
 * export. Acceptable shapes:
 *   `export default async function handle(stdinText) { return { ... }; }`
 *   `export default (stdinText) => ({ ... })`
 *
 * If a hook exports a default that is NOT a function, the broker records
 * the failure and continues — it does NOT crash on a single bad hook.
 *
 * @milestone U-DOCKER-HOOK-BROKER-P2
 */

import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, "..", "..");
const REPORT_PATH = join(REPO, "state", "shared", "HOOK-BROKER-COMPAT-REPORT.json");
const HOOKS_DIR = join(REPO, ".claude", "hooks");

const DEFAULT_PORT = 9876;
// Per-request body cap — stdin payloads should be JSON envelopes, not megabytes.
const MAX_BODY_BYTES = 1 * 1024 * 1024;
// Per-handler invocation timeout — a stuck hook must not wedge the broker.
const HANDLER_TIMEOUT_MS = 10_000;

// P1-B (Reviewer B): allowlist hook names. Matches the existing
// `.claude/hooks/*.mjs` naming convention (kebab-case, leading letter,
// no path separators, capped length).
const HOOK_NAME_RE = /^[a-z][a-z0-9._-]{0,127}$/i;

/**
 * @typedef {Object} LoadedHook
 * @property {string} name              — basename without `.mjs`
 * @property {string} filePath
 * @property {Function} handler         — the resolved callable default export
 * @property {number} importedAt        — ms-since-epoch
 */

/**
 * @typedef {Object} LoadFailure
 * @property {string} name
 * @property {string} filePath
 * @property {string} reason            — "no-default-export" / "default-not-callable" / "import-error: ..."
 */

/**
 * In-memory cache. P0 fix (Reviewer B): hold `loaded` behind a `let`
 * reference so `loadHooks` can build a new Map locally and swap-assign
 * atomically at the end — no window where `loaded.clear()` would expose
 * a half-populated state to concurrent `invokeHook` calls.
 * @type {Map<string, LoadedHook>}
 */
let loaded = new Map();
/** @type {LoadFailure[]} */
let failures = [];
let ready = false;
/**
 * Monotonic counter for per-file cache-busting. P1-A fix (Reviewer A+B):
 * `?t=${Date.now()}` alone collides when two reloads land in the same ms;
 * the counter guarantees a unique URL per import even at sub-ms timing.
 */
let reloadSeq = 0;

/**
 * Read the report (if present) and return the list of file paths the broker
 * should attempt to import. Falls back to scanning HOOKS_DIR for *.mjs if
 * the report is missing — broker still works pre-survey, just less curated.
 *
 * @returns {{ files: string[], source: string }}
 */
export function discoverModuleSafeHookFiles() {
  try {
    const raw = readFileSync(REPORT_PATH, "utf8");
    const report = JSON.parse(raw);
    if (Array.isArray(report.perFile)) {
      const files = report.perFile
        .filter((e) => e && e.category === "module-safe" && typeof e.filePath === "string")
        .map((e) => e.filePath);
      return { files, source: "compat-report" };
    }
  } catch {
    // No report yet — fall through to filesystem scan.
  }
  // Fallback: just enumerate .mjs files in the hooks dir.
  const files = [];
  try {
    for (const name of readdirSync(HOOKS_DIR)) {
      if (!name.endsWith(".mjs")) continue;
      if (name.endsWith(".test.mjs")) continue;
      if (name === "_envelope.mjs") continue;
      files.push(join(HOOKS_DIR, name).replace(/\\/g, "/"));
    }
  } catch {
    // hooks dir missing — return empty.
  }
  return { files, source: "fs-scan" };
}

/**
 * Dynamic-import every file in `files`, store the callable default exports
 * in `loaded`, accumulate failures in `failures`. Idempotent — clears state
 * before running.
 *
 * @param {string[]} files
 * @returns {Promise<{loaded: number, failed: number}>}
 */
export async function loadHooks(files) {
  // P1-D (Reviewer B): mark broker not-ready until the swap completes —
  // /healthz must NOT report ready:true with loaded:0 during a reload.
  ready = false;
  // P0 (Reviewer B): build a fresh Map locally, swap at the end. No
  // observable window where `loaded.get(name)` could miss a previously
  // cached hook during reload.
  const next = new Map();
  const nextFailures = [];
  const now = Date.now();
  for (const filePath of files) {
    const name = basename(filePath).replace(/\.mjs$/, "");
    try {
      // P1-A (Reviewer A+B): per-file cache-busting — Date.now() alone
      // collides on same-ms reloads. Append a monotonic counter + random
      // suffix so every URL is globally unique.
      const tag = `${now}-${++reloadSeq}-${randomBytes(3).toString("hex")}`;
      const url = pathToFileURL(filePath).href + `?t=${tag}`;
      const mod = await import(url);
      if (!mod || typeof mod.default === "undefined") {
        nextFailures.push({ name, filePath, reason: "no-default-export" });
        continue;
      }
      if (typeof mod.default !== "function") {
        nextFailures.push({ name, filePath, reason: "default-not-callable" });
        continue;
      }
      next.set(name, { name, filePath, handler: mod.default, importedAt: now });
    } catch (e) {
      nextFailures.push({ name, filePath, reason: `import-error: ${e?.message || String(e)}` });
    }
  }
  loaded = next;
  failures = nextFailures;
  ready = true;
  return { loaded: loaded.size, failed: failures.length };
}

/**
 * Invoke a cached hook with the stdin payload. Race against a timeout so
 * a stuck handler can't wedge the broker. Returns the resolved value AS-IS
 * (the broker is dialect-agnostic — handlers return whatever JSON shape
 * Claude Code expects).
 *
 * @param {string} name      — hook name (no `.mjs`)
 * @param {string} stdinText
 * @returns {Promise<{ok: true, output: any} | {ok: false, error: string, status: number}>}
 */
export async function invokeHook(name, stdinText) {
  const hook = loaded.get(name);
  if (!hook) return { ok: false, error: `no such hook: ${name}`, status: 404 };
  // P1-C (Reviewer B): pre-declare + always clearTimeout in `finally`.
  // The timer was leaking on race-win-by-handler (handler resolves, timer
  // not yet fired but still pending in event loop → blocks process exit
  // and accumulates under load). Clearing it unconditionally is safe:
  // clearTimeout on a fired timer is a no-op.
  let timer = null;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`handler timeout ${HANDLER_TIMEOUT_MS}ms`)),
        HANDLER_TIMEOUT_MS,
      );
    });
    const result = await Promise.race([
      Promise.resolve().then(() => hook.handler(stdinText)),
      timeoutPromise,
    ]);
    return { ok: true, output: result };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), status: 500 };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/**
 * Read the request body as text, with a hard byte cap. Returns the body
 * string on success, or throws on overrun.
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<string>}
 */
export function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    // P2 (Reviewer A): single-shot rejection + early-return so subsequent
    // `data` events don't keep pushing chunks after the cap fires.
    let bytes = 0;
    let rejected = false;
    const chunks = [];
    req.on("data", (chunk) => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        rejected = true;
        rejectBody(new Error(`body exceeds ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) return;
      resolveBody(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      if (rejected) return;
      rejected = true;
      rejectBody(err);
    });
  });
}

/**
 * Create the HTTP server. Routes:
 *   GET  /healthz
 *   GET  /loaded
 *   POST /reload
 *   POST /hook/<name>
 * Returns the `http.Server` instance — caller is responsible for `.listen()`.
 *
 * @returns {import("node:http").Server}
 */
export function createBrokerServer() {
  return createServer(async (req, res) => {
    const route = `${req.method} ${req.url}`;
    try {
      if (req.method === "GET" && req.url === "/healthz") {
        respond(res, 200, { ready, loaded: loaded.size, failed: failures.length });
        return;
      }
      if (req.method === "GET" && req.url === "/loaded") {
        const list = Array.from(loaded.values()).map((h) => ({
          name: h.name,
          filePath: h.filePath,
          importedAt: h.importedAt,
        }));
        respond(res, 200, { loaded: list, failures });
        return;
      }
      if (req.method === "POST" && req.url === "/reload") {
        const { files } = discoverModuleSafeHookFiles();
        const r = await loadHooks(files);
        respond(res, 200, { reloaded: true, ...r });
        return;
      }
      if (req.method === "POST" && req.url?.startsWith("/hook/")) {
        const name = decodeURIComponent(req.url.slice("/hook/".length));
        // P1-B (Reviewer B): allowlist enforcement. Catches `..`, `/`, `\`,
        // null bytes, control chars, URL-encoded escape sequences, empty
        // names, names exceeding 128 chars. Map-lookup is the actual
        // safety boundary (nothing escapes to fs), but a strict allowlist
        // is defense-in-depth + log-injection prevention.
        if (!HOOK_NAME_RE.test(name)) {
          respond(res, 400, { error: "invalid hook name" });
          return;
        }
        let body;
        try { body = await readBody(req); }
        catch (e) { respond(res, 413, { error: e?.message || "body too large" }); return; }
        const result = await invokeHook(name, body);
        if (result.ok) respond(res, 200, result.output);
        else respond(res, result.status || 500, { error: result.error });
        return;
      }
      respond(res, 404, { error: `no route: ${route}` });
    } catch (e) {
      respond(res, 500, { error: e?.message || "internal error" });
    }
  });
}

/** Helper: write a JSON response. */
function respond(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

/** Read current broker state — exposed for tests. */
export function getBrokerState() {
  return Object.freeze({
    ready,
    loadedCount: loaded.size,
    failedCount: failures.length,
    loadedNames: Object.freeze(Array.from(loaded.keys())),
    failures: Object.freeze([...failures]),
  });
}

/** Reset broker state — exposed for tests. */
export function resetBrokerState() {
  loaded.clear();
  failures = [];
  ready = false;
}

const invokedAsCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const portIdx = args.indexOf("--port");
  const port = portIdx >= 0 && args[portIdx + 1]
    ? Number(args[portIdx + 1])
    : Number(process.env.PRISM_BROKER_PORT || DEFAULT_PORT);
  const { files, source } = discoverModuleSafeHookFiles();
  console.log(`[broker] discovering hooks (source=${source}) — ${files.length} candidate(s)`);
  loadHooks(files).then((r) => {
    console.log(`[broker] loaded ${r.loaded} hook(s), ${r.failed} failure(s)`);
    const server = createBrokerServer();
    server.listen(port, "127.0.0.1", () => {
      console.log(`[broker] listening on http://127.0.0.1:${port}`);
    });
  });
}
