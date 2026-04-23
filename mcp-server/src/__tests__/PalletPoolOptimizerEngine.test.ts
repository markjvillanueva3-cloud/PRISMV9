/**
 * Tests for PalletPoolOptimizerEngine — MILL-MASTER P38-U02-PALLET-OPT.
 *
 * Covers: engine happy path + failure modes + adversarial inputs +
 * variability (APC/AWC mix, setup matrix, fixture sharing) + dispatcher
 * round-trip. No mocks.
 */

import { describe, it, expect } from "vitest";
import {
  palletPoolOptimizerEngine,
  DEFAULT_SOLVER_CONFIG,
  DEFAULT_WEIGHTS,
  type PalletJob,
  type Pallet,
  type SetupMatrixEntry,
} from "../engines/PalletPoolOptimizerEngine.js";
import { businessDispatch } from "../tools/dispatchers/businessDispatcher.js";

// ---------------------------------------------------------------
// Test problem builders
// ---------------------------------------------------------------

function basicPallets(n = 2): Pallet[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `P${i + 1}`,
    precisionClass: i % 2 === 0 ? "APC" : "AWC",
    capacity: 3,
    mountedFixtures: ["F_default"],
  }));
}

function basicJobs(count = 4): PalletJob[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `J${i + 1}`,
    processingTimeMin: 30 + i * 10,
    dueDateMin: 120 + i * 60,
    fixtureId: `F${(i % 2) + 1}`,
    toolIds: [`T${(i % 3) + 1}`, `T${(i % 5) + 4}`],
    precisionClass: i === 0 ? "high" : "normal",
  }));
}

function setupMatrix(jobs: PalletJob[]): SetupMatrixEntry[] {
  const out: SetupMatrixEntry[] = [];
  for (const a of jobs) {
    for (const b of jobs) {
      if (a.id === b.id) continue;
      // Same fixture → 2 min, different fixture → 12 min
      const t = a.fixtureId === b.fixtureId ? 2 : 12;
      out.push({ fromJobId: a.id, toJobId: b.id, setupTimeMin: t });
    }
  }
  return out;
}

