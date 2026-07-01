#!/usr/bin/env node
/**
 * psn-synergy-collect.mjs — PSN-SYNERGY-COLLECT-MS0
 *
 * Reads the PRISM filesystem and produces a live PSNLegInventory[] payload
 * that feeds PSNSynergyInspectorEngine (the meta-engine shipped in
 * PSN-SYNERGY-INSPECT-MS0). Output → state/shared/psn-synergy-snapshot.json
 * + a markdown summary at state/shared/psn-synergy-snapshot.md.
 *
 * 11 PSN legs counted:
 *   obsidian_brain (knowledge/memories/), prism_os (prism_operating_system
 *   dispatcher actions), wiki (knowledge/wiki/), memories (feedback_/reference_
 *   subset of obsidian_brain), tribal (tribal-embed-index keys), system_viz
 *   (system-graph.json node count), engines (mcp-server/src/engines/*.ts),
 *   algorithms (mcp-server/src/algorithms/*.ts), formulas
 *   (knowledge/wiki/architecture/formulas/*.md), nn_gnn (*NeuralLearningEngine
 *   + GraphSAGE files), prism_ai (aiSystemRouter + prism_ai dispatcher actions).
 *
 * Cross-refs use cheap heuristics:
 *   - Memory → wiki via [[name]] tokens in memory files
 *   - Wiki → engines via "Engine" word matches in wiki text
 *   - Engines → wiki via @see {wiki/...} or "knowledge/wiki" mentions in JSDoc
 *   - Engines → algorithms via "import .* from .*algorithms" matches
 *   - Engines → formulas via "constants.ts" import matches
 *   - etc.
 *
 * Pure-script + bounded I/O: caps file scans, samples large dirs, skips
 * binary blobs. Single-pass, no recursion explosion.
 *
 * @milestone PSN-SYNERGY-COLLECT-MS0
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(process.cwd().replace(/\\/g, "/"));
const OUT_DIR = resolve(PROJECT_ROOT, "state", "shared");
const OUT_JSON = resolve(OUT_DIR, "psn-synergy-snapshot.json");
const OUT_MD = resolve(OUT_DIR, "psn-synergy-snapshot.md");

const FILE_CAP_PER_LEG = 5000;      // hard cap so single legs can't dominate
const CONTENT_SAMPLE_BYTES = 16384;  // per-file content sample for ref-scan

// ============================================================================
// FS HELPERS
// ============================================================================

function safeStat(path) {
  try { return statSync(path); } catch { return null; }
}

function safeReadDirRecursive(root, pattern, cap = FILE_CAP_PER_LEG) {
  const matches = [];
  const stack = [root];
  while (stack.length > 0 && matches.length < cap) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (matches.length >= cap) break;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        // Skip noisy dirs.
        if (/node_modules|\.git|dist|coverage|\.next|\.cache/.test(e.name)) continue;
        stack.push(full);
      } else if (e.isFile() && pattern.test(e.name)) {
        matches.push(full);
      }
    }
  }
  return matches;
}

function safeReadSample(path) {
  try {
    const buf = readFileSync(path);
    return buf.subarray(0, CONTENT_SAMPLE_BYTES).toString("utf8");
  } catch { return ""; }
}

// ============================================================================
// LEG INVENTORIES
// ============================================================================

function collectMemoriesLeg() {
  const root = resolve(PROJECT_ROOT, "knowledge", "memories");
  if (!safeStat(root)) return { files: [], standing: [] };
  const files = safeReadDirRecursive(root, /\.md$/);
  const standing = files.filter(f => /\/(feedback|reference)_/.test(f.replace(/\\/g, "/")));
  return { files, standing };
}

function collectWikiLeg() {
  const root = resolve(PROJECT_ROOT, "knowledge", "wiki");
  if (!safeStat(root)) return { files: [] };
  const files = safeReadDirRecursive(root, /\.md$/);
  return { files };
}

function collectEnginesLeg() {
  const root = resolve(PROJECT_ROOT, "mcp-server", "src", "engines");
  if (!safeStat(root)) return { files: [] };
  const files = safeReadDirRecursive(root, /Engine\.ts$/);
  return { files };
}

function collectAlgorithmsLeg() {
  const root = resolve(PROJECT_ROOT, "mcp-server", "src", "algorithms");
  if (!safeStat(root)) return { files: [] };
  const files = safeReadDirRecursive(root, /\.ts$/);
  return { files };
}

function collectFormulasLeg() {
  const root = resolve(PROJECT_ROOT, "knowledge", "wiki", "architecture", "formulas");
  if (!safeStat(root)) return { files: [] };
  const files = safeReadDirRecursive(root, /\.md$/);
  return { files };
}

// Streaming per-entry count — avoids slurping/parsing a multi-hundred-MB blob.
// Counts occurrences of a per-entry delimiter; keeps only a needle-1 overlap so a
// delimiter split across a chunk boundary is still caught (and never double-counted).
// NOTE: `needle` MUST be pure ASCII. `leftover` carries decoded *characters* (not raw
// bytes), so a multibyte UTF-8 char split across a chunk boundary can become a U+FFFD
// replacement char — which can only corrupt a needle that itself contains non-ASCII.
// ASCII needles are immune. Precondition: the chunk must hold a full needle, so CHUNK is
// floored to needle.length (a no-op at the 1 MiB production size); the leftover overlap
// then bridges a needle split across exactly one boundary. `chunkSize` is injectable for
// tests. Fully fail-soft: an unreadable path returns 0, never throws (TOCTOU-safe).
function countNeedleStreaming(path, needle, chunkSize = 1 << 20) {
  let count = 0;
  const CHUNK = Math.max(chunkSize > 0 ? chunkSize : 1 << 20, needle.length);
  const buf = Buffer.alloc(CHUNK);
  let fd;
  try { fd = openSync(path, "r"); } catch { return 0; }
  try {
    let pos = 0;
    let leftover = "";
    for (;;) {
      const bytes = readSync(fd, buf, 0, CHUNK, pos);
      if (bytes <= 0) break;
      pos += bytes;
      const text = leftover + buf.subarray(0, bytes).toString("utf8");
      let idx = 0;
      while ((idx = text.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
      leftover = needle.length > 1 ? text.slice(text.length - (needle.length - 1)) : "";
    }
  } catch { /* bounded best-effort */ } finally { closeSync(fd); }
  return count;
}

