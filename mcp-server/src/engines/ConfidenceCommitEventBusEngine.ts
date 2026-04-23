/**
 * ConfidenceCommitEventBusEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL12
 * =================================================================
 *
 * Event bus for orchestrator confidence-commit events. CAMAGIMaster
 * (or any router) publishes a `confidence_commit` event after every
 * routing decision:
 *
 *   { decisionId, reasoningMode, chosenCam, confidence, timestamp,
 *     outcomePlaceholder: null }
 *
 * Subscribers (e.g. OutcomeAccumulatorEngine) register via `subscribe`
 * and receive events synchronously. When the actual outcome is later
 * observed, callers invoke `attachOutcome(decisionId, outcome)` and all
 * subscribers are re-notified with the resolved pair.
 *
 * Schema is versioned. Event bus is in-memory + per-process — callers
 * persist externally if needed.
 *
 * @module engines/ConfidenceCommitEventBusEngine
 * @version 1.0.0
 */

export const CONFIDENCE_EVENT_SCHEMA_VERSION = 1;

export type ReasoningMode =
  | "chain_of_thought"
  | "tree_of_thought"
  | "multi_path"
  | "backtracking"
  | "abductive"
  | "deductive"
  | "inductive"
  | "analogical";

export type CAMSystem =
  | "hypermill"
  | "mastercam"
  | "fusion360"
  | "inventorcam"
  | "solidcam"
  | "nx"
  | "catia"
  | "powermill"
  | "featurecam";

export interface ConfidenceCommitEvent {
  schemaVersion: number;
  decisionId: string;
  reasoningMode: ReasoningMode;
  chosenCam: CAMSystem;
  confidence: number;
  timestamp: string;
  featureClass?: string;
  materialClass?: string;
  machineClass?: string;
  outcomePlaceholder: null;
}

export interface OutcomeObservation {
  decisionId: string;
  observedAt: string;
  /** Did the chosen CAM's prediction match reality? (0-1 agreement.) */
  agreement: number;
  /** Cycle-time delta (predicted - actual), seconds. */
  cycleTimeDeltaS?: number;
  /** Ra delta (predicted - actual), μm. */
  raDeltaUm?: number;
  /** Any explicit failure flags (pierce-fail, wire-break, burn, ...). */
  failureFlags?: string[];
}

export interface ResolvedCommitEvent {
  event: ConfidenceCommitEvent;
  outcome: OutcomeObservation;
}

export type CommitSubscriber = (ev: ConfidenceCommitEvent) => void;
export type ResolvedSubscriber = (ev: ResolvedCommitEvent) => void;

const REASONING_MODES: ReadonlySet<ReasoningMode> = new Set([
  "chain_of_thought",
  "tree_of_thought",
  "multi_path",
  "backtracking",
  "abductive",
  "deductive",
  "inductive",
  "analogical",
]);

const CAM_SYSTEMS: ReadonlySet<CAMSystem> = new Set([
  "hypermill", "mastercam", "fusion360", "inventorcam", "solidcam",
  "nx", "catia", "powermill", "featurecam",
]);

class ConfidenceCommitEventBusEngineImpl {
  private pending = new Map<string, ConfidenceCommitEvent>();
  private resolved: ResolvedCommitEvent[] = [];
  private commitSubs: CommitSubscriber[] = [];
  private resolvedSubs: ResolvedSubscriber[] = [];

  /** Publish a confidence-commit event. */
  commit(args: {
    decisionId: string;
    reasoningMode: ReasoningMode;
    chosenCam: CAMSystem;
    confidence: number;
    timestamp: string;
    featureClass?: string;
    materialClass?: string;
    machineClass?: string;
  }): ConfidenceCommitEvent {
    if (!args.decisionId) throw new Error("decisionId required");
    if (!REASONING_MODES.has(args.reasoningMode)) {
      throw new Error(`invalid reasoningMode: ${args.reasoningMode}`);
    }
    if (!CAM_SYSTEMS.has(args.chosenCam)) {
      throw new Error(`invalid chosenCam: ${args.chosenCam}`);
    }
    if (!Number.isFinite(args.confidence) || args.confidence < 0 || args.confidence > 1) {
      throw new Error(`confidence must be 0..1 (got ${args.confidence})`);
    }
    if (this.pending.has(args.decisionId)) {
      throw new Error(`duplicate decisionId: ${args.decisionId}`);
    }
    const event: ConfidenceCommitEvent = {
      schemaVersion: CONFIDENCE_EVENT_SCHEMA_VERSION,
      decisionId: args.decisionId,
      reasoningMode: args.reasoningMode,
      chosenCam: args.chosenCam,
      confidence: args.confidence,
      timestamp: args.timestamp,
      featureClass: args.featureClass,
      materialClass: args.materialClass,
      machineClass: args.machineClass,
      outcomePlaceholder: null,
    };
    this.pending.set(event.decisionId, event);
    for (const sub of this.commitSubs) {
      try { sub(event); } catch { /* subscriber errors don't abort publication */ }
    }
    return { ...event };
  }

  /**
   * Attach an observed outcome to a pending commit. Dispatches to all
   * resolved-event subscribers. Throws if decision isn't pending.
   */
  attachOutcome(outcome: OutcomeObservation): ResolvedCommitEvent {
    const ev = this.pending.get(outcome.decisionId);
    if (!ev) throw new Error(`no pending decision ${outcome.decisionId}`);
    if (!Number.isFinite(outcome.agreement) || outcome.agreement < 0 || outcome.agreement > 1) {
      throw new Error(`agreement must be 0..1 (got ${outcome.agreement})`);
    }
    this.pending.delete(outcome.decisionId);
    const resolved: ResolvedCommitEvent = { event: ev, outcome };
    this.resolved.push(resolved);
    for (const sub of this.resolvedSubs) {
      try { sub(resolved); } catch { /* isolate subscriber failures */ }
    }
    return { event: { ...ev }, outcome: { ...outcome } };
  }

  subscribe(kind: "commit", fn: CommitSubscriber): () => void;
  subscribe(kind: "resolved", fn: ResolvedSubscriber): () => void;
  subscribe(kind: "commit" | "resolved", fn: CommitSubscriber | ResolvedSubscriber): () => void {
    if (kind === "commit") {
      const typed = fn as CommitSubscriber;
      this.commitSubs.push(typed);
      return () => {
        this.commitSubs = this.commitSubs.filter((s) => s !== typed);
      };
    }
    const typed = fn as ResolvedSubscriber;
    this.resolvedSubs.push(typed);
    return () => {
      this.resolvedSubs = this.resolvedSubs.filter((s) => s !== typed);
    };
  }

  pendingCount(): number {
    return this.pending.size;
  }

  resolvedCount(): number {
    return this.resolved.length;
  }

  listResolved(): ResolvedCommitEvent[] {
    return this.resolved.map((r) => ({ event: { ...r.event }, outcome: { ...r.outcome } }));
  }

  reset(): void {
    this.pending.clear();
    this.resolved = [];
    this.commitSubs = [];
    this.resolvedSubs = [];
  }

  supportedCAMs(): CAMSystem[] {
    return Array.from(CAM_SYSTEMS) as CAMSystem[];
  }

  supportedReasoningModes(): ReasoningMode[] {
    return Array.from(REASONING_MODES) as ReasoningMode[];
  }
}

export const confidenceCommitEventBusEngine = new ConfidenceCommitEventBusEngineImpl();
export type ConfidenceCommitEventBusEngine = typeof confidenceCommitEventBusEngine;
