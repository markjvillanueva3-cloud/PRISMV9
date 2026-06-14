#!/usr/bin/env node
/**
 * _server.cjs — minimal PRISM system-viz HTTP server.
 *
 * Restored 2026-05-24 (slot:romeo /goal context) after the prior binary went
 * missing from disk despite every doc, skill, and `.cache/system-viz-server.log`
 * call site assuming it lived here. R12 fail-loud: rebuild rather than route
 * around. Binds 127.0.0.1:8765 only — fits the no-public-H-drive constraint.
 *
 * Endpoints (only those for which the source asset actually exists today):
 *   GET  /                          dashboard.html (single-pane viewer)
 *   GET  /dashboard.html            dashboard.html (explicit)
 *   GET  /system-graph.json         streamed 546 MB graph (gzip if accepted)
 *   GET  /system-graph-index.json   145 MB lighter index variant
 *   GET  /system-graph-normalized.json
 *   GET  /briefing                  EXECUTIVE-BRIEFING.md (text/markdown)
 *   GET  /briefing.json             EXECUTIVE-BRIEFING.json
 *   GET  /healthz                   {"ok":true,"port":8765}
 *   GET  /<anything-on-disk>        static-file fallback under this dir
 *   POST /regenerate                spawns scripts/regen-viz.mjs and pipes back
 *
 * Endpoints documented historically but whose source file no longer exists
 * (system-viz.html, system-graph-light.json, system-graph-skeleton.json,
 * file-claims) return 404 with a clear message naming the missing producer
 * so an operator can regenerate them rather than us inventing fake content.
 */

"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const zlib = require("node:zlib");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PRISM_VIZ_PORT || 8765);
const VIZ_DIR = __dirname;
const REPO_ROOT = path.resolve(VIZ_DIR, "..", "..", "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".cjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl":"application/x-ndjson; charset=utf-8",
  ".md":   "text/markdown; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
};

function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || "application/octet-stream";
}

function negotiateEncoding(req) {
  const accept = String(req.headers["accept-encoding"] || "").toLowerCase();
  if (accept.includes("br")) return "br";
  if (accept.includes("gzip")) return "gzip";
  return null;
}

function compressStream(enc) {
  if (enc === "br") return zlib.createBrotliCompress({ chunkSize: 64 * 1024 });
  if (enc === "gzip") return zlib.createGzip({ chunkSize: 64 * 1024 });
  return null;
}

function send(res, status, body, type = "text/plain; charset=utf-8", extra = {}) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-cache", ...extra });
  res.end(body);
}

function sendFile(req, res, abs, mimeHint = null) {
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, `not found: ${path.relative(VIZ_DIR, abs)}\n`);
    }
    const type = mimeHint || mimeFor(abs);
    const enc = negotiateEncoding(req);
    const headers = {
      "content-type": type,
      "cache-control": "no-cache",
      "x-source-path": path.relative(VIZ_DIR, abs),
    };
    if (enc) headers["content-encoding"] = enc;
    res.writeHead(200, headers);
    const raw = fs.createReadStream(abs);
    raw.on("error", () => res.destroy());
    const comp = compressStream(enc);
    if (comp) raw.pipe(comp).pipe(res);
    else raw.pipe(res);
  });
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

