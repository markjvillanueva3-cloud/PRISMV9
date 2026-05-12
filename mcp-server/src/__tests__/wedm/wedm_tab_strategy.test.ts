/**
 * WEDMTabStrategyEngine Tests — WEDM AGI Phase 2 / U-P2-10
 *
 * Exit gate: Tab strategy retains slugs on 100 % of internal features.
 * Every internal feature across the JM Die fixture set must receive ≥1
 * tab of viable width and valid perimeter-fraction position.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMTabStrategyEngine,
  wedmTabStrategyEngine,
} from "../../engines/WEDMTabStrategyEngine.js";
import type { PartFeature } from "../../engines/WEDMHierarchicalPlannerEngine.js";

const engine = new WEDMTabStrategyEngine();

// JM Die internal-feature fixture (hole, internal_profile, slot across a
// perimeter range that exercises every bucket of the auto-count table).
const JM_INTERNAL_FEATURES: PartFeature[] = [
  { id: "tiny-hole", kind: "hole", perimeter_mm: 10, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
  { id: "small-hole", kind: "hole", perimeter_mm: 25, tolerance_class: "precision", start_point: { x: 0, y: 0 } },
  { id: "med-slot", kind: "slot", perimeter_mm: 60, tolerance_class: "precision", start_point: { x: 0, y: 0 } },
  { id: "large-cavity", kind: "internal_profile", perimeter_mm: 140, tolerance_class: "mirror", start_point: { x: 0, y: 0 } },
  { id: "huge-profile", kind: "internal_profile", perimeter_mm: 300, tolerance_class: "mirror", start_point: { x: 0, y: 0 } },
];

describe("WEDMTabStrategyEngine — exit gate (100 % internal features get tabs)", () => {
  it("every internal feature in the JM Die fixture receives ≥1 tab", () => {
    const r = engine.planTabs({ features: JM_INTERNAL_FEATURES });
    for (const p of r.plans) {
      expect(p.is_internal).toBe(true);
      expect(p.tab_count, `feature ${p.feature_id}`).toBeGreaterThanOrEqual(1);
    }
    expect(r.stats.internal_features_with_tabs).toBe(
      r.stats.internal_features,
    );
  });

  it("mixed plan (external + internal) only tabs the internal features", () => {
    const features: PartFeature[] = [
      { id: "outer", kind: "external_profile", perimeter_mm: 500, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
      ...JM_INTERNAL_FEATURES,
    ];
    const r = engine.planTabs({ features });
    const outer = r.plans.find((p) => p.feature_id === "outer")!;
    expect(outer.is_internal).toBe(false);
    expect(outer.tab_count).toBe(0);
    for (const p of r.plans.filter((p) => p.is_internal)) {
      expect(p.tab_count).toBeGreaterThanOrEqual(1);
    }
    expect(r.stats.external_features).toBe(1);
    expect(r.stats.internal_features_with_tabs).toBe(5);
  });

  it("verify() returns valid=true for a clean JM Die plan", () => {
    const r = engine.planTabs({ features: JM_INTERNAL_FEATURES });
    const v = engine.verify(r);
    expect(v.valid).toBe(true);
    expect(v.violations).toEqual([]);
  });
});

describe("WEDMTabStrategyEngine — auto tab-count bands", () => {
  it("perimeter < 20 mm → 1 tab", () => {
    const r = engine.planTabs({
      features: [
        { id: "tiny", kind: "hole", perimeter_mm: 15, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
      ],
    });
    expect(r.plans[0].tab_count).toBe(1);
  });

  it("20–80 mm → 2 tabs", () => {
    for (const perim of [20, 40, 79]) {
      const r = engine.planTabs({
        features: [
          { id: "h", kind: "hole", perimeter_mm: perim, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
        ],
      });
      expect(r.plans[0].tab_count).toBe(2);
    }
  });

  it("80–200 mm → 3 tabs", () => {
    for (const perim of [80, 140, 199]) {
      const r = engine.planTabs({
        features: [
          { id: "h", kind: "internal_profile", perimeter_mm: perim, tolerance_class: "precision", start_point: { x: 0, y: 0 } },
        ],
      });
      expect(r.plans[0].tab_count).toBe(3);
    }
  });

  it("≥ 200 mm → 4 tabs", () => {
    for (const perim of [200, 400, 1000]) {
      const r = engine.planTabs({
        features: [
          { id: "h", kind: "internal_profile", perimeter_mm: perim, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
        ],
      });
      expect(r.plans[0].tab_count).toBe(4);
    }
  });

  it("feature tab_count override beats auto rule", () => {
    const r = engine.planTabs({
      features: [
        { id: "h", kind: "hole", perimeter_mm: 500, tolerance_class: "rough", start_point: { x: 0, y: 0 }, tab_count: 2 },
      ],
    });
    expect(r.plans[0].tab_count).toBe(2);
  });
});

describe("WEDMTabStrategyEngine — position and width", () => {
  it("tab positions are equally spaced around the perimeter", () => {
    const r = engine.planTabs({
      features: [
        { id: "h", kind: "internal_profile", perimeter_mm: 100, tolerance_class: "precision", start_point: { x: 0, y: 0 } },
      ],
    });
    const pos = r.plans[0].tab_positions_frac;
    // 3 tabs: 1/6, 1/6+1/3, 1/6+2/3
    expect(pos.length).toBe(3);
    expect(pos[0]).toBeCloseTo(1 / 6, 5);
    expect(pos[1]).toBeCloseTo(1 / 6 + 1 / 3, 5);
    expect(pos[2]).toBeCloseTo(1 / 6 + 2 / 3, 5);
  });

  it("first tab offset ensures no tab sits on the pierce point (frac != 0)", () => {
    for (const perim of [10, 25, 60, 140, 300]) {
      const r = engine.planTabs({
        features: [
          { id: "h", kind: "hole", perimeter_mm: perim, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
        ],
      });
      expect(r.plans[0].tab_positions_frac[0]).toBeGreaterThan(0);
    }
  });

  it("every tab position is in [0, 1)", () => {
    const r = engine.planTabs({ features: JM_INTERNAL_FEATURES });
    for (const p of r.plans) {
      for (const pos of p.tab_positions_frac) {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(1);
      }
    }
  });

  it("tab width = max(min_width, wire_diameter × safety_margin)", () => {
    const r = engine.planTabs({
      features: [
        { id: "h", kind: "hole", perimeter_mm: 25, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
      ],
      wire_diameter_mm: 2.0,
      min_tab_width_mm: 1.0,
      safety_margin: 1.5,
    });
    // 2.0 × 1.5 = 3.0 > min 1.0 → tab_width = 3.0
    expect(r.plans[0].tab_width_mm).toBeCloseTo(3.0, 6);
  });

  it("min_tab_width wins when it exceeds wire × safety", () => {
    const r = engine.planTabs({
      features: [
        { id: "h", kind: "hole", perimeter_mm: 25, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
      ],
      wire_diameter_mm: 0.25,
      min_tab_width_mm: 2.0,
      safety_margin: 1.2,
    });
    // 0.25 × 1.2 = 0.3 < min 2.0 → tab_width = 2.0
    expect(r.plans[0].tab_width_mm).toBeCloseTo(2.0, 6);
  });
});

describe("WEDMTabStrategyEngine — verify() catches bad plans", () => {
  it("flags internal feature with zero tabs", () => {
    const bad = {
      plans: [
        {
          feature_id: "h",
          is_internal: true,
          perimeter_mm: 50,
          tab_count: 0,
          tab_positions_frac: [],
          tab_width_mm: 1.2,
          rationale: [],
        },
      ],
      total_tabs: 0,
      stats: { internal_features: 1, internal_features_with_tabs: 0, external_features: 0 },
    };
    const v = engine.verify(bad);
    expect(v.valid).toBe(false);
    expect(v.violations.some((m) => /no tabs/.test(m))).toBe(true);
  });

  it("flags out-of-range tab position", () => {
    const bad = {
      plans: [
        {
          feature_id: "h",
          is_internal: true,
          perimeter_mm: 50,
          tab_count: 1,
          tab_positions_frac: [1.5],
          tab_width_mm: 1.2,
          rationale: [],
        },
      ],
      total_tabs: 1,
      stats: { internal_features: 1, internal_features_with_tabs: 1, external_features: 0 },
    };
    const v = engine.verify(bad);
    expect(v.valid).toBe(false);
    expect(v.violations.some((m) => /out of/.test(m))).toBe(true);
  });
});

describe("WEDMTabStrategyEngine — validation", () => {
  it("throws on empty feature list", () => {
    expect(() => engine.planTabs({ features: [] })).toThrow(
      /at least one feature/,
    );
  });

  it("throws on negative wire diameter", () => {
    expect(() =>
      engine.planTabs({
        features: JM_INTERNAL_FEATURES,
        wire_diameter_mm: -0.1,
      }),
    ).toThrow(/wire_diameter_mm/);
  });

  it("throws on duplicate feature id", () => {
    expect(() =>
      engine.planTabs({
        features: [
          { id: "h", kind: "hole", perimeter_mm: 25, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
          { id: "h", kind: "hole", perimeter_mm: 25, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
        ],
      }),
    ).toThrow(/duplicate/);
  });

  it("throws on zero perimeter", () => {
    expect(() =>
      engine.planTabs({
        features: [
          { id: "h", kind: "hole", perimeter_mm: 0, tolerance_class: "rough", start_point: { x: 0, y: 0 } },
        ],
      }),
    ).toThrow(/perimeter_mm/);
  });
});

describe("WEDMTabStrategyEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmTabStrategyEngine).toBeInstanceOf(WEDMTabStrategyEngine);
  });
});
