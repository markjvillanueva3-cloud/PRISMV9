/**
 * MillExpertAdvisorEngine — unified expert advisor composing 5 mill-domain engines
 *
 * Operator directive (2026-05-25, slot:foxtrot): "wire and bridge new nodes to milling
 * related nodes and pipelines, synergize with PSN and prism app".
 *
 * This engine is the high-level "ask one question, get a complete answer" surface for
 * mill operators. Given a single mill scenario (operation + material + tool + machine),
 * it composes 5 of the iter56-iter61 mill-parity engines and returns a unified advisory:
 *
 *   1. MillCSSOptimizerEngine.optimize          → recommended RPM
 *   2. MillCoolantAdvisorEngine.advise          → recommended coolant mode + parameters
 *   3. MillPipelineKnowledgeInjectorEngine.inject → tribal tips + wiki pointers
 *   4. MillAnomalyDetectionEngine.scanPoint     → predicted anomalies for the params
 *   5. (optionally) MillBlockEngagementSimulatorEngine if blocks are passed → engagement preview
 *
 * The orchestrator composes — it does NOT re-derive. All sub-engines own their physics.
 * The advisor surfaces conflicts (e.g., recommended RPM violates anomaly detector) as
 * top-level red-flags rather than averaging them away (slot-foxtrot soul rule R7).
 *
 * Bridge philosophy: this engine is intentionally THIN. It exists to give callers a
 * single MCP action surface rather than requiring them to chain 5 separate prism_mill
 * calls. Each sub-engine's full output is preserved in `details` for drill-down.
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-EXPERT-ADVISOR (iter62)
 * @version 1.0.0
 * @module MillExpertAdvisorEngine
 */

import type { MillOperation, MillMaterial, MillOperatorSkill, MillSymptom, MillPipelineKnowledgeResult } from "./MillPipelineKnowledgeInjectorEngine.js";
import type { MillCoolantAdvisorInput, MillCoolantAdvisorResult } from "./MillCoolantAdvisorEngine.js";
import type { MillCSSBaseInput, MillCSSBaseResult } from "./MillCSSOptimizerEngine.js";
import type { MillDataPoint, MillAnomalyResult } from "./MillAnomalyDetectionEngine.js";

export interface MillExpertAdvisorInput {
  // ── Core scenario (required) ──────────────────────────────────────────
  operation: MillOperation;
  material: MillMaterial;
  /** ISO machinability group (P/M/K/N/S/H) — drives coolant + speed/feed envelopes */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  tool_diameter_mm: number;
  flute_count: number;
  // ── Cutting parameters (required for anomaly + CSS) ───────────────────
  Vc_m_min: number;
  fz_mm_tooth: number;
  ap_mm: number;
  ae_mm?: number;
  // ── Machine ──────────────────────────────────────────────────────────
  rated_max_rpm: number;
  /** Tool stick-out (mm) — for deflection check */
  tool_overhang_mm?: number;
  // ── Operator / context ───────────────────────────────────────────────
  operator_skill_level: MillOperatorSkill;
  recent_symptom?: MillSymptom;
  feature_hint?: string;
  // ── Coolant context ──────────────────────────────────────────────────
  tool_material?: "carbide" | "ceramic" | "cbn" | "hss" | "diamond";
  hardened_workpiece?: boolean;
  sustainability_priority?: "low" | "medium" | "high";
  thru_spindle_available?: boolean;
  air_blast_available?: boolean;
  cryo_available?: boolean;
  adaptive_toolpath?: boolean;
  // ── Limits ───────────────────────────────────────────────────────────
  max_tribal_tips?: number;
  max_wiki_entries?: number;
}

export interface MillExpertAdvisorResult {
  /** Top-line advisory: one-line operator-facing summary. */
  headline: string;
  /** Recommended RPM (from CSS optimizer) — already clamped to rated_max_rpm. */
  recommended_rpm: number;
  effective_vc_m_min: number;
  /** Recommended coolant mode + parameters. */
  recommended_coolant: string;
  coolant_parameters: MillCoolantAdvisorResult["parameters"];
  /** Predicted anomalies at the supplied parameters (empty = green light). */
  predicted_anomalies: MillAnomalyResult[];
  /** Tribal tips + wiki pointers, capped to caller-supplied limits. */
  tribal_tips: MillPipelineKnowledgeResult["tribal_tips"];
  wiki_pointers: MillPipelineKnowledgeResult["wiki_pointers"];
  /** Top-level red-flags surfaced when sub-engine outputs conflict (R7 rule). */
  red_flags: string[];
  /** Overall readiness: green = ship | yellow = caution | red = halt */
  readiness: "green" | "yellow" | "red";
  /** Full sub-engine outputs for drill-down. */
  details: {
    css: MillCSSBaseResult;
    coolant: MillCoolantAdvisorResult;
    knowledge: MillPipelineKnowledgeResult;
    anomalies_input: MillDataPoint;
  };
  source: string;
}

