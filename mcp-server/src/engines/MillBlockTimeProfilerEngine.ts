/**
 * MillBlockTimeProfilerEngine — per-block cycle-time decomposition for mill programs
 *
 * Mill-domain parity for LatheBlockTimeProfilerEngine (LATHE-PRO-MS12). The lathe engine
 * categorizes blocks as {rapid, feed, dwell, tool_change, retract, m_code}; the mill
 * engine adds three mill-canonical categories and one timing-model upgrade:
 *
 *   NEW MILL CATEGORIES:
 *     - probe_cycle    (G31/G65 probe macros — significant time on mill not lathe)
 *     - pallet_change  (APC swap — pallets are mill-canonical)
 *     - head_index     (5-axis head/rotary table index — A/B/C move time)
 *
 *   UPGRADED TIMING MODEL:
 *     - Multi-axis rapid time computed as `max(|dx|, |dy|, |dz|) / rate` (true diagonal
 *       rapid kinematics) rather than the sum-of-distances assumption — Sandvik §14 +
 *       Altintas §2 motion kinematics for mills.
 *     - Optional acceleration penalty for short blocks (S-curve effective rate < commanded
 *       on segments shorter than the accel-distance; Altintas §2.3).
 *
 * Per-block contribution + bottleneck ranking + per-category share, same as lathe.
 *
 * Distinct from existing:
 *   - GenericCycleTimeEngine — whole-program total, no decomposition
 *   - ToolpathSimulationEngine — kinematic sim, no time accounting
 *   - This engine — per-block contribution + bottleneck ranking + mill-specific aux categories
 *
 * References:
 *   - Sandvik Coromant "Modern Metal Cutting" §14 (cycle time accounting)
 *   - ISO 841:2001 (NC axis nomenclature)
 *   - Altintas Y. "Manufacturing Automation" (2012) §2 (motion kinematics + accel/decel)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-TIME-PROFILER (iter64)
 * @version 1.0.0
 * @module MillBlockTimeProfilerEngine
 */

export type MillBlockTimeCategory =
  | "rapid"
  | "feed"
  | "dwell"
  | "tool_change"
  | "retract"
  | "m_code"
  | "probe_cycle"
  | "pallet_change"
  | "head_index";

export interface MillBlockTimeInput {
  n: number;
  category: MillBlockTimeCategory;
  /** Total scalar distance for feed/retract moves (mm) */
  distance_mm?: number;
  /** Per-axis delta (mm) for diagonal-rapid calculation. When supplied for rapids, takes precedence over distance_mm. */
  dx_mm?: number;
  dy_mm?: number;
  dz_mm?: number;
  /** Commanded effective feed (mm/min) for feed/retract blocks */
  effective_feed_mm_min?: number;
  /** Machine rapid rate (mm/min) for rapid blocks */
  rapid_rate_mm_min?: number;
  /** Dwell seconds for dwell blocks */
  dwell_seconds?: number;
  /** Tool change time (sec) — includes magazine indexing for mill */
  tool_change_seconds?: number;
  /** M-code overhead (sec) — coolant/spindle ramp */
  m_code_seconds?: number;
  /** Probe cycle time (sec) — mill-canonical */
  probe_cycle_seconds?: number;
  /** Pallet change time (sec) — APC swap */
  pallet_change_seconds?: number;
  /** Head/rotary index time (sec) — 5-axis A/B/C move */
  head_index_seconds?: number;
  /**
   * Optional: enable acceleration penalty for short blocks. When `accel_mm_s2`
   * is set, the engine adjusts rapid/feed time by 2 * sqrt(2*d/a) accel ramp model
   * for blocks shorter than the accel-distance d_accel = v²/(2a).
   */
  accel_mm_s2?: number;
}

export interface MillBlockTimeProfileInput {
  blocks: MillBlockTimeInput[];
  /** Top-N bottleneck blocks to surface (default 10) */
  top_n?: number;
}

export interface MillBlockTimeStep {
  n: number;
  category: MillBlockTimeCategory;
  seconds: number;
  share_pct: number;
}

export interface MillCategoryShare {
  category: MillBlockTimeCategory;
  total_seconds: number;
  share_pct: number;
  block_count: number;
}

