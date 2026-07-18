#!/usr/bin/env node
// scripts/lib/galaxy-context-card.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
//
// Per-galaxy CONTEXT-CARD generator — the cheap inject unit of the federation.
// A galaxy's brain lives in mcp-server/src/engines/<g>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md (often many KB).
// Injecting / re-reading a whole MEMORY.md per prompt is the token waste this milestone eliminates.
// A context-card distills each galaxy's MEMORY.md (+ CLAUDE.md role line + PATHS.md key paths) into a
// ≤~1 KB high-signal card: galaxy + role + salience-ranked facts + key paths. The card is what gets
// injected / cache-anchored (U-GCF-CAG-CARDS) instead of the whole brain.
//
// DESIGN (mirrors scripts/lib/path-ledger.mjs for R11 consistency):
//   • pure-core + injected deps ({readImpl, listImpl, roots, now, maxBytes, topN})
//   • FAIL-SOFT — this is an OPTIMIZATION, never a correctness gate. A galaxy whose MEMORY.md is
//     missing/unreadable/garbage yields no card (skipped, surfaced in the index count) rather than throwing.
//   • DETERMINISTIC — pure text-extraction heuristic, NO Ollama dependency (the optional Ollama
//     summary-enhancer is a SEPARATE unit, U-GCF-OLLAMA-MAINT, gated on Ollama health). Cards must
//     build even when the local LLM is offline.
//
// Knob: PRISM_GCF_CARD_DISABLE=1 → buildAllCards becomes a no-op (read fns still work).

import fs from "node:fs";
import path from "node:path";
// U-GCF-SALIENCE: optional salience re-ranking + per-galaxy salience score. One-directional import
// (galaxy-salience NEVER imports back — base scorer is injected — so there is no ESM cycle).
import { makeSalienceScorer, loadAccessMap, computeGalaxySalience } from "./galaxy-salience.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

export const DEFAULT_ROOTS = Object.freeze({
  enginesDir: `${PRISM_ROOT}/mcp-server/src/engines`,
  cardsDir: `${PRISM_ROOT}/state/shared/galaxy-cards`,
});

export const DEFAULT_MAX_BYTES = 1024; // ≤~1 KB per the design — the cheap inject unit
export const DEFAULT_TOP_N = 12;       // salient facts kept per card

// ── salience heuristic (the load-bearing, deterministic core) ────────────────
// A galaxy MEMORY.md is `## `-sectioned markdown. Salience = section-header weight + per-line signals.
// Tuned against the canonical exemplar (token-optimization/MEMORY.md): the Master-brain-link recall
// commands + the Owned-milestone active-work lines are the single most reuse-valuable facts.

// Ordered header→weight rules; first match wins. Default weight = 1.
const HEADER_WEIGHTS = Object.freeze([
  { re: /master[\s-]*brain|master[\s-]*index/i, w: 5 }, // UP/DOWN recall commands = top reuse value
  { re: /owned milestone|active|in[\s_-]*progress|status|current|live session/i, w: 4 }, // active work
  { re: /standing focus|standing|^focus/i, w: 3 },
  { re: /cross[\s-]*galaxy|bridge/i, w: 2 },
  { re: /known patterns|patterns/i, w: 1 },
]);

export function headerWeight(headerText) {
  if (typeof headerText !== "string" || !headerText) return 1;
  for (const { re, w } of HEADER_WEIGHTS) if (re.test(headerText)) return w;
  return 1;
}

const ACTIVE_RE = /\b(open|in[_\s-]*progress|pending|todo|next:|queue|blocked|status:|owned|stuck)\b/i;
const DATE_RE = /\b20\d\d-\d\d-\d\d\b/;
const WIKILINK_RE = /\[\[[^\]]+\]\]/;
const PATHTOKEN_RE = /[A-Za-z0-9_./-]+\.(?:ts|mjs|js|md|json|jsonl|ps1|py)\b/;
const BULLET_RE = /^\s*(?:[-*]|\d+\.)\s+/;

