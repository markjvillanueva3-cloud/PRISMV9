#!/usr/bin/env node
// scripts/galaxy-meta-synthesis.mjs
// L2/L3 hierarchical compounding (2026-05-29 slot:alpha). B1 produced per-galaxy
// L1 syntheses (patterns/<g>_synthesis.md). This is where compounding COMPOUNDS:
//   L2 — find patterns that RECUR ACROSS ≥2 galaxies (cross-cutting meta-patterns
//        + cross-domain contradictions) that no single galaxy's synthesis holds.
//   L3 — promote the most cross-cutting, rule-like meta-patterns to DOCTRINE
//        CANDIDATES (advisory; the fleeting→memory→wiki→CLAUDE.md path). NEVER
//        auto-edits CLAUDE.md — emits a human-verify candidate list.
//
// EFFICIENCY (alpha): the cross-domain STRUCTURE — which galaxies share patterns —
// is computed DETERMINISTICALLY from the 34 synthesis EMBEDDINGS already in the
// sidecar (free, no LLM): pairwise cosine → threshold graph → connected components.
// The LLM is used ONLY to NAME each small cluster (input fits Ollama context).
// If ollama is down, the structural clusters still emit (graceful degradation).
//
// Reads:   state/shared/memory-embeddings-sidecar.json (patterns/<g>_synthesis vecs)
//          + knowledge/memories/patterns/<g>_synthesis.md (texts, for LLM naming)
// Writes:  knowledge/memories/patterns/_meta_synthesis.md (L2, recall-indexable)
//          + state/shared/specs/DOCTRINE-CANDIDATES.md (L3, advisory)

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { unpackInt8, cosineSimInt8 } from "./lib/memory-index-search-lib.mjs";
import { synthesizeViaOllama, ollamaPreflight } from "./galaxy-reflection-synthesis.mjs";
import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

const DEFAULT_EMB_SIDECAR = "H:/prism/state/shared/memory-embeddings-sidecar.json";
const DEFAULT_PATTERNS_DIR = "H:/prism/knowledge/memories/patterns";
const DEFAULT_DOCTRINE_PATH = "H:/prism/state/shared/specs/DOCTRINE-CANDIDATES.md";
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_THRESHOLD = 0.93;   // empirically the sweet spot: tight semantic clusters; 0.92 over-merges via the cross-cutting "quality" hub, 0.94 is too sparse (measured on the 34 real synthesis vectors)
const DOCTRINE_MIN_DOMAINS = 3;   // a cross-domain rule spanning ≥3 galaxies is a doctrine candidate
const MAX_CLUSTER_FRACTION = 0.5; // a cluster spanning >50% of galaxies = THRESHOLD COLLAPSE, not a real pattern

// The cluster-size above which a "cluster" is threshold collapse (everything
// merged), not a genuine cross-domain pattern. Reviewer-B P1: the tuned 0.93 is
// distribution-specific; a shift (more galaxies / regenerated syntheses) could
// silently produce a mega-cluster that, if named, sorts to the TOP of the
// doctrine candidates. This bounds it.
export function degenerateClusterLimit(totalDomains) {
  return Math.max(DOCTRINE_MIN_DOMAINS, Math.floor(totalDomains * MAX_CLUSTER_FRACTION));
}
const SYNTH_SUFFIX = "_synthesis";

// ---- load the L1 synthesis vectors (deterministic cross-domain structure) ----

export function loadSynthesisVectors(embSidecar) {
  const recs = (embSidecar && Array.isArray(embSidecar.records)) ? embSidecar.records : [];
  const out = [];
  for (const r of recs) {
    const key = r && typeof r.key === "string" ? r.key : "";
    if (!key.startsWith("patterns/") || !key.endsWith(SYNTH_SUFFIX)) continue;
    const galaxy = r.name ? r.name.replace(new RegExp(SYNTH_SUFFIX + "$"), "") : key.slice("patterns/".length).replace(new RegExp(SYNTH_SUFFIX + "$"), "");
    if (galaxy.startsWith("_")) continue; // skip the L2 meta doc itself
    let vec;
    try { vec = unpackInt8(r.vec); } catch { vec = null; }
    if (!vec || !vec.length || !Number.isFinite(r.norm) || r.norm <= 0) continue;
    out.push({ galaxy, vec, norm: r.norm });
  }
  return out;
}

