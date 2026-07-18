// scripts/lib/region-glue-lib.mjs
//
// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no fs/fetch/subprocess); the
// glue script does the render/curl/crop/extract I/O and calls these to prepare + recombine.
//
// THE LOAD-BEARING CONTRACT (P1.5 design, data-loss-safe): region routing can only ADD recall
// on top of the proven full-page OCR floor -- never replace it with a box-cropped subset. So the
// glue ALWAYS runs a full-page pass and UNIONs it with the per-region passes. The merge here is
// built so that union is correct: a whole-page "full_page" overlap tile lets mergeTiledDimensions
// collapse a full-page-floor dim with the region dim it corroborates (no double-count), while the
// merge's non-transitive clique guard keeps two distinct same-valued features (different corners,
// non-overlapping regions) separate. Net: every dim the full-page pass finds is kept; every extra
// dim a region pass recovers is added; identical dims are de-duped.
//
// THE CRITICAL SEAM (scrutiny P2.2): region-classifier-lib emits NORMALIZED FRACTIONAL bboxes
// [x,y,w,h] in [0,1] (resolution-independent). crop-image-tiles.py needs INTEGER PIXEL rects.
// scaleBboxToPixels does that conversion -- a missed scaling would crop a ~1px box (silent recall
// loss), so a degenerate (<1px) result returns null and the caller falls that region back to the
// full-page floor.

import { mergeTiledDimensions } from "./vision-tiling-lib.mjs";
import { NON_DIM_KEY_FNS } from "./vision-ensemble-fuse.mjs";

// The pseudo-tile id for the full-page floor pass. It MUST differ from any region id (region
// ids are r0/r1/... from region-classifier-lib) so the merge treats it as a distinct source.
export const FULL_PAGE_TILE_ID = "full_page";

/**
 * Convert a normalized fractional bbox [x,y,w,h] in [0,1] to an INTEGER PIXEL rect {x,y,w,h}
 * clamped inside the page. Returns null when the bbox is invalid, the page dims are invalid, or
 * the scaled crop would be sub-pixel in either dimension (a degenerate crop = silent recall loss;
 * the caller covers that region with the full-page floor instead).
 *
 * @param {number[]} bbox  fractional [x,y,w,h]
 * @param {number} pageW   page width in pixels
 * @param {number} pageH   page height in pixels
 * @returns {{x:number,y:number,w:number,h:number}|null}
 */
export function scaleBboxToPixels(bbox, pageW, pageH) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const [fx, fy, fw, fh] = bbox.map(Number);
  if (![fx, fy, fw, fh].every((n) => Number.isFinite(n))) return null;
  if (!Number.isFinite(pageW) || !Number.isFinite(pageH) || pageW <= 0 || pageH <= 0) return null;
  let x = Math.round(fx * pageW);
  let y = Math.round(fy * pageH);
  let w = Math.round(fw * pageW);
  let h = Math.round(fh * pageH);
  // clamp the origin inside the page, then clamp the size so the box stays in bounds
  x = Math.max(0, Math.min(x, pageW - 1));
  y = Math.max(0, Math.min(y, pageH - 1));
  w = Math.min(w, pageW - x);
  h = Math.min(h, pageH - y);
  if (w < 1 || h < 1) return null;
  return { x, y, w, h };
}

/**
 * Build the PIXEL crop specs for crop-image-tiles.py from the routed regions. Only a region with
 * a usable bbox AND a non-"skip" extractor gets a crop -- a skip/no-bbox/degenerate region is left
 * to the full-page floor (no data loss). Each spec is {id,x,y,w,h} (the shape crop-image-tiles.py
 * consumes) plus the region's extractor + kind so the glue can route the per-crop extraction.
 *
 * @param {Array<{id?:string, bbox:(number[]|null), extractor:string, region_kind?:string}>} routed
 *   the `routed` array from region-classifier-lib decideRegionRouting
 * @param {number} pageW
 * @param {number} pageH
 * @returns {Array<{id:string,x:number,y:number,w:number,h:number,extractor:string,region_kind:string}>}
 */
export function buildRegionCropSpecs(routed, pageW, pageH) {
  if (!Array.isArray(routed)) return [];
  const specs = [];
  for (const r of routed) {
    if (!r || typeof r !== "object") continue;
    if (r.extractor === "skip") continue;          // covered by the full-page floor
    if (!Array.isArray(r.bbox)) continue;          // no croppable box -> full-page floor
    const px = scaleBboxToPixels(r.bbox, pageW, pageH);
    if (!px) continue;                              // degenerate (<1px) crop -> full-page floor
    specs.push({
      id: String(r.id != null ? r.id : `r${specs.length}`),
      x: px.x,
      y: px.y,
      w: px.w,
      h: px.h,
      extractor: typeof r.extractor === "string" ? r.extractor : "vlm_ocr",
      region_kind: typeof r.region_kind === "string" ? r.region_kind : "unknown",
    });
  }
  return specs;
}

