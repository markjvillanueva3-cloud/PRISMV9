#!/usr/bin/env node
/**
 * build-psn-training-corpus.mjs — orchestrator for the PSN deep-learning +
 * deep-reasoning training substrate.
 *
 * Walks the live system-viz graph + each of the 11 PSN-leg surfaces and emits
 * structured JSONL training corpus, ready for downstream consumption by the
 * R3 top-10 picks (DPO/KTO, STaR, replay buffer, etc.).
 *
 * Architecture: per [[psn-deep-learning-reasoning-training-substrate]] wiki
 * entry. This is the first-pass orchestrator — full per-leg extractors are
 * named in the wiki entry's §"PSN-leg-specific extractors" table and shipped
 * as separate units.
 *
 * Usage:
 *   node scripts/build-psn-training-corpus.mjs                 # full build
 *   node scripts/build-psn-training-corpus.mjs --legs 6,8,10   # subset
 *   node scripts/build-psn-training-corpus.mjs --dry-run       # report only
 *   node scripts/build-psn-training-corpus.mjs --out-dir <dir> # custom out
 *
 * Outputs (under `state/shared/training/`):
 *   - psn-leg-1-obsidian.jsonl    (memos by type)
 *   - psn-leg-3-wiki.jsonl        (wiki entries with provenance)
 *   - psn-leg-4-memories.jsonl    (cross-session doctrines)
 *   - psn-leg-5-tribal.jsonl      (tip + 768-d embedding rows, re-uses tribal-embed-index)
 *   - psn-leg-6-graph-features.jsonl (per-node structural features)
 *   - psn-leg-7-engines.jsonl     (engine inventory + utilization)
 *   - psn-leg-8-algorithms.jsonl  (pure-numerical primitives)
 *   - psn-leg-9-formulas.jsonl    (formula registry rows)
 *   - psn-leg-11-prism-ai.jsonl   (KB registry + routing log)
 *   - psn-corpus-manifest.json    (summary: rows-per-leg, output paths, mtimes)
 *
 * Privacy: this orchestrator is INTERNAL-ONLY. Output corpora may reference
 * JM-DIE customer / part numbers. Per [[feedback_no_public_h_drive]] do NOT
 * publish the outputs externally. A future `--scrub` flag will strip
 * customer / part identifiers before LoRA training.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readGraphStreaming } from "./lib/graph-io.mjs";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRISM_ROOT = path.resolve(__dirname, "..");

const PATHS = {
  graph: path.join(PRISM_ROOT, "state", "shared", "system-viz", "system-graph.json"),
  tribalIndex: path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json"),
  memoriesDir: path.join(PRISM_ROOT, "knowledge", "memories"),
  wikiDir: path.join(PRISM_ROOT, "knowledge", "wiki"),
  algorithmsDir: path.join(PRISM_ROOT, "mcp-server", "src", "algorithms"),
  outDir: path.join(PRISM_ROOT, "state", "shared", "training"),
};

const ALL_LEGS = [1, 3, 4, 5, 6, 7, 8, 9, 11]; // Legs 2 (OS), 10 (NN/GNN) are produced by their own engines

function parseArgs(argv) {
  const opts = { legs: [...ALL_LEGS], dryRun: false, outDir: PATHS.outDir, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--legs") opts.legs = (argv[++i] || "").split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
    else if (a === "--out-dir") opts.outDir = path.resolve(argv[++i] || PATHS.outDir);
  }
  return opts;
}

/* ─── Leg 6 — System-viz structural features ──────────────────────────────── */

