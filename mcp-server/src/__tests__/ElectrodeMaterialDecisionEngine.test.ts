/**
 * Tests for ElectrodeMaterialDecisionEngine — sinker-EDM electrode-material
 * selection (ARC-MS6 / muS-C21).
 *
 * Scoring model (hand-derived in every assertion below):
 *   score = WEAR_BASE_SCORE(50) − wear_ratio[mat][workpiece_class]
 *         + workpiece_class_bonus
 *         + feature/process bonuses (HRC, Ra, sharp corners, deep ribs,
 *           aspect, num_cavities, cost_priority)
 *
 * Canonical default (D2 tool steel, HRC=55, Ra=1.6, balanced cost):
 *   graphite_fine   : 50 − 15 + 15 = 50  ← top
 *   copper_tungsten : 50 −  8 +  5 = 47
 *   graphite_std    : 50 − 25 +  0 = 25
 *   tellurium_copper: 50 − 30 +  0 = 20
 *   copper          : 50 − 35 +  0 = 15
 * confidence = (50 − 47) / (50 − 15) = 3/35 ≈ 0.09
 */

import { describe, it, expect } from "vitest";
import {
  ElectrodeMaterialDecisionEngine,
  electrodeMaterialDecisionEngine,
} from "../engines/ElectrodeMaterialDecisionEngine.js";

describe("ElectrodeMaterialDecisionEngine — canonical default (tool steel)", () => {
  it("picks graphite_fine for D2 tool steel with default inputs", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    expect(r.workpiece_class).toBe("tool_steel");
    expect(r.recommended.material).toBe("graphite_fine");
    expect(r.recommended.rank).toBe(1);
    expect(r.recommended.score).toBeCloseTo(50, 2);
    expect(r.recommended.estimated_wear_ratio_pct).toBe(15);
    expect(r.alternatives[0].material).toBe("copper_tungsten");
    expect(r.alternatives[0].score).toBeCloseTo(47, 2);
    expect(r.confidence).toBeCloseTo(0.09, 2);
  });

  it("returns exactly 4 alternatives ranked 2..5 with strictly non-increasing score", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    expect(r.alternatives).toHaveLength(4);
    expect(r.alternatives.map((a) => a.rank)).toEqual([2, 3, 4, 5]);
    for (let i = 1; i < r.alternatives.length; i++) {
      expect(r.alternatives[i - 1].score).toBeGreaterThanOrEqual(
        r.alternatives[i].score,
      );
    }
  });

  it("records the default-applied notes when optional fields are omitted", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    expect(r.notes.some((n) => n.includes("HRC defaulted"))).toBe(true);
    expect(r.notes.some((n) => n.includes("Ra target defaulted"))).toBe(true);
    expect(r.notes.some((n) => n.includes("cost_priority defaulted"))).toBe(true);
  });
});

describe("ElectrodeMaterialDecisionEngine — workpiece-class affinity", () => {
  it("picks copper_tungsten for tungsten carbide (highest affinity)", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "WC-Co cemented carbide",
    });
    expect(r.workpiece_class).toBe("carbide");
    expect(r.recommended.material).toBe("copper_tungsten");
    // 50 − 15 (CuW carbide wear) + 30 (carbide affinity) = 65
    expect(r.recommended.score).toBeCloseTo(65, 2);
    // graphite_std penalty −15 puts it below copper/tellurium_copper.
    expect(r.alternatives.find((a) => a.material === "graphite_std")!.score).toBeCloseTo(-5, 2);
  });

  it("ranks copper LAST on copper-alloy workpiece (Cu-on-Cu sticks)", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "C360 brass",
    });
    expect(r.workpiece_class).toBe("copper_alloy");
    expect(r.recommended.material).toBe("graphite_fine");
    // 50 − 22 + 15 = 43
    expect(r.recommended.score).toBeCloseTo(43, 2);
    const last = r.alternatives[r.alternatives.length - 1];
    expect(last.material).toBe("copper");
    // 50 − 60 − 25 = -35
    expect(last.score).toBeCloseTo(-35, 2);
  });

  it("normalizes diverse free-text workpiece strings into the right class", () => {
    const cases: Array<[string, string]> = [
      ["Inconel 718", "inconel"],
      ["Ti-6Al-4V titanium", "titanium"],
      ["17-4 PH stainless", "stainless"],
      ["6061-T6 aluminum", "aluminum"],
      ["C360 brass", "copper_alloy"],
      ["D2 tool steel", "tool_steel"],
      ["WC-Co cemented carbide", "carbide"],
    ];
    for (const [input, expectedClass] of cases) {
      const r = electrodeMaterialDecisionEngine.decide({
        workpiece_material: input,
      });
      expect(r.workpiece_class).toBe(expectedClass);
    }
  });

  it("falls through to tool_steel for an unknown material and notes the fallback", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "unknown material XYZ",
    });
    expect(r.workpiece_class).toBe("tool_steel");
    expect(r.notes.some((n) => n.includes("did not match any known class"))).toBe(true);
  });
});

