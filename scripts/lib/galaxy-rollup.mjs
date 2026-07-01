#!/usr/bin/env node
// scripts/lib/galaxy-rollup.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-ROLLUP (alpha, 2026-05-31).
//
// Phase B FEED-UP: galaxy cards → master fleet-context digest.
//
// U-GCF-CARD built per-galaxy ≤1 KB context-cards; U-GCF-SALIENCE attached a per-galaxy salience
// SCORE to each card in INDEX.json (cards[].salience, schema 1.2.0). This unit rolls those 34 cards
// UP into ONE compact, salience-RANKED master digest so the master brain can inject a single ranked
// roll-up (galaxy + score + its single top domain "delta") instead of re-reading 34 multi-KB brains —
// the feed-up half of the hub-and-spoke federation.
//
// DESIGN (mirrors xgalaxy-inject.mjs + galaxy-context-card.mjs for R11 consistency):
//   • pure-core renderers + injected fs deps + fail-soft — an OPTIMIZATION, never a correctness gate.
//   • REUSE, don't re-derive (R8): salience is READ from INDEX (computed by U-GCF-SALIENCE — NOT
//     recomputed here); parseCardRole() / utf8Truncate() / DEFAULT_ROOTS reused from the sibling libs.
//   • SINGLE-WRITER-PER-FILE: rollup writes ONLY its own MASTER-DIGEST.{md,json} sidecars. It NEVER
//     writes INDEX.json — buildAllCards owns that file; a second writer would clobber the salience
//     fields (the multi-writer last-writer-wins class in CLAUDE.md's regression log).
//   • ADVISORY companion to the master MEMORY.md `[galaxy:*]` registry — it ranks the galaxies by
//     current activity; it does NOT rewrite that peer-locked, hand-curated file.
//
// Knob: PRISM_GCF_ROLLUP_DISABLE=1 → rollup() is a no-op (read/render fns still work).

import fs from "node:fs";
import { DEFAULT_ROOTS, utf8Truncate } from "./galaxy-context-card.mjs";
import { parseCardRole } from "./xgalaxy-inject.mjs";

export const DEFAULT_INDEX_PATH = `${DEFAULT_ROOTS.cardsDir}/INDEX.json`;
export const DEFAULT_DIGEST_PATH = `${DEFAULT_ROOTS.cardsDir}/MASTER-DIGEST.md`;
export const DEFAULT_DIGEST_JSON_PATH = `${DEFAULT_ROOTS.cardsDir}/MASTER-DIGEST.json`;
export const DEFAULT_MAX_BYTES = 8192; // a compact roll-up (~34 one-line rows), NOT the 35 KB ALL-CARDS bundle
export const FACT_DISPLAY_MAX = 120;   // per-row top-delta display cap (chars) — keeps the digest bounded

