/**
 * OutcomeFeedbackOverrideStoreEngine — outcome-bus → engine-override learning loop
 * ===============================================================================
 *
 * Closes U-BRIDGE-LEARN-CAM + U-BRIDGE-LEARN-SFC (PSN-DORMANCY-AUDIT-MS0,
 * 2026-05-22 punch list). Subscribes to the canonical outcome topic on
 * FeedbackBusEngine and accumulates per-domain parameter overrides that
 * downstream engines (CAM strategy / Speed-Feed orchestrator) can read
 * before computing.
 *
 * ─── Design ────────────────────────────────────────────────────────────────
 *
 * The audit identified two dormant "outcome-bus → engine override" links:
 *
 *   U-BRIDGE-LEARN-CAM  — CAM strategy refinement from prior outcomes
 *   U-BRIDGE-LEARN-SFC  — SFC parameter override from prior outcomes
 *
 * Rather than ship a separate subscriber for each, this engine maintains a
 * single per-domain override map keyed by (domain, key). Subscribers within
 * the bus push outcomes, the engine extracts `successfulOverrides` from
 * each, merges into the per-domain map, and exposes a synchronous `get`
 * API for the SFC / CAM engines to consult on their next compute pass.
 *
 * The store is intentionally tiny and in-process — no persistence, no
 * cross-session learning at this layer (cross-session sits in
 * `ReasoningBank` / `LearningSystem` per AGENT_DB controllers). This layer
 * is the SAME-SESSION fast-loop: an operator's last 5 minutes of measured
 * outcomes influence the next quote in this terminal.
 *
 * Outcome event shape (subset consumed by this engine):
 *   {
 *     domain:    "mill" | "lathe" | "wedm" | "cam" | "sfc" | "safety" | "quality"
 *     success:   boolean
 *     confidence?: number  // 0..1
 *     overrides?: Record<string, unknown>  // key → recommended value
 *   }
 *
 * Only events with `success === true` and `confidence >= MIN_CONFIDENCE`
 * (default 0.7) feed the store. Lower-quality outcomes are recorded in
 * `lastFilteredCount` for diagnostic visibility but do NOT mutate state.
 *
 * @module engines/OutcomeFeedbackOverrideStoreEngine
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-LEARN-CAM + U-BRIDGE-LEARN-SFC
 * @version 1.0.0
 */

/** Canonical override-relevant domain set. */
export type OverrideDomain = "mill" | "lathe" | "wedm" | "cam" | "sfc" | "safety" | "quality";

const OVERRIDE_DOMAINS: ReadonlyArray<OverrideDomain> = [
  "mill",
  "lathe",
  "wedm",
  "cam",
  "sfc",
  "safety",
  "quality",
];

/** Confidence floor — outcomes below this never mutate the store. */
const MIN_CONFIDENCE = 0.7;

/** Outcome event shape consumed by this engine. */
export interface OutcomeOverrideEvent {
  domain?: string;
  success?: boolean;
  confidence?: number;
  overrides?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Single override record kept per (domain, key). */
export interface OverrideRecord {
  value: unknown;
  confidence: number;
  recordedAt: string;
  /** Monotonic counter — newer-wins on ties, used by downstream consumers. */
  sequence: number;
}

export class OutcomeFeedbackOverrideStoreEngine {
  private static store: Map<OverrideDomain, Map<string, OverrideRecord>> = new Map();
  private static globalSequence = 0;

  /** Diagnostic — count of low-confidence / wrong-shape outcomes filtered out. */
  static lastFilteredCount = 0;

  /** Diagnostic — total outcomes ingested across all calls. */
  static totalIngested = 0;

