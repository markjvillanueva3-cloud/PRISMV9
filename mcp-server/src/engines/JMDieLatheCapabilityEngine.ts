/**
 * JMDieLatheCapabilityEngine.ts
 * ==============================
 *
 * Per-machine capability query + PSN-synergy assessment + comparator
 * + upgrade-path recommender for the 7 JM Die Okuma lathes.
 *
 * MIKE /goal session (2026-05-24) — answers the user-named clauses:
 *   "assess JM die fleet synergy to PSN"
 *   "ensure all relevant data pertaining to each machine's capabilities"
 *   "final objective: assess and enhance current enhanced versions of all
 *    lathe programs in the jm die system"
 *
 * COORDINATION NOTE — echo currently owns .cps post edits. This engine ships
 * the capability-data SUBSTRATE echo consumes; it does NOT touch .cps files
 * itself. Bravo (lathe-domain owner) consumes this for OKUMA_LATHE_*.hsmlib
 * seeding paired with the Fusion-catalog backbone.
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit      U-MIKE-LATHE-CAPABILITY-ENGINE
 * @slot      mike
 */

import { z } from "zod";
import {
  JM_DIE_LATHE_CAPABILITIES,
  JM_DIE_LATHE_IDS,
  type LatheCapabilityProfile,
  type EnhancementTier,
} from "../data/jm-die-lathe-capabilities.js";

// ============================================================================
// TYPES
// ============================================================================

export type CapabilityAxis =
  | "work_envelope"
  | "axis_travel"
  | "spindle"
  | "accuracy"
  | "rapids"
  | "osp_coding"
  | "advanced_features"
  | "time_saving_features"
  | "efficiency_features"
  | "auto_adjustment_features";

export interface AxisSynergyScore {
  axis: CapabilityAxis;
  populated_fields: number;
  total_fields: number;
  coverage: number; // [0, 1]
  null_fields: string[];
}

export interface PSNSynergyAssessment {
  machine_id: string;
  machine_name: string;
  per_axis_coverage: AxisSynergyScore[];
  total_coverage: number;       // mean of per-axis coverage [0, 1]
  total_fields_present: number;
  total_fields_possible: number;
  enhancement_tier: EnhancementTier;
  controller_upgrade_ceiling: "post_only" | "post_plus_software" | "post_plus_software_plus_hardware";
  upgrade_path: string[];
  gaps: string[];
}

export interface FleetSynergyRollup {
  fleet_total_coverage: number;     // mean of per-machine total_coverage
  per_machine: PSNSynergyAssessment[];
  fleet_axis_coverage: Record<CapabilityAxis, number>; // mean per axis across fleet
  weakest_axis: CapabilityAxis;
  weakest_machine: string;
  total_fields_present: number;
  total_fields_possible: number;
}

export interface CapabilityComparison {
  machine_a: string;
  machine_b: string;
  per_axis_delta: Array<{
    axis: CapabilityAxis;
    field: string;
    a_value: unknown;
    b_value: unknown;
    delta_pct: number | null;
  }>;
  summary: string;
}

// ============================================================================
// ZOD SCHEMAS (R12 fail-loud)
// ============================================================================

export const MachineIdSchema = z.string().regex(/^LTH-\d{2}$/, "machine_id must match LTH-NN");

const VALID_AXES: CapabilityAxis[] = [
  "work_envelope",
  "axis_travel",
  "spindle",
  "accuracy",
  "rapids",
  "osp_coding",
  "advanced_features",
  "time_saving_features",
  "efficiency_features",
  "auto_adjustment_features",
];

// ============================================================================
// ENGINE
// ============================================================================

export class JMDieLatheCapabilityEngine {
  /**
   * Get one machine's full capability profile.
   * @throws if machine_id is unknown (R12 fail-loud)
   */
  static getMachine(machine_id: string): LatheCapabilityProfile {
    MachineIdSchema.parse(machine_id);
    const profile = JM_DIE_LATHE_CAPABILITIES[machine_id];
    if (!profile) {
      throw new Error(`JM Die lathe ${machine_id} not found. Known: ${JM_DIE_LATHE_IDS.join(", ")}`);
    }
    return profile;
  }

  /** List every lathe id in the fleet (deterministic order). */
  static listMachines(): ReadonlyArray<string> {
    return JM_DIE_LATHE_IDS;
  }

