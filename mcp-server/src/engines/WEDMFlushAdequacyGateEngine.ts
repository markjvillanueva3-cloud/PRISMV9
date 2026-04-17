/**
 * WEDMFlushAdequacyGateEngine — Flushing Velocity Validation for S(x)
 *
 * Validates flushing adequacy based on:
 * - Workpiece thickness band (thin < 25mm, medium 25-75mm, thick > 75mm)
 * - Flushing mode (submerged vs side flush)
 * - Required minimum velocity for debris evacuation
 *
 * Insufficient flushing causes:
 * - Wire breakage from debris accumulation
 * - Recast layer buildup
 * - Surface finish degradation
 * - Thermal damage
 *
 * Reference: ASM Handbook Vol. 16, "Electrical Discharge Machining"
 *
 * @module WEDMFlushAdequacyGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-04
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type FlushingMode = "submerged" | "side_flush" | "top_bottom" | "jet";

export type ThicknessBand = "thin" | "medium" | "thick" | "ultra_thick";

export interface FlushingInput {
  /** Actual flushing velocity at the cut zone (m/s) */
  velocity_m_s: number;
  /** Workpiece thickness (mm) */
  thickness_mm: number;
  /** Flushing mode */
  mode: FlushingMode;
  /** Flushing pressure (bar) - optional, for validation */
  pressure_bar?: number;
  /** Cut path length for this segment (mm) - affects debris load */
  cut_length_mm?: number;
  /** Material type - some materials need more flushing */
  material?: "steel" | "carbide" | "aluminum" | "copper" | "titanium" | "inconel";
}

export interface FlushingRequirement {
  min_velocity_m_s: number;
  recommended_velocity_m_s: number;
  min_pressure_bar: number;
  notes: string;
}

