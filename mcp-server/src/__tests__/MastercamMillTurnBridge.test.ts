/**
 * MastercamMillTurnBridge.test.ts — U-foxtrot-MastercamMillTurnBridge-TEST
 * ===========================================================================
 * Real reference-value coverage for the previously-UNTESTED
 * MastercamMillTurnBridge engine (src/engines/MastercamMillTurnBridge.ts).
 *
 * The engine bridges Mastercam mill-turn programming to PRISM physics:
 *   - calculateSpindleHandoff     (main→sub spindle transfer, grip force check)
 *   - calculateSimultaneousOps    (multi-channel timeline + C-axis conflicts)
 *   - calculateBarFeedSequence    (part count, remnant, collet selection)
 *
 * Every expected value below is derived by hand from the engine's OWN formulas
 * and constants (verified numerically before writing):
 *   grip force    F_grip = mu * P * (pi * D * grip)            [mu=0.12 "5c"]
 *   axial force   F_axial = kc * cutoffWidth * cutoffFeed
 *   required      F_req   = 1.5 * F_axial
 *   stock advance = partLen + cutoffWidth
 *   part count    = floor((barLen - remnantMin) / stockAdvance)
 *   remnant       = barLen - partCount * stockAdvance
 * Constant tables (MIN_GRIP_LENGTH_MM, COLLET_FRICTION, CLAMPING_PRESSURE_MPA,
 * KC_BY_ISO, SYNC_CODES) are the engine's private consts — the reference values
 * pin them structurally.
 *
 * R15: the ONE dispatcher-wired action (`mastercam_mill_turn_handoff` on
 * camDispatcher.ts:20796) is additionally driven THROUGH the real prism_cam
 * handler (normalizeParams → validate → pre-hooks → slimResponse) to prove the
 * wired path is numerically correct end-to-end, not just the singleton. The
 * other two methods are NOT Mastercam-dispatcher-wired (the camDispatcher
 * simultaneous/barfeed cases route to the hyperMILL bridge), so they are
 * covered via direct singleton import.
 *
 * R12 — two latent dead-branch behaviors are PINNED, not papered over:
 *   (1) calculateSpindleHandoff can never return status "warn": both warning
 *       paths (short grip length, inadequate grip force) also set blocked=true,
 *       so the "warn" ternary branch is unreachable — inadequate grip yields
 *       "block".
 *   (2) calculateBarFeedSequence.remnantUsable can never be false: the same
 *       remnantMin is subtracted to compute usableLength before the floor, which
 *       guarantees the leftover remnant >= remnantMin. The "SCRAP" / confidence
 *       0.85 branch is dead. A negative bar (barLen < remnantMin) even yields a
 *       negative partCount. Both are pinned as current (buggy) behavior.
 *
 * @engine MastercamMillTurnBridge
 * @milestone MAIN
 * @unit U-foxtrot-MastercamMillTurnBridge-TEST
 * @slot foxtrot
 */

import { describe, it, expect, beforeAll } from "vitest";

import {
  mastercamMillTurnBridge,
  MastercamMillTurnBridge,
  type SpindleHandoffInput,
  type SimultaneousOpsInput,
  type BarFeedSequenceInput,
} from "../engines/MastercamMillTurnBridge.js";

import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

// ===========================================================================
// SPINDLE HANDOFF — direct singleton
// ===========================================================================

