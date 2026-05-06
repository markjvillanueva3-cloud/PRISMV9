/**
 * CrossProcessClientSelectionSchedulerEngine — XPROC-NEURAL Tier 6 (T6-04)
 *
 * Per-round client subset selection for federated training. Closes the
 * Tier 6 loop: T6-01 aggregates, T6-02 keeps individual gradients private,
 * T6-03 gates out drifting clients — and T6-04 picks WHICH of the remaining
 * eligible clients should actually participate in the next round.
 *
 * ## Why subset selection (not "everyone every round")
 *
 * Real federation has bandwidth + cost constraints. With 200 shops in a
 * federation, having all 200 upload masked weights every round is wasteful
 * — most rounds gain near-zero new signal from the 80% of shops whose
 * gradient direction agrees with the current global model. McMahan 2017
 * §3.1 reports significant cost savings with random K-of-N selection at
 * minimal accuracy loss. We extend that with PRISM-specific priors:
 *
 *   1. RECENT ACTIVITY — clients that uploaded recent outcomes have
 *      fresh gradient information; stale clients are likely redundant.
 *   2. LOW DRIFT — clients with low T3-02 driftConfidence have stable
 *      gradient direction and improve aggregation quality.
 *   3. UNDERREPRESENTED CLUSTERS — clients in material clusters
 *      underrepresented in the prior round MUST be over-selected to
 *      maintain coverage (per Tier 6 R4 acceptance: "schedule covers
 *      all material clusters within 10 rounds"). T1-03 defines the 9
 *      canonical clusters (P, M, K, N, S, H + 3 sub-classes); we
 *      treat them opaquely here.
 *
 * ## Selection algorithm
 *
 * Score each eligible client:
 *
 *   score(c) = w_activity · activity_score(c)
 *            + w_drift    · drift_score(c)
 *            + w_underrep · underrep_score(c)
 *
 * where each component is normalized to [0, 1]:
 *
 *   activity_score(c) = exp(-decay · roundsSinceActive(c))
 *     - clients last seen at round_now → score 1.0
 *     - clients last seen N rounds ago → score exp(-decay·N)
 *
 *   drift_score(c) = 1 - driftConfidence(c)
 *     - perfectly stable (drift=0) → score 1.0
 *     - mild warning band drift   → score in [0.33, 0.66]
 *
 *   underrep_score(c) = 1 / (1 + count(prevRound, cluster(c)))
 *     - cluster never picked previously → score 1.0
 *     - cluster picked 5 times          → score 1/6 ≈ 0.167
 *
 * Then pick top-K by score with a cluster-coverage tie-break: when two
 * clients have very similar scores, prefer the one whose cluster has
 * been represented less often.
 *
 * ## Coverage guarantee (Tier 6 R4)
 *
 * To make "covers all material clusters within 10 rounds" deterministic,
 * the engine ALSO emits a `mandatoryFromCluster` set: for every cluster
 * with zero recent representation in the last `coverageWindow` rounds,
 * the highest-scoring client from that cluster is force-included before
 * the top-K-by-score loop runs. This guarantees coverage as long as each
 * cluster has at least one eligible client and roundBudget ≥ #clusters.
 *
 * ## Architecture decision — pure scheduler (matches T6-01..T6-03)
 *
 * Two pure functions, no engine state:
 *
 *   1. `selectClients({clients[], roundBudget, prevRound?, weights?})`
 *      → {selected[], deferred[], reasoning, coverageBefore, coverageAfter}
 *
 *   2. `roundPlan({clients[], lookaheadRounds, perRoundBudget})`
 *      → predicted multi-round selection plan with per-round cluster
 *      coverage. Used by operator dashboards to forecast federation
 *      progress without committing to actual selections.
 *
 * Caller (T6-01 round driver) is responsible for tracking round number,
 * persisting prevRound history, and updating roundsSinceActive.
 *
 * ## Failure modes covered
 *
 *   1. Empty clients list                       → invalid_input
 *   2. roundBudget = 0                          → invalid_input
 *   3. roundBudget > clients.length             → silently capped + warn
 *   4. weights with negative components         → invalid_input
 *   5. weights summing to 0                     → use defaults + warn
 *   6. roundsSinceActive negative               → invalid_input (Zod)
 *   7. duplicate clientId                       → keep first + warn
 *   8. clients with driftConfidence = 1.0       → REJECT (downstream T6-03
 *      already filters these; if caller passes them through we still drop
 *      them as a safety net + warn)
 *   9. cluster never seen in prevRound          → mandatoryFromCluster fires
 *  10. lookaheadRounds = 0 in roundPlan         → returns single empty plan
 *
 * @module CrossProcessClientSelectionSchedulerEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Default activity decay: score halves every ~10 rounds since last active. */
