/**
 * Toolpath Linking Engine
 *
 * Minimizes non-cutting motion by optimizing path ordering,
 * stay-down linking, and rapid path planning.
 *
 * Features:
 * - Nearest-neighbor and 2-opt path ordering (TSP-style)
 * - Stay-down linking (connect at cut depth when safe)
 * - Rapid path optimization (shortest safe rapids)
 * - Retract minimization
 * - Link distance and time estimation
 *
 * Sources:
 * - SolidCAM PRISM CAM Algorithms Roadmap Session 2.10
 * - hyperMILL clearance plane + linking strategy
 *
 * @module engines/ToolpathLinkingEngine
 */

import { log } from "../utils/Logger.js";

// ── Types ─────────────────────────────────────────────────────────

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PathSegment {
  id: string;
  start: Point3D;
  end: Point3D;
  z_level: number;
  length: number;          // cutting length
}

export interface LinkingConfig {
  clearance_height: number;         // mm (safe Z for rapids)
  retract_height: number;           // mm (incremental retract above part)
  stay_down_max_distance?: number;  // mm (max distance for stay-down link)
  rapid_feed?: number;              // mm/min (for time estimation)
  cutting_feed?: number;            // mm/min (for time estimation)
  allow_stay_down?: boolean;        // default true
  link_method?: "nearest" | "optimized" | "sequential";
}

export interface LinkingResult {
  ordered_segments: string[];       // segment IDs in execution order
  links: Array<{
    from_id: string;
    to_id: string;
    type: "stay_down" | "retract" | "rapid" | "same_level";
    distance: number;
    time_s: number;
  }>;
  total_rapid_distance: number;
  total_rapid_time_s: number;
  total_cutting_distance: number;
  retracts_count: number;
  stay_down_count: number;
  savings_vs_sequential_pct: number;
}

// ── Engine ────────────────────────────────────────────────────────

export class ToolpathLinkingEngine {

  /**
   * Optimize segment ordering to minimize non-cutting motion.
   */
  optimizeLinking(segments: PathSegment[], config: LinkingConfig): LinkingResult {
    const {
      clearance_height,
      retract_height,
      stay_down_max_distance = 50,
      rapid_feed = 10000,
      cutting_feed = 2000,
      allow_stay_down = true,
      link_method = "optimized",
    } = config;

    if (segments.length === 0) {
      return this.emptyResult();
    }

    // Order segments
    let ordered: PathSegment[];
    if (link_method === "sequential") {
      ordered = [...segments];
    } else if (link_method === "nearest") {
      ordered = this.nearestNeighborOrder(segments);
    } else {
      ordered = this.nearestNeighborOrder(segments);
      if (segments.length <= 50) {
        ordered = this.twoOptImprove(ordered);
      }
    }

    // Calculate links between consecutive segments
    const links: LinkingResult["links"] = [];
    let totalRapidDist = 0;
    let totalRapidTime = 0;
    let totalCuttingDist = 0;
    let retractCount = 0;
    let stayDownCount = 0;

    for (let i = 0; i < ordered.length - 1; i++) {
      const from = ordered[i];
      const to = ordered[i + 1];

      const xyDist = this.dist2D(from.end, to.start);
      const sameLevel = Math.abs(from.z_level - to.z_level) < 0.01;

      let linkType: "stay_down" | "retract" | "rapid" | "same_level";
      let linkDist: number;
      let linkTime: number;

      if (sameLevel && xyDist < stay_down_max_distance && allow_stay_down) {
        // Stay-down link — traverse at cut depth
        linkType = "stay_down";
        linkDist = xyDist;
        linkTime = (xyDist / cutting_feed) * 60;
        stayDownCount++;
      } else if (sameLevel && xyDist < 5) {
        // Very close on same level — direct link
        linkType = "same_level";
        linkDist = xyDist;
        linkTime = (xyDist / cutting_feed) * 60;
      } else {
        // Retract to clearance, rapid, plunge
        const retractDist = Math.abs(from.end.z - clearance_height) + Math.abs(clearance_height - to.start.z);
        linkDist = retractDist + xyDist;
        linkTime = (retractDist / rapid_feed) * 60 + (xyDist / rapid_feed) * 60;
        linkType = "retract";
        retractCount++;
      }

      links.push({
        from_id: from.id,
        to_id: to.id,
        type: linkType,
        distance: Math.round(linkDist * 10) / 10,
        time_s: Math.round(linkTime * 100) / 100,
      });

      totalRapidDist += linkDist;
      totalRapidTime += linkTime;
    }

    // Total cutting distance
    for (const seg of ordered) {
      totalCuttingDist += seg.length;
    }

    // Calculate savings vs sequential (no optimization)
    const sequentialRapidDist = this.calculateSequentialRapidDist(segments, clearance_height);
    const savingsPct = sequentialRapidDist > 0
      ? ((sequentialRapidDist - totalRapidDist) / sequentialRapidDist) * 100
      : 0;

    log.debug(`[ToolpathLink] ${segments.length} segs, ${retractCount} retracts, ${stayDownCount} stay-down, ${savingsPct.toFixed(0)}% savings`);

    return {
      ordered_segments: ordered.map(s => s.id),
      links,
      total_rapid_distance: Math.round(totalRapidDist * 10) / 10,
      total_rapid_time_s: Math.round(totalRapidTime * 100) / 100,
      total_cutting_distance: Math.round(totalCuttingDist * 10) / 10,
      retracts_count: retractCount,
      stay_down_count: stayDownCount,
      savings_vs_sequential_pct: Math.round(savingsPct * 10) / 10,
    };
  }

