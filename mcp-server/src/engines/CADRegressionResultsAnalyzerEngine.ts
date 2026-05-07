/**
 * CADRegressionResultsAnalyzerEngine — U-CINF10 (CAD-INFRA-MS0)
 *
 * Post-batch analysis layer that compares and characterizes CAD regression
 * test batches. Operates on already-persisted TestBatch JSON documents
 * (written by the CINF05 checkpoint engine, read by CINF08 dashboard). No
 * state of its own; injectable FS keeps it deterministic under test.
 *
 * Capabilities:
 *   1. diff(base, candidate)   — per-file status transition report between
 *                                two batches; regression = pass→(fail|error)
 *   2. trend(batchIds)         — pass-rate series over a sequence of batches
 *   3. hotspots(batchIds, opts) — files that fail in ≥ threshold fraction of
 *                                batches; these warrant investigation
 *
 * Duplication guard: the only other "analyzer" that touches this state format
 * is the CINF08 dashboard (real-time snapshot). This engine is distinct in
 * purpose (historical / comparative) and in output shape (diff + trend +
 * hotspots). No overlap with LathePostRegressionTestGeneratorEngine (which
 * *produces* lathe regression fixtures).
 *
 * Pure helpers (exported for direct test coverage):
 *   classifyTransition, diffBatches, passRate, trendSeries, hotspotFiles
 *
 * @module engines/CADRegressionResultsAnalyzerEngine
 */

import * as nodePath from "path";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import {
  parseTestBatch,
  type TestBatch,
  type TestFileEntry,
  type TestStatus,
} from "../schemas/cadRegressionTestSchema.js";

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_STATE_DIR = nodePath.resolve(
  process.cwd(),
  "data/state/cad-regression-tests",
);

/**
 * Default hotspot threshold — a file is a hotspot if it fails in at least
 * this fraction of the batches it appears in. 0.5 = fails in half or more.
 */
export const DEFAULT_HOTSPOT_THRESHOLD = 0.5;

/**
 * Minimum number of batches a file must appear in before hotspot classification
 * applies — avoids flagging a file that only ran once.
 */
export const DEFAULT_HOTSPOT_MIN_APPEARANCES = 3;

// ── Injectable FS ─────────────────────────────────────────────────────────────

export interface AnalyzerFS {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: "utf-8"): string;
}

// ── Output types ──────────────────────────────────────────────────────────────

/**
 * Classification of a per-file transition between two batches:
 *   - regression:  base was pass, candidate is fail/error
 *   - recovery:    base was fail/error, candidate is pass
 *   - stable_pass: both pass
 *   - stable_fail: both fail/error
 *   - new:         file only present in candidate
 *   - removed:     file only present in base
 *   - other:       skip/pending/running on either side
 */
export type TransitionClass =
  | "regression"
  | "recovery"
  | "stable_pass"
  | "stable_fail"
  | "new"
  | "removed"
  | "other";

export interface FileTransition {
  fileId: string;
  baseStatus: TestStatus | null;
  candidateStatus: TestStatus | null;
  classification: TransitionClass;
}

export interface DiffReport {
  baseBatchId: string;
  candidateBatchId: string;
  regressions: FileTransition[];
  recoveries: FileTransition[];
  stablePass: FileTransition[];
  stableFail: FileTransition[];
  newFiles: FileTransition[];
  removedFiles: FileTransition[];
  other: FileTransition[];
  totals: {
    regression: number;
    recovery: number;
    stablePass: number;
    stableFail: number;
    new: number;
    removed: number;
    other: number;
  };
}

export interface TrendPoint {
  batchId: string;
  passRate: number; // 0..1
  total: number;
  passed: number;
  failed: number;
  lastCheckpoint: string;
}

export interface TrendReport {
  series: TrendPoint[];
  deltaPassRate: number | null; // series[n-1] - series[0], null if <2 points
}

export interface Hotspot {
  fileId: string;
  appearances: number;
  failures: number;
  failureRate: number; // 0..1
  lastFailedAt: string | null;
}

export interface HotspotReport {
  threshold: number;
  minAppearances: number;
  analyzedBatches: number;
  hotspots: Hotspot[];
}

// ── Pure helpers (exported for test coverage) ────────────────────────────────

function isPass(s: TestStatus | null): boolean {
  return s === "pass";
}

function isFailOrError(s: TestStatus | null): boolean {
  return s === "fail" || s === "error";
}

export function classifyTransition(
  baseStatus: TestStatus | null,
  candidateStatus: TestStatus | null,
): TransitionClass {
  if (baseStatus === null) return candidateStatus === null ? "other" : "new";
  if (candidateStatus === null) return "removed";
  if (isPass(baseStatus) && isFailOrError(candidateStatus)) return "regression";
  if (isFailOrError(baseStatus) && isPass(candidateStatus)) return "recovery";
  if (isPass(baseStatus) && isPass(candidateStatus)) return "stable_pass";
  if (isFailOrError(baseStatus) && isFailOrError(candidateStatus)) return "stable_fail";
  return "other";
}

