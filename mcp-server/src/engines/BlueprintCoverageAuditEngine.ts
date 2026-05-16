/**
 * BlueprintCoverageAuditEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
 *
 * Audit over the Docustrata corpus + ground-truth registry: which prints got
 * extracted correctly, which widened conformal bounds, which the operator
 * overrode, which the system has never seen. Modelled on
 * ElectrodeCoverageAuditEngine from TRAINING-LEARNING-MS0/U3.
 *
 * @engine BlueprintCoverageAuditEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1 / U-MS1-U8
 * @classification STANDARD (audit only, no physics)
 */

import * as fs from "node:fs";
import * as path from "node:path";

export const COVERAGE_STATES = ["extracted_ok", "widened_bounds", "operator_overridden", "never_seen"] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

export interface CoverageRecord {
  pdfPath: string;
  customer: string;
  partNumber: string;
  state: CoverageState;
  dimType: string;
  /** ISO-8601 of last evaluation. */
  lastEvaluatedAt: string;
}

export interface CoverageAuditResult {
  totalFiles: number;
  byState: Record<CoverageState, number>;
  byCustomer: Record<string, Record<CoverageState, number>>;
  byDimType: Record<string, Record<CoverageState, number>>;
  byConvention: Record<string, Record<CoverageState, number>>;
  records: CoverageRecord[];
  generatedAt: string;
  coveragePct: number; // extracted_ok / totalFiles
}

export interface RetrainFlag {
  scope: "customer" | "convention";
  scopeId: string;
  baselineCoveragePct: number;
  currentCoveragePct: number;
  deltaPct: number;
  threshold: number;
  reason: string;
}

export interface CoverageAuditIO {
  fs?: {
    existsSync: typeof fs.existsSync;
    mkdirSync: typeof fs.mkdirSync;
    writeFileSync: typeof fs.writeFileSync;
    readFileSync: typeof fs.readFileSync;
  };
  loadRecords?: (rootDir: string, indexPath: string) => Promise<CoverageRecord[]>;
  now?: () => string;
}

const DEFAULT_RETRAIN_THRESHOLD = 5; // percentage points

// ── Engine ──────────────────────────────────────────────────────────────────

export class BlueprintCoverageAuditEngine {
  public readonly schemaVersion = "1.0.0" as const;

  private lastAudit: CoverageAuditResult | null = null;
  private baselineSnapshots = new Map<string, CoverageAuditResult>();

  async auditCoverage(input: {
    rootDir: string;
    indexPath: string;
    io?: CoverageAuditIO;
  }): Promise<CoverageAuditResult> {
    const loader = input.io?.loadRecords;
    if (!loader) {
      throw new Error("[BlueprintCoverageAuditEngine] loadRecords injection required");
    }
    const records = await loader(input.rootDir, input.indexPath);
    if (!Array.isArray(records)) {
      throw new Error("[BlueprintCoverageAuditEngine] loader must return array");
    }
    const result = aggregateRecords(records, input.io?.now ? input.io.now() : new Date().toISOString());
    this.lastAudit = result;
    return result;
  }

  byCustomer(input: { customer: string }): Record<CoverageState, number> | null {
    if (!this.lastAudit) return null;
    return this.lastAudit.byCustomer[input.customer.toUpperCase()] ?? null;
  }

  byConvention(input: { convention: string }): Record<CoverageState, number> | null {
    if (!this.lastAudit) return null;
    return this.lastAudit.byConvention[input.convention] ?? null;
  }

  byDimType(input: { dimType: string }): Record<CoverageState, number> | null {
    if (!this.lastAudit) return null;
    return this.lastAudit.byDimType[input.dimType] ?? null;
  }

  generateReport(input: {
    format: "md" | "json";
    outDir: string;
    io?: CoverageAuditIO;
  }): { path: string; bytes: number } {
    if (!this.lastAudit) {
      throw new Error("[BlueprintCoverageAuditEngine] auditCoverage must run before generateReport");
    }
    const fsImpl = input.io?.fs ?? {
      existsSync: fs.existsSync,
      mkdirSync: fs.mkdirSync,
      writeFileSync: fs.writeFileSync,
      readFileSync: fs.readFileSync,
    };
    const audit = this.lastAudit;
    const body = input.format === "json" ? JSON.stringify(audit, null, 2) : renderMarkdownReport(audit);
    const ext = input.format === "json" ? "json" : "md";
    const filename = `BLUEPRINT_COVERAGE_AUDIT.${ext}`;
    const fullPath = path.join(input.outDir, filename).replace(/\\/g, "/");
    try {
      fsImpl.mkdirSync(input.outDir, { recursive: true });
      fsImpl.writeFileSync(fullPath, body, "utf8");
    } catch (err) {
      throw new Error(`[BlueprintCoverageAuditEngine] report write failed: ${(err as Error).message}`);
    }
    return { path: fullPath, bytes: body.length };
  }

  /** Snapshot the current audit as a baseline (keyed by id) for flag comparisons. */
  snapshotBaseline(input: { snapshotId: string }): void {
    if (!this.lastAudit) {
      throw new Error("[BlueprintCoverageAuditEngine] auditCoverage must run before snapshotBaseline");
    }
    if (!input.snapshotId || typeof input.snapshotId !== "string") {
      throw new Error("[BlueprintCoverageAuditEngine] snapshotId required");
    }
    this.baselineSnapshots.set(input.snapshotId, this.lastAudit);
  }

