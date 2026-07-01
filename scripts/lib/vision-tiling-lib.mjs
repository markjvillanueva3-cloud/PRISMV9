/**
 * vision-tiling-lib.mjs -- P0.2 dense-page region tiling: PURE tile-grid geometry + cross-tile dimension
 * merge. No image I/O and no GPU live here. The image-crop + ensemble-OCR step (a follow-up unit)
 * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
 * results to `mergeTiledDimensions()` to recombine them into one de-duplicated dimension set.
 *
 * WHY tiling: a single full-page VLM pass at fixed resolution loses small dims in dense regions (the
 * classic dense-document recall failure -- "a dim that was clear but missed in a busy corner"). Tiling
 * each page into overlapping quadrants raises the effective DPI per region without a bigger model.
 * Backlog: knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md (P0.2).
 *
 * IMPORTANT (R12, verified against extractDimension in ollama-vision-extract-lib.mjs): our VLM dimensions
 * carry a free-text `location_hint`, NOT a numeric bbox. So the backlog's assumed (value,type,bbox) dedup
 * key is UNAVAILABLE. The merge is therefore OVERLAP-TOPOLOGY aware + (type,value,raw)-keyed and
 * RECALL-FIRST: a dim that lands in the overlap seam appears in multiple OVERLAPPING tiles and collapses
 * to ONE; two distinct same-valued features in NON-overlapping tiles are kept SEPARATE. Without bbox we
 * never drop a candidate that could be a genuine second feature -- a dropped real dim is unrecoverable
 * recall loss, a kept duplicate is a precision cost the calibration/active-learning tier absorbs later
 * (backlog P1.6 recall-first fusion).
 */

/** Default tiling: a 2x2 grid of overlapping quadrants plus a center tile spanning the seam cross. */
export const DEFAULT_TILE_OPTS = Object.freeze({ rows: 2, cols: 2, overlapFrac: 0.15, addCenter: true });

/** Round-trip-safe value-merge tolerance (mm): two nominals within this collapse to the same key. */
export const DEFAULT_MERGE_VALUE_TOL_MM = 0.01;

const MAX_OVERLAP_FRAC = 0.49; // >=0.5 would make adjacent tiles fully contain each other -- meaningless

function isPosFinite(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function clampInt(n, lo) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= lo ? v : lo;
}

function round1(n) {
  return Math.round(n);
}

/**
 * Compute an overlapping tile grid for a page of pixel size width x height.
 * @param {number} width   page width in px (finite, > 0)
 * @param {number} height  page height in px (finite, > 0)
 * @param {{rows?:number, cols?:number, overlapFrac?:number, addCenter?:boolean}} [opts]
 * @returns {{tiles: Array<{id:string,row:number,col:number,x:number,y:number,w:number,h:number}>,
 *            page:{width:number,height:number}, opts:{rows:number,cols:number,overlapFrac:number,addCenter:boolean}}}
 * @throws if width/height are not positive finite numbers (fail-loud: a non-finite page size is a bug upstream)
 */
export function computeTileGrid(width, height, opts = {}) {
  if (!isPosFinite(width) || !isPosFinite(height)) {
    throw new Error(`computeTileGrid: width/height must be positive finite numbers (got ${width} x ${height})`);
  }
  const rows = clampInt(opts.rows ?? DEFAULT_TILE_OPTS.rows, 1);
  const cols = clampInt(opts.cols ?? DEFAULT_TILE_OPTS.cols, 1);
  let overlapFrac = Number(opts.overlapFrac ?? DEFAULT_TILE_OPTS.overlapFrac);
  if (!Number.isFinite(overlapFrac) || overlapFrac < 0) overlapFrac = 0;
  if (overlapFrac > MAX_OVERLAP_FRAC) overlapFrac = MAX_OVERLAP_FRAC;
  const addCenter = opts.addCenter ?? DEFAULT_TILE_OPTS.addCenter;

  // A 1x1 grid is a passthrough: one full-page tile, no seam, no center.
  if (rows === 1 && cols === 1) {
    return {
      tiles: [{ id: "r0c0", row: 0, col: 0, x: 0, y: 0, w: round1(width), h: round1(height) }],
      page: { width, height },
      opts: { rows, cols, overlapFrac, addCenter: false },
    };
  }

  const tileW = width / cols;
  const tileH = height / rows;
  const padX = tileW * overlapFrac;
  const padY = tileH * overlapFrac;
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.max(0, col * tileW - padX);
      const y0 = Math.max(0, row * tileH - padY);
      const x1 = Math.min(width, (col + 1) * tileW + padX);
      const y1 = Math.min(height, (row + 1) * tileH + padY);
      tiles.push({ id: `r${row}c${col}`, row, col, x: round1(x0), y: round1(y0), w: round1(x1 - x0), h: round1(y1 - y0) });
    }
  }

  // Center tile: covers the central seam cross where a dim straddling the 2x2 split would be clipped by
  // every quadrant. Sized like one tile (+overlap), centered on the page midpoint. Only meaningful when
  // the grid actually has an interior seam (rows>1 AND cols>1).
  if (addCenter && rows > 1 && cols > 1) {
    const cw = Math.min(width, tileW + 2 * padX);
    const ch = Math.min(height, tileH + 2 * padY);
    const cx = Math.max(0, Math.min(width - cw, width / 2 - cw / 2));
    const cy = Math.max(0, Math.min(height - ch, height / 2 - ch / 2));
    tiles.push({ id: "center", row: -1, col: -1, x: round1(cx), y: round1(cy), w: round1(cw), h: round1(ch) });
  }

  return { tiles, page: { width, height }, opts: { rows, cols, overlapFrac, addCenter: !!(addCenter && rows > 1 && cols > 1) } };
}