export function diffBatches(base: TestBatch, candidate: TestBatch): DiffReport {
  const baseFiles = base.files;
  const candFiles = candidate.files;
  const allIds = new Set<string>([
    ...Object.keys(baseFiles),
    ...Object.keys(candFiles),
  ]);

  const report: DiffReport = {
    baseBatchId: base.batchId,
    candidateBatchId: candidate.batchId,
    regressions: [],
    recoveries: [],
    stablePass: [],
    stableFail: [],
    newFiles: [],
    removedFiles: [],
    other: [],
    totals: {
      regression: 0,
      recovery: 0,
      stablePass: 0,
      stableFail: 0,
      new: 0,
      removed: 0,
      other: 0,
    },
  };

  for (const fileId of allIds) {
    const b: TestFileEntry | undefined = baseFiles[fileId];
    const c: TestFileEntry | undefined = candFiles[fileId];
    const transition: FileTransition = {
      fileId,
      baseStatus: b?.status ?? null,
      candidateStatus: c?.status ?? null,
      classification: classifyTransition(b?.status ?? null, c?.status ?? null),
    };
    switch (transition.classification) {
      case "regression":
        report.regressions.push(transition);
        report.totals.regression += 1;
        break;
      case "recovery":
        report.recoveries.push(transition);
        report.totals.recovery += 1;
        break;
      case "stable_pass":
        report.stablePass.push(transition);
        report.totals.stablePass += 1;
        break;
      case "stable_fail":
        report.stableFail.push(transition);
        report.totals.stableFail += 1;
        break;
      case "new":
        report.newFiles.push(transition);
        report.totals.new += 1;
        break;
      case "removed":
        report.removedFiles.push(transition);
        report.totals.removed += 1;
        break;
      default:
        report.other.push(transition);
        report.totals.other += 1;
    }
  }

  const byFileId = (a: FileTransition, b: FileTransition) =>
    a.fileId.localeCompare(b.fileId);
  report.regressions.sort(byFileId);
  report.recoveries.sort(byFileId);
  report.stablePass.sort(byFileId);
  report.stableFail.sort(byFileId);
  report.newFiles.sort(byFileId);
  report.removedFiles.sort(byFileId);
  report.other.sort(byFileId);
  return report;
}

/** Pass rate for a batch — passes / (passes + failures + errors). Skips excluded. */
export function passRate(batch: TestBatch): { rate: number; passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;
  for (const f of Object.values(batch.files)) {
    if (isPass(f.status)) passed += 1;
    else if (isFailOrError(f.status)) failed += 1;
  }
  const total = passed + failed;
  const rate = total > 0 ? passed / total : 0;
  return { rate, passed, failed, total };
}

export function trendSeries(batches: TestBatch[]): TrendReport {
  const ordered = [...batches].sort((a, b) =>
    a.lastCheckpoint.localeCompare(b.lastCheckpoint),
  );
  const series: TrendPoint[] = ordered.map((b) => {
    const { rate, passed, failed, total } = passRate(b);
    return {
      batchId: b.batchId,
      passRate: rate,
      total,
      passed,
      failed,
      lastCheckpoint: b.lastCheckpoint,
    };
  });
  const deltaPassRate =
    series.length >= 2
      ? series[series.length - 1].passRate - series[0].passRate
      : null;
  return { series, deltaPassRate };
}

export function hotspotFiles(
  batches: TestBatch[],
  threshold: number = DEFAULT_HOTSPOT_THRESHOLD,
  minAppearances: number = DEFAULT_HOTSPOT_MIN_APPEARANCES,
): HotspotReport {
  // appearances[fileId] = total batches where it appears with a terminal status
  const appearances = new Map<string, number>();
  const failures = new Map<string, number>();
  const lastFail = new Map<string, string | null>();
  for (const batch of batches) {
    for (const [fileId, entry] of Object.entries(batch.files)) {
      if (!isPass(entry.status) && !isFailOrError(entry.status)) continue;
      appearances.set(fileId, (appearances.get(fileId) ?? 0) + 1);
      if (isFailOrError(entry.status)) {
        failures.set(fileId, (failures.get(fileId) ?? 0) + 1);
        const when = entry.completedAt ?? null;
        const prev = lastFail.get(fileId);
        if (when && (!prev || when > prev)) lastFail.set(fileId, when);
        else if (!prev) lastFail.set(fileId, null);
      }
    }
  }

  const hotspots: Hotspot[] = [];
  for (const [fileId, count] of appearances.entries()) {
    if (count < minAppearances) continue;
    const fails = failures.get(fileId) ?? 0;
    const rate = count > 0 ? fails / count : 0;
    if (rate >= threshold) {
      hotspots.push({
        fileId,
        appearances: count,
        failures: fails,
        failureRate: rate,
        lastFailedAt: lastFail.get(fileId) ?? null,
      });
    }
  }
  hotspots.sort((a, b) => {
    if (b.failureRate !== a.failureRate) return b.failureRate - a.failureRate;
    if (b.failures !== a.failures) return b.failures - a.failures;
    return a.fileId.localeCompare(b.fileId);
  });

  return {
    threshold,
    minAppearances,
    analyzedBatches: batches.length,
    hotspots,
  };
}

