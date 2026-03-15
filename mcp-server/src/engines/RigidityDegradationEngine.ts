/**
 * RigidityDegradationEngine — Predict workpiece stiffness at every stage.
 *
 * MF Track Layer 3 (Physical Feasibility).
 * Flags features that become too flexible as material is removed.
 *
 * Physics:
 *   Cantilever: δ = F×H³/(3×E×I), I = L×t³/12
 *   Plate: δ = α×F×a²/(E×t³)
 *   Natural freq: fn = (λ₁²/2πH²)×√(EI/ρA), λ₁=1.875
 *   Bending stress: σ = F×H×(t/2)/I
 *   Chatter: tooth-passing harmonics vs natural frequency
 *
 * @module MF-MS1/RigidityDegradation
 */

import type {
  WorkpieceState, WallSection, OperationInput
} from "./WorkpieceStateEngine.js";

// ── Types ──

export interface MaterialStiffness {
  elastic_modulus_GPa: number;
  density_kg_m3: number;
  poisson_ratio?: number;
  yield_strength_MPa?: number;
}

export const MATERIAL_STIFFNESS: Record<string, MaterialStiffness> = {
  "6061-T6": { elastic_modulus_GPa: 68.9, density_kg_m3: 2700, poisson_ratio: 0.33, yield_strength_MPa: 276 },
  "7075-T6": { elastic_modulus_GPa: 71.7, density_kg_m3: 2810, poisson_ratio: 0.33, yield_strength_MPa: 503 },
  "1018": { elastic_modulus_GPa: 205, density_kg_m3: 7870, poisson_ratio: 0.29, yield_strength_MPa: 370 },
  "4140": { elastic_modulus_GPa: 205, density_kg_m3: 7850, poisson_ratio: 0.29, yield_strength_MPa: 655 },
  "304SS": { elastic_modulus_GPa: 193, density_kg_m3: 8000, poisson_ratio: 0.29, yield_strength_MPa: 215 },
  "Ti-6Al-4V": { elastic_modulus_GPa: 113.8, density_kg_m3: 4430, poisson_ratio: 0.34, yield_strength_MPa: 880 },
  "Inconel 718": { elastic_modulus_GPa: 205, density_kg_m3: 8190, poisson_ratio: 0.29, yield_strength_MPa: 1035 },
};

export interface RigidityIssue {
  type: "deflection" | "resonance" | "chatter"
    | "permanent_deformation" | "thin_floor_vibration";
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
}

export interface RigidityCheckResult {
  stiff_enough: boolean;
  deflection_mm: number;
  natural_freq_Hz: number;
  max_stress_MPa: number;
  exceeds_tolerance: boolean;
  tooth_passing_freq_Hz?: number;
  chatter_risk: "none" | "low" | "medium" | "high";
  issues: RigidityIssue[];
}

export interface CriticalFeature {
  wall: WallSection;
  deflection_mm: number;
  natural_freq_Hz: number;
  stiffness_N_mm: number;
  rank: number;
}

export interface SupportRecommendation {
  strategy: string;
  details: string;
  estimated_improvement_pct: number;
}

// ── Engine ──

export class RigidityDegradationEngine {
  readonly name = "RigidityDegradationEngine";

