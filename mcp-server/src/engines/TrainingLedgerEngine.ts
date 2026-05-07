/**
 * TrainingLedgerEngine (U-LPR-TRAINING-LEDGER, ML R1)
 *
 * Append-only ledger of every LoRA / adapter training run. Pins the
 * dataset-manifest hash and augmentation seed *at run start* so that
 * four parallel experiments cannot silently drift apart.
 *
 * Drift scenarios this prevents:
 *   1. Experiment A starts on manifest_hash=α. Someone adds files to
 *      data/jm-die/train/ before experiment B starts. B's manifest hash
 *      is β — the two are no longer comparable, but there's no audit
 *      record of why.
 *   2. Aug seed defaults to Date.now() → irreproducible runs → ablation
 *      results can't be re-created.
 *   3. Two experiments report identical eval metrics because they
 *      secretly share checkpoints (the same random init survived).
 *
 * The ledger stores each run's immutable fingerprint:
 *
 *   RunId  = djb2(experiment_id + attempt + start_ts)
 *   Fingerprint = {
 *     base_weight_sha256,       // frozen pre-training checkpoint
 *     manifest_sha256,           // dataset manifest at start
 *     aug_seed,                  // PRNG seed for augmentation
 *     hyperparams_sha256,        // LR, rank, alpha, dropout, ...
 *     tokenizer_version,
 *     trainer_commit_sha,
 *   }
 *
 * At end-of-run the ledger is closed with a second fingerprint
 * (eval_metrics_sha256, final_weight_sha256) so the full before/after
 * pair is provable and auditable.
 *
 * Pure engine, in-memory — callers persist to WEDM_TRAINING_LEDGER.json
 * (or any ledger file). No side-effects inside the engine.
 *
 * Refs:
 *   - Sculley et al. (2015) "Hidden Technical Debt in Machine Learning
 *     Systems" — §Entanglement & CACE (Changing Anything Changes
 *     Everything) motivating immutable run fingerprints.
 *   - Patton et al. (2023) "Reproducibility in LLM Fine-Tuning" §3.2.
 *   - NIST AI RMF GOVERN-1.5 (model lineage tracking).
 */

export type RunStatus =
  | "open"
  | "completed"
  | "aborted"
  | "failed_validation";

export interface TrainingRunStart {
  experiment_id: string;            // human identifier, e.g. "lathe-rank16-v2"
  attempt: number;                  // 1-based retry counter
  start_ts: number;                 // epoch ms
  base_weight_sha256: string;       // pre-training checkpoint hash
  manifest_sha256: string;          // dataset manifest hash
  aug_seed: number;                 // augmentation PRNG seed
  hyperparams_sha256: string;       // hp config hash
  tokenizer_version: string;        // e.g. "tiktoken/cl100k-base"
  trainer_commit_sha: string;       // git SHA of trainer code
  author: string;                   // engineer initiating the run
  notes?: string;
}

export interface TrainingRunClose {
  run_id: string;
  end_ts: number;
  status: Extract<RunStatus, "completed" | "aborted" | "failed_validation">;
  final_weight_sha256?: string;     // only on completed
  eval_metrics_sha256?: string;     // eval result hash
  elapsed_ms: number;
  wall_clock_ms: number;            // may differ from elapsed if paused
  reason?: string;                  // required for aborted/failed
}

export interface TrainingRunRecord {
  run_id: string;
  experiment_id: string;
  attempt: number;
  status: RunStatus;
  start_ts: number;
  end_ts?: number;
  fingerprint: {
    base_weight_sha256: string;
    manifest_sha256: string;
    aug_seed: number;
    hyperparams_sha256: string;
    tokenizer_version: string;
    trainer_commit_sha: string;
  };
  outcome?: {
    final_weight_sha256?: string;
    eval_metrics_sha256?: string;
    elapsed_ms: number;
    wall_clock_ms: number;
    reason?: string;
  };
  author: string;
  notes?: string;
}

export interface DriftReport {
  experiment_id: string;
  run_count: number;
  manifest_drift: { seen: string[]; distinct: number };
  aug_seed_drift: { seen: number[]; distinct: number };
  base_weight_drift: { seen: string[]; distinct: number };
  trainer_commit_drift: { seen: string[]; distinct: number };
  hyperparam_drift: { seen: string[]; distinct: number };
  drift_detected: boolean;
}