// A card opens with `## galaxy — role`, then the 4-axis master-brain-link BOILERPLATE bullets
// (UP/DOWN/MASTER-INDEX/Last master-sync + an optional `> ` exemplar blockquote), then the real
// domain facts. We must skip the boilerplate to surface a galaxy's genuine top DELTA. The two link
// wordings in the wild ("UP (pull):" from backfill-galaxy-master-brain-link.mjs and
// "UP (pull from master):" hand-written) both start with "UP (pull" — match the common prefix.
const BOILERPLATE_AFTER_MARKER =
  /^(?:>|\*\*UP \(pull|\*\*DOWN \(push|\*\*MASTER-INDEX edge|\*\*Last master-sync|\*\*Paths:)/i;
const LEADING_MARKER = /^\s*(?:[-*]|\d+\.)\s+/; // a bullet ("- ", "* ") or ordered ("1. ") list marker
// The 4-axis master-brain-link block is template-ordered UP → DOWN → MASTER-INDEX → Last-master-sync,
// so "Last master-sync" reliably TERMINATES the block — even when the UP/DOWN bullets wrap onto
// continuation lines (e.g. "- — recall: …", "- `C:/…/` → fed to …") that a per-line prefix match misses.
const MASTER_SYNC_RE = /\*\*Last master-sync/i;
const TRUNC_MARKER_RE = /\[card truncated\]/i;       // the utf8Truncate marker is not a fact
const CONTINUATION_RE = /^(?:—|–|recall:|→)/i;        // a wrapped-bullet FRAGMENT, never a standalone delta

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure extraction ────────────────────────────────────────────────────────────

// Extract a galaxy's top NON-boilerplate DOMAIN fact from its rendered card text. Pure. null when the
// card holds only its header + master-brain-link block (honest — a galaxy whose verbose link block ate
// the whole 1 KB budget has no delta yet; that is itself a U-GCF-COMPACT signal, not an error).
// PRIMARY: scan for the first real fact AFTER the "Last master-sync" line that ends the link block.
// FALLBACK (block absent / card truncated before it): first line that is neither labeled boilerplate
// nor a wrapped continuation fragment nor the truncation marker.
export function extractTopFact(cardText) {
  const lines = String(cardText || "").split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) { if (/^##\s+/.test(lines[i].trim())) { headerIdx = i; break; } }
  if (headerIdx === -1) return null;
  const body = lines.slice(headerIdx + 1);
  let syncIdx = -1;
  for (let i = 0; i < body.length; i++) { if (MASTER_SYNC_RE.test(body[i])) { syncIdx = i; break; } }
  for (let i = syncIdx >= 0 ? syncIdx + 1 : 0; i < body.length; i++) {
    const t = body[i].trim();
    if (!t || TRUNC_MARKER_RE.test(t)) continue;
    const stripped = t.replace(LEADING_MARKER, "").trim();
    if (!stripped) continue;
    if (BOILERPLATE_AFTER_MARKER.test(stripped)) continue; // labeled link/Paths line (defense if non-contiguous)
    if (CONTINUATION_RE.test(stripped)) continue;          // wrapped-bullet fragment (— recall:, → fed to …)
    return stripped;
  }
  return null;
}

// Collapse a fact to a single compact display line: drop newlines, escape table pipes, cap length. Pure.
export function compactFact(fact, maxLen = FACT_DISPLAY_MAX) {
  if (typeof fact !== "string" || !fact.trim()) return "";
  let s = fact.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|"); // `|` would break the markdown table
  if (s.length > maxLen) s = s.slice(0, Math.max(0, maxLen - 1)).replace(/\s+\S*$/, "").trim() + "…";
  return s;
}

// Rank INDEX cards by per-galaxy salience (desc), tie-break by galaxy name. Pure, fail-soft on non-array.
// Cards missing a finite salience sort LAST (treated as -Infinity) but are KEPT — the digest is complete.
export function rankGalaxies(cards) {
  const arr = Array.isArray(cards) ? cards.filter((c) => c && typeof c.galaxy === "string") : [];
  return arr.slice().sort((a, b) => {
    const sa = Number.isFinite(a.salience) ? a.salience : -Infinity;
    const sb = Number.isFinite(b.salience) ? b.salience : -Infinity;
    return (sb - sa) || a.galaxy.localeCompare(b.galaxy);
  });
}

// ── I/O (injected dep; fail-soft) ───────────────────────────────────────────────

// Load & shallow-validate INDEX.json. Fail-soft: unreadable / garbage / non-object → { cards: [] }.
export function loadIndex(opts = {}) {
  const readImpl = opts.readImpl || defaultRead;
  try {
    const raw = readImpl(opts.indexPath || DEFAULT_INDEX_PATH);
    if (raw == null) return { cards: [] };
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return { cards: [] };
    if (!Array.isArray(j.cards)) j.cards = [];
    return j;
  } catch { return { cards: [] }; }
}

// ── digest model (pure given index + readImpl) ──────────────────────────────────

// Build the ranked digest model from a loaded INDEX. For each galaxy, read its card (via injected
// readImpl) to pull the top delta + role. A galaxy with no readable card still appears (delta=null).
export function buildDigestModel(opts = {}) {
  const index = opts.index || { cards: [] };
  const readImpl = opts.readImpl || defaultRead;
  const ranked = rankGalaxies(index.cards);
  const rows = ranked.map((c, i) => {
    let topFact = null;
    let role = "";
    if (typeof c.path === "string" && c.path) {
      const txt = readImpl(c.path);
      if (txt != null) { topFact = extractTopFact(txt); role = parseCardRole(txt); }
    }
    const factors =
      c.salienceFactors && typeof c.salienceFactors === "object"
        ? Object.keys(c.salienceFactors).filter((k) => c.salienceFactors[k])
        : [];
    return {
      rank: i + 1,
      galaxy: c.galaxy,
      salience: Number.isFinite(c.salience) ? c.salience : null,
      factors,
      role,
      topFact,
    };
  });
  return {
    galaxyCount: rows.length,
    salienceSchema: (index && index.schemaVersion) || null,
    generatedFromIndexAt: (index && index.generatedAt) || null,
    accessFactor: (index && index.accessFactor) || null,
    ranked: rows,
  };
}

// ── markdown render (pure, byte-capped) ─────────────────────────────────────────

// Render the model to a ≤maxBytes markdown digest. Returns { text, bytes, truncated, galaxyCount }.
export function renderDigest(model, opts = {}) {
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;
  const generatedAt = opts.generatedAt || new Date().toISOString();
  const rows = (model && Array.isArray(model.ranked)) ? model.ranked : [];
  const schema = (model && model.salienceSchema) || "n/a";
  const head = [
    "# 🌌 PRISM Master Fleet-Context Digest",
    "",
    `> Salience-ranked roll-up of ${rows.length} per-galaxy context-cards (GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-ROLLUP).`,
    "> **Feed-up artifact:** inject THIS one ranked digest instead of re-reading 34 galaxy brains.",
    "> Salience-ranked companion to the master `MEMORY.md` `[galaxy:*]` registry (advisory — does NOT rewrite it; the registry's descriptions are hand-curated).",
    `> Source salience: INDEX.json schema ${schema}. Regenerate: \`node scripts/galaxy-rollup.mjs build\` (after \`galaxy-context-card build\`).`,
    `> Generated ${generatedAt}. Disable: PRISM_GCF_ROLLUP_DISABLE=1.`,
    "",
    "| # | galaxy | salience | factors | top delta |",
    "|--:|--------|---------:|---------|-----------|",
  ];
  const body = rows.map((r) => {
    const sal = r.salience == null ? "—" : r.salience.toFixed(2);
    const fac = r.factors && r.factors.length ? r.factors.join("·") : "—";
    const delta = r.topFact ? compactFact(r.topFact) : "_(no delta)_";
    const name = r.role ? `${r.galaxy} — ${compactFact(r.role, 48)}` : r.galaxy;
    return `| ${r.rank} | ${name.replace(/\|/g, "\\|")} | ${sal} | ${fac} | ${delta} |`;
  });
  const raw = head.concat(body).join("\n");
  const { text, truncated } = utf8Truncate(raw, maxBytes);
  return { text, bytes: Buffer.byteLength(text, "utf8"), truncated, galaxyCount: rows.length };
}

// ── orchestrator (the CLI / hook entry point) — FAIL-SOFT, NEVER throws ─────────

// reasons: disabled · no-cards · written · write-error · error
export function rollup(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_ROLLUP_DISABLE === "1") {
      return { ok: false, disabled: true, written: false, reason: "disabled", galaxyCount: 0 };
    }
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const indexPath = opts.indexPath || `${roots.cardsDir}/INDEX.json`;
    const digestPath = opts.digestPath || `${roots.cardsDir}/MASTER-DIGEST.md`;
    const jsonPath = opts.digestJsonPath || `${roots.cardsDir}/MASTER-DIGEST.json`;
    const readImpl = opts.readImpl || defaultRead;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;

    const index = loadIndex({ indexPath, readImpl });
    if (!index.cards || !index.cards.length) {
      return { ok: true, written: false, reason: "no-cards", galaxyCount: 0 };
    }
    const model = buildDigestModel({ index, readImpl });
    const generatedAt = new Date(now()).toISOString();
    const md = renderDigest(model, { maxBytes, generatedAt });
    const json = {
      schemaVersion: "1.0.0",
      generatedAt,
      galaxyCount: model.galaxyCount,
      bytes: md.bytes,
      truncated: md.truncated,
      salienceSchema: model.salienceSchema,
      accessFactor: model.accessFactor,
      ranked: model.ranked,
    };
    try {
      writeImpl(digestPath, md.text + "\n");
      writeImpl(jsonPath, JSON.stringify(json, null, 2));
    } catch (e) {
      return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e), galaxyCount: model.galaxyCount };
    }
    return {
      ok: true,
      written: true,
      reason: "written",
      galaxyCount: model.galaxyCount,
      bytes: md.bytes,
      truncated: md.truncated,
      digestPath,
      jsonPath,
      top: model.ranked.slice(0, 5).map((r) => ({ galaxy: r.galaxy, salience: r.salience })),
    };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e), galaxyCount: 0 };
  }
}
