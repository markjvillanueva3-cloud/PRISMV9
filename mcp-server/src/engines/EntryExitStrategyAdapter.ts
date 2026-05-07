/**
 * EntryExitStrategyAdapter — CAMX-MS0.3 / U-CAMX07
 *
 * Replaces HARDCODED / HEURISTIC tool entry/exit picks in PrintToProgram,
 * MultiAxis, Laser, and Waterjet with a physics-backed candidate recommender
 * routed through PipelineDecisionOrchestrator.
 *
 * Candidate space (domain-aware):
 *   Milling:        helix, ramp, plunge, pre-drill, arc-on/arc-off, rolling-in
 *   MultiAxis:      tilted helix, lead-in arc, surface normal entry
 *   Laser pierce:   pulsed pierce, CW pierce, blast pierce
 *   Waterjet:       stationary pierce, dynamic pierce, low-pressure pierce
 *
 * Physics inputs:
 *   - Plunge force ≈ 0.7 × Fc_side (unfavorable for non-center-cutting tools)
 *   - Helix radius recommendation: r_helix ≤ (D_tool − 2·ae)/2
 *   - Ramp angle ≤ arctan(fz/ae) for chip formation integrity
 *   - Arc-on/arc-off radius ≥ 1× corner radius for surface integrity
 *   - Laser pierce time: pulsed reduces HAZ; CW faster but larger HAZ
 *   - Waterjet pierce: stationary safest for hard mat., low-P for fragile
 *
 * Call sites
 *   PrintToProgram.selectEntry()     → "p2p.entry_strategy"
 *   PrintToProgram.selectExit()      → "p2p.exit_strategy"
 *   MultiAxis.selectEntryHelix()     → "mx.entry_helix"
 *   Laser.selectPierceStrategy()     → "la.pierce_strategy"
 *   Waterjet.selectPierceDelay()     → "wj.pierce_delay"
 */

import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type EntryExitDomain = "milling" | "multiaxis" | "laser" | "waterjet";
export type PhaseKind = "entry" | "exit";

export interface EntryExitCandidate {
  id: string;
  label: string;
  domain: EntryExitDomain;
  phase: PhaseKind;
  motion_type:
    | "helix"
    | "ramp"
    | "plunge"
    | "pre_drill"
    | "arc_on"
    | "arc_off"
    | "rolling_in"
    | "lead_off"
    | "retract_linear"
    | "normal_entry"
    | "tilted_helix"
    | "lead_in_arc"
    | "pulsed"
    | "cw"
    | "blast"
    | "stationary_pierce"
    | "dynamic_pierce"
    | "low_pressure_pierce";
  requires_center_cut: boolean;
  surface_mark_risk: number; // 0..1 — lower is better
  typical_time_sec: number;
  force_index: number; // 1..5 (5 is heaviest)
  applicable_ops: string[]; // "rough","finish","drill","thread","laser","waterjet"
  source: string;
}

export interface OrchestratedEntryExitRequest {
  decision_point: string;
  domain?: EntryExitDomain;
  phase?: PhaseKind;
  operation_type?: "rough" | "finish" | "drill" | "thread" | "laser_cut" | "waterjet_cut";
  tool_diameter_mm?: number;
  stepover_ae_mm?: number;
  stepdown_ap_mm?: number;
  center_cutting?: boolean; // true if tool has center-cut flute
  surface_finish_critical?: boolean;
  material_thickness_mm?: number; // laser / waterjet
  material_hardness_hrc?: number;
  pipeline_stage?: string;
  caller?: string;
  objective?: "speed" | "quality" | "cost" | "balanced" | "tool_life";
  explain?: boolean;
}

