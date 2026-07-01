#!/usr/bin/env node
// tier: T3
// U-HRP06 — memory→wiki promotion advisory Stop hook.
//
// When a session writes a new `feedback_*.md` or `reference_*.md` memory file,
// suggest the closest existing wiki entry the operator might want to merge
// with / promote into. Closes the PSN-leg #3 ↔ #4 horizontal gap from
// HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23 §3 (U-HRP06).
//
// Advisory only — never auto-creates wiki entries. R12 fail-loud: every
// rerank-call failure is logged in the advisory output so the operator knows
// when the RAG path degraded.
//
// Knobs:
//   PRISM_MEM_TO_WIKI_DISABLE=1     — silent skip
//   PRISM_MEM_TO_WIKI_HORIZON=900   — seconds of "recent" memory writes (default 15 min)
//   PRISM_MEM_TO_WIKI_TOP_K=3       — top-K nearest wiki entries to suggest

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import os from "node:os";

const PROJECT_ROOT = "H:/prism";
const MEMORY_DIRS = [
  join(PROJECT_ROOT, "knowledge/memories/feedback"),
  join(PROJECT_ROOT, "knowledge/memories/reference"),
];
const WIKI_DIRS = [
  join(PROJECT_ROOT, "knowledge/wiki/lessons"),
  join(PROJECT_ROOT, "knowledge/wiki/architecture"),
  join(PROJECT_ROOT, "knowledge/wiki/patterns"),
];

const DEFAULT_HORIZON_SEC = 900;
const DEFAULT_TOP_K = 3;
// Bound the per-run memo set: a bulk mtime touch (vault re-feed, sync) can make
// thousands of memos "recent" at once, which would make the embed pass try one
// oversized batch. Process the newest N (findRecentMemoryFiles sorts newest
// first) — generous for a real session's writes. Knob: PRISM_MEM_TO_WIKI_MAX_MEMOS.
const DEFAULT_MAX_MEMOS = 25;
const RECALL_MAX_FILES_PER_DIR = 250; // bound the wiki scan for non-RAG fallback

// Pure helper: list recently-written memory files (mtime within horizon).
export function findRecentMemoryFiles({
  memoryDirs = MEMORY_DIRS,
  now = Date.now(),
  horizonMs = DEFAULT_HORIZON_SEC * 1000,
} = {}) {
  const out = [];
  for (const dir of memoryDirs) {
    if (!existsSync(dir)) continue;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".md")) continue;
      const full = join(dir, e.name);
      try {
        const st = statSync(full);
        if ((now - st.mtimeMs) <= horizonMs) {
          out.push({ path: full, name: e.name, mtimeMs: st.mtimeMs });
        }
      } catch { /* skip unreadable */ }
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

// Extract a one-line summary from a memory file: prefer description: frontmatter,
// fall back to first non-empty content line.
export function extractMemorySummary(filePath) {
  let raw;
  try { raw = readFileSync(filePath, "utf8"); } catch { return ""; }
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fm) {
    const desc = fm[1].match(/^description:\s*(.+)$/m);
    if (desc) return desc[1].trim();
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("#")) continue;
    return trimmed.slice(0, 200);
  }
  return "";
}

// Scan wiki dirs for entry titles. Returns [{path, title}].
export function listWikiCandidates({ wikiDirs = WIKI_DIRS, maxPerDir = RECALL_MAX_FILES_PER_DIR } = {}) {
  const out = [];
  for (const dir of wikiDirs) {
    if (!existsSync(dir)) continue;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    let count = 0;
    for (const e of entries) {
      if (count >= maxPerDir) break;
      if (!e.isFile() || !e.name.endsWith(".md")) continue;
      const full = join(dir, e.name);
      out.push({ path: full, title: e.name.replace(/\.md$/, "") });
      count++;
    }
  }
  return out;
}

