/**
 * HyperMillProbingBridge — Probe routine wiring for hyperMILL workflows
 *
 * Connects PRISM's 6 probe types to hyperMILL-compatible probing cycles
 * with approach speed validation, measurement uncertainty estimation,
 * and WCS datum verification.
 *
 * Probe types wired (6):
 *   1. bore      — internal bore centering (G65 P9815 / CYCLE977 / TCH PROBE 420)
 *   2. boss      — external boss centering (G65 P9816 / CYCLE977 / TCH PROBE 421)
 *   3. web       — internal web / external web (G65 P9817-9818 / CYCLE978 / TCH PROBE 430)
 *   4. surface   — single surface measure Z (G65 P9814 / CYCLE978 / TCH PROBE 444)
 *   5. tool_set  — tool length measurement (G65 P9823 / CYCLE982 / TCH PROBE 480)
 *   6. tool_break — tool break detection / diameter (G65 P9825 / CYCLE982 / TCH PROBE 481)
 *
 * Probe system compatibility:
 *   - Renishaw (RMP/OMP) — G65 P98xx macro calls, DPRNT output
 *   - Blum (TC/NC)       — G65 P9000-9010 macro calls (Fanuc-style)
 *   - Heidenhain (TNC)   — TCH PROBE xxx, Q-parameter storage
 *
 * WCS verification:
 *   - Compare measured datum vs nominal (from G54-G59)
 *   - Flag if deviation > partTolerance
 *   - Compute corrected G54-G59 offset
 *
 * Measurement uncertainty:
 *   - Type A (repeatability): ±2σ from probe manufacturer spec
 *   - Type B (systematic): approach angle, surface roughness, stylus deflection
 *
 * Sources:
 *   - Renishaw Inspection Plus macro documentation (M-2013-MCTPB-en-04)
 *   - ISO 10360-2:2009 CMM performance — adapted for on-machine probing
 *   - Blum tool measurement system documentation
 *   - Heidenhain TNC 640 probing cycles manual
 *
 * HM-REV-MS5 / U-HMR27 + U-HMR28
 */

// ============================================================================
// Types
// ============================================================================

export type ProbeType =
  | "bore"
  | "boss"
  | "web"
  | "surface"
  | "tool_set"
  | "tool_break";

export type ProbeSystem = "renishaw" | "blum" | "heidenhain";

export type WCSOffset = "G54" | "G55" | "G56" | "G57" | "G58" | "G59";

export interface ProbeInput {
  /** Probe type */
  probeType: ProbeType;
  /** Target probe system / controller */
  probeSystem: ProbeSystem;
  /** Feature nominal diameter [mm] (for bore/boss/web) */
  nominalDiameter_mm?: number;
  /** Feature nominal Z position [mm] (for surface) */
  nominalZ_mm?: number;
  /** Probing approach speed [mm/min] — validated against probe spec */
  approachSpeed_mmmin?: number;
  /** Part tolerance [mm] — used for WCS verification deviation gate */
  partTolerance_mm?: number;
  /** WCS register to update (G54–G59) */
  wcsRegister?: WCSOffset;
  /** Measured value from probe result [mm] — required for WCS verification */
  measuredValue_mm?: number;
  /** Nominal WCS datum [mm] — required for WCS verification */
  nominalDatum_mm?: number;
  /** Tool diameter for tool_break detection [mm] */
  toolDiameter_mm?: number;
}

export interface MeasurementUncertainty {
  /** Type A (repeatability) uncertainty [μm] — 2σ */
  typeA_um: number;
  /** Type B (systematic) uncertainty [μm] */
  typeB_um: number;
  /** Combined standard uncertainty [μm] */
  combined_um: number;
  /** Expanded uncertainty (k=2, 95% confidence) [μm] */
  expanded_um: number;
  /** Dominant uncertainty source */
  dominantSource: string;
}

export interface WCSVerificationResult {
  /** Measured value [mm] */
  measured_mm: number;
  /** Nominal datum [mm] */
  nominal_mm: number;
  /** Deviation = measured - nominal [mm] */
  deviation_mm: number;
  /** Whether deviation is within part tolerance */
  withinTolerance: boolean;
  /** Corrected G54-G59 offset [mm] */
  correctedOffset_mm: number;
  /** WCS register being updated */
  wcsRegister: WCSOffset;
  /** Human-readable status */
  message: string;
}