  /**
   * Count populated vs total fields in one axis object. Treats null + undefined
   * as missing; everything else (incl. false, 0, "") counts as populated.
   */
  private static countAxisCoverage(axis: CapabilityAxis, value: Record<string, unknown>): AxisSynergyScore {
    const entries = Object.entries(value);
    const total_fields = entries.length;
    const null_fields = entries.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
    const populated_fields = total_fields - null_fields.length;
    return {
      axis,
      populated_fields,
      total_fields,
      coverage: total_fields === 0 ? 0 : populated_fields / total_fields,
      null_fields,
    };
  }

  /**
   * Assess one machine's PSN synergy — what fraction of each capability axis
   * is populated (vs null/unverified).
   */
  static assessPSNSynergy(machine_id: string): PSNSynergyAssessment {
    const m = this.getMachine(machine_id);
    const per_axis_coverage: AxisSynergyScore[] = [
      this.countAxisCoverage("work_envelope",            m.work_envelope as unknown as Record<string, unknown>),
      this.countAxisCoverage("axis_travel",              m.axis_travel as unknown as Record<string, unknown>),
      this.countAxisCoverage("spindle",                  m.spindle as unknown as Record<string, unknown>),
      this.countAxisCoverage("accuracy",                 m.accuracy as unknown as Record<string, unknown>),
      this.countAxisCoverage("rapids",                   m.rapids as unknown as Record<string, unknown>),
      this.countAxisCoverage("osp_coding",               m.osp_coding as unknown as Record<string, unknown>),
      this.countAxisCoverage("advanced_features",        m.advanced_features as unknown as Record<string, unknown>),
      this.countAxisCoverage("time_saving_features",     m.time_saving_features as unknown as Record<string, unknown>),
      this.countAxisCoverage("efficiency_features",      m.efficiency_features as unknown as Record<string, unknown>),
      this.countAxisCoverage("auto_adjustment_features", m.auto_adjustment_features as unknown as Record<string, unknown>),
    ];
    const total_coverage = per_axis_coverage.reduce((s, a) => s + a.coverage, 0) / per_axis_coverage.length;
    const total_fields_present = per_axis_coverage.reduce((s, a) => s + a.populated_fields, 0);
    const total_fields_possible = per_axis_coverage.reduce((s, a) => s + a.total_fields, 0);
    // Controller-upgrade ceiling — drives the upgrade-path decision
    let controller_upgrade_ceiling: PSNSynergyAssessment["controller_upgrade_ceiling"];
    if (!m.advanced_features.imachining && !m.advanced_features.ai_adaptive_feedrate) {
      controller_upgrade_ceiling = "post_plus_software_plus_hardware"; // U10L — needs controller swap
    } else if (m.enhancement_tier === "fully_enhanced") {
      controller_upgrade_ceiling = "post_only";                        // already at peak post; small refinements only
    } else {
      controller_upgrade_ceiling = "post_plus_software";               // post upgrade + software-side iMachining wiring
    }
    const upgrade_path: string[] = [];
    if (controller_upgrade_ceiling === "post_plus_software_plus_hardware") {
      upgrade_path.push("HARDWARE: controller swap required (OSP-U10L is legacy; iMachining/AI-adaptive not executable)");
      upgrade_path.push("INTERIM: post-only optimizations within U10L envelope (chip-control patterns, dwell-on-thread, manual feed-override macros)");
    } else if (controller_upgrade_ceiling === "post_plus_software") {
      if (!m.post_processor.includes("Ai-Enhanced")) {
        upgrade_path.push(`POST: rebuild ${m.post_processor} with -Ai-Enhanced suffix (echo lane)`);
      }
      if (!m.post_processor.includes("iMachining")) {
        upgrade_path.push(`POST: add iMachining chip-thinning markers to .cps (echo lane)`);
      }
      if (!m.advanced_features.collision_avoidance_system) {
        upgrade_path.push("SOFTWARE: enable Collision Avoidance System on controller");
      }
    } else {
      upgrade_path.push("REFINEMENT: per-job tuning via auto-adjustment features (ai-adaptive feedrate)");
    }
    const gaps: string[] = [];
    for (const axis of per_axis_coverage) {
      if (axis.coverage < 1.0) {
        gaps.push(`${axis.axis}: missing ${axis.null_fields.join(", ")}`);
      }
    }
    return {
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      per_axis_coverage,
      total_coverage,
      total_fields_present,
      total_fields_possible,
      enhancement_tier: m.enhancement_tier,
      controller_upgrade_ceiling,
      upgrade_path,
      gaps,
    };
  }

