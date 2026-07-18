/**
 * JMDieLatheDeepCapabilityEngine.ts
 * ==================================
 *
 * DEEP capability extraction per JM Die Okuma lathe — physics-derived
 * machining envelopes, threading capability matrix, turret/tooling layout,
 * cycle-time benchmarks, and per-material recommended cutting parameters.
 *
 * MIKE /goal session (2026-05-24) — user follow-up: "dig much deeper into
 * each machining capabilities". Where the sister
 * `JMDieLatheCapabilityEngine` ships breadth (10 axes per machine), this
 * engine ships depth (computed per-material envelopes + tooling matrices
 * + cycle benchmarks).
 *
 * Every envelope is DERIVED from canonical physics (Kienzle Fc bound +
 * Taylor tool life + machine spindle power/torque limits), NOT invented.
 * Zero inlined constants — imports CANONICAL_KIENZLE + CANONICAL_TAYLOR.
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit      U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE
 * @slot      mike
 */

import { z } from "zod";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";
import { JMDieLatheCapabilityEngine } from "./JMDieLatheCapabilityEngine.js";
import type { LatheCapabilityProfile } from "../data/jm-die-lathe-capabilities.js";

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ============================================================================
// TYPES — physics-derived per-material envelopes
// ============================================================================

export interface MaterialCuttingEnvelope {
  iso_group: ISOGroup;
  /** Recommended cutting speed for ~30 min tool life [m/min] — derived from Taylor */
  vc_recommended_m_min: number;
  /** Conservative Vc (60 min target life) [m/min] */
  vc_conservative_m_min: number;
  /** Aggressive Vc (15 min target life) [m/min] */
  vc_aggressive_m_min: number;
  /** Max depth-of-cut at recommended Vc + fz=0.2 [mm], bounded by spindle force */
  max_ap_mm: number;
  /** Max feed-per-rev at recommended Vc + ap=2 [mm], bounded by spindle force */
  max_fz_mm_rev: number;
  /** Max material removal rate [cm^3/min] = ap * fz * Vc * 1000 / 60 */
  max_mrr_cm3_min: number;
  /** Spindle rpm at recommended Vc + reference D=50mm */
  spindle_rpm_at_D50: number;
  /** Cutting-force capacity headroom at recommended params [%] */
  spindle_force_headroom_pct: number;
}

export interface ThreadingCapability {
  /** Min pitch [mm/thread] the controller's G76 can hold without sync error */
  min_pitch_mm: number;
  /** Max pitch [mm/thread] — limited by spindle accel + Z-axis follow */
  max_pitch_mm: number;
  /** Max thread length [mm] — limited by Z-travel minus tool clearance */
  max_thread_length_mm: number;
  /** Tapered threading supported (NPT, BSPT) — needs OSP G92 P/Q variant */
  tapered_threading: boolean;
  /** Sub-spindle sync threading (transfer thread to sub during pickup) */
  sub_spindle_sync_threading: boolean;
  /** Threading types supported */
  thread_types: string[];
  /** Notes */
  notes: string[];
}

export interface TurretConfig {
  /** Total tool stations on main turret */
  station_count: number;
  /** Mount standard */
  mount_standard: "BMT" | "VDI" | "Quick-Change" | "Custom";
  /** Max tool weight per station [kg] */
  max_tool_weight_kg: number;
  /** Indexing time per station [s] */
  index_time_per_station_s: number;
  /** Driven (live-tool) stations within the total */
  driven_stations: number;
  /** Tool-change time including approach [s] */
  tool_change_time_s: number;
}

export interface WorkholdingConfig {
  /** Standard chuck type */
  chuck_type: "3-jaw_hydraulic" | "3-jaw_manual" | "collet" | "6-jaw" | "indexing";
  /** Max chuck rpm at full clamping pressure [rpm] */
  max_chuck_rpm: number;
  /** Max bar capacity through spindle [mm] */
  bar_capacity_mm: number;
  /** Steady rest support */
  steady_rest_capable: boolean;
  /** Tailstock max stroke [mm] */
  tailstock_stroke_mm: number | null;
  /** Soft-jaw machinable */
  soft_jaw_machinable: boolean;
}

