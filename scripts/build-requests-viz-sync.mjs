#!/usr/bin/env node
// build-requests-viz-sync.mjs — drift-checker for USER-BUILD-REQUESTS-LOG.md
//
// Re-queries system-viz for every actionable row in the build-requests log and
// flags rows whose tagged `viz status` no longer matches the live graph — e.g.
// a row tagged `needs-creation` that has since been built (now `existing-node`).
// Keeps the log's hand-entered column honest instead of letting it rot.
//
// Modes:  (default) human report  ·  --json machine output
// Exit:   0 = in sync  ·  1 = drift detected  ·  2 = measurement error
//
// Pure helpers (parseRequestRows / extractKeywords / classifyHits /
// detectDrift) are exported for unit testing; main() is gated on isMain.
//
// Author: AWARENESS-MS0 follow-on, 2026-05-17 lima

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// ROOT derived from this script's location (scripts/<file> → repo root) so the
// tool works on any checkout, not just H:/prism.
const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const LOG = path.join(ROOT, "state/shared/USER-BUILD-REQUESTS-LOG.md");
const VIZ_QUERY = path.join(ROOT, "scripts/system-viz-query.mjs");
const VALID_STATUSES = ["existing-node", "ghost-node", "needs-creation"];
const STOPWORDS = new Set(["the", "and", "for", "with", "into", "that", "this",
  "from", "all", "can", "make", "add", "improve", "build", "want", "log",
  "request", "operator", "intent", "system", "prism", "node", "nodes"]);
const MIN_KEYWORD_LEN = 4;
const MAX_KEYWORDS = 4;
const VIZ_TIMEOUT_MS = 8000;

// ---- pure helpers --------------------------------------------------------

// Parse the markdown tables. A row is actionable only when its date cell is a
// real YYYY-MM-DD (placeholder rows like `_pre-log_` / `_open backlog_` are
// skipped) and its request cell is non-empty.
export function parseRequestRows(md) {
  const rows = [];
  let section = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)/);
    if (h) { section = h[1].trim(); continue; }
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    if (cells.length < 4) continue;
    const [date, request, vizStatus, status] = cells;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; // skip header + placeholder rows
    if (!request) continue;
    rows.push({ section, date, request, vizStatus, status });
  }
  return rows;
}

// A row is terminal (no drift check needed) when its Status cell says shipped.
export function isTerminal(row) {
  return /shipped|✅/i.test(row.status || "");
}

export function extractKeywords(request) {
  const words = String(request).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (w.length < MIN_KEYWORD_LEN || STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

// Map system-viz-query `find` stdout to a status. Verified against the real
// 2026-05-17 output format: a header `Found N node(s) matching "...":` then
// per-node result lines `  L<layer>/<subgroup>  <node-id>  <label>`. Ghost
// nodes are identified by their NODE-ID starting with `ghost.` (e.g.
// `ghost.priority.*`, `ghost.ms.*`) — NOT by any layer/subgroup token, which
// vary too widely to enumerate. 0 hits => needs-creation; every hit a
// ghost.* id => ghost-node; any non-ghost id => existing-node.
export function classifyHits(stdout) {
  const text = String(stdout || "");
  const m = text.match(/Found\s+(\d+)\s+node/i);
  const count = m ? Number(m[1]) : 0;
  if (count === 0) return "needs-creation";
  const ids = [];
  for (const line of text.split(/\r?\n/)) {
    const mm = line.match(/^\s+L\S+\s+(\S+)/);
    if (mm) ids.push(mm[1]);
  }
  if (!ids.length) return "existing-node"; // hits counted but lines unparsed — conservative
  return ids.every(id => id.startsWith("ghost.")) ? "ghost-node" : "existing-node";
}

// Drift = the row's tagged viz-status disagrees with the live graph, AND the
// row is not terminal. A terminal (shipped) row is never drift regardless.
export function detectDrift(row, currentStatus) {
  if (isTerminal(row)) return { drift: false, reason: "terminal (shipped)" };
  const tagged = (row.vizStatus || "").toLowerCase();
  if (!VALID_STATUSES.includes(tagged)) {
    return { drift: false, reason: `untracked tag '${row.vizStatus}' — skipped` };
  }
  if (tagged === currentStatus) return { drift: false, reason: "in sync" };
  return {
    drift: true,
    reason: `tagged '${tagged}' but graph now says '${currentStatus}'`,
    tagged, current: currentStatus,
  };
}

// ---- impure glue ---------------------------------------------------------

function queryViz(keywords) {
  if (!keywords.length) return { ok: false, status: "needs-creation", note: "no keywords" };
  const res = spawnSync(process.execPath, [VIZ_QUERY, "find", keywords.join(" ")],
    { encoding: "utf8", timeout: VIZ_TIMEOUT_MS });
  if (res.status !== 0 || typeof res.stdout !== "string") {
    return { ok: false, status: null, note: `viz-query failed (${res.status})` };
  }
  return { ok: true, status: classifyHits(res.stdout), note: "" };
}

function main() {
  const args = new Set(process.argv.slice(2));
  let md;
  try { md = fs.readFileSync(LOG, "utf8"); }
  catch { console.error(`[build-requests-viz-sync] cannot read ${LOG}`); process.exit(2); }

  const rows = parseRequestRows(md);
  const checked = [];
  let drifted = 0, errors = 0;
  for (const row of rows) {
    if (isTerminal(row)) { checked.push({ row, drift: false, reason: "terminal" }); continue; }
    const q = queryViz(extractKeywords(row.request));
    if (!q.ok && q.status === null) { errors++; checked.push({ row, drift: false, reason: q.note, error: true }); continue; }
    const d = detectDrift(row, q.status);
    if (d.drift) drifted++;
    checked.push({ row, ...d, currentStatus: q.status });
  }

  const result = {
    log: LOG,
    rowsTotal: rows.length,
    rowsChecked: checked.filter(c => !c.error && c.reason !== "terminal").length,
    drifted,
    errors,
    driftRows: checked.filter(c => c.drift).map(c => ({
      date: c.row.date, request: c.row.request, tagged: c.tagged, current: c.current,
    })),
  };

  if (args.has("--json")) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    console.log(`# build-requests-viz-sync · ${new Date().toISOString()}`);
    console.log(`rows: ${result.rowsTotal} · checked: ${result.rowsChecked} · drift: ${drifted} · errors: ${errors}\n`);
    if (drifted) {
      for (const d of result.driftRows) {
        console.log(`DRIFT  [${d.date}] ${d.request}`);
        console.log(`       tagged '${d.tagged}' → graph says '${d.current}' — update the log row\n`);
      }
    } else {
      console.log("All actionable rows in sync with system-viz.");
    }
  }
  process.exit(errors > 0 ? 2 : drifted > 0 ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