// One-pass source-field histogram for the tribal embed-index (entry provenance:
// wiki/memory/external/tribal-jsonl/...). Bounded + fail-soft like countNeedleStreaming;
// keeps only the unmatched tail after the last complete match, so matched regions are
// never re-scanned (no double-count) and a "source":"…" split across a chunk boundary is
// still caught (MAX_TAIL > any source token). Uses matchAll (no stateful regex object).
function streamSourceHistogram(path, chunkSize = 1 << 20) {
  const sources = {};
  const MAX_TAIL = 64; // > any "source":"<value>" token, so a boundary split is bridged
  const CHUNK = Math.max(chunkSize > 0 ? chunkSize : 1 << 20, MAX_TAIL + 1);
  const buf = Buffer.alloc(CHUNK);
  let fd;
  try { fd = openSync(path, "r"); } catch { return sources; }
  try {
    let pos = 0;
    let leftover = "";
    for (;;) {
      const bytes = readSync(fd, buf, 0, CHUNK, pos);
      if (bytes <= 0) break;
      pos += bytes;
      const text = leftover + buf.subarray(0, bytes).toString("utf8");
      let lastEnd = 0;
      for (const m of text.matchAll(/"source":"([^"]+)"/g)) {
        sources[m[1]] = (sources[m[1]] || 0) + 1;
        lastEnd = m.index + m[0].length;
      }
      const tail = text.slice(lastEnd);
      leftover = tail.length > MAX_TAIL ? tail.slice(tail.length - MAX_TAIL) : tail;
    }
  } catch { /* bounded best-effort */ } finally { closeSync(fd); }
  return sources;
}

function collectTribalLeg() {
  // MS2 fix: canonical tribal-embed-index is state/shared/ (was mis-pathed to
  // mcp-server/data/state/ → tribal counted 0, falsely isolating the leg across the
  // whole synergy graph). Shape is { schemaVersion, model, entries:[...] }; the file is
  // ~530MB so we NEVER JSON.parse it — count entries by streaming the per-entry
  // "embedding":[ delimiter (one per tribal entry, absent from text fields).
  const candidates = [
    resolve(PROJECT_ROOT, "state", "shared", "tribal-embed-index.json"),
    resolve(PROJECT_ROOT, "mcp-server", "data", "state", "tribal-embed-index.json"),
  ];
  for (const path of candidates) {
    const st = safeStat(path);
    if (!st) continue;
    if (st.size > 8 * 1024 * 1024) {
      // Large index: stream-count ONLY. Never fall through to a full-file JSON.parse
      // (530MB → OOM). If the delimiter is absent (format change), report 0 and let the
      // candidate loop try the next path rather than slurping the blob.
      const count = countNeedleStreaming(path, '"embedding":[');
      if (count > 0) return { count, sources: streamSourceHistogram(path) };
      continue;
    }
    try {
      const j = JSON.parse(readFileSync(path, "utf8"));
      const arr = Array.isArray(j) ? j : (j && Array.isArray(j.entries) ? j.entries : null);
      if (arr) {
        const sources = {};
        for (const e of arr) { const s = e && e.source; if (s) sources[s] = (sources[s] || 0) + 1; }
        return { count: arr.length, sources };
      }
      if (j && typeof j === "object") return { count: Object.keys(j).length, sources: {} };
    } catch { /* ignore, try next candidate */ }
  }
  return { count: 0, sources: {} };
}

// Bounded-head read for huge JSON files — avoids slurping 495MB into RAM.
// Stack-balanced JSON-object scanner finds nested "meta":{...} cleanly.
function extractBalancedJsonObject(text, startIdx) {
  if (text[startIdx] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === "\"") { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
  }
  return null;
}

