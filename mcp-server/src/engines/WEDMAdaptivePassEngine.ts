/**
 * WEDMAdaptivePassEngine
 * U-PROD-17: Adaptive multi-pass strategy optimization
 *
 * Physics:
 * - Roughing: maximum material removal, wider kerf
 * - Skim 1: accuracy recovery, reduced offset
 * - Skim 2+: final accuracy, minimal material
 * - Pass count determined by tolerance requirements
 * - Adaptive offset calculation between passes
 */

export interface AdaptivePassInput {
  target_tolerance_mm: number;
  surface_finish_Ra_um?: number;
  material?: string;
  thickness_mm: number;
  wire_diameter_mm?: number;
  spark_gap_mm?: number;
  total_offset_mm?: number;
}

export interface PassDefinition {
  pass_number: number;
  pass_type: 'rough' | 'skim';
  wire_offset_mm: number;
  feed_rate_factor: number;
  spark_energy_factor: number;
  expected_Ra_um: number;
  expected_accuracy_mm: number;
  notes: string;
}

export interface AdaptivePassResult {
  passes: PassDefinition[];
  total_passes: number;
  total_offset_mm: number;
  achieved_tolerance_mm: number;
  achieved_Ra_um: number;
  time_factor: number;
  pass_strategy_name: string;
  recommendations: string[];
}

export interface ToleranceClass {
  class: 'IT6' | 'IT7' | 'IT8' | 'IT9' | 'IT10' | 'IT11' | 'IT12';
  min_passes: number;
  max_tolerance_mm: number;
  typical_Ra_um: number;
}

export class WEDMAdaptivePassEngine {
  private config = {
    default_wire_diameter_mm: 0.25,
    default_spark_gap_mm: 0.025,
    rough_offset_factor: 0.15, // mm from final surface
    skim_offset_reduction: 0.6, // Each skim reduces remaining offset by this factor
    rough_Ra_um: 3.2,
    skim1_Ra_um: 1.6,
    skim2_Ra_um: 0.8,
    skim3_Ra_um: 0.4,
    max_skim_passes: 4,
  };

  private toleranceClasses: ToleranceClass[] = [
    { class: 'IT6', min_passes: 4, max_tolerance_mm: 0.008, typical_Ra_um: 0.4 },
    { class: 'IT7', min_passes: 3, max_tolerance_mm: 0.015, typical_Ra_um: 0.8 },
    { class: 'IT8', min_passes: 3, max_tolerance_mm: 0.022, typical_Ra_um: 1.2 },
    { class: 'IT9', min_passes: 2, max_tolerance_mm: 0.035, typical_Ra_um: 1.6 },
    { class: 'IT10', min_passes: 2, max_tolerance_mm: 0.058, typical_Ra_um: 2.4 },
    { class: 'IT11', min_passes: 1, max_tolerance_mm: 0.090, typical_Ra_um: 3.2 },
    { class: 'IT12', min_passes: 1, max_tolerance_mm: 0.150, typical_Ra_um: 4.0 },
  ];

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Determine tolerance class from target tolerance
   */
  determineToleranceClass(targetTolerance: number): ToleranceClass {
    for (const tc of this.toleranceClasses) {
      if (targetTolerance <= tc.max_tolerance_mm) {
        return tc;
      }
    }
    return this.toleranceClasses[this.toleranceClasses.length - 1];
  }

  /**
   * Calculate number of passes needed
   */
  calculatePassCount(input: AdaptivePassInput): number {
    const toleranceClass = this.determineToleranceClass(input.target_tolerance_mm);
    let passes = toleranceClass.min_passes;

    // Surface finish may require additional passes
    if (input.surface_finish_Ra_um !== undefined) {
      if (input.surface_finish_Ra_um <= 0.4) {
        passes = Math.max(passes, 4);
      } else if (input.surface_finish_Ra_um <= 0.8) {
        passes = Math.max(passes, 3);
      } else if (input.surface_finish_Ra_um <= 1.6) {
        passes = Math.max(passes, 2);
      }
    }

    // Thick materials may need additional passes for accuracy
    if (input.thickness_mm > 80) {
      passes = Math.max(passes, 2);
    }

    return Math.min(passes, 1 + this.config.max_skim_passes);
  }

  /**
   * Calculate wire offset for each pass
   */
  calculateOffsets(totalPasses: number, totalOffset: number): number[] {
    const offsets: number[] = [];

    if (totalPasses === 1) {
      return [totalOffset];
    }

    // Rough pass takes most of the offset
    const roughOffset = totalOffset * this.config.rough_offset_factor / totalOffset;
    offsets.push(totalOffset * (1 - roughOffset));

    // Skim passes progressively reduce remaining offset
    let remaining = totalOffset * roughOffset;
    for (let i = 1; i < totalPasses; i++) {
      if (i === totalPasses - 1) {
        // Final pass removes all remaining
        offsets.push(remaining);
      } else {
        const thisPass = remaining * this.config.skim_offset_reduction;
        offsets.push(thisPass);
        remaining -= thisPass;
      }
    }

    return offsets;
  }