// ─── system-viz self-health (sierra domain) ──────────────────────────
// The dashboard is the canonical landing surface, so show the graph's OWN health
// (regen freshness/size + dead-edge integrity) from the light sidecars the
// sierra-graph-health hook already writes — no graph parse. Fully fail-soft.
function buildVizHealth() {
  try {
    const ok = readJsonSafe(path.join(VIZ_DIR, ".last-successful-regen.json"));
    const fail = readJsonSafe(path.join(VIZ_DIR, ".last-regen-failure.json"));
    const okT = ok && ok.ts ? Date.parse(ok.ts) : 0;
    const failT = fail && fail.ts ? Date.parse(fail.ts) : 0;
    const healthy = okT >= failT;
    const ageH = okT ? (Date.now() - okT) / 3.6e6 : null;
    const verdict = (!ok && !fail) ? "unknown" : !healthy ? "failed" : (ageH != null && ageH > 24 ? "stale" : "green");

    let integrity = null;
    try {
      const dir = path.join(REPO_ROOT, "state/shared");
      const reports = fs.readdirSync(dir).filter((f) => /^system-viz-dead-pixels-.*\.json$/.test(f)).sort();
      if (reports.length) {
        const rep = readJsonSafe(path.join(dir, reports[reports.length - 1]));
        if (rep) {
          const cls = rep.deadEdgesByClass || {};
          integrity = {
            nodeCount: rep.nodeCount ?? null,
            edgeCount: rep.edgeCount ?? null,
            deadEdges: rep.deadEdgeCount ?? null,
            deadAdvisory: cls.advisory ?? null,
            deadDefect: cls.defect ?? null,
            reportDate: reports[reports.length - 1].replace(/^system-viz-dead-pixels-/, "").replace(/\.json$/, ""),
          };
        }
      }
    } catch { /* dead-pixel report optional */ }

    return {
      verdict,
      lastRegenAgeH: ageH != null ? Math.round(ageH * 10) / 10 : null,
      graphMB: ok && ok.graphBytes ? Math.round(ok.graphBytes / 1e6) : null,
      pendingCount: ok && ok.pendingCount != null ? ok.pendingCount : null,
      sidecarOk: ok && ok.sidecarOk != null ? ok.sidecarOk : null,
      lastFailure: (!healthy && fail) ? { stage: fail.stage || null, exitCode: fail.exitCode ?? null, ts: fail.ts || null } : null,
      integrity,
      masterIndex: buildMasterIndexHealth(),
    };
  } catch {
    return { verdict: "unknown", lastRegenAgeH: null, graphMB: null, pendingCount: null, sidecarOk: null, lastFailure: null, integrity: null, masterIndex: { verdict: "unknown" } };
  }
}

// ─── master-index sidecar freshness (sierra domain) ──────────────────
// loadGraph (master-index-search-lib) gates the search sidecar on its STORED
// sourceMtimeMs >= the live graph's mtime; a stale sidecar silently drops
// fleet-wide master-index search to the architecture-graph fallback. The
// dashboard health panel was blind to this. Mirror loadGraph's exact rule
// cheaply: stat the graph + partial-read the sidecar HEAD (sourceMtimeMs sits
// in the first ~150 bytes, before the 145 MB nodes[]/inverted{} payload — so
// fd+readSync 512 bytes, NEVER readFileSync the whole file). Fully fail-soft.
function buildMasterIndexHealth() {
  try {
    const graphPath = path.join(VIZ_DIR, "system-graph.json");
    const sidecarPath = path.join(VIZ_DIR, "system-graph-index.json");
    let graphMtimeMs;
    try { graphMtimeMs = fs.statSync(graphPath).mtimeMs; }
    catch { return { verdict: "unknown", reason: "graph-missing" }; }
    // Producer-side breadcrumb (build-graph-index.mjs writes it on success +
    // failure). A FAILED last rebuild means the on-disk sidecar is an older
    // one and the cause is actionable (OOM vs schema-drift vs disk) — surface
    // it distinctly from old-graph staleness, which the mtime gate below only
    // shows as a symptom. Most-recent attempt wins (overwritten each run).
    const bc = readJsonSafe(path.join(VIZ_DIR, ".last-index-build.json"));
    if (bc && bc.ok === false) {
      return { verdict: "failed", lastAttemptAt: bc.ts || null, error: bc.error || null, hint: "node scripts/build-graph-index.mjs" };
    }
    let head = "";
    try {
      const fd = fs.openSync(sidecarPath, "r");
      try { const buf = Buffer.alloc(512); const n = fs.readSync(fd, buf, 0, 512, 0); head = buf.toString("utf8", 0, n); }
      finally { fs.closeSync(fd); }
    } catch { return { verdict: "missing", reason: "sidecar-absent", hint: "node scripts/build-graph-index.mjs" }; }
    // NTFS mtimeMs carries sub-ms fraction; the sidecar stores the full float.
    // Capture the decimal too — a bare \d+ floors it and reports false-STALE by
    // a fraction of a ms immediately after a clean rebuild (loadGraph itself is
    // immune: it JSON.parses the full double).
    const mm = head.match(/"sourceMtimeMs"\s*:\s*(\d+(?:\.\d+)?)/);
    const gm = head.match(/"generatedAt"\s*:\s*"([^"]+)"/);
    const sourceMtimeMs = mm ? Number(mm[1]) : 0;
    const fresh = sourceMtimeMs >= graphMtimeMs;
    const behindMs = fresh ? 0 : Math.max(0, graphMtimeMs - sourceMtimeMs);
    return {
      verdict: fresh ? "fresh" : "stale",
      behindH: behindMs ? Math.round((behindMs / 3.6e6) * 10) / 10 : 0,
      sidecarBuiltAt: gm ? gm[1] : null,
      hint: fresh ? null : "node scripts/build-graph-index.mjs",
    };
  } catch {
    return { verdict: "unknown", reason: "error" };
  }
}

