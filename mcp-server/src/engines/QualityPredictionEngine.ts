/**
 * QualityPredictionEngine — Manufacturing Intelligence Layer
 *
 * Predicts part quality metrics (Cpk, surface roughness, dimensional accuracy)
 * from process parameters using statistical process control models.
 *
 * Actions: quality_predict, quality_cpk, quality_surface_roughness, quality_risk
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QualityInput {
  operation_type: string;
  material_iso_group: string;
  tool_diameter_mm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  depth_of_cut_mm: number;
  coolant: boolean;
  machine_accuracy_mm: number;
  tolerance_mm: number;
  surface_finish_target_Ra?: number;
  tool_condition?: "new" | "normal" | "worn";
}

/** Quality Prediction configuration/data structure.
 */
export interface QualityPrediction {
  predicted_Ra_um: number;
  predicted_dimensional_error_mm: number;
  predicted_Cpk: number;
  within_tolerance: boolean;
  surface_finish_ok: boolean;
  risk_level: "low" | "moderate" | "high" | "critical";
  confidence_pct: number;
  factors: QualityFactor[];
  recommendations: string[];
}

/** Quality Factor configuration/data structure.
 */
export interface QualityFactor {
  name: string;
  impact: "positive" | "neutral" | "negative";
  value: number;
  description: string;
}

/** Cpk Result configuration/data structure.
 */
export interface CpkResult {
  cpk: number;
  cp: number;
  sigma: number;
  mean_shift: number;
  ppm_defective: number;
  capable: boolean;
  interpretation: string;
}

/** Surface Roughness Result configuration/data structure.
 */
export interface SurfaceRoughnessResult {
  Ra_um: number;
  Rz_um: number;
  model: string;
  factors: { name: string; contribution_pct: number }[];
}

/** Quality Risk Assessment configuration/data structure.
 */
export interface QualityRiskAssessment {
  overall_risk: "low" | "moderate" | "high" | "critical";
  risk_score: number;               // 0–100
  risks: { category: string; probability: number; severity: string; mitigation: string }[];
}

// ============================================================================
// SURFACE ROUGHNESS MODELS
// ============================================================================

/**
 * Theoretical Ra for single-point turning: Ra = f² / (32 × r)
 * where f = feed/rev (mm), r = tool nose radius (mm)
 *
 * For milling: Ra = f² / (32 × R) where R = cutter radius
 * Adjusted by material factor, tool wear, and BUE tendency
 */
function predictRa(
  feedPerRev_mm: number,
  toolRadius_mm: number,
  materialIso: string,
  toolCondition: string,
  coolant: boolean
): number {
  // Base theoretical Ra
  let Ra = (feedPerRev_mm * feedPerRev_mm * 1000) / (32 * Math.max(toolRadius_mm, 0.1));

  // Material factor
  const matFactor: Record<string, number> = { P: 1.0, M: 1.3, K: 0.8, N: 0.7, S: 1.5, H: 1.2 };
  Ra *= matFactor[materialIso] || 1.0;

  // Tool wear factor
  if (toolCondition === "worn") Ra *= 2.0;
  else if (toolCondition === "normal") Ra *= 1.3;

  // Coolant improvement
  if (coolant) Ra *= 0.85;

  // Built-up edge for low speed on steel
  if (materialIso === "P" && feedPerRev_mm > 0.2) Ra *= 1.15;

  return Math.max(0.1, Math.round(Ra * 100) / 100);
}

/**
 * Rz ≈ 4 × Ra (typical ratio for machined surfaces)
 */
function predictRz(Ra: number): number {
  return Math.round(Ra * 4 * 100) / 100;
}

// ============================================================================
// DIMENSIONAL ACCURACY MODEL
// ============================================================================

function predictDimensionalError(
  machineAccuracy_mm: number,
  toolDia_mm: number,
  depthOfCut_mm: number,
  materialIso: string,
  toolCondition: string
): number {
  // Base: machine positioning error
  let error = machineAccuracy_mm;

  // Tool deflection contribution (simplified)
  const E_tool = 600000; // MPa carbide
  const I = (Math.PI * Math.pow(toolDia_mm, 4)) / 64;
  const overhang = toolDia_mm * 3; // typical 3:1
  const force = depthOfCut_mm * 500; // rough N estimate
  const deflection = (force * Math.pow(overhang, 3)) / (3 * E_tool * I);
  error += deflection;

  // Thermal growth (depends on material heat generation)
  const thermalFactor: Record<string, number> = { P: 0.003, M: 0.005, K: 0.002, N: 0.001, S: 0.008, H: 0.006 };
  error += thermalFactor[materialIso] || 0.003;

  // Tool wear contribution
  if (toolCondition === "worn") error += 0.01;
  else if (toolCondition === "normal") error += 0.003;

  return Math.round(error * 10000) / 10000;
}

