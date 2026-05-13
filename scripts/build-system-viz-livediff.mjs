#!/usr/bin/env node
/**
 * build-system-viz-livediff.mjs — System-Viz Live Diff (CLEANUP-MS0/U-CLEANUP-G19)
 *
 * Hourly comparison of `state/shared/system-viz/system-graph.json` vs its
 * `system-graph.previous.json` sibling (already maintained by the regen
 * pipeline). Surfaces the per-hour delta — nodes added/removed/changed,
 * edges added/removed, and headline-counter deltas (engines, unwired,
 * drift, pending frontends, wiki entries) — as an operator-facing markdown.
 *
 * Read-only / advisory-only. Exit 0 always. Operator sees what just
 * changed in the system without having to diff two 65 MB JSONs by eye.
 *
 * Output:
 *   - state/shared/SYSTEM_VIZ_LIVEDIFF.md   (human)
 *   - state/shared/SYSTEM_VIZ_LIVEDIFF.json (machine)
 *
 * Usage:
 *   node scripts/build-system-viz-livediff.mjs
 *   node scripts/build-system-viz-livediff.mjs --json
 *   node scripts/build-system-viz-livediff.mjs --frozen-time 2026-05-13T22:00:00Z
 *   node scripts/build-system-viz-livediff.mjs --current <path> --previous <path>
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-G19.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, isAbsolute as pathIsAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

// Repo root derived from the script's own location so the script behaves
// correctly when run from a forked worktree (e.g. H:/prism-cleanup-g19/),
// per the CLAUDE.md conflict-fork rule. The script lives in <repo>/scripts/
// so the repo root is one directory up.
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_CURRENT = "state/shared/system-viz/system-graph.json";
const DEFAULT_PREVIOUS = "state/shared/system-viz/system-graph.previous.json";
const DEFAULT_OUT_MD = "state/shared/SYSTEM_VIZ_LIVEDIFF.md";
const DEFAULT_OUT_JSON = "state/shared/SYSTEM_VIZ_LIVEDIFF.json";

// Hard ceiling: refuse to process pathologically large files (>250 MB)
// so a runaway regen can't OOM the cron. The current production size is
// ~65 MB so this leaves 4x headroom.
const MAX_GRAPH_BYTES = 250 * 1024 * 1024;

// Top-N truncation knobs for the markdown rendering. Adjust here, not inline.
const SAMPLE_NODES = 20;
const SAMPLE_EDGES = 10;

// Node fields we consider "interesting enough to surface as a change". This
// is intentionally narrow — every node has a hundred attributes and the
// operator only cares about state transitions, not minor cosmetics.
const CHANGE_FIELDS = ["status", "tier", "businessValue"];

// ──────────────────────────────────────────────────────────────────────
// argv parsing
// ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    json: false,
    frozenTime: null,
    current: null,
    previous: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--frozen-time") args.frozenTime = argv[++i];
    else if (a === "--current") args.current = argv[++i];
    else if (a === "--previous") args.previous = argv[++i];
  }
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────
// I/O
// ──────────────────────────────────────────────────────────────────────

export function loadGraph(absPath) {
  if (!existsSync(absPath)) {
    return { ok: false, reason: `file not found: ${absPath}` };
  }
  let st;
  try {
    st = statSync(absPath);
  } catch (err) {
    return { ok: false, reason: `stat failed: ${String(err && err.message || err)}` };
  }
  if (st.size > MAX_GRAPH_BYTES) {
    return { ok: false, reason: `file too large: ${st.size} bytes > ${MAX_GRAPH_BYTES}` };
  }
  let parsed;
  try {
    const raw = readFileSync(absPath, "utf8");
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, reason: `parse failed: ${String(err && err.message || err)}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "graph root is not an object" };
  }
  return { ok: true, graph: parsed, bytes: st.size, mtime: st.mtimeMs };
}

// ──────────────────────────────────────────────────────────────────────
// Diff helpers — pure functions
// ──────────────────────────────────────────────────────────────────────

function nodeKey(n) {
  // Undefined / null id silently disappeared from buildIndex (k != null guard) before;
  // synthesize a stable fallback so missing-id nodes still surface in added/removed counts.
  if (n.id == null) return `__noid:${n.layer || "L?"}:${n.label || "?"}`;
  return typeof n.id === "string" ? n.id : JSON.stringify(n.id);
}

function edgeKey(e) {
  // Edges are identified by (from, to, type). If the type is missing we
  // fall back to "_" so the key is still stable.
  const t = e.type || "_";
  return `${e.from}${e.to}${t}`;
}

function buildIndex(arr, keyFn) {
  const idx = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (k != null && !idx.has(k)) idx.set(k, item);
  }
  return idx;
}

function changedFields(curr, prev) {
  const out = [];
  for (const field of CHANGE_FIELDS) {
    if (curr[field] !== prev[field]) {
      out.push({ field, prev: prev[field] ?? null, curr: curr[field] ?? null });
    }
  }
  return out;
}

export function diffNodes(currentNodes, previousNodes) {
  const cur = Array.isArray(currentNodes) ? currentNodes : [];
  const prv = Array.isArray(previousNodes) ? previousNodes : [];
  const curIdx = buildIndex(cur, nodeKey);
  const prvIdx = buildIndex(prv, nodeKey);
  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, v] of curIdx) {
    if (!prvIdx.has(k)) {
      added.push(v);
      continue;
    }
    const prevNode = prvIdx.get(k);
    const fields = changedFields(v, prevNode);
    if (fields.length > 0) changed.push({ id: k, label: v.label || null, fields });
  }
  for (const [k, v] of prvIdx) {
    if (!curIdx.has(k)) removed.push(v);
  }
  return { added, removed, changed };
}

export function diffEdges(currentEdges, previousEdges) {
  const cur = Array.isArray(currentEdges) ? currentEdges : [];
  const prv = Array.isArray(previousEdges) ? previousEdges : [];
  const curIdx = buildIndex(cur, edgeKey);
  const prvIdx = buildIndex(prv, edgeKey);
  const added = [];
  const removed = [];
  for (const [k, v] of curIdx) if (!prvIdx.has(k)) added.push(v);
  for (const [k, v] of prvIdx) if (!curIdx.has(k)) removed.push(v);
  return { added, removed };
}

/**
 * Headline deltas — diff `meta.counts` + `meta.headline` numeric fields.
 * Anything non-numeric is skipped.
 */
