/**
 * WorkholdingViabilityEngine — Track clamping viability as material is removed.
 *
 * MF Track Layer 3 (Physical Feasibility).
 * Models: Coulomb grip force, vacuum seal integrity, moment balance,
 * lift-off prevention, datum surface integrity tracking.
 *
 * Physics:
 *   F_grip = μ × P × A_remaining
 *   M_clamp = n × F_clamp × μ × r_arm
 *   Vacuum: seal_intact = no through-holes in seal zone
 *
 * @module MF-MS1/WorkholdingViability
 */

import type {
  WorkpieceState, ClampingZone, OperationInput, Surface
} from "./WorkpieceStateEngine.js";

// ── Types ──

export type FixtureType =
  | "vise" | "chuck_3jaw" | "chuck_4jaw" | "chuck_6jaw"
  | "collet" | "vacuum" | "magnetic" | "soft_jaws"
  | "fixture_plate" | "tombstone" | "pallet";

export interface WorkholdingConfig {
  fixture_type: FixtureType;
  friction_coeff?: number;
  clamping_pressure_MPa?: number;
  clamped_faces?: ClampingZone["face"][];
  clamp_count?: number;
  max_clamp_force_N?: number;
}

export interface WorkholdingIssue {
  type: "grip_insufficient" | "rotation_risk" | "lift_off_risk"
    | "vacuum_seal_broken" | "surface_area_low" | "clamp_surface_removed";
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
}

export interface WorkholdingViabilityResult {
  viable: boolean;
  grip_safety_factor: number;
  rotation_safety_factor: number;
  lift_safety_factor: number;
  vacuum_seal_intact?: boolean;
  issues: WorkholdingIssue[];
  forces: {
    grip_force_N: number;
    cutting_force_N: number;
    cutting_moment_Nm: number;
    clamp_moment_Nm: number;
    axial_force_N: number;
    normal_clamp_N: number;
  };
}

export interface SurfaceTrackingResult {
  clamp_surfaces: Array<{
    surface_id: string;
    face: string;
    area_mm2: number;
    usable: boolean;
  }>;
  total_clamp_area_mm2: number;
  original_clamp_area_mm2: number;
  area_retention_pct: number;
}

export interface FixtureSuggestion {
  fixture_type: FixtureType;
  confidence: number;
  warnings: string[];
  reason: string;
}

// ── Engine ──

export class WorkholdingViabilityEngine {
  readonly name = "WorkholdingViabilityEngine";

  private static readonly FRICTION: Record<string, number> = {
    vise: 0.15, chuck_3jaw: 0.2, chuck_4jaw: 0.2, chuck_6jaw: 0.25,
    collet: 0.25, vacuum: 0.3, magnetic: 0.15, soft_jaws: 0.3,
    fixture_plate: 0.15, tombstone: 0.15, pallet: 0.15,
  };

  private static readonly MIN_SF = 1.5;