function readJsonMetadataHead(path, maxBytes = 65536) {
  if (!safeStat(path)) return null;
  try {
    const fd = openSync(path, "r");
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = readSync(fd, buf, 0, maxBytes, 0);
    closeSync(fd);
    const text = buf.subarray(0, bytesRead).toString("utf8");
    // The "meta" block may extend past maxBytes (nested roadmap arrays).
    // Extract the *individual* sub-objects we care about ("counts", "vault",
    // "totals") via balanced-bracket scan — each is small + lives near the top.
    const out = {};
    for (const key of ["counts", "vault", "totals", "coverage"]) {
      const keyIdx = text.indexOf(`"${key}"`);
      if (keyIdx < 0) continue;
      const objStart = text.indexOf("{", keyIdx);
      if (objStart < 0) continue;
      const objStr = extractBalancedJsonObject(text, objStart);
      if (!objStr) continue;
      try { out[key] = JSON.parse(objStr); } catch { /* skip */ }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch { return null; }
}

function collectSystemVizLeg() {
  const path = resolve(PROJECT_ROOT, "state", "shared", "system-viz", "system-graph.json");
  if (!safeStat(path)) return { count: 0, meta: null };
  // Try metadata-first (authoritative + cheap) — falls back to regex if absent.
  const meta = readJsonMetadataHead(path);
  if (meta && meta.counts) {
    // totals.nodes lives one level up; do a second cheap scan for it.
    try {
      // openSync/readSync/closeSync imported at top of file
      const fd = openSync(path, "r");
      const buf = Buffer.alloc(65536);
      const bytesRead = readSync(fd, buf, 0, 65536, 0);
      closeSync(fd);
      const text = buf.subarray(0, bytesRead).toString("utf8");
      const nodesMatch = text.match(/"nodes"\s*:\s*(\d+)/);
      const nodeCount = nodesMatch ? parseInt(nodesMatch[1], 10) : 0;
      return { count: nodeCount, meta };
    } catch { /* fall through */ }
  }
  // Fallback: regex-count node entries (legacy path; slurps the whole file).
  try {
    const raw = readFileSync(path, { encoding: "utf8", flag: "r" });
    const matches = raw.match(/"id"\s*:/g);
    return { count: matches ? matches.length : 0, meta: null };
  } catch { return { count: 0, meta: null }; }
}

function collectNNGNNLeg() {
  const enginesRoot = resolve(PROJECT_ROOT, "mcp-server", "src", "engines");
  if (!safeStat(enginesRoot)) return { files: [] };
  const all = safeReadDirRecursive(enginesRoot, /Engine\.ts$/);
  const files = all.filter(f => /Neural|GraphSAGE|GNN|XProc|CrossProcess/.test(f));
  return { files };
}

function collectPrismOsLeg() {
  const dispatcher = resolve(PROJECT_ROOT, "mcp-server", "src", "tools", "dispatchers", "operatingSystemDispatcher.ts");
  if (!safeStat(dispatcher)) return { actions: 0 };
  try {
    const src = readFileSync(dispatcher, "utf8");
    // Action enum entries are quoted snake_case strings inside an ACTIONS array.
    const matches = src.match(/"[a-z][a-z0-9_]*"/g) ?? [];
    // Filter to plausible action names (length 5-60 chars, contains underscore).
    return { actions: matches.filter(m => m.length >= 7 && m.includes("_")).length };
  } catch { return { actions: 0 }; }
}

function collectPrismAILeg() {
  const dispatcher = resolve(PROJECT_ROOT, "mcp-server", "src", "tools", "dispatchers", "aiReasoningDispatcher.ts");
  if (!safeStat(dispatcher)) return { actions: 0 };
  try {
    const src = readFileSync(dispatcher, "utf8");
    const matches = src.match(/"[a-z][a-z0-9_]*"/g) ?? [];
    return { actions: matches.filter(m => m.length >= 7 && m.includes("_")).length };
  } catch { return { actions: 0 }; }
}

// ============================================================================
// CROSS-REFS — bounded scans
// ============================================================================

function countWikiLinksInMemories(memoryFiles) {
  let count = 0;
  for (const f of memoryFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/\[\[[^\]]+\]\]/g);
    if (matches) count += matches.length;
  }
  return count;
}

function countEngineMentionsInWiki(wikiFiles) {
  let count = 0;
  for (const f of wikiFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/[A-Z][A-Za-z]+Engine\.ts/g);
    if (matches) count += matches.length;
  }
  return count;
}

function countWikiMentionsInEngines(engineFiles) {
  let count = 0;
  for (const f of engineFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/knowledge\/wiki|@see\s+wiki|\[\[[^\]]+\]\]/g);
    if (matches) count += matches.length;
  }
  return count;
}