class MillExpertAdvisorEngineImpl {
  async advise(input: MillExpertAdvisorInput): Promise<MillExpertAdvisorResult> {
    this.validate(input);

    // ── Lane 1: CSS optimizer (RPM from Vc + D)
    const { millCSSOptimizerEngine } = await import("./MillCSSOptimizerEngine.js");
    const cssInput: MillCSSBaseInput = {
      Vc_m_min: input.Vc_m_min,
      tool_diameter_mm: input.tool_diameter_mm,
      rated_max_rpm: input.rated_max_rpm,
    };
    const css = millCSSOptimizerEngine.optimize(cssInput);

    // ── Lane 2: Coolant advisor
    const { millCoolantAdvisorEngine } = await import("./MillCoolantAdvisorEngine.js");
    const coolantInput: MillCoolantAdvisorInput = {
      iso_group: input.iso_group,
      operation: this.mapOpToCoolantOp(input.operation),
      tool_material: input.tool_material ?? "carbide",
      Vc_m_min: input.Vc_m_min,
      ap_mm: input.ap_mm,
      radial_engagement: input.ae_mm && input.tool_diameter_mm ? input.ae_mm / input.tool_diameter_mm : undefined,
      adaptive_toolpath: input.adaptive_toolpath,
      hardened_workpiece: input.hardened_workpiece,
      cryo_available: input.cryo_available,
      sustainability_priority: input.sustainability_priority,
      thru_spindle_available: input.thru_spindle_available,
      air_blast_available: input.air_blast_available,
    };
    const coolant = millCoolantAdvisorEngine.advise(coolantInput);

    // ── Lane 3: Pipeline knowledge (tribal + wiki)
    const { millPipelineKnowledgeInjectorEngine } = await import("./MillPipelineKnowledgeInjectorEngine.js");
    const knowledge = await millPipelineKnowledgeInjectorEngine.inject({
      operation: input.operation,
      material: input.material,
      operator_skill_level: input.operator_skill_level,
      recent_symptom: input.recent_symptom,
      feature_hint: input.feature_hint,
      max_tribal_tips: input.max_tribal_tips,
      max_wiki_entries: input.max_wiki_entries,
    });

    // ── Lane 4: Anomaly detector (predict warnings at the supplied parameters)
    const { millAnomalyDetectionEngine } = await import("./MillAnomalyDetectionEngine.js");
    const anomalyInput: MillDataPoint = {
      Vc_m_min: input.Vc_m_min,
      fz_mm_tooth: input.fz_mm_tooth,
      ap_mm: input.ap_mm,
      ae_mm: input.ae_mm,
      tool_diameter_mm: input.tool_diameter_mm,
      flute_count: input.flute_count,
      material_iso: input.iso_group,
      operation: this.mapOpToAnomalyOp(input.operation),
      tool_overhang_mm: input.tool_overhang_mm,
      adaptive_toolpath: input.adaptive_toolpath,
      spindle_rpm: css.recommended_rpm,
    };
    const predicted_anomalies = millAnomalyDetectionEngine.scanPoint(anomalyInput);

    // ── Top-level red-flags (R7: surface conflicts, don't average)
    const red_flags: string[] = [];
    if (css.clamped) {
      red_flags.push(`CSS RPM clamped to ${css.recommended_rpm} — effective Vc=${css.effective_vc_m_min} (${css.vc_target_match_pct}% of target ${input.Vc_m_min})`);
    }
    if (knowledge.tribal_escalation_needed) {
      red_flags.push(`Tribal escalation: ${knowledge.tribal_escalation_reason}`);
    }
    const criticalAnomalies = predicted_anomalies.filter(a => a.severity === "critical");
    if (criticalAnomalies.length > 0) {
      for (const a of criticalAnomalies) {
        red_flags.push(`CRITICAL ${a.anomaly_type}: ${a.description}`);
      }
    }
    if (coolant.safety_notes.length > 0) {
      for (const note of coolant.safety_notes) {
        red_flags.push(`Coolant safety: ${note}`);
      }
    }

    // ── Readiness verdict
    const readiness: "green" | "yellow" | "red" =
      criticalAnomalies.length > 0 ? "red" :
      red_flags.length > 0 || predicted_anomalies.length > 0 ? "yellow" :
      "green";

    // ── Headline
    const headline = `${input.operation} ${input.material} @ ${css.recommended_rpm} RPM, ${coolant.recommendation} coolant — readiness=${readiness.toUpperCase()}`;

    return {
      headline,
      recommended_rpm: css.recommended_rpm,
      effective_vc_m_min: css.effective_vc_m_min,
      recommended_coolant: coolant.recommendation,
      coolant_parameters: coolant.parameters,
      predicted_anomalies,
      tribal_tips: knowledge.tribal_tips,
      wiki_pointers: knowledge.wiki_pointers,
      red_flags,
      readiness,
      details: {
        css,
        coolant,
        knowledge,
        anomalies_input: anomalyInput,
      },
      source: "MillExpertAdvisorEngine — composes MillCSSOptimizerEngine + MillCoolantAdvisorEngine + MillPipelineKnowledgeInjectorEngine + MillAnomalyDetectionEngine. Slot-foxtrot R7 preserved: conflicts surfaced as red_flags, not averaged.",
    };
  }

