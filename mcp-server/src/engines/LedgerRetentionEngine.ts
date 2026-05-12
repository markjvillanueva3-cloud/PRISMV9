/**
 * LedgerRetentionEngine — Classify ledger entries into hot/warm/cold tiers
 *
 * Phase 0.16 U-OP6 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Phase 0 ships
 * five append-only ledgers (DOC_CHANGE, SESSION_INSIGHTS, DEPRECATION,
 * SVI_DELTA, AGENT_UTILIZATION). Without tiering they grow unbounded. This
 * engine classifies entries by age and recommends a rotation plan:
 *
 *   hot  (≤ hotAgeDays)                → in-place
 *   warm (> hotAgeDays, ≤ warmAgeDays) → compress to .jsonl.gz in same dir
 *   cold (> warmAgeDays)               → move to archive/YYYY-MM/
 *
 * No I/O here. The engine returns a RotationPlan; the script
 * `scripts/rotate-ledgers.ts` executes the plan during the nightly cron.
 *
 * @module engines/LedgerRetentionEngine
 * @milestone PP-0.16-U-OP6
 */

export type RetentionTier = "hot" | "warm" | "cold";

export interface RetentionConfig {
  hotAgeDays: number; // inclusive upper bound
  warmAgeDays: number; // inclusive upper bound; anything past this is cold
}

export const DEFAULT_RETENTION: RetentionConfig = Object.freeze({
  hotAgeDays: 7,
  warmAgeDays: 30,
});

export interface LedgerEntryLike {
  at?: string; // ISO timestamp — primary
  timestamp?: string; // secondary name some ledgers use
}

export interface TieredEntry<T extends LedgerEntryLike = LedgerEntryLike> {
  tier: RetentionTier;
  ageDays: number;
  entry: T;
}

export interface RotationPlan {
  now: string;
  hot: number;
  warm: number;
  cold: number;
  actions: Array<{
    tier: RetentionTier;
    count: number;
    suggestion: string;
  }>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class LedgerRetentionEngine {
  private readonly config: RetentionConfig;

  constructor(config: RetentionConfig = DEFAULT_RETENTION) {
    this.validateConfig(config);
    this.config = config;
  }

  getConfig(): RetentionConfig {
    return this.config;
  }

  /** Test-compat: classify a Date into a retention tier. */
  getTier(date: Date): RetentionTier {
    const ageDays = (Date.now() - date.getTime()) / MS_PER_DAY;
    return this.classify(ageDays);
  }

  /** Test-compat: return retention policy with expected shape. */
  getRetentionPolicy(): { hot: { maxDays: number }; warm: { maxDays: number }; cold: { archivePath: string } } {
    return {
      hot: { maxDays: this.config.hotAgeDays },
      warm: { maxDays: this.config.warmAgeDays },
      cold: { archivePath: "archive/" },
    };
  }

  /** Classify a single entry's age into a tier. */
  tierOf(entry: LedgerEntryLike, nowMs?: number): TieredEntry {
    const iso = entry.at ?? entry.timestamp;
    if (!iso || typeof iso !== "string") {
      throw new Error("entry must have `at` or `timestamp` ISO string");
    }
    const tsMs = Date.parse(iso);
    if (Number.isNaN(tsMs)) throw new Error(`unparseable timestamp: ${iso}`);
    const now = nowMs ?? Date.now();
    const ageDays = Math.max(0, (now - tsMs) / MS_PER_DAY);
    const tier = this.classify(ageDays);
    return { tier, ageDays: Math.round(ageDays * 1000) / 1000, entry };
  }

  classify(ageDays: number): RetentionTier {
    if (ageDays <= this.config.hotAgeDays) return "hot";
    if (ageDays <= this.config.warmAgeDays) return "warm";
    return "cold";
  }

  /**
   * Build a rotation plan for an array of ledger entries. Callers pass the
   * parsed entries; the plan provides per-tier counts and a suggested action.
   */
  plan(entries: readonly LedgerEntryLike[], nowMs?: number): RotationPlan {
    const now = nowMs ?? Date.now();
    let hot = 0;
    let warm = 0;
    let cold = 0;
    for (const e of entries) {
      const t = this.tierOf(e, now).tier;
      if (t === "hot") hot += 1;
      else if (t === "warm") warm += 1;
      else cold += 1;
    }

    const actions: RotationPlan["actions"] = [];
    actions.push({ tier: "hot", count: hot, suggestion: "in-place, no action" });
    if (warm > 0) actions.push({ tier: "warm", count: warm, suggestion: "compress to .jsonl.gz next to source" });
    if (cold > 0) actions.push({ tier: "cold", count: cold, suggestion: "move to archive/YYYY-MM/" });

    return {
      now: new Date(now).toISOString(),
      hot,
      warm,
      cold,
      actions,
    };
  }

  /** Compute the archive subdirectory name from a timestamp string (e.g., "2026-03"). */
  archiveDirFor(iso: string): string {
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) throw new Error(`unparseable timestamp: ${iso}`);
    const d = new Date(ts);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  private validateConfig(c: RetentionConfig): void {
    if (!Number.isFinite(c.hotAgeDays) || c.hotAgeDays < 0) throw new Error("hotAgeDays must be >= 0");
    if (!Number.isFinite(c.warmAgeDays) || c.warmAgeDays < 0) throw new Error("warmAgeDays must be >= 0");
    if (c.warmAgeDays < c.hotAgeDays) throw new Error("warmAgeDays must be >= hotAgeDays");
  }
}

export const ledgerRetentionEngine = new LedgerRetentionEngine();