describe("MastercamMillTurnBridge.calculateSpindleHandoff", () => {
  it("PASS: adequate grip length + force, ratio<2 → confidence 0.9", () => {
    // ISO P (minGrip 12), D=25 → range 20-40 (P=4.0MPa), grip=20, 5c mu=0.12.
    // F_grip = 0.12*4.0*(pi*25*20) = 240*pi = 753.98 → round 754.
    // F_axial = 1800*2*0.1 = 360; F_req = 540. ratio 1.396 (not >2) → conf 0.9.
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 25,
      workpieceLengthMm: 80,
      material: "4140",
      isoGroup: "P",
      mainSpindleRPM: 2000,
      transferMode: "synchronized",
      cutoffToolWidthMm: 2,
      cutoffFeedMmRev: 0.1,
      subSpindleGripLengthMm: 20,
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.status).toBe("pass");
    expect(r.gripForceCheck.gripForceN).toBe(754);
    expect(r.gripForceCheck.requiredForceN).toBe(540);
    expect(r.gripForceCheck.adequate).toBe(true);
    expect(r.confidence).toBe(0.9);
    expect(r.message).toContain("Spindle handoff OK");
  });

  it("PASS: very high grip:required ratio (>2) → confidence 0.95", () => {
    // ISO N (minGrip 8, kc 700), D=15 → range 0-20 (3.5MPa), grip=25.
    // F_grip = 0.12*3.5*(pi*15*25) = 157.5*pi = 494.80 → round 495.
    // F_axial = 700*1*0.05 = 35; F_req = 52.5 → round 53. ratio 9.42 → conf 0.95.
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 15,
      workpieceLengthMm: 60,
      material: "6061",
      isoGroup: "N",
      mainSpindleRPM: 4000,
      transferMode: "speed_match",
      cutoffToolWidthMm: 1,
      cutoffFeedMmRev: 0.05,
      subSpindleGripLengthMm: 25,
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.status).toBe("pass");
    expect(r.gripForceCheck.gripForceN).toBe(495);
    expect(r.gripForceCheck.requiredForceN).toBe(53);
    expect(r.gripForceCheck.adequate).toBe(true);
    expect(r.confidence).toBe(0.95);
  });

  it("BLOCK (failure): grip length below ISO minimum → status block, confidence 0.2", () => {
    // ISO S (minGrip 20), grip defaults to 15 (<20) → blocked on length.
    // Also F_grip=0.12*4.0*(pi*30*15)=216*pi=678.58→679, F_req=2800*3*0.15*1.5=1890.
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 30,
      workpieceLengthMm: 90,
      material: "Inconel718",
      isoGroup: "S",
      mainSpindleRPM: 800,
      transferMode: "stop_transfer",
      cutoffToolWidthMm: 3,
      cutoffFeedMmRev: 0.15,
      // subSpindleGripLengthMm omitted → default 15 < 20
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.status).toBe("block");
    expect(r.confidence).toBe(0.2);
    expect(r.gripForceCheck.gripForceN).toBe(679);
    expect(r.gripForceCheck.requiredForceN).toBe(1890);
    expect(r.gripForceCheck.adequate).toBe(false);
    expect(r.message).toContain("BLOCKED");
    expect(r.reasoning.some((l) => l.includes("Insufficient grip length"))).toBe(true);
  });

  it("BLOCK (failure): adequate length but grip force < required — pins that 'warn' is unreachable (R12)", () => {
    // ISO H (minGrip 18, kc 3200), grip=18 (== min, length OK), D=50 → range 40-60 (4.5MPa).
    // F_grip = 0.12*4.5*(pi*50*18) = 0.54*900*pi = 486*pi = 1526.81 → round 1527.
    // F_axial = 3200*4*0.25 = 3200; F_req = 4800. 1527 < 4800 → inadequate → BLOCK.
    // Grip-force inadequacy also sets blocked=true, so status is "block" not "warn".
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 50,
      workpieceLengthMm: 120,
      material: "D2-hardened",
      isoGroup: "H",
      mainSpindleRPM: 500,
      transferMode: "synchronized",
      cutoffToolWidthMm: 4,
      cutoffFeedMmRev: 0.25,
      subSpindleGripLengthMm: 18,
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.status).toBe("block"); // NOT "warn" — dead branch pinned
    expect(r.gripForceCheck.gripForceN).toBe(1527);
    expect(r.gripForceCheck.requiredForceN).toBe(4800);
    expect(r.gripForceCheck.adequate).toBe(false);
    expect(r.confidence).toBe(0.2);
    expect(r.reasoning.some((l) => l.includes("Insufficient grip force"))).toBe(true);
  });

  it("controller sync codes: mazak vs okuma emit their own transfer M-codes", () => {
    const base: SpindleHandoffInput = {
      workpieceDiameterMm: 25,
      workpieceLengthMm: 80,
      material: "4140",
      isoGroup: "P",
      mainSpindleRPM: 2000,
      transferMode: "synchronized",
      cutoffToolWidthMm: 2,
      cutoffFeedMmRev: 0.1,
      subSpindleGripLengthMm: 20,
    };
    const mazak = mastercamMillTurnBridge.calculateSpindleHandoff({ ...base, controller: "mazak" });
    expect(mazak.syncCodes).toContain("M322 (SYNC SPINDLES)");
    expect(mazak.syncCodes[0]).toBe("( SPINDLE HANDOFF: synchronized mode )");

    const okuma = mastercamMillTurnBridge.calculateSpindleHandoff({ ...base, controller: "okuma" });
    expect(okuma.syncCodes).toContain("M234 (SUB ADVANCE)");
    // sanity: the two controllers do not emit identical code sets
    expect(okuma.syncCodes).not.toEqual(mazak.syncCodes);
  });

  it("back-work operations are sequenced as ordered G-code comments", () => {
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 25,
      workpieceLengthMm: 80,
      material: "4140",
      isoGroup: "P",
      mainSpindleRPM: 2000,
      transferMode: "synchronized",
      cutoffToolWidthMm: 2,
      cutoffFeedMmRev: 0.1,
      subSpindleGripLengthMm: 20,
      backWorkOperations: [
        { type: "face", depthMm: 2 },
        { type: "drill", depthMm: 10, diameterMm: 8 },
      ],
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.backWorkSequence[0]).toBe("( BACK-WORK OPERATIONS )");
    expect(r.backWorkSequence[1]).toBe("( Op 1: FACE - depth 2mm )");
    expect(r.backWorkSequence[2]).toBe("( Op 2: DRILL - depth 10mm, dia 8mm )");
    expect(r.reasoning.some((l) => l.includes("2 back-work operations sequenced"))).toBe(true);
  });

  it("adversarial: missing controller + missing isoGroup default to generic + ISO P", () => {
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 25,
      workpieceLengthMm: 80,
      material: "mystery-steel",
      // isoGroup omitted → "P"
      mainSpindleRPM: 2000,
      transferMode: "synchronized",
      cutoffToolWidthMm: 2,
      cutoffFeedMmRev: 0.1,
      subSpindleGripLengthMm: 20,
      // controller omitted → generic
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.syncCodes).toContain("M200 (SYNC WAIT)"); // generic transfer code
    expect(r.reasoning.some((l) => l.includes("Material ISO P"))).toBe(true);
    expect(r.status).toBe("pass"); // same numbers as PASS case → conf 0.9
    expect(r.confidence).toBe(0.9);
  });

  it("adversarial: oversized diameter (>100mm) selects the 60-100 clamp range without crashing", () => {
    // ISO K (minGrip 10, kc 1100), D=200 → else-branch range 60-100 (5.0MPa), grip=30.
    // F_grip = 0.12*5.0*(pi*200*30) = 3600*pi = 11309.73 → round 11310.
    // F_axial = 1100*4*0.2 = 880; F_req = 1320. ratio 8.57 (>2) → conf 0.95.
    const input: SpindleHandoffInput = {
      workpieceDiameterMm: 200,
      workpieceLengthMm: 300,
      material: "GreyCastIron",
      isoGroup: "K",
      mainSpindleRPM: 400,
      transferMode: "synchronized",
      cutoffToolWidthMm: 4,
      cutoffFeedMmRev: 0.2,
      subSpindleGripLengthMm: 30,
    };
    const r = mastercamMillTurnBridge.calculateSpindleHandoff(input);
    expect(r.gripForceCheck.gripForceN).toBe(11310);
    expect(r.gripForceCheck.requiredForceN).toBe(1320);
    expect(r.status).toBe("pass");
    expect(r.confidence).toBe(0.95);
  });
});

