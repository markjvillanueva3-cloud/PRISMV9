/**
 * WEDMFixtureInterferenceEngine Tests — WEDM AGI Phase 1 / U-P1-07
 *
 * Exit gate: ≥90% interference recall on the synthetic fixture.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMFixtureInterferenceEngine,
  wedmFixtureInterferenceEngine,
  type ClampRegion,
  type ProfileTrajectory,
  type WorkpieceFootprint,
  type FixtureInterferenceInput,
} from "../../engines/WEDMFixtureInterferenceEngine.js";
import type { BoundingBox, Point2D } from "../../engines/WEDMPartRecognitionEngine.js";

const engine = new WEDMFixtureInterferenceEngine();

function bbox(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

function clamp(
  id: string,
  box: BoundingBox,
  overrides: Partial<ClampRegion> = {},
): ClampRegion {
  return {
    id,
    type: "strap",
    footprint: box,
    height_mm: 15,
    over_top: false,
    ...overrides,
  };
}

function profile(name: string, path: Point2D[], is_through = true): ProfileTrajectory {
  return { name, path, is_through };
}

const workpiece: WorkpieceFootprint = {
  bounds: bbox(0, 0, 100, 100),
  thickness_mm: 12,
  origin: { x: 0, y: 0 },
};

function mkInput(
  clamps: ClampRegion[],
  profiles: ProfileTrajectory[],
  overrides: Partial<FixtureInterferenceInput> = {},
): FixtureInterferenceInput {
  return { workpiece, clamps, profiles, ...overrides };
}

describe("WEDMFixtureInterferenceEngine.analyze — interference detection", () => {
  it("flags a wire path that passes straight through a clamp footprint", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    const p = profile("profile-1", [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p]));
    const hits = r.interferences.filter((h) => h.clamp_id === "C1");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].kind).toBe("path-intersects-clamp");
    expect(hits[0].severity).toBe("high");
    expect(hits[0].distance_mm).toBe(0);
  });

  it("flags a wire path that is closer than clearance but does not intersect", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    // Path runs 2 mm away from clamp edge — below default 3 mm clearance.
    const p = profile("profile-1", [
      { x: 30, y: 62 },
      { x: 70, y: 62 },
    ]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p]));
    const hit = r.interferences.find((h) => h.clamp_id === "C1");
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe("path-below-clearance");
    expect(hit!.distance_mm).toBeGreaterThan(0);
    expect(hit!.distance_mm).toBeLessThan(3);
  });

  it("grades clearance violations below half-clearance as high severity", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    const p = profile("profile-1", [
      { x: 30, y: 61 },
      { x: 70, y: 61 },
    ]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p]));
    const hit = r.interferences.find((h) => h.clamp_id === "C1");
    expect(hit!.severity).toBe("high");
  });

  it("does not flag a wire path that is clear of every clamp", () => {
    const c1 = clamp("C1", bbox(0, 0, 10, 10));
    const c2 = clamp("C2", bbox(90, 90, 100, 100));
    const p = profile("profile-1", [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    const r = engine.analyze(mkInput([c1, c2], [p]));
    expect(r.interferences.length).toBe(0);
    expect(r.accessibility_score).toBe(1);
  });

  it("detects over-top collision when clamp bridges above the upper guide", () => {
    const c = clamp("C1", bbox(20, 20, 40, 40), {
      type: "strap",
      over_top: true,
      height_mm: 30,
    });
    const p = profile(
      "profile-1",
      [
        { x: 50, y: 50 },
        { x: 80, y: 50 },
      ],
      true,
    );
    const r = engine.analyze(
      mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p], {
        wire_envelope: {
          upper_guide_z_mm: 20,
          lower_guide_z_mm: 0,
          max_taper_deg: 10,
        },
      }),
    );
    const hit = r.interferences.find((h) => h.kind === "over-top-collision");
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe("high");
  });

  it("does not flag over-top when the clamp is below the upper guide", () => {
    const c = clamp("C1", bbox(20, 20, 40, 40), {
      over_top: true,
      height_mm: 10,
    });
    const p = profile(
      "profile-1",
      [
        { x: 50, y: 50 },
        { x: 80, y: 50 },
      ],
      true,
    );
    const r = engine.analyze(
      mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p], {
        wire_envelope: {
          upper_guide_z_mm: 20,
          lower_guide_z_mm: 0,
          max_taper_deg: 10,
        },
      }),
    );
    const over = r.interferences.filter((h) => h.kind === "over-top-collision");
    expect(over.length).toBe(0);
  });
});

describe("WEDMFixtureInterferenceEngine.scoreClampStability — 3-2-1 verdict", () => {
  it("returns underclamped with clamp_count=0 for empty clamps", () => {
    const v = engine.scoreClampStability([]);
    expect(v.verdict).toBe("underclamped");
    expect(v.clamp_count).toBe(0);
  });

  it("returns underclamped for a single clamp", () => {
    const v = engine.scoreClampStability([clamp("C1", bbox(0, 0, 10, 10))]);
    expect(v.verdict).toBe("underclamped");
    expect(v.clamp_count).toBe(1);
  });

  it("returns ok for a 3-2-1 clamp arrangement (n=2..4)", () => {
    for (const n of [2, 3, 4]) {
      const clamps = Array.from({ length: n }, (_, i) =>
        clamp(`C${i}`, bbox(i * 10, 0, i * 10 + 5, 5)),
      );
      const v = engine.scoreClampStability(clamps);
      expect(v.verdict).toBe("ok");
      expect(v.clamp_count).toBe(n);
    }
  });

  it("returns overclamped when more than 4 clamps are present", () => {
    const clamps = Array.from({ length: 5 }, (_, i) =>
      clamp(`C${i}`, bbox(i * 10, 0, i * 10 + 5, 5)),
    );
    const v = engine.scoreClampStability(clamps);
    expect(v.verdict).toBe("overclamped");
    expect(v.clamp_count).toBe(5);
  });
});

describe("WEDMFixtureInterferenceEngine.analyze — warnings + recommendations", () => {
  it("recommends reducing clamp count when overclamped", () => {
    const clamps = Array.from({ length: 6 }, (_, i) =>
      clamp(`C${i}`, bbox(i * 20, 0, i * 20 + 5, 5)),
    );
    const r = engine.analyze(mkInput(clamps, []));
    expect(r.clamp_stability.verdict).toBe("overclamped");
    expect(r.warnings.some((w) => /over-constraint|distortion/.test(w))).toBe(true);
    expect(
      r.recommendations.some((x) => /Reduce clamp count/i.test(x)),
    ).toBe(true);
  });

  it("recommends relocating clamps when interferences are detected", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    const p = profile("profile-1", [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p]));
    expect(r.recommendations.some((x) => /Relocate clamps/i.test(x))).toBe(true);
    expect(r.recommendations.some((x) => /C1/.test(x))).toBe(true);
  });

  it("warns when accessibility drops below 0.5", () => {
    // Single profile with multiple high-severity hits drives the score down.
    const clamps = [
      clamp("C1", bbox(40, 40, 60, 60)),
      clamp("C2", bbox(30, 30, 50, 50)),
      clamp("C3", bbox(50, 30, 70, 50)),
    ];
    const p = profile("profile-1", [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ]);
    const r = engine.analyze(mkInput(clamps, [p]));
    expect(r.accessibility_score).toBeLessThan(0.5);
    expect(r.warnings.some((w) => /Severe workholding interference/.test(w))).toBe(
      true,
    );
  });
});

describe("WEDMFixtureInterferenceEngine.analyze — accessibility scoring", () => {
  it("returns 1.0 when there are no profiles", () => {
    const r = engine.analyze(mkInput([clamp("C1", bbox(0, 0, 5, 5)), clamp("C2", bbox(95, 95, 100, 100))], []));
    expect(r.accessibility_score).toBe(1);
  });

  it("returns 1.0 when every profile is clear", () => {
    const clamps = [
      clamp("C1", bbox(0, 0, 10, 10)),
      clamp("C2", bbox(90, 90, 100, 100)),
    ];
    const p1 = profile("profile-1", [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    const p2 = profile("profile-2", [
      { x: 30, y: 30 },
      { x: 30, y: 70 },
    ]);
    const r = engine.analyze(mkInput(clamps, [p1, p2]));
    expect(r.accessibility_score).toBe(1);
  });

  it("drops below 1 proportionally to severity", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    // Two profiles — one intersects (high, penalty 0.5), one clear.
    const p1 = profile("p1", [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    const p2 = profile("p2", [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(90, 0, 95, 5))], [p1, p2]));
    // penalty 0.5 / nProfiles 2 ⇒ score 0.75
    expect(r.accessibility_score).toBeCloseTo(0.75, 5);
  });
});

describe("WEDMFixtureInterferenceEngine — edge cases", () => {
  it("handles an empty-path profile without throwing", () => {
    const c = clamp("C1", bbox(0, 0, 10, 10));
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(90, 90, 100, 100))], [profile("empty", [])]));
    expect(r.interferences.length).toBe(0);
  });

  it("handles a single-vertex profile (no segments)", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    const inside = profile("pt-in", [{ x: 50, y: 50 }]);
    const outside = profile("pt-out", [{ x: 5, y: 5 }]);
    const r = engine.analyze(mkInput([c, clamp("C2", bbox(90, 90, 100, 100))], [inside, outside]));
    const insideHit = r.interferences.find((h) => h.profile === "pt-in");
    const outsideHit = r.interferences.find((h) => h.profile === "pt-out");
    expect(insideHit).toBeDefined();
    expect(insideHit!.kind).toBe("path-intersects-clamp");
    expect(outsideHit).toBeUndefined();
  });

  it("respects a custom min_clearance_mm override", () => {
    const c = clamp("C1", bbox(40, 40, 60, 60));
    const p = profile("profile-1", [
      { x: 30, y: 65 },
      { x: 70, y: 65 },
    ]);
    // Default 3 mm: path at 5 mm is clear. With 10 mm clearance it becomes a hit.
    const rDefault = engine.analyze(mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p]));
    expect(rDefault.interferences.filter((h) => h.clamp_id === "C1").length).toBe(0);

    const rStrict = engine.analyze(
      mkInput([c, clamp("C2", bbox(0, 0, 5, 5))], [p], { min_clearance_mm: 10 }),
    );
    const hit = rStrict.interferences.find((h) => h.clamp_id === "C1");
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe("path-below-clearance");
  });

  it("exposes a singleton instance for dispatcher use", () => {
    expect(wedmFixtureInterferenceEngine).toBeInstanceOf(WEDMFixtureInterferenceEngine);
  });
});

describe("WEDMFixtureInterferenceEngine — exit gate (≥90% interference recall)", () => {
  it("detects ≥90% of ground-truth interferences on a synthetic fixture", () => {
    // Synthetic setup: 10 clamps, 10 wire paths.
    // 10 known interferences by construction (clamp[i] sits on profile[i]).
    const clamps: ClampRegion[] = [];
    const profiles: ProfileTrajectory[] = [];
    for (let i = 0; i < 10; i++) {
      const cx = i * 50 + 25;
      const cy = 50;
      clamps.push(
        clamp(`C${i}`, bbox(cx - 5, cy - 5, cx + 5, cy + 5)),
      );
      profiles.push(
        profile(`prof-${i}`, [
          { x: cx - 20, y: cy },
          { x: cx + 20, y: cy },
        ]),
      );
    }
    const r = engine.analyze(mkInput(clamps, profiles));
    // Each ground-truth pair should surface at least one hit.
    const hitPairs = new Set(
      r.interferences.map((h) => `${h.clamp_id}:${h.profile}`),
    );
    let detected = 0;
    for (let i = 0; i < 10; i++) {
      if (hitPairs.has(`C${i}:prof-${i}`)) detected++;
    }
    const recall = detected / 10;
    expect(recall).toBeGreaterThanOrEqual(0.9);
  });
});