// Score a single content line in the context of its section header weight. Pure.
export function scoreLine(line, hWeight = 1) {
  if (typeof line !== "string") return -Infinity;
  const t = line.trim();
  if (!t) return -Infinity;
  let s = hWeight;
  if (ACTIVE_RE.test(t)) s += 3;
  if (DATE_RE.test(t)) s += 2;
  if (PATHTOKEN_RE.test(t)) s += 1;
  if (WIKILINK_RE.test(t)) s += 1;
  if (BULLET_RE.test(t)) s += 1;
  if (t.length > 200) s -= 2;
  if (t.length > 320) s -= 4;
  return s;
}

// Byte-safe slice of a string to a UTF-8 byte budget. Never splits a multibyte char or a surrogate pair.
function clampUtf8(s, maxBytes) {
  if (maxBytes <= 0) return "";
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return s;
  let end = Math.min(s.length, maxBytes);
  while (end > 0 && Buffer.byteLength(s.slice(0, end), "utf8") > maxBytes) end--;
  // never end on a lone high surrogate (its low half is at index `end`, excluded) — would corrupt a 4-byte char
  if (end > 0) { const c = s.charCodeAt(end - 1); if (c >= 0xd800 && c <= 0xdbff) end--; }
  return s.slice(0, end);
}

// UTF-8-safe truncation to a byte budget. ALWAYS returns ≤ maxBytes bytes (the marker included). Multibyte
// + surrogate-pair safe. If maxBytes is too small to fit any content plus the marker, the marker itself is
// byte-clamped down to maxBytes (the cap is never violated). Returns { text, truncated }.
export function utf8Truncate(str, maxBytes) {
  const s = typeof str === "string" ? str : String(str ?? "");
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return { text: s, truncated: false };
  const marker = "\n…[card truncated]";
  const budget = maxBytes - Buffer.byteLength(marker, "utf8");
  if (budget <= 0) return { text: clampUtf8(marker, Math.max(0, maxBytes)), truncated: true };
  return { text: clampUtf8(s, budget).replace(/\s+$/, "") + marker, truncated: true };
}

// ── source parsing ───────────────────────────────────────────────────────────

// Split markdown into [{ header, lines[] }]. The pre-first-header preamble gets header="".
export function splitSections(md) {
  const text = String(md || "");
  if (!text.trim()) return []; // empty/whitespace doc → no sections
  const out = [];
  let cur = { header: "", lines: [] };
  for (const raw of text.split(/\r?\n/)) {
    const h = raw.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      if (cur.lines.length || cur.header) out.push(cur);
      cur = { header: h[1].trim(), lines: [] };
    } else {
      cur.lines.push(raw);
    }
  }
  if (cur.lines.length || cur.header) out.push(cur);
  return out;
}

// Derive a concise role line from a galaxy's MEMORY.md / CLAUDE.md H1 title.
// "ALPHA Galaxy Memory — Token Optimization + …" → "Token Optimization + …".
export function deriveRole(memoryMd, claudeMd, galaxy) {
  for (const src of [memoryMd, claudeMd]) {
    const m = String(src || "").match(/^#\s+(.+)$/m);
    if (m) {
      let title = m[1].trim();
      const dash = title.split(/\s[—–-]\s/); // prefer the part after an em/en/hyphen dash
      if (dash.length > 1) title = dash.slice(1).join(" — ").trim();
      title = title.replace(/\bgalaxy memory\b/i, "").replace(/\bmemory\b/i, "").replace(/\s{2,}/g, " ").trim();
      if (title) return title;
    }
  }
  return galaxy || "";
}

// Extract a few key paths from PATHS.md (lines that look like a real file/dir path). Top `n`.
export function extractKeyPaths(pathsMd, n = 4) {
  const seen = new Set();
  const out = [];
  for (const raw of String(pathsMd || "").split(/\r?\n/)) {
    const m = raw.match(/`([^`]*\/[^`]+)`/) || raw.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/);
    if (m) {
      const p = m[1].trim();
      if (p.length >= 4 && !seen.has(p)) { seen.add(p); out.push(p); if (out.length >= n) break; }
    }
  }
  return out;
}

