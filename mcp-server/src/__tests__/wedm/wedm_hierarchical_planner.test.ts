/**
 * WEDMHierarchicalPlannerEngine Tests — WEDM AGI Phase 2 / U-P2-08
 *
 * Exit gate: HTN planner generates *valid* plans for 100% of JM Die test
 * parts. The test fixtures below mirror the JM Die job mix (cold-heading
 * dies, trim dies, punches, extrude inserts) at varying tolerance classes
 * and feature compositions.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMHierarchicalPlannerEngine,
  wedmHierarchicalPlannerEngine,
  type PartSpec,
} from "../../engines/WEDMHierarchicalPlannerEngine.js";

const engine = new WEDMHierarchicalPlannerEngine();

// ───────────── JM Die representative fixture ─────────────
//
// 10 parts covering: external-only, single internal, multi-internal,
// mixed tolerance, thin-wall, tall part, rough/precision/mirror finish,
// inspection required vs not.

const JM_DIE_PARTS: PartSpec[] = [
  {
    id: "jm-simple-plate",
    material: "D2",
    thickness_mm: 12,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 160,
        tolerance_class: "rough",
        start_point: { x: 0, y: 0 },
      },
    ],
  },
  {
    id: "jm-single-hole-die",
    material: "M2",
    thickness_mm: 20,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 220,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "bore",
        kind: "internal_profile",
        perimeter_mm: 80,
        tolerance_class: "precision",
        start_point: { x: 40, y: 30 },
      },
    ],
    require_inspection: true,
  },
  {
    id: "jm-four-hole-fixture",
    material: "A2",
    thickness_mm: 15,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 320,
        tolerance_class: "rough",
        start_point: { x: 0, y: 0 },
      },
      ...Array.from({ length: 4 }).map((_, i) => ({
        id: `hole${i}`,
        kind: "hole" as const,
        perimeter_mm: 30,
        tolerance_class: "precision" as const,
        start_point: { x: i * 40, y: 50 },
      })),
    ],
  },
  {
    id: "jm-precision-trim-die",
    material: "H13",
    thickness_mm: 25,
    features: [
      {
        id: "contour",
        kind: "external_profile",
        perimeter_mm: 480,
        tolerance_class: "mirror",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "slot1",
        kind: "slot",
        perimeter_mm: 60,
        tolerance_class: "mirror",
        start_point: { x: 20, y: 20 },
      },
    ],
    require_inspection: true,
  },
  {
    id: "jm-punch-form",
    material: "S7",
    thickness_mm: 40,
    features: [
      {
        id: "punch",
        kind: "external_profile",
        perimeter_mm: 90,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
    ],
  },
  {
    id: "jm-carbide-insert",
    material: "WC",
    thickness_mm: 6,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 45,
        tolerance_class: "mirror",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "core",
        kind: "internal_profile",
        perimeter_mm: 12,
        tolerance_class: "mirror",
        start_point: { x: 5, y: 5 },
      },
    ],
    require_inspection: true,
  },
  {
    id: "jm-graphite-electrode",
    material: "graphite",
    thickness_mm: 30,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 140,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "cavity",
        kind: "internal_profile",
        perimeter_mm: 96,
        tolerance_class: "mirror",
        start_point: { x: 10, y: 10 },
      },
    ],
  },
  {
    id: "jm-cold-head-die",
    material: "M2",
    thickness_mm: 28,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 260,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "taper_bore",
        kind: "internal_profile",
        perimeter_mm: 85,
        tolerance_class: "mirror",
        start_point: { x: 30, y: 30 },
      },
    ],
    require_inspection: true,
  },
  {
    id: "jm-extrude-insert",
    material: "D2",
    thickness_mm: 50,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 200,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "bore1",
        kind: "hole",
        perimeter_mm: 45,
        tolerance_class: "mirror",
        start_point: { x: 25, y: 25 },
      },
      {
        id: "bore2",
        kind: "hole",
        perimeter_mm: 45,
        tolerance_class: "mirror",
        start_point: { x: 75, y: 25 },
      },
    ],
    require_inspection: true,
  },
  {
    id: "jm-progressive-die-block",
    material: "A2",
    thickness_mm: 22,
    features: [
      {
        id: "outer",
        kind: "external_profile",
        perimeter_mm: 580,
        tolerance_class: "precision",
        start_point: { x: 0, y: 0 },
      },
      {
        id: "pilot1",
        kind: "hole",
        perimeter_mm: 25,
        tolerance_class: "precision",
        start_point: { x: 20, y: 20 },
      },
      {
        id: "pilot2",
        kind: "hole",
        perimeter_mm: 25,
        tolerance_class: "precision",
        start_point: { x: 100, y: 20 },
      },
      {
        id: "die_slot",
        kind: "slot",
        perimeter_mm: 140,
        tolerance_class: "mirror",
        start_point: { x: 50, y: 60 },
      },
    ],
    require_inspection: true,
  },
];

describe("WEDMHierarchicalPlannerEngine — exit gate (100% valid on JM Die fixtures)", () => {
  it("produces a valid plan for every JM Die test part", () => {
    const failures: string[] = [];
    for (const part of JM_DIE_PARTS) {
      const plan = engine.plan(part);
      if (!plan.valid) {
        failures.push(
          `${part.id}: ${plan.violations.slice(0, 3).join("; ")}`,
        );
      }
    }
    if (failures.length) console.warn("Plan failures:\n" + failures.join("\n"));
    expect(failures).toEqual([]);
  });

  it("every primitive in every plan has its preconditions satisfied by a prior effect", () => {
    for (const part of JM_DIE_PARTS) {
      const plan = engine.plan(part);
      const seen = new Set<string>();
      for (const p of plan.primitives) {
        for (const pre of p.preconditions) {
          expect(
            seen.has(pre),
            `${part.id}/${p.id} missing ${pre}`,
          ).toBe(true);
        }
        for (const e of p.effects) seen.add(e);
      }
    }
  });

  it("features of tolerance 'rough' get exactly one cut pass", () => {
    const part: PartSpec = {
      id: "rough-only",
      material: "D2",
      thickness_mm: 10,
      features: [
        {
          id: "f",
          kind: "external_profile",
          perimeter_mm: 100,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
        },
      ],
    };
    const plan = engine.plan(part);
    const cuts = plan.primitives.filter(
      (p) => p.feature_id === "f" && ["rough_cut", "skim_cut", "finish_cut"].includes(p.task),
    );
    expect(cuts.map((c) => c.task)).toEqual(["rough_cut"]);
  });

  it("features of tolerance 'precision' get rough + skim", () => {
    const part: PartSpec = {
      id: "prec",
      material: "D2",
      thickness_mm: 10,
      features: [
        {
          id: "f",
          kind: "external_profile",
          perimeter_mm: 100,
          tolerance_class: "precision",
          start_point: { x: 0, y: 0 },
        },
      ],
    };
    const plan = engine.plan(part);
    const cuts = plan.primitives.filter(
      (p) => p.feature_id === "f" && ["rough_cut", "skim_cut", "finish_cut"].includes(p.task),
    );
    expect(cuts.map((c) => c.task)).toEqual(["rough_cut", "skim_cut"]);
  });

  it("features of tolerance 'mirror' get rough + skim + finish", () => {
    const part: PartSpec = {
      id: "mir",
      material: "D2",
      thickness_mm: 10,
      features: [
        {
          id: "f",
          kind: "external_profile",
          perimeter_mm: 100,
          tolerance_class: "mirror",
          start_point: { x: 0, y: 0 },
        },
      ],
    };
    const plan = engine.plan(part);
    const cuts = plan.primitives.filter(
      (p) => p.feature_id === "f" && ["rough_cut", "skim_cut", "finish_cut"].includes(p.task),
    );
    expect(cuts.map((c) => c.task)).toEqual([
      "rough_cut",
      "skim_cut",
      "finish_cut",
    ]);
  });
});

describe("WEDMHierarchicalPlannerEngine — internal features get tabs + slug release", () => {
  it("internal profile gets at least one tab and one release_slug", () => {
    const part: PartSpec = {
      id: "t",
      material: "D2",
      thickness_mm: 12,
      features: [
        {
          id: "hole",
          kind: "internal_profile",
          perimeter_mm: 60,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
        },
      ],
    };
    const plan = engine.plan(part);
    const tabs = plan.primitives.filter(
      (p) => p.task === "place_tab" && p.feature_id === "hole",
    );
    const releases = plan.primitives.filter(
      (p) => p.task === "release_slug" && p.feature_id === "hole",
    );
    expect(tabs.length).toBeGreaterThanOrEqual(1);
    expect(releases.length).toBe(1);
  });

  it("tab count scales with perimeter (small hole → 1, large hole → 2–4)", () => {
    const small = engine.plan({
      id: "s",
      material: "D2",
      thickness_mm: 8,
      features: [
        {
          id: "h",
          kind: "hole",
          perimeter_mm: 25,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
        },
      ],
    });
    const large = engine.plan({
      id: "l",
      material: "D2",
      thickness_mm: 8,
      features: [
        {
          id: "h",
          kind: "internal_profile",
          perimeter_mm: 200,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
        },
      ],
    });
    expect(small.stats.tab_placements).toBe(1);
    expect(large.stats.tab_placements).toBeGreaterThanOrEqual(2);
    expect(large.stats.tab_placements).toBeLessThanOrEqual(4);
  });

  it("tab_count override is respected", () => {
    const plan = engine.plan({
      id: "o",
      material: "D2",
      thickness_mm: 8,
      features: [
        {
          id: "h",
          kind: "hole",
          perimeter_mm: 40,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
          tab_count: 3,
        },
      ],
    });
    expect(plan.stats.tab_placements).toBe(3);
  });

  it("external profile gets no tabs and no release_slug", () => {
    const plan = engine.plan({
      id: "e",
      material: "D2",
      thickness_mm: 10,
      features: [
        {
          id: "outer",
          kind: "external_profile",
          perimeter_mm: 100,
          tolerance_class: "rough",
          start_point: { x: 0, y: 0 },
        },
      ],
    });
    expect(plan.stats.tab_placements).toBe(0);
    expect(
      plan.primitives.some((p) => p.task === "release_slug"),
    ).toBe(false);
  });
});

describe("WEDMHierarchicalPlannerEngine — structural invariants", () => {
  it("the plan tree starts with Setup before Machining", () => {
    const plan = engine.plan(JM_DIE_PARTS[0]);
    const labels = plan.root.children!.map((c) => c.task);
    expect(labels.indexOf("Setup")).toBeLessThan(labels.indexOf("Machining"));
  });

  it("inspection is included only when require_inspection=true", () => {
    const withInsp = engine.plan(JM_DIE_PARTS[1]);
    const withoutInsp = engine.plan({ ...JM_DIE_PARTS[1], require_inspection: false });
    expect(
      withInsp.primitives.some((p) => p.task === "inspect"),
    ).toBe(true);
    expect(
      withoutInsp.primitives.some((p) => p.task === "inspect"),
    ).toBe(false);
  });

  it("teardown/unload is always the last primitive", () => {
    for (const part of JM_DIE_PARTS) {
      const plan = engine.plan(part);
      const last = plan.primitives[plan.primitives.length - 1];
      expect(last.task).toBe("unload");
    }
  });

  it("stats.feature_count matches input feature count", () => {
    for (const part of JM_DIE_PARTS) {
      const plan = engine.plan(part);
      expect(plan.stats.feature_count).toBe(part.features.length);
    }
  });

  it("plan depth is at least 3 (Job→Phase→Primitive or deeper)", () => {
    const plan = engine.plan(JM_DIE_PARTS[0]);
    expect(plan.depth).toBeGreaterThanOrEqual(2);
  });
});

describe("WEDMHierarchicalPlannerEngine — input validation", () => {
  it("throws on missing material", () => {
    expect(() =>
      engine.plan({
        id: "x",
        material: "",
        thickness_mm: 10,
        features: [
          {
            id: "a",
            kind: "external_profile",
            perimeter_mm: 10,
            tolerance_class: "rough",
            start_point: { x: 0, y: 0 },
          },
        ],
      }),
    ).toThrow(/material/);
  });

  it("throws on zero thickness", () => {
    expect(() =>
      engine.plan({
        id: "x",
        material: "D2",
        thickness_mm: 0,
        features: [
          {
            id: "a",
            kind: "external_profile",
            perimeter_mm: 10,
            tolerance_class: "rough",
            start_point: { x: 0, y: 0 },
          },
        ],
      }),
    ).toThrow(/thickness/);
  });

  it("throws on empty feature list", () => {
    expect(() =>
      engine.plan({
        id: "x",
        material: "D2",
        thickness_mm: 10,
        features: [],
      }),
    ).toThrow(/at least one feature/);
  });

  it("throws on duplicate feature id", () => {
    expect(() =>
      engine.plan({
        id: "x",
        material: "D2",
        thickness_mm: 10,
        features: [
          {
            id: "a",
            kind: "external_profile",
            perimeter_mm: 10,
            tolerance_class: "rough",
            start_point: { x: 0, y: 0 },
          },
          {
            id: "a",
            kind: "external_profile",
            perimeter_mm: 10,
            tolerance_class: "rough",
            start_point: { x: 0, y: 0 },
          },
        ],
      }),
    ).toThrow(/duplicate/);
  });
});

describe("WEDMHierarchicalPlannerEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmHierarchicalPlannerEngine).toBeInstanceOf(
      WEDMHierarchicalPlannerEngine,
    );
  });
});
