/**
 * WEDMWireThreadingMinEngine
 * U-PROD-15: Minimizes wire threading operations
 *
 * Physics:
 * - Threading through pilot holes vs edge starts
 * - Wire threading time varies by material/thickness
 * - Sequential profiles can share threading when overlapping
 * - Submerged vs dry threading considerations
 */

export interface ThreadingProfile {
  id: string;
  start_point: { x: number; y: number };
  end_point: { x: number; y: number };
  has_pilot_hole: boolean;
  pilot_hole_diameter_mm?: number;
  material?: string;
  thickness_mm: number;
  is_submerged?: boolean;
}

export interface ThreadingInput {
  profiles: ThreadingProfile[];
  wire_diameter_mm?: number;
  base_threading_time_sec?: number;
  pilot_hole_time_factor?: number;
  submerged_time_factor?: number;
  thickness_time_factor_per_mm?: number;
  allow_sequence_threading?: boolean;
}

export interface ThreadingPlan {
  threading_operations: Array<{
    operation_id: number;
    profile_ids: string[];
    start_point: { x: number; y: number };
    threading_type: 'pilot_hole' | 'edge_start' | 'sequential';
    estimated_time_sec: number;
    notes: string;
  }>;
  total_threading_ops: number;
  total_threading_time_sec: number;
  saved_threading_ops: number;
  saved_time_sec: number;
  recommendations: string[];
}

export class WEDMWireThreadingMinEngine {
  private config = {
    base_threading_time_sec: 45,
    pilot_hole_time_factor: 0.4,
    submerged_time_factor: 1.3,
    thickness_time_factor_per_mm: 0.5,
    sequential_threshold_mm: 0.5,
    min_pilot_hole_clearance_mm: 0.1,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Calculate threading time for a single profile
   */
  calculateThreadingTime(profile: ThreadingProfile, input: ThreadingInput): number {
    const baseTime = input.base_threading_time_sec ?? this.config.base_threading_time_sec;
    let time = baseTime;

    // Pilot hole reduces threading time
    if (profile.has_pilot_hole) {
      const factor = input.pilot_hole_time_factor ?? this.config.pilot_hole_time_factor;
      time *= factor;
    }

    // Submerged threading takes longer
    if (profile.is_submerged) {
      const factor = input.submerged_time_factor ?? this.config.submerged_time_factor;
      time *= factor;
    }

    // Thickness adds time
    const thicknessFactor = input.thickness_time_factor_per_mm ?? this.config.thickness_time_factor_per_mm;
    time += profile.thickness_mm * thicknessFactor;

    return time;
  }

  /**
   * Check if two profiles can share a threading operation
   */
  canShareThreading(
    profile1: ThreadingProfile,
    profile2: ThreadingProfile,
    input: ThreadingInput
  ): boolean {
    if (!input.allow_sequence_threading) return false;

    // Check if end of profile1 is close to start of profile2
    const dx = profile1.end_point.x - profile2.start_point.x;
    const dy = profile1.end_point.y - profile2.start_point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.config.sequential_threshold_mm;
  }

  /**
   * Validate pilot hole clearance for wire
   */
  validatePilotHole(
    profile: ThreadingProfile,
    wireDiameter: number
  ): { valid: boolean; message?: string } {
    if (!profile.has_pilot_hole || !profile.pilot_hole_diameter_mm) {
      return { valid: true };
    }

    const clearance = (profile.pilot_hole_diameter_mm - wireDiameter) / 2;

    if (clearance < this.config.min_pilot_hole_clearance_mm) {
      return {
        valid: false,
        message: `Pilot hole ${profile.pilot_hole_diameter_mm}mm too small for ${wireDiameter}mm wire (need ${this.config.min_pilot_hole_clearance_mm}mm clearance)`,
      };
    }

    return { valid: true };
  }

  /**
   * Optimize threading operations
   */
  optimize(input: ThreadingInput): ThreadingPlan {
    const operations: ThreadingPlan['threading_operations'] = [];
    const wireDiameter = input.wire_diameter_mm ?? 0.25;
    const recommendations: string[] = [];

    let operationId = 1;
    let i = 0;

    while (i < input.profiles.length) {
      const profile = input.profiles[i];
      const profileIds = [profile.id];
      let sequentialCount = 0;

      // Check for sequential profiles that can share threading
      if (input.allow_sequence_threading !== false) {
        let j = i + 1;
        while (j < input.profiles.length) {
          const nextProfile = input.profiles[j];
          const prevProfile = input.profiles[j - 1];

          if (this.canShareThreading(prevProfile, nextProfile, input)) {
            profileIds.push(nextProfile.id);
            sequentialCount++;
            j++;
          } else {
            break;
          }
        }
      }

      // Validate pilot hole if present
      const pilotValidation = this.validatePilotHole(profile, wireDiameter);
      if (!pilotValidation.valid && pilotValidation.message) {
        recommendations.push(pilotValidation.message);
      }

      // Determine threading type
      let threadingType: 'pilot_hole' | 'edge_start' | 'sequential';
      let notes: string;

      if (sequentialCount > 0) {
        threadingType = 'sequential';
        notes = `Combined threading for ${profileIds.length} sequential profiles`;
      } else if (profile.has_pilot_hole) {
        threadingType = 'pilot_hole';
        notes = `Threading through ${profile.pilot_hole_diameter_mm ?? 'standard'}mm pilot hole`;
      } else {
        threadingType = 'edge_start';
        notes = 'Edge start threading';
      }

      // Calculate time (only charge for first profile in sequence)
      const time = this.calculateThreadingTime(profile, input);

      operations.push({
        operation_id: operationId++,
        profile_ids: profileIds,
        start_point: profile.start_point,
        threading_type: threadingType,
        estimated_time_sec: time,
        notes,
      });

      i += profileIds.length;
    }

    // Calculate savings
    const totalOps = operations.length;
    const savedOps = input.profiles.length - totalOps;
    const baselineTime = input.profiles.reduce((sum, p) =>
      sum + this.calculateThreadingTime(p, input), 0
    );
    const actualTime = operations.reduce((sum, op) => sum + op.estimated_time_sec, 0);
    const savedTime = baselineTime - actualTime;

    // Generate recommendations
    const nonPilotProfiles = input.profiles.filter(p => !p.has_pilot_hole);
    if (nonPilotProfiles.length > 0) {
      recommendations.push(`Consider adding pilot holes to ${nonPilotProfiles.length} profiles for faster threading`);
    }

    const submergedProfiles = input.profiles.filter(p => p.is_submerged);
    if (submergedProfiles.length > input.profiles.length / 2) {
      recommendations.push('Many submerged profiles - consider dry threading start if possible');
    }

    return {
      threading_operations: operations,
      total_threading_ops: totalOps,
      total_threading_time_sec: actualTime,
      saved_threading_ops: savedOps,
      saved_time_sec: Math.max(0, savedTime),
      recommendations,
    };
  }

  /**
   * Estimate total threading time for profiles
   */
  estimateTime(input: ThreadingInput): { total_sec: number; formatted: string } {
    const plan = this.optimize(input);
    const sec = plan.total_threading_time_sec;

    const min = Math.floor(sec / 60);
    const remSec = Math.round(sec % 60);

    return {
      total_sec: sec,
      formatted: min > 0 ? `${min}m ${remSec}s` : `${remSec}s`,
    };
  }
}

export const wedmWireThreadingMinEngine = new WEDMWireThreadingMinEngine();