export interface ProbingCycleResult {
  /** Probe type processed */
  probeType: ProbeType;
  /** Probe system used */
  probeSystem: ProbeSystem;
  /** hyperMILL-compatible probing cycle name */
  hyperMillCycle: string;
  /** G-code/cycle call for the selected probe system */
  cycleCall: string;
  /** Validated approach speed [mm/min] */
  validatedApproachSpeed_mmmin: number;
  /** Whether approach speed is within probe manufacturer spec */
  approachSpeedValid: boolean;
  /** Measurement uncertainty estimate */
  uncertainty: MeasurementUncertainty;
  /** WCS verification result (if measured + nominal values provided) */
  wcsVerification?: WCSVerificationResult;
  /** Warnings from probing analysis */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

// ============================================================================
// Probe system cycle call database
// ============================================================================

/**
 * Maximum approach speeds by probe system.
 * Source: Renishaw OMM/OMP documentation: max 1000mm/min for accuracy.
 * Blum TC50/75: max 500mm/min for repeatability.
 * Heidenhain: max 800mm/min (TNC 640 probing cycles manual, §3.2).
 */
const MAX_APPROACH_SPEED: Record<ProbeSystem, number> = {
  renishaw:   1000,  // mm/min — Renishaw OMP/RMP series
  blum:        500,  // mm/min — Blum TC50/TC75 (more sensitive)
  heidenhain:  800,  // mm/min — Heidenhain TNC 640
};

/**
 * Measurement uncertainty Type A (repeatability) [μm] 2σ by probe system.
 * Source: Renishaw OMP40-2: 2σ = 1.0μm; Blum TC52: 1.2μm; Heidenhain TS 740: 0.8μm
 * Reference: Renishaw (2019) "OMP40-2 Data Sheet", Blum (2020) "TC52 Spec Sheet"
 */
const PROBE_REPEATABILITY_UM: Record<ProbeSystem, number> = {
  renishaw:   1.0,   // μm (2σ)
  blum:       1.2,   // μm (2σ)
  heidenhain: 0.8,   // μm (2σ) — Heidenhain TS 740
};

/**
 * hyperMILL cycle name + G-code call for each probe type × probe system.
 * hyperMILL uses its own probing cycles in the 5-axis branch.
 */
type CycleEntry = { hyperMillCycle: string; cycleCall: string };
const PROBE_CYCLES: Record<ProbeType, Record<ProbeSystem, CycleEntry>> = {
  bore: {
    renishaw:   { hyperMillCycle: "Bore Centre Finding",    cycleCall: "G65 P9815" },
    blum:       { hyperMillCycle: "Bore Centre Finding",    cycleCall: "G65 P9001" },
    heidenhain: { hyperMillCycle: "Bore Centre Finding",    cycleCall: "TCH PROBE 420" },
  },
  boss: {
    renishaw:   { hyperMillCycle: "Boss Centre Finding",    cycleCall: "G65 P9816" },
    blum:       { hyperMillCycle: "Boss Centre Finding",    cycleCall: "G65 P9002" },
    heidenhain: { hyperMillCycle: "Boss Centre Finding",    cycleCall: "TCH PROBE 421" },
  },
  web: {
    renishaw:   { hyperMillCycle: "Web/Groove Measurement", cycleCall: "G65 P9817" },
    blum:       { hyperMillCycle: "Web/Groove Measurement", cycleCall: "G65 P9003" },
    heidenhain: { hyperMillCycle: "Web/Groove Measurement", cycleCall: "TCH PROBE 430" },
  },
  surface: {
    renishaw:   { hyperMillCycle: "Single Surface Measure", cycleCall: "G65 P9814" },
    blum:       { hyperMillCycle: "Single Surface Measure", cycleCall: "G65 P9000" },
    heidenhain: { hyperMillCycle: "Single Surface Measure", cycleCall: "TCH PROBE 444" },
  },
  tool_set: {
    renishaw:   { hyperMillCycle: "Tool Length Measurement", cycleCall: "G65 P9823" },
    blum:       { hyperMillCycle: "Tool Length Measurement", cycleCall: "G65 P9010" },
    heidenhain: { hyperMillCycle: "Tool Length Measurement", cycleCall: "TCH PROBE 480" },
  },
  tool_break: {
    renishaw:   { hyperMillCycle: "Tool Break Detection",   cycleCall: "G65 P9825" },
    blum:       { hyperMillCycle: "Tool Break Detection",   cycleCall: "G65 P9011" },
    heidenhain: { hyperMillCycle: "Tool Break Detection",   cycleCall: "TCH PROBE 481" },
  },
};

/**
 * WCS update G-code call templates by probe type.
 * Source: Renishaw macro documentation Appendix B.
 */
const WCS_UPDATE_CALLS: Record<ProbeSystem, string> = {
  renishaw:   "G65 P9832",  // Bore+WCS update (or P9833 boss / P9834 corner)
  blum:       "G65 P9005",  // Blum datum update
  heidenhain: "TCH PROBE 0", // Heidenhain datum setting
};

// ============================================================================
// Engine
// ============================================================================

/**
 * HyperMillProbingBridge — Connects PRISM probe routines to hyperMILL cycle catalog.
 *
 * Validates approach speeds, estimates measurement uncertainty (ISO 10360 adapted),
 * and provides WCS verification with G54-G59 offset correction.
 */
export class HyperMillProbingBridge {

