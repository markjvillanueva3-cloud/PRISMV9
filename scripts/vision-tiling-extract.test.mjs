// Tests for vision-tiling-extract.mjs -- the P0.2 tiling orchestrator (pure over injectable deps).
// Real reference values; the orchestration is proven with MOCK crop+OCR deps (the live GPU E2E is the
// CLI). Run: node scripts/vision-tiling-extract.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readPngSize, computeLift, extractWithTiling } from "./vision-tiling-extract.mjs";

// ---------------------------------------------------------------- readPngSize

test("readPngSize: parses width/height from a crafted PNG IHDR header (exact reference values)", () => {
  // minimal valid PNG prefix: 8-byte signature + IHDR length + "IHDR" + width(BE) + height(BE)
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0); // signature
  buf.writeUInt32BE(13, 8); // IHDR chunk length
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(850, 16); // width
  buf.writeUInt32BE(1100, 20); // height
  const dir = mkdtempSync(join(tmpdir(), "prism-png-"));
  const p = join(dir, "x.png");
  writeFileSync(p, buf);
  assert.deepEqual(readPngSize(p), { width: 850, height: 1100 });
});

test("readPngSize: throws fail-loud on a non-PNG / too-short file", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-png-"));
  const p = join(dir, "not.png");
  writeFileSync(p, Buffer.from("this is not a png"));
  assert.throws(() => readPngSize(p), /not a PNG/);
});

// ---------------------------------------------------------------- computeLift

test("computeLift: counts NEW-in-tiled, shared, and only-in-baseline by type+value", () => {
  const d = (type, mm, raw) => ({ type, nominal_mm: mm, raw_text: raw });
  const baseline = [d("diameter", 10, "A"), d("length", 99, "Z")];
  const tiled = [d("diameter", 10, "A"), d("diameter", 20, "B"), d("diameter", 30, "C")];
  const L = computeLift(baseline, tiled);
  assert.equal(L.baselineCount, 2);
  assert.equal(L.tiledCount, 3);
  assert.equal(L.newInTiled, 2); // B + C found by tiling, missed by the single pass
  assert.equal(L.sharedCount, 1); // A in both
  assert.equal(L.onlyInBaseline, 1); // Z dropped by tiling (a regression signal)
});

test("computeLift: value-less callouts (no nominal_mm) match by raw_text", () => {
  const t = (raw) => ({ type: "thread", nominal_mm: null, raw_text: raw });
  const L = computeLift([t("1/4-20 UNC")], [t("1/4-20 UNC"), t("M6X1.0")]);
  assert.equal(L.sharedCount, 1);
  assert.equal(L.newInTiled, 1);
  assert.equal(L.onlyInBaseline, 0);
});

// ---------------------------------------------------------------- extractWithTiling (mock deps)

const dim = (type, mm, raw) => ({ type, nominal_mm: mm, raw_text: raw, confidence: 0.8 });

// A mock ensemble: the full page (baseline) sees ONLY dim A; each tile sees its own corner dim, and the
// center tile re-sees A (a seam duplicate). This models tiling's whole value: more dims per region.
function mockDeps(opts = {}) {
  const perTilePng = {
    "tile_r0c0.png": [dim("diameter", 10, "A")],
    "tile_r0c1.png": [dim("diameter", 20, "B")],
    "tile_r1c0.png": [dim("diameter", 30, "C")],
    "tile_r1c1.png": [dim("diameter", 40, "D")],
    "tile_center.png": [dim("diameter", 10, "A")], // duplicate of r0c0 (center overlaps r0c0)
  };
  return {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => {
      const m = new Map();
      for (const t of tiles) { if (opts.dropTile === t.id) continue; m.set(t.id, `tile_${t.id}.png`); }
      return m;
    },
    runEnsemble: ({ png }) => {
      if (png === "page.png") return { fused: { dimensions: [dim("diameter", 10, "A")] }, error: null }; // baseline
      const dims = perTilePng[png] || [];
      return { fused: { dimensions: dims }, error: null };
    },
  };
}

