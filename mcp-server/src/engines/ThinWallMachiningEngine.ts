/**
 * ThinWallMachiningEngine
 * Physics-based parameter optimization for thin wall and thin floor CNC machining.
 * Prevents deflection, chatter, and distortion by computing safe cutting parameters
 * based on wall geometry, material properties, and support strategy.
 *
 * Key physics:
 * - Wall deflection: δ = F·H³/(3·E·I), I = t³·w/12 (cantilever thin wall)
 * - Natural frequency: fn = (λ²/2π)·√(E·I/(ρ·A·L⁴)) — below tool passing freq = chatter
 * - Force reduction via trochoidal: 60-70% radial force reduction vs linear
 * - Alternating sides: halves effective unsupported height
 *
 * Reference: CTE thin wall machining guides, Sandvik thin part strategies,
 *            hotean.com CNC milling thin wall vibration analysis
 *
 * Actions: thin_wall_params, thin_wall_deflection, thin_wall_strategy,
 *          thin_wall_support, thin_wall_frequency
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

function av(value: number, unit: string, source = "ThinWallMachiningEngine"): AtomicValue {
  return { value, unit, uncertainty: value * 0.1, source };
}

export interface ThinWallGeometry {
  wall_height_mm: number;
  wall_thickness_mm: number;
  wall_length_mm: number;
  support_type?: "free" | "one_side" | "both_sides" | "pocket_floor";
  floor_thickness_mm?: number;
}

export interface ThinWallMaterial {
  name?: string;
  elastic_modulus_GPa: number;
  yield_strength_MPa: number;
  density_kg_m3: number;
  machinability_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface ThinWallTooling {
  diameter_mm: number;
  flutes: number;
  helix_angle_deg?: number;
  tool_type?: "end_mill" | "bull_nose" | "ball_nose";
}

export interface ThinWallInput {
  geometry: ThinWallGeometry;
  material: ThinWallMaterial;
  tool: ThinWallTooling;
  target_tolerance_mm?: number;
  operation?: "roughing" | "finishing" | "semi_finishing";
}

export interface SupportStrategy {
  method: string;
  effectiveness_pct: number;
  description: string;
  applicable: boolean;
  cost_relative: "low" | "medium" | "high";
}

export interface ThinWallParams {
  recommended_ap_mm: AtomicValue;
  recommended_ae_mm: AtomicValue;
  recommended_fz_mm: AtomicValue;
  max_force_N: AtomicValue;
  wall_deflection_mm: AtomicValue;
  deflection_safe: boolean;
  strategy: string;
  toolpath_type: string;
  approach: string[];
  warnings: string[];
}

export interface ThinWallDeflectionResult {
  static_deflection_mm: AtomicValue;
  cutting_force_N: AtomicValue;
  moment_of_inertia_mm4: AtomicValue;
  max_allowable_force_N: AtomicValue;
  safety_factor: AtomicValue;
  is_safe: boolean;
  warnings: string[];
}

export interface ThinWallFrequencyResult {
  natural_freq_Hz: AtomicValue;
  tooth_passing_freq_Hz: AtomicValue;
  freq_ratio: AtomicValue;
  chatter_risk: "low" | "medium" | "high" | "critical";
  recommended_rpm_shift?: AtomicValue;
  warnings: string[];
}

// ── Material defaults (E in GPa, σy in MPa, ρ in kg/m³) ──────────

const MATERIAL_DEFAULTS: Record<string, { E: number; sigma_y: number; rho: number }> = {
  "aluminum_6061":   { E: 69,  sigma_y: 276, rho: 2700 },
  "aluminum_7075":   { E: 72,  sigma_y: 503, rho: 2810 },
  "steel_1018":      { E: 200, sigma_y: 370, rho: 7870 },
  "steel_4140":      { E: 205, sigma_y: 655, rho: 7850 },
  "stainless_304":   { E: 193, sigma_y: 215, rho: 8000 },
  "stainless_316":   { E: 193, sigma_y: 205, rho: 8000 },
  "titanium_6al4v":  { E: 114, sigma_y: 880, rho: 4430 },
  "inconel_718":     { E: 205, sigma_y: 1035, rho: 8190 },
  "copper_c110":     { E: 117, sigma_y: 69,  rho: 8940 },
  "brass_360":       { E: 97,  sigma_y: 124, rho: 8500 },
};

// ── Support strategy database ─────────────────────────────────────

const SUPPORT_STRATEGIES: SupportStrategy[] = [
  { method: "alloy_backfill", effectiveness_pct: 100, description: "Low-melt alloy (Cerrobend) fills cavity, removed after machining by heating. Maximum rigidity.", applicable: true, cost_relative: "high" },
  { method: "vacuum_fixture", effectiveness_pct: 90, description: "Vacuum table or cups hold thin floors/plates. Uniform distributed support.", applicable: true, cost_relative: "medium" },
  { method: "wax_potting", effectiveness_pct: 75, description: "Machinable wax fills pockets, supports walls during finishing. Dissolved after.", applicable: true, cost_relative: "medium" },
  { method: "sacrificial_ribs", effectiveness_pct: 70, description: "Leave thin ribs connecting walls during roughing, cut away in final pass.", applicable: true, cost_relative: "low" },
  { method: "magnetic_fixture", effectiveness_pct: 60, description: "Magnetic workholding for ferrous thin plates. Limited to steel/iron.", applicable: true, cost_relative: "low" },
  { method: "adhesive_tape", effectiveness_pct: 50, description: "Double-sided machining tape for very thin parts. Limited holding force.", applicable: true, cost_relative: "low" },
  { method: "spring_loaded_support", effectiveness_pct: 65, description: "Spring pins push against back of thin wall during machining.", applicable: true, cost_relative: "medium" },
  { method: "ice_fixture", effectiveness_pct: 80, description: "Freeze part in ice block for uniform support. No residue, good for aerospace.", applicable: true, cost_relative: "medium" },
];

// ── Aspect ratio thresholds ───────────────────────────────────────

const ASPECT_RATIO_LIMITS: Record<string, { safe: number; caution: number; max: number }> = {
  aluminum:  { safe: 15, caution: 25, max: 40 },
  steel:     { safe: 10, caution: 18, max: 30 },
  titanium:  { safe: 8,  caution: 14, max: 20 },
  stainless: { safe: 8,  caution: 15, max: 25 },
  default:   { safe: 10, caution: 18, max: 30 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThinWallMachiningEngine {
  /**
   * Compute safe cutting parameters for thin wall machining.
   * Limits ap, ae, and fz to keep deflection within tolerance.
   */
  thinWallParams(input: ThinWallInput): ThinWallParams {
    const { geometry: g, material: m, tool: t } = input;
    const tol = input.target_tolerance_mm ?? 0.05;
    const op = input.operation ?? "finishing";
    const warnings: string[] = [];

    // Aspect ratio check
    const aspectRatio = g.wall_height_mm / g.wall_thickness_mm;
    const matGroup = this._materialGroup(m);
    const limits = ASPECT_RATIO_LIMITS[matGroup] || ASPECT_RATIO_LIMITS.default;

    if (aspectRatio > limits.max) {
      warnings.push(`Aspect ratio ${aspectRatio.toFixed(1)}:1 exceeds maximum ${limits.max}:1 for ${matGroup}. Part may not be machinable conventionally.`);
    } else if (aspectRatio > limits.caution) {
      warnings.push(`Aspect ratio ${aspectRatio.toFixed(1)}:1 in caution zone. Use support strategy and light cuts.`);
    }

    // Moment of inertia: I = t³·w/12 (rectangular cross-section)
    const t_wall = g.wall_thickness_mm;
    const w = g.wall_length_mm;
    const I = (Math.pow(t_wall, 3) * w) / 12; // mm⁴

    // Max allowable force from deflection limit: δ = F·H³/(3·E·I)
    // => F_max = δ·3·E·I / H³
    const E_MPa = m.elastic_modulus_GPa * 1000; // GPa → MPa
    const H = g.wall_height_mm;
    const supportFactor = this._supportFactor(g.support_type);
    const F_max = (tol * 3 * E_MPa * I) / (Math.pow(H, 3) * supportFactor);

    // Recommended parameters based on operation type and force budget
    let ae_pct: number, ap_factor: number, fz_factor: number;
    switch (op) {
      case "roughing":
        ae_pct = 0.10;  // 10% of tool diameter
        ap_factor = 1.5; // 1.5× tool diameter DOC
        fz_factor = 0.7; // 70% of normal feed
        break;
      case "semi_finishing":
        ae_pct = 0.07;
        ap_factor = 2.0;
        fz_factor = 0.6;
        break;
      case "finishing":
      default:
        ae_pct = 0.05;  // 5% of tool diameter
        ap_factor = 2.5; // 2.5× tool diameter DOC (high axial, low radial)
        fz_factor = 0.5; // 50% of normal feed
        break;
    }

    const ae = ae_pct * t.diameter_mm;
    let ap = Math.min(ap_factor * t.diameter_mm, g.wall_height_mm);

    // Estimate cutting force: F ≈ kc × ap × ae × fz (simplified Kienzle)
    const kc = this._estimateKc(m); // N/mm²
    const baseFz = this._baseFz(t, m);
    let fz = baseFz * fz_factor;

    // Iteratively reduce parameters if force exceeds budget
    let F_est = kc * ap * ae * fz;
    let iterations = 0;
    while (F_est > F_max && iterations < 20) {
      // Reduce feed first, then DOC
      if (fz > baseFz * 0.2) {
        fz *= 0.85;
      } else {
        ap *= 0.85;
      }
      F_est = kc * ap * ae * fz;
      iterations++;
    }

    const defl = (F_est * Math.pow(H, 3) * supportFactor) / (3 * E_MPa * I);
    const deflSafe = defl <= tol;

    if (!deflSafe) {
      warnings.push(`Even minimum parameters produce ${defl.toFixed(4)}mm deflection > ${tol}mm tolerance. Consider support strategy.`);
    }

    // Strategy selection
    let strategy: string;
    let toolpathType: string;
    const approach: string[] = [];

    if (aspectRatio > limits.caution) {
      strategy = "alternating_sides_climb";
      toolpathType = "trochoidal_or_adaptive";
      approach.push("Machine alternating sides to halve unsupported height");
      approach.push("Use climb milling to push wall into support");
      approach.push("Trochoidal paths reduce radial force 60-70%");
    } else if (aspectRatio > limits.safe) {
      strategy = "light_conventional";
      toolpathType = "adaptive_clearing";
      approach.push("Light radial engagement with full-depth passes");
      approach.push("Adaptive clearing for consistent chip load");
    } else {
      strategy = "standard_thin_wall";
      toolpathType = "standard_with_reduced_ae";
      approach.push("Standard toolpath with reduced radial engagement");
    }

    // Additional approach recommendations
    if (op === "roughing") {
      approach.push("Leave 0.5-1.0mm stock for finishing — never finish in roughing pass");
      approach.push("Consider sacrificial ribs between pockets during roughing");
    }
    if (op === "finishing") {
      approach.push("Spring pass: repeat final pass at same depth to remove deflection error");
      approach.push("Increase RPM, decrease feed — lighter cuts, better finish");
    }
    if (t.diameter_mm > g.wall_thickness_mm * 0.8) {
      warnings.push(`Tool diameter (${t.diameter_mm}mm) approaches wall thickness (${t_wall}mm). Use smaller tool or reduce engagement.`);
    }
    if (g.floor_thickness_mm && g.floor_thickness_mm < 2.0) {
      approach.push(`Thin floor (${g.floor_thickness_mm}mm): use vacuum fixture or wax support underneath`);
    }

    return {
      recommended_ap_mm: av(ap, "mm"),
      recommended_ae_mm: av(ae, "mm"),
      recommended_fz_mm: av(fz, "mm/tooth"),
      max_force_N: av(F_max, "N"),
      wall_deflection_mm: av(defl, "mm"),
      deflection_safe: deflSafe,
      strategy,
      toolpath_type: toolpathType,
      approach,
      warnings,
    };
  }

  /**
   * Pure deflection calculation for a thin wall under cutting force.
   * δ = F·H³/(3·E·I) for cantilever, adjusted by support type.
   */
  thinWallDeflection(input: {
    geometry: ThinWallGeometry;
    material: ThinWallMaterial;
    cutting_force_N: number;
    tolerance_mm?: number;
  }): ThinWallDeflectionResult {
    const { geometry: g, material: m } = input;
    const F = input.cutting_force_N;
    const tol = input.tolerance_mm ?? 0.05;
    const warnings: string[] = [];

    const t = g.wall_thickness_mm;
    const w = g.wall_length_mm;
    const H = g.wall_height_mm;
    const I = (Math.pow(t, 3) * w) / 12;
    const E_MPa = m.elastic_modulus_GPa * 1000;
    const sf = this._supportFactor(g.support_type);

    const defl = (F * Math.pow(H, 3) * sf) / (3 * E_MPa * I);
    const F_max = (tol * 3 * E_MPa * I) / (Math.pow(H, 3) * sf);
    const safetyFactor = F_max / Math.max(F, 0.001);

    const isSafe = defl <= tol;
    if (!isSafe) {
      warnings.push(`Deflection ${defl.toFixed(4)}mm exceeds tolerance ${tol}mm by ${((defl / tol - 1) * 100).toFixed(0)}%`);
      if (safetyFactor < 0.5) {
        warnings.push("Safety factor < 0.5 — consider support strategy or redesign");
      }
    }

    // Check if wall might yield
    const sigma_bending = (F * H) / (I / (t / 2)); // σ = M·c/I, M = F·H, c = t/2
    if (sigma_bending > m.yield_strength_MPa * 0.8) {
      warnings.push(`Bending stress ${sigma_bending.toFixed(0)}MPa approaching yield ${m.yield_strength_MPa}MPa — risk of permanent deformation`);
    }

    return {
      static_deflection_mm: av(defl, "mm"),
      cutting_force_N: av(F, "N"),
      moment_of_inertia_mm4: av(I, "mm⁴"),
      max_allowable_force_N: av(F_max, "N"),
      safety_factor: av(safetyFactor, "ratio"),
      is_safe: isSafe,
      warnings,
    };
  }

  /**
   * Recommend support strategies ranked by effectiveness for given geometry.
   */
  thinWallSupport(input: {
    geometry: ThinWallGeometry;
    material: ThinWallMaterial;
    batch_size?: number;
  }): { strategies: SupportStrategy[]; recommended: string; warnings: string[] } {
    const { geometry: g, material: m } = input;
    const batch = input.batch_size ?? 1;
    const warnings: string[] = [];
    const matGroup = this._materialGroup(m);

    let strategies = [...SUPPORT_STRATEGIES];

    // Filter by applicability
    if (matGroup !== "steel" && matGroup !== "stainless") {
      strategies = strategies.filter(s => s.method !== "magnetic_fixture");
      strategies.find(s => s.method === "magnetic_fixture")!; // already filtered
    }

    // Floor-specific
    if (g.floor_thickness_mm && g.floor_thickness_mm < 3) {
      // Vacuum fixtures best for thin floors
      const vac = strategies.find(s => s.method === "vacuum_fixture");
      if (vac) vac.effectiveness_pct = 95;
    }

    // Cost consideration for batch size
    if (batch > 50) {
      // High volume: fixed cost amortized
      const alloy = strategies.find(s => s.method === "alloy_backfill");
      if (alloy) alloy.cost_relative = "medium";
    }

    // Aspect ratio severity
    const ar = g.wall_height_mm / g.wall_thickness_mm;
    if (ar > 20) {
      warnings.push("Extreme aspect ratio — alloy backfill or ice fixture strongly recommended");
      strategies = strategies.filter(s => s.effectiveness_pct >= 70);
    }

    // Sort by effectiveness
    strategies.sort((a, b) => b.effectiveness_pct - a.effectiveness_pct);

    // Pick recommended
    let recommended = strategies[0].method;
    if (batch > 20 && strategies[0].cost_relative === "high") {
      // For production, prefer cost-effective option
      const costEffective = strategies.find(s => s.cost_relative !== "high" && s.effectiveness_pct >= 65);
      if (costEffective) recommended = costEffective.method;
    }

    return { strategies, recommended, warnings };
  }

  /**
   * Compute natural frequency of thin wall and compare to tooth passing frequency.
   * Chatter occurs when tooth passing freq ≈ wall natural freq.
   * fn = (λ²/2π)·√(E·I/(ρ·A·L⁴))  — first mode cantilever λ₁ = 1.875
   */
  thinWallFrequency(input: {
    geometry: ThinWallGeometry;
    material: ThinWallMaterial;
    spindle_rpm: number;
    flutes: number;
  }): ThinWallFrequencyResult {
    const { geometry: g, material: m } = input;
    const warnings: string[] = [];

    const t = g.wall_thickness_mm / 1000; // → meters
    const w = g.wall_length_mm / 1000;
    const H = g.wall_height_mm / 1000;
    const E = m.elastic_modulus_GPa * 1e9; // → Pa
    const rho = m.density_kg_m3;

    // Rectangular cross-section
    const I = (Math.pow(t * 1000, 3) * (w * 1000)) / 12; // mm⁴ for display
    const I_m4 = (Math.pow(t, 3) * w) / 12;
    const A = t * w;

    // First cantilever mode: λ₁ = 1.875 (clamped-free)
    // If supported both sides: λ₁ = π (pinned-pinned)
    let lambda1: number;
    switch (g.support_type) {
      case "both_sides": lambda1 = Math.PI; break;      // pinned-pinned
      case "one_side":   lambda1 = 1.875; break;         // clamped-free
      case "pocket_floor": lambda1 = 3.927; break;       // clamped-pinned (approx)
      default:           lambda1 = 1.875; break;         // free wall = cantilever
    }

    // fn = (λ²/2π) × √(E·I / (ρ·A·L⁴))
    const fn = (Math.pow(lambda1, 2) / (2 * Math.PI)) * Math.sqrt((E * I_m4) / (rho * A * Math.pow(H, 4)));

    // Tooth passing frequency
    const ftooth = (input.spindle_rpm * input.flutes) / 60;

    const ratio = ftooth / fn;

    let chatterRisk: "low" | "medium" | "high" | "critical";
    if (ratio > 0.85 && ratio < 1.15) {
      chatterRisk = "critical";
      warnings.push(`Tooth passing frequency ${ftooth.toFixed(0)}Hz ≈ wall natural frequency ${fn.toFixed(0)}Hz — RESONANCE ZONE`);
    } else if (ratio > 0.7 && ratio < 1.3) {
      chatterRisk = "high";
      warnings.push(`Near-resonance condition. Shift RPM by ±15% to avoid chatter.`);
    } else if ((ratio > 1.8 && ratio < 2.2) || (ratio > 0.45 && ratio < 0.55)) {
      chatterRisk = "medium";
      warnings.push("Near harmonic of natural frequency. Monitor for chatter.");
    } else {
      chatterRisk = "low";
    }

    // Recommend RPM shift if in danger zone
    let recommendedRpmShift: AtomicValue | undefined;
    if (chatterRisk === "critical" || chatterRisk === "high") {
      // Target tooth passing freq at 70% of natural freq
      const targetFtooth = fn * 0.7;
      const targetRpm = (targetFtooth * 60) / input.flutes;
      const shift = targetRpm - input.spindle_rpm;
      recommendedRpmShift = av(shift, "rpm");
      warnings.push(`Shift RPM to ~${targetRpm.toFixed(0)} (${shift > 0 ? "+" : ""}${shift.toFixed(0)} RPM) to avoid resonance`);
    }

    return {
      natural_freq_Hz: av(fn, "Hz"),
      tooth_passing_freq_Hz: av(ftooth, "Hz"),
      freq_ratio: av(ratio, "ratio"),
      chatter_risk: chatterRisk,
      recommended_rpm_shift: recommendedRpmShift,
      warnings,
    };
  }

  /**
   * Full thin wall machining strategy combining all analyses.
   */
  thinWallStrategy(input: ThinWallInput & { spindle_rpm?: number }): {
    params: ThinWallParams;
    deflection: ThinWallDeflectionResult;
    frequency?: ThinWallFrequencyResult;
    support: { strategies: SupportStrategy[]; recommended: string; warnings: string[] };
    overall_risk: "low" | "medium" | "high" | "critical";
    summary: string;
  } {
    const params = this.thinWallParams(input);
    const deflResult = this.thinWallDeflection({
      geometry: input.geometry,
      material: input.material,
      cutting_force_N: params.max_force_N.value,
      tolerance_mm: input.target_tolerance_mm,
    });
    const support = this.thinWallSupport({
      geometry: input.geometry,
      material: input.material,
    });

    let freq: ThinWallFrequencyResult | undefined;
    if (input.spindle_rpm) {
      freq = this.thinWallFrequency({
        geometry: input.geometry,
        material: input.material,
        spindle_rpm: input.spindle_rpm,
        flutes: input.tool.flutes,
      });
    }

    // Overall risk assessment
    const risks: number[] = [];
    const ar = input.geometry.wall_height_mm / input.geometry.wall_thickness_mm;
    const matLimits = ASPECT_RATIO_LIMITS[this._materialGroup(input.material)] || ASPECT_RATIO_LIMITS.default;

    if (ar > matLimits.max) risks.push(4);
    else if (ar > matLimits.caution) risks.push(3);
    else if (ar > matLimits.safe) risks.push(2);
    else risks.push(1);

    if (!deflResult.is_safe) risks.push(4);
    else if (deflResult.safety_factor.value < 1.5) risks.push(3);
    else if (deflResult.safety_factor.value < 3) risks.push(2);
    else risks.push(1);

    if (freq) {
      const cr = freq.chatter_risk;
      risks.push(cr === "critical" ? 4 : cr === "high" ? 3 : cr === "medium" ? 2 : 1);
    }

    const maxRisk = Math.max(...risks);
    const overallRisk = maxRisk >= 4 ? "critical" : maxRisk >= 3 ? "high" : maxRisk >= 2 ? "medium" : "low";

    const summary = [
      `Wall: ${input.geometry.wall_height_mm}×${input.geometry.wall_thickness_mm}mm (AR ${ar.toFixed(1)}:1)`,
      `Deflection: ${deflResult.static_deflection_mm.value.toFixed(4)}mm (SF ${deflResult.safety_factor.value.toFixed(1)})`,
      freq ? `Chatter risk: ${freq.chatter_risk} (fn=${freq.natural_freq_Hz.value.toFixed(0)}Hz)` : null,
      `Strategy: ${params.strategy}`,
      `Support: ${support.recommended}`,
      `Risk: ${overallRisk.toUpperCase()}`,
    ].filter(Boolean).join(" | ");

    return { params, deflection: deflResult, frequency: freq, support, overall_risk: overallRisk, summary };
  }

  // ── Private helpers ───────────────────────────────────────────────

  private _materialGroup(m: ThinWallMaterial): string {
    if (m.machinability_group === "N" || m.elastic_modulus_GPa < 80) return "aluminum";
    if (m.machinability_group === "S") return "titanium";
    if (m.machinability_group === "M") return "stainless";
    if (m.machinability_group === "P" || m.machinability_group === "K" || m.machinability_group === "H") return "steel";
    // Fallback by modulus
    if (m.elastic_modulus_GPa < 80) return "aluminum";
    if (m.elastic_modulus_GPa < 130) return "titanium";
    return "steel";
  }

  private _supportFactor(support?: string): number {
    // Multiplier on deflection formula (higher = more deflection)
    // Cantilever (free): δ = FL³/3EI → factor = 1.0
    // Both sides (simply supported): δ = FL³/48EI → factor = 3/48 * correction ≈ 0.0625
    // But practically, support reduces effective height
    switch (support) {
      case "both_sides":   return 0.125;  // ~8× stiffer than free
      case "pocket_floor": return 0.25;   // ~4× stiffer (clamped base)
      case "one_side":     return 0.5;    // ~2× stiffer
      case "free":
      default:             return 1.0;    // full cantilever
    }
  }

  private _estimateKc(m: ThinWallMaterial): number {
    // Approximate specific cutting force kc1.1 (N/mm²) from material properties
    if (m.machinability_group) {
      const kcMap: Record<string, number> = {
        P: 2000, M: 2400, K: 1200, N: 800, S: 1800, H: 3500,
      };
      return kcMap[m.machinability_group] || 2000;
    }
    // Fallback: ~3× yield strength (rough correlation)
    return Math.max(m.yield_strength_MPa * 3, 800);
  }

  private _baseFz(t: ThinWallTooling, m: ThinWallMaterial): number {
    // Base feed per tooth (mm) for tool diameter and material
    const d = t.diameter_mm;
    const group = m.machinability_group || "P";
    const fzMap: Record<string, number> = {
      P: 0.05, M: 0.04, K: 0.06, N: 0.08, S: 0.03, H: 0.02,
    };
    const baseFz = fzMap[group] || 0.05;
    // Scale with diameter (larger tools can take more feed)
    return baseFz * Math.pow(d / 10, 0.3);
  }

  /** Get material defaults by common name */
  static getMaterialDefaults(name: string): ThinWallMaterial | null {
    const key = name.toLowerCase().replace(/[\s-]+/g, "_");
    const d = MATERIAL_DEFAULTS[key];
    if (!d) return null;
    return {
      name,
      elastic_modulus_GPa: d.E,
      yield_strength_MPa: d.sigma_y,
      density_kg_m3: d.rho,
    };
  }

  /** List available material presets */
  static listMaterials(): string[] {
    return Object.keys(MATERIAL_DEFAULTS);
  }
}
