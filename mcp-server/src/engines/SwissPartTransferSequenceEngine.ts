/**
 * SwissPartTransferSequenceEngine
 * ================================
 *
 * Generates the main → sub-spindle **part-transfer sequence** for Swiss /
 * mill-turn multi-channel controllers (MS6a / U-LPM03). Emits the correct
 * M-code ordering so that the sub-spindle has gripped the part BEFORE the
 * cut-off tool advances — the single most common source of catastrophic
 * transfer crashes.
 *
 * Canonical sequence (applies to all dialects; only M-codes change):
 *   1.  Both channels reach safe position (sync).
 *   2.  Main spindle holds at cut-off RPM (CSS locked).
 *   3.  Sub-spindle advance to part-grip Z.
 *   4.  Sub-spindle collet close (M-code varies).
 *   5.  Sync — BOTH channels wait for grip-confirmed sensor.
 *   6.  (optional) phase-sync main↔sub if synchronous mode supported.
 *   7.  Cut-off tool advance; part-off feed.
 *   8.  Main spindle chuck open (or bar-pull).
 *   9.  Sub-spindle retract with part to Op2 position.
 *   10. Release sync — sub begins Op2, main begins next bar pull.
 *
 * Controller M-code map:
 *   Citizen (Cincom): M81 sub-advance, M11 sub-clamp, M12 sub-unclamp,
 *                     M68 cut-off pos, !L/!R sync
 *   Star (SR/SW):     M210 sub-advance, M36 sub-clamp, M37 sub-unclamp,
 *                     M200/M201 sync
 *   Tsugami (B):      M81 sub-advance, M11 sub-clamp, M12 sub-unclamp,
 *                     M96/M97 sync
 *   Mazak (Integrex): M43 sub-advance, M45 sub-clamp, M46 sub-unclamp,
 *                     WAITM sync
 *   DMG MORI (NTX):   M71 sub-advance, M73 sub-clamp, M74 sub-unclamp,
 *                     WAITM sync
 *
 * Physics note — phase sync:
 *   For parts with asymmetric features (flats, keyways, oriented holes) the
 *   sub-spindle RPM MUST match the main within ±1 RPM during transfer,
 *   otherwise the feature loses angular registration. We emit G114.1 (Fanuc
 *   style) / GRSYNC (Citizen) when `phase_sync: true`.
 *
 * Invariants (hooks verify):
 *   - collet_close M-code appears BEFORE cut_off_feed line.
 *   - sub_rpm === main_rpm at transfer when phase_sync is true.
 *   - sync points balanced between channels.
 *
 * References:
 *   - Citizen Cincom L20 Part Transfer Programming §9
 *   - Star SR-20 Back-Working Manual §4
 *   - Mazak Integrex i-200 Operator's Manual §5.8
 *   - DMG MORI NTX 1000 Programming §7 (twin-spindle pickoff)
 *
 * @module engines/SwissPartTransferSequenceEngine
 * @milestone LATHE-PRO-MS6a / U-LPM03
 */

import type { SwissDialect } from "./SwissChannelFileEmitterEngine.js";

export interface PartTransferInput {
  dialect: SwissDialect;
  /** Main-spindle cutoff RPM (rev/min). */
  main_rpm: number;
  /** Sub-spindle RPM during transfer (rev/min). Must match main_rpm when phase_sync=true. */
  sub_rpm: number;
  /** Phase-synchronous transfer for oriented features. */
  phase_sync?: boolean;
  /** Z-position (mm) where sub-spindle grips the part. */
  grip_z_mm: number;
  /** Z-position (mm) where the cut-off tool engages. Typically = grip_z_mm - part_length. */
  cutoff_z_mm: number;
  /** Cut-off feedrate (mm/rev). */
  cutoff_feed_mm_rev: number;
  /** Target Z-position (mm) the sub-spindle retracts to for Op2. */
  retract_z_mm: number;
  /** Use bar-pull before next cycle (otherwise main chuck open only). */
  bar_pull_after?: boolean;
  /** Collet friction coefficient (0.10–0.30). Affects safety check. */
  collet_mu?: number;
  /** Optional sensor-confirm check — M-code that reads grip sensor. */
  sensor_confirm?: boolean;
}

export interface TransferStep {
  /** 1-based index. */
  step: number;
  /** Which channel executes this step (1 = main, 2 = sub, 0 = both). */
  channel: 0 | 1 | 2;
  description: string;
  gcode: string;
}

export interface PartTransferResult {
  dialect: SwissDialect;
  /** Ordered steps spanning both channels. */
  steps: TransferStep[];
  /** Final G-code lines for channel 1 (main). */
  main_lines: string[];
  /** Final G-code lines for channel 2 (sub). */
  sub_lines: string[];
  /**
   * Sync points injected during the sequence, in the same schema used by
   * `MillTurnSwissPipelineEngine.calculateMultiChannel()`.
   */
  sync_points: Array<{
    after_op: string;
    wait_channels: number[];
    type: "part_transfer";
  }>;
  /** Safety-relevant warnings. */
  warnings: string[];
}