// ─── graph utilization breakdown (sierra "utilization" mandate) ──────
// Surfaces the hub/sink/orphan/ghost classification from the awareness
// snapshot (precomputed ~4 KB markdown — NEVER the 695 MB graph). The orphan
// count is the built-but-unwired punch list (fleet-wide wiring signal); ghost
// is dead-code / unrealized-roadmap. Carries the snapshot's age so stale data
// is visible. Fully fail-soft (returns null on any miss).
function buildUtilization() {
  try {
    const p = path.join(REPO_ROOT, "state/shared/AWARENESS-SNAPSHOT.md");
    let md, ageH = null;
    try {
      md = fs.readFileSync(p, "utf8");
      ageH = Math.round(((Date.now() - fs.statSync(p).mtimeMs) / 3.6e6) * 10) / 10;
    } catch { return null; }
    const num = (s) => Number(String(s).replace(/,/g, ""));
    const scan = md.match(/Scanned\s*\*\*([\d,]+)\*\*\s*of\s*\*\*([\d,]+)\*\*/);
    const rows = {};
    for (const m of md.matchAll(/\|\s*\*\*(hub|sink|orphan|ghost)\*\*\s*\|\s*([\d,]+)\s*\|/g)) {
      rows[m[1]] = num(m[2]);
    }
    if (!scan && Object.keys(rows).length === 0) return null;
    // Top-orphan NAMES (actionable wiring punch list, not just a count) from the
    // "## Top orphans" section. Rows: `- [L7/built] **Name** (in N · out M)`.
    const topOrphans = [];
    const orphanSec = md.match(/## Top orphans[^\n]*\n([\s\S]*?)(?:\n## |$)/);
    if (orphanSec) {
      for (const m of orphanSec[1].matchAll(/^- \[([^\]]+)\]\s*\*\*([^*]+)\*\*/gm)) {
        topOrphans.push({ layer: m[1], name: m[2].trim() });
        if (topOrphans.length >= 10) break;
      }
    }
    return {
      scanned: scan ? num(scan[1]) : null,
      total: scan ? num(scan[2]) : null,
      hub: rows.hub ?? null,
      sink: rows.sink ?? null,
      orphan: rows.orphan ?? null,
      ghost: rows.ghost ?? null,
      topOrphans,
      ageH,
    };
  } catch { return null; }
}

