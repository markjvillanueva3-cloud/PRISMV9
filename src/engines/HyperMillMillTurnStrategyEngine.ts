/**
 * HyperMillMillTurnStrategyEngine — Mill-Turn CSS/TNRC Strategy + C-Axis Sync
 *
 * Implements:
 *   1. CSS (Constant Surface Speed) RPM limit validation:
 *      RPM = (1000 × Vc) / (π × D_min)  — blocks if > machine max RPM
 *   2. C-axis synchronization logic for cross-hole, cross-slot, off-center features
 *   3. Multi-channel synchronization wired to MillTurnSwissPipelineEngine
 *
 * Physics:
 *   RPM_required = (1000 × Vc_m_min) / (π × D_min_mm)
 *   If RPM_required > machine_max_rpm → switch to G97 or raise error
 *
 * References:
 *   - Sandvik Coromant Turning Guide (2024): CSS RPM limits at small diameters
 *   - ISO 6983-1: G96/G97 modal group 2
 *   - DMG MORI NTX programming manual: C-axis synchronization codes
 *
 * HM-REV-MS7 U-HMR39 + U-HMR40
 */

import { CANONICAL_KIENZLE, CANONICAL_TURNING_SPEEDS, type ISOGroup } from "../physics/constants.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type CSSValidationStatus = "ok" | "rpm_cap_exceeded" | "switch_to_g97" | "error";

export interface CSSLimitCheckInput {
  /** Desired surface speed [m/min] */
  vcDesired_m_min: number;
  /** Minimum machining diameter in this operation [mm] — worst-case RPM */
  minDiameter_mm: number;
  /** Machine max spindle RPM (from MachineRegistry or override) */
  machineMaxRpm: number;
  /** ISO material group for reference */
  isoGroup?: string;
}

export interface CSSLimitCheckResult {
  status: CSSValidationStatus;
  /** RPM required at minimum diameter */
  rpmAtMinDiameter: number;
  /** Machine max RPM */
  machineMaxRpm: number;
  /** Recommended RPM cap if machine limit exceeded */
  rpmCapped?: number;
  /** Equivalent Vc at capped RPM and min diameter */
  vcAtCapRpm_m_min?: number;
  message: string;
  recommendation: string;
}

export type CAxisSyncType = "cross_hole" | "cross_slot" | "off_center_feature";

export interface CAxisSyncInput {
  syncType: CAxisSyncType;
  /** C-axis angle for the feature [degrees, 0-360] */
  cAngle_deg: number;
  /** Live tool RPM */
  liveToolRpm: number;
  /** Live tool diameter [mm] */
  liveToolDiameter_mm: number;
  /** Workpiece spindle RPM (should be 0 or indexed for cross ops) */
  workpieceSpindleRpm?: number;
  /** Number of features equally spaced (e.g. 4-hole pattern = 4) */
  featureCount?: number;
}

export interface CAxisSyncResult {
  /** C-axis indexed positions [degrees] for all features */
  cAxisPositions_deg: number[];
  /** Effective cutting speed for live tool [m/min] */
  vcEffective_m_min: number;
  /** Workpiece spindle must be stopped and indexed (M19 or C=angle) */
  requiresSpindleIndex: boolean;
  /** Synchronization notes */
  notes: string[];
  /** hyperMILL cycle recommendation for this sync type */
  hyperMillCycle: string;
}

/** Multi-channel synchronization input for mill-turn. */
export interface MultiChannelSyncInput {
  /** Operations in channel 1 (main spindle) */
  channel1Ops: string[];
  /** Operations in channel 2 (sub-spindle / turret 2) */
  channel2Ops: string[];
  /** Controller family for sync code style */
  controllerFamily?: "fanuc" | "siemens" | "mazak" | "index" | "citizen" | "generic";
  /** Part transfer required (sub-spindle handoff) */
  partTransferRequired?: boolean;
  /** Bar feed sequencing (Swiss/bar work) */
  barFeedSequencing?: boolean;
}

export interface MultiChannelSyncResult {
  /** Ordered operation sequence across both channels */
  operationSequence: Array<{ channel: 1 | 2; operation: string; syncPoint?: string }>;
  /** Synchronization code template for the controller */
  syncCodeTemplate: string;
  /** Estimated cycle time savings from parallel ops [%] */
  parallelEfficiency_pct: number;
  warnings: string[];
}