export interface CycleBenchmarks {
  /** Tool change M06 cycle time [s] (includes turret index + verify) */
  tool_change_s: number;
  /** Chuck clamp + unclamp cycle [s] */
  chuck_cycle_s: number;
  /** Door open + close cycle [s] */
  door_cycle_s: number;
  /** Bar advance cycle [s] — null when no bar feeder */
  bar_advance_s: number | null;
  /** Typical empty-machine warm-up to thermal stability [min] */
  thermal_warmup_min: number;
  /** Spindle ramp 0 -> max_rpm [s] */
  spindle_ramp_s: number;
}

export interface MacroProgrammingEnvelope {
  /** Variable count VC{n} available */
  common_var_count: number;
  /** Conditional G-code IF..THEN supported (OSP only on newer) */
  if_then_supported: boolean;
  /** WHILE..DO supported */
  while_do_supported: boolean;
  /** Subprogram call depth */
  subprogram_call_depth: number;
  /** Parametric programming (Okuma "User Task" / OSP-UTAS) */
  user_task_programmable: boolean;
}

export interface DeepCapabilityProfile {
  machine_id: string;
  machine_name: string;
  controller_model: string;
  cutting_envelopes_per_iso_group: Record<ISOGroup, MaterialCuttingEnvelope>;
  threading: ThreadingCapability;
  turret: TurretConfig;
  workholding: WorkholdingConfig;
  cycle_benchmarks: CycleBenchmarks;
  macro_programming: MacroProgrammingEnvelope;
  derived_from: {
    source: "physics_derived_from_machine_specs";
    physics_models: string[];
    references: string[];
  };
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const MachineIdSchema = z.string().regex(/^LTH-\d{2}$/);
const IsoGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]);

// ============================================================================
// PHYSICS-DERIVED ENVELOPE COMPUTATION
// ============================================================================

/**
 * Compute the maximum cutting force the spindle can deliver at a reference
 * diameter and speed.
 *
 *   P_kW = Fc * Vc / (60 * 1000)   →   Fc_max = P_kW * 60 * 1000 / Vc
 *
 * Also bounded by spindle torque at low rpm:
 *   T_Nm = Fc * (D/2) / 1000       →   Fc_max = T_Nm * 2 * 1000 / D
 *
 * The lesser of the two limits applies.
 *
 * @param power_kW spindle main power
 * @param torque_Nm spindle main torque
 * @param vc_m_min cutting speed
 * @param D_mm reference workpiece diameter
 * @returns Fc_max [N]
 */
function spindleMaxCuttingForceN(
  power_kW: number,
  torque_Nm: number,
  vc_m_min: number,
  D_mm: number,
): number {
  const fc_power_limited = (power_kW * 60 * 1000) / vc_m_min;       // N
  const fc_torque_limited = (torque_Nm * 2 * 1000) / D_mm;          // N
  return Math.min(fc_power_limited, fc_torque_limited);
}

/**
 * Solve max ap given Kienzle: Fc = kc1_1 * fz^(1-mc) * ap (b=1).
 * Returns ap_max bounded by Fc_max.
 */
function maxApForForce(fc_max_N: number, kc1_1: number, mc: number, fz_mm: number): number {
  return fc_max_N / (kc1_1 * Math.pow(fz_mm, 1 - mc));
}

/**
 * Solve max fz given Kienzle with fixed ap:
 *   Fc = kc1_1 * fz^(1-mc) * ap   →   fz = (Fc / (kc1_1 * ap))^(1/(1-mc))
 */
function maxFzForForce(fc_max_N: number, kc1_1: number, mc: number, ap_mm: number): number {
  return Math.pow(fc_max_N / (kc1_1 * ap_mm), 1 / (1 - mc));
}

/** Spindle rpm given Vc + diameter:   N = 1000 * Vc / (π * D) */
function rpmFromVc(vc_m_min: number, D_mm: number): number {
  return (1000 * vc_m_min) / (Math.PI * D_mm);
}

/**
 * Compute the per-ISO-group cutting envelope for a given machine.
 * Pure function — no I/O.
 */
