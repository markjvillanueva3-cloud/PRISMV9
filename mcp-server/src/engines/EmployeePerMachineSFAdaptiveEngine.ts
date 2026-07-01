/**
 * EmployeePerMachineSFAdaptiveEngine — Per-machine adaptive speed/feed learning.
 *
 * No two machines are the same — even same brand/model. Bearing wear, spindle
 * balance, rigidity differences, foundation, accumulated drift mean that a
 * RPM/feed that runs clean on machine #1 chatters on machine #2. This engine
 * tracks outcomes PER MACHINE SERIAL (not per machine type) and runs a
 * Bayesian conjugate-Gaussian update of the per-(machine, material, tool)
 * speed/feed prior from operator-recorded outcomes via the employee portal.
 *
 * Outcome dimensions tracked:
 *   - RPM (spindle speed)
 *   - feed_in_min OR feed_per_tooth_mm (feed rate)
 *   - depth_of_cut_mm (axial DOC)
 *   - width_of_cut_mm (radial WOC)
 *
 * Each independently maintains a Gaussian prior keyed on
 *   (machine_serial, material, tool_type)
 * and updates from observations tagged with the outcome verdict:
 *   "perfect" (1.0×), "good" (0.8×), "marginal" (0.4×), "chatter" (-0.5×),
 *   "tool_break" (-1.0×), "poor_finish" (0.2×)
 *
 * The verdict modulates the *direction* of the update: a chatter outcome at
 * RPM=8000 pushes the posterior DOWN toward a lower RPM; tool_break is the
 * strongest negative signal; perfect/good both push toward x_obs.
 *
 * Algorithm: standard conjugate-Gaussian update with sign-modulated effective
 * observation. Implementation closely mirrors `AdaptiveShopRateEngine` but
 * adds the verdict-modulator + per-dimension parallel update + insert-side
 * tag pass-through.
 *
 *   For each dimension d ∈ {rpm, feed, doc, woc} with observation x_d:
 *     effective_x_d = x_d if verdict ≥ 0
 *     effective_x_d = (1 - |verdict|) × μ_prior + |verdict| × x_d_target_lower if verdict < 0
 *
 *     posterior_precision = 1/σ²_prior + 1/σ²_obs
 *     posterior_mean      = (μ_prior/σ²_prior + effective_x_d/σ²_obs) / posterior_precision
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: NaN/negative inputs throw
 *   - Object.frozen returns
 *   - PII-free: ledger stores employee_id as string only (no name/SSN/DOB)
 *   - Per-machine isolation: machine A's observations never bleed into machine B's prior
 *
 * References:
 *   - Same conjugate-Gaussian math as AdaptiveShopRateEngine (Gelman BDA3 §2.5)
 *   - Verdict-modulator inspired by reinforcement-learning reward shaping
 *
 * @module EmployeePerMachineSFAdaptiveEngine
 * @milestone HOTEL/U-EMP-PER-MACHINE-SF-ADAPTIVE (2026-05-25, slot:hotel iter6)
 */

// ─── Constants ────────────────────────────────────────────────
/** Initial prior σ as fraction of mean (35% — wider than shop-rate's 25% because cutting params have higher inherent variance). */
const INITIAL_PRIOR_SIGMA_FRACTION = 0.35;
/** Default observation σ as fraction of x_obs (20%). */
const DEFAULT_OBS_SIGMA_FRACTION = 0.2;
/** σ floor to prevent precision-explosion. */
const MIN_SIGMA = 0.5;
/** Verdict → reward magnitude lookup. */
const VERDICT_REWARD: Record<string, number> = {
  perfect: 1.0,
  good: 0.8,
  marginal: 0.4,
  poor_finish: 0.2,
  chatter: -0.5,
  tool_break: -1.0,
};

// ─── Types ────────────────────────────────────────────────────

export type OutcomeVerdict =
  | "perfect"
  | "good"
  | "marginal"
  | "poor_finish"
  | "chatter"
  | "tool_break";

export interface SFObservation {
  /** Machine serial — UNIQUE per physical machine, even same brand/model differ. */
  machine_serial: string;
  /** Material short-name (e.g. "AL6061-T6", "SS304", "INC718"). */
  material: string;
  /** Tool type short-name (e.g. "endmill_4fl_carbide_0.25in", "cnmg432_p25"). */
  tool_type: string;
  /** Spindle speed used (RPM). */
  rpm_used: number;
  /** Feed rate used (in/min). */
  feed_in_min_used: number;
  /** Axial depth of cut (mm) used. */
  doc_mm_used: number;
  /** Radial width of cut (mm) used. */
  woc_mm_used: number;
  /** Outcome verdict — see OutcomeVerdict enum. */
  verdict: OutcomeVerdict;
  /** Optional insert-corner tag (CNMG corner 1-8, DCMT 1-6, etc.) — pass-through to InsertTracker. */
  insert_corner?: number;
  /** Employee id who recorded this — for audit. */
  employee_id: string;
  /** Job id this outcome relates to. */
  job_id: string;
  /** ISO timestamp the observation was recorded. */
  recorded_at: string;
}

