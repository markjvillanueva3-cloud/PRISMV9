// Tests for vision-tiling-lib.mjs -- P0.2 dense-page region tiling (grid geometry + cross-tile merge).
// Real reference values; happy path + >=3 failure modes + >=2 adversarial inputs per function.
// Run: node scripts/lib/vision-tiling-lib.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTileGrid,
  tilesOverlap,
  mergeTiledDimensions,
  dimValueMm,
  dimRawText,
  dimConfidence,
  DEFAULT_TILE_OPTS,
  DEFAULT_MERGE_VALUE_TOL_MM,
} from "./vision-tiling-lib.mjs";

// ---------------------------------------------------------------- computeTileGrid

test("computeTileGrid: default 2x2 -> 4 overlapping quadrants + 1 center tile", () => {
  const g = computeTileGrid(1000, 1000);
  assert.equal(g.tiles.length, 5);
  const ids = g.tiles.map((t) => t.id).sort();
  assert.deepEqual(ids, ["center", "r0c0", "r0c1", "r1c0", "r1c1"]);
  // every tile stays inside the page (rounding may add at most 1px)
  for (const t of g.tiles) {
    assert.ok(t.x >= 0 && t.y >= 0, `tile ${t.id} origin in-bounds`);
    assert.ok(t.x + t.w <= 1001 && t.y + t.h <= 1001, `tile ${t.id} extent in-bounds`);
    assert.ok(t.w > 0 && t.h > 0, `tile ${t.id} positive size`);
  }
  // adjacent quadrants MUST overlap (the whole point of overlapFrac) -- a seam dim lands in both
  const r0c0 = g.tiles.find((t) => t.id === "r0c0");
  const r0c1 = g.tiles.find((t) => t.id === "r0c1");
  assert.equal(tilesOverlap(r0c0, r0c1), true);
});

test("computeTileGrid: with overlapFrac 0 adjacent quadrants do NOT overlap (clean split)", () => {
  const g = computeTileGrid(1000, 1000, { overlapFrac: 0, addCenter: false });
  assert.equal(g.tiles.length, 4);
  const r0c0 = g.tiles.find((t) => t.id === "r0c0");
  const r0c1 = g.tiles.find((t) => t.id === "r0c1");
  // they share an edge (x=500) but not positive area
  assert.equal(tilesOverlap(r0c0, r0c1), false);
  assert.equal(r0c0.x + r0c0.w, 500);
  assert.equal(r0c1.x, 500);
});

test("computeTileGrid: 1x1 grid is a full-page passthrough (no seam, no center)", () => {
  const g = computeTileGrid(800, 600, { rows: 1, cols: 1 });
  assert.equal(g.tiles.length, 1);
  assert.deepEqual(g.tiles[0], { id: "r0c0", row: 0, col: 0, x: 0, y: 0, w: 800, h: 600 });
  assert.equal(g.opts.addCenter, false);
});

test("computeTileGrid: a 1-D strip (1x3) has no interior cross -> no center tile", () => {
  const g = computeTileGrid(900, 300, { rows: 1, cols: 3 });
  assert.equal(g.tiles.length, 3); // no center: addCenter requires rows>1 AND cols>1
  assert.ok(!g.tiles.some((t) => t.id === "center"));
});

test("computeTileGrid: overlapFrac is clamped to [0, 0.49] (adversarial: negative + huge)", () => {
  assert.equal(computeTileGrid(1000, 1000, { overlapFrac: -5 }).opts.overlapFrac, 0);
  assert.equal(computeTileGrid(1000, 1000, { overlapFrac: 9 }).opts.overlapFrac, 0.49);
  assert.equal(computeTileGrid(1000, 1000, { overlapFrac: 0.2 }).opts.overlapFrac, 0.2);
});

test("computeTileGrid: rows/cols below 1 are clamped to 1 (adversarial)", () => {
  const g = computeTileGrid(1000, 1000, { rows: 0, cols: -3 });
  assert.equal(g.opts.rows, 1);
  assert.equal(g.opts.cols, 1);
  assert.equal(g.tiles.length, 1);
});

test("computeTileGrid: throws fail-loud on non-positive / non-finite page size", () => {
  assert.throws(() => computeTileGrid(0, 100), /positive finite/);
  assert.throws(() => computeTileGrid(100, -1), /positive finite/);
  assert.throws(() => computeTileGrid(NaN, 100), /positive finite/);
  assert.throws(() => computeTileGrid("800", 600), /positive finite/);
});

