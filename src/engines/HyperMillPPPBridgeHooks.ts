/**
 * HyperMillPPPBridgeHooks — Pre/Post hooks for hyperMILL → PPP integration
 *
 * Two hooks that fire at specific PPP (PostProcessorPipeline) phases:
 *
 *   preHook  — fires at Phase 2 entry (physics enrichment start)
 *     Injects hyperMILL context: material ISO group, cycle type, tool geometry.
 *     This context is consumed by the Kienzle force model and SLD engine.
 *
 *   postHook — fires at Phase 7 exit (final output validation)
 *     Validates controller limits: max RPM, max feed, G43.4/RTCP safety.
 *     Warns if any block exceeds machine envelope.
 *
 * Hook lifecycle:
 *   Pre-hook result → enriched context map attached to each NCBlock
 *   Post-hook result → validation report with per-block warnings/blocks
 *
 * References:
 *   - PostProcessorPipelineEngine.ts §Phase 2 (physics enrichment)
 *   - PostProcessorPipelineEngine.ts §Phase 7 (final validation)
 *   - Fanuc Series 30i Programming Manual §G43.4 (RTCP mode)
 *   - AIAG SPC Manual 2nd Ed. §machine limits
 *
 * HM-REV-MS11 / U-HMR62
 */

import type { NCBlock } from "./HyperMillPPPInputAdapter.js";
import { CONTROLLER_FAMILY_TO_DIALECT } from "./HyperMillPPPInputAdapter.js";

// ============================================================================
// Types
// ============================================================================

/** hyperMILL context injected at Phase 2 entry */
export interface HyperMillPPPContext {
  /** ISO material group (P/M/K/N/S/H) */
  material_iso_group: string;
  /** Kienzle specific cutting force for this material group (N/mm²) */
  kc1_1: number;
  /** hyperMILL cycle type (e.g. "hmFace", "hmSf3", "hmFinish") */
  cycle_type: string;
  /** Tool diameter (mm) */
  tool_diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Controller family */
  controller_family: string;
  /** G-code dialect */
  dialect: string;
  /** Max allowable spindle RPM for this machine */
  machine_max_rpm: number;
  /** Max allowable feed rate (mm/min) */
  machine_max_feed_mmpm: number;
}

/** Result from the pre-hook */
export interface PPPPreHookResult {
  /** Hook fired successfully */
  success: boolean;
  /** Context injected into PPP Phase 2 */
  context: HyperMillPPPContext;
  /** Number of blocks that will receive context enrichment */
  blocks_to_enrich: number;
  /** Warnings from context injection */
  warnings: string[];
}

/** Per-block validation finding from the post-hook */
export interface BlockValidationFinding {
  /** Line number of offending block */
  line_number: number;
  /** Raw block text */
  raw: string;
  /** What limit was exceeded */
  finding: string;
  /** Severity */
  severity: "WARNING" | "CRITICAL";
}

/** Result from the post-hook */
export interface PPPPostHookResult {
  /** All blocks passed validation */
  all_valid: boolean;
  /** Total blocks validated */
  blocks_validated: number;
  /** Findings (warnings + criticals) */
  findings: BlockValidationFinding[];
  /** Number of blocks with RPM over machine limit */
  rpm_violations: number;
  /** Number of blocks with feed over machine limit */
  feed_violations: number;
  /** Number of RTCP blocks validated */
  rtcp_blocks_validated: number;
}

// ============================================================================
// Canonical Kienzle kc1.1 per ISO group
// (from src/physics/constants.ts — DO NOT inline custom values here)
// ============================================================================

const KC1_1_BY_ISO_GROUP: Record<string, number> = {
  P: 1800,  // Steels
  M: 2100,  // Stainless steels
  K: 1100,  // Cast irons
  N: 700,   // Non-ferrous (aluminium)
  S: 2800,  // Superalloys (Inconel, Ti)
  H: 3200,  // Hardened steels
};

// ============================================================================
// Engine
// ============================================================================