  /**
   * Check workholding viability for the next operation.
   */
  checkViability(
    state: WorkpieceState,
    nextOp: OperationInput,
    fixture: WorkholdingConfig,
    cuttingForce_N?: number
  ): WorkholdingViabilityResult {
    const issues: WorkholdingIssue[] = [];
    const mu = fixture.friction_coeff
      ?? WorkholdingViabilityEngine.FRICTION[fixture.fixture_type] ?? 0.15;
    const F_cut = cuttingForce_N ?? 500;
    const F_axial = F_cut * 0.4;

    // Clamping area from specified faces
    const faces = fixture.clamped_faces ?? ["left", "right"];
    let totalArea = 0;
    for (const face of faces) {
      const zone = state.clamping_zones.find(z => z.face === face);
      if (zone) totalArea += zone.available_area_mm2;
    }

    // Normal clamping force: F_n = P × A
    const P_Pa = (fixture.clamping_pressure_MPa ?? 5) * 1e6;
    const A_m2 = totalArea * 1e-6;
    const F_normal = P_Pa * A_m2;
    const F_grip = mu * F_normal;

    // Safety factors
    const gripSF = F_cut > 0 ? F_grip / F_cut : Infinity;
    const liftSF = F_axial > 0 ? F_normal / F_axial : Infinity;

    // Moment balance
    const stockW = state.stock.max.x - state.stock.min.x;
    const stockL = state.stock.max.y - state.stock.min.y;
    const armCut = Math.min(stockW, stockL) / 2;
    const M_cut = (F_cut * armCut) / 1000; // Nm

    const nClamps = fixture.clamp_count ?? 2;
    const F_each = fixture.max_clamp_force_N ?? (F_normal / Math.max(1, nClamps));
    const armClamp = armCut * 0.8;
    const M_clamp = (nClamps * F_each * mu * armClamp) / 1000;
    const rotSF = M_cut > 0 ? M_clamp / M_cut : Infinity;

    // Issue detection
    if (gripSF < WorkholdingViabilityEngine.MIN_SF) {
      issues.push({
        type: "grip_insufficient",
        severity: gripSF < 1.0 ? "error" : "warning",
        message: `Grip SF ${gripSF.toFixed(2)} (need ≥${WorkholdingViabilityEngine.MIN_SF})`,
        suggestion: "Increase clamping pressure or add clamps",
      });
    }

    if (rotSF < WorkholdingViabilityEngine.MIN_SF) {
      issues.push({
        type: "rotation_risk",
        severity: rotSF < 1.0 ? "error" : "warning",
        message: `Rotation SF ${rotSF.toFixed(2)} — part may rotate in fixture`,
        suggestion: "Add anti-rotation pin or use 4-jaw chuck",
      });
    }

    if (liftSF < WorkholdingViabilityEngine.MIN_SF) {
      issues.push({
        type: "lift_off_risk",
        severity: liftSF < 1.0 ? "error" : "warning",
        message: `Lift-off SF ${liftSF.toFixed(2)} — part may lift`,
        suggestion: "Add top clamps or vacuum assist",
      });
    }

    // Surface area degradation
    let origArea = 0;
    for (const face of faces) {
      const zone = state.clamping_zones.find(z => z.face === face);
      if (zone) origArea += zone.original_area_mm2;
    }
    if (origArea > 0 && totalArea / origArea < 0.5) {
      issues.push({
        type: "surface_area_low",
        severity: totalArea / origArea < 0.3 ? "error" : "warning",
        message: `Clamp area at ${(100 * totalArea / origArea).toFixed(0)}% of original`,
        suggestion: "Re-fixture using different faces",
      });
    }

    // Vacuum seal check
    let vacuumIntact: boolean | undefined;
    if (fixture.fixture_type === "vacuum") {
      vacuumIntact = !state.operations_applied.some(
        op => op.type === "hole" || op.type === "drill"
      );
      if (nextOp.type === "hole" || nextOp.type === "drill") vacuumIntact = false;
      if (!vacuumIntact) {
        issues.push({
          type: "vacuum_seal_broken",
          severity: "error",
          message: "Through-hole breaks vacuum seal",
          suggestion: "Switch to mechanical clamping",
        });
      }
    }

    // Check destroyed clamping faces
    for (const face of faces) {
      const zone = state.clamping_zones.find(z => z.face === face);
      if (zone && !zone.is_accessible) {
        issues.push({
          type: "clamp_surface_removed",
          severity: "error",
          message: `Clamping face '${face}' no longer accessible`,
          suggestion: "Re-fixture using different faces",
        });
      }
    }

    return {
      viable: !issues.some(i => i.severity === "error"),
      grip_safety_factor: gripSF,
      rotation_safety_factor: rotSF,
      lift_safety_factor: liftSF,
      vacuum_seal_intact: vacuumIntact,
      issues,
      forces: {
        grip_force_N: F_grip,
        cutting_force_N: F_cut,
        cutting_moment_Nm: M_cut,
        clamp_moment_Nm: M_clamp,
        axial_force_N: F_axial,
        normal_clamp_N: F_normal,
      },
    };
  }

  /**
   * Track surface availability for clamping.
   */
  trackSurfaces(state: WorkpieceState): SurfaceTrackingResult {
    const clampSurfaces = state.clamping_zones.map(z => ({
      surface_id: z.surfaces[0] ?? z.face,
      face: z.face,
      area_mm2: z.available_area_mm2,
      usable: z.is_accessible && z.available_area_mm2 > 100,
    }));

    const total = clampSurfaces
      .filter(s => s.usable)
      .reduce((sum, s) => sum + s.area_mm2, 0);

    const orig = state.clamping_zones
      .reduce((sum, z) => sum + z.original_area_mm2, 0);

    return {
      clamp_surfaces: clampSurfaces,
      total_clamp_area_mm2: total,
      original_clamp_area_mm2: orig,
      area_retention_pct: orig > 0 ? (total / orig) * 100 : 100,
    };
  }