// ===========================================================================
// SIMULTANEOUS OPS — direct singleton
// ===========================================================================

describe("MastercamMillTurnBridge.calculateSimultaneousOps", () => {
  it("PASS: single channel, sequential timeline, no conflicts → confidence 0.85", () => {
    const input: SimultaneousOpsInput = {
      channels: [
        {
          channelId: 1,
          operations: [
            { id: "op1", type: "od_rough", durationSec: 30 },
            { id: "op2", type: "od_finish", durationSec: 20 },
          ],
        },
      ],
    };
    const r = mastercamMillTurnBridge.calculateSimultaneousOps(input);
    expect(r.status).toBe("pass");
    expect(r.confidence).toBe(0.85);
    const t = r.channelTimelines[0];
    expect(t.operations[0]).toMatchObject({ id: "op1", startSec: 0, endSec: 30 });
    expect(t.operations[1]).toMatchObject({ id: "op2", startSec: 30, endSec: 50 });
    expect(t.totalTimeSec).toBe(50);
    expect(r.syncPoints).toHaveLength(0);
  });

  it("PASS with sync point: cross-channel dependency emits a fanuc M200 wait", () => {
    const input: SimultaneousOpsInput = {
      channels: [
        { channelId: 1, operations: [{ id: "m1", type: "od_rough", durationSec: 40 }] },
        { channelId: 2, operations: [{ id: "s1", type: "od_finish", durationSec: 25, dependsOn: ["m1"] }] },
      ],
      // syncStyle omitted → "fanuc_wait_m" → SYNC_CODES.fanuc.waitM = "M200"
    };
    const r = mastercamMillTurnBridge.calculateSimultaneousOps(input);
    expect(r.status).toBe("pass"); // cross-channel dep alone is NOT a constraint note
    expect(r.confidence).toBe(0.85);
    expect(r.syncPoints).toHaveLength(1);
    expect(r.syncPoints[0]).toMatchObject({
      timeSec: 0,
      channels: [1, 2],
      syncCode: "M200",
      reason: "s1 waits for m1",
    });
  });

  it("WARN (failure): C-axis op concurrent with a turning op → constraint note, confidence 0.75", () => {
    const input: SimultaneousOpsInput = {
      channels: [
        { channelId: 1, operations: [{ id: "c1", type: "c_axis_contour", durationSec: 15, requiresCAxis: true }] },
        { channelId: 2, operations: [{ id: "t1", type: "od_rough", durationSec: 20 }] },
      ],
    };
    const r = mastercamMillTurnBridge.calculateSimultaneousOps(input);
    expect(r.status).toBe("warn");
    expect(r.physicalConstraints).toHaveLength(1);
    expect(r.physicalConstraints[0]).toContain("C-axis lock conflict");
    expect(r.confidence).toBe(0.75); // 0.85 - 0.1*min(1,3)
    expect(r.message).toContain("WARNING");
  });

  it("failure: multiple C-axis conflicts cap the penalty at 3 notes → confidence 0.55", () => {
    // 1 turning op + 4 C-axis ops, each C-axis op conflicts with the turning op
    // → 4 constraint notes, but confidence penalty is 0.1*min(4,3) = 0.3 → 0.55.
    const input: SimultaneousOpsInput = {
      channels: [
        {
          channelId: 1,
          operations: [
            { id: "t", type: "od_rough", durationSec: 10 },
            { id: "c1", type: "c_axis_contour", durationSec: 5, requiresCAxis: true },
            { id: "c2", type: "c_axis_contour", durationSec: 5, requiresCAxis: true },
            { id: "c3", type: "c_axis_contour", durationSec: 5, requiresCAxis: true },
            { id: "c4", type: "c_axis_contour", durationSec: 5, requiresCAxis: true },
          ],
        },
      ],
    };
    const r = mastercamMillTurnBridge.calculateSimultaneousOps(input);
    expect(r.status).toBe("warn");
    expect(r.physicalConstraints).toHaveLength(4);
    expect(r.confidence).toBe(0.55);
  });

  it("adversarial: empty channels array → pass, empty timelines, no crash", () => {
    const input: SimultaneousOpsInput = { channels: [] };
    const r = mastercamMillTurnBridge.calculateSimultaneousOps(input);
    expect(r.status).toBe("pass");
    expect(r.channelTimelines).toHaveLength(0);
    expect(r.syncPoints).toHaveLength(0);
    expect(r.confidence).toBe(0.85);
    expect(r.message).toContain("0 channels");
  });
});

