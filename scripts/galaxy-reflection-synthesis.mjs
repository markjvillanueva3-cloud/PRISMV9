#!/usr/bin/env node
// scripts/galaxy-reflection-synthesis.mjs
// B1 — per-galaxy reflection synthesis (2026-05-29 slot:alpha). THE compounding
// arm of the Obsidian brain: the vault CAPTURES ~11k memories but never
// COMPOUNDS them into higher-order, reusable insight (the `patterns/` namespace
// was empty). This job distills each galaxy DOMAIN's accumulated reference/
// feedback memories into one compounding `patterns/<galaxy>_synthesis.md`.
//
// AXIS NICHE (dedup-verified): complements — does not duplicate — the existing
//   • TIME axis    — hermes-self-reflect-populater.mjs (weekly) + WeeklySynthesisEngine
//   • CONNECTION   — hermes-dream-cycle-synth.mjs (Jaccard cross-links → dreams/)
//   • DOMAIN axis  — THIS (per-galaxy semantic clusters → patterns/)
//
// It is the first consumer of the A6/A3 hybrid recall: it gathers each galaxy's
// memories by running the recall over a domain query built from the galaxy
// brain's own extracted domain text (reuses extractGalaxyDomainText), so the
// synthesis input is exactly the domain-relevant memory cluster.
//
// Reads:   knowledge/memories/* (via runMemoryIndexSearch) + engines/<g>/MEMORY.md
// Writes:  knowledge/memories/patterns/<galaxy>_synthesis.md (atomic .tmp+rename)
//          (`patterns` is already in DEFAULT_NAMESPACES → re-indexed on the next
//           sidecar rebuild, so the compounding artifact becomes recall-discoverable.)
//
// Ollama generation required (qwen2.5-coder:32b default). Fail-loud (R12): exits 1
// on ollama preflight failure or if > MAX_FAIL_FRACTION of galaxies fail.
// Idempotent: a synthesis is regenerated (overwrite); --dry-run prints, no write.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createHash } from "node:crypto";

import { runMemoryIndexSearch } from "./lib/memory-index-search-lib.mjs";
import { extractGalaxyDomainText } from "./build-memory-index-sidecar.mjs";
import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

// Fingerprint of the memory cluster a synthesis was built from — stored in the
// synthesis frontmatter so the incremental refresher (amplifier #2) can detect
// when a galaxy's domain memories have CHANGED (→ re-synthesize) vs are unchanged
// (→ skip). Deterministic, order-independent (sorted). Hashes the actual SYNTHESIS
// INPUT — name+namespace+description+opening, i.e. exactly what buildSynthesisPrompt
// feeds the LLM — so a memory whose CONTENT changes (not just its filename) flips
// the hash. (Hashing keys alone missed content edits — the common case — Reviewer-B
// P2-1.) Still free: these fields are already in the gathered hits, no extra reads.
export function computeSourceHash(memories) {
  const parts = (Array.isArray(memories) ? memories : [])
    .map((m) => `${m.namespace}/${m.name}\t${m.description || ""}\t${m.opening || ""}`)
    .sort();
  return createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 12);
}

const DEFAULT_ENGINES_ROOT = "H:/prism/mcp-server/src/engines";
const DEFAULT_PATTERNS_DIR = "H:/prism/knowledge/memories/patterns";
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_TOPK = 24;
const DEFAULT_GEN_TIMEOUT_MS = 120000; // synthesis is a longer generation
const DEFAULT_KEEP_ALIVE = "30m";      // pin the model resident across the batch (env default 5m unloads it)
const PREFLIGHT_TIMEOUT_MS = 180000;   // a cold load of a 7B model from H: measured ~57s — must NOT time out
const MIN_MEMORIES = 3;                 // below this the cluster is too thin to synthesize
const MAX_FAIL_FRACTION = 0.5;          // > half the galaxies failing → exit 1

// ---- gathering -------------------------------------------------------------

// Build the domain query for a galaxy from its slug + the brain's domain text
// (reuses the A3-enrichment extractor — same domain vocabulary that makes the
// brain itself recall-discoverable now drives WHICH memories we cluster).
export function buildGalaxyQuery(galaxy, brainBody) {
  const domainText = brainBody ? extractGalaxyDomainText(brainBody, { maxChars: 400 }) : "";
  return `${galaxy} ${domainText}`.trim();
}

