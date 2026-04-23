/**
 * WEDMAwarenessAdoptionEngine — MS-P0.5-COORD U-P0.5-COORD-01
 *
 * Coordinates the adoption of consultAwareness() across WEDM dispatchers.
 * Tracks coverage (which dispatchers/actions have been wired), enforces the
 * <50ms budget, and provides the keyword-extraction heuristic used by the
 * dispatchers themselves.
 *
 * The middleware (awarenessMiddleware.ts) already handles caching and
 * fail-open semantics. This engine is the adoption-side companion that makes
 * the wiring auditable and gates enforceable.
 */
import { log } from "../utils/Logger.js";

export interface AdoptionRecord {
  dispatcher: string;
  action: string;
  latencyMs: number;
  cached: boolean;
  ok: boolean;
  budgetBreach: boolean;
  timestamp: number;
}

export interface CoverageSummary {
  totalDispatchers: number;
  wiredDispatchers: number;
  totalActions: number;
  coveredActions: number;
  coveragePct: number;
  budgetBreaches: number;
  recentBreachRate: number;
  lastUpdate: number;
  /** Dispatchers registered but with zero adoption events — structural bypass risk. */
  silentDispatchers: string[];
}

export interface DispatcherRegistration {
  dispatcher: string;
  actions: readonly string[];
  wedmActionFilter?: (action: string) => boolean;
}

const BUDGET_MS = 50;
const RECENT_WINDOW = 200;
const STOPWORDS = new Set([
  "get", "set", "calc", "compute", "list", "with", "for", "the", "of", "and",
  "status", "check", "run", "load", "data", "info", "type",
]);

export class WEDMAwarenessAdoptionEngine {
  private dispatchers = new Map<string, DispatcherRegistration>();
  private adoptions: AdoptionRecord[] = [];
  private coveredActionKeys = new Set<string>();

  registerDispatcher(reg: DispatcherRegistration): void {
    this.dispatchers.set(reg.dispatcher, reg);
  }

  recordAdoption(rec: Omit<AdoptionRecord, "budgetBreach" | "timestamp">): AdoptionRecord {
    const budgetBreach = rec.latencyMs > BUDGET_MS && !rec.cached;
    const full: AdoptionRecord = { ...rec, budgetBreach, timestamp: Date.now() };
    this.adoptions.push(full);
    if (this.adoptions.length > RECENT_WINDOW * 4) {
      this.adoptions.splice(0, this.adoptions.length - RECENT_WINDOW * 4);
    }
    this.coveredActionKeys.add(`${rec.dispatcher}::${rec.action}`);
    if (budgetBreach) {
      log.debug(`[wedm-awareness] budget breach ${rec.dispatcher}:${rec.action} ${rec.latencyMs}ms`);
    }
    return full;
  }

  isWedmAction(dispatcher: string, action: string): boolean {
    if (dispatcher === "edm" || dispatcher === "prism_edm") return true;
    const reg = this.dispatchers.get(dispatcher);
    if (reg?.wedmActionFilter) return reg.wedmActionFilter(action);
    const lower = action.toLowerCase();
    return lower.includes("wedm") || lower.includes("wire_edm") || lower.startsWith("wire_") ||
      lower.includes("electrode") || lower.includes("sinker") || lower.includes("edm_");
  }

  extractKeywords(action: string, params?: Record<string, unknown>): string[] {
    const parts = action.split(/[_\-]+/).filter(p => p && !STOPWORDS.has(p.toLowerCase()));
    const kw = new Set<string>(parts.map(p => p.toLowerCase()));
    if (params) {
      const interesting = ["material", "wire", "thickness_mm", "machine", "target_ra_um", "operation"];
      for (const k of interesting) {
        const v = params[k];
        if (typeof v === "string" && v.length > 0 && v.length < 40) kw.add(v.toLowerCase());
      }
    }
    return Array.from(kw).slice(0, 6);
  }

  getCoverageSummary(): CoverageSummary {
    let totalActions = 0;
    let wiredDispatchers = 0;
    const silentDispatchers: string[] = [];
    for (const reg of this.dispatchers.values()) {
      const wedmActions = reg.wedmActionFilter
        ? reg.actions.filter(reg.wedmActionFilter)
        : reg.actions;
      totalActions += wedmActions.length;
      const hasAnyCovered = wedmActions.some(a => this.coveredActionKeys.has(`${reg.dispatcher}::${a}`));
      if (hasAnyCovered) wiredDispatchers++;
      else if (wedmActions.length > 0) silentDispatchers.push(reg.dispatcher);
    }
    const coveredActions = Array.from(this.coveredActionKeys).filter(k => {
      const [disp, act] = k.split("::");
      const reg = this.dispatchers.get(disp);
      if (!reg) return false;
      if (reg.wedmActionFilter && !reg.wedmActionFilter(act)) return false;
      return reg.actions.includes(act);
    }).length;
    const recent = this.adoptions.slice(-RECENT_WINDOW);
    const breaches = recent.filter(r => r.budgetBreach).length;
    return {
      totalDispatchers: this.dispatchers.size,
      wiredDispatchers,
      totalActions,
      coveredActions,
      coveragePct: totalActions === 0 ? 0 : Math.round((coveredActions / totalActions) * 1000) / 10,
      budgetBreaches: this.adoptions.filter(r => r.budgetBreach).length,
      recentBreachRate: recent.length === 0 ? 0 : Math.round((breaches / recent.length) * 1000) / 10,
      lastUpdate: recent.length === 0 ? 0 : recent[recent.length - 1].timestamp,
      silentDispatchers,
    };
  }

  getAdoptions(limit = 100): AdoptionRecord[] {
    return this.adoptions.slice(-limit);
  }

  resetForTests(): void {
    this.adoptions.length = 0;
    this.coveredActionKeys.clear();
    this.dispatchers.clear();
  }
}

export const wedmAwarenessAdoptionEngine = new WEDMAwarenessAdoptionEngine();