  /**
   * Check rigidity of workpiece for next operation.
   */
  checkRigidity(
    state: WorkpieceState,
    nextOp: OperationInput,
    material: MaterialStiffness,
    cuttingForce_N?: number,
    spindle_rpm?: number,
    flutes?: number
  ): RigidityCheckResult {
    const issues: RigidityIssue[] = [];
    const E = material.elastic_modulus_GPa * 1e3; // MPa
    const F = cuttingForce_N ?? 500;
    const tol = 0.05; // default tolerance mm

    let maxDefl = 0;
    let minFreq = Infinity;
    let maxStress = 0;

    for (const wall of state.wall_sections) {
      const I = (wall.length_mm * Math.pow(wall.thickness_mm, 3)) / 12;
      const defl = this.cantileverDeflection(F, wall.height_mm, E, I);
      const freq = this.naturalFrequency(
        E, I, material.density_kg_m3,
        wall.length_mm, wall.thickness_mm, wall.height_mm
      );
      const stress = this.bendingStress(
        F, wall.height_mm, wall.thickness_mm, wall.length_mm
      );

      if (defl > maxDefl) maxDefl = defl;
      if (freq < minFreq) minFreq = freq;
      if (stress > maxStress) maxStress = stress;
    }

    // Also check the feature being created
    const fWall = this.featureToWall(nextOp, state);
    if (fWall) {
      const I = (fWall.length * Math.pow(fWall.thickness, 3)) / 12;
      const defl = this.cantileverDeflection(F, fWall.height, E, I);
      const freq = this.naturalFrequency(
        E, I, material.density_kg_m3,
        fWall.length, fWall.thickness, fWall.height
      );
      const stress = this.bendingStress(F, fWall.height, fWall.thickness, fWall.length);

      if (defl > maxDefl) maxDefl = defl;
      if (freq < minFreq) minFreq = freq;
      if (stress > maxStress) maxStress = stress;
    }

    // Deflection check
    const exceedsTol = maxDefl > tol;
    if (exceedsTol) {
      issues.push({
        type: "deflection",
        severity: maxDefl > tol * 3 ? "error" : "warning",
        message: `Deflection ${maxDefl.toFixed(3)}mm exceeds ±${tol}mm tolerance`,
        suggestion: "Reduce DOC, add spring passes, or use support",
      });
    }

    // Chatter check
    let toothFreq: number | undefined;
    let chatter: "none" | "low" | "medium" | "high" = "none";

    if (spindle_rpm && flutes) {
      toothFreq = (spindle_rpm * flutes) / 60;
      chatter = this.assessChatter(minFreq, toothFreq);
      if (chatter === "high") {
        issues.push({
          type: "chatter",
          severity: "error",
          message: `fn=${minFreq.toFixed(0)}Hz near tooth-passing ${toothFreq.toFixed(0)}Hz`,
          suggestion: "Change RPM to avoid harmonic or reduce DOC",
        });
      } else if (chatter === "medium") {
        issues.push({
          type: "chatter",
          severity: "warning",
          message: `fn=${minFreq.toFixed(0)}Hz within 20% of tooth-passing harmonic`,
          suggestion: "Consider stability lobe analysis",
        });
      }
    }

    // Low natural frequency
    if (minFreq < 100 && minFreq > 0) {
      issues.push({
        type: "resonance",
        severity: minFreq < 50 ? "error" : "warning",
        message: `Natural frequency ${minFreq.toFixed(0)}Hz very low — vibration risk`,
        suggestion: "Add damping or support to thin sections",
      });
    }

    // Yield check
    if (material.yield_strength_MPa && maxStress > material.yield_strength_MPa * 0.8) {
      issues.push({
        type: "permanent_deformation",
        severity: maxStress > material.yield_strength_MPa ? "error" : "warning",
        message: `Stress ${maxStress.toFixed(0)}MPa near yield ${material.yield_strength_MPa}MPa`,
        suggestion: "Reduce cutting force or add support",
      });
    }

    // Thin floor check
    const thinFloors = state.wall_sections.filter(
      w => Math.abs(w.direction.z) > 0.5 && w.thickness_mm < 5
    );
    if (thinFloors.length > 0) {
      const t = Math.min(...thinFloors.map(f => f.thickness_mm));
      issues.push({
        type: "thin_floor_vibration",
        severity: t < 2 ? "error" : "warning",
        message: `Thin floor ${t.toFixed(1)}mm — vibration during machining`,
        suggestion: "Support from below, reduce feed, use vacuum",
      });
    }

    return {
      stiff_enough: !issues.some(i => i.severity === "error"),
      deflection_mm: maxDefl,
      natural_freq_Hz: minFreq === Infinity ? 0 : minFreq,
      max_stress_MPa: maxStress,
      exceeds_tolerance: exceedsTol,
      tooth_passing_freq_Hz: toothFreq,
      chatter_risk: chatter,
      issues,
    };
  }