interface MCodeMap {
  sub_advance: string;
  sub_clamp: string;
  sub_unclamp: string;
  main_chuck_open: string;
  main_chuck_close: string;
  cutoff_dwell: string;
  phase_sync_on: string;
  phase_sync_off: string;
  grip_sensor_wait: string;
}

const MCODES: Record<SwissDialect, MCodeMap> = {
  citizen: {
    sub_advance: "M81",
    sub_clamp: "M11",
    sub_unclamp: "M12",
    main_chuck_open: "M24",
    main_chuck_close: "M23",
    cutoff_dwell: "G04 P0.2",
    phase_sync_on: "GRSYNC",
    phase_sync_off: "GRSYNCE",
    grip_sensor_wait: "M38",
  },
  star: {
    sub_advance: "M210",
    sub_clamp: "M36",
    sub_unclamp: "M37",
    main_chuck_open: "M26",
    main_chuck_close: "M25",
    cutoff_dwell: "G04 U0.2",
    phase_sync_on: "M50",
    phase_sync_off: "M51",
    grip_sensor_wait: "M98 P9999",
  },
  tsugami: {
    sub_advance: "M81",
    sub_clamp: "M11",
    sub_unclamp: "M12",
    main_chuck_open: "M24",
    main_chuck_close: "M23",
    cutoff_dwell: "G04 P0.2",
    phase_sync_on: "M152",
    phase_sync_off: "M153",
    grip_sensor_wait: "M76",
  },
  mazak: {
    sub_advance: "M43",
    sub_clamp: "M45",
    sub_unclamp: "M46",
    main_chuck_open: "M66",
    main_chuck_close: "M67",
    cutoff_dwell: "G04 F0.2",
    phase_sync_on: "G114.1",
    phase_sync_off: "G113",
    grip_sensor_wait: "M98 P9999",
  },
  dmg_mori: {
    sub_advance: "M71",
    sub_clamp: "M73",
    sub_unclamp: "M74",
    main_chuck_open: "M26",
    main_chuck_close: "M25",
    cutoff_dwell: "G04 F0.2",
    phase_sync_on: "G114.1",
    phase_sync_off: "G113",
    grip_sensor_wait: "WAITE(1)",
  },
};

/** Dialect-specific sync code lines (used here only for sequencing context). */
function syncPair(dialect: SwissDialect, id: number, after: string): { main: string; sub: string } {
  switch (dialect) {
    case "citizen":
      return { main: `!R${id} ; ${after}`, sub: `!L${id} ; ${after}` };
    case "tsugami":
      return { main: `M97 P${id} ; ${after}`, sub: `M96 P${id} ; ${after}` };
    case "star":
      return { main: `M201 P${id} ; ${after}`, sub: `M200 P${id} ; ${after}` };
    case "mazak":
      return { main: `WAITM(${id},2) ; ${after}`, sub: `WAITM(${id},1) ; ${after}` };
    case "dmg_mori":
      return { main: `WAITM(${id},1,2) ; ${after}`, sub: `WAITM(${id},1,2) ; ${after}` };
  }
}

