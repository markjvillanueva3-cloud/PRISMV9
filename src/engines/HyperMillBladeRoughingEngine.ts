/**
 * HyperMillBladeRoughingEngine — Blade roughing with open/closed channel classification
 *
 * Covers:
 *   - Blade roughing: plunge + level-by-level + rest material detection
 *   - Open channel: conventional radial approach allowed
 *   - Closed channel: requires plunge/helical entry (no radial approach)
 *   - Blisk: integral blade+disk = shorter tool reach, steeper approach angles
 *
 * Channel type determines entry strategy — critical for collision avoidance.
 *
 * HM-REV-MS4 / U-HMR22
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// Types
// ============================================================================

export type ChannelType = "open" | "closed";
export type BladeGeometryType = "blade" | "blisk" | "impeller";

export interface BladeRoughingInput {
  /** Geometry type */
  geometryType: BladeGeometryType;
  /** Channel type — determines entry strategy */
  channelType: ChannelType;
  /** ISO material group for feed/speed scaling */
  isoGroup?: ISOGroup;
  /** Tool diameter [mm] */
  toolDiameterMm: number;
  /** Channel depth [mm] */
  channelDepthMm: number;
  /** Maximum channel width at narrowest point [mm] */
  channelWidthMm: number;
  /** Number of blade levels for level-by-level roughing */
  levelCount?: number;
  /** Whether rest material (inter-pass) detection is needed */
  needsRestMaterial?: boolean;
  /** Axial depth of cut per level [mm] — overrides auto if provided */
  ap_per_level_mm?: number;
}

export type EntryStrategy =
  | "radial_conventional"
  | "plunge_helical"
  | "plunge_direct"
  | "helical_ramp";

export interface BladeLevel {
  levelIndex: number;
  depthFromTop_mm: number;
  ap_mm: number;
  entryStrategy: EntryStrategy;
  notes: string;
}

export interface RestMaterialZone {
  location: string;
  estimatedWidth_mm: number;
  requiresSmallTool: boolean;
}

export interface BladeRoughingResult {
  /** Entry strategy selected for this channel type */
  entryStrategy: EntryStrategy;
  /** Whether radial approach is permitted */
  radialApproachAllowed: boolean;
  /** Approach angle [degrees] — steeper for blisk */
  approachAngle_deg: number;
  /** Number of roughing levels generated */
  levelCount: number;
  /** Per-level roughing parameters */
  levels: BladeLevel[];
  /** Detected rest material zones */
  restMaterialZones: RestMaterialZone[];
  /** Recommended axial depth per level [mm] */
  ap_per_level_mm: number;
  /** hyperMILL cycle code */
  cycleCode: string;
  /** Warnings from geometry/strategy analysis */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Approach angles by geometry type [degrees].
 * Blisk has integral disk — requires steeper approach to avoid disk collision.
 * Source: hyperMILL v33 training manual, Blade module section 4.2
 */
const APPROACH_ANGLES: Record<BladeGeometryType, number> = {
  blade: 5,     // standard blade: shallow approach
  impeller: 5,  // impeller: same as blade (hub is separate disk)
  blisk: 15,    // blisk: integral disk, steeper approach mandatory
};

/**
 * Entry strategy by channel type.
 * Open channel: gap at leading edge allows radial/conventional entry.
 * Closed channel: blade-to-blade passage requires plunge/helical to avoid collision.
 * Source: hyperMILL v33 Impeller/Blade manual §3.1 "Channel Entry Strategies"
 */
const CHANNEL_ENTRY_STRATEGY: Record<ChannelType, EntryStrategy> = {
  open:   "radial_conventional",
  closed: "plunge_helical",
};

/** Maximum levels for level-by-level roughing (safety cap) */
const MAX_LEVELS = 50;

// ============================================================================
// Engine
// ============================================================================

/**
 * HyperMillBladeRoughingEngine — classify channel type and generate level-by-level plan.
 *
 * Open channel rule: if channelType === "open", radial approach is allowed.
 * Closed channel rule: if channelType === "closed", plunge/helical entry ONLY.
 * Blisk rule: approachAngle_deg = 15° (vs 5° for impeller/blade).
 */
export class HyperMillBladeRoughingEngine {

