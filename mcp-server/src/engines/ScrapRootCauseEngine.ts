/**
 * PRISM MCP Server — Scrap Root Cause Engine
 *
 * Multi-signal root cause analysis for scrap events. Physics-backed
 * diagnosis (thermal growth, tool deflection, tool wear), pattern
 * classification, and trend analysis across multiple events.
 *
 * @module ScrapRootCauseEngine
 */

import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type DefectType =
  | "oversized"
  | "undersized"
  | "surface_finish"
  | "out_of_round"
  | "taper"
  | "chatter_marks"
  | "tool_marks"
  | "dimensional_drift";

export interface Measurement {
  feature: string;
  nominal: number;
  actual: number;
  tolerance: number;
}

export interface ProcessData {
  spindle_load_pct?: number;
  vibration_rms?: number;
  temperature_delta_C?: number;
  tool_age_min?: number;
  coolant_concentration_pct?: number;
}

export interface ScrapEventInput {
  defect_type: DefectType;
  measurements: Measurement[];
  process_data?: ProcessData;
}

export interface ProbableCause {
  cause: string;
  probability: number;
  evidence: string[];
  corrective_action: string;
}

export interface PhysicsAnalysis {
  thermal_growth_mm?: number;
  tool_deflection_mm?: number;
  tool_wear_mm?: number;
}

export type PatternType = "random" | "systematic" | "progressive" | "intermittent";

export interface ScrapAnalysisResult {
  probable_causes: ProbableCause[];
  physics_analysis: PhysicsAnalysis;
  pattern_type: PatternType;
  recommended_checks: string[];
  tribal_tips?: KnowledgeTip[];
}

export interface ScrapTrendResult {
  trend: "improving" | "stable" | "degrading";
  common_causes: string[];
  systemic_issues: string[];
  estimated_cost_impact_per_month: number;
}

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

/** Thermal growth estimate: δ = α · ΔT · L
 *  α ≈ 12e-6 /°C (steel, ASM Handbook)
 *  L defaults to 300mm — callers should pass workpiece_length_mm in process_data when available */
function estimateThermalGrowth(tempDelta?: number, workpieceLength_mm?: number): number | undefined {
  if (tempDelta === undefined || tempDelta === 0) return undefined;
  const alpha = 12e-6; // /°C for steel
  const L = workpieceLength_mm ?? 300; // mm — 300mm default, actual part length preferred
  return Math.abs(alpha * tempDelta * L);
}

/** Tool deflection estimate: δ = F·L³/(3·E·I), approximate from spindle load */
function estimateToolDeflection(spindleLoadPct?: number): number | undefined {
  if (spindleLoadPct === undefined) return undefined;
  // Approximate: 100% spindle load ≈ 5000N, L=40mm overhang, D=12mm carbide
  const F = (spindleLoadPct / 100) * 5000; // N
  const L = 40; // mm
  const E = 600000; // MPa (carbide)
  const D = 12; // mm
  const I = (Math.PI * Math.pow(D, 4)) / 64;
  return (F * Math.pow(L, 3)) / (3 * E * I);
}

