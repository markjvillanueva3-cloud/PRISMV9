#!/usr/bin/env node
// scripts/lib/galaxy-xdedup.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XDEDUP (alpha, 2026-05-31).
//
// Phase D OBSIDIAN TOKEN SAVINGS: cross-galaxy memory dedup.
//
// The same fact distilled into N galaxy cards wastes BOTH recall and inject tokens — every prompt that
// cold-anchors the card bundle pays for the duplicate N times. This unit detects near-duplicate DOMAIN facts
// that appear across ≥2 galaxy cards, picks ONE canonical (the most-authoritative galaxy), and recommends the
// others replace their copy with a `[[pointer]]`. ADVISORY ONLY (R12) — it NEVER edits a peer-locked galaxy
// MEMORY.md; it emits a DEDUP-REPORT.json an operator/golf acts on.
//
// SCOPE: scans the ≤1 KB CARD facts (what actually gets injected — the inject-token waste this milestone
// fights), NOT the full multi-KB MEMORY.md files (a deeper future scan). The master-brain-link BOILERPLATE
// block (UP/DOWN/MASTER-INDEX/Last-master-sync) is duplicated across ALL 34 cards by design — it is EXCLUDED
// (structural, not content duplication) so the report surfaces genuine cross-galaxy knowledge copies only.
//
// DESIGN (mirrors galaxy-knows-map.mjs / galaxy-push.mjs for R11): pure-core (extract/jaccard/cluster) +
// injected fs deps + fail-soft. REUSE (R8): tokenize (master-index-search-lib), loadCardsFromIndex
// (xgalaxy-inject), the same post-"Last master-sync" boilerplate skip as galaxy-rollup.extractTopFact.
// SINGLE-WRITER-PER-FILE: writes ONLY its own DEDUP-REPORT.json.
//
// Knobs: PRISM_GCF_XDEDUP_DISABLE=1 (no-op) · PRISM_GCF_XDEDUP_JACCARD=F (similarity threshold, default 0.6).

import fs from "node:fs";
import { tokenize } from "./master-index-search-lib.mjs";
import { DEFAULT_ROOTS } from "./galaxy-context-card.mjs";
import { loadCardsFromIndex } from "./xgalaxy-inject.mjs";

export const DEFAULT_JACCARD = 0.65;       // token-set overlap to call two facts near-duplicate. 0.65 (not
                                           // 0.60) drops boundary PARAPHRASES that single-link chaining would
                                           // otherwise ride into a cluster — genuine template copies cluster at ~1.0.