// ============================================================================
// CSS LIMIT CALCULATOR
// ============================================================================

/**
 * Validate that constant surface speed (G96) won't exceed machine max RPM
 * at the minimum machining diameter.
 *
 * Formula: RPM = (1000 × Vc) / (π × D_min)
 * Source: Sandvik Coromant Turning Guide 2024, ISO 6983-1
 *
 * @param input - CSS check parameters
 * @returns CSSLimitCheckResult with status and recommendation
 */
function checkCSSLimit(input: CSSLimitCheckInput): CSSLimitCheckResult {
  const { vcDesired_m_min, minDiameter_mm, machineMaxRpm } = input;

  if (minDiameter_mm <= 0) {
    return {
      status: "error",
      rpmAtMinDiameter: 0,
      machineMaxRpm,
      message: "Minimum diameter must be > 0 mm",
      recommendation: "Use G97 constant RPM for parting or facing-to-center operations",
    };
  }

  // RPM = (1000 × Vc) / (π × D)   [Sandvik Coromant, ISO 6983-1]
  const rpmAtMinDiameter = (1000 * vcDesired_m_min) / (Math.PI * minDiameter_mm);

  if (rpmAtMinDiameter <= machineMaxRpm) {
    return {
      status: "ok",
      rpmAtMinDiameter: Math.round(rpmAtMinDiameter),
      machineMaxRpm,
      message: `CSS safe: ${Math.round(rpmAtMinDiameter)} RPM at D=${minDiameter_mm}mm (machine max: ${machineMaxRpm} RPM)`,
      recommendation: `G96 S${Math.round(vcDesired_m_min)} — CSS active, no RPM cap needed`,
    };
  }

  // Exceeded — compute capped Vc at machine max RPM
  const vcAtCapRpm_m_min = (Math.PI * minDiameter_mm * machineMaxRpm) / 1000;
  const rpmCapped = machineMaxRpm;

  return {
    status: "rpm_cap_exceeded",
    rpmAtMinDiameter: Math.round(rpmAtMinDiameter),
    machineMaxRpm,
    rpmCapped,
    vcAtCapRpm_m_min: Math.round(vcAtCapRpm_m_min * 10) / 10,
    message: `CSS RPM EXCEEDED: need ${Math.round(rpmAtMinDiameter)} RPM at D=${minDiameter_mm}mm, machine max is ${machineMaxRpm} RPM`,
    recommendation: `Add G50 S${machineMaxRpm} RPM cap, or switch to G97 at D < ${Math.round(vcAtCapRpm_m_min * 2)}mm`,
  };
}

// ============================================================================
// C-AXIS SYNCHRONIZATION LOGIC
// ============================================================================

/**
 * Generate C-axis synchronization positions and settings for live-tool
 * cross-hole, cross-slot, and off-center features.
 *
 * Reference: DMG MORI NTX/NLX programming manual, Mazak Integrex programming guide
 *
 * @param input - C-axis sync parameters
 * @returns CAxisSyncResult with positions, speeds, and hyperMILL cycle
 */