  /**
   * Calculate blade roughing strategy, entry method, and level-by-level plan.
   *
   * @param input - Channel geometry, material group, tool parameters
   * @returns Roughing result with entry strategy, levels, rest material zones
   */
  calculate(input: BladeRoughingInput): BladeRoughingResult {
    const warnings: string[] = [];

    const {
      geometryType,
      channelType,
      toolDiameterMm,
      channelDepthMm,
      channelWidthMm,
      needsRestMaterial = true,
    } = input;

    // ── Entry Strategy ────────────────────────────────────────────────────────
    const entryStrategy = CHANNEL_ENTRY_STRATEGY[channelType];
    const radialApproachAllowed = channelType === "open";
    const approachAngle_deg = APPROACH_ANGLES[geometryType];

    if (geometryType === "blisk") {
      warnings.push(
        "Blisk: integral blade+disk — approach angle 15° mandatory, shorter tool reach required",
      );
    }

    if (channelType === "closed") {
      warnings.push(
        "Closed channel: radial approach impossible — plunge/helical entry selected to avoid blade collision",
      );
    }

    // ── Axial Depth Per Level ─────────────────────────────────────────────────
    // Rule: ap ≈ 0.8×D for roughing, capped at 80% of tool diameter
    // Ref: hyperMILL v33 impeller defaults (hmIrX5.cfg: verticalInfeed=1.5mm)
    const apAuto = Math.min(toolDiameterMm * 0.8, 3.0);
    const ap_per_level_mm = input.ap_per_level_mm ?? apAuto;

    // ── Level Generation ──────────────────────────────────────────────────────
    const rawLevels = Math.ceil(channelDepthMm / ap_per_level_mm);
    const nLevels = Math.min(
      input.levelCount ?? rawLevels,
      MAX_LEVELS,
    );

    const levels: BladeLevel[] = [];
    for (let i = 0; i < nLevels; i++) {
      const depth = (i + 1) * ap_per_level_mm;
      const isFirstLevel = i === 0;

      // First level always uses the selected entry strategy
      // Subsequent levels: closed channel still uses plunge, open can use side entry
      const levelEntry: EntryStrategy =
        isFirstLevel || channelType === "closed"
          ? entryStrategy
          : "radial_conventional";

      levels.push({
        levelIndex: i,
        depthFromTop_mm: Math.min(depth, channelDepthMm),
        ap_mm: i < nLevels - 1 ? ap_per_level_mm : channelDepthMm - i * ap_per_level_mm,
        entryStrategy: levelEntry,
        notes: isFirstLevel
          ? `Initial entry via ${levelEntry}`
          : `Level ${i + 1} — ${levelEntry}`,
      });
    }

    // ── Rest Material Detection ───────────────────────────────────────────────
    const restMaterialZones: RestMaterialZone[] = [];

    if (needsRestMaterial) {
      // Fillet zones always have rest material — tool radius leaves uncut corners
      restMaterialZones.push({
        location: "blade_root_fillet",
        estimatedWidth_mm: toolDiameterMm * 0.3,
        requiresSmallTool: toolDiameterMm > 6,
      });

      // Leading/trailing edges on closed channels need rest machining pass
      if (channelType === "closed") {
        restMaterialZones.push({
          location: "leading_edge_corner",
          estimatedWidth_mm: toolDiameterMm * 0.2,
          requiresSmallTool: true,
        });
        restMaterialZones.push({
          location: "trailing_edge_corner",
          estimatedWidth_mm: toolDiameterMm * 0.2,
          requiresSmallTool: true,
        });
      }

      // Deep channel: rest material at hub junction
      if (channelDepthMm > 3 * toolDiameterMm) {
        restMaterialZones.push({
          location: "hub_junction_deep",
          estimatedWidth_mm: toolDiameterMm * 0.15,
          requiresSmallTool: true,
        });
        warnings.push(
          `Deep channel (${(channelDepthMm / toolDiameterMm).toFixed(1)}×D) — rest material at hub junction expected`,
        );
      }
    }

    // ── Channel Width Check ───────────────────────────────────────────────────
    const minClearance = channelWidthMm - toolDiameterMm;
    if (minClearance < toolDiameterMm * 0.1) {
      warnings.push(
        `Tight channel: clearance ${minClearance.toFixed(2)}mm is < 10% of tool diameter — consider smaller tool`,
      );
    }

    // ── hyperMILL cycle code ──────────────────────────────────────────────────
    // Blade roughing uses BrX5 (hyperMILL v33 blade roughing cycle)
    // Impeller roughing uses IrX5 or ItmX5 (tangent for barrel tools)
    const cycleCode =
      geometryType === "blade" || geometryType === "blisk"
        ? "BrX5"
        : toolDiameterMm >= 8
        ? "ItmX5"
        : "IrX5";

    const confidence = warnings.some((w) => w.startsWith("DEFLECTION"))
      ? 0.6
      : warnings.length === 0
      ? 0.92
      : 0.78;

    return {
      entryStrategy,
      radialApproachAllowed,
      approachAngle_deg,
      levelCount: levels.length,
      levels,
      restMaterialZones,
      ap_per_level_mm: Math.round(ap_per_level_mm * 100) / 100,
      cycleCode,
      warnings,
      confidence,
      source: "hypermill-v33-installation blade-module §3.1 §4.2",
    };
  }

  /**
   * Classify a channel as open or closed based on geometry.
   *
   * Open channel: leading edge is exposed (no adjacent blade at that radius).
   * Closed channel: blades wrap around to close the passage (centrifugal compressor style).
   *
   * @param hubShroudRatio - 0–1 (smaller = deeper). Deep channels tend to be closed.
   * @param bladeWrapAngleDeg - Total wrap angle of blade [degrees]. >120° → closed.
   * @returns Classified channel type with reasoning
   */
  classifyChannel(
    hubShroudRatio: number,
    bladeWrapAngleDeg: number,
  ): { channelType: ChannelType; reason: string } {
    if (bladeWrapAngleDeg > 120) {
      return {
        channelType: "closed",
        reason: `Blade wrap angle ${bladeWrapAngleDeg}° > 120° — closed channel (radial approach blocked)`,
      };
    }
    if (hubShroudRatio < 0.35) {
      return {
        channelType: "closed",
        reason: `Hub/shroud ratio ${hubShroudRatio.toFixed(2)} < 0.35 — deep channel classified as closed`,
      };
    }
    return {
      channelType: "open",
      reason: `Wrap angle ${bladeWrapAngleDeg}°, hub/shroud ${hubShroudRatio.toFixed(2)} — open channel`,
    };
  }
}

export const hyperMillBladeRoughingEngine = new HyperMillBladeRoughingEngine();