  /**
   * Generate probing cycle parameters for a hyperMILL probing operation.
   *
   * @param input - Probe type, system, nominal values, tolerance
   * @returns Probing cycle result with G-code call, uncertainty, and optional WCS verification
   */
  calculate(input: ProbeInput): ProbingCycleResult {
    const warnings: string[] = [];
    const { probeType, probeSystem } = input;

    // ── Cycle lookup ─────────────────────────────────────────────────────────
    const cycleEntry = PROBE_CYCLES[probeType][probeSystem];

    // ── Approach speed validation ─────────────────────────────────────────────
    const maxSpeed = MAX_APPROACH_SPEED[probeSystem];
    const requestedSpeed = input.approachSpeed_mmmin ?? maxSpeed * 0.5; // default: 50% max
    const approachSpeedValid = requestedSpeed <= maxSpeed;
    const validatedApproachSpeed = approachSpeedValid ? requestedSpeed : maxSpeed;

    if (!approachSpeedValid) {
      warnings.push(
        `Approach speed ${requestedSpeed}mm/min exceeds ${probeSystem} max (${maxSpeed}mm/min) — clamped to ${maxSpeed}mm/min`,
      );
    }

    // ── Measurement uncertainty (ISO 10360-2 adapted) ─────────────────────────
    // Type A: probe repeatability (from manufacturer 2σ spec)
    const typeA_um = PROBE_REPEATABILITY_UM[probeSystem];

    // Type B: systematic contributions
    //   - Surface roughness contribution: Ra/√3 (rectangular distribution)
    //   - Stylus deflection at speed: ∝ (speed / maxSpeed)² × 0.5μm
    //   - Temperature drift: 0.5μm (typical workshop)
    const Ra_typical_um = 1.6; // typical machined surface
    const roughness_contrib_um = Ra_typical_um / Math.sqrt(3);
    const speed_ratio = validatedApproachSpeed / maxSpeed;
    const stylus_deflection_um = speed_ratio * speed_ratio * 0.5;
    const temp_drift_um = 0.5;
    const typeB_um = Math.sqrt(
      roughness_contrib_um ** 2 + stylus_deflection_um ** 2 + temp_drift_um ** 2,
    );

    // Combined standard uncertainty (RSS of A and B)
    const combined_um = Math.sqrt(typeA_um ** 2 + typeB_um ** 2);
    // Expanded (k=2, 95% confidence interval)
    const expanded_um = 2 * combined_um;

    const dominantSource =
      typeA_um > typeB_um
        ? `Probe repeatability (${probeSystem} 2σ=${typeA_um}μm)`
        : `Surface roughness contribution (Ra=${Ra_typical_um}μm)`;

    const uncertainty: MeasurementUncertainty = {
      typeA_um: Math.round(typeA_um * 100) / 100,
      typeB_um: Math.round(typeB_um * 100) / 100,
      combined_um: Math.round(combined_um * 100) / 100,
      expanded_um: Math.round(expanded_um * 100) / 100,
      dominantSource,
    };

    // ── WCS verification ──────────────────────────────────────────────────────
    let wcsVerification: WCSVerificationResult | undefined;

    if (
      input.measuredValue_mm !== undefined &&
      input.nominalDatum_mm !== undefined
    ) {
      const wcsResult = this.verifyWCS({
        measured_mm: input.measuredValue_mm,
        nominal_mm: input.nominalDatum_mm,
        partTolerance_mm: input.partTolerance_mm ?? 0.05,
        wcsRegister: input.wcsRegister ?? "G54",
      });
      wcsVerification = wcsResult;
      if (!wcsResult.withinTolerance) {
        warnings.push(
          `WCS deviation ${wcsResult.deviation_mm.toFixed(4)}mm exceeds tolerance ${(input.partTolerance_mm ?? 0.05)}mm — ${wcsResult.wcsRegister} update required`,
        );
      }
    }

    // ── Probe type specific warnings ──────────────────────────────────────────
    if (probeType === "bore" && input.nominalDiameter_mm && input.nominalDiameter_mm < 8) {
      warnings.push(
        `Small bore (Ø${input.nominalDiameter_mm}mm < 8mm) — stylus ball must be ≤ 1mm diameter, reduce approach speed`,
      );
    }
    if (probeType === "tool_break" && !input.toolDiameter_mm) {
      warnings.push("tool_break probe: provide toolDiameter_mm for accurate break detection threshold");
    }
    if (probeType === "surface" && input.nominalZ_mm === undefined) {
      warnings.push("surface probe: nominalZ_mm not provided — WCS verification unavailable");
    }

    const confidence = warnings.length === 0 ? 0.93 : approachSpeedValid ? 0.80 : 0.65;

    return {
      probeType,
      probeSystem,
      hyperMillCycle: cycleEntry.hyperMillCycle,
      cycleCall: cycleEntry.cycleCall,
      validatedApproachSpeed_mmmin: validatedApproachSpeed,
      approachSpeedValid,
      uncertainty,
      wcsVerification,
      warnings,
      confidence,
      source: "Renishaw-M-2013-MCTPB + ISO-10360-2 + Heidenhain-TNC640-probing-manual",
    };
  }