export function diffHeadline(currentMeta, previousMeta) {
  const rows = [];
  function addSection(label, curBag, prevBag) {
    if (!curBag && !prevBag) return;
    const keys = new Set([...Object.keys(curBag || {}), ...Object.keys(prevBag || {})]);
    for (const k of [...keys].sort()) {
      const c = curBag && curBag[k];
      const p = prevBag && prevBag[k];
      if (typeof c !== "number" && typeof p !== "number") continue;
      const cur = typeof c === "number" ? c : 0;
      const prv = typeof p === "number" ? p : 0;
      rows.push({ section: label, key: k, prev: prv, curr: cur, delta: cur - prv });
    }
  }
  addSection("counts", currentMeta && currentMeta.counts, previousMeta && previousMeta.counts);
  addSection("headline", currentMeta && currentMeta.headline, previousMeta && previousMeta.headline);
  return rows;
}

// ──────────────────────────────────────────────────────────────────────
// Layer-bucket breakdown for changes (added/removed counts per layer)
// ──────────────────────────────────────────────────────────────────────

function layerBucket(arr) {
  const buckets = new Map();
  for (const n of arr) {
    const layer = n.layer || "L?";
    buckets.set(layer, (buckets.get(layer) || 0) + 1);
  }
  return buckets;
}

export function buildLayerBreakdown(nodeDiff) {
  const addBuckets = layerBucket(nodeDiff.added);
  const remBuckets = layerBucket(nodeDiff.removed);
  const layers = new Set([...addBuckets.keys(), ...remBuckets.keys()]);
  const rows = [];
  for (const layer of [...layers].sort()) {
    rows.push({
      layer,
      added: addBuckets.get(layer) || 0,
      removed: remBuckets.get(layer) || 0,
    });
  }
  return rows;
}

// ──────────────────────────────────────────────────────────────────────
// Compose the full diff report — pure
// ──────────────────────────────────────────────────────────────────────

// Stable key for sample sort (matches nodeKey/edgeKey identity).
function nodeSortKey(n) { return nodeKey(n); }
function edgeSortKey(e) { return edgeKey(e); }
function changedSortKey(c) { return c.id; }