/** True when two tile rects share any positive-area region. */
export function tilesOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function normRaw(s) {
  return String(s == null ? "" : s).toUpperCase().replace(/\s+/g, " ").trim();
}

// Shape-tolerant accessors over the TWO real PRISM dimension shapes the merge must consume (R15 -- a live
// E2E proved a single-shape merge silently over-collapses the other shape):
//   - extractDimension (ollama-vision-extract-lib): { nominal_mm, raw_text:string,   confidence }
//   - fuseEnsemble     (vision-ensemble-fuse):      { value_mm,   raw_texts:string[], agreement_confidence }
// The tiling orchestrator feeds the FUSED shape; the lib is also useful directly on the extractDimension
// shape -- so both are first-class. Precedence is documented + deterministic.
/** The canonical mm value of a dim across both shapes (null if none finite). */
export function dimValueMm(d) {
  for (const v of [d && d.nominal_mm, d && d.value_mm, d && d.mm]) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}
/** The canonical raw-text identity of a dim across both shapes ("" if none). */
export function dimRawText(d) {
  if (d && typeof d.raw_text === "string" && d.raw_text) return d.raw_text;
  if (d && Array.isArray(d.raw_texts)) {
    const f = d.raw_texts.find((s) => typeof s === "string" && s);
    if (f) return f;
  }
  return "";
}
/** The canonical confidence of a dim across both shapes (0 if none). */
export function dimConfidence(d) {
  for (const v of [d && d.confidence, d && d.agreement_confidence]) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

/** Build the merge key for a dimension: type | value-bucket | normalized-raw. */
function dimKey(dim, valueTolMm) {
  const type = normRaw(dim && (dim.type ?? dim.kind)) || "UNKNOWN";
  const nr = normRaw(dimRawText(dim));
  let valTok;
  const mm = dimValueMm(dim);
  if (mm != null) {
    valTok = `mm:${Math.round(mm / valueTolMm)}`;
  } else if (nr) {
    valTok = `raw:${nr}`; // no numeric value -> the text IS the identity (thread/finish/chamfer callouts)
  } else {
    valTok = "novalue";
  }
  return `${type}|${valTok}|${nr}`;
}

function confOf(dim) {
  return dimConfidence(dim);
}

/**
 * Recombine per-tile VLM extractions into one de-duplicated dimension set.
 *
 * @param {Array<{tileId?:string, tile?:{id?:string}, dimensions?:Array<object>}>} perTile
 *   one entry per tile (the order computeTileGrid produced them); each carries that tile's extracted dims.
 * @param {{tiles?:Array<object>, valueTolMm?:number}} [opts]
 *   `tiles`: the grid from computeTileGrid (gives overlap topology -- REQUIRED to safely merge across
 *   tiles; without it, only same-tile + identical-raw duplicates collapse, conservatively). `valueTolMm`:
 *   numeric merge tolerance (default DEFAULT_MERGE_VALUE_TOL_MM).
 * @returns {{dimensions:Array<object>, stats:{rawCount:number, mergedCount:number, collapsed:number,
 *            maxTileAgreement:number, tilesWithDims:number}}}
 *   Each merged dim is the highest-confidence representative of its cluster, augmented with
 *   `tileAgreement` (how many tile-instances backed it -- a recall/precision signal) and `sourceTiles`.
 */
export function mergeTiledDimensions(perTile, opts = {}) {
  const valueTolMm = isPosFinite(opts.valueTolMm) ? opts.valueTolMm : DEFAULT_MERGE_VALUE_TOL_MM;
  const tileMap = new Map();
  if (Array.isArray(opts.tiles)) for (const t of opts.tiles) if (t && t.id != null) tileMap.set(String(t.id), t);

  // Flatten to instances {dim, tileId}. Tolerate a missing tileId (legacy single-page result -> passthrough).
  const instances = [];
  let tilesWithDims = 0;
  if (Array.isArray(perTile)) {
    for (const entry of perTile) {
      if (!entry || typeof entry !== "object") continue;
      const tileId = entry.tileId != null ? String(entry.tileId) : entry.tile && entry.tile.id != null ? String(entry.tile.id) : null;
      const dims = Array.isArray(entry.dimensions) ? entry.dimensions.filter((d) => d && typeof d === "object") : [];
      if (dims.length) tilesWithDims++;
      for (const dim of dims) instances.push({ dim, tileId });
    }
  }
  const rawCount = instances.length;

  // Group by merge key, then within a key bucket cluster by GREEDY CLIQUE PARTITION (see the loop below --
  // deliberately NOT union-find/connected-components, which would over-merge across the non-transitive
  // overlap relation). Two instances `connected` iff they are the same tile OR their tiles overlap. An
  // instance with no tileId (or a tile not in the grid) connects only to itself => never silently dropped.
  const byKey = new Map();
  for (let i = 0; i < instances.length; i++) {
    const k = dimKey(instances[i].dim, valueTolMm);
    let bucket = byKey.get(k);
    if (!bucket) { bucket = []; byKey.set(k, bucket); }
    bucket.push(i);
  }

  const connected = (a, b) => {
    const ta = instances[a].tileId;
    const tb = instances[b].tileId;
    if (ta != null && ta === tb) return true; // same tile (incl. intra-tile dup) -> merge
    if (ta == null || tb == null) return false; // a passthrough instance only connects to itself
    const ra = tileMap.get(ta);
    const rb = tileMap.get(tb);
    if (!ra || !rb) return false; // unknown topology -> do NOT cross-merge (recall-first)
    return tilesOverlap(ra, rb);
  };

  const merged = [];
  let maxTileAgreement = 0;
  for (const bucket of byKey.values()) {
    // Greedy CLIQUE partition (deliberately NOT union-find / connected-components): an instance joins an
    // existing group ONLY if it is directly `connected` to EVERY member already in that group, else it
    // starts a new group. This matters because `connected` (tiles overlap) is geometrically NON-TRANSITIVE:
    // in the default 2x2+center grid the center tile overlaps BOTH diagonal quadrants r0c0 and r1c1, which
    // do NOT overlap each other -- a transitive (connected-component) merge would bridge two DISTINCT
    // same-valued corner features into one via the center, a silent over-merge / unrecoverable recall loss.
    // A single physical label lands in N tiles only when those tiles share a common region, i.e. they are
    // PAIRWISE overlapping (a clique); so two non-overlapping tiles can never co-occupy a group. Worst case
    // greedy SPLITS one physical feature into two (under-merge = the SAFE direction, recall-first). Instance
    // counts per bucket are tiny (a handful), so the O(n^2) clique scan is free.
    const groups = []; // each = array of instance indices, all pairwise `connected`
    for (const ii of bucket) {
      let placed = false;
      for (const grp of groups) {
        if (grp.every((jj) => connected(ii, jj))) { grp.push(ii); placed = true; break; }
      }
      if (!placed) groups.push([ii]);
    }
    for (const comp of groups) {
      // representative = highest-confidence instance in the clique
      let rep = comp[0];
      for (const ii of comp) if (confOf(instances[ii].dim) > confOf(instances[rep].dim)) rep = ii;
      const sourceTiles = [...new Set(comp.map((ii) => instances[ii].tileId).filter((t) => t != null))].sort();
      const tileAgreement = comp.length;
      if (tileAgreement > maxTileAgreement) maxTileAgreement = tileAgreement;
      merged.push({ ...instances[rep].dim, tileAgreement, sourceTiles });
    }
  }

  return {
    dimensions: merged,
    stats: { rawCount, mergedCount: merged.length, collapsed: rawCount - merged.length, maxTileAgreement, tilesWithDims },
  };
}