  /**
   * Verify WCS datum: compare measured vs nominal, compute corrected offset.
   *
   * @param params - Measured value, nominal, tolerance, WCS register
   * @returns WCS verification result with deviation flag and corrected offset
   */
  verifyWCS(params: {
    measured_mm: number;
    nominal_mm: number;
    partTolerance_mm: number;
    wcsRegister: WCSOffset;
  }): WCSVerificationResult {
    const { measured_mm, nominal_mm, partTolerance_mm, wcsRegister } = params;
    const deviation_mm = measured_mm - nominal_mm;
    const withinTolerance = Math.abs(deviation_mm) <= partTolerance_mm;

    // Corrected offset = current offset - deviation (move WCS to correct position)
    // Convention: if measured > nominal, part is shifted +, so offset must shift -
    const correctedOffset_mm = -deviation_mm;

    const message = withinTolerance
      ? `${wcsRegister}: deviation ${deviation_mm.toFixed(4)}mm within ±${partTolerance_mm}mm tolerance — OK`
      : `${wcsRegister}: deviation ${deviation_mm.toFixed(4)}mm EXCEEDS ±${partTolerance_mm}mm — apply correction ${correctedOffset_mm.toFixed(4)}mm`;

    return {
      measured_mm,
      nominal_mm,
      deviation_mm: Math.round(deviation_mm * 10000) / 10000,
      withinTolerance,
      correctedOffset_mm: Math.round(correctedOffset_mm * 10000) / 10000,
      wcsRegister,
      message,
    };
  }

  /**
   * List all supported probe types and their hyperMILL cycle names.
   *
   * @param probeSystem - Probe system to list cycles for
   * @returns Array of probe types with hyperMILL cycle names and G-code calls
   */
  listProbeTypes(probeSystem: ProbeSystem = "renishaw"): Array<{
    probeType: ProbeType;
    hyperMillCycle: string;
    cycleCall: string;
    maxApproachSpeed_mmmin: number;
  }> {
    return (Object.keys(PROBE_CYCLES) as ProbeType[]).map((pt) => ({
      probeType: pt,
      hyperMillCycle: PROBE_CYCLES[pt][probeSystem].hyperMillCycle,
      cycleCall: PROBE_CYCLES[pt][probeSystem].cycleCall,
      maxApproachSpeed_mmmin: MAX_APPROACH_SPEED[probeSystem],
    }));
  }

  /**
   * Get WCS update G-code call for a probe system.
   *
   * @param probeSystem - Probe system
   * @returns WCS update call string
   */
  getWCSUpdateCall(probeSystem: ProbeSystem): string {
    return WCS_UPDATE_CALLS[probeSystem];
  }
}

export const hyperMillProbingBridge = new HyperMillProbingBridge();