export interface MillBlockTimeProfileResult {
  total_seconds: number;
  steps: MillBlockTimeStep[];
  category_shares: MillCategoryShare[];
  bottleneck_blocks: MillBlockTimeStep[];
  reasoning: string[];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

/**
 * Diagonal rapid time: max-of-axes / rate. On mills, the three axes move
 * simultaneously at full rate, so the dominant axis governs total time.
 * If per-axis deltas not supplied, falls back to scalar distance / rate.
 */
function rapidSecondsFromAxes(b: MillBlockTimeInput): number {
  const rate = Math.max(1, b.rapid_rate_mm_min ?? 30000);
  if (b.dx_mm !== undefined || b.dy_mm !== undefined || b.dz_mm !== undefined) {
    const dx = Math.abs(b.dx_mm ?? 0);
    const dy = Math.abs(b.dy_mm ?? 0);
    const dz = Math.abs(b.dz_mm ?? 0);
    const dom = Math.max(dx, dy, dz);
    return (dom / rate) * 60;
  }
  const d = Math.max(0, b.distance_mm ?? 0);
  return (d / rate) * 60;
}

/**
 * Apply acceleration penalty for short blocks. If commanded rate is v and accel is a,
 * the minimum distance to reach v is d_accel = v² / (2a). For blocks shorter than 2 * d_accel,
 * the block never reaches commanded rate — effective time grows by the ramp-up factor.
 */
function applyAccelPenalty(baseSec: number, distance_mm: number, rate_mm_min: number, accel_mm_s2: number): number {
  if (!(accel_mm_s2 > 0)) return baseSec;
  const v = rate_mm_min / 60; // mm/s
  const dAccel = (v * v) / (2 * accel_mm_s2); // mm needed to ramp to v
  if (distance_mm >= 2 * dAccel) return baseSec; // full-rate cruise possible
  // Block is shorter than accel+decel distance combined.
  // Peak velocity attained: v_peak = sqrt(a * d) (accel from 0 over d/2, decel back)
  // Time to traverse d at triangular profile: t = 2 * sqrt(d / a)
  const t = 2 * Math.sqrt(Math.max(1e-9, distance_mm) / accel_mm_s2);
  return Math.max(baseSec, t);
}

function computeMillBlockSeconds(b: MillBlockTimeInput): number {
  switch (b.category) {
    case "rapid": {
      const baseSec = rapidSecondsFromAxes(b);
      if (b.accel_mm_s2 !== undefined) {
        const dom = Math.max(Math.abs(b.dx_mm ?? 0), Math.abs(b.dy_mm ?? 0), Math.abs(b.dz_mm ?? 0), b.distance_mm ?? 0);
        return applyAccelPenalty(baseSec, dom, b.rapid_rate_mm_min ?? 30000, b.accel_mm_s2);
      }
      return baseSec;
    }
    case "feed":
    case "retract": {
      const d = Math.max(0, b.distance_mm ?? 0);
      const rate = Math.max(0.001, b.effective_feed_mm_min ?? 500);
      const baseSec = (d / rate) * 60;
      if (b.accel_mm_s2 !== undefined) return applyAccelPenalty(baseSec, d, rate, b.accel_mm_s2);
      return baseSec;
    }
    case "dwell":          return Math.max(0, b.dwell_seconds ?? 0);
    case "tool_change":    return Math.max(0, b.tool_change_seconds ?? 4);
    case "m_code":         return Math.max(0, b.m_code_seconds ?? 0.2);
    case "probe_cycle":    return Math.max(0, b.probe_cycle_seconds ?? 2.5);
    case "pallet_change":  return Math.max(0, b.pallet_change_seconds ?? 8);
    case "head_index":     return Math.max(0, b.head_index_seconds ?? 1.0);
    default:               return 0;
  }
}

class MillBlockTimeProfilerEngineImpl {
  profile(i: MillBlockTimeProfileInput): MillBlockTimeProfileResult {
    if (!i || !Array.isArray(i.blocks)) {
      throw new Error("MillBlockTimeProfilerEngine.profile: blocks[] required");
    }
    const topN = Math.max(1, i.top_n ?? 10);
    const steps: MillBlockTimeStep[] = [];
    const catTotals: Record<MillBlockTimeCategory, { sec: number; count: number }> = {
      rapid: { sec: 0, count: 0 },
      feed: { sec: 0, count: 0 },
      dwell: { sec: 0, count: 0 },
      tool_change: { sec: 0, count: 0 },
      retract: { sec: 0, count: 0 },
      m_code: { sec: 0, count: 0 },
      probe_cycle: { sec: 0, count: 0 },
      pallet_change: { sec: 0, count: 0 },
      head_index: { sec: 0, count: 0 },
    };

    for (const b of i.blocks) {
      const sec = computeMillBlockSeconds(b);
      steps.push({ n: b.n, category: b.category, seconds: round3(sec), share_pct: 0 });
      catTotals[b.category].sec += sec;
      catTotals[b.category].count += 1;
    }

    const total = steps.reduce((s, x) => s + x.seconds, 0);
    const totalSafe = total > 0 ? total : 1;

    for (const s of steps) {
      s.share_pct = round2((s.seconds / totalSafe) * 100);
    }

    const cats: MillCategoryShare[] = Object.entries(catTotals).map(([category, v]) => ({
      category: category as MillBlockTimeCategory,
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
    // Mill-specific recommendations
    const probeShare = cats.find(c => c.category === "probe_cycle");
    if (probeShare && probeShare.share_pct > 15) {
      reasoning.push(`Probing >${probeShare.share_pct}% of cycle — consider in-process probing reduction`);
    }
    const palletShare = cats.find(c => c.category === "pallet_change");
    if (palletShare && palletShare.share_pct > 10) {
      reasoning.push(`Pallet changes >${palletShare.share_pct}% — consider batching parts per setup`);
    }
    const toolShare = cats.find(c => c.category === "tool_change");
    if (toolShare && toolShare.share_pct > 20) {
      reasoning.push(`Tool changes >${toolShare.share_pct}% — consider tool-change-order optimization`);
    }

    return {
      total_seconds: round3(total),
      steps,
      category_shares: cats,
      bottleneck_blocks: bottlenecks,
      reasoning,
    };
  }

  getStats(): {
    categories: MillBlockTimeCategory[];
    mill_canonical_extensions: MillBlockTimeCategory[];
    reference: string;
  } {
    return {
      categories: ["rapid", "feed", "dwell", "tool_change", "retract", "m_code", "probe_cycle", "pallet_change", "head_index"],
      mill_canonical_extensions: ["probe_cycle", "pallet_change", "head_index"],
      reference: "Sandvik Modern Metal Cutting §14; ISO 841:2001; Altintas Manufacturing Automation §2 (motion kinematics + accel/decel)",
    };
  }
}

export const millBlockTimeProfilerEngine = new MillBlockTimeProfilerEngineImpl();
export type { MillBlockTimeProfilerEngineImpl };