// ============================================================================
// Cpk CALCULATION
// ============================================================================

function calculateCpk(tolerance_mm: number, processError_mm: number, machineAccuracy_mm: number): CpkResult {
  const sigma = Math.max(machineAccuracy_mm / 3, 0.001); // 3-sigma = machine accuracy
  const USL = tolerance_mm / 2;
  const LSL = -tolerance_mm / 2;
  const mean = processError_mm * 0.3; // typical mean shift = 30% of total error

  const Cp = (USL - LSL) / (6 * sigma);
  const Cpu = (USL - mean) / (3 * sigma);
  const Cpl = (mean - LSL) / (3 * sigma);
  const Cpk = Math.min(Cpu, Cpl);

  // PPM defective estimate (normal distribution approximation)
  const z = Cpk * 3;
  const ppm = z > 3 ? 3.4 : z > 2 ? 2700 : z > 1 ? 66807 : 308537;

  let interpretation: string;
  if (Cpk >= 2.0) interpretation = "Excellent — Six Sigma level";
  else if (Cpk >= 1.67) interpretation = "Very good — suitable for critical dimensions";
  else if (Cpk >= 1.33) interpretation = "Good — standard production capable";
  else if (Cpk >= 1.0) interpretation = "Marginal — process improvement recommended";
  else interpretation = "Incapable — process cannot meet specification";

  return {
    cpk: Math.round(Cpk * 100) / 100,
    cp: Math.round(Cp * 100) / 100,
    sigma: Math.round(sigma * 10000) / 10000,
    mean_shift: Math.round(mean * 10000) / 10000,
    ppm_defective: Math.round(ppm),
    capable: Cpk >= 1.33,
    interpretation,
  };
}

// ============================================================================
// STATISTICAL-PROCESS-MONITORING OVERLAY (DEA-MS0 P05)
// ============================================================================

/** Optional statistical-monitoring overlay for predictQualityWithStatisticalMonitoring.
 *  Each sub-block is independently optional; an absent block is simply not consulted.
 *  - combined_spc: univariate Shewhart+CUSUM+EWMA scheme over a single characteristic
 *  - hotelling_t2: multivariate T-squared over an n x p observation matrix
 *  - sprt: Wald Sequential Probability Ratio Test for a mean shift h0 -> h1
 */
export interface SPMOverlayInput {
  combined_spc?: { observations: number[]; target: number; sigma: number };
  hotelling_t2?: { data: number[][]; alpha?: number };
  sprt?: { observations: number[]; h0_mean: number; h1_mean: number; sigma: number };
}

/** Combined-SPC sub-result surfaced in the overlay (signal counts + first-detection). */
export interface CombinedSPCSubResult {
  detection_chart: "none" | "shewhart" | "cusum" | "ewma";
  shewhart_signals_count: number;
  cusum_signals_count: number;
  ewma_signals_count: number;
  first_signal_index: number;
  arl_estimate: number;
}

/** Hotelling T-squared sub-result surfaced in the overlay. */
export interface HotellingT2SubResult {
  n_samples: number;
  n_characteristics: number;
  ucl: number;
  top_contributor_variable: number;
  out_of_control_count: number;
}

/** Wald SPRT sub-result surfaced in the overlay. */
export interface SPRTSubResult {
  decision: "accept_H0" | "accept_H1" | "continue";
  samples_used: number;
  log_likelihood_ratio: number;
  asn: number;
}

/** The statistical-monitoring overlay attached to a quality prediction.
 *  spm_source:
 *   - "no_data"        no overlay argument supplied at all
 *   - "not_applicable" overlay supplied but no sub-block could be computed (all empty/invalid)
 *   - "consulted"      at least one sub-block was computed successfully
 *  statistical_warnings holds SIGNAL-detection messages (drift / H1-accept), distinct from
 *  the top-level result.warnings which holds input-VALIDATION messages. */