  /**
   * Roll up fleet-wide synergy across all 7 lathes.
   */
  static assessFleetSynergy(): FleetSynergyRollup {
    const per_machine = JM_DIE_LATHE_IDS.map((id) => this.assessPSNSynergy(id));
    const fleet_total_coverage = per_machine.reduce((s, m) => s + m.total_coverage, 0) / per_machine.length;
    const fleet_axis_coverage = {} as Record<CapabilityAxis, number>;
    for (const axis of VALID_AXES) {
      const sum = per_machine.reduce((s, m) => {
        const a = m.per_axis_coverage.find((x) => x.axis === axis);
        return s + (a ? a.coverage : 0);
      }, 0);
      fleet_axis_coverage[axis] = sum / per_machine.length;
    }
    // Weakest axis = lowest fleet-mean coverage
    const weakest_axis = VALID_AXES.reduce((min, a) =>
      fleet_axis_coverage[a] < fleet_axis_coverage[min] ? a : min,
    );
    // Weakest machine = lowest total_coverage
    const weakest_machine = per_machine.reduce((min, m) =>
      m.total_coverage < min.total_coverage ? m : min,
    ).machine_id;
    const total_fields_present = per_machine.reduce((s, m) => s + m.total_fields_present, 0);
    const total_fields_possible = per_machine.reduce((s, m) => s + m.total_fields_possible, 0);
    return {
      fleet_total_coverage,
      per_machine,
      fleet_axis_coverage,
      weakest_axis,
      weakest_machine,
      total_fields_present,
      total_fields_possible,
    };
  }

  /**
   * Compare two machines across every numeric capability field, returning
   * the per-field delta and a delta_pct for numerics.
   */
  static compareCapabilities(machine_a: string, machine_b: string): CapabilityComparison {
    const a = this.getMachine(machine_a);
    const b = this.getMachine(machine_b);
    const per_axis_delta: CapabilityComparison["per_axis_delta"] = [];
    const numericAxes: CapabilityAxis[] = ["work_envelope", "axis_travel", "spindle", "accuracy", "rapids"];
    for (const axis of numericAxes) {
      const aObj = (a as unknown as Record<CapabilityAxis, Record<string, unknown>>)[axis];
      const bObj = (b as unknown as Record<CapabilityAxis, Record<string, unknown>>)[axis];
      for (const key of Object.keys(aObj)) {
        const av = aObj[key];
        const bv = bObj[key];
        let delta_pct: number | null = null;
        if (typeof av === "number" && typeof bv === "number" && av !== 0) {
          delta_pct = ((bv - av) / av) * 100;
        }
        if (av !== bv) {
          per_axis_delta.push({ axis, field: key, a_value: av, b_value: bv, delta_pct });
        }
      }
    }
    const summary = `${a.machine_name} vs ${b.machine_name}: ${per_axis_delta.length} differing numeric fields`;
    return { machine_a, machine_b, per_axis_delta, summary };
  }

  /**
   * Recommend which machine to upgrade FIRST based on:
   *   - is the controller upgradeable at all (post_only / +software / +hardware)
   *   - how far from peak the current tier is (plain > partial > full)
   * Returns ordered list, highest-leverage first.
   */
  static recommendUpgradeOrder(): Array<{ machine_id: string; rank: number; reason: string }> {
    const ranked = JM_DIE_LATHE_IDS.map((id) => {
      const a = this.assessPSNSynergy(id);
      // Score: higher = more reason to upgrade soon
      let score = 0;
      if (a.enhancement_tier === "plain") score += 3;
      else if (a.enhancement_tier === "partially_enhanced") score += 1;
      if (a.controller_upgrade_ceiling === "post_plus_software") score += 2; // post upgrade is software-cheap
      else if (a.controller_upgrade_ceiling === "post_plus_software_plus_hardware") score -= 2; // hardware = capex defer
      return {
        machine_id: id,
        score,
        reason: `tier=${a.enhancement_tier}, ceiling=${a.controller_upgrade_ceiling}`,
      };
    }).sort((x, y) => y.score - x.score);
    return ranked.map((r, i) => ({ machine_id: r.machine_id, rank: i + 1, reason: r.reason }));
  }
}

export const jmDieLatheCapabilityEngine = JMDieLatheCapabilityEngine;
