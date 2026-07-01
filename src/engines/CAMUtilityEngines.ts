/**
 * CAMUtilityEngines — CK-MS12/U02-U04
 * Three utility engines for CAM kernel UX:
 *   1. ProgramCompareEngine — diff two G-code programs with physics
 *   2. CAMResultCacheEngine — cache results for identical inputs
 *   3. BatchCAMEngine — generate programs for multiple parts
 */

// ═══════════════════════════════════════════════════════════════
// 1. PROGRAM COMPARE — diff two G-code programs
// ═══════════════════════════════════════════════════════════════

export interface ProgramComparison {
  line_count: { a: number; b: number; diff: number };
  cycle_time_estimate: { a_s: number; b_s: number; diff_pct: number };
  feed_stats: {
    a_avg: number; b_avg: number;
    a_min: number; b_min: number;
    a_max: number; b_max: number;
  };
  tool_changes: { a: number; b: number };
  rapid_distance: { a_mm: number; b_mm: number };
  cutting_distance: { a_mm: number; b_mm: number };
  differences: Array<{
    line: number; type: "added" | "removed" | "changed";
    a_content?: string; b_content?: string;
  }>;
  verdict: "A_better" | "B_better" | "equivalent";
  reasoning: string[];
}

export class ProgramCompareEngine {
  compare(gcodeA: string, gcodeB: string): ProgramComparison {
    const linesA = gcodeA.split("\n").filter(l => l.trim());
    const linesB = gcodeB.split("\n").filter(l => l.trim());

    const statsA = this._analyzeGcode(linesA);
    const statsB = this._analyzeGcode(linesB);

    // Find differences (simplified line diff)
    const diffs: ProgramComparison["differences"] = [];
    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < Math.min(maxLen, 50); i++) {
      if (i >= linesA.length) {
        diffs.push({ line: i + 1, type: "added", b_content: linesB[i] });
      } else if (i >= linesB.length) {
        diffs.push({ line: i + 1, type: "removed", a_content: linesA[i] });
      } else if (linesA[i] !== linesB[i]) {
        diffs.push({ line: i + 1, type: "changed", a_content: linesA[i], b_content: linesB[i] });
      }
    }

    const timeDiffPct = statsA.cycleTime > 0
      ? ((statsB.cycleTime - statsA.cycleTime) / statsA.cycleTime) * 100 : 0;

    const reasoning: string[] = [];
    if (timeDiffPct < -5) reasoning.push(`B is ${Math.abs(timeDiffPct).toFixed(1)}% faster`);
    else if (timeDiffPct > 5) reasoning.push(`A is ${timeDiffPct.toFixed(1)}% faster`);
    if (statsB.toolChanges < statsA.toolChanges) reasoning.push(`B has fewer tool changes (${statsB.toolChanges} vs ${statsA.toolChanges})`);
    if (statsB.rapidDist < statsA.rapidDist * 0.9) reasoning.push("B has shorter rapid travel");

    const verdict = timeDiffPct < -3 ? "B_better" : timeDiffPct > 3 ? "A_better" : "equivalent";

