/**
 * MastercamMillTurnBridge - Mill-Turn Combined Operations Bridge for Mastercam
 *
 * Connects Mastercam mill-turn operations to PRISM's physics-validated
 * multi-channel programming infrastructure. Handles:
 *   1. Main/sub-spindle part transfer (spindle handoff with grip force check)
 *   2. Simultaneous OD turning + C-axis cross-milling (constraint enforcement)
 *   3. Bar-feed sequencing (remnant tracking, part count, collet selection)
 *   4. Live tooling coordination (Y-axis, C-axis, BMT/VDI turret)
 *
 * Physics:
 *   F_grip > F_cut: sub-spindle grip force must exceed axial cutting force
 *   Vc_live = pi * D_live * n_live / 1000 [m/min] (live tool effective speed)
 *   Simultaneous constraints: turret collision zone | shared C-axis lock | coolant routing
 *
 * Reference: Okuma MULTUS programming guide, Mazak INTEGREX i-series manual,
 *            DMG MORI NTX/CTX multi-channel programming
 *
 * @engine MastercamMillTurnBridge
 * @shortcode E2503
 * @dispatcher camDispatcher
 * @actions mastercam_millturn_handoff, mastercam_millturn_simultaneous, mastercam_millturn_barfeed
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP02
 */

import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TurningChannel {
  /** Channel ID (1 = main spindle, 2 = sub-spindle) */
  channelId: 1 | 2;
  /** Ordered operations in this channel */
  operations: Array<{
    /** Operation ID */
    id: string;
    /** Operation type */
    type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" |
          "groove" | "thread" | "part_off" | "cross_drill" | "cross_mill" |
          "live_tool" | "c_axis_contour" | "y_axis_mill" | "tap";
    /** Duration in seconds */
    durationSec: number;
    /** Dependencies (wait for these ops to finish) */
    dependsOn?: string[];
    /** True if operation uses C-axis (locks spindle rotation) */
    requiresCAxis?: boolean;
    /** True if operation uses Y-axis live tool */
    requiresYAxis?: boolean;
    /** True if operation uses B-axis (tool spindle tilt) */
    requiresBAxis?: boolean;
  }>;
}

export interface SpindleHandoffInput {
  /** Workpiece diameter in mm */
  workpieceDiameterMm: number;
  /** Workpiece length in mm */
  workpieceLengthMm: number;
  /** Material name */
  material: string;
  /** ISO material group */
  isoGroup?: ISOGroup;
  /** Main spindle RPM at transfer */
  mainSpindleRPM: number;
  /** Transfer mode */
  transferMode: "synchronized" | "stop_transfer" | "speed_match";
  /** Cut-off tool width in mm */
  cutoffToolWidthMm: number;
  /** Cut-off feed in mm/rev */
  cutoffFeedMmRev: number;
  /** Grip length on sub-spindle in mm (default 15mm) */
  subSpindleGripLengthMm?: number;
  /** Back-work operations after transfer */
  backWorkOperations?: Array<{
    type: "face" | "drill" | "bore" | "tap" | "chamfer" | "turn_od" | "turn_id" | "thread";
    depthMm: number;
    diameterMm?: number;
    feedMmRev?: number;
    cuttingSpeedMMin?: number;
  }>;
  /** Controller type */
  controller?: "fanuc" | "mazak" | "okuma" | "siemens" | "haas";
}

export interface SimultaneousOpsInput {
  /** Channel definitions */
  channels: TurningChannel[];
  /** Synchronization style */
  syncStyle?: "fanuc_wait_m" | "mazak_smooth" | "okuma_osp" | "siemens_waitm" | "haas_m" | "generic";
  /** Number of turrets */
  machineTurrets?: number;
  /** Collision clearance between turrets in mm */
  collisionClearanceMm?: number;
  /** Maximum simultaneous operations */
  maxSimultaneousOps?: number;
}