export interface SPMOverlay {
  spm_source: "no_data" | "not_applicable" | "consulted";
  combined_spc?: CombinedSPCSubResult;
  hotelling_t2?: HotellingT2SubResult;
  sprt?: SPRTSubResult;
  statistical_warnings: string[];
}

/** QualityPrediction augmented with the SPM overlay + input-validation warnings. */
export interface QualityPredictionWithSPM extends QualityPrediction {
  spm_overlay: SPMOverlay;
  warnings: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Quality Prediction Engine engine/manager.
 */
export class QualityPredictionEngine {
  predict(input: QualityInput): QualityPrediction {
    const feedPerRev = input.spindle_rpm > 0 ? input.feed_rate_mmmin / input.spindle_rpm : 0;
    const toolRadius = input.tool_diameter_mm / 2;
    const condition = input.tool_condition || "normal";

    const Ra = predictRa(feedPerRev, toolRadius, input.material_iso_group, condition, input.coolant);
    const dimError = predictDimensionalError(input.machine_accuracy_mm, input.tool_diameter_mm, input.depth_of_cut_mm, input.material_iso_group, condition);
    const cpkResult = calculateCpk(input.tolerance_mm, dimError, input.machine_accuracy_mm);

    const withinTolerance = dimError <= input.tolerance_mm / 2;
    const surfaceOk = !input.surface_finish_target_Ra || Ra <= input.surface_finish_target_Ra;

    let riskLevel: "low" | "moderate" | "high" | "critical";
    if (cpkResult.cpk >= 1.67 && surfaceOk) riskLevel = "low";
    else if (cpkResult.cpk >= 1.33 && withinTolerance) riskLevel = "moderate";
    else if (cpkResult.cpk >= 1.0) riskLevel = "high";
    else riskLevel = "critical";

    const factors: QualityFactor[] = [
      { name: "Machine Accuracy", impact: input.machine_accuracy_mm < 0.005 ? "positive" : "neutral", value: input.machine_accuracy_mm, description: `${input.machine_accuracy_mm}mm positioning accuracy` },
      { name: "Feed Rate", impact: feedPerRev < 0.1 ? "positive" : feedPerRev > 0.2 ? "negative" : "neutral", value: feedPerRev, description: `${feedPerRev.toFixed(3)} mm/rev` },
      { name: "Tool Condition", impact: condition === "new" ? "positive" : condition === "worn" ? "negative" : "neutral", value: condition === "new" ? 1 : condition === "worn" ? 3 : 2, description: condition },
      { name: "Coolant", impact: input.coolant ? "positive" : "negative", value: input.coolant ? 1 : 0, description: input.coolant ? "Active" : "Dry cutting" },
    ];

    const recommendations: string[] = [];
    if (Ra > (input.surface_finish_target_Ra || 1.6)) recommendations.push("Reduce feed rate for better surface finish");
    if (!withinTolerance) recommendations.push("Use higher-accuracy machine or add finishing pass");
    if (condition === "worn") recommendations.push("Replace tool — wear affecting quality");
    if (!input.coolant && input.material_iso_group === "S") recommendations.push("Enable high-pressure coolant for titanium/superalloy");

    return {
      predicted_Ra_um: Ra,
      predicted_dimensional_error_mm: dimError,
      predicted_Cpk: cpkResult.cpk,
      within_tolerance: withinTolerance,
      surface_finish_ok: surfaceOk,
      risk_level: riskLevel,
      confidence_pct: condition === "new" ? 90 : condition === "worn" ? 70 : 80,
      factors, recommendations,
    };
  }

  /** Cpk.
   * @param tolerance_mm - tolerance_mm
   * @param machineAccuracy_mm - machine accuracy_mm
   * @param processError_mm - process error_mm
   * @returns cpk result
   */
  cpk(tolerance_mm: number, machineAccuracy_mm: number, processError_mm: number): CpkResult {
    return calculateCpk(tolerance_mm, processError_mm, machineAccuracy_mm);
  }