// ===========================================================================
// BAR FEED SEQUENCE — direct singleton
// ===========================================================================

describe("MastercamMillTurnBridge.calculateBarFeedSequence", () => {
  it("PASS: part count + remnant from bar (default remnantMin = 2*dia)", () => {
    // stockAdvance = 50+3 = 53; usable = 1000 - (25*2=50) = 950;
    // partCount = floor(950/53) = 17; remnant = 1000 - 17*53 = 99.
    const input: BarFeedSequenceInput = {
      barDiameterMm: 25,
      barLengthMm: 1000,
      partLengthMm: 50,
      cutoffWidthMm: 3,
      material: "1018",
    };
    const r = mastercamMillTurnBridge.calculateBarFeedSequence(input);
    expect(r.stockAdvanceMm).toBe(53);
    expect(r.partCount).toBe(17);
    expect(r.remnantLengthMm).toBe(99);
    expect(r.remnantUsable).toBe(true);
    expect(r.colletSize).toBe("25mm 5C collet");
    expect(r.confidence).toBe(0.9);
  });

  it("explicit collet type is echoed in the collet size string", () => {
    const input: BarFeedSequenceInput = {
      barDiameterMm: 16,
      barLengthMm: 600,
      partLengthMm: 40,
      cutoffWidthMm: 2,
      material: "303SS",
      colletType: "16c",
    };
    const r = mastercamMillTurnBridge.calculateBarFeedSequence(input);
    expect(r.colletSize).toBe("16mm 16C collet");
    // stockAdvance 42, usable 600-32=568, partCount floor(568/42)=13, remnant 600-546=54
    expect(r.partCount).toBe(13);
    expect(r.remnantLengthMm).toBe(54);
  });

  it("guide bushing (Swiss) selects swiss bushing collet label", () => {
    const input: BarFeedSequenceInput = {
      barDiameterMm: 12,
      barLengthMm: 300,
      partLengthMm: 20,
      cutoffWidthMm: 2,
      material: "Ti6Al4V",
      guideBushing: true,
    };
    const r = mastercamMillTurnBridge.calculateBarFeedSequence(input);
    expect(r.colletSize).toBe("12mm Swiss guide bushing");
    // stockAdvance 22, usable 300-24=276, partCount floor(276/22)=12, remnant 300-264=36
    expect(r.partCount).toBe(12);
    expect(r.remnantLengthMm).toBe(36);
    expect(r.remnantUsable).toBe(true);
  });

  it("failure: bar too short to yield one part → partCount 0, confidence 0.3", () => {
    // stockAdvance 53, usable = 60 - (30*2=60) = 0, partCount floor(0/53)=0, remnant 60.
    const input: BarFeedSequenceInput = {
      barDiameterMm: 30,
      barLengthMm: 60,
      partLengthMm: 50,
      cutoffWidthMm: 3,
      material: "4140",
    };
    const r = mastercamMillTurnBridge.calculateBarFeedSequence(input);
    expect(r.partCount).toBe(0);
    expect(r.remnantLengthMm).toBe(60);
    expect(r.confidence).toBe(0.3);
  });

  it("adversarial (R12): bar shorter than remnant-min yields a NEGATIVE part count — pinned as current behavior", () => {
    // usable = 50 - (40*2=80) = -30; partCount = floor(-30/33) = -1 (a bug — a negative part count).
    // remnant = 50 - (-1)*33 = 83. This is nonsensical output but is what the engine returns today.
    const input: BarFeedSequenceInput = {
      barDiameterMm: 40,
      barLengthMm: 50,
      partLengthMm: 30,
      cutoffWidthMm: 3,
      material: "6061",
    };
    const r = mastercamMillTurnBridge.calculateBarFeedSequence(input);
    expect(r.partCount).toBe(-1); // BUG pinned, not asserted-away
    expect(r.remnantLengthMm).toBe(83);
    expect(r.confidence).toBe(0.3); // partCount < 1
  });

  it("R12: remnantUsable is structurally ALWAYS true — the SCRAP branch is dead", () => {
    // The same remnantMin is subtracted to size usableLength before the floor, so the
    // leftover remnant is mathematically guaranteed >= remnantMin. Sweep varied inputs
    // (including an explicit large remnantMin) and assert remnantUsable never goes false.
    const cases: BarFeedSequenceInput[] = [
      { barDiameterMm: 20, barLengthMm: 500, partLengthMm: 45, cutoffWidthMm: 3, material: "A", remnantMinLengthMm: 80 },
      { barDiameterMm: 25, barLengthMm: 1000, partLengthMm: 50, cutoffWidthMm: 3, material: "B" },
      { barDiameterMm: 32, barLengthMm: 733, partLengthMm: 61, cutoffWidthMm: 4, material: "C", remnantMinLengthMm: 120 },
      { barDiameterMm: 12, barLengthMm: 250, partLengthMm: 17, cutoffWidthMm: 1, material: "D" },
    ];
    for (const c of cases) {
      const r = mastercamMillTurnBridge.calculateBarFeedSequence(c);
      const remnantMin = c.remnantMinLengthMm ?? c.barDiameterMm * 2;
      expect(r.remnantLengthMm).toBeGreaterThanOrEqual(remnantMin);
      expect(r.remnantUsable).toBe(true);
    }
  });
});

