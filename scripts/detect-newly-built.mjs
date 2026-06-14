#!/usr/bin/env node
/**
 * detect-newly-built.mjs — detect new/wired/needs-wiring nodes since last snapshot.
 *
 * Compares the current system-graph.json against a saved baseline
 * (state/shared/system-viz/system-graph.previous.json). Emits:
 *
 *   state/shared/system-viz/newly-built.json
 *
 * Containing per-node entries:
 *   { kind: "added"|"wired"|"needs-wiring", nodeId, label, layer, addedAt, note }
 *
 * Plus a "newly built" feed that the viewer renders in a "What's New" panel.
 *
 * Run after generate-system-viz.mjs and merge-augmentations.mjs. The git
 * post-commit hook chains all three together so every commit auto-updates
 * the viz with fresh diff state.
 *
 * On first run there is no previous snapshot — script writes a baseline
 * silently and emits an empty diff.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const VIZ_DIR   = path.join(ROOT, "state", "shared", "system-viz");
const CUR_PATH  = path.join(VIZ_DIR, "system-graph.json");
const PREV_PATH = path.join(VIZ_DIR, "system-graph.previous.json");
const OUT_PATH  = path.join(VIZ_DIR, "newly-built.json");

if (!fs.existsSync(CUR_PATH)) {
  console.error(`current graph missing: ${CUR_PATH}`);
  process.exit(2);
}

// U-DETECT-NEWLY-BUILT-OVERSIZE-GUARD (2026-05-27, slot:india substrate-audit
// follow-up). The system-graph.json has grown past V8's ~512MB single-string
// limit on Win32, causing fs.readFileSync(..., "utf8") → JSON.parse to throw
// `ERR_STRING_TOO_LONG` after ~8min — failing the entire regen-viz pipeline.
// detect-newly-built is downstream/advisory (a What's-New diff feed), not
// load-bearing. Per Karpathy R12 + R3: degrade gracefully, don't fail the
// upstream pipeline. The upstream graph-bloat fix is a separate unit
// (see U-REGEN-VIZ-MERGE-FAILLOUD / heap-stream-merge follow-ups).
const MAX_SAFE_GRAPH_BYTES = Number(process.env.PRISM_DETECT_NEWLY_BUILT_MAX_BYTES || 400 * 1024 * 1024);

function readGraphSafe(p) {
  const sizeBytes = fs.statSync(p).size;
  if (sizeBytes > MAX_SAFE_GRAPH_BYTES) {
    return { ok: false, reason: "oversize", sizeBytes };
  }
  try {
    return { ok: true, doc: JSON.parse(fs.readFileSync(p, "utf8")) };
  } catch (err) {
    return { ok: false, reason: err?.code === "ERR_STRING_TOO_LONG" ? "string-too-long" : (err?.code || "parse-error"), sizeBytes };
  }
}

const curRead = readGraphSafe(CUR_PATH);
if (!curRead.ok) {
  // Degraded path: emit a marker, write nothing destructive, exit 0 so the
  // upstream regen-viz pipeline continues. R12 fail-loud via the emitted
  // file's `degraded` field — operators see it in the viewer's What's-New panel.
  const degraded = {
    generatedAt: new Date().toISOString(),
    sinceCommit: "unknown",
    degraded: true,
    reason: curRead.reason,
    sizeBytes: curRead.sizeBytes,
    maxSafeBytes: MAX_SAFE_GRAPH_BYTES,
    note: `current graph ${curRead.sizeBytes} bytes exceeds the ${MAX_SAFE_GRAPH_BYTES} byte single-string parse limit; diff skipped this run. Fix: reduce graph size upstream (merge-augmentations stream rewrite) or set PRISM_DETECT_NEWLY_BUILT_MAX_BYTES higher if the host has enough RAM.`,
    totals: { added: 0, wired: 0, needsWiring: 0, totalNew: 0 },
    entries: [],
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(degraded, null, 2));
  console.error(`[detect-newly-built] DEGRADED: graph oversize (${curRead.sizeBytes} > ${MAX_SAFE_GRAPH_BYTES} bytes / reason=${curRead.reason}); emitted degraded marker + exit 0 to unblock regen-viz pipeline`);
  process.exit(0);
}
const cur = curRead.doc;

let prev = null;
if (fs.existsSync(PREV_PATH)) {
  const prevRead = readGraphSafe(PREV_PATH);
  if (prevRead.ok) prev = prevRead.doc;
  // If prev is oversize we silently fall back to baseline-establish branch
  // below (prev = null); operators see the `baseline established` message
  // not a hard failure.
}

const now = new Date().toISOString();
const entries = [];
let totals = { added: 0, wired: 0, needsWiring: 0, totalNew: 0 };

let lastCommit = "unknown";
try {
  lastCommit = execSync("git log -1 --format=%h", {
    cwd: ROOT, stdio: ["ignore", "pipe", "ignore"],
  }).toString().trim();
} catch { /* not a git repo */ }