const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export class TrainingLedgerEngine {
  private runs = new Map<string, TrainingRunRecord>();
  private orderedIds: string[] = [];

  openRun(input: TrainingRunStart): TrainingRunRecord {
    if (!input.experiment_id.trim()) throw new Error("experiment_id required");
    if (input.attempt < 1) throw new Error("attempt must be ≥1");
    if (!Number.isFinite(input.start_ts) || input.start_ts <= 0) {
      throw new Error("start_ts must be a positive epoch-ms");
    }
    if (!SHA256_REGEX.test(input.base_weight_sha256)) {
      throw new Error("base_weight_sha256 must be 64-hex");
    }
    if (!SHA256_REGEX.test(input.manifest_sha256)) {
      throw new Error("manifest_sha256 must be 64-hex");
    }
    if (!SHA256_REGEX.test(input.hyperparams_sha256)) {
      throw new Error("hyperparams_sha256 must be 64-hex");
    }
    if (!Number.isInteger(input.aug_seed) || input.aug_seed < 0) {
      throw new Error("aug_seed must be a non-negative integer");
    }
    if (!input.tokenizer_version.trim()) {
      throw new Error("tokenizer_version required");
    }
    if (!/^[a-f0-9]{7,40}$/i.test(input.trainer_commit_sha)) {
      throw new Error("trainer_commit_sha must be a git SHA (7-40 hex)");
    }
    if (!input.author.trim()) throw new Error("author required");

    const run_id = djb2Hex(
      `${input.experiment_id}|${input.attempt}|${input.start_ts}`,
    );
    if (this.runs.has(run_id)) {
      throw new Error(
        `duplicate run_id ${run_id} — experiment/attempt/start_ts collision`,
      );
    }
    // Detect accidental re-use of the same attempt number for the same
    // experiment: two opens with different start_ts but same experiment+
    // attempt is almost certainly a logic bug in the trainer.
    for (const existing of this.runs.values()) {
      if (
        existing.experiment_id === input.experiment_id &&
        existing.attempt === input.attempt &&
        existing.start_ts !== input.start_ts
      ) {
        throw new Error(
          `experiment_id=${input.experiment_id} attempt=${input.attempt} already has run ${existing.run_id}`,
        );
      }
    }

    const rec: TrainingRunRecord = {
      run_id,
      experiment_id: input.experiment_id.trim(),
      attempt: input.attempt,
      status: "open",
      start_ts: input.start_ts,
      fingerprint: {
        base_weight_sha256: input.base_weight_sha256.toLowerCase(),
        manifest_sha256: input.manifest_sha256.toLowerCase(),
        aug_seed: input.aug_seed,
        hyperparams_sha256: input.hyperparams_sha256.toLowerCase(),
        tokenizer_version: input.tokenizer_version.trim(),
        trainer_commit_sha: input.trainer_commit_sha.toLowerCase(),
      },
      author: input.author.trim(),
      notes: input.notes?.trim() || undefined,
    };
    this.runs.set(run_id, rec);
    this.orderedIds.push(run_id);
    return { ...rec, fingerprint: { ...rec.fingerprint } };
  }

  closeRun(input: TrainingRunClose): TrainingRunRecord {
    const rec = this.runs.get(input.run_id);
    if (!rec) throw new Error(`run ${input.run_id} not found`);
    if (rec.status !== "open") {
      throw new Error(`run ${input.run_id} already closed (${rec.status})`);
    }
    if (input.end_ts < rec.start_ts) {
      throw new Error("end_ts cannot precede start_ts");
    }
    if (input.elapsed_ms < 0 || input.wall_clock_ms < 0) {
      throw new Error("elapsed_ms and wall_clock_ms must be ≥0");
    }
    if (input.elapsed_ms > input.wall_clock_ms) {
      throw new Error("elapsed_ms cannot exceed wall_clock_ms");
    }
    if (input.status === "completed") {
      if (
        !input.final_weight_sha256 ||
        !SHA256_REGEX.test(input.final_weight_sha256)
      ) {
        throw new Error("completed run requires 64-hex final_weight_sha256");
      }
      if (
        !input.eval_metrics_sha256 ||
        !SHA256_REGEX.test(input.eval_metrics_sha256)
      ) {
        throw new Error("completed run requires 64-hex eval_metrics_sha256");
      }
    } else {
      // aborted / failed_validation — reason mandatory, ≥10 chars
      if (!input.reason || input.reason.trim().length < 10) {
        throw new Error(
          `status=${input.status} requires reason (≥10 chars)`,
        );
      }
    }
    rec.status = input.status;
    rec.end_ts = input.end_ts;
    rec.outcome = {
      final_weight_sha256: input.final_weight_sha256?.toLowerCase(),
      eval_metrics_sha256: input.eval_metrics_sha256?.toLowerCase(),
      elapsed_ms: input.elapsed_ms,
      wall_clock_ms: input.wall_clock_ms,
      reason: input.reason?.trim() || undefined,
    };
    return { ...rec, fingerprint: { ...rec.fingerprint }, outcome: { ...rec.outcome! } };
  }

  getRun(run_id: string): TrainingRunRecord | null {
    const rec = this.runs.get(run_id);
    if (!rec) return null;
    return {
      ...rec,
      fingerprint: { ...rec.fingerprint },
      outcome: rec.outcome ? { ...rec.outcome } : undefined,
    };
  }

  listRuns(filter?: {
    experiment_id?: string;
    status?: RunStatus;
    author?: string;
  }): TrainingRunRecord[] {
    const out: TrainingRunRecord[] = [];
    for (const id of this.orderedIds) {
      const r = this.runs.get(id);
      if (!r) continue;
      if (filter?.experiment_id && r.experiment_id !== filter.experiment_id) continue;
      if (filter?.status && r.status !== filter.status) continue;
      if (filter?.author && r.author !== filter.author) continue;
      out.push({
        ...r,
        fingerprint: { ...r.fingerprint },
        outcome: r.outcome ? { ...r.outcome } : undefined,
      });
    }
    return out;
  }

  /**
   * Detects fingerprint drift across all runs of an experiment. A
   * "clean" experiment has exactly ONE distinct value per fingerprint
   * slot — seed may vary intentionally, so callers decide whether the
   * aug_seed_drift count is OK for their ablation design.
   */
  driftReport(experiment_id: string): DriftReport {
    const runs = this.listRuns({ experiment_id });
    const manifest = new Set<string>();
    const seed = new Set<number>();
    const base = new Set<string>();
    const commit = new Set<string>();
    const hp = new Set<string>();
    for (const r of runs) {
      manifest.add(r.fingerprint.manifest_sha256);
      seed.add(r.fingerprint.aug_seed);
      base.add(r.fingerprint.base_weight_sha256);
      commit.add(r.fingerprint.trainer_commit_sha);
      hp.add(r.fingerprint.hyperparams_sha256);
    }
    const drift_detected =
      manifest.size > 1 ||
      base.size > 1 ||
      commit.size > 1 ||
      hp.size > 1;
    return {
      experiment_id,
      run_count: runs.length,
      manifest_drift: { seen: Array.from(manifest), distinct: manifest.size },
      aug_seed_drift: { seen: Array.from(seed).sort((a, b) => a - b), distinct: seed.size },
      base_weight_drift: { seen: Array.from(base), distinct: base.size },
      trainer_commit_drift: { seen: Array.from(commit), distinct: commit.size },
      hyperparam_drift: { seen: Array.from(hp), distinct: hp.size },
      drift_detected,
    };
  }

  /**
   * JSON-serializable snapshot for persistence to
   * WEDM_TRAINING_LEDGER.json / LATHE_TRAINING_LEDGER.json. Includes
   * schemaVersion per PRISM schema-versioning rules.
   */
  toSnapshot(): { schemaVersion: 1; runs: TrainingRunRecord[] } {
    return {
      schemaVersion: 1,
      runs: this.listRuns(),
    };
  }

  /** Load a previously persisted snapshot. Rejects schema mismatches. */
  loadSnapshot(snap: { schemaVersion: number; runs: TrainingRunRecord[] }): number {
    if (snap.schemaVersion !== 1) {
      throw new Error(
        `unsupported schemaVersion ${snap.schemaVersion} (engine supports 1)`,
      );
    }
    this.clearAll();
    for (const r of snap.runs) {
      if (this.runs.has(r.run_id)) {
        throw new Error(`snapshot has duplicate run_id ${r.run_id}`);
      }
      this.runs.set(r.run_id, {
        ...r,
        fingerprint: { ...r.fingerprint },
        outcome: r.outcome ? { ...r.outcome } : undefined,
      });
      this.orderedIds.push(r.run_id);
    }
    return this.runs.size;
  }

  getStats(): {
    total_runs: number;
    by_status: Record<RunStatus, number>;
    experiments: number;
    average_elapsed_ms: number | null;
  } {
    const by_status: Record<RunStatus, number> = {
      open: 0,
      completed: 0,
      aborted: 0,
      failed_validation: 0,
    };
    const exps = new Set<string>();
    let sum = 0;
    let cnt = 0;
    for (const r of this.runs.values()) {
      by_status[r.status] += 1;
      exps.add(r.experiment_id);
      if (r.outcome?.elapsed_ms !== undefined) {
        sum += r.outcome.elapsed_ms;
        cnt += 1;
      }
    }
    return {
      total_runs: this.runs.size,
      by_status,
      experiments: exps.size,
      average_elapsed_ms: cnt === 0 ? null : sum / cnt,
    };
  }

  clearAll(): void {
    this.runs.clear();
    this.orderedIds.length = 0;
  }
}

function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  let h2 = 0;
  for (let i = 0; i < s.length; i++) {
    h2 = ((h2 << 7) - h2 + s.charCodeAt(i) * 31) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export const trainingLedgerEngine = new TrainingLedgerEngine();