function countAlgorithmImportsInEngines(engineFiles) {
  let count = 0;
  for (const f of engineFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/from\s+["'][^"']*algorithms\//g);
    if (matches) count += matches.length;
  }
  return count;
}

function countFormulaConstantImportsInEngines(engineFiles) {
  let count = 0;
  for (const f of engineFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/from\s+["'][^"']*physics\/constants/g);
    if (matches) count += matches.length;
  }
  return count;
}

function countMemoryMentionsInEngines(engineFiles) {
  let count = 0;
  for (const f of engineFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/feedback_[a-z_]+|reference_[a-z_]+/g);
    if (matches) count += matches.length;
  }
  return count;
}

// PSN-SYNERGY-COLLECT-MS1: scanner expansion to recover system_viz/prism_os/prism_ai cross-refs.
// First-run inspector flagged these legs as cross_refs={} — false positives causing 36/55 pairs
// to surface as P0_critical. These three new counters mine authoritative sources to fix it.

function countEngineImportsInDispatcher(dispatcherFileName) {
  const path = resolve(PROJECT_ROOT, "mcp-server", "src", "tools", "dispatchers", dispatcherFileName);
  if (!safeStat(path)) return 0;
  try {
    const src = readFileSync(path, "utf8");
    // Lazy imports: `await import("../../engines/FooEngine.js")` — count unique engine module paths.
    const matches = src.match(/from\s+["'][^"']*\/engines\/[A-Z][A-Za-z]+\b/g) ?? [];
    const lazyMatches = src.match(/import\s*\(\s*["'][^"']*\/engines\/[A-Z][A-Za-z]+\b/g) ?? [];
    return matches.length + lazyMatches.length;
  } catch { return 0; }
}

function deriveSystemVizCrossRefs(meta) {
  // system_viz is the authoritative graph — every leg-typed node IS a cross-ref to that leg.
  // Use meta.counts (~3KB header read) instead of parsing the 495MB body.
  if (!meta || !meta.counts) return {};
  const c = meta.counts;
  const v = meta.vault ?? {};
  return {
    engines: c.engines ?? 0,
    wiki: v.wiki ?? c.wikiEntries ?? 0,
    memories: v.memories ?? 0,
    algorithms: c.algorithms ?? 0,
    formulas: c.formulas ?? 0,
    prism_os: (c.dispatchers ?? 0) + (c.actions ?? 0),
    nn_gnn: c.nnGraph ?? 0,
    prism_ai: c.prismAi ?? 0,
    tribal: c.tribal ?? 0,
    obsidian_brain: v.memories ?? 0,
  };
}

function countEngineMentionsInMemories(memoryFiles) {
  let count = 0;
  for (const f of memoryFiles.slice(0, FILE_CAP_PER_LEG)) {
    const sample = safeReadSample(f);
    const matches = sample.match(/[A-Z][A-Za-z]+Engine/g);
    if (matches) count += matches.length;
  }
  return count;
}

// PSN-SYNERGY-COLLECT-MS2: obsidian_brain out-edge expansion.
// MS1 fixed the system_viz/prism_os/prism_ai blind spots. This MS2 pass fixes the
// symmetric blind spot on the obsidian_brain (and memories) leg: v1/MS1 only counted
// obsidian → {wiki, engines, memories}, leaving obsidian → {tribal, system_viz,
// prism_ai, nn_gnn, prism_os, algorithms, formulas} at zero. Those bridges DO exist
// in production (memory→tribal capture via ObsidianVaultSyncEngine, octopus→obsidian
// via ConsensusObsidianPersistenceEngine, memories→GNN via graph-node-embedding-bridge,
// memory recall via prism_operating_system, obsidian_viz_* into system-viz). Counting
// them stops the inspector from falsely flagging the Obsidian node P0_critical against
// non-empty legs it is actually wired to. Single bounded pass (reads each memory-head
// once, tallies every target pattern) so we add 1 scan, not 7.
const OBSIDIAN_OUT_PATTERNS = {
  tribal:     /tribal[-_ ]?(?:knowledge|tip|tips|embed|index)|TribalKnowledge/gi,
  system_viz: /system[-_ ]?viz|system-graph|ghost[-_ ]?roost|\/system-viz\//gi,
  prism_ai:   /prism_ai\b|aiSystemRouter|octopus|MultiModelConsensus|consensus[-_ ]?(?:ledger|persist)/gi,
  nn_gnn:     /GraphSAGE|\bGNN\b|NeuralLearning|nn[-_]graph|node[-_ ]?embedding/gi,
  prism_os:   /prism_operating_system|\bprism_os\b|operatingSystem/gi,
  algorithms: /\balgorithms?\//gi,
  formulas:   /\/formulas\/|architecture\/formulas|\[\[formula[-_ ]/gi,
};

// Drop a leading YAML frontmatter block (--- … ---) so auto-generated boilerplate metadata
// does not masquerade as synergy. PSN-SYNERGY-COLLECT-MS3 caught this: every one of the 5000
// auto-generated formula stubs carries `tags: [architecture, system-viz, …]` + template
// `/system-viz/` lines, which tallied as formulas→system_viz 15000 (3×/file) — one template
// applied N times is NOT N independent edges (R12, mirrors the bare-"formula" lesson). Body
// content is the honest signal; declared `tags:`/`related:` metadata is categorization, not a
// runtime/reference bridge. ASCII-cheap: only strips when the head starts with `---`.
function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4);
}

// Generic bounded mention-tally: reads each file head once, tallies every pattern in the
// map. Reused for the obsidian, wiki, and MS3 code/data legs. (String.match with a /g regex
// ignores lastIndex and resets it, so sharing pattern objects across files/legs is safe.)
// opts.perFile=true → per-file BINARY presence (each file contributes ≤1 per peer) instead of
// raw match totals. MS3-fix (3-of-3 arms A+B): raw totals double/triple-count a single logical
// reference when overlapping regex alternatives hit one token (e.g. `state/shared/system-viz/
// system-graph.json` matches the system_viz alt twice; `from "../engines/FooEngine"` matches
// the engines alt thrice) AND multiply uniform auto-gen template lines by file count. Per-file
// presence measures connection BREADTH (how many files of leg A touch leg B) — immune to both,
// and the honest connectivity signal the inspector's density wants. Default stays raw so the
// shipped MS2 obsidian/wiki counts are byte-unchanged.
// opts.dropGeneratorPointers=true → strip generator membership-pointer lines (`Live graph:
//   …system-graph.json`). MS3-fix2 (3-of-3 re-review P1): that footer is stamped into EVERY
//   auto-gen formula/algorithm stub and declares the doc's OWN node in the system-viz graph —
//   an INBOUND membership marker (system-viz indexes the formula), not an outbound reference.
//   Counting it saturated formulas→system_viz at file-count (uniform template). Stripping it
//   leaves only genuine conceptual system-viz refs (honest, often ~0 — an honest gap > vanity).
// opts.dropSelfName=true → remove the file's own basename token before matching, so a leg whose
//   files ARE engines (nn_gnn = *Engine.ts) doesn't count its own class declaration as a
//   cross-leg engines edge (3-of-3 re-review P2: nn_gnn→engines was ~18% self-name).
// All three opts are off by default → MS2 obsidian/wiki callers (no opts) are genuinely
// byte-unchanged (corrects the earlier imprecise "byte-unchanged" claim — now literally true).
function countPatternsInFiles(files, patternMap, opts = {}) {
  const perFile = opts.perFile === true;
  const dropPointers = opts.dropGeneratorPointers === true;
  const dropSelfName = opts.dropSelfName === true;
  const counts = {};
  for (const k of Object.keys(patternMap)) counts[k] = 0;
  for (const f of files.slice(0, FILE_CAP_PER_LEG)) {
    let sample = stripFrontmatter(safeReadSample(f));
    if (!sample) continue;
    if (dropPointers) sample = sample.replace(/^.*\bLive graph:.*$/gim, "");
    if (dropSelfName) {
      const selfName = basename(f).replace(/\.[a-z0-9]+$/i, "");
      if (selfName) sample = sample.split(selfName).join(" ");
    }
    for (const k of Object.keys(patternMap)) {
      const m = sample.match(patternMap[k]);
      if (m) counts[k] += perFile ? 1 : m.length;
    }
  }
  return counts;
}

function scanObsidianOutEdges(memoryFiles) {
  return countPatternsInFiles(memoryFiles, OBSIDIAN_OUT_PATTERNS);
}

// PSN-SYNERGY-COLLECT-MS2: wiki leg out-edges. Pre-MS2 the wiki leg hardcoded
// memories:0 + obsidian_brain:0 and omitted formulas/algorithms/system_viz/tribal/
// nn_gnn/prism_ai/prism_os → wiki showed out-peers=1 despite being dense with
// [[wikilinks]], reference_/feedback_ backlinks, and subsystem references.
const WIKI_OUT_PATTERNS = {
  // [[wikilinks]] + reference_/feedback_ tokens point back into the memory/obsidian leg.
  obsidian_brain: /\[\[[^\]]+\]\]|\b(?:reference|feedback)_[a-z0-9_]+/gi,
  tribal: OBSIDIAN_OUT_PATTERNS.tribal,
  system_viz: OBSIDIAN_OUT_PATTERNS.system_viz,
  prism_ai: OBSIDIAN_OUT_PATTERNS.prism_ai,
  nn_gnn: OBSIDIAN_OUT_PATTERNS.nn_gnn,
  prism_os: OBSIDIAN_OUT_PATTERNS.prism_os,
  algorithms: OBSIDIAN_OUT_PATTERNS.algorithms,
  formulas: OBSIDIAN_OUT_PATTERNS.formulas,
};

function scanWikiOutEdges(wikiFiles) {
  return countPatternsInFiles(wikiFiles, WIKI_OUT_PATTERNS);
}

// PSN-SYNERGY-COLLECT-MS3: out-edge recovery for the five single-peer code/data legs
// (algorithms, formulas, nn_gnn, prism_os, prism_ai). Pre-MS3 each hardcoded exactly ONE
// cross_ref (`engines`) — the same single-pattern blind spot MS2 fixed for obsidian/wiki —
// so the inspector falsely reported every one of these legs as near-isolated (out-peers=1)
// despite real production bridges: algorithm code imports physics/constants (= formulas) and
// references engines; GNN engines read memory embeddings + operate on the system-viz graph;
// the prism_ai dispatcher routes to nn_gnn, reads memories, invokes algorithms. PSN_OUT_PATTERNS
// is the canonical "reference TO leg X" detector set for the generic (code/dispatcher) case —
// it extends the obsidian/wiki-specific maps with engines/memories/wiki detectors and a
// code-aware formulas detector (physics/constants import). Each leg scan deletes its own key
// so self-mentions are never counted as a cross-leg edge (R12 — honest, no fabricated self-loops).
const PSN_OUT_PATTERNS = {
  engines:    /[A-Z][A-Za-z0-9]+Engine\b|\/engines\//g,
  // MS3-fix (3-of-3 arm-A P0-2): require a memory-file PATH, a .md memory filename, or a
  // [[wikilink]] to one. The pre-fix bare `\breference_…|\bfeedback_…` matched control-theory
  // identifiers in algorithm code (`reference_signal`, `feedback_gain`, `reference_trajectory`)
  // → fabricated algorithms→memories edges (R12 vanity). A real memory reference always carries
  // path / .md / wikilink context; a snake_case variable name never does.
  memories:   /knowledge\/memories|\[\[(?:reference|feedback)_[a-z0-9_]+\]\]|\b(?:reference|feedback)_[a-z0-9_]+\.md\b/gi,
  wiki:       /knowledge\/wiki|@see\s+wiki|wiki\/(?:architecture|lessons|patterns|concepts)/gi,
  tribal:     OBSIDIAN_OUT_PATTERNS.tribal,
  system_viz: OBSIDIAN_OUT_PATTERNS.system_viz,
  prism_ai:   OBSIDIAN_OUT_PATTERNS.prism_ai,
  nn_gnn:     OBSIDIAN_OUT_PATTERNS.nn_gnn,
  prism_os:   OBSIDIAN_OUT_PATTERNS.prism_os,
  algorithms: OBSIDIAN_OUT_PATTERNS.algorithms,
  formulas:   /physics\/constants|\/formulas\/|architecture\/formulas/gi,
};

// File-list leg out-edge scan (algorithms/formulas/nn_gnn): per-file BINARY presence tally of
// every PSN_OUT_PATTERNS detector, minus the leg's own key. perFile:true is load-bearing — it
// makes each file contribute ≤1 per peer, so (a) one import counted thrice by overlapping
// `engines` alternatives, (b) one graph-path line counted twice by the system_viz alternatives,
// and (c) a uniform auto-gen template line multiplied by file count all collapse to honest
// "N of M files in leg A reference leg B" breadth (3-of-3 arms A+B fix). Single-file dispatcher
// legs keep raw counts (scanDispatcherOutEdges) — binary is meaningless for one file.
function scanLegOutEdges(files, selfKey) {
  const counts = countPatternsInFiles(files, PSN_OUT_PATTERNS, {
    perFile: true,            // breadth, not volume (collapses within-file/line multi-matches)
    dropGeneratorPointers: true, // `Live graph:` membership footer ≠ outbound system_viz ref
    dropSelfName: true,       // a leg of *Engine files must not self-count as an engines edge
  });
  delete counts[selfKey];
  return counts;
}

// Dispatcher-source leg out-edge scan (prism_os/prism_ai): these legs have no file list —
// their nodes are dispatcher actions — so scan the FULL dispatcher source (one bounded file,
// NOT the 530MB tribal index) for every PSN_OUT_PATTERNS detector, minus the self key. Full
// file (not a head sample) because dispatcher lazy-imports + engine refs are scattered through
// handler bodies, not just the import header. Fail-soft: an unreadable path yields all-zeros.
function scanDispatcherOutEdges(dispatcherFileName, selfKey) {
  const counts = {};
  for (const k of Object.keys(PSN_OUT_PATTERNS)) counts[k] = 0;
  const p = resolve(PROJECT_ROOT, "mcp-server", "src", "tools", "dispatchers", dispatcherFileName);
  let src = "";
  try { src = readFileSync(p, "utf8"); } catch { src = ""; }
  for (const k of Object.keys(PSN_OUT_PATTERNS)) {
    const m = src.match(PSN_OUT_PATTERNS[k]);
    if (m) counts[k] += m.length;
  }
  delete counts[selfKey];
  return counts;
}

// PSN-SYNERGY gap-audit Bridge#7: leg → owning NATO slot, so a leg-health regression in the
// snapshot auto-routes to the slot that fixes it (PSN metric → fleet routing — a real synergy
// bridge between the synergy leg and the chat-fleet leg). Sourced from CHAT-SLOT-DOMAINS.md +
// the gap-audit Workflow slot attribution. Unmapped legs surface as "unassigned" (honest — a
// missing owner is a real gap, not a silent default).
const PSN_LEG_OWNER = {
  obsidian_brain: "alpha",   // token-economy / Obsidian / per-chat memory governance
  memories: "alpha",         // standing-memory subset — same governance
  wiki: "alpha",             // knowledge-graph governance (alpha owns the knowledge legs)
  tribal: "golf",            // tribal-knowledge shared substrate (fleet-managed)
  system_viz: "sierra",      // system-viz upgrades / integration / utilization
  engines: "papa",           // backend-helper — codebase-wide engine surface
  algorithms: "tango",       // algorithm / engine / pipeline discovery
  formulas: "tango",         // generated architecture/formula stubs (discovery surface)
  nn_gnn: "india",           // full-system AI training — NN / GNN
  prism_os: "papa",          // PRISM OS dispatcher (backend)
  prism_ai: "india",         // AI systems / router
};

// ============================================================================
// BUILD INVENTORY
// ============================================================================

function buildInventories() {
  console.log("Scanning PSN legs...");
  const memories = collectMemoriesLeg();
  const wiki = collectWikiLeg();
  const engines = collectEnginesLeg();
  const algorithms = collectAlgorithmsLeg();
  const formulas = collectFormulasLeg();
  const tribal = collectTribalLeg();
  const systemViz = collectSystemVizLeg();
  const nnGnn = collectNNGNNLeg();
  const prismOs = collectPrismOsLeg();
  const prismAI = collectPrismAILeg();

  console.log("Scanning cross-refs...");
  const memoryToWiki = countWikiLinksInMemories(memories.files);
  const wikiToEngines = countEngineMentionsInWiki(wiki.files);
  const enginesToWiki = countWikiMentionsInEngines(engines.files);
  const enginesToAlgs = countAlgorithmImportsInEngines(engines.files);
  const enginesToFormulas = countFormulaConstantImportsInEngines(engines.files);
  const enginesToMemories = countMemoryMentionsInEngines(engines.files);
  const memoriesToEngines = countEngineMentionsInMemories(memories.files);

  // MS1 scanner expansion — fills the v1 blind spots (system_viz, prism_os, prism_ai cross_refs)
  const prismOsToEngines = countEngineImportsInDispatcher("operatingSystemDispatcher.ts");
  const prismAIToEngines = countEngineImportsInDispatcher("aiReasoningDispatcher.ts");
  const systemVizRefs = deriveSystemVizCrossRefs(systemViz.meta);

  // MS2 obsidian out-edge scan — single bounded pass over memory heads.
  const obsidianOut = scanObsidianOutEdges(memories.files);
  // MS2 wiki out-edge scan — fills the hardcoded-zero wiki cross_refs.
  const wikiOut = scanWikiOutEdges(wiki.files);
  // MS2 tribal provenance edges — from the entry `source` histogram.
  const tribalSources = tribal.sources || {};

  // MS4-fix (gap-audit Ineff#3): the memories leg is the standing-memory SUBSET (feedback_/
  // reference_), NOT all obsidian files. Pre-fix it reused obsidian_brain's full-file scan
  // (memoryToWiki / memoriesToEngines / obsidianOut.*) verbatim → identical cross_refs →
  // double-counted apparent wiring. Scan the standing subset separately so memories reflects
  // its OWN real out-edges (a smaller, honest number — the subset can't out-reference the whole).
  const memStandingWiki = countWikiLinksInMemories(memories.standing);
  const memStandingEngines = countEngineMentionsInMemories(memories.standing);
  const memStandingOut = scanObsidianOutEdges(memories.standing);

  // MS3 out-edge scans for the five legs that pre-MS3 carried only a single hardcoded
  // `engines` edge. File-list legs scan their own heads; dispatcher legs scan the full
  // dispatcher source. The precise MS1 lazy-import engine counts (prismOsToEngines /
  // prismAIToEngines) override the regex `*Engine` tally — they measure actual wiring.
  const algorithmsOut = scanLegOutEdges(algorithms.files, "algorithms");
  const formulasOut = scanLegOutEdges(formulas.files, "formulas");
  const nnGnnOut = scanLegOutEdges(nnGnn.files, "nn_gnn");
  const prismOsOut = { ...scanDispatcherOutEdges("operatingSystemDispatcher.ts", "prism_os"), engines: prismOsToEngines };
  const prismAIOut = { ...scanDispatcherOutEdges("aiReasoningDispatcher.ts", "prism_ai"), engines: prismAIToEngines };

  const inventories = [
    {
      leg: "obsidian_brain",
      node_count: memories.files.length,
      cross_refs: {
        wiki: memoryToWiki,
        engines: memoriesToEngines,
        memories: memories.standing.length,
        // MS2: real obsidian → subsystem bridges (were silently zero pre-MS2).
        tribal: obsidianOut.tribal,
        system_viz: obsidianOut.system_viz,
        prism_ai: obsidianOut.prism_ai,
        nn_gnn: obsidianOut.nn_gnn,
        prism_os: obsidianOut.prism_os,
        algorithms: obsidianOut.algorithms,
        formulas: obsidianOut.formulas,
      },
    },
    {
      leg: "memories",
      node_count: memories.standing.length,
      // MS4-fix (Ineff#3): real out-edges of the STANDING-memory subset (was obsidian's
      // full-file scan reused verbatim → double-count). obsidian_brain stays the full set.
      cross_refs: {
        wiki: memStandingWiki,
        engines: memStandingEngines,
        obsidian_brain: memories.standing.length,
        tribal: memStandingOut.tribal,
        system_viz: memStandingOut.system_viz,
        prism_ai: memStandingOut.prism_ai,
        nn_gnn: memStandingOut.nn_gnn,
        prism_os: memStandingOut.prism_os,
        algorithms: memStandingOut.algorithms,
        formulas: memStandingOut.formulas,
      },
    },
    {
      leg: "wiki",
      node_count: wiki.files.length,
      cross_refs: {
        engines: wikiToEngines,
        // MS2: wiki out-edges (were hardcoded 0 / omitted → wiki falsely showed out-peers=1).
        memories: wikiOut.obsidian_brain, // [[links]]+refs target the memory/obsidian leg
        obsidian_brain: wikiOut.obsidian_brain,
        tribal: wikiOut.tribal,
        system_viz: wikiOut.system_viz,
        prism_ai: wikiOut.prism_ai,
        nn_gnn: wikiOut.nn_gnn,
        prism_os: wikiOut.prism_os,
        algorithms: wikiOut.algorithms,
        formulas: wikiOut.formulas,
      },
    },
    {
      leg: "engines",
      node_count: engines.files.length,
      cross_refs: {
        wiki: enginesToWiki,
        algorithms: enginesToAlgs,
        formulas: enginesToFormulas,
        memories: enginesToMemories,
      },
    },
    {
      leg: "algorithms",
      node_count: algorithms.files.length,
      // MS3: real algorithms → {engines, formulas, nn_gnn, …} scan (was a single
      // `engines: enginesToAlgs` bidirectional-proxy hack — R8, drop the proxy).
      cross_refs: algorithmsOut,
    },
    {
      leg: "formulas",
      node_count: formulas.files.length,
      // MS3: real formulas → {engines, algorithms, …} scan (was engines-only).
      cross_refs: formulasOut,
    },
    {
      leg: "tribal",
      node_count: tribal.count,
      // MS2: tribal provenance edges from the entry `source` field (was {} → most-isolated leg).
      // Only wiki/memory map to PSN legs; external/tribal-jsonl/tribal-knowledge-store are not
      // PSN legs, so they get NO edge (honest — no fabricated connectivity).
      cross_refs: {
        wiki: tribalSources.wiki || 0,
        memories: tribalSources.memory || 0,
        obsidian_brain: tribalSources.memory || 0,
      },
    },
    {
      leg: "system_viz",
      node_count: systemViz.count,
      cross_refs: systemVizRefs,  // MS1: derived from graph metadata head
    },
    {
      leg: "nn_gnn",
      node_count: nnGnn.files.length,
      // MS3: real nn_gnn → {engines, memories, system_viz, algorithms, …} scan (was a
      // file-count proxy). GNN engines read memory embeddings + operate on the system-viz graph.
      cross_refs: nnGnnOut,
    },
    {
      leg: "prism_os",
      node_count: prismOs.actions,
      // MS3: real prism_os → {engines (precise MS1 lazy-import), memories, system_viz, …} scan.
      cross_refs: prismOsOut,
    },
    {
      leg: "prism_ai",
      node_count: prismAI.actions,
      // MS3: real prism_ai → {engines (precise MS1 lazy-import), memories, nn_gnn, algorithms, …}.
      cross_refs: prismAIOut,
    },
  ];

  // Bridge#7: stamp each leg with its owning slot so leg-health regressions auto-route.
  for (const inv of inventories) inv.ownerSlot = PSN_LEG_OWNER[inv.leg] || "unassigned";

  return inventories;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const startedAt = new Date().toISOString();
  const inventories = buildInventories();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const out = {
    schemaVersion: "1.0.0",
    generated_at: startedAt,
    generated_by: "scripts/psn-synergy-collect.mjs",
    inventories,
  };
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  // Markdown summary
  const lines = [
    "# PSN Synergy Snapshot",
    "",
    `Generated: ${startedAt}`,
    `Source: \`scripts/psn-synergy-collect.mjs\``,
    "",
    "## Per-Leg Inventory",
    "",
    "| Leg | Owner | Node Count | Outgoing Refs (top peers) |",
    "|-----|-------|-----------:|---------------------------|",
  ];
  for (const inv of inventories) {
    const refs = Object.entries(inv.cross_refs)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ") || "—";
    lines.push(`| ${inv.leg} | ${inv.ownerSlot || "?"} | ${inv.node_count} | ${refs} |`);
  }
  lines.push("");
  lines.push("Pipe this snapshot into `psn_synergy_inspect` to get ranked bridge candidates:");
  lines.push("");
  lines.push("```bash");
  lines.push("# via MCP dispatcher (caller passes inventories[] from this snapshot)");
  lines.push("# prism_intelligence({ action: 'psn_synergy_inspect', params: { inventories: <snapshot.inventories> } })");
  lines.push("```");
  writeFileSync(OUT_MD, lines.join("\n"), "utf8");

  console.log(`✓ Wrote ${OUT_JSON}`);
  console.log(`✓ Wrote ${OUT_MD}`);
  console.log(`  Legs: ${inventories.length}`);
  const totalNodes = inventories.reduce((s, i) => s + i.node_count, 0);
  console.log(`  Total nodes counted: ${totalNodes}`);
}

// Run only as a CLI; when imported (tests), expose the pure helpers instead of scanning.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();

export { countNeedleStreaming, streamSourceHistogram, countPatternsInFiles, stripFrontmatter, scanObsidianOutEdges, scanWikiOutEdges, scanLegOutEdges, scanDispatcherOutEdges, collectTribalLeg, buildInventories, OBSIDIAN_OUT_PATTERNS, WIKI_OUT_PATTERNS, PSN_OUT_PATTERNS, PSN_LEG_OWNER };