  /**
   * Suggest best fixture for remaining operations.
   */
  suggestFixturing(
    state: WorkpieceState,
    remainingOps: OperationInput[]
  ): FixtureSuggestion[] {
    const candidates: Array<{
      type: FixtureType; faces: ClampingZone["face"][]; minArea: number; reason: string;
    }> = [
      { type: "vise", faces: ["left", "right"], minArea: 500, reason: "Standard vise on sides" },
      { type: "vacuum", faces: ["bottom"], minArea: 2000, reason: "Vacuum for full top access" },
      { type: "fixture_plate", faces: ["bottom"], minArea: 1000, reason: "Fixture plate + toe clamps" },
      { type: "soft_jaws", faces: ["left", "right", "front", "back"], minArea: 300, reason: "Soft jaws conform to profile" },
    ];

    return candidates.map(c => {
      let area = 0;
      const warnings: string[] = [];
      for (const face of c.faces) {
        const zone = state.clamping_zones.find(z => z.face === face);
        if (zone) area += zone.available_area_mm2;
      }
      if (area < c.minArea) warnings.push(`Insufficient area: ${area.toFixed(0)} < ${c.minArea}mm²`);
      if (c.type === "vacuum" && remainingOps.some(o => o.type === "hole" || o.type === "drill")) {
        warnings.push("Through-holes will break vacuum seal");
      }
      return {
        fixture_type: c.type,
        confidence: Math.max(0, Math.min(100, 100 - warnings.length * 25)),
        warnings,
        reason: c.reason,
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECT-PARAMETER API (MF-MS1 spec methods)
  // ═══════════════════════════════════════════════════════════

  /**
   * Check viability with direct parameters (no WorkpieceState needed).
   *
   * Physics: F_grip = mu * P * A_remaining
   *          Must exceed F_cutting * safety_factor (default 2.0)
   */
  checkViabilityDirect(params: {
    clamping_zones: Array<{
      id: string;
      face: string;
      area_mm2: number;
      clamp_force_N?: number;
      friction_coeff?: number;
    }>;
    cutting_force_N: number;
    fixture_type?: string;
    friction_coeff?: number;
    safety_factor?: number;
  }): {
    viable: boolean;
    grip_margin: number;
    issues: string[];
    force_capacity_N: number;
  } {
    const mu = params.friction_coeff ?? 0.3;
    const sf = params.safety_factor ?? 2.0;
    const issues: string[] = [];
    const defaultPressure = 5.0; // MPa

    if (params.clamping_zones.length === 0) {
      return {
        viable: false,
        grip_margin: -1,
        issues: ["No clamping zones defined"],
        force_capacity_N: 0,
      };
    }

    let totalGrip = 0;
    let totalArea = 0;

    for (const zone of params.clamping_zones) {
      const zoneMu = zone.friction_coeff ?? mu;
      const force = zone.clamp_force_N
        ?? (defaultPressure * zone.area_mm2);
      totalGrip += zoneMu * force;
      totalArea += zone.area_mm2;

      if (zone.area_mm2 < 100) {
        issues.push(
          `Zone ${zone.id} (${zone.face}): area`
          + ` ${zone.area_mm2.toFixed(0)}mm2 below 100mm2 minimum`
        );
      }
    }

    const required = params.cutting_force_N * sf;
    const margin = totalGrip > 0
      ? (totalGrip - required) / required
      : -1;

    if (totalGrip < required) {
      issues.push(
        `Insufficient grip: ${totalGrip.toFixed(0)}N capacity`
        + ` vs ${required.toFixed(0)}N required`
        + ` (${params.cutting_force_N.toFixed(0)}N x SF ${sf})`
      );
    }

    if (params.clamping_zones.length === 1) {
      issues.push(
        "Single clamp zone — part may rotate under cutting force"
      );
    }

    const faces = new Set(params.clamping_zones.map(z => z.face));
    if (faces.size === 1 && params.clamping_zones.length > 1) {
      issues.push(
        "All clamps on same face — poor moment resistance"
      );
    }

    if (params.fixture_type === "vacuum" && totalArea < 500) {
      issues.push("Vacuum needs >= 500mm2 sealed area");
    }

    return {
      viable: totalGrip >= required,
      grip_margin: margin,
      issues,
      force_capacity_N: totalGrip,
    };
  }

  /**
   * Track grip degradation as material is removed.
   *
   * Physics: F_grip = mu * P(MPa) * A_remaining(mm2)
   * Critical when remaining grip ratio < 0.5.
   */
  trackSurfaceDegradation(params: {
    original_area_mm2: number;
    removed_area_mm2: number;
    friction_coeff?: number;
    clamp_pressure_MPa?: number;
  }): {
    remaining_grip_N: number;
    grip_ratio: number;
    critical: boolean;
  } {
    const mu = params.friction_coeff ?? 0.3;
    const P = params.clamp_pressure_MPa ?? 5.0;

    const remaining = Math.max(
      0, params.original_area_mm2 - params.removed_area_mm2
    );
    const ratio = params.original_area_mm2 > 0
      ? remaining / params.original_area_mm2
      : 0;

    // F_grip = mu * P(N/mm2) * A(mm2) = N
    const gripN = mu * P * remaining;

    return {
      remaining_grip_N: gripN,
      grip_ratio: ratio,
      critical: ratio < 0.5,
    };
  }

  /**
   * Check vacuum seal integrity.
   *
   * Through-holes break vacuum seal — each contributes pi*r^2 leak area.
   */
  checkVacuumSeal(params: {
    seal_perimeter_mm: number;
    through_holes: number[];
    sealed: boolean;
  }): {
    intact: boolean;
    leak_area_mm2: number;
  } {
    if (!params.sealed) {
      return { intact: false, leak_area_mm2: Infinity };
    }

    let leakArea = 0;
    for (const d of params.through_holes) {
      leakArea += Math.PI * Math.pow(d / 2, 2);
    }

    return {
      intact: params.through_holes.length === 0 || leakArea === 0,
      leak_area_mm2: leakArea,
    };
  }

  /**
   * Check datum surface integrity before an operation.
   *
   * Datums destroyed when operation cuts into their zone.
   * Datums at risk when operation is within 5mm proximity.
   */
  checkDatumIntegrity(params: {
    datum_surfaces: Array<{
      id: string;
      type: "primary" | "secondary" | "tertiary";
      zone: string;
      area_mm2: number;
      position_mm: { x: number; y: number; z: number };
    }>;
    next_operation: {
      type: string;
      position: { x: number; y: number; z: number };
      depth_mm?: number;
      approach?: string;
    };
  }): {
    intact: boolean;
    at_risk: string[];
    destroyed: string[];
  } {
    const atRisk: string[] = [];
    const destroyed: string[] = [];
    const op = params.next_operation;
    const approach = op.approach ?? "top";

    const zoneMap: Record<string, string[]> = {
      top: ["top"], bottom: ["bottom"],
      left: ["left"], right: ["right"],
      front: ["front"], back: ["back"],
    };

    const affected = zoneMap[approach] ?? [];

    for (const datum of params.datum_surfaces) {
      if (affected.includes(datum.zone) && (op.depth_mm ?? 0) > 0) {
        destroyed.push(datum.id);
        continue;
      }

      // Proximity check
      const dist = Math.sqrt(
        Math.pow(op.position.x - datum.position_mm.x, 2) +
        Math.pow(op.position.y - datum.position_mm.y, 2) +
        Math.pow(op.position.z - datum.position_mm.z, 2)
      );

      if (dist < 5 && !destroyed.includes(datum.id)) {
        atRisk.push(datum.id);
      }
    }

    return {
      intact: destroyed.length === 0 && atRisk.length === 0,
      at_risk: atRisk,
      destroyed,
    };
  }

  /**
   * Suggest fixturing from available surfaces (direct params).
   *
   * Physics: F_clamp_min = F_cut_max * SF / mu
   */
  suggestFixturingDirect(params: {
    available_surfaces: Array<{
      id: string;
      face: string;
      area_mm2: number;
    }>;
    part_weight_N: number;
    max_cutting_force_N: number;
  }): {
    fixture_type: string;
    clamp_positions: string[];
    min_clamp_force_N: number;
    warnings: string[];
  } {
    const mu = 0.3;
    const sf = 2.0;
    const warnings: string[] = [];
    const minForce = (params.max_cutting_force_N * sf) / mu;

    const faceAreas: Record<string, number> = {};
    for (const s of params.available_surfaces) {
      faceAreas[s.face] = (faceAreas[s.face] ?? 0) + s.area_mm2;
    }

    const totalArea = Object.values(faceAreas).reduce(
      (s, a) => s + a, 0
    );
    let fixtureType = "vise";
    const positions: string[] = [];

    if ((faceAreas["bottom"] ?? 0) > 2000) {
      fixtureType = totalArea > 5000 ? "vacuum" : "magnetic_chuck";
      positions.push("bottom surface");
    } else if (
      (faceAreas["left"] ?? 0) > 200
      && (faceAreas["right"] ?? 0) > 200
    ) {
      fixtureType = "vise";
      positions.push("left face", "right face");
    } else if ((faceAreas["top"] ?? 0) > 400) {
      fixtureType = "toe_clamps";
      positions.push("top perimeter");
    } else {
      fixtureType = "soft_jaws";
      for (const face of Object.keys(faceAreas)) {
        positions.push(`${face} face`);
      }
    }

    if (totalArea < 100) {
      warnings.push(
        `Total area ${totalArea.toFixed(0)}mm2 very small — custom fixture needed`
      );
    }
    if (params.part_weight_N > 200 && fixtureType === "vacuum") {
      warnings.push("Heavy part on vacuum — add safety stops");
    }
    if (minForce > 10000) {
      warnings.push(
        `High clamp force ${minForce.toFixed(0)}N — check for part deformation`
      );
    }
    if (params.available_surfaces.length < 2) {
      warnings.push("Limited surfaces — consider sacrificial tabs");
    }

    return {
      fixture_type: fixtureType,
      clamp_positions: positions,
      min_clamp_force_N: minForce,
      warnings,
    };
  }
}

export const workholdingViabilityEngine = new WorkholdingViabilityEngine();
