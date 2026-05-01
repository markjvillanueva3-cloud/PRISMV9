/**
 * AdvancedReportRendererEngine — Manufacturing Intelligence Layer
 *
 * Generates advanced manufacturing reports with physics-backed calculations:
 * - Tool life forecasting (Takeyama-Murata / Taylor)
 * - Process capability studies (Cp/Cpk/Pp/Ppk)
 * - Stability lobe diagrams (chatter avoidance)
 * - Cost sensitivity (tornado chart)
 * - Cycle time variance analysis
 * - Scrap/defect Pareto reporting
 *
 * Actions: report_tool_life_forecast, report_capability_study,
 *          report_stability_map, report_cost_sensitivity,
 *          report_cycle_time_variance, report_scrap
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ToolLifeForecastInput {
  tool_id: string;
  current_wear_VB_mm: number;
  cutting_speed_mpm: number;
  material: string;
  taylor_C?: number;
  taylor_n?: number;
}

export interface ToolLifeForecastResult {
  current_wear_pct: number;
  remaining_life_min: number;
  remaining_parts: number;
  wear_curve: Array<{ time_min: number; wear_mm: number }>;
  replacement_recommendation: string;
}

export interface CapabilityStudyInput {
  measurements: number[];
  nominal: number;
  usl: number;
  lsl: number;
  subgroup_size?: number;
}

export interface CapabilityStudyResult {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  mean: number;
  std_dev: number;
  within_spec_pct: number;
  histogram: Array<{ bin_center: number; count: number }>;
  control_chart: { x_bar: number[]; ucl: number; lcl: number; cl: number };
  assessment: string;
}

export interface StabilityMapInput {
  tool_diameter_mm: number;
  flutes: number;
  stiffness_N_per_m?: number;
  material: string;
  depth_range_mm: [number, number];
  speed_range_rpm: [number, number];
  resolution?: number;
}

export interface StabilityMapResult {
  lobes: Array<{ rpm: number; critical_depth_mm: number }>;
  safe_zones: Array<{ rpm_min: number; rpm_max: number; max_depth_mm: number }>;
  recommended_rpm: number;
  recommended_depth_mm: number;
}

export interface CostSensitivityInput {
  base_cost: number;
  parameters: Array<{
    name: string;
    base_value: number;
    variation_pct: number;
    cost_impact_per_unit: number;
  }>;
}

export interface CostSensitivityResult {
  tornado_chart: Array<{
    parameter: string;
    low_cost: number;
    high_cost: number;
    delta: number;
  }>;
  most_sensitive: string;
  least_sensitive: string;
  total_range: number;
}

export interface CycleTimeVarianceInput {
  predicted_times: number[];
  actual_times: number[];
  operation_names?: string[];
}

export interface CycleTimeVarianceResult {
  per_operation: Array<{
    name: string;
    predicted: number;
    actual: number;
    delta_pct: number;
  }>;
  total_predicted: number;
  total_actual: number;
  variance_pct: number;
  systematic_bias: number;
  random_error_pct: number;
  worst_operations: string[];
}

export interface ScrapEvent {
  date: string;
  defect_type: string;
  part_number: string;
  cost: number;
  root_cause?: string;
}

export interface ScrapReportInput {
  events: ScrapEvent[];
}

export interface ScrapReportResult {
  total_scrap_cost: number;
  scrap_rate_pct: number;
  pareto_by_defect: Array<{
    type: string;
    count: number;
    cost: number;
    pct: number;
  }>;
  trend: "improving" | "stable" | "worsening";
  monthly_data: Array<{ month: string; count: number; cost: number }>;
  top_actions: string[];
}

// ============================================================================
// MATERIAL DEFAULTS (Takeyama-Murata / Taylor coefficients)
// ============================================================================

/** Default Taylor coefficients by material group */
const MATERIAL_TAYLOR: Record<string, { C: number; n: number }> = {
  steel: { C: 200, n: 0.25 },
  stainless: { C: 150, n: 0.20 },
  aluminum: { C: 600, n: 0.40 },
  cast_iron: { C: 180, n: 0.25 },
  titanium: { C: 80, n: 0.15 },
  inconel: { C: 50, n: 0.12 },
  copper: { C: 400, n: 0.35 },
  brass: { C: 350, n: 0.30 },
};

