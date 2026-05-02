/**
 * MastercamSurfaceIntegrityBridge.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  MastercamSurfaceIntegrityBridge,
  SurfaceIntegrityRequestSchema,
  SurfaceFinishOpKindSchema,
  type SurfaceIntegrityRequest,
} from "../engines/MastercamSurfaceIntegrityBridge.js";

function req(over: Partial<SurfaceIntegrityRequest>): SurfaceIntegrityRequest {
  return {
    op_kind: over.op_kind ?? "ball_finish",
    iso_group: over.iso_group ?? "P",
    tool_diameter_mm: over.tool_diameter_mm ?? 10,
    corner_radius_mm: over.corner_radius_mm,
    stepover_mm: over.stepover_mm ?? 0.5,
    feed_per_tooth_mm: over.feed_per_tooth_mm ?? 0.05,
    flutes: over.flutes ?? 4,
    rpm: over.rpm ?? 5000,
    using_coolant: over.using_coolant ?? true,
  };
}

describe("MastercamSurfaceIntegrityBridge — ball finish scallop math", () => {
  it("ball end mill 10mm, stepover 0.5mm: tiny scallop, fine Ra", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "ball_finish", tool_diameter_mm: 10, stepover_mm: 0.5,
    }));
    // h = 5 - sqrt(25 - 0.0625) = 5 - 4.9938 = 0.00625 mm = 6.25 µm Rz
    expect(f.predicted_rz_um).toBeGreaterThan(6);
    expect(f.predicted_rz_um).toBeLessThan(7);
    expect(f.predicted_ra_um).toBeCloseTo(f.predicted_rz_um / 4, 2);
  });

  it("larger stepover → larger scallop", () => {
    const small = MastercamSurfaceIntegrityBridge.predict(req({ op_kind: "ball_finish", stepover_mm: 0.3 }));
    const big = MastercamSurfaceIntegrityBridge.predict(req({ op_kind: "ball_finish", stepover_mm: 1.0 }));
    expect(big.predicted_rz_um).toBeGreaterThan(small.predicted_rz_um);
  });

  it("stepover ≥ 2R produces scallop = R (full immersion limit)", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "ball_finish", tool_diameter_mm: 10, stepover_mm: 12,
    }));
    expect(f.predicted_rz_um).toBeCloseTo(5000, 0); // R=5mm = 5000 µm
  });
});

describe("MastercamSurfaceIntegrityBridge — flat-end Ra math", () => {
  it("flat finish: Ra = fz²/(32·R) — sharp corner has high Ra", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "flat_finish", feed_per_tooth_mm: 0.1,
    }));
    // No corner radius → uses 0.05 sharp default; Ra = 0.01/(32·0.05) × 1000 = 6.25 µm
    expect(f.predicted_ra_um).toBeCloseTo(6.25, 1);
  });

  it("larger corner radius → smaller Ra at same feed", () => {
    const sharp = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "flat_finish", feed_per_tooth_mm: 0.1, corner_radius_mm: 0.4,
    }));
    const radiused = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "flat_finish", feed_per_tooth_mm: 0.1, corner_radius_mm: 1.6,
    }));
    expect(radiused.predicted_ra_um).toBeLessThan(sharp.predicted_ra_um);
  });

  it("turning_od_finish uses the same Ra formula", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "turning_od_finish", feed_per_tooth_mm: 0.1, corner_radius_mm: 0.4,
    }));
    expect(f.predicted_ra_um).toBeGreaterThan(0);
  });
});

describe("MastercamSurfaceIntegrityBridge — white layer + residual stress", () => {
  it("Inconel at 7000 rpm dry → HIGH white layer + tensile stress", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "ball_finish", iso_group: "S", rpm: 7000, using_coolant: false,
    }));
    expect(f.white_layer_risk).toBe("high");
    expect(f.residual_stress_sign).toBe("tensile");
  });

  it("steel at 5000 rpm with coolant → no white layer + compressive stress", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "flat_finish", iso_group: "P", rpm: 5000, using_coolant: true,
    }));
    expect(f.white_layer_risk).toBe("none");
    expect(f.residual_stress_sign).toBe("compressive");
  });

  it("aluminum at low RPM → no white layer + neutral stress", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "flat_finish", iso_group: "N", rpm: 2000, using_coolant: true,
    }));
    expect(f.white_layer_risk).toBe("none");
    expect(f.residual_stress_sign).toBe("neutral");
  });

  it("hardened steel high RPM dry → high white layer", () => {
    const f = MastercamSurfaceIntegrityBridge.predict(req({
      op_kind: "ball_finish", iso_group: "H", rpm: 7000, using_coolant: false,
    }));
    expect(f.white_layer_risk).toBe("high");
  });
});

describe("MastercamSurfaceIntegrityBridge — validateAgainstSpec", () => {
  it("ok=true when predicted Ra meets target", () => {
    const v = MastercamSurfaceIntegrityBridge.validateAgainstSpec({
      request: req({ op_kind: "ball_finish", stepover_mm: 0.3 }),
      target_ra_um: 5,
    });
    expect(v.ok).toBe(true);
    expect(v.reasons).toEqual([]);
  });

  it("ok=false when predicted Ra exceeds target", () => {
    const v = MastercamSurfaceIntegrityBridge.validateAgainstSpec({
      request: req({ op_kind: "ball_finish", stepover_mm: 2.0 }),
      target_ra_um: 1,
    });
    expect(v.ok).toBe(false);
    expect(v.reasons.some(s => s.includes("Predicted Ra"))).toBe(true);
  });

  it("ok=false when white-layer risk is HIGH (regardless of Ra)", () => {
    const v = MastercamSurfaceIntegrityBridge.validateAgainstSpec({
      request: req({ iso_group: "S", rpm: 7000, using_coolant: false, stepover_mm: 0.1 }),
      target_ra_um: 100, // very loose Ra spec
    });
    expect(v.ok).toBe(false);
    expect(v.reasons.some(s => s.includes("White-layer"))).toBe(true);
  });
});

describe("MastercamSurfaceIntegrityBridge — schema validation", () => {
  it("SurfaceFinishOpKindSchema rejects unknown op", () => {
    const bad: unknown = "honing";
    expect(() => SurfaceFinishOpKindSchema.parse(bad)).toThrow();
  });

  it("SurfaceIntegrityRequestSchema rejects negative tool diameter", () => {
    expect(() => SurfaceIntegrityRequestSchema.parse({
      op_kind: "ball_finish", iso_group: "P", tool_diameter_mm: -1,
      stepover_mm: 0.5, feed_per_tooth_mm: 0.05, flutes: 4, rpm: 5000, using_coolant: true,
    })).toThrow();
  });

  it("SurfaceIntegrityRequestSchema rejects zero stepover", () => {
    expect(() => SurfaceIntegrityRequestSchema.parse({
      op_kind: "ball_finish", iso_group: "P", tool_diameter_mm: 10,
      stepover_mm: 0, feed_per_tooth_mm: 0.05, flutes: 4, rpm: 5000, using_coolant: true,
    })).toThrow();
  });

  it("SurfaceIntegrityRequestSchema rejects flutes=0", () => {
    expect(() => SurfaceIntegrityRequestSchema.parse({
      op_kind: "ball_finish", iso_group: "P", tool_diameter_mm: 10,
      stepover_mm: 0.5, feed_per_tooth_mm: 0.05, flutes: 0, rpm: 5000, using_coolant: true,
    })).toThrow();
  });
});

describe("MastercamSurfaceIntegrityBridge — audit", () => {
  it("auditEngine passes (scallop math sanity checks)", () => {
    const a = MastercamSurfaceIntegrityBridge.auditEngine();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });
});

describe("MastercamSurfaceIntegrityBridge — dispatcher round-trip", () => {
  it("ACTIONS array exposes the surface integrity actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_mastercam_si_predict");
    expect(mod.ACTIONS).toContain("cam_mastercam_si_validate");
    expect(mod.ACTIONS).toContain("cam_mastercam_si_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/MastercamSurfaceIntegrityBridge.js");
    const f = mod.MastercamSurfaceIntegrityBridge.predict(req({}));
    expect(f.predicted_ra_um).toBeGreaterThanOrEqual(0);
  });
});