// ---------------------------------------------------------------
describe("PalletPoolOptimizerEngine — core solver", () => {
  describe("happy path", () => {
    it("produces one assignment per job", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(4);
      const result = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      expect(result.assignments).toHaveLength(jobs.length);
      const covered = new Set(result.assignments.map((a) => a.jobId));
      expect(covered.size).toBe(jobs.length);
    });

    it("assignments have monotonically non-decreasing time per pallet", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(6);
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      const byPallet = new Map<string, typeof r.assignments>();
      for (const a of r.assignments) {
        const list = byPallet.get(a.palletId) ?? [];
        list.push(a);
        byPallet.set(a.palletId, list);
      }
      for (const list of byPallet.values()) {
        list.sort((a, b) => a.position - b.position);
        for (let i = 1; i < list.length; i += 1) {
          expect(list[i].startTimeMin).toBeGreaterThanOrEqual(list[i - 1].endTimeMin);
        }
      }
    });

    it("makespan equals the max end time across assignments", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(5);
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      const maxEnd = Math.max(...r.assignments.map((a) => a.endTimeMin));
      expect(r.makespanMin).toBe(maxEnd);
    });

    it("cost breakdown sums to total cost (algebraic invariant)", () => {
      const pallets = basicPallets(3);
      const jobs = basicJobs(6);
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      const sum = r.costBreakdown.tardiness +
        r.costBreakdown.setup +
        r.costBreakdown.fixtureShare +
        r.costBreakdown.toolShare +
        r.costBreakdown.precision;
      expect(r.cost).toBeCloseTo(sum, 6);
    });
  });

  describe("due-date sensitivity", () => {
    it("relaxed due dates produce zero tardiness", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(4).map((j) => ({ ...j, dueDateMin: 100000 }));
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      expect(r.totalTardinessMin).toBe(0);
      expect(r.costBreakdown.tardiness).toBe(0);
    });

    it("tight due dates produce positive tardiness", () => {
      const pallets = basicPallets(1);
      const jobs: PalletJob[] = [
        { id: "T1", processingTimeMin: 50, dueDateMin: 10, fixtureId: "F1", toolIds: ["A"] },
        { id: "T2", processingTimeMin: 50, dueDateMin: 10, fixtureId: "F1", toolIds: ["A"] },
        { id: "T3", processingTimeMin: 50, dueDateMin: 10, fixtureId: "F1", toolIds: ["A"] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: setupMatrix(jobs),
      });
      expect(r.totalTardinessMin).toBeGreaterThan(0);
    });
  });

  describe("setup cost", () => {
    it("same-fixture sequence produces less setup than alternating", () => {
      const pallets: Pallet[] = [
        { id: "P1", precisionClass: "APC", capacity: 4, mountedFixtures: ["F1"] },
      ];
      const jobs: PalletJob[] = [
        { id: "S1", processingTimeMin: 20, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"] },
        { id: "S2", processingTimeMin: 20, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"] },
        { id: "S3", processingTimeMin: 20, dueDateMin: 1000, fixtureId: "F2", toolIds: ["B"] },
        { id: "S4", processingTimeMin: 20, dueDateMin: 1000, fixtureId: "F2", toolIds: ["B"] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: setupMatrix(jobs),
      });
      // Optimal grouping: [S1,S2,S3,S4] or [S3,S4,S1,S2] has only ONE
      // fixture-crossover (12 min), so setup <= 3*2 + 1*12 = 18 min.
      // Worst alternating grouping has 3*12 = 36 min.
      expect(r.totalSetupMin).toBeLessThanOrEqual(18);
    });

    it("zero setup matrix produces zero setup cost", () => {
      const pallets: Pallet[] = [
        { id: "P1", precisionClass: "APC", capacity: 3, mountedFixtures: ["F1"] },
      ];
      const jobs: PalletJob[] = [
        { id: "Z1", processingTimeMin: 10, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"] },
        { id: "Z2", processingTimeMin: 10, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets, jobs,
        setupMatrix: [
          { fromJobId: "Z1", toJobId: "Z2", setupTimeMin: 0 },
          { fromJobId: "Z2", toJobId: "Z1", setupTimeMin: 0 },
        ],
      });
      expect(r.totalSetupMin).toBe(0);
    });
  });

  describe("APC/AWC precision", () => {
    it("high-precision job prefers APC pallet", () => {
      const pallets: Pallet[] = [
        { id: "APC1", precisionClass: "APC", capacity: 3, mountedFixtures: [] },
        { id: "AWC1", precisionClass: "AWC", capacity: 3, mountedFixtures: [] },
      ];
      const jobs: PalletJob[] = [
        { id: "HP", processingTimeMin: 30, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"], precisionClass: "high" },
        { id: "N1", processingTimeMin: 30, dueDateMin: 1000, fixtureId: "F2", toolIds: ["B"], precisionClass: "normal" },
        { id: "N2", processingTimeMin: 30, dueDateMin: 1000, fixtureId: "F3", toolIds: ["C"], precisionClass: "normal" },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: setupMatrix(jobs),
      });
      const hp = r.assignments.find((a) => a.jobId === "HP")!;
      expect(hp.palletId).toBe("APC1");
    });

    it("high-precision on AWC raises precision cost component", () => {
      // Single AWC pallet forces the HP job onto AWC.
      const pallets: Pallet[] = [
        { id: "AWC1", precisionClass: "AWC", capacity: 3, mountedFixtures: [] },
      ];
      const jobs: PalletJob[] = [
        { id: "HP", processingTimeMin: 30, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"], precisionClass: "high" },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: setupMatrix(jobs),
      });
      expect(r.costBreakdown.precision).toBeGreaterThan(0);
    });
  });

  describe("failure modes (must throw)", () => {
    it("empty pallets array throws", () => {
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: [],
          jobs: basicJobs(1),
          setupMatrix: [],
        }),
      ).toThrow(/pallets/);
    });

    it("empty jobs array throws", () => {
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs: [],
          setupMatrix: [],
        }),
      ).toThrow(/jobs/);
    });

    it("duplicate jobId throws", () => {
      const jobs: PalletJob[] = [
        { id: "D1", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: ["A"] },
        { id: "D1", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: ["A"] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: [],
        }),
      ).toThrow(/duplicate jobId/);
    });

    it("jobs exceeding total capacity throws", () => {
      const pallets: Pallet[] = [
        { id: "P1", precisionClass: "APC", capacity: 1 },
      ];
      const jobs: PalletJob[] = [
        { id: "X1", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
        { id: "X2", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({ pallets, jobs, setupMatrix: [] }),
      ).toThrow(/exceed/);
    });

    it("negative processing time throws", () => {
      const jobs: PalletJob[] = [
        { id: "N1", processingTimeMin: -5, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: [],
        }),
      ).toThrow(/processingTimeMin/);
    });

    it("negative setup time throws", () => {
      const jobs = basicJobs(2);
      const bad: SetupMatrixEntry[] = [
        { fromJobId: jobs[0].id, toJobId: jobs[1].id, setupTimeMin: -1 },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: bad,
        }),
      ).toThrow(/non-negative/);
    });
  });

  describe("adversarial inputs", () => {
    it("NaN processing time throws", () => {
      const jobs: PalletJob[] = [
        { id: "NaN", processingTimeMin: NaN, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: [],
        }),
      ).toThrow();
    });

    it("Infinity due date throws (must be finite for arithmetic stability)", () => {
      const jobs: PalletJob[] = [
        { id: "INF", processingTimeMin: 10, dueDateMin: Infinity, fixtureId: "F1", toolIds: [] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: [],
        }),
      ).toThrow(/dueDateMin/);
    });

    it("very-large finite due date (1e9) produces zero tardiness", () => {
      const jobs: PalletJob[] = [
        { id: "BIG", processingTimeMin: 10, dueDateMin: 1e9, fixtureId: "F1", toolIds: [] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets: basicPallets(1),
        jobs,
        setupMatrix: [],
      });
      expect(r.totalTardinessMin).toBe(0);
    });

    it("NaN due date throws", () => {
      const jobs: PalletJob[] = [
        { id: "NANDUE", processingTimeMin: 10, dueDateMin: NaN, fixtureId: "F1", toolIds: [] },
      ];
      expect(() =>
        palletPoolOptimizerEngine.solve({
          pallets: basicPallets(1),
          jobs,
          setupMatrix: [],
        }),
      ).toThrow(/dueDateMin/);
    });

    it("single pallet + single job still produces valid result", () => {
      const jobs: PalletJob[] = [
        { id: "ONLY", processingTimeMin: 17, dueDateMin: 1000, fixtureId: "F1", toolIds: ["A"] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets: [{ id: "P1", precisionClass: "APC", mountedFixtures: ["F1"] }],
        jobs,
        setupMatrix: [],
      });
      expect(r.assignments).toHaveLength(1);
      expect(r.makespanMin).toBe(17);
    });
  });

  describe("determinism + convergence", () => {
    it("same seed → identical result", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(5);
      const sm = setupMatrix(jobs);
      const r1 = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: sm, config: { seed: 1234 },
      });
      const r2 = palletPoolOptimizerEngine.solve({
        pallets, jobs, setupMatrix: sm, config: { seed: 1234 },
      });
      expect(r1.cost).toBeCloseTo(r2.cost, 6);
      expect(r1.makespanMin).toBe(r2.makespanMin);
    });

    it("converges within maxIterations for 20×3 scale", () => {
      const pallets: Pallet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `P${i + 1}`,
        precisionClass: (i % 3 === 0 ? "APC" : "AWC") as "APC" | "AWC",
        capacity: 3,
        mountedFixtures: ["F1"],
      }));
      const jobs: PalletJob[] = Array.from({ length: 60 }, (_, i) => ({
        id: `J${i + 1}`,
        processingTimeMin: 20 + (i % 5) * 5,
        dueDateMin: 500 + i * 40,
        fixtureId: `F${(i % 3) + 1}`,
        toolIds: [`T${(i % 7) + 1}`],
        precisionClass: (i % 10 === 0 ? "high" : "normal") as "high" | "normal",
      }));
      const start = Date.now();
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
        config: { maxRuntimeMs: 60000 },
      });
      const elapsed = Date.now() - start;
      expect(r.assignments).toHaveLength(60);
      expect(elapsed).toBeLessThan(60000); // milestone acceptance
    });

    it("defaults getter returns a copy (not a reference)", () => {
      const d1 = palletPoolOptimizerEngine.defaultWeights();
      d1.tardiness = 999;
      const d2 = palletPoolOptimizerEngine.defaultWeights();
      expect(d2.tardiness).toBe(DEFAULT_WEIGHTS.tardiness);
      expect(d2.tardiness).not.toBe(999);
    });

    it("config defaults sane", () => {
      const c = palletPoolOptimizerEngine.defaultConfig();
      expect(c.maxIterations).toBeGreaterThan(0);
      expect(c.maxRuntimeMs).toBe(DEFAULT_SOLVER_CONFIG.maxRuntimeMs);
    });
  });

  describe("fixture + tool sharing", () => {
    it("distinctFixtures ≤ jobs (must share across solutions)", () => {
      const pallets = basicPallets(2);
      const jobs = basicJobs(6);
      const r = palletPoolOptimizerEngine.solve({
        pallets,
        jobs,
        setupMatrix: setupMatrix(jobs),
      });
      expect(r.distinctFixtures).toBeLessThanOrEqual(jobs.length);
      expect(r.distinctFixtures).toBeGreaterThan(0);
    });

    it("distinctTools counts unique tool IDs correctly", () => {
      const jobs: PalletJob[] = [
        { id: "T1", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: ["A", "B"] },
        { id: "T2", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: ["B", "C"] },
      ];
      const r = palletPoolOptimizerEngine.solve({
        pallets: basicPallets(1),
        jobs,
        setupMatrix: [],
      });
      // A, B, C = 3 distinct
      expect(r.distinctTools).toBe(3);
    });
  });
});