  /**
   * Get expected surface finish for pass number
   */
  getExpectedRa(passNumber: number, totalPasses: number): number {
    if (passNumber === 1) return this.config.rough_Ra_um;

    const skimNumber = passNumber - 1;
    switch (skimNumber) {
      case 1: return this.config.skim1_Ra_um;
      case 2: return this.config.skim2_Ra_um;
      case 3: return this.config.skim3_Ra_um;
      default: return this.config.skim3_Ra_um * 0.8;
    }
  }

  /**
   * Generate adaptive pass strategy
   */
  generateStrategy(input: AdaptivePassInput): AdaptivePassResult {
    const wireDiameter = input.wire_diameter_mm ?? this.config.default_wire_diameter_mm;
    const sparkGap = input.spark_gap_mm ?? this.config.default_spark_gap_mm;
    const totalOffset = input.total_offset_mm ?? (wireDiameter / 2 + sparkGap);

    const passCount = this.calculatePassCount(input);
    const offsets = this.calculateOffsets(passCount, totalOffset);

    const passes: PassDefinition[] = [];
    let cumulativeOffset = 0;
    const recommendations: string[] = [];

    for (let i = 0; i < passCount; i++) {
      const passNum = i + 1;
      const isRough = passNum === 1;
      const offset = offsets[i];
      cumulativeOffset += offset;

      // Calculate factors based on pass type
      let feedFactor: number;
      let energyFactor: number;
      let notes: string;

      if (isRough) {
        feedFactor = 1.0;
        energyFactor = 1.0;
        notes = 'Main rough cut - maximum material removal';
      } else {
        const skimNum = passNum - 1;
        feedFactor = 2.5 + (skimNum - 1) * 0.5; // Skim passes are faster
        energyFactor = 0.6 - (skimNum - 1) * 0.1; // Lower energy for finer finish
        notes = `Skim pass ${skimNum} - accuracy and finish improvement`;
      }

      const expectedRa = this.getExpectedRa(passNum, passCount);
      const expectedAccuracy = isRough ? 0.05 : 0.01 / passNum;

      passes.push({
        pass_number: passNum,
        pass_type: isRough ? 'rough' : 'skim',
        wire_offset_mm: cumulativeOffset,
        feed_rate_factor: feedFactor,
        spark_energy_factor: Math.max(0.3, energyFactor),
        expected_Ra_um: expectedRa,
        expected_accuracy_mm: expectedAccuracy,
        notes,
      });
    }

    // Determine achieved tolerance and finish
    const achievedTolerance = passes[passes.length - 1].expected_accuracy_mm;
    const achievedRa = passes[passes.length - 1].expected_Ra_um;

    // Calculate time factor (relative to single pass)
    const timeFactor = passes.reduce((sum, p) => sum + 1 / p.feed_rate_factor, 0);

    // Generate strategy name
    let strategyName: string;
    if (passCount === 1) {
      strategyName = 'Single-pass rough';
    } else if (passCount === 2) {
      strategyName = 'Rough + skim';
    } else if (passCount === 3) {
      strategyName = 'Rough + 2 skim';
    } else {
      strategyName = `Rough + ${passCount - 1} skim (precision)`;
    }

    // Add recommendations
    if (input.target_tolerance_mm < 0.005) {
      recommendations.push('Ultra-precision tolerance - consider wire guide condition check');
    }
    if (input.thickness_mm > 100 && passCount < 3) {
      recommendations.push('Thick material may benefit from additional skim pass');
    }
    if (input.surface_finish_Ra_um !== undefined && achievedRa > input.surface_finish_Ra_um) {
      recommendations.push(`Requested Ra ${input.surface_finish_Ra_um}µm may require additional skim passes`);
    }

    return {
      passes,
      total_passes: passCount,
      total_offset_mm: totalOffset,
      achieved_tolerance_mm: achievedTolerance,
      achieved_Ra_um: achievedRa,
      time_factor: timeFactor,
      pass_strategy_name: strategyName,
      recommendations,
    };
  }

  /**
   * Quick tolerance-to-passes lookup
   */
  getMinPassesForTolerance(toleranceMm: number): number {
    const tc = this.determineToleranceClass(toleranceMm);
    return tc.min_passes;
  }

  /**
   * Get all tolerance classes for reference
   */
  getToleranceClasses(): ToleranceClass[] {
    return [...this.toleranceClasses];
  }
}

export const wedmAdaptivePassEngine = new WEDMAdaptivePassEngine();
