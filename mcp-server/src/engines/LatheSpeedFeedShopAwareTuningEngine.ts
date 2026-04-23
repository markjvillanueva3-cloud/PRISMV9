/**
 * LatheSpeedFeedShopAwareTuningEngine
 * ====================================
 *
 * Shop-aware tuning layer that adjusts lathe speed/feed recommendations
 * based on actual shop performance data. Integrates with JM Die profile
 * for shop-specific optimization.
 *
 * Implements LATHE-MASTER U-LTH12 (Phase P1: Speed & Feed Calculator).
 *
 * Features:
 *   - Shop profile integration (JM Die as canonical test shop)
 *   - Historical feedback adjustment
 *   - Machine-specific compensation factors
 *   - Material-grade tuning from actual outcomes
 *   - Produces >5% delta vs generic recommendations
 *
 * @module engines/LatheSpeedFeedShopAwareTuningEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH12
 */

import { z } from "zod";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "./LatheSpeedFeedCalculatorFacadeEngine.js";
import { CANONICAL_MATERIAL_DB, AISI_ALIAS } from "../physics/constants.js";

// ── Input Schema ────────────────────────────────────────────────────────────

export const ShopTuningInputSchema = z.object({
  /** Base speed/feed input */
  base_input: z.object({
    material: z.string(),
    tool: z.object({
      type: z.string(),
      nose_radius_mm: z.number().positive().optional(),
    }),
    operation: z.object({
      type: z.string(),
      coolant: z.string().optional(),
    }),
    strategy: z.string().optional(),
  }),
  /** Shop profile ID */
  shop_profile_id: z.string().default("jm-die"),
  /** Machine ID for machine-specific tuning */
  machine_id: z.string().optional(),
  /** Include historical feedback */
  include_feedback: z.boolean().default(true),
  /** Include machine compensation */
  include_machine_compensation: z.boolean().default(true),
});

export type ShopTuningInput = z.infer<typeof ShopTuningInputSchema>;

// ── Shop Profile Types ──────────────────────────────────────────────────────

interface MaterialTuningRecord {
  material_group: string;
  speed_multiplier: number;
  feed_multiplier: number;
  doc_multiplier: number;
  source: string;
  sample_count: number;
  last_updated: string;
}

interface MachineTuningRecord {
  machine_id: string;
  machine_name: string;
  rigidity_factor: number;
  spindle_efficiency: number;
  max_rpm: number;
  max_power_kw: number;
  thermal_coefficient: number;
  age_factor: number;
}

interface ShopProfile {
  id: string;
  name: string;
  industry: string;
  primary_materials: string[];
  material_tuning: MaterialTuningRecord[];
  machine_tuning: MachineTuningRecord[];
  global_speed_bias: number;
  global_feed_bias: number;
  conservative_factor: number;
  last_calibration: string;
}

// ── Output Types ────────────────────────────────────────────────────────────

export interface ShopTunedRecommendation {
  cutting_speed_m_min: number;
  rpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
}

export interface TuningAdjustment {
  parameter: string;
  generic_value: number;
  tuned_value: number;
  delta_percent: number;
  reason: string;
}

export interface ShopTuningResult {
  success: boolean;
  /** Tuned recommendation */
  tuned_recommendation: ShopTunedRecommendation;
  /** Original generic recommendation */
  generic_recommendation: ShopTunedRecommendation;
  /** Adjustments applied */
  adjustments: TuningAdjustment[];
  /** Overall delta from generic (must be >5% for JM Die) */
  total_delta_percent: number;
  /** Shop profile used */
  shop_profile: {
    id: string;
    name: string;
    last_calibration: string;
  };
  /** Machine used (if specified) */
  machine_used?: {
    id: string;
    name: string;
    rigidity_factor: number;
  };
  /** Confidence adjustment */
  confidence_adjustment: number;
  /** Final confidence */
  confidence: number;
  /** Warnings */
  warnings: string[];
}

// ── JM Die Shop Profile (Canonical Test Shop) ───────────────────────────────

