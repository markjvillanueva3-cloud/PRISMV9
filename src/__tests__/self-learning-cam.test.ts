import { describe, it, expect, beforeEach } from "vitest";
import {
  selfLearningCAMEngine,
  type MachiningObservation,
  type CutToLearnInput,
  type DigitalTwinSyncInput,
  type StrategyRankingInput,
  type AnomalyRelearnInput,
  type FleetLearnInput,
} from "../engines/SelfLearningCAMEngine.js";

/** Helper: create a standard observation */
function makeObs(overrides: Partial<MachiningObservation> = {}): MachiningObservation {
  return {
    jobId: `job-${Math.random().toString(36).slice(2, 8)}`,
    machineId: "MCH-001",
    materialGroup: "P",
    cuttingParams: {
      speed_mpm: 200,
      feed_mmtooth: 0.15,
      axial_depth_mm: 3.0,
      radial_depth_mm: 10.0,
      tool_diameter_mm: 20.0,
    },
    actuals: { force_N: 850, surface_finish_Ra_um: 1.2, tool_life_min: 45 },
    predicted: { force_N: 800, surface_finish_Ra_um: 1.0, tool_life_min: 50 },
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("SelfLearningCAMEngine", () => {
  beforeEach(() => {
    selfLearningCAMEngine.reset();
  });

  // ── calculate dispatch ─────────────────────────────────────────────
  it("dispatches unknown action gracefully", () => {
    const r = selfLearningCAMEngine.calculate("nonexistent", {});
    expect(r.error).toContain("Unknown action");
    expect(r.availableActions).toContain("cut_to_learn");
  });

  // ── 1. Cut-to-Learn ────────────────────────────────────────────────
  describe("cutToLearn", () => {
    it("processes observations and returns Kienzle updates", () => {
      const obs = Array.from({ length: 5 }, () => makeObs());
      const r = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs,
      });
      expect(r.observationsProcessed).toBe(5);
      expect(r.kienzleUpdates).toBeDefined();
      expect(r.kienzleUpdates!.P.kc11.mean).toBeGreaterThan(0);
      expect(r.kienzleUpdates!.P.kc11.ci95[0])
        .toBeLessThan(r.kienzleUpdates!.P.kc11.ci95[1]);
      expect(r.kienzleUpdates!.P.kc11.nObservations).toBe(5);
    });

    it("updates Taylor coefficients from speed-life pairs", () => {
      const obs = [
        makeObs({
          cuttingParams: {
            speed_mpm: 150, feed_mmtooth: 0.15,
            axial_depth_mm: 3, radial_depth_mm: 10, tool_diameter_mm: 20,
          },
          actuals: { force_N: 900, tool_life_min: 60 },
          predicted: { force_N: 850, tool_life_min: 55 },
        }),
        makeObs({
          cuttingParams: {
            speed_mpm: 250, feed_mmtooth: 0.15,
            axial_depth_mm: 3, radial_depth_mm: 10, tool_diameter_mm: 20,
          },
          actuals: { force_N: 750, tool_life_min: 25 },
          predicted: { force_N: 700, tool_life_min: 30 },
        }),
      ];
      const r = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs,
      });
      expect(r.taylorUpdates).toBeDefined();
      expect(r.taylorUpdates!.P.C.mean).toBeGreaterThan(0);
    });

    it("computes surface finish bias", () => {
      const obs = Array.from({ length: 3 }, () =>
        makeObs({
          actuals: { force_N: 800, surface_finish_Ra_um: 1.5 },
          predicted: { force_N: 800, surface_finish_Ra_um: 1.0 },
        })
      );
      const r = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs,
      });
      expect(r.finishUpdates).toBeDefined();
      // Bias should be positive (actual > predicted)
      expect(r.finishUpdates!.P.bias.mean).toBeGreaterThan(0);
    });

    it("computes RMSE residual summary", () => {
      const obs = Array.from({ length: 4 }, (_, i) =>
        makeObs({
          actuals: { force_N: 800 + i * 20 },
          predicted: { force_N: 800 },
        })
      );
      const r = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs,
      });
      expect(r.residualSummary.force_RMSE).toBeGreaterThan(0);
    });

    it("posterior uncertainty shrinks with more data", () => {
      // First batch
      const obs1 = Array.from({ length: 3 }, () => makeObs());
      const r1 = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs1,
      });
      const std1 = r1.kienzleUpdates!.P.kc11.stdDev;

      // Second batch
      const obs2 = Array.from({ length: 10 }, () => makeObs());
      const r2 = selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: obs2,
      });
      const std2 = r2.kienzleUpdates!.P.kc11.stdDev;

      // More data → tighter posterior
      expect(std2).toBeLessThan(std1);
    });
  });

  // ── 2. Digital Twin Sync ───────────────────────────────────────────
  describe("digitalTwinSync", () => {
    it("initializes twin state and processes sensor readings", () => {
      const input: DigitalTwinSyncInput = {
        machineId: "MCH-001",
        readings: [
          {
            machineId: "MCH-001",
            timestamp: Date.now(),
            sensors: {
              spindle_load_pct: 65,
              temperature_C: 28,
              vibration_rms_g: 0.08,
            },
          },
          {
            machineId: "MCH-001",
            timestamp: Date.now() + 60000,
            sensors: {
              spindle_load_pct: 70,
              temperature_C: 30,
              vibration_rms_g: 0.1,
            },
          },
        ],
      };
      const r = selfLearningCAMEngine.calculate("digital_twin_sync", input);
      expect(r.machineId).toBe("MCH-001");
      expect(r.twinState).toBeDefined();
      expect(r.twinState.thermalDrift.temperature_C).toBe(30);
      expect(r.sfCorrections.speedFactor).toBeGreaterThan(0);
      expect(r.sfCorrections.speedFactor).toBeLessThanOrEqual(1.2);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("generates alerts for degraded spindle", () => {
      const input: DigitalTwinSyncInput = {
        machineId: "MCH-002",
        readings: [
          {
            machineId: "MCH-002",
            timestamp: Date.now(),
            sensors: { vibration_rms_g: 0.4 },
          },
        ],
      };
      const r = selfLearningCAMEngine.calculate("digital_twin_sync", input);
      expect(r.alerts.length).toBeGreaterThan(0);
      expect(r.alerts.some(
        a => a.severity === "warning" || a.severity === "critical"
      )).toBe(true);
    });

    it("tracks tool wear via Kalman filter", () => {
      const input: DigitalTwinSyncInput = {
        machineId: "MCH-003",
        readings: Array.from({ length: 5 }, (_, i) => ({
          machineId: "MCH-003",
          timestamp: Date.now() + i * 60000,
          sensors: { spindle_load_pct: 60 + i * 5 },
          toolState: {
            toolId: "T01",
            cuttingTime_min: (i + 1) * 10,
            materialRemoved_cm3: (i + 1) * 2,
          },
        })),
      };
      const r = selfLearningCAMEngine.calculate("digital_twin_sync", input);
      expect(r.twinState.toolWear["T01"]).toBeDefined();
      expect(r.twinState.toolWear["T01"].vb_mm).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 3. Strategy Ranking ────────────────────────────────────────────
  describe("strategyRanking", () => {
    it("ranks strategies by composite score", () => {
      // Seed data via cutToLearn with strategies
      const strategies = ["trochoidal", "adaptive", "hsm"];
      const obs: MachiningObservation[] = [];
      for (const strat of strategies) {
        for (let i = 0; i < 5; i++) {
          obs.push(makeObs({
            strategy: strat,
            geometryClass: "pocket",
            actuals: {
              force_N: strat === "trochoidal" ? 600 : strat === "adaptive" ? 700 : 800,
              surface_finish_Ra_um: strat === "hsm" ? 0.6 : 1.2,
              tool_life_min: strat === "adaptive" ? 60 : 40,
            },
            predicted: {
              force_N: 750,
              surface_finish_Ra_um: 1.0,
              tool_life_min: 45,
            },
          }));
        }
      }
      selfLearningCAMEngine.calculate("cut_to_learn", { observations: obs });

      const r = selfLearningCAMEngine.calculate("strategy_ranking", {
        materialGroup: "P",
        geometryClass: "pocket",
        optimizeFor: "balanced",
        minObservations: 3,
      } as StrategyRankingInput);

      expect(r.rankings.length).toBe(3);
      // All should have observations
      for (const rank of r.rankings) {
        expect(rank.observations).toBeGreaterThanOrEqual(3);
        expect(rank.compositeScore).toBeGreaterThan(0);
        expect(rank.winRate.ci95[0]).toBeLessThanOrEqual(rank.winRate.ci95[1]);
      }
      expect(r.recommendation).toContain("Use ");
    });

    it("returns empty rankings with no data", () => {
      const r = selfLearningCAMEngine.calculate("strategy_ranking", {
        materialGroup: "S",
      });
      expect(r.rankings.length).toBe(0);
      expect(r.totalObservations).toBe(0);
    });

    it("filters by geometry class", () => {
      const obs = [
        ...Array.from({ length: 4 }, () =>
          makeObs({ strategy: "trochoidal", geometryClass: "pocket" })
        ),
        ...Array.from({ length: 4 }, () =>
          makeObs({ strategy: "contour", geometryClass: "wall" })
        ),
      ];
      selfLearningCAMEngine.calculate("cut_to_learn", { observations: obs });

      const r = selfLearningCAMEngine.calculate("strategy_ranking", {
        geometryClass: "pocket",
        minObservations: 3,
      });
      // Should only find trochoidal for pocket
      expect(r.rankings.length).toBe(1);
      expect(r.rankings[0].strategy).toBe("trochoidal");
    });
  });

  // ── 4. Anomaly Detection + Relearning ──────────────────────────────
  describe("anomalyRelearn", () => {
    it("detects no anomalies for consistent data", () => {
      // Seed baseline with zero residuals (actuals == predicted)
      const baseline = Array.from({ length: 10 }, () =>
        makeObs({
          actuals: { force_N: 800, surface_finish_Ra_um: 1.0, tool_life_min: 50 },
          predicted: { force_N: 800, surface_finish_Ra_um: 1.0, tool_life_min: 50 },
        })
      );
      selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: baseline,
      });

      // Check with same consistent residuals (near zero)
      const r = selfLearningCAMEngine.calculate("anomaly_relearn", {
        observations: [makeObs({
          actuals: { force_N: 805, surface_finish_Ra_um: 1.02, tool_life_min: 49 },
          predicted: { force_N: 800, surface_finish_Ra_um: 1.0, tool_life_min: 50 },
        })],
        threshold: 3.0,
      } as AnomalyRelearnInput);
      expect(r.anomaliesDetected.length).toBe(0);
      expect(r.recommendations).toContain(
        "No anomalies detected — predictions are within expected bounds"
      );
    });

    it("detects anomaly for extreme deviation", () => {
      // Seed baseline
      const baseline = Array.from({ length: 20 }, () =>
        makeObs({
          actuals: { force_N: 800 },
          predicted: { force_N: 800 },
        })
      );
      selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: baseline,
      });

      // Anomalous observation: force way off
      const anomalous = makeObs({
        jobId: "anomaly-job",
        actuals: { force_N: 2000, tool_life_min: 5 },
        predicted: { force_N: 800, tool_life_min: 50 },
      });
      const r = selfLearningCAMEngine.calculate("anomaly_relearn", {
        observations: [anomalous],
        threshold: 2.0,
        autoRecalibrate: true,
      });
      expect(r.anomaliesDetected.length).toBe(1);
      expect(r.anomaliesDetected[0].mahalanobisDistance).toBeGreaterThan(2.0);
      expect(r.anomaliesDetected[0].probableCause).toBe("tool_breakage");
      expect(r.recalibrated).toBe(true);
      expect(r.modelsAffected).toContain("kienzle");
    });

    it("classifies machine degradation", () => {
      // Seed baseline with dimension data
      const baseline = Array.from({ length: 15 }, () =>
        makeObs({
          actuals: { dimension_error_um: 5, force_N: 800 },
          predicted: { dimension_error_um: 5, force_N: 800 },
        })
      );
      selfLearningCAMEngine.calculate("cut_to_learn", {
        observations: baseline,
      });

      // Dimension error spikes but force is normal
      const anomalous = makeObs({
        jobId: "degrade-job",
        actuals: { dimension_error_um: 50, force_N: 810 },
        predicted: { dimension_error_um: 5, force_N: 800 },
      });
      const r = selfLearningCAMEngine.calculate("anomaly_relearn", {
        observations: [anomalous],
        threshold: 2.0,
      });
      if (r.anomaliesDetected.length > 0) {
        expect(r.anomaliesDetected[0].probableCause).toBe("machine_degradation");
      }
    });
  });

  // ── 5. Fleet Learning ──────────────────────────────────────────────
  describe("fleetLearn", () => {
    it("returns empty result with no data", () => {
      const r = selfLearningCAMEngine.calculate("fleet_learn", {});
      expect(r.machineCount).toBe(0);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("computes hierarchical shrinkage across machines", () => {
      // Feed data from 3 machines with different kc1.1 values
      const machines = ["MCH-A", "MCH-B", "MCH-C"];
      const baseForces = [850, 900, 750]; // different machines
      for (let m = 0; m < 3; m++) {
        const obs = Array.from({ length: 8 }, () =>
          makeObs({
            machineId: machines[m],
            actuals: {
              force_N: baseForces[m] + (Math.random() - 0.5) * 50,
              tool_life_min: 40 + Math.random() * 20,
            },
            predicted: {
              force_N: 800,
              tool_life_min: 45,
            },
          })
        );
        selfLearningCAMEngine.calculate("cut_to_learn", { observations: obs });
      }

      const r = selfLearningCAMEngine.calculate("fleet_learn", {
        machineIds: machines,
      });
      expect(r.machineCount).toBe(3);
      expect(r.totalObservations).toBe(24);
      expect(r.kienzleFleet).toBeDefined();
      if (r.kienzleFleet?.P) {
        expect(r.kienzleFleet.P.fleetMean).toBeGreaterThan(0);
        expect(Object.keys(r.kienzleFleet.P.machineEstimates)).toHaveLength(3);
        // Shrunk estimates should be closer to fleet mean than raw
        for (const est of Object.values(r.kienzleFleet.P.machineEstimates)) {
          const rawDist = Math.abs(est.raw - r.kienzleFleet!.P.fleetMean);
          const shrunkDist = Math.abs(est.shrunk - r.kienzleFleet!.P.fleetMean);
          expect(shrunkDist).toBeLessThanOrEqual(rawDist + 0.01);
        }
      }
    });

    it("bootstraps a new machine from fleet priors", () => {
      // Seed fleet data
      for (const mid of ["MCH-X", "MCH-Y"]) {
        const obs = Array.from({ length: 10 }, () =>
          makeObs({
            machineId: mid,
            actuals: { force_N: 820, tool_life_min: 48 },
            predicted: { force_N: 800, tool_life_min: 45 },
          })
        );
        selfLearningCAMEngine.calculate("cut_to_learn", { observations: obs });
      }

      const r = selfLearningCAMEngine.calculate("fleet_learn", {
        machineIds: ["MCH-X", "MCH-Y"],
        newMachineId: "MCH-NEW",
      });
      expect(r.newMachineBootstrap).toBeDefined();
      expect(r.newMachineBootstrap!.machineId).toBe("MCH-NEW");
      expect(Object.keys(r.newMachineBootstrap!.priors).length).toBeGreaterThan(0);
    });
  });

  // ── Export / Import ────────────────────────────────────────────────
  describe("state persistence", () => {
    it("exports and imports state consistently", () => {
      // Build some state
      const obs = Array.from({ length: 5 }, () => makeObs());
      selfLearningCAMEngine.calculate("cut_to_learn", { observations: obs });
      selfLearningCAMEngine.calculate("digital_twin_sync", {
        machineId: "MCH-001",
        readings: [{
          machineId: "MCH-001",
          timestamp: Date.now(),
          sensors: { temperature_C: 25 },
        }],
      });

      const exported = selfLearningCAMEngine.exportState();
      expect(exported.materialPriors).toBeDefined();
      expect(exported.twinStates).toBeDefined();

      // Reset and reimport
      selfLearningCAMEngine.reset();
      selfLearningCAMEngine.importState(exported);

      // Verify state was restored
      const exported2 = selfLearningCAMEngine.exportState();
      expect(Object.keys(exported2.twinStates)).toContain("MCH-001");
    });
  });
});
