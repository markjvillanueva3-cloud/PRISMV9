/**
 * CrossProcessClientSelectionSchedulerEngine.test.ts — XPROC-NEURAL Tier 6 (T6-04)
 *
 * Verifies multi-criteria client selection (activity, drift, cluster
 * underrepresentation) and the Tier 6 R4 acceptance criterion: "client
 * schedule covers all material clusters within 10 rounds."
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessClientSelectionSchedulerEngine,
  crossProcessClientSelectionScheduler,
} from "../engines/CrossProcessClientSelectionSchedulerEngine.js";

// 9 canonical material clusters (T1-03 + 3 sub-classes for testing).
const NINE_CLUSTERS = ["P", "M", "K", "N", "S", "H", "P-stainless", "K-cast", "N-alu"];

function makeClient(
  clientId: string,
  cluster: string,
  driftConfidence: number,
  roundsSinceActive: number,
  sampleCount = 100,
) {
  return { clientId, materialCluster: cluster, driftConfidence, roundsSinceActive, sampleCount };
}

describe("selectClients() — input validation", () => {
  it("rejects empty client list", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [], roundBudget: 5,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects roundBudget = 0", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "P", 0.1, 0)], roundBudget: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative driftConfidence", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "P", -0.1, 0)], roundBudget: 1,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects roundsSinceActive negative", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        { clientId: "a", materialCluster: "P", driftConfidence: 0.1, roundsSinceActive: -1, sampleCount: 50 },
      ],
      roundBudget: 1,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("warns and caps when roundBudget > eligible.length", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "P", 0.1, 0), makeClient("b", "M", 0.1, 0)],
      roundBudget: 10,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.selected.length).toBe(2);
      expect(r.warnings.some((w) => w.includes("capped"))).toBe(true);
    }
  });

  it("dedupes duplicate clientIds", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("a", "P", 0.1, 0),
        makeClient("a", "M", 0.5, 5), // duplicate id, different metadata
      ],
      roundBudget: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.selected.length + r.deferred.length + r.rejected.length).toBe(1);
      expect(r.warnings.some((w) => w.includes("duplicate"))).toBe(true);
    }
  });

  it("falls back to default weights when sum=0", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "P", 0.1, 0)],
      roundBudget: 1,
      weights: { activity: 0, drift: 0, underrep: 0, activityDecay: 0.0693 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("summed to 0"))).toBe(true);
      expect(r.weights.activity).toBeCloseTo(0.30, 6);
    }
  });
});

describe("selectClients() — filtering", () => {
  it("hard-rejects high-drift clients (≥0.67) with rejected_high_drift reason", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("healthy", "P", 0.10, 0),
        makeClient("drifting", "M", 0.85, 0),
      ],
      roundBudget: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rejected.length).toBe(1);
      expect(r.rejected[0].clientId).toBe("drifting");
      expect(r.rejected[0].reason).toBe("rejected_high_drift");
    }
  });

  it("skips zero-sample clients with skipped_zero_samples reason", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("active", "P", 0.10, 0, 100),
        makeClient("empty", "M", 0.10, 0, 0),
      ],
      roundBudget: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const skipped = r.rejected.find((c) => c.clientId === "empty");
      expect(skipped?.reason).toBe("skipped_zero_samples");
    }
  });
});

describe("selectClients() — scoring", () => {
  it("recently-active healthy client with rare cluster scores highest", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        // Stale, low-drift, common cluster.
        makeClient("a", "P", 0.10, 20),
        // Recent, low-drift, RARE cluster.
        makeClient("b", "K-cast", 0.10, 0),
        // Recent, mid-drift, common cluster.
        makeClient("c", "P", 0.40, 0),
      ],
      roundBudget: 1,
      prevRound: { clusterCounts: { P: 5 }, windowRounds: 5 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.selected[0].clientId).toBe("b");
    }
  });

  it("activity decay: 10-round-stale client scores ~half of fresh client", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("fresh", "P", 0.10, 0),
        makeClient("stale", "P", 0.10, 10),
      ],
      roundBudget: 2,
      prevRound: { clusterCounts: { P: 1 }, windowRounds: 1 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const fresh = r.selected.find((s) => s.clientId === "fresh")!;
      const stale = r.selected.find((s) => s.clientId === "stale")!;
      // exp(-0.0693 * 10) ≈ 0.5
      expect(stale.components.activity).toBeCloseTo(0.5, 2);
      expect(fresh.components.activity).toBeCloseTo(1.0, 2);
    }
  });

  it("underrep boost: cluster never picked → underrep score = 1.0", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "K-cast", 0.10, 0)],
      roundBudget: 1,
      prevRound: { clusterCounts: { P: 5, M: 3 }, windowRounds: 5 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.selected[0].components.underrep).toBe(1.0);
    }
  });
});

describe("selectClients() — mandatory cluster coverage", () => {
  it("force-includes top scorer from never-covered cluster even with low score", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        // 4 strong P-cluster picks
        makeClient("p1", "P", 0.05, 0),
        makeClient("p2", "P", 0.10, 0),
        makeClient("p3", "P", 0.15, 0),
        makeClient("p4", "P", 0.20, 0),
        // 1 weak K-cast pick
        makeClient("k1", "K-cast", 0.40, 5),
      ],
      roundBudget: 3,
      prevRound: { clusterCounts: { P: 10, M: 5 }, windowRounds: 5 }, // K-cast = 0
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = new Set(r.selected.map((s) => s.clientId));
      expect(ids.has("k1")).toBe(true);
      const k1 = r.selected.find((s) => s.clientId === "k1")!;
      expect(k1.reason).toBe("mandatory_for_cluster_coverage");
      expect(r.mandatoryClusters).toContain("K-cast");
    }
  });

  it("warns when budget too small for all mandatory clusters", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("a", "P", 0.10, 0),
        makeClient("b", "M", 0.10, 0),
        makeClient("c", "K", 0.10, 0),
      ],
      roundBudget: 2,
      prevRound: { clusterCounts: {}, windowRounds: 1 }, // ALL clusters mandatory
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.selected.length).toBe(2);
      expect(r.warnings.some((w) => w.includes("too small for mandatory coverage"))).toBe(true);
    }
  });

  it("does NOT trigger mandatory when cluster already represented", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [
        makeClient("a", "P", 0.05, 0),
        makeClient("b", "M", 0.50, 5),
      ],
      roundBudget: 1,
      prevRound: { clusterCounts: { P: 1, M: 1 }, windowRounds: 1 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mandatoryClusters).toEqual([]);
      expect(r.selected[0].clientId).toBe("a"); // higher score wins normally
    }
  });

  it("coverageAfter includes new selections atop coverageBefore", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.selectClients({
      clients: [makeClient("a", "P", 0.10, 0), makeClient("b", "M", 0.10, 0)],
      roundBudget: 2,
      prevRound: { clusterCounts: { P: 3 }, windowRounds: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.coverageBefore).toEqual({ P: 3 });
      expect(r.coverageAfter.P).toBe(4);
      expect(r.coverageAfter.M).toBe(1);
    }
  });
});

describe("Tier 6 R4 acceptance: covers all clusters within 10 rounds", () => {
  it("9 clusters × 3 clients each, budget=5/round → all covered ≤10 rounds", () => {
    const clients = NINE_CLUSTERS.flatMap((cluster, ci) =>
      [0, 1, 2].map((idx) =>
        makeClient(`${cluster}-${idx}`, cluster, 0.10 + (ci % 3) * 0.05, idx, 100),
      ),
    );

    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients,
      perRoundBudget: 5,
      lookaheadRounds: 10,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clustersCovered.length).toBe(NINE_CLUSTERS.length);
      expect(r.clustersUncovered).toEqual([]);
    }
  });

  it("9 clusters covered before round 3 when budget=#clusters", () => {
    const clients = NINE_CLUSTERS.flatMap((cluster) =>
      [0, 1].map((idx) => makeClient(`${cluster}-${idx}`, cluster, 0.10, idx, 100)),
    );

    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients,
      perRoundBudget: 9,
      lookaheadRounds: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const round1 = r.plan[0];
      const clustersInRound1 = new Set(round1.selected.map((s) => s.materialCluster));
      expect(clustersInRound1.size).toBe(NINE_CLUSTERS.length);
    }
  });

  it("budget < #clusters → still covers all within lookahead via mandatory rotation", () => {
    const clients = NINE_CLUSTERS.flatMap((cluster) =>
      [0, 1].map((idx) => makeClient(`${cluster}-${idx}`, cluster, 0.10, idx, 100)),
    );

    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients,
      perRoundBudget: 3, // less than 9 clusters
      lookaheadRounds: 4, // 3*4=12 picks across 9 clusters → coverage achievable
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clustersCovered.length).toBe(NINE_CLUSTERS.length);
    }
  });
});

describe("roundPlan() — multi-round forecast", () => {
  it("returns one entry per lookahead round", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients: NINE_CLUSTERS.map((c, i) => makeClient(`c-${i}`, c, 0.10, 0, 100)),
      perRoundBudget: 3,
      lookaheadRounds: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.length).toBe(5);
      for (let i = 0; i < 5; i++) expect(r.plan[i].round).toBe(i + 1);
    }
  });

  it("rejects lookaheadRounds = 0 (Zod positive)", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients: [makeClient("a", "P", 0.10, 0)],
      perRoundBudget: 1,
      lookaheadRounds: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("simulates roundsSinceActive evolution: selected → 0, others → +1", () => {
    const r = CrossProcessClientSelectionSchedulerEngine.roundPlan({
      clients: [
        makeClient("active", "P", 0.05, 0, 100),
        makeClient("rare", "K-cast", 0.10, 0, 100),
      ],
      perRoundBudget: 1,
      lookaheadRounds: 3,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // First round: K-cast is mandatory (zero coverage). Then alternation
      // happens because (a) K-cast has prev count 1 by round 2 and (b) the
      // active client's roundsSinceActive grows. Verify diversity:
      const allClusters = new Set<string>();
      for (const round of r.plan) {
        for (const s of round.selected) allClusters.add(s.materialCluster);
      }
      expect(allClusters.has("P")).toBe(true);
      expect(allClusters.has("K-cast")).toBe(true);
    }
  });
});

describe("constants() + dispatcher wrapper", () => {
  it("constants snapshot exposes default weights", () => {
    const c = CrossProcessClientSelectionSchedulerEngine.constants();
    expect(c.DEFAULT_WEIGHTS.activity).toBe(0.30);
    expect(c.DEFAULT_WEIGHTS.drift).toBe(0.40);
    expect(c.DEFAULT_WEIGHTS.underrep).toBe(0.30);
    expect(c.HARD_REJECT_DRIFT).toBe(0.67);
  });

  it("dispatcher wrapper routes xproc_fed_select_clients", () => {
    const r = crossProcessClientSelectionScheduler("xproc_fed_select_clients", {
      clients: [makeClient("a", "P", 0.10, 0)],
      roundBudget: 1,
    }) as { ok: boolean; selected?: { clientId: string }[] };
    expect(r.ok).toBe(true);
    expect(r.selected?.[0].clientId).toBe("a");
  });

  it("dispatcher wrapper routes xproc_fed_round_plan", () => {
    const r = crossProcessClientSelectionScheduler("xproc_fed_round_plan", {
      clients: NINE_CLUSTERS.map((c, i) => makeClient(`c-${i}`, c, 0.10, 0, 100)),
      perRoundBudget: 3,
      lookaheadRounds: 4,
    }) as { ok: boolean; plan?: unknown[] };
    expect(r.ok).toBe(true);
    expect(r.plan?.length).toBe(4);
  });

  it("dispatcher wrapper rejects unknown action", () => {
    expect(() =>
      crossProcessClientSelectionScheduler("xproc_fed_bogus", {}),
    ).toThrow(/unknown action/);
  });
});
