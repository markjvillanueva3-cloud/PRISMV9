/**
 * ToolpathSegmentOptimizerEngine — Segment-level feed/speed optimization.
 *
 * Takes a toolpath as a sequence of segments (linear/arc moves) and optimizes
 * feed rate per segment based on local engagement, curvature, and physics limits.
 *
 * Uses: Kienzle force model, machine jerk limits, curvature-based deceleration,
 * chip thinning compensation, and corner slowdown.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface ToolpathSegment {
  id: number;
  type: "linear" | "arc_cw" | "arc_ccw" | "rapid";
  start: [number, number, number];
  end: [number, number, number];
  arc_center?: [number, number];
  arc_radius?: number;
  programmed_feed_mmmin: number;
  radial_depth_mm: number;  // ae — local stepover/engagement
  axial_depth_mm: number;   // ap — local stepdown
}

export interface SegmentOptInput {
  segments: ToolpathSegment[];
  tool: {
    diameter_mm: number;
    flute_count: number;
    max_chipload_mm: number;
    min_chipload_mm: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    kc11_mpa?: number;
  };
  machine: {
    max_feed_mmmin: number;
    max_rpm: number;
    spindle_rpm: number;
    max_power_kw: number;
    max_jerk_m_s3?: number;
    lookahead_blocks?: number;
  };
  constraints?: {
    max_force_n?: number;
    max_deflection_mm?: number;
    target_surface_finish_um?: number;
  };
}

export interface OptimizedSegment {
  id: number;
  original_feed_mmmin: number;
  optimized_feed_mmmin: number;
  feed_change_pct: number;
  limiting_factor: string;
  chipload_mm: number;
  cutting_force_n: number;
  power_kw: number;
  mrr_cm3_min: number;
}

export interface SegmentOptResult {
  segments: OptimizedSegment[];
  summary: {
    total_segments: number;
    segments_increased: number;
    segments_decreased: number;
    segments_unchanged: number;
    avg_feed_change_pct: number;
    estimated_time_original_s: number;
    estimated_time_optimized_s: number;
    time_savings_pct: number;
    peak_force_n: number;
    peak_power_kw: number;
  };
  bottleneck_segments: number[];
}

const KC11: Record<string, number> = {
  P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000,
};

export class ToolpathSegmentOptimizerEngine {
  compute(input: SegmentOptInput): AtomicValue<SegmentOptResult> {
    const { segments, tool, material, machine, constraints } = input;
    const kc11 = material.kc11_mpa || KC11[material.iso_group] || 2100;
    const mc = 0.25;

    const optimized: OptimizedSegment[] = [];
    let totalOrigTime = 0;
    let totalOptTime = 0;

    for (const seg of segments) {
      if (seg.type === "rapid") {
        optimized.push({
          id: seg.id,
          original_feed_mmmin: seg.programmed_feed_mmmin,
          optimized_feed_mmmin: seg.programmed_feed_mmmin,
          feed_change_pct: 0,
          limiting_factor: "rapid",
          chipload_mm: 0,
          cutting_force_n: 0,
          power_kw: 0,
          mrr_cm3_min: 0,
        });
        const dist = this.segLength(seg);
        totalOrigTime += dist / seg.programmed_feed_mmmin * 60;
        totalOptTime += dist / seg.programmed_feed_mmmin * 60;
        continue;
      }

      const ae = seg.radial_depth_mm;
      const ap = seg.axial_depth_mm;

      // Chip thinning factor: actual chipload is thinner when ae < D/2
      const engagementRatio = ae / tool.diameter_mm;
      const chipThinFactor = engagementRatio < 0.5
        ? 1 / Math.sqrt(2 * engagementRatio)
        : 1;

      // Curvature-based deceleration for arcs
      let curvFactor = 1.0;
      if ((seg.type === "arc_cw" || seg.type === "arc_ccw") && seg.arc_radius) {
        // Centripetal acceleration limit: v² / r ≤ a_max
        // Approximate max feed from jerk and radius
        const jerk = machine.max_jerk_m_s3 || 50; // m/s³ default
        const maxArcFeed = Math.sqrt(jerk * (seg.arc_radius / 1000)) * 60000; // mm/min
        curvFactor = Math.min(1.0, maxArcFeed / seg.programmed_feed_mmmin);
      }

      // Direction change deceleration (lookahead simulation)
      let dirChangeFactor = 1.0;
      const segIdx = segments.indexOf(seg);
      if (segIdx > 0 && segIdx < segments.length - 1) {
        const prev = segments[segIdx - 1];
        const angle = this.directionAngle(prev, seg);
        if (angle > 15) {
          // Decelerate proportional to direction change
          dirChangeFactor = Math.max(0.3, 1 - (angle / 180) * 0.7);
        }
      }

      // Max feed from chipload limit
      const maxChiploadFeed = tool.max_chipload_mm * chipThinFactor * tool.flute_count * machine.spindle_rpm;

      // Min feed from minimum chipload (avoid rubbing)
      const minChiploadFeed = tool.min_chipload_mm * chipThinFactor * tool.flute_count * machine.spindle_rpm;

      // Force-limited feed
      let forceLimitedFeed = Infinity;
      if (constraints?.max_force_n) {
        // Fc = kc11 * ap * hm * hm^(-mc)
        // hm = fz * sqrt(ae/D)
        // Solve for fz given max Fc
        const hmFactor = Math.sqrt(ae / tool.diameter_mm);
        // Fc = kc11 * ap * (fz * hmFactor) * (fz * hmFactor)^(-mc)
        // Fc = kc11 * ap * fz^(1-mc) * hmFactor^(1-mc)
        const maxFz = Math.pow(
          constraints.max_force_n / (kc11 * ap * Math.pow(hmFactor, 1 - mc)),
          1 / (1 - mc)
        );
        forceLimitedFeed = maxFz * tool.flute_count * machine.spindle_rpm;
      }

      // Power-limited feed
      const vc = Math.PI * tool.diameter_mm * machine.spindle_rpm / 1000; // m/min
      const powerLimitFeed = this.powerLimitedFeed(
        machine.max_power_kw, kc11, mc, ap, ae, tool, machine.spindle_rpm, vc
      );

      // Combine all limits
      const limits: Array<[number, string]> = [
        [maxChiploadFeed, "max_chipload"],
        [forceLimitedFeed, "max_force"],
        [powerLimitFeed, "max_power"],
        [machine.max_feed_mmmin, "machine_limit"],
        [seg.programmed_feed_mmmin * curvFactor, "curvature"],
        [seg.programmed_feed_mmmin * dirChangeFactor, "direction_change"],
      ];

      // Find the most restrictive limit
      let optFeed = Infinity;
      let limitingFactor = "none";
      for (const [feed, factor] of limits) {
        if (feed < optFeed) {
          optFeed = feed;
          limitingFactor = factor;
        }
      }

      // Apply chip thinning compensation (increase feed where engagement is shallow)
      if (chipThinFactor > 1.05 && limitingFactor !== "max_chipload" && limitingFactor !== "max_force") {
        const compensated = seg.programmed_feed_mmmin * chipThinFactor;
        if (compensated < optFeed) {
          optFeed = compensated;
          limitingFactor = "chip_thinning_comp";
        }
      }

      // Ensure minimum feed
      optFeed = Math.max(optFeed, minChiploadFeed);

      // Compute actual physics at optimized feed
      const fz = optFeed / (tool.flute_count * machine.spindle_rpm);
      const hm = fz * Math.sqrt(ae / tool.diameter_mm);
      const Fc = kc11 * ap * hm * Math.pow(hm, -mc);
      const power = (Fc * vc) / 60000;
      const mrr = (ap * ae * optFeed) / 1000;

      const changePct = ((optFeed - seg.programmed_feed_mmmin) / seg.programmed_feed_mmmin) * 100;
      optimized.push({
        id: seg.id,
        original_feed_mmmin: Math.round(seg.programmed_feed_mmmin),
        optimized_feed_mmmin: Math.round(optFeed),
        feed_change_pct: Math.round(changePct * 10) / 10,
        limiting_factor: limitingFactor,
        chipload_mm: Math.round(fz * 10000) / 10000,
        cutting_force_n: Math.round(Fc),
        power_kw: Math.round(power * 100) / 100,
        mrr_cm3_min: Math.round(mrr * 100) / 100,
      });

      const dist = this.segLength(seg);
      totalOrigTime += dist / seg.programmed_feed_mmmin * 60;
      totalOptTime += dist / optFeed * 60;
    }

    const increased = optimized.filter(s => s.feed_change_pct > 1).length;
    const decreased = optimized.filter(s => s.feed_change_pct < -1).length;
    const unchanged = optimized.length - increased - decreased;
    const avgChange = optimized.length > 0
      ? optimized.reduce((s, o) => s + o.feed_change_pct, 0) / optimized.length
      : 0;

    // Find bottleneck segments (lowest feed relative to neighbors)
    const bottlenecks = optimized
      .filter((s, i) => {
        if (i === 0 || i === optimized.length - 1) return false;
        return s.optimized_feed_mmmin < optimized[i - 1].optimized_feed_mmmin * 0.6 &&
               s.optimized_feed_mmmin < optimized[i + 1].optimized_feed_mmmin * 0.6;
      })
      .map(s => s.id);

    const result: SegmentOptResult = {
      segments: optimized,
      summary: {
        total_segments: optimized.length,
        segments_increased: increased,
        segments_decreased: decreased,
        segments_unchanged: unchanged,
        avg_feed_change_pct: Math.round(avgChange * 10) / 10,
        estimated_time_original_s: Math.round(totalOrigTime * 10) / 10,
        estimated_time_optimized_s: Math.round(totalOptTime * 10) / 10,
        time_savings_pct: Math.round((1 - totalOptTime / totalOrigTime) * 1000) / 10,
        peak_force_n: Math.max(...optimized.map(s => s.cutting_force_n)),
        peak_power_kw: Math.max(...optimized.map(s => s.power_kw)),
      },
      bottleneck_segments: bottlenecks,
    };

    return {
      value: result,
      unit: "optimized_toolpath",
      formula: "Kienzle+chip_thinning+curvature_decel",
      confidence: 0.85,
    };
  }

  private segLength(seg: ToolpathSegment): number {
    const dx = seg.end[0] - seg.start[0];
    const dy = seg.end[1] - seg.start[1];
    const dz = seg.end[2] - seg.start[2];
    if (seg.type === "linear" || seg.type === "rapid") {
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    // Arc length approximation
    if (seg.arc_radius) {
      const chord = Math.sqrt(dx * dx + dy * dy);
      const halfAngle = Math.asin(Math.min(1, chord / (2 * seg.arc_radius)));
      return 2 * halfAngle * seg.arc_radius;
    }
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private directionAngle(prev: ToolpathSegment, curr: ToolpathSegment): number {
    const v1 = [prev.end[0] - prev.start[0], prev.end[1] - prev.start[1]];
    const v2 = [curr.end[0] - curr.start[0], curr.end[1] - curr.start[1]];
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    if (mag1 < 0.001 || mag2 < 0.001) return 0;
    const cosA = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosA) * (180 / Math.PI);
  }

  private powerLimitedFeed(
    maxPower: number, kc11: number, mc: number,
    ap: number, ae: number, tool: { diameter_mm: number; flute_count: number },
    rpm: number, vc: number
  ): number {
    // Binary search for max feed that keeps power ≤ limit
    let lo = 10, hi = 50000;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const fz = mid / (tool.flute_count * rpm);
      const hm = fz * Math.sqrt(ae / tool.diameter_mm);
      const Fc = kc11 * ap * hm * Math.pow(hm, -mc);
      const power = (Fc * vc) / 60000;
      if (power > maxPower) hi = mid;
      else lo = mid;
    }
    return lo;
  }
}

export const toolpathSegmentOptimizerEngine = new ToolpathSegmentOptimizerEngine();