// ── card build (pure given sources) ──────────────────────────────────────────

// sources: { memory, claude?, paths? } raw strings. Returns a structured card object.
export function extractGalaxyCard(galaxy, sources = {}, opts = {}) {
  const topN = Number.isFinite(opts.topN) ? opts.topN : DEFAULT_TOP_N;
  const role = deriveRole(sources.memory, sources.claude, galaxy);
  // U-GCF-SALIENCE: opt-in fact scorer. Defaults to scoreLine so a caller that passes NO
  // salienceScorer gets BYTE-IDENTICAL output to the shipped U-GCF-CARD behavior (and its 18 tests).
  const scorer = typeof opts.salienceScorer === "function" ? opts.salienceScorer : scoreLine;
  const scored = [];
  const seen = new Set();
  for (const { header, lines } of splitSections(sources.memory)) {
    const hw = headerWeight(header);
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === "---" || /^>+\s*$/.test(t)) continue;
      const norm = t.replace(/\s+/g, " ").toLowerCase();
      if (seen.has(norm)) continue;
      const s = scorer(line, hw);
      if (s === -Infinity) continue;
      seen.add(norm);
      scored.push({ t, s, order: scored.length });
    }
  }
  // top-N by score, then restore source order so the card reads coherently
  const facts = scored
    .slice()
    .sort((a, b) => (b.s - a.s) || (a.order - b.order))
    .slice(0, Math.max(0, topN))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.t);
  const paths = extractKeyPaths(sources.paths, opts.topPaths || 4);
  return { galaxy, role, facts, paths };
}

// Render a card object to its ≤maxBytes markdown string. Returns { text, bytes, truncated, factCount }.
export function renderCard(card, opts = {}) {
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;
  const lines = [`## ${card.galaxy}${card.role ? ` — ${card.role}` : ""}`];
  for (const f of card.facts) lines.push(BULLET_RE.test(f) ? f : `- ${f}`);
  if (card.paths && card.paths.length) lines.push(`**Paths:** ${card.paths.join(" · ")}`);
  const raw = lines.join("\n");
  const { text, truncated } = utf8Truncate(raw, maxBytes);
  return { text, bytes: Buffer.byteLength(text, "utf8"), truncated, factCount: card.facts.length };
}

// ── orchestration (injected fs deps; fail-soft) ──────────────────────────────