/** Tool wear estimate based on age: flank wear ≈ 0.0005 mm/min initial rate */
function estimateToolWear(toolAgeMin?: number): number | undefined {
  if (toolAgeMin === undefined) return undefined;
  // Taylor-based approximation: VB grows non-linearly
  // Region I (break-in): 0-5 min, high wear
  // Region II (steady): 5-60 min, ~0.003 mm/min
  // Region III (rapid): >60 min, accelerating
  if (toolAgeMin <= 5) {
    return 0.02 + toolAgeMin * 0.004; // 0.02-0.04mm break-in
  } else if (toolAgeMin <= 60) {
    return 0.04 + (toolAgeMin - 5) * 0.003; // 0.04-0.205mm steady
  } else {
    return 0.205 + (toolAgeMin - 60) * 0.008; // accelerating
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ============================================================================
// DEFECT DIAGNOSIS RULES
// ============================================================================

interface DiagnosisRule {
  cause: string;
  check: (input: ScrapEventInput, physics: PhysicsAnalysis, deviations: number[]) => { probability: number; evidence: string[] } | null;
  corrective_action: string;
}

function getDeviations(measurements: Measurement[]): number[] {
  return measurements.map((m) => m.actual - m.nominal);
}

function avgDeviation(deviations: number[]): number {
  if (deviations.length === 0) return 0;
  return deviations.reduce((s, d) => s + d, 0) / deviations.length;
}

function deviationStdDev(deviations: number[]): number {
  if (deviations.length < 2) return 0;
  const mean = avgDeviation(deviations);
  const variance = deviations.reduce((s, d) => s + (d - mean) ** 2, 0) / (deviations.length - 1);
  return Math.sqrt(variance);
}

const DEFECT_RULES: Record<DefectType, DiagnosisRule[]> = {
  oversized: [
    {
      cause: "Thermal expansion of workpiece/spindle",
      check: (input, physics) => {
        if (physics.thermal_growth_mm !== undefined && physics.thermal_growth_mm > 0.005) {
          return { probability: 0.75, evidence: [`Thermal growth estimated at ${round3(physics.thermal_growth_mm)} mm`, `Temperature delta: ${input.process_data?.temperature_delta_C}°C`] };
        }
        if (input.process_data?.temperature_delta_C !== undefined && input.process_data.temperature_delta_C > 5) {
          return { probability: 0.5, evidence: [`Temperature delta ${input.process_data.temperature_delta_C}°C exceeds 5°C threshold`] };
        }
        return null;
      },
      corrective_action: "Allow machine warm-up, implement thermal compensation, or use through-spindle coolant.",
    },
    {
      cause: "Tool wear — undersized tool cutting larger",
      check: (input, physics) => {
        if (physics.tool_wear_mm !== undefined && physics.tool_wear_mm > 0.1) {
          return { probability: 0.7, evidence: [`Estimated tool wear: ${round3(physics.tool_wear_mm)} mm`, `Tool age: ${input.process_data?.tool_age_min} min`] };
        }
        if (input.process_data?.tool_age_min !== undefined && input.process_data.tool_age_min > 45) {
          return { probability: 0.4, evidence: [`Tool age ${input.process_data.tool_age_min} min may indicate significant flank wear`] };
        }
        return null;
      },
      corrective_action: "Replace or re-index insert, verify tool wear with microscope, adjust tool offset.",
    },
    {
      cause: "Tool deflection pushing cut outward",
      check: (input, physics) => {
        if (physics.tool_deflection_mm !== undefined && physics.tool_deflection_mm > 0.02) {
          return { probability: 0.6, evidence: [`Estimated deflection: ${round3(physics.tool_deflection_mm)} mm`] };
        }
        if (input.process_data?.spindle_load_pct !== undefined && input.process_data.spindle_load_pct > 70) {
          return { probability: 0.45, evidence: [`High spindle load (${input.process_data.spindle_load_pct}%) indicates excessive cutting force`] };
        }
        return null;
      },
      corrective_action: "Reduce depth of cut, use shorter tool, increase tool diameter, or add spring pass.",
    },
    {
      cause: "Incorrect tool offset or geometry compensation",
      check: (_input, _physics, deviations) => {
        const avg = avgDeviation(deviations);
        const std = deviationStdDev(deviations);
        if (std < 0.01 && Math.abs(avg) > 0.02) {
          return { probability: 0.65, evidence: [`Consistent offset of ${round3(avg)} mm across features (σ=${round3(std)} mm)`] };
        }
        return null;
      },
      corrective_action: "Verify and correct tool length/diameter offset. Re-measure tool with presetter.",
    },
  ],

  undersized: [
    {
      cause: "Over-aggressive tool offset compensation",
      check: (_input, _physics, deviations) => {
        const avg = avgDeviation(deviations);
        if (avg < -0.02) {
          return { probability: 0.6, evidence: [`Average deviation ${round3(avg)} mm — consistent undersize`] };
        }
        return null;
      },
      corrective_action: "Review tool offset history, reduce wear compensation increment.",
    },
    {
      cause: "Tool deflection springing away from surface",
      check: (input, physics) => {
        if (physics.tool_deflection_mm !== undefined && physics.tool_deflection_mm > 0.015) {
          return { probability: 0.55, evidence: [`Tool deflection ~${round3(physics.tool_deflection_mm)} mm may cause undercut on bore IDs`] };
        }
        return null;
      },
      corrective_action: "Add spring pass, reduce DOC, use stiffer tooling.",
    },
    {
      cause: "Coolant-related thermal contraction",
      check: (input) => {
        if (input.process_data?.coolant_concentration_pct !== undefined && input.process_data.coolant_concentration_pct < 4) {
          return { probability: 0.35, evidence: [`Low coolant concentration (${input.process_data.coolant_concentration_pct}%) — excessive cooling may contract part`] };
        }
        return null;
      },
      corrective_action: "Check coolant concentration with refractometer, adjust to 6-8%.",
    },
  ],

  surface_finish: [
    {
      cause: "Excessive tool wear degrading finish",
      check: (input, physics) => {
        if (physics.tool_wear_mm !== undefined && physics.tool_wear_mm > 0.15) {
          return { probability: 0.8, evidence: [`Tool wear ~${round3(physics.tool_wear_mm)} mm exceeds 0.15 mm Ra threshold`] };
        }
        if (input.process_data?.tool_age_min !== undefined && input.process_data.tool_age_min > 50) {
          return { probability: 0.55, evidence: [`Tool age ${input.process_data.tool_age_min} min — likely significant nose wear`] };
        }
        return null;
      },
      corrective_action: "Replace insert, verify nose radius with comparator.",
    },
    {
      cause: "Vibration / chatter",
      check: (input) => {
        if (input.process_data?.vibration_rms !== undefined && input.process_data.vibration_rms > 2.0) {
          return { probability: 0.75, evidence: [`Vibration RMS ${input.process_data.vibration_rms} g exceeds 2.0 g threshold`] };
        }
        return null;
      },
      corrective_action: "Adjust spindle speed to avoid chatter lobe, reduce DOC, improve workholding rigidity.",
    },
    {
      cause: "Feed rate too high for required finish",
      check: (input) => {
        if (input.process_data?.spindle_load_pct !== undefined && input.process_data.spindle_load_pct > 60) {
          return { probability: 0.4, evidence: ["High spindle load suggests aggressive feed — Ra = f²/(32·r_nose)"] };
        }
        return { probability: 0.3, evidence: ["Feed rate is primary driver of theoretical Ra — verify f vs Ra requirement"] };
      },
      corrective_action: "Reduce feed per revolution — Ra ≈ f²/(32·r_nose), halving feed reduces Ra by 4×.",
    },
    {
      cause: "Coolant delivery issue",
      check: (input) => {
        if (input.process_data?.coolant_concentration_pct !== undefined && input.process_data.coolant_concentration_pct < 5) {
          return { probability: 0.4, evidence: [`Low coolant concentration ${input.process_data.coolant_concentration_pct}% — inadequate lubrication`] };
        }
        return null;
      },
      corrective_action: "Check coolant nozzle aim, concentration, and flow rate. Consider MQL for finishing.",
    },
  ],

  out_of_round: [
    {
      cause: "Workholding distortion — excessive chuck/clamp pressure",
      check: () => ({ probability: 0.6, evidence: ["Out-of-round is frequently caused by non-uniform clamping force"] }),
      corrective_action: "Reduce chuck pressure, use soft jaws bored in-place, or switch to collet.",
    },
    {
      cause: "Spindle bearing wear",
      check: (input) => {
        if (input.process_data?.vibration_rms !== undefined && input.process_data.vibration_rms > 1.5) {
          return { probability: 0.5, evidence: [`Vibration RMS ${input.process_data.vibration_rms} g — possible bearing issue`] };
        }
        return { probability: 0.25, evidence: ["Spindle bearing wear causes repeatable roundness error at 1× RPM"] };
      },
      corrective_action: "Run spindle bearing check, measure roundness at multiple heights, inspect ball-bar results.",
    },
    {
      cause: "Thermal distortion during machining",
      check: (input, physics) => {
        if (physics.thermal_growth_mm !== undefined && physics.thermal_growth_mm > 0.01) {
          return { probability: 0.45, evidence: [`Thermal growth ${round3(physics.thermal_growth_mm!)} mm — non-uniform heating causes oval`] };
        }
        return null;
      },
      corrective_action: "Improve coolant coverage uniformity, allow thermal stabilization between passes.",
    },
  ],

  taper: [
    {
      cause: "Axis alignment error (parallelism)",
      check: (_input, _physics, deviations) => {
        if (deviations.length >= 2) {
          const range = Math.max(...deviations) - Math.min(...deviations);
          if (range > 0.01) {
            return { probability: 0.7, evidence: [`Deviation range ${round3(range)} mm across features suggests axis misalignment`] };
          }
        }
        return { probability: 0.5, evidence: ["Taper is classic symptom of Z-X parallelism error or tailstock offset"] };
      },
      corrective_action: "Check spindle-to-axis parallelism with test bar, verify tailstock alignment.",
    },
    {
      cause: "Tool deflection increasing with depth",
      check: (input, physics) => {
        if (physics.tool_deflection_mm !== undefined && physics.tool_deflection_mm > 0.01) {
          return { probability: 0.5, evidence: [`Tool deflection ${round3(physics.tool_deflection_mm)} mm — increases with Z travel`] };
        }
        return null;
      },
      corrective_action: "Use stiffer boring bar, reduce L/D ratio, add steady rest for long parts.",
    },
    {
      cause: "Thermal growth during long cycle",
      check: (input, physics) => {
        if (physics.thermal_growth_mm !== undefined && physics.thermal_growth_mm > 0.008) {
          return { probability: 0.4, evidence: [`Progressive thermal growth ~${round3(physics.thermal_growth_mm)} mm over cycle`] };
        }
        return null;
      },
      corrective_action: "Implement in-process gauging, thermal compensation, or roughing/cooling/finishing strategy.",
    },
  ],

  chatter_marks: [
    {
      cause: "Regenerative chatter — spindle speed in unstable lobe",
      check: (input) => {
        if (input.process_data?.vibration_rms !== undefined && input.process_data.vibration_rms > 2.5) {
          return { probability: 0.85, evidence: [`High vibration RMS ${input.process_data.vibration_rms} g — regenerative chatter likely`] };
        }
        return { probability: 0.6, evidence: ["Chatter marks are characteristic of unstable spindle speed / DOC combination"] };
      },
      corrective_action: "Adjust RPM to stable lobe (±10-15%), reduce DOC below stability limit, add damping.",
    },
    {
      cause: "Insufficient workholding rigidity",
      check: () => ({ probability: 0.4, evidence: ["Flexible workholding allows vibration at natural frequency"] }),
      corrective_action: "Improve fixturing — add supports, increase clamp force, minimize part overhang.",
    },
    {
      cause: "Tool overhang too long",
      check: (input) => {
        if (input.process_data?.spindle_load_pct !== undefined && input.process_data.spindle_load_pct > 50) {
          return { probability: 0.5, evidence: ["Cutting force with long tool overhang amplifies chatter"] };
        }
        return { probability: 0.35, evidence: ["Long L/D ratio reduces tool stiffness — k ∝ 1/L³"] };
      },
      corrective_action: "Minimize tool stickout, use anti-vibration boring bar, or heavy-metal damped holder.",
    },
  ],

  tool_marks: [
    {
      cause: "Dwell marks at tool entry/exit or axis reversal",
      check: () => ({ probability: 0.55, evidence: ["Tool marks commonly occur at transition points in toolpath"] }),
      corrective_action: "Add lead-in/lead-out arcs, adjust dwell time, enable cutter compensation.",
    },
    {
      cause: "BUE (Built-Up Edge) intermittently welding to tool",
      check: (input) => {
        if (input.process_data?.temperature_delta_C !== undefined && input.process_data.temperature_delta_C < 10) {
          return { probability: 0.5, evidence: ["Low cutting temperature promotes BUE formation in ductile materials"] };
        }
        return { probability: 0.3, evidence: ["BUE causes irregular tool marks at random intervals"] };
      },
      corrective_action: "Increase cutting speed to raise temperature above BUE range, use coated insert.",
    },
    {
      cause: "Backlash in axis drive",
      check: (_input, _physics, deviations) => {
        const std = deviationStdDev(deviations);
        if (std > 0.02) {
          return { probability: 0.45, evidence: [`High deviation scatter (σ=${round3(std)} mm) may indicate backlash`] };
        }
        return null;
      },
      corrective_action: "Run backlash compensation routine, check ball-screw preload.",
    },
  ],

  dimensional_drift: [
    {
      cause: "Progressive tool wear",
      check: (input, physics) => {
        if (physics.tool_wear_mm !== undefined && physics.tool_wear_mm > 0.05) {
          return { probability: 0.8, evidence: [`Tool wear ~${round3(physics.tool_wear_mm)} mm — progressive drift signature`] };
        }
        if (input.process_data?.tool_age_min !== undefined && input.process_data.tool_age_min > 30) {
          return { probability: 0.6, evidence: [`Tool age ${input.process_data.tool_age_min} min without offset update`] };
        }
        return { probability: 0.4, evidence: ["Dimensional drift is classic tool wear symptom"] };
      },
      corrective_action: "Implement automatic tool wear compensation, in-process gauging, or SPC-based offset updates.",
    },
    {
      cause: "Thermal drift of machine structure",
      check: (input, physics) => {
        if (physics.thermal_growth_mm !== undefined && physics.thermal_growth_mm > 0.01) {
          return { probability: 0.65, evidence: [`Thermal growth ${round3(physics.thermal_growth_mm)} mm over time`] };
        }
        if (input.process_data?.temperature_delta_C !== undefined && Math.abs(input.process_data.temperature_delta_C) > 3) {
          return { probability: 0.5, evidence: [`Temperature change ${input.process_data.temperature_delta_C}°C correlates with drift`] };
        }
        return null;
      },
      corrective_action: "Monitor ambient temp, implement thermal compensation, schedule critical cuts after warm-up.",
    },
    {
      cause: "Coolant degradation affecting lubricity",
      check: (input) => {
        if (input.process_data?.coolant_concentration_pct !== undefined && input.process_data.coolant_concentration_pct < 4) {
          return { probability: 0.35, evidence: [`Low coolant concentration ${input.process_data.coolant_concentration_pct}%`] };
        }
        return null;
      },
      corrective_action: "Test coolant with refractometer and pH strip, top up or replace.",
    },
  ],
};

function classifyPattern(measurements: Measurement[]): PatternType {
  if (measurements.length < 3) return "random";
  const deviations = getDeviations(measurements);
  const absDev = deviations.map(Math.abs);

  // Check progressive: monotonically increasing magnitude
  let increasing = 0;
  for (let i = 1; i < absDev.length; i++) {
    if (absDev[i] > absDev[i - 1]) increasing++;
  }
  if (increasing >= absDev.length * 0.7) return "progressive";

  // Check systematic: all deviations same sign and similar magnitude
  const allPositive = deviations.every((d) => d > 0);
  const allNegative = deviations.every((d) => d < 0);
  const std = deviationStdDev(deviations);
  const mean = avgDeviation(deviations);
  if ((allPositive || allNegative) && (std < Math.abs(mean) * 0.3 || std < 0.005)) {
    return "systematic";
  }

  // Check intermittent: some features OK, some not
  const outOfTol = measurements.filter((m) => Math.abs(m.actual - m.nominal) > m.tolerance).length;
  if (outOfTol > 0 && outOfTol < measurements.length * 0.6) return "intermittent";

  return "random";
}

// ============================================================================
// ENGINE
// ============================================================================

export class ScrapRootCauseEngine {
  /**
   * Multi-signal root cause analysis for a single scrap event.
   */
  analyzeScrapEvent(input: ScrapEventInput): ScrapAnalysisResult {
    const physics: PhysicsAnalysis = {
      thermal_growth_mm: estimateThermalGrowth(
        input.process_data?.temperature_delta_C,
        (input.process_data as any)?.workpiece_length_mm,
      ),
      tool_deflection_mm: estimateToolDeflection(input.process_data?.spindle_load_pct),
      tool_wear_mm: estimateToolWear(input.process_data?.tool_age_min),
    };

    // Round physics values
    if (physics.thermal_growth_mm !== undefined) physics.thermal_growth_mm = round3(physics.thermal_growth_mm);
    if (physics.tool_deflection_mm !== undefined) physics.tool_deflection_mm = round3(physics.tool_deflection_mm);
    if (physics.tool_wear_mm !== undefined) physics.tool_wear_mm = round3(physics.tool_wear_mm);

    const deviations = getDeviations(input.measurements);
    const rules = DEFECT_RULES[input.defect_type] ?? [];

    const probable_causes: ProbableCause[] = [];
    for (const rule of rules) {
      const result = rule.check(input, physics, deviations);
      if (result) {
        probable_causes.push({
          cause: rule.cause,
          probability: result.probability,
          evidence: result.evidence,
          corrective_action: rule.corrective_action,
        });
      }
    }

    // Sort by probability descending
    probable_causes.sort((a, b) => b.probability - a.probability);

    const pattern_type = classifyPattern(input.measurements);

    const recommended_checks: string[] = [
      "Verify tool condition under microscope",
      "Check coolant concentration with refractometer",
      "Run test cut on known-good material",
    ];

    if (physics.thermal_growth_mm !== undefined && physics.thermal_growth_mm > 0.005) {
      recommended_checks.push("Monitor machine temperature over 2-hour warm-up cycle");
    }
    if (physics.tool_deflection_mm !== undefined && physics.tool_deflection_mm > 0.01) {
      recommended_checks.push("Measure actual tool runout with dial indicator");
    }
    if (pattern_type === "progressive") {
      recommended_checks.push("Plot dimension vs part number to confirm drift trend");
    }
    if (input.defect_type === "out_of_round" || input.defect_type === "taper") {
      recommended_checks.push("Run ball-bar test to check machine geometry");
    }

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "troubleshooting",
        min_confidence: 70,
        limit: 5,
        query: input.defect_type,
      });
    } catch { /* tribal tips are advisory — never block analysis */ }

    return { probable_causes, physics_analysis: physics, pattern_type, recommended_checks, tribal_tips };
  }

  /**
   * Analyze trends across multiple scrap events.
   */
  analyzeTrend(input: { events: ScrapEventInput[] }): ScrapTrendResult {
    const events = input.events;
    if (events.length === 0) {
      return { trend: "stable", common_causes: [], systemic_issues: [], estimated_cost_impact_per_month: 0 };
    }

    // Analyze each event
    const allCauses: Record<string, number> = {};
    const defectCounts: Record<string, number> = {};
    const deviationMagnitudes: number[] = [];

    for (const evt of events) {
      const analysis = this.analyzeScrapEvent(evt);
      for (const cause of analysis.probable_causes) {
        if (cause.probability >= 0.4) {
          allCauses[cause.cause] = (allCauses[cause.cause] ?? 0) + 1;
        }
      }
      defectCounts[evt.defect_type] = (defectCounts[evt.defect_type] ?? 0) + 1;
      for (const m of evt.measurements) {
        deviationMagnitudes.push(Math.abs(m.actual - m.nominal));
      }
    }

    // Trend: compare first half vs second half deviation magnitudes
    let trend: "improving" | "stable" | "degrading" = "stable";
    if (deviationMagnitudes.length >= 4) {
      const mid = Math.floor(deviationMagnitudes.length / 2);
      const firstHalf = deviationMagnitudes.slice(0, mid);
      const secondHalf = deviationMagnitudes.slice(mid);
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      const change = avgSecond - avgFirst;
      if (change > avgFirst * 0.15) trend = "degrading";
      else if (change < -avgFirst * 0.15) trend = "improving";
    }

    // Common causes (appear in >30% of events)
    const causeThreshold = Math.max(1, events.length * 0.3);
    const common_causes = Object.entries(allCauses)
      .filter(([, count]) => count >= causeThreshold)
      .sort((a, b) => b[1] - a[1])
      .map(([cause]) => cause);

    // Systemic issues
    const systemic_issues: string[] = [];
    const dominantDefect = Object.entries(defectCounts).sort((a, b) => b[1] - a[1])[0];
    if (dominantDefect && dominantDefect[1] >= events.length * 0.5) {
      systemic_issues.push(`${dominantDefect[0]} defects dominate (${dominantDefect[1]}/${events.length} events)`);
    }
    if (trend === "degrading") {
      systemic_issues.push("Deviation magnitudes are increasing over time — process is drifting");
    }
    if (events.length >= 5 && common_causes.length > 0) {
      systemic_issues.push(`Recurring root cause: ${common_causes[0]}`);
    }

    // Rough cost estimate: $50/part average scrap cost, extrapolated to 30 days
    const eventsPerDay = events.length > 1 ? events.length / 30 : events.length;
    const estimated_cost_impact_per_month = Math.round(eventsPerDay * 30 * 50);

    return { trend, common_causes, systemic_issues, estimated_cost_impact_per_month };
  }
}

/** Singleton instance */
export const scrapRootCauseEngine = new ScrapRootCauseEngine();