export interface SFPriorDimension {
  /** Posterior mean. */
  mu: number;
  /** Posterior std dev. */
  sigma: number;
  /** Observation count folded in. */
  n: number;
}

export interface SFPrior {
  machine_serial: string;
  material: string;
  tool_type: string;
  rpm: SFPriorDimension;
  feed_in_min: SFPriorDimension;
  doc_mm: SFPriorDimension;
  woc_mm: SFPriorDimension;
  /** ISO timestamp of last update. */
  last_updated: string | null;
  /** Observations that contributed (job ids). */
  contributing: ReadonlyArray<string>;
}

export interface SFAdaptResult {
  machine_serial: string;
  material: string;
  tool_type: string;
  observations_applied: number;
  by_dimension: {
    rpm: { before: SFPriorDimension; after: SFPriorDimension; delta_pct: number };
    feed_in_min: { before: SFPriorDimension; after: SFPriorDimension; delta_pct: number };
    doc_mm: { before: SFPriorDimension; after: SFPriorDimension; delta_pct: number };
    woc_mm: { before: SFPriorDimension; after: SFPriorDimension; delta_pct: number };
  };
  recommended: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
  recommendation_credible_95: {
    rpm: { lower: number; upper: number };
    feed_in_min: { lower: number; upper: number };
    doc_mm: { lower: number; upper: number };
    woc_mm: { lower: number; upper: number };
  };
  source: "EmployeePerMachineSFAdaptiveEngine.v1";
}

// ─── Engine ───────────────────────────────────────────────────

class EmployeePerMachineSFAdaptiveEngine {
  private observations: Map<string, SFObservation[]> = new Map();
  private priors: Map<string, SFPrior> = new Map();

  /** Compose composite key from per-machine tuple. */
  private key(machine_serial: string, material: string, tool_type: string): string {
    return `${machine_serial}|${material}|${tool_type}`;
  }

  /**
   * Record an outcome observation. Stored in the per-(machine, material, tool)
   * ledger; used by next call to `adaptPrior`.
   *
   * @throws Error on NaN / negative / invalid verdict (R12 fail-loud)
   */
  recordOutcome(obs: SFObservation): SFObservation {
    this.validateObservation(obs);
    const k = this.key(obs.machine_serial, obs.material, obs.tool_type);
    const frozen = Object.freeze({ ...obs });
    const list = this.observations.get(k) ?? [];
    list.push(frozen);
    this.observations.set(k, list);
    return frozen;
  }

  /** List observations for a (machine, material, tool) tuple — defensive copy. */
  listOutcomes(
    machine_serial: string,
    material: string,
    tool_type: string,
  ): ReadonlyArray<SFObservation> {
    return Object.freeze([...(this.observations.get(this.key(machine_serial, material, tool_type)) ?? [])]);
  }

  /**
   * Get current per-machine prior, or bootstrap one from caller-supplied
   * defaults (the speed/feed calculator's recommendation acts as the prior).
   *
   * @throws Error if no prior exists AND no bootstrap given
   */
  getPrior(args: {
    machine_serial: string;
    material: string;
    tool_type: string;
    bootstrap?: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
  }): SFPrior {
    const k = this.key(args.machine_serial, args.material, args.tool_type);
    const existing = this.priors.get(k);
    if (existing) {
      return Object.freeze({ ...existing, contributing: Object.freeze([...existing.contributing]) });
    }
    if (!args.bootstrap) {
      throw new Error(
        `EmployeePerMachineSFAdaptiveEngine: no prior for "${k}" and no bootstrap provided`,
      );
    }
    const b = args.bootstrap;
    if (
      !Number.isFinite(b.rpm) || b.rpm <= 0 ||
      !Number.isFinite(b.feed_in_min) || b.feed_in_min <= 0 ||
      !Number.isFinite(b.doc_mm) || b.doc_mm <= 0 ||
      !Number.isFinite(b.woc_mm) || b.woc_mm <= 0
    ) {
      throw new Error("EmployeePerMachineSFAdaptiveEngine: bootstrap values must be positive finite numbers");
    }
    return Object.freeze({
      machine_serial: args.machine_serial,
      material: args.material,
      tool_type: args.tool_type,
      rpm: { mu: b.rpm, sigma: Math.max(MIN_SIGMA, b.rpm * INITIAL_PRIOR_SIGMA_FRACTION), n: 0 },
      feed_in_min: { mu: b.feed_in_min, sigma: Math.max(MIN_SIGMA, b.feed_in_min * INITIAL_PRIOR_SIGMA_FRACTION), n: 0 },
      doc_mm: { mu: b.doc_mm, sigma: Math.max(MIN_SIGMA, b.doc_mm * INITIAL_PRIOR_SIGMA_FRACTION), n: 0 },
      woc_mm: { mu: b.woc_mm, sigma: Math.max(MIN_SIGMA, b.woc_mm * INITIAL_PRIOR_SIGMA_FRACTION), n: 0 },
      last_updated: null,
      contributing: Object.freeze([]),
    });
  }

