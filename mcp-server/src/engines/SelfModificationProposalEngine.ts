/**
 * SelfModificationProposalEngine — Generate architecture evolution proposals
 *
 * Phase 0.18 U-AGI10 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Analyses
 * observed code patterns (fan-in clusters, orphan engines, repeated logic)
 * and proposes refactors. Proposals only — human approval required before
 * any change is applied.
 *
 * No I/O. Callers pass in observation data; the engine classifies and
 * enumerates proposal records suitable for appending to
 * ARCH_EVOLUTION_LEDGER.jsonl.
 *
 * @module engines/SelfModificationProposalEngine
 * @milestone PP-0.18-U-AGI10
 */

export type ProposalKind =
  | "extract-abstraction"
  | "remove-orphan"
  | "split-high-fan-in"
  | "merge-duplicates"
  | "deprecate-low-usage";

export interface PatternObservation {
  kind: ProposalKind;
  targets: string[]; // files or symbols
  evidence: string;
  confidence: number; // 0..1
  estimatedEffortHours?: number;
  psiImpactEstimate?: number;
}

export interface Proposal {
  id: string;
  kind: ProposalKind;
  title: string;
  summary: string;
  targets: string[];
  evidence: string;
  confidence: number;
  estimatedEffortHours: number;
  psiImpactEstimate: number;
  score: number;
  createdAt: string;
}

export class SelfModificationProposalEngine {
  private nextId = 1;

  propose(obs: PatternObservation, at?: string): Proposal {
    this.validate(obs);
    const id = `prop-${this.nextId++}`;
    const effort = obs.estimatedEffortHours ?? this.defaultEffort(obs.kind);
    const psi = obs.psiImpactEstimate ?? 0;
    const score = this.score({ confidence: obs.confidence, effort, psi });
    return {
      id,
      kind: obs.kind,
      title: this.titleFor(obs),
      summary: this.summaryFor(obs),
      targets: [...obs.targets],
      evidence: obs.evidence,
      confidence: this.round4(obs.confidence),
      estimatedEffortHours: this.round4(effort),
      psiImpactEstimate: this.round4(psi),
      score,
      createdAt: at ?? new Date().toISOString(),
    };
  }

  proposeBatch(observations: readonly PatternObservation[], at?: string): Proposal[] {
    return observations.map((o) => this.propose(o, at));
  }

  rank(proposals: readonly Proposal[]): Proposal[] {
    return [...proposals].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
  }

  // --- internals ---------------------------------------------------------

  private validate(obs: PatternObservation): void {
    if (!obs.kind) throw new Error("kind required");
    if (!Array.isArray(obs.targets) || obs.targets.length === 0) throw new Error("targets must be non-empty");
    if (!obs.evidence || obs.evidence.trim() === "") throw new Error("evidence required");
    if (!(obs.confidence >= 0 && obs.confidence <= 1)) throw new Error("confidence in [0,1]");
    if (obs.estimatedEffortHours !== undefined && obs.estimatedEffortHours <= 0) {
      throw new Error("estimatedEffortHours must be > 0");
    }
    if (obs.psiImpactEstimate !== undefined && !Number.isFinite(obs.psiImpactEstimate)) {
      throw new Error("psiImpactEstimate must be finite");
    }
  }

  private defaultEffort(kind: ProposalKind): number {
    switch (kind) {
      case "remove-orphan":
        return 0.5;
      case "deprecate-low-usage":
        return 0.5;
      case "merge-duplicates":
        return 2;
      case "split-high-fan-in":
        return 3;
      case "extract-abstraction":
        return 4;
    }
  }

  private titleFor(obs: PatternObservation): string {
    const tgt = obs.targets.length === 1 ? obs.targets[0] : `${obs.targets[0]} (+${obs.targets.length - 1} more)`;
    switch (obs.kind) {
      case "extract-abstraction":
        return `Extract shared abstraction from ${tgt}`;
      case "remove-orphan":
        return `Remove orphaned ${tgt}`;
      case "split-high-fan-in":
        return `Split high-fan-in ${tgt}`;
      case "merge-duplicates":
        return `Merge near-duplicate targets: ${tgt}`;
      case "deprecate-low-usage":
        return `Deprecate low-usage ${tgt}`;
    }
  }

  private summaryFor(obs: PatternObservation): string {
    return `${obs.evidence} (confidence ${Math.round(obs.confidence * 100)}%)`;
  }

  private score(opts: { confidence: number; effort: number; psi: number }): number {
    const benefit = opts.psi * opts.confidence;
    return this.round4(benefit / Math.max(0.1, opts.effort));
  }

  private round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
}

export const selfModificationProposalEngine = new SelfModificationProposalEngine();
