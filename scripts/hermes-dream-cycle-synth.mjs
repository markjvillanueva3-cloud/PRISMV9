#!/usr/bin/env node
// scripts/hermes-dream-cycle-synth.mjs
// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B1-HMEMV04 (2026-05-27, slot:alpha):
// Hermes dream-cycle synthesis (the cross-memo connection-discovery half of
// HMEMV04). The reverse-mirror H:→C: hook half shipped 2026-05-26 in commit
// 5bcf40f66f69 (.claude/hooks/h-to-c-obsidian-mirror.mjs).
//
// "Dreams" = nightly synthesis that walks ALL memos (not a 7-day window like
// B3) and surfaces cross-memo CONNECTIONS via keyword-set Jaccard similarity.
// Writes knowledge/memories/dreams/<date>.md so Obsidian's graph view shows
// implicit connections the existing wikilink graph misses. Does NOT repair
// dangling [[refs]] (the 4136-broken-wikilinks figure cited in SCOPE-EXPANSION
// §Q6 #1) — that's a different layer. This script ADDS new connection
// edges via fresh [[wikilinks]] derived from keyword-set similarity, giving
// Obsidian's graph view a denser cross-galaxy fabric to surface.
//
// Distinct from:
//   - B3 hermes-self-reflect-populater.mjs (past-7-day window, mechanical)
//   - B4 WeeklySynthesisEngine (DAILY-CONTEXT briefs, LLM-synth)
// This is FULL-CORPUS connection discovery, mechanical (no LLM), deterministic.
//
// Pure exports: extractKeywords, jaccard, findConnections, clusterByMemo,
// synthesizeDreamMarkdown.
// CLI: node hermes-dream-cycle-synth.mjs [--root <path>] [--out <path>]
//      [--min-jaccard 0.15] [--top-k-keywords 20] [--max-connections 200]

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// U-OBS-DREAM-LLM-SYNTH (slot:alpha): optional local-LLM rationale pass (default-off).
import { annotateConnections } from "./lib/dream-llm-annotate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", "knowledge", "memories");
// U-DREAM-GALAXY-CASCADE (slot:india): the cross-galaxy compounding refresh ridden by the
// nightly dream-cycle (see runGalaxyCascade). Surgical incremental synth -> L1->L2 cascade.
const GALAXY_SYNTH_REFRESH = path.resolve(__dirname, "galaxy-synthesis-refresh.mjs");
const MEMO_TYPES = ["feedback", "reference", "project"];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "to", "of", "in", "on", "at",
  "for", "with", "from", "by", "as", "if", "then", "than", "this", "that",
  "these", "those", "it", "its", "not", "no", "yes", "so", "what", "when",
  "where", "who", "why", "how", "all", "any", "some", "each", "every", "new",
  "use", "used", "uses", "via", "per", "see", "also", "one", "two", "three",
  "you", "your", "yours", "we", "our", "ours", "us", "they", "them", "their",
  "out", "off", "into", "onto", "over", "under", "above", "below", "more", "most",
  "less", "least", "many", "much", "few", "such", "same", "other", "another",
  "very", "just", "only", "even", "still", "ever", "never", "always", "often",
  "sometimes", "now", "here", "there", "well", "yet", "thus", "hence", "because",
  "however", "therefore",
]);

/** Pure: top-K keywords for one memo. Returns a Set for O(1) intersection. */
export function extractKeywords(text, k = 20) {
  const counts = new Map();
  const words = String(text).toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return new Set(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(e => e[0])
  );
}

/** Pure: Jaccard similarity = |A ∩ B| / |A ∪ B|. Returns 0 when both empty. */
export function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Pure: is this memo an auto-imported CATALOG STUB (a `node_*` graph node mirrored into the
 * memory dir), as opposed to a synthesized KNOWLEDGE memo (feedback_/reference_/project_)?
 *
 * The corpus is ~66% `node_*` catalog stubs (node_formula_ ~7.6K, node_tribal_ ~4.4K,
 * node_milestone_/course_/registry_/algorithm_). Each KIND is template-near-identical (every MIT
 * course shares syllabus boilerplate; every formula node shares the formula template), so they score
 * very high intra-kind Jaccard and FLOOD the connection list (a live run's entire top-25 was
 * MIT-course<->MIT-course at 0.82-0.90), burying the real cross-domain knowledge connections the
 * dream-cycle exists to surface. They carry no implicit connection worth discovering -- they ARE the
 * catalog. Excluding them is the "catalog-stub noise" fix (U-DREAM-STUB-NOISE).
 */
