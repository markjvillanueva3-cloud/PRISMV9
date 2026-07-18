/**
 * WEDMLoRARewardShapingEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-A2b-REWARD
 * ============================================================================
 *
 * Shapes RLHF rewards for WEDM LoRA training to encourage:
 *   - Physics-correct WEDM outputs (wire diameter / tension / pulse-on
 *     time / flushing pressure / MRR / Ra within Klocke + Kunieda +
 *     Toenshoff + Sato + Carslaw-Jaeger derived bounds)
 *   - Valid controller-dialect snippets (Sodick LN, Mitsubishi M700,
 *     Agie, Charmilles, Makino EDGE)
 *   - WEDM-specific safety compliance (AWT recovery, wire-break-detect,
 *     anti-electrolysis, dielectric level, short-circuit retract)
 *   - Reasoning quality (CoT coherence)
 *   - Domain alignment (WEDM terminology — taper/UV/skim/recast/HAZ/etc)
 *
 * Mirrors LatheLoRARewardShapingEngine (U-LLR11) shape but every numeric
 * bound, dialect pattern, safety keyword, and domain term is WEDM-specific.
 *
 * @module engines/WEDMLoRARewardShapingEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** Reward component (single axis of evaluation). */
export interface WedmRewardComponent {
  name: string;
  weight: number;
  score: number;       // 0-1
  details: string;
}

/** Full reward result for a single model output. */
export interface WedmRewardResult {
  total_reward: number;       // -1 to 1
  components: WedmRewardComponent[];
  penalty_reasons: string[];
  bonus_reasons: string[];
  physics_accuracy: number;
  safety_score: number;
}

/** Reward shaping configuration. */
export interface WedmRewardConfig {
  syntax_weight: number;
  physics_weight: number;
  safety_weight: number;
  reasoning_weight: number;
  domain_weight: number;
  penalty_severity: "strict" | "moderate" | "lenient";
}