test("extractWithTiling: tiles a page, OCRs each tile, merges -> recovers dims the full page missed", async () => {
  const out = await extractWithTiling({ pngPath: "page.png", baseline: true }, mockDeps());
  assert.equal(out.page.width, 1000);
  assert.equal(out.grid.tiles.length, 5); // 2x2 + center
  assert.equal(out.tilesOcrOk, 5);
  assert.equal(out.tilesOcrFailed, 0);
  // merged: A (r0c0 + center collapsed), B, C, D -> 4 distinct dims
  assert.equal(out.merged.dimensions.length, 4);
  const aDim = out.merged.dimensions.find((dd) => dd.raw_text === "A");
  assert.equal(aDim.tileAgreement, 2); // A seen in r0c0 AND center (overlapping) -> collapsed
  // lift: tiling found B,C,D that the single full-page pass missed
  assert.equal(out.baseline.count, 1);
  assert.equal(out.lift.newInTiled, 3);
  assert.equal(out.lift.onlyInBaseline, 0);
});

test("extractWithTiling: a tile that fails to crop is counted failed, never silently passed", async () => {
  const out = await extractWithTiling({ pngPath: "page.png" }, mockDeps({ dropTile: "center" }));
  assert.equal(out.tilesOcrOk, 4); // center dropped
  assert.equal(out.tilesOcrFailed, 1);
  assert.equal(out.perTile.length, 4); // center not OCR'd
  // without the center seam-duplicate, A,B,C,D are still all found (4 dims)
  assert.equal(out.merged.dimensions.length, 4);
});

test("extractWithTiling: a tile where ALL models failed (models_ok=0, error=null) counts FAILED, not ok (R12)", async () => {
  // REGRESSION (R15 live catch): runEnsembleOverImage returns top-level error:null even when models_ok=0
  // (e.g. an "empty response" on every model). The orchestrator must NOT count that as a success.
  const deps = {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => new Map(tiles.map((t) => [t.id, `tile_${t.id}.png`])),
    runEnsemble: ({ png }) =>
      png === "tile_r0c0.png"
        ? { fused: { dimensions: [dim("diameter", 10, "A")] }, error: null, models_ok: 1, models_failed: 0 }
        : { fused: { dimensions: [] }, error: null, models_ok: 0, models_failed: 1 }, // all models empty
  };
  const out = await extractWithTiling({ pngPath: "page.png" }, deps);
  assert.equal(out.tilesOcrOk, 1); // only r0c0 truly succeeded
  assert.equal(out.tilesOcrFailed, 4); // the 4 empty-response tiles are honestly failed
});

test("extractWithTiling: a SILENTLY-FAILED baseline (models_ok=0) flags lift.baselineFailed -- no fabricated lift (R12)", async () => {
  // REGRESSION (scrutiny P1): the baseline OCR can hit the same models_ok=0 trap. If undetected, computeLift
  // reports newInTiled = ALL tiled dims against a baseline that never ran -- a fabricated recall-lift headline.
  const deps = {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => new Map(tiles.map((t) => [t.id, `tile_${t.id}.png`])),
    runEnsemble: ({ png }) =>
      png === "page.png"
        ? { fused: { dimensions: [] }, error: null, models_ok: 0, models_failed: 1 } // baseline: ALL models empty
        : { fused: { dimensions: [dim("diameter", 10, "A")] }, error: null, models_ok: 1, models_failed: 0 },
  };
  const out = await extractWithTiling({ pngPath: "page.png", baseline: true }, deps);
  assert.equal(out.baseline.ok, false);
  assert.match(out.baseline.error, /models_ok=0/);
  assert.equal(out.lift.baselineFailed, true); // the lift number is explicitly marked invalid, not silently inflated
});

test("extractWithTiling: a genuinely-empty baseline that RAN (models_ok>0, 0 dims) is a valid lift, not a failure", async () => {
  const deps = {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => new Map(tiles.map((t) => [t.id, `tile_${t.id}.png`])),
    runEnsemble: ({ png }) =>
      png === "page.png"
        ? { fused: { dimensions: [] }, error: null, models_ok: 1, models_failed: 0 } // ran, genuinely 0 dims
        : { fused: { dimensions: [dim("diameter", 10, "A")] }, error: null, models_ok: 1, models_failed: 0 },
  };
  const out = await extractWithTiling({ pngPath: "page.png", baseline: true }, deps);
  assert.equal(out.baseline.ok, true);
  assert.equal(out.lift.baselineFailed, false); // a real empty baseline -> a valid lift
});