  /**
   * Find critical features ranked by stiffness (weakest first).
   */
  findCriticalFeatures(
    state: WorkpieceState,
    material: MaterialStiffness,
    cuttingForce_N?: number
  ): CriticalFeature[] {
    const E = material.elastic_modulus_GPa * 1e3;
    const F = cuttingForce_N ?? 500;

    return state.wall_sections.map(wall => {
      const I = (wall.length_mm * Math.pow(wall.thickness_mm, 3)) / 12;
      const defl = this.cantileverDeflection(F, wall.height_mm, E, I);
      const freq = this.naturalFrequency(
        E, I, material.density_kg_m3,
        wall.length_mm, wall.thickness_mm, wall.height_mm
      );
      const k = I > 0 ? (3 * E * I) / Math.pow(wall.height_mm, 3) : 0;
      return { wall, deflection_mm: defl, natural_freq_Hz: freq, stiffness_N_mm: k, rank: 0 };
    })
    .sort((a, b) => a.stiffness_N_mm - b.stiffness_N_mm)
    .map((f, i) => ({ ...f, rank: i + 1 }));
  }

  /**
   * Recommend support strategies for a thin wall.
   */
  recommendSupport(
    wall: WallSection,
    material: MaterialStiffness
  ): SupportRecommendation[] {
    const recs: SupportRecommendation[] = [
      {
        strategy: "Spring passes",
        details: `2-3 finishing passes at ${(wall.thickness_mm * 0.02).toFixed(2)}mm DOC`,
        estimated_improvement_pct: 40,
      },
      {
        strategy: "Reduced DOC",
        details: `Limit ap to ${Math.min(wall.thickness_mm * 0.5, 1.0).toFixed(1)}mm`,
        estimated_improvement_pct: 30,
      },
      {
        strategy: "Climb milling only",
        details: "Push wall into support rather than pulling away",
        estimated_improvement_pct: 20,
      },
    ];

    if (wall.height_mm > 20) {
      recs.push({
        strategy: "Backing support",
        details: "Sacrificial backing material behind thin wall",
        estimated_improvement_pct: 60,
      });
    }

    if (wall.thickness_mm < 2) {
      recs.push({
        strategy: "Fill material (wax/Cerrobend)",
        details: "Fill pocket with support material during thin-wall machining",
        estimated_improvement_pct: 70,
      });
    }

    if (material.elastic_modulus_GPa < 100) {
      recs.push({
        strategy: "HSM light passes",
        details: "High-speed, light radial engagement (ae < 0.1×D) for aluminum",
        estimated_improvement_pct: 50,
      });
    }

    return recs.sort((a, b) => b.estimated_improvement_pct - a.estimated_improvement_pct);
  }

  // ── Physics ──

  /** δ = F×H³/(3×E×I) */
  cantileverDeflection(F: number, H: number, E: number, I: number): number {
    if (I <= 0 || E <= 0) return Infinity;
    return (F * Math.pow(H, 3)) / (3 * E * I);
  }

  /** fn = (λ₁²/2πH²)×√(EI/ρA), λ₁=1.875 */
  naturalFrequency(
    E: number, I: number, density: number,
    L: number, t: number, H: number
  ): number {
    if (I <= 0 || H <= 0) return 0;
    const lambda1 = 1.875;
    const A = L * t;
    const rho = density * 1e-9; // kg/mm³
    return (Math.pow(lambda1, 2) / (2 * Math.PI * Math.pow(H, 2)))
      * Math.sqrt((E * I) / (rho * A));
  }

  /** σ = F×H×(t/2)/I */
  bendingStress(F: number, H: number, t: number, L: number): number {
    const I = (L * Math.pow(t, 3)) / 12;
    if (I <= 0) return Infinity;
    return (F * H * (t / 2)) / I;
  }

  private assessChatter(fn: number, ft: number): "none" | "low" | "medium" | "high" {
    if (fn <= 0 || ft <= 0) return "none";
    for (let n = 1; n <= 5; n++) {
      const ratio = fn / (n * ft);
      if (ratio > 0.9 && ratio < 1.1) return "high";
      if (ratio > 0.8 && ratio < 1.2) return "medium";
    }
    if (fn < 200) return "low";
    return "none";
  }