// Gather the domain-relevant memory cluster for a galaxy. Filters to the raw
// accumulation namespaces (reference/feedback/project/mistakes) — NOT the
// galaxies namespace (don't fold a brain's own summary back into its synthesis),
// NOT patterns (don't recursively re-synthesize prior syntheses).
export function gatherGalaxyMemories({ galaxy, brainBody, topK = DEFAULT_TOPK, searchImpl = runMemoryIndexSearch }) {
  const query = buildGalaxyQuery(galaxy, brainBody);
  const res = searchImpl(query, { topK: topK * 2 }) || {};
  const RAW = new Set(["reference", "feedback", "project", "mistakes"]);
  const out = [];
  for (const h of res.hits || []) {
    if (!RAW.has(h.namespace)) continue;
    out.push({
      name: h.name,
      namespace: h.namespace,
      description: (h.description || "").slice(0, 200),
      opening: (h.opening || "").slice(0, 200),
    });
    if (out.length >= topK) break;
  }
  return { query, memories: out };
}

// ---- synthesis prompt ------------------------------------------------------

export function buildSynthesisPrompt(galaxy, memories) {
  const lines = memories.map((m, i) => {
    const body = [m.description, m.opening].filter(Boolean).join(" — ");
    return `${i + 1}. [${m.namespace}/${m.name}] ${body}`.slice(0, 320);
  });
  return [
    `You are distilling the cross-session engineering memory of the PRISM "${galaxy}" domain`,
    `into a COMPOUNDING knowledge synthesis — the reusable patterns that ${memories.length} scattered`,
    `memories add up to but none states alone.`,
    ``,
    `Memory excerpts (name + summary):`,
    ...lines,
    ``,
    `Write CONCISE markdown with exactly these sections (omit a section only if truly nothing applies):`,
    `## Recurring patterns`,
    `## Key decisions & rules`,
    `## Open threads`,
    ``,
    `Rules: be specific to the ${galaxy} domain; cite memory names in [brackets] where useful;`,
    `do NOT invent facts not supported by the excerpts; no preamble, start at the first "##".`,
  ].join("\n");
}

// ---- ollama (the one impure primitive; injectable for tests) ---------------

