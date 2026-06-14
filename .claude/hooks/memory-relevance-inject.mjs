#!/usr/bin/env node
// tier: T1
/**
 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
 *
 * Before the user edits a file, scan their auto-memory directory for
 * any feedback memo that mentions the file path, basename, or symbol
 * derived from it. Inject the top-3 matches as PreToolUse context.
 *
 * Goal: "no repeated mistakes." If past feedback says "don't soften
 * completeness gates" and we're about to edit a hook with a
 * `continueOnError: true` change, surface that BEFORE the edit.
 *
 * Token budget: ≤1500 chars total injected (~375 tokens).
 *
 * Fail-open. Never blocks. Disable: PRISM_MEMORY_RELEVANCE=0.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { rerank as lexicalRerank } from "../../scripts/lib/lexical-rerank.mjs";
// 2026-05-26 (U-D4-MEMORYINJECT-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. MemoryInject feature was 0-fire pre-wire.
import { incrementFeature } from "../helpers/feature-counter.mjs";
// 2026-05-27 (U-CAG-INJECTORS-CONSUME, slot:sierra): COLD-tier prompts have the
// relevant feedback memos already surfaced via the cached doctrine + memory-md
// COLD source; the per-edit recall is duplicative. Fail-OPEN.
import { shouldSkip, skipAdvisory } from "../helpers/cag-consume.mjs";
// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3b, 2026-06-08, slot:alpha): semantic
// recall stage. Surfaces memos similar in MEANING to the file being edited that
// the lexical name-match misses. Fail-open: cache absent / Ollama down / timeout
// → exactly the prior lexical-only behavior. Standalone JSONL cache (no MCP
// dependency — the daemon is often down when this hot-path hook fires).
import { loadEmbedCache, embedText, semanticTopK } from "../../scripts/lib/memo-embed-lib.mjs";

// SLOT-DRIFT-FIX-MS0/U-SDF12 (2026-05-17): per-(session, file) rate-limiter.
// Memory recall re-fires on every Edit/Write of the same file — same memos,
// same advice. Operator sees the same recall N times when editing the same
// hook iteratively (very common in autonomous /loop work). Per-file window:
// fire once, then suppress for 20 min.
// U-MRI-TTL-FIX (2026-05-25, slot:alpha): bump 20min → 24h.
// Per U-HOOK-INJECT-ROI audit: 27 fires × 299 = 8K/session despite the 20min
// rate-limit because /loop iter spacing routinely exceeds 20min and the same
// file gets re-edited triggering re-emission. Memory recall is stable
// per-task; 24h is effectively per-session. Companion to slot-soul +
// discipline + comp-build TTL bumps + the per-file dedups (CCG/TCE/PWGI/etc).
const _RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const _RATE_FILE = path.join(os.tmpdir(), "prism-hook-state", "memory-relevance-seen.json");
function _loadSeen() {
  try { return JSON.parse(readFileSync(_RATE_FILE, "utf8")); }
  catch { return {}; }
}
function _saveSeen(state) {
  try {
    const dir = path.dirname(_RATE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(_RATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}
function _recentlySeen(sessionId, filePath) {
  if (!sessionId || !filePath) return false;
  const state = _loadSeen();
  const last = state[`${sessionId}:${filePath}`];
  return typeof last === "number" && (Date.now() - last) < _RATE_WINDOW_MS;
}
function _markSeen(sessionId, filePath) {
  if (!sessionId || !filePath) return;
  const state = _loadSeen();
  state[`${sessionId}:${filePath}`] = Date.now();
  const cutoff = Date.now() - 2 * _RATE_WINDOW_MS;
  for (const [k, t] of Object.entries(state)) {
    if (typeof t !== "number" || t < cutoff) delete state[k];
  }
  _saveSeen(state);
}

// Derive from homedir — a hardcoded foreign-user path here caused fail-open
// 0% recall fleet-wide (this fires via edit-bundle.mjs on every Edit).
const MEMORY_DIR =
  process.env.PRISM_MEMORY_DIR ||
  path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");
const MAX_HITS_INJECTED = 3;
// RAG-UPGRADE-MS0/U-RAG-2: widen the stage-1 term-frequency recall, then
// narrow via the lexical reranker to MAX_HITS_INJECTED. STAGE1_K mirrors the
// master-index hook's formula (×5 clamped to [k, 30]) — a wide-enough pool
// for the reranker's coverage/phrase signals to matter, capped for cost.
const STAGE1_K = Math.min(30, Math.max(MAX_HITS_INJECTED, MAX_HITS_INJECTED * 5));
const MAX_BODY_PER_HIT = 350;
const MAX_TOTAL_CHARS = 1500;
const RELEVANT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
// F3b semantic recall: union up to SEMANTIC_K_SHOWN meaning-similar memos
// (cosine ≥ SEMANTIC_MIN) that the lexical name-match would miss. Disable:
// PRISM_MEMORY_SEMANTIC=0.
const SEMANTIC_K_SHOWN = Number(process.env.PRISM_MEMORY_SEMANTIC_K) || 2;
// 0.60 floor: nomic-embed cosines run high (related text 0.6-0.8, loosely-related
// 0.5-0.6); 0.60 cuts the loose-token-overlap false-positives (e.g. "Wire" in a
// wire-EDM filename matching engine-"wiring" memos). Tune: PRISM_MEMORY_SEMANTIC_MIN.
const SEMANTIC_MIN = Number(process.env.PRISM_MEMORY_SEMANTIC_MIN) || 0.6;
// U-OBS-GALAXY-BRAIN-RECALL: galaxy MEMORY.md brains are long domain DOCUMENTS.
// The galaxy pass is a DEDICATED k=1 slot so the single best domain brain isn't
// crowded out of the flat semantic top-K by flat memos. Floor measured LIVE against
// real filename-derived queries (NOT hand-crafted phrases): a file genuinely IN a
// galaxy's domain scores 0.63+ (mill→mill 0.642, lathe→lathe 0.633), while
// out-of-domain / wrong-galaxy matches top out at ~0.55-0.60 (lock→bug-hunting 0.535,
// WireEdm→wiring 0.553 [wrong!], generic→agent-orch 0.597). 0.60 keeps the strong
// CORRECT matches and cuts every observed spurious/wrong one — precision over recall,
// because an auto-injected WRONG domain brain is worse than none (R12). Lower for
// more recall at the cost of false positives: PRISM_MEMORY_GALAXY_MIN.
const GALAXY_MIN = Number(process.env.PRISM_MEMORY_GALAXY_MIN) || 0.6;

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function emit(eventName, additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: eventName, additionalContext },
  }));
}

function deriveSearchTerms(filePath) {
  if (!filePath) return [];
  const terms = new Set();
  const norm = filePath.replace(/\\/g, "/");
  terms.add(norm);
  const base = path.basename(norm);
  if (base) terms.add(base);
  const stem = base.replace(/\.[a-z]+$/i, "").replace(/\.test$/i, "");
  if (stem && stem.length >= 4) terms.add(stem);
  const m = stem.match(/^([A-Z][A-Za-z0-9]+?)(Engine|Hook|Service|Manager|Adapter|Bridge|Router|Provider|Controller|Repository|Validator)?$/);
  if (m && m[1] && m[1].length >= 4) terms.add(m[1]);
  const dom = stem.match(/^([A-Z][a-z]+|[A-Z]{2,})/);
  if (dom && dom[1] && dom[1].length >= 4) terms.add(dom[1]);
  return [...terms];
}

function loadMemoryFiles() {
  if (!existsSync(MEMORY_DIR)) return [];
  let files;
  try { files = readdirSync(MEMORY_DIR); } catch { return []; }
  return files
    .filter((f) => /^(feedback|reference|project|user)_.+\.md$/.test(f))
    .map((f) => ({ name: f, path: path.join(MEMORY_DIR, f) }));
}

function scoreFile(filePath, terms) {
  let body;
  try { body = readFileSync(filePath, "utf8"); } catch { return { score: 0, body: "" }; }
  let score = 0;
  const lc = body.toLowerCase();
  for (const t of terms) {
    if (!t) continue;
    const tl = t.toLowerCase();
    let idx = 0;
    while ((idx = lc.indexOf(tl, idx)) !== -1) {
      score += t.length >= 6 ? 3 : 1;
      idx += tl.length;
    }
  }
  return { score, body };
}

function extractTitleAndOpening(body) {
  let rest = body;
  if (rest.startsWith("---\n")) {
    const close = rest.indexOf("\n---", 4);
    if (close !== -1) rest = rest.slice(close + 4).replace(/^\n+/, "");
  }
  let title = "";
  for (const ln of rest.split("\n")) {
    if (ln.startsWith("# ")) { title = ln.slice(2).trim(); break; }
  }
  const paras = rest.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p && !p.startsWith("# "));
  const opening = (paras[0] || "").slice(0, MAX_BODY_PER_HIT);
  return { title, opening };
}

/**
 * U-RAG-2 stage-2 lexical rerank over the wider stage-1 term-frequency
 * recall. Mirrors the 3-of-3-passed pattern in tribal-by-domain-inject.mjs
 * (commit 6df057e098) and master-index-precheck-inject.mjs.
 *
 * The synthesized `text` aggregates memo name + title + opening — the
 * focused, bounded slice the operator actually sees. Scoring `coverage`
 * over the full memo body instead would length-bias toward long memos
 * (more distinct tokens just by being long); the title+opening is the
 * salient part and is already char-capped by extractTitleAndOpening.
 *
 * The stage-1 term-frequency `score` flows through untouched as
 * scoreCandidate's 0.15-weighted `stage1` prior — it clamps the unbounded
 * occurrence count to [0,1], so most scores collapse to ~1.0 and the
 * lexical features (coverage/phrase/density, 0.70 combined weight) do the
 * real reranking. That is the intended two-stage behavior and matches the
 * master-index hook (which likewise does not normalize stage-1).
 *
 * Returns the narrowed list in the ORIGINAL hit shape — BOTH synthesized
 * scoring inputs (`text` and `label`, neither of which the memory hit
 * carried) are stripped so the renderer receives `{name,path,score,body}`
 * exactly as before.
 */