// ---------------------------------------------------------------
// DISPATCHER ROUND-TRIP
// ---------------------------------------------------------------
describe("businessDispatcher pallet_pool_* (MILL-MASTER P38-U02)", () => {
  it("pallet_pool_optimize returns a valid schedule", async () => {
    const pallets = basicPallets(2);
    const jobs = basicJobs(4);
    const r = await businessDispatch({
      action: "pallet_pool_optimize",
      pallets,
      jobs,
      setupMatrix: setupMatrix(jobs),
    });
    expect(r.success).toBe(true);
    const schedule = r.data as any;
    expect(schedule.assignments).toHaveLength(jobs.length);
    expect(schedule.makespanMin).toBeGreaterThan(0);
  });

  it("pallet_pool_optimize rejects missing pallets", async () => {
    const r = await businessDispatch({
      action: "pallet_pool_optimize",
      pallets: [],
      jobs: basicJobs(1),
      setupMatrix: [],
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/pallets/);
  });

  it("pallet_pool_optimize propagates engine errors cleanly", async () => {
    const pallets: Pallet[] = [{ id: "P1", precisionClass: "APC", capacity: 1 }];
    const jobs: PalletJob[] = [
      { id: "O1", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
      { id: "O2", processingTimeMin: 10, dueDateMin: 100, fixtureId: "F1", toolIds: [] },
    ];
    const r = await businessDispatch({
      action: "pallet_pool_optimize",
      pallets, jobs, setupMatrix: [],
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/exceed/);
  });

  it("pallet_pool_score skips local search (maxIterations=0)", async () => {
    const pallets = basicPallets(2);
    const jobs = basicJobs(4);
    const r = await businessDispatch({
      action: "pallet_pool_score",
      pallets, jobs, setupMatrix: setupMatrix(jobs),
      assignment: { P1: ["J1", "J3"], P2: ["J2", "J4"] },
    });
    expect(r.success).toBe(true);
    const schedule = r.data as any;
    expect(schedule.iterations).toBe(0);
  });

  it("pallet_pool_score rejects missing assignment map", async () => {
    const r = await businessDispatch({
      action: "pallet_pool_score",
      pallets: basicPallets(1),
      jobs: basicJobs(1),
      setupMatrix: [],
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/assignment/);
  });

  it("pallet_pool_defaults exposes weights + config", async () => {
    const r = await businessDispatch({ action: "pallet_pool_defaults" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.weights.tardiness).toBe(DEFAULT_WEIGHTS.tardiness);
    expect(d.config.maxRuntimeMs).toBe(DEFAULT_SOLVER_CONFIG.maxRuntimeMs);
  });
});
