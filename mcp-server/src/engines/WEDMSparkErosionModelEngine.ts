/**
 * WEDMSparkErosionModelEngine
 * U-WB01: DiBitonto-Sato hybrid spark erosion physics model
 *
 * Combines DiBitonto thermal crater formation (1989) with Sato pulse energy
 * equations (1990) for comprehensive spark erosion prediction.
 *
 * Physics Models:
 * - Crater diameter: Dc = C_d × I^0.43 × t_on^0.44 [µm]
 * - Crater depth:    Dp = C_p × I^0.38 × t_on^0.38 [µm]
 * - Energy/spark:    E  = I × V_arc × t_on / 1000 [mJ]
 * - MRR:             MRR = C_mrr × I^α × t_on^β × duty^γ × η [mm³/min]
 *
 * References:
 * - DiBitonto et al. "Theoretical models of EDM" ASME J. Eng. Ind. 111(2), 1989
 * - Sato et al. "Study of EDM" JSME Int. J. 33(4), 1990
 * - Klocke "Manufacturing Processes 4" Ch.8, 2013
 * - MIT 2.830 Non-Traditional Machining lecture notes
 */

import { EDM_PHYSICS, CANONICAL_MATERIAL_DB, resolveMaterial } from "../physics/constants.js";

// ============================================================================
// INPUT/OUTPUT INTERFACES
// ============================================================================

export interface SparkErosionInput {
  /** Material name or ISO group (e.g., 'steel', 'titanium', 'tungsten_carbide') */
  material: string;
  /** Workpiece thickness [mm] — affects thermal dissipation */
  thickness_mm: number;
  /** Wire diameter [mm] — typically 0.20, 0.25, 0.30 */
  wire_diameter_mm?: number;
  /** Pulse on-time [µs] — typically 0.1 to 10 µs */
  pulse_on_us: number;
  /** Pulse off-time [µs] — typically 5 to 100 µs */
  pulse_off_us: number;
  /** Peak discharge current [A] — typically 1 to 30 A */
  current_A: number;
  /** Gap voltage [V] — typically 30 to 80 V (open circuit 80-100 V) */
  voltage_V?: number;
  /** Number of sparks per second [Hz] — derived if not provided */
  spark_frequency_Hz?: number;
}

export interface SparkErosionResult {
  /** Crater diameter [µm] — DiBitonto model */
  crater_diameter_um: number;
  /** Crater depth [µm] — DiBitonto model */
  crater_depth_um: number;
  /** Single-crater volume [µm³] */
  crater_volume_um3: number;
  /** Energy per spark [mJ] */
  energy_per_spark_mJ: number;
  /** Material removal rate [mm³/min] */
  mrr_mm3_min: number;
  /** Material removal efficiency (0.35–0.75 depending on material) */
  removal_efficiency: number;
  /** Duty cycle (t_on / (t_on + t_off)) */
  duty_cycle: number;
  /** Spark frequency [Hz] */
  spark_frequency_Hz: number;
  /** Predicted Ra surface roughness [µm] — Klocke model */
  predicted_Ra_um: number;
  /** Arc voltage used in calculation [V] */
  arc_voltage_V: number;
  /** Material resolved */
  resolved_material: string;
  /** Physics model source */
  physics_source: string;
  /** Warnings about parameter limits */
  warnings: string[];
}

export interface BatchSparkInput {
  materials: string[];
  thickness_mm: number;
  pulse_on_us: number;
  pulse_off_us: number;
  current_A: number;
}

