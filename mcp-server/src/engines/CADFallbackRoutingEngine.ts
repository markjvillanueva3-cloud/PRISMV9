/**
 * CADFallbackRoutingEngine — CAD-COMPLETE-MS0 / U-AI-01
 * ======================================================
 *
 * Routes a CAD operation to a CAD application: when the preferred app is
 * unavailable (its circuit breaker is OPEN — see CADAppCircuitBreakerEngine —
 * or it is disabled / lacks the needed capability) the router picks the
 * next-best AVAILABLE, CAPABLE app by priority.
 *
 * The engine is decoupled from the circuit breaker: the caller passes the
 * set of currently-unavailable app ids (typically derived from a breaker
 * snapshot), so the router stays pure and deterministically testable.
 *
 * @module engines/CADFallbackRoutingEngine
 * @version 1.0.0
 */

/** A CAD application the router may select. */
export interface CADAppProfile {
  appId: string;
  /** Higher priority wins when several apps can serve a request. */
  priority: number;
  /** Capability tags the app supports, e.g. ["extrude", "assembly", "sheet_metal"]. */
  capabilities: string[];
  /** Disabled apps are never selected (default: enabled). */
  enabled?: boolean;
}

/** A routing request. */
export interface RouteRequest {
  /** Capability the caller needs. Omitted → any app qualifies on capability. */
  capability?: string;
  /** The app the caller would prefer to use. */
  preferredApp?: string;
  /** App ids currently unavailable (circuit-broken / offline / excluded). */
  unavailable?: string[];
}

/** One candidate considered during routing. */
export interface RouteCandidate {
  appId: string;
  priority: number;
  available: boolean;
  capable: boolean;
  eligible: boolean;
}

/** Outcome of a routing decision. */
export interface RouteDecision {
  ok: boolean;
  selectedApp: string | null;
  routeType: "preferred" | "fallback" | "none";
  reason: string;
  /** Every candidate considered, ranked by priority (desc). */
  candidates: RouteCandidate[];
  reasoning: string[];
}

export class CADFallbackRoutingEngine {
  /** Registered apps, keyed by appId. Insertion order is the priority tie-breaker. */
  private readonly registry = new Map<string, CADAppProfile>();

  /** Register (or replace) one CAD app. */
  register(profile: CADAppProfile): void {
    const id = String(profile?.appId ?? "").trim();
    if (id.length === 0) throw new Error("CADFallbackRoutingEngine.register: appId must be non-empty");
    this.registry.set(id, {
      appId: id,
      priority: Number.isFinite(profile.priority) ? profile.priority : 0,
      capabilities: Array.isArray(profile.capabilities) ? [...profile.capabilities] : [],
      enabled: profile.enabled !== false,
    });
  }

  /** Register several apps at once. */
  registerMany(profiles: CADAppProfile[]): void {
    for (const p of profiles) this.register(p);
  }

  /** Remove one app from the registry. */
  unregister(appId: string): boolean {
    return this.registry.delete(String(appId ?? "").trim());
  }

  /** All registered apps, ranked by priority (desc). */
  listApps(): CADAppProfile[] {
    return this.rankByPriority([...this.registry.values()]);
  }

  /** Clear the registry. */
  reset(): void {
    this.registry.clear();
  }

  /**
   * Route a request to the best app. `apps` overrides the registry when
   * supplied (stateless mode); otherwise the registered apps are used.
   */
  route(request: RouteRequest, apps?: CADAppProfile[]): RouteDecision {
    const pool = this.rankByPriority(apps ? apps.map((a) => this.normalize(a)) : [...this.registry.values()]);
    const unavailable = new Set((request.unavailable ?? []).map((a) => String(a)));
    const capability = request.capability ? String(request.capability) : null;
    const preferred = request.preferredApp ? String(request.preferredApp) : null;
    const reasoning: string[] = [];

    if (pool.length === 0) {
      return this.noRoute(
        "No CAD apps are registered — register at least one app or pass apps inline.",
        [],
        reasoning,
      );
    }

    const candidates: RouteCandidate[] = pool.map((app) => {
      const enabled = app.enabled !== false;
      const available = enabled && !unavailable.has(app.appId);
      const capable = capability === null || app.capabilities.includes(capability);
      return { appId: app.appId, priority: app.priority, available, capable, eligible: available && capable };
    });

    const eligible = candidates.filter((c) => c.eligible);
    if (eligible.length === 0) {
      const capMsg = capability ? ` capable of "${capability}"` : "";
      reasoning.push(`No registered CAD app is both available and${capMsg || " usable"}.`);
      return this.noRoute(
        `No available CAD app${capMsg} — every candidate is circuit-broken, disabled, or lacks the capability.`,
        candidates,
        reasoning,
      );
    }

    // 1. Preferred app, if it is itself eligible.
    if (preferred) {
      const pref = eligible.find((c) => c.appId === preferred);
      if (pref) {
        reasoning.push(`Preferred app "${preferred}" is available and capable → routed directly.`);
        return {
          ok: true,
          selectedApp: preferred,
          routeType: "preferred",
          reason: `Preferred CAD app "${preferred}" selected.`,
          candidates,
          reasoning,
        };
      }
      const why = !candidates.some((c) => c.appId === preferred)
        ? "is not registered"
        : unavailable.has(preferred)
          ? "is unavailable (circuit-broken / offline)"
          : "is disabled or lacks the required capability";
      reasoning.push(`Preferred app "${preferred}" ${why} → falling back to next-best.`);
    } else {
      reasoning.push("No preferred app named → selecting the highest-priority eligible app.");
    }

    // 2. Highest-priority eligible app (pool already ranked).
    const pick = eligible[0];
    reasoning.push(
      `Fallback: "${pick.appId}" is the highest-priority eligible app (priority ${pick.priority}).`,
    );
    return {
      ok: true,
      selectedApp: pick.appId,
      routeType: "fallback",
      reason: preferred
        ? `Preferred app unavailable — rerouted to next-best "${pick.appId}".`
        : `Selected highest-priority eligible app "${pick.appId}".`,
      candidates,
      reasoning,
    };
  }

  // --- internal ---

  private normalize(a: CADAppProfile): CADAppProfile {
    return {
      appId: String(a.appId ?? "").trim(),
      priority: Number.isFinite(a.priority) ? a.priority : 0,
      capabilities: Array.isArray(a.capabilities) ? [...a.capabilities] : [],
      enabled: a.enabled !== false,
    };
  }

  /** Sort by priority desc; ties keep their original (insertion) order — stable. */
  private rankByPriority(apps: CADAppProfile[]): CADAppProfile[] {
    return apps
      .map((app, idx) => ({ app, idx }))
      .sort((x, y) => y.app.priority - x.app.priority || x.idx - y.idx)
      .map((w) => w.app);
  }

  private noRoute(reason: string, candidates: RouteCandidate[], reasoning: string[]): RouteDecision {
    return { ok: false, selectedApp: null, routeType: "none", reason, candidates, reasoning };
  }
}

export const cadFallbackRoutingEngine = new CADFallbackRoutingEngine();