/** Takeyama-Murata wear rate constants by material */
const MATERIAL_WEAR_RATE: Record<string, { C1: number; C2: number; activation_energy: number }> = {
  steel:     { C1: 0.0001, C2: 0.00005, activation_energy: 25000 },
  stainless: { C1: 0.00015, C2: 0.00008, activation_energy: 23000 },
  aluminum:  { C1: 0.00003, C2: 0.00001, activation_energy: 30000 },
  cast_iron: { C1: 0.00012, C2: 0.00006, activation_energy: 24000 },
  titanium:  { C1: 0.0003, C2: 0.00015, activation_energy: 20000 },
  inconel:   { C1: 0.0005, C2: 0.00025, activation_energy: 18000 },
  copper:    { C1: 0.00005, C2: 0.00002, activation_energy: 28000 },
  brass:     { C1: 0.00004, C2: 0.000015, activation_energy: 29000 },
};

/** Specific cutting force (N/mm²) for stability lobe calculation */
const MATERIAL_KS: Record<string, number> = {
  steel: 2500,
  stainless: 2800,
  aluminum: 800,
  cast_iron: 1500,
  titanium: 1800,
  inconel: 3200,
  copper: 1200,
  brass: 1000,
};

// VB_max threshold for end-of-life (mm)
const VB_MAX = 0.3;

// ============================================================================
// ENGINE
// ============================================================================

export class AdvancedReportRendererEngine {
  /**
   * Tool life forecast using Takeyama-Murata wear progression + Taylor life.
   * Takeyama-Murata: dVB/dt = C1 + C2 * exp(activation_energy / (R*T))
   * Taylor: V * T^n = C  =>  T = (C/V)^(1/n)
   */
  generateToolLifeForecast(input: ToolLifeForecastInput): ToolLifeForecastResult {
    const matKey = this.normalizeMaterial(input.material);
    const taylor = {
      C: input.taylor_C ?? MATERIAL_TAYLOR[matKey]?.C ?? 200,
      n: input.taylor_n ?? MATERIAL_TAYLOR[matKey]?.n ?? 0.25,
    };
    const wearParams = MATERIAL_WEAR_RATE[matKey] ?? MATERIAL_WEAR_RATE.steel;

    // Taylor tool life (minutes)
    const V = input.cutting_speed_mpm;
    const taylorLife = Math.pow(taylor.C / V, 1 / taylor.n);

    // Takeyama-Murata wear curve: VB(t) = C1*t + C2*t² (simplified thermal form)
    const R = 8.314;
    const T_kelvin = 273 + 200 + V * 0.5; // approximate cutting temperature
    const thermalFactor = wearParams.C2 * Math.exp(-wearParams.activation_energy / (R * T_kelvin));
    const C1 = wearParams.C1 * (V / 100);
    const C2 = thermalFactor * (V / 100);

    // Build wear curve
    const wear_curve: Array<{ time_min: number; wear_mm: number }> = [];
    const dt = Math.max(taylorLife / 50, 0.1);
    let currentTime = 0;
    let currentWear = input.current_wear_VB_mm;
    const startWear = currentWear;

    // Walk backward to find equivalent start time for current wear
    // VB(t) = C1*t + C2*t², solve for t given VB = currentWear
    // Quadratic: C2*t² + C1*t - currentWear = 0
    let t_equiv = 0;
    if (currentWear > 0 && C2 > 0) {
      const disc = C1 * C1 + 4 * C2 * currentWear;
      t_equiv = (-C1 + Math.sqrt(disc)) / (2 * C2);
    } else if (currentWear > 0 && C1 > 0) {
      t_equiv = currentWear / C1;
    }

    // Project forward from current state
    let remainingLife = 0;
    let wearAtEnd = currentWear;
    for (let step = 0; step <= 50; step++) {
      const t = t_equiv + step * dt;
      const vb = C1 * t + C2 * t * t;
      wear_curve.push({ time_min: Math.round(step * dt * 100) / 100, wear_mm: Math.round(vb * 10000) / 10000 });
      if (vb >= VB_MAX && remainingLife === 0) {
        // Interpolate exact crossing
        remainingLife = step * dt;
        wearAtEnd = vb;
      }
    }

    // If we never hit VB_MAX, remaining life is full projection
    if (remainingLife === 0) {
      // Solve C1*(t_equiv+t) + C2*(t_equiv+t)^2 = VB_MAX
      const a = C2;
      const b = C1;
      const c = -VB_MAX;
      let t_end: number;
      if (a > 1e-15) {
        t_end = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      } else {
        t_end = VB_MAX / C1;
      }
      remainingLife = Math.max(t_end - t_equiv, 0);
    }

    // Cap to Taylor life as upper bound
    const effectiveRemainingLife = Math.min(remainingLife, Math.max(taylorLife - t_equiv, 0));

    const current_wear_pct = Math.min((input.current_wear_VB_mm / VB_MAX) * 100, 100);
    // Assume ~2 min per part as default cycle
    const avgPartTime = 2;
    const remaining_parts = Math.max(Math.floor(effectiveRemainingLife / avgPartTime), 0);

    let recommendation: string;
    if (current_wear_pct >= 90) {
      recommendation = "IMMEDIATE replacement required — tool at end of life";
    } else if (current_wear_pct >= 70) {
      recommendation = `Replace within ${Math.round(effectiveRemainingLife)} min — schedule change at next opportunity`;
    } else if (current_wear_pct >= 50) {
      recommendation = `Tool at ${Math.round(current_wear_pct)}% life — monitor closely, ~${remaining_parts} parts remaining`;
    } else {
      recommendation = `Tool in good condition — ~${remaining_parts} parts / ${Math.round(effectiveRemainingLife)} min remaining`;
    }

    return {
      current_wear_pct: Math.round(current_wear_pct * 100) / 100,
      remaining_life_min: Math.round(effectiveRemainingLife * 100) / 100,
      remaining_parts,
      wear_curve,
      replacement_recommendation: recommendation,
    };
  }