  private featureToWall(
    op: OperationInput,
    state: WorkpieceState
  ): { thickness: number; height: number; length: number } | null {
    const pos = op.position ?? { x: 0, y: 0, z: state.stock.max.z };
    const opW = (op.width_mm ?? op.tool_diameter_mm) / 2;
    const opL = (op.length_mm ?? op.tool_diameter_mm) / 2;

    const wallsToEdge = [
      pos.x - opW - state.stock.min.x,
      state.stock.max.x - (pos.x + opW),
      pos.y - opL - state.stock.min.y,
      state.stock.max.y - (pos.y + opL),
    ].filter(d => d > 0 && d < 15);

    if (wallsToEdge.length === 0) return null;
    const minW = Math.min(...wallsToEdge);
    return {
      thickness: minW,
      height: op.depth_mm,
      length: Math.max(op.width_mm ?? op.tool_diameter_mm, op.length_mm ?? op.tool_diameter_mm),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECT-PARAMETER API (MF-MS1 spec methods)
  // ═══════════════════════════════════════════════════════════

  /** Material E lookup by name (GPa) */
  private static readonly E_DEFAULTS: Record<string, number> = {
    steel: 200, aluminum: 70, titanium: 114,
    "stainless steel": 193, inconel: 205, copper: 117, brass: 100,
  };

  /** Density lookup (kg/m3) */
  private static readonly RHO_DEFAULTS: Record<string, number> = {
    steel: 7850, aluminum: 2700, titanium: 4430,
    "stainless steel": 8000, inconel: 8190, copper: 8960, brass: 8500,
  };

  /**
   * Check rigidity with direct parameters (no WorkpieceState needed).
   *
   * Physics:
   *   Cantilever: delta = F*H^3 / (3*E*I), I = L*t^3/12
   *   Simply supported: delta = F*L^3 / (48*E*I)
   *   Clamped plate: delta = alpha*F*a^2 / (E*t^3), alpha~0.0138
   *   Natural freq: fn = (lambda1^2/(2*pi*H^2)) * sqrt(E*I/(rho*A))
   *   Stiffness: k = 3*E*I / H^3
   */
  checkRigidityDirect(params: {
    wall_thickness_mm: number;
    wall_height_mm: number;
    wall_length_mm: number;
    cutting_force_N: number;
    tolerance_mm?: number;
    material_E_GPa?: number;
    material_name?: string;
    density_kg_m3?: number;
    support_type?: "cantilever" | "supported" | "clamped";
  }): {
    stiff_enough: boolean;
    deflection_mm: number;
    natural_freq_Hz: number;
    max_safe_force_N: number;
    stiffness_N_per_mm: number;
    issues: string[];
  } {
    const t = params.wall_thickness_mm;
    const H = params.wall_height_mm;
    const L = params.wall_length_mm;
    const F = params.cutting_force_N;
    const tol = params.tolerance_mm ?? 0.05;
    const support = params.support_type ?? "cantilever";
    const issues: string[] = [];

    // Resolve material properties
    const matName = params.material_name?.toLowerCase() ?? "";
    const E_GPa = params.material_E_GPa
      ?? RigidityDegradationEngine.E_DEFAULTS[matName]
      ?? 200;
    const E = E_GPa * 1e3; // MPa
    const rho = params.density_kg_m3
      ?? RigidityDegradationEngine.RHO_DEFAULTS[matName]
      ?? 7850;

    // Second moment of area: I = L * t^3 / 12
    const I = (L * Math.pow(t, 3)) / 12;

    if (I <= 0 || t <= 0) {
      return {
        stiff_enough: false,
        deflection_mm: Infinity,
        natural_freq_Hz: 0,
        max_safe_force_N: 0,
        stiffness_N_per_mm: 0,
        issues: ["Zero or negative wall thickness — no structural rigidity"],
      };
    }

    // Calculate deflection based on support type
    let deflection: number;
    let stiffness: number;

    switch (support) {
      case "supported":
        // Simply supported beam: delta = F*L^3 / (48*E*I)
        deflection = (F * Math.pow(L, 3)) / (48 * E * I);
        stiffness = (48 * E * I) / Math.pow(L, 3);
        break;
      case "clamped":
        // Clamped plate: delta = alpha*F*a^2 / (E*t^3)
        // alpha ~ 0.0138 for uniformly loaded square plate
        deflection = (0.0138 * F * Math.pow(L, 2)) / (E * Math.pow(t, 3));
        stiffness = F > 0 ? F / deflection : (E * Math.pow(t, 3)) / (0.0138 * Math.pow(L, 2));
        break;
      default: // cantilever
        // delta = F*H^3 / (3*E*I)
        deflection = (F * Math.pow(H, 3)) / (3 * E * I);
        stiffness = (3 * E * I) / Math.pow(H, 3);
        break;
    }

    // Natural frequency: fn = (lambda1^2/(2*pi*H^2)) * sqrt(E*I/(rho*A))
    const lambda1 = 1.875; // first mode cantilever
    const A = L * t; // cross-section area
    const rhoMM = rho * 1e-9; // kg/mm^3
    const fn = H > 0
      ? (Math.pow(lambda1, 2) / (2 * Math.PI * Math.pow(H, 2)))
        * Math.sqrt((E * I) / (rhoMM * A))
      : 0;

    // Max safe force: force that produces deflection = tolerance
    const maxSafeForce = tol > 0 && deflection > 0
      ? F * (tol / deflection)
      : Infinity;

    // Issue detection
    if (deflection > tol) {
      const ratio = deflection / tol;
      issues.push(
        `Deflection ${deflection.toFixed(4)}mm exceeds`
        + ` tolerance ${tol}mm (${ratio.toFixed(1)}x over)`
      );
      if (ratio > 3) {
        issues.push("CRITICAL: deflection > 3x tolerance — part will be out of spec");
      }
    }

    if (fn > 0 && fn < 100) {
      issues.push(
        `Low natural frequency ${fn.toFixed(0)}Hz — high vibration risk`
      );
    }

    if (t < 1.0) {
      issues.push(`Very thin wall ${t.toFixed(2)}mm — fragile`);
    }

    const aspectRatio = H / t;
    if (aspectRatio > 15) {
      issues.push(
        `High aspect ratio ${aspectRatio.toFixed(1)}:1 (H/t)`
        + ` — spring-back and vibration likely`
      );
    }

    return {
      stiff_enough: deflection <= tol,
      deflection_mm: deflection,
      natural_freq_Hz: fn,
      max_safe_force_N: maxSafeForce,
      stiffness_N_per_mm: stiffness,
      issues,
    };
  }

  /**
   * Predict stiffness evolution as operations progressively thin the wall.
   *
   * Physics: stiffness proportional to t^3, fn decreases as t decreases.
   */
  predictStiffnessEvolution(params: {
    initial_thickness_mm: number;
    operations: Array<{ depth_mm: number; removes_thickness_mm: number }>;
    wall_height_mm: number;
    wall_length_mm: number;
    material_E_GPa?: number;
    material_name?: string;
    density_kg_m3?: number;
  }): Array<{
    after_op: number;
    thickness_mm: number;
    stiffness_N_per_mm: number;
    fn_Hz: number;
    deflection_at_100N_mm: number;
  }> {
    const matName = params.material_name?.toLowerCase() ?? "";
    const E_GPa = params.material_E_GPa
      ?? RigidityDegradationEngine.E_DEFAULTS[matName]
      ?? 200;
    const E = E_GPa * 1e3;
    const rho = params.density_kg_m3
      ?? RigidityDegradationEngine.RHO_DEFAULTS[matName]
      ?? 7850;
    const H = params.wall_height_mm;
    const L = params.wall_length_mm;
    const rhoMM = rho * 1e-9;
    const lambda1 = 1.875;

    const results: Array<{
      after_op: number;
      thickness_mm: number;
      stiffness_N_per_mm: number;
      fn_Hz: number;
      deflection_at_100N_mm: number;
    }> = [];

    let t = params.initial_thickness_mm;

    for (let i = 0; i < params.operations.length; i++) {
      t = Math.max(0, t - params.operations[i].removes_thickness_mm);

      const I = (L * Math.pow(t, 3)) / 12;
      const k = H > 0 && I > 0
        ? (3 * E * I) / Math.pow(H, 3)
        : 0;
      const fn = (H > 0 && I > 0 && t > 0)
        ? (Math.pow(lambda1, 2) / (2 * Math.PI * Math.pow(H, 2)))
          * Math.sqrt((E * I) / (rhoMM * L * t))
        : 0;
      const defl100 = k > 0 ? 100 / k : Infinity;

      results.push({
        after_op: i + 1,
        thickness_mm: t,
        stiffness_N_per_mm: k,
        fn_Hz: fn,
        deflection_at_100N_mm: defl100,
      });
    }

    return results;
  }

  /**
   * Find critical features from a list of wall sections (direct params).
   *
   * Returns sections ranked by risk level based on deflection vs tolerance.
   */
  findCriticalFeaturesDirect(params: {
    wall_sections: Array<{
      section_id: string;
      thickness_mm: number;
      height_mm: number;
      length_mm: number;
    }>;
    cutting_force_N: number;
    tolerance_mm: number;
    material_E_GPa?: number;
    material_name?: string;
  }): Array<{
    section_id: string;
    risk_level: "safe" | "marginal" | "critical";
    deflection_mm: number;
    reason: string;
  }> {
    const matName = params.material_name?.toLowerCase() ?? "";
    const E_GPa = params.material_E_GPa
      ?? RigidityDegradationEngine.E_DEFAULTS[matName]
      ?? 200;
    const E = E_GPa * 1e3;
    const F = params.cutting_force_N;
    const tol = params.tolerance_mm;

    return params.wall_sections.map(w => {
      const I = (w.length_mm * Math.pow(w.thickness_mm, 3)) / 12;
      const defl = I > 0
        ? (F * Math.pow(w.height_mm, 3)) / (3 * E * I)
        : Infinity;

      let risk: "safe" | "marginal" | "critical";
      let reason: string;

      if (defl > tol * 2) {
        risk = "critical";
        reason = `Deflection ${defl.toFixed(4)}mm > 2x tolerance`
          + ` (${w.thickness_mm}mm thick, ${w.height_mm}mm tall)`;
      } else if (defl > tol * 0.7) {
        risk = "marginal";
        reason = `Deflection ${defl.toFixed(4)}mm near tolerance`
          + ` (${w.thickness_mm}mm thick)`;
      } else {
        risk = "safe";
        reason = `Deflection ${defl.toFixed(4)}mm within tolerance`;
      }

      return { section_id: w.section_id, risk_level: risk, deflection_mm: defl, reason };
    }).sort((a, b) => {
      const order = { critical: 0, marginal: 1, safe: 2 };
      return order[a.risk_level] - order[b.risk_level];
    });
  }

  /**
   * Recommend support strategies for a thin wall (direct params).
   *
   * Calculates spring passes, reduced DOC, and support methods.
   */
  recommendSupportDirect(params: {
    wall_thickness_mm: number;
    wall_height_mm: number;
    cutting_force_N: number;
    tolerance_mm: number;
    material_E_GPa?: number;
    material_name?: string;
  }): {
    spring_passes: number;
    reduced_doc_mm: number;
    backing_recommended: boolean;
    fill_strategy?: string;
  } {
    const t = params.wall_thickness_mm;
    const H = params.wall_height_mm;
    const matName = params.material_name?.toLowerCase() ?? "";
    const E_GPa = params.material_E_GPa
      ?? RigidityDegradationEngine.E_DEFAULTS[matName]
      ?? 200;

    // Spring passes: more passes for thinner walls
    // Rule: 1 pass per 0.5mm of tolerance concern, min 1, max 5
    const aspectRatio = H / t;
    let springPasses = Math.min(5, Math.max(1, Math.ceil(aspectRatio / 5)));

    // Reduced DOC: limit to fraction of wall thickness
    // Thinner walls need lighter cuts
    let reducedDoc: number;
    if (t < 1) {
      reducedDoc = t * 0.05; // 5% of wall
      springPasses = 5;
    } else if (t < 3) {
      reducedDoc = t * 0.1; // 10% of wall
      springPasses = Math.max(springPasses, 3);
    } else if (t < 5) {
      reducedDoc = Math.min(t * 0.15, 0.5);
    } else {
      reducedDoc = Math.min(t * 0.2, 1.0);
    }

    // Backing recommended when aspect ratio > 10 or wall < 2mm
    const backingRecommended = aspectRatio > 10 || t < 2;

    // Fill strategy for extreme cases
    let fillStrategy: string | undefined;
    if (t < 1.5 && H > 15) {
      fillStrategy = "wax_fill";
    } else if (t < 1 && H > 10) {
      fillStrategy = "cerrobend_fill";
    } else if (t < 2 && E_GPa < 100) {
      // Aluminum thin walls benefit from ice/wax fill
      fillStrategy = "ice_or_wax_fill";
    }

    return {
      spring_passes: springPasses,
      reduced_doc_mm: reducedDoc,
      backing_recommended: backingRecommended,
      fill_strategy: fillStrategy,
    };
  }
}

export const rigidityDegradationEngine = new RigidityDegradationEngine();