function defaultListGalaxies(enginesDir, readdirImpl, existsImpl) {
  let names = [];
  try { names = readdirImpl(enginesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }
  catch { return []; }
  return names.filter((n) => { try { return existsImpl(path.join(enginesDir, n, "MEMORY.md")); } catch { return false; } }).sort();
}

// Build every galaxy's card + an aggregate index. Injected deps make it hermetically testable.
//   deps: { readImpl(file)->string|null, listImpl()->string[], writeImpl(file,data), mkdirImpl(dir),
//           readdirImpl, existsImpl, now() }
export function buildAllCards(opts = {}) {
  if (process.env.PRISM_GCF_CARD_DISABLE === "1") return { ok: false, disabled: true, cards: [], skipped: 0 };
  const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;
  const topN = Number.isFinite(opts.topN) ? opts.topN : DEFAULT_TOP_N;
  const now = typeof opts.now === "function" ? opts.now : () => Date.now();
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  const readdirImpl = opts.readdirImpl || fs.readdirSync;
  const existsImpl = opts.existsImpl || fs.existsSync;
  const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
  const mkdirImpl = opts.mkdirImpl || ((d) => { try { fs.mkdirSync(d, { recursive: true }); } catch { /* swallow */ } });
  const list = typeof opts.listImpl === "function" ? opts.listImpl : () => defaultListGalaxies(roots.enginesDir, readdirImpl, existsImpl);

  // U-GCF-SALIENCE: re-rank facts by recency+impact (per-fact) AND record a per-galaxy salience score
  // (for U-GCF-ROLLUP / cross-galaxy ordering). Default ON (the feature is the point — cards are
  // regenerable artifacts); PRISM_GCF_SALIENCE=0 (or opts.salience=false) reverts to plain scoreLine
  // AND the prior schema 1.1.0 so an old INDEX reader sees a byte-compatible shape.
  const salienceOn = opts.salience != null ? !!opts.salience : (process.env.PRISM_GCF_SALIENCE !== "0");
  // galaxy-level access off the outcome-bus (LIVE). accessPath/accessSource are optional injection
  // surfaces so a hermetic test can point at a fixture instead of the live bus (default = live bus).
  const accessInfo = salienceOn ? loadAccessMap({ readImpl, accessPath: opts.accessPath, accessSource: opts.accessSource }) : null;
  const salienceScorer = salienceOn ? makeSalienceScorer({ now, baseScorer: scoreLine }) : null;

  const galaxies = list() || [];
  mkdirImpl(roots.cardsDir);
  const index = { schemaVersion: salienceOn ? "1.2.0" : "1.1.0", generatedAt: new Date(now()).toISOString(), maxBytes, topN, salience: salienceOn, count: 0, skipped: 0, cards: [] };
  if (salienceOn && accessInfo) index.accessFactor = { populated: accessInfo.populated, rows: accessInfo.rows, withGalaxy: accessInfo.withGalaxy, source: accessInfo.source };
  const bundleParts = []; // U-GCF-CAG-CARDS: accumulate cards → one consolidated cold-anchorable bundle
  for (const g of galaxies) {
    const memory = readImpl(path.join(roots.enginesDir, g, "MEMORY.md"));
    if (memory == null || !String(memory).trim()) { index.skipped++; continue; } // fail-soft: no source → no card
    const claude = readImpl(path.join(roots.enginesDir, g, "CLAUDE.md"));
    const paths = readImpl(path.join(roots.enginesDir, g, "PATHS.md"));
    let card, rendered;
    try {
      card = extractGalaxyCard(g, { memory, claude, paths }, { topN, salienceScorer: salienceScorer || undefined });
      rendered = renderCard(card, { maxBytes });
    } catch { index.skipped++; continue; } // a single galaxy's parse error never aborts the batch
    const cardPath = path.join(roots.cardsDir, `${g}.card.md`);
    try { writeImpl(cardPath, rendered.text + "\n"); } catch { index.skipped++; continue; }
    index.count++;
    const entry = { galaxy: g, bytes: rendered.bytes, truncated: rendered.truncated, factCount: rendered.factCount, path: cardPath };
    if (salienceOn) {
      try { // salience is advisory — its failure never drops a card
        const gs = computeGalaxySalience(g, card.facts, { now, accessInfo });
        entry.salience = +gs.score.toFixed(3);
        entry.salienceFactors = gs.factorsActive;
      } catch { /* swallow — entry still ships without salience fields */ }
    }
    index.cards.push(entry);
    bundleParts.push(rendered.text);
  }
  // U-GCF-CAG-CARDS: one consolidated bundle = the cold-anchorable artifact (a single COLD_SOURCES entry
  // anchored once/session, vs N individual cold entries — keeps the cold-tier budget bounded).
  if (bundleParts.length) {
    const bundle = `# Galaxy context-cards (${bundleParts.length}) — generated ${index.generatedAt}\n`
      + `> Compact per-galaxy brains for cross-galaxy context. Regenerate: node scripts/galaxy-context-card.mjs build\n\n`
      + bundleParts.join("\n\n");
    const bundlePath = path.join(roots.cardsDir, "ALL-CARDS.md");
    try { writeImpl(bundlePath, bundle); index.bundlePath = bundlePath; index.bundleBytes = Buffer.byteLength(bundle, "utf8"); } catch { /* swallow */ }
  }
  try { writeImpl(path.join(roots.cardsDir, "INDEX.json"), JSON.stringify(index, null, 2)); } catch { /* swallow */ }
  return { ok: true, ...index };
}

// Read a single already-built card (consumption side — used by CAG-cards / cross-galaxy inject).
export function readCard(galaxy, opts = {}) {
  const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  return readImpl(path.join(roots.cardsDir, `${galaxy}.card.md`));
}
