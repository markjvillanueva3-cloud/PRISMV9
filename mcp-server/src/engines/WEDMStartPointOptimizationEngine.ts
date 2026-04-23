/**
 * WEDMStartPointOptimizationEngine
 * U-PROD-13: Optimizes wire threading start points for WEDM
 *
 * Physics:
 * - Minimizes wire travel distance between profiles
 * - Avoids starting at sharp corners (stress concentration)
 * - Prefers start points near existing pilot holes
 * - Considers wire threading time vs cutting time tradeoff
 */

export interface StartPoint {
  x: number;
  y: number;
  profile_id: string;
  is_pilot_hole?: boolean;
  corner_angle_deg?: number;
  threading_difficulty?: 'easy' | 'moderate' | 'difficult';
}

export interface Profile {
  id: string;
  segments: Array<{
    type: 'line' | 'arc';
    start: { x: number; y: number };
    end: { x: number; y: number };
    center?: { x: number; y: number };
    radius?: number;
  }>;
  pilot_holes?: Array<{ x: number; y: number }>;
  is_closed: boolean;
}

export interface StartPointOptimizationInput {
  profiles: Profile[];
  machine_position?: { x: number; y: number };
  wire_threading_time_sec?: number;
  rapid_rate_mm_min?: number;
  prefer_pilot_holes?: boolean;
  avoid_sharp_corners?: boolean;
  sharp_corner_threshold_deg?: number;
}

export interface OptimizedStartPoint extends StartPoint {
  sequence_order: number;
  travel_distance_mm: number;
  estimated_threading_time_sec: number;
  rationale: string;
}

export interface StartPointOptimizationResult {
  optimized_starts: OptimizedStartPoint[];
  total_travel_distance_mm: number;
  total_threading_time_sec: number;
  estimated_savings_percent: number;
  optimization_notes: string[];
}

