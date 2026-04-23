/**
 * LathePartoffSafetyRailEngine tests
 * LATHE-PROD-READY-MS0 / U-LPR-PARTOFF-RAIL
 */
import { describe, it, expect } from "vitest";
import {
  LathePartoffSafetyRailEngine,
  lathePartoffSafetyRailEngine,
  type PartoffOpSpec,
} from "../../engines/LathePartoffSafetyRailEngine.js";

// A safe baseline op. Every gate passes when this is evaluated.
const SAFE_OP: PartoffOpSpec = {
  part_diameter_mm: 20,
  parting_width_mm: 3,
  tool_overhang_mm: 7, // L/D = 2.33 — under warn threshold
  spindle_rpm: 2000,    // 20mm × π × 2000 / 304.8 ≈ 412 SFM
  feed_mm_per_rev: 0.08,
  material_uts_mpa: 400, // below chip-breaker threshold
  workholding_type: "collet",
  chip_clearance_mm: 10, // 10/3 = 3.33 — well over warn threshold
  has_subspindle_purge: true,
  chip_breaker: "groove",
};

describe("LathePartoffSafetyRailEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(lathePartoffSafetyRailEngine).toBeInstanceOf(LathePartoffSafetyRailEngine);
  });

  it("a fully safe op passes all 7 gates", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate(SAFE_OP);
    expect(v.passed).toBe(true);
    expect(v.gates).toHaveLength(7);
    expect(v.violations).toEqual([]);
    expect(v.advisories).toEqual([]);
    expect(v.summary).toMatch(/All parting-off safety gates passed/);
  });

  it("every evaluation returns 7 gates regardless of violations", () => {
    const e = new LathePartoffSafetyRailEngine();
    // Inject violations across multiple severities
    const v = e.evaluate({
      ...SAFE_OP,
      tool_overhang_mm: 30, // L/D = 10, hard block
      feed_mm_per_rev: 0.30, // hard block
    });
    expect(v.gates).toHaveLength(7);
  });

  it("hard-block on excessive tool overhang blocks the operation", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, tool_overhang_mm: 15 }); // L/D = 5 > 4
    expect(v.passed).toBe(false);
    const overhang = v.gates.find((g) => g.name === "tool_overhang_ratio");
    expect(overhang?.severity).toBe("hard_block");
    expect(overhang?.passed).toBe(false);
    expect(v.summary).toMatch(/BLOCKED/);
  });

  it("warn on borderline tool overhang does NOT block", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, tool_overhang_mm: 10.5 }); // L/D = 3.5 warn
    expect(v.passed).toBe(true); // warn does not block
    const overhang = v.gates.find((g) => g.name === "tool_overhang_ratio");
    expect(overhang?.severity).toBe("warn");
    expect(overhang?.passed).toBe(false);
    expect(v.advisories.map((a) => a.name)).toContain("tool_overhang_ratio");
  });

  it("hard-block on reckless surface speed", () => {
    const e = new LathePartoffSafetyRailEngine();
    // 20mm × π × rpm / 304.8 > 1200  →  rpm > ~5821
    const v = e.evaluate({ ...SAFE_OP, spindle_rpm: 6000 });
    expect(v.passed).toBe(false);
    const sfm = v.gates.find((g) => g.name === "surface_speed_sfm");
    expect(sfm?.severity).toBe("hard_block");
    expect(sfm?.passed).toBe(false);
  });

  it("warn on elevated SFM passes overall but shows advisory", () => {
    const e = new LathePartoffSafetyRailEngine();
    // SFM between 800 and 1200
    const v = e.evaluate({ ...SAFE_OP, spindle_rpm: 4500 }); // ~927 SFM
    expect(v.passed).toBe(true);
    const sfm = v.gates.find((g) => g.name === "surface_speed_sfm");
    expect(sfm?.severity).toBe("warn");
    expect(sfm?.passed).toBe(false);
  });

  it("hard-block on excessive feed per rev", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, feed_mm_per_rev: 0.35 });
    expect(v.passed).toBe(false);
    const feed = v.gates.find((g) => g.name === "feed_per_rev");
    expect(feed?.severity).toBe("hard_block");
    expect(feed?.passed).toBe(false);
  });

  it("hard-block on insufficient chip clearance", () => {
    const e = new LathePartoffSafetyRailEngine();
    // clearance/width = 1 — below hard_block threshold of 1.5
    const v = e.evaluate({ ...SAFE_OP, chip_clearance_mm: 3 });
    expect(v.passed).toBe(false);
    const clr = v.gates.find((g) => g.name === "chip_clearance");
    expect(clr?.severity).toBe("hard_block");
    expect(clr?.passed).toBe(false);
  });

  it("warn on marginal chip clearance does not block", () => {
    const e = new LathePartoffSafetyRailEngine();
    // clearance/width = 2 — between hard_block (1.5) and warn (2.5)
    const v = e.evaluate({ ...SAFE_OP, chip_clearance_mm: 6 });
    expect(v.passed).toBe(true);
    const clr = v.gates.find((g) => g.name === "chip_clearance");
    expect(clr?.severity).toBe("warn");
    expect(clr?.passed).toBe(false);
  });

  it("warn on missing chip breaker for high-UTS material", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, material_uts_mpa: 800, chip_breaker: "none" });
    expect(v.passed).toBe(true); // warn does not block
    const cb = v.gates.find((g) => g.name === "chip_breaker");
    expect(cb?.passed).toBe(false);
    expect(cb?.severity).toBe("warn");
  });

  it("passes chip-breaker gate when UTS is low enough to not require one", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, material_uts_mpa: 400, chip_breaker: "none" });
    const cb = v.gates.find((g) => g.name === "chip_breaker");
    expect(cb?.passed).toBe(true);
  });

  it("warn when bar puller used on large diameter", () => {
    const e = new LathePartoffSafetyRailEngine();
    // At D=80, SFM = π × 80 × rpm / 304.8 must stay < 800 (warn) ⇒ rpm < ~970.
    // Drop RPM to 400 so SFM ~330 — well inside the safe zone — isolating the
    // workholding gate as the only advisory.
    const v = e.evaluate({
      ...SAFE_OP,
      workholding_type: "bar_puller",
      part_diameter_mm: 80,
      spindle_rpm: 400,
    });
    expect(v.passed).toBe(true); // warn, not block
    const wh = v.gates.find((g) => g.name === "workholding_adequacy");
    expect(wh?.passed).toBe(false);
    expect(wh?.severity).toBe("warn");
  });

  it("info advisory when sub-spindle lacks purge plan", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({
      ...SAFE_OP,
      workholding_type: "sub_spindle",
      has_subspindle_purge: false,
    });
    expect(v.passed).toBe(true);
    const sp = v.gates.find((g) => g.name === "subspindle_purge");
    expect(sp?.passed).toBe(false);
    expect(sp?.severity).toBe("info");
  });

  it("multiple hard-blocks list all blocking gates in summary", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({
      ...SAFE_OP,
      tool_overhang_mm: 20, // hard block
      feed_mm_per_rev: 0.30, // hard block
      chip_clearance_mm: 3, // hard block
    });
    expect(v.passed).toBe(false);
    const blocks = v.violations.filter((g) => g.severity === "hard_block");
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    // summary should mention a count
    expect(v.summary).toMatch(/BLOCKED by \d+ hard gate/);
  });

  it("violations[] is exactly the union of failed gates", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({
      ...SAFE_OP,
      tool_overhang_mm: 15,          // hard
      material_uts_mpa: 800,         // warn (no chip breaker)
      chip_breaker: "none",
    });
    const failed = v.gates.filter((g) => !g.passed);
    expect(v.violations.map((x) => x.name).sort()).toEqual(failed.map((x) => x.name).sort());
  });

  it("advisories excludes hard-block violations", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({
      ...SAFE_OP,
      tool_overhang_mm: 15,          // hard
      material_uts_mpa: 800,         // warn
      chip_breaker: "none",
    });
    const hardBlocks = v.violations.filter((g) => g.severity === "hard_block");
    expect(hardBlocks.length).toBeGreaterThan(0);
    for (const a of v.advisories) {
      expect(a.severity).not.toBe("hard_block");
    }
  });

  it("rejects zero / negative numeric inputs", () => {
    const e = new LathePartoffSafetyRailEngine();
    expect(() => e.evaluate({ ...SAFE_OP, part_diameter_mm: 0 })).toThrow(/must be a positive/);
    expect(() => e.evaluate({ ...SAFE_OP, spindle_rpm: -100 })).toThrow(/must be a positive/);
    expect(() => e.evaluate({ ...SAFE_OP, feed_mm_per_rev: 0 })).toThrow(/must be a positive/);
  });

  it("rejects NaN / Infinity inputs", () => {
    const e = new LathePartoffSafetyRailEngine();
    expect(() => e.evaluate({ ...SAFE_OP, parting_width_mm: NaN })).toThrow(/must be a positive finite/);
    expect(() =>
      e.evaluate({ ...SAFE_OP, tool_overhang_mm: Infinity }),
    ).toThrow(/must be a positive finite/);
  });

  it("gate threshold values are reported for debuggability", () => {
    const e = new LathePartoffSafetyRailEngine();
    const v = e.evaluate({ ...SAFE_OP, tool_overhang_mm: 15 });
    const g = v.gates.find((x) => x.name === "tool_overhang_ratio");
    expect(typeof g?.value).toBe("number");
    expect(typeof g?.threshold).toBe("number");
    expect(g?.value! > g!.threshold!).toBe(true);
  });

  it("evaluate is deterministic — same input produces same verdict", () => {
    const e = new LathePartoffSafetyRailEngine();
    const a = e.evaluate(SAFE_OP);
    const b = e.evaluate(SAFE_OP);
    expect(a.passed).toBe(b.passed);
    expect(a.gates.length).toBe(b.gates.length);
    for (let i = 0; i < a.gates.length; i++) {
      expect(a.gates[i].name).toBe(b.gates[i].name);
      expect(a.gates[i].passed).toBe(b.gates[i].passed);
    }
  });

  it("gate order is stable across calls", () => {
    const e = new LathePartoffSafetyRailEngine();
    const names = e.evaluate(SAFE_OP).gates.map((g) => g.name);
    const expected = [
      "tool_overhang_ratio",
      "surface_speed_sfm",
      "feed_per_rev",
      "chip_clearance",
      "chip_breaker",
      "workholding_adequacy",
      "subspindle_purge",
    ];
    expect(names).toEqual(expected);
  });
});