// Empty payload for ok:false branches — keeps downstream consumer keys present.
function emptyReportShape() {
  return {
    schemaVersion: 1,
    warnings: [],
    stats: {
      nodesCurrent: 0, nodesPrevious: 0, edgesCurrent: 0, edgesPrevious: 0,
      nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0,
      edgesAdded: 0, edgesRemoved: 0,
    },
    headline: [],
    layerBreakdown: [],
    nodesAddedSample: [], nodesRemovedSample: [], nodesChangedSample: [],
    edgesAddedSample: [], edgesRemovedSample: [],
  };
}

export function composeDiffReport({ current, previous, currentMeta, previousMeta, generatedAt }) {
  // Schema-drift warnings — surfaces "the count is zero because the array was missing"
  // (vs "the count is zero because the graphs are identical"). Operators reading the
  // report on cron see WHY the headline says +0/-0 instead of being silently misled.
  const warnings = [];
  if (current && !Array.isArray(current.nodes)) warnings.push("current.nodes missing or not an array");
  if (previous && !Array.isArray(previous.nodes)) warnings.push("previous.nodes missing or not an array");
  if (current && !Array.isArray(current.edges)) warnings.push("current.edges missing or not an array");
  if (previous && !Array.isArray(previous.edges)) warnings.push("previous.edges missing or not an array");

  const nodeDiff = diffNodes(current && current.nodes, previous && previous.nodes);
  const edgeDiff = diffEdges(current && current.edges, previous && previous.edges);
  const headline = diffHeadline(currentMeta || (current && current.meta), previousMeta || (previous && previous.meta));
  const layerBreakdown = buildLayerBreakdown(nodeDiff);
  // Sort sample arrays by stable key BEFORE slicing — graph reordering upstream
  // would otherwise scramble the sample window and create noise in headline-history diffs.
  const sortedAdded = nodeDiff.added.slice().sort((a, b) => nodeSortKey(a).localeCompare(nodeSortKey(b)));
  const sortedRemoved = nodeDiff.removed.slice().sort((a, b) => nodeSortKey(a).localeCompare(nodeSortKey(b)));
  const sortedChanged = nodeDiff.changed.slice().sort((a, b) => changedSortKey(a).localeCompare(changedSortKey(b)));
  const sortedEdgesAdded = edgeDiff.added.slice().sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));
  const sortedEdgesRemoved = edgeDiff.removed.slice().sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));
  return {
    ok: true,
    schemaVersion: 1,
    generated_at: generatedAt,
    current_generated_at: current && current.generatedAt || null,
    previous_generated_at: previous && previous.generatedAt || null,
    warnings,
    stats: {
      nodesCurrent: Array.isArray(current && current.nodes) ? current.nodes.length : 0,
      nodesPrevious: Array.isArray(previous && previous.nodes) ? previous.nodes.length : 0,
      edgesCurrent: Array.isArray(current && current.edges) ? current.edges.length : 0,
      edgesPrevious: Array.isArray(previous && previous.edges) ? previous.edges.length : 0,
      nodesAdded: nodeDiff.added.length,
      nodesRemoved: nodeDiff.removed.length,
      nodesChanged: nodeDiff.changed.length,
      edgesAdded: edgeDiff.added.length,
      edgesRemoved: edgeDiff.removed.length,
    },
    headline,
    layerBreakdown,
    nodesAddedSample: sortedAdded.slice(0, SAMPLE_NODES).map(slimNode),
    nodesRemovedSample: sortedRemoved.slice(0, SAMPLE_NODES).map(slimNode),
    nodesChangedSample: sortedChanged.slice(0, SAMPLE_NODES),
    edgesAddedSample: sortedEdgesAdded.slice(0, SAMPLE_EDGES).map(slimEdge),
    edgesRemovedSample: sortedEdgesRemoved.slice(0, SAMPLE_EDGES).map(slimEdge),
  };
}

function slimNode(n) {
  return {
    id: nodeKey(n),
    label: n.label || null,
    layer: n.layer || null,
    status: n.status || null,
  };
}