// ── Op types ──────────────────────────────────────────────────────────────────

type DiffOp = {
  op: "diff";
  baseBatchId: string;
  candidateBatchId: string;
  stateDir?: string;
  fs?: AnalyzerFS;
};

type TrendOp = {
  op: "trend";
  batchIds: string[];
  stateDir?: string;
  fs?: AnalyzerFS;
};

type HotspotsOp = {
  op: "hotspots";
  batchIds: string[];
  threshold?: number;
  minAppearances?: number;
  stateDir?: string;
  fs?: AnalyzerFS;
};

type AnalyzerOp = DiffOp | TrendOp | HotspotsOp;

// ── Engine class ──────────────────────────────────────────────────────────────

export class CADRegressionResultsAnalyzerEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADRegressionResultsAnalyzerEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Post-batch analyzer over cad-regression-tests state files. " +
        "Emits diff (regressions/recoveries), trend (pass-rate series), and hotspot (recurring failures) reports.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "diff",
        description:
          "Per-file status transition report between two batches (regressions, recoveries, stable, new, removed).",
        actions: ["cad_regression_analyzer_diff"],
      },
      {
        name: "trend",
        description:
          "Pass-rate series across a sequence of batches ordered by lastCheckpoint.",
        actions: ["cad_regression_analyzer_trend"],
      },
      {
        name: "hotspots",
        description:
          "Files that fail in >= threshold fraction of batches (default 0.5) with >= minAppearances (default 3).",
        actions: ["cad_regression_analyzer_hotspots"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const op = (input as { op?: string }).op;
    if (op !== "diff" && op !== "trend" && op !== "hotspots") {
      return "op must be one of: diff | trend | hotspots";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const op = (input as AnalyzerOp).op;
    if (op === "diff") {
      const o = input as DiffOp;
      if (!o.baseBatchId || !o.candidateBatchId) {
        throw new Error("diff requires baseBatchId and candidateBatchId");
      }
      return this.diff(
        o.baseBatchId,
        o.candidateBatchId,
        o.stateDir ?? DEFAULT_STATE_DIR,
        o.fs,
      );
    }
    if (op === "trend") {
      const o = input as TrendOp;
      if (!Array.isArray(o.batchIds) || o.batchIds.length === 0) {
        throw new Error("trend requires non-empty batchIds[]");
      }
      return this.trend(o.batchIds, o.stateDir ?? DEFAULT_STATE_DIR, o.fs);
    }
    if (op === "hotspots") {
      const o = input as HotspotsOp;
      if (!Array.isArray(o.batchIds) || o.batchIds.length === 0) {
        throw new Error("hotspots requires non-empty batchIds[]");
      }
      return this.hotspots(
        o.batchIds,
        o.threshold ?? DEFAULT_HOTSPOT_THRESHOLD,
        o.minAppearances ?? DEFAULT_HOTSPOT_MIN_APPEARANCES,
        o.stateDir ?? DEFAULT_STATE_DIR,
        o.fs,
      );
    }
    throw new Error("unreachable");
  }

  // ── Public read methods (used by dispatcher and tests) ─────────────────────

  async diff(
    baseBatchId: string,
    candidateBatchId: string,
    stateDir: string = DEFAULT_STATE_DIR,
    fs?: AnalyzerFS,
  ): Promise<DiffReport> {
    const resolved = fs ?? (await this._defaultFS());
    const base = this._loadBatch(baseBatchId, stateDir, resolved);
    const cand = this._loadBatch(candidateBatchId, stateDir, resolved);
    return diffBatches(base, cand);
  }

  async trend(
    batchIds: string[],
    stateDir: string = DEFAULT_STATE_DIR,
    fs?: AnalyzerFS,
  ): Promise<TrendReport> {
    const resolved = fs ?? (await this._defaultFS());
    const batches = batchIds.map((id) => this._loadBatch(id, stateDir, resolved));
    return trendSeries(batches);
  }

  async hotspots(
    batchIds: string[],
    threshold: number = DEFAULT_HOTSPOT_THRESHOLD,
    minAppearances: number = DEFAULT_HOTSPOT_MIN_APPEARANCES,
    stateDir: string = DEFAULT_STATE_DIR,
    fs?: AnalyzerFS,
  ): Promise<HotspotReport> {
    const resolved = fs ?? (await this._defaultFS());
    const batches = batchIds.map((id) => this._loadBatch(id, stateDir, resolved));
    return hotspotFiles(batches, threshold, minAppearances);
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private _loadBatch(
    batchId: string,
    stateDir: string,
    fs: AnalyzerFS,
  ): TestBatch {
    const file = nodePath.join(stateDir, `${batchId}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`batch file not found: ${file}`);
    }
    const raw = fs.readFileSync(file, "utf-8");
    return parseTestBatch(JSON.parse(raw));
  }

  private async _defaultFS(): Promise<AnalyzerFS> {
    const mod = await import("fs");
    return mod as unknown as AnalyzerFS;
  }
}

export const cadRegressionResultsAnalyzerEngine =
  new CADRegressionResultsAnalyzerEngine();
