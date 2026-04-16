/**
 * LatheBlockTimeProfilerEngine
 * ==============================
 *
 * Per-block cycle-time decomposition for turning programs.
 *
 * Walks a sequence of NC blocks and classifies each block's contribution
 * to total cycle time by category:
 *   - rapid        : G00 moves at machine rapid rate
 *   - feed         : feed moves at commanded mm/min or mm/rev × rpm
 *   - dwell        : G04 P... or G04 X...
 *   - tool_change  : T-code + M06 (index time from machine spec)
 *   - retract      : safety plane / home / spindle orient
 *   - m_code       : coolant on/off, spindle on/off, sub-program call
 *
 * Ranks top-N bottleneck blocks (longest contributors) and computes
 * per-category share of total cycle seconds.
 *
 * Distinct from existing:
 *   - LatheOpTimeBreakdownEngine  : operation-level (rough/finish/thread total), not per-block
 *   - LatheAuxAxisTimingEngine    : aux-axis overlap analysis (B/C/sub-spindle)
 *   - CycleTimeEngine (generic)   : whole-program total, no decomposition
 *   - This engine                 : per-block contribution + bottleneck ranking
 *
 * References:
 *   - Sandvik Coromant "Modern Metal Cutting" §14 (cycle time accounting)
 *   - ISO 841:2001 (NC axis nomenclature for rapid/feed rate definitions)
 *
 * @module engines/LatheBlockTimeProfilerEngine
 * @milestone LATHE-PRO-MS12
 */

export type BlockTimeCategory =
  | "rapid"
  | "feed"
  | "dwell"
  | "tool_change"
  | "retract"
  | "m_code";

export interface BlockTimeInput {
  n: number;
  category: BlockTimeCategory;
  /** Distance for motion blocks (mm) */
  distance_mm?: number;
  /** Commanded feed for feed blocks (mm/min or mm/rev × rpm) */
  effective_feed_mm_min?: number;
  /** Machine rapid rate (mm/min) — for rapid blocks */
  rapid_rate_mm_min?: number;
  /** Dwell seconds for dwell blocks */
  dwell_seconds?: number;
  /** Tool change time in seconds (from machine spec) */
  tool_change_seconds?: number;
  /** M-code overhead (spindle ramp, coolant activation) seconds */
  m_code_seconds?: number;
}

export interface LatheBlockTimeProfileInput {
  blocks: BlockTimeInput[];
  /** Top-N bottleneck blocks to surface (default 10) */
  top_n?: number;
}

export interface BlockTimeStep {
  n: number;
  category: BlockTimeCategory;
  seconds: number;
  share_pct: number;
}

export interface CategoryShare {
  category: BlockTimeCategory;
  total_seconds: number;
  share_pct: number;
  block_count: number;
}

export interface LatheBlockTimeProfileResult {
  total_seconds: number;
  steps: BlockTimeStep[];
  category_shares: CategoryShare[];
  bottleneck_blocks: BlockTimeStep[];
  reasoning: string[];
}

class LatheBlockTimeProfilerEngineImpl {
  profile(i: LatheBlockTimeProfileInput): LatheBlockTimeProfileResult {
    const topN = Math.max(1, i.top_n ?? 10);
    const steps: BlockTimeStep[] = [];
    const catTotals: Record<BlockTimeCategory, { sec: number; count: number }> = {
      rapid: { sec: 0, count: 0 },
      feed: { sec: 0, count: 0 },
      dwell: { sec: 0, count: 0 },
      tool_change: { sec: 0, count: 0 },
      retract: { sec: 0, count: 0 },
      m_code: { sec: 0, count: 0 },
    };

    for (const b of i.blocks) {
      const sec = computeBlockSeconds(b);
      steps.push({ n: b.n, category: b.category, seconds: round3(sec), share_pct: 0 });
      catTotals[b.category].sec += sec;
      catTotals[b.category].count += 1;
    }

    const total = steps.reduce((s, x) => s + x.seconds, 0);
    const totalSafe = total > 0 ? total : 1;

    for (const s of steps) {
      s.share_pct = round2((s.seconds / totalSafe) * 100);
    }

    const cats: CategoryShare[] = Object.entries(catTotals).map(([category, v]) => ({
      category: category as BlockTimeCategory,
      total_seconds: round3(v.sec),
      share_pct: round2((v.sec / totalSafe) * 100),
      block_count: v.count,
    }));
    cats.sort((a, b) => b.total_seconds - a.total_seconds);

    const sorted = [...steps].sort((a, b) => b.seconds - a.seconds);
    const bottlenecks = sorted.slice(0, topN);

    const reasoning: string[] = [];
    reasoning.push(`Profiled ${i.blocks.length} blocks; total ${round2(total)} s`);
    const topCat = cats[0];
    if (topCat) {
      reasoning.push(`Dominant category: ${topCat.category} (${topCat.share_pct}%)`);
    }
    if (bottlenecks[0]) {
      reasoning.push(`Top bottleneck: N${bottlenecks[0].n} @ ${bottlenecks[0].seconds}s`);
    }

    return {
      total_seconds: round3(total),
      steps,
      category_shares: cats,
      bottleneck_blocks: bottlenecks,
      reasoning,
    };
  }

  getStats(): { categories: string[]; reference: string } {
    return {
      categories: ["rapid", "feed", "dwell", "tool_change", "retract", "m_code"],
      reference: "Sandvik Modern Metal Cutting §14; ISO 841:2001",
    };
  }
}

function computeBlockSeconds(b: BlockTimeInput): number {
  switch (b.category) {
    case "rapid": {
      const d = Math.max(0, b.distance_mm ?? 0);
      const rate = Math.max(1, b.rapid_rate_mm_min ?? 30000);
      return (d / rate) * 60;
    }
    case "feed":
    case "retract": {
      const d = Math.max(0, b.distance_mm ?? 0);
      const rate = Math.max(0.001, b.effective_feed_mm_min ?? 500);
      return (d / rate) * 60;
    }
    case "dwell":
      return Math.max(0, b.dwell_seconds ?? 0);
    case "tool_change":
      return Math.max(0, b.tool_change_seconds ?? 4);
    case "m_code":
      return Math.max(0, b.m_code_seconds ?? 0.2);
    default:
      return 0;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheBlockTimeProfilerEngine = new LatheBlockTimeProfilerEngineImpl();
export type { LatheBlockTimeProfilerEngineImpl };
