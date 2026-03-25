/**
 * CompositesMachiningPhysicsEngine — Advanced Materials Machining
 *
 * Physics-based composite material machining analysis:
 * - Tsai-Hill failure criterion for delamination risk
 * - Fiber pullout length model (σf·df / 4·τi)
 * - Multi-objective cutting parameter optimization (min delamination + max MRR)
 *
 * Actions: composite_delamination, composite_fiber_pullout, composite_optimize
 */

// ============================================================================
// TYPES
// ============================================================================

export type FiberType = "carbon" | "glass" | "aramid" | "kevlar";

export interface DelaminationInput {
  fiber_type: FiberType;
  layup_angle_deg: number;
  feed_per_tooth_mm: number;
  cutting_speed_mpm: number;
  tool_diameter_mm: number;
  depth_of_cut_mm: number;
}

export interface DelaminationResult {
  delamination_risk: number;
  tsai_hill_index: number;
  critical_thrust_force_N: number;
  recommended_feed_range: { min_mm: number; max_mm: number };
  tool_recommendations: string[];
  stress_components: {
    sigma1_MPa: number;
    sigma2_MPa: number;
    tau12_MPa: number;
  };
  warnings: string[];
}

export interface FiberPulloutInput {
  fiber_type: FiberType;
  fiber_volume_fraction: number;
  feed_per_tooth_mm: number;
  cutting_speed_mpm: number;
  tool_rake_angle_deg: number;
}

export interface FiberPulloutResult {
  pullout_length_mm: number;
  surface_quality_impact: "minimal" | "moderate" | "severe" | "critical";
  recommended_tool_geometry: {
    rake_angle_deg: number;
    clearance_angle_deg: number;
    helix_angle_deg: number;
    point_angle_deg: number;
  };
  fiber_damage_zone_mm: number;
  matrix_cracking_risk: number;
  warnings: string[];
}

export interface CompositeOptimizeInput {
  fiber_type: FiberType;
  layup_angle_deg: number;
  tool_diameter_mm: number;
  depth_of_cut_mm: number;
  target_Ra_um?: number;
  max_delamination_risk?: number;
}