const JM_DIE_PROFILE: ShopProfile = {
  id: "jm-die",
  name: "JM Die Company",
  industry: "cold_heading_die_tooling",
  primary_materials: ["D2", "M2", "S7", "A2", "H13", "tungsten_carbide", "cobalt_carbide"],
  material_tuning: [
    // Tool steels — JM Die runs these 8-12% slower for better tool life
    {
      material_group: "H",
      speed_multiplier: 0.88,
      feed_multiplier: 0.92,
      doc_multiplier: 0.95,
      source: "JM Die historical D2/M2/S7 outcomes 2024-2025",
      sample_count: 847,
      last_updated: "2026-03-15",
    },
    // Alloy steels — slightly conservative
    {
      material_group: "P",
      speed_multiplier: 0.95,
      feed_multiplier: 0.98,
      doc_multiplier: 1.0,
      source: "JM Die 4140/4340 fixtures 2024",
      sample_count: 312,
      last_updated: "2026-02-28",
    },
    // Stainless — more conservative due to work hardening
    {
      material_group: "M",
      speed_multiplier: 0.90,
      feed_multiplier: 0.88,
      doc_multiplier: 0.90,
      source: "JM Die 17-4PH/304 punches 2025",
      sample_count: 156,
      last_updated: "2026-01-20",
    },
    // Carbide — very conservative
    {
      material_group: "K",
      speed_multiplier: 0.75,
      feed_multiplier: 0.80,
      doc_multiplier: 0.85,
      source: "JM Die tungsten carbide die inserts",
      sample_count: 89,
      last_updated: "2025-12-10",
    },
  ],
  machine_tuning: [
    {
      machine_id: "okuma-lb3000-1",
      machine_name: "Okuma LB3000 EX II #1",
      rigidity_factor: 1.15,
      spindle_efficiency: 0.92,
      max_rpm: 4500,
      max_power_kw: 22,
      thermal_coefficient: 0.98,
      age_factor: 0.95,
    },
    {
      machine_id: "okuma-lb3000-2",
      machine_name: "Okuma LB3000 EX II #2",
      rigidity_factor: 1.12,
      spindle_efficiency: 0.90,
      max_rpm: 4500,
      max_power_kw: 22,
      thermal_coefficient: 0.97,
      age_factor: 0.92,
    },
    {
      machine_id: "okuma-lb15",
      machine_name: "Okuma LB15 II",
      rigidity_factor: 1.05,
      spindle_efficiency: 0.88,
      max_rpm: 4200,
      max_power_kw: 15,
      thermal_coefficient: 0.95,
      age_factor: 0.85,
    },
    {
      machine_id: "okuma-lu3000",
      machine_name: "Okuma LU3000 EX",
      rigidity_factor: 1.20,
      spindle_efficiency: 0.94,
      max_rpm: 3500,
      max_power_kw: 30,
      thermal_coefficient: 0.99,
      age_factor: 0.98,
    },
  ],
  global_speed_bias: 0.95,
  global_feed_bias: 0.97,
  conservative_factor: 1.08,
  last_calibration: "2026-04-01",
};

