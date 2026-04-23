/**
 * WEDMMultiProfileBatchEngine
 * U-PROD-14: Batch processing for multiple WEDM profiles
 *
 * Features:
 * - Groups similar profiles for consistent parameters
 * - Optimizes cutting sequence across profiles
 * - Manages wire consumption across batch
 * - Tracks progress and provides ETAs
 */

export interface BatchProfile {
  id: string;
  name?: string;
  material?: string;
  thickness_mm: number;
  perimeter_mm: number;
  area_mm2?: number;
  cut_type: 'rough' | 'skim' | 'finish';
  priority?: 'high' | 'normal' | 'low';
  pass_count?: number;
}

export interface BatchGroup {
  group_id: string;
  profiles: BatchProfile[];
  shared_material: string;
  shared_thickness_mm: number;
  shared_cut_type: string;
  total_perimeter_mm: number;
  estimated_cut_time_min: number;
}

export interface BatchInput {
  profiles: BatchProfile[];
  grouping_strategy?: 'material_thickness' | 'cut_type' | 'priority' | 'none';
  wire_spool_length_m?: number;
  wire_consumption_rate_m_per_mm?: number;
  cutting_speed_mm_min?: number;
  include_skim_passes?: boolean;
}

export interface BatchResult {
  groups: BatchGroup[];
  cutting_sequence: Array<{
    sequence: number;
    profile_id: string;
    group_id: string;
    estimated_start_min: number;
    estimated_duration_min: number;
  }>;
  total_profiles: number;
  total_groups: number;
  total_perimeter_mm: number;
  total_cut_time_min: number;
  wire_required_m: number;
  wire_changes_needed: number;
  batch_efficiency_percent: number;
}