/**
 * Build the opts.tiles array for mergeTiledDimensions: the region crop rects PLUS a whole-page
 * "full_page" tile covering [0,0,pageW,pageH]. The whole-page tile overlaps every region, which is
 * what lets the merge collapse a full-page-floor dim with the region dim it corroborates (no
 * double-count in the union); the merge's non-transitive clique guard still keeps two distinct
 * same-valued features in non-overlapping regions separate.
 *
 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} cropSpecs
 * @param {number} pageW
 * @param {number} pageH
 * @returns {Array<{id:string,x:number,y:number,w:number,h:number}>}
 */
export function buildMergeTiles(cropSpecs, pageW, pageH) {
  const tiles = [];
  if (Array.isArray(cropSpecs)) {
    for (const s of cropSpecs) {
      if (s && s.id != null) tiles.push({ id: String(s.id), x: s.x, y: s.y, w: s.w, h: s.h });
    }
  }
  if (Number.isFinite(pageW) && Number.isFinite(pageH) && pageW > 0 && pageH > 0) {
    tiles.push({ id: FULL_PAGE_TILE_ID, x: 0, y: 0, w: pageW, h: pageH });
  }
  return tiles;
}

/**
 * Recall-first union of the per-region extractions with the full-page floor pass. Assembles the
 * perTile entries (one per region, keyed by the region id, PLUS the full-page pass keyed by
 * FULL_PAGE_TILE_ID) and the overlap-topology tiles, then delegates to the proven
 * mergeTiledDimensions (R8 -- reuse, do not reinvent the clique-merge). Region routing can only
 * ADD dims on top of the full-page floor; identical dims are de-duped.
 *
 * @param {Array<{id:string, dimensions:Array<object>}>} perRegion  per-region extracted dims
 * @param {Array<object>} fullPageDims  the full-page floor pass dimensions
 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} cropSpecs  from buildRegionCropSpecs
 * @param {number} pageW
 * @param {number} pageH
 * @param {{valueTolMm?:number}} [opts]
 * @returns {{dimensions:Array<object>, stats:object}}  mergeTiledDimensions result
 */
export function mergeRegionResults(perRegion, fullPageDims, cropSpecs, pageW, pageH, opts = {}) {
  const perTile = [];
  if (Array.isArray(perRegion)) {
    for (const e of perRegion) {
      if (!e || typeof e !== "object") continue;
      perTile.push({
        tileId: String(e.id != null ? e.id : ""),
        dimensions: Array.isArray(e.dimensions) ? e.dimensions : [],
      });
    }
  }
  // The full-page floor ALWAYS participates -- it is the recall guarantee.
  perTile.push({
    tileId: FULL_PAGE_TILE_ID,
    dimensions: Array.isArray(fullPageDims) ? fullPageDims : [],
  });
  const tiles = buildMergeTiles(cropSpecs, pageW, pageH);
  return mergeTiledDimensions(perTile, { tiles, valueTolMm: opts.valueTolMm });
}

/**
 * Pure: union the non-dimension fields (gdt / notes / profiles / surface_finishes) across the
 * full-page floor fused + every per-region fused, de-duped by the SAME per-field identity the
 * ensemble fuse uses (NON_DIM_KEY_FNS) -- one identity definition, not a fork (R8). Recall-first:
 * the floor is the FIRST source so a floor read wins a key tie; region-only entries are ADDED. This
 * is the dense-rescue recovery -- when the full-page floor FAILED (0 gdt/notes) the region crops'
 * frames are all added, so a dense page no longer loses its GD&T/notes just because the single
 * full-page pass could not read the fine print. Does NOT re-corroborate across regions: each entry
 * keeps the corroboration/n_models it earned in its own region's ensemble fuse (cross-region
 * co-occurrence is a different signal from model-corroboration, never conflated).
 *
 * @param {object|null} fullPageFused  the full-page floor fused
 * @param {Array<object>} perRegionFused  the per-region fused objects
 * @param {string[]} [fields]  non-dim field names to union
 * @returns {{gdt:Array<object>, notes:Array<object>, profiles:Array<object>, surface_finishes:Array<object>}}
 */
export function mergeRegionFused(fullPageFused, perRegionFused, fields = ["gdt", "notes", "profiles", "surface_finishes"]) {
  const sources = [];
  if (fullPageFused && typeof fullPageFused === "object") sources.push(fullPageFused); // floor FIRST (wins ties)
  if (Array.isArray(perRegionFused)) for (const f of perRegionFused) { if (f && typeof f === "object") sources.push(f); }
  const out = {};
  for (const field of fields) {
    const keyFn = NON_DIM_KEY_FNS[field];
    const seen = new Set();
    const merged = [];
    for (const src of sources) {
      const arr = Array.isArray(src[field]) ? src[field] : [];
      for (const item of arr) {
        if (item == null) continue;                      // genuinely nothing -> skip
        let k;
        if (typeof item === "object") {
          try { k = keyFn ? keyFn(item) : null; } catch { k = null; }
        } else {
          k = "prim:" + String(item);                    // a primitive label (e.g. a string note) -> dedup by value
        }
        if (k == null) { merged.push(item); continue; }  // un-keyable object -> KEEP (recall-first: never drop a read label)
        if (seen.has(k)) continue;                        // first source (the floor) wins a key tie
        seen.add(k);
        merged.push(item);
      }
    }
    out[field] = merged;
  }
  return out;
}

