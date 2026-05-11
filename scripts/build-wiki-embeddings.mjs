#!/usr/bin/env node
/**
 * build-wiki-embeddings.mjs
 *
 * Embeds the *concept* leaf entries (engines, dispatchers, registries, layers,
 * domains, skills, hooks, formulas, algorithms, milestones, monolith categories,
 * frontends, JM-Die customers, combos, design specs, …) — everything EXCEPT the
 * ~9.2K per-action entries, which are too numerous and too templated to be worth
 * a vector each. Output:
 *
 *   knowledge/wiki/architecture/_embeddings.jsonl
 *     one line per entry: { n: "<name>", s: <int8-scale>, q: [int8,…] }
 *     int8-quantized 768-d nomic-embed-text vectors → ~3.5 MB for ~4.5K entries.
 *
 * Consumed by wiki-precheck-inject.mjs as a *fallback* when BM25-lite over
 * index.md + _leaf-index.jsonl yields zero candidates (paraphrase / synonym
 * queries). The hook loads this lazily and embeds the prompt with the same
 * Ollama model (tight timeout — if Ollama is down the fallback just no-ops).
 *
 * Embedding backend: Ollama `nomic-embed-text` at $OLLAMA_HOST (default
 * 127.0.0.1:11434). If unreachable, this script writes nothing and exits 0 with
 * a warning — the fallback degrades to "BM25 only", no breakage.
 *
 * Flags:
 *   --dry-run      compute counts, don't write
 *   --limit N      only embed first N entries (smoke test)
 *   --model NAME   override embedding model (default nomic-embed-text)
 *   --include-actions   also embed the per-action entries (huge — ~14K vectors)
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const LEAF_INDEX = resolve(PRISM_ROOT, "knowledge/wiki/architecture/_leaf-index.jsonl");
const OUT_PATH = resolve(PRISM_ROOT, "knowledge/wiki/architecture/_embeddings.jsonl");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const FLAGS = {
  dryRun: has("--dry-run"),
  limit: Number(val("--limit", "0")) || 0,
  model: val("--model", "nomic-embed-text"),
  includeActions: has("--include-actions"),
  full: has("--full"), // ignore the existing cache, re-embed everything
};

function sha1(s) { return createHash("sha1").update(String(s)).digest("hex").slice(0, 16); }

// Load the prior _embeddings.jsonl into { name → { line, h } } so an incremental
// run only re-embeds entries whose embedText() changed. Header line is skipped.
function loadPrior() {
  if (FLAGS.full || !existsSync(OUT_PATH)) return { byName: new Map(), model: null, dim: 0 };
  try {
    const byName = new Map();
    let model = null, dim = 0;
    for (const line of readFileSync(OUT_PATH, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r && r.__meta) { model = r.model || model; dim = r.dim || dim; continue; }
      if (r && r.n && r.h && Array.isArray(r.q)) byName.set(r.n, { line, h: r.h });
    }
    return { byName, model, dim };
  } catch { return { byName: new Map(), model: null, dim: 0 }; }
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//, "")}/api/embeddings`;

// Concept entry types worth a vector. Actions excluded unless --include-actions.
const CONCEPT_TYPES = new Set([
  "engine", "dispatcher", "registry", "architecture", "skill", "hook",
  "formula", "algorithm", "milestone", "monolith", "frontend", "domain", "layer",
]);
function isConcept(r) {
  if (FLAGS.includeActions) return true;
  const t = String(r.type || "").toLowerCase();
  if (t === "action") return false;
  // Heuristic: action entries live under actions/ in the path
  if (String(r.path || "").includes("/actions/")) return false;
  return CONCEPT_TYPES.has(t) || true; // default-include any non-action concept
}

function embedText(r) {
  // Compact, information-dense string. Name first (it's the [[link]] target).
  return [r.name, r.title && r.title !== r.name ? r.title : "", r.desc || ""]
    .filter(Boolean).join(" — ").slice(0, 1200);
}

async function ollamaEmbed(model, prompt, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt }),
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

// L2-normalize then int8-quantize. Stored as { n, s, q } where reconstructed
// vector ≈ q[i] * s, and since the source was unit-norm, dot(q1*s1, q2*s2) ≈ cosine.
function quantize(vec) {
  let norm = 0;
  for (const x of vec) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  const unit = vec.map((x) => x / norm);
  let maxAbs = 0;
  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
  const scale = (maxAbs || 1) / 127;
  const q = unit.map((x) => Math.max(-127, Math.min(127, Math.round(x / scale))));
  return { s: Number(scale.toExponential(4)), q };
}

async function main() {
  if (!existsSync(LEAF_INDEX)) {
    process.stderr.write(`[wiki-embed] leaf index missing at ${LEAF_INDEX} — run build-wiki-leaf-index.mjs first\n`);
    process.exit(2);
  }
  // Read + filter the concept entries first (cheap, no network) so --dry-run
  // and the "Ollama down" path can both report accurate counts.
  const lines = readFileSync(LEAF_INDEX, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const entries = [];
  const seen = new Set();
  for (const ln of lines) {
    let r;
    try { r = JSON.parse(ln); } catch { continue; }
    if (!r || !r.name || seen.has(r.name)) continue;
    if (!isConcept(r)) continue;
    seen.add(r.name);
    entries.push(r);
  }
  const work = FLAGS.limit ? entries.slice(0, FLAGS.limit) : entries;
  const prior = loadPrior();
  const modelChanged = prior.model && prior.model !== FLAGS.model;
  if (modelChanged) { process.stderr.write(`[wiki-embed] model changed (${prior.model} → ${FLAGS.model}) — full re-embed\n`); prior.byName.clear(); }

  if (FLAGS.dryRun) {
    let reuse = 0, fresh = 0;
    for (const r of work) { const h = sha1(embedText(r)); (prior.byName.get(r.name)?.h === h ? reuse++ : fresh++); }
    process.stdout.write(`[wiki-embed] DRY-RUN — ${work.length} concept entries (of ${lines.length} leaf entries) · ${reuse} reused, ${fresh} would re-embed\n`);
    return;
  }

  // Probe Ollama with a 1-token embed before doing thousands of calls. Generous
  // timeout — the first call cold-loads the model into VRAM (can be 15-40s if
  // another model is resident and has to be swapped out).
  const probe = await ollamaEmbed(FLAGS.model, "probe", 60000);
  if (!probe) {
    // If we have a usable prior cache, leave it in place; only warn. Else write nothing.
    process.stderr.write(`[wiki-embed] Ollama unreachable/timed-out at ${OLLAMA_URL} (model ${FLAGS.model}) — ${prior.byName.size ? `keeping existing ${prior.byName.size}-vector cache` : "writing nothing"}, exit 0. Recall fallback degrades to BM25-only.\n`);
    process.exit(0);
  }
  process.stderr.write(`[wiki-embed] Ollama OK · model ${FLAGS.model} · dim ${probe.length} · ${work.length} concept entries · ${prior.byName.size} cached\n`);

  const out = [];
  let ok = 0, fail = 0, reused = 0;
  const t0 = Date.now();
  for (let i = 0; i < work.length; i++) {
    const r = work[i];
    const h = sha1(embedText(r));
    const cached = prior.byName.get(r.name);
    if (cached && cached.h === h) { out.push(cached.line); reused++; ok++; continue; }
    const v = await ollamaEmbed(FLAGS.model, embedText(r));
    if (!v) { fail++; continue; }
    const { s, q } = quantize(v);
    out.push(JSON.stringify({ n: r.name, t: r.type || "", h, s, q }));
    ok++;
    if ((i + 1) % 250 === 0) process.stderr.write(`[wiki-embed]   ${i + 1}/${work.length} (${ok} ok / ${reused} reused, ${fail} fail, ${Math.round((Date.now() - t0) / 1000)}s)\n`);
  }
  // header line records model + dim + count so the consumer can sanity-check
  const header = JSON.stringify({ __meta: true, model: FLAGS.model, dim: probe.length, count: ok, generatedAt: new Date().toISOString() });
  const jsonl = [header, ...out].join("\n") + "\n";
  if (FLAGS.limit) {
    // --limit is a SMOKE TEST — `out` only holds the first N entries, so writing it
    // would clobber the full file. Print stats, don't write. (Use --full + no --limit
    // to actually rebuild; the orchestrator never passes --limit.)
    process.stdout.write(`[wiki-embed] --limit ${FLAGS.limit}: smoke test only — would write ${ok} vectors; NOT overwriting _embeddings.jsonl (${prior.byName.size} vectors preserved). Run without --limit to rebuild.\n`);
    return;
  }
  writeFileSync(OUT_PATH, jsonl, "utf8");
  const mb = (Buffer.byteLength(jsonl) / 1048576).toFixed(2);
  process.stdout.write(`[wiki-embed] ${ok} vectors (${reused} reused, ${ok - reused} fresh, ${fail} failed) -> _embeddings.jsonl (${mb} MB, int8 q, ${probe.length}-d), ${Math.round((Date.now() - t0) / 1000)}s\n`);
}

main().catch((e) => { process.stderr.write(`[wiki-embed] ERROR: ${e?.message || e}\n`); process.exit(1); });