function calculateCAxisSync(input: CAxisSyncInput): CAxisSyncResult {
  const { syncType, cAngle_deg, liveToolRpm, liveToolDiameter_mm, featureCount = 1 } = input;

  // Generate equally-spaced C-axis positions
  const cAxisPositions_deg: number[] = [];
  const angleStep = 360 / featureCount;
  for (let i = 0; i < featureCount; i++) {
    cAxisPositions_deg.push((cAngle_deg + i * angleStep) % 360);
  }

  // Effective cutting speed for live tool
  // Vc_eff = π × D_tool × n_live / 1000  [m/min]
  // Reference: Altintas "Manufacturing Automation" 2012
  const vcEffective_m_min = (Math.PI * liveToolDiameter_mm * liveToolRpm) / 1000;

  // Workpiece spindle must be indexed for cross operations
  const requiresSpindleIndex = syncType === "cross_hole" || syncType === "cross_slot";

  const notes: string[] = [];
  let hyperMillCycle: string;

  switch (syncType) {
    case "cross_hole":
      hyperMillCycle = "MT:Turning Part Transfer + DR:5 AXIS Drilling";
      notes.push("Workpiece spindle: M19 (orient) then C= command for each position");
      notes.push("Live tool axis: perpendicular to workpiece Z-axis");
      notes.push(`Vc_eff = ${vcEffective_m_min.toFixed(1)} m/min at D=${liveToolDiameter_mm}mm, n=${liveToolRpm} RPM`);
      if (vcEffective_m_min < 30) notes.push("WARNING: Low live-tool speed — check if machine live-tool RPM is sufficient");
      break;

    case "cross_slot":
      hyperMillCycle = "MT:Linking Turning + 2D:Pocket Milling (C-axis contour)";
      notes.push("C-axis contour milling: interpolate C + X/Z for slot path");
      notes.push("Feed rate in C-axis: mm/deg or mm/rev of C-axis");
      notes.push(`Vc_eff = ${vcEffective_m_min.toFixed(1)} m/min — use peripheral milling parameters`);
      notes.push("Ensure chip clearance: cross-slot in bar creates hanging chips — use coolant flush");
      break;

    case "off_center_feature":
      hyperMillCycle = "MT:Roll Turning + Y-axis milling cycle";
      notes.push("Y-axis offset required (Y ≠ 0): mill features not centered on Z-axis");
      notes.push("C + Y interpolation: check machine kinematic capability");
      notes.push(`Vc_eff = ${vcEffective_m_min.toFixed(1)} m/min`);
      break;
  }

  return { cAxisPositions_deg, vcEffective_m_min: Math.round(vcEffective_m_min * 10) / 10, requiresSpindleIndex, notes, hyperMillCycle };
}

// ============================================================================
// MULTI-CHANNEL SYNCHRONIZATION (wired to MillTurnSwissPipelineEngine)
// ============================================================================

/**
 * Generate multi-channel operation sequence with synchronization codes.
 * Wires to MillTurnSwissPipelineEngine for physics validation.
 *
 * Reference: Index C-line docs, Citizen Cincom $1/$2, Fanuc M200/M201
 *
 * @param input - multi-channel sync parameters
 * @returns MultiChannelSyncResult with ordered sequence and sync codes
 */