  /**
   * Process capability study: Cp, Cpk, Pp, Ppk with histogram and X-bar chart.
   */
  generateCapabilityStudy(input: CapabilityStudyInput): CapabilityStudyResult {
    const { measurements, nominal, usl, lsl } = input;
    const n = measurements.length;
    if (n < 2) {
      return {
        cp: 0, cpk: 0, pp: 0, ppk: 0,
        mean: measurements[0] ?? nominal, std_dev: 0,
        within_spec_pct: 100,
        histogram: [], control_chart: { x_bar: [], ucl: 0, lcl: 0, cl: 0 },
        assessment: "Insufficient data — need at least 2 measurements",
      };
    }

    const subgroupSize = input.subgroup_size ?? 5;
    const mean = measurements.reduce((s, v) => s + v, 0) / n;

    // Overall (long-term) std dev for Pp/Ppk
    const totalSS = measurements.reduce((s, v) => s + (v - mean) ** 2, 0);
    const overallSigma = Math.sqrt(totalSS / (n - 1));

    // Within-subgroup (short-term) std dev for Cp/Cpk using R-bar method
    const d2Table: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };
    const d2 = d2Table[Math.min(subgroupSize, 10)] ?? 2.326;

    // Build subgroups
    const numSubgroups = Math.max(Math.floor(n / subgroupSize), 1);
    const subgroupMeans: number[] = [];
    const subgroupRanges: number[] = [];

    for (let i = 0; i < numSubgroups; i++) {
      const start = i * subgroupSize;
      const end = Math.min(start + subgroupSize, n);
      const sg = measurements.slice(start, end);
      const sgMean = sg.reduce((s, v) => s + v, 0) / sg.length;
      const sgRange = Math.max(...sg) - Math.min(...sg);
      subgroupMeans.push(sgMean);
      subgroupRanges.push(sgRange);
    }

    const rBar = subgroupRanges.reduce((s, v) => s + v, 0) / subgroupRanges.length;
    const withinSigma = rBar > 0 ? rBar / d2 : overallSigma;

    const tolerance = usl - lsl;