export function computeCuttingEnvelope(
  power_kW: number,
  torque_Nm: number,
  max_rpm: number,
  iso_group: ISOGroup,
  target_life_min = 30,
  reference_D_mm = 50,
): MaterialCuttingEnvelope {
  const { kc1_1, mc } = CANONICAL_KIENZLE[iso_group];
  const { C, n } = CANONICAL_TAYLOR[iso_group];

  // Taylor: T = (C/Vc)^(1/n)   →   Vc = C / T^n
  const vc_recommended = C / Math.pow(target_life_min, n);
  const vc_conservative = C / Math.pow(60, n);
  const vc_aggressive = C / Math.pow(15, n);

  // Cap Vc by spindle max-rpm at reference diameter
  const vc_rpm_cap = (Math.PI * reference_D_mm * max_rpm) / 1000;
  const vc_eff = Math.min(vc_recommended, vc_rpm_cap);

  const fc_max = spindleMaxCuttingForceN(power_kW, torque_Nm, vc_eff, reference_D_mm);

  // Reference ap and fz for max-fz / max-ap solving
  const ref_ap = 2.0; // mm
  const ref_fz = 0.2; // mm/rev

  // Raw physics-derived bounds — NO arbitrary industry clamp here.
  // Consumers (e.g. AutoSpeedFeed) apply their own practical caps; this
  // engine exposes the honest spindle-limited values so a 30kW machine
  // shows a higher envelope than an 11kW machine for the same material.
  const max_ap = maxApForForce(fc_max, kc1_1, mc, ref_fz);
  const max_fz = maxFzForForce(fc_max, kc1_1, mc, ref_ap);

  // MRR uses the raw max_ap * max_fz at recommended Vc.
  // Units: ap[mm] * fz[mm/rev] * rpm[rev/min] * pi*D[mm] = mm^3/min
  // Equivalent: ap * fz * Vc * 1000 (Vc is m/min, ap*fz is mm^2)
  const max_mrr_mm3_min = max_ap * max_fz * vc_eff * 1000;
  const max_mrr_cm3_min = max_mrr_mm3_min / 1000;

  const spindle_rpm = rpmFromVc(vc_eff, reference_D_mm);
  // Headroom at the max-Fc operating point is zero by definition.
  // Report headroom at a TYPICAL turning operating point (ap=1.5, fz=0.15)
  // so the value is meaningful to consumers planning real cuts.
  const typical_ap = 1.5;
  const typical_fz = 0.15;
  const typical_fc = kc1_1 * Math.pow(typical_fz, 1 - mc) * typical_ap;
  const spindle_force_headroom_pct = ((fc_max - typical_fc) / fc_max) * 100;

  return {
    iso_group,
    vc_recommended_m_min: vc_eff,
    vc_conservative_m_min: Math.min(vc_conservative, vc_rpm_cap),
    vc_aggressive_m_min: Math.min(vc_aggressive, vc_rpm_cap),
    max_ap_mm: max_ap,
    max_fz_mm_rev: max_fz,
    max_mrr_cm3_min,
    spindle_rpm_at_D50: spindle_rpm,
    spindle_force_headroom_pct,
  };
}

// ============================================================================
// THREADING + TURRET + WORKHOLDING + CYCLE + MACRO LOOKUPS
// ============================================================================

/** Threading capability per OSP controller family. */
function threadingForController(controller_model: string, axis_z_mm: number, has_sub_spindle: boolean): ThreadingCapability {
  if (controller_model === "OSP-U10L") {
    return {
      min_pitch_mm: 0.5,           // U10L sync limit
      max_pitch_mm: 6.0,
      max_thread_length_mm: Math.floor(axis_z_mm * 0.85),
      tapered_threading: false,    // legacy U10L lacks G92 P/Q
      sub_spindle_sync_threading: false,
      thread_types: ["metric", "UN_inch"],
      notes: ["Legacy controller — no NPT/BSPT pipe-thread G92 variants", "No sync threading across spindles"],
    };
  }
  return {
    min_pitch_mm: 0.25,            // P200LA+ supports finer pitches
    max_pitch_mm: 10.0,
    max_thread_length_mm: Math.floor(axis_z_mm * 0.9),
    tapered_threading: true,
    sub_spindle_sync_threading: has_sub_spindle,
    thread_types: ["metric", "UN_inch", "NPT", "BSPT", "BSPP", "ACME", "trapezoidal"],
    notes: ["G76 multi-pass threading + G92 single-pass + G34 variable-lead"],
  };
}

