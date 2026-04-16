/**
 * MemoryPressureMonitorEngine — Heap-usage threshold monitor
 *
 * Phase 0.25.4 U-PERF6 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM's
 * long-lived MCP server accumulates registries, ledgers, and session state.
 * Without a memory monitor, a leak silently degrades latency before anyone
 * notices. This engine samples heap usage at the caller's cadence and
 * classifies the process into healthy / warn / critical bands so callers
 * can trigger rotations, compactions, or graceful shutdowns.
 *
 * No I/O. `sampleNow()` calls `process.memoryUsage()` directly; tests inject
 * a fake reader for determinism.
 *
 * @module engines/MemoryPressureMonitorEngine
 * @milestone PP-0.25.4-U-PERF6
 */

export type PressureBand = "healthy" | "warn" | "critical";

export interface MemorySample {
  at: string;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
}

export interface PressureReading extends MemorySample {
  band: PressureBand;
  heapUtilization: number; // heapUsed / heapTotal in [0, 1]
  thresholdMB: { warn: number; critical: number };
  rationale: string;
}

export interface MemoryPressureConfig {
  warnMB: number;
  criticalMB: number;
  /** Rolling window size for `trend()` smoothing. */
  windowSize: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryPressureConfig = Object.freeze({
  warnMB: 1024,
  criticalMB: 2048,
  windowSize: 20,
});

export type MemoryReader = () => {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external?: number;
};

function defaultReader(): ReturnType<MemoryReader> {
  const m = process.memoryUsage();
  return {
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    rss: m.rss,
    external: m.external,
  };
}

export class MemoryPressureMonitorEngine {
  private readonly samples: MemorySample[] = [];
  private config: MemoryPressureConfig;
  private readonly reader: MemoryReader;

  constructor(config: MemoryPressureConfig = DEFAULT_MEMORY_CONFIG, reader: MemoryReader = defaultReader) {
    this.validateConfig(config);
    this.config = config;
    this.reader = reader;
  }

  setConfig(config: MemoryPressureConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  getConfig(): MemoryPressureConfig {
    return this.config;
  }

  sampleNow(nowIso?: string): PressureReading {
    const raw = this.reader();
    const heapUsedMB = round4(raw.heapUsed / (1024 * 1024));
    const heapTotalMB = round4(raw.heapTotal / (1024 * 1024));
    const rssMB = round4(raw.rss / (1024 * 1024));
    const externalMB = round4((raw.external ?? 0) / (1024 * 1024));
    const at = nowIso ?? new Date().toISOString();

    const sample: MemorySample = { at, heapUsedMB, heapTotalMB, rssMB, externalMB };
    this.samples.push(sample);
    if (this.samples.length > this.config.windowSize) {
      this.samples.splice(0, this.samples.length - this.config.windowSize);
    }

    return this.classify(sample);
  }

  lastN(n: number): MemorySample[] {
    if (!Number.isInteger(n) || n < 0) throw new Error("n must be ≥ 0 integer");
    return this.samples.slice(-n);
  }

  /**
   * Returns the average heapUsedMB over the current window plus whether the
   * trend is rising (newer half > older half by ≥5%).
   */
  trend(): { average: number; rising: boolean; samples: number } {
    if (this.samples.length === 0) return { average: 0, rising: false, samples: 0 };
    const values = this.samples.map((s) => s.heapUsedMB);
    const average = round4(values.reduce((a, v) => a + v, 0) / values.length);
    if (values.length < 4) return { average, rising: false, samples: values.length };
    const mid = Math.floor(values.length / 2);
    const olderAvg = values.slice(0, mid).reduce((a, v) => a + v, 0) / mid;
    const newerAvg = values.slice(mid).reduce((a, v) => a + v, 0) / (values.length - mid);
    return {
      average,
      rising: newerAvg > olderAvg * 1.05,
      samples: values.length,
    };
  }

  clear(): void {
    this.samples.length = 0;
  }

  // --- internals ---------------------------------------------------------

  private classify(sample: MemorySample): PressureReading {
    const { warnMB, criticalMB } = this.config;
    const band: PressureBand =
      sample.heapUsedMB >= criticalMB ? "critical" : sample.heapUsedMB >= warnMB ? "warn" : "healthy";
    const utilization = sample.heapTotalMB > 0 ? round4(sample.heapUsedMB / sample.heapTotalMB) : 0;
    const rationale =
      band === "critical"
        ? `heap ${sample.heapUsedMB}MB ≥ critical ${criticalMB}MB`
        : band === "warn"
          ? `heap ${sample.heapUsedMB}MB ≥ warn ${warnMB}MB`
          : `heap ${sample.heapUsedMB}MB below warn ${warnMB}MB`;
    return {
      ...sample,
      band,
      heapUtilization: utilization,
      thresholdMB: { warn: warnMB, critical: criticalMB },
      rationale,
    };
  }

  private validateConfig(c: MemoryPressureConfig): void {
    if (!(c.warnMB > 0)) throw new Error("warnMB must be > 0");
    if (!(c.criticalMB > c.warnMB)) throw new Error("criticalMB must be > warnMB");
    if (!Number.isInteger(c.windowSize) || c.windowSize < 2) {
      throw new Error("windowSize must be integer ≥ 2");
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const memoryPressureMonitorEngine = new MemoryPressureMonitorEngine();