export interface MaterialComparisonResult {
  material: string;
  mrr_mm3_min: number;
  crater_diameter_um: number;
  predicted_Ra_um: number;
  removal_efficiency: number;
  relative_machinability: number; // normalized to steel = 1.0
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class WEDMSparkErosionModelEngine {
  private config = {
    default_wire_diameter_mm: 0.25,
    default_voltage_V: EDM_PHYSICS.gap_voltage.open_circuit_V.standard,
    arc_voltage_V: EDM_PHYSICS.spark_erosion.typical_arc_voltage_V,
    min_pulse_on_us: 0.05,
    max_pulse_on_us: 50,
    min_current_A: 0.5,
    max_current_A: 50,
    min_duty_cycle: 0.01,
    max_duty_cycle: 0.50,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Calculate spark erosion physics for given parameters.
   * Core DiBitonto-Sato hybrid model.
   */
  calculate(input: SparkErosionInput): SparkErosionResult {
    const warnings: string[] = [];
    const se = EDM_PHYSICS.spark_erosion;

    // Resolve material and get efficiency
    const resolvedMat = this.resolveMaterialKey(input.material);
    const efficiency = this.getRemovalEfficiency(resolvedMat);

    // Validate inputs
    const { pulse_on_us, pulse_off_us, current_A } = input;
    if (pulse_on_us < this.config.min_pulse_on_us) {
      warnings.push(`Pulse on-time ${pulse_on_us}µs below minimum ${this.config.min_pulse_on_us}µs`);
    }
    if (pulse_on_us > this.config.max_pulse_on_us) {
      warnings.push(`Pulse on-time ${pulse_on_us}µs above maximum ${this.config.max_pulse_on_us}µs`);
    }
    if (current_A < this.config.min_current_A) {
      warnings.push(`Current ${current_A}A below minimum ${this.config.min_current_A}A`);
    }
    if (current_A > this.config.max_current_A) {
      warnings.push(`Current ${current_A}A above typical maximum ${this.config.max_current_A}A`);
    }

    // Calculate duty cycle
    const duty_cycle = pulse_on_us / (pulse_on_us + pulse_off_us);
    if (duty_cycle > this.config.max_duty_cycle) {
      warnings.push(`Duty cycle ${(duty_cycle * 100).toFixed(1)}% exceeds safe limit — wire break risk`);
    }

    // Spark frequency (inverse of pulse period)
    const period_us = pulse_on_us + pulse_off_us;
    const spark_frequency_Hz = input.spark_frequency_Hz ?? (1_000_000 / period_us);

    // Arc voltage
    const arc_voltage_V = input.voltage_V
      ? Math.min(input.voltage_V, this.config.arc_voltage_V)
      : this.config.arc_voltage_V;

    // ────────────────────────────────────────────────────────────────────────
    // DiBitonto Crater Model
    // Dc = C_d × I^0.43 × t_on^0.44 [µm]
    // Dp = C_p × I^0.38 × t_on^0.38 [µm]
    // ────────────────────────────────────────────────────────────────────────
    const crater_diameter_um =
      se.C_d *
      Math.pow(current_A, se.current_exp_d) *
      Math.pow(pulse_on_us, se.ton_exp_d);

    const crater_depth_um =
      se.C_p *
      Math.pow(current_A, se.current_exp_p) *
      Math.pow(pulse_on_us, se.ton_exp_p);

    // Crater volume (hemispherical approximation)
    // V = (2/3) × π × (D/2)² × h
    const crater_radius_um = crater_diameter_um / 2;
    const crater_volume_um3 =
      (2 / 3) * Math.PI * crater_radius_um * crater_radius_um * crater_depth_um;

    // ────────────────────────────────────────────────────────────────────────
    // Energy per Spark
    // E = I × V_arc × t_on / 1000 [mJ]
    // ────────────────────────────────────────────────────────────────────────
    const energy_per_spark_mJ = (current_A * arc_voltage_V * pulse_on_us) / 1000;

    // ────────────────────────────────────────────────────────────────────────
    // MRR Model (Physics-based: crater volume × spark frequency × efficiency)
    // MRR = V_crater [µm³] × f_spark [Hz] × η × 1e-9 [mm³/µm³] × 60 [s/min]
    // ────────────────────────────────────────────────────────────────────────
    // Method 1: Physics-based from crater geometry
    const mrr_physics_um3_s = crater_volume_um3 * spark_frequency_Hz * efficiency;
    const mrr_physics_mm3_min = mrr_physics_um3_s * 1e-9 * 60;

    // Method 2: Empirical Klocke model (calibrated for typical WEDM conditions)
    // MRR = C × I^1.2 × t_on^0.65 × duty^0.8 × f_norm × η
    // f_norm normalizes to typical 100kHz spark frequency (typical WEDM)
    const f_norm = spark_frequency_Hz / 100000;
    const mrr_empirical =
      se.C_mrr *
      Math.pow(current_A, se.mrr_current_exp) *
      Math.pow(pulse_on_us, se.mrr_ton_exp) *
      Math.pow(duty_cycle, se.mrr_duty_exp) *
      f_norm *
      50 * // Scale factor calibrated to Charmilles handbook data
      efficiency;

    // Use weighted average of both methods for robustness
    const mrr_mm3_min = 0.4 * mrr_physics_mm3_min + 0.6 * mrr_empirical;

    // Thickness correction: thinner parts have better flushing
    const thickness_factor = this.thicknessCorrection(input.thickness_mm);
    const mrr_corrected = mrr_mm3_min * thickness_factor;

    // ────────────────────────────────────────────────────────────────────────
    // Klocke Ra Model
    // Ra ≈ k_ra × I^α × t_on^β [µm]
    // ────────────────────────────────────────────────────────────────────────
    const predicted_Ra_um = this.calculateRa(resolvedMat, current_A, pulse_on_us);

    return {
      crater_diameter_um: Math.round(crater_diameter_um * 100) / 100,
      crater_depth_um: Math.round(crater_depth_um * 100) / 100,
      crater_volume_um3: Math.round(crater_volume_um3),
      energy_per_spark_mJ: Math.round(energy_per_spark_mJ * 1000) / 1000,
      mrr_mm3_min: Math.round(mrr_corrected * 1000) / 1000,
      removal_efficiency: efficiency,
      duty_cycle: Math.round(duty_cycle * 1000) / 1000,
      spark_frequency_Hz: Math.round(spark_frequency_Hz),
      predicted_Ra_um: Math.round(predicted_Ra_um * 100) / 100,
      arc_voltage_V,
      resolved_material: resolvedMat,
      physics_source: se.source,
      warnings,
    };
  }

  /**
   * Compare spark erosion across multiple materials.
   */
  compareMaterials(input: BatchSparkInput): MaterialComparisonResult[] {
    const results: MaterialComparisonResult[] = [];
    const steelMrr = this.calculate({
      material: "steel",
      thickness_mm: input.thickness_mm,
      pulse_on_us: input.pulse_on_us,
      pulse_off_us: input.pulse_off_us,
      current_A: input.current_A,
    }).mrr_mm3_min;

    for (const mat of input.materials) {
      const result = this.calculate({
        material: mat,
        thickness_mm: input.thickness_mm,
        pulse_on_us: input.pulse_on_us,
        pulse_off_us: input.pulse_off_us,
        current_A: input.current_A,
      });

      results.push({
        material: mat,
        mrr_mm3_min: result.mrr_mm3_min,
        crater_diameter_um: result.crater_diameter_um,
        predicted_Ra_um: result.predicted_Ra_um,
        removal_efficiency: result.removal_efficiency,
        relative_machinability: result.mrr_mm3_min / steelMrr,
      });
    }

    return results.sort((a, b) => b.mrr_mm3_min - a.mrr_mm3_min);
  }

  /**
   * Predict cut time for a given cut length.
   */
  predictCutTime(
    input: SparkErosionInput & { cut_length_mm: number; wire_diameter_mm: number }
  ): {
    cut_time_minutes: number;
    cut_time_formatted: string;
    feed_rate_mm_min: number;
  } {
    const result = this.calculate(input);

    // Feed rate from MRR: V_f = MRR / (kerf_width × thickness)
    // kerf_width ≈ wire_diameter + 2 × spark_gap
    const spark_gap_mm = 0.025; // typical
    const kerf_width_mm = (input.wire_diameter_mm ?? 0.25) + 2 * spark_gap_mm;
    const cross_section_mm2 = kerf_width_mm * input.thickness_mm;

    // MRR [mm³/min] = feed [mm/min] × cross_section [mm²]
    const feed_rate_mm_min = result.mrr_mm3_min / cross_section_mm2;
    const cut_time_minutes = input.cut_length_mm / feed_rate_mm_min;

    const hours = Math.floor(cut_time_minutes / 60);
    const mins = Math.round(cut_time_minutes % 60);
    const cut_time_formatted =
      hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      cut_time_minutes: Math.round(cut_time_minutes * 10) / 10,
      cut_time_formatted,
      feed_rate_mm_min: Math.round(feed_rate_mm_min * 100) / 100,
    };
  }

  /**
   * Validate parameters against physical limits.
   */
  validateParameters(input: SparkErosionInput): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Current density check
    const wire_d = input.wire_diameter_mm ?? 0.25;
    const wire_area_mm2 = Math.PI * (wire_d / 2) ** 2;
    const current_density = input.current_A / wire_area_mm2;
    const max_density = EDM_PHYSICS.wire_safety.max_current_density_brass;

    if (current_density > max_density) {
      issues.push(
        `Current density ${current_density.toFixed(0)} A/mm² exceeds wire limit ${max_density} A/mm²`
      );
      const max_current = max_density * wire_area_mm2;
      recommendations.push(`Reduce current to ${max_current.toFixed(1)} A or use larger wire`);
    } else if (current_density > max_density * EDM_PHYSICS.wire_safety.warning_threshold) {
      recommendations.push(
        `Current density ${current_density.toFixed(0)} A/mm² approaching wire limit — monitor break risk`
      );
    }

    // Duty cycle check
    const duty = input.pulse_on_us / (input.pulse_on_us + input.pulse_off_us);
    if (duty > this.config.max_duty_cycle) {
      issues.push(`Duty cycle ${(duty * 100).toFixed(1)}% exceeds safe limit 50%`);
      recommendations.push(`Increase pulse off-time to reduce duty cycle`);
    }

    // Energy per spark check (thermal load)
    const energy_mJ =
      (input.current_A * (input.voltage_V ?? 25) * input.pulse_on_us) / 1000;
    if (energy_mJ > 10) {
      recommendations.push(
        `High energy per spark (${energy_mJ.toFixed(1)} mJ) — monitor for thermal damage`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private resolveMaterialKey(material: string): string {
    const key = material.toLowerCase().replace(/[\s-]/g, "_");

    // Direct match in efficiency table
    const efficiencyTable = EDM_PHYSICS.spark_erosion.removal_efficiency;
    if (key in efficiencyTable) return key;

    // Fuzzy match
    if (key.includes("stainless") || key === "304" || key === "316") return "stainless";
    if (key.includes("titanium") || key.includes("ti6al4v")) return "titanium";
    if (key.includes("inconel") || key.includes("718") || key.includes("nickel")) return "inconel";
    if (key.includes("carbide") || key.includes("tungsten") || key.includes("wc")) return "tungsten_carbide";
    if (key.includes("aluminum") || key.includes("6061") || key.includes("7075")) return "aluminum";
    if (key.includes("copper") || key.includes("c110")) return "copper";
    if (key.includes("alloy") || key.includes("4140") || key.includes("4340")) return "steel";

    // Default
    return "steel";
  }

  private getRemovalEfficiency(materialKey: string): number {
    const table = EDM_PHYSICS.spark_erosion.removal_efficiency as Record<string, number>;
    return table[materialKey] ?? 0.65; // default steel efficiency
  }

  private thicknessCorrection(thickness_mm: number): number {
    // Thinner parts have better flushing, higher MRR
    // Based on Klocke thickness-MRR relationship
    if (thickness_mm <= 10) return 1.15;
    if (thickness_mm <= 25) return 1.05;
    if (thickness_mm <= 50) return 1.0;
    if (thickness_mm <= 100) return 0.92;
    return 0.85; // >100mm thick — poor flushing
  }

  private calculateRa(materialKey: string, current_A: number, pulse_on_us: number): number {
    // Klocke Ra model: Ra = A × I^a × t_on^b [µm]
    // Source: Klocke 'Fertigungsverfahren Band 3' Table 5.7
    const raModels = EDM_PHYSICS.klocke?.ra_models as Record<string, { A: number; a: number; b: number; min_ra_um: number }> | undefined;

    if (!raModels) {
      // Fallback if klocke not defined — use generic steel model
      return 0.52 * Math.pow(current_A, 0.38) * Math.pow(pulse_on_us, 0.45);
    }

    // Find matching model
    let model = raModels.steel ?? { A: 0.52, a: 0.38, b: 0.45, min_ra_um: 0.15 };
    if (materialKey === "stainless" && raModels.stainless) model = raModels.stainless;
    else if (materialKey === "aluminum" && raModels.aluminum) model = raModels.aluminum;
    else if (materialKey === "tungsten_carbide" && raModels.tungsten_carbide) model = raModels.tungsten_carbide;
    else if (materialKey === "titanium" && raModels.titanium) model = raModels.titanium;
    else if (materialKey === "inconel" && raModels.inconel) model = raModels.inconel;
    else if (materialKey === "copper" && raModels.copper) model = raModels.copper;
    else if (materialKey === "tool_steel" && raModels.tool_steel) model = raModels.tool_steel;

    const ra = model.A * Math.pow(current_A, model.a) * Math.pow(pulse_on_us, model.b);
    return Math.max(ra, model.min_ra_um);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmSparkErosionModelEngine = new WEDMSparkErosionModelEngine();
