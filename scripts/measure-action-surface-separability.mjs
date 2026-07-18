#!/usr/bin/env node
/**
 * measure-action-surface-separability.mjs -- does the per-engine ACTION-SURFACE text
 * (engine -> dispatcher action names it backs) separate engines by dispatcher class
 * BETTER than the engine's name/description prose? (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * THE QUESTION (india soul -- measure BEFORE any GPU retrain or production mutation):
 * the deployed GNN's 768-d nomic embeddings of engine DESCRIPTIONS separate only 1/7
 * dispatcher classes (meanMargin 0.0263) -- the coverage ceiling
 * ([[reference_gnn_embed_separability_diagnostic_2026_06_21]]). U-ENGINE-ACTION-SURFACE
 * (fd49523511) built the candidate dense leak-free feature. This harness measures, on a
 * FAIR same-node/same-class basis, whether the action-surface carries more class signal
 * than the name -- the go/no-go evidence for wiring it into build-node-embeddings
 * sourceSignal + a retrain. NON-DESTRUCTIVE: embeds in-memory, writes only a report json.
 *
 * METHOD: labels = single-dispatcher ground truth (extractWiredEngines o
 * buildEngineDispatcherMap). For each labeled engine WITH a non-empty action surface,
 * embed BOTH (a) its humanized name and (b) its action-surface text via the SAME nomic
 * model the pipeline uses, group by dispatcher, and run the SAME classSeparability metric
 * on each. Report name-vs-surface separable-fraction + meanMargin + per-class deltas, plus
 * the honest action-surface COVERAGE (engines with an empty surface cannot use this feature).
 *
 * Run: node scripts/measure-action-surface-separability.mjs [--limit N] [--min-class N] [--json] [--out <path>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractWiredEngines } from "./wired-engines-to-refpool.mjs";
import { buildActionSurfaceMap, actionSurfaceText } from "./lib/engine-action-surface.mjs";
import { classSeparability } from "./analyze-ghost-embed-separability.mjs";
import { resolveEmbedUrl, withLaneOptions, withMainFallback } from "./lib/embed-endpoint.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const MODEL = "nomic-embed-text"; // same model the deployed node-embed pipeline uses
const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//, "")}/api/embeddings`;
const EMBED_CONCURRENCY = 8;
const EMBED_TIMEOUT_MS = 20000;
// The deployed DESCRIPTION-text baseline this measurement is compared against.
const DEPLOYED_DESC_BASELINE = { separable: 1, scored: 7, meanMargin: 0.0263 };

/** PascalCase/camelCase engine class name -> lower-cased spaced words ("KienzleEngine" -> "kienzle engine"). */
export function humanizeEngineName(name) {
  return String(name || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")     // camel boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")  // ACRONYMtoWord boundary
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Collect labeled engines that HAVE a non-empty action surface. Pure (DI'd dirs). */
export function collectLabeledSurfaced(dispatchersDir = DISPATCHERS_DIR) {
  const { wirings } = extractWiredEngines(buildEngineDispatcherMap(dispatchersDir));
  const surf = buildActionSurfaceMap(dispatchersDir);
  const items = [];
  let labeled = 0, empty = 0;
  for (const w of wirings) {
    labeled++;
    const surfText = actionSurfaceText(surf, String(w.engine).toLowerCase());
    if (!surfText) { empty++; continue; }
    items.push({ engine: w.engine, dispatcher: w.dispatcher, nameText: humanizeEngineName(w.engine), surfText });
  }
  return { items, labeled, empty };
}

/** Group {dispatcher, vec} rows into Map<dispatcher, vec[]> for classSeparability. */
export function groupByClass(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!r || !r.vec) continue;
    if (!m.has(r.dispatcher)) m.set(r.dispatcher, []);
    m.get(r.dispatcher).push(r.vec);
  }
  return m;
}