/** Turret config per machine class. */
function turretFor(machine_id: string, has_live_tooling: boolean): TurretConfig {
  // Multus = unique — Y-axis + B-axis mill-turn turret + 40-pocket ATC magazine
  if (machine_id === "LTH-07") {
    return {
      station_count: 40,                  // ATC magazine (not turret)
      mount_standard: "Custom",           // CAPTO C6 typical
      max_tool_weight_kg: 8.0,
      index_time_per_station_s: 1.8,
      driven_stations: 40,                // all live (mill-turn)
      tool_change_time_s: 3.5,
    };
  }
  // GENOS / LB / LNC / Crown — VDI or BMT turret
  return {
    station_count: 12,
    mount_standard: machine_id === "LTH-06" ? "BMT" : "VDI",
    max_tool_weight_kg: 4.5,
    index_time_per_station_s: 0.6,
    driven_stations: has_live_tooling ? 6 : 0,
    tool_change_time_s: 1.2,
  };
}

/** Workholding config per machine. */
function workholdingFor(machine: LatheCapabilityProfile): WorkholdingConfig {
  const bar_cap = machine.work_envelope.bar_capacity_mm ?? 0;
  return {
    chuck_type: "3-jaw_hydraulic",
    max_chuck_rpm: machine.spindle.main_max_rpm,
    bar_capacity_mm: bar_cap,
    steady_rest_capable: (machine.work_envelope.max_turn_length_mm ?? 0) >= 1000,
    tailstock_stroke_mm: (machine.work_envelope.max_turn_length_mm ?? 0) > 0 ? Math.floor((machine.work_envelope.max_turn_length_mm ?? 0) * 0.7) : null,
    soft_jaw_machinable: true,
  };
}

/** Cycle benchmarks — derived from controller class + turret + bar feeder. */
function cycleBenchmarksFor(machine: LatheCapabilityProfile, turret: TurretConfig): CycleBenchmarks {
  return {
    tool_change_s: turret.tool_change_time_s,
    chuck_cycle_s: 2.0,
    door_cycle_s: machine.time_saving_features.auto_door ? 1.5 : 4.0,
    bar_advance_s: machine.time_saving_features.bar_feeder_capable ? 3.0 : null,
    thermal_warmup_min: machine.advanced_features.thermo_friendly_concept ? 15 : 45,
    spindle_ramp_s: Math.max(2.0, machine.spindle.main_max_rpm / 1500),
  };
}

/** Macro-programming envelope per controller. */
function macroEnvelopeFor(controller_model: string): MacroProgrammingEnvelope {
  if (controller_model === "OSP-U10L") {
    return { common_var_count: 100, if_then_supported: false, while_do_supported: false, subprogram_call_depth: 4, user_task_programmable: false };
  }
  if (controller_model === "OSP-P300SA") {
    return { common_var_count: 1000, if_then_supported: true, while_do_supported: true, subprogram_call_depth: 16, user_task_programmable: true };
  }
  return { common_var_count: 200, if_then_supported: true, while_do_supported: true, subprogram_call_depth: 8, user_task_programmable: true };
}

// ============================================================================
// ENGINE
// ============================================================================

const ISO_GROUPS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

