/**
 * OrchestratorConfidenceFeedbackEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL13
 * ========================================================================
 *
 * Closes the loop. When an outcome is observed for a confidence-commit
 * event, this engine updates CAM-system-level Bayesian priors. The next
 * routing decision from CAMAGIMaster reads these priors to improve
 * selection.
 *
 * Prior model: Beta(α, β) per (camSystem, featureClass, materialClass,
 * machineClass) cell. Success-weighted updates:
 *   α ← α + agreement
 *   β ← β + (1 - agreement)
 *
 * Posterior mean (α / (α+β)) is the updated probability the CAM system
 * will match reality for THIS cell next time.
 *
 * HYSTERESIS: to prevent oscillation, we require ≥ MIN_SAMPLES
 * observations in a cell before the posterior is "trusted". Below that,
 * we return a neutral prior (0.5).
 *
 * @module engines/OrchestratorConfidenceFeedbackEngine
 * @version 1.0.0
 */

import { confidenceCommitEventBusEngine, type CAMSystem, type ResolvedCommitEvent } from "./ConfidenceCommitEventBusEngine.js";

/** Beta-distributed prior. */
export interface BetaPrior {
  alpha: number; // successes + 1 (Laplace)
  beta: number;  // failures + 1
  samples: number; // α + β - 2 (actual observation count)
}

export interface CellKey {
  camSystem: CAMSystem;
  featureClass: string;
  materialClass: string;
  machineClass: string;
}

export interface PriorLookup extends BetaPrior {
  cell: CellKey;
  posteriorMean: number;
  trusted: boolean;
}

export interface FeedbackConfig {
  /** Min observations before posterior is trusted (hysteresis). Default 5. */
  minSamples: number;
  /** Max damping factor on update: 1.0 = full update, 0.1 = heavily damped. Default 1.0. */
  updateRate: number;
}

const DEFAULT_CONFIG: FeedbackConfig = {
  minSamples: 5,
  updateRate: 1.0,
};

function cellKey(k: CellKey): string {
  return `${k.camSystem}|${k.featureClass}|${k.materialClass}|${k.machineClass}`;
}

class OrchestratorConfidenceFeedbackEngineImpl {
  private priors = new Map<string, BetaPrior>();
  private config: FeedbackConfig = { ...DEFAULT_CONFIG };
  private unsubscribe: (() => void) | null = null;

  setConfig(patch: Partial<FeedbackConfig>): FeedbackConfig {
    const merged = { ...this.config, ...patch };
    if (merged.minSamples < 1) throw new Error("minSamples must be ≥ 1");
    if (merged.updateRate <= 0 || merged.updateRate > 1) throw new Error("updateRate must be (0, 1]");
    this.config = merged;
    return { ...this.config };
  }

  getConfig(): FeedbackConfig {
    return { ...this.config };
  }

  /**
   * Auto-subscribe to the confidence-commit bus. After this, every
   * attachOutcome() call on the bus will automatically update the
   * corresponding prior.
   */
  attachToBus(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = confidenceCommitEventBusEngine.subscribe("resolved", (ev: ResolvedCommitEvent) => {
      this.ingestResolved(ev);
    });
  }

  detachFromBus(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /** Manually ingest a resolved event (equivalent to bus subscription). */
  ingestResolved(ev: ResolvedCommitEvent): void {
    const { event, outcome } = ev;
    // Skip events missing cell dimensions — priors are per-cell.
    if (!event.featureClass || !event.materialClass || !event.machineClass) return;
    const cell: CellKey = {
      camSystem: event.chosenCam,
      featureClass: event.featureClass,
      materialClass: event.materialClass,
      machineClass: event.machineClass,
    };
    this.update(cell, outcome.agreement);
  }

  /** Update prior for a cell with an observed agreement in [0, 1]. */
  update(cell: CellKey, agreement: number): BetaPrior {
    if (!Number.isFinite(agreement) || agreement < 0 || agreement > 1) {
      throw new Error(`agreement must be 0..1 (got ${agreement})`);
    }
    const key = cellKey(cell);
    const prior = this.priors.get(key) ?? { alpha: 1, beta: 1, samples: 0 }; // Laplace(1,1)
    const rate = this.config.updateRate;
    const next: BetaPrior = {
      alpha: prior.alpha + agreement * rate,
      beta: prior.beta + (1 - agreement) * rate,
      samples: prior.samples + 1,
    };
    this.priors.set(key, next);
    return { ...next };
  }

  /** Look up the prior for a cell. Returns trusted=false if below minSamples. */
  lookup(cell: CellKey): PriorLookup {
    const key = cellKey(cell);
    const prior = this.priors.get(key) ?? { alpha: 1, beta: 1, samples: 0 };
    const total = prior.alpha + prior.beta;
    const mean = total > 0 ? prior.alpha / total : 0.5;
    return {
      ...prior,
      cell,
      posteriorMean: mean,
      trusted: prior.samples >= this.config.minSamples,
    };
  }

  /**
   * Given a cell but with multiple candidate CAM systems, rank them by
   * posterior mean. Untrusted cells get 0.5 (neutral). Ties broken by
   * alphabetical camSystem for determinism.
   */
  rankForCell(
    cell: Omit<CellKey, "camSystem">,
    candidates: CAMSystem[],
  ): Array<{ camSystem: CAMSystem; posteriorMean: number; trusted: boolean; samples: number }> {
    const ranked = candidates.map((camSystem) => {
      const l = this.lookup({ ...cell, camSystem });
      return {
        camSystem,
        posteriorMean: l.trusted ? l.posteriorMean : 0.5,
        trusted: l.trusted,
        samples: l.samples,
      };
    });
    ranked.sort((a, b) => {
      if (Math.abs(a.posteriorMean - b.posteriorMean) > 1e-6) return b.posteriorMean - a.posteriorMean;
      return a.camSystem.localeCompare(b.camSystem);
    });
    return ranked;
  }

  totalCells(): number {
    return this.priors.size;
  }

  reset(): void {
    this.priors.clear();
    this.detachFromBus();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const orchestratorConfidenceFeedbackEngine = new OrchestratorConfidenceFeedbackEngineImpl();
export type OrchestratorConfidenceFeedbackEngine = typeof orchestratorConfidenceFeedbackEngine;