const DEFAULT_ACTIVITY_DECAY = 0.0693; // ln(2)/10

/** Default scoring weights — sum to 1.0 (normalized after parsing). */
const DEFAULT_WEIGHTS = {
  activity: 0.30,
  drift: 0.40,
  underrep: 0.30,
};

/** High-drift hard reject threshold (matches T6-03 default high). */
const HARD_REJECT_DRIFT = 0.67;

/** Sanity bounds. */
const MAX_CLIENTS = 1024;
const MAX_ROUND_BUDGET = 1024;
const MAX_LOOKAHEAD_ROUNDS = 50;

// ============================================================================
// Schemas
// ============================================================================

const ClientMetaSchema = z.object({
  clientId: z.string().min(1).max(128),
  /** Material cluster id from T1-03 TransferLearningEngine (e.g. "P", "M", "K"...). */
  materialCluster: z.string().min(1).max(64),
  /** T3-02 drift score in [0, 1]. */
  driftConfidence: z.number().finite().min(0).max(1),
  /** Rounds since this client last submitted an outcome. 0 = active this round. */
  roundsSinceActive: z.number().int().nonnegative().max(10_000),
  /** Optional sample-count tie-breaker: more samples = preferred when scores tie. */
  sampleCount: z.number().int().nonnegative().default(0),
});

const PrevRoundSchema = z.object({
  /** Cluster → number of times that cluster was picked in the last K rounds. */
  clusterCounts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** Optional: number of rounds covered by clusterCounts (used by coverage gate). */
  windowRounds: z.number().int().positive().default(1),
});

const WeightsSchema = z.object({
  activity: z.number().nonnegative().default(DEFAULT_WEIGHTS.activity),
  drift: z.number().nonnegative().default(DEFAULT_WEIGHTS.drift),
  underrep: z.number().nonnegative().default(DEFAULT_WEIGHTS.underrep),
  activityDecay: z.number().positive().default(DEFAULT_ACTIVITY_DECAY),
});

const SelectInputSchema = z.object({
  clients: z.array(ClientMetaSchema).min(1).max(MAX_CLIENTS),
  roundBudget: z.number().int().positive().max(MAX_ROUND_BUDGET),
  prevRound: PrevRoundSchema.optional(),
  weights: WeightsSchema.optional(),
  /** Coverage window: clusters with zero rep in last N rounds get mandatory pick. */
  coverageWindow: z.number().int().positive().default(10).optional(),
});