export async function synthesizeViaOllama({
  prompt,
  model = DEFAULT_MODEL,
  url = DEFAULT_OLLAMA_URL,
  timeoutMs = DEFAULT_GEN_TIMEOUT_MS,
  keepAlive = DEFAULT_KEEP_ALIVE,
  fetchImpl = fetch,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keep_alive pins the model resident across the batch — the env default
      // (OLLAMA_KEEP_ALIVE=5m) would let a slow ~57s cold reload time out the
      // NEXT generate after an idle gap. This makes each call refresh the pin.
      body: JSON.stringify({ model, prompt, stream: false, keep_alive: keepAlive, options: { temperature: 0.2 } }),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`ollama HTTP ${r.status}`);
    const j = await r.json();
    let text = (j && typeof j.response === "string") ? j.response.trim() : "";
    // deepseek-r1 and friends emit <think>…</think> reasoning — strip it.
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ---- doc assembly + write --------------------------------------------------

export function buildSynthesisDoc(galaxy, synthesisText, { memCount = 0, model = DEFAULT_MODEL, builtAt, sourceHash = "" } = {}) {
  const stamp = builtAt || "(unstamped)";
  return [
    `---`,
    `name: ${galaxy}_synthesis`,
    // The "[auto-synth · verify]" prefix is deliberate: the recall injector
    // renders name+description+opening (NOT the body), so this is the ONLY place
    // the LLM-generated caveat reaches a chat that recall surfaces this doc to
    // (Reviewer-B P1 — patterns/ is fleet-wide recall-discoverable; a hallucinated
    // rule must not look authoritative).
    `description: "[auto-synth · verify] Compounding synthesis of the ${galaxy} domain — recurring patterns, decisions, open threads distilled from ${memCount} memories (LLM-generated; verify against source memories before trusting)"`,
    `metadata:`,
    `  type: patterns`,
    `  galaxy: ${galaxy}`,
    `  synthesizedFrom: ${memCount}`,
    `  model: ${model}`,
    `  synthesizedAt: ${stamp}`,
    `  sourceHash: ${sourceHash || "none"}`,
    `  advisoryOnly: true`,
    `  mustHumanVerify: true`,
    `---`,
    ``,
    `# ${galaxy} — domain synthesis (compounding)`,
    ``,
    `> ⚠ ADVISORY — LLM-generated (${model}), \`mustHumanVerify\`. Auto-distilled by`,
    `> \`galaxy-reflection-synthesis.mjs\` (B1) from ${memCount} domain-relevant memories via the`,
    `> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting`,
    `> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source`,
    `> memories, not this file. The compounding arm of the Obsidian brain.`,
    ``,
    synthesisText,
    ``,
  ].join("\n");
}

export function writeSynthesisDoc({ galaxy, doc, outDir = DEFAULT_PATTERNS_DIR, writeImpl = writeFileSync, mkdirImpl = mkdirSync, renameImpl = renameSync, existsImpl = existsSync }) {
  if (!doc || typeof doc !== "string") throw new Error("writeSynthesisDoc: refusing to write empty doc");
  if (!existsImpl(outDir)) mkdirImpl(outDir, { recursive: true });
  const outPath = join(outDir, `${galaxy}_synthesis.md`);
  const tmp = `${outPath}.tmp.${process.pid}`;
  writeImpl(tmp, doc, "utf8");
  renameImpl(tmp, outPath);
  return outPath;
}

// ---- galaxy enumeration ----------------------------------------------------

export function listGalaxies(enginesRoot = DEFAULT_ENGINES_ROOT, { readdirImpl = readdirSync, existsImpl = existsSync } = {}) {
  if (!existsImpl(enginesRoot)) return [];
  let names;
  try { names = readdirImpl(enginesRoot); } catch { return []; }
  return names.filter((n) => typeof n === "string" && existsImpl(join(enginesRoot, n, "MEMORY.md")));
}

// ---- CLI -------------------------------------------------------------------

export function parseArgs(argv) {
  const a = { all: false, galaxy: null, dryRun: false, json: false, model: DEFAULT_MODEL, topK: DEFAULT_TOPK, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--json") a.json = true;
    else if (t === "--galaxy") a.galaxy = argv[++i];
    else if (t === "--model") a.model = argv[++i];
    else if (t === "--topk") a.topK = Math.max(4, parseInt(argv[++i], 10) || DEFAULT_TOPK);
    else if (t === "--limit") a.limit = Math.max(1, parseInt(argv[++i], 10) || Infinity);
  }
  return a;
}

// Exported + fetch-injectable so the most load-bearing fail-loud gate (the one
// that prevents a silent no-op batch when Ollama is down) is unit-testable.
export async function ollamaPreflight(url, model, { fetchImpl = fetch, keepAlive = DEFAULT_KEEP_ALIVE, timeoutMs = PREFLIGHT_TIMEOUT_MS } = {}) {
  try {
    const r = await fetchImpl(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Doubles as a PRE-WARM: keep_alive pins the model resident so the batch
      // that follows runs warm. Timeout must absorb the cold load (~57s for a 7B
      // from H:) — the old 60s ceiling flapped right at the cold-load edge, which
      // was the entire "ollama generation flapping" symptom.
      body: JSON.stringify({ model, prompt: "Reply with: OK", stream: false, keep_alive: keepAlive, options: { num_predict: 4 } }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return false;
    const j = await r.json();
    return typeof j.response === "string";
  } catch { return false; }
}

// Detect an EXPLICIT --model flag from the RAW argv. parseArgs bakes DEFAULT_MODEL
// into args.model, so comparing args.model to DEFAULT_MODEL would MISS an explicit
// `--model qwen2.5-coder:7b` (operator intent that happens to equal the default).
// We read the raw token instead so an explicit flag always wins in the resolver.
export function explicitModelOverride(argv) {
  const i = (argv || []).indexOf("--model");
  if (i === -1) return null;
  const v = argv[i + 1];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const enginesRoot = DEFAULT_ENGINES_ROOT;

  let galaxies;
  if (args.galaxy) galaxies = [args.galaxy];
  else if (args.all) galaxies = listGalaxies(enginesRoot);
  else { process.stderr.write("usage: galaxy-reflection-synthesis.mjs (--galaxy <slug> | --all) [--dry-run] [--model M] [--topk N] [--limit N]\n"); process.exit(2); }
  galaxies = galaxies.slice(0, args.limit);

  // Resolve the synthesis model ONCE, host-aware (token-savings: route the
  // hardcoded small model to the best local model for this host — qwen2.5-coder:32b
  // on the 96GB Blackwell, the same small model on weaker hosts, fallback when
  // Ollama is down). An explicit --model always wins (operator intent). Fail-soft:
  // the resolver never throws (except on a missing fallback) so a synthesis run
  // degrades to DEFAULT_MODEL rather than crashing. The SAME resolved `model`
  // threads into BOTH preflight and generation so they never diverge.
  const { model, source } = await resolveSynthesisModel({
    fallback: DEFAULT_MODEL,
    override: explicitModelOverride(process.argv),
  });
  if (model !== DEFAULT_MODEL || source !== "fallback") {
    process.stderr.write(`[galaxy-reflect] synthesis model: ${model} (source: ${source})\n`);
  }

  if (!args.dryRun) {
    const ok = await ollamaPreflight(DEFAULT_OLLAMA_URL, model);
    if (!ok) { process.stderr.write(`[galaxy-reflect] FAIL-LOUD: ollama generation not reachable (${DEFAULT_OLLAMA_URL}, model ${model})\n`); process.exit(1); }
  }

  const results = [];
  let failures = 0;
  for (const galaxy of galaxies) {
    const brainPath = join(enginesRoot, galaxy, "MEMORY.md");
    let brainBody = "";
    try { brainBody = readFileSync(brainPath, "utf8"); } catch { /* slug-only query */ }
    const { query, memories } = gatherGalaxyMemories({ galaxy, brainBody, topK: args.topK });

    if (memories.length < MIN_MEMORIES) {
      results.push({ galaxy, status: "skipped-thin", memCount: memories.length });
      process.stderr.write(`[galaxy-reflect] ${galaxy}: only ${memories.length} memories (< ${MIN_MEMORIES}) — skipped\n`);
      continue;
    }
    if (args.dryRun) {
      results.push({ galaxy, status: "dry-run", memCount: memories.length, query: query.slice(0, 80) });
      continue;
    }

    try {
      const prompt = buildSynthesisPrompt(galaxy, memories);
      const text = await synthesizeViaOllama({ prompt, model });
      if (!text || text.length < 40) throw new Error(`empty/short synthesis (${text.length} chars)`);
      const doc = buildSynthesisDoc(galaxy, text, { memCount: memories.length, model, builtAt: new Date().toISOString(), sourceHash: computeSourceHash(memories) });
      const outPath = writeSynthesisDoc({ galaxy, doc });
      results.push({ galaxy, status: "written", memCount: memories.length, outPath, chars: text.length });
      process.stderr.write(`[galaxy-reflect] ${galaxy}: synthesized from ${memories.length} memories → ${outPath} (${text.length} chars)\n`);
    } catch (err) {
      failures++;
      results.push({ galaxy, status: "failed", memCount: memories.length, error: String(err?.message || err) });
      process.stderr.write(`[galaxy-reflect] ${galaxy}: FAILED — ${err?.message || err}\n`);
    }
  }

  const attempted = results.filter((r) => r.status === "written" || r.status === "failed").length;
  if (args.json) process.stdout.write(JSON.stringify({ galaxies: galaxies.length, attempted, failures, results }, null, 2) + "\n");
  else process.stdout.write(`[galaxy-reflect] ${results.filter((r) => r.status === "written").length} written, ${failures} failed, ${results.filter((r) => r.status.startsWith("skipped")).length} skipped\n`);

  if (attempted > 0 && failures / attempted > MAX_FAIL_FRACTION) {
    process.stderr.write(`[galaxy-reflect] FAIL-LOUD: ${failures}/${attempted} galaxies failed (> ${MAX_FAIL_FRACTION})\n`);
    process.exit(1);
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  main().catch((err) => { try { process.stderr.write(`[galaxy-reflect] ${err?.stack || err}\n`); } catch {} process.exit(1); });
}