export interface FlushingGateResult {
  success: boolean;
  pass: boolean;
  velocity_m_s: number;
  required_velocity_m_s: number;
  recommended_velocity_m_s: number;
  thickness_band: ThicknessBand;
  mode: FlushingMode;
  velocity_ratio: number;
  hard_block: boolean;
  warnings: string[];
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUSHING REQUIREMENTS BY THICKNESS BAND AND MODE
// ═══════════════════════════════════════════════════════════════════════════

const FLUSHING_REQUIREMENTS: Record<ThicknessBand, Record<FlushingMode, FlushingRequirement>> = {
  thin: {
    submerged: {
      min_velocity_m_s: 0.3,
      recommended_velocity_m_s: 0.5,
      min_pressure_bar: 0.5,
      notes: "Thin parts < 25mm, submerged mode adequate",
    },
    side_flush: {
      min_velocity_m_s: 0.5,
      recommended_velocity_m_s: 0.8,
      min_pressure_bar: 1.0,
      notes: "Side flush needs higher velocity for thin parts",
    },
    top_bottom: {
      min_velocity_m_s: 0.4,
      recommended_velocity_m_s: 0.6,
      min_pressure_bar: 0.8,
      notes: "Top/bottom flush effective for thin parts",
    },
    jet: {
      min_velocity_m_s: 0.6,
      recommended_velocity_m_s: 1.0,
      min_pressure_bar: 1.5,
      notes: "Jet flush for precision thin parts",
    },
  },
  medium: {
    submerged: {
      min_velocity_m_s: 0.5,
      recommended_velocity_m_s: 0.8,
      min_pressure_bar: 1.0,
      notes: "Medium parts 25-75mm need good flow",
    },
    side_flush: {
      min_velocity_m_s: 0.8,
      recommended_velocity_m_s: 1.2,
      min_pressure_bar: 1.5,
      notes: "Side flush critical for medium thickness",
    },
    top_bottom: {
      min_velocity_m_s: 0.6,
      recommended_velocity_m_s: 1.0,
      min_pressure_bar: 1.2,
      notes: "Combined top/bottom for medium parts",
    },
    jet: {
      min_velocity_m_s: 1.0,
      recommended_velocity_m_s: 1.5,
      min_pressure_bar: 2.0,
      notes: "High-pressure jet for medium parts",
    },
  },
  thick: {
    submerged: {
      min_velocity_m_s: 0.8,
      recommended_velocity_m_s: 1.2,
      min_pressure_bar: 1.5,
      notes: "Thick parts > 75mm need high flow",
    },
    side_flush: {
      min_velocity_m_s: 1.2,
      recommended_velocity_m_s: 1.8,
      min_pressure_bar: 2.0,
      notes: "Side flush marginal for thick parts",
    },
    top_bottom: {
      min_velocity_m_s: 1.0,
      recommended_velocity_m_s: 1.5,
      min_pressure_bar: 1.8,
      notes: "Top/bottom essential for thick parts",
    },
    jet: {
      min_velocity_m_s: 1.5,
      recommended_velocity_m_s: 2.0,
      min_pressure_bar: 3.0,
      notes: "High-pressure jet required for thick parts",
    },
  },
  ultra_thick: {
    submerged: {
      min_velocity_m_s: 1.2,
      recommended_velocity_m_s: 1.8,
      min_pressure_bar: 2.0,
      notes: "Ultra-thick > 150mm needs maximum flow",
    },
    side_flush: {
      min_velocity_m_s: 1.8,
      recommended_velocity_m_s: 2.5,
      min_pressure_bar: 3.0,
      notes: "Side flush insufficient for ultra-thick",
    },
    top_bottom: {
      min_velocity_m_s: 1.5,
      recommended_velocity_m_s: 2.2,
      min_pressure_bar: 2.5,
      notes: "Top/bottom critical for ultra-thick",
    },
    jet: {
      min_velocity_m_s: 2.0,
      recommended_velocity_m_s: 3.0,
      min_pressure_bar: 4.0,
      notes: "Maximum jet pressure for ultra-thick",
    },
  },
};

// Material multipliers for required velocity
const MATERIAL_MULTIPLIERS: Record<string, number> = {
  steel: 1.0,
  carbide: 1.3,      // Carbide produces more debris
  aluminum: 0.8,     // Aluminum flushes easier
  copper: 0.9,
  titanium: 1.2,     // Titanium needs good flushing
  inconel: 1.4,      // High-temp alloys need more flushing
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class WEDMFlushAdequacyGateEngine {
  /**
   * Evaluate flushing adequacy for S(x) integration
   */
  evaluate(input: FlushingInput): FlushingGateResult {
    const thickness_band = this.classifyThickness(input.thickness_mm);
    const requirements = FLUSHING_REQUIREMENTS[thickness_band][input.mode];
    const warnings: string[] = [];

    // Apply material multiplier if specified
    const materialMult = input.material ? (MATERIAL_MULTIPLIERS[input.material] ?? 1.0) : 1.0;
    const required_velocity = requirements.min_velocity_m_s * materialMult;
    const recommended_velocity = requirements.recommended_velocity_m_s * materialMult;

    // Calculate velocity ratio (actual / required)
    const velocity_ratio = input.velocity_m_s / required_velocity;

    // Check for inadequate flushing
    const pass = input.velocity_m_s >= required_velocity;

    // Generate warnings
    if (input.velocity_m_s < recommended_velocity && input.velocity_m_s >= required_velocity) {
      warnings.push(`Velocity ${input.velocity_m_s.toFixed(2)} m/s below recommended ${recommended_velocity.toFixed(2)} m/s`);
    }

    if (input.pressure_bar !== undefined && input.pressure_bar < requirements.min_pressure_bar) {
      warnings.push(`Pressure ${input.pressure_bar.toFixed(1)} bar below minimum ${requirements.min_pressure_bar.toFixed(1)} bar`);
    }

    if (thickness_band === "thick" || thickness_band === "ultra_thick") {
      if (input.mode === "side_flush") {
        warnings.push(`Side flush may be insufficient for ${thickness_band} parts (${input.thickness_mm}mm)`);
      }
    }

    if (input.cut_length_mm && input.cut_length_mm > 100 && velocity_ratio < 1.2) {
      warnings.push(`Long cut path (${input.cut_length_mm}mm) may accumulate debris at this velocity`);
    }

    return {
      success: true,
      pass,
      velocity_m_s: input.velocity_m_s,
      required_velocity_m_s: required_velocity,
      recommended_velocity_m_s: recommended_velocity,
      thickness_band,
      mode: input.mode,
      velocity_ratio,
      hard_block: !pass,
      warnings,
      summary: this.buildSummary(pass, input.velocity_m_s, required_velocity, thickness_band, input.mode, warnings),
    };
  }

  /**
   * Quick check for S(x) integration - returns format for SafetyGateInput.flushing
   */
  quickCheckForSx(
    velocity_m_s: number,
    thickness_mm: number,
    mode: FlushingMode
  ): {
    pass: boolean;
    velocity_m_s: number;
    required_velocity_m_s: number;
    mode: FlushingMode;
  } {
    const result = this.evaluate({ velocity_m_s, thickness_mm, mode });
    return {
      pass: result.pass,
      velocity_m_s: result.velocity_m_s,
      required_velocity_m_s: result.required_velocity_m_s,
      mode: result.mode,
    };
  }

  /**
   * Get requirements for a given thickness and mode
   */
  getRequirements(thickness_mm: number, mode: FlushingMode): FlushingRequirement {
    const band = this.classifyThickness(thickness_mm);
    return FLUSHING_REQUIREMENTS[band][mode];
  }

  /**
   * Recommend optimal flushing mode for thickness
   */
  recommendMode(thickness_mm: number): { primary: FlushingMode; alternative: FlushingMode; reason: string } {
    const band = this.classifyThickness(thickness_mm);

    switch (band) {
      case "thin":
        return {
          primary: "submerged",
          alternative: "side_flush",
          reason: "Submerged adequate for thin parts, side flush for precision",
        };
      case "medium":
        return {
          primary: "top_bottom",
          alternative: "side_flush",
          reason: "Top/bottom provides best coverage for medium thickness",
        };
      case "thick":
        return {
          primary: "top_bottom",
          alternative: "jet",
          reason: "Top/bottom essential, jet for difficult materials",
        };
      case "ultra_thick":
        return {
          primary: "jet",
          alternative: "top_bottom",
          reason: "Maximum jet pressure required for ultra-thick parts",
        };
    }
  }

  /**
   * Calculate minimum velocity for given conditions
   */
  calculateMinVelocity(
    thickness_mm: number,
    mode: FlushingMode,
    material?: string
  ): number {
    const band = this.classifyThickness(thickness_mm);
    const req = FLUSHING_REQUIREMENTS[band][mode];
    const mult = material ? (MATERIAL_MULTIPLIERS[material] ?? 1.0) : 1.0;
    return req.min_velocity_m_s * mult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private classifyThickness(thickness_mm: number): ThicknessBand {
    if (thickness_mm < 25) return "thin";
    if (thickness_mm < 75) return "medium";
    if (thickness_mm < 150) return "thick";
    return "ultra_thick";
  }

  private buildSummary(
    pass: boolean,
    velocity: number,
    required: number,
    band: ThicknessBand,
    mode: FlushingMode,
    warnings: string[]
  ): string {
    if (pass) {
      const warningNote = warnings.length > 0 ? ` (${warnings.length} warning(s))` : "";
      return `PASS: Flushing adequate. ${velocity.toFixed(2)} m/s >= ${required.toFixed(2)} m/s for ${band} part, ${mode} mode${warningNote}`;
    }

    return `HARD BLOCK: Insufficient flushing. ${velocity.toFixed(2)} m/s < ${required.toFixed(2)} m/s required for ${band} part (${mode} mode). Risk of wire breakage and thermal damage.`;
  }
}

export const wedmFlushAdequacyGateEngine = new WEDMFlushAdequacyGateEngine();