export class WEDMStartPointOptimizationEngine {
  private config = {
    default_threading_time_sec: 30,
    rapid_rate_mm_min: 5000,
    sharp_corner_threshold_deg: 60,
    pilot_hole_threading_factor: 0.5,
    difficult_threading_factor: 2.0,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Calculate distance between two points
   */
  distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Calculate angle at a vertex (in degrees)
   */
  calculateCornerAngle(
    prev: { x: number; y: number },
    vertex: { x: number; y: number },
    next: { x: number; y: number }
  ): number {
    const v1 = { x: prev.x - vertex.x, y: prev.y - vertex.y };
    const v2 = { x: next.x - vertex.x, y: next.y - vertex.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    if (mag1 === 0 || mag2 === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }

  /**
   * Find all candidate start points for a profile
   */
  findCandidateStartPoints(profile: Profile): StartPoint[] {
    const candidates: StartPoint[] = [];

    // Add pilot holes as candidates (preferred)
    if (profile.pilot_holes) {
      for (const hole of profile.pilot_holes) {
        candidates.push({
          x: hole.x,
          y: hole.y,
          profile_id: profile.id,
          is_pilot_hole: true,
          threading_difficulty: 'easy',
        });
      }
    }

    // Add segment endpoints as candidates
    for (let i = 0; i < profile.segments.length; i++) {
      const seg = profile.segments[i];
      const prevSeg = profile.segments[(i - 1 + profile.segments.length) % profile.segments.length];
      const nextSeg = profile.segments[(i + 1) % profile.segments.length];

      // Calculate corner angle at start point
      let cornerAngle = 180;
      if (profile.is_closed && profile.segments.length > 1) {
        cornerAngle = this.calculateCornerAngle(prevSeg.start, seg.start, seg.end);
      }

      candidates.push({
        x: seg.start.x,
        y: seg.start.y,
        profile_id: profile.id,
        is_pilot_hole: false,
        corner_angle_deg: cornerAngle,
        threading_difficulty: cornerAngle < this.config.sharp_corner_threshold_deg ? 'difficult' : 'moderate',
      });
    }

    return candidates;
  }

  /**
   * Score a candidate start point (lower is better)
   */
  scoreCandidate(
    candidate: StartPoint,
    fromPosition: { x: number; y: number },
    input: StartPointOptimizationInput
  ): number {
    let score = 0;

    // Distance penalty
    const dist = this.distance(fromPosition, candidate);
    score += dist;

    // Pilot hole bonus (reduce score)
    if (candidate.is_pilot_hole && input.prefer_pilot_holes !== false) {
      score *= 0.5;
    }

    // Sharp corner penalty
    if (input.avoid_sharp_corners !== false && candidate.corner_angle_deg !== undefined) {
      if (candidate.corner_angle_deg < this.config.sharp_corner_threshold_deg) {
        score *= 1.5;
      }
    }

    // Threading difficulty penalty
    if (candidate.threading_difficulty === 'difficult') {
      score *= 1.3;
    }

    return score;
  }

  /**
   * Optimize start point sequence using greedy nearest-neighbor with scoring
   */
  optimize(input: StartPointOptimizationInput): StartPointOptimizationResult {
    const startPosition = input.machine_position ?? { x: 0, y: 0 };
    const threadingTime = input.wire_threading_time_sec ?? this.config.default_threading_time_sec;
    const rapidRate = input.rapid_rate_mm_min ?? this.config.rapid_rate_mm_min;

    // Gather all candidates per profile
    const profileCandidates = new Map<string, StartPoint[]>();
    for (const profile of input.profiles) {
      const candidates = this.findCandidateStartPoints(profile);
      if (candidates.length > 0) {
        profileCandidates.set(profile.id, candidates);
      }
    }

    // Greedy optimization: pick best candidate from nearest unvisited profile
    const optimized: OptimizedStartPoint[] = [];
    const visited = new Set<string>();
    let currentPos = startPosition;
    let sequenceOrder = 1;
    let totalTravel = 0;
    let totalThreading = 0;

    while (visited.size < profileCandidates.size) {
      let bestCandidate: StartPoint | null = null;
      let bestScore = Infinity;

      // Find best unvisited candidate
      for (const [profileId, candidates] of profileCandidates) {
        if (visited.has(profileId)) continue;

        for (const candidate of candidates) {
          const score = this.scoreCandidate(candidate, currentPos, input);
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = candidate;
          }
        }
      }

      if (!bestCandidate) break;

      // Calculate metrics
      const travelDist = this.distance(currentPos, bestCandidate);
      let threadTime = threadingTime;

      if (bestCandidate.is_pilot_hole) {
        threadTime *= this.config.pilot_hole_threading_factor;
      } else if (bestCandidate.threading_difficulty === 'difficult') {
        threadTime *= this.config.difficult_threading_factor;
      }

      // Build rationale
      const rationales: string[] = [];
      if (bestCandidate.is_pilot_hole) {
        rationales.push('pilot hole available');
      }
      if (bestCandidate.corner_angle_deg !== undefined &&
          bestCandidate.corner_angle_deg >= this.config.sharp_corner_threshold_deg) {
        rationales.push('avoids sharp corner');
      }
      if (travelDist < 10) {
        rationales.push('minimal travel');
      }

      optimized.push({
        ...bestCandidate,
        sequence_order: sequenceOrder++,
        travel_distance_mm: travelDist,
        estimated_threading_time_sec: threadTime,
        rationale: rationales.length > 0 ? rationales.join(', ') : 'best available option',
      });

      totalTravel += travelDist;
      totalThreading += threadTime;
      currentPos = bestCandidate;
      visited.add(bestCandidate.profile_id);
    }

    // Calculate baseline (unoptimized) for savings estimate
    const baselineTravel = this.calculateUnoptimizedTravel(input.profiles, startPosition);
    const savings = baselineTravel > 0
      ? ((baselineTravel - totalTravel) / baselineTravel) * 100
      : 0;

    // Generate notes
    const notes: string[] = [];
    const pilotHoleStarts = optimized.filter(o => o.is_pilot_hole).length;
    if (pilotHoleStarts > 0) {
      notes.push(`${pilotHoleStarts} start points use pilot holes`);
    }
    const sharpCornerStarts = optimized.filter(o =>
      o.corner_angle_deg !== undefined && o.corner_angle_deg < this.config.sharp_corner_threshold_deg
    ).length;
    if (sharpCornerStarts > 0) {
      notes.push(`${sharpCornerStarts} starts at sharp corners (unavoidable)`);
    }
    if (savings > 10) {
      notes.push(`Optimization saved ${savings.toFixed(1)}% travel distance`);
    }

    return {
      optimized_starts: optimized,
      total_travel_distance_mm: totalTravel,
      total_threading_time_sec: totalThreading,
      estimated_savings_percent: Math.max(0, savings),
      optimization_notes: notes,
    };
  }

  /**
   * Calculate travel distance with no optimization (profile order as given)
   */
  private calculateUnoptimizedTravel(profiles: Profile[], start: { x: number; y: number }): number {
    let total = 0;
    let pos = start;

    for (const profile of profiles) {
      if (profile.segments.length > 0) {
        const firstPoint = profile.segments[0].start;
        total += this.distance(pos, firstPoint);
        pos = firstPoint;
      }
    }

    return total;
  }
}

export const wedmStartPointOptimizationEngine = new WEDMStartPointOptimizationEngine();