describe("ElectrodeMaterialDecisionEngine — feature & process modifiers", () => {
  it("favours copper_tungsten when sharp corners AND deep ribs are flagged", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      has_sharp_corners: true,
      has_deep_ribs: true,
    });
    expect(r.recommended.material).toBe("copper_tungsten");
    // 50 − 8 + 5 (tool_steel) + 15 (sharp corners) + 20 (deep ribs) = 82
    expect(r.recommended.score).toBeCloseTo(82, 2);
  });

  it("flips the top pick to copper_tungsten when Ra target is below 0.4 µm", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      surface_finish_target_Ra_um: 0.2,
    });
    // CuW gets +10 for fine Ra, graphite_fine gets -5 → CuW jumps ahead.
    expect(r.recommended.material).toBe("copper_tungsten");
    // 50 − 8 + 5 (tool_steel) + 10 (Ra) = 57
    expect(r.recommended.score).toBeCloseTo(57, 2);
  });

  it("adds the HRC>55 bonus to graphite_fine and copper_tungsten only", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      workpiece_hardness_HRC: 62,
    });
    const fine = r.recommended.material === "graphite_fine"
      ? r.recommended
      : r.alternatives.find((a) => a.material === "graphite_fine")!;
    const cuw =
      r.recommended.material === "copper_tungsten"
        ? r.recommended
        : r.alternatives.find((a) => a.material === "copper_tungsten")!;
    // graphite_fine 50 + 5 = 55; CuW 47 + 5 = 52.
    expect(fine.score).toBeCloseTo(55, 2);
    expect(cuw.score).toBeCloseTo(52, 2);
    expect(r.recommended.material).toBe("graphite_fine"); // graphite still wins
  });

  it("amortises copper_tungsten cost across >5 cavities", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      num_cavities: 10,
    });
    // CuW +10, graphite_std -5; CuW 47+10=57 beats graphite_fine 50.
    expect(r.recommended.material).toBe("copper_tungsten");
    expect(r.recommended.score).toBeCloseTo(57, 2);
  });

  it("rewards deep aspect-ratio cavities (depth/width > 3)", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      cavity_depth_mm: 30,
      cavity_width_mm: 8, // aspect = 3.75 > 3
    });
    // graphite_fine 50+5=55; CuW 47+10=57 → CuW takes the lead.
    expect(r.recommended.material).toBe("copper_tungsten");
    expect(r.recommended.score).toBeCloseTo(57, 2);
  });
});

describe("ElectrodeMaterialDecisionEngine — cost priority", () => {
  it("performance priority pushes copper_tungsten above graphite_fine on tool steel", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      cost_priority: "performance",
    });
    // CuW 47+15=62 ; graphite_fine 50+10=60.
    expect(r.recommended.material).toBe("copper_tungsten");
    expect(r.recommended.score).toBeCloseTo(62, 2);
  });

  it("low_cost priority keeps copper_tungsten top on carbide but slashes its score by 30", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "WC-Co cemented carbide",
      cost_priority: "low_cost",
    });
    // CuW 65 − 30 = 35 still beats copper 10+10=20 and graphite_fine 20.
    expect(r.recommended.material).toBe("copper_tungsten");
    expect(r.recommended.score).toBeCloseTo(35, 2);
  });
});

describe("ElectrodeMaterialDecisionEngine — confidence model", () => {
  it("returns confidence in [0,1] with high values on dominant winners", () => {
    const dominant = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
      has_sharp_corners: true,
      has_deep_ribs: true, // CuW pulls a 32-point lead
    });
    const tight = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel", // canonical — 3-point margin
    });
    expect(dominant.confidence).toBeGreaterThan(tight.confidence);
    expect(dominant.confidence).toBeGreaterThanOrEqual(0);
    expect(dominant.confidence).toBeLessThanOrEqual(1);
    expect(tight.confidence).toBeCloseTo(0.09, 2);
  });
});

describe("ElectrodeMaterialDecisionEngine — determinism & shape", () => {
  it("is deterministic — identical input yields identical output", () => {
    const a = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    const b = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    expect(a).toEqual(b);
  });

  it("works through a freshly constructed instance, not only the singleton", () => {
    const fresh = new ElectrodeMaterialDecisionEngine();
    const r = fresh.decide({ workpiece_material: "D2 tool steel" });
    expect(r.recommended.material).toBe("graphite_fine");
  });

  it("includes at least one rationale line per ranked material", () => {
    const r = electrodeMaterialDecisionEngine.decide({
      workpiece_material: "D2 tool steel",
    });
    for (const rec of [r.recommended, ...r.alternatives]) {
      expect(rec.rationale.length).toBeGreaterThanOrEqual(1);
      // The wear-ratio base line is always emitted.
      expect(rec.rationale[0]).toMatch(/wear ratio/);
    }
  });
});

describe("ElectrodeMaterialDecisionEngine — input validation", () => {
  it("rejects missing or empty workpiece_material with an engine-named error", () => {
    expect(() => electrodeMaterialDecisionEngine.decide({})).toThrow(
      /ElectrodeMaterialDecisionEngine: invalid input/,
    );
    expect(() =>
      electrodeMaterialDecisionEngine.decide({ workpiece_material: "" }),
    ).toThrow();
  });

  it("rejects out-of-range numeric inputs and unknown enum / keys", () => {
    expect(() =>
      electrodeMaterialDecisionEngine.decide({
        workpiece_material: "D2",
        workpiece_hardness_HRC: 90, // > 80 ceiling
      }),
    ).toThrow();
    expect(() =>
      electrodeMaterialDecisionEngine.decide({
        workpiece_material: "D2",
        cost_priority: "ultra" as never,
      }),
    ).toThrow();
    expect(() =>
      electrodeMaterialDecisionEngine.decide({
        workpiece_material: "D2",
        bogus_field: 1,
      }),
    ).toThrow();
  });
});