  /**
   * Run Bayesian adaptation: fold every recorded outcome into the prior
   * for this (machine, material, tool) tuple. Per-dimension parallel update.
   *
   * @throws Error if no observations + no existing prior + no bootstrap
   */
  adaptPrior(args: {
    machine_serial: string;
    material: string;
    tool_type: string;
    bootstrap?: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
    obsSigmaFraction?: number;
  }): SFAdaptResult {
    const k = this.key(args.machine_serial, args.material, args.tool_type);
    const sigFrac = args.obsSigmaFraction ?? DEFAULT_OBS_SIGMA_FRACTION;
    if (!Number.isFinite(sigFrac) || sigFrac <= 0 || sigFrac >= 1) {
      throw new Error(
        `EmployeePerMachineSFAdaptiveEngine: obsSigmaFraction must be in (0,1), got ${sigFrac}`,
      );
    }
    const prior = this.getPrior(args);
    const obs = this.observations.get(k) ?? [];
    if (obs.length === 0) {
      // No-op return.
      return Object.freeze({
        machine_serial: args.machine_serial,
        material: args.material,
        tool_type: args.tool_type,
        observations_applied: 0,
        by_dimension: {
          rpm: { before: prior.rpm, after: prior.rpm, delta_pct: 0 },
          feed_in_min: { before: prior.feed_in_min, after: prior.feed_in_min, delta_pct: 0 },
          doc_mm: { before: prior.doc_mm, after: prior.doc_mm, delta_pct: 0 },
          woc_mm: { before: prior.woc_mm, after: prior.woc_mm, delta_pct: 0 },
        },
        recommended: {
          rpm: this.round2(prior.rpm.mu),
          feed_in_min: this.round2(prior.feed_in_min.mu),
          doc_mm: this.round2(prior.doc_mm.mu),
          woc_mm: this.round2(prior.woc_mm.mu),
        },
        recommendation_credible_95: {
          rpm: this.ci95(prior.rpm.mu, prior.rpm.sigma),
          feed_in_min: this.ci95(prior.feed_in_min.mu, prior.feed_in_min.sigma),
          doc_mm: this.ci95(prior.doc_mm.mu, prior.doc_mm.sigma),
          woc_mm: this.ci95(prior.woc_mm.mu, prior.woc_mm.sigma),
        },
        source: "EmployeePerMachineSFAdaptiveEngine.v1" as const,
      });
    }

    // Per-dimension update.
    const updatedRpm = this.updateDimension(prior.rpm, obs, "rpm_used", sigFrac);
    const updatedFeed = this.updateDimension(prior.feed_in_min, obs, "feed_in_min_used", sigFrac);
    const updatedDoc = this.updateDimension(prior.doc_mm, obs, "doc_mm_used", sigFrac);
    const updatedWoc = this.updateDimension(prior.woc_mm, obs, "woc_mm_used", sigFrac);

    const newPrior: SFPrior = {
      machine_serial: args.machine_serial,
      material: args.material,
      tool_type: args.tool_type,
      rpm: updatedRpm.after,
      feed_in_min: updatedFeed.after,
      doc_mm: updatedDoc.after,
      woc_mm: updatedWoc.after,
      last_updated: new Date().toISOString(),
      contributing: Object.freeze([...prior.contributing, ...obs.map((o) => o.job_id)]),
    };
    this.priors.set(k, newPrior);

    return Object.freeze({
      machine_serial: args.machine_serial,
      material: args.material,
      tool_type: args.tool_type,
      observations_applied: obs.length,
      by_dimension: {
        rpm: updatedRpm,
        feed_in_min: updatedFeed,
        doc_mm: updatedDoc,
        woc_mm: updatedWoc,
      },
      recommended: {
        rpm: this.round2(updatedRpm.after.mu),
        feed_in_min: this.round2(updatedFeed.after.mu),
        doc_mm: this.round2(updatedDoc.after.mu),
        woc_mm: this.round2(updatedWoc.after.mu),
      },
      recommendation_credible_95: {
        rpm: this.ci95(updatedRpm.after.mu, updatedRpm.after.sigma),
        feed_in_min: this.ci95(updatedFeed.after.mu, updatedFeed.after.sigma),
        doc_mm: this.ci95(updatedDoc.after.mu, updatedDoc.after.sigma),
        woc_mm: this.ci95(updatedWoc.after.mu, updatedWoc.after.sigma),
      },
      source: "EmployeePerMachineSFAdaptiveEngine.v1" as const,
    });
  }