if (!prev) {
  // First run — establish baseline silently
  fs.writeFileSync(PREV_PATH, JSON.stringify(cur));
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    generatedAt: now,
    sinceCommit: lastCommit,
    note: "baseline established; no diff on first run",
    totals,
    entries: [],
  }, null, 2));
  console.log(`baseline established at ${PREV_PATH}; no diff to emit`);
  process.exit(0);
}

// ---- DIFF DETECTION ----
const prevById = new Map(prev.nodes.map(n => [n.id, n]));
const curById  = new Map(cur.nodes.map(n => [n.id, n]));

// Newly-added nodes (existed in current, not in previous)
for (const [id, n] of curById) {
  if (!prevById.has(id)) {
    entries.push({
      kind: "added",
      nodeId: id,
      label: (n.label ?? id).split("\n")[0],
      layer: n.layer,
      subgroup: n.subgroup,
      addedAt: now,
      note: `New ${n.layer} node — ${n.subgroup ?? "main"}`,
    });
    totals.added++;
    if (n.layer === "L5" && n.subgroup === "unwired") {
      entries.push({
        kind: "needs-wiring",
        nodeId: id,
        label: (n.label ?? id).split("\n")[0],
        layer: n.layer,
        addedAt: now,
        suggestedDispatchers: n.suggestedDispatchers ?? [],
        note: `Unwired engine domain — suggested targets: ${(n.suggestedDispatchers ?? []).join(", ") || "none"}`,
      });
      totals.needsWiring++;
    }
  }
}

// Status flips: from unwired -> wired = newly wired (a win!)
for (const [id, cn] of curById) {
  const pn = prevById.get(id);
  if (!pn) continue;
  if (pn.subgroup === "unwired" && cn.subgroup === "wired") {
    entries.push({
      kind: "wired",
      nodeId: id,
      label: (cn.label ?? id).split("\n")[0],
      layer: cn.layer,
      addedAt: now,
      note: `Wired up — ${cn.count ?? "?"} engines now reachable through dispatchers`,
    });
    totals.wired++;
  }
  // Also: still unwired but engine count grew = MORE engines now need wiring
  if (cn.subgroup === "unwired" && pn.subgroup === "unwired") {
    const prevCount = pn.count ?? 0;
    const curCount = cn.count ?? 0;
    if (curCount > prevCount) {
      entries.push({
        kind: "needs-wiring",
        nodeId: id,
        label: (cn.label ?? id).split("\n")[0],
        layer: cn.layer,
        addedAt: now,
        suggestedDispatchers: cn.suggestedDispatchers ?? [],
        note: `Domain grew by ${curCount - prevCount} engines — still unwired (${(cn.suggestedDispatchers ?? []).join(", ") || "no suggestion"})`,
      });
      totals.needsWiring++;
    }
  }
}

totals.totalNew = entries.length;

// Headline-level deltas (overall counts movement)
const headlineDelta = {
  builtDelta: (cur.meta?.headline?.built ?? 0) - (prev.meta?.headline?.built ?? 0),
  unwiredDelta: (cur.meta?.headline?.unwired ?? 0) - (prev.meta?.headline?.unwired ?? 0),
  pendingFEDelta: (cur.meta?.headline?.pendingFE ?? 0) - (prev.meta?.headline?.pendingFE ?? 0),
  driftDelta: (cur.meta?.headline?.drift ?? 0) - (prev.meta?.headline?.drift ?? 0),
};

fs.writeFileSync(OUT_PATH, JSON.stringify({
  generatedAt: now,
  sinceCommit: lastCommit,
  prevGeneratedAt: prev.generatedAt,
  totals,
  headlineDelta,
  entries,
}, null, 2));

// Update baseline for next run
fs.writeFileSync(PREV_PATH, JSON.stringify(cur));

console.log(`detected ${entries.length} change(s) since last snapshot:`);
console.log(`  added: ${totals.added}  wired: ${totals.wired}  needs-wiring: ${totals.needsWiring}`);
console.log(`  built delta: ${headlineDelta.builtDelta >= 0 ? "+" : ""}${headlineDelta.builtDelta}  unwired delta: ${headlineDelta.unwiredDelta >= 0 ? "+" : ""}${headlineDelta.unwiredDelta}`);
console.log(`  baseline updated at ${PREV_PATH}`);