/** Single-parameter physics-range check result. */
export interface WedmPhysicsCheck {
  parameter: string;
  value: number;
  unit: string;
  valid: boolean;
  expected_range: [number, number];
  deviation: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: WedmRewardConfig = {
  syntax_weight: 0.2,
  physics_weight: 0.3,
  safety_weight: 0.25,
  reasoning_weight: 0.15,
  domain_weight: 0.1,
  penalty_severity: "moderate",
};

/**
 * WEDM physics bounds (industry-standard ranges per Klocke "Manufacturing
 * Processes 2 — Grinding, Honing, Lapping", Kunieda single-discharge crater
 * model, and JM Die archive empirical envelope on the WIRE EDM corpus).
 * Used by checkPhysics to penalize outputs that emit parameters outside
 * the manufacturable envelope.
 */
const PHYSICS_BOUNDS = {
  wire_diameter_mm: { min: 0.05, max: 0.36 },     // 0.05 (micro) to 0.36 (cooled brass)
  wire_tension_n: { min: 3, max: 25 },            // 3N (fine wire) to 25N (heavy taper)
  flushing_pressure_bar: { min: 2, max: 15 },     // dielectric flush pressure
  pulse_on_us: { min: 0.1, max: 50 },             // T_ON discharge pulse width
  pulse_off_us: { min: 1, max: 200 },             // T_OFF deionization gap
  open_voltage_v: { min: 30, max: 300 },          // U_o open-circuit voltage
  peak_current_a: { min: 1, max: 50 },            // I_p discharge peak
  mrr_mm3_min: { min: 1, max: 300 },              // material removal rate
  ra_um: { min: 0.1, max: 6.3 },                  // surface roughness
  wire_speed_mpm: { min: 1, max: 15 },            // wire feed speed m/min
  thickness_mm: { min: 1, max: 300 },             // workpiece thickness
  taper_deg: { min: 0, max: 30 },                 // |taper| (sign-agnostic)
  passes: { min: 1, max: 6 },                     // typical 1 rough + 2-4 skim
};

/**
 * WEDM controller-dialect regex patterns. Covers Sodick LN, Mitsubishi
 * M700, Agie, Charmilles, and Makino EDGE. These are non-exhaustive — the
 * goal is to recognize *valid-looking* dialect snippets, not to parse them.
 */
const WEDM_DIALECT_PATTERNS = {
  // M-codes — wire on/off, AWT (auto wire threading), end-of-job, etc.
  m_code: /\bM\d{1,3}\b/gi,
  // T-codes — Sodick LN threading-mode toggles
  t_code: /\bT\d{2,3}\b/gi,
  // E-codes — parameter-set IDs (Sodick / Mitsubishi technology tables)
  e_code: /\bE\d{3,4}\b/gi,
  // S-codes — energy/spark levels
  s_code: /\bS\d{1,3}\b/gi,
  // H-codes — kerf offsets (compensation register)
  h_code: /\bH\d{1,2}\b/gi,
  // Coordinates with optional UV (taper top-guide offset)
  coordinate: /[XYUV][+-]?\d+\.?\d*/gi,
  // G-codes for circular/linear/rapid motion
  g_code: /\bG\d{1,3}(\.\d)?\b/gi,
};

/**
 * WEDM safety keywords. Higher coverage = better safety awareness in the
 * generated output. Hits are case-insensitive substring matches.
 */
const WEDM_SAFETY_KEYWORDS = [
  "awt",                 // auto wire threader (recovery)
  "wire-break-detect",
  "wire break",
  "short-circuit",
  "short circuit",
  "anti-electrolysis",
  "dielectric",
  "deionized",
  "deionization",
  "flushing",
  "retract",
  "recovery",
  "anti-collision",
  "wire-tension",
  "wire tension",
  "conductivity",
];

/**
 * WEDM domain terminology. Higher coverage = stronger domain knowledge.
 * Includes process verbs (roughing/skim/finishing), geometry (taper, UV,
 * kerf), microstructure (recast, HAZ, white-layer), and materials lingo
 * (electrode-wear, overburn, dielectric, brass-wire, stratified).
 */
const WEDM_DOMAIN_TERMS = [
  "roughing",
  "skim",
  "skimming",
  "finishing",
  "pass",
  "taper",
  "uv",
  "kerf",
  "overburn",
  "recast",
  "haz",
  "white-layer",
  "white layer",
  "electrode-wear",
  "electrode wear",
  "dielectric",
  "wire-spool",
  "wire spool",
  "threader",
  "pickup",
  "spark gap",
  "discharge",
  "edm",
  "wedm",
  "wire-edm",
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class WEDMLoRARewardShapingEngine {
  private config: WedmRewardConfig = { ...DEFAULT_CONFIG };

  /** Set reward configuration (merged into current). */
  setConfig(config: Partial<WedmRewardConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get a defensive copy of the current configuration. */
  getConfig(): WedmRewardConfig {
    return { ...this.config };
  }

  /**
   * Calculate the shaped reward for a model output.
   *
   * @param output The model-generated WEDM response text
   * @param context Optional instruction + expected_type from the original
   *                training example
   * @returns Full reward result including per-component breakdown and
   *          penalty/bonus reasons
   */
  calculateReward(
    output: string,
    context?: { instruction?: string; expected_type?: string }
  ): WedmRewardResult {
    void context; // accepted for API parity with the lathe engine
    const components: WedmRewardComponent[] = [];
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // 1. Syntax validity (controller-dialect tokens)
    const syntaxScore = this.checkSyntax(output);
    components.push({
      name: "syntax",
      weight: this.config.syntax_weight,
      score: syntaxScore.score,
      details: syntaxScore.details,
    });
    if (syntaxScore.score < 0.5) penalties.push("Poor WEDM dialect syntax");
    if (syntaxScore.score > 0.9) bonuses.push("Excellent WEDM dialect structure");

    // 2. Physics accuracy (parameter-range envelope)
    const physicsScore = this.checkPhysics(output);
    components.push({
      name: "physics",
      weight: this.config.physics_weight,
      score: physicsScore.score,
      details: physicsScore.details,
    });
    if (physicsScore.score < 0.5) penalties.push("Physics values out of WEDM envelope");
    if (physicsScore.score > 0.9) bonuses.push("Physics calculations accurate");

    // 3. Safety compliance (WEDM-specific keywords)
    const safetyScore = this.checkSafety(output);
    components.push({
      name: "safety",
      weight: this.config.safety_weight,
      score: safetyScore.score,
      details: safetyScore.details,
    });
    if (safetyScore.score < 0.5) penalties.push("WEDM safety considerations missing");
    if (safetyScore.score > 0.9) bonuses.push("Good WEDM safety awareness");

    // 4. Reasoning quality (CoT coherence)
    const reasoningScore = this.checkReasoning(output);
    components.push({
      name: "reasoning",
      weight: this.config.reasoning_weight,
      score: reasoningScore.score,
      details: reasoningScore.details,
    });
    if (reasoningScore.score < 0.5) penalties.push("Weak reasoning chain");
    if (reasoningScore.score > 0.9) bonuses.push("Clear reasoning provided");

    // 5. Domain alignment (WEDM terminology coverage)
    const domainScore = this.checkDomainAlignment(output);
    components.push({
      name: "domain",
      weight: this.config.domain_weight,
      score: domainScore.score,
      details: domainScore.details,
    });
    if (domainScore.score < 0.5) penalties.push("Off-topic content");
    if (domainScore.score > 0.9) bonuses.push("Strong WEDM domain knowledge");

    // Weighted sum (same scaling as lathe — total in [0,1] before penalty/bonus)
    let totalReward = components.reduce(
      (sum, c) => sum + c.score * c.weight,
      0
    );

    const penaltyFactor =
      this.config.penalty_severity === "strict" ? 0.3 :
      this.config.penalty_severity === "moderate" ? 0.15 : 0.05;
    totalReward -= penalties.length * penaltyFactor;
    totalReward += bonuses.length * 0.05;

    // Map [0,1] → [-1,1] and clamp (matches lathe pattern)
    totalReward = Math.max(-1, Math.min(1, totalReward * 2 - 1));

    return {
      total_reward: totalReward,
      components,
      penalty_reasons: penalties,
      bonus_reasons: bonuses,
      physics_accuracy: physicsScore.score,
      safety_score: safetyScore.score,
    };
  }

  /**
   * Check WEDM controller-dialect syntax. Awards points for the presence
   * of recognizable M / T / E / S / H / G code tokens and XYUV coordinates.
   */
  private checkSyntax(output: string): { score: number; details: string } {
    let score = 0.5;
    const hits: string[] = [];

    if (WEDM_DIALECT_PATTERNS.m_code.test(output)) {
      score += 0.1;
      hits.push("M-codes");
    }
    if (WEDM_DIALECT_PATTERNS.t_code.test(output)) {
      score += 0.1;
      hits.push("T-codes");
    }
    if (WEDM_DIALECT_PATTERNS.e_code.test(output)) {
      score += 0.1;
      hits.push("E-codes (technology table)");
    }
    if (WEDM_DIALECT_PATTERNS.s_code.test(output)) {
      score += 0.05;
      hits.push("S-codes (energy)");
    }
    if (WEDM_DIALECT_PATTERNS.h_code.test(output)) {
      score += 0.05;
      hits.push("H-codes (kerf offset)");
    }
    if (WEDM_DIALECT_PATTERNS.coordinate.test(output)) {
      score += 0.1;
      hits.push("XYUV coordinates");
    }
    if (WEDM_DIALECT_PATTERNS.g_code.test(output)) {
      score += 0.05;
      hits.push("G-codes");
    }

    // Reset lastIndex on the global regexes (Node /g state is sticky)
    Object.values(WEDM_DIALECT_PATTERNS).forEach((re) => { re.lastIndex = 0; });

    score = Math.min(1, score);
    const details = hits.length > 0
      ? `Dialect tokens present: ${hits.join(", ")}`
      : "No recognizable WEDM dialect tokens";
    return { score, details };
  }

  /**
   * Check WEDM physics values against the manufacturable-envelope bounds
   * in PHYSICS_BOUNDS. Score = fraction of detected parameters that fall
   * inside their range.
   */
  private checkPhysics(output: string): { score: number; details: string } {
    const lower = output.toLowerCase();
    const checks: WedmPhysicsCheck[] = [];

    // Pattern matchers for each parameter — keyword + number (with optional unit)
    const patterns: Array<{
      key: keyof typeof PHYSICS_BOUNDS;
      regex: RegExp;
      unit: string;
    }> = [
      { key: "wire_diameter_mm",     regex: /wire\s*(diameter|d|⌀)\s*[:=]?\s*(\d+\.?\d*)/i,         unit: "mm" },
      { key: "wire_tension_n",       regex: /tension\s*[:=]?\s*(\d+\.?\d*)\s*n/i,                          unit: "N"  },
      { key: "flushing_pressure_bar",regex: /flush(ing)?\s*(pressure|p)?\s*[:=]?\s*(\d+\.?\d*)\s*bar/i,    unit: "bar"},
      { key: "pulse_on_us",          regex: /(?:t_?on|pulse[-_ ]?on|on[-_ ]?time)\s*[:=]?\s*(\d+\.?\d*)/i, unit: "us" },
      { key: "pulse_off_us",         regex: /(?:t_?off|pulse[-_ ]?off|off[-_ ]?time)\s*[:=]?\s*(\d+\.?\d*)/i, unit: "us" },
      { key: "open_voltage_v",       regex: /(?:u_?o|open[-_ ]?voltage|voltage)\s*[:=]?\s*(\d+\.?\d*)\s*v/i, unit: "V"  },
      { key: "peak_current_a",       regex: /(?:i_?p|peak[-_ ]?current|current)\s*[:=]?\s*(\d+\.?\d*)\s*a/i, unit: "A" },
      { key: "mrr_mm3_min",          regex: /mrr\s*[:=]?\s*(\d+\.?\d*)/i,                                  unit: "mm3/min" },
      { key: "ra_um",                regex: /\bra\s*[:=]?\s*(\d+\.?\d*)/i,                                 unit: "um" },
      { key: "wire_speed_mpm",       regex: /wire\s*(speed|feed)\s*[:=]?\s*(\d+\.?\d*)/i,                  unit: "m/min" },
      { key: "thickness_mm",         regex: /thickness\s*[:=]?\s*(\d+\.?\d*)/i,                            unit: "mm" },
      { key: "taper_deg",            regex: /taper\s*[:=]?\s*[-+]?(\d+\.?\d*)\s*(?:deg|°)/i,          unit: "deg"},
      { key: "passes",               regex: /(\d+)\s*pass(es)?/i,                                          unit: "count" },
    ];

    for (const p of patterns) {
      const match = lower.match(p.regex);
      if (!match) continue;
      // Last capturing group with a number is the value
      const valueStr = match.slice(1).reverse().find((g) => g && /^\d+\.?\d*$/.test(g));
      if (!valueStr) continue;
      const value = parseFloat(valueStr);
      const bounds = PHYSICS_BOUNDS[p.key];
      const valid = value >= bounds.min && value <= bounds.max;
      const deviation = valid
        ? 0
        : (value < bounds.min ? bounds.min - value : value - bounds.max);
      checks.push({
        parameter: p.key,
        value,
        unit: p.unit,
        valid,
        expected_range: [bounds.min, bounds.max],
        deviation,
      });
    }

    if (checks.length === 0) {
      return { score: 0.5, details: "No physics parameters detected" };
    }
    const validCount = checks.filter((c) => c.valid).length;
    const score = validCount / checks.length;
    const failed = checks.filter((c) => !c.valid)
      .map((c) => `${c.parameter}=${c.value}${c.unit} (range ${c.expected_range[0]}-${c.expected_range[1]})`)
      .join("; ");
    const details = failed
      ? `${validCount}/${checks.length} parameters in range. Out of range: ${failed}`
      : `All ${checks.length} parameters in WEDM envelope`;
    return { score, details };
  }

  /**
   * Check WEDM safety-keyword coverage. Score scales with the fraction of
   * SAFETY_KEYWORDS detected (capped — having 3 distinct hits already gives
   * a strong score; covering all 16 is not realistic for any single output).
   */
  private checkSafety(output: string): { score: number; details: string } {
    const lower = output.toLowerCase();
    const hits = WEDM_SAFETY_KEYWORDS.filter((kw) => lower.includes(kw));
    // 3 distinct hits = full credit (safety awareness, not safety-keyword spam)
    const score = Math.min(1, hits.length / 3);
    const details = hits.length > 0
      ? `Safety keywords present: ${hits.slice(0, 5).join(", ")}${hits.length > 5 ? "..." : ""}`
      : "No WEDM safety keywords detected";
    return { score, details };
  }

  /**
   * Check reasoning-chain quality. Looks for explicit reasoning structure
   * (step markers, because/therefore connectives, structured headers).
   */
  private checkReasoning(output: string): { score: number; details: string } {
    let score = 0.4;
    const hits: string[] = [];
    if (/\bstep[\s-]?\d/i.test(output))            { score += 0.2; hits.push("step markers"); }
    if (/\b(because|therefore|since|so that|hence|thus)\b/i.test(output)) { score += 0.2; hits.push("causal connectives"); }
    if (/(\n\s*[-*]\s+|\n\s*\d+\.\s+)/.test(output)) { score += 0.15; hits.push("structured bullets"); }
    if (/\b(reason|rationale|explanation|why)\b/i.test(output)) { score += 0.05; hits.push("reasoning verbs"); }
    if (output.length > 200)                        { score += 0.1; hits.push("substantive length"); }
    score = Math.min(1, score);
    const details = hits.length > 0
      ? `Reasoning markers: ${hits.join(", ")}`
      : "Output lacks explicit reasoning structure";
    return { score, details };
  }

  /**
   * Check WEDM-domain terminology coverage. Same scoring shape as safety:
   * fraction of distinct DOMAIN_TERMS hit, capped at a realistic ceiling.
   */
  private checkDomainAlignment(output: string): { score: number; details: string } {
    const lower = output.toLowerCase();
    const hits = WEDM_DOMAIN_TERMS.filter((t) => lower.includes(t));
    // 5 distinct domain terms = full credit
    const score = Math.min(1, hits.length / 5);
    const details = hits.length > 0
      ? `Domain terms: ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? "..." : ""}`
      : "No WEDM domain terminology detected";
    return { score, details };
  }
}

export const wedmLoRARewardShapingEngine = new WEDMLoRARewardShapingEngine();