export function applyLexicalRerank(query, items, topK) {
  if (!Array.isArray(items)) return [];
  if (items.length <= 1) return items.slice(0, topK);
  const cands = items.map((x) => {
    const { title, opening } = extractTitleAndOpening(
      typeof x?.body === "string" ? x.body : "",
    );
    const name = typeof x?.name === "string" ? x.name : "";
    return {
      ...x,
      // `text` + `label` are the reranker's scoring inputs — label-hits
      // score stronger (labelHit weight 0.15). Both synthesized here and
      // stripped below; the memory hit shape has neither natively.
      text: `${name} ${title} ${opening}`.trim(),
      label: name,
    };
  });
  const out = lexicalRerank(query, cands, { topK });
  return out.slice(0, topK).map((c) => {
    const { text: _t, label: _l, ...rest } = c;
    return rest;
  });
}

async function main() {
  if (process.env.PRISM_MEMORY_RELEVANCE === "0") process.exit(0);
  try {
    const stdin = readStdin();
    if (!stdin) process.exit(0);
    let payload;
    try { payload = JSON.parse(stdin); } catch { process.exit(0); }
    const tool = payload?.tool_name || payload?.toolName || "";
    if (!RELEVANT_TOOLS.has(tool)) process.exit(0);
    const params = payload?.tool_input || payload?.parameters || {};
    const target = params.file_path || params.notebook_path || params.path;
    if (!target) process.exit(0);
    // U-SDF12: per-(session, file) rate-limit. Same memos on repeat Edits
    // are pure context burn; suppress for 20 min after first fire.
    const sessionId = (payload?.session_id || payload?.sessionId || "").toString().slice(0, 36);
    if (_recentlySeen(sessionId, target)) process.exit(0);
    // U-CAG-INJECTORS-CONSUME (2026-05-27, sierra): COLD-tier prompts have the
    // relevant memo set already surfaced via the cached doctrine block + the
    // memory-md COLD source. The per-edit BM25 recall here would just re-inject
    // memos the operator already has in-context. Fail-OPEN.
    //
    // P1 follow-up (scrutiny arm C, same-day): do NOT _markSeen() on a skip path.
    // The skip is per-prompt (CAG sidecar lifetime ≤30s), but _markSeen burns the
    // 24h per-(session, file) rate-limit window. If the COLD sidecar later goes
    // stale within that window and the same Edit re-fires, _recentlySeen would
    // suppress the fallback that fail-OPEN is supposed to preserve — silent
    // degradation. Skip just exits; the rate-limiter governs the regular path.
    const cag = shouldSkip("memoryRelevanceInject", { sessionId });
    if (cag.skip) {
      emit("PreToolUse", skipAdvisory("Memory recall (memory-relevance-inject)", cag));
      process.exit(0);
    }
    const terms = deriveSearchTerms(target);
    if (terms.length === 0) process.exit(0);
    const memos = loadMemoryFiles();
    if (memos.length === 0) process.exit(0);
    // U-D4: feature engaged — memos available to scan against target file.
    try { incrementFeature("MemoryInject", { slot: payload?.slot ?? null }); } catch { /* never blocks */ }
    const scored = [];
    for (const m of memos) {
      const { score, body } = scoreFile(m.path, terms);
      if (score > 0) scored.push({ ...m, score, body });
    }
    // U-RAG-2 two-stage lexical recall (unchanged): widen to STAGE1_K, rerank by
    // the lexical scorer's coverage/phrase/density signals, narrow to
    // MAX_HITS_INJECTED. Query = the derived search terms joined.
    let top = [];
    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const stage1 = scored.slice(0, STAGE1_K);
      top = applyLexicalRerank(terms.join(" "), stage1, MAX_HITS_INJECTED);
    }

    // F3b — semantic recall (additive, fail-open). Surface memos similar in
    // MEANING to the file being edited that the lexical name-match missed.
    // Runs even when lexical found nothing (the highest-value case: a file whose
    // domain has tribal knowledge but no name-match memo). Any failure (cache
    // absent / Ollama down / timeout / parse) leaves semHits=[] → pure lexical.
    let semHits = [];
    // U-OBS-GALAXY-BRAIN-RECALL: per-domain galaxy-brain pointers, kept SEPARATE
    // from semHits so the render can place them FIRST + compact — a whole-domain
    // brain is the highest-value recall but is large, so appending it last (with a
    // body slice) let the 1500-char budget truncate it away entirely.
    let galHits = [];
    if (process.env.PRISM_MEMORY_SEMANTIC !== "0") {
      try {
        const cache = loadEmbedCache();
        if (cache && cache.size > 0) {
          const semQuery = terms.filter((t) => !t.includes("/")).join(" ").trim();
          if (semQuery) {
            const qvec = await embedText(semQuery);
            if (qvec) {
              const exclude = new Set(top.map((h) => h.name));
              const sem = semanticTopK(qvec, cache, {
                k: SEMANTIC_K_SHOWN,
                minScore: SEMANTIC_MIN,
                excludeNames: exclude,
              });
              for (const s of sem) {
                // U-OBS-GALAXY-BRAIN-RECALL: galaxy-brain entries carry an explicit
                // `path` (they live under mcp-server/src/engines/<galaxy>/MEMORY.md,
                // OUTSIDE MEMORY_DIR). Flat memos have no `path` → fall back to the
                // MEMORY_DIR join (prior behavior, byte-identical for flat memos).
                const p = s.path || path.join(MEMORY_DIR, s.name);
                let body;
                try { body = readFileSync(p, "utf8"); } catch { continue; }
                semHits.push({ name: s.name, path: p, sim: s.score, body });
              }
              // U-OBS-GALAXY-BRAIN-RECALL: SECOND, galaxy-only pass at the lower
              // GALAXY_MIN floor (k=1). Galaxy brains are long domain documents that
              // rarely clear SEMANTIC_MIN against a short query, yet the correct
              // galaxy reliably ranks #1 — so surface the single best domain brain
              // when it clears GALAXY_MIN. Excludes anything already shown (lexical
              // top + flat semHits) so no entry double-renders.
              const galExclude = new Set([...exclude, ...semHits.map((h) => h.name)]);
              const galTop = semanticTopK(qvec, cache, {
                k: 1,
                minScore: GALAXY_MIN,
                nameFilter: (n) => n.startsWith("galaxy/"),
                excludeNames: galExclude,
              });
              for (const s of galTop) {
                // Resolvability guard (skip a galaxy entry whose file is gone), but
                // render COMPACT (pointer only) — a galaxy brain is large and its
                // VALUE is the pointer, not a 350-char body slice. Collected in
                // galHits so the render places it FIRST, within the char budget.
                const p = s.path || path.join(MEMORY_DIR, s.name);
                // Resolvability guard only — the galaxy render is a compact pointer
                // (no body slice), so existsSync suffices; avoids slurping an ~11KB
                // (max ~115KB) brain file purely to confirm it on this PreToolUse
                // hot path (scrutiny reviewer-C P2).
                if (!existsSync(p)) continue;
                galHits.push({ name: s.name, sim: s.score });
              }
            }
          }
        }
      } catch { semHits = []; /* fail-open → lexical-only */ }
    }

    if (top.length === 0 && semHits.length === 0 && galHits.length === 0) process.exit(0);

    const lines = [];
    lines.push("## 🧠 Memory recall — feedback that may apply to this edit");
    lines.push("");
    lines.push(`_Editing \`${path.basename(target)}\` matched ${scored.length} memo(s); ${top.length} lexical${semHits.length ? ` + ${semHits.length} semantic` : ""}${galHits.length ? ` + ${galHits.length} galaxy-brain` : ""} shown. Disable: PRISM_MEMORY_RELEVANCE=0 (semantic: PRISM_MEMORY_SEMANTIC=0)._`);
    lines.push("");
    // U-OBS-GALAXY-BRAIN-RECALL: domain-brain pointer(s) FIRST + compact so the
    // MAX_TOTAL_CHARS budget never truncates them away (the lexical section alone
    // can fill 1500 chars). One line each — the value is the pointer to the brain.
    if (galHits.length > 0) {
      for (const g of galHits) {
        lines.push(`🌌 **Galaxy brain:** [[${g.name}]] (cosine ${g.sim.toFixed(2)}) — per-domain context for this file (conventions, gotchas, dispatcher map). Read it before deep work in this domain.`);
      }
      lines.push("");
    }
    for (const hit of top) {
      const { title, opening } = extractTitleAndOpening(hit.body);
      lines.push(`### [[${hit.name.replace(/\.md$/, "")}]] (score: ${hit.score})`);
      if (title) lines.push(`**${title}**`);
      lines.push(opening);
      lines.push("");
    }
    if (semHits.length > 0) {
      lines.push("### 🔎 Semantically related (meaning-match, not name-match)");
      for (const hit of semHits) {
        const { title, opening } = extractTitleAndOpening(hit.body);
        lines.push(`#### [[${hit.name.replace(/\.md$/, "")}]] (cosine: ${hit.sim.toFixed(2)})`);
        if (title) lines.push(`**${title}**`);
        lines.push(opening);
        lines.push("");
      }
    }
    let text = lines.join("\n");
    if (text.length > MAX_TOTAL_CHARS) text = text.slice(0, MAX_TOTAL_CHARS - 12) + "\n…(truncated)";
    emit("PreToolUse", text);
    // U-SDF12: mark seen AFTER successful emit so the rate-limit only
    // suppresses recall that was actually shown to the operator.
    _markSeen(sessionId, target);
    process.exit(0);
  } catch { process.exit(0); }
}

// Run as a hook only when invoked directly (not when imported by a test).
const isDirectRun =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) main().catch(() => process.exit(0));
