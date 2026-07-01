#!/usr/bin/env node
// enumerate-brand-tool-misparse.mjs -- exhaustive enumeration + classification of the brand-catalog
// geometry mis-parses surfaced by the Fusion tool-library assessment (2026-06-20, slot:romeo).
//
// WHY: "ALL MEANS ALL" -- a full assessment enumerates the COMPLETE flagged population, not a count.
// This loads the canonical brand corpus (where shank IS present) and classifies every rotating-cutter
// record whose geometry is physically impossible, so a cleanup pass is data-ready:
//   bad-diameter : end-mill-type Dc > ENDMILL_DIA_PLAUSIBLE_MAX_MM (80mm) -- a solid/indexable end
//                  mill cannot be that big, so cutting_diameter_mm is the parse artifact
//                  (e.g. ISCAR M ECS-A1.00X06-2T Dc 102.67 on a 5.99mm connection). Checked first.
//   bad-shank    : Dc plausible (<=80mm) but shank present and Dc/shank > SHANK_RATIO_MAX (8) -> the
//                  shank is the artifact, the diameter is usable (e.g. ACCU-0.3750 Dc 9.5mm / shank 0.8mm).
//
// Real large DRILLS (Allied ~100mm) and FACE/SHELL mills are NOT flagged (separate category/ceiling).
//
// Usage: node scripts/enumerate-brand-tool-misparse.mjs [--out <prefix>]   (writes <prefix>.json + .csv)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrandCatalog, isEndmillOversizeDia, SHANK_RATIO_MAX } from './lib/brand-tool-catalog.mjs';

/**
 * Classify which geometry field is the artifact, using the SAME gate the cleanup applies
 * (isEndmillOversizeDia + SHANK_RATIO_MAX from brand-tool-catalog.mjs) so this advisory list matches
 * EXACTLY what the normalizer drops/nulls -- no threshold drift:
 *   bad-diameter : end-mill-type tool with Dc > 80mm (face/shell mills spared) -> diameter artifact.
 *   bad-shank    : plausible Dc but shank present and Dc/shank > SHANK_RATIO_MAX -> shank artifact.
 *   null         : geometry is physically consistent (not flagged).
 */
export function classifyRecord(rec) {
  const dc = rec.diameter_mm;
  const sh = rec.shank_mm;
  if (!(dc > 0)) return null;
  if (isEndmillOversizeDia(rec.category, rec.type, dc)) return 'bad-diameter';
  if (sh > 0 && dc / sh > SHANK_RATIO_MAX) return 'bad-shank';
  return null;
}

export function enumerateMisparses(records) {
  const flagged = [];
  for (const r of records) {
    if (!(r.diameter_mm > 0)) continue;
    const klass = classifyRecord(r);
    if (!klass) continue;
    flagged.push({
      brand: r.brand,
      id: r.id,
      category: r.category,
      type: r.type,
      dc_mm: +(+r.diameter_mm).toFixed(3),
      shank_mm: r.shank_mm > 0 ? +(+r.shank_mm).toFixed(3) : null,
      ratio: r.shank_mm > 0 ? +(r.diameter_mm / r.shank_mm).toFixed(1) : null,
      classification: klass,
    });
  }
  // summaries
  const byBrand = {};
  const byClass = { 'bad-diameter': 0, 'bad-shank': 0 };
  for (const f of flagged) {
    byBrand[f.brand] = (byBrand[f.brand] || 0) + 1;
    byClass[f.classification]++;
  }
  return { total: flagged.length, byClass, byBrand, flagged };
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const prefix = outIdx >= 0 && args[outIdx + 1]
    ? args[outIdx + 1]
    : 'state/shared/jm-fusion-tools/BRAND-TOOL-MISPARSE';
  const { records } = loadBrandCatalog();
  const r = enumerateMisparses(records);
  fs.writeFileSync(`${prefix}.json`, JSON.stringify({ generated: 'see git', summary: { total: r.total, byClass: r.byClass, byBrand: r.byBrand }, flagged: r.flagged }, null, 2));
  const csvRows = ['brand,id,category,type,dc_mm,shank_mm,ratio,classification'];
  for (const f of r.flagged) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    csvRows.push([esc(f.brand), esc(f.id), esc(f.category), esc(f.type), f.dc_mm, f.shank_mm ?? '', f.ratio ?? '', f.classification].join(','));
  }
  fs.writeFileSync(`${prefix}.csv`, csvRows.join('\n'));
  const sortedBrands = Object.entries(r.byBrand).sort((a, b) => b[1] - a[1]);
  console.log(`Total flagged: ${r.total}`);
  console.log(`By class: bad-diameter=${r.byClass['bad-diameter']} bad-shank=${r.byClass['bad-shank']}`);
  console.log('Top brands:', sortedBrands.slice(0, 8).map(([b, n]) => `${b}:${n}`).join(' '));
  console.log(`Wrote ${prefix}.json + ${prefix}.csv`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
