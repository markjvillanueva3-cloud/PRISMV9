/**
 * WEDMAnalogicalReasoningEngine Tests — WEDM AGI Phase 2 / U-P2-12
 *
 * Exit gate: retrieval returns ≥5 similar cases in <50 ms against the
 * shipped 24-case JM Die seed base. Also verifies:
 *   - identity query returns the exact case at similarity 1
 *   - exact material beats same-family beats unrelated material
 *   - thickness/perimeter/Ra relative-error components behave
 *   - weight overrides re-rank the result set
 *   - top_n bound respected; addCase validates & appends
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMAnalogicalReasoningEngine,
  wedmAnalogicalReasoningEngine,
  type WEDMCaseRecord,
} from "../../engines/WEDMAnalogicalReasoningEngine.js";

let engine: WEDMAnalogicalReasoningEngine;

beforeEach(() => {
  engine = new WEDMAnalogicalReasoningEngine();
});

describe("WEDMAnalogicalReasoningEngine — exit gate", () => {
  it("returns ≥5 similar cases in <50 ms for a standard query", () => {
    const r = engine.retrieve({
      material: "D2",
      thickness_mm: 15,
      perimeter_mm: 180,
      ra_target_um: 1.6,
      mrr_class: "medium",
      top_n: 5,
    });
    expect(r.matches.length).toBe(5);
    expect(r.elapsed_ms).toBeLessThan(50);
    expect(r.case_base_size).toBeGreaterThanOrEqual(24);
  });

  it("case base ships at least 24 seeded cases", () => {
    expect(engine.size()).toBeGreaterThanOrEqual(24);
  });
});

describe("WEDMAnalogicalReasoningEngine — similarity correctness", () => {
  it("identity query against a seed case returns similarity ≈ 1", () => {
    const seeds = engine.allCases();
    const target = seeds.find((c) => c.id === "jmd-D2-plate-12-finish")!;
    const r = engine.retrieve({
      material: target.material,
      thickness_mm: target.thickness_mm,
      perimeter_mm: target.perimeter_mm,
      ra_target_um: target.ra_target_um,
      mrr_class: target.mrr_class,
      top_n: 1,
    });
    expect(r.matches[0].case.id).toBe(target.id);
    expect(r.matches[0].similarity).toBeCloseTo(1, 5);
  });

  it("exact-material case outranks same-family (D2 vs A2) at matching geometry", () => {
    // Fresh engine, no seeds — ranking is unambiguous.
    const core: Omit<WEDMCaseRecord, "id" | "material"> = {
      thickness_mm: 15,
      perimeter_mm: 320,
      ra_target_um: 2.0,
      mrr_class: "medium",
      parameters: {
        peak_current_A: 8,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_tension_N: 12,
      },
      outcome: "success",
    };
    const local = new WEDMAnalogicalReasoningEngine({ seeded: false });
    local.addCase({ ...core, id: "twin-A2", material: "A2" });
    local.addCase({ ...core, id: "twin-D2", material: "D2" });
    const r = local.retrieve({
      material: "A2",
      thickness_mm: core.thickness_mm,
      perimeter_mm: core.perimeter_mm,
      ra_target_um: core.ra_target_um,
      mrr_class: core.mrr_class,
      top_n: 2,
    });
    // The top match should be the exact-material twin.
    const [first, second] = r.matches;
    expect(first.case.id).toBe("twin-A2");
    expect(second.case.id).toBe("twin-D2");
    expect(first.similarity).toBeGreaterThan(second.similarity);
    // Same-family (cold_tool_steel) soft match = 0.5 → still >> unrelated.
    expect(second.distance_components.material).toBeCloseTo(0.5, 6);
  });

  it("same-family case outranks an unrelated-material case", () => {
    const local = new WEDMAnalogicalReasoningEngine({ seeded: false });
    const core = {
      thickness_mm: 15,
      perimeter_mm: 200,
      ra_target_um: 1.6,
      mrr_class: "medium" as const,
      parameters: {
        peak_current_A: 8,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_tension_N: 12,
      },
      outcome: "success" as const,
    };
    local.addCase({ ...core, id: "family-A2", material: "A2" });
    local.addCase({ ...core, id: "alien-WC", material: "WC" });
    const r = local.retrieve({
      material: "D2",
      thickness_mm: core.thickness_mm,
      perimeter_mm: core.perimeter_mm,
      ra_target_um: core.ra_target_um,
      mrr_class: core.mrr_class,
      top_n: 2,
    });
    expect(r.matches[0].case.id).toBe("family-A2");
    expect(r.matches[1].case.id).toBe("alien-WC");
    expect(r.matches[0].distance_components.material).toBeCloseTo(0.5, 6);
    expect(r.matches[1].distance_components.material).toBeCloseTo(1, 6);
  });

  it("larger thickness delta increases the thickness distance component", () => {
    const r = engine.retrieve({
      material: "D2",
      thickness_mm: 50,
      perimeter_mm: 200,
      top_n: 5,
    });
    // There's a D2 50-mm extrude case — it should be near the top, with
    // tiny thickness distance.
    const extrude = r.matches.find((m) => m.case.id === "jmd-extrude-D2-50");
    expect(extrude).toBeDefined();
    expect(extrude!.distance_components.thickness).toBeLessThan(0.05);
  });
});

describe("WEDMAnalogicalReasoningEngine — weight overrides", () => {
  it("zeroing thickness weight lets a geometry-distant same-material case tie", () => {
    const local = new WEDMAnalogicalReasoningEngine({ seeded: false });
    local.addCase({
      id: "thin-D2",
      material: "D2",
      thickness_mm: 2,
      perimeter_mm: 200,
      ra_target_um: 1.6,
      mrr_class: "medium",
      parameters: {
        peak_current_A: 8,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_tension_N: 12,
      },
      outcome: "success",
    });
    local.addCase({
      id: "thick-D2",
      material: "D2",
      thickness_mm: 50,
      perimeter_mm: 200,
      ra_target_um: 1.6,
      mrr_class: "medium",
      parameters: {
        peak_current_A: 8,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_tension_N: 12,
      },
      outcome: "success",
    });
    const withThickness = local.retrieve({
      material: "D2",
      thickness_mm: 50,
      perimeter_mm: 200,
      ra_target_um: 1.6,
      mrr_class: "medium",
      top_n: 2,
    });
    expect(withThickness.matches[0].case.id).toBe("thick-D2");
    const ignoreThickness = local.retrieve({
      material: "D2",
      thickness_mm: 50,
      perimeter_mm: 200,
      ra_target_um: 1.6,
      mrr_class: "medium",
      top_n: 2,
      weights: { thickness: 0 },
    });
    // When thickness is ignored, both cases have identical similarity.
    expect(ignoreThickness.matches[0].similarity).toBeCloseTo(
      ignoreThickness.matches[1].similarity,
      6,
    );
  });
});

describe("WEDMAnalogicalReasoningEngine — top_n handling", () => {
  it("returns exactly top_n matches when requested", () => {
    const r = engine.retrieve({
      material: "H13",
      thickness_mm: 30,
      perimeter_mm: 250,
      top_n: 3,
    });
    expect(r.matches.length).toBe(3);
  });

  it("top_n defaults to 5 when omitted", () => {
    const r = engine.retrieve({
      material: "D2",
      thickness_mm: 10,
      perimeter_mm: 100,
    });
    expect(r.matches.length).toBe(5);
  });

  it("matches are sorted by descending similarity", () => {
    const r = engine.retrieve({
      material: "WC",
      thickness_mm: 8,
      perimeter_mm: 60,
      top_n: 5,
    });
    for (let i = 1; i < r.matches.length; i++) {
      expect(r.matches[i - 1].similarity).toBeGreaterThanOrEqual(
        r.matches[i].similarity,
      );
    }
  });
});

describe("WEDMAnalogicalReasoningEngine — addCase", () => {
  it("adds a new case to the retrieval base", () => {
    const before = engine.size();
    engine.addCase({
      id: "local-custom-1",
      material: "D2",
      thickness_mm: 12,
      perimeter_mm: 160,
      ra_target_um: 1.6,
      mrr_class: "medium",
      parameters: {
        peak_current_A: 8,
        pulse_on_us: 10,
        pulse_off_us: 20,
        wire_tension_N: 12,
      },
      outcome: "success",
    });
    expect(engine.size()).toBe(before + 1);
  });

  it("rejects a duplicate case id", () => {
    expect(() =>
      engine.addCase({
        id: "jmd-D2-plate-12-finish", // already seeded
        material: "D2",
        thickness_mm: 12,
        perimeter_mm: 160,
        ra_target_um: 1.6,
        mrr_class: "medium",
        parameters: {
          peak_current_A: 8,
          pulse_on_us: 10,
          pulse_off_us: 20,
          wire_tension_N: 12,
        },
        outcome: "success",
      }),
    ).toThrow(/duplicate/);
  });

  it("rejects a case with missing id", () => {
    expect(() =>
      engine.addCase({
        id: "",
        material: "D2",
        thickness_mm: 12,
        perimeter_mm: 160,
        ra_target_um: 1.6,
        mrr_class: "medium",
        parameters: {
          peak_current_A: 8,
          pulse_on_us: 10,
          pulse_off_us: 20,
          wire_tension_N: 12,
        },
        outcome: "success",
      }),
    ).toThrow(/id/);
  });
});

describe("WEDMAnalogicalReasoningEngine — validation", () => {
  it("rejects non-positive thickness", () => {
    expect(() =>
      engine.retrieve({ material: "D2", thickness_mm: 0, perimeter_mm: 100 }),
    ).toThrow(/thickness_mm/);
  });

  it("rejects non-positive perimeter", () => {
    expect(() =>
      engine.retrieve({ material: "D2", thickness_mm: 10, perimeter_mm: -5 }),
    ).toThrow(/perimeter_mm/);
  });

  it("rejects non-positive ra_target", () => {
    expect(() =>
      engine.retrieve({
        material: "D2",
        thickness_mm: 10,
        perimeter_mm: 100,
        ra_target_um: 0,
      }),
    ).toThrow(/ra_target_um/);
  });

  it("rejects top_n < 1", () => {
    expect(() =>
      engine.retrieve({
        material: "D2",
        thickness_mm: 10,
        perimeter_mm: 100,
        top_n: 0,
      }),
    ).toThrow(/top_n/);
  });
});

describe("WEDMAnalogicalReasoningEngine — allCases snapshot", () => {
  it("returns a defensive copy of the case base", () => {
    const snap = engine.allCases();
    snap.length = 0;
    expect(engine.size()).toBeGreaterThanOrEqual(24);
  });
});

describe("WEDMAnalogicalReasoningEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmAnalogicalReasoningEngine).toBeInstanceOf(
      WEDMAnalogicalReasoningEngine,
    );
  });
});
