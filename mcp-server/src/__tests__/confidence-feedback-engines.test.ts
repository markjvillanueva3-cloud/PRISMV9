/**
 * Tests for the 3 CAM-ML-CLOSEDLOOP-MS0 P3 engines (U-CMCCL12..14):
 *   - ConfidenceCommitEventBusEngine
 *   - OrchestratorConfidenceFeedbackEngine
 *   - CrossCAMComparisonLedgerEngine
 *
 * Real engines, no mocks. All math/distribution assertions cross-checked
 * against textbook Wilson/Beta formulas.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  confidenceCommitEventBusEngine,
  type ResolvedCommitEvent,
} from "../engines/ConfidenceCommitEventBusEngine.js";
import { orchestratorConfidenceFeedbackEngine } from "../engines/OrchestratorConfidenceFeedbackEngine.js";
import {
  crossCAMComparisonLedgerEngine,
  wilsonInterval,
} from "../engines/CrossCAMComparisonLedgerEngine.js";

// ------------------------------------------------------------------
// U-CMCCL12: ConfidenceCommitEventBusEngine
// ------------------------------------------------------------------
describe("ConfidenceCommitEventBusEngine (U-CMCCL12)", () => {
  beforeEach(() => confidenceCommitEventBusEngine.reset());

  describe("commit()", () => {
    it("emits schema-versioned event with all fields preserved", () => {
      const ev = confidenceCommitEventBusEngine.commit({
        decisionId: "d1",
        reasoningMode: "chain_of_thought",
        chosenCam: "mastercam",
        confidence: 0.85,
        timestamp: "2026-04-20T00:00:00Z",
        featureClass: "pocket",
        materialClass: "steel_P",
        machineClass: "3axis_mill",
      });
      expect(ev.schemaVersion).toBe(1);
      expect(ev.decisionId).toBe("d1");
      expect(ev.outcomePlaceholder).toBeNull();
      expect(ev.featureClass).toBe("pocket");
    });

    it("rejects duplicate decisionId", () => {
      confidenceCommitEventBusEngine.commit({
        decisionId: "dup",
        reasoningMode: "deductive",
        chosenCam: "fusion360",
        confidence: 0.5,
        timestamp: "2026-04-20T00:00:00Z",
      });
      expect(() =>
        confidenceCommitEventBusEngine.commit({
          decisionId: "dup",
          reasoningMode: "deductive",
          chosenCam: "fusion360",
          confidence: 0.5,
          timestamp: "2026-04-20T00:00:00Z",
        }),
      ).toThrow(/duplicate/);
    });

    it("rejects unknown CAM system", () => {
      expect(() =>
        confidenceCommitEventBusEngine.commit({
          decisionId: "d2",
          reasoningMode: "deductive",
          chosenCam: "notacam" as any,
          confidence: 0.5,
          timestamp: "2026-04-20T00:00:00Z",
        }),
      ).toThrow(/invalid chosenCam/);
    });

    it("rejects unknown reasoning mode", () => {
      expect(() =>
        confidenceCommitEventBusEngine.commit({
          decisionId: "d3",
          reasoningMode: "mystic_intuition" as any,
          chosenCam: "mastercam",
          confidence: 0.5,
          timestamp: "2026-04-20T00:00:00Z",
        }),
      ).toThrow(/invalid reasoningMode/);
    });

    it("rejects confidence outside [0,1]", () => {
      expect(() =>
        confidenceCommitEventBusEngine.commit({
          decisionId: "d4",
          reasoningMode: "deductive",
          chosenCam: "mastercam",
          confidence: 1.5,
          timestamp: "2026-04-20T00:00:00Z",
        }),
      ).toThrow(/confidence/);
    });

    it("publishes to commit subscribers synchronously", () => {
      const seen: string[] = [];
      confidenceCommitEventBusEngine.subscribe("commit", (e) => seen.push(e.decisionId));
      confidenceCommitEventBusEngine.commit({
        decisionId: "push1",
        reasoningMode: "chain_of_thought",
        chosenCam: "hypermill",
        confidence: 0.9,
        timestamp: "2026-04-20T00:00:00Z",
      });
      expect(seen).toEqual(["push1"]);
    });
  });

  describe("attachOutcome()", () => {
    it("moves decision from pending to resolved", () => {
      confidenceCommitEventBusEngine.commit({
        decisionId: "r1",
        reasoningMode: "deductive",
        chosenCam: "nx",
        confidence: 0.8,
        timestamp: "2026-04-20T00:00:00Z",
      });
      expect(confidenceCommitEventBusEngine.pendingCount()).toBe(1);
      confidenceCommitEventBusEngine.attachOutcome({
        decisionId: "r1",
        observedAt: "2026-04-20T10:00:00Z",
        agreement: 0.9,
      });
      expect(confidenceCommitEventBusEngine.pendingCount()).toBe(0);
      expect(confidenceCommitEventBusEngine.resolvedCount()).toBe(1);
    });

    it("throws if decision unknown", () => {
      expect(() =>
        confidenceCommitEventBusEngine.attachOutcome({
          decisionId: "missing",
          observedAt: "2026-04-20T10:00:00Z",
          agreement: 0.5,
        }),
      ).toThrow(/no pending/);
    });

    it("notifies resolved subscribers", () => {
      const received: ResolvedCommitEvent[] = [];
      confidenceCommitEventBusEngine.subscribe("resolved", (r) => received.push(r));
      confidenceCommitEventBusEngine.commit({
        decisionId: "s1",
        reasoningMode: "deductive",
        chosenCam: "catia",
        confidence: 0.6,
        timestamp: "2026-04-20T00:00:00Z",
      });
      confidenceCommitEventBusEngine.attachOutcome({
        decisionId: "s1",
        observedAt: "2026-04-20T10:00:00Z",
        agreement: 0.7,
      });
      expect(received).toHaveLength(1);
      expect(received[0].outcome.agreement).toBeCloseTo(0.7, 10);
    });

    it("subscriber unsubscribe closure actually unsubscribes", () => {
      const seen: string[] = [];
      const off = confidenceCommitEventBusEngine.subscribe("commit", (e) => seen.push(e.decisionId));
      off();
      confidenceCommitEventBusEngine.commit({
        decisionId: "after-off",
        reasoningMode: "deductive",
        chosenCam: "solidcam",
        confidence: 0.5,
        timestamp: "2026-04-20T00:00:00Z",
      });
      expect(seen).toHaveLength(0);
    });

    it("subscriber throwing does not break publication chain", () => {
      confidenceCommitEventBusEngine.subscribe("commit", () => {
        throw new Error("subscriber explosion");
      });
      const seen: string[] = [];
      confidenceCommitEventBusEngine.subscribe("commit", (e) => seen.push(e.decisionId));
      confidenceCommitEventBusEngine.commit({
        decisionId: "resilient",
        reasoningMode: "deductive",
        chosenCam: "powermill",
        confidence: 0.5,
        timestamp: "2026-04-20T00:00:00Z",
      });
      expect(seen).toEqual(["resilient"]);
    });
  });
});

// ------------------------------------------------------------------
// U-CMCCL13: OrchestratorConfidenceFeedbackEngine
// ------------------------------------------------------------------
describe("OrchestratorConfidenceFeedbackEngine (U-CMCCL13)", () => {
  beforeEach(() => orchestratorConfidenceFeedbackEngine.reset());

  describe("Beta prior math", () => {
    it("Laplace(1,1) init gives posterior mean 0.5 with zero samples", () => {
      const l = orchestratorConfidenceFeedbackEngine.lookup({
        camSystem: "mastercam",
        featureClass: "pocket",
        materialClass: "M",
        machineClass: "mill",
      });
      expect(l.alpha).toBe(1);
      expect(l.beta).toBe(1);
      expect(l.posteriorMean).toBeCloseTo(0.5, 10);
      expect(l.trusted).toBe(false);
    });

    it("single success agreement=1 pushes posterior above 0.5", () => {
      const cell = {
        camSystem: "mastercam" as const,
        featureClass: "pocket",
        materialClass: "M",
        machineClass: "mill",
      };
      orchestratorConfidenceFeedbackEngine.update(cell, 1);
      const l = orchestratorConfidenceFeedbackEngine.lookup(cell);
      expect(l.alpha).toBe(2);
      expect(l.beta).toBe(1);
      expect(l.posteriorMean).toBeCloseTo(2 / 3, 6);
    });

    it("single failure agreement=0 pulls posterior below 0.5", () => {
      const cell = {
        camSystem: "hypermill" as const,
        featureClass: "contour",
        materialClass: "P",
        machineClass: "mill5ax",
      };
      orchestratorConfidenceFeedbackEngine.update(cell, 0);
      const l = orchestratorConfidenceFeedbackEngine.lookup(cell);
      expect(l.alpha).toBe(1);
      expect(l.beta).toBe(2);
      expect(l.posteriorMean).toBeCloseTo(1 / 3, 6);
    });

    it("partial agreement 0.7 moves α by 0.7 and β by 0.3", () => {
      const cell = {
        camSystem: "fusion360" as const,
        featureClass: "slot",
        materialClass: "K",
        machineClass: "mill",
      };
      orchestratorConfidenceFeedbackEngine.update(cell, 0.7);
      const l = orchestratorConfidenceFeedbackEngine.lookup(cell);
      expect(l.alpha).toBeCloseTo(1.7, 6);
      expect(l.beta).toBeCloseTo(1.3, 6);
    });

    it("rejects agreement outside [0,1]", () => {
      const cell = {
        camSystem: "nx" as const,
        featureClass: "x",
        materialClass: "M",
        machineClass: "m",
      };
      expect(() => orchestratorConfidenceFeedbackEngine.update(cell, 2)).toThrow();
      expect(() => orchestratorConfidenceFeedbackEngine.update(cell, -0.1)).toThrow();
    });
  });

  describe("hysteresis (minSamples)", () => {
    it("returns trusted=false below minSamples default=5", () => {
      const cell = {
        camSystem: "inventorcam" as const,
        featureClass: "hole",
        materialClass: "N",
        machineClass: "mill",
      };
      for (let i = 0; i < 4; i += 1) orchestratorConfidenceFeedbackEngine.update(cell, 1);
      const l = orchestratorConfidenceFeedbackEngine.lookup(cell);
      expect(l.samples).toBe(4);
      expect(l.trusted).toBe(false);
    });

    it("becomes trusted at samples >= minSamples", () => {
      const cell = {
        camSystem: "solidcam" as const,
        featureClass: "profile",
        materialClass: "S",
        machineClass: "mill",
      };
      for (let i = 0; i < 5; i += 1) orchestratorConfidenceFeedbackEngine.update(cell, 1);
      const l = orchestratorConfidenceFeedbackEngine.lookup(cell);
      expect(l.samples).toBe(5);
      expect(l.trusted).toBe(true);
    });

    it("rankForCell returns 0.5 neutral for untrusted cells", () => {
      const cell = { featureClass: "pocket", materialClass: "P", machineClass: "mill" };
      orchestratorConfidenceFeedbackEngine.update(
        { ...cell, camSystem: "mastercam" },
        1,
      );
      const ranked = orchestratorConfidenceFeedbackEngine.rankForCell(cell, [
        "mastercam",
        "fusion360",
      ]);
      // mastercam has 1 sample, below minSamples=5 ⇒ neutral 0.5
      for (const r of ranked) expect(r.posteriorMean).toBeCloseTo(0.5, 10);
    });
  });

  describe("rankForCell() ordering", () => {
    it("trusted high-mean CAM ranks above untrusted", () => {
      const cell = { featureClass: "pocket", materialClass: "P", machineClass: "mill" };
      // mastercam: 10 successes → trusted, mean ≈ (10+1)/12 ≈ 0.917
      for (let i = 0; i < 10; i += 1) {
        orchestratorConfidenceFeedbackEngine.update({ ...cell, camSystem: "mastercam" }, 1);
      }
      // fusion360: 1 success only → untrusted, returns 0.5
      orchestratorConfidenceFeedbackEngine.update({ ...cell, camSystem: "fusion360" }, 1);

      const ranked = orchestratorConfidenceFeedbackEngine.rankForCell(cell, [
        "fusion360",
        "mastercam",
      ]);
      expect(ranked[0].camSystem).toBe("mastercam");
      expect(ranked[0].posteriorMean).toBeGreaterThan(0.9);
      expect(ranked[0].trusted).toBe(true);
      expect(ranked[1].camSystem).toBe("fusion360");
      expect(ranked[1].trusted).toBe(false);
    });

    it("tie-breaks alphabetically on camSystem", () => {
      const cell = { featureClass: "x", materialClass: "M", machineClass: "mill" };
      const ranked = orchestratorConfidenceFeedbackEngine.rankForCell(cell, [
        "powermill",
        "nx",
        "catia",
      ]);
      // All untrusted ⇒ all 0.5 ⇒ alphabetical
      expect(ranked.map((r) => r.camSystem)).toEqual(["catia", "nx", "powermill"]);
    });
  });

  describe("bus integration", () => {
    it("attachToBus wires resolved events to update", () => {
      confidenceCommitEventBusEngine.reset();
      orchestratorConfidenceFeedbackEngine.reset();
      orchestratorConfidenceFeedbackEngine.attachToBus();

      confidenceCommitEventBusEngine.commit({
        decisionId: "bus1",
        reasoningMode: "deductive",
        chosenCam: "featurecam",
        confidence: 0.8,
        timestamp: "2026-04-20T00:00:00Z",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
      });
      confidenceCommitEventBusEngine.attachOutcome({
        decisionId: "bus1",
        observedAt: "2026-04-20T10:00:00Z",
        agreement: 1,
      });

      const l = orchestratorConfidenceFeedbackEngine.lookup({
        camSystem: "featurecam",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
      });
      expect(l.alpha).toBe(2);
      expect(l.beta).toBe(1);
      orchestratorConfidenceFeedbackEngine.detachFromBus();
    });

    it("detachFromBus stops further updates", () => {
      confidenceCommitEventBusEngine.reset();
      orchestratorConfidenceFeedbackEngine.reset();
      orchestratorConfidenceFeedbackEngine.attachToBus();
      orchestratorConfidenceFeedbackEngine.detachFromBus();

      confidenceCommitEventBusEngine.commit({
        decisionId: "after-detach",
        reasoningMode: "deductive",
        chosenCam: "featurecam",
        confidence: 0.8,
        timestamp: "2026-04-20T00:00:00Z",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
      });
      confidenceCommitEventBusEngine.attachOutcome({
        decisionId: "after-detach",
        observedAt: "2026-04-20T10:00:00Z",
        agreement: 1,
      });

      const l = orchestratorConfidenceFeedbackEngine.lookup({
        camSystem: "featurecam",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
      });
      // no update should have happened
      expect(l.samples).toBe(0);
    });
  });

  describe("setConfig validation", () => {
    it("rejects minSamples < 1", () => {
      expect(() =>
        orchestratorConfidenceFeedbackEngine.setConfig({ minSamples: 0 }),
      ).toThrow(/minSamples/);
    });
    it("rejects updateRate outside (0,1]", () => {
      expect(() =>
        orchestratorConfidenceFeedbackEngine.setConfig({ updateRate: 0 }),
      ).toThrow(/updateRate/);
      expect(() =>
        orchestratorConfidenceFeedbackEngine.setConfig({ updateRate: 1.5 }),
      ).toThrow(/updateRate/);
    });
  });
});

// ------------------------------------------------------------------
// U-CMCCL14: CrossCAMComparisonLedgerEngine
// ------------------------------------------------------------------
describe("CrossCAMComparisonLedgerEngine (U-CMCCL14)", () => {
  beforeEach(() => crossCAMComparisonLedgerEngine.reset());

  describe("wilsonInterval() textbook values", () => {
    it("n=0 returns [0,0]", () => {
      const { lower, upper } = wilsonInterval(0, 0);
      expect(lower).toBe(0);
      expect(upper).toBe(0);
    });

    it("perfect 10/10 has lower bound > 0.5 (not 1.0)", () => {
      const { lower, upper } = wilsonInterval(10, 10);
      expect(upper).toBeCloseTo(1, 3);
      expect(lower).toBeGreaterThan(0.5);
      expect(lower).toBeLessThan(1);
    });

    it("50/100 lower bound ≈ 0.404 (textbook)", () => {
      // Known Wilson value for 50/100 at z=1.96:
      // lower ≈ 0.4038, upper ≈ 0.5962
      const { lower, upper } = wilsonInterval(50, 100);
      expect(lower).toBeCloseTo(0.4038, 3);
      expect(upper).toBeCloseTo(0.5962, 3);
    });

    it("0/10 lower bound is 0, upper < 0.4", () => {
      const { lower, upper } = wilsonInterval(0, 10);
      expect(lower).toBeCloseTo(0, 6);
      expect(upper).toBeLessThan(0.4);
    });

    it("small-n over-confidence correction: 1/1 ranks BELOW 95/100", () => {
      const tiny = wilsonInterval(1, 1).lower;
      const big = wilsonInterval(95, 100).lower;
      expect(tiny).toBeLessThan(big);
    });
  });

  describe("record() and leaderboard()", () => {
    const cell = {
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
    };

    it("top-ranked CAM has highest Wilson lower bound", () => {
      // mastercam: 90/100 successes
      for (let i = 0; i < 100; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "mastercam",
          ...cell,
          success: i < 90 ? 1 : 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      // fusion360: 50/100
      for (let i = 0; i < 100; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "fusion360",
          ...cell,
          success: i < 50 ? 1 : 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      const board = crossCAMComparisonLedgerEngine.leaderboard(cell);
      expect(board.topCam).toBe("mastercam");
      expect(board.entries[0].wilsonLower).toBeGreaterThan(board.entries[1].wilsonLower);
    });

    it("tiny-n high-rate CAM ranks below moderate-n high-rate CAM", () => {
      // tiny: 1/1 perfect
      crossCAMComparisonLedgerEngine.record({
        camSystem: "catia",
        ...cell,
        success: 1,
        observedAt: "2026-04-20T00:00:00Z",
      });
      // moderate: 18/20 (90%)
      for (let i = 0; i < 20; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "nx",
          ...cell,
          success: i < 18 ? 1 : 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      const board = crossCAMComparisonLedgerEngine.leaderboard(cell);
      expect(board.topCam).toBe("nx");
    });

    it("pointEstimate equals successes / n exactly", () => {
      for (let i = 0; i < 7; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "powermill",
          ...cell,
          success: i < 5 ? 1 : 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      const board = crossCAMComparisonLedgerEngine.leaderboard(cell);
      const pw = board.entries.find((e) => e.camSystem === "powermill")!;
      expect(pw.n).toBe(7);
      expect(pw.successes).toBe(5);
      expect(pw.pointEstimate).toBeCloseTo(5 / 7, 10);
    });

    it("rejects success values other than 0/1", () => {
      expect(() =>
        crossCAMComparisonLedgerEngine.record({
          camSystem: "solidcam",
          ...cell,
          success: 2 as any,
          observedAt: "2026-04-20T00:00:00Z",
        }),
      ).toThrow();
    });

    it("empty cell returns topCam=null", () => {
      const board = crossCAMComparisonLedgerEngine.leaderboard({
        featureClass: "none",
        materialClass: "X",
        machineClass: "y",
      });
      expect(board.topCam).toBeNull();
      expect(board.entries).toHaveLength(0);
    });
  });

  describe("byCAM()", () => {
    it("returns only accumulators for that CAM", () => {
      const cells = [
        { featureClass: "pocket", materialClass: "P", machineClass: "mill" },
        { featureClass: "slot", materialClass: "M", machineClass: "mill" },
      ];
      for (const c of cells) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "hypermill",
          ...c,
          success: 1,
          observedAt: "2026-04-20T00:00:00Z",
        });
        crossCAMComparisonLedgerEngine.record({
          camSystem: "mastercam",
          ...c,
          success: 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      const hm = crossCAMComparisonLedgerEngine.byCAM("hypermill");
      expect(hm).toHaveLength(2);
      for (const acc of hm) expect(acc.camSystem).toBe("hypermill");
    });
  });

  describe("totals", () => {
    it("totalObservations sums n across all cells", () => {
      for (let i = 0; i < 5; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "mastercam",
          featureClass: "pocket",
          materialClass: "P",
          machineClass: "mill",
          success: 1,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      for (let i = 0; i < 3; i += 1) {
        crossCAMComparisonLedgerEngine.record({
          camSystem: "fusion360",
          featureClass: "slot",
          materialClass: "M",
          machineClass: "mill",
          success: 0,
          observedAt: "2026-04-20T00:00:00Z",
        });
      }
      expect(crossCAMComparisonLedgerEngine.totalObservations()).toBe(8);
      expect(crossCAMComparisonLedgerEngine.totalCells()).toBe(2);
    });
  });
});