test("DEFAULT_TILE_OPTS + DEFAULT_MERGE_VALUE_TOL_MM are the documented contract", () => {
  assert.deepEqual(DEFAULT_TILE_OPTS, { rows: 2, cols: 2, overlapFrac: 0.15, addCenter: true });
  assert.equal(DEFAULT_MERGE_VALUE_TOL_MM, 0.01);
});

// ---------------------------------------------------------------- tilesOverlap

test("tilesOverlap: positive-area intersection true; edge-touch + disjoint + null false", () => {
  const a = { x: 0, y: 0, w: 60, h: 100 };
  assert.equal(tilesOverlap(a, { x: 40, y: 0, w: 60, h: 100 }), true); // share x[40,60]
  assert.equal(tilesOverlap(a, { x: 60, y: 0, w: 60, h: 100 }), false); // edge-touch only
  assert.equal(tilesOverlap(a, { x: 200, y: 0, w: 10, h: 10 }), false); // disjoint
  assert.equal(tilesOverlap(a, null), false);
  assert.equal(tilesOverlap(null, a), false);
});

// ---------------------------------------------------------------- shape-tolerant accessors

test("dimValueMm/dimRawText/dimConfidence: resolve BOTH the extractDimension and fused-ensemble shapes", () => {
  // extractDimension shape
  assert.equal(dimValueMm({ nominal_mm: 12.7 }), 12.7);
  assert.equal(dimRawText({ raw_text: "0.500" }), "0.500");
  assert.equal(dimConfidence({ confidence: 0.8 }), 0.8);
  // fused-ensemble shape (the one the tiling orchestrator actually feeds -- value_mm / raw_texts[] / agreement_confidence)
  assert.equal(dimValueMm({ value_mm: 3.048 }), 3.048);
  assert.equal(dimRawText({ raw_texts: ["", "dia .12"] }), "dia .12"); // first non-empty
  assert.equal(dimConfidence({ agreement_confidence: 0.95 }), 0.95);
  // precedence + empties
  assert.equal(dimValueMm({ nominal_mm: 1, value_mm: 2 }), 1); // nominal_mm wins
  assert.equal(dimValueMm({ nominal_mm: NaN, value_mm: 2 }), 2); // skip non-finite
  assert.equal(dimValueMm({}), null);
  assert.equal(dimRawText({ raw_texts: [] }), "");
  assert.equal(dimConfidence({}), 0);
});

test("mergeTiledDimensions: consumes the FUSED ensemble shape (value_mm/raw_texts) -- distinct values stay distinct", () => {
  // REGRESSION (R15 live-E2E catch): keying on nominal_mm only made a fused dim's value null, collapsing
  // 5 distinct same-type dims into 1-per-type. With value_mm read, distinct values must stay separate.
  const fused = (type, value_mm, rt) => ({ type, value_mm, raw_texts: [rt], agreement_confidence: 0.95 });
  const perTile = [
    { tileId: "A", dimensions: [fused("diameter", 3.048, "dia .12"), fused("linear", 8.636, ".34"), fused("diameter", 12.7, ".50")] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: GRID });
  assert.equal(out.dimensions.length, 3); // NOT 1-per-type -- the three distinct values survive
  // a true duplicate (same value_mm) across overlapping tiles still collapses
  const dup = mergeTiledDimensions([
    { tileId: "A", dimensions: [fused("diameter", 3.048, "dia .12")] },
    { tileId: "B", dimensions: [fused("diameter", 3.048, "dia .12")] },
  ], { tiles: GRID });
  assert.equal(dup.dimensions.length, 1);
  assert.equal(dup.dimensions[0].tileAgreement, 2);
});

// ---------------------------------------------------------------- mergeTiledDimensions

// A small explicit grid: A overlaps B (share x[40,60]); C is disjoint from both.
const GRID = [
  { id: "A", x: 0, y: 0, w: 60, h: 100 },
  { id: "B", x: 40, y: 0, w: 60, h: 100 },
  { id: "C", x: 200, y: 0, w: 60, h: 100 },
];
const dim = (type, mm, raw, conf) => ({ type, nominal_mm: mm, raw_text: raw, confidence: conf });