    // Cp = tolerance / (6 * sigma_within)
    const cp = withinSigma > 0 ? tolerance / (6 * withinSigma) : 0;
    // Cpk = min((USL-mean), (mean-LSL)) / (3 * sigma_within)
    const cpk = withinSigma > 0 ? Math.min(usl - mean, mean - lsl) / (3 * withinSigma) : 0;
    // Pp = tolerance / (6 * sigma_overall)
    const pp = overallSigma > 0 ? tolerance / (6 * overallSigma) : 0;
    // Ppk = min((USL-mean), (mean-LSL)) / (3 * sigma_overall)
    const ppk = overallSigma > 0 ? Math.min(usl - mean, mean - lsl) / (3 * overallSigma) : 0;

    // Within-spec percentage
    const inSpec = measurements.filter((v) => v >= lsl && v <= usl).length;
    const within_spec_pct = Math.round((inSpec / n) * 10000) / 100;

    // Histogram (Sturges' rule for bin count)
    const numBins = Math.max(Math.ceil(Math.log2(n) + 1), 5);
    const minVal = Math.min(...measurements);
    const maxVal = Math.max(...measurements);
    const binWidth = (maxVal - minVal) / numBins || 1;
    const histogram: Array<{ bin_center: number; count: number }> = [];
    for (let i = 0; i < numBins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;
      const binCenter = Math.round((binStart + binWidth / 2) * 10000) / 10000;
      const count = measurements.filter(
        (v) => (i === numBins - 1 ? v >= binStart && v <= binEnd : v >= binStart && v < binEnd)
      ).length;
      histogram.push({ bin_center: binCenter, count });
    }

    // X-bar control chart
    const xBarBar = subgroupMeans.reduce((s, v) => s + v, 0) / subgroupMeans.length;
    const A2Table: Record<number, number> = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
    const A2 = A2Table[Math.min(subgroupSize, 10)] ?? 0.577;
    const ucl = xBarBar + A2 * rBar;
    const lcl = xBarBar - A2 * rBar;

    // Assessment
    let assessment: string;
    if (cpk >= 2.0) {
      assessment = "Six Sigma capable — excellent process";
    } else if (cpk >= 1.67) {
      assessment = "Highly capable process — exceeds typical requirements";
    } else if (cpk >= 1.33) {
      assessment = "Capable process — meets most requirements";
    } else if (cpk >= 1.0) {
      assessment = "Marginally capable — improvement recommended";
    } else if (cpk >= 0.67) {
      assessment = "Not capable — significant improvement needed";
    } else {
      assessment = "Severely incapable — process requires immediate attention";
    }