export interface OrchestratedEntryExitDecision {
  strategy: EntryExitCandidate;
  decision: any;
  no_candidates: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Catalog
// ────────────────────────────────────────────────────────────────────────

const MILL_ENTRY: EntryExitCandidate[] = [
  {
    id: "MILL-helix",
    label: "Helical interpolation (safe, low force)",
    domain: "milling",
    phase: "entry",
    motion_type: "helix",
    requires_center_cut: false,
    surface_mark_risk: 0.1,
    typical_time_sec: 4,
    force_index: 2,
    applicable_ops: ["rough", "finish"],
    source: "Sandvik milling guide",
  },
  {
    id: "MILL-ramp",
    label: "Ramp entry (moderate force, angled plunge)",
    domain: "milling",
    phase: "entry",
    motion_type: "ramp",
    requires_center_cut: false,
    surface_mark_risk: 0.15,
    typical_time_sec: 3,
    force_index: 3,
    applicable_ops: ["rough"],
    source: "Walter ramp guide",
  },
  {
    id: "MILL-plunge",
    label: "Axial plunge (center-cutting required, highest force)",
    domain: "milling",
    phase: "entry",
    motion_type: "plunge",
    requires_center_cut: true,
    surface_mark_risk: 0.3,
    typical_time_sec: 1,
    force_index: 5,
    applicable_ops: ["rough"],
    source: "Kennametal plunge data",
  },
  {
    id: "MILL-pre_drill",
    label: "Pre-drilled pocket entry (zero cutting force)",
    domain: "milling",
    phase: "entry",
    motion_type: "pre_drill",
    requires_center_cut: false,
    surface_mark_risk: 0.05,
    typical_time_sec: 8,
    force_index: 1,
    applicable_ops: ["rough", "finish"],
    source: "Hurco pocket best practice",
  },
  {
    id: "MILL-arc_on",
    label: "Arc-on (tangential, zero marking)",
    domain: "milling",
    phase: "entry",
    motion_type: "arc_on",
    requires_center_cut: false,
    surface_mark_risk: 0.02,
    typical_time_sec: 2,
    force_index: 2,
    applicable_ops: ["finish"],
    source: "Sandvik finishing best practice",
  },
  {
    id: "MILL-rolling_in",
    label: "Rolling-in (large-radius lead-in for contouring)",
    domain: "milling",
    phase: "entry",
    motion_type: "rolling_in",
    requires_center_cut: false,
    surface_mark_risk: 0.03,
    typical_time_sec: 3,
    force_index: 2,
    applicable_ops: ["finish"],
    source: "hyperMILL contouring",
  },
];

const MILL_EXIT: EntryExitCandidate[] = [
  {
    id: "MILL-arc_off",
    label: "Arc-off (tangential exit, no dwell mark)",
    domain: "milling",
    phase: "exit",
    motion_type: "arc_off",
    requires_center_cut: false,
    surface_mark_risk: 0.02,
    typical_time_sec: 2,
    force_index: 2,
    applicable_ops: ["finish", "rough"],
    source: "Sandvik finishing",
  },
  {
    id: "MILL-lead_off",
    label: "Linear lead-off (fast, small dwell mark)",
    domain: "milling",
    phase: "exit",
    motion_type: "lead_off",
    requires_center_cut: false,
    surface_mark_risk: 0.2,
    typical_time_sec: 1,
    force_index: 2,
    applicable_ops: ["rough"],
    source: "Walter guide",
  },
  {
    id: "MILL-retract_linear",
    label: "Direct retract (fastest, highest mark risk)",
    domain: "milling",
    phase: "exit",
    motion_type: "retract_linear",
    requires_center_cut: false,
    surface_mark_risk: 0.4,
    typical_time_sec: 0.5,
    force_index: 1,
    applicable_ops: ["rough"],
    source: "Haas default post",
  },
];

const MX_ENTRY: EntryExitCandidate[] = [
  {
    id: "MX-tilted_helix",
    label: "Tilted helix (5-axis low-force entry)",
    domain: "multiaxis",
    phase: "entry",
    motion_type: "tilted_helix",
    requires_center_cut: false,
    surface_mark_risk: 0.08,
    typical_time_sec: 5,
    force_index: 2,
    applicable_ops: ["rough", "finish"],
    source: "hyperMILL 5-axis strategies",
  },
  {
    id: "MX-lead_in_arc",
    label: "Lead-in arc on surface-normal axis",
    domain: "multiaxis",
    phase: "entry",
    motion_type: "lead_in_arc",
    requires_center_cut: false,
    surface_mark_risk: 0.04,
    typical_time_sec: 3,
    force_index: 2,
    applicable_ops: ["finish"],
    source: "PowerMill 5-axis finishing",
  },
  {
    id: "MX-normal_entry",
    label: "Surface-normal entry (simplest 5-axis)",
    domain: "multiaxis",
    phase: "entry",
    motion_type: "normal_entry",
    requires_center_cut: false,
    surface_mark_risk: 0.12,
    typical_time_sec: 2,
    force_index: 3,
    applicable_ops: ["rough"],
    source: "Mastercam 5-axis",
  },
];

const LASER_PIERCE: EntryExitCandidate[] = [
  {
    id: "LA-pulsed",
    label: "Pulsed pierce (small HAZ, for thick/precision)",
    domain: "laser",
    phase: "entry",
    motion_type: "pulsed",
    requires_center_cut: false,
    surface_mark_risk: 0.05,
    typical_time_sec: 1.5,
    force_index: 1,
    applicable_ops: ["laser_cut"],
    source: "TRUMPF piercing guide",
  },
  {
    id: "LA-cw",
    label: "CW pierce (fast, larger HAZ, for thin/tolerant)",
    domain: "laser",
    phase: "entry",
    motion_type: "cw",
    requires_center_cut: false,
    surface_mark_risk: 0.2,
    typical_time_sec: 0.3,
    force_index: 1,
    applicable_ops: ["laser_cut"],
    source: "Bystronic piercing guide",
  },
  {
    id: "LA-blast",
    label: "Blast pierce (highest HAZ, thinnest stock only)",
    domain: "laser",
    phase: "entry",
    motion_type: "blast",
    requires_center_cut: false,
    surface_mark_risk: 0.35,
    typical_time_sec: 0.1,
    force_index: 1,
    applicable_ops: ["laser_cut"],
    source: "Amada high-speed pierce",
  },
];

const WJ_PIERCE: EntryExitCandidate[] = [
  {
    id: "WJ-stationary",
    label: "Stationary pierce (safest, for hard/brittle)",
    domain: "waterjet",
    phase: "entry",
    motion_type: "stationary_pierce",
    requires_center_cut: false,
    surface_mark_risk: 0.05,
    typical_time_sec: 6,
    force_index: 1,
    applicable_ops: ["waterjet_cut"],
    source: "Flow AWJ guide",
  },
  {
    id: "WJ-dynamic",
    label: "Dynamic pierce (moving start, for most materials)",
    domain: "waterjet",
    phase: "entry",
    motion_type: "dynamic_pierce",
    requires_center_cut: false,
    surface_mark_risk: 0.12,
    typical_time_sec: 3,
    force_index: 1,
    applicable_ops: ["waterjet_cut"],
    source: "OMAX ProtoMAX dynamic",
  },
  {
    id: "WJ-low-P",
    label: "Low-pressure pierce (for fragile composites / glass)",
    domain: "waterjet",
    phase: "entry",
    motion_type: "low_pressure_pierce",
    requires_center_cut: false,
    surface_mark_risk: 0.03,
    typical_time_sec: 10,
    force_index: 1,
    applicable_ops: ["waterjet_cut"],
    source: "Flow composite handbook",
  },
];

function selectCatalog(req: OrchestratedEntryExitRequest): EntryExitCandidate[] {
  const dp = req.decision_point;
  if (dp === "p2p.entry_strategy") return MILL_ENTRY;
  if (dp === "p2p.exit_strategy") return MILL_EXIT;
  if (dp === "mx.entry_helix") return MX_ENTRY;
  if (dp === "la.pierce_strategy") return LASER_PIERCE;
  if (dp === "wj.pierce_delay") return WJ_PIERCE;
  if (req.domain === "milling" && req.phase === "exit") return MILL_EXIT;
  if (req.domain === "milling") return MILL_ENTRY;
  if (req.domain === "multiaxis") return MX_ENTRY;
  if (req.domain === "laser") return LASER_PIERCE;
  if (req.domain === "waterjet") return WJ_PIERCE;
  return MILL_ENTRY;
}

// ────────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────────

function score(c: EntryExitCandidate, req: OrchestratedEntryExitRequest): Record<string, number> {
  const op = req.operation_type;
  const critFinish = req.surface_finish_critical === true;
  const thick = req.material_thickness_mm ?? 0;
  const cc = req.center_cutting === true;

  // optimal_performance ← inverse time + op fit + low-mark preference when critical
  const timeScore = Math.max(0, Math.min(1, 1 - c.typical_time_sec / 10));
  let perf = critFinish
    ? 0.3 + 0.15 * timeScore + 0.45 * (1 - c.surface_mark_risk)
    : 0.4 + 0.4 * timeScore;
  if (op && c.applicable_ops.includes(op)) perf += 0.1;
  perf = Math.max(0, Math.min(1, perf));

  // logical_consistency ← domain fit + op fit + surface-mark preference
  let logical = 0.5;
  if (op && c.applicable_ops.includes(op)) logical += 0.2;
  if (critFinish) logical += (1 - c.surface_mark_risk) * 0.3;
  logical = Math.max(0, Math.min(1, logical));

  // safety ← mark risk + plunge center-cut mismatch + thickness limits
  let safety = 0.8;
  // Surface-mark risk hurts safety harder when critical finish is demanded
  safety -= c.surface_mark_risk * (critFinish ? 0.8 : 0.3);
  if (c.requires_center_cut && !cc) safety -= 0.5; // plunge without center-cut = broken tool
  if (c.motion_type === "blast" && thick > 3) safety -= 0.4; // blast pierce only thin
  if (c.motion_type === "plunge" && c.force_index >= 4 && (req.material_hardness_hrc ?? 0) > 40) safety -= 0.2;
  safety = Math.max(0, Math.min(1, safety));

  // cost_efficiency ← lower force_index + lower time
  const cost = 0.5 * (1 - (c.force_index - 1) / 5) + 0.5 * timeScore;

  // robustness ← broad operation applicability
  const robustness = Math.min(1, 0.4 + 0.2 * c.applicable_ops.length);

  return {
    optimal_performance: perf,
    logical_consistency: logical,
    safety,
    cost_efficiency: cost,
    robustness,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Engine / adapter
// ────────────────────────────────────────────────────────────────────────

export class EntryExitStrategyAdapter {
  selectEntryExitOrchestrated(req: OrchestratedEntryExitRequest): OrchestratedEntryExitDecision {
    const catalog = selectCatalog(req);

    // Hard filter: remove plunge when tool not center-cutting
    const viable = catalog.filter((c) => {
      if (c.requires_center_cut && req.center_cutting === false) return false;
      if (req.operation_type && c.applicable_ops.length > 0 && !c.applicable_ops.includes(req.operation_type)) return false;
      return true;
    });

    if (viable.length === 0) {
      return { strategy: null as any, decision: null, no_candidates: true };
    }

    const candidates = viable.map((c) => ({
      id: c.id,
      label: c.label,
      data: {
        motion_type: c.motion_type,
        requires_center_cut: c.requires_center_cut,
        surface_mark_risk: c.surface_mark_risk,
        typical_time_sec: c.typical_time_sec,
        force_index: c.force_index,
        applicable_ops: c.applicable_ops,
      },
      pre_scores: score(c, req),
    }));

    const decision = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "entry_exit_select",
      context: {
        domain: req.domain ?? (req.decision_point || "").split(".")[0],
        phase: req.phase,
        operation: req.operation_type,
        tool: { diameter_mm: req.tool_diameter_mm, center_cutting: req.center_cutting },
        feature: { stepover_ae_mm: req.stepover_ae_mm, stepdown_ap_mm: req.stepdown_ap_mm },
        material: { thickness_mm: req.material_thickness_mm, hardness_hrc: req.material_hardness_hrc },
        flags: { surface_finish_critical: req.surface_finish_critical },
      },
      candidates,
      objective: req.objective ?? "balanced",
      explain: req.explain ?? false,
      pipeline_stage: req.pipeline_stage,
      caller: req.caller,
      constraints: {},
    });

    const winnerId = decision?.choice?.id;
    const winner = viable.find((c) => c.id === winnerId) ?? viable[0];

    return { strategy: winner, decision, no_candidates: false };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────
export const entryExitStrategyAdapter = new EntryExitStrategyAdapter();
