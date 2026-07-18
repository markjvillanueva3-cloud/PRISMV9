/**
 * Error Remediation Engine — Learned Failure Pattern → Fix Suggestions
 * =====================================================================
 * When a computation fails or returns an out-of-range result, this engine
 * suggests parameter adjustments based on known failure patterns.
 *
 * Not blind retry — each remediation includes the physics reason and
 * specific parameter adjustments to try.
 *
 * Clean-room implementation inspired by error-learning patterns in agentic tools.
 *
 * @module engines/ErrorRemediationEngine
 * @version 1.0.0
 */

/** A single remediation suggestion */
export interface RemediationSuggestion {
  /** Machine-readable error pattern that triggered this */
  errorPattern: string;
  /** Human-readable physics explanation */
  reason: string;
  /** Parameter adjustments to try: key → { direction, factor, absolute? } */
  adjustments: Record<string, ParameterAdjustment>;
  /** Confidence that this remediation will fix the issue (0-1) */
  confidence: number;
  /** Reference to physics principle or standard */
  reference?: string;
}

/** How to adjust a specific parameter */
export interface ParameterAdjustment {
  direction: "increase" | "decrease";
  factor: number;         // multiplier (e.g., 0.7 = reduce 30%, 1.5 = increase 50%)
  absolute?: number;      // or set to this absolute value
  reason: string;         // why this specific adjustment helps
}

/**
 * Error pattern → remediation mapping.
 * Key format: "dispatcher:action:ERROR_CODE" or "dispatcher:action:CONDITION"
 */
const REMEDIATION_MAP: Record<string, RemediationSuggestion[]> = {
  // =========================================================================
  // Cutting Force Errors
  // =========================================================================
  "prism_calc:cutting_force:DEFLECTION_EXCEEDS_LIMIT": [{
    errorPattern: "DEFLECTION_EXCEEDS_LIMIT",
    reason: "Tool deflection exceeds tolerance — insufficient stiffness for current depth of cut",
    adjustments: {
      axial_depth: { direction: "decrease", factor: 0.7, reason: "Reduce force proportionally by cutting shallower" },
      tool_diameter: { direction: "increase", factor: 1.25, reason: "Larger tool has I ∝ d^4 stiffness increase" },
      overhang: { direction: "decrease", factor: 0.8, reason: "Deflection ∝ L^3, reducing overhang is very effective" },
    },
    confidence: 0.85,
    reference: "delta = FL^3/3EI — deflection is cubic with overhang",
  }],

  "prism_calc:cutting_force:SPINDLE_POWER_EXCEEDED": [{
    errorPattern: "SPINDLE_POWER_EXCEEDED",
    reason: "Required spindle power exceeds machine rating",
    adjustments: {
      cutting_speed: { direction: "decrease", factor: 0.8, reason: "Power = Fc * Vc / 60000, linear with speed" },
      axial_depth: { direction: "decrease", factor: 0.7, reason: "Force ∝ ap, reducing depth reduces power linearly" },
      feed_per_tooth: { direction: "decrease", factor: 0.85, reason: "Force ∝ fz^(1-mc), sub-linear reduction" },
    },
    confidence: 0.9,
    reference: "P = Fc * Vc / (60000 * eta)",
  }],

  "prism_calc:cutting_force:TORQUE_EXCEEDED": [{
    errorPattern: "TORQUE_EXCEEDED",
    reason: "Required spindle torque exceeds machine rating at this RPM",
    adjustments: {
      cutting_speed: { direction: "increase", factor: 1.2, reason: "Higher RPM = lower torque for same power (T = P*9549/n)" },
      axial_depth: { direction: "decrease", factor: 0.7, reason: "Reduces cutting force, thus torque" },
      feed_per_tooth: { direction: "decrease", factor: 0.85, reason: "Reduces cutting force" },
    },
    confidence: 0.85,
    reference: "T = P * 9549 / n (Nm)",
  }],

  // =========================================================================
  // Tool Life Errors
  // =========================================================================
  "prism_calc:tool_life:TOOL_LIFE_TOO_SHORT": [{
    errorPattern: "TOOL_LIFE_TOO_SHORT",
    reason: "Predicted tool life is below minimum acceptable threshold",
    adjustments: {
      cutting_speed: { direction: "decrease", factor: 0.85, reason: "Tool life is exponentially sensitive to speed (Taylor: T = (C/Vc)^(1/n))" },
      feed_per_tooth: { direction: "decrease", factor: 0.9, reason: "Reduces flank wear rate" },
    },
    confidence: 0.9,
    reference: "Taylor tool life equation: T = (C/Vc)^(1/n), n typically 0.2-0.4",
  }],

  "prism_calc:tool_life:EXCESSIVE_TEMPERATURE": [{
    errorPattern: "EXCESSIVE_TEMPERATURE",
    reason: "Cutting temperature exceeds tool coating limits — accelerated crater wear",
    adjustments: {
      cutting_speed: { direction: "decrease", factor: 0.8, reason: "Temperature rises ~logarithmically with speed" },
      feed_per_tooth: { direction: "decrease", factor: 0.85, reason: "Reduces friction heat at tool-chip interface" },
    },
    confidence: 0.8,
    reference: "Loewen-Shaw: theta ∝ Vc^0.5 * fz^0.3 * ap^0.1",
  }],

  // =========================================================================
  // Surface Finish Errors
  // =========================================================================
  "prism_calc:surface_finish:RA_EXCEEDS_SPEC": [{
    errorPattern: "RA_EXCEEDS_SPEC",
    reason: "Predicted surface roughness Ra exceeds the specified tolerance",
    adjustments: {
      feed: { direction: "decrease", factor: 0.7, reason: "Ra ∝ f^2/(8*r) — roughness is quadratic with feed" },
      nose_radius: { direction: "increase", factor: 1.5, reason: "Ra ∝ 1/r — larger nose radius improves finish" },
    },
    confidence: 0.95,
    reference: "Theoretical Ra = f^2 / (32 * r) for turning",
  }],

  // =========================================================================
  // Stability / Chatter Errors
  // =========================================================================
  "prism_calc:stability:CHATTER_ZONE": [{
    errorPattern: "CHATTER_ZONE",
    reason: "Selected RPM/depth combination falls in an unstable region of the SLD",
    adjustments: {
      axial_depth: { direction: "decrease", factor: 0.6, reason: "Move below critical depth limit (a_lim)" },
      cutting_speed: { direction: "increase", factor: 1.15, reason: "Try to hit a stability pocket at higher RPM" },
    },
    confidence: 0.7,
    reference: "Stability Lobe Diagram — a_lim = -1 / (2 * Ks * Re[G(jw)])",
  }],

  // =========================================================================
  // Safety Gate Failures
  // =========================================================================
  "prism_safety:check_spindle_power:OVER_CAPACITY": [{
    errorPattern: "OVER_CAPACITY",
    reason: "Spindle power demand exceeds machine capacity",
    adjustments: {
      axial_depth: { direction: "decrease", factor: 0.65, reason: "Most effective — linear power reduction" },
      radial_depth: { direction: "decrease", factor: 0.7, reason: "Reduce engagement width" },
      cutting_speed: { direction: "decrease", factor: 0.85, reason: "Reduce speed for less power" },
    },
    confidence: 0.9,
  }],

  "prism_safety:check_spindle_torque:OVER_CAPACITY": [{
    errorPattern: "OVER_CAPACITY",
    reason: "Spindle torque demand exceeds machine capacity at current RPM",
    adjustments: {
      cutting_speed: { direction: "increase", factor: 1.3, reason: "Higher RPM reduces torque for same power" },
      axial_depth: { direction: "decrease", factor: 0.7, reason: "Reduce force to reduce torque" },
    },
    confidence: 0.85,
  }],
};

