import { describe, it, expect } from "vitest";
import {
  millBlockEngagementSimulatorEngine as eng,
  type MillBlockEngagementInput,
  type MillSimBlock,
} from "../engines/MillBlockEngagementSimulatorEngine.js";

function feedBlock(o: Partial<MillSimBlock> = {}): MillSimBlock {
  return {
    n: 100,
    motion: "feed",
    x_start_mm: 0, y_start_mm: 0, z_start_mm: 0,
    x_end_mm: 5, y_end_mm: 0, z_end_mm: -1,
    feed_mm_min: 1000,
    spindle_rpm: 10000,
    ...o,
  };
}

function input(blocks: MillSimBlock[], o: Partial<MillBlockEngagementInput> = {}): MillBlockEngagementInput {
  return {
    blocks,
    tool_diameter_mm: 10,
    flute_count: 4,
    ...o,
  };
}

describe("MillBlockEngagementSimulatorEngine", () => {
  it("getStats returns canonical reference + metrics list", () => {
    const s = eng.getStats();
    expect(s.reference).toMatch(/Sandvik.*Milling.*Application Guide|Kennametal/);
    expect(s.metrics_per_block).toEqual([
      "radial_engagement_mm", "axial_depth_mm", "chip_per_tooth_mm",
      "engagement_fraction", "mrr_mm3_s", "warning",
    ]);
    expect(s.peak_metrics).toEqual([
      "peak_mrr_mm3_s", "peak_ae_mm", "peak_ap_mm", "peak_engagement_fraction", "peak_fz_mm_tooth",
    ]);
  });

  it("throws when blocks array is missing", () => {
    expect(() => eng.simulate({} as never)).toThrow(/blocks\[\] required/);
  });

  it("throws when tool_diameter_mm <= 0", () => {
    expect(() => eng.simulate(input([feedBlock()], { tool_diameter_mm: 0 }))).toThrow(/tool_diameter_mm must be > 0/);
  });

  it("throws when flute_count <= 0", () => {
    expect(() => eng.simulate(input([feedBlock()], { flute_count: 0 }))).toThrow(/flute_count must be > 0/);
  });

  it("nominal feed block (dxy=5 < D=10, dz=1, feed=1000, rpm=10000, z=4) → exact ae/ap/fz/MRR", () => {
    const r = eng.simulate(input([feedBlock()]));
    expect(r.steps.length).toBe(1);
    const s = r.steps[0];
    expect(s.motion).toBe("feed");
    expect(s.radial_engagement_mm).toBe(5);       // dxy < D, ae = dxy
    expect(s.axial_depth_mm).toBe(1);              // dz
    expect(s.chip_per_tooth_mm).toBe(0.025);       // 1000 / (10000 * 4) = 0.025
    expect(s.engagement_fraction).toBe(0.5);       // ae/D = 5/10
    expect(s.mrr_mm3_s).toBeCloseTo(83.33, 1);     // ae*ap*feed/60 = 5*1*1000/60
    // engFrac=0.5 is in the safe band (>0.20, <0.95) so no warning fires
    expect(s.warning === undefined || s.warning === "").toBe(true);
  });

  it("dxy > D + default_ae specified → uses default_ae as engagement", () => {
    const block = feedBlock({ x_end_mm: 20, y_end_mm: 0 }); // dxy=20 > D=10
    const r = eng.simulate(input([block], { default_ae_mm: 3 }));
    const s = r.steps[0];
    expect(s.radial_engagement_mm).toBe(3);
    expect(s.engagement_fraction).toBe(0.3);
    expect(s.mrr_mm3_s).toBeCloseTo(50, 1); // 3 * 1 * 1000 / 60
  });

  it("dxy > D + no default_ae → conservative 50% engagement fallback", () => {
    const block = feedBlock({ x_end_mm: 20 });
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.radial_engagement_mm).toBe(5);  // D * 0.5 = 5
    expect(s.engagement_fraction).toBe(0.5);
  });

  it("rapid motion → no engagement, no MRR", () => {
    const block = feedBlock({ motion: "rapid" });
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.motion).toBe("rapid");
    expect(s.radial_engagement_mm).toBe(0);
    expect(s.axial_depth_mm).toBe(0);
    expect(s.mrr_mm3_s).toBe(0);
    expect(r.total_cutting_blocks).toBe(0);
  });

  it("dwell / tool_change / m_code motions → no engagement, no MRR", () => {
    const blocks = [
      feedBlock({ n: 1, motion: "dwell" }),
      feedBlock({ n: 2, motion: "tool_change", tool_id: "T1" }),
      feedBlock({ n: 3, motion: "m_code" }),
    ];
    const r = eng.simulate(input(blocks));
    expect(r.total_cutting_blocks).toBe(0);
    expect(r.steps.every(s => s.mrr_mm3_s === 0)).toBe(true);
  });

  it("near-full-radial engagement (slotting) → engFrac 0.95 + slotting warning", () => {
    const r = eng.simulate(input([feedBlock({ x_end_mm: 9.5 })])); // dxy=9.5 < D=10
    const s = r.steps[0];
    expect(s.radial_engagement_mm).toBe(9.5);
    expect(s.engagement_fraction).toBe(0.95);
    if (!s.warning) throw new Error("Expected slotting warning at engFrac=0.95");
    expect(s.warning).toMatch(/Full-radial engagement|slotting regime/);
  });

  it("low engagement (ae/D < 20%) → chip thinning warning per Sandvik", () => {
    const block = feedBlock({ x_end_mm: 1 }); // dxy=1, D=10 → engFrac=0.1
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.engagement_fraction).toBe(0.1);
    if (!s.warning) throw new Error("Expected chip-thinning warning at engFrac=0.1");
    expect(s.warning).toMatch(/Low engagement.*chip thinning/);
  });

  it("ap > tool diameter → high-deflection warning", () => {
    const block = feedBlock({ z_end_mm: -15 }); // dz=15 > D=10
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.axial_depth_mm).toBe(15);
    if (!s.warning) throw new Error("Expected ap > D warning");
    expect(s.warning).toMatch(/Axial depth.*exceeds tool diameter/);
  });

  it("fz > 0.30 → over-feed warning + global peak warning", () => {
    const block = feedBlock({ feed_mm_min: 20000 }); // fz = 20000 / (10000 * 4) = 0.5
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.chip_per_tooth_mm).toBe(0.5);
    if (!s.warning) throw new Error("Expected high-fz warning");
    expect(s.warning).toMatch(/High fz.*verify against tool manufacturer/);
    expect(r.warnings.some(w => /Peak fz.*beyond typical mill envelope/.test(w))).toBe(true);
  });

  it("peak metrics aggregate across multiple cutting blocks correctly", () => {
    const blocks = [
      feedBlock({ n: 1, x_end_mm: 2, z_end_mm: -0.5, feed_mm_min: 500, spindle_rpm: 10000 }), // ae=2, ap=0.5
      feedBlock({ n: 2, x_end_mm: 6, z_end_mm: -2, feed_mm_min: 2000, spindle_rpm: 8000 }),    // ae=6, ap=2, fz=2000/32000=0.0625
      feedBlock({ n: 3, x_end_mm: 4, z_end_mm: -1, feed_mm_min: 1500, spindle_rpm: 10000 }),   // ae=4, ap=1
    ];
    const r = eng.simulate(input(blocks));
    expect(r.peak_ae_mm).toBe(6);
    expect(r.peak_ap_mm).toBe(2);
    expect(r.peak_engagement_fraction).toBe(0.6);
    expect(r.peak_fz_mm_tooth).toBe(0.0625);
    // Peak MRR = ae * ap * feed / 60 = 6 * 2 * 2000 / 60 = 400
    expect(r.peak_mrr_mm3_s).toBeCloseTo(400, 1);
    expect(r.total_cutting_blocks).toBe(3);
  });

  it("Z-only plunge block (dxy=0, dz>0) counts as cutting via ap", () => {
    const block = feedBlock({
      x_start_mm: 0, x_end_mm: 0, y_start_mm: 0, y_end_mm: 0,
      z_start_mm: 0, z_end_mm: -2,
    });
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.radial_engagement_mm).toBe(0);
    expect(s.axial_depth_mm).toBe(2);
    expect(r.total_cutting_blocks).toBe(1);
  });

  it("reasoning string cites block counts + peak metrics", () => {
    const r = eng.simulate(input([feedBlock(), feedBlock({ n: 200, motion: "rapid" })]));
    expect(r.reasoning.length).toBe(2);
    expect(r.reasoning[0]).toMatch(/Simulated 2 blocks.*1 cutting/);
    expect(r.reasoning[1]).toMatch(/Peak ae=.*50% engagement.*MRR=83\.33/);
  });

  it("global warnings array fires when peak engagement >= 0.95", () => {
    const r = eng.simulate(input([feedBlock({ x_end_mm: 9.5 })]));
    expect(r.warnings.some(w => /Peak engagement.*slotting regime detected/.test(w))).toBe(true);
  });

  it("global warnings array fires when peak ap > tool diameter", () => {
    const r = eng.simulate(input([feedBlock({ z_end_mm: -20 })]));
    expect(r.warnings.some(w => /Peak ap=20.*exceeds tool diameter 10/.test(w))).toBe(true);
  });

  it("empty blocks array → empty result, zero peaks, no errors", () => {
    const r = eng.simulate(input([]));
    expect(r.steps).toEqual([]);
    expect(r.total_cutting_blocks).toBe(0);
    expect(r.peak_mrr_mm3_s).toBe(0);
    expect(r.peak_ae_mm).toBe(0);
    expect(r.peak_ap_mm).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it("missing feed_mm_min on feed block → fz=0 and MRR=0 (caller responsibility)", () => {
    const block = feedBlock({ feed_mm_min: undefined });
    const r = eng.simulate(input([block]));
    const s = r.steps[0];
    expect(s.chip_per_tooth_mm).toBe(0);
    expect(s.mrr_mm3_s).toBe(0);
  });

  it("missing spindle_rpm on feed block → fz=0 (cannot compute without rpm)", () => {
    const block = feedBlock({ spindle_rpm: undefined });
    const r = eng.simulate(input([block]));
    expect(r.steps[0].chip_per_tooth_mm).toBe(0);
  });
});