  /**
   * Ingest one outcome event. Synchronous; safe to call inline from a
   * feedbackBus subscriber callback. Returns true if the event mutated the
   * store, false if it was filtered (wrong domain, success!==true,
   * confidence below floor, or no overrides).
   */
  static ingest(event: OutcomeOverrideEvent): boolean {
    OutcomeFeedbackOverrideStoreEngine.totalIngested += 1;

    if (!event || typeof event !== "object") {
      OutcomeFeedbackOverrideStoreEngine.lastFilteredCount += 1;
      return false;
    }

    const domain = event.domain as OverrideDomain | undefined;
    if (!domain || !OVERRIDE_DOMAINS.includes(domain)) {
      OutcomeFeedbackOverrideStoreEngine.lastFilteredCount += 1;
      return false;
    }

    if (event.success !== true) {
      OutcomeFeedbackOverrideStoreEngine.lastFilteredCount += 1;
      return false;
    }

    const confidence = typeof event.confidence === "number" ? event.confidence : 0;
    if (confidence < MIN_CONFIDENCE) {
      OutcomeFeedbackOverrideStoreEngine.lastFilteredCount += 1;
      return false;
    }

    const overrides = event.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      OutcomeFeedbackOverrideStoreEngine.lastFilteredCount += 1;
      return false;
    }

    let domainMap = OutcomeFeedbackOverrideStoreEngine.store.get(domain);
    if (!domainMap) {
      domainMap = new Map();
      OutcomeFeedbackOverrideStoreEngine.store.set(domain, domainMap);
    }

    const ts = new Date().toISOString();
    let mutated = false;
    for (const [key, value] of Object.entries(overrides)) {
      OutcomeFeedbackOverrideStoreEngine.globalSequence += 1;
      domainMap.set(key, {
        value,
        confidence,
        recordedAt: ts,
        sequence: OutcomeFeedbackOverrideStoreEngine.globalSequence,
      });
      mutated = true;
    }
    return mutated;
  }

  /** Retrieve the current override for a (domain, key) pair, or undefined. */
  static get(domain: OverrideDomain, key: string): OverrideRecord | undefined {
    return OutcomeFeedbackOverrideStoreEngine.store.get(domain)?.get(key);
  }

  /** All overrides for a domain. Returns a frozen snapshot (callers must not mutate). */
  static all(domain: OverrideDomain): ReadonlyMap<string, OverrideRecord> {
    const m = OutcomeFeedbackOverrideStoreEngine.store.get(domain);
    if (!m) return new Map();
    return new Map(m);
  }

  /** Snapshot keys for a domain (handy for diagnostics + tests). */
  static keys(domain: OverrideDomain): string[] {
    const m = OutcomeFeedbackOverrideStoreEngine.store.get(domain);
    return m ? Array.from(m.keys()) : [];
  }

  /** Clear the entire store. Used by tests + emergency reset. */
  static reset(): void {
    OutcomeFeedbackOverrideStoreEngine.store.clear();
    OutcomeFeedbackOverrideStoreEngine.globalSequence = 0;
    OutcomeFeedbackOverrideStoreEngine.lastFilteredCount = 0;
    OutcomeFeedbackOverrideStoreEngine.totalIngested = 0;
  }

  /**
   * Wire to FeedbackBusEngine — call once during engine bootstrap to attach
   * a subscriber on the canonical outcome topic. Returns the SubscriptionHandle
   * so the caller can unsubscribe in teardown / tests.
   *
   * Lazy-imports `feedbackBusEngine` to keep this engine importable in
   * contexts that don't need the live bus (tests, schema validators).
   */
  static async wireToFeedbackBus(topic = "outcome.recorded"): Promise<{ unsubscribe: () => void }> {
    const { feedbackBusEngine } = await import("./FeedbackBusEngine.js");
    return feedbackBusEngine.subscribe(topic, (event: unknown) => {
      OutcomeFeedbackOverrideStoreEngine.ingest(event as OutcomeOverrideEvent);
    });
  }
}

/** Singleton export per engine convention. */
export const outcomeFeedbackOverrideStoreEngine = OutcomeFeedbackOverrideStoreEngine;