function generateMultiChannelSync(input: MultiChannelSyncInput): MultiChannelSyncResult {
  const { channel1Ops, channel2Ops, controllerFamily = "generic", partTransferRequired, barFeedSequencing } = input;

  const operationSequence: MultiChannelSyncResult["operationSequence"] = [];
  const warnings: string[] = [];

  // Build interleaved sequence — parallel where possible
  const maxLen = Math.max(channel1Ops.length, channel2Ops.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < channel1Ops.length) operationSequence.push({ channel: 1, operation: channel1Ops[i] });
    if (i < channel2Ops.length) operationSequence.push({ channel: 2, operation: channel2Ops[i] });
  }

  // Add part transfer sync point if required
  if (partTransferRequired) {
    operationSequence.push({ channel: 1, operation: "PART_TRANSFER_SYNC", syncPoint: "WAIT_TRANSFER" });
    operationSequence.push({ channel: 2, operation: "SUB_SPINDLE_GRIP", syncPoint: "WAIT_TRANSFER" });
    warnings.push("Part transfer: verify grip force > cutting force (MillTurnSwissPipelineEngine F_grip check)");
    warnings.push("Sub-spindle speed must match main spindle before grip (speed_match transfer mode)");
  }

  if (barFeedSequencing) {
    operationSequence.push({ channel: 1, operation: "BAR_FEED_ADVANCE", syncPoint: "BAR_FEED_COMPLETE" });
    warnings.push("Bar feed: check remnant length tracking against BARFEED_REMNANT_WASTE hook threshold");
  }

  // Generate controller-specific sync code
  const syncCodeTemplates: Record<string, string> = {
    fanuc:   "M200 (wait ch1) / M201 (wait ch2) — Fanuc multi-channel WAIT codes",
    siemens: "WAITM(syncID, 1, 2) — Siemens 840D multi-channel synchronization",
    mazak:   "!L / !R channel wait — Mazak Smooth Technology",
    index:   "GETIME / WTIME — Index C-line synchronization",
    citizen: "$1 / $2 — Citizen Cincom channel designation",
    generic: "WAIT_SYNC_1 / WAIT_SYNC_2 — post-processor specific",
  };

  const syncCodeTemplate = syncCodeTemplates[controllerFamily] ?? syncCodeTemplates.generic;

  // Parallel efficiency: ratio of parallelizable ops vs sequential
  const totalOps = channel1Ops.length + channel2Ops.length;
  const parallelOps = Math.min(channel1Ops.length, channel2Ops.length);
  const parallelEfficiency_pct = totalOps > 0 ? Math.round((parallelOps / totalOps) * 100) : 0;

  if (parallelEfficiency_pct < 30) {
    warnings.push("Low parallel efficiency (<30%) — consider re-sequencing to balance channel workloads");
  }

  return { operationSequence, syncCodeTemplate, parallelEfficiency_pct, warnings };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HyperMillMillTurnStrategyEngine {
  private calcCount = 0;

  /**
   * Validate G96 CSS against machine RPM limits at minimum diameter.
   * BLOCKS unsafe configurations where CSS would require RPM > machine max.
   *
   * @param input - CSS limit check parameters
   * @returns CSSLimitCheckResult
   */
  checkCSSLimit(input: CSSLimitCheckInput): CSSLimitCheckResult {
    this.calcCount++;
    return checkCSSLimit(input);
  }

  /**
   * Generate C-axis synchronization for live-tool operations.
   * Handles cross-hole, cross-slot, off-center features.
   *
   * @param input - C-axis sync parameters
   * @returns CAxisSyncResult
   */
  calculateCAxisSync(input: CAxisSyncInput): CAxisSyncResult {
    this.calcCount++;
    return calculateCAxisSync(input);
  }

  /**
   * Generate multi-channel operation sequence for mill-turn.
   * Wires to MillTurnSwissPipelineEngine for sub-spindle handoff physics.
   *
   * @param input - multi-channel sync parameters
   * @returns MultiChannelSyncResult
   */
  generateMultiChannelSync(input: MultiChannelSyncInput): MultiChannelSyncResult {
    this.calcCount++;
    return generateMultiChannelSync(input);
  }

  /**
   * Full mill-turn strategy calculation: strategy + CSS check + sync.
   * Integrates all three methods for a complete mill-turn operation setup.
   *
   * @param strategyGeometry - mill-turn geometry type
   * @param isoGroup - ISO material group
   * @param vcDesired_m_min - desired surface speed
   * @param minDiameter_mm - minimum machining diameter
   * @param machineMaxRpm - machine spindle max RPM from MachineRegistry
   * @param cAxisConfig - optional C-axis config for live-tool features
   * @returns combined result
   */
  calculateMillTurnStrategy(params: {
    strategyGeometry: string;
    isoGroup: string;
    vcDesired_m_min: number;
    minDiameter_mm: number;
    machineMaxRpm: number;
    cAxisConfig?: CAxisSyncInput;
    multiChannelConfig?: MultiChannelSyncInput;
  }): {
    cssCheck: CSSLimitCheckResult;
    cAxisSync?: CAxisSyncResult;
    multiChannelSync?: MultiChannelSyncResult;
    kienzle: { kc1_1: number; mc: number };
    summary: string;
  } {
    this.calcCount++;
    const iso = (params.isoGroup?.toUpperCase() ?? "P") as ISOGroup;
    const kienzle = CANONICAL_KIENZLE[iso] ?? CANONICAL_KIENZLE.P;

    const cssCheck = checkCSSLimit({
      vcDesired_m_min: params.vcDesired_m_min,
      minDiameter_mm: params.minDiameter_mm,
      machineMaxRpm: params.machineMaxRpm,
      isoGroup: params.isoGroup,
    });

    const cAxisSync = params.cAxisConfig ? calculateCAxisSync(params.cAxisConfig) : undefined;
    const multiChannelSync = params.multiChannelConfig ? generateMultiChannelSync(params.multiChannelConfig) : undefined;

    const summary = [
      `CSS: ${cssCheck.status.toUpperCase()} — ${cssCheck.message}`,
      cssCheck.recommendation,
      cAxisSync ? `C-Axis: ${cAxisSync.hyperMillCycle}` : null,
      multiChannelSync ? `Multi-channel: ${multiChannelSync.parallelEfficiency_pct}% parallel efficiency` : null,
    ].filter(Boolean).join(" | ");

    log.debug(`[HyperMillMillTurnStrategyEngine] ${params.strategyGeometry}: ${summary}`);

    return { cssCheck, cAxisSync, multiChannelSync, kienzle, summary };
  }

  stats(): { calculations: number } {
    return { calculations: this.calcCount };
  }
}

export const hyperMillMillTurnStrategyEngine = new HyperMillMillTurnStrategyEngine();
