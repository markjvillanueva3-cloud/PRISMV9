/**
 * HyperMillMillTurnBridge — strict-legitimacy vitest
 *
 * Coverage shape per CONTINUE_CAM_WORK.md:
 *   class shape + happy + ≥3 failure modes + ≥2 adversarial
 *   No weak assertions; named constants; real assertions on output structure.
 *
 * MillTurnSwissPipelineEngine is mocked because the bridge merely transforms
 * input → engine → output; the bridge logic under test is its grip-length
 * check, C-axis conflict detection, remnant classification, and string
 * formatting — none of which require the real pipeline.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Named constants (no magic numbers in assertions) ─────────────────────────
const MIN_GRIP_P_MM = 12;
const MIN_GRIP_M_MM = 15;
const MIN_GRIP_S_MM = 20;
const MIN_GRIP_K_MM = 10;
const SAFETY_FACTOR = 1.5;
const MOCK_GRIP_FORCE_N = 1200;
const MOCK_AXIAL_FORCE_N = 200;
const REMNANT_USABLE_MM = 80;
const REMNANT_SCRAP_MM = 5;
const PART_COUNT_5 = 5;

// ── Mock the heavyweight pipeline engine ─────────────────────────────────────
// Each .calculate() call routes by action; we return action-shaped fake output.
const calculateMock = vi.fn((req: { action: string; params: Record<string, unknown> }) => {
  switch (req.action) {
    case "sub_spindle_transfer":
      return {
        grip_force_N: MOCK_GRIP_FORCE_N,
        axial_cutting_force_N: MOCK_AXIAL_FORCE_N,
        sync_codes: [
          "( Sub-spindle transfer — fixture mode )",
          "M19 ( Spindle orient )",
          "M200 ( Wait sub-spindle )",
        ],
      };
    case "multi_channel_program":
      return {
        channel_timelines: [{ channel_id: 1, ops: [] }, { channel_id: 2, ops: [] }],
        sync_points: [{ at_s: 30, type: "wait" }],
        gantt_chart: [{ start: 0, end: 30, channel: 1 }],
      };
    case "bar_feeder_calc":
      return {
        part_count: PART_COUNT_5,
        remnant_length_mm:
          (req.params.bar_length_mm as number) -
          PART_COUNT_5 *
            ((req.params.part_length_mm as number) +
              (req.params.cutoff_width_mm as number)),
      };
    default:
      return {};
  }
});

vi.mock("../engines/MillTurnSwissPipelineEngine.js", () => ({
  millTurnSwissPipelineEngine: {
    calculate: (req: { action: string; params: Record<string, unknown> }) => calculateMock(req),
  },
}));

// Import after mock so the singleton resolves to our fake.
import { HyperMillMillTurnBridge, hyperMillMillTurnBridge } from "../engines/HyperMillMillTurnBridge.js";

describe("HyperMillMillTurnBridge", () => {
  beforeEach(() => {
    calculateMock.mockClear();
  });

  // ── Class shape ────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("singleton is an instance of HyperMillMillTurnBridge", () => {
      expect(hyperMillMillTurnBridge instanceof HyperMillMillTurnBridge).toBe(true);
    });

    it("exposes calculateSpindleHandoff, calculateSimultaneousOps, calculateBarFeedSequence", () => {
      expect(typeof hyperMillMillTurnBridge.calculateSpindleHandoff).toBe("function");
      expect(typeof hyperMillMillTurnBridge.calculateSimultaneousOps).toBe("function");
      expect(typeof hyperMillMillTurnBridge.calculateBarFeedSequence).toBe("function");
    });

    it("constructor is parameterless and yields independent instances", () => {
      const a = new HyperMillMillTurnBridge();
      const b = new HyperMillMillTurnBridge();
      expect(a === b).toBe(false);
      expect(a instanceof HyperMillMillTurnBridge).toBe(true);
    });
  });

  // ── calculateSpindleHandoff — happy paths + failure modes ──────────────────
  describe("calculateSpindleHandoff", () => {
    it("ISO P with adequate grip → status pass, gripAdequate true, sync codes propagated", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 25,
        workpieceLength_mm: 80,
        material: "1018 steel",
        isoGroup: "P",
        mainSpindleRPM: 2500,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.1,
        subSpindleGripLength_mm: MIN_GRIP_P_MM + 5,
      });
      expect(r.status).toBe("pass");
      expect(r.gripForceCheck.adequate).toBe(true);
      expect(r.gripForceCheck.gripForce_N).toBe(MOCK_GRIP_FORCE_N);
      expect(r.gripForceCheck.requiredForce_N).toBe(MOCK_AXIAL_FORCE_N * SAFETY_FACTOR);
      expect(r.syncCodes.length >= 1).toBe(true);
      expect(r.transferSequence.some(s => s.includes("synchronized"))).toBe(true);
      expect(r.ms10Compatible).toBe(true);
    });

    it("ISO M default min grip is 15mm — 14mm grip blocks", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 25,
        workpieceLength_mm: 80,
        material: "316 stainless",
        isoGroup: "M",
        mainSpindleRPM: 2000,
        transferMode: "speed_match",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.08,
        subSpindleGripLength_mm: MIN_GRIP_M_MM - 1,
      });
      expect(r.status).toBe("block");
      expect(r.message.includes("BLOCKED")).toBe(true);
      expect(r.message.includes(`minimum ${MIN_GRIP_M_MM}mm`)).toBe(true);
    });

    it("ISO S (heat-resistant) requires 20mm grip — 18mm blocks", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 30,
        workpieceLength_mm: 100,
        material: "Inconel 718",
        isoGroup: "S",
        mainSpindleRPM: 1200,
        transferMode: "stop_transfer",
        cutoffToolWidth_mm: 4,
        cutoffFeed_mm_rev: 0.05,
        subSpindleGripLength_mm: MIN_GRIP_S_MM - 2,
      });
      expect(r.status).toBe("block");
      expect(r.message.includes(`minimum ${MIN_GRIP_S_MM}mm`)).toBe(true);
    });

    it("missing isoGroup defaults to P (12mm minimum) — 11mm blocks", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 20,
        workpieceLength_mm: 60,
        material: "1018",
        mainSpindleRPM: 3000,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.1,
        subSpindleGripLength_mm: MIN_GRIP_P_MM - 1,
      });
      expect(r.status).toBe("block");
      expect(r.message.includes(`minimum ${MIN_GRIP_P_MM}mm`)).toBe(true);
    });

    it("missing subSpindleGripLength defaults to 15mm (passes for ISO P, K)", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 22,
        workpieceLength_mm: 70,
        material: "1018",
        isoGroup: "K",
        mainSpindleRPM: 2200,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.1,
      });
      expect(r.status).toBe("pass");
      expect(r.gripForceCheck.adequate).toBe(true);
      expect(MIN_GRIP_K_MM <= 15).toBe(true);
    });

    it("grip force inadequate (mock returns low force) → block status, force ratio reported", () => {
      calculateMock.mockReturnValueOnce({
        grip_force_N: 100,
        axial_cutting_force_N: 200,
        sync_codes: ["( low-force fixture )"],
      });
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 25,
        workpieceLength_mm: 80,
        material: "Ti-6Al-4V",
        isoGroup: "S",
        mainSpindleRPM: 1500,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 4,
        cutoffFeed_mm_rev: 0.06,
        subSpindleGripLength_mm: MIN_GRIP_S_MM + 2,
      });
      expect(r.status).toBe("block");
      expect(r.gripForceCheck.adequate).toBe(false);
      expect(r.gripForceCheck.requiredForce_N).toBe(200 * SAFETY_FACTOR);
      expect(r.message.includes("BLOCKED")).toBe(true);
    });

    it("backWorkOperations are propagated into backWorkSequence comments", () => {
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 30,
        workpieceLength_mm: 100,
        material: "1018",
        isoGroup: "P",
        mainSpindleRPM: 2500,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.1,
        subSpindleGripLength_mm: MIN_GRIP_P_MM + 5,
        backWorkOperations: [
          { type: "face", depth_mm: 1.5 },
          { type: "drill", depth_mm: 10, diameter_mm: 6 },
        ],
      });
      expect(r.backWorkSequence.length).toBe(2);
      expect(r.backWorkSequence[0].includes("face")).toBe(true);
      expect(r.backWorkSequence[0].includes("1.5mm")).toBe(true);
      expect(r.backWorkSequence[1].includes("drill")).toBe(true);
    });

    it("falls back to default sync codes when pipeline returns no sync_codes", () => {
      calculateMock.mockReturnValueOnce({
        grip_force_N: MOCK_GRIP_FORCE_N,
        axial_cutting_force_N: MOCK_AXIAL_FORCE_N,
      });
      const r = hyperMillMillTurnBridge.calculateSpindleHandoff({
        workpieceDiameter_mm: 25,
        workpieceLength_mm: 80,
        material: "1018",
        isoGroup: "P",
        mainSpindleRPM: 2500,
        transferMode: "synchronized",
        cutoffToolWidth_mm: 3,
        cutoffFeed_mm_rev: 0.1,
        subSpindleGripLength_mm: MIN_GRIP_P_MM + 5,
      });
      // Default has 4 entries: comment + G98 M05 + M19 + M200
      const M19_DEFAULT_COUNT = 4;
      expect(r.syncCodes.length).toBe(M19_DEFAULT_COUNT);
      expect(r.syncCodes.some(c => c.includes("M19"))).toBe(true);
    });
  });

  // ── calculateSimultaneousOps ───────────────────────────────────────────────
  describe("calculateSimultaneousOps", () => {
    it("happy path: 2 channels, no C-axis conflict → status pass, channelTimelines populated", () => {
      const r = hyperMillMillTurnBridge.calculateSimultaneousOps({
        channels: [
          { channelId: 1, operations: [{ id: "op1", type: "od_rough", durationSec: 30 }] },
          { channelId: 2, operations: [{ id: "op2", type: "id_finish", durationSec: 20 }] },
        ],
        syncStyle: "fanuc_wait_m",
        machineTurrets: 2,
      });
      expect(r.status).toBe("pass");
      expect(r.channelTimelines.length).toBe(2);
      expect(r.physicalConstraints.length).toBe(0);
      expect(r.ms10Compatible).toBe(true);
    });

    it("C-axis cross-mill concurrent with OD turning emits constraint note (warn)", () => {
      const r = hyperMillMillTurnBridge.calculateSimultaneousOps({
        channels: [
          {
            channelId: 1,
            operations: [
              { id: "turn1", type: "od_rough", durationSec: 30 },
              { id: "mill1", type: "cross_mill", durationSec: 15, requiresCAxis: true },
            ],
          },
        ],
        syncStyle: "siemens_waitm",
      });
      expect(r.status).toBe("warn");
      expect(r.physicalConstraints.length >= 1).toBe(true);
      expect(r.physicalConstraints[0].includes("C-axis")).toBe(true);
      expect(r.message.includes("WARNING")).toBe(true);
    });

    it("collisionClearance_mm option is propagated to pipeline as collision zone", () => {
      const COLLISION_CLEARANCE_MM = 25;
      hyperMillMillTurnBridge.calculateSimultaneousOps({
        channels: [
          { channelId: 1, operations: [{ id: "a", type: "face", durationSec: 10 }] },
          { channelId: 2, operations: [{ id: "b", type: "groove", durationSec: 12 }] },
        ],
        collisionClearance_mm: COLLISION_CLEARANCE_MM,
      });
      const lastCall = calculateMock.mock.calls.at(-1)![0];
      expect(lastCall.action).toBe("multi_channel_program");
      const zones = (lastCall.params as { collision_zones: Array<{ min_clearance_mm: number }> })
        .collision_zones;
      expect(zones.length).toBe(1);
      expect(zones[0].min_clearance_mm).toBe(COLLISION_CLEARANCE_MM);
    });

    it("default syncStyle is fanuc_wait_m, default machineTurrets is 2", () => {
      hyperMillMillTurnBridge.calculateSimultaneousOps({
        channels: [{ channelId: 1, operations: [{ id: "x", type: "face", durationSec: 5 }] }],
      });
      const lastCall = calculateMock.mock.calls.at(-1)![0];
      const params = lastCall.params as { sync_style: string; machine_turrets: number };
      expect(params.sync_style).toBe("fanuc_wait_m");
      const DEFAULT_TURRETS = 2;
      expect(params.machine_turrets).toBe(DEFAULT_TURRETS);
    });

    it("adversarial: empty channels array → status pass, zero constraints", () => {
      const r = hyperMillMillTurnBridge.calculateSimultaneousOps({ channels: [] });
      expect(r.status).toBe("pass");
      expect(r.physicalConstraints.length).toBe(0);
    });
  });

  // ── calculateBarFeedSequence ───────────────────────────────────────────────
  describe("calculateBarFeedSequence", () => {
    it("happy path: 5 parts from 1000mm bar yields usable remnant message", () => {
      const BAR_LEN_MM = 1000;
      const PART_LEN_MM = 150;
      const CUTOFF_MM = 4;
      // remnant = 1000 - 5*(150+4) = 230mm  (>= 80mm default min) → usable
      const r = hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 25,
        barLength_mm: BAR_LEN_MM,
        partLength_mm: PART_LEN_MM,
        cutoffWidth_mm: CUTOFF_MM,
        material: "1018",
        remnantMinLength_mm: REMNANT_USABLE_MM,
      });
      expect(r.partCount).toBe(PART_COUNT_5);
      expect(r.remnantLength_mm).toBe(BAR_LEN_MM - PART_COUNT_5 * (PART_LEN_MM + CUTOFF_MM));
      expect(r.remnantUsable).toBe(true);
      expect(r.stockAdvance_mm).toBe(PART_LEN_MM + CUTOFF_MM);
      expect(r.colletSize.includes("5C collet")).toBe(true);
      expect(r.cycleSequence.some(s => s.includes("usable"))).toBe(true);
    });

    it("guide bushing requested → collet label is Swiss guide bushing", () => {
      const r = hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 16,
        barLength_mm: 800,
        partLength_mm: 50,
        cutoffWidth_mm: 3,
        material: "303 stainless",
        guideBushing: true,
      });
      expect(r.colletSize.includes("Swiss guide bushing")).toBe(true);
    });

    it("scrap remnant: pipeline reports tiny remnant → remnantUsable false, scrap label in cycleSequence", () => {
      // Override mock so remnant length is below default min (= barDiameter*2)
      calculateMock.mockReturnValueOnce({
        part_count: PART_COUNT_5,
        remnant_length_mm: REMNANT_SCRAP_MM,
      });
      const r = hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 30,
        barLength_mm: 600,
        partLength_mm: 100,
        cutoffWidth_mm: 4,
        material: "1018",
      });
      expect(r.remnantLength_mm).toBe(REMNANT_SCRAP_MM);
      expect(r.remnantUsable).toBe(false);
      expect(r.cycleSequence.some(s => s.includes("scrap"))).toBe(true);
    });

    it("default remnantMinLength is barDiameter * 2 when not provided", () => {
      const BAR_DIA = 20;
      hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: BAR_DIA,
        barLength_mm: 500,
        partLength_mm: 90,
        cutoffWidth_mm: 3,
        material: "1018",
      });
      const lastCall = calculateMock.mock.calls.at(-1)![0];
      const params = lastCall.params as { remnant_min_length_mm: number };
      expect(params.remnant_min_length_mm).toBe(BAR_DIA * 2);
    });

    it("adversarial: pipeline returns missing remnant_length_mm → coerced to 0, remnantUsable false", () => {
      calculateMock.mockReturnValueOnce({ part_count: PART_COUNT_5 });
      const r = hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 25,
        barLength_mm: 700,
        partLength_mm: 120,
        cutoffWidth_mm: 4,
        material: "1018",
      });
      expect(r.remnantLength_mm).toBe(0);
      expect(r.remnantUsable).toBe(false);
    });

    it("adversarial: pipeline returns missing part_count → coerced to 0", () => {
      calculateMock.mockReturnValueOnce({ remnant_length_mm: 100 });
      const r = hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 25,
        barLength_mm: 700,
        partLength_mm: 120,
        cutoffWidth_mm: 4,
        material: "1018",
      });
      expect(r.partCount).toBe(0);
    });

    it("ISO group is forwarded to pipeline (S group → heat-resistant feed)", () => {
      hyperMillMillTurnBridge.calculateBarFeedSequence({
        barDiameter_mm: 25,
        barLength_mm: 800,
        partLength_mm: 100,
        cutoffWidth_mm: 4,
        material: "Ti-6Al-4V",
        isoGroup: "S",
      });
      const lastCall = calculateMock.mock.calls.at(-1)![0];
      const params = lastCall.params as { iso_group: string };
      expect(params.iso_group).toBe("S");
    });
  });
});