// Compute top-K nearest wiki entries for each new memory using injected rerank.
// `rerank(query, candidates[], topK)` returns [{candidate, score}].
// If rerank absent → fallback: simple keyword-overlap on title.
export function suggestWikiPromotions({
  newMemories,
  wikiCandidates,
  rerank = null,
  topK = DEFAULT_TOP_K,
  minScore = 0.3,
}) {
  const suggestions = [];
  if (!Array.isArray(newMemories) || newMemories.length === 0) return suggestions;
  if (!Array.isArray(wikiCandidates) || wikiCandidates.length === 0) return suggestions;
  const wikiTitles = wikiCandidates.map((w) => w.title);

  for (const mem of newMemories) {
    const summary = extractMemorySummary(mem.path);
    if (!summary) continue;
    let topHits = [];
    if (typeof rerank === "function") {
      try {
        const results = rerank(summary, wikiTitles, topK);
        if (Array.isArray(results)) {
          for (const r of results) {
            const score = Number(r?.score);
            if (!Number.isFinite(score) || score < minScore) continue;
            const text = typeof r?.candidate === "string" ? r.candidate : String(r?.candidate ?? "");
            const idx = wikiTitles.indexOf(text);
            if (idx >= 0) {
              topHits.push({ wikiPath: wikiCandidates[idx].path, title: text, score });
            }
          }
        }
      } catch {
        topHits = [];
      }
    } else {
      // Fallback: keyword-overlap on title (degraded path).
      const memTokens = new Set(summary.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3));
      const scored = wikiCandidates.map((w) => {
        const wTokens = new Set(w.title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3));
        let intersect = 0;
        for (const t of memTokens) if (wTokens.has(t)) intersect++;
        const union = memTokens.size + wTokens.size - intersect;
        const score = union > 0 ? intersect / union : 0;
        return { wikiPath: w.path, title: w.title, score };
      });
      topHits = scored
        .filter((s) => s.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }
    if (topHits.length > 0) {
      suggestions.push({
        memoryPath: mem.path,
        memoryName: mem.name,
        summary,
        nearestWiki: topHits,
        ragMode: typeof rerank === "function" ? "rerank" : "keyword-fallback",
      });
    }
  }
  return suggestions;
}

// Format the advisory for the Stop-hook additionalContext.
export function formatAdvisory(suggestions) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
  const lines = ["💡 Memory→wiki promotion suggestions (U-HRP06 advisory):"];
  for (const s of suggestions) {
    lines.push(`  • ${s.memoryName} — "${s.summary.slice(0, 80)}..."`);
    lines.push(`    Nearest wiki (${s.ragMode}):`);
    for (const w of s.nearestWiki) {
      lines.push(`      - score=${w.score.toFixed(2)} → ${w.title}`);
    }
  }
  lines.push("  Operator: consider merging memory into nearest wiki entry, or promoting standalone wiki entry. Advisory only.");
  return lines.join("\n");
}

// Per-session dedup — per-MEMO granularity, NOT per-set.
//
// This advisory fires on every Stop while recent memos sit inside the horizon.
// A set-fingerprint dedup is defeated here: the recency signal is file mtime,
// and a bulk mtime-touch (the obsidian memory-feed re-stamping ~1500 files) puts
// them all in the horizon with near-tied mtimes, so `findRecentMemoryFiles`'s
// newest-N slice returns an ARBITRARY, churning subset each Stop → a per-set
// fingerprint never repeats → it would re-emit a ~9KB block forever (verified).
//
// So dedup per memo NAME: suggest each memo's promotion at most once per session,
// capped at SESSION_CAP total. Robust to the slice churn (a memo is shown once no
// matter which subset it lands in), converges (after the surfaced memos are
// covered it goes quiet), and still surfaces a genuinely new memo immediately.
// Disable: PRISM_MEM_TO_WIKI_DEDUP=0.
const SEEN_FILE = process.env.PRISM_MEM_TO_WIKI_SEEN_FILE ||
  join(os.tmpdir(), "prism-hook-state", "mem-to-wiki-seen.json");
// A real session writes a handful of memos; >this many "recent" is a bulk-touch
// artifact, not genuine writes. Cap total per-session suggestions so the drain is
// bounded (then silent). Knob: PRISM_MEM_TO_WIKI_SESSION_CAP.
const SESSION_CAP = Number(process.env.PRISM_MEM_TO_WIKI_SESSION_CAP) || 50;

// Pure: given this fire's suggestions + the names already suggested this session,
// return only the unseen ones (bounded by the remaining session budget) plus the
// updated seen-name list. `capped` true → the session budget is exhausted.
export function filterUnseenSuggestions(suggestions, seenNames, maxTotal = SESSION_CAP) {
  const seen = new Set(Array.isArray(seenNames) ? seenNames : []);
  if (seen.size >= maxTotal) return { toEmit: [], newSeen: [...seen], capped: true };
  const fresh = (Array.isArray(suggestions) ? suggestions : [])
    .filter((s) => s && typeof s.memoryName === "string" && !seen.has(s.memoryName));
  const budget = maxTotal - seen.size;
  const toEmit = fresh.slice(0, budget);
  const newSeen = [...seen, ...toEmit.map((s) => s.memoryName)];
  return { toEmit, newSeen, capped: false };
}