// ---- pairwise cosine affinity + connected-component clustering ----

export function affinityEdges(vectors, threshold = DEFAULT_THRESHOLD) {
  const edges = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const c = cosineSimInt8(vectors[i].vec, vectors[j].vec, vectors[j].norm, vectors[i].norm);
      if (c >= threshold) edges.push({ a: vectors[i].galaxy, b: vectors[j].galaxy, cosine: c });
    }
  }
  return edges;
}

// Connected components over the affinity graph. Galaxies with no qualifying edge
// are SINGLETONS (no cross-domain pattern at this threshold) — returned separately
// (their isolation is itself informative, not an error).
export function clusterByAffinity(vectors, edges) {
  const parent = new Map(vectors.map((v) => [v.galaxy, v.galaxy]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { parent.set(find(a), find(b)); };
  for (const e of edges) union(e.a, e.b);
  const groups = new Map();
  for (const v of vectors) {
    const root = find(v.galaxy);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(v.galaxy);
  }
  const clusters = [];
  const singletons = [];
  for (const members of groups.values()) {
    if (members.length >= 2) clusters.push(members.sort());
    else singletons.push(members[0]);
  }
  // largest cluster first — stable, deterministic
  clusters.sort((x, y) => y.length - x.length || x[0].localeCompare(y[0]));
  return { clusters, singletons: singletons.sort() };
}

// ---- AUTO-TUNE the affinity threshold to the live embedding distribution ----
// The sidecar's synthesis-vector SET is volatile (re-embedded continuously by the
// memory pipeline -- observed 34 vectors one run, 15 the next). A STATIC threshold
// silently collapses into a mega-cluster on a distribution shift (reviewer-B P1)
// -> 0 doctrine candidates, the master-galaxy compounding dies QUIETLY. Auto-tune
// picks the DENSEST threshold that does NOT collapse for the CURRENT vectors, so
// the cross-galaxy knowledge-sharing self-corrects every run.
const DEFAULT_THRESHOLD_LADDER = Array.from({ length: 17 }, (_, i) => Number((0.90 + i * 0.005).toFixed(3)));

/**
 * Pick the densest non-collapse affinity threshold for `vectors`. Ascending sweep
 * -> the FIRST threshold whose largest cluster <= the degenerate limit is the most
 * cross-domain structure retainable without collapse. Pure (edgesFn/clusterFn
 * injectable for testing). Falls back to the highest ladder value if EVERY
 * threshold collapses.
 * @param {Array} vectors synthesis vectors (from loadSynthesisVectors)
 * @param {{ladder?:number[], limit?:number, edgesFn?:Function, clusterFn?:Function}} [o]
 * @returns {{threshold:number, clusters:number, maxCluster:number, reason:string, limit:number}}
 */
export function autoTuneThreshold(vectors, { ladder = DEFAULT_THRESHOLD_LADDER, limit, edgesFn = affinityEdges, clusterFn = clusterByAffinity } = {}) {
  const lim = typeof limit === "number" ? limit : degenerateClusterLimit(Array.isArray(vectors) ? vectors.length : 0);
  for (const t of [...ladder].sort((a, b) => a - b)) {
    const { clusters } = clusterFn(vectors, edgesFn(vectors, t));
    const maxC = clusters.length ? Math.max(...clusters.map((c) => c.length)) : 0;
    if (maxC <= lim) {
      return { threshold: t, clusters: clusters.length, maxCluster: maxC, reason: `densest non-collapse (max ${maxC} <= ${lim})`, limit: lim };
    }
  }
  const hi = Math.max(...ladder);
  return { threshold: hi, clusters: 0, maxCluster: 0, reason: "all-collapse fallback -> highest threshold", limit: lim };
}

// ---- LLM cluster naming (small input — fits Ollama context) ----

export function loadSynthesisTexts(galaxies, patternsDir = DEFAULT_PATTERNS_DIR, { readFileImpl = readFileSync } = {}) {
  const texts = {};
  for (const g of galaxies) {
    try {
      const body = readFileImpl(join(patternsDir, `${g}${SYNTH_SUFFIX}.md`), "utf8");
      // strip frontmatter + the advisory banner; keep the distilled sections
      const afterFm = body.replace(/^---[\s\S]*?---\s*/m, "");
      texts[g] = afterFm.replace(/^>.*$/gm, "").replace(/^#.*$/gm, "").trim().slice(0, 1200);
    } catch { texts[g] = ""; }
  }
  return texts;
}

export function buildClusterPrompt(members, texts) {
  const blocks = members.map((g) => `### ${g}\n${(texts[g] || "(no text)").slice(0, 1000)}`);
  return [
    `These ${members.length} PRISM engineering domains have semantically-related synthesis docs: ${members.join(", ")}.`,
    `Each block below is that domain's distilled patterns.`,
    ``,
    ...blocks,
    ``,
    `Identify what they SHARE that no single domain states alone. Output EXACTLY these three lines (one each, keep each ≤ 200 chars):`,
    `META-PATTERN: <the cross-cutting pattern these domains share>`,
    `CROSS-DOMAIN RULE: <a reusable rule implied across them, or NONE>`,
    `CONTRADICTION: <any way two of these domains disagree, or NONE>`,
    `Rules: be specific; cite domain names; do NOT invent facts not in the blocks; no preamble.`,
  ].join("\n");
}

export function parseClusterNaming(text) {
  const grab = (label) => {
    const m = (text || "").match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : "";
  };
  const rule = grab("CROSS-DOMAIN RULE");
  return {
    metaPattern: grab("META-PATTERN"),
    rule: /^none$/i.test(rule) ? "" : rule,
    contradiction: (() => { const c = grab("CONTRADICTION"); return /^none$/i.test(c) ? "" : c; })(),
  };
}

// ---- doctrine candidates (L3) ----

export function detectDoctrineCandidates(named, { minDomains = DOCTRINE_MIN_DOMAINS, maxDomains = Infinity } = {}) {
  // A cross-domain RULE spanning [minDomains, maxDomains] galaxies is a candidate.
  // The maxDomains ceiling excludes a threshold-collapse mega-cluster (which would
  // otherwise sort to the TOP since candidates are ranked by domain count desc).
  return named
    .filter((n) => n.rule && n.members.length >= minDomains && n.members.length <= maxDomains)
    .sort((a, b) => b.members.length - a.members.length);
}

// ---- doc assembly ----

export function buildMetaDoc(named, singletons, { threshold, builtAt, model } = {}) {
  const stamp = builtAt || "(unstamped)";
  const lines = [
    `---`,
    `name: _meta_synthesis`,
    `description: "[auto-synth · verify] L2 cross-galaxy meta-synthesis — patterns that recur ACROSS domains (LLM-named; verify before trusting)"`,
    `metadata:`,
    `  type: patterns`,
    `  level: L2`,
    `  clusters: ${named.length}`,
    `  threshold: ${threshold}`,
    `  model: ${model}`,
    `  synthesizedAt: ${stamp}`,
    `  advisoryOnly: true`,
    `  mustHumanVerify: true`,
    `---`,
    ``,
    `# Cross-galaxy meta-synthesis (L2 — the compounding of the compounding)`,
    ``,
    `> ⚠ ADVISORY — LLM-named cross-domain clusters; \`mustHumanVerify\`. The CLUSTERS`,
    `> (which domains relate) are deterministic from synthesis-embedding cosine ≥ ${threshold};`,
    `> the NAMES/rules are ${model}-generated. Verify before trusting. Regenerated each run.`,
    ``,
  ];
  for (const n of named) {
    lines.push(`## ${n.members.join(" · ")}`);
    if (n.degenerate) lines.push(`- **⚠ THRESHOLD-COLLAPSE** — this cluster spans > half the galaxies; it is likely an artifact of too-low a threshold, NOT a real cross-domain pattern. Excluded from doctrine candidates.`);
    if (n.metaPattern) lines.push(`- **Meta-pattern:** ${n.metaPattern}`);
    if (n.rule) lines.push(`- **Cross-domain rule:** ${n.rule}`);
    if (n.contradiction) lines.push(`- **Contradiction:** ${n.contradiction}`);
    if (!n.metaPattern && !n.rule && !n.contradiction) lines.push(`- _(cluster found structurally; naming pending — ollama unavailable at run time)_`);
    lines.push(``);
  }
  if (singletons.length) {
    lines.push(`## Singletons (no cross-domain pattern at threshold ${threshold})`);
    lines.push(singletons.join(", "));
    lines.push(``);
  }
  return lines.join("\n");
}

export function buildDoctrineDoc(candidates, { builtAt, threshold } = {}) {
  const stamp = builtAt || "(unstamped)";
  const lines = [
    `# Doctrine candidates (L3) — advisory, MUST HUMAN-VERIFY`,
    ``,
    `> Generated by \`galaxy-meta-synthesis.mjs\`. A doctrine candidate is a cross-domain`,
    `> RULE spanning ≥ ${DOCTRINE_MIN_DOMAINS} galaxies (affinity threshold ${threshold}). These are`,
    `> the highest-leverage promotion targets for the fleeting→memory→wiki→CLAUDE.md path.`,
    `> **NEVER auto-applied** — an operator/owner verifies each before it becomes doctrine.`,
    `> Generated: ${stamp}`,
    ``,
  ];
  if (!candidates.length) {
    lines.push(`_No doctrine candidates this run (no cross-domain rule spans ≥ ${DOCTRINE_MIN_DOMAINS} domains)._`);
  } else {
    candidates.forEach((c, i) => {
      lines.push(`## ${i + 1}. ${c.members.join(" · ")} (${c.members.length} domains)`);
      lines.push(`- **Candidate rule:** ${c.rule}`);
      if (c.metaPattern) lines.push(`- **Meta-pattern:** ${c.metaPattern}`);
      lines.push(`- **Verify:** does this rule actually hold in each named domain? If yes → promote to wiki/CLAUDE.md.`);
      lines.push(``);
    });
  }
  return lines.join("\n");
}

export function writeFileAtomic(outPath, content, { writeImpl = writeFileSync, renameImpl = renameSync, mkdirImpl = mkdirSync, existsImpl = existsSync } = {}) {
  if (!content || typeof content !== "string") throw new Error("writeFileAtomic: refusing to write empty content");
  const dir = dirname(outPath);
  if (!existsImpl(dir)) mkdirImpl(dir, { recursive: true });
  const tmp = `${outPath}.tmp.${process.pid}`;
  writeImpl(tmp, content, "utf8");
  renameImpl(tmp, outPath);
  return outPath;
}

// ---- CLI ----

export function parseArgs(argv) {
  const a = { dryRun: false, json: false, model: DEFAULT_MODEL, threshold: DEFAULT_THRESHOLD };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--json") a.json = true;
    else if (t === "--model") a.model = argv[++i];
    else if (t === "--threshold") a.threshold = Math.min(0.999, Math.max(0.5, parseFloat(argv[++i]) || DEFAULT_THRESHOLD));
  }
  return a;
}

// Detect an EXPLICIT `--model <value>` from the RAW argv. We canNOT compare
// args.model to DEFAULT_MODEL — parseArgs bakes the default in, so an operator
// who explicitly passed `--model qwen2.5-coder:7b` (== the default) would be
// indistinguishable from no flag, and the host-aware resolver would silently
// override their intent. Reading raw argv preserves "explicit always wins".
export function detectExplicitModelOverride(argv) {
  const idx = argv.indexOf("--model");
  if (idx === -1) return null;
  const val = argv[idx + 1];
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

// Detect an EXPLICIT `--threshold` (same rationale as detectExplicitModelOverride:
// parseArgs bakes the default in, so we read raw argv to let an operator override
// the auto-tune). Returns the clamped value, or null when no flag was passed (->
// main auto-tunes the threshold to the live embedding distribution).
export function detectExplicitThreshold(argv) {
  const idx = argv.indexOf("--threshold");
  if (idx === -1) return null;
  const val = parseFloat(argv[idx + 1]);
  return Number.isFinite(val) ? Math.min(0.999, Math.max(0.5, val)) : null;
}

// Resolve the synthesis model ONCE for a run: explicit --model wins; otherwise
// the host-aware resolver routes to the best LOCAL model for this host (Blackwell
// → 32B; weak host → the same small model; ollama down → fallback). Fail-soft:
// any resolver throw degrades to the conservative `fallback` so a synthesis run
// is never crashed by model selection. `resolverFn` is injectable for testing.
export async function resolveModel({ argv = [], fallback = DEFAULT_MODEL, resolverFn = resolveSynthesisModel } = {}) {
  const override = detectExplicitModelOverride(argv);
  try {
    const res = await resolverFn({ fallback, override });
    const model = res && typeof res.model === "string" && res.model.trim() ? res.model.trim() : fallback;
    return { model, source: (res && res.source) || "fallback" };
  } catch {
    return { model: fallback, source: "fallback" };
  }
}

// Faster-loading models to NAME clusters with when the best synthesis model is
// cold/unavailable. Ordered by likelihood-of-being-resident on the Blackwell host
// (the 32B coder is the fleet default; the 20B is the mid tier). Both cold-load
// far faster than gpt-oss:120b (65GB).
export const NAMING_FALLBACK_MODELS = ["qwen2.5-coder:32b", "gpt-oss:20b"];

/**
 * Resolve the model to NAME clusters with. The resolved BEST synthesis model
 * (e.g. gpt-oss:120b, 65GB) can exceed the preflight COLD-LOAD window while Ollama
 * itself is UP -> 0 named -> 0 doctrine candidates (the master-galaxy loop silently
 * produces nothing). If the preferred model's preflight fails AND the operator did
 * NOT pin --model, fall back to a faster model for the SMALL naming task so the
 * loop COMPLETES. Returns {model, up, fellBack}. preflightFn injected for tests.
 * @param {{preferred:string, candidates?:string[], hasOverride?:boolean, preflightFn:(m:string)=>Promise<boolean>}} o
 * @returns {Promise<{model:string, up:boolean, fellBack:boolean}>}
 */
export async function resolveNamingModel({ preferred, candidates = NAMING_FALLBACK_MODELS, hasOverride = false, preflightFn } = {}) {
  if (typeof preflightFn !== "function") throw new TypeError("resolveNamingModel: preflightFn is required");
  if (await preflightFn(preferred)) return { model: preferred, up: true, fellBack: false };
  if (hasOverride) return { model: preferred, up: false, fellBack: false }; // operator pinned -> never substitute
  for (const alt of candidates) {
    if (alt === preferred) continue;
    if (await preflightFn(alt)) return { model: alt, up: true, fellBack: true };
  }
  return { model: preferred, up: false, fellBack: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Resolve the synthesis model ONCE for the run (host-aware token savings):
  // explicit --model wins; else best LOCAL model for this host; else DEFAULT_MODEL.
  // The resolved model threads into BOTH preflight and generation so they agree.
  const { model: resolvedModel, source: modelSource } = await resolveModel({ argv: process.argv.slice(2), fallback: DEFAULT_MODEL });
  if (resolvedModel !== DEFAULT_MODEL) process.stderr.write(`[meta-synth] synthesis model resolved → ${resolvedModel} (source: ${modelSource}; fallback ${DEFAULT_MODEL})\n`);

  const emb = JSON.parse(readFileSync(DEFAULT_EMB_SIDECAR, "utf8"));
  const vectors = loadSynthesisVectors(emb);
  if (vectors.length < 2) { process.stderr.write(`[meta-synth] FAIL-LOUD: only ${vectors.length} L1 syntheses — run galaxy-reflection-synthesis.mjs --all first\n`); process.exit(1); }

  // Threshold: an explicit --threshold wins; else AUTO-TUNE for the LIVE embedding
  // distribution (the synthesis-vector set is volatile -> a static threshold
  // silently collapses into a mega-cluster on a shift, reviewer-B P1). Auto-tune
  // keeps the master-galaxy compounding non-degenerate so it never silently emits
  // 0 doctrine candidates.
  if (detectExplicitThreshold(process.argv.slice(2)) == null) {
    const tuned = autoTuneThreshold(vectors);
    args.threshold = tuned.threshold;
    process.stderr.write(`[meta-synth] auto-tuned threshold -> ${tuned.threshold} (${tuned.reason}; ${tuned.clusters} clusters / ${vectors.length} vectors)\n`);
  }

  const edges = affinityEdges(vectors, args.threshold);
  const { clusters, singletons } = clusterByAffinity(vectors, edges);
  process.stderr.write(`[meta-synth] ${vectors.length} syntheses → ${clusters.length} cross-domain clusters (threshold ${args.threshold}), ${singletons.length} singletons\n`);

  // R12 fail-loud on threshold collapse (Reviewer-B P1): a cluster spanning > half
  // the galaxies is "everything relates to everything", not a real pattern.
  const maxClusterSize = degenerateClusterLimit(vectors.length);
  const degenerate = clusters.filter((c) => c.length > maxClusterSize);
  if (degenerate.length) {
    const biggest = Math.max(...degenerate.map((c) => c.length));
    process.stderr.write(`[meta-synth] ⚠ THRESHOLD-COLLAPSE: ${degenerate.length} cluster(s) span > ${maxClusterSize}/${vectors.length} galaxies (largest ${biggest}). The threshold ${args.threshold} is too LOW for the current embedding distribution — these are EXCLUDED from doctrine candidates + flagged in the meta doc. Re-run with a higher --threshold.\n`);
  }

  // LLM-name each cluster. The resolved BEST model (e.g. gpt-oss:120b, 65GB) can
  // exceed the preflight COLD-LOAD window while Ollama is UP -> 0 named -> 0
  // doctrine candidates (the master-galaxy loop silently produces nothing). Fall
  // back to a faster model for the small naming task so the loop COMPLETES, unless
  // the operator pinned --model. (U-METASYNTH-NAME-FALLBACK)
  let ollamaUp = false, namingModel = resolvedModel;
  if (!args.dryRun) {
    const nm = await resolveNamingModel({
      preferred: resolvedModel,
      hasOverride: detectExplicitModelOverride(process.argv.slice(2)) != null,
      preflightFn: (m) => ollamaPreflight(DEFAULT_OLLAMA_URL, m),
    });
    namingModel = nm.model; ollamaUp = nm.up;
    if (nm.fellBack) process.stderr.write(`[meta-synth] best model ${resolvedModel} cold/unavailable -> naming via faster ${namingModel}\n`);
  }
  if (!args.dryRun && !ollamaUp) process.stderr.write(`[meta-synth] ollama unavailable — emitting STRUCTURAL clusters without names (graceful degradation)\n`);

  const named = [];
  for (const members of clusters) {
    let naming = { metaPattern: "", rule: "", contradiction: "" };
    if (ollamaUp) {
      try {
        const texts = loadSynthesisTexts(members);
        const out = await synthesizeViaOllama({ prompt: buildClusterPrompt(members, texts), model: namingModel });
        naming = parseClusterNaming(out);
      } catch (err) { process.stderr.write(`[meta-synth] cluster [${members.join(",")}] naming failed: ${err?.message || err}\n`); }
    }
    named.push({ members, degenerate: members.length > maxClusterSize, ...naming });
  }

  const candidates = detectDoctrineCandidates(named, { maxDomains: maxClusterSize });

  if (args.dryRun) {
    const payload = { vectors: vectors.length, clusters: clusters.map((c) => c), singletons, doctrineCandidates: candidates.length };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  const builtAt = new Date().toISOString();
  const metaPath = writeFileAtomic(join(DEFAULT_PATTERNS_DIR, "_meta_synthesis.md"), buildMetaDoc(named, singletons, { threshold: args.threshold, builtAt, model: namingModel }));
  const docPath = writeFileAtomic(DEFAULT_DOCTRINE_PATH, buildDoctrineDoc(candidates, { builtAt, threshold: args.threshold }));

  const result = { vectors: vectors.length, clusters: clusters.length, singletons: singletons.length, doctrineCandidates: candidates.length, named: named.filter((n) => n.metaPattern).length, metaPath, docPath };
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(`[meta-synth] wrote ${metaPath} (${clusters.length} clusters, ${named.filter((n) => n.metaPattern).length} named) + ${docPath} (${candidates.length} doctrine candidates)\n`);
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(process.argv[1] || "");
  } catch { return false; }
})();

if (invokedDirect) main().catch((err) => { try { process.stderr.write(`[meta-synth] ${err?.stack || err}\n`); } catch {} process.exit(1); });