test("mergeTiledDimensions: a seam dim seen in two OVERLAPPING tiles collapses to one (tileAgreement 2)", () => {
  const perTile = [
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "B", dimensions: [dim("diameter", 12.7, "0.500", 0.91)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: GRID });
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].tileAgreement, 2);
  assert.deepEqual(out.dimensions[0].sourceTiles, ["A", "B"]);
  // representative = the higher-confidence instance (0.91)
  assert.equal(out.dimensions[0].confidence, 0.91);
  assert.deepEqual(out.stats, { rawCount: 2, mergedCount: 1, collapsed: 1, maxTileAgreement: 2, tilesWithDims: 2 });
});

test("mergeTiledDimensions: two DISTINCT same-valued features in NON-overlapping tiles are kept (recall-first)", () => {
  const perTile = [
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "C", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: GRID });
  // A and C do NOT overlap -> these are likely two real dia .500 holes -> NOT merged
  assert.equal(out.dimensions.length, 2);
  assert.equal(out.stats.collapsed, 0);
});

test("mergeTiledDimensions: an intra-tile duplicate collapses (same tile trivially merges)", () => {
  const perTile = [
    { tileId: "A", dimensions: [dim("length", 25.4, "1.000", 0.7), dim("length", 25.4, "1.000", 0.85)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: GRID });
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].tileAgreement, 2);
  assert.equal(out.dimensions[0].confidence, 0.85);
});

test("mergeTiledDimensions: same value but DIFFERENT type are never merged", () => {
  const perTile = [
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "B", dimensions: [dim("radius", 12.7, "R0.500", 0.8)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: GRID });
  assert.equal(out.dimensions.length, 2);
});

test("mergeTiledDimensions: values outside the merge tolerance stay separate; inside collapse", () => {
  // 12.70 vs 12.69 -> within default 0.01mm bucket? round(12.70/0.01)=1270, round(12.69/0.01)=1269 -> separate
  const sep = mergeTiledDimensions(
    [{ tileId: "A", dimensions: [dim("diameter", 12.7, "x", 0.8)] }, { tileId: "B", dimensions: [dim("diameter", 12.69, "x", 0.8)] }],
    { tiles: GRID }
  );
  assert.equal(sep.dimensions.length, 2);
  // 12.701 vs 12.704 both round to bucket 1270 -> merged (overlapping tiles)
  const mrg = mergeTiledDimensions(
    [{ tileId: "A", dimensions: [dim("diameter", 12.701, "x", 0.8)] }, { tileId: "B", dimensions: [dim("diameter", 12.704, "x", 0.8)] }],
    { tiles: GRID }
  );
  assert.equal(mrg.dimensions.length, 1);
});

test("mergeTiledDimensions: a raw-text callout with no numeric value merges by its text (thread/finish)", () => {
  const t = (raw) => ({ type: "thread", nominal_mm: null, raw_text: raw, confidence: 0.9 });
  const out = mergeTiledDimensions(
    [{ tileId: "A", dimensions: [t("1/4-20 UNC")] }, { tileId: "B", dimensions: [t("1/4-20 UNC")] }],
    { tiles: GRID }
  );
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].tileAgreement, 2);
});

test("mergeTiledDimensions: a dim with NO tileId is passed through, never dropped (legacy single-page)", () => {
  const out = mergeTiledDimensions([{ dimensions: [dim("diameter", 12.7, "0.500", 0.8)] }], { tiles: GRID });
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].tileAgreement, 1);
  assert.deepEqual(out.dimensions[0].sourceTiles, []);
});

test("mergeTiledDimensions: without grid topology, cross-tile dims are NOT merged (conservative recall-first)", () => {
  // no opts.tiles -> overlap unknown -> only same-tile merges; A and B duplicates stay 2
  const out = mergeTiledDimensions([
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "B", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
  ]);
  assert.equal(out.dimensions.length, 2);
});

test("mergeTiledDimensions: a tileId present in perTile but ABSENT from the grid map is kept separate (recall-first)", () => {
  // "ghost" is not in GRID -> connected() can't resolve its rect -> never cross-merges -> never dropped
  const out = mergeTiledDimensions([
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "ghost", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
  ], { tiles: GRID });
  assert.equal(out.dimensions.length, 2); // both survive -- a stale/unknown tile is not a license to drop
});