test("extractWithTiling: without --baseline, no baseline/lift is computed", async () => {
  const out = await extractWithTiling({ pngPath: "page.png" }, mockDeps());
  assert.equal(out.baseline, null);
  assert.equal(out.lift, null);
});

test("extractWithTiling: TILES get forceUnits (global units authoritative); the full-page BASELINE does NOT", async () => {
  // Tiles lose the title block -> the global unit is forced onto them; the baseline keeps the title block.
  const calls = [];
  const deps = {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => new Map(tiles.map((t) => [t.id, `tile_${t.id}.png`])),
    runEnsemble: (a) => { calls.push({ png: a.png, forceUnits: a.forceUnits }); return { fused: { dimensions: [] }, error: null, models_ok: 1 }; },
  };
  await extractWithTiling({ pngPath: "page.png", assumeUnits: "in", baseline: true }, deps);
  const tileCalls = calls.filter((c) => c.png !== "page.png");
  const baseCall = calls.find((c) => c.png === "page.png");
  assert.ok(tileCalls.length >= 4);
  for (const c of tileCalls) assert.equal(c.forceUnits, "in"); // assumeUnits forced onto tiles
  assert.equal(baseCall.forceUnits, undefined); // baseline NOT forced (title block present)

  // explicit forceUnits beats assumeUnits for tiles
  calls.length = 0;
  await extractWithTiling({ pngPath: "page.png", assumeUnits: "mm", forceUnits: "in" }, deps);
  for (const c of calls) assert.equal(c.forceUnits, "in");
});

test("extractWithTiling: throws fail-loud when pngPath is missing", async () => {
  await assert.rejects(() => extractWithTiling({}, mockDeps()), /pngPath required/);
});

test("extractWithTiling: consumes the REAL fused-ensemble shape (value_mm/raw_texts/agreement_confidence)", async () => {
  // REGRESSION (R15 live-E2E catch): runEnsembleOverImage emits fused dims {type, value_mm, raw_texts[],
  // agreement_confidence}, NOT the extractDimension shape. A single full page found 0; r0c0 found 3 distinct.
  const fused = (type, value_mm, rt) => ({ type, value_mm, raw_texts: [rt], agreement_confidence: 0.95 });
  const deps = {
    readImageSize: () => ({ width: 1000, height: 1000 }),
    cropTiles: (png, tiles) => new Map(tiles.map((t) => [t.id, `tile_${t.id}.png`])),
    runEnsemble: ({ png }) => {
      if (png === "page.png") return { fused: { dimensions: [] }, error: null }; // dense full page -> 0
      if (png === "tile_r0c0.png") {
        return { fused: { dimensions: [fused("diameter", 3.048, "dia .12"), fused("linear", 8.636, ".34"), fused("diameter", 12.7, ".50")] }, error: null };
      }
      return { fused: { dimensions: [] }, error: null };
    },
  };
  const out = await extractWithTiling({ pngPath: "page.png", baseline: true }, deps);
  assert.equal(out.merged.dimensions.length, 3); // 3 distinct values, NOT collapsed to 1-per-type
  assert.equal(out.baseline.count, 0);
  assert.equal(out.lift.newInTiled, 3); // all 3 are dims the full page missed
});

test("extractWithTiling: an OCR error on a tile increments tilesOcrFailed (R12 -- not a silent pass)", async () => {
  const deps = mockDeps();
  const inner = deps.runEnsemble;
  deps.runEnsemble = ({ png }) => (png === "tile_r1c1.png" ? { fused: { dimensions: [] }, error: "curl exit=28" } : inner({ png }));
  const out = await extractWithTiling({ pngPath: "page.png" }, deps);
  assert.equal(out.tilesOcrFailed, 1);
  assert.equal(out.tilesOcrOk, 4);
});