/**
 * Build a COMPLETE fused-shaped object for a region-routed page: take the full-page floor's fused
 * output (which carries the non-dimension rich schema -- gdt / notes / profiles / surface_finishes /
 * summary / part_bounds) and REPLACE its dimensions with the region-routed union. This lets a consumer
 * that builds rich labels from a `fused` object (e.g. blueprint-ocr-training-loop.mjs buildTrainsetRow)
 * adopt region routing's better DIMENSION recall WITHOUT dropping the other label types: the recall-
 * first union is dimension-focused, so the non-dimension fields stay from the full-page pass.
 *
 * HONEST LIMIT (R12): when the full-page pass itself failed (a dense page -> 0 dims AND 0 gdt/notes),
 * the non-dimension fields are empty -- region routing recovers the DIMS but cannot conjure gdt/notes
 * the full-page pass never read. A future per-region FULL-schema merge (gdt by FCF identity, notes/
 * finishes by text) would close that; this hybrid is the data-loss-safe step that never drops a label
 * the full-page pass DID read. (It DOES synthesize summary.n_models from the region ensemble in that
 * case -- see opts.fallbackNModels -- so the rescued DIMS are still trainable; only gdt/notes stay empty.)
 *
 * @param {Array<object>} mergedDimensions  the region-routed union dims (mergeRegionResults().dimensions)
 * @param {object|null} fullPageFused       the full-page floor pass fused object (or null/undefined)
 * @param {{fallbackNModels?:number}} [opts]  fallbackNModels = the region ensemble's n_models; used to
 *   SYNTHESIZE summary.n_models when the full-page floor failed (no summary) so buildTrainsetRow's
 *   corroboration gate (n_models>=2) still passes for the region-rescued dims. Ignored (no synthesis)
 *   when the full-page summary is present or when fallbackNModels is absent/<=0.
 * @returns {object} a fused-shaped object: the full-page fused with dimensions replaced by the union
 *   (summary.n_hallucination_candidates always recomputed over the union; summary.n_models synthesized
 *   from fallbackNModels only on the full-page-failed rescue path)
 */
export function buildRegionRoutedFused(mergedDimensions, fullPageFused, opts = {}) {
  const dims = Array.isArray(mergedDimensions) ? mergedDimensions : [];
  // n_hallucination_candidates recomputed over the UNION dims so a region-only hallucination candidate
  // (a singleton a region crop recovered) still routes to active-learning review (classifyActiveLearning
  // triggers on summary.n_hallucination_candidates). Mirrors fuseEnsemble's
  // n_hallucination_candidates count; union dims preserve the per-dim `hallucination_candidate` flag via mergeTiledDimensions.
  const nHall = dims.reduce((n, d) => n + (d && d.hallucination_candidate === true ? 1 : 0), 0);
  // fallbackNModels = the REGION ensemble's n_models, used to SYNTHESIZE a run-level summary when the
  // full-page floor FAILED (dense page -> 0 dims, no summary) but the regions succeeded -- the dense-page
  // RESCUE case (region routing's whole value). Without a summary.n_models, buildTrainsetRow's
  // corroborationPossible gate (n_models>=2) is false and the rescued dims are NOT trainable. The region
  // passes used the same ensemble, so their n_models is the valid corroboration depth for those dims.
  const fallbackN = Number.isFinite(opts.fallbackNModels) ? opts.fallbackNModels : 0;
  // Dense-rescue: union the per-region fused non-dim fields (gdt/notes/profiles/surface_finishes) with
  // the floor's, so a page whose full-page floor FAILED (0 gdt) still recovers what the region crops
  // read. null when no per-region fused supplied (back-compat: the floor's non-dim pass straight through).
  const regionNonDim = Array.isArray(opts.regionFused) && opts.regionFused.length
    ? mergeRegionFused(fullPageFused, opts.regionFused)
    : null;

  if (!fullPageFused || typeof fullPageFused !== "object") {
    const base = fallbackN > 0
      ? { dimensions: dims, summary: { n_models: fallbackN, n_hallucination_candidates: nHall } }
      : { dimensions: dims };
    return regionNonDim ? { ...base, ...regionNonDim } : base;
  }
  const out = { ...fullPageFused, dimensions: dims };
  if (regionNonDim) Object.assign(out, regionNonDim); // region-recovered gdt/notes/profiles/finishes
  if (out.summary && typeof out.summary === "object") {
    // full-page summary present: keep n_models/n_ambiguous_pairs from it (same ensemble), recompute the
    // hallucination count over the union. (n_ambiguous_pairs is a PAIRWISE run metric not reconstructable
    // from per-dim fields -- it stays the full-page value; documented safe-under-count limit.)
    out.summary = { ...out.summary, n_hallucination_candidates: nHall };
  } else if (fallbackN > 0) {
    // full-page fused present but summary missing/malformed AND regions ran -> synthesize (rescue case)
    out.summary = { n_models: fallbackN, n_hallucination_candidates: nHall };
  }
  return out;
}
