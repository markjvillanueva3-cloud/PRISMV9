/**
 * Fusion360MultiAxisEngine.test.ts
 *
 * Coverage:
 *   - happy path: 8 kinematics, audit OK
 *   - lookup + listByType + listTcpCapable
 *   - validateOrientation enforces angle envelopes + TCP support
 *   - planeRotationMatrix produces orthonormal basis (math validated)
 *   - schema rejection on bad inputs
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360MultiAxisEngine,
  KinematicSchema,
  KinematicTypeSchema,
  WCSPlaneSchema,
  ToolOrientationSchema,
  type Kinematic,
  type WCSPlane,
} from "../engines/Fusion360MultiAxisEngine.js";

function mustFind(id: string): Kinematic {
  const k = Fusion360MultiAxisEngine.lookup(id);
  if (k === null) throw new Error(`expected kinematic ${id}, got null`);
  return k;
}

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function magnitude(v: number[]): number {
  return Math.hypot(v[0], v[1], v[2]);
}

// ── 1. Catalog shape ───────────────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — catalog shape", () => {
  it("exposes exactly 8 kinematic configurations", () => {
    expect(Fusion360MultiAxisEngine.count()).toBe(8);
    expect(Fusion360MultiAxisEngine.EXPECTED_TOTAL).toBe(8);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = Fusion360MultiAxisEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("every kinematic has primary_min < primary_max + secondary_min < secondary_max", () => {
    for (const k of Fusion360MultiAxisEngine.list()) {
      expect(k.primary_min_deg).toBeLessThan(k.primary_max_deg);
      expect(k.secondary_min_deg).toBeLessThan(k.secondary_max_deg);
    }
  });
});

// ── 2. Lookup + filter helpers ─────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — lookup + filters", () => {
  it("DMU 50 trunnion has A-axis ±120°, C-axis full rotation", () => {
    const k = mustFind("table_table_ac_dmu_50");
    expect(k.primary_rotary).toBe("A");
    expect(k.primary_min_deg).toBe(-120);
    expect(k.primary_max_deg).toBe(120);
    expect(k.secondary_rotary).toBe("C");
    expect(k.secondary_max_deg).toBe(360);
    expect(k.supports_tcp).toBe(true);
  });

  it("Hermle C 42 U is head-head AB gimbal", () => {
    const k = mustFind("head_head_ab_hermle_c42u");
    expect(k.type).toBe("head_head_AB");
  });

  it("Doosan SMX does NOT support TCP", () => {
    const k = mustFind("trunnion_bc_doosan_smx");
    expect(k.supports_tcp).toBe(false);
  });

  it("listByType('table_table_AC') returns all AC trunnions", () => {
    const ac = Fusion360MultiAxisEngine.listByType("table_table_AC");
    expect(ac.length).toBeGreaterThanOrEqual(2);
    for (const k of ac) expect(k.type).toBe("table_table_AC");
  });

  it("listTcpCapable returns 7 of 8 (Doosan SMX excluded)", () => {
    const tcp = Fusion360MultiAxisEngine.listTcpCapable();
    expect(tcp.length).toBe(7);
    for (const k of tcp) expect(k.supports_tcp).toBe(true);
  });

  it("lookup returns null + mustLookup throws on unknown id", () => {
    expect(Fusion360MultiAxisEngine.lookup("nope")).toBeNull();
    expect(() => Fusion360MultiAxisEngine.mustLookup("nope")).toThrow(/unknown kinematic id/);
  });
});

// ── 3. validateOrientation ────────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — validateOrientation", () => {
  it("returns ok when orientation within envelope + TCP supported", () => {
    const r = Fusion360MultiAxisEngine.validateOrientation({
      kinematic_id: "table_table_ac_dmu_50",
      orientation: { primary_angle_deg: 45, secondary_angle_deg: 90, tcp_active: true },
    });
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags primary axis out of envelope (A=200° on DMU 50)", () => {
    const r = Fusion360MultiAxisEngine.validateOrientation({
      kinematic_id: "table_table_ac_dmu_50",
      orientation: { primary_angle_deg: 200, secondary_angle_deg: 90, tcp_active: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("A-axis"))).toBe(true);
  });

  it("flags secondary axis out of envelope", () => {
    const r = Fusion360MultiAxisEngine.validateOrientation({
      kinematic_id: "table_table_ac_dmu_50",
      orientation: { primary_angle_deg: 45, secondary_angle_deg: 400, tcp_active: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("C-axis"))).toBe(true);
  });

  it("flags TCP requested when kinematic does not support it", () => {
    const r = Fusion360MultiAxisEngine.validateOrientation({
      kinematic_id: "trunnion_bc_doosan_smx",
      orientation: { primary_angle_deg: 0, secondary_angle_deg: 0, tcp_active: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("TCP"))).toBe(true);
  });

  it("throws on unknown kinematic id", () => {
    expect(() => Fusion360MultiAxisEngine.validateOrientation({
      kinematic_id: "nope",
      orientation: { primary_angle_deg: 0, secondary_angle_deg: 0, tcp_active: false },
    })).toThrow(/unknown kinematic id/);
  });
});

// ── 4. planeRotationMatrix ────────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — planeRotationMatrix", () => {
  it("identity plane (Z normal, X reference) produces identity matrix", () => {
    const m = Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0], normal_ijk: [0, 0, 1], reference_dir_ijk: [1, 0, 0],
    });
    expect(m).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("output basis vectors are orthonormal (length 1, mutually perpendicular)", () => {
    const m = Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0],
      normal_ijk: [1, 1, 1],
      reference_dir_ijk: [1, 0, 0],
    });
    const x = [m[0], m[3], m[6]];
    const y = [m[1], m[4], m[7]];
    const z = [m[2], m[5], m[8]];
    expect(magnitude(x)).toBeCloseTo(1, 6);
    expect(magnitude(y)).toBeCloseTo(1, 6);
    expect(magnitude(z)).toBeCloseTo(1, 6);
    expect(dot(x, y)).toBeCloseTo(0, 6);
    expect(dot(y, z)).toBeCloseTo(0, 6);
    expect(dot(z, x)).toBeCloseTo(0, 6);
  });

  it("Z column equals normalized normal vector", () => {
    const normal: WCSPlane["normal_ijk"] = [3, 4, 0];
    const m = Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0], normal_ijk: normal, reference_dir_ijk: [0, 0, 1],
    });
    const z = [m[2], m[5], m[8]];
    expect(z[0]).toBeCloseTo(3 / 5, 6);
    expect(z[1]).toBeCloseTo(4 / 5, 6);
    expect(z[2]).toBeCloseTo(0, 6);
  });

  it("throws on zero-magnitude normal", () => {
    expect(() => Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0], normal_ijk: [0, 0, 0], reference_dir_ijk: [1, 0, 0],
    })).toThrow(/normal_ijk magnitude is zero/);
  });

  it("throws on zero-magnitude reference direction", () => {
    expect(() => Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0], normal_ijk: [0, 0, 1], reference_dir_ijk: [0, 0, 0],
    })).toThrow(/reference_dir_ijk magnitude is zero/);
  });

  it("throws when reference_dir is parallel to normal", () => {
    expect(() => Fusion360MultiAxisEngine.planeRotationMatrix({
      origin_xyz_mm: [0, 0, 0], normal_ijk: [0, 0, 1], reference_dir_ijk: [0, 0, 5],
    })).toThrow(/reference_dir parallel to normal/);
  });
});

// ── 5. Schema validation ──────────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — schema validation", () => {
  it("KinematicTypeSchema rejects unknown type", () => {
    const bad: unknown = "robotic_arm";
    expect(() => KinematicTypeSchema.parse(bad)).toThrow();
  });

  it("KinematicSchema rejects non-snake_case id", () => {
    expect(() => KinematicSchema.parse({
      id: "BadId", type: "table_table_AC", display_name: "x",
      primary_rotary: "A", secondary_rotary: "C",
      primary_min_deg: 0, primary_max_deg: 100, secondary_min_deg: 0, secondary_max_deg: 360,
      supports_tcp: true, supports_simultaneous: true, notes: "x",
    })).toThrow();
  });

  it("WCSPlaneSchema rejects 4-element tuple (must be 3D)", () => {
    expect(() => WCSPlaneSchema.parse({
      origin_xyz_mm: [0, 0, 0, 0],
      normal_ijk: [0, 0, 1],
      reference_dir_ijk: [1, 0, 0],
    })).toThrow();
  });

  it("ToolOrientationSchema rejects missing tcp_active", () => {
    const bad: unknown = { primary_angle_deg: 0, secondary_angle_deg: 0 };
    expect(() => ToolOrientationSchema.parse(bad)).toThrow();
  });
});

// ── 6. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360MultiAxisEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the multi-axis actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_multiaxis_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_multiaxis_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_multiaxis_validate");
    expect(mod.ACTIONS).toContain("cam_fusion360_multiaxis_plane_matrix");
    expect(mod.ACTIONS).toContain("cam_fusion360_multiaxis_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360MultiAxisEngine.js");
    expect(mod.Fusion360MultiAxisEngine.count()).toBe(8);
  });
});
