#!/usr/bin/env node
/**
 * generate-extracted-pdf-tips-features.mjs — system-viz augmentation: extracted-pdf tribal-tips roost.
 *
 * Pattern: same as generate-cadcam-training-corpus-features.mjs (india iter25).
 *
 * Walks `state/shared/extracted-pdfs/*.jsonl` (each line = a tribal tip with
 * source.book + topic + bridge_engines + audience). Emits:
 *   - one parent roost `ghost.extracted_pdf_tips` (L8 ghost-roost, parent ghost.planned_features)
 *   - one book pivot per distinct source.book (L9 ghost-roost)
 *   - one tip leaf per jsonl line (L10 kind="tribal-tip", parented to its book pivot)
 *
 * Output `state/shared/system-viz/extracted-pdf-tips-augmentation.json` is folded
 * into system-graph.json by scripts/merge-augmentations.mjs. Idempotency: merge is
 * authoritative dedupe (skip ids already in graph). Re-running is byte-stable.
 *
 * Synergizes the iter27 extraction work to PSN legs #5 (Tribal) + #6 (System Viz):
 * delta/kilo/alpha/bravo find the actual extracted content via /system-viz, not
 * just via grepping the jsonl directory.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-PDF-TIPS-VIZ-ROOST
 * @slot india
 * @iter 28
 * @date 2026-05-25
 *
 * Usage:  node scripts/generate-extracted-pdf-tips-features.mjs
 * Exit:   0 ok · 1 dir missing · 2 runtime error
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.extracted_pdf_tips";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PIVOT_LAYER = "L9";
export const TIP_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 160;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const TIPS_DIR = path.join(ROOT, "state/shared/extracted-pdfs");
const CANONICAL_TIPS_DIR = path.join(ROOT, "mcp-server/data/ingestion_cache/extracted-pdfs");
const OUT_PATH = path.join(VIZ_DIR, "extracted-pdf-tips-augmentation.json");

/** Pure: parse one jsonl file into an array of tips. Bad lines are skipped silently. */
export function parseTipsJsonl(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj.id === "string" && typeof obj.tip === "string") out.push(obj);
    } catch { /* skip malformed */ }
  }
  return out;
}

/** Pure: slugify a book title for use as a node-id fragment. */
export function bookSlug(book) {
  return String(book || "unknown-book")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Pure: build {newNodes, newEdges, stats} from a flat tips[] array + ids-in-graph set. */
export function generate(tips, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];

  let roostEmitted = 0;
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Extracted PDF tips (${tips.length})`,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${tips.length} tribal tips extracted from source PDFs by india/iter27+ (real content, not pointers). See state/shared/extracted-pdfs/*.jsonl.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // Group by source.book → emit one pivot per book
  const byBook = new Map();
  for (const t of tips) {
    const bk = (t.source && t.source.book) || "Unknown Book";
    if (!byBook.has(bk)) byBook.set(bk, []);
    byBook.get(bk).push(t);
  }

  let pivotsEmitted = 0, pivotsSkipped = 0;
  let tipsEmitted = 0, tipsSkipped = 0;

  for (const [book, group] of byBook.entries()) {
    const pivotId = `${ROOST_ID}.${bookSlug(book)}`;
    if (!ids.has(pivotId)) {
      newNodes.push({
        id: pivotId,
        label: `📖 ${book} (${group.length})`.slice(0, MAX_LABEL),
        layer: PIVOT_LAYER,
        ghost: true,
        status: "ghost",
        kind: "ghost-roost",
        parent: ROOST_ID,
        info: `${group.length} tribal tips extracted from "${book}". Source: ${(group[0].source && group[0].source.pdf_path) || "?"}`.slice(0, MAX_INFO),
      });
      ids.add(pivotId);
      pivotsEmitted++;
    } else {
      pivotsSkipped++;
    }

    for (const tip of group) {
      const tipNodeId = `tribal-tip.${tip.id}`;
      if (ids.has(tipNodeId)) { tipsSkipped++; continue; }
      const audience = Array.isArray(tip.audience) ? tip.audience.join(",") : (tip.audience || "?");
      const domain = tip.domain || "general";
      const topic = tip.topic || "(no-topic)";
      newNodes.push({
        id: tipNodeId,
        label: `${tip.id} · ${topic}`.slice(0, MAX_LABEL),
        layer: TIP_LAYER,
        ghost: true,
        status: "ghost",
        kind: "tribal-tip",
        parent: pivotId,
        info: `[${domain} · →${audience}] ${String(tip.tip).slice(0, MAX_INFO)}`,
      });
      ids.add(tipNodeId);
      tipsEmitted++;
    }
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      books: byBook.size,
      pivotsEmitted, pivotsSkipped,
      totalTips: tips.length,
      tipsEmitted, tipsSkipped,
    },
  };
}

/** Read every *.jsonl under one dir and return flat tips[]. */
export function loadAllTips(dir = TIPS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const tips = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".jsonl")) continue;
    try {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      tips.push(...parseTipsJsonl(text));
    } catch { /* skip unreadable */ }
  }
  return tips;
}

/** Read every *.jsonl under BOTH the legacy TIPS_DIR and canonical CANONICAL_TIPS_DIR (ingestion-cache-root-guard compliant).
 *  Dedupe by tip.id so a tip migrated from legacy → canonical isn't counted twice. Canonical wins on collision. */
export function loadAllTipsBoth(legacy = TIPS_DIR, canonical = CANONICAL_TIPS_DIR) {
  const byId = new Map();
  for (const t of loadAllTips(legacy)) byId.set(t.id, t);
  for (const t of loadAllTips(canonical)) byId.set(t.id, t); // canonical overrides legacy
  return [...byId.values()];
}

export function main() {
  const legacyExists = fs.existsSync(TIPS_DIR);
  const canonicalExists = fs.existsSync(CANONICAL_TIPS_DIR);
  if (!legacyExists && !canonicalExists) {
    console.error(`FATAL: neither ${TIPS_DIR} nor ${CANONICAL_TIPS_DIR} exists — run an extraction pass first (e.g. india iter27)`);
    return 1;
  }
  let tips;
  try { tips = loadAllTipsBoth(TIPS_DIR, CANONICAL_TIPS_DIR); }
  catch (e) { console.error(`FATAL: tips load failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(tips, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/extracted-pdfs/*.jsonl + mcp-server/data/ingestion_cache/extracted-pdfs/*.jsonl",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  books found:          ${result.stats.books}`);
  console.log(`  pivots emitted:       ${result.stats.pivotsEmitted}  (skipped existing: ${result.stats.pivotsSkipped})`);
  console.log(`  tips total:           ${result.stats.totalTips}`);
  console.log(`  tips emitted:         ${result.stats.tipsEmitted}  (skipped existing: ${result.stats.tipsSkipped})`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
