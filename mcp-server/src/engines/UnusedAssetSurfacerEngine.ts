/**
 * UnusedAssetSurfacerEngine — Proactively flag underutilized assets
 *
 * Phase 0.24 U-WIRE7 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given invocation
 * telemetry per asset, identify assets that fall into one of three buckets:
 *
 *   - zero-invocation (never used within the observation window)
 *   - decaying (was active but hasn't been touched recently)
 *   - capacity-constrained (high invocation rate indicating it should be
 *     surfaced for load-balancing or sharding decisions)
 *
 * Each bucket emits a surfacing candidate with a rationale and a numeric
 * severity so hooks can rank and throttle notifications.
 *
 * @module engines/UnusedAssetSurfacerEngine
 * @milestone PP-0.24-U-WIRE7
 */

export interface AssetInvocationRecord {
  id: string;
  invocationCount: number;
  lastInvokedAt: string | null; // ISO; null if never
  registeredAt: string; // ISO
  tags?: string[];
}

export type SurfaceBucket = "zero-invocation" | "decaying" | "capacity-constrained";

export interface SurfaceCandidate {
  id: string;
  bucket: SurfaceBucket;
  severity: number; // 0..1
  ageDays: number;
  daysSinceLastUse: number | null;
  invocationsPerDay: number;
  rationale: string;
  tags: string[];
}

export interface SurfacerConfig {
  observationDays: number; // how far back to look
  decayThresholdDays: number;
  highRateThreshold: number; // invocations/day triggering capacity bucket
}

export const DEFAULT_SURFACER_CONFIG: SurfacerConfig = Object.freeze({
  observationDays: 30,
  decayThresholdDays: 7,
  highRateThreshold: 50,
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class UnusedAssetSurfacerEngine {
  private config: SurfacerConfig;

  constructor(config: SurfacerConfig = DEFAULT_SURFACER_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  setConfig(config: SurfacerConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  surface(records: readonly AssetInvocationRecord[], nowMs?: number): SurfaceCandidate[] {
    const now = nowMs ?? Date.now();
    const out: SurfaceCandidate[] = [];

    for (const r of records) {
      this.validateRecord(r);
      const ageMs = Math.max(0, now - Date.parse(r.registeredAt));
      const ageDays = Math.max(1 / 24, ageMs / MS_PER_DAY);
      const observationAgeDays = Math.min(ageDays, this.config.observationDays);
      const rate = r.invocationCount / observationAgeDays;

      const lastMs = r.lastInvokedAt ? Date.parse(r.lastInvokedAt) : null;
      const daysSinceLastUse = lastMs !== null ? Math.max(0, (now - lastMs) / MS_PER_DAY) : null;

      if (r.invocationCount === 0 && ageDays >= this.config.observationDays / 4) {
        out.push(this.build(r, "zero-invocation", ageDays, daysSinceLastUse, rate));
        continue;
      }

      if (rate >= this.config.highRateThreshold) {
        out.push(this.build(r, "capacity-constrained", ageDays, daysSinceLastUse, rate));
        continue;
      }

      if (daysSinceLastUse !== null && daysSinceLastUse >= this.config.decayThresholdDays) {
        out.push(this.build(r, "decaying", ageDays, daysSinceLastUse, rate));
      }
    }

    out.sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return a.id.localeCompare(b.id);
    });
    return out;
  }

  private build(
    record: AssetInvocationRecord,
    bucket: SurfaceBucket,
    ageDays: number,
    daysSinceLastUse: number | null,
    rate: number
  ): SurfaceCandidate {
    const severity = round4(this.severityFor(bucket, ageDays, daysSinceLastUse, rate));
    return {
      id: record.id,
      bucket,
      severity,
      ageDays: round4(ageDays),
      daysSinceLastUse: daysSinceLastUse === null ? null : round4(daysSinceLastUse),
      invocationsPerDay: round4(rate),
      rationale: this.rationaleFor(bucket, ageDays, daysSinceLastUse, rate),
      tags: record.tags ? [...new Set(record.tags.map((t) => t.toLowerCase()))] : [],
    };
  }

  private severityFor(
    bucket: SurfaceBucket,
    ageDays: number,
    daysSinceLastUse: number | null,
    rate: number
  ): number {
    switch (bucket) {
      case "zero-invocation": {
        // Older zero-invocation assets score higher (more wasted investment).
        return Math.min(1, ageDays / (2 * this.config.observationDays));
      }
      case "decaying": {
        if (daysSinceLastUse === null) return 0;
        return Math.min(1, daysSinceLastUse / (2 * this.config.decayThresholdDays));
      }
      case "capacity-constrained": {
        return Math.min(1, rate / (2 * this.config.highRateThreshold));
      }
    }
  }

  private rationaleFor(
    bucket: SurfaceBucket,
    ageDays: number,
    daysSinceLastUse: number | null,
    rate: number
  ): string {
    switch (bucket) {
      case "zero-invocation":
        return `registered ${ageDays.toFixed(1)}d ago with zero invocations`;
      case "decaying":
        return `last used ${(daysSinceLastUse ?? 0).toFixed(1)}d ago; decay threshold ${this.config.decayThresholdDays}d`;
      case "capacity-constrained":
        return `${rate.toFixed(2)} invocations/day ≥ threshold ${this.config.highRateThreshold}`;
    }
  }

  private validateConfig(c: SurfacerConfig): void {
    if (!(c.observationDays > 0)) throw new Error("observationDays must be > 0");
    if (!(c.decayThresholdDays > 0)) throw new Error("decayThresholdDays must be > 0");
    if (!(c.highRateThreshold > 0)) throw new Error("highRateThreshold must be > 0");
  }

  private validateRecord(r: AssetInvocationRecord): void {
    if (!r.id) throw new Error("record.id required");
    if (!r.registeredAt || !/^\d{4}-\d{2}-\d{2}T/.test(r.registeredAt)) {
      throw new Error("record.registeredAt must be ISO");
    }
    if (!Number.isInteger(r.invocationCount) || r.invocationCount < 0) {
      throw new Error("invocationCount must be non-negative integer");
    }
    if (r.lastInvokedAt !== null && !/^\d{4}-\d{2}-\d{2}T/.test(r.lastInvokedAt)) {
      throw new Error("lastInvokedAt must be ISO or null");
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const unusedAssetSurfacerEngine = new UnusedAssetSurfacerEngine();