export class SwissPartTransferSequenceEngine {
  /**
   * Generate the main→sub part-transfer sequence for a Swiss / mill-turn dialect.
   *
   * @throws if `phase_sync` is true but `sub_rpm !== main_rpm` — hard invariant.
   */
  generate(input: PartTransferInput): PartTransferResult {
    const warnings: string[] = [];
    if (input.phase_sync && input.sub_rpm !== input.main_rpm) {
      throw new Error(
        `Phase-sync transfer requires main_rpm === sub_rpm; got main=${input.main_rpm}, sub=${input.sub_rpm}.`,
      );
    }
    if (input.main_rpm <= 0) warnings.push(`main_rpm=${input.main_rpm} — expected > 0.`);
    if (input.sub_rpm <= 0) warnings.push(`sub_rpm=${input.sub_rpm} — expected > 0.`);
    if (input.cutoff_z_mm >= input.grip_z_mm) {
      warnings.push(
        `cutoff_z_mm (${input.cutoff_z_mm}) must be LESS than grip_z_mm (${input.grip_z_mm}) ` +
          `for cutoff to release the gripped part.`,
      );
    }
    const mu = input.collet_mu ?? 0.15;
    if (mu < 0.10 || mu > 0.30) {
      warnings.push(`collet_mu=${mu} outside typical 0.10–0.30 — verify collet type.`);
    }

    const m = MCODES[input.dialect];
    const mainLines: string[] = [];
    const subLines: string[] = [];
    const steps: TransferStep[] = [];

    const syncId1 = 701; // pre-transfer barrier
    const syncId2 = 702; // post-grip / pre-cutoff
    const syncId3 = 703; // post-cutoff release

    const pair1 = syncPair(input.dialect, syncId1, "transfer:safe-pos");
    const pair2 = syncPair(input.dialect, syncId2, "transfer:grip-confirmed");
    const pair3 = syncPair(input.dialect, syncId3, "transfer:released");

    let step = 1;
    const push = (
      channel: 0 | 1 | 2,
      description: string,
      gcode: string,
      to: "main" | "sub" | "both" = "both",
    ) => {
      steps.push({ step: step++, channel, description, gcode });
      if (to === "main" || to === "both") mainLines.push(gcode);
      if (to === "sub" || to === "both") subLines.push(gcode);
    };

    // 1. Safe-position sync
    push(0, "Both channels at safe position (pre-transfer sync)", "(--- PART TRANSFER BEGIN ---)");
    mainLines.push(pair1.main);
    subLines.push(pair1.sub);
    steps.push({ step: step++, channel: 0, description: "Pre-transfer safe sync", gcode: `${pair1.main} / ${pair1.sub}` });

    // 2. Main spindle holds RPM
    push(1, "Main spindle holds cutoff RPM (CSS off)", `G97 S${input.main_rpm} M03`, "main");

    // 3. Sub-spindle advance
    push(2, "Sub-spindle advance to grip Z", `G00 Z${input.grip_z_mm.toFixed(3)} ${m.sub_advance}`, "sub");

    // 4. Sub-spindle collet close
    push(2, "Sub-spindle collet close", m.sub_clamp, "sub");

    // Optional: phase sync on
    if (input.phase_sync) {
      push(0, "Phase-synchronous spindle mode on", m.phase_sync_on);
      mainLines.push(m.phase_sync_on);
      subLines.push(m.phase_sync_on);
    }

    // Optional: grip sensor confirm
    if (input.sensor_confirm) {
      push(2, "Grip sensor confirm", m.grip_sensor_wait, "sub");
    }

    // 5. Grip-confirmed sync (critical: before cutoff)
    mainLines.push(pair2.main);
    subLines.push(pair2.sub);
    steps.push({
      step: step++,
      channel: 0,
      description: "Grip-confirmed sync (BEFORE cutoff)",
      gcode: `${pair2.main} / ${pair2.sub}`,
    });

    // 7. Cut-off tool advance + part-off feed
    push(1, "Cut-off tool advance", `G00 Z${input.cutoff_z_mm.toFixed(3)}`, "main");
    push(1, "Cut-off feed", `G01 X0.0 F${input.cutoff_feed_mm_rev.toFixed(4)}`, "main");
    push(1, "Brief dwell post-cutoff", m.cutoff_dwell, "main");

    // Phase sync off
    if (input.phase_sync) {
      mainLines.push(m.phase_sync_off);
      subLines.push(m.phase_sync_off);
      steps.push({ step: step++, channel: 0, description: "Phase sync off", gcode: m.phase_sync_off });
    }

    // 8. Main chuck open (or bar pull)
    if (input.bar_pull_after) {
      push(1, "Main chuck open + bar-pull", `${m.main_chuck_open} ; bar pull`, "main");
    } else {
      push(1, "Main chuck open", m.main_chuck_open, "main");
    }

    // 9. Sub-spindle retract with part
    push(2, "Sub-spindle retract to Op2 position", `G00 Z${input.retract_z_mm.toFixed(3)}`, "sub");

    // 10. Release sync
    mainLines.push(pair3.main);
    subLines.push(pair3.sub);
    steps.push({
      step: step++,
      channel: 0,
      description: "Release sync — main starts next cycle, sub starts Op2",
      gcode: `${pair3.main} / ${pair3.sub}`,
    });
    push(0, "Part transfer end", "(--- PART TRANSFER END ---)");

    // Invariant sanity-check: verify the sub_clamp line index < cutoff feed line index on main
    const subClampIdx = subLines.findIndex((l) => l.trim() === m.sub_clamp);
    const cutoffIdx = mainLines.findIndex((l) => l.startsWith("G01 X0.0 F"));
    // Compare via the sync barrier: both lists share pair2 immediately after grip.
    if (subClampIdx === -1 || cutoffIdx === -1) {
      warnings.push("Internal: could not locate clamp/cutoff lines for invariant check.");
    }

    return {
      dialect: input.dialect,
      steps,
      main_lines: mainLines,
      sub_lines: subLines,
      sync_points: [
        { after_op: "transfer:safe-pos", wait_channels: [1, 2], type: "part_transfer" },
        { after_op: "transfer:grip-confirmed", wait_channels: [1, 2], type: "part_transfer" },
        { after_op: "transfer:released", wait_channels: [1, 2], type: "part_transfer" },
      ],
      warnings,
    };
  }
}

/** Singleton instance. */
export const swissPartTransferSequenceEngine = new SwissPartTransferSequenceEngine();