    return {
      line_count: { a: linesA.length, b: linesB.length, diff: linesB.length - linesA.length },
      cycle_time_estimate: {
        a_s: Math.round(statsA.cycleTime), b_s: Math.round(statsB.cycleTime),
        diff_pct: Math.round(timeDiffPct * 10) / 10,
      },
      feed_stats: {
        a_avg: statsA.avgFeed, b_avg: statsB.avgFeed,
        a_min: statsA.minFeed, b_min: statsB.minFeed,
        a_max: statsA.maxFeed, b_max: statsB.maxFeed,
      },
      tool_changes: { a: statsA.toolChanges, b: statsB.toolChanges },
      rapid_distance: { a_mm: Math.round(statsA.rapidDist), b_mm: Math.round(statsB.rapidDist) },
      cutting_distance: { a_mm: Math.round(statsA.cuttingDist), b_mm: Math.round(statsB.cuttingDist) },
      differences: diffs.slice(0, 20),
      verdict,
      reasoning,
    };
  }

  private _analyzeGcode(lines: string[]) {
    let prevX = 0, prevY = 0, prevZ = 0;
    let rapidDist = 0, cuttingDist = 0;
    let feeds: number[] = [];
    let toolChanges = 0;
    let cycleTime = 0;

    for (const line of lines) {
      const upper = line.toUpperCase().trim();
      if (/^T\d|M0?6/.test(upper)) toolChanges++;

      const xm = upper.match(/X(-?\d+\.?\d*)/);
      const ym = upper.match(/Y(-?\d+\.?\d*)/);
      const zm = upper.match(/Z(-?\d+\.?\d*)/);
      const fm = upper.match(/F(\d+\.?\d*)/);

      const x = xm ? parseFloat(xm[1]) : prevX;
      const y = ym ? parseFloat(ym[1]) : prevY;
      const z = zm ? parseFloat(zm[1]) : prevZ;
      const dist = Math.sqrt((x-prevX)**2 + (y-prevY)**2 + (z-prevZ)**2);

      if (/G0[01]\s|^G0[01]$/.test(upper) || /^[XYZ]/.test(upper)) {
        if (/G00/.test(upper)) {
          rapidDist += dist;
          cycleTime += dist / 15000 * 60;
        } else {
          cuttingDist += dist;
          const f = fm ? parseFloat(fm[1]) : 1000;
          feeds.push(f);
          cycleTime += dist / f * 60;
        }
      }
      prevX = x; prevY = y; prevZ = z;
    }

    return {
      rapidDist, cuttingDist, toolChanges, cycleTime,
      avgFeed: feeds.length ? Math.round(feeds.reduce((a,b)=>a+b,0)/feeds.length) : 0,
      minFeed: feeds.length ? Math.round(Math.min(...feeds)) : 0,
      maxFeed: feeds.length ? Math.round(Math.max(...feeds)) : 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. CAM RESULT CACHE — memoize identical inputs
// ═══════════════════════════════════════════════════════════════

export class CAMResultCacheEngine {
  private _cache = new Map<string, { result: any; timestamp: number }>();
  private _maxAge = 300000; // 5 min TTL
  private _maxSize = 50;

  get(params: any): any | null {
    const key = this._hash(params);
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this._maxAge) {
      this._cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(params: any, result: any): void {
    if (this._cache.size >= this._maxSize) {
      // Evict oldest
      const oldest = [...this._cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this._cache.delete(oldest[0]);
    }
    this._cache.set(this._hash(params), { result, timestamp: Date.now() });
  }

  clear(): void { this._cache.clear(); }
  get size(): number { return this._cache.size; }

  private _hash(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. BATCH CAM — generate multiple programs
// ═══════════════════════════════════════════════════════════════

export interface BatchResult {
  results: Array<{
    part_id: string;
    success: boolean;
    gcode_lines: number;
    cycle_time_min?: number;
    errors?: string[];
  }>;
  total_parts: number;
  successful: number;
  failed: number;
  total_cycle_time_min: number;
}

export class BatchCAMEngine {
  async generateBatch(
    parts: Array<{
      part_id: string;
      features: any[];
      material: string;
      machine_name: string;
    }>,
    generateFn: (params: any) => Promise<any> | any,
  ): Promise<BatchResult> {
    const results: BatchResult["results"] = [];
    let totalCycle = 0;

    for (const part of parts) {
      try {
        const result = await generateFn({
          features: part.features,
          material: part.material,
          machine_name: part.machine_name,
        });
        const cycleTime = result?.cycle_time?.p50_min || 0;
        totalCycle += cycleTime;
        results.push({
          part_id: part.part_id,
          success: result?.success !== false,
          gcode_lines: result?.gcode?.split("\n").length || 0,
          cycle_time_min: cycleTime,
        });
      } catch (e: any) {
        results.push({
          part_id: part.part_id,
          success: false,
          gcode_lines: 0,
          errors: [e?.message || "Unknown error"],
        });
      }
    }

    return {
      results,
      total_parts: parts.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total_cycle_time_min: Math.round(totalCycle * 100) / 100,
    };
  }
}

export const programCompareEngine = new ProgramCompareEngine();
export const camResultCacheEngine = new CAMResultCacheEngine();
export const batchCAMEngine = new BatchCAMEngine();