function loadSeen() {
  try { return JSON.parse(readFileSync(SEEN_FILE, "utf8")); } catch { return {}; }
}
// Best-effort, non-atomic: across slots this is last-writer-wins. The only
// failure mode is a momentarily-lost seen-list → at most one redundant emit of an
// already-shown memo — never a wrong suppression, missed advisory, or crash (a
// torn read is caught by loadSeen → {} → re-emit). Acceptable for an advisory.
function saveSeen(state) {
  try {
    const dir = dirname(SEEN_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(SEEN_FILE, JSON.stringify(state));
  } catch { /* best-effort */ }
}

async function main() {
  if (process.env.PRISM_MEM_TO_WIKI_DISABLE === "1") process.exit(0);
  let sessionId = "";
  try {
    const p = JSON.parse(readFileSync(0, "utf8"));
    sessionId = (p?.session_id || p?.sessionId || "").toString().slice(0, 64);
  } catch { /* no stdin payload → dedup simply inactive */ }
  const horizonSec = Number(process.env.PRISM_MEM_TO_WIKI_HORIZON) || DEFAULT_HORIZON_SEC;
  const topK = Number(process.env.PRISM_MEM_TO_WIKI_TOP_K) || DEFAULT_TOP_K;
  const maxMemos = Number(process.env.PRISM_MEM_TO_WIKI_MAX_MEMOS) || DEFAULT_MAX_MEMOS;
  const newMemories = findRecentMemoryFiles({ horizonMs: horizonSec * 1000 }).slice(0, maxMemos);
  if (newMemories.length === 0) process.exit(0);
  const wikiCandidates = listWikiCandidates();

  // U-OBS-MEMWIKI-RERANK (slot:alpha, 2026-06-09): inject a local-LLM nomic
  // cosine rerank over the keyword-Jaccard fallback. The fallback scores the
  // memo summary against wiki TITLES by token-set overlap — blind to synonymy
  // (a memo "out-of-memory crash" never matches the lesson
  // `oom-bypasses-fail-soft-catch`). Embedding is up-front (the advisor calls
  // rerank() synchronously); title vectors are disk-cached so only the per-run
  // summaries embed each fire. $0 Claude tokens (Ollama nomic on Blackwell).
  // Fail-open: Ollama down / disabled → rerank stays null → keyword fallback
  // (suggestWikiPromotions records which path ran in each suggestion's ragMode).
  // Disable: PRISM_MEM_TO_WIKI_NOMIC=0.
  let rerank = null;
  let minScore = 0.3; // keyword-fallback floor (unchanged legacy default)
  if (process.env.PRISM_MEM_TO_WIKI_NOMIC !== "0") {
    try {
      const lib = await import("../../scripts/lib/wiki-promo-rerank.mjs");
      const titleMap = await lib.ensureTitleEmbeddings(wikiCandidates.map((w) => w.title));
      const queries = newMemories.map((m) => extractMemorySummary(m.path)).filter(Boolean);
      const prep = await lib.prepareNomicRerank({ queries, titleMap });
      if (prep.ready) { rerank = prep.rerank; minScore = lib.NOMIC_MIN_SCORE; }
    } catch { rerank = null; /* fail-open → keyword fallback */ }
  }

  const suggestions = suggestWikiPromotions({ newMemories, wikiCandidates, rerank, topK, minScore });
  // Per-session, per-memo dedup: emit only memos not yet suggested this session
  // (capped at SESSION_CAP). Robust to the newest-N slice churn under bulk-touched
  // mtimes. Disabled (PRISM_MEM_TO_WIKI_DEDUP=0) or no session_id → emit all.
  let toEmit = suggestions;
  if (process.env.PRISM_MEM_TO_WIKI_DEDUP !== "0" && sessionId) {
    const seen = loadSeen();
    const { toEmit: fresh, newSeen } = filterUnseenSuggestions(suggestions, seen[sessionId]);
    if (fresh.length === 0) process.exit(0); // nothing new this session → silent
    toEmit = fresh;
    seen[sessionId] = newSeen;
    const keys = Object.keys(seen);
    if (keys.length > 60) for (const k of keys.slice(0, keys.length - 50)) delete seen[k];
    saveSeen(seen);
  }
  const advisory = formatAdvisory(toEmit);
  if (advisory) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: advisory } }));
  }
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("stop-memory-to-wiki-suggest.mjs")) {
  main().catch(() => process.exit(0));
}