export function isCatalogStub(name) {
  return /^node_/.test(String(name));
}

/** Pure: list all .md memos from {root}/{type}/*.md. No time window. */
export function listAllMemos({ root, fsImpl = fs } = {}) {
  const out = [];
  for (const type of MEMO_TYPES) {
    const dir = path.join(root, type);
    let entries;
    try { entries = fsImpl.readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(dir, name);
      let content = "";
      try { content = fsImpl.readFileSync(file, "utf8"); } catch { continue; }
      out.push({ path: file, name, type, content });
    }
  }
  return out;
}

/**
 * Pure: find pairs of memos with Jaccard(keywords) >= threshold. Returns
 * connections sorted by similarity descending, capped at maxConnections.
 *
 * SCALE FIX (slot:bravo 2026-06-04): the original naive O(n^2) all-pairs scan
 * OOM'd the nightly task once the memo corpus grew past ~11K (62M pairs → JS
 * heap death after 73s; the installer's "~700 memos / <1s" assumption was 16×
 * stale). Three structural changes, none of which change the RESULT for a normal
 * corpus:
 *   1. INVERTED-INDEX BLOCKING — only memos sharing >=1 keyword can clear any
 *      positive Jaccard threshold (disjoint sets → Jaccard 0), so a keyword→memos
 *      index generates candidate pairs directly instead of scanning all n². The
 *      similarity SCORE is still computed exactly over the full keyword sets.
 *   2. DOCUMENT-FREQUENCY CAP — a keyword present in more than maxDocFreqFrac of
 *      memos is too common to discriminate AND its huge posting list would
 *      reintroduce the O(n²) blow-up, so it is skipped FOR BLOCKING ONLY. A
 *      qualifying pair (Jaccard≥0.15 needs ~6+ shared keywords) virtually always
 *      shares a discriminative keyword too; only an all-ultra-common-keyword pair
 *      (pure noise) could be missed — a documented, deliberate trade for a job
 *      that actually completes.
 *   3. BOUNDED TOP-K BUFFER — the heavy per-pair `shared` array is deferred to
 *      the final survivors and the buffer is pruned to maxConnections, so peak
 *      memory is O(maxConnections) even if millions of pairs clear the threshold
 *      (near-duplicate corpus). This is what actually prevented the OOM.
 */
export function findConnections(
  memos,
  { minJaccard = 0.15, topKKeywords = 20, maxConnections = 200, maxDocFreqFrac = 0.10 } = {},
) {
  const indexed = memos.map(m => ({ memo: m, keywords: extractKeywords(m.content, topKKeywords) }));
  const n = indexed.length;

  // Document frequency per keyword → the blocking index over DISCRIMINATIVE
  // keywords only (df <= cap). dfCap floors at 2 so tiny corpora still index.
  const df = new Map();
  for (let i = 0; i < n; i++) for (const kw of indexed[i].keywords) df.set(kw, (df.get(kw) || 0) + 1);
  // Floor at 50 so SMALL corpora are never capped (df can't exceed the floor →
  // blocking degrades gracefully to the exact naive result; preserves test
  // fixtures). Capping only engages past ~500 memos where the giant posting
  // lists actually appear — exactly where the OOM lived.
  const dfCap = Math.max(50, Math.floor(maxDocFreqFrac * n));
  const postings = new Map();
  for (let i = 0; i < n; i++) {
    for (const kw of indexed[i].keywords) {
      if (df.get(kw) > dfCap) continue;
      let arr = postings.get(kw);
      if (!arr) { arr = []; postings.set(kw, arr); }
      arr.push(i);
    }
  }

  // Bounded top-K buffer of {i, j, sim} (no `shared` array yet — that is the
  // allocation that OOM'd). Pruned to maxConnections whenever it grows large.
  const PRUNE_AT = Math.max(2000, maxConnections * 8);
  let buf = [];
  const prune = () => { buf.sort((x, y) => y.sim - x.sim); if (buf.length > maxConnections) buf.length = maxConnections; };

  for (let i = 0; i < n; i++) {
    // Candidate partners j > i that co-occur on >=1 discriminative keyword.
    const cand = new Set();
    for (const kw of indexed[i].keywords) {
      if (df.get(kw) > dfCap) continue;
      const arr = postings.get(kw);
      if (!arr) continue;
      for (const j of arr) if (j > i) cand.add(j);
    }
    for (const j of cand) {
      const sim = jaccard(indexed[i].keywords, indexed[j].keywords); // EXACT over full sets
      if (sim < minJaccard) continue;
      buf.push({ i, j, sim });
      if (buf.length >= PRUNE_AT) prune();
    }
  }
  prune();

  // Materialize survivors with their shared-keyword lists (≤ maxConnections).
  return buf.map(({ i, j, sim }) => ({
    a: { name: indexed[i].memo.name, type: indexed[i].memo.type },
    b: { name: indexed[j].memo.name, type: indexed[j].memo.type },
    jaccard: sim,
    shared: [...indexed[i].keywords].filter(x => indexed[j].keywords.has(x)).sort(),
  }));
}

