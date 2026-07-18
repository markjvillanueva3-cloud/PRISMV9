/**
 * CADAccuracyScorerEngine — CAM-AI-TRAINING-MS0/U-CAMT-ACCURACY-SCORER
 *
 * Required surface for the operator's YOLO 2026-05-25 gate: "100%
 * accuracy across all CAD files and prints in the system."
 *
 * Per-file scorer: takes a predicted FeatureClass list + ground-truth
 * label list, returns {precision, recall, f1, exactMatch}. The corpus-
 * level rollup aggregates 100k+ file scores into macro/micro metrics
 * and surfaces per-system + per-customer breakdowns for the operator
 * gate.
 *
 * Pure math. No CAD parsing here — caller supplies predictions +
 * ground truth from upstream extraction passes.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";

export interface FileScoreInput {
  fileId: string;
  /** Predicted FeatureClass list from the extractor under test. */
  predicted: ReadonlyArray<FeatureClass>;
  /** Ground-truth FeatureClass list (operator-curated or known-good baseline). */
  groundTruth: ReadonlyArray<FeatureClass>;
  /** Optional source bucket (system / customer / dataset). */
  source?: string;
}

export interface FileScore {
  fileId: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  /** True when predicted set EXACTLY equals ground-truth set (multiset). */
  exactMatch: boolean;
}

export interface CorpusReport {
  totalFiles: number;
  exactMatchCount: number;
  exactMatchPct: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  microPrecision: number;
  microRecall: number;
  microF1: number;
  perSource: Record<string, { files: number; exactMatchPct: number; macroF1: number }>;
  /** First N files with exactMatch=false — for operator triage. */
  failingSample: ReadonlyArray<FileScore>;
}

const DIV_GUARD = 1e-12;

function multisetCounts<T>(items: ReadonlyArray<T>): Map<T, number> {
  const m = new Map<T, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

export class CADAccuracyScorerEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADAccuracyScorerEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Scores CAD-feature-extraction accuracy per-file + corpus-wide for the 100% accuracy gate.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "score_file",   description: "Score one file's prediction",     actions: ["cad_accuracy_score_file"] },
      { name: "score_corpus", description: "Aggregate corpus-wide report",    actions: ["cad_accuracy_score_corpus"] },
      { name: "gate",         description: "Check vs 100% gate",              actions: ["cad_accuracy_gate"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CADAccuracyScorerEngine", note: "use typed methods" };
  }

  /** Score one file. Multiset comparison — duplicate features count individually. */
  score_file(input: FileScoreInput): FileScore {
    const predCount = multisetCounts(input.predicted);
    const truthCount = multisetCounts(input.groundTruth);
    let tp = 0;
    let fp = 0;
    let fn = 0;
    const allKeys = new Set<FeatureClass>([...predCount.keys(), ...truthCount.keys()]);
    for (const k of allKeys) {
      const p = predCount.get(k) ?? 0;
      const t = truthCount.get(k) ?? 0;
      const matched = Math.min(p, t);
      tp += matched;
      fp += Math.max(0, p - t);
      fn += Math.max(0, t - p);
    }
    const precision = tp / Math.max(DIV_GUARD, tp + fp);
    const recall = tp / Math.max(DIV_GUARD, tp + fn);
    const f1 = (2 * precision * recall) / Math.max(DIV_GUARD, precision + recall);
    const exactMatch = fp === 0 && fn === 0;
    return {
      fileId: input.fileId,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision,
      recall,
      f1,
      exactMatch,
    };
  }

  /** Aggregate per-file scores into a corpus report. */
  score_corpus(scores: ReadonlyArray<{ score: FileScore; source?: string }>): CorpusReport {
    const totalFiles = scores.length;
    if (totalFiles === 0) {
      return {
        totalFiles: 0,
        exactMatchCount: 0,
        exactMatchPct: 0,
        macroPrecision: 0,
        macroRecall: 0,
        macroF1: 0,
        microPrecision: 0,
        microRecall: 0,
        microF1: 0,
        perSource: {},
        failingSample: [],
      };
    }
    let macroP = 0, macroR = 0, macroF = 0;
    let microTP = 0, microFP = 0, microFN = 0;
    let exactMatches = 0;
    const perSourceAgg: Record<string, { files: number; exact: number; f1Sum: number }> = {};
    const failing: FileScore[] = [];
    for (const { score, source } of scores) {
      macroP += score.precision;
      macroR += score.recall;
      macroF += score.f1;
      microTP += score.truePositives;
      microFP += score.falsePositives;
      microFN += score.falseNegatives;
      if (score.exactMatch) {
        exactMatches++;
      } else if (failing.length < 100) {
        failing.push(score);
      }
      const src = source ?? "unknown";
      if (!perSourceAgg[src]) perSourceAgg[src] = { files: 0, exact: 0, f1Sum: 0 };
      perSourceAgg[src].files++;
      if (score.exactMatch) perSourceAgg[src].exact++;
      perSourceAgg[src].f1Sum += score.f1;
    }
    const macroPrecision = macroP / totalFiles;
    const macroRecall = macroR / totalFiles;
    const macroF1 = macroF / totalFiles;
    const microPrecision = microTP / Math.max(DIV_GUARD, microTP + microFP);
    const microRecall = microTP / Math.max(DIV_GUARD, microTP + microFN);
    const microF1 = (2 * microPrecision * microRecall) / Math.max(DIV_GUARD, microPrecision + microRecall);
    const perSource: Record<string, { files: number; exactMatchPct: number; macroF1: number }> = {};
    for (const [src, agg] of Object.entries(perSourceAgg)) {
      perSource[src] = {
        files: agg.files,
        exactMatchPct: agg.exact / agg.files,
        macroF1: agg.f1Sum / agg.files,
      };
    }
    return {
      totalFiles,
      exactMatchCount: exactMatches,
      exactMatchPct: exactMatches / totalFiles,
      macroPrecision,
      macroRecall,
      macroF1,
      microPrecision,
      microRecall,
      microF1,
      perSource,
      failingSample: failing,
    };
  }

  /** Operator gate: 100% exactMatch over ≥ minFiles files. */
  gate(report: CorpusReport, minFiles = 100000): { passed: boolean; rationale: string } {
    if (report.totalFiles < minFiles) {
      return { passed: false, rationale: `corpus too small: ${report.totalFiles} files < min ${minFiles}` };
    }
    if (report.exactMatchPct < 1.0) {
      const failing = report.totalFiles - report.exactMatchCount;
      return { passed: false, rationale: `exactMatch ${(report.exactMatchPct * 100).toFixed(2)}% — ${failing} files failing` };
    }
    return { passed: true, rationale: `100% exactMatch on ${report.totalFiles} files — operator gate cleared` };
  }
}

export const cadAccuracyScorerEngine = new CADAccuracyScorerEngine();