const RoundPlanInputSchema = z.object({
  clients: z.array(ClientMetaSchema).min(1).max(MAX_CLIENTS),
  perRoundBudget: z.number().int().positive().max(MAX_ROUND_BUDGET),
  lookaheadRounds: z.number().int().positive().max(MAX_LOOKAHEAD_ROUNDS),
  weights: WeightsSchema.optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface ClientMeta {
  clientId: string;
  materialCluster: string;
  driftConfidence: number;
  roundsSinceActive: number;
  sampleCount: number;
}

export interface ScoredClient {
  clientId: string;
  materialCluster: string;
  score: number;
  components: {
    activity: number;
    drift: number;
    underrep: number;
  };
  reason: "selected_by_score" | "mandatory_for_cluster_coverage" | "deferred_low_score" | "rejected_high_drift" | "skipped_zero_samples";
}

export interface SelectOk {
  ok: true;
  selected: ScoredClient[];
  deferred: ScoredClient[];
  rejected: ScoredClient[];
  /** Cluster coverage histogram BEFORE this round (from prevRound input). */
  coverageBefore: Record<string, number>;
  /** Cluster coverage histogram AFTER selecting this round. */
  coverageAfter: Record<string, number>;
  /** Clusters that triggered mandatory selection this round. */
  mandatoryClusters: string[];
  /** Effective scoring weights actually used. */
  weights: { activity: number; drift: number; underrep: number; activityDecay: number };
  warnings: string[];
}

export interface RoundPlanEntry {
  round: number;
  selected: { clientId: string; materialCluster: string; score: number }[];
  coverage: Record<string, number>;
}

export interface RoundPlanOk {
  ok: true;
  plan: RoundPlanEntry[];
  /** All clusters that were covered at least once across the lookahead window. */
  clustersCovered: string[];
  /** Clusters never selected across the entire window. */
  clustersUncovered: string[];
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type SelectResult = SelectOk | OpErr;
export type RoundPlanResult = RoundPlanOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function normalizeWeights(
  raw: { activity: number; drift: number; underrep: number; activityDecay: number },
): { activity: number; drift: number; underrep: number; activityDecay: number; usedDefault: boolean } {
  const sum = raw.activity + raw.drift + raw.underrep;
  if (sum === 0) {
    return {
      activity: DEFAULT_WEIGHTS.activity,
      drift: DEFAULT_WEIGHTS.drift,
      underrep: DEFAULT_WEIGHTS.underrep,
      activityDecay: raw.activityDecay,
      usedDefault: true,
    };
  }
  return {
    activity: raw.activity / sum,
    drift: raw.drift / sum,
    underrep: raw.underrep / sum,
    activityDecay: raw.activityDecay,
    usedDefault: false,
  };
}

function dedupClients(clients: ClientMeta[]): { unique: ClientMeta[]; warnings: string[] } {
  const seen = new Map<string, ClientMeta>();
  const warnings: string[] = [];
  for (const c of clients) {
    if (seen.has(c.clientId)) {
      warnings.push(`duplicate clientId '${c.clientId}' (kept first)`);
      continue;
    }
    seen.set(c.clientId, c);
  }
  return { unique: Array.from(seen.values()), warnings };
}

function scoreClient(
  c: ClientMeta,
  prevCounts: Record<string, number>,
  weights: { activity: number; drift: number; underrep: number; activityDecay: number },
): { score: number; components: { activity: number; drift: number; underrep: number } } {
  const activity = Math.exp(-weights.activityDecay * c.roundsSinceActive);
  const drift = 1 - c.driftConfidence;
  const underrep = 1 / (1 + (prevCounts[c.materialCluster] ?? 0));
  const score =
    weights.activity * activity +
    weights.drift * drift +
    weights.underrep * underrep;
  return { score, components: { activity, drift, underrep } };
}

// Pick the highest-scoring client from each given cluster (for mandatory coverage).
// Returns map cluster → ScoredClient (or undefined if cluster has no eligible client).
function topPerCluster(
  scored: ScoredClient[],
  clusters: Set<string>,
): Map<string, ScoredClient> {
  const best = new Map<string, ScoredClient>();
  for (const s of scored) {
    if (!clusters.has(s.materialCluster)) continue;
    const cur = best.get(s.materialCluster);
    if (!cur || s.score > cur.score) best.set(s.materialCluster, s);
  }
  return best;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessClientSelectionSchedulerEngine {
  static readonly tier = "T6-04";

  /**
   * Select up to roundBudget clients for the next federated round.
   *
   * Order of operations:
   *   1. Drop high-drift (≥0.67) and zero-sample clients with rejected/skipped tags.
   *   2. Score remaining by weighted activity + drift-stability + underrep.
   *   3. Determine mandatory-coverage clusters (any cluster with 0 selections
   *      in prevRound when coverageWindow is set). Force-include the top
   *      scoring eligible client from each such cluster.
   *   4. Fill remaining budget with top-by-score clients not yet selected.
   *   5. Update coverageAfter histogram and emit the round plan.
   */
  static selectClients(input: unknown): SelectResult {
    const parsed = SelectInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients, roundBudget } = parsed.data;
    const prevRound = parsed.data.prevRound ?? { clusterCounts: {}, windowRounds: 1 };
    const rawWeights = parsed.data.weights ?? {
      activity: DEFAULT_WEIGHTS.activity,
      drift: DEFAULT_WEIGHTS.drift,
      underrep: DEFAULT_WEIGHTS.underrep,
      activityDecay: DEFAULT_ACTIVITY_DECAY,
    };
    const norm = normalizeWeights(rawWeights);
    const warnings: string[] = [];
    if (norm.usedDefault) {
      warnings.push("weights summed to 0; using defaults");
    }

    const { unique, warnings: dwarn } = dedupClients(clients as ClientMeta[]);
    warnings.push(...dwarn);

    // Phase 1: filter rejects (high drift, zero sampleCount).
    const rejected: ScoredClient[] = [];
    const skipped: ScoredClient[] = [];
    const eligible: ClientMeta[] = [];
    for (const c of unique) {
      if (c.driftConfidence >= HARD_REJECT_DRIFT) {
        rejected.push({
          clientId: c.clientId,
          materialCluster: c.materialCluster,
          score: 0,
          components: { activity: 0, drift: 0, underrep: 0 },
          reason: "rejected_high_drift",
        });
        continue;
      }
      if (c.sampleCount === 0) {
        skipped.push({
          clientId: c.clientId,
          materialCluster: c.materialCluster,
          score: 0,
          components: { activity: 0, drift: 0, underrep: 0 },
          reason: "skipped_zero_samples",
        });
        continue;
      }
      eligible.push(c);
    }

    if (eligible.length === 0) {
      return {
        ok: true,
        selected: [],
        deferred: [],
        rejected: [...rejected, ...skipped],
        coverageBefore: { ...prevRound.clusterCounts },
        coverageAfter: { ...prevRound.clusterCounts },
        mandatoryClusters: [],
        weights: norm,
        warnings: [...warnings, "no eligible clients after filtering"],
      };
    }

    // Phase 2: score remaining.
    const scored: ScoredClient[] = eligible.map((c) => {
      const { score, components } = scoreClient(c, prevRound.clusterCounts, norm);
      return {
        clientId: c.clientId,
        materialCluster: c.materialCluster,
        score,
        components,
        reason: "deferred_low_score", // tentative — overwritten when selected
      };
    });

    let effectiveBudget = roundBudget;
    if (effectiveBudget > eligible.length) {
      warnings.push(`roundBudget=${roundBudget} exceeds eligible count=${eligible.length}; capped`);
      effectiveBudget = eligible.length;
    }

    // Phase 3: determine mandatory clusters (zero-rep clusters in prevRound).
    const mandatoryClusters: string[] = [];
    const eligibleClusters = new Set<string>();
    for (const c of eligible) eligibleClusters.add(c.materialCluster);
    for (const cluster of eligibleClusters) {
      if ((prevRound.clusterCounts[cluster] ?? 0) === 0) {
        mandatoryClusters.push(cluster);
      }
    }

    const mandatoryPicks = topPerCluster(scored, new Set(mandatoryClusters));
    const selected: ScoredClient[] = [];
    const selectedIds = new Set<string>();
    for (const cluster of mandatoryClusters) {
      const pick = mandatoryPicks.get(cluster);
      if (!pick) continue; // shouldn't happen — eligibleClusters guarantees presence
      if (selected.length >= effectiveBudget) {
        warnings.push(
          `roundBudget=${effectiveBudget} too small for mandatory coverage (${mandatoryClusters.length} clusters); cluster '${cluster}' deferred`,
        );
        break;
      }
      selected.push({ ...pick, reason: "mandatory_for_cluster_coverage" });
      selectedIds.add(pick.clientId);
    }

    // Phase 4: fill remaining budget with top-by-score.
    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    for (const s of sortedByScore) {
      if (selected.length >= effectiveBudget) break;
      if (selectedIds.has(s.clientId)) continue;
      selected.push({ ...s, reason: "selected_by_score" });
      selectedIds.add(s.clientId);
    }

    const deferred: ScoredClient[] = [];
    for (const s of sortedByScore) {
      if (!selectedIds.has(s.clientId)) {
        deferred.push({ ...s, reason: "deferred_low_score" });
      }
    }

    // Phase 5: coverage histograms.
    const coverageBefore = { ...prevRound.clusterCounts };
    const coverageAfter = { ...coverageBefore };
    for (const s of selected) {
      coverageAfter[s.materialCluster] = (coverageAfter[s.materialCluster] ?? 0) + 1;
    }

    return {
      ok: true,
      selected,
      deferred,
      rejected: [...rejected, ...skipped],
      coverageBefore,
      coverageAfter,
      mandatoryClusters,
      weights: norm,
      warnings,
    };
  }

  /**
   * Forecast multi-round selection plan WITHOUT executing rounds.
   *
   * Simulates `lookaheadRounds` rounds where each round:
   *   - calls selectClients on the current state
   *   - increments roundsSinceActive for non-selected clients (=+1)
   *   - resets roundsSinceActive=0 for selected clients
   *   - feeds previous round's coverageAfter into next round's prevRound
   *
   * Used by operator dashboards to forecast federation progress.
   *
   * NOTE: This simulation is an APPROXIMATION because it does not model
   * driftConfidence evolution (each client's drift stays constant across
   * the lookahead). Real rounds will diverge from the plan.
   */
  static roundPlan(input: unknown): RoundPlanResult {
    const parsed = RoundPlanInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { lookaheadRounds, perRoundBudget } = parsed.data;
    const weights = parsed.data.weights;

    const allClusters = new Set<string>();
    let state: ClientMeta[] = (parsed.data.clients as ClientMeta[]).map((c) => {
      allClusters.add(c.materialCluster);
      return { ...c };
    });
    let prevCounts: Record<string, number> = {};
    const plan: RoundPlanEntry[] = [];
    const warnings: string[] = [];

    for (let r = 1; r <= lookaheadRounds; r++) {
      const sel = CrossProcessClientSelectionSchedulerEngine.selectClients({
        clients: state,
        roundBudget: perRoundBudget,
        prevRound: { clusterCounts: prevCounts, windowRounds: r },
        weights,
      });
      if (!sel.ok) {
        return { ok: false, error: sel.error, message: sel.message };
      }
      warnings.push(...sel.warnings.map((w) => `round ${r}: ${w}`));

      plan.push({
        round: r,
        selected: sel.selected.map((s) => ({
          clientId: s.clientId,
          materialCluster: s.materialCluster,
          score: s.score,
        })),
        coverage: { ...sel.coverageAfter },
      });
      prevCounts = { ...sel.coverageAfter };

      const selectedSet = new Set(sel.selected.map((s) => s.clientId));
      state = state.map((c) => ({
        ...c,
        roundsSinceActive: selectedSet.has(c.clientId) ? 0 : c.roundsSinceActive + 1,
      }));
    }

    const coveredSet = new Set<string>();
    for (const cluster of Object.keys(prevCounts)) {
      if ((prevCounts[cluster] ?? 0) > 0) coveredSet.add(cluster);
    }
    const clustersCovered = Array.from(coveredSet).sort();
    const clustersUncovered = Array.from(allClusters).filter((c) => !coveredSet.has(c)).sort();

    return {
      ok: true,
      plan,
      clustersCovered,
      clustersUncovered,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    DEFAULT_WEIGHTS: { activity: number; drift: number; underrep: number };
    DEFAULT_ACTIVITY_DECAY: number;
    HARD_REJECT_DRIFT: number;
    MAX_CLIENTS: number;
  } {
    return {
      DEFAULT_WEIGHTS: { ...DEFAULT_WEIGHTS },
      DEFAULT_ACTIVITY_DECAY,
      HARD_REJECT_DRIFT,
      MAX_CLIENTS,
    };
  }
}

export const crossProcessClientSelectionSchedulerEngine = CrossProcessClientSelectionSchedulerEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessClientSelectionScheduler(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_fed_select_clients":
      return CrossProcessClientSelectionSchedulerEngine.selectClients(params);
    case "xproc_fed_round_plan":
      return CrossProcessClientSelectionSchedulerEngine.roundPlan(params);
    case "xproc_fed_scheduler_constants":
      return CrossProcessClientSelectionSchedulerEngine.constants();
    default:
      throw new Error(`crossProcessClientSelectionScheduler: unknown action '${action}'`);
  }
}