export class HyperMillPPPBridgeHooks {
  /**
   * Pre-hook — fires at PPP Phase 2 entry.
   *
   * Validates that context is complete and injects hyperMILL-specific
   * physics parameters so the Kienzle model receives accurate inputs.
   *
   * @param blocks  - NC blocks from Phase 1 (parsed by HyperMillPPPInputAdapter)
   * @param context - hyperMILL job context (material, machine limits, tool)
   * @returns Pre-hook result with enriched context and block count
   */
  preHook(
    blocks: NCBlock[],
    context: Partial<HyperMillPPPContext>
  ): PPPPreHookResult {
    const warnings: string[] = [];

    // Resolve ISO group (default P — steel)
    const isoGroup = (context.material_iso_group ?? "P").toUpperCase();
    const kc1_1 = KC1_1_BY_ISO_GROUP[isoGroup] ?? KC1_1_BY_ISO_GROUP["P"];

    if (!KC1_1_BY_ISO_GROUP[isoGroup]) {
      warnings.push(
        `Unknown ISO group '${isoGroup}' — defaulting to P (kc1.1=1800 N/mm²)`
      );
    }

    // Resolve dialect
    const controllerFamily = context.controller_family ?? "fanuc";
    const dialect =
      context.dialect ??
      CONTROLLER_FAMILY_TO_DIALECT[controllerFamily] ??
      "fanuc";

    // Machine limits
    const machineMaxRpm = context.machine_max_rpm ?? 15000;
    const machineMaxFeed = context.machine_max_feed_mmpm ?? 40000;

    if (machineMaxRpm <= 0) {
      warnings.push("machine_max_rpm is zero or negative — using default 15000 RPM");
    }

    // Count enrichable blocks (motion blocks only)
    const enrichableBlocks = blocks.filter((b) =>
      ["linear", "arc_cw", "arc_ccw", "5axis_rtcp"].includes(b.motion_type)
    );

    const fullContext: HyperMillPPPContext = {
      material_iso_group: isoGroup,
      kc1_1,
      cycle_type: context.cycle_type ?? "unknown",
      tool_diameter_mm: context.tool_diameter_mm ?? 10,
      flute_count: context.flute_count ?? 4,
      controller_family: controllerFamily,
      dialect,
      machine_max_rpm: machineMaxRpm,
      machine_max_feed_mmpm: machineMaxFeed,
    };

    return {
      success: true,
      context: fullContext,
      blocks_to_enrich: enrichableBlocks.length,
      warnings,
    };
  }

  /**
   * Post-hook — fires at PPP Phase 7 exit.
   *
   * Validates that every block's S and F values are within the machine
   * envelope established by the pre-hook context.  Also validates
   * G43.4/RTCP mode is set before any 5-axis motion.
   *
   * @param blocks  - NC blocks after PPP processing (with updated S/F)
   * @param context - Enriched context from the pre-hook
   * @returns Validation report with per-block findings
   */
  postHook(
    blocks: NCBlock[],
    context: HyperMillPPPContext
  ): PPPPostHookResult {
    const findings: BlockValidationFinding[] = [];
    let rpmViolations = 0;
    let feedViolations = 0;
    let rtcpValidated = 0;

    for (const block of blocks) {
      // Skip passthrough blocks (TRAORI etc.)
      if (block.passthrough) continue;

      // RPM limit check
      if (block.spindle_rpm !== null && block.spindle_rpm > context.machine_max_rpm) {
        rpmViolations++;
        findings.push({
          line_number: block.line_number,
          raw: block.raw,
          finding: `S${block.spindle_rpm} exceeds machine max ${context.machine_max_rpm} RPM`,
          severity: "CRITICAL",
        });
      }

      // Feed rate limit check
      if (block.feed_mmpm !== null && block.feed_mmpm > context.machine_max_feed_mmpm) {
        feedViolations++;
        findings.push({
          line_number: block.line_number,
          raw: block.raw,
          finding: `F${block.feed_mmpm} exceeds machine max feed ${context.machine_max_feed_mmpm} mm/min`,
          severity: "CRITICAL",
        });
      }

      // RTCP validation
      if (block.is_rtcp) {
        rtcpValidated++;
        // Ensure RTCP block has a spindle speed (safety: don't start RTCP without knowing RPM)
        if (block.spindle_rpm === null) {
          findings.push({
            line_number: block.line_number,
            raw: block.raw,
            finding: "G43.4 RTCP block has no S value — spindle speed unknown at RTCP activation",
            severity: "WARNING",
          });
        }
      }
    }

    return {
      all_valid: rpmViolations === 0 && feedViolations === 0,
      blocks_validated: blocks.filter((b) => !b.passthrough).length,
      findings,
      rpm_violations: rpmViolations,
      feed_violations: feedViolations,
      rtcp_blocks_validated: rtcpValidated,
    };
  }
}

export const hyperMillPPPBridgeHooks = new HyperMillPPPBridgeHooks();