class ErrorRemediationEngineImpl {
  /**
   * Get remediation suggestions for a failed action.
   * @param action - Full action path (e.g., "prism_calc:cutting_force")
   * @param errorCode - Machine-readable error code from the engine
   * @param params - Original input params (used to compute adjusted values)
   * @returns Array of suggestions, sorted by confidence descending
   */
  getRemediation(
    action: string,
    errorCode: string,
    params: Record<string, unknown>,
  ): RemediationSuggestion[] {
    const key = `${action}:${errorCode}`;
    const suggestions = REMEDIATION_MAP[key];
    if (!suggestions) return [];
    return [...suggestions].sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Apply adjustments to params and return a new adjusted param set.
   * Does NOT modify the original.
   */
  applyAdjustments(
    params: Record<string, unknown>,
    adjustments: Record<string, ParameterAdjustment>,
  ): Record<string, unknown> {
    const adjusted = { ...params };
    for (const [key, adj] of Object.entries(adjustments)) {
      const current = adjusted[key];
      if (typeof current !== "number") continue;
      if (adj.absolute != null) {
        adjusted[key] = adj.absolute;
      } else {
        adjusted[key] = current * adj.factor;
      }
    }
    return adjusted;
  }

  /**
   * Format remediation as human-readable text for LLM consumption.
   */
  formatRemediation(suggestion: RemediationSuggestion): string {
    const lines = [`**${suggestion.errorPattern}**: ${suggestion.reason}`];
    for (const [param, adj] of Object.entries(suggestion.adjustments)) {
      const pct = Math.round(Math.abs(1 - adj.factor) * 100);
      const dir = adj.direction === "increase" ? "+" : "-";
      lines.push(`  - ${param}: ${adj.direction} ${pct}% (${dir}${pct}%) — ${adj.reason}`);
    }
    if (suggestion.reference) {
      lines.push(`  - Ref: ${suggestion.reference}`);
    }
    return lines.join("\n");
  }

  /** Get all known error patterns for an action */
  getKnownErrors(action: string): string[] {
    const prefix = `${action}:`;
    return Object.keys(REMEDIATION_MAP)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length));
  }
}

export const errorRemediationEngine = new ErrorRemediationEngineImpl();
