/**
 * MastercamEDMBridge.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  MastercamEDMBridge,
  EDMRouteTypeSchema,
  MastercamEDMFeatureSchema,
  type MastercamEDMFeature,
} from "../engines/MastercamEDMBridge.js";

function feature(over: Partial<MastercamEDMFeature>): MastercamEDMFeature {
  return {
    type: over.type ?? "open_contour",
    name: over.name ?? "test",
    contour_length_mm: over.contour_length_mm,
    depth_mm: over.depth_mm,
    taper_angle_deg: over.taper_angle_deg,
    electrode_undersize_mm: over.electrode_undersize_mm,
    needs_glue_tabs: over.needs_glue_tabs,
    workpiece_thickness_mm: over.workpiece_thickness_mm ?? 25,
  };
}

describe("MastercamEDMBridge — pickRouteType", () => {
  it("open_contour → wire_2axis", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "open_contour", contour_length_mm: 50 }))).toBe("wire_2axis");
  });

  it("closed_contour_no_core → wire_2axis (with glue tabs)", () => {
    const r = MastercamEDMBridge.route(feature({ type: "closed_contour_no_core", contour_length_mm: 50 }));
    expect(r.route_type).toBe("wire_2axis");
    expect(r.needs_glue_tabs).toBe(true);
    expect(r.cycle_code).toBe("WEDM:Contour:NoCore");
  });

  it("tapered_contour → wire_4axis", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "tapered_contour", contour_length_mm: 50, taper_angle_deg: 15 }))).toBe("wire_4axis");
  });

  it("uv_xy_pair → wire_4axis (UV-XY independent)", () => {
    const r = MastercamEDMBridge.route(feature({ type: "uv_xy_pair", contour_length_mm: 50 }));
    expect(r.route_type).toBe("wire_4axis");
    expect(r.cycle_code).toBe("WEDM:Contour:UV-XY");
  });

  it("blind_cavity → sinker", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "blind_cavity", depth_mm: 10 }))).toBe("sinker");
  });

  it("through_pocket → sinker", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "through_pocket", depth_mm: 10 }))).toBe("sinker");
  });

  it("rib_burn → sinker", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "rib_burn", depth_mm: 5 }))).toBe("sinker");
  });

  it("micro_hole → micro", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "micro_hole", contour_length_mm: 0.3 }))).toBe("micro");
  });

  it("contour_length < 1mm → micro (regardless of type)", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "open_contour", contour_length_mm: 0.5 }))).toBe("micro");
  });

  it("depth < 1mm → micro", () => {
    expect(MastercamEDMBridge.pickRouteType(feature({ type: "blind_cavity", depth_mm: 0.5 }))).toBe("micro");
  });
});

describe("MastercamEDMBridge — recommendSkimPasses", () => {
  it("≤10mm → 1 pass", () => {
    expect(MastercamEDMBridge.recommendSkimPasses(5)).toBe(1);
    expect(MastercamEDMBridge.recommendSkimPasses(10)).toBe(1);
  });

  it("≤25mm → 2 passes", () => {
    expect(MastercamEDMBridge.recommendSkimPasses(20)).toBe(2);
  });

  it("≤50mm → 3 passes", () => {
    expect(MastercamEDMBridge.recommendSkimPasses(40)).toBe(3);
  });

  it("≤100mm → 4 passes", () => {
    expect(MastercamEDMBridge.recommendSkimPasses(80)).toBe(4);
  });

  it(">100mm → 5 passes", () => {
    expect(MastercamEDMBridge.recommendSkimPasses(200)).toBe(5);
  });

  it("throws on non-positive thickness", () => {
    expect(() => MastercamEDMBridge.recommendSkimPasses(0)).toThrow(/must be > 0/);
    expect(() => MastercamEDMBridge.recommendSkimPasses(-1)).toThrow();
  });
});

describe("MastercamEDMBridge — route descriptors", () => {
  it("wire_2axis open contour: cycle=WEDM:Contour:2Axis, glue_tabs=false", () => {
    const r = MastercamEDMBridge.route(feature({ type: "open_contour", contour_length_mm: 50, workpiece_thickness_mm: 30 }));
    expect(r.cycle_code).toBe("WEDM:Contour:2Axis");
    expect(r.needs_glue_tabs).toBe(false);
    expect(r.recommended_skim_passes).toBe(3); // 30mm thick
  });

  it("sinker: 0 skim passes (uses spark gap not skim sequence)", () => {
    const r = MastercamEDMBridge.route(feature({ type: "blind_cavity", depth_mm: 20, workpiece_thickness_mm: 50 }));
    expect(r.recommended_skim_passes).toBe(0);
  });

  it("micro: 0 skim passes", () => {
    const r = MastercamEDMBridge.route(feature({ type: "micro_hole", contour_length_mm: 0.3, workpiece_thickness_mm: 5 }));
    expect(r.recommended_skim_passes).toBe(0);
    expect(r.cycle_code).toBe("MicroEDM:Hole");
  });

  it("tapered contour cites taper angle in rationale", () => {
    const r = MastercamEDMBridge.route(feature({ type: "tapered_contour", contour_length_mm: 50, taper_angle_deg: 7 }));
    expect(r.rationale).toContain("7°");
  });

  it("blind cavity with electrode undersize cites it in rationale", () => {
    const r = MastercamEDMBridge.route(feature({ type: "blind_cavity", depth_mm: 20, electrode_undersize_mm: 0.15 }));
    expect(r.rationale).toContain("0.15");
  });

  it("explicit needs_glue_tabs=true on open_contour forces glue tabs", () => {
    const r = MastercamEDMBridge.route(feature({ type: "open_contour", contour_length_mm: 50, needs_glue_tabs: true }));
    expect(r.needs_glue_tabs).toBe(true);
  });
});

describe("MastercamEDMBridge — stats aggregate", () => {
  it("aggregates totals + by_route + glue tabs + avg skim passes", () => {
    const stats = MastercamEDMBridge.stats([
      feature({ type: "open_contour", contour_length_mm: 50, workpiece_thickness_mm: 10 }),
      feature({ type: "tapered_contour", contour_length_mm: 50, workpiece_thickness_mm: 25 }),
      feature({ type: "closed_contour_no_core", contour_length_mm: 50, workpiece_thickness_mm: 10 }),
      feature({ type: "blind_cavity", depth_mm: 20 }),
      feature({ type: "micro_hole", contour_length_mm: 0.3 }),
    ]);
    expect(stats.total).toBe(5);
    expect(stats.by_route.wire_2axis).toBe(2);
    expect(stats.by_route.wire_4axis).toBe(1);
    expect(stats.by_route.sinker).toBe(1);
    expect(stats.by_route.micro).toBe(1);
    expect(stats.glue_tab_count).toBe(1); // closed no-core auto-tabs
    expect(stats.avg_skim_passes).toBeCloseTo((1 + 2 + 1 + 0 + 0) / 5, 4);
  });
});

describe("MastercamEDMBridge — schema validation", () => {
  it("EDMRouteTypeSchema rejects unknown route", () => {
    const bad: unknown = "wire_5axis";
    expect(() => EDMRouteTypeSchema.parse(bad)).toThrow();
  });

  it("MastercamEDMFeatureSchema rejects taper > 30° or < -30°", () => {
    expect(() => MastercamEDMFeatureSchema.parse({
      type: "tapered_contour", name: "x", workpiece_thickness_mm: 25, taper_angle_deg: 45,
    })).toThrow();
  });

  it("MastercamEDMFeatureSchema rejects non-positive workpiece_thickness_mm", () => {
    expect(() => MastercamEDMFeatureSchema.parse({
      type: "open_contour", name: "x", workpiece_thickness_mm: 0,
    })).toThrow();
  });
});

describe("MastercamEDMBridge — audit", () => {
  it("auditEngine passes (skim-pass tiers monotonic + non-regressing)", () => {
    const a = MastercamEDMBridge.auditEngine();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });
});

describe("MastercamEDMBridge — dispatcher round-trip", () => {
  it("ACTIONS array exposes the EDM bridge actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_mastercam_edm_route");
    expect(mod.ACTIONS).toContain("cam_mastercam_edm_pick_route_type");
    expect(mod.ACTIONS).toContain("cam_mastercam_edm_skim_passes");
    expect(mod.ACTIONS).toContain("cam_mastercam_edm_stats");
    expect(mod.ACTIONS).toContain("cam_mastercam_edm_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/MastercamEDMBridge.js");
    const r = mod.MastercamEDMBridge.route(feature({ type: "open_contour", contour_length_mm: 50 }));
    expect(r.route_type).toBe("wire_2axis");
  });
});
