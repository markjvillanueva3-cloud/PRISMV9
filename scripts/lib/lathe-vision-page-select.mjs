#!/usr/bin/env node
/**
 * lathe-vision-page-select.mjs -- slot:whiskey [KIENZLE G3: tribal vision yield]
 * ==========================================================================
 * Pure page-index selector for the lathe tribal vision ingest. The original
 * rasterizer rendered the FIRST `budget` pages of a PDF -- fine for a 4-page
 * Siemens cycle doc, but for a 200-400 page turning-tool VENDOR CATALOG the
 * first 4 pages are cover + TOC + intro -> ~0 turning-insert tips (the
 * insert-selection / grade / feed-speed tables live deep in the body).
 *
 * `selectVisionPages(totalPages, budget)` spreads the page budget EVENLY across
 * the whole document (inclusive of first + last page) so a fixed vision-page
 * budget samples the body, not just the cover. Operator directive 2026-06-28:
 * "max out lathe tribal ... vendor catalogs which always have tips on inserts
 * for materials and tool paths" -- those tips are in the body.
 *
 * Pure (no FS / no subprocess) so it is deterministically unit-testable; the
 * ingest supplies the real page count (cheap fitz open) + does the rasterizing.
 */

/**
 * Evenly-distributed 0-based page indices to rasterize.
 * @param {number} totalPages  the PDF's real page count (from fitz).
 * @param {number} budget      how many pages to sample (the --vision-pages knob).
 * @returns {number[]} ascending unique indices in [0, totalPages-1].
 *   - total<=0 or budget<=0      -> []
 *   - total<=budget              -> every page [0..total-1]
 *   - budget===1                 -> [middle page] (a catalog's cover is the worst single sample)
 *   - else                       -> `budget` indices evenly spread incl. first + last
 */
export function selectVisionPages(totalPages, budget) {
  const total = Number.isInteger(totalPages) ? totalPages : Math.floor(Number(totalPages));
  const b = Number.isInteger(budget) ? budget : Math.floor(Number(budget));
  if (!(total > 0) || !(b > 0)) return [];
  if (total <= b) return Array.from({ length: total }, (_, i) => i);
  if (b === 1) return [Math.floor((total - 1) / 2)];
  const out = [];
  for (let k = 0; k < b; k++) out.push(Math.round((k * (total - 1)) / (b - 1)));
  // total>budget makes rounding collisions impossible, but dedupe defensively + keep ascending.
  return [...new Set(out)].sort((x, y) => x - y);
}