export function extractGraphFeatures(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return [];
  const inDeg = new Map();
  const outDeg = new Map();
  for (const e of graph.edges) {
    const from = e.from || e.source;
    const to = e.to || e.target;
    if (from) outDeg.set(from, (outDeg.get(from) || 0) + 1);
    if (to) inDeg.set(to, (inDeg.get(to) || 0) + 1);
  }
  return graph.nodes.map((n) => ({
    node_id: n.id,
    layer: n.layer || "?",
    status: n.status || "?",
    subgroup: n.subgroup || null,
    parent: n.parent || null,
    label: n.label || null,
    in_degree: inDeg.get(n.id) || 0,
    out_degree: outDeg.get(n.id) || 0,
    is_ghost: (n.status || "").startsWith("ghost") || n.id?.startsWith("ghost."),
  }));
}

/* ─── Leg 1 + 4 — Obsidian + Memories ─────────────────────────────────────── */

export function extractMemoryDoctrines(memoriesDir) {
  const out = [];
  if (!fs.existsSync(memoriesDir)) return out;
  for (const sub of ["feedback", "reference", "project", "user", "patterns"]) {
    const dir = path.join(memoriesDir, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const full = path.join(dir, f);
      let raw;
      try { raw = fs.readFileSync(full, "utf8"); } catch { continue; }
      const slug = f.replace(/\.md$/, "");
      const fmMatch = raw.match(/^---\s*([\s\S]*?)---\s*/);
      const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
      out.push({
        leg: sub === "feedback" ? "obsidian-brain" : "memories",
        type: sub,
        slug,
        path: path.relative(PRISM_ROOT, full).replace(/\\/g, "/"),
        text_len: body.length,
        first_line: (body.split(/\r?\n/).find(l => l.trim().length > 0) || "").slice(0, 200),
      });
    }
  }
  return out;
}

/* ─── Leg 3 — Wiki ─────────────────────────────────────────────────────────── */