  /**
   * Nearest-neighbor ordering (greedy TSP).
   */
  private nearestNeighborOrder(segments: PathSegment[]): PathSegment[] {
    if (segments.length <= 1) return [...segments];

    const remaining = new Set(segments.map((_, i) => i));
    const ordered: PathSegment[] = [];

    // Start from segment closest to origin
    let bestFirst = 0;
    let bestDist = Infinity;
    for (const i of remaining) {
      const d = this.dist2D(segments[i].start, { x: 0, y: 0, z: 0 });
      if (d < bestDist) {
        bestDist = d;
        bestFirst = i;
      }
    }

    let current = bestFirst;
    remaining.delete(current);
    ordered.push(segments[current]);

    while (remaining.size > 0) {
      let nearest = -1;
      let nearestDist = Infinity;

      for (const i of remaining) {
        const d = this.dist2D(segments[current].end, segments[i].start);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      }

      if (nearest >= 0) {
        remaining.delete(nearest);
        ordered.push(segments[nearest]);
        current = nearest;
      }
    }

    return ordered;
  }

  /**
   * 2-opt improvement on path ordering.
   */
  private twoOptImprove(segments: PathSegment[]): PathSegment[] {
    if (segments.length <= 3) return segments;

    const order = [...segments];
    let improved = true;
    let iterations = 0;
    const maxIter = Math.min(segments.length * segments.length, 2500);

    while (improved && iterations < maxIter) {
      improved = false;
      iterations++;

      for (let i = 0; i < order.length - 2; i++) {
        for (let j = i + 2; j < order.length; j++) {
          const d1 = this.dist2D(order[i].end, order[i + 1].start)
                   + this.dist2D(order[j].end, j + 1 < order.length ? order[j + 1].start : order[j].end);
          const d2 = this.dist2D(order[i].end, order[j].start)
                   + this.dist2D(order[i + 1].end, j + 1 < order.length ? order[j + 1].start : order[i + 1].end);

          if (d2 < d1 - 0.01) {
            // Reverse segment i+1..j
            const reversed = order.slice(i + 1, j + 1).reverse();
            order.splice(i + 1, j - i, ...reversed);
            improved = true;
          }
        }
      }
    }

    return order;
  }

  /**
   * 2D distance between points.
   */
  private dist2D(a: Point3D, b: Point3D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Calculate rapid distance for sequential (unoptimized) order.
   */
  private calculateSequentialRapidDist(segments: PathSegment[], clearanceZ: number): number {
    let dist = 0;
    for (let i = 0; i < segments.length - 1; i++) {
      const from = segments[i].end;
      const to = segments[i + 1].start;
      dist += Math.abs(from.z - clearanceZ) + this.dist2D(from, to) + Math.abs(clearanceZ - to.z);
    }
    return dist;
  }

  /**
   * Empty result for zero-segment input.
   */
  private emptyResult(): LinkingResult {
    return {
      ordered_segments: [],
      links: [],
      total_rapid_distance: 0,
      total_rapid_time_s: 0,
      total_cutting_distance: 0,
      retracts_count: 0,
      stay_down_count: 0,
      savings_vs_sequential_pct: 0,
    };
  }

  /**
   * Estimate time savings from linking optimization.
   */
  estimateTimeSavings(
    segments: PathSegment[],
    config: LinkingConfig,
  ): { sequential_time_s: number; optimized_time_s: number; savings_s: number; savings_pct: number } {
    const rapidFeed = config.rapid_feed ?? 10000;

    // Sequential
    const seqDist = this.calculateSequentialRapidDist(segments, config.clearance_height);
    const seqTime = (seqDist / rapidFeed) * 60;

    // Optimized
    const result = this.optimizeLinking(segments, config);
    const optTime = result.total_rapid_time_s;

    return {
      sequential_time_s: Math.round(seqTime * 100) / 100,
      optimized_time_s: Math.round(optTime * 100) / 100,
      savings_s: Math.round((seqTime - optTime) * 100) / 100,
      savings_pct: Math.round(result.savings_vs_sequential_pct * 10) / 10,
    };
  }
}

export const toolpathLinkingEngine = new ToolpathLinkingEngine();