    return {
      cp: Math.round(cp * 1000) / 1000,
      cpk: Math.round(cpk * 1000) / 1000,
      pp: Math.round(pp * 1000) / 1000,
      ppk: Math.round(ppk * 1000) / 1000,
      mean: Math.round(mean * 10000) / 10000,
      std_dev: Math.round(overallSigma * 10000) / 10000,
      within_spec_pct,
      histogram,
      control_chart: {
        x_bar: subgroupMeans.map((v) => Math.round(v * 10000) / 10000),
        ucl: Math.round(ucl * 10000) / 10000,
        lcl: Math.round(lcl * 10000) / 10000,
        cl: Math.round(xBarBar * 10000) / 10000,
      },
      assessment,
    };
  }

  /**
   * Stability lobe diagram — computes critical depth of cut vs spindle speed.
   * Based on Altintas analytical stability model:
   *   a_lim = -1 / (2 * Ks * Re[G(jω)])
   * Simplified: lobes occur at RPM = 60*fn / (N + phi/(2*pi))
   */
  generateStabilityMap(input: StabilityMapInput): StabilityMapResult {
    const { tool_diameter_mm, flutes, material, depth_range_mm, speed_range_rpm } = input;
    const resolution = input.resolution ?? 200;
    const stiffness = input.stiffness_N_per_m ?? 5e6; // Default 5 MN/m
    const Ks = MATERIAL_KS[this.normalizeMaterial(material)] ?? 2500;

    // Natural frequency estimate from tool geometry (cantilever)
    // fn ≈ (1/(2π)) * sqrt(k/m), approximate m from steel density
    const toolLength = tool_diameter_mm * 4; // L/D = 4 typical
    const toolRadius = tool_diameter_mm / 2;
    const toolMass = Math.PI * (toolRadius / 1000) ** 2 * (toolLength / 1000) * 7800; // kg
    const fn = (1 / (2 * Math.PI)) * Math.sqrt(stiffness / Math.max(toolMass, 0.001));

    // Damping ratio
    const zeta = 0.02; // typical structural damping

    const lobes: Array<{ rpm: number; critical_depth_mm: number }> = [];
    const [rpmMin, rpmMax] = speed_range_rpm;
    const rpmStep = Math.max((rpmMax - rpmMin) / resolution, 1);

    // Generate stability lobes for first 10 lobes
    for (let N = 0; N < 10; N++) {
      for (let rpm = rpmMin; rpm <= rpmMax; rpm += rpmStep) {
        const toothFreq = (rpm * flutes) / 60;
        // Phase angle
        const r = toothFreq / fn;
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        // Critical lobe RPM
        const lobeRPM = (60 * fn) / (flutes * (N + phi / (2 * Math.PI)));

        if (lobeRPM >= rpmMin && lobeRPM <= rpmMax) {
          // Critical depth: a_lim = stiffness / (2 * Ks * flutes * kappa)
          // where kappa accounts for dynamic response
          const kappa = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
          const a_lim = stiffness / (2 * Ks * flutes * kappa * 1000); // mm
          const clamped = Math.min(Math.max(a_lim, depth_range_mm[0]), depth_range_mm[1]);

          lobes.push({
            rpm: Math.round(lobeRPM),
            critical_depth_mm: Math.round(clamped * 1000) / 1000,
          });
        }
      }
    }

    // Sort by RPM
    lobes.sort((a, b) => a.rpm - b.rpm);

    // Deduplicate close RPM values (within 50 RPM)
    const dedupedLobes: typeof lobes = [];
    for (const lobe of lobes) {
      const last = dedupedLobes[dedupedLobes.length - 1];
      if (!last || Math.abs(lobe.rpm - last.rpm) > 50) {
        dedupedLobes.push(lobe);
      } else if (lobe.critical_depth_mm > last.critical_depth_mm) {
        dedupedLobes[dedupedLobes.length - 1] = lobe;
      }
    }

    // Find safe zones (regions where critical depth is highest)
    const safe_zones: Array<{ rpm_min: number; rpm_max: number; max_depth_mm: number }> = [];
    if (dedupedLobes.length >= 2) {
      // Group consecutive lobes into zones by depth threshold
      const depthThreshold = depth_range_mm[1] * 0.5;
      let zoneStart: typeof dedupedLobes[0] | null = null;
      let zoneMaxDepth = 0;

      for (const lobe of dedupedLobes) {
        if (lobe.critical_depth_mm >= depthThreshold) {
          if (!zoneStart) zoneStart = lobe;
          zoneMaxDepth = Math.max(zoneMaxDepth, lobe.critical_depth_mm);
        } else {
          if (zoneStart) {
            safe_zones.push({
              rpm_min: zoneStart.rpm,
              rpm_max: dedupedLobes[dedupedLobes.indexOf(lobe) - 1]?.rpm ?? zoneStart.rpm,
              max_depth_mm: Math.round(zoneMaxDepth * 1000) / 1000,
            });
            zoneStart = null;
            zoneMaxDepth = 0;
          }
        }
      }
      if (zoneStart) {
        safe_zones.push({
          rpm_min: zoneStart.rpm,
          rpm_max: dedupedLobes[dedupedLobes.length - 1].rpm,
          max_depth_mm: Math.round(zoneMaxDepth * 1000) / 1000,
        });
      }
    }

    // Recommended operating point: highest critical depth lobe
    const best = dedupedLobes.reduce(
      (b, l) => (l.critical_depth_mm > b.critical_depth_mm ? l : b),
      dedupedLobes[0] ?? { rpm: Math.round((rpmMin + rpmMax) / 2), critical_depth_mm: depth_range_mm[0] }
    );

    return {
      lobes: dedupedLobes,
      safe_zones,
      recommended_rpm: best.rpm,
      recommended_depth_mm: best.critical_depth_mm,
    };
  }

  /**
   * Cost sensitivity analysis — tornado chart generation.
   */
  generateCostSensitivity(input: CostSensitivityInput): CostSensitivityResult {
    const { base_cost, parameters } = input;

    const tornado_chart = parameters.map((p) => {
      const lowValue = p.base_value * (1 - p.variation_pct / 100);
      const highValue = p.base_value * (1 + p.variation_pct / 100);
      const lowDelta = (lowValue - p.base_value) * p.cost_impact_per_unit;
      const highDelta = (highValue - p.base_value) * p.cost_impact_per_unit;
      const low_cost = Math.round((base_cost + lowDelta) * 100) / 100;
      const high_cost = Math.round((base_cost + highDelta) * 100) / 100;
      return {
        parameter: p.name,
        low_cost,
        high_cost,
        delta: Math.round(Math.abs(high_cost - low_cost) * 100) / 100,
      };
    });

    // Sort by delta descending (most sensitive first)
    tornado_chart.sort((a, b) => b.delta - a.delta);

    const most_sensitive = tornado_chart[0]?.parameter ?? "none";
    const least_sensitive = tornado_chart[tornado_chart.length - 1]?.parameter ?? "none";
    const total_range = tornado_chart.reduce((max, t) => Math.max(max, t.delta), 0);

    return {
      tornado_chart,
      most_sensitive,
      least_sensitive,
      total_range: Math.round(total_range * 100) / 100,
    };
  }

  /**
   * Cycle time variance analysis — predicted vs actual comparison.
   */
  generateCycleTimeVariance(input: CycleTimeVarianceInput): CycleTimeVarianceResult {
    const { predicted_times, actual_times, operation_names } = input;
    const n = Math.min(predicted_times.length, actual_times.length);

    const per_operation: CycleTimeVarianceResult["per_operation"] = [];
    const deltas: number[] = [];

    for (let i = 0; i < n; i++) {
      const pred = predicted_times[i];
      const act = actual_times[i];
      const delta_pct = pred !== 0 ? Math.round(((act - pred) / pred) * 10000) / 100 : 0;
      deltas.push(delta_pct);
      per_operation.push({
        name: operation_names?.[i] ?? `Op ${i + 1}`,
        predicted: pred,
        actual: act,
        delta_pct,
      });
    }

    const total_predicted = predicted_times.slice(0, n).reduce((s, v) => s + v, 0);
    const total_actual = actual_times.slice(0, n).reduce((s, v) => s + v, 0);
    const variance_pct = total_predicted > 0
      ? Math.round(((total_actual - total_predicted) / total_predicted) * 10000) / 100
      : 0;

    // Systematic bias = mean of deltas (positive = underestimate)
    const meanDelta = deltas.length > 0 ? deltas.reduce((s, v) => s + v, 0) / deltas.length : 0;
    const systematic_bias = Math.round(meanDelta * 100) / 100;

    // Random error = std dev of deltas
    const deltaSS = deltas.reduce((s, v) => s + (v - meanDelta) ** 2, 0);
    const random_error_pct = deltas.length > 1
      ? Math.round(Math.sqrt(deltaSS / (deltas.length - 1)) * 100) / 100
      : 0;

    // Worst operations: top 3 by absolute delta
    const sorted = [...per_operation].sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct));
    const worst_operations = sorted.slice(0, 3).map((op) => op.name);

    return {
      per_operation,
      total_predicted: Math.round(total_predicted * 100) / 100,
      total_actual: Math.round(total_actual * 100) / 100,
      variance_pct,
      systematic_bias,
      random_error_pct,
      worst_operations,
    };
  }

  /**
   * Scrap/defect report with Pareto, trend, and corrective actions.
   */
  generateScrapReport(input: ScrapReportInput): ScrapReportResult {
    const { events } = input;
    if (events.length === 0) {
      return {
        total_scrap_cost: 0,
        scrap_rate_pct: 0,
        pareto_by_defect: [],
        trend: "stable",
        monthly_data: [],
        top_actions: ["No scrap events recorded"],
      };
    }

    const total_scrap_cost = Math.round(events.reduce((s, e) => s + e.cost, 0) * 100) / 100;

    // Group by defect type
    const byDefect = new Map<string, { count: number; cost: number }>();
    for (const e of events) {
      const curr = byDefect.get(e.defect_type) ?? { count: 0, cost: 0 };
      curr.count++;
      curr.cost += e.cost;
      byDefect.set(e.defect_type, curr);
    }

    // Pareto sort (by cost descending)
    const paretoEntries = [...byDefect.entries()]
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([type, data]) => ({
        type,
        count: data.count,
        cost: Math.round(data.cost * 100) / 100,
        pct: Math.round((data.cost / total_scrap_cost) * 10000) / 100,
      }));

    // Monthly aggregation
    const byMonth = new Map<string, { count: number; cost: number }>();
    for (const e of events) {
      const month = e.date.substring(0, 7); // YYYY-MM
      const curr = byMonth.get(month) ?? { count: 0, cost: 0 };
      curr.count++;
      curr.cost += e.cost;
      byMonth.set(month, curr);
    }

    const monthly_data = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        count: data.count,
        cost: Math.round(data.cost * 100) / 100,
      }));

    // Trend: compare first half vs second half cost
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (monthly_data.length >= 2) {
      const mid = Math.floor(monthly_data.length / 2);
      const firstHalf = monthly_data.slice(0, mid).reduce((s, m) => s + m.cost, 0) / mid;
      const secondHalf = monthly_data.slice(mid).reduce((s, m) => s + m.cost, 0) / (monthly_data.length - mid);
      const changePct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      if (changePct < -15) trend = "improving";
      else if (changePct > 15) trend = "worsening";
    }

    // Scrap rate: events per unique part
    const uniqueParts = new Set(events.map((e) => e.part_number));
    // Approximate: assume each part had ~10 production runs
    const scrap_rate_pct = Math.round((events.length / (uniqueParts.size * 10)) * 10000) / 100;

    // Corrective actions based on top defects
    const actionMap: Record<string, string> = {
      dimensional: "Review tool wear compensation and fixture clamping forces",
      surface_finish: "Check insert nose radius and cutting speed; reduce feed rate",
      burr: "Add deburring pass or chamfer; review exit strategy",
      chatter: "Reduce depth of cut or change RPM to stable lobe; check tool stickout",
      tool_breakage: "Reduce feed rate and verify tool grade; check for interrupted cuts",
      crack: "Review material heat treatment and cutting forces",
      porosity: "Check coolant delivery and chip evacuation",
      wrong_dimension: "Verify program offsets and tool length compensation",
    };

    const top_actions = paretoEntries.slice(0, 3).map((p) => {
      const key = p.type.toLowerCase().replace(/\s+/g, "_");
      return actionMap[key] ?? `Investigate root cause for "${p.type}" defects (${p.count} occurrences, $${p.cost})`;
    });

    return {
      total_scrap_cost,
      scrap_rate_pct,
      pareto_by_defect: paretoEntries,
      trend,
      monthly_data,
      top_actions,
    };
  }

  // ── Helpers ──

  private normalizeMaterial(material: string): string {
    const m = material.toLowerCase().replace(/[\s\-_]+/g, "_");
    if (m.includes("steel") || m.includes("1045") || m.includes("4140") || m.includes("aisi")) return "steel";
    if (m.includes("stainless") || m.includes("304") || m.includes("316")) return "stainless";
    if (m.includes("aluminum") || m.includes("aluminium") || m.includes("6061") || m.includes("7075")) return "aluminum";
    if (m.includes("cast_iron") || m.includes("iron") || m.includes("ductile")) return "cast_iron";
    if (m.includes("titanium") || m.includes("ti6al") || m.includes("ti-6")) return "titanium";
    if (m.includes("inconel") || m.includes("nickel") || m.includes("718")) return "inconel";
    if (m.includes("copper")) return "copper";
    if (m.includes("brass")) return "brass";
    return "steel"; // fallback
  }
}

// Singleton
export const advancedReportRendererEngine = new AdvancedReportRendererEngine();