export const DEFAULT_REPORT_PATH = `${DEFAULT_ROOTS.cardsDir}/DEDUP-REPORT.json`;
export const DEFAULT_INDEX_PATH = `${DEFAULT_ROOTS.cardsDir}/INDEX.json`;
export const MIN_FACT_TOKENS = 4;          // ignore trivially short facts (no dedup signal)
export const POINTER_TOKENS = 6;           // a `[[pointer]]` line ≈ this many tokens (savings model)
const MASTER_SYNC_RE = /\*\*Last master-sync/i;
const TRUNC_MARKER_RE = /\[card truncated\]/i;
const BOILERPLATE_AFTER_MARKER = /^(?:>|\*\*UP \(pull|\*\*DOWN \(push|\*\*MASTER-INDEX edge|\*\*Last master-sync|\*\*Paths:)/i;
const CONTINUATION_RE = /^(?:—|–|recall:|→)/i;
// Cross-galaxy DOCTRINE-SCAFFOLD lines stamped identically into many brains by the DOMAIN-GALAXY-DOCTRINE
// migration + galaxy-buildout (Parent doctrine / Companion sibling indexes / Migration unit / Soul assignment /
// buildout provenance). STRUCTURAL duplication, NOT genuine domain knowledge — same class as the master-brain-link
// block; excluded so DEDUP-REPORT surfaces real cross-galaxy facts only (U-GCF-XDEDUP-SCAFFOLD, alpha 2026-06-01).
const DOCTRINE_SCAFFOLD = /^(?:Parent doctrine\b|Companion sibling index|Migration(?: unit)?\s*:|Soul assignment\s*:|this buildout record\b)/i;
const LEADING_MARKER = /^\s*(?:[-*]|\d+\.)\s+/;

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure extraction / similarity / clustering ────────────────────────────────────

// All NON-boilerplate domain fact lines from a card. Pure. Mirrors galaxy-rollup.extractTopFact's skip logic
// (block ends at "Last master-sync"; skip truncation marker + wrapped continuations) but returns ALL facts.
export function cardDomainFacts(cardText) {
  const lines = String(cardText || "").split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) { if (/^##\s+/.test(lines[i].trim())) { headerIdx = i; break; } }
  if (headerIdx === -1) return [];
  const body = lines.slice(headerIdx + 1);
  let syncIdx = -1;
  for (let i = 0; i < body.length; i++) { if (MASTER_SYNC_RE.test(body[i])) { syncIdx = i; break; } }
  const out = [];
  for (let i = syncIdx >= 0 ? syncIdx + 1 : 0; i < body.length; i++) {
    const t = body[i].trim();
    if (!t || TRUNC_MARKER_RE.test(t)) continue;
    const stripped = t.replace(LEADING_MARKER, "").trim();
    if (!stripped || BOILERPLATE_AFTER_MARKER.test(stripped) || CONTINUATION_RE.test(stripped) || DOCTRINE_SCAFFOLD.test(stripped)) continue;
    out.push(stripped);
  }
  return out;
}

// All substantial NON-boilerplate fact lines from a full galaxy MEMORY.md. Pure. This is the REAL dedup
// target (the spec's "same fact stored in N galaxy memories") — the full brains, not the ≤1 KB cards.
// Skips: section headers, the entire "## Master-brain link" section, the link/continuation boilerplate, and
// lines below MIN_FACT_TOKENS. Bounded to maxPerDoc lines so a 90 KB brain can't blow up the clustering.
export function memoryFactLines(memoryText, opts = {}) {
  const maxPerDoc = Number.isFinite(opts.maxPerDoc) ? opts.maxPerDoc : 120;
  const lines = String(memoryText || "").split(/\r?\n/);
  const out = [];
  let inMasterBrain = false;
  let inFence = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (/^```/.test(t)) { inFence = !inFence; continue; }                                  // toggle code-fence
    if (inFence) continue;                         // code-block bullets are NOT domain facts
    if (/^#{1,6}\s/.test(t)) { inMasterBrain = /master[\s-]*brain/i.test(t); continue; } // (re)enter/leave sections
    if (inMasterBrain) continue;                  // skip the per-galaxy master-brain-link section wholesale
    if (!LEADING_MARKER.test(raw)) continue;       // only bullet / numbered fact lines
    const stripped = t.replace(LEADING_MARKER, "").trim();
    if (!stripped || BOILERPLATE_AFTER_MARKER.test(stripped) || CONTINUATION_RE.test(stripped) || DOCTRINE_SCAFFOLD.test(stripped)) continue;
    if (tokenize(stripped, { maxLen: 2000, maxTokens: 64 }).length < MIN_FACT_TOKENS) continue;
    out.push(stripped);
    if (out.length >= maxPerDoc) break;
  }
  return out;
}

// Jaccard similarity of two token SETS (arrays). Pure. |A∩B| / |A∪B| ∈ [0,1]; empty/empty → 0.
export function jaccard(aTokens, bTokens) {
  const a = aTokens instanceof Set ? aTokens : new Set(aTokens || []);
  const b = bTokens instanceof Set ? bTokens : new Set(bTokens || []);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Cluster near-duplicate facts ACROSS galaxies. Pure given `facts` ([{galaxy, fact}]).
//   Greedy single-link: a fact joins the first cluster whose representative it's ≥threshold similar to.
//   Only clusters spanning ≥2 DISTINCT galaxies are returned (intra-galaxy repeats are not cross-dup).
// Returns [{ facts:[{galaxy,fact}], galaxies:[...], repTokens:Set }] sorted by galaxy-count desc.
export function clusterDuplicates(facts, opts = {}) {
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_JACCARD;
  const items = (Array.isArray(facts) ? facts : [])
    .filter((f) => f && typeof f.galaxy === "string" && typeof f.fact === "string")
    .map((f) => ({ galaxy: f.galaxy, fact: f.fact, tokens: new Set(tokenize(f.fact, { maxLen: 2000, maxTokens: 64 })) }))
    .filter((f) => f.tokens.size >= MIN_FACT_TOKENS);
  const clusters = [];
  for (const it of items) {
    let placed = false;
    for (const c of clusters) {
      if (jaccard(it.tokens, c.repTokens) >= threshold) { c.facts.push(it); placed = true; break; }
    }
    if (!placed) clusters.push({ facts: [it], repTokens: it.tokens });
  }
  return clusters
    .map((c) => {
      const galaxies = [...new Set(c.facts.map((f) => f.galaxy))];
      return { facts: c.facts.map((f) => ({ galaxy: f.galaxy, fact: f.fact })), galaxies, repTokens: c.repTokens };
    })
    .filter((c) => c.galaxies.length >= 2)
    .sort((a, b) => (b.galaxies.length - a.galaxies.length) || b.facts.length - a.facts.length);
}

// Pick the canonical galaxy for a cluster: highest INDEX salience, tie-break alpha. Pure.
export function selectCanonical(cluster, salienceMap = {}) {
  const galaxies = (cluster && Array.isArray(cluster.galaxies)) ? cluster.galaxies : [];
  if (!galaxies.length) return null;
  return galaxies.slice().sort((a, b) => {
    const sa = Number.isFinite(salienceMap[a]) ? salienceMap[a] : -Infinity;
    const sb = Number.isFinite(salienceMap[b]) ? salienceMap[b] : -Infinity;
    return (sb - sa) || a.localeCompare(b);
  })[0];
}

// Estimate inject-tokens saved by collapsing a cluster to 1 canonical + (N-1) pointers. Pure.
export function estClusterSavings(cluster) {
  const facts = (cluster && Array.isArray(cluster.facts)) ? cluster.facts : [];
  const n = facts.length;
  if (n < 2) return 0;
  const avgFactTokens = Math.round(facts.reduce((s, f) => s + tokenize(f.fact, { maxLen: 2000, maxTokens: 64 }).length, 0) / n);
  return Math.max(0, (n - 1) * (avgFactTokens - POINTER_TOKENS)); // replace N-1 copies with short pointers
}

// ── I/O (injected deps; fail-soft) ───────────────────────────────────────────────

// Load { facts:[{galaxy,fact}], salienceMap }. source="memories" (DEFAULT — the real dedup target: full
// galaxy MEMORY.md brains) or "cards" (the ≤1 KB inject surface — narrower, lower-yield). Fail-soft → empties.
export function loadGalaxyFacts(opts = {}) {
  const source = opts.source || "memories";
  const readImpl = opts.readImpl || defaultRead;
  const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
  const facts = [];
  if (source === "cards") {
    const cards = Array.isArray(opts.cards) ? opts.cards : loadCardsFromIndex({ indexPath: opts.indexPath, readImpl });
    for (const c of cards) {
      if (!c || typeof c.galaxy !== "string" || typeof c.text !== "string") continue;
      for (const fact of cardDomainFacts(c.text)) facts.push({ galaxy: c.galaxy, fact });
    }
  } else {
    // memories (default): scan every engines/<g>/MEMORY.md — the full brains where real cross-dup lives.
    const readdirImpl = opts.readdirImpl || ((d) => fs.readdirSync(d, { withFileTypes: true }));
    let names = [];
    try { names = readdirImpl(roots.enginesDir).filter((d) => d.isDirectory()).map((d) => d.name); } catch { names = []; }
    for (const g of names) {
      const mem = readImpl(`${roots.enginesDir}/${g}/MEMORY.md`);
      if (mem == null) continue;
      for (const fact of memoryFactLines(mem, opts)) facts.push({ galaxy: g, fact });
    }
  }
  const salienceMap = {};
  try {
    const raw = readImpl(opts.indexPath || DEFAULT_INDEX_PATH);
    if (raw != null) { const j = JSON.parse(raw); for (const e of (j && Array.isArray(j.cards) ? j.cards : [])) if (e && typeof e.galaxy === "string" && Number.isFinite(e.salience)) salienceMap[e.galaxy] = e.salience; }
  } catch { /* size-only / no salience */ }
  return { facts, salienceMap };
}

// ── orchestrator (injected deps; fail-soft; NEVER throws) ───────────────────────
// reasons: disabled · no-facts · written · write-error · error
export function xdedup(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_XDEDUP_DISABLE === "1") return { ok: false, disabled: true, written: false, reason: "disabled", clusterCount: 0 };
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const reportPath = opts.reportPath || `${roots.cardsDir}/DEDUP-REPORT.json`;
    const readImpl = opts.readImpl || defaultRead;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    let threshold = DEFAULT_JACCARD;
    if (Number.isFinite(opts.threshold)) threshold = opts.threshold;
    else if (process.env.PRISM_GCF_XDEDUP_JACCARD) { const p = parseFloat(process.env.PRISM_GCF_XDEDUP_JACCARD); if (Number.isFinite(p)) threshold = p; } // separate validity from a falsy 0

    const { facts, salienceMap } = opts.facts ? { facts: opts.facts, salienceMap: opts.salienceMap || {} } : loadGalaxyFacts({ readImpl, indexPath: opts.indexPath });
    if (!facts.length) return { ok: true, written: false, reason: "no-facts", clusterCount: 0 };
    const clusters = clusterDuplicates(facts, { threshold }).map((c) => {
      const canonical = selectCanonical(c, salienceMap);
      const savings = estClusterSavings(c);
      return {
        galaxies: c.galaxies,
        canonical,
        fact: c.facts.find((f) => f.galaxy === canonical)?.fact || c.facts[0].fact,
        duplicateGalaxies: c.galaxies.filter((g) => g !== canonical),
        estTokensSaved: savings,
        members: c.facts,
      };
    });
    const totalEstSaved = clusters.reduce((s, c) => s + c.estTokensSaved, 0);
    const json = {
      schemaVersion: "1.0.0",
      generatedAt: new Date(now()).toISOString(),
      note: "ADVISORY. Cluster members are NEAR-duplicate (Jaccard ≥ threshold), not guaranteed identical — VERIFY each member before collapsing it to a [[pointer]]; a paraphrase may carry distinct info. Never auto-edits a MEMORY.md.",
      jaccardThreshold: threshold,
      factCount: facts.length,
      clusterCount: clusters.length,
      totalEstTokensSaved: totalEstSaved,
      clusters,
    };
    try { writeImpl(reportPath, JSON.stringify(json, null, 2)); }
    catch (e) { return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e), clusterCount: clusters.length }; }
    return { ok: true, written: true, reason: "written", clusterCount: clusters.length, factCount: facts.length, totalEstTokensSaved: totalEstSaved, reportPath, top: clusters.slice(0, 5).map((c) => ({ canonical: c.canonical, galaxies: c.galaxies.length, saved: c.estTokensSaved })) };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e), clusterCount: 0 };
  }
}