/** Pure: invert connection list → per-memo list of top peer-connections. */
export function clusterByMemo(connections) {
  const byName = new Map();
  for (const c of connections) {
    if (!byName.has(c.a.name)) byName.set(c.a.name, []);
    if (!byName.has(c.b.name)) byName.set(c.b.name, []);
    byName.get(c.a.name).push({ peer: c.b.name, peerType: c.b.type, jaccard: c.jaccard, shared: c.shared });
    byName.get(c.b.name).push({ peer: c.a.name, peerType: c.a.type, jaccard: c.jaccard, shared: c.shared });
  }
  for (const arr of byName.values()) arr.sort((x, y) => y.jaccard - x.jaccard);
  return byName;
}

/** Pure: render dream-synthesis markdown. */
export function synthesizeDreamMarkdown({ date, totalMemos, connections, cluster, params, catalogStubExcluded = 0 }) {
  const lines = [];
  lines.push(`---`);
  lines.push(`title: "Hermes dream-cycle — ${date}"`);
  lines.push(`date: ${date}`);
  lines.push(`memo_count: ${totalMemos}`);
  lines.push(`catalog_stub_excluded: ${catalogStubExcluded}`);
  lines.push(`connection_count: ${connections.length}`);
  lines.push(`min_jaccard: ${params.minJaccard}`);
  lines.push(`source: hermes-dream-cycle-synth.mjs`);
  lines.push(`unit: U-GALAXY-MS1-B1-HMEMV04`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`# Hermes dream-cycle — ${date}`);
  lines.push(``);
  const stubNote = catalogStubExcluded > 0 ? ` (excluded ${catalogStubExcluded} catalog-stub \`node_*\` memos to surface real knowledge connections)` : ``;
  lines.push(`Walked ${totalMemos} knowledge memos${stubNote} · surfaced ${connections.length} cross-memo connections (Jaccard ≥ ${params.minJaccard}, top-${params.topKKeywords} keywords per memo).`);
  lines.push(``);
  lines.push(`## Top connections (by similarity)`);
  lines.push(``);
  if (connections.length === 0) {
    lines.push(`_(no connections above threshold — corpus too sparse or too disjoint)_`);
  } else {
    const top = connections.slice(0, 25);
    for (const c of top) {
      const sharedStr = c.shared.slice(0, 6).map(s => `\`${s}\``).join(", ");
      const extras = c.shared.length > 6 ? ` (+${c.shared.length - 6} more)` : "";
      lines.push(`- **${c.jaccard.toFixed(3)}** [[${c.a.name.replace(/\.md$/, "")}]] ↔ [[${c.b.name.replace(/\.md$/, "")}]] — shared: ${sharedStr}${extras}`);
      // Optional local-LLM "why these connect" rationale (U-OBS-DREAM-LLM-SYNTH).
      // Present only when PRISM_DREAM_LLM_SYNTH ran; absent → byte-identical to before.
      // Escape interior underscores so a rationale like "num_predict" can't
      // unbalance the italic wrapper (reviewer P2(b) — cosmetic but cheap).
      if (c.rationale) lines.push(`  ↳ _${c.rationale.replace(/_/g, "\\_")}_`);
    }
  }
  lines.push(``);
  lines.push(`## Cluster heads (memos with the most connections)`);
  lines.push(``);
  const heads = [...cluster.entries()]
    .map(([name, peers]) => ({ name, count: peers.length, top: peers.slice(0, 3) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  if (heads.length === 0) {
    lines.push(`_(no cluster heads — see Top connections above)_`);
  } else {
    for (const h of heads) {
      lines.push(`- [[${h.name.replace(/\.md$/, "")}]] — ${h.count} connection(s); top: ${h.top.map(p => `[[${p.peer.replace(/\.md$/, "")}]] (${p.jaccard.toFixed(2)})`).join(", ")}`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  // Footer honestly reflects whether the optional LLM pass ran (R12). No
  // rationale present → the exact pre-existing "(no LLM)" string (byte-identical).
  const llmNote = connections.some((c) => c && c.rationale)
    ? `Jaccard keyword-set similarity + local-LLM rationale on top edges (PRISM_DREAM_LLM_SYNTH).`
    : `Jaccard keyword-set similarity (no LLM).`;
  lines.push(`_Auto-generated by \`scripts/hermes-dream-cycle-synth.mjs\` — ${llmNote} The "dream" metaphor: implicit connections the existing wikilink graph misses. Re-run nightly. Paired with B3 \`hermes-self-reflect-populater\` (per-7-day reflection)._`);
  return lines.join("\n") + "\n";
}

export function run({ root = DEFAULT_ROOT, out, date, minJaccard = 0.15, topKKeywords = 20, maxConnections = 200, includeCatalogStubs = false, now = Date.now(), fsImpl = fs } = {}) {
  const dateStr = date || new Date(now).toISOString().slice(0, 10);
  const allMemos = listAllMemos({ root, fsImpl });
  // Default: exclude catalog stubs (node_*) so template-similarity noise does not bury the real
  // knowledge connections. --include-catalog-stubs restores the legacy all-corpus behavior.
  const memos = includeCatalogStubs ? allMemos : allMemos.filter((m) => !isCatalogStub(m.name));
  const catalogStubExcluded = allMemos.length - memos.length;
  const params = { minJaccard, topKKeywords, maxConnections };
  const connections = findConnections(memos, params);
  const cluster = clusterByMemo(connections);
  const md = synthesizeDreamMarkdown({ date: dateStr, totalMemos: memos.length, connections, cluster, params, catalogStubExcluded });
  const outPath = out || path.join(root, "dreams", `${dateStr}.md`);
  try {
    fsImpl.mkdirSync(path.dirname(outPath), { recursive: true });
    fsImpl.writeFileSync(outPath, md, "utf8");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return {
    ok: true,
    path: outPath,
    date: dateStr,
    memo_count: memos.length,
    catalog_stub_excluded: catalogStubExcluded,
    connection_count: connections.length,
    cluster_head_count: cluster.size,
  };
}

// Async variant with the optional local-LLM rationale pass. Mirrors run() but
// awaits annotateConnections between findConnections and synthesize. Default path
// (no callFn) behaves exactly like run(). U-OBS-DREAM-LLM-SYNTH.
export async function runWithSynth(opts = {}) {
  const {
    root = DEFAULT_ROOT, out, date, minJaccard = 0.15, topKKeywords = 20,
    maxConnections = 200, includeCatalogStubs = false, now = Date.now(), fsImpl = fs, callFn, topN, maxWords,
  } = opts;
  const dateStr = date || new Date(now).toISOString().slice(0, 10);
  const allMemos = listAllMemos({ root, fsImpl });
  const memos = includeCatalogStubs ? allMemos : allMemos.filter((m) => !isCatalogStub(m.name));
  const catalogStubExcluded = allMemos.length - memos.length;
  const params = { minJaccard, topKKeywords, maxConnections };
  let connections = findConnections(memos, params);
  if (typeof callFn === "function") {
    connections = await annotateConnections(connections, { callFn, topN, maxWords });
  }
  const cluster = clusterByMemo(connections);
  const md = synthesizeDreamMarkdown({ date: dateStr, totalMemos: memos.length, connections, cluster, params, catalogStubExcluded });
  const outPath = out || path.join(root, "dreams", `${dateStr}.md`);
  try {
    fsImpl.mkdirSync(path.dirname(outPath), { recursive: true });
    fsImpl.writeFileSync(outPath, md, "utf8");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return {
    ok: true, path: outPath, date: dateStr, memo_count: memos.length,
    catalog_stub_excluded: catalogStubExcluded,
    connection_count: connections.length, cluster_head_count: cluster.size,
    llm_annotated: connections.filter((c) => c.rationale).length,
  };
}

// Nightly cross-galaxy compounding tail (U-DREAM-GALAXY-CASCADE, slot:india 2026-06-11).
// The Dream-Cycle is the only LIVE nightly brain-consolidation scheduled task, so ride it:
// run galaxy-synthesis-refresh.mjs as a fail-soft tail so the cross-galaxy
// "all-galaxies-gain-together" meta-synthesis loop runs on a real cadence instead of a
// manual trigger. galaxy-synthesis-refresh is SURGICAL (regenerates only the galaxies whose
// memory cluster changed, then cascades L1->L2 meta-synthesis at line 227) so the nightly
// cost is ~0 when nothing changed and compounds when it did.
// FAIL-SOFT: a cascade failure NEVER breaks the dream synth (the primary deliverable). The
// refresh exit-code contract: 0=done, 1=hard-fail, 3=stale-but-generation-DOWN (BENIGN).
// Knob: PRISM_DREAM_GALAXY_CASCADE=0 disables (default ON).
export function runGalaxyCascade({
  execImpl = execFileSync,
  env = process.env,
  logImpl = () => {},
  script = GALAXY_SYNTH_REFRESH,
  nodeBin = process.execPath,
  timeoutMs,
} = {}) {
  if (String(env.PRISM_DREAM_GALAXY_CASCADE ?? "1") === "0") {
    return { ran: false, skipped: "disabled", reason: "PRISM_DREAM_GALAXY_CASCADE=0" };
  }
  // SELF-TIMEOUT (slot:bravo 2026-06-17): bound the cascade FAR below the task's
  // ExecutionTimeLimit so a slow/wedged cascade (Ollama L1 regen + sidecar
  // rebuilds run for MINUTES when galaxies changed -- the blunt sibling B1 is
  // ~20min) self-aborts FAIL-SOFT here, instead of the OS killing the whole task
  // at its limit. That OS-kill was the real cause of LastTaskResult 267014
  // (SCHED_S_TASK_TERMINATED): the dream md had ALREADY been written and the task
  // would have exited 0, but this unbounded cascade tail overran the (formerly
  // 2-minute) task limit and was terminated before exit 0 ever fired. 20min is
  // comfortably < the installer's 30min ExecutionTimeLimit. Knob:
  // PRISM_DREAM_CASCADE_TIMEOUT_MS.
  // Coerce a non-positive / NaN explicit timeoutMs to null so it falls through to
  // the env knob / default. Node treats `timeout: 0` as UNBOUNDED -- an explicit 0
  // would silently restore the very hang this bound removes (scrutiny arm A/B P2).
  // The 20min default MUST stay < the 30min ExecutionTimeLimit in
  // .claude/helpers/install-hermes-dream-cycle-task.ps1 (keep the two in sync).
  const explicitMs = Number(timeoutMs) > 0 ? Number(timeoutMs) : null;
  const cascadeTimeoutMs = explicitMs ?? (Number(env.PRISM_DREAM_CASCADE_TIMEOUT_MS) || 20 * 60 * 1000);
  try {
    execImpl(nodeBin, [script], { stdio: "ignore", env, timeout: cascadeTimeoutMs, killSignal: "SIGTERM" });
    return { ran: true, ok: true, exitCode: 0 };
  } catch (e) {
    // Timeout: execFileSync kills the child and throws killed:true (+ code
    // 'ETIMEDOUT' on recent node). Fail-soft (NOT a crash, NOT exit-3) -- the
    // timeout IS the graceful bound, so the dream synth still exits 0.
    if (e && (e.killed === true || e.code === "ETIMEDOUT")) {
      const msg = e instanceof Error ? e.message : String(e);
      logImpl(`[dream] galaxy cascade timed out after ${cascadeTimeoutMs}ms (non-fatal): ${msg}\n`);
      return { ran: true, ok: false, timedOut: true, timeoutMs: cascadeTimeoutMs, error: msg };
    }
    // exit 3 = stale-but-generation-down -> BENIGN per galaxy-synthesis-refresh contract.
    const code = e && typeof e.status === "number" ? e.status : null;
    if (code === 3) {
      return { ran: true, ok: true, benign: true, exitCode: 3, reason: "generation-down-deferred" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    logImpl(`[dream] galaxy cascade failed (non-fatal): ${msg}\n`);
    return { ran: true, ok: false, exitCode: code, error: msg };
  }
}

// CLI guard (based on the hermes-self-reflect-populater pattern, hardened against empty argv1)
const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
const thisUrl = import.meta.url.replace(/\\/g, "/");
// `argv1 &&` guards the empty-argv1 case (node -e / programmatic import): without it,
// thisUrl.endsWith("") is ALWAYS true, so importing this module would run the full nightly synth.
if (argv1 && (thisUrl === `file:///${argv1}` || thisUrl.endsWith(argv1))) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--root") opts.root = args[++i];
    else if (a === "--out") opts.out = args[++i];
    else if (a === "--date") opts.date = args[++i];
    else if (a === "--min-jaccard") opts.minJaccard = Number(args[++i]);
    else if (a === "--top-k-keywords") opts.topKKeywords = Number(args[++i]);
    else if (a === "--max-connections") opts.maxConnections = Number(args[++i]);
    else if (a === "--include-catalog-stubs") opts.includeCatalogStubs = true;
  }
  // Optional local-LLM rationale pass (default-OFF). The model call is
  // lazy-imported so the default sync path never pulls the ask-ollama deps.
  const llmSynth = process.env.PRISM_DREAM_LLM_SYNTH === "1" || args.includes("--llm-synth");
  let r;
  if (llmSynth) {
    const { callOllama } = await import("./ask-ollama.mjs");
    // Use the CODER model directly (qwen2.5-coder:32b — the resident Blackwell
    // floor), NOT the host-aware resolver: that prefers a reasoning model
    // (gpt-oss:120b) which fills its `thinking` channel and returns an EMPTY
    // response at low num_predict → 0 rationales. A one-sentence connection
    // rationale is exactly a fast-coder task. Knob: PRISM_DREAM_LLM_MODEL.
    const model = process.env.PRISM_DREAM_LLM_MODEL || "qwen2.5-coder:32b";
    // 30s timeout: nightly CRON (not hot-path); the first edge cold-loads the 32b
    // model (~10-20s on the Blackwell), keep_alive holds it warm thereafter. 8s
    // timed out the cold load. Knob: PRISM_DREAM_LLM_TIMEOUT_MS.
    const llmTimeoutMs = Number(process.env.PRISM_DREAM_LLM_TIMEOUT_MS) || 30000;
    const callFn = async (prompt) => {
      const res = await callOllama(model, prompt, { numPredict: 80, timeoutMs: llmTimeoutMs });
      return res?.ok ? res.text : null;
    };
    r = await runWithSynth({ ...opts, callFn });
  } else {
    r = run(opts);
  }
  if (r.ok) {
    // Cross-galaxy compounding tail -- fail-soft, never blocks the dream synth's exit 0.
    r.galaxy_cascade = runGalaxyCascade({ logImpl: (m) => process.stderr.write(m) });
    process.stdout.write(JSON.stringify(r) + "\n");
    process.exit(0);
  } else {
    process.stderr.write(JSON.stringify(r) + "\n");
    process.exit(2);
  }
}
