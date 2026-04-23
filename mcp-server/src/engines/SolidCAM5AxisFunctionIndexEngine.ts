/**
 * SolidCAM5AxisFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM36
 *
 * Function index engine for the SolidCAM 5-axis catalog. Provides typed
 * access to operations, parameter groups, category filtering, plus three
 * physics-grounded helpers:
 *
 *   recommendByFeature  — feature-type → operation_id routing
 *   validateAxisChange  — kinematic check: rotary velocity vs machine limit
 *   singularityCheck    — flags tilt angles too close to a rotary singularity pole
 *
 * No inline physics constants — all kinematic checks operate on caller-
 * supplied machine parameters; thresholds documented at usage site.
 *
 * Reference:
 *   - Tsutsumi & Saito, "5-Axis Singularity Avoidance" — JSME, 2003
 *   - SolidCAM 5-Axis training material, Sandvik Coromant turbomachining guide
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SolidCAM5AxisParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

export interface SolidCAM5AxisOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, SolidCAM5AxisParameter>>;
}

export interface SolidCAM5AxisSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SolidCAM5AxisOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface FiveAxisOperationSummary {
  operation_id: string;
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

export type FiveAxisFeature =
  | "indexed_face"
  | "ruled_wall"
  | "freeform_pocket"
  | "impeller_blade"
  | "blisk_blade"
  | "intake_port"
  | "exhaust_port"
  | "undercut_relief"
  | "t_slot"
  | "deep_cavity_with_focal_point"
  | "fan_cavity_with_guide_curve"
  | "between_curves";

export class SolidCAM5AxisFunctionIndexEngine {
  private static section: SolidCAM5AxisSection | null = null;

  private static readonly DATA_PATH = join(
    __dirname,
    "../../data/cam-functions/solidcam/5-axis.json"
  );

  private static loadSection(): SolidCAM5AxisSection | null {
    if (this.section) return this.section;
    if (!existsSync(this.DATA_PATH)) return null;
    try {
      this.section = JSON.parse(
        readFileSync(this.DATA_PATH, "utf-8")
      ) as SolidCAM5AxisSection;
      return this.section;
    } catch {
      return null;
    }
  }

  /** Return the full catalog section. */
  static getIndex(): SolidCAM5AxisSection | { error: string } {
    const section = this.loadSection();
    if (!section) return { error: "SolidCAM 5-axis data not found" };
    return section;
  }

  /** Summary: counts and categories. */
  static getSummary():
    | {
        system_id: string;
        section_key: string;
        total_operations: number;
        total_parameters: number;
        categories: string[];
        training_topics_count: number;
      }
    | { error: string } {
    const s = this.loadSection();
    if (!s) return { error: "SolidCAM 5-axis data not found" };
    return {
      system_id: s.system_id,
      section_key: s.section_key,
      total_operations: s.summary.total_operations,
      total_parameters: s.summary.total_parameters,
      categories: s.summary.categories,
      training_topics_count: s.training_topics.length,
    };
  }

  /** All operations as id → summary. */
  static listOperations(): FiveAxisOperationSummary[] | { error: string } {
    const s = this.loadSection();
    if (!s) return { error: "SolidCAM 5-axis data not found" };
    return Object.entries(s.operations).map(([id, op]) => ({
      operation_id: id,
      display_name: op.display_name,
      category: op.category,
      parameter_count: op.parameter_count,
      description: op.description,
    }));
  }

  /** Single operation by id. */
  static getOperation(
    operationId: string
  ): SolidCAM5AxisOperation | { error: string } {
    const s = this.loadSection();
    if (!s) return { error: "SolidCAM 5-axis data not found" };
    const op = s.operations[operationId];
    if (!op) {
      const available = Object.keys(s.operations).join(", ");
      return {
        error: `Operation '${operationId}' not found. Available: ${available}`,
      };
    }
    return op;
  }

  /** Operations in a given category (case-insensitive). */
  static getOperationsByCategory(
    category: string
  ): FiveAxisOperationSummary[] | { error: string } {
    const s = this.loadSection();
    if (!s) return { error: "SolidCAM 5-axis data not found" };
    const lower = category.toLowerCase();
    const out: FiveAxisOperationSummary[] = [];
    Object.entries(s.operations).forEach(([id, op]) => {
      if (op.category.toLowerCase() === lower) {
        out.push({
          operation_id: id,
          display_name: op.display_name,
          category: op.category,
          parameter_count: op.parameter_count,
          description: op.description,
        });
      }
    });
    return out;
  }

  /** Substring search on parameter names; returns at most `limit` hits. */
  static findParameter(
    parameterName: string,
    limit = 20
  ): Array<{
    operation_id: string;
    group: string;
    parameter_name: string;
    parameter: SolidCAM5AxisParameter;
  }> {
    const s = this.loadSection();
    if (!s) return [];
    const out: Array<{
      operation_id: string;
      group: string;
      parameter_name: string;
      parameter: SolidCAM5AxisParameter;
    }> = [];
    const lower = parameterName.toLowerCase();
    for (const [opId, op] of Object.entries(s.operations)) {
      for (const [groupName, group] of Object.entries(op.parameters)) {
        for (const [pName, p] of Object.entries(group)) {
          if (pName.toLowerCase().includes(lower)) {
            out.push({
              operation_id: opId,
              group: groupName,
              parameter_name: pName,
              parameter: p,
            });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  /** All training topics. */
  static getTrainingTopics(): Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }> {
    const s = this.loadSection();
    if (!s) return [];
    return s.training_topics;
  }

  /** Category breakdown with op count + total parameters per category. */
  static getCategoryBreakdown(): Array<{
    category: string;
    operations: string[];
    total_parameters: number;
  }> {
    const s = this.loadSection();
    if (!s) return [];
    const map = new Map<string, { ops: string[]; params: number }>();
    for (const [id, op] of Object.entries(s.operations)) {
      if (!map.has(op.category)) map.set(op.category, { ops: [], params: 0 });
      const e = map.get(op.category)!;
      e.ops.push(id);
      e.params += op.parameter_count;
    }
    return Array.from(map.entries()).map(([cat, d]) => ({
      category: cat,
      operations: d.ops,
      total_parameters: d.params,
    }));
  }

  /**
   * Recommend a 5-axis operation for a given feature type.
   * Pure deterministic mapping; no statistical model.
   *
   * @param feature One of {@link FiveAxisFeature}
   * @returns primary + alternative op ids and the reason for the pick
   */
  static recommendByFeature(
    feature: FiveAxisFeature
  ): { primary: string; alternative: string; reason: string } {
    switch (feature) {
      case "indexed_face":
        return {
          primary: "5x_indexed_3plus2",
          alternative: "5x_normal_to_surface",
          reason:
            "Single tilt orientation reaches the face — 3+2 reuses 3-axis logic and locks rotaries for rigidity.",
        };
      case "ruled_wall":
        return {
          primary: "5x_swarf",
          alternative: "5x_drive_surface",
          reason:
            "Ruled surface allows flank-tangent (swarf) cutting — single pass per height removes the wall.",
        };
      case "freeform_pocket":
        return {
          primary: "5x_normal_to_surface",
          alternative: "5x_parallel_to_surface",
          reason:
            "Freeform with no special axis constraint — normal-to-surface gives simplest motion.",
        };
      case "impeller_blade":
      case "blisk_blade":
        return {
          primary: "5x_multiblade",
          alternative: "5x_swarf",
          reason:
            "Bladed-disk specialty: multiblade automates the rotational pattern; swarf is fallback for ruled flanks only.",
        };
      case "intake_port":
      case "exhaust_port":
        return {
          primary: "5x_port",
          alternative: "5x_through_curve",
          reason:
            "Internal port machining requires lollipop tool with axis along centerline; through-curve is the manual fallback.",
        };
      case "undercut_relief":
      case "t_slot":
        return {
          primary: "5x_undercut",
          alternative: "5x_indexed_3plus2",
          reason:
            "Undercut clearance requires axis tilt; indexed 3+2 only works if tilt can be locked for the entire feature.",
        };
      case "deep_cavity_with_focal_point":
        return {
          primary: "5x_through_point",
          alternative: "5x_drive_surface",
          reason:
            "Cone-symmetric cavity with a single focal point — through-point keeps tool axis pointing through that point.",
        };
      case "fan_cavity_with_guide_curve":
        return {
          primary: "5x_through_curve",
          alternative: "5x_drive_surface",
          reason:
            "Fan cavity with continuously varying focal axis — through-curve uses the designer-supplied guide.",
        };
      case "between_curves":
        return {
          primary: "5x_morph",
          alternative: "5x_parallel_to_curve",
          reason:
            "Two boundary curves available — morph interpolates passes between them.",
        };
      default:
        return {
          primary: "5x_normal_to_surface",
          alternative: "5x_indexed_3plus2",
          reason:
            "Unknown feature — defaulting to safest simultaneous option (normal-to-surface).",
        };
    }
  }

  /**
   * Validate that the rotary axes can keep up with a programmed feed rate.
   *
   *   rotary_velocity_deg_per_sec = axis_change_deg_per_mm × (feed_mm_per_min / 60)
   *
   * Flags `withinLimit=false` if the computed velocity exceeds the supplied
   * machine_max_rotary_deg_per_sec. Reference: Tsutsumi & Saito, JSME 2003.
   *
   * @param feedRateMmPerMin    Programmed feed (linear) in mm/min
   * @param axisChangeDegPerMm  Rotary delta per linear mm (from CAM analysis)
   * @param machineMaxRotaryDegPerSec Max rotary servo velocity from machine spec
   */
  static validateAxisChange(
    feedRateMmPerMin: number,
    axisChangeDegPerMm: number,
    machineMaxRotaryDegPerSec: number
  ):
    | {
        rotary_velocity_deg_per_sec: number;
        machine_limit_deg_per_sec: number;
        utilization: number;
        within_limit: boolean;
        recommended_max_feed_mm_per_min: number | null;
      }
    | { error: string } {
    if (
      !Number.isFinite(feedRateMmPerMin) ||
      !Number.isFinite(axisChangeDegPerMm) ||
      !Number.isFinite(machineMaxRotaryDegPerSec) ||
      feedRateMmPerMin <= 0 ||
      axisChangeDegPerMm < 0 ||
      machineMaxRotaryDegPerSec <= 0
    ) {
      return {
        error:
          "Inputs must be finite, feed > 0, axis_change >= 0, machine_max > 0",
      };
    }
    const rotaryVel = axisChangeDegPerMm * (feedRateMmPerMin / 60);
    const utilization = rotaryVel / machineMaxRotaryDegPerSec;
    const within = rotaryVel <= machineMaxRotaryDegPerSec;
    const recommendedMaxFeed =
      axisChangeDegPerMm > 0
        ? (machineMaxRotaryDegPerSec * 60) / axisChangeDegPerMm
        : null;
    return {
      rotary_velocity_deg_per_sec: rotaryVel,
      machine_limit_deg_per_sec: machineMaxRotaryDegPerSec,
      utilization,
      within_limit: within,
      recommended_max_feed_mm_per_min: recommendedMaxFeed,
    };
  }

  /**
   * Detect proximity to a 5-axis singularity pole.
   *
   * The classic singularity on a B/C machine is when the tool axis aligns
   * with the C (table) axis — i.e. the tool is purely vertical (tilt = 0°).
   * On A/C head machines, the pole is at A = 0°. Either way, we compute the
   * angular distance from the supplied `tiltDeg` to the nearest pole at 0°
   * or 180° and flag risk by zone.
   *
   *   distance_deg = min(|tilt|, |180 - tilt|)
   *
   * Risk zones (industry rule of thumb, SolidCAM training):
   *   < 1°   → critical, controller may swing rotaries 180°
   *   1-3°   → warning, expect axis acceleration spikes
   *   3-10°  → caution, monitor first part
   *   ≥ 10°  → safe
   *
   * @param tiltDeg  Tool axis tilt from machine pole (0-180 degrees)
   */
  static singularityCheck(
    tiltDeg: number
  ):
    | {
        distance_to_pole_deg: number;
        risk: "critical" | "warning" | "caution" | "safe";
        recommendation: string;
      }
    | { error: string } {
    if (!Number.isFinite(tiltDeg)) {
      return { error: "tiltDeg must be a finite number" };
    }
    // Wrap into [0, 360) then collapse to [0, 180]
    const wrapped = ((tiltDeg % 360) + 360) % 360;
    const folded = wrapped > 180 ? 360 - wrapped : wrapped;
    const distance = Math.min(folded, 180 - folded);

    let risk: "critical" | "warning" | "caution" | "safe";
    let rec: string;
    if (distance < 1) {
      risk = "critical";
      rec =
        "At pole — controller may swing rotaries 180° on small motions. Tilt at least 3° away.";
    } else if (distance < 3) {
      risk = "warning";
      rec = "Within 3° of pole — expect rotary acceleration spikes. Consider tilting 5°+ for production.";
    } else if (distance < 10) {
      risk = "caution";
      rec =
        "Within 10° of pole — acceptable for finishing but monitor first part for witness marks.";
    } else {
      risk = "safe";
      rec = "Comfortably away from pole — no singularity risk at this tilt.";
    }
    return { distance_to_pole_deg: distance, risk, recommendation: rec };
  }
}

export const solidCAM5AxisFunctionIndexEngine = SolidCAM5AxisFunctionIndexEngine;