// ===========================================================================
// ENGINE STATS + CLASS SHAPE
// ===========================================================================

describe("MastercamMillTurnBridge stats + construction", () => {
  it("stats() reports the 6 supported controllers and a monotonic calc counter", () => {
    const fresh = new MastercamMillTurnBridge();
    expect(fresh.stats().calculations).toBe(0);
    fresh.calculateBarFeedSequence({
      barDiameterMm: 20, barLengthMm: 400, partLengthMm: 30, cutoffWidthMm: 2, material: "x",
    });
    const s = fresh.stats();
    expect(s.calculations).toBe(1);
    // fanuc, mazak, okuma, siemens, haas, generic
    expect(s.controllersSupported).toBe(6);
  });
});

// ===========================================================================
// DISPATCHER ROUND-TRIP (R15) — mastercam_mill_turn_handoff through prism_cam
// ===========================================================================

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) {
      tools.push({ name, handler });
    },
  };
}

describe("prism_cam round-trip: mastercam_mill_turn_handoff (R15 wired path)", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    const server = makeStubServer();
    registerCamDispatcher(server);
    const tool = server.tools.find((t) => t.name === "prism_cam");
    if (!tool) throw new Error("prism_cam tool not registered");
    handler = tool.handler;
  });

  async function call(params: Record<string, unknown>): Promise<any> {
    const res = await handler({ action: "mastercam_mill_turn_handoff", params });
    return JSON.parse(res.content[0].text);
  }

  it("PASS handoff numerically matches the singleton through the wired handler", async () => {
    const parsed = await call({
      workpieceDiameterMm: 25,
      workpieceLengthMm: 80,
      material: "4140",
      isoGroup: "P",
      mainSpindleRPM: 2000,
      transferMode: "synchronized",
      cutoffToolWidthMm: 2,
      cutoffFeedMmRev: 0.1,
      subSpindleGripLengthMm: 20,
    });
    // handler wraps as { success:true, data:<result> } then slimResponse().
    expect(parsed.success).toBe(true);
    const d = parsed.data;
    expect(d.status).toBe("pass");
    expect(d.gripForceCheck.gripForceN).toBe(754);
    expect(d.gripForceCheck.requiredForceN).toBe(540);
    expect(d.gripForceCheck.adequate).toBe(true);
    expect(d.confidence).toBe(0.9);
    // arrays survive slimResponse (non-empty); backWorkSequence is [] → stripped.
    expect(Array.isArray(d.syncCodes)).toBe(true);
    expect(d.syncCodes.length).toBeGreaterThan(0);
    expect(d.transferSequence.length).toBeGreaterThan(0);
  });

  it("BLOCK handoff propagates through the wired handler with matching physics", async () => {
    const parsed = await call({
      workpieceDiameterMm: 30,
      workpieceLengthMm: 90,
      material: "Inconel718",
      isoGroup: "S",
      mainSpindleRPM: 800,
      transferMode: "stop_transfer",
      cutoffToolWidthMm: 3,
      cutoffFeedMmRev: 0.15,
    });
    expect(parsed.success).toBe(true);
    const d = parsed.data;
    expect(d.status).toBe("block");
    expect(d.confidence).toBe(0.2);
    expect(d.gripForceCheck.gripForceN).toBe(679);
    expect(d.gripForceCheck.requiredForceN).toBe(1890);
    expect(d.gripForceCheck.adequate).toBe(false);
    expect(d.message).toContain("BLOCKED");
  });
});