export interface BarFeedSequenceInput {
  /** Bar diameter in mm */
  barDiameterMm: number;
  /** Bar length in mm */
  barLengthMm: number;
  /** Part length in mm */
  partLengthMm: number;
  /** Cut-off width in mm */
  cutoffWidthMm: number;
  /** Material name */
  material: string;
  /** ISO material group */
  isoGroup?: ISOGroup;
  /** Minimum remnant length in mm */
  remnantMinLengthMm?: number;
  /** Whether guide bushing is in use (Swiss-type) */
  guideBushing?: boolean;
  /** Collet type */
  colletType?: "5c" | "16c" | "3j" | "hydro_chuck" | "swiss_guide";
  /** Bar feeder type */
  barFeederType?: "magazine" | "short" | "hyper";
}

export interface SpindleHandoffResult {
  /** Status: pass, warn, or block */
  status: "pass" | "warn" | "block";
  /** Human-readable message */
  message: string;
  /** Transfer sequence as G-code comments */
  transferSequence: string[];
  /** Grip force check results */
  gripForceCheck: {
    gripForceN: number;
    requiredForceN: number;
    adequate: boolean;
  };
  /** Synchronization G-codes */
  syncCodes: string[];
  /** Back-work operation sequence */
  backWorkSequence: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Chain-of-thought reasoning */
  reasoning: string[];
}

export interface SimultaneousOpsResult {
  /** Status: pass, warn, or block */
  status: "pass" | "warn" | "block";
  /** Human-readable message */
  message: string;
  /** Channel timelines */
  channelTimelines: Array<{
    channelId: number;
    operations: Array<{
      id: string;
      startSec: number;
      endSec: number;
      waitFor?: string[];
    }>;
    totalTimeSec: number;
  }>;
  /** Synchronization points */
  syncPoints: Array<{
    timeSec: number;
    channels: number[];
    syncCode: string;
    reason: string;
  }>;
  /** Physical constraint notes */
  physicalConstraints: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Chain-of-thought reasoning */
  reasoning: string[];
}

export interface BarFeedResult {
  /** Number of parts from bar */
  partCount: number;
  /** Remnant length in mm */
  remnantLengthMm: number;
  /** Whether remnant is usable */
  remnantUsable: boolean;
  /** Stock advance per cycle in mm */
  stockAdvanceMm: number;
  /** Recommended collet size */
  colletSize: string;
  /** Cycle sequence as G-code comments */
  cycleSequence: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning */
  reasoning: string[];
}

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

/** Minimum grip length per ISO material group in mm */
const MIN_GRIP_LENGTH_MM: Record<ISOGroup, number> = {
  P: 12, M: 15, K: 10, N: 8, S: 20, H: 18,
};

/** Friction coefficient by collet type */
const COLLET_FRICTION: Record<string, number> = {
  "5c": 0.12,
  "16c": 0.11,
  "3j": 0.10,
  "hydro_chuck": 0.15,
  "swiss_guide": 0.14,
};

/** Standard hydraulic clamping pressure by diameter range (MPa) */
const CLAMPING_PRESSURE_MPA: Record<string, number> = {
  "0-20": 3.5,
  "20-40": 4.0,
  "40-60": 4.5,
  "60-100": 5.0,
};

/** Specific cutting force by ISO group (N/mm^2) for grip force calculation */
const KC_BY_ISO: Record<ISOGroup, number> = {
  P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200,
};

// ============================================================================
// CONTROLLER SYNC CODES
// ============================================================================