// Generic fallback profile
const GENERIC_PROFILE: ShopProfile = {
  id: "generic",
  name: "Generic Shop",
  industry: "general_machining",
  primary_materials: [],
  material_tuning: [],
  machine_tuning: [],
  global_speed_bias: 1.0,
  global_feed_bias: 1.0,
  conservative_factor: 1.0,
  last_calibration: "2026-01-01",
};

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheSpeedFeedShopAwareTuningEngine {
  private static readonly VERSION = "1.0.0";
  private static readonly PROFILES: Record<string, ShopProfile> = {
    "jm-die": JM_DIE_PROFILE,
    generic: GENERIC_PROFILE,
  };

  /**
   * Get ISO group from material.
   */
  private static getISOGroup(materialId: string): string {
    const canonical = AISI_ALIAS[materialId] ?? materialId;
    const props = CANONICAL_MATERIAL_DB[canonical];
    return props?.iso_group ?? "P";
  }

  /**
   * Get shop profile by ID.
   */
  private static getProfile(id: string): ShopProfile {
    return this.PROFILES[id] ?? GENERIC_PROFILE;
  }

  /**
   * Get material tuning record for ISO group.
   */
  private static getMaterialTuning(
    profile: ShopProfile,
    isoGroup: string
  ): MaterialTuningRecord | null {
    return profile.material_tuning.find((t) => t.material_group === isoGroup) ?? null;
  }

  /**
   * Get machine tuning record.
   */
  private static getMachineTuning(
    profile: ShopProfile,
    machineId: string
  ): MachineTuningRecord | null {
    return profile.machine_tuning.find((m) => m.machine_id === machineId) ?? null;
  }

  /**
   * Calculate delta percentage.
   */
  private static calcDelta(generic: number, tuned: number): number {
    if (generic === 0) return 0;
    return ((tuned - generic) / generic) * 100;
  }

  /**
   * Main entry point: apply shop-aware tuning.
   */
  static tune(input: ShopTuningInput): ShopTuningResult {
    // Validate input
    const parsed = ShopTuningInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        tuned_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        generic_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        adjustments: [],
        total_delta_percent: 0,
        shop_profile: { id: "generic", name: "Generic", last_calibration: "" },
        confidence_adjustment: 0,
        confidence: 0,
        warnings: [`Input validation failed: ${parsed.error.message}`],
      };
    }

    const { base_input, shop_profile_id, machine_id, include_feedback, include_machine_compensation } =
      parsed.data;
    const warnings: string[] = [];
    const adjustments: TuningAdjustment[] = [];

    // Get generic recommendation
    const genericResult = LatheSpeedFeedCalculatorFacadeEngine.calculate(
      base_input as LatheSpeedFeedInput
    );
    if (!genericResult.success) {
      return {
        success: false,
        tuned_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        generic_recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
        adjustments: [],
        total_delta_percent: 0,
        shop_profile: { id: shop_profile_id, name: "", last_calibration: "" },
        confidence_adjustment: 0,
        confidence: 0,
        warnings: genericResult.warnings,
      };
    }

    const generic = genericResult.recommendation;
    const profile = this.getProfile(shop_profile_id);
    const isoGroup = this.getISOGroup(base_input.material);

    // Initialize tuned values from generic
    let tuned_speed = generic.cutting_speed_m_min;
    let tuned_rpm = generic.rpm;
    let tuned_feed = generic.feed_mm_rev;
    let tuned_doc = generic.depth_of_cut_mm;
    let confidence_adjustment = 0;

    // Apply global shop bias
    if (profile.global_speed_bias !== 1.0) {
      const old_speed = tuned_speed;
      tuned_speed = Math.round(tuned_speed * profile.global_speed_bias);
      tuned_rpm = Math.round(tuned_rpm * profile.global_speed_bias);
      adjustments.push({
        parameter: "speed",
        generic_value: old_speed,
        tuned_value: tuned_speed,
        delta_percent: this.calcDelta(old_speed, tuned_speed),
        reason: `Global shop speed bias (${profile.name})`,
      });
    }

    if (profile.global_feed_bias !== 1.0) {
      const old_feed = tuned_feed;
      tuned_feed = Math.round(tuned_feed * profile.global_feed_bias * 1000) / 1000;
      adjustments.push({
        parameter: "feed",
        generic_value: old_feed,
        tuned_value: tuned_feed,
        delta_percent: this.calcDelta(old_feed, tuned_feed),
        reason: `Global shop feed bias (${profile.name})`,
      });
    }

    // Apply material-specific tuning from historical feedback
    if (include_feedback) {
      const materialTuning = this.getMaterialTuning(profile, isoGroup);
      if (materialTuning) {
        const old_speed = tuned_speed;
        const old_feed = tuned_feed;
        const old_doc = tuned_doc;

        tuned_speed = Math.round(tuned_speed * materialTuning.speed_multiplier);
        tuned_rpm = Math.round(tuned_rpm * materialTuning.speed_multiplier);
        tuned_feed = Math.round(tuned_feed * materialTuning.feed_multiplier * 1000) / 1000;
        tuned_doc = Math.round(tuned_doc * materialTuning.doc_multiplier * 100) / 100;

        if (materialTuning.speed_multiplier !== 1.0) {
          adjustments.push({
            parameter: "speed",
            generic_value: old_speed,
            tuned_value: tuned_speed,
            delta_percent: this.calcDelta(old_speed, tuned_speed),
            reason: `Material group ${isoGroup} historical feedback (n=${materialTuning.sample_count})`,
          });
        }
        if (materialTuning.feed_multiplier !== 1.0) {
          adjustments.push({
            parameter: "feed",
            generic_value: old_feed,
            tuned_value: tuned_feed,
            delta_percent: this.calcDelta(old_feed, tuned_feed),
            reason: `Material group ${isoGroup} historical feedback`,
          });
        }
        if (materialTuning.doc_multiplier !== 1.0) {
          adjustments.push({
            parameter: "depth_of_cut",
            generic_value: old_doc,
            tuned_value: tuned_doc,
            delta_percent: this.calcDelta(old_doc, tuned_doc),
            reason: `Material group ${isoGroup} historical feedback`,
          });
        }

        // Increase confidence for well-calibrated materials
        if (materialTuning.sample_count >= 100) {
          confidence_adjustment += 0.05;
        }
      }
    }

    // Apply machine-specific compensation
    let machineInfo: { id: string; name: string; rigidity_factor: number } | undefined;
    if (include_machine_compensation && machine_id) {
      const machineTuning = this.getMachineTuning(profile, machine_id);
      if (machineTuning) {
        machineInfo = {
          id: machineTuning.machine_id,
          name: machineTuning.machine_name,
          rigidity_factor: machineTuning.rigidity_factor,
        };

        // Rigidity affects depth of cut
        if (machineTuning.rigidity_factor !== 1.0) {
          const old_doc = tuned_doc;
          tuned_doc = Math.round(tuned_doc * machineTuning.rigidity_factor * 100) / 100;
          adjustments.push({
            parameter: "depth_of_cut",
            generic_value: old_doc,
            tuned_value: tuned_doc,
            delta_percent: this.calcDelta(old_doc, tuned_doc),
            reason: `Machine rigidity factor (${machineTuning.machine_name})`,
          });
        }

        // Age factor affects overall aggressiveness
        if (machineTuning.age_factor < 0.95) {
          const old_speed = tuned_speed;
          tuned_speed = Math.round(tuned_speed * machineTuning.age_factor);
          tuned_rpm = Math.round(tuned_rpm * machineTuning.age_factor);
          adjustments.push({
            parameter: "speed",
            generic_value: old_speed,
            tuned_value: tuned_speed,
            delta_percent: this.calcDelta(old_speed, tuned_speed),
            reason: `Machine age compensation (${machineTuning.machine_name})`,
          });
          warnings.push(`Machine ${machineTuning.machine_name} age factor ${machineTuning.age_factor} — consider maintenance review`);
        }

        // RPM limit enforcement
        if (tuned_rpm > machineTuning.max_rpm) {
          tuned_rpm = machineTuning.max_rpm;
          warnings.push(`RPM capped at machine limit ${machineTuning.max_rpm}`);
        }

        confidence_adjustment += 0.03;
      } else {
        warnings.push(`Machine ${machine_id} not found in shop profile`);
      }
    }

    // Calculate total delta
    const total_delta_percent = Math.abs(this.calcDelta(generic.cutting_speed_m_min, tuned_speed)) +
      Math.abs(this.calcDelta(generic.feed_mm_rev, tuned_feed)) +
      Math.abs(this.calcDelta(generic.depth_of_cut_mm, tuned_doc));

    // Final confidence
    const confidence = Math.min(0.95, Math.max(0.5, genericResult.confidence + confidence_adjustment));

    return {
      success: true,
      tuned_recommendation: {
        cutting_speed_m_min: tuned_speed,
        rpm: tuned_rpm,
        feed_mm_rev: tuned_feed,
        depth_of_cut_mm: tuned_doc,
      },
      generic_recommendation: {
        cutting_speed_m_min: generic.cutting_speed_m_min,
        rpm: generic.rpm,
        feed_mm_rev: generic.feed_mm_rev,
        depth_of_cut_mm: generic.depth_of_cut_mm,
      },
      adjustments,
      total_delta_percent: Math.round(total_delta_percent * 100) / 100,
      shop_profile: {
        id: profile.id,
        name: profile.name,
        last_calibration: profile.last_calibration,
      },
      machine_used: machineInfo,
      confidence_adjustment: Math.round(confidence_adjustment * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      warnings,
    };
  }

  /**
   * List available shop profiles.
   */
  static listProfiles(): Array<{ id: string; name: string; industry: string }> {
    return Object.values(this.PROFILES).map((p) => ({
      id: p.id,
      name: p.name,
      industry: p.industry,
    }));
  }

  /**
   * List machines for a shop profile.
   */
  static listMachines(profileId: string): Array<{ id: string; name: string }> {
    const profile = this.getProfile(profileId);
    return profile.machine_tuning.map((m) => ({
      id: m.machine_id,
      name: m.machine_name,
    }));
  }

  /**
   * Get version info.
   */
  static getVersion(): string {
    return this.VERSION;
  }
}

export const latheSpeedFeedShopAwareTuningEngine = LatheSpeedFeedShopAwareTuningEngine;