  /** Surface Roughness.
   * @param feedPerRev_mm - feed per rev_mm
   * @param toolRadius_mm - tool radius_mm
   * @param materialIso - material iso
   * @param coolant - coolant
   * @returns surface roughness result
   */
  surfaceRoughness(feedPerRev_mm: number, toolRadius_mm: number, materialIso: string, coolant: boolean): SurfaceRoughnessResult {
    const Ra = predictRa(feedPerRev_mm, toolRadius_mm, materialIso, "normal", coolant);
    const Rz = predictRz(Ra);

    return {
      Ra_um: Ra, Rz_um: Rz, model: "theoretical + empirical correction",
      factors: [
        { name: "Feed rate", contribution_pct: 60 },
        { name: "Tool geometry", contribution_pct: 20 },
        { name: "Material", contribution_pct: 10 },
        { name: "Coolant/tool condition", contribution_pct: 10 },
      ],
    };
  }

  /** Risk Assessment.
   * @param input - input data
   * @returns quality risk assessment
   */
  riskAssessment(input: QualityInput): QualityRiskAssessment {
    const prediction = this.predict(input);
    const risks: QualityRiskAssessment["risks"] = [];

    /** If.
     * @param prediction.predicted_Cpk - prediction.predicted_ cpk
     * @returns void
     */
    if (prediction.predicted_Cpk < 1.33) {
      risks.push({ category: "Process Capability", probability: 0.7, severity: "high", mitigation: "Add finishing pass or tighten process controls" });
    }
    /** If.
     * @param !prediction.surface_finish_ok - !prediction.surface_finish_ok
     * @returns void
     */
    if (!prediction.surface_finish_ok) {
      risks.push({ category: "Surface Finish", probability: 0.6, severity: "moderate", mitigation: "Reduce feed rate or use finer tool" });
    }
    /** If.
     * @param input.tool_condition - input.tool_condition
     * @returns void
     */
    if (input.tool_condition === "worn") {
      risks.push({ category: "Tool Wear", probability: 0.8, severity: "high", mitigation: "Replace tool before production run" });
    }
    /** If.
     * @param input.depth_of_cut_mm - input.depth_of_cut_mm
     * @returns void
     */
    if (input.depth_of_cut_mm > input.tool_diameter_mm * 0.5) {
      risks.push({ category: "Chatter", probability: 0.5, severity: "moderate", mitigation: "Reduce depth of cut or increase rigidity" });
    }
    if (!input.coolant && (input.material_iso_group === "S" || input.material_iso_group === "M")) {
      risks.push({ category: "Thermal Damage", probability: 0.6, severity: "high", mitigation: "Enable flood coolant" });
    }

    const riskScore = risks.reduce((s, r) => s + r.probability * (r.severity === "high" ? 30 : r.severity === "moderate" ? 15 : 5), 0);
    const overall = riskScore > 60 ? "critical" : riskScore > 40 ? "high" : riskScore > 20 ? "moderate" : "low";

    return { overall_risk: overall, risk_score: Math.min(100, Math.round(riskScore)), risks };
  }