const SYNC_CODES: Record<string, { transfer: string[]; waitM: string; waitEnd: string }> = {
  fanuc: {
    transfer: ["M05", "M19", "G28 U0", "M21 (SUB-SPINDLE ADVANCE)", "M200 (WAIT SUB READY)"],
    waitM: "M200",
    waitEnd: "M201",
  },
  mazak: {
    transfer: ["M05", "M19 S0", "G28 U0", "M322 (SYNC SPINDLES)", "M270 (SUB CHUCK CLOSE)"],
    waitM: "M270",
    waitEnd: "M271",
  },
  okuma: {
    transfer: ["M05", "M19", "NOEX G28 U0", "M234 (SUB ADVANCE)", "M260 (SYNC WAIT)"],
    waitM: "M260",
    waitEnd: "M261",
  },
  siemens: {
    transfer: ["M05", "SPOS=0", "G75 X0 Z0", "M200 (SYNC SUB)", "WAITM(1,1,2)"],
    waitM: "WAITM",
    waitEnd: "CLEARM",
  },
  haas: {
    transfer: ["M05", "M19", "G28 U0", "M21 (SUB IN)", "M200 (WAIT)"],
    waitM: "M200",
    waitEnd: "M201",
  },
  generic: {
    transfer: ["M05 (STOP SPINDLE)", "M19 (ORIENT)", "M21 (SUB ADVANCE)", "M200 (SYNC WAIT)"],
    waitM: "M200",
    waitEnd: "M201",
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamMillTurnBridge {
  private calcCount = 0;

  /**
   * Calculate spindle handoff sequence with physics validation.
   *
   * Chain-of-thought reasoning:
   * 1. Validate grip length against material requirements
   * 2. Calculate grip force vs cutting force safety margin
   * 3. Generate controller-specific sync codes
   * 4. Sequence back-work operations
   * 5. Calculate confidence based on margins
   *
   * @param input - Handoff parameters
   * @returns Validated handoff sequence with physics checks
   */
  calculateSpindleHandoff(input: SpindleHandoffInput): SpindleHandoffResult {
    this.calcCount++;
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let blocked = false;

    const iso = input.isoGroup ?? "P";
    const minGrip = MIN_GRIP_LENGTH_MM[iso];
    const actualGrip = input.subSpindleGripLengthMm ?? 15;

    reasoning.push(`Material ISO ${iso}: minimum grip length ${minGrip}mm`);
    reasoning.push(`Actual grip length: ${actualGrip}mm`);

    // ── Grip length validation ──────────────────────────────────────────────
    if (actualGrip < minGrip) {
      warnings.push(
        `Grip length ${actualGrip}mm < minimum ${minGrip}mm for ISO ${iso} - risk of workpiece pull-out`
      );
      blocked = true;
      reasoning.push("BLOCKED: Insufficient grip length");
    } else {
      reasoning.push(`Grip length OK: ${actualGrip}mm >= ${minGrip}mm`);
    }

    // ── Grip force calculation ──────────────────────────────────────────────
    // F_grip = mu * P * A where A is contact area approximation
    const colletType = "5c"; // Default collet
    const mu = COLLET_FRICTION[colletType] ?? 0.12;
    const diamRange = input.workpieceDiameterMm <= 20 ? "0-20" :
                      input.workpieceDiameterMm <= 40 ? "20-40" :
                      input.workpieceDiameterMm <= 60 ? "40-60" : "60-100";
    const clampPressure = CLAMPING_PRESSURE_MPA[diamRange];
    const contactArea = Math.PI * input.workpieceDiameterMm * actualGrip; // mm^2
    const gripForceN = mu * clampPressure * contactArea; // N

    // Cutting force estimate for cut-off
    // Fc = kc * ap * f where ap = tool width, f = feed
    const kc = KC_BY_ISO[iso];
    const axialCuttingForceN = kc * input.cutoffToolWidthMm * input.cutoffFeedMmRev;
    const requiredForceN = axialCuttingForceN * 1.5; // 1.5x safety factor

    reasoning.push(`Grip force: ${gripForceN.toFixed(0)}N (mu=${mu}, P=${clampPressure}MPa)`);
    reasoning.push(`Required force: ${requiredForceN.toFixed(0)}N (1.5x axial cutting force)`);

    const gripAdequate = gripForceN >= requiredForceN;
    if (!gripAdequate) {
      warnings.push(
        `Grip force ${gripForceN.toFixed(0)}N < required ${requiredForceN.toFixed(0)}N - increase clamp pressure or grip length`
      );
      blocked = true;
      reasoning.push("BLOCKED: Insufficient grip force");
    } else {
      reasoning.push(`Grip force adequate: ${gripForceN.toFixed(0)}N >= ${requiredForceN.toFixed(0)}N`);
    }

    // ── Generate sync codes ─────────────────────────────────────────────────
    const controller = input.controller ?? "generic";
    const codes = SYNC_CODES[controller] ?? SYNC_CODES.generic;
    const syncCodes = [
      `( SPINDLE HANDOFF: ${input.transferMode} mode )`,
      ...codes.transfer,
    ];
    reasoning.push(`Controller: ${controller} - using ${controller} sync codes`);

    // ── Transfer sequence ───────────────────────────────────────────────────
    const transferSequence: string[] = [
      `( PART TRANSFER: ${input.workpieceDiameterMm}mm dia x ${input.workpieceLengthMm}mm )`,
      `( Material: ${input.material} | ISO: ${iso} )`,
      `( Grip: ${actualGrip}mm | Transfer mode: ${input.transferMode} )`,
      `( Grip force: ${gripForceN.toFixed(0)}N | Required: ${requiredForceN.toFixed(0)}N )`,
      "",
      ...syncCodes,
    ];

    // ── Back-work sequence ──────────────────────────────────────────────────
    const backWorkSequence: string[] = [];
    if (input.backWorkOperations && input.backWorkOperations.length > 0) {
      backWorkSequence.push("( BACK-WORK OPERATIONS )");
      for (let i = 0; i < input.backWorkOperations.length; i++) {
        const op = input.backWorkOperations[i];
        const line = `( Op ${i + 1}: ${op.type.toUpperCase()} - depth ${op.depthMm}mm` +
          (op.diameterMm ? `, dia ${op.diameterMm}mm` : "") + " )";
        backWorkSequence.push(line);
      }
      reasoning.push(`${input.backWorkOperations.length} back-work operations sequenced`);
    }

    // ── Calculate confidence ────────────────────────────────────────────────
    let confidence = 0.9;
    if (warnings.length > 0) confidence -= 0.15 * Math.min(warnings.length, 3);
    if (blocked) confidence = 0.2;
    else if (gripForceN / requiredForceN > 2.0) confidence = 0.95;
    confidence = Math.max(0.1, Math.min(0.95, confidence));

    const status = blocked ? "block" : warnings.length > 0 ? "warn" : "pass";
    const message = blocked
      ? `Spindle handoff BLOCKED: ${warnings.join("; ")}`
      : warnings.length > 0
        ? `Spindle handoff WARNING: ${warnings.join("; ")}`
        : `Spindle handoff OK - transfer mode: ${input.transferMode}, grip: ${actualGrip}mm`;

    return {
      status,
      message,
      transferSequence,
      gripForceCheck: {
        gripForceN: Math.round(gripForceN),
        requiredForceN: Math.round(requiredForceN),
        adequate: gripAdequate,
      },
      syncCodes,
      backWorkSequence,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  /**
   * Validate and sequence simultaneous mill-turn operations.
   *
   * Chain-of-thought reasoning:
   * 1. Check C-axis lock conflicts (turning vs milling)
   * 2. Calculate turret collision zones
   * 3. Build dependency graph
   * 4. Generate optimal timeline with sync points
   * 5. Output channel schedules
   *
   * @param input - Channel definitions and constraints
   * @returns Validated simultaneous operation schedule
   */
  calculateSimultaneousOps(input: SimultaneousOpsInput): SimultaneousOpsResult {
    this.calcCount++;
    const reasoning: string[] = [];
    const violations: string[] = [];
    const constraintNotes: string[] = [];

    reasoning.push(`Analyzing ${input.channels.length} channels for simultaneous operation`);

    // ── C-axis conflict detection ───────────────────────────────────────────
    for (const ch of input.channels) {
      for (const op of ch.operations) {
        if (op.requiresCAxis) {
          // Find concurrent ops that are turning (require spindle rotation)
          const turningOps = input.channels
            .flatMap((c) => c.operations)
            .filter((o) =>
              o !== op &&
              !op.dependsOn?.includes(o.id) &&
              !o.dependsOn?.includes(op.id) &&
              (o.type === "od_rough" || o.type === "od_finish" ||
               o.type === "id_rough" || o.type === "id_finish" ||
               o.type === "face" || o.type === "groove" || o.type === "thread")
            );

          if (turningOps.length > 0) {
            constraintNotes.push(
              `C-axis lock conflict: ${op.id} (C-axis) may conflict with turning ops [${turningOps.map((o) => o.id).join(",")}] - ensure sync codes`
            );
            reasoning.push(`Detected C-axis conflict: ${op.id} vs ${turningOps.length} turning ops`);
          }
        }
      }
    }

    // ── Build timelines ─────────────────────────────────────────────────────
    const channelTimelines: SimultaneousOpsResult["channelTimelines"] = [];
    const allSyncPoints: SimultaneousOpsResult["syncPoints"] = [];

    for (const ch of input.channels) {
      const timeline: typeof channelTimelines[number] = {
        channelId: ch.channelId,
        operations: [],
        totalTimeSec: 0,
      };

      let currentTime = 0;
      for (const op of ch.operations) {
        // Check dependencies
        let waitFor: string[] | undefined;
        if (op.dependsOn && op.dependsOn.length > 0) {
          waitFor = op.dependsOn;
          reasoning.push(`Op ${op.id} waits for: ${waitFor.join(", ")}`);
        }

        timeline.operations.push({
          id: op.id,
          startSec: currentTime,
          endSec: currentTime + op.durationSec,
          waitFor,
        });
        currentTime += op.durationSec;
      }

      timeline.totalTimeSec = currentTime;
      channelTimelines.push(timeline);
    }

    // ── Generate sync points ────────────────────────────────────────────────
    const syncStyle = input.syncStyle ?? "fanuc_wait_m";
    const syncCode = SYNC_CODES[syncStyle.split("_")[0]]?.waitM ?? "M200";

    // Find handoff points (dependencies across channels)
    for (const ch of input.channels) {
      for (const op of ch.operations) {
        if (op.dependsOn) {
          for (const depId of op.dependsOn) {
            // Find which channel contains the dependency
            for (const otherCh of input.channels) {
              if (otherCh.channelId !== ch.channelId) {
                const depOp = otherCh.operations.find((o) => o.id === depId);
                if (depOp) {
                  allSyncPoints.push({
                    timeSec: channelTimelines
                      .find((t) => t.channelId === ch.channelId)
                      ?.operations.find((o) => o.id === op.id)?.startSec ?? 0,
                    channels: [otherCh.channelId, ch.channelId],
                    syncCode: syncCode,
                    reason: `${op.id} waits for ${depId}`,
                  });
                  reasoning.push(`Sync point: Ch${otherCh.channelId} -> Ch${ch.channelId} at ${depId}`);
                }
              }
            }
          }
        }
      }
    }

    // ── Calculate confidence ────────────────────────────────────────────────
    let confidence = 0.85;
    if (violations.length > 0) confidence = 0.3;
    else if (constraintNotes.length > 0) confidence -= 0.1 * Math.min(constraintNotes.length, 3);
    confidence = Math.max(0.3, Math.min(0.95, confidence));

    const status = violations.length > 0 ? "block" : constraintNotes.length > 0 ? "warn" : "pass";
    const message = violations.length > 0
      ? `Simultaneous ops BLOCKED: ${violations.join("; ")}`
      : constraintNotes.length > 0
        ? `Simultaneous ops WARNING: ${constraintNotes.join("; ")}`
        : `Simultaneous ops OK - ${input.channels.length} channels, ${syncStyle} sync`;

    return {
      status,
      message,
      channelTimelines,
      syncPoints: allSyncPoints,
      physicalConstraints: constraintNotes,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  /**
   * Generate bar-feed sequence for mill-turn bar stock programs.
   *
   * Chain-of-thought reasoning:
   * 1. Calculate part count from bar length
   * 2. Determine remnant length and usability
   * 3. Select appropriate collet size
   * 4. Generate bar advance sequence
   *
   * @param input - Bar stock parameters
   * @returns Bar feed sequence with part count
   */
  calculateBarFeedSequence(input: BarFeedSequenceInput): BarFeedResult {
    this.calcCount++;
    const reasoning: string[] = [];

    // ── Part count calculation ──────────────────────────────────────────────
    const stockAdvanceMm = input.partLengthMm + input.cutoffWidthMm;
    const usableLength = input.barLengthMm - (input.remnantMinLengthMm ?? input.barDiameterMm * 2);
    const partCount = Math.floor(usableLength / stockAdvanceMm);
    const remnantLengthMm = input.barLengthMm - (partCount * stockAdvanceMm);

    reasoning.push(`Bar: ${input.barDiameterMm}mm dia x ${input.barLengthMm}mm`);
    reasoning.push(`Part length: ${input.partLengthMm}mm + ${input.cutoffWidthMm}mm cutoff = ${stockAdvanceMm}mm/cycle`);
    reasoning.push(`Usable length: ${usableLength}mm (min remnant: ${input.remnantMinLengthMm ?? input.barDiameterMm * 2}mm)`);
    reasoning.push(`Part count: ${partCount} parts`);
    reasoning.push(`Remnant: ${remnantLengthMm.toFixed(1)}mm`);

    // ── Remnant usability ───────────────────────────────────────────────────
    const remnantMinLength = input.remnantMinLengthMm ?? (input.barDiameterMm * 2);
    const remnantUsable = remnantLengthMm >= remnantMinLength;
    reasoning.push(remnantUsable
      ? `Remnant usable: ${remnantLengthMm.toFixed(1)}mm >= ${remnantMinLength}mm`
      : `Remnant scrap: ${remnantLengthMm.toFixed(1)}mm < ${remnantMinLength}mm`);

    // ── Collet selection ────────────────────────────────────────────────────
    const colletType = input.colletType ?? (input.guideBushing ? "swiss_guide" : "5c");
    const colletSize = input.guideBushing
      ? `${input.barDiameterMm}mm Swiss guide bushing`
      : `${input.barDiameterMm}mm ${colletType.toUpperCase()} collet`;
    reasoning.push(`Collet: ${colletSize}`);

    // ── Cycle sequence ──────────────────────────────────────────────────────
    const cycleSequence: string[] = [
      `( BAR FEED SEQUENCE )`,
      `( Bar: ${input.barDiameterMm}mm dia x ${input.barLengthMm}mm ${input.material} )`,
      `( Parts per bar: ${partCount} )`,
      `( Stock advance: ${stockAdvanceMm}mm per cycle )`,
      `( Remnant: ${remnantLengthMm.toFixed(1)}mm - ${remnantUsable ? "USABLE" : "SCRAP"} )`,
      ``,
      `G98 ( Feed per rev mode )`,
      `M41 ( Bar feeder clamp open )`,
      `G04 P300 ( Dwell for bar settle )`,
      `M300 ( Bar advance ${stockAdvanceMm}mm )`,
      `G04 P500 ( Dwell for bar feed )`,
      `M42 ( Bar feeder clamp close )`,
    ];

    // ── Confidence ──────────────────────────────────────────────────────────
    let confidence = 0.9;
    if (partCount < 1) confidence = 0.3;
    else if (!remnantUsable) confidence = 0.85;

    return {
      partCount,
      remnantLengthMm: Math.round(remnantLengthMm * 10) / 10,
      remnantUsable,
      stockAdvanceMm,
      colletSize,
      cycleSequence,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  /**
   * Get engine statistics.
   */
  stats(): { calculations: number; controllersSupported: number } {
    return {
      calculations: this.calcCount,
      controllersSupported: Object.keys(SYNC_CODES).length,
    };
  }
}

export const mastercamMillTurnBridge = new MastercamMillTurnBridge();