  /**
   * Flag customers/conventions whose coverage dropped by >threshold percentage
   * points vs the baseline snapshot. Feeds U6 corpus refresh + U7 RAG context
   * refresh decisions.
   */
  flagRetrain(input: {
    baselineSnapshotId: string;
    coverageDeltaThreshold?: number;
  }): RetrainFlag[] {
    const baseline = this.baselineSnapshots.get(input.baselineSnapshotId);
    if (!baseline) {
      throw new Error(`[BlueprintCoverageAuditEngine] baseline snapshot not found: ${input.baselineSnapshotId}`);
    }
    if (!this.lastAudit) {
      throw new Error("[BlueprintCoverageAuditEngine] auditCoverage must run before flagRetrain");
    }
    const threshold = clampNumber(input.coverageDeltaThreshold, DEFAULT_RETRAIN_THRESHOLD, 0, 100);
    const flags: RetrainFlag[] = [];
    for (const [customer, currentBreakdown] of Object.entries(this.lastAudit.byCustomer)) {
      const baselineBreakdown = baseline.byCustomer[customer];
      if (!baselineBreakdown) continue;
      const baselinePct = coveragePctFromBreakdown(baselineBreakdown);
      const currentPct = coveragePctFromBreakdown(currentBreakdown);
      const deltaPct = baselinePct - currentPct;
      if (deltaPct > threshold) {
        flags.push({
          scope: "customer",
          scopeId: customer,
          baselineCoveragePct: Number(baselinePct.toFixed(2)),
          currentCoveragePct: Number(currentPct.toFixed(2)),
          deltaPct: Number(deltaPct.toFixed(2)),
          threshold,
          reason: "coverage_regression",
        });
      }
    }
    return flags;
  }

  getLastAudit(): CoverageAuditResult | null {
    return this.lastAudit;
  }

  clearState(): void {
    this.lastAudit = null;
    this.baselineSnapshots.clear();
  }
}

// ── Helpers (exported) ─────────────────────────────────────────────────────

export function aggregateRecords(records: CoverageRecord[], generatedAt: string): CoverageAuditResult {
  const byState: Record<CoverageState, number> = { extracted_ok: 0, widened_bounds: 0, operator_overridden: 0, never_seen: 0 };
  const byCustomer: Record<string, Record<CoverageState, number>> = {};
  const byDimType: Record<string, Record<CoverageState, number>> = {};
  const byConvention: Record<string, Record<CoverageState, number>> = {};
  for (const r of records) {
    byState[r.state]++;
    const cust = r.customer.toUpperCase();
    if (!byCustomer[cust]) byCustomer[cust] = blankStateCounts();
    byCustomer[cust]![r.state]++;
    if (!byDimType[r.dimType]) byDimType[r.dimType] = blankStateCounts();
    byDimType[r.dimType]![r.state]++;
    // Convention is inferred from dimType for now (placeholder for true ISO/ASME classification)
    const convention = inferConvention(r.dimType);
    if (!byConvention[convention]) byConvention[convention] = blankStateCounts();
    byConvention[convention]![r.state]++;
  }
  const totalFiles = records.length;
  const coveragePct = totalFiles > 0 ? (byState.extracted_ok / totalFiles) * 100 : 0;
  return {
    totalFiles,
    byState,
    byCustomer,
    byDimType,
    byConvention,
    records,
    generatedAt,
    coveragePct: Number(coveragePct.toFixed(2)),
  };
}

export function blankStateCounts(): Record<CoverageState, number> {
  return { extracted_ok: 0, widened_bounds: 0, operator_overridden: 0, never_seen: 0 };
}

export function inferConvention(dimType: string): string {
  if (/^gdt_/.test(dimType)) return "ASME-Y14.5";
  if (dimType === "thread_callout") return "ISO-thread";
  if (dimType === "surface_finish") return "ISO-1302";
  return "metric/inch-dim";
}

export function coveragePctFromBreakdown(b: Record<CoverageState, number>): number {
  const total = b.extracted_ok + b.widened_bounds + b.operator_overridden + b.never_seen;
  if (total === 0) return 0;
  return (b.extracted_ok / total) * 100;
}

export function renderMarkdownReport(audit: CoverageAuditResult): string {
  const lines: string[] = [];
  lines.push("# Blueprint Coverage Audit");
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push("");
  lines.push(`Total files: ${audit.totalFiles}`);
  lines.push(`Coverage: ${audit.coveragePct.toFixed(2)}%`);
  lines.push("");
  lines.push("## By State");
  for (const s of COVERAGE_STATES) lines.push(`- ${s}: ${audit.byState[s]}`);
  lines.push("");
  lines.push("## By Customer");
  for (const [cust, b] of Object.entries(audit.byCustomer)) {
    lines.push(`- ${cust}: extracted=${b.extracted_ok} widened=${b.widened_bounds} overridden=${b.operator_overridden} unseen=${b.never_seen}`);
  }
  lines.push("");
  lines.push("## By Dim Type");
  for (const [dim, b] of Object.entries(audit.byDimType)) {
    lines.push(`- ${dim}: extracted=${b.extracted_ok} widened=${b.widened_bounds} overridden=${b.operator_overridden} unseen=${b.never_seen}`);
  }
  return lines.join("\n") + "\n";
}

function clampNumber(raw: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

export const blueprintCoverageAuditEngine = new BlueprintCoverageAuditEngine();