export interface CompositeOptimizeResult {
  optimal_speed_mpm: number;
  optimal_feed_mm: number;
  expected_Ra_um: number;
  tool_wear_rate_um_per_m: number;
  mrr_cm3_per_min: number;
  delamination_risk: number;
  tsai_hill_index: number;
  pareto_alternatives: Array<{
    speed_mpm: number;
    feed_mm: number;
    mrr_cm3_per_min: number;
    delamination_risk: number;
    Ra_um: number;
  }>;
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASES
// ============================================================================

interface FiberProps {
  tensile_strength_MPa: number;
  fiber_diameter_um: number;
  elastic_modulus_GPa: number;
  interface_shear_MPa: number;
  thermal_conductivity_W_mK: number;
  density_kg_m3: number;
  /** Longitudinal strength */
  X_MPa: number;
  /** Transverse strength */
  Y_MPa: number;
  /** Shear strength */
  S_MPa: number;
  /** Max recommended speed m/min */
  max_speed_mpm: number;
  /** Recommended feed range mm/tooth */
  feed_range: { min: number; max: number };
}

const FIBER_PROPERTIES: Record<FiberType, FiberProps> = {
  carbon: {
    tensile_strength_MPa: 3500,
    fiber_diameter_um: 7,
    elastic_modulus_GPa: 230,
    interface_shear_MPa: 75,
    thermal_conductivity_W_mK: 10,
    density_kg_m3: 1600,
    X_MPa: 1500,
    Y_MPa: 40,
    S_MPa: 68,
    max_speed_mpm: 300,
    feed_range: { min: 0.02, max: 0.12 },
  },
  glass: {
    tensile_strength_MPa: 2400,
    fiber_diameter_um: 15,
    elastic_modulus_GPa: 72,
    interface_shear_MPa: 45,
    thermal_conductivity_W_mK: 1.0,
    density_kg_m3: 2000,
    X_MPa: 1000,
    Y_MPa: 30,
    S_MPa: 50,
    max_speed_mpm: 400,
    feed_range: { min: 0.03, max: 0.15 },
  },
  aramid: {
    tensile_strength_MPa: 3000,
    fiber_diameter_um: 12,
    elastic_modulus_GPa: 130,
    interface_shear_MPa: 30,
    thermal_conductivity_W_mK: 0.04,
    density_kg_m3: 1440,
    X_MPa: 1400,
    Y_MPa: 12,
    S_MPa: 34,
    max_speed_mpm: 250,
    feed_range: { min: 0.01, max: 0.08 },
  },
  kevlar: {
    tensile_strength_MPa: 3620,
    fiber_diameter_um: 12,
    elastic_modulus_GPa: 131,
    interface_shear_MPa: 25,
    thermal_conductivity_W_mK: 0.04,
    density_kg_m3: 1440,
    X_MPa: 1300,
    Y_MPa: 11,
    S_MPa: 30,
    max_speed_mpm: 200,
    feed_range: { min: 0.01, max: 0.06 },
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class CompositesMachiningPhysicsEngine {
  /**
   * Assess delamination risk using Tsai-Hill failure criterion.
   * Tsai-Hill: (σ1/X)² - (σ1·σ2/X²) + (σ2/Y)² + (τ12/S)² >= 1 → failure
   * Ref: Tsai & Wu (1971), J Composite Materials 5(1):58-80
   * Hocheng-Dharan delamination: Hocheng & Dharan (1990), ASME J Eng for Industry 112(3):236-239
   */
  assessDelaminationRisk(input: DelaminationInput): DelaminationResult {
    const props = FIBER_PROPERTIES[input.fiber_type];
    const warnings: string[] = [];

    // Layup angle in radians
    const theta = (input.layup_angle_deg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Cutting force estimation using composite-specific Kienzle-like model
    // Fc ≈ kc · ap · fz where kc depends on fiber type and orientation
    const kc_base = this._getSpecificCuttingForce(input.fiber_type);
    const orientation_factor = 1 + 0.5 * Math.abs(Math.sin(2 * theta)); // max at 45°
    const kc = kc_base * orientation_factor;

    const Fc = kc * input.depth_of_cut_mm * input.feed_per_tooth_mm; // N
    const Ft = Fc * 0.4; // thrust force ≈ 40% of cutting force

    // Stress in ply coordinate system from cutting forces
    // Approximate stress from force distributed over engagement area
    const engagement_area_mm2 = input.depth_of_cut_mm * input.feed_per_tooth_mm * 2;
    const sigma_x = Fc / Math.max(engagement_area_mm2, 0.01); // MPa
    const sigma_y = Ft / Math.max(engagement_area_mm2, 0.01);
    const tau_xy = 0.3 * sigma_x; // shear from oblique cutting

    // Transform to ply coordinates
    const sigma1 = sigma_x * cosT * cosT + sigma_y * sinT * sinT + 2 * tau_xy * sinT * cosT;
    const sigma2 = sigma_x * sinT * sinT + sigma_y * cosT * cosT - 2 * tau_xy * sinT * cosT;
    const tau12 = (sigma_y - sigma_x) * sinT * cosT + tau_xy * (cosT * cosT - sinT * sinT);

    // Tsai-Hill criterion
    const X = props.X_MPa;
    const Y = props.Y_MPa;
    const S = props.S_MPa;

    const tsai_hill = (sigma1 / X) ** 2
      - (sigma1 * sigma2) / (X * X)
      + (sigma2 / Y) ** 2
      + (tau12 / S) ** 2;

    // Delamination risk: map Tsai-Hill index to 0-1 range
    // Below 0.5 = low risk, 0.5-0.8 = moderate, 0.8-1.0 = high, >1.0 = failure
    const delamination_risk = Math.min(1, Math.max(0, tsai_hill));

    // Critical thrust force for delamination onset (Hocheng-Dharan model)
    // Fc_crit = π * √(8 * GIc * E * h³ / (3*(1-ν²)))
    // Simplified: proportional to interlaminar fracture toughness
    const GIc = this._getInterlaminarToughness(input.fiber_type); // J/m² = N/m
    const E_GPa = props.elastic_modulus_GPa;
    const h = input.depth_of_cut_mm; // remaining thickness approximation
    const nu = 0.3;
    // Hocheng-Dharan critical thrust: Fc = π√(8·GIc·E·h³ / (3(1-ν²)))
    // Unit consistency: GIc(N/m)→GIc/1e3(N/mm), E_GPa→E_GPa*1e3(MPa=N/mm²), h(mm)
    // Simplification: (GIc/1e3)*(E_GPa*1e3) = GIc*E_GPa
    const critical_thrust_N = Math.PI * Math.sqrt(
      (8 * GIc * E_GPa * (h ** 3)) / (3 * (1 - nu * nu))
    );

    // Tool recommendations based on fiber type
    const tool_recs = this._getToolRecommendations(input.fiber_type, tsai_hill);

    if (input.cutting_speed_mpm > props.max_speed_mpm) {
      warnings.push(`Speed ${input.cutting_speed_mpm} m/min exceeds recommended max ${props.max_speed_mpm} m/min for ${input.fiber_type}`);
    }
    if (input.feed_per_tooth_mm > props.feed_range.max) {
      warnings.push(`Feed ${input.feed_per_tooth_mm} mm/tooth exceeds recommended max ${props.feed_range.max} mm for ${input.fiber_type}`);
    }
    if (tsai_hill >= 1.0) {
      warnings.push("Tsai-Hill index >= 1.0: FAILURE predicted — reduce feed or depth");
    }
    if (Ft > critical_thrust_N) {
      warnings.push(`Thrust force ${Ft.toFixed(1)} N exceeds critical ${critical_thrust_N.toFixed(1)} N — delamination onset`);
    }

    return {
      delamination_risk,
      tsai_hill_index: tsai_hill,
      critical_thrust_force_N: critical_thrust_N,
      recommended_feed_range: { min_mm: props.feed_range.min, max_mm: props.feed_range.max },
      tool_recommendations: tool_recs,
      stress_components: {
        sigma1_MPa: sigma1,
        sigma2_MPa: sigma2,
        tau12_MPa: tau12,
      },
      warnings,
    };
  }

  /**
   * Predict fiber pullout length.
   * L = (σf · df) / (4 · τi)
   * where σf = fiber tensile strength, df = diameter, τi = interface shear strength
   */
  predictFiberPullout(input: FiberPulloutInput): FiberPulloutResult {
    const props = FIBER_PROPERTIES[input.fiber_type];
    const warnings: string[] = [];

    const sigma_f = props.tensile_strength_MPa;
    const d_f = props.fiber_diameter_um / 1000; // convert to mm
    const tau_i = props.interface_shear_MPa;

    // Fundamental pullout length: L = (σf · df) / (4 · τi)
    const L_base = (sigma_f * d_f) / (4 * tau_i);

    // Adjust for cutting parameters
    // Higher feed → more pullout (increased force on fibers)
    const feed_factor = 1 + 2.0 * (input.feed_per_tooth_mm / props.feed_range.max - 0.5);
    // Higher speed → thermal softening of matrix → more pullout
    const speed_factor = 1 + 0.3 * (input.cutting_speed_mpm / props.max_speed_mpm);
    // Rake angle: positive rake reduces pullout
    const rake_factor = 1 - 0.01 * input.tool_rake_angle_deg;
    // Volume fraction: higher Vf → more fiber interaction → less clean pullout
    const vf_factor = 1 + 0.5 * (input.fiber_volume_fraction - 0.5);

    const pullout_length = L_base * Math.max(0.1, feed_factor) * speed_factor * rake_factor * vf_factor;

    // Damage zone: typically 2-5x pullout length
    const damage_zone = pullout_length * (2.5 + 1.5 * feed_factor);

    // Surface quality impact classification
    let surface_quality_impact: FiberPulloutResult["surface_quality_impact"];
    if (pullout_length < 0.01) surface_quality_impact = "minimal";
    else if (pullout_length < 0.05) surface_quality_impact = "moderate";
    else if (pullout_length < 0.15) surface_quality_impact = "severe";
    else surface_quality_impact = "critical";

    // Matrix cracking risk from fiber pullout stress transfer
    const matrix_stress = sigma_f * input.fiber_volume_fraction * (d_f / (4 * tau_i));
    const matrix_strength = this._getMatrixStrength(input.fiber_type);
    const matrix_cracking_risk = Math.min(1, matrix_stress / matrix_strength);

    // Optimal tool geometry for this fiber type
    const tool_geom = this._getOptimalToolGeometry(input.fiber_type);

    if (pullout_length > 0.1) {
      warnings.push(`Pullout length ${pullout_length.toFixed(3)} mm is high — consider PCD tooling`);
    }
    if (matrix_cracking_risk > 0.7) {
      warnings.push("High matrix cracking risk — reduce feed rate");
    }
    if (input.fiber_type === "aramid" || input.fiber_type === "kevlar") {
      warnings.push("Aramid/Kevlar fibers are difficult to shear cleanly — use sharp, positive-rake PCD tools");
    }

    return {
      pullout_length_mm: pullout_length,
      surface_quality_impact,
      recommended_tool_geometry: tool_geom,
      fiber_damage_zone_mm: damage_zone,
      matrix_cracking_risk,
      warnings,
    };
  }

  /**
   * Multi-objective optimization: minimize delamination + maximize MRR.
   * Sweeps speed/feed space and returns Pareto-optimal solutions.
   */
  optimizeCuttingParams(input: CompositeOptimizeInput): CompositeOptimizeResult {
    const props = FIBER_PROPERTIES[input.fiber_type];
    const warnings: string[] = [];
    const max_delam = input.max_delamination_risk ?? 0.5;
    const target_Ra = input.target_Ra_um ?? 3.2;

    // Search grid
    const speed_steps = 20;
    const feed_steps = 20;
    const speed_min = props.max_speed_mpm * 0.2;
    const speed_max = props.max_speed_mpm * 1.1;
    const feed_min = props.feed_range.min;
    const feed_max = props.feed_range.max;

    interface Candidate {
      speed: number;
      feed: number;
      mrr: number;
      delam: number;
      Ra: number;
      wear: number;
    }

    const candidates: Candidate[] = [];

    for (let si = 0; si <= speed_steps; si++) {
      const speed = speed_min + (speed_max - speed_min) * (si / speed_steps);
      for (let fi = 0; fi <= feed_steps; fi++) {
        const feed = feed_min + (feed_max - feed_min) * (fi / feed_steps);

        // Evaluate delamination
        const delamResult = this.assessDelaminationRisk({
          fiber_type: input.fiber_type,
          layup_angle_deg: input.layup_angle_deg,
          feed_per_tooth_mm: feed,
          cutting_speed_mpm: speed,
          tool_diameter_mm: input.tool_diameter_mm,
          depth_of_cut_mm: input.depth_of_cut_mm,
        });

        // MRR = ae · ap · vf (simplified: ae ≈ 0.5*D, vf = fz*z*n)
        const n_rpm = (speed * 1000) / (Math.PI * input.tool_diameter_mm);
        const z = 4; // typical composite router flutes
        const ae = input.tool_diameter_mm * 0.5;
        const vf = feed * z * n_rpm;
        const mrr = (ae * input.depth_of_cut_mm * vf) / 1000; // cm³/min

        // Surface roughness: Ra ≈ fz² / (32·r) * orientation_factor
        const r_tip = 0.4; // mm nose radius
        const orientation_factor = 1 + 0.3 * Math.abs(Math.sin(2 * input.layup_angle_deg * Math.PI / 180));
        const Ra = ((feed * feed) / (32 * r_tip)) * orientation_factor * 1000; // μm

        // Tool wear rate (μm/m): increases with speed, feed, and abrasiveness
        const abrasiveness = input.fiber_type === "carbon" ? 1.5
          : input.fiber_type === "glass" ? 2.0
          : input.fiber_type === "aramid" ? 0.8
          : 0.7; // kevlar
        const wear_rate = abrasiveness * (speed / 100) * (1 + feed / props.feed_range.max);

        candidates.push({
          speed,
          feed,
          mrr,
          delam: delamResult.delamination_risk,
          Ra,
          wear: wear_rate,
        });
      }
    }

    // Filter feasible solutions
    const feasible = candidates.filter(c => c.delam <= max_delam && c.Ra <= target_Ra * 2);

    if (feasible.length === 0) {
      warnings.push("No feasible solutions found within constraints — relaxing delamination limit");
      // Use best from all candidates
      feasible.push(...candidates.sort((a, b) => a.delam - b.delam).slice(0, 5));
    }

    // Pareto front: non-dominated solutions (minimize delam, maximize MRR)
    const pareto = this._paretoFilter(feasible);

    // Best balanced: weighted score
    const scored = pareto.map(c => ({
      ...c,
      score: c.mrr / (Math.max(feasible.map(f => f.mrr).reduce((a, b) => Math.max(a, b), 1))) -
        c.delam * 2 - (c.Ra / target_Ra) * 0.5,
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0] || feasible[0];

    if (best.delam > 0.7) {
      warnings.push("Even optimal parameters show high delamination risk — consider backup plate support");
    }
    if (best.wear > 5) {
      warnings.push("High tool wear rate — PCD or diamond-coated tooling strongly recommended");
    }

    return {
      optimal_speed_mpm: Math.round(best.speed * 10) / 10,
      optimal_feed_mm: Math.round(best.feed * 1000) / 1000,
      expected_Ra_um: Math.round(best.Ra * 100) / 100,
      tool_wear_rate_um_per_m: Math.round(best.wear * 100) / 100,
      mrr_cm3_per_min: Math.round(best.mrr * 100) / 100,
      delamination_risk: Math.round(best.delam * 1000) / 1000,
      tsai_hill_index: best.delam, // approximation from risk
      pareto_alternatives: pareto.slice(0, 8).map(c => ({
        speed_mpm: Math.round(c.speed * 10) / 10,
        feed_mm: Math.round(c.feed * 1000) / 1000,
        mrr_cm3_per_min: Math.round(c.mrr * 100) / 100,
        delamination_risk: Math.round(c.delam * 1000) / 1000,
        Ra_um: Math.round(c.Ra * 100) / 100,
      })),
      warnings,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _getSpecificCuttingForce(fiber: FiberType): number {
    const kc: Record<FiberType, number> = {
      carbon: 250,  // N/mm² — abrasive but brittle
      glass: 200,   // N/mm² — less abrasive
      aramid: 180,  // N/mm² — tough, hard to shear
      kevlar: 170,  // N/mm² — similar to aramid
    };
    return kc[fiber];
  }

  private _getInterlaminarToughness(fiber: FiberType): number {
    // GIc in J/m²
    const GIc: Record<FiberType, number> = {
      carbon: 250,   // carbon/epoxy typical
      glass: 300,    // glass/epoxy typical
      aramid: 400,   // aramid/epoxy — tougher interface
      kevlar: 350,   // kevlar/epoxy
    };
    return GIc[fiber];
  }

  private _getToolRecommendations(fiber: FiberType, tsaiHill: number): string[] {
    const recs: string[] = [];

    if (fiber === "carbon") {
      recs.push("PCD (polycrystalline diamond) tooling for abrasion resistance");
      recs.push("Diamond-coated carbide as cost-effective alternative");
      if (tsaiHill > 0.5) recs.push("Use compression router (up-down helix) to prevent delamination on both sides");
    } else if (fiber === "glass") {
      recs.push("Carbide with diamond coating — glass is highly abrasive");
      recs.push("Avoid HSS — rapid wear from glass fiber abrasion");
    } else {
      recs.push("PCD with positive rake angle for clean fiber shearing");
      recs.push("Fish-tail (dagger) drill point for aramid/kevlar hole-making");
      recs.push("Avoid conventional twist drills — causes fuzzing and delamination");
    }

    if (tsaiHill > 0.8) {
      recs.push("Consider backup plate to prevent exit delamination");
      recs.push("Reduce feed rate by 30-50% near entry/exit");
    }

    return recs;
  }

  private _getMatrixStrength(fiber: FiberType): number {
    // Epoxy matrix tensile strength in MPa (typical for each system)
    const strengths: Record<FiberType, number> = {
      carbon: 85,   // high-temp epoxy
      glass: 75,    // general purpose epoxy
      aramid: 70,   // toughened epoxy
      kevlar: 70,
    };
    return strengths[fiber];
  }

  private _getOptimalToolGeometry(fiber: FiberType): FiberPulloutResult["recommended_tool_geometry"] {
    const geom: Record<FiberType, FiberPulloutResult["recommended_tool_geometry"]> = {
      carbon: { rake_angle_deg: 10, clearance_angle_deg: 15, helix_angle_deg: 30, point_angle_deg: 118 },
      glass: { rake_angle_deg: 8, clearance_angle_deg: 12, helix_angle_deg: 25, point_angle_deg: 118 },
      aramid: { rake_angle_deg: 15, clearance_angle_deg: 20, helix_angle_deg: 0, point_angle_deg: 60 },
      kevlar: { rake_angle_deg: 15, clearance_angle_deg: 20, helix_angle_deg: 0, point_angle_deg: 60 },
    };
    return geom[fiber];
  }

  private _paretoFilter(candidates: Array<{ speed: number; feed: number; mrr: number; delam: number; Ra: number; wear: number }>): typeof candidates {
    return candidates.filter((c, _i, arr) => {
      // c is non-dominated if no other solution is better in BOTH objectives
      return !arr.some(other =>
        other !== c && other.mrr >= c.mrr && other.delam <= c.delam &&
        (other.mrr > c.mrr || other.delam < c.delam)
      );
    });
  }
}

/** Singleton instance */
export const compositesMachiningPhysicsEngine = new CompositesMachiningPhysicsEngine();
