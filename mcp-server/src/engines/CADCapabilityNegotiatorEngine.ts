/**
 * CADCapabilityNegotiatorEngine — CAD-COMPLETE-MS0 / U-CADC-AI03
 *
 * Resolves a CAD operation intent against the live CADAdapterRegistry and
 * decides which adapter can satisfy it. Returns a NegotiationResult that
 * either names the adapter to use (and what ops, if any, it cannot cover)
 * or throws UnsupportedCapabilityError when no policy-compatible adapter
 * is available.
 *
 * Acceptance (envelope):
 *   "Intent referencing unsupported op either degrades gracefully
 *    (configurable) or throws UnsupportedCapabilityError with named op."
 *
 * Design:
 *   - Pure read of CADAdapterRegistry — never mutates registry state.
 *   - Awaits adapter capability matrices lazily (the registry returns
 *     adapter singletons via dynamic import; we cache the capability
 *     snapshot per call so repeated lookups across a single negotiate()
 *     don't re-instantiate).
 *   - Three policies:
 *       "strict"   — only the preferred adapter; throws if it cannot
 *                    cover every requested op.
 *       "fallback" — try preferred first; if it cannot cover, pick the
 *                    next registered adapter that DOES cover every op.
 *       "best_fit" — pick the adapter with the most supported ops
 *                    (tiebreak by lower typicalLatencyMs, then by
 *                    cadSystem name asc for deterministic ordering).
 *   - excludeSystems is honoured by every policy (always a blocklist).
 *   - requireSubprocessOk=false rules out adapters whose
 *     CADCapabilityMatrix declares requiresSubprocess=true.
 *
 * Cardinality:
 *   - negotiate() runs N getCapabilities() calls (N = number of registered
 *     adapters) — bounded by the size of CADAdapterRegistry. With 4
 *     adapters registered today, that is 4 lazy imports per call. Callers
 *     that need to negotiate many intents can cache the registry through
 *     listGaps() once and re-derive locally.
 *
 * Errors:
 *   - UnknownCADSystemError (re-thrown from registry) when a preferred
 *     or excluded system is not registered.
 *   - UnsupportedCapabilityError when no policy-compatible adapter
 *     covers the requested ops.
 *
 * @engine CADCapabilityNegotiatorEngine
 * @milestone CAD-COMPLETE-MS0 / U-CADC-AI03 (renamed from U-CCCO03)
 * @module engines/CADCapabilityNegotiatorEngine
 */

