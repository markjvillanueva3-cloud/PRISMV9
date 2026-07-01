#!/usr/bin/env node
/**
 * system-viz-query — programmatic adapter for the live system graph.
 *
 * Lets rgs / forge / roadmap tools consume system-graph.json without
 * embedding parsing logic. Read-only.
 *
 * Usage:
 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # downstream edges
 *   node scripts/system-viz-query.mjs dispatcher-summary       # categories + counts
 *   node scripts/system-viz-query.mjs coverage-by-domain       # wired-ratio per domain
 *   node scripts/system-viz-query.mjs worktrees                # git worktree fleet grouped by verdict
 *   node scripts/system-viz-query.mjs find <query>             # case-insensitive node search (flat top-K)
 *   node scripts/system-viz-query.mjs subgraph <query>         # CONNECTED neighborhood (how assets relate; no 644MB load)
 *   node scripts/system-viz-query.mjs node-card <id> [<id>..]  # token-cheap read-by-id (no 644MB load)
 *   node scripts/system-viz-query.mjs near <id> [--k N]        # semantic nearest-neighbor by 768d cosine (no graph load)
 *   node scripts/system-viz-query.mjs octopus [<caller>]       # octopus consensus audit summary (no graph load)
 *   node scripts/system-viz-query.mjs headline                 # one-line summary
 *
 * Add --json for machine-readable output (default is human-readable).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph, findInGraph, loadFindCache, sidecarStatus, readGraphMeta } from "./lib/system-viz-graph.mjs";
import { readCards } from "./lib/node-card-read.mjs";
import { nearById, parseNearArgs } from "./lib/node-near-search.mjs";
import { backlinksFor } from "./lib/vault-backlink-read.mjs";
import { summarizeCanvas, canvasNodesForDoc } from "./lib/canvas-read-lib.mjs";
import { retrieveSubgraph } from "./lib/subgraph-retrieve.mjs";
import { readConsensusDecisions, CONSENSUS_DECISIONS_PATH } from "./generate-octopus-consensus-features.mjs";
import { aggregateConsensus, formatConsensus } from "./lib/octopus-consensus-query.mjs";
import { isKnownGraphCmd, planHeapRespawn, respawnWithHeap, GRAPH_USAGE } from "./lib/viz-query-heap-reexec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const cmd = args[0];
const params = args.slice(1).filter(a => a !== "--json");
const wantJson = args.includes("--json");

if (!cmd) {
  console.error("usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|subgraph|node-card|near|octopus|doc-nodes|canvas|canvas-doc|headline|cache-status> [params] [--json]");
  process.exit(2);
}

// FIND SHORT-CIRCUIT — viz-first-redirect.mjs fires ~1060×/day calling this
// subcommand from fresh node subprocesses. The full loadGraph() parse costs
// ~2s post-cable-swap on the 370 MB system-graph.json; loadFindCache() reads
// a ~2 MB projected sidecar that's ~170× smaller. Short-circuiting BEFORE
// the (eager) loadGraph below keeps every other cmd's behavior unchanged
// while removing the cold parse from the hottest hook path.
if (cmd === "find") {
  // --brain-only: return only hits backed by >=1 wiki/memory doc (noteCount>0),
  // so a token-conscious caller routes straight to DOCUMENTED nodes (context-
  // retention). noteCount is the structural brain-coverage count projected into
  // the find-cache (sierra-substrate, NOT alpha's doc content). HUMAN output
  // carries a trailing ` [docs:N]` marker per hit when noteCount>0 (appended only
  // when >0, so undocumented hits stay byte-identical to the pre-marker format).
  // ASCII (not an emoji) so it survives grep / PowerShell codepage / the c-to-h
  // mirror, and is collision-safe (no real node label ends in `[docs:N]`). It is
  // a documented format contract: viz-first-redirect.parseFindOutput strips +
  // captures it into hit.noteCount; audit-viz-first-inject passes the line
  // through verbatim (no per-line parse). --json exposes the raw count.
  const brainOnly = args.includes("--brain-only");
  const q = params.filter((p) => p !== "--brain-only").join(" ");
  if (!q.trim()) { console.error("find needs <query>"); process.exit(2); }
  let g;
  try { g = loadFindCache(); }
  catch (e) { console.error(e.message); process.exit(3); }
  let hits = findInGraph(g, q, { limit: brainOnly ? 60 : 30 });
  if (brainOnly) hits = hits.filter((h) => (h.noteCount || 0) > 0).slice(0, 30);
  if (wantJson) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(`Found ${hits.length} node(s) matching "${q.toLowerCase()}"${brainOnly ? " (brain-backed only)" : ""}:`);
    for (const h of hits) {
      const note = (h.noteCount || 0) > 0 ? ` [docs:${h.noteCount}]` : "";
      console.log(`  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${(h.label ?? '').split('\n')[0]}${note}`);
    }
  }
  process.exit(0);
}

// CACHE-STATUS SHORT-CIRCUIT — report find-cache + graph-index freshness vs the
// live graph WITHOUT loading the graph (stat-only fd-head-reads via sidecarStatus).
// Lets hooks / scripts gate on sidecar freshness (exit 0 = both fresh; 1 = any
// stale/missing) — e.g. trigger regen-find-cache.mjs when stale. Placed before
// the eager loadGraph below so `cache-status` itself never pays a parse.
if (cmd === "cache-status") {
  const s = sidecarStatus();
  if (wantJson) {
    console.log(JSON.stringify(s, null, 2));
  } else {
    const fmt = (x) => (x.exists ? (x.fresh ? "FRESH" : "STALE — " + x.reason) : "MISSING");
    console.log("system-viz sidecar freshness (vs live graph):");
    console.log("  graph:       " + (s.graph.exists ? `${(s.graph.size / 1e6).toFixed(0)}MB · mtimeMs=${Math.round(s.graph.mtimeMs)}` : "MISSING"));
    console.log("  find-cache:  " + fmt(s.findCache));
    console.log("  graph-index: " + fmt(s.index));
  }
  // exit 0 iff graph present AND both sidecars fresh — a clean gate for callers.
  process.exit(s.graph.exists && s.findCache.fresh && s.index.fresh ? 0 : 1);
}

// OCTOPUS SHORT-CIRCUIT -- query the multi-model consensus audit log (U-VIZ-OCTOPUS-QUERY,
// sierra). The MCP-DOWN sibling of the aiReasoning:consensus_audit_query dispatcher action,
// and it ADDS the aggregate summary (per-caller counts, avg agreement, distinct voices) that
// the dispatcher's RAW ConsensusAuditLogEngine.read() lacks. Reads the ~0.5MB
// consensus-decisions.jsonl directly, NEVER the graph (runs BEFORE the eager loadGraph below,
// like find/cache-status/node-card). Optional <callerEngine> filter as the first param.
if (cmd === "octopus" || cmd === "consensus") {
  const caller = params[0];
  const records = readConsensusDecisions(CONSENSUS_DECISIONS_PATH);
  const agg = aggregateConsensus(records, { caller });
  if (wantJson) {
    console.log(JSON.stringify(agg, null, 2));
  } else {
    console.log(formatConsensus(agg));
  }
  process.exit(0);
}

// NEAR SHORT-CIRCUIT -- semantic nearest-neighbor lookup (U-VIZ-NEAR, sierra).
// `near <id> [--k N]` returns the K nodes whose 768d embeddings are closest by
// cosine to <id>'s vector, each enriched with its node-card (label/layer/kind).
// Reads ONLY the embeddings jsonl + the node-card offset index -- NEVER the 884MB
// graph (runs before the eager loadGraph below, like find/octopus/node-card). The
// SEMANTIC complement to find (substring) and subgraph (edge neighborhood): "what
// nodes are conceptually like this one", powered by the rtx6000 nomic-768d pool.
if (cmd === "near") {
  const { id, k } = parseNearArgs(params);
  if (!id) { console.error("near needs <id> (e.g. `near eng.MillEngine --k 8`)"); process.exit(2); }
  let res;
  try { res = await nearById(id, { k }); }
  catch (e) {
    console.error(e.code === "ENOEMBED" ? e.message : `near failed: ${e.message}`);
    process.exit(4);
  }
  // Enrich each neighbor id with its node-card (best-effort; bare id+score if no card).
  let cards = [];
  try { cards = readCards(res.neighbors.map((n) => n.id)) || []; } catch { cards = []; }
  // readCards returns [{card:{id,label,layer,kind,...}}] -- unwrap the .card envelope.
  const cardById = new Map();
  for (const c of cards) { const card = c?.card || c; if (card && card.id) cardById.set(card.id, card); }
  const enriched = res.neighbors.map((n) => {
    const c = cardById.get(n.id) || null;
    return { id: n.id, score: n.score, label: c?.label ?? null, layer: c?.layer ?? null, kind: c?.kind ?? null };
  });
  if (wantJson) {
    console.log(JSON.stringify({ id: res.id, k: res.k, total: res.total, neighbors: enriched }, null, 2));
  } else {
    console.log(`Nearest ${enriched.length} node(s) to "${res.id}" by 768d cosine (over ${res.total} embedded nodes):`);
    for (const n of enriched) {
      const meta = [n.layer, n.kind].filter(Boolean).join("/");
      const label = (n.label ?? "").split("\n")[0];
      console.log(`  ${n.score.toFixed(4)}  ${n.id.padEnd(28)} ${label}${meta ? `  [${meta}]` : ""}`);
    }
  }
  process.exit(0);
}

// HEADLINE SHORT-CIRCUIT -- the `meta` object (counts/headline/coverage/totals/
// worktrees) sits in the first few KB of system-graph.json, BEFORE the huge
// nodes/edges arrays. Read ONLY it via the bounded readGraphMeta() head-read
// instead of streaming the whole ~870MB graph (the find/cache-status/octopus/
// node-card cheap-read discipline). This also removes the transient under-load
// OOM surface (the full-graph materialization). Falls through to the full-graph
// path below on any meta-read failure OR a meta missing counts/headline/totals,
// so behavior is never worse than before (R12: never-worse fallback).
if (cmd === "headline") {
  // PRISM_VIZ_HEADLINE_MAXBYTES bounds the head-read (tunable + lets a test force
  // the fallback by setting it below the meta size). Unset => readGraphMeta default.
  const mbEnv = Number(process.env.PRISM_VIZ_HEADLINE_MAXBYTES);
  const mmOpts = Number.isFinite(mbEnv) && mbEnv > 0 ? { maxBytes: mbEnv } : undefined;
  let gm = null;
  let fallbackReason = null;
  try { gm = readGraphMeta(undefined, mmOpts); } catch (e) { fallbackReason = `readGraphMeta error: ${e?.message || e}`; }
  if (gm && gm.meta && gm.meta.counts && gm.meta.headline && gm.meta.totals) {
    const { human, machine } = buildHeadline(gm.meta, gm.generatedAt);
    if (wantJson) console.log(JSON.stringify(machine, null, 2));
    else console.log(human);
    process.exit(0);
  }
  // OBSERVABILITY (U-VIZ-HEADLINE-FALLBACK-OBSERVABLE): the cheap path is unavailable.
  // Surface WHY to stderr (NOT stdout -- keeps headline text + --json clean for
  // consumers) before falling through to the slow, transiently-OOM-prone full-graph
  // loadGraph() below. Without this the degradation was silently masked (R12: a
  // meta-read regression -- e.g. meta growing past maxBytes, or graph corruption --
  // must be visible, not hidden behind the fallback).
  if (!fallbackReason) fallbackReason = "cheap meta read returned incomplete meta (missing counts/headline/totals)";
  // Log ONLY in the process that will actually proceed to loadGraph() -- NOT the
  // parent that is about to heap-self-respawn (else this diagnostic prints twice:
  // once here, once in the respawned child). Reuse the shared planner so this
  // "will I respawn?" decision can never drift from the guard below.
  const { shouldRespawn: headlineWillRespawn } = planHeapRespawn({
    execArgv: process.execArgv, env: process.env,
    breakerVar: "PRISM_VIZQUERY_REEXEC", heapVar: "PRISM_VIZQUERY_HEAP_MB", defaultMb: 8192,
  });
  if (!headlineWillRespawn) {
    console.error(`[system-viz-query] headline: cheap meta read unavailable -- ${fallbackReason}; falling back to full-graph loadGraph()`);
  }
  // fall through to loadGraph() + the full-graph headline block below.
}

// NODE-CARD SHORT-CIRCUIT — token-cheap read-by-id (CHEAP-NODE-ACCESS-MS0, sierra).
// MUST run BEFORE the eager loadGraph() below, exactly like `find`/`cache-status`:
// a card read that loaded the 644MB graph would defeat its own purpose. Sources
// the freshest compact sidecar (system-graph-index -> find-cache) via
// scripts/lib/node-card-read.mjs and returns ~300 tokens/node vs ~186K for a
// full-graph Read. Accepts one or many ids: `node-card <id> [<id>...]`.
if (cmd === "node" || cmd === "card" || cmd === "node-card") {
  const ids = params;
  if (ids.length === 0) {
    console.error("node-card <nodeId> [<nodeId>...]  — token-cheap read-by-id (no 644MB graph load). Find ids via: system-viz-query find <query>");
    process.exit(2);
  }
  let rows;
  try {
    rows = readCards(ids);
  } catch (e) {
    console.error(e.message);
    process.exit(3);
  }
  if (wantJson) {
    console.log(JSON.stringify(ids.length === 1 ? rows[0] : rows, null, 2));
    process.exit(0);
  }
  const src = rows.find((r) => r && r.source)?.source ?? "—";
  const lines = [`source: ${src}`, ""];
  for (const r of rows) {
    if (!r || r.notFound) {
      lines.push(`✗ ${r?.id ?? "?"} — not in index (try: system-viz-query find <query>)`);
      continue;
    }
    if (r.error) {
      lines.push(`✗ ${r.id} — ${r.error}`);
      continue;
    }
    const c = r.card;
    const docs = c.docTotals ? `${c.docTotals.wiki}w/${c.docTotals.memory}m` : `${c.noteCount}`;
    lines.push(`${c.id}  [${c.layer ?? "?"} · ${c.kind ?? "?"}${c.status ? " · " + c.status : ""}]  docs:${docs}${r.stale ? `  ⚠STALE(${r.staleReason})` : ""}`);
    if (c.label) lines.push(`  ${c.label.split("\n")[0]}`);
    if (c.info) lines.push(`  info: ${c.info}`);
    if (c.wikiPath) lines.push(`  src:  ${c.wikiPath}`);
    if (Array.isArray(c.wikiEntries) && c.wikiEntries.length) {
      // hidden = (true total, capped at DOC_CAP in the card) minus what we SHOW (3),
      // so 4-8-entry nodes still get an honest "+N more" (not just >DOC_CAP nodes).
      const totalWiki = c.docTotals?.wiki ?? c.wikiEntries.length;
      const shown = c.wikiEntries.slice(0, 3);
      const more = totalWiki > shown.length ? `\n        … +${totalWiki - shown.length} more` : "";
      lines.push(`  wiki: ${shown.join("\n        ")}${more}`);
    }
    if (Array.isArray(c.memoryEntries) && c.memoryEntries.length) {
      const totalMem = c.docTotals?.memory ?? c.memoryEntries.length;
      const shownM = c.memoryEntries.slice(0, 3);
      const moreM = totalMem > shownM.length ? ` (+${totalMem - shownM.length} more)` : "";
      lines.push(`  mem:  ${shownM.join(", ")}${moreM}`);
    }
    lines.push("");
  }
  console.log(lines.join("\n").trimEnd());
  process.exit(0);
}

// DOC-NODES SHORT-CIRCUIT (CHEAP-NODE-ACCESS-MS0 reverse edge) — the inverse of
// `node-card`: given a wiki/memory DOC, list the live graph node(s) it documents
// (then `node-card <id>` for their real state). Reads the inverted index
// vault-backlinks.json via scripts/lib/vault-backlink-read.mjs — never the 644MB
// graph. MUST run BEFORE the eager loadGraph() below, like find/node-card.
// Accepts a wiki path, relativized path, or memory slug:
//   doc-nodes architecture/cheap-node-access-ms0
//   doc-nodes knowledge/wiki/lessons/foo.md
//   doc-nodes feedback_psn_definition
if (cmd === "doc-nodes" || cmd === "vault-backlinks" || cmd === "doc") {
  const query = params[0];
  if (!query) {
    console.error("doc-nodes <wikiPathOrMemorySlug>  — list graph node(s) a vault doc documents (no 644MB graph load). Reverse of node-card.");
    process.exit(2);
  }
  const r = backlinksFor(query);
  if (wantJson) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }
  if (r.unavailable) {
    console.error(`✗ ${r.error}`);
    process.exit(3);
  }
  if (!r.found) {
    const sug = r.suggestions && r.suggestions.length
      ? `\n  did you mean:\n    ${r.suggestions.join("\n    ")}`
      : "";
    console.log(`✗ ${r.key || query} — no graph node documents this doc${sug}`);
    process.exit(0);
  }
  const more = r.truncated ? `  (showing ${r.nodeIds.length} of ${r.total}, capped)` : "";
  const staleTag = r.stale ? `  ⚠STALE (${r.staleReason})` : "";
  const lines = [`${r.key} → ${r.total} node(s)${more}${staleTag}`, ""];
  for (const id of r.nodeIds) lines.push(`  ${id}`);
  lines.push("", `next: system-viz-query node-card ${r.nodeIds[0]}`);
  console.log(lines.join("\n"));
  process.exit(0);
}

// CANVAS SHORT-CIRCUIT (CHEAP-NODE-ACCESS-MS0, the .canvas gap) — read the Obsidian
// system-map SUMMARY cheaply via scripts/lib/canvas-read-lib.mjs (146KB JSON, never
// the 644MB graph). `canvas` = structural summary (counts + layer headers + per-layer
// file samples); `canvas-doc <vaultPath>` = which canvas node(s) reference a doc, the
// canvas→file→graph join (chain to `doc-nodes` then `node-card` for the live node).
// MUST run BEFORE the eager loadGraph() below, like find/node-card/doc-nodes.
if (cmd === "canvas" || cmd === "canvas-doc") {
  if (cmd === "canvas-doc") {
    const query = params[0];
    if (!query) {
      console.error("canvas-doc <wikiPathOrMemorySlug>  — which system-map canvas node(s) reference a vault doc (no 644MB load). Chain: canvas-doc → doc-nodes → node-card.");
      process.exit(2);
    }
    const r = canvasNodesForDoc(query);
    if (wantJson) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    if (r.unavailable) { console.error(`✗ ${r.error}`); process.exit(3); }
    if (!r.found) {
      const sug = r.suggestions && r.suggestions.length ? `\n  on the map (basename match):\n    ${r.suggestions.join("\n    ")}` : "";
      console.log(`✗ ${r.key || query} — not on the system-map canvas${sug}`);
      process.exit(0);
    }
    const staleTag = r.stale ? `  ⚠STALE (${r.staleReason})` : "";
    const lines = [`${r.key} → ${r.total} canvas node(s)${staleTag}`, ""];
    for (const n of r.nodes) lines.push(`  ${n.id}  [${n.layer}]  ${n.file}`);
    lines.push("", `next: system-viz-query doc-nodes ${r.key}   # → live graph node(s)`);
    console.log(lines.join("\n"));
    process.exit(0);
  }
  // `canvas` — structural summary
  const s = summarizeCanvas();
  if (wantJson) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
  if (!s.available) { console.error(`✗ ${s.error}`); process.exit(3); }
  const staleTag = s.stale ? `  ⚠STALE (${s.staleReason})` : "";
  const c = s.counts;
  const lines = [
    `PRISM system-map canvas: ${c.nodes} nodes (${c.file} file · ${c.text} text · ${c.other} other) · ${c.edges} edges${staleTag}`,
    "",
  ];
  for (const l of s.layers) {
    const hdr = l.header ? ` — ${l.header}` : "";
    const samp = l.samples.length ? `  e.g. ${l.samples.join(", ")}` : "";
    lines.push(`  ${l.layer}: ${l.fileCount} file(s)${hdr}${samp}`);
  }
  lines.push("", "next: system-viz-query canvas-doc <vaultPath>   # which node maps a doc → doc-nodes → node-card");
  console.log(lines.join("\n"));
  process.exit(0);
}

// SUBGRAPH SHORT-CIRCUIT (U-SUBGRAPH-RETRIEVE rec#4, slot:alpha) -- connected
// pre-search: return a connected neighborhood around the query's seed nodes
// instead of `find`'s flat top-K orphan hits, so a caller sees HOW assets connect
// (engine -> wired-to dispatcher -> documented-by wiki -> tested-by test). MUST
// run BEFORE the eager loadGraph() below, exactly like find/node-card: the whole
// point is to NEVER materialize the ~770MB graph (the find-OOM class). It composes
// only the find-cache + node-adjacency sidecars (see scripts/lib/subgraph-retrieve.mjs).
//   subgraph <query> [--depth N] [--nodes N] [--seeds N] [--dir both|out|in]
if (cmd === "subgraph" || cmd === "neighborhood") {
  // HEAP BUMP via one-shot self-reexec. Parsing find-cache (~65MB) + node-adjacency
  // (~96MB) together overruns the default old-space on some hosts (observed OOM
  // ~384MB). Re-exec once with a generous heap so EVERY caller (CLI, hook,
  // programmatic) gets it with zero friction -- a tool that only works behind a
  // magic flag is R12-broken. Still far cheaper than loadGraph's 770MB graph
  // (which needs the streaming reader + a 16GB heap). Blackwell-aligned: never
  // fight a low default. Knob: PRISM_SUBGRAPH_HEAP_MB (default 4096).
  // Decision is the shared planHeapRespawn() planner (build-once, R15) -- same
  // logic as the main-graph guard below; the spawn side effect stays here.
  {
    const r = respawnWithHeap({
      scriptUrl: import.meta.url, argv: args,
      breakerVar: "PRISM_SUBGRAPH_REEXEC", heapVar: "PRISM_SUBGRAPH_HEAP_MB", defaultMb: 4096,
    });
    if (r.respawned) {
      // R12: a spawn error / signal-kill is surfaced as a non-zero status by
      // respawnWithHeap -- never a silent success on a dead child.
      if (r.error) { console.error(`subgraph heap-respawn failed: ${r.error.message}`); process.exit(1); }
      process.exit(r.status);
    }
  }

  let maxDepth, maxNodes, seedLimit, direction = "both";
  const qParts = [];
  // Fail-loud on a garbage numeric flag (symmetric with the --dir validation
  // below) instead of silently swallowing NaN -> default (R12). Positive ints only.
  const posInt = (name, raw) => {
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v < 1) {
      console.error(`${name} must be a positive integer (got "${raw}")`);
      process.exit(2);
    }
    return v;
  };
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (p === "--depth") maxDepth = posInt("--depth", params[++i]);
    else if (p === "--nodes") maxNodes = posInt("--nodes", params[++i]);
    else if (p === "--seeds") seedLimit = posInt("--seeds", params[++i]);
    else if (p === "--dir") direction = params[++i];
    else qParts.push(p);
  }
  const q = qParts.join(" ");
  if (!q.trim()) {
    console.error("subgraph needs <query>  (flags: --depth N --nodes N --seeds N --dir both|out|in)");
    process.exit(2);
  }
  if (!["both", "out", "in"].includes(direction)) {
    console.error(`--dir must be both|out|in (got "${direction}")`);
    process.exit(2);
  }
  const opts = { direction };
  if (maxDepth !== undefined) opts.maxDepth = maxDepth;
  if (maxNodes !== undefined) opts.maxNodes = maxNodes;
  if (seedLimit !== undefined) opts.seedLimit = seedLimit;
  let r;
  try { r = retrieveSubgraph(q, opts); }
  catch (e) { console.error(e.message); process.exit(3); }
  if (wantJson) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

  const flags = [r.truncated ? "truncated" : null, r.stale ? "stale" : null, r.cold ? "cold" : null].filter(Boolean);
  const lines = [
    `Subgraph for "${r.query}" -- ${r.counts.seeds} seed(s), ${r.counts.total} node(s)${flags.length ? "  [" + flags.join(", ") + "]" : ""}`,
    "",
  ];
  if (r.cold) lines.push("  (find-cache cold -- run: node scripts/regen-find-cache.mjs; results empty until it rebuilds)", "");
  lines.push("SEEDS:");
  if (!r.seeds.length) lines.push("  (none -- no nodes match the query)");
  for (const s of r.seeds) lines.push(`  ${(s.layer || "?").padEnd(4)} ${s.id.padEnd(30)} ${s.label}`);
  lines.push("");
  const neigh = r.nodes.filter((n) => !n.seed);
  if (neigh.length) {
    lines.push("NEIGHBORHOOD (how this connects -- grouped by kind):");
    const byKind = {};
    for (const n of neigh) (byKind[n.kind || n.layer || "other"] ??= []).push(n);
    for (const [kind, list] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`  [${kind}] (${list.length}):`);
      for (const n of list) {
        const v = n.via && n.via[0];
        const rel = v ? `${v.dir === "out" ? "->" : "<-"} ${v.type}` : "";
        lines.push(`    d${n.depth}  ${(n.label || n.id).slice(0, 48).padEnd(48)} ${rel}`);
      }
    }
  }
  lines.push("", `next: system-viz-query node-card ${r.seeds[0]?.id || "<id>"}   # full card for any node above`);
  console.log(lines.join("\n"));
  process.exit(0);
}

// GRAPH-COMMAND GUARD + HEAP SELF-RESPAWN (sierra) ---------------------------
// Every cheap short-circuit above has already process.exit()'d, so by here cmd
// is EITHER a graph-loading command OR an unknown one. Two guards, BOTH before
// the eager loadGraph():
//  (A) Unknown / `--help` / `-h` / a typo USED to fall through loadGraph()
//      (644MB) and only THEN hit the `unknown command` else far below -- so
//      `system-viz-query --help` OOM'd on the default heap instead of printing
//      usage. Validate FIRST; print usage with ZERO graph load.
//  (B) The main loadGraph() path had NO heap guard (unlike `subgraph`), so every
//      graph command OOM'd on the default heap (observed ~384MB). Self-respawn
//      once with a generous heap. Knob: PRISM_VIZQUERY_HEAP_MB (default 8192 --
//      MEASURED: the heaviest command, blast-radius over ~1M edges, completes at
//      4096 with 0 GC thrash; 8192 = 2x headroom for graph growth while halving the
//      Windows COMMIT RESERVATION vs the prior 16384 -- see reference_node_heap_384).
//      Blackwell-aligned: never fight a low default.
if (!isKnownGraphCmd(cmd)) {
  const isHelp = cmd === "--help" || cmd === "-h" || cmd === "help";
  if (isHelp) {
    console.log(GRAPH_USAGE);
    process.exit(0);
  }
  console.error(`unknown command: ${cmd}\n\n${GRAPH_USAGE}`);
  process.exit(2);
}
{
  const r = respawnWithHeap({
    scriptUrl: import.meta.url, argv: args,
    breakerVar: "PRISM_VIZQUERY_REEXEC", heapVar: "PRISM_VIZQUERY_HEAP_MB", defaultMb: 8192,
  });
  if (r.respawned) {
    // R12: never report success on a dead child (respawnWithHeap returns status 1
    // on a spawn error / signal-kill, never a silent 0).
    if (r.error) { console.error(`viz-query heap-respawn failed: ${r.error.message}`); process.exit(1); }
    process.exit(r.status);
  }
}

let G;
try { G = loadGraph(); }
catch (e) {
  console.error(e.message);
  process.exit(3);
}

function out(human, machine) {
  if (wantJson) console.log(JSON.stringify(machine, null, 2));
  else console.log(human);
}

// Shared headline renderer -- used by BOTH the cheap readGraphMeta short-circuit
// (no graph load) and the full-graph fallback block below, so the two paths emit
// identical output. Sources every field from `meta` (incl. node/edge/layer
// counts from meta.totals, written by the same regen that writes the arrays), so
// it never needs the materialized nodes/edges arrays. `function` declaration =>
// hoisted, so the short-circuit above can call it.
function buildHeadline(meta, generatedAt) {
  const h = meta.headline; const c = meta.counts; const t = meta.totals || {};
  const human =
`PRISM headline (${generatedAt}):
  engines:      ${c.engines.toLocaleString()}  (built ${h.built} / unwired ${h.unwired} = ${Math.round(100*h.built/c.engines)}% wired)
  dispatchers:  ${c.dispatchers}
  actions:      ${c.actions.toLocaleString()}
  tests:        ${c.tests.toLocaleString()}
  formulas:     ${c.formulas}
  wiki:         ${h.wikiEntries}
  pending FE:   ${h.pendingFE}
  drift:        ${h.drift}
  worktrees:    ${meta.worktrees ? `${meta.worktrees.total} (KEEP ${meta.worktrees.KEEP} / MERGE ${meta.worktrees.MERGE} / PRUNE ${meta.worktrees.PRUNE} / INVESTIGATE ${meta.worktrees.INVESTIGATE})` : "-"}
  graph:        ${t.nodes ?? "?"}n / ${t.edges ?? "?"}e / ${t.layers ?? "?"} layers`;
  const machine = { generatedAt, ...h, counts: c, nodes: t.nodes, edges: t.edges, worktrees: meta.worktrees ?? null };
  return { human, machine };
}

if (cmd === "headline") {
  // Fallback path only (reached when the readGraphMeta short-circuit above fell
  // through). Same renderer => identical output. meta.totals carries the
  // node/edge/layer counts the short-circuit also uses.
  const { human, machine } = buildHeadline(G.meta, G.generatedAt);
  out(human, machine);
}

else if (cmd === "roadmap-candidates") {
  const unwired = G.nodes
    .filter(n => n.layer === "L5" && n.subgroup === "unwired")
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map(n => ({ kind: "unwired-domain", domain: n.label.split('\n')[0], count: n.count, priority: n.count > 50 ? "high" : "medium" }));
  const pendingMerges = G.nodes
    .filter(n => n.status === "pending_merge")
    .map(n => ({ kind: "pending-frontend-merge", id: n.id, label: n.label, stack: n.stack, priority: "high" }));
  const drift = G.meta.headline.drift;
  const candidates = [...pendingMerges, ...unwired];
  const human =
`Roadmap candidates (${candidates.length}):

PENDING MERGES (highest leverage — already-built work waiting):
${pendingMerges.length === 0 ? "  none" : pendingMerges.map(p => `  • ${p.label.replace(/\n/g,' ')} [${p.stack}]`).join("\n")}

UNWIRED ENGINE DOMAINS (top 10):
${unwired.slice(0,10).map(u => `  • ${u.domain.padEnd(14)} ${String(u.count).padStart(4)} engines  [${u.priority}]`).join("\n")}

DRIFT: ${drift} milestone(s) claim "complete" but git disagrees. Run /envelope-sync.
`;
  out(human, { pendingMerges, unwired, drift });
}

else if (cmd === "blast-radius") {
  const id = params[0];
  if (!id) { console.error("blast-radius needs <nodeId>"); process.exit(2); }
  const node = G.nodes.find(n => n.id === id);
  if (!node) { console.error(`node not found: ${id}`); process.exit(4); }
  // Build forward (from→[to]) + reverse (to→[from]) adjacency ONCE (O(E)) so the
  // BFS does O(1) neighbor lookups per frontier node instead of an O(E)
  // G.edges.filter() per node — the old form was O(E × frontier × depth),
  // pathological on the ~1M-edge merged graph. Self-loops + malformed edges are
  // skipped (behavior-preserving: self-loops were already no-ops via `visited`,
  // malformed edges matched nothing in the old filter). Same visited-set BFS.
  const fwd = new Map();
  const rev = new Map();
  for (const e of G.edges) {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string" || e.from === e.to) continue;
    let a = fwd.get(e.from); if (!a) { a = []; fwd.set(e.from, a); } a.push(e.to);
    let b = rev.get(e.to);   if (!b) { b = []; rev.set(e.to, b); } b.push(e.from);
  }
  function walk(start, dir, maxDepth = 4) {
    const adj = dir === "down" ? fwd : rev;
    const visited = new Map([[start, 0]]);
    let frontier = [start];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const next = [];
      for (const f of frontier) {
        const neighbors = adj.get(f);
        if (!neighbors) continue;
        for (const target of neighbors) {
          if (!visited.has(target)) { visited.set(target, depth); next.push(target); }
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    visited.delete(start);
    return visited;
  }
  const dn = walk(id, "down");
  const up = walk(id, "up");
  const fmt = m => [...m.entries()].sort((a,b) => a[1]-b[1])
    .map(([nid, d]) => `  d${d}  ${(G.nodes.find(n => n.id === nid)?.label ?? nid).split('\n')[0]}`)
    .slice(0, 30).join("\n");
  const human =
`Blast radius for ${node.label.replace(/\n/g,' ')} (${id}):

DOWNSTREAM (${dn.size}):
${fmt(dn) || "  none"}

UPSTREAM (${up.size}):
${fmt(up) || "  none"}
`;
  out(human, {
    node: { id: node.id, label: node.label, layer: node.layer },
    downstream: [...dn.entries()].map(([id, depth]) => ({ id, depth })),
    upstream: [...up.entries()].map(([id, depth]) => ({ id, depth })),
  });
}

else if (cmd === "dispatcher-summary") {
  const dispNodes = G.nodes.filter(n => n.layer === "L4");
  const byCat = {};
  for (const d of dispNodes) (byCat[d.subgroup] ??= []).push(d.label);
  const human =
`Dispatchers (${dispNodes.length} total):
${Object.entries(byCat).map(([cat, list]) =>
  `  [${cat}] (${list.length}):\n    ${list.sort().join(", ")}`
).join("\n\n")}`;
  out(human, byCat);
}

else if (cmd === "coverage-by-domain") {
  const l5 = G.nodes.filter(n => n.layer === "L5");
  const wired = l5.filter(n => n.subgroup === "wired").reduce((s, n) => s + (n.count ?? 0), 0);
  const unwired = l5.filter(n => n.subgroup === "unwired").reduce((s, n) => s + (n.count ?? 0), 0);
  const total = wired + unwired;
  const lines = l5
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map(n => `  ${(n.subgroup === "wired" ? "✓" : "○")} ${n.label.split('\n')[0].padEnd(14)} ${String(n.count ?? 0).padStart(4)}`);
  const human =
`Coverage by domain (${wired}/${total} = ${Math.round(100*wired/total)}% wired):

${lines.join("\n")}`;
  out(human, { wired, unwired, total, ratio: wired / total, domains: l5.map(n => ({ label: n.label.split('\n')[0], count: n.count, subgroup: n.subgroup })) });
}

// UNREACHABLE — the cmd === "find" short-circuit near the top of this file
// (right after wantJson) calls process.exit(0) before this dispatch chain ever
// runs. Kept as a one-line equivalence reference / fallback if the short-circuit
// is ever removed; safe to delete after the find-cache pipeline is fully proven.
else if (cmd === "find") {
  const q = params.join(" ");
  if (!q.trim()) { console.error("find needs <query>"); process.exit(2); }
  const hits = findInGraph(G, q, { limit: 30 });
  const human =
`Found ${hits.length} node(s) matching "${q.toLowerCase()}":
${hits.map(h => `  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${(h.label ?? '').split('\n')[0]}${(h.noteCount || 0) > 0 ? ` [docs:${h.noteCount}]` : ""}`).join("\n")}`;
  out(human, hits);
}

else if (cmd === "worktrees") {
  // Git worktree fleet — the L9 `worktrees` subgroup mapped in by
  // generate-system-viz.mjs (which reuses audit-worktrees.mjs). Grouped by
  // verdict so the land-ready / safe-to-prune trees surface first.
  // U-VIZ-WORKTREE-MAP-EXT (2026-05-15) — DRAINED + PARKED are ghost nodes for
  // archive-tagged worktrees that have been removed from the live fleet but
  // whose history is recoverable via `git checkout <tag>`. Surface them so the
  // drain trail is queryable, not just visible in the 3D map.
  const KNOWN_VERDICTS = ["MERGE", "PRUNE", "INVESTIGATE", "KEEP", "PARKED", "DRAINED"];
  const wts = G.nodes.filter(n => n.layer === "L9" && n.subgroup === "worktrees" && n.id !== "wt.root");
  const summary = (G.meta && G.meta.worktrees) ? G.meta.worktrees : null;
  const byVerdict = { MERGE: [], PRUNE: [], INVESTIGATE: [], KEEP: [], PARKED: [], DRAINED: [] };
  for (const n of wts) {
    // Any node missing a known verdict (stale graph format) falls into
    // INVESTIGATE so it still surfaces rather than being silently dropped.
    const v = KNOWN_VERDICTS.includes(n.verdict) ? n.verdict : "INVESTIGATE";
    byVerdict[v].push(n);
  }
  const liveCount = byVerdict.KEEP.length + byVerdict.MERGE.length + byVerdict.PRUNE.length + byVerdict.INVESTIGATE.length;
  const ghostCount = byVerdict.PARKED.length + byVerdict.DRAINED.length;
  const lines = [];
  lines.push(`Git worktrees (${liveCount} live + ${ghostCount} archived${summary && summary.base ? `, base ${summary.base}` : ""}):`);
  if (summary) {
    lines.push(`  KEEP ${summary.KEEP ?? 0} · MERGE ${summary.MERGE ?? 0} · PRUNE ${summary.PRUNE ?? 0} · INVESTIGATE ${summary.INVESTIGATE ?? 0}`);
    if ((summary.archived_total ?? 0) > 0) {
      lines.push(`  📦 PARKED ${summary.PARKED ?? 0} · DRAINED ${summary.DRAINED ?? 0} (archive-tagged, recoverable)`);
    }
  } else {
    lines.push("  (no meta.worktrees summary — graph predates worktree mapping; regenerate via scripts/generate-system-viz.mjs)");
  }
  lines.push("");
  // MERGE/PRUNE first (actionable: land or remove), INVESTIGATE, KEEP, then
  // archived (PARKED → merge candidates, DRAINED → SHA-only pins) last.
  for (const v of KNOWN_VERDICTS) {
    const rows = byVerdict[v].slice().sort((a, b) => (b.ahead ?? -1) - (a.ahead ?? -1));
    if (!rows.length) continue;
    lines.push(`${v} (${rows.length}):`);
    for (const r of rows) {
      const nm = r.label ? r.label.split("\n")[0] : r.id;
      const br = r.branch || "(detached)";
      const dirty = r.dirtyCount ? ` dirty:${r.dirtyCount}` : "";
      const owner = r.owner && r.owner.alive ? " ⚠ALIVE-OWNER" : "";
      const locked = r.locked ? " 🔒locked" : "";
      // For ghost rows: replace +/- (n/a) with the archive tag + WIP hint.
      if (v === "PARKED" || v === "DRAINED") {
        const tag = r.archive_tag ? ` 📦${r.archive_tag.replace(/^archive\//, "")}` : "";
        const wip = (r.wip_patch_bytes && r.wip_patch_bytes > 0) ? ` WIP:${r.wip_patch_bytes}b` : "";
        const sha = r.archive_sha ? ` sha:${String(r.archive_sha).slice(0, 8)}` : "";
        lines.push(`  · ${nm.padEnd(30)} (archived ${r.archive_date ?? "?"})${tag}${sha}${wip}`);
      } else {
        lines.push(`  · ${nm.padEnd(30)} [${br}]  +${r.ahead ?? "?"}/-${r.behind ?? "?"}${dirty}${owner}${locked}`);
      }
    }
    lines.push("");
  }
  if (wts.length === 0) {
    lines.push("  (no worktree nodes in graph — regenerate via scripts/generate-system-viz.mjs)");
  }
  out(lines.join("\n"), {
    summary,
    count: wts.length,
    liveCount,
    archivedCount: ghostCount,
    worktrees: wts.map(n => ({
      id: n.id,
      name: n.label ? n.label.split("\n")[0] : n.id,
      branch: n.branch ?? null,
      verdict: KNOWN_VERDICTS.includes(n.verdict) ? n.verdict : "INVESTIGATE",
      ahead: n.ahead ?? null,
      behind: n.behind ?? null,
      dirtyCount: n.dirtyCount ?? null,
      locked: !!n.locked,
      detached: !!n.detached,
      path: n.worktreePath ?? null,
      lastCommitIso: n.lastCommitIso ?? null,
      owner: n.owner ?? null,
      reasons: Array.isArray(n.reasons) ? n.reasons : [],
      // U-VIZ-WORKTREE-MAP-EXT — archive enrichment (null on live-only nodes).
      archive_tag: n.archive_tag ?? null,
      archive_status: n.archive_status ?? null,
      archive_date: n.archive_date ?? null,
      archive_sha: n.archive_sha ?? null,
      wip_patch_path: n.wip_patch_path ?? null,
      wip_patch_bytes: n.wip_patch_bytes ?? 0,
      ghost: !!n.ghost,
    })),
  });
}

else if (cmd === "build-order") {
  const r = G.meta?.roadmap;
  if (!r) { console.error("No roadmap metadata in graph; regenerate via scripts/generate-system-viz.mjs"); process.exit(5); }
  const lines = [];
  lines.push(`# PRISM Atomic-First Master Roadmap`);
  lines.push(``);
  lines.push(`Generated from system-viz at ${G.generatedAt}.`);
  lines.push(``);
  lines.push(`**Principle:** ${r.principle}`);
  lines.push(``);
  lines.push(`## Headline state`);
  lines.push(`- Engines: ${G.meta.counts.engines.toLocaleString()} (${G.meta.headline.built} wired = ${Math.round(100 * G.meta.headline.built / G.meta.counts.engines)}%)`);
  lines.push(`- Unwired: ${G.meta.headline.unwired}`);
  lines.push(`- Pending FE: ${G.meta.headline.pendingFE}`);
  lines.push(`- Drift: ${G.meta.headline.drift}`);
  lines.push(``);
  for (const p of r.phases) {
    lines.push(`## Phase ${p.phase} — ${p.name}`);
    lines.push(``);
    lines.push(`> ${p.reason}`);
    lines.push(``);
    if (!p.items?.length) { lines.push(`_No items_`); lines.push(``); continue; }
    for (const it of p.items) {
      if (it.kind === "wire-up") {
        lines.push(`- **${it.domain}** — ${it.engineCount} engines unwired · suggested dispatchers: ${(it.suggestedDispatchers ?? []).join(", ") || "_none_"} · leverage **${it.leverageScore}**`);
      } else if (it.kind === "frontend-merge") {
        lines.push(`- **Merge** \`${it.id}\` (${it.label}) [${it.stack}]`);
      } else if (it.kind === "drift") {
        lines.push(`- **Drift** — ${it.count} milestones to reconcile · ${it.action}`);
      } else if (it.kind === "atomic") {
        lines.push(`- ${it.id} — ${it.label}`);
      } else if (it.kind === "policy") {
        lines.push(`- _Policy_: ${it.note}`);
      } else {
        lines.push(`- ${JSON.stringify(it)}`);
      }
    }
    lines.push(``);
  }
  const md = lines.join("\n");
  if (wantJson) console.log(JSON.stringify(r, null, 2));
  else console.log(md);
}

else {
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}
