/**
 * PipelineMetricsEngine - Per-session context-pipeline metrics (CPP-MS5-U-CPP37)
 *
 * Computes observability metrics for the context-pipeline artifacts written
 * by SessionStart hooks. Metrics are intentionally pure functions of the
 * artifact inventory — the hook collects the inputs (filesystem state +
 * pipeline-integrity snapshot), passes them here, and the engine returns
 * a single snapshot object to persist at state/shared/PIPELINE_METRICS.json.
 *
 * Metrics published (schemaVersion 1):
 *   - compaction_count: number of per-instance .compaction-survival-*.md
 *     files currently on disk (proxy for "how many sessions survived compact")
 *   - survival_bytes: {total, max, min, avg} across all survival files
 *   - handoff_roundtrip_ms: freshest HANDOFF-* mtime minus oldest, in ms
 *     (how long the slowest handoff has been stale before refresh)
 *   - empty_file_rate: fraction of links in PIPELINE_INTEGRITY.json that are
 *     empty; canonical regression signal from U-CPP34
 *
 * Why an engine (not inline in the hook): lets us unit-test the math
 * deterministically, and lets other readers (dashboards, regression jobs)
 * call the same method with their own inputs.
 *
 * Dependencies: U-CPP34 (consumes PIPELINE_INTEGRITY.json shape).
 *
 * @milestone CPP-MS5-U-CPP37
 * @version 1.0.0
 */

export interface SurvivalFileStat {
  path: string;
  bytes: number;
  mtimeMs: number;
}

export interface HandoffFileStat {
  path: string;
  mtimeMs: number;
}

export interface IntegrityLinkStat {
  stage: string;
  empty: boolean;
}

export interface PipelineMetricsInput {
  /** All per-instance .compaction-survival-*.md + legacy single-file survival. */
  survivalFiles: SurvivalFileStat[];
  /** All HANDOFF-*.md in state/shared/handoffs/. */
  handoffFiles: HandoffFileStat[];
  /** Parsed links[] from PIPELINE_INTEGRITY.json (U-CPP34). */
  integrityLinks: IntegrityLinkStat[];
  /** Captured-at ISO timestamp, for the output snapshot. */
  capturedAt?: string;
}

export interface SurvivalByteStats {
  count: number;
  total: number;
  max: number;
  min: number;
  avg: number;
}

export interface PipelineMetricsOutput {
  schemaVersion: 1;
  capturedAt: string;
  compactionCount: number;
  survivalBytes: SurvivalByteStats;
  handoffRoundtripMs: number;
  handoffCount: number;
  emptyFileRate: number;
  emptyLinkCount: number;
  totalLinkCount: number;
}

export class PipelineMetricsEngine {
  /**
   * Compute the full metrics snapshot from the raw inputs.
   */
  collect(input: PipelineMetricsInput): PipelineMetricsOutput {
    const survivalBytes = this.computeSurvivalBytes(input.survivalFiles);
    const handoffRoundtripMs = this.computeHandoffRoundtrip(input.handoffFiles);
    const { emptyCount, total } = this.countEmpty(input.integrityLinks);
    const emptyFileRate = total === 0 ? 0 : emptyCount / total;

    return {
      schemaVersion: 1,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
      compactionCount: input.survivalFiles.length,
      survivalBytes,
      handoffRoundtripMs,
      handoffCount: input.handoffFiles.length,
      emptyFileRate: Math.round(emptyFileRate * 10000) / 10000,
      emptyLinkCount: emptyCount,
      totalLinkCount: total,
    };
  }

  /**
   * Aggregate byte statistics across survival files. Returns zeros when empty.
   */
  computeSurvivalBytes(files: SurvivalFileStat[]): SurvivalByteStats {
    if (files.length === 0) {
      return { count: 0, total: 0, max: 0, min: 0, avg: 0 };
    }
    const sizes = files.map((f) => f.bytes);
    const total = sizes.reduce((a, b) => a + b, 0);
    return {
      count: files.length,
      total,
      max: Math.max(...sizes),
      min: Math.min(...sizes),
      avg: Math.round(total / files.length),
    };
  }

  /**
   * Roundtrip = freshest mtime − oldest mtime, in ms. 0 when ≤1 file.
   */
  computeHandoffRoundtrip(files: HandoffFileStat[]): number {
    if (files.length < 2) return 0;
    const mtimes = files.map((f) => f.mtimeMs);
    return Math.max(...mtimes) - Math.min(...mtimes);
  }

  private countEmpty(links: IntegrityLinkStat[]): { emptyCount: number; total: number } {
    const emptyCount = links.filter((l) => l.empty).length;
    return { emptyCount, total: links.length };
  }
}

export const pipelineMetricsEngine = new PipelineMetricsEngine();