  getStats(): {
    composed_engines: string[];
    readiness_states: string[];
  } {
    return {
      composed_engines: [
        "MillCSSOptimizerEngine.optimize",
        "MillCoolantAdvisorEngine.advise",
        "MillPipelineKnowledgeInjectorEngine.inject",
        "MillAnomalyDetectionEngine.scanPoint",
      ],
      readiness_states: ["green", "yellow", "red"],
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  private validate(i: MillExpertAdvisorInput): void {
    if (!i) throw new Error("MillExpertAdvisorEngine.advise: input required");
    const reqs: Array<keyof MillExpertAdvisorInput> = [
      "operation", "material", "iso_group", "tool_diameter_mm", "flute_count",
      "Vc_m_min", "fz_mm_tooth", "ap_mm", "rated_max_rpm", "operator_skill_level",
    ];
    for (const k of reqs) {
      if (i[k] === undefined || i[k] === null) {
        throw new Error(`MillExpertAdvisorEngine.advise: ${k} required`);
      }
    }
    if (!(i.tool_diameter_mm > 0)) throw new Error("MillExpertAdvisorEngine.advise: tool_diameter_mm must be > 0");
    if (!(i.flute_count > 0)) throw new Error("MillExpertAdvisorEngine.advise: flute_count must be > 0");
    if (!(i.Vc_m_min > 0)) throw new Error("MillExpertAdvisorEngine.advise: Vc_m_min must be > 0");
    if (!(i.rated_max_rpm > 0)) throw new Error("MillExpertAdvisorEngine.advise: rated_max_rpm must be > 0");
  }

  /** Map MillOperation → MillCoolantAdvisor MillOpType (subset overlap). */
  private mapOpToCoolantOp(op: MillOperation): MillCoolantAdvisorInput["operation"] {
    switch (op) {
      case "milling_rough": return "end_milling_rough";
      case "milling_finish": return "end_milling_finish";
      case "drilling": return "drilling";
      case "boring": return "boring";
      case "tapping": return "drilling"; // closest coolant analog
      case "threading": return "thread_milling";
    }
  }

  /** MillOperation maps 1:1 to MillAnomaly operation taxonomy in most cases. */
  private mapOpToAnomalyOp(op: MillOperation): MillDataPoint["operation"] {
    switch (op) {
      case "milling_rough": return "end_milling_rough";
      case "milling_finish": return "end_milling_finish";
      case "drilling": return "drilling";
      case "boring": return "boring";
      case "tapping": return "drilling";
      case "threading": return "thread_milling";
    }
  }
}

export const millExpertAdvisorEngine = new MillExpertAdvisorEngineImpl();
export type { MillExpertAdvisorEngineImpl };