export class WEDMMultiProfileBatchEngine {
  private config = {
    default_cutting_speed_mm_min: 2.5,
    wire_spool_length_m: 5000,
    wire_consumption_rate_m_per_mm: 0.001,
    skim_pass_speed_factor: 3.0,
    group_thickness_tolerance_mm: 0.5,
    setup_time_per_group_min: 5,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Group profiles by similarity
   */
  groupProfiles(profiles: BatchProfile[], strategy: string): BatchGroup[] {
    if (strategy === 'none') {
      // Each profile in its own group
      return profiles.map((p, i) => ({
        group_id: `G${i + 1}`,
        profiles: [p],
        shared_material: p.material ?? 'unknown',
        shared_thickness_mm: p.thickness_mm,
        shared_cut_type: p.cut_type,
        total_perimeter_mm: p.perimeter_mm,
        estimated_cut_time_min: 0,
      }));
    }

    const groups = new Map<string, BatchProfile[]>();

    for (const profile of profiles) {
      let key: string;

      switch (strategy) {
        case 'material_thickness':
          const thicknessGroup = Math.round(profile.thickness_mm / this.config.group_thickness_tolerance_mm)
            * this.config.group_thickness_tolerance_mm;
          key = `${profile.material ?? 'unknown'}_${thicknessGroup}`;
          break;
        case 'cut_type':
          key = profile.cut_type;
          break;
        case 'priority':
          key = profile.priority ?? 'normal';
          break;
        default:
          key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(profile);
    }

    // Convert to BatchGroup array
    const result: BatchGroup[] = [];
    let groupNum = 1;

    for (const [, groupProfiles] of groups) {
      const totalPerimeter = groupProfiles.reduce((sum, p) => sum + p.perimeter_mm, 0);

      result.push({
        group_id: `G${groupNum++}`,
        profiles: groupProfiles,
        shared_material: groupProfiles[0].material ?? 'unknown',
        shared_thickness_mm: groupProfiles[0].thickness_mm,
        shared_cut_type: groupProfiles[0].cut_type,
        total_perimeter_mm: totalPerimeter,
        estimated_cut_time_min: 0,
      });
    }

    return result;
  }

  /**
   * Sort groups for optimal cutting sequence
   */
  sortGroups(groups: BatchGroup[]): BatchGroup[] {
    return [...groups].sort((a, b) => {
      // Priority order: high priority first, then by cut type (rough before skim before finish)
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const cutOrder = { rough: 0, skim: 1, finish: 2 };

      // Check if any profile in group has high priority
      const aPriority = a.profiles.some(p => p.priority === 'high') ? 'high' :
                       a.profiles.some(p => p.priority === 'low') ? 'low' : 'normal';
      const bPriority = b.profiles.some(p => p.priority === 'high') ? 'high' :
                       b.profiles.some(p => p.priority === 'low') ? 'low' : 'normal';

      const priorityDiff = priorityOrder[aPriority] - priorityOrder[bPriority];
      if (priorityDiff !== 0) return priorityDiff;

      return cutOrder[a.shared_cut_type as keyof typeof cutOrder] -
             cutOrder[b.shared_cut_type as keyof typeof cutOrder];
    });
  }

  /**
   * Calculate cutting time for a profile
   */
  calculateCutTime(profile: BatchProfile, cuttingSpeed: number): number {
    let speed = cuttingSpeed;

    // Skim/finish passes are faster
    if (profile.cut_type === 'skim') {
      speed *= this.config.skim_pass_speed_factor;
    } else if (profile.cut_type === 'finish') {
      speed *= this.config.skim_pass_speed_factor * 0.8;
    }

    const passCount = profile.pass_count ?? 1;
    return (profile.perimeter_mm * passCount) / speed;
  }

  /**
   * Process batch and generate cutting plan
   */
  processBatch(input: BatchInput): BatchResult {
    const cuttingSpeed = input.cutting_speed_mm_min ?? this.config.default_cutting_speed_mm_min;
    const wireSpoolLength = input.wire_spool_length_m ?? this.config.wire_spool_length_m;
    const wireConsumptionRate = input.wire_consumption_rate_m_per_mm ?? this.config.wire_consumption_rate_m_per_mm;

    // Group and sort profiles
    const strategy = input.grouping_strategy ?? 'material_thickness';
    let groups = this.groupProfiles(input.profiles, strategy);
    groups = this.sortGroups(groups);

    // Calculate cut times for each group
    for (const group of groups) {
      let groupTime = 0;
      for (const profile of group.profiles) {
        groupTime += this.calculateCutTime(profile, cuttingSpeed);
      }
      group.estimated_cut_time_min = groupTime;
    }

    // Build cutting sequence
    const sequence: BatchResult['cutting_sequence'] = [];
    let currentTime = 0;
    let sequenceNum = 1;

    for (const group of groups) {
      // Add setup time between groups
      if (sequenceNum > 1) {
        currentTime += this.config.setup_time_per_group_min;
      }

      for (const profile of group.profiles) {
        const duration = this.calculateCutTime(profile, cuttingSpeed);

        sequence.push({
          sequence: sequenceNum++,
          profile_id: profile.id,
          group_id: group.group_id,
          estimated_start_min: currentTime,
          estimated_duration_min: duration,
        });

        currentTime += duration;
      }
    }

    // Calculate totals
    const totalPerimeter = input.profiles.reduce((sum, p) => sum + p.perimeter_mm * (p.pass_count ?? 1), 0);
    const totalCutTime = groups.reduce((sum, g) => sum + g.estimated_cut_time_min, 0) +
                        (groups.length - 1) * this.config.setup_time_per_group_min;
    const wireRequired = totalPerimeter * wireConsumptionRate;
    const wireChanges = Math.ceil(wireRequired / wireSpoolLength) - 1;

    // Calculate efficiency (grouping reduces setup time)
    const ungroupedSetupTime = (input.profiles.length - 1) * this.config.setup_time_per_group_min;
    const groupedSetupTime = (groups.length - 1) * this.config.setup_time_per_group_min;
    const efficiency = ungroupedSetupTime > 0
      ? ((ungroupedSetupTime - groupedSetupTime) / ungroupedSetupTime) * 100 + 50
      : 100;

    return {
      groups,
      cutting_sequence: sequence,
      total_profiles: input.profiles.length,
      total_groups: groups.length,
      total_perimeter_mm: totalPerimeter,
      total_cut_time_min: totalCutTime,
      wire_required_m: wireRequired,
      wire_changes_needed: Math.max(0, wireChanges),
      batch_efficiency_percent: Math.min(100, efficiency),
    };
  }

  /**
   * Estimate completion time for a batch
   */
  estimateCompletion(input: BatchInput): { total_minutes: number; formatted: string } {
    const result = this.processBatch(input);
    const minutes = result.total_cut_time_min;

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    return {
      total_minutes: minutes,
      formatted: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    };
  }
}

export const wedmMultiProfileBatchEngine = new WEDMMultiProfileBatchEngine();