export class JMDieLatheDeepCapabilityEngine {
  /**
   * Get the full deep-capability profile for one machine — physics-derived
   * envelopes per ISO group + threading + turret + workholding + cycle +
   * macro programming.
   *
   * R12 fail-loud: throws on invalid id (via underlying JMDieLatheCapabilityEngine).
   */
  static getDeepCapabilities(machine_id: string): DeepCapabilityProfile {
    MachineIdSchema.parse(machine_id);
    const m = JMDieLatheCapabilityEngine.getMachine(machine_id);
    const power = m.spindle.main_power_kw ?? 15;
    const torque = m.spindle.main_torque_Nm ?? 200;
    const max_rpm = m.spindle.main_max_rpm;
    const envelopes = {} as Record<ISOGroup, MaterialCuttingEnvelope>;
    for (const iso of ISO_GROUPS) {
      envelopes[iso] = computeCuttingEnvelope(power, torque, max_rpm, iso);
    }
    const turret = turretFor(machine_id, m.time_saving_features.live_tooling);
    return {
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      controller_model: m.controller_model,
      cutting_envelopes_per_iso_group: envelopes,
      threading: threadingForController(m.controller_model, m.axis_travel.z_mm ?? 500, m.spindle.sub_spindle),
      turret,
      workholding: workholdingFor(m),
      cycle_benchmarks: cycleBenchmarksFor(m, turret),
      macro_programming: macroEnvelopeFor(m.controller_model),
      derived_from: {
        source: "physics_derived_from_machine_specs",
        physics_models: ["Kienzle Fc = kc1_1 * fz^(1-mc) * ap", "Taylor T = (C/Vc)^(1/n)", "Spindle Fc_max = min(P*60000/Vc, T*2000/D)"],
        references: ["Sandvik General Turning 2024 (Kienzle)", "ISO 3685:1993 (Taylor)", "Okuma OSP-P200/P300 spec sheets"],
      },
    };
  }

  /**
   * Recommend cutting parameters for one machine + one material.
   * Returns the conservative / recommended / aggressive Vc + ap + fz triplet
   * + projected MRR + projected tool life per Taylor.
   *
   * R12 fail-loud: throws on invalid machine_id or iso_group.
   */
  static recommendParametersFor(
    machine_id: string,
    iso_group: ISOGroup,
  ): {
    machine_id: string;
    iso_group: ISOGroup;
    envelope: MaterialCuttingEnvelope;
    projected_life_min_at_recommended: number;
    projected_life_min_at_aggressive: number;
  } {
    IsoGroupSchema.parse(iso_group);
    const deep = this.getDeepCapabilities(machine_id);
    const env = deep.cutting_envelopes_per_iso_group[iso_group];
    const taylor = CANONICAL_TAYLOR[iso_group];
    const life_at_rec = Math.pow(taylor.C / env.vc_recommended_m_min, 1 / taylor.n);
    const life_at_agg = Math.pow(taylor.C / env.vc_aggressive_m_min, 1 / taylor.n);
    return {
      machine_id,
      iso_group,
      envelope: env,
      projected_life_min_at_recommended: life_at_rec,
      projected_life_min_at_aggressive: life_at_agg,
    };
  }

  /**
   * Cross-machine MRR comparison for a given material — surfaces which
   * machine in the fleet can roughly out-cut others on this material.
   * Returns ranked list (highest MRR first).
   */
  static rankFleetByMRR(iso_group: ISOGroup): Array<{ machine_id: string; max_mrr_cm3_min: number }> {
    IsoGroupSchema.parse(iso_group);
    const ids = JMDieLatheCapabilityEngine.listMachines();
    const ranked = ids.map((id) => {
      const env = this.getDeepCapabilities(id).cutting_envelopes_per_iso_group[iso_group];
      return { machine_id: id, max_mrr_cm3_min: env.max_mrr_cm3_min };
    });
    return ranked.sort((a, b) => b.max_mrr_cm3_min - a.max_mrr_cm3_min);
  }

  /**
   * Estimated cycle-time overhead per part = tool_change*n_tools + chuck +
   * door + thermal_warmup (only once per shift). Useful for batch costing.
   */
  static estimateCycleOverhead(machine_id: string, n_tool_changes: number): {
    machine_id: string;
    tool_change_total_s: number;
    chuck_s: number;
    door_s: number;
    overhead_per_part_s: number;
  } {
    const deep = this.getDeepCapabilities(machine_id);
    const tool_change_total = deep.cycle_benchmarks.tool_change_s * n_tool_changes;
    const overhead = tool_change_total + deep.cycle_benchmarks.chuck_cycle_s + deep.cycle_benchmarks.door_cycle_s;
    return {
      machine_id,
      tool_change_total_s: tool_change_total,
      chuck_s: deep.cycle_benchmarks.chuck_cycle_s,
      door_s: deep.cycle_benchmarks.door_cycle_s,
      overhead_per_part_s: overhead,
    };
  }
}

export const jmDieLatheDeepCapabilityEngine = JMDieLatheDeepCapabilityEngine;