async function ollamaEmbedAttempt(prompt, url, laneFlag) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const body = laneFlag ? withLaneOptions({ model: MODEL, prompt }) : { model: MODEL, prompt };
    const res = await fetch(`${url}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j && (j.embedding || (j.data && j.data[0] && j.data[0].embedding));
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// U-INDIA-EMBED-LANE: prefer the dedicated CPU embed lane (:11435) for this
// diagnostic measurement's batch embed -- the shared :11434 starves embed
// requests under fleet inference load. Auto-resolve ONLY when OLLAMA_HOST was
// not explicitly set (operator intent is never silently redirected). A FAILED
// lane attempt retries MAIN once (withMainFallback).
async function ollamaEmbed(prompt) {
  if (process.env.OLLAMA_HOST) {
    return ollamaEmbedAttempt(prompt, OLLAMA_URL.replace(/\/api\/embeddings$/, ""), false);
  }
  const lane = await resolveEmbedUrl();
  return withMainFallback(lane, (url, laneFlag) => ollamaEmbedAttempt(prompt, url, laneFlag));
}

/** Embed an array of {key,text} with a bounded concurrency pool -> Map<key, vec> (null on failure skipped). */
async function embedAll(jobs) {
  const out = new Map();
  let i = 0, failed = 0;
  async function worker() {
    while (i < jobs.length) {
      const idx = i++;
      const { key, text } = jobs[idx];
      const v = await ollamaEmbed(text);
      if (v) out.set(key, v); else failed++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(EMBED_CONCURRENCY, jobs.length) }, worker));
  return { out, failed };
}

function parseArgs(argv) {
  const o = { limit: Infinity, minClass: 5, json: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") o.limit = parseInt(argv[++i], 10) || Infinity;
    else if (a === "--min-class") o.minClass = Math.max(2, parseInt(argv[++i], 10) || 5);
    else if (a === "--json") o.json = true;
    else if (a === "--out") o.out = argv[++i];
  }
  return o;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { items, labeled, empty } = collectLabeledSurfaced();
  const use = Number.isFinite(opts.limit) ? items.slice(0, opts.limit) : items;
  const coveragePct = labeled ? Math.round((items.length / labeled) * 100) : 0;
  console.error(`labeled=${labeled} | with action-surface=${items.length} (${coveragePct}%) | embedding ${use.length} x2 (name + surface) via ${MODEL}...`);

  // One flat embed job list so both texts share the pool; key = "<i>:name" / "<i>:surf".
  const jobs = [];
  use.forEach((it, i) => { jobs.push({ key: `${i}:name`, text: it.nameText }); jobs.push({ key: `${i}:surf`, text: it.surfText }); });
  const { out: vecs, failed } = await embedAll(jobs);

  const nameRows = [], surfRows = [];
  use.forEach((it, i) => {
    const nv = vecs.get(`${i}:name`), sv = vecs.get(`${i}:surf`);
    if (nv) nameRows.push({ dispatcher: it.dispatcher, vec: nv });
    if (sv) surfRows.push({ dispatcher: it.dispatcher, vec: sv });
  });

  const nameSep = classSeparability(groupByClass(nameRows), opts.minClass);
  const surfSep = classSeparability(groupByClass(surfRows), opts.minClass);

  // Per-class margin delta (surface - name) for classes scored in BOTH.
  const nameByClass = new Map(nameSep.perClass.map((p) => [p.class, p]));
  const deltas = surfSep.perClass
    .filter((p) => nameByClass.has(p.class))
    .map((p) => ({ class: p.class, n: p.n, nameMargin: nameByClass.get(p.class).margin, surfMargin: p.margin, delta: Math.round((p.margin - nameByClass.get(p.class).margin) * 1e4) / 1e4 }))
    .sort((a, b) => b.delta - a.delta);

  const report = {
    measuredAt_note: "non-destructive separability measurement; stamp time externally",
    model: MODEL,
    coverage: { labeled, withActionSurface: items.length, coveragePct, emptySurface: empty, embedded: use.length, embedFailed: failed },
    deployedDescriptionBaseline: DEPLOYED_DESC_BASELINE,
    nameBaseline: nameSep.summary,
    actionSurface: surfSep.summary,
    perClassDeltas: deltas,
  };

  if (opts.out) {
    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, JSON.stringify(report, null, 2));
    console.error(`wrote ${opts.out}`);
  }
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }

  console.log(`\nACTION-SURFACE separability vs NAME baseline (same ${use.length} engines, min-class ${opts.minClass}):`);
  console.log(`  coverage: ${items.length}/${labeled} labeled engines have an action surface (${coveragePct}%); ${empty} empty (cannot use this feature)`);
  console.log(`  embed: ${use.length} engines, ${failed} embed failures`);
  console.log(`  NAME    : separable ${nameSep.summary.separableClasses}/${nameSep.summary.classesScored}, meanMargin ${nameSep.summary.meanMargin}`);
  console.log(`  SURFACE : separable ${surfSep.summary.separableClasses}/${surfSep.summary.classesScored}, meanMargin ${surfSep.summary.meanMargin}`);
  console.log(`  (deployed DESCRIPTION baseline reference: ${DEPLOYED_DESC_BASELINE.separable}/${DEPLOYED_DESC_BASELINE.scored}, meanMargin ${DEPLOYED_DESC_BASELINE.meanMargin})`);
  console.log(`  top per-class margin gains (surface - name):`);
  for (const d of deltas.slice(0, 8)) console.log(`    ${d.delta >= 0 ? "+" : ""}${d.delta}  ${d.class} (n=${d.n}, name ${d.nameMargin} -> surf ${d.surfMargin})`);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { console.error("measure-action-surface-separability failed:", e?.message || e); process.exit(1); });