export function extractWikiCorpus(wikiDir, maxDepth = 4) {
  const out = [];
  if (!fs.existsSync(wikiDir)) return out;
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (!e.name.endsWith(".md")) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      out.push({
        leg: "wiki",
        slug: path.relative(wikiDir, full).replace(/\\/g, "/").replace(/\.md$/, ""),
        path: path.relative(PRISM_ROOT, full).replace(/\\/g, "/"),
        size_bytes: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }
  walk(wikiDir, 0);
  return out;
}

/* ─── Leg 5 — Tribal (re-uses tribal-embed-index) ─────────────────────────── */

export function extractTribalRows(tribalIndexPath) {
  // Shard-aware + O(1)-heap: the tribal index sharded 2026-06-08 and the monolith
  // tribalIndexPath is now an absent orphan -- a direct readFileSync returned [] =
  // EMPTY leg-5 rows. streamTribalEntries reads the canonical shards (manifest-first,
  // or the monolith when no manifest) ONE entry at a time, so a default-heap run
  // never materializes all ~35K x 768-float embeddings at once (loadTribalIndex
  // WOULD OOM a default heap here -- this reader only needs the embedding LENGTH).
  // Fail-soft to [] preserves the prior semantics.
  const manifestPath = tribalIndexPath.replace(/\.json$/i, "") + ".manifest.json";
  if (!fs.existsSync(tribalIndexPath) && !fs.existsSync(manifestPath)) return [];
  const rows = [];
  try {
    streamTribalEntries(tribalIndexPath, (e) => {
      rows.push({
        leg: "tribal",
        id: e.id,
        source: e.source,
        domain: e.domain,
        title: e.title,
        has_embedding: Array.isArray(e.embedding),
        embedding_dim: Array.isArray(e.embedding) ? e.embedding.length : 0,
        text_preview: (e.text || "").slice(0, 200),
      });
    });
  } catch { return []; }
  return rows;
}

/* ─── Leg 7 — Engines ──────────────────────────────────────────────────────── */

export function extractEngineFeatures(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  return graph.nodes
    .filter(n => (n.id || "").startsWith("eng.") || (n.subgroup || "") === "engine" || (n.layer === "L7" && n.id?.includes("engine")))
    .map(n => ({
      leg: "engines",
      id: n.id,
      label: n.label || null,
      status: n.status || "?",
      parent: n.parent || null,
      layer: n.layer || null,
    }));
}

/* ─── Leg 8 — Algorithms ───────────────────────────────────────────────────── */

export function extractAlgorithmCorpus(algorithmsDir) {
  const out = [];
  if (!fs.existsSync(algorithmsDir)) return out;
  for (const e of fs.readdirSync(algorithmsDir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) continue;
    const full = path.join(algorithmsDir, e.name);
    let stat, head = "";
    try { stat = fs.statSync(full); } catch { continue; }
    try { head = fs.readFileSync(full, "utf8").slice(0, 800); } catch { /* noop */ }
    const docMatch = head.match(/\/\*\*([\s\S]*?)\*\//);
    out.push({
      leg: "algorithms",
      name: e.name.replace(/\.ts$/, ""),
      path: path.relative(PRISM_ROOT, full).replace(/\\/g, "/"),
      size_bytes: stat.size,
      mtime: stat.mtime.toISOString(),
      doc_excerpt: docMatch ? docMatch[1].replace(/\s+/g, " ").trim().slice(0, 300) : null,
    });
  }
  return out;
}

/* ─── Leg 9 — Formulas (graph-derived) ─────────────────────────────────────── */

export function extractFormulaCorpus(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  return graph.nodes
    .filter(n => (n.id || "").startsWith("formula.") || (n.subgroup || "") === "formula" || (n.id || "").includes("formula"))
    .map(n => ({
      leg: "formulas",
      id: n.id,
      label: n.label || null,
      status: n.status || "?",
      parent: n.parent || null,
    }));
}

/* ─── Leg 11 — PRISM AI (KB registry + routing log) ───────────────────────── */

export function extractPrismAiCorpus(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  return graph.nodes
    .filter(n => {
      const id = n.id || "";
      return id.startsWith("reg.knowledgebaseregistry.") ||
             id.startsWith("disp.aireasoningdispatcher.") ||
             id.startsWith("eng.aiSystemRouterEngine") ||
             id.includes("creativeReasoningEngine");
    })
    .map(n => ({
      leg: "prism-ai",
      id: n.id,
      label: n.label || null,
      status: n.status || "?",
      parent: n.parent || null,
    }));
}

/* ─── Orchestrator ─────────────────────────────────────────────────────────── */

function writeJsonl(outPath, rows) {
  fs.writeFileSync(outPath, rows.map(r => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

async function main(argv) {
  const opts = parseArgs(argv.slice(2));
  console.log(`[psn-training-corpus] legs=${opts.legs.join(",")} dry-run=${opts.dryRun} out=${opts.outDir}`);

  if (!fs.existsSync(PATHS.graph)) {
    console.error(`graph missing: ${PATHS.graph}`);
    return 2;
  }
  if (!opts.dryRun) fs.mkdirSync(opts.outDir, { recursive: true });

  const t0 = Date.now();
  const graph = readGraphStreaming(PATHS.graph);
  console.log(`[psn-training-corpus] graph loaded: ${graph.nodes?.length || 0} nodes / ${graph.edges?.length || 0} edges in ${Date.now() - t0}ms`);

  const manifest = { generatedAt: new Date().toISOString(), legs: {}, durations: {} };

  if (opts.legs.includes(6)) {
    const t = Date.now();
    const rows = extractGraphFeatures(graph);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-6-graph-features.jsonl"), rows);
    manifest.legs[6] = { name: "system-viz", rows: rows.length };
    manifest.durations[6] = Date.now() - t;
    console.log(`  leg 6 (system-viz): ${rows.length} rows in ${manifest.durations[6]}ms`);
  }

  if (opts.legs.includes(1) || opts.legs.includes(4)) {
    const t = Date.now();
    const rows = extractMemoryDoctrines(PATHS.memoriesDir);
    if (!opts.dryRun) {
      writeJsonl(path.join(opts.outDir, "psn-leg-1-obsidian.jsonl"), rows.filter(r => r.leg === "obsidian-brain"));
      writeJsonl(path.join(opts.outDir, "psn-leg-4-memories.jsonl"), rows.filter(r => r.leg === "memories"));
    }
    manifest.legs[1] = { name: "obsidian-brain", rows: rows.filter(r => r.leg === "obsidian-brain").length };
    manifest.legs[4] = { name: "memories", rows: rows.filter(r => r.leg === "memories").length };
    manifest.durations[1] = manifest.durations[4] = Date.now() - t;
    console.log(`  legs 1+4 (obsidian + memories): ${rows.length} rows total in ${manifest.durations[1]}ms`);
  }

  if (opts.legs.includes(3)) {
    const t = Date.now();
    const rows = extractWikiCorpus(PATHS.wikiDir);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-3-wiki.jsonl"), rows);
    manifest.legs[3] = { name: "wiki", rows: rows.length };
    manifest.durations[3] = Date.now() - t;
    console.log(`  leg 3 (wiki): ${rows.length} rows in ${manifest.durations[3]}ms`);
  }

  if (opts.legs.includes(5)) {
    const t = Date.now();
    const rows = extractTribalRows(PATHS.tribalIndex);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-5-tribal.jsonl"), rows);
    manifest.legs[5] = { name: "tribal", rows: rows.length };
    manifest.durations[5] = Date.now() - t;
    console.log(`  leg 5 (tribal): ${rows.length} rows in ${manifest.durations[5]}ms`);
  }

  if (opts.legs.includes(7)) {
    const t = Date.now();
    const rows = extractEngineFeatures(graph);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-7-engines.jsonl"), rows);
    manifest.legs[7] = { name: "engines", rows: rows.length };
    manifest.durations[7] = Date.now() - t;
    console.log(`  leg 7 (engines): ${rows.length} rows in ${manifest.durations[7]}ms`);
  }

  if (opts.legs.includes(8)) {
    const t = Date.now();
    const rows = extractAlgorithmCorpus(PATHS.algorithmsDir);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-8-algorithms.jsonl"), rows);
    manifest.legs[8] = { name: "algorithms", rows: rows.length };
    manifest.durations[8] = Date.now() - t;
    console.log(`  leg 8 (algorithms): ${rows.length} rows in ${manifest.durations[8]}ms`);
  }

  if (opts.legs.includes(9)) {
    const t = Date.now();
    const rows = extractFormulaCorpus(graph);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-9-formulas.jsonl"), rows);
    manifest.legs[9] = { name: "formulas", rows: rows.length };
    manifest.durations[9] = Date.now() - t;
    console.log(`  leg 9 (formulas): ${rows.length} rows in ${manifest.durations[9]}ms`);
  }

  if (opts.legs.includes(11)) {
    const t = Date.now();
    const rows = extractPrismAiCorpus(graph);
    if (!opts.dryRun) writeJsonl(path.join(opts.outDir, "psn-leg-11-prism-ai.jsonl"), rows);
    manifest.legs[11] = { name: "prism-ai", rows: rows.length };
    manifest.durations[11] = Date.now() - t;
    console.log(`  leg 11 (prism-ai): ${rows.length} rows in ${manifest.durations[11]}ms`);
  }

  if (!opts.dryRun) {
    fs.writeFileSync(path.join(opts.outDir, "psn-corpus-manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`[psn-training-corpus] manifest → ${path.join(opts.outDir, "psn-corpus-manifest.json")}`);
  }

  const totalRows = Object.values(manifest.legs).reduce((a, b) => a + (b.rows || 0), 0);
  console.log(`[psn-training-corpus] DONE in ${Date.now() - t0}ms · total rows: ${totalRows}`);
  return 0;
}

const argv1 = process.argv[1] || "";
if (argv1.endsWith("build-psn-training-corpus.mjs")) {
  main(process.argv).then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(1); });
}