import {
  CAD_REGISTERED_SYSTEMS,
  UnknownCADSystemError,
  getCADAdapter,
  isCADSystemRegistered,
} from "./CADAdapterRegistry.js";
import type {
  CADCapabilityMatrix,
  CADOperationKind,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const NEGOTIATION_POLICIES = ["strict", "fallback", "best_fit"] as const;
export type NegotiationPolicy = (typeof NEGOTIATION_POLICIES)[number];

export const DEFAULT_NEGOTIATION_POLICY: NegotiationPolicy = "fallback";

// ============================================================================
// TYPES
// ============================================================================

export interface NegotiationIntent {
  /** Ordered op kinds the caller wants to emit. Duplicates collapse. */
  ops: ReadonlyArray<CADOperationKind>;
  /** Optional preferred adapter — picked first when policy allows. */
  preferredSystem?: CADSystemId;
  /** Policy for handling unsupported ops on the preferred adapter. */
  policy?: NegotiationPolicy;
  /** Blocklist of adapters that should never be considered. */
  excludeSystems?: ReadonlyArray<CADSystemId>;
  /**
   * When false (default), adapters that declare `requiresSubprocess=true`
   * are still allowed (subprocess execution is the norm for CadQuery /
   * Fusion / Inventor). Set to true ONLY when the caller cannot pay
   * subprocess cost (e.g. in-band test environments).
   */
  excludeSubprocess?: boolean;
}

export interface AdapterCandidate {
  cadSystem: CADSystemId;
  /** Ops the caller needs but this adapter cannot emit. Empty = full match. */
  missingOps: ReadonlyArray<CADOperationKind>;
  /** Ops the caller needs that this adapter does support. */
  supportedOps: ReadonlyArray<CADOperationKind>;
  /** Snapshot copy of the adapter's capability matrix. */
  capabilities: CADCapabilityMatrix;
}

export interface NegotiationResult {
  /** The adapter the caller should use. */
  cadSystem: CADSystemId;
  /** True when missingOps is empty — adapter covers every requested op. */
  supported: boolean;
  /** Ops the chosen adapter cannot cover. Always empty on supported=true. */
  missingOps: ReadonlyArray<CADOperationKind>;
  /** True when the preferred adapter was rejected and an alternative was picked. */
  fallbackUsed: boolean;
  /**
   * Ranked list of other candidates (excluding the chosen one). Sorted by
   * fewest-missing-ops asc, then typicalLatencyMs asc, then cadSystem asc.
   */
  alternatives: ReadonlyArray<AdapterCandidate>;
  /** Effective policy used (preserves caller intent for telemetry). */
  policy: NegotiationPolicy;
  /** Human-readable explanation suitable for logs / operator surfaces. */
  reason: string;
}

export class UnsupportedCapabilityError extends Error {
  readonly code = "UNSUPPORTED_CAPABILITY";
  readonly requestedOps: ReadonlyArray<CADOperationKind>;
  readonly missingOps: ReadonlyArray<CADOperationKind>;
  readonly attemptedSystems: ReadonlyArray<CADSystemId>;
  readonly policy: NegotiationPolicy;
  constructor(args: {
    requestedOps: ReadonlyArray<CADOperationKind>;
    missingOps: ReadonlyArray<CADOperationKind>;
    attemptedSystems: ReadonlyArray<CADSystemId>;
    policy: NegotiationPolicy;
    message: string;
  }) {
    super(args.message);
    this.name = "UnsupportedCapabilityError";
    this.requestedOps = args.requestedOps;
    this.missingOps = args.missingOps;
    this.attemptedSystems = args.attemptedSystems;
    this.policy = args.policy;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class CADCapabilityNegotiatorEngine {
  /**
   * Resolve an intent against registered CAD adapters. Returns a
   * NegotiationResult — may have supported=false when policy="strict"
   * and the preferred adapter cannot cover every op AND the caller
   * uses negotiate() rather than negotiateOrThrow().
   *
   * @param intent — caller's op stream + preferences
   * @returns NegotiationResult (always — strict-failure paths throw via
   *          negotiateOrThrow; negotiate() returns supported=false instead).
   * @throws UnknownCADSystemError if preferredSystem is set but not registered.
   * @throws UnsupportedCapabilityError when EVERY candidate is rejected by
   *         the active policy (e.g. all adapters miss at least one op AND
   *         the caller is not in fallback/best_fit mode).
   */
  async negotiate(intent: NegotiationIntent): Promise<NegotiationResult> {
    this.validateIntent(intent);
    const policy = intent.policy ?? DEFAULT_NEGOTIATION_POLICY;
    const requestedOps = uniqueOps(intent.ops);

    // Empty intent — every adapter trivially supports it. Pick preferred
    // when given; otherwise the first registered adapter (deterministic
    // alphabetical order on the registry).
    if (requestedOps.length === 0) {
      const chosen =
        intent.preferredSystem !== undefined
          ? intent.preferredSystem
          : CAD_REGISTERED_SYSTEMS[0];
      if (chosen === undefined) {
        throw new UnsupportedCapabilityError({
          requestedOps,
          missingOps: [],
          attemptedSystems: [],
          policy,
          message:
            "CADCapabilityNegotiator: no CAD adapters are registered — cannot negotiate empty intent.",
        });
      }
      if (!isCADSystemRegistered(chosen)) {
        // Re-throws as UnknownCADSystemError via registry getter for symmetry.
        await getCADAdapter(chosen);
      }
      return {
        cadSystem: chosen,
        supported: true,
        missingOps: [],
        fallbackUsed: false,
        alternatives: [],
        policy,
        reason: `Empty intent — every registered adapter trivially supports it; picked ${chosen}.`,
      };
    }

    // Pre-validate exclude list — registry will throw on unknown ids.
    for (const excluded of intent.excludeSystems ?? []) {
      if (!isCADSystemRegistered(excluded)) {
        await getCADAdapter(excluded);
      }
    }

    // Pre-validate preferred (registry throws on unknown id).
    if (intent.preferredSystem !== undefined) {
      await getCADAdapter(intent.preferredSystem);
    }

    // Score every candidate that survives the exclude filter. Adapters
    // whose lazy import returns undefined OR whose getCapabilities() throws
    // are treated as unavailable (skipped silently) — the registry has had
    // half-shipped exports in past rounds; the negotiator must not crash
    // when one adapter is broken.
    const excludeSet = new Set<CADSystemId>(intent.excludeSystems ?? []);
    const candidates: AdapterCandidate[] = [];
    for (const cadSystem of CAD_REGISTERED_SYSTEMS) {
      if (excludeSet.has(cadSystem)) continue;
      const caps = await tryGetCapabilities(cadSystem);
      if (!caps) continue;
      if (intent.excludeSubprocess === true && caps.requiresSubprocess) continue;
      const missing: CADOperationKind[] = [];
      const supported: CADOperationKind[] = [];
      for (const op of requestedOps) {
        if (caps.supportedOps.has(op)) supported.push(op);
        else missing.push(op);
      }
      candidates.push({
        cadSystem,
        missingOps: missing,
        supportedOps: supported,
        capabilities: caps,
      });
    }

    if (candidates.length === 0) {
      throw new UnsupportedCapabilityError({
        requestedOps,
        missingOps: requestedOps,
        attemptedSystems: [],
        policy,
        message: `CADCapabilityNegotiator: no adapters remained after exclude/subprocess filters (excluded=${[
          ...excludeSet,
        ].join(", ") || "none"}).`,
      });
    }

    // Rank: fewest missing ops first, then lower typicalLatencyMs, then
    // cadSystem name asc (deterministic tiebreaker).
    candidates.sort(rankCandidates);

    // Apply policy.
    let chosen: AdapterCandidate;
    let fallbackUsed = false;
    let reason: string;

    if (intent.preferredSystem !== undefined && !excludeSet.has(intent.preferredSystem)) {
      const preferredCandidate = candidates.find(
        (c) => c.cadSystem === intent.preferredSystem,
      );

      if (policy === "strict") {
        if (preferredCandidate === undefined) {
          throw new UnsupportedCapabilityError({
            requestedOps,
            missingOps: requestedOps,
            attemptedSystems: [intent.preferredSystem],
            policy,
            message: `CADCapabilityNegotiator (strict): preferred adapter "${intent.preferredSystem}" was excluded from the candidate pool (likely by excludeSubprocess filter).`,
          });
        }
        if (preferredCandidate.missingOps.length > 0) {
          throw new UnsupportedCapabilityError({
            requestedOps,
            missingOps: preferredCandidate.missingOps,
            attemptedSystems: [intent.preferredSystem],
            policy,
            message: `CADCapabilityNegotiator (strict): preferred adapter "${intent.preferredSystem}" cannot emit op(s) [${preferredCandidate.missingOps.join(", ")}].`,
          });
        }
        chosen = preferredCandidate;
        reason = `Strict policy: preferred adapter "${intent.preferredSystem}" supports every requested op.`;
      } else if (policy === "fallback") {
        if (preferredCandidate && preferredCandidate.missingOps.length === 0) {
          chosen = preferredCandidate;
          reason = `Fallback policy: preferred adapter "${intent.preferredSystem}" supports every requested op — no fallback needed.`;
        } else {
          // Find the first candidate (by rank) that fully covers the intent.
          const fullCover = candidates.find((c) => c.missingOps.length === 0);
          if (!fullCover) {
            throw new UnsupportedCapabilityError({
              requestedOps,
              missingOps: candidates[0].missingOps,
              attemptedSystems: candidates.map((c) => c.cadSystem),
              policy,
              message: `CADCapabilityNegotiator (fallback): no registered adapter fully covers the requested op(s). Best partial match: "${candidates[0].cadSystem}" missing [${candidates[0].missingOps.join(", ")}].`,
            });
          }
          chosen = fullCover;
          fallbackUsed = true;
          reason = preferredCandidate
            ? `Fallback policy: preferred "${intent.preferredSystem}" missing [${preferredCandidate.missingOps.join(", ")}]; fell back to "${chosen.cadSystem}" which covers every requested op.`
            : `Fallback policy: preferred "${intent.preferredSystem}" was filtered out of the candidate pool; selected "${chosen.cadSystem}".`;
        }
      } else {
        // best_fit — pick highest-coverage adapter ignoring preference except
        // as a tiebreaker.
        const fullCover = candidates.find((c) => c.missingOps.length === 0);
        const target = fullCover ?? candidates[0];
        chosen = target;
        fallbackUsed =
          intent.preferredSystem !== undefined &&
          chosen.cadSystem !== intent.preferredSystem;
        if (chosen.missingOps.length === 0) {
          reason = fallbackUsed
            ? `Best-fit policy: "${chosen.cadSystem}" covers every op with better rank than preferred "${intent.preferredSystem}".`
            : `Best-fit policy: preferred "${chosen.cadSystem}" also ranks best by coverage + latency.`;
        } else {
          throw new UnsupportedCapabilityError({
            requestedOps,
            missingOps: chosen.missingOps,
            attemptedSystems: candidates.map((c) => c.cadSystem),
            policy,
            message: `CADCapabilityNegotiator (best_fit): no registered adapter fully covers the requested op(s). Best partial match: "${chosen.cadSystem}" missing [${chosen.missingOps.join(", ")}].`,
          });
        }
      }
    } else {
      // No preference — strict + fallback both reduce to "first adapter that
      // fully covers"; best_fit picks by rank.
      const fullCover = candidates.find((c) => c.missingOps.length === 0);
      if (!fullCover) {
        throw new UnsupportedCapabilityError({
          requestedOps,
          missingOps: candidates[0].missingOps,
          attemptedSystems: candidates.map((c) => c.cadSystem),
          policy,
          message: `CADCapabilityNegotiator (${policy}): no registered adapter fully covers the requested op(s). Best partial match: "${candidates[0].cadSystem}" missing [${candidates[0].missingOps.join(", ")}].`,
        });
      }
      chosen = fullCover;
      reason = `${policy.charAt(0).toUpperCase() + policy.slice(1)} policy with no preference: selected "${chosen.cadSystem}" — first adapter (by rank) that covers every requested op.`;
    }

    const alternatives = candidates.filter((c) => c.cadSystem !== chosen.cadSystem);

    return {
      cadSystem: chosen.cadSystem,
      supported: chosen.missingOps.length === 0,
      missingOps: chosen.missingOps,
      fallbackUsed,
      alternatives,
      policy,
      reason,
    };
  }

  /**
   * Same as negotiate() but throws UnsupportedCapabilityError whenever the
   * chosen adapter cannot cover every requested op (i.e. supported=false).
   *
   * Use this when the caller has no fallback path and would rather fail
   * fast than receive a partial-coverage result.
   */
  async negotiateOrThrow(intent: NegotiationIntent): Promise<NegotiationResult> {
    const result = await this.negotiate(intent);
    if (!result.supported) {
      throw new UnsupportedCapabilityError({
        requestedOps: uniqueOps(intent.ops),
        missingOps: result.missingOps,
        attemptedSystems: [result.cadSystem, ...result.alternatives.map((a) => a.cadSystem)],
        policy: result.policy,
        message: `CADCapabilityNegotiator.negotiateOrThrow: chosen adapter "${result.cadSystem}" missing op(s) [${result.missingOps.join(", ")}].`,
      });
    }
    return result;
  }

  /**
   * Diagnostic: for every registered adapter, return the set of ops the
   * adapter cannot emit FROM A REFERENCE LIST. When `referenceOps` is
   * undefined, returns the full CADCapabilityMatrix per adapter (used by
   * audit dashboards).
   *
   * @param referenceOps — optional op-kind list to evaluate against
   * @returns per-adapter capability snapshot
   */
  async listGaps(
    referenceOps?: ReadonlyArray<CADOperationKind>,
  ): Promise<ReadonlyArray<AdapterCandidate>> {
    const reference =
      referenceOps !== undefined && referenceOps.length > 0
        ? uniqueOps(referenceOps)
        : undefined;
    const out: AdapterCandidate[] = [];
    for (const cadSystem of CAD_REGISTERED_SYSTEMS) {
      const caps = await tryGetCapabilities(cadSystem);
      if (!caps) continue;
      if (reference) {
        const missing: CADOperationKind[] = [];
        const supported: CADOperationKind[] = [];
        for (const op of reference) {
          if (caps.supportedOps.has(op)) supported.push(op);
          else missing.push(op);
        }
        out.push({ cadSystem, missingOps: missing, supportedOps: supported, capabilities: caps });
      } else {
        out.push({
          cadSystem,
          missingOps: [],
          supportedOps: Array.from(caps.supportedOps),
          capabilities: caps,
        });
      }
    }
    return out.sort((a, b) => a.cadSystem.localeCompare(b.cadSystem));
  }

  // ── private ────────────────────────────────────────────────────────────

  private validateIntent(intent: NegotiationIntent): void {
    if (!intent || typeof intent !== "object") {
      throw new Error("CADCapabilityNegotiator.negotiate: intent object required");
    }
    if (!Array.isArray(intent.ops)) {
      throw new Error("CADCapabilityNegotiator.negotiate: intent.ops must be an array");
    }
    if (intent.policy !== undefined && !NEGOTIATION_POLICIES.includes(intent.policy)) {
      throw new Error(
        `CADCapabilityNegotiator.negotiate: policy must be one of [${NEGOTIATION_POLICIES.join(", ")}], got "${String(intent.policy)}"`,
      );
    }
  }
}

/** Process-wide singleton. */
export const cadCapabilityNegotiatorEngine = new CADCapabilityNegotiatorEngine();

// ============================================================================
// HELPERS
// ============================================================================

function uniqueOps(
  ops: ReadonlyArray<CADOperationKind>,
): ReadonlyArray<CADOperationKind> {
  const seen = new Set<CADOperationKind>();
  const out: CADOperationKind[] = [];
  for (const op of ops) {
    if (!seen.has(op)) {
      seen.add(op);
      out.push(op);
    }
  }
  return out;
}

/**
 * Candidate ranking: fewer missing ops > lower typical latency > earlier
 * alphabetical cadSystem name.
 */
function rankCandidates(a: AdapterCandidate, b: AdapterCandidate): number {
  if (a.missingOps.length !== b.missingOps.length) {
    return a.missingOps.length - b.missingOps.length;
  }
  const aLatency = a.capabilities.typicalLatencyMs ?? Number.POSITIVE_INFINITY;
  const bLatency = b.capabilities.typicalLatencyMs ?? Number.POSITIVE_INFINITY;
  if (aLatency !== bLatency) return aLatency - bLatency;
  return a.cadSystem.localeCompare(b.cadSystem);
}

/**
 * Defensive capability lookup. Returns the adapter's capability matrix when
 * the registry can produce one; returns undefined when the adapter is
 * broken (lazy import returns undefined, throws, or the adapter does not
 * implement getCapabilities). Callers treat undefined as "adapter
 * unavailable" — same effective behaviour as if it weren't registered.
 *
 * This guards against half-shipped registry entries (e.g. a CAD module
 * whose adapter export name doesn't match what the registry imports).
 */
async function tryGetCapabilities(
  cadSystem: CADSystemId,
): Promise<CADCapabilityMatrix | undefined> {
  try {
    const adapter = await getCADAdapter(cadSystem);
    if (!adapter || typeof adapter.getCapabilities !== "function") return undefined;
    return adapter.getCapabilities();
  } catch {
    return undefined;
  }
}

// Re-export the registry's existing error so callers only need to import
// from one module.
export { UnknownCADSystemError };
