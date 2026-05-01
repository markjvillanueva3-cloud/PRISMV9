/**
 * ToolpathSimulationEngine — Toolpath Motion Simulation
 *
 * Simulates CNC toolpath execution to compute:
 *   - Total cycle time (rapid + cutting + dwell)
 *   - Feed rate profile (min/max/avg)
 *   - Axis travel distances and utilization
 *   - Spindle load estimation (MRR-based)
 *   - Rapid move safety (collision zone proximity)
 *   - Motion statistics per axis
 *
 * Pure computation — no filesystem, no GPU.
 *
 * Source: domain knowledge (CNC simulation principles, motion planning)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SimMove {
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "plunge" | "retract" | "dwell";
  x?: number;
  y?: number;
  z?: number;
  f?: number;       // feed rate mm/min (ignored for rapid)
  i?: number;       // arc center offset X
  j?: number;       // arc center offset Y
  r?: number;       // arc radius
  dwell_sec?: number;
}

export interface SimConfig {
  feed_rate_mmmin?: number;     // default cutting feed
  rapid_rate_mmmin?: number;    // machine rapid traverse rate
  tool_diameter?: number;       // for MRR estimation
  stock_bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  fixture_bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

export interface SimAxisStats {
  travel_mm: number;
  min_pos: number;
  max_pos: number;
  range_mm: number;
}

export interface SimSegment {
  move_index: number;
  type: SimMove["type"];
  distance_mm: number;
  time_sec: number;
  feed_mmmin: number;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  warning?: string;
}

export interface SimResult {
  total_time_sec: number;
  cutting_time_sec: number;
  rapid_time_sec: number;
  dwell_time_sec: number;
  total_distance_mm: number;
  cutting_distance_mm: number;
  rapid_distance_mm: number;
  feed_rate: { min: number; max: number; avg: number };
  axis_stats: { x: SimAxisStats; y: SimAxisStats; z: SimAxisStats };
  move_count: { total: number; rapid: number; feed: number; arc: number; plunge: number; retract: number; dwell: number };
  segments: SimSegment[];
  warnings: string[];
  rapid_safety: { total_rapids: number; rapids_near_stock: number; safe: boolean };
  estimated_mrr_mm3_per_min?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolpathSimulationEngine {
  simulate(moves: SimMove[], config: SimConfig = {}): SimResult {
    const rapidRate = config.rapid_rate_mmmin ?? 10000;
    const defaultFeed = config.feed_rate_mmmin ?? 1000;

    const segments: SimSegment[] = [];
    const warnings: string[] = [];
    let pos = { x: 0, y: 0, z: 0 };

    // Axis tracking
    const axisX = { travel: 0, min: 0, max: 0 };
    const axisY = { travel: 0, min: 0, max: 0 };
    const axisZ = { travel: 0, min: 0, max: 0 };

    // Time accumulators
    let cuttingTime = 0;
    let rapidTime = 0;
    let dwellTime = 0;
    let cuttingDist = 0;
    let rapidDist = 0;

    // Move counters
    const counts = { total: 0, rapid: 0, feed: 0, arc: 0, plunge: 0, retract: 0, dwell: 0 };

    // Feed tracking
    let feedMin = Infinity;
    let feedMax = 0;
    let feedSum = 0;
    let feedCount = 0;

    // Rapid safety
    let rapidsNearStock = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const to = {
        x: m.x ?? pos.x,
        y: m.y ?? pos.y,
        z: m.z ?? pos.z,
      };

      counts.total++;

      let dist: number;
      let feed: number;
      let time: number;
      let warning: string | undefined;

      if (m.type === "dwell") {
        dist = 0;
        feed = 0;
        time = m.dwell_sec ?? 0;
        dwellTime += time;
        counts.dwell++;
      } else if (m.type === "arc_cw" || m.type === "arc_ccw") {
        dist = this.arcLength(pos, to, m.i ?? 0, m.j ?? 0, m.r, m.type);
        feed = m.f ?? defaultFeed;
        time = dist / feed * 60; // feed is mm/min, time in sec
        cuttingTime += time;
        cuttingDist += dist;
        counts.arc++;
        this.trackFeed(feed);
        feedMin = Math.min(feedMin, feed);
        feedMax = Math.max(feedMax, feed);
        feedSum += feed;
        feedCount++;
      } else if (m.type === "rapid") {
        dist = this.linearDist(pos, to);
        feed = rapidRate;
        time = dist / rapidRate * 60;
        rapidTime += time;
        rapidDist += dist;
        counts.rapid++;

        // Check rapid safety against stock bounds
        if (config.stock_bounds && dist > 0) {
          if (this.moveNearBounds(pos, to, config.stock_bounds, 5)) {
            rapidsNearStock++;
            warning = `Rapid move #${i} passes within 5mm of stock bounds`;
            warnings.push(warning);
          }
        }
        if (config.fixture_bounds && dist > 0) {
          if (this.moveNearBounds(pos, to, config.fixture_bounds, 5)) {
            rapidsNearStock++;
            warning = `Rapid move #${i} passes within 5mm of fixture bounds`;
            warnings.push(warning);
          }
        }
      } else if (m.type === "plunge") {
        dist = Math.abs(to.z - pos.z);
        feed = m.f ?? defaultFeed * 0.5; // plunge at half feed by default
        time = dist / feed * 60;
        cuttingTime += time;
        cuttingDist += dist;
        counts.plunge++;
        feedMin = Math.min(feedMin, feed);
        feedMax = Math.max(feedMax, feed);
        feedSum += feed;
        feedCount++;
      } else if (m.type === "retract") {
        dist = Math.abs(to.z - pos.z);
        feed = rapidRate;
        time = dist / rapidRate * 60;
        rapidTime += time;
        rapidDist += dist;
        counts.retract++;
      } else {
        // feed move
        dist = this.linearDist(pos, to);
        feed = m.f ?? defaultFeed;
        time = feed > 0 ? dist / feed * 60 : 0;
        cuttingTime += time;
        cuttingDist += dist;
        counts.feed++;
        feedMin = Math.min(feedMin, feed);
        feedMax = Math.max(feedMax, feed);
        feedSum += feed;
        feedCount++;
      }

      // Track axis travel
      const dx = Math.abs(to.x - pos.x);
      const dy = Math.abs(to.y - pos.y);
      const dz = Math.abs(to.z - pos.z);
      axisX.travel += dx;
      axisY.travel += dy;
      axisZ.travel += dz;
      axisX.min = Math.min(axisX.min, to.x);
      axisX.max = Math.max(axisX.max, to.x);
      axisY.min = Math.min(axisY.min, to.y);
      axisY.max = Math.max(axisY.max, to.y);
      axisZ.min = Math.min(axisZ.min, to.z);
      axisZ.max = Math.max(axisZ.max, to.z);

      segments.push({
        move_index: i,
        type: m.type,
        distance_mm: Math.round(dist * 1000) / 1000,
        time_sec: Math.round(time * 1000) / 1000,
        feed_mmmin: Math.round(feed),
        from: { ...pos },
        to: { ...to },
        warning,
      });

      pos = to;
    }

    // MRR estimation (if tool diameter given)
    let estimatedMrr: number | undefined;
    if (config.tool_diameter && cuttingTime > 0) {
      // Rough MRR estimate: assume DOC = tool_dia * 0.5, stepover = tool_dia * 0.4
      const doc = config.tool_diameter * 0.5;
      const stepover = config.tool_diameter * 0.4;
      const avgFeed = feedCount > 0 ? feedSum / feedCount : defaultFeed;
      estimatedMrr = Math.round(doc * stepover * avgFeed / 60 * 100) / 100; // mm³/min
    }

    const totalTime = cuttingTime + rapidTime + dwellTime;

    return {
      total_time_sec: Math.round(totalTime * 100) / 100,
      cutting_time_sec: Math.round(cuttingTime * 100) / 100,
      rapid_time_sec: Math.round(rapidTime * 100) / 100,
      dwell_time_sec: Math.round(dwellTime * 100) / 100,
      total_distance_mm: Math.round((cuttingDist + rapidDist) * 100) / 100,
      cutting_distance_mm: Math.round(cuttingDist * 100) / 100,
      rapid_distance_mm: Math.round(rapidDist * 100) / 100,
      feed_rate: {
        min: feedMin === Infinity ? 0 : Math.round(feedMin),
        max: Math.round(feedMax),
        avg: feedCount > 0 ? Math.round(feedSum / feedCount) : 0,
      },
      axis_stats: {
        x: { travel_mm: Math.round(axisX.travel * 100) / 100, min_pos: axisX.min, max_pos: axisX.max, range_mm: axisX.max - axisX.min },
        y: { travel_mm: Math.round(axisY.travel * 100) / 100, min_pos: axisY.min, max_pos: axisY.max, range_mm: axisY.max - axisY.min },
        z: { travel_mm: Math.round(axisZ.travel * 100) / 100, min_pos: axisZ.min, max_pos: axisZ.max, range_mm: axisZ.max - axisZ.min },
      },
      move_count: counts,
      segments,
      warnings,
      rapid_safety: {
        total_rapids: counts.rapid,
        rapids_near_stock: rapidsNearStock,
        safe: rapidsNearStock === 0,
      },
      estimated_mrr_mm3_per_min: estimatedMrr,
    };
  }

  private linearDist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  private arcLength(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    i: number,
    j: number,
    r: number | undefined,
    direction: "arc_cw" | "arc_ccw",
  ): number {
    // Center = from + (i, j)
    const cx = from.x + i;
    const cy = from.y + j;
    const radius = r ?? Math.sqrt(i * i + j * j);
    if (radius <= 0) return this.linearDist(from, to);

    const startAngle = Math.atan2(from.y - cy, from.x - cx);
    const endAngle = Math.atan2(to.y - cy, to.x - cx);
    let sweep = direction === "arc_ccw"
      ? endAngle - startAngle
      : startAngle - endAngle;

    if (sweep < 0) sweep += 2 * Math.PI;
    if (sweep < 0.001 && this.linearDist(from, to) < 0.001) sweep = 2 * Math.PI;

    const arcDist2d = radius * sweep;
    const dz = Math.abs(to.z - from.z);
    return Math.sqrt(arcDist2d * arcDist2d + dz * dz);
  }

  private moveNearBounds(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
    margin: number,
  ): boolean {
    // Check if line segment passes within margin of AABB
    // Simplified: check endpoints and midpoint
    const points = [from, to, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 }];
    for (const p of points) {
      if (
        p.x >= bounds.min.x - margin && p.x <= bounds.max.x + margin &&
        p.y >= bounds.min.y - margin && p.y <= bounds.max.y + margin &&
        p.z >= bounds.min.z - margin && p.z <= bounds.max.z + margin
      ) {
        return true;
      }
    }
    return false;
  }

  private trackFeed(_feed: number): void {
    // placeholder for feed profiling extension
  }
}

export const toolpathSimulationEngine = new ToolpathSimulationEngine();