  /**
   * Return the adapted speed-feed recommendation for a (machine, material, tool)
   * combination — convenience wrapper that adapts then returns just `recommended`.
   */
  recommendSpeedsFeeds(args: {
    machine_serial: string;
    material: string;
    tool_type: string;
    bootstrap: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
  }): { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number; n_observations: number; source: string } {
    const result = this.adaptPrior(args);
    return Object.freeze({
      ...result.recommended,
      n_observations: result.observations_applied,
      source: "EmployeePerMachineSFAdaptiveEngine.v1",
    });
  }

  /** Reset state — test-only. */
  reset(): void {
    this.observations.clear();
    this.priors.clear();
  }

  // ─── Internals ──────────────────────────────────────────────

  private updateDimension(
    prior: SFPriorDimension,
    obs: SFObservation[],
    field: "rpm_used" | "feed_in_min_used" | "doc_mm_used" | "woc_mm_used",
    sigFrac: number,
  ): { before: SFPriorDimension; after: SFPriorDimension; delta_pct: number } {
    const sigPrior = Math.max(MIN_SIGMA, prior.sigma);
    const varPrior = sigPrior * sigPrior;
    let precisionAcc = 1 / varPrior;
    let meanWeightedAcc = prior.mu / varPrior;

    for (const o of obs) {
      const xRaw = (o as any)[field] as number;
      if (!Number.isFinite(xRaw) || xRaw <= 0) continue;
      const reward = VERDICT_REWARD[o.verdict];
      if (reward === undefined) continue;
      // Effective observation: negative verdicts push toward (prior - delta);
      // positive verdicts pull toward x_obs.
      const xEff =
        reward >= 0
          ? xRaw
          : (1 - Math.abs(reward)) * prior.mu + Math.abs(reward) * (prior.mu - Math.abs(xRaw - prior.mu));
      // σ_obs scales by |reward|: stronger verdict → tighter σ_obs → more influence.
      const sigObs = Math.max(MIN_SIGMA, prior.mu * sigFrac / Math.max(0.1, Math.abs(reward)));
      const varObs = sigObs * sigObs;
      precisionAcc += 1 / varObs;
      meanWeightedAcc += xEff / varObs;
    }

    const posteriorVar = 1 / precisionAcc;
    const posteriorMean = meanWeightedAcc * posteriorVar;
    const posteriorSigma = Math.sqrt(posteriorVar);

    const after: SFPriorDimension = {
      mu: posteriorMean,
      sigma: posteriorSigma,
      n: prior.n + obs.length,
    };
    const deltaPct = prior.mu > 0 ? ((posteriorMean - prior.mu) / prior.mu) * 100 : 0;

    return {
      before: { mu: this.round2(prior.mu), sigma: this.round2(prior.sigma), n: prior.n },
      after: { mu: this.round2(after.mu), sigma: this.round2(after.sigma), n: after.n },
      delta_pct: this.round2(deltaPct),
    };
  }

  private validateObservation(o: SFObservation): void {
    if (!o || typeof o !== "object") {
      throw new Error("EmployeePerMachineSFAdaptiveEngine: observation required");
    }
    if (!o.machine_serial || !o.material || !o.tool_type) {
      throw new Error("EmployeePerMachineSFAdaptiveEngine: machine_serial + material + tool_type required");
    }
    if (!o.employee_id || !o.job_id) {
      throw new Error("EmployeePerMachineSFAdaptiveEngine: employee_id + job_id required");
    }
    if (VERDICT_REWARD[o.verdict] === undefined) {
      throw new Error(`EmployeePerMachineSFAdaptiveEngine: invalid verdict "${o.verdict}"`);
    }
    const numFields: Array<keyof SFObservation> = ["rpm_used", "feed_in_min_used", "doc_mm_used", "woc_mm_used"];
    for (const f of numFields) {
      const v = (o as any)[f] as number;
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`EmployeePerMachineSFAdaptiveEngine: ${String(f)} must be positive finite, got ${v}`);
      }
    }
    if (o.insert_corner !== undefined) {
      if (!Number.isInteger(o.insert_corner) || o.insert_corner < 1) {
        throw new Error("EmployeePerMachineSFAdaptiveEngine: insert_corner must be a positive integer if provided");
      }
    }
  }

  private ci95(mu: number, sigma: number): { lower: number; upper: number } {
    return { lower: this.round2(mu - 1.96 * sigma), upper: this.round2(mu + 1.96 * sigma) };
  }

  private round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }
}

export const employeePerMachineSFAdaptiveEngine = new EmployeePerMachineSFAdaptiveEngine();