function slimEdge(e) {
  return {
    from: e.from,
    to: e.to,
    type: e.type || null,
    status: e.status || null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Top-level orchestrator (I/O + composition)
// ──────────────────────────────────────────────────────────────────────

// Path resolver — uses Node canonical isAbsolute() (handles drive-letter, POSIX leading-slash,
// and UNC \\server\share paths) instead of the prior heuristic `includes(":")` which misfired
// on relative paths with embedded colons and missed UNC.
function resolveGraphPath(repo, override, fallback) {
  if (!override) return join(repo, fallback);
  return pathIsAbsolute(override) ? override : join(repo, override);
}

export async function buildLiveDiff(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const curPath = resolveGraphPath(repo, opts.current, DEFAULT_CURRENT);
  const prvPath = resolveGraphPath(repo, opts.previous, DEFAULT_PREVIOUS);
  const generatedAt = opts.frozenTime || new Date().toISOString();
  // Retry budget for the previous-side loadGraph — system-viz regen pipeline writes the
  // sibling externally; if we land mid-write, JSON.parse fails. Single retry after a short
  // delay covers the typical 50-200ms regen window. Tests pass retryDelayMs:0 to skip.
  const retryDelayMs = typeof opts.retryDelayMs === "number" ? opts.retryDelayMs : 250;

  const cur = loadGraph(curPath);
  if (!cur.ok) {
    return {
      ok: false,
      reason: `current: ${cur.reason}`,
      generated_at: generatedAt,
      current_path: curPath.replace(/\\/g, "/"),
      previous_path: prvPath.replace(/\\/g, "/"),
      ...emptyReportShape(),
    };
  }
  let prv = loadGraph(prvPath);
  if (!prv.ok && /^parse failed/.test(prv.reason) && retryDelayMs > 0) {
    // Possible mid-write race with the regen pipeline. Single retry.
    await new Promise((r) => setTimeout(r, retryDelayMs));
    prv = loadGraph(prvPath);
  }
  if (!prv.ok) {
    return {
      ok: false,
      reason: `previous: ${prv.reason}`,
      generated_at: generatedAt,
      current_path: curPath.replace(/\\/g, "/"),
      previous_path: prvPath.replace(/\\/g, "/"),
      ...emptyReportShape(),
    };
  }
  const report = composeDiffReport({
    current: cur.graph,
    previous: prv.graph,
    currentMeta: cur.graph && cur.graph.meta,
    previousMeta: prv.graph && prv.graph.meta,
    generatedAt,
  });
  report.current_bytes = cur.bytes;
  report.previous_bytes = prv.bytes;
  report.current_path = curPath.replace(/\\/g, "/");
  report.previous_path = prvPath.replace(/\\/g, "/");
  return report;
}

// ──────────────────────────────────────────────────────────────────────
// Markdown render
// ──────────────────────────────────────────────────────────────────────

export function renderMarkdown(report) {
  if (!report.ok) {
    return `# SYSTEM_VIZ_LIVEDIFF\n\n**ERROR:** ${report.reason}\n\nGenerated: ${report.generated_at}\n`;
  }
  const lines = [];
  lines.push("# System-Viz Live Diff");
  lines.push("");
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Source: \`scripts/build-system-viz-livediff.mjs\``);
  lines.push(`> Current : \`${report.current_path}\` (${report.stats.nodesCurrent} nodes · ${report.stats.edgesCurrent} edges · gen ${report.current_generated_at || "?"})`);
  lines.push(`> Previous: \`${report.previous_path}\` (${report.stats.nodesPrevious} nodes · ${report.stats.edgesPrevious} edges · gen ${report.previous_generated_at || "?"})`);
  lines.push("");
  if (Array.isArray(report.warnings) && report.warnings.length > 0) {
    lines.push("## ⚠ Warnings");
    lines.push("");
    for (const w of report.warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  lines.push("## Headline counters");
  lines.push("");
  if (report.headline.length === 0) {
    lines.push("_No numeric headline fields found in either graph._");
  } else {
    lines.push("| Section | Key | Previous | Current | Δ |");
    lines.push("|---------|-----|---------:|--------:|---:|");
    for (const r of report.headline) {
      const sign = r.delta > 0 ? "+" : "";
      lines.push(`| ${r.section} | \`${r.key}\` | ${r.prev} | ${r.curr} | ${sign}${r.delta} |`);
    }
  }
  lines.push("");
  lines.push("## Nodes");
  lines.push("");
  lines.push(`- Added: **${report.stats.nodesAdded}**`);
  lines.push(`- Removed: **${report.stats.nodesRemoved}**`);
  lines.push(`- Changed (\`status\`/\`tier\`/\`businessValue\`): **${report.stats.nodesChanged}**`);
  lines.push("");
  if (report.nodesAddedSample.length > 0) {
    lines.push("<details><summary>Added (sample)</summary>");
    lines.push("");
    for (const n of report.nodesAddedSample) {
      lines.push(`- \`${n.id}\` [layer=${n.layer}, status=${n.status}] ${n.label ? `— ${n.label}` : ""}`);
    }
    lines.push("</details>");
    lines.push("");
  }
  if (report.nodesRemovedSample.length > 0) {
    lines.push("<details><summary>Removed (sample)</summary>");
    lines.push("");
    for (const n of report.nodesRemovedSample) {
      lines.push(`- \`${n.id}\` [layer=${n.layer}, status=${n.status}] ${n.label ? `— ${n.label}` : ""}`);
    }
    lines.push("</details>");
    lines.push("");
  }
  if (report.nodesChangedSample.length > 0) {
    lines.push("<details><summary>Changed (sample)</summary>");
    lines.push("");
    for (const c of report.nodesChangedSample) {
      const transitions = c.fields.map((f) => `${f.field}:${f.prev}→${f.curr}`).join(", ");
      lines.push(`- \`${c.id}\` — ${transitions}${c.label ? ` — ${c.label}` : ""}`);
    }
    lines.push("</details>");
    lines.push("");
  }
  lines.push("## Edges");
  lines.push("");
  lines.push(`- Added: **${report.stats.edgesAdded}**`);
  lines.push(`- Removed: **${report.stats.edgesRemoved}**`);
  lines.push("");
  if (report.edgesAddedSample.length > 0) {
    lines.push("<details><summary>Added edges (sample)</summary>");
    lines.push("");
    for (const e of report.edgesAddedSample) {
      lines.push(`- \`${e.from}\` → \`${e.to}\` [type=${e.type}, status=${e.status}]`);
    }
    lines.push("</details>");
    lines.push("");
  }
  if (report.edgesRemovedSample.length > 0) {
    lines.push("<details><summary>Removed edges (sample)</summary>");
    lines.push("");
    for (const e of report.edgesRemovedSample) {
      lines.push(`- \`${e.from}\` → \`${e.to}\` [type=${e.type}, status=${e.status}]`);
    }
    lines.push("</details>");
    lines.push("");
  }
  if (report.layerBreakdown.length > 0) {
    lines.push("## Layer breakdown");
    lines.push("");
    lines.push("| Layer | Added | Removed |");
    lines.push("|-------|------:|--------:|");
    for (const r of report.layerBreakdown) lines.push(`| ${r.layer} | ${r.added} | ${r.removed} |`);
    lines.push("");
  }
  lines.push("> Advisory only — added/removed counts surface what changed but not whether the change is good.");
  lines.push("> Cross-reference with `state/shared/BUILD_STATE.md` and `state/shared/MILESTONE_PROGRESS.md` for context.");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Atomic write (same idiom as siblings)
// ──────────────────────────────────────────────────────────────────────

export function writeAtomic(absPath, content) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  // PID + timestamp + 3 random bytes — defends against same-millisecond same-pid collisions
  // (rare but observed in test loops + cron-overlapping-with-manual scenarios).
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, absPath);
  } catch (err) {
    // Best-effort cleanup so a failed write doesn't leave stranded .tmp- residue.
    try { unlinkSync(tmp); } catch { /* tmp may not exist; swallow */ }
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────
// CLI entry
// ──────────────────────────────────────────────────────────────────────

export async function runCli(argv = process.argv, opts = {}) {
  const args = parseArgs(argv);
  const repo = opts.repo || DEFAULT_REPO;
  const report = await buildLiveDiff({
    repo,
    current: args.current || opts.current,
    previous: args.previous || opts.previous,
    frozenTime: args.frozenTime,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const outJson = join(repo, DEFAULT_OUT_JSON);
  const outMd = join(repo, DEFAULT_OUT_MD);
  try {
    writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
    writeAtomic(outMd, renderMarkdown(report));
  } catch (err) {
    process.stderr.write(`build-system-viz-livediff: write failed — ${String(err && err.message || err)}\n`);
    process.exitCode = 0;
  }

  if (report.ok) {
    const s = report.stats;
    process.stdout.write(
      `system-viz-livediff: nodes Δ=+${s.nodesAdded}/-${s.nodesRemoved}/~${s.nodesChanged} · edges Δ=+${s.edgesAdded}/-${s.edgesRemoved}\n`,
    );
  } else {
    process.stdout.write(`system-viz-livediff: not ok — ${report.reason}\n`);
  }
  return report;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  void runCli().catch((err) => {
    process.stderr.write(`build-system-viz-livediff: unhandled — ${String(err && err.stack || err)}\n`);
    process.exitCode = 0;
  });
}