test("mergeTiledDimensions: a NaN/Infinity nominal_mm keys by raw_text, never a poison NaN bucket", () => {
  // dimKey guards nominal_mm with Number.isFinite -> falls back to raw, so two NaN-valued same-raw dims in
  // overlapping tiles still merge by their text and a NaN never spuriously collapses unrelated dims.
  const nan = (raw) => ({ type: "diameter", nominal_mm: NaN, raw_text: raw, confidence: 0.8 });
  const same = mergeTiledDimensions([
    { tileId: "A", dimensions: [nan("0.500")] },
    { tileId: "B", dimensions: [nan("0.500")] },
  ], { tiles: GRID });
  assert.equal(same.dimensions.length, 1); // same raw, overlapping tiles -> merged by text
  const diff = mergeTiledDimensions([
    { tileId: "A", dimensions: [nan("0.500")] },
    { tileId: "B", dimensions: [nan("0.750")] },
  ], { tiles: GRID });
  assert.equal(diff.dimensions.length, 2); // different raw -> never collapsed by a shared NaN value
});

test("mergeTiledDimensions: empty / malformed input yields empty result + zeroed stats", () => {
  assert.deepEqual(mergeTiledDimensions([], { tiles: GRID }).dimensions, []);
  assert.deepEqual(mergeTiledDimensions(null).stats, { rawCount: 0, mergedCount: 0, collapsed: 0, maxTileAgreement: 0, tilesWithDims: 0 });
  // null dims inside an entry are filtered, not crashed on
  const out = mergeTiledDimensions([{ tileId: "A", dimensions: [null, dim("length", 25.4, "1.000", 0.8), 7] }], { tiles: GRID });
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.stats.rawCount, 1);
});

test("mergeTiledDimensions: a center tile must NOT transitively bridge two DISTINCT corner features (over-merge guard)", () => {
  // The dangerous case: r0c0 and r1c1 are DIAGONAL quadrants that do NOT overlap; `center` overlaps BOTH.
  // A naive union-find would chain r0c0--center--r1c1 and collapse two distinct dia .500 holes into one
  // (silent recall loss). Greedy CLIQUE partition must keep the two non-overlapping corners separate.
  const grid = [
    { id: "r0c0", x: 0, y: 0, w: 60, h: 60 },
    { id: "r1c1", x: 100, y: 100, w: 60, h: 60 }, // disjoint from r0c0
    { id: "center", x: 40, y: 40, w: 80, h: 80 }, // overlaps r0c0 (x/y[40,60]) AND r1c1 (x/y[100,120])
  ];
  assert.equal(tilesOverlap(grid[0], grid[1]), false); // corners truly disjoint
  assert.equal(tilesOverlap(grid[2], grid[0]), true);
  assert.equal(tilesOverlap(grid[2], grid[1]), true);
  const perTile = [
    { tileId: "r0c0", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "r1c1", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
    { tileId: "center", dimensions: [dim("diameter", 12.7, "0.500", 0.8)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: grid });
  // r0c0 and r1c1 must NEVER end up in the same clique -> at least 2 distinct dims survive
  assert.equal(out.dimensions.length, 2);
  // the two corner instances are in different groups; neither group's sourceTiles contains BOTH corners
  for (const d of out.dimensions) {
    assert.ok(!(d.sourceTiles.includes("r0c0") && d.sourceTiles.includes("r1c1")), "corners never co-merged");
  }
});

test("mergeTiledDimensions: a 3-tile seam chain (A-B-center) merges to one with agreement 3", () => {
  // center overlaps both A and B; all three carry the same dim -> one component, agreement 3
  const grid = [...GRID, { id: "center", x: 30, y: 0, w: 50, h: 100 }]; // overlaps A (x[30,60]) and B (x[40,80])
  const perTile = [
    { tileId: "A", dimensions: [dim("diameter", 12.7, "0.500", 0.6)] },
    { tileId: "B", dimensions: [dim("diameter", 12.7, "0.500", 0.7)] },
    { tileId: "center", dimensions: [dim("diameter", 12.7, "0.500", 0.95)] },
  ];
  const out = mergeTiledDimensions(perTile, { tiles: grid });
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].tileAgreement, 3);
  assert.equal(out.dimensions[0].confidence, 0.95);
  assert.deepEqual(out.dimensions[0].sourceTiles, ["A", "B", "center"]);
});
