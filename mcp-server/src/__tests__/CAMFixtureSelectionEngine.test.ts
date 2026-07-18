/**
 * CAMFixtureSelectionEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-FIXTURE
 */
import { describe, it, expect } from "vitest";
import { CAMFixtureSelectionEngine } from "../engines/CAMFixtureSelectionEngine.js";
import type { StockGeometry, ShopFixtureEntry } from "../engines/CAMFixtureSelectionEngine.js";

const engine = new CAMFixtureSelectionEngine();

const RECT_SMALL: StockGeometry = { shape: "rectangular_block", bbox: { x: 80,  y: 60,  z: 25 } };
const RECT_MED:   StockGeometry = { shape: "rectangular_block", bbox: { x: 180, y: 120, z: 50 } };
const RECT_LARGE: StockGeometry = { shape: "rectangular_block", bbox: { x: 500, y: 400, z: 80 } };
const ROUND_SMALL:StockGeometry = { shape: "round_bar",         bbox: { x: 30,  y: 30,  z: 150 } };
const ROUND_BIG:  StockGeometry = { shape: "round_bar",         bbox: { x: 120, y: 120, z: 300 } };
const CASTING:    StockGeometry = { shape: "casting_near_net",  bbox: { x: 200, y: 150, z: 100 } };
const THIN_PLATE: StockGeometry = { shape: "thin_plate",        bbox: { x: 400, y: 300, z: 3 } };
const COMP_PLATE: StockGeometry = { shape: "composite_plate",   bbox: { x: 800, y: 500, z: 8 } };

describe("CAMFixtureSelectionEngine", () => {

  it("recommend wire EDM op → wedm_jig", () => {
    const r = engine.recommend(RECT_SMALL, "wedm_2axis", "wire_edm");
    expect(r?.family).toBe("wedm_jig");
  });

  it("recommend small round bar on lathe → chuck_collet", () => {
    const r = engine.recommend(ROUND_SMALL, "turn_rough", "lathe");
    expect(r?.family).toBe("chuck_collet");
  });

  it("recommend large round bar on lathe → chuck_3jaw", () => {
    const r = engine.recommend(ROUND_BIG, "turn_rough", "lathe");
    expect(r?.family).toBe("chuck_3jaw");
  });

  it("recommend casting on lathe → chuck_4jaw", () => {
    const r = engine.recommend(CASTING, "turn_rough", "lathe");
    expect(r?.family).toBe("chuck_4jaw");
  });

  it("recommend 5-axis op → trunnion_table", () => {
    const r = engine.recommend(RECT_MED, "swarf_5axis", "vmc_5axis");
    expect(r?.family).toBe("trunnion_table");
  });

  it("recommend HMC op → tombstone", () => {
    const r = engine.recommend(RECT_MED, "face", "hmc");
    expect(r?.family).toBe("tombstone");
  });

  it("recommend thin plate on 3-axis → vacuum_table", () => {
    const r = engine.recommend(THIN_PLATE, "face", "vmc_3axis");
    expect(r?.family).toBe("vacuum_table");
  });

  it("recommend composite plate → vacuum_table", () => {
    const r = engine.recommend(COMP_PLATE, "contour_2d", "vmc_3axis");
    expect(r?.family).toBe("vacuum_table");
  });

  it("recommend small rect block on 3-axis → vise_precision", () => {
    const r = engine.recommend(RECT_SMALL, "face", "vmc_3axis");
    expect(r?.family).toBe("vise_precision");
    expect(r?.capacityMm).toBe(150);
  });

  it("recommend medium rect block on 3-axis → vise_precision 8\"", () => {
    const r = engine.recommend(RECT_MED, "face", "vmc_3axis");
    expect(r?.family).toBe("vise_precision");
    expect(r?.capacityMm).toBe(200);
  });

  it("recommend large block on 3-axis → edge_clamps", () => {
    const r = engine.recommend(RECT_LARGE, "face", "vmc_3axis");
    expect(r?.family).toBe("edge_clamps");
  });

  it("select picks matching family AND fitting size", () => {
    const inv: ShopFixtureEntry[] = [
      { id: "VISE_6", family: "vise_precision", capacityMm: 150, minSizeMm: 5 },
      { id: "VISE_8", family: "vise_precision", capacityMm: 200, minSizeMm: 5 },
    ];
    const r = engine.select(RECT_SMALL, "face", "vmc_3axis", inv);
    expect(r.bestFixtureId).toBe("VISE_6");
  });

  it("select rejects over-capacity fixtures", () => {
    const inv: ShopFixtureEntry[] = [
      { id: "VISE_SMALL", family: "vise_precision", capacityMm: 50, minSizeMm: 5 },
    ];
    const r = engine.select(RECT_LARGE, "face", "vmc_3axis", inv);
    expect(r.bestFixtureId).toBeNull();
    expect(r.recommendedSpec?.family).toBe("edge_clamps");
  });

  it("select prefers available over busy fixtures", () => {
    const inv: ShopFixtureEntry[] = [
      { id: "VISE_BUSY", family: "vise_precision", capacityMm: 200, minSizeMm: 5, busy: true },
      { id: "VISE_FREE", family: "vise_precision", capacityMm: 200, minSizeMm: 5, busy: false },
    ];
    const r = engine.select(RECT_SMALL, "face", "vmc_3axis", inv);
    expect(r.bestFixtureId).toBe("VISE_FREE");
  });

  it("select returns null + recommendedSpec when no family match", () => {
    const inv: ShopFixtureEntry[] = [
      { id: "MAG", family: "magnetic_plate", capacityMm: 1000, minSizeMm: 50 },
    ];
    const r = engine.select(ROUND_BIG, "turn_rough", "lathe", inv);
    expect(r.bestFixtureId).toBeNull();
    expect(r.recommendedSpec?.family).toBe("chuck_3jaw");
  });

  it("candidates always sorted by descending score", () => {
    const inv: ShopFixtureEntry[] = [
      { id: "EDGE",     family: "edge_clamps",     capacityMm: 2000, minSizeMm: 100 },
      { id: "VISE_OK",  family: "vise_precision",  capacityMm: 200,  minSizeMm: 5 },
      { id: "VAC",      family: "vacuum_table",    capacityMm: 1000, minSizeMm: 50 },
    ];
    const r = engine.select(RECT_SMALL, "face", "vmc_3axis", inv);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it("families() returns all 16 FixtureFamily values", () => {
    const f = engine.families();
    expect(f.length).toBe(16);
    expect(f).toContain("vise_precision");
    expect(f).toContain("chuck_4jaw");
    expect(f).toContain("trunnion_table");
    expect(f).toContain("wedm_jig");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes recommend + select + families", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("recommend");
    expect(names).toContain("select");
    expect(names).toContain("families");
  });

  it("recommendation rationale string is non-empty + informative", () => {
    const r = engine.recommend(ROUND_SMALL, "turn_rough", "lathe");
    expect(r?.rationale.length).toBeGreaterThan(10);
    expect(r?.rationale).toMatch(/collet|concentricity/i);
  });
});