  /**
   * Quality prediction with an optional statistical-process-monitoring overlay.
   *
   * Returns the full base predict() result, plus an `spm_overlay` that lazy-chains
   * StatisticalProcessMonitoringEngine (Hotelling T2 / combined Shewhart+CUSUM+EWMA /
   * Wald SPRT) WITHOUT coupling either engine at compile time. Each sub-block is
   * validated independently; an empty/invalid block is skipped with a named warning
   * (in result.warnings) rather than throwing, so the base prediction is never lost.
   *
   * spm_source: "no_data" (no overlay arg) | "not_applicable" (overlay supplied but no
   * sub-block computed) | "consulted" (>=1 sub-block computed).
   *
   * @param input  base quality-prediction inputs
   * @param spmData optional statistical-monitoring overlay request
   * @returns base prediction + spm_overlay + input-validation warnings
   */
  async predictQualityWithStatisticalMonitoring(
    input: QualityInput,
    spmData?: SPMOverlayInput,
  ): Promise<QualityPredictionWithSPM> {
    const base = this.predict(input);
    const warnings: string[] = [];            // input-VALIDATION messages
    const statistical_warnings: string[] = []; // SIGNAL-detection messages

    // No overlay argument at all -> nothing to monitor.
    if (spmData === undefined || spmData === null) {
      return {
        ...base,
        spm_overlay: { spm_source: "no_data", statistical_warnings },
        warnings,
      };
    }

    const overlay: SPMOverlay = { spm_source: "not_applicable", statistical_warnings };
    let consulted = 0;

    // Lazy-import keeps the two engines decoupled at compile time (R5/R8).
    const { statisticalProcessMonitoringEngine: spm } = await import(
      "./StatisticalProcessMonitoringEngine.js"
    );

    // ── combined_spc ─────────────────────────────────────────────────────
    if (spmData.combined_spc !== undefined) {
      const { observations, target, sigma } = spmData.combined_spc;
      if (!Array.isArray(observations) || observations.length === 0) {
        warnings.push("combined_spc: observations array empty -- univariate SPC needs >=1 observation");
      } else if (!(typeof sigma === "number" && sigma > 0 && Number.isFinite(sigma))) {
        warnings.push("combined_spc: sigma must be a positive finite number");
      } else {
        const cs = spm.combinedSPCScheme({ data: observations, target, sigma });
        overlay.combined_spc = {
          detection_chart: cs.detection_chart as CombinedSPCSubResult["detection_chart"],
          shewhart_signals_count: cs.shewhart_signals.length,
          cusum_signals_count: cs.cusum_signals.length,
          ewma_signals_count: cs.ewma_signals.length,
          first_signal_index: cs.first_signal_index,
          arl_estimate: cs.arl_estimate,
        };
        consulted++;
        if (cs.first_signal_index >= 0) {
          statistical_warnings.push(
            `Combined SPC: out-of-control signal at index ${cs.first_signal_index} (${cs.detection_chart} chart)`,
          );
        }
      }
    }

    // ── hotelling_t2 ─────────────────────────────────────────────────────
    if (spmData.hotelling_t2 !== undefined) {
      const { data, alpha } = spmData.hotelling_t2;
      if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
        warnings.push("hotelling_t2: data matrix needs a non-empty array of observation vectors");
      } else {
        const n = data.length;
        const p = data[0].length;
        if (n <= p) {
          warnings.push(
            `hotelling_t2: covariance estimation needs n > p (got n=${n} observations, p=${p} characteristics)`,
          );
        } else {
          const ht = spm.hotellingT2({ data, alpha });
          let topVar = 0;
          let topContribution = -Infinity;
          for (const d of ht.decomposition) {
            if (d.contribution > topContribution) {
              topContribution = d.contribution;
              topVar = d.variable;
            }
          }
          overlay.hotelling_t2 = {
            n_samples: n,
            n_characteristics: p,
            ucl: ht.ucl,
            top_contributor_variable: topVar,
            out_of_control_count: ht.out_of_control.length,
          };
          consulted++;
          if (ht.out_of_control.length > 0) {
            statistical_warnings.push(
              `Hotelling T2: ${ht.out_of_control.length} multivariate out-of-control sample(s); top contributor variable ${topVar}`,
            );
          }
        }
      }
    }

    // ── sprt ─────────────────────────────────────────────────────────────
    if (spmData.sprt !== undefined) {
      const { observations, h0_mean, h1_mean, sigma } = spmData.sprt;
      if (!Array.isArray(observations) || observations.length === 0) {
        warnings.push("sprt: observations array empty -- sequential test needs >=1 observation");
      } else if (!(typeof sigma === "number" && sigma > 0 && Number.isFinite(sigma))) {
        warnings.push("sprt: sigma must be a positive finite number");
      } else if (!Number.isFinite(h0_mean) || !Number.isFinite(h1_mean)) {
        warnings.push("sprt: h0_mean and h1_mean must be finite numbers");
      } else {
        const sp = spm.sprt({ observations, h0_mean, h1_mean, sigma });
        overlay.sprt = {
          decision: sp.decision,
          samples_used: sp.samples_used,
          log_likelihood_ratio: sp.log_likelihood_ratio,
          asn: sp.asn,
        };
        consulted++;
        if (sp.decision === "accept_H1") {
          statistical_warnings.push(
            `SPRT: H1 accepted after ${sp.samples_used} sample(s) -- process mean shifted toward ${h1_mean}`,
          );
        }
      }
    }

    overlay.spm_source = consulted > 0 ? "consulted" : "not_applicable";
    return { ...base, spm_overlay: overlay, warnings };
  }
}

/** Quality Prediction Engine constant.
 */
export const qualityPredictionEngine = new QualityPredictionEngine();