function buildSnapshot() {
  const build = readJsonSafe(path.join(REPO_ROOT, "state/shared/BUILD_STATE.json"));
  const slots = readJsonSafe(path.join(REPO_ROOT, "state/shared/chat-slots.json"));
  const briefing = readJsonSafe(path.join(VIZ_DIR, "EXECUTIVE-BRIEFING.json"));
  const scrutiny = readJsonSafe(path.join(REPO_ROOT, "mcp-server/data/state/SCRUTINY_LEDGER.json"));

  const now = Date.now();
  const ageMin = (iso) => iso ? Math.round((now - new Date(iso).getTime()) / 60000) : null;

  const fleet = [];
  if (slots && slots.slots) {
    for (const [name, s] of Object.entries(slots.slots)) {
      if (!s || typeof s !== "object") continue;
      const age = ageMin(s.lastHeartbeat);
      let status = "idle";
      if (s.chatId) {
        if (age === null) status = "unknown";
        else if (age <= 5) status = "live";
        else if (age <= 15) status = "stale";
        else status = "dead";
      }
      fleet.push({
        slot: name,
        chatId: s.chatId || null,
        topic: s.topic || null,
        activity: s.activity || null,
        branch: s.branch || null,
        ageMin: age,
        status,
      });
    }
    fleet.sort((a, b) => a.slot.localeCompare(b.slot));
  }

  let commits = [];
  try {
    const r = spawnSync("git", ["log", "--pretty=format:%H|%s|%ar|%an", "-15"], {
      cwd: REPO_ROOT, encoding: "utf8", timeout: 10000,
    });
    if (r.status === 0 && r.stdout) {
      commits = r.stdout.split("\n").filter(Boolean).map((line) => {
        const [hash, subject, ago, author] = line.split("|");
        return { hash: (hash || "").slice(0, 9), subject: subject || "", ago: ago || "", author: author || "" };
      });
    }
  } catch { /* git unavailable — empty */ }

  let scrutinyRecent = [];
  if (scrutiny && typeof scrutiny === "object") {
    const entries = scrutiny.entries || scrutiny;
    if (entries && typeof entries === "object") {
      scrutinyRecent = Object.entries(entries)
        .map(([id, e]) => ({
          sessionId: (id || "").slice(0, 12),
          opus: e?.opusReviewed === "pass" ? "P" : e?.opusReviewed === "fail" ? "F" : "-",
          claude: (e?.claudeReviewed || e?.geminiReviewed || e?.opusBReviewed) === "pass" ? "P" :
                  (e?.claudeReviewed || e?.geminiReviewed || e?.opusBReviewed) === "fail" ? "F" : "-",
          codex: (e?.codexReviewed || e?.analystReviewed) === "pass" ? "P" :
                 (e?.codexReviewed || e?.analystReviewed) === "fail" ? "F" : "-",
          updated: e?.updatedAt || e?.completedAt || null,
          cleared: !!(e?.cleared || ((e?.opusReviewed === "pass") && (e?.claudeReviewed === "pass" || e?.geminiReviewed === "pass"))),
        }))
        .filter(e => e.updated)
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
        .slice(0, 8);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    build: build ? {
      headline: build.headline || {},
      topUnwiredDomains: Array.isArray(build.NEEDS_WIRING?.top_domains) ? build.NEEDS_WIRING.top_domains : [],
      sampleUnwiredEngines: Array.isArray(build.NEEDS_WIRING?.sample_engines) ? build.NEEDS_WIRING.sample_engines.slice(0, 8) : [],
      staleMilestones: Array.isArray(build.STALE_MILESTONES) ? build.STALE_MILESTONES.slice(0, 6) : [],
      needsFrontend: Array.isArray(build.NEEDS_FRONTEND) ? build.NEEDS_FRONTEND : [],
    } : null,
    fleet: {
      count: fleet.length,
      live: fleet.filter(f => f.status === "live").length,
      stale: fleet.filter(f => f.status === "stale").length,
      dead: fleet.filter(f => f.status === "dead").length,
      idle: fleet.filter(f => f.status === "idle").length,
      slots: fleet,
    },
    briefing: briefing ? {
      title: briefing.title || "PRISM",
      headline: briefing.headline || briefing.metrics || {},
      generatedAt: briefing.generatedAt || null,
    } : null,
    scrutiny: {
      recent: scrutinyRecent,
      totalOpen: scrutinyRecent.filter(s => !s.cleared).length,
      totalCleared: scrutinyRecent.filter(s => s.cleared).length,
    },
    commits,
    vizHealth: buildVizHealth(),
    utilization: buildUtilization(),
  };
}

// ─── Graph snapshot for 3D viewer ─────────────────────────────────────
// system-graph-index.json is ~145 MB / 283k nodes. We can't ship that to a
// browser; we downsample server-side, cached, by-layer-stratified random.
// Edges live in the 546 MB monolith; first viewer iter is point cloud only.

let _graphCache = null; // { mtime, snapshot }

// Node-adjacency sidecar (built by scripts/build-viz-adjacency.mjs from the 695MB
// merged graph): ~81MB, capped top-K in/out neighbors per node. JSON.parse-safe
// (well under the V8 string cap). Loaded once, cached by mtime — only on first
// /api/node-neighbors request, so it never slows the dashboard / graph-snapshot.
let _adjCache = null; // { mtime, data }
function loadAdjacency() {
  const p = path.join(VIZ_DIR, "node-adjacency.json");
  let st;
  try { st = fs.statSync(p); } catch { return null; }
  if (_adjCache && _adjCache.mtime === st.mtimeMs) return _adjCache.data;
  let data;
  try { data = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
  _adjCache = { mtime: st.mtimeMs, data };
  return data;
}

function buildGraphSnapshot(limit) {
  const graphPath = path.join(VIZ_DIR, "system-graph-index.json");
  let st;
  try { st = fs.statSync(graphPath); }
  catch { return { error: "system-graph-index.json missing — run scripts/generate-system-viz.mjs" }; }

  const cacheKey = st.mtimeMs + ":" + limit;
  if (_graphCache && _graphCache.cacheKey === cacheKey) return _graphCache.snapshot;

  // Parse only the nodes array — wikiEntries/memoryEntries fields balloon to
  // dozens of MB per node, so we drop them and keep id/label/layer/status/info.
  const raw = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  const allNodes = raw.nodes || [];
  const byLayer = new Map();
  for (const n of allNodes) {
    const L = n.layer || "L?";
    if (!byLayer.has(L)) byLayer.set(L, []);
    byLayer.get(L).push(n);
  }

  // Stratified sample: target `limit` total, weighted by layer size so the
  // big layers (L11 file leaves, L8 wiki) don't drown out small ones (L0-L4).
  const layerKeys = Array.from(byLayer.keys()).sort();
  const totalNodes = allNodes.length;
  const sampled = [];
  for (const L of layerKeys) {
    const bucket = byLayer.get(L);
    const share = Math.max(20, Math.round(limit * (bucket.length / totalNodes)));
    const take = Math.min(share, bucket.length);
    // Deterministic stride sample — same input → same output across requests.
    const stride = Math.max(1, Math.floor(bucket.length / take));
    for (let i = 0; i < bucket.length && sampled.length < limit; i += stride) {
      const n = bucket[i];
      // Keep a few Obsidian note paths so the 3D viewer side-panel can deep-link
      // into the brain (graph = space, Obsidian = detail). Bounded list per node
      // (top-3 wiki + top-2 mem) — we still drop the full wikiEntries/memoryEntries
      // arrays (dozens of MB); `note` stays scalar for back-compat.
      const k = n.knowledge || {};
      const topPath = (e) => (typeof e === "string" ? e : (e && e.path) || null);
      const wiki = (Array.isArray(k.wikiEntries) ? k.wikiEntries : []).map(topPath).filter(Boolean);
      const mem = (Array.isArray(k.memoryEntries) ? k.memoryEntries : []).map(topPath).filter(Boolean);
      sampled.push({
        id: n.id,
        label: n.label || n.id,
        layer: n.layer,
        status: n.status || "unknown",
        info: n.info || "",
        note: wiki[0] || mem[0] || null,                        // top note path (back-compat)
        noteCount: wiki.length + mem.length,                    // total wiki+mem notes backing this node
        notes: { wiki: wiki.slice(0, 3), mem: mem.slice(0, 2) }, // a few clickable notes for the side-panel
      });
    }
  }

  // Layer summary — counts BEFORE sampling so the UI can show "showing N of M".
  const layerSummary = {};
  for (const L of layerKeys) layerSummary[L] = byLayer.get(L).length;

  const statusCounts = {};
  for (const n of allNodes) {
    const s = n.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: raw.generatedAt,
    totalNodes,
    sampledNodes: sampled.length,
    layerSummary,
    statusCounts,
    nodes: sampled,
  };
  _graphCache = { cacheKey, snapshot };
  return snapshot;
}

function missingProducer(res, name, producer) {
  send(res, 404,
    `not generated: ${name}\nproducer: ${producer}\nrun: node ${producer} from H:/prism\n`,
    "text/plain; charset=utf-8",
  );
}

function safeJoin(rel) {
  const abs = path.resolve(VIZ_DIR, "." + (rel.startsWith("/") ? rel : "/" + rel));
  if (!abs.startsWith(VIZ_DIR + path.sep) && abs !== VIZ_DIR) return null;
  return abs;
}

function handlePost(req, res, url) {
  if (url === "/regenerate") {
    const args = [path.join(REPO_ROOT, "scripts", "regen-viz.mjs")];
    const child = spawn(process.execPath, args, { cwd: REPO_ROOT });
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" });
    child.stdout.on("data", (d) => res.write(d));
    child.stderr.on("data", (d) => res.write(d));
    child.on("close", (code) => res.end(`\n[regenerate exit ${code}]\n`));
    child.on("error", (e) => res.end(`\n[regenerate spawn error: ${e.message}]\n`));
    return;
  }
  send(res, 404, `POST endpoint not found: ${url}\n`);
}

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  let url;
  try { url = new URL(req.url, `http://${req.headers.host || HOST}`).pathname; }
  catch { return send(res, 400, "bad url\n"); }

  if (method === "POST") return handlePost(req, res, url);
  if (method !== "GET" && method !== "HEAD") return send(res, 405, "method not allowed\n");

  switch (url) {
    case "/":
    case "/brain":
    case "/dashboard":
    case "/dashboard.html":
      return sendFile(req, res, path.join(VIZ_DIR, "dashboard.html"));
    case "/2d":
    case "/simple":
      return missingProducer(res, "system-viz.html (2D fallback)", "scripts/build-system-viz-livediff.mjs");
    case "/briefing":
      return sendFile(req, res, path.join(VIZ_DIR, "EXECUTIVE-BRIEFING.md"), "text/markdown; charset=utf-8");
    case "/briefing.json":
      return sendFile(req, res, path.join(VIZ_DIR, "EXECUTIVE-BRIEFING.json"));
    case "/system-graph.json":
      return sendFile(req, res, path.join(VIZ_DIR, "system-graph.json"));
    case "/system-graph-index.json":
      return sendFile(req, res, path.join(VIZ_DIR, "system-graph-index.json"));
    case "/system-graph-normalized.json":
      return sendFile(req, res, path.join(VIZ_DIR, "system-graph-normalized.json"));
    case "/system-graph-light.json":
      return missingProducer(res, "system-graph-light.json", "scripts/generate-system-viz.mjs --light");
    case "/system-graph-skeleton.json":
      return missingProducer(res, "system-graph-skeleton.json", "scripts/generate-system-viz.mjs --skeleton");
    case "/file-claims":
      return missingProducer(res, "file-claims overlay", "scripts/system-viz-fleet-awareness.mjs");
    case "/healthz":
      return send(res, 200, JSON.stringify({ ok: true, port: PORT, ts: new Date().toISOString() }) + "\n", "application/json");
    case "/api/snapshot": {
      try {
        const snap = buildSnapshot();
        return send(res, 200, JSON.stringify(snap), "application/json");
      } catch (e) {
        return send(res, 500, JSON.stringify({ error: String(e && e.message || e) }), "application/json");
      }
    }
    case "/api/graph-snapshot": {
      try {
        const u = new URL(req.url, `http://${req.headers.host || HOST}`);
        const limit = Math.max(100, Math.min(20000, Number(u.searchParams.get("limit")) || 5000));
        const snap = buildGraphSnapshot(limit);
        return send(res, 200, JSON.stringify(snap), "application/json");
      } catch (e) {
        return send(res, 500, JSON.stringify({ error: String(e && e.message || e) }), "application/json");
      }
    }
    case "/api/node-neighbors": {
      // Blast-radius for a clicked node: its capped in/out neighbors from the
      // adjacency sidecar. The viewer's per-engine nodes have edges only in the
      // 695MB graph, so this is the only cheap way to surface them in the browser.
      try {
        const u = new URL(req.url, `http://${req.headers.host || HOST}`);
        const id = u.searchParams.get("id");
        if (!id) return send(res, 400, JSON.stringify({ error: "missing ?id=" }), "application/json");
        const adjData = loadAdjacency();
        if (!adjData) return missingProducer(res, "node-adjacency.json", "scripts/build-viz-adjacency.mjs");
        const a = adjData.adjacency && adjData.adjacency[id];
        return send(res, 200, JSON.stringify({
          id,
          found: !!a,
          cappedAt: adjData.cappedAt != null ? adjData.cappedAt : null,
          generatedAt: adjData.generatedAt || null,
          in: a ? a.in : [],
          out: a ? a.out : [],
        }), "application/json");
      } catch (e) {
        return send(res, 500, JSON.stringify({ error: String(e && e.message || e) }), "application/json");
      }
    }
    case "/3d":
    case "/viz":
      return sendFile(req, res, path.join(VIZ_DIR, "viz3d.html"));
    default: {
      const abs = safeJoin(url);
      if (!abs) return send(res, 403, "path traversal blocked\n");
      return sendFile(req, res, abs);
    }
  }
});

server.on("clientError", (_err, sock) => sock.destroy());

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `PRISM system viz on http://${HOST}:${PORT}/  (dashboard at / · /briefing exec-audit · graph: /system-graph.json /system-graph-index.json · POST /regenerate)\n`,
  );
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT",  () => server.close(() => process.exit(0)));
