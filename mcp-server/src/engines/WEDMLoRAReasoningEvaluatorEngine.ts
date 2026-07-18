/**
 * WEDMLoRAReasoningEvaluatorEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-A2b-REASON
 * ============================================================================
 *
 * RLHF reasoning-quality evaluator for WEDM LoRA outputs — final piece of
 * the eval triad (paired with U-WCTP-A2b-REWARD iter2 + U-WCTP-A2b-SAFETY
 * iter15). Closes the third missing eval-triad engine flagged in iter13.
 *
 * Mirrors LatheLoRAReasoningEvaluatorEngine (U-LLR15) 5-axis structure
 * (coherence / domain_knowledge / justification / structure / completeness)
 * with weights 25/20/25/15/15 — but the WEDM domain vocabulary, expected
 * dimensions, and rationale signals are wire-EDM specific.
 *
 * @module engines/WEDMLoRAReasoningEvaluatorEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WedmReasoningEvaluation {
  overall_score: number;          // 0-100
  coherence: number;              // 0-100 (logical flow + no contradictions)
  domain_knowledge: number;       // 0-100 (WEDM-specific concept coverage)
  justification: number;          // 0-100 (reasons given for choices)
  structure: number;              // 0-100 (steps / bullets / sections)
  completeness: number;           // 0-100 (covered required dimensions)
  findings: WedmReasoningFinding[];
  passed: boolean;
}

export interface WedmReasoningFinding {
  category: "coherence" | "domain" | "justification" | "structure" | "completeness";
  severity: "high" | "medium" | "low" | "info";
  message: string;
  recommendation: string;
}

export interface WedmReasoningConfig {
  /** Minimum overall score to mark passed. */
  pass_threshold: number;
  /** Number of domain terms expected for full credit. */
  domain_terms_required: number;
  /** Number of justification connectives expected for full credit. */
  justification_connectives_required: number;
  /** Minimum substantive length (chars) for full structure credit. */
  min_length_for_structure: number;
  /** Required dimensions for full completeness credit. */
  required_dimensions: WedmDimension[];
}

export type WedmDimension =
  | "wire_selection"
  | "pass_strategy"
  | "controller_dialect"
  | "physics_citation"
  | "safety_consideration"
  | "material_workpiece"
  | "tolerance_target";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: WedmReasoningConfig = {
  pass_threshold: 0.70,
  domain_terms_required: 5,
  justification_connectives_required: 2,
  min_length_for_structure: 200,
  required_dimensions: [
    "wire_selection",
    "pass_strategy",
    "material_workpiece",
    "safety_consideration",
  ],
};

const AXIS_WEIGHTS = {
  coherence: 0.25,
  domain_knowledge: 0.20,
  justification: 0.25,
  structure: 0.15,
  completeness: 0.15,
} as const;

/** Causal / justification connectives — case-insensitive substring match. */
const JUSTIFICATION_CONNECTIVES = [
  "because", "therefore", "since", "so that", "hence", "thus",
  "as a result", "consequently", "owing to", "due to", "in order to",
  "this is why", "the reason", "rationale", "explanation",
] as const;

/** Logical-contradiction signal pairs — flagged on coherence axis. */
const CONTRADICTION_PAIRS: ReadonlyArray<[RegExp, RegExp, string]> = [
  [/single[\s-]?pass/i, /multi[\s-]?pass|skim/i, "claims single-pass and multi-pass simultaneously"],
  [/zero[\s-]?taper/i, /\btaper\s*[1-9]/i, "claims zero taper but specifies non-zero angle"],
  [/standard\s+4[\s-]?pass/i, /heavy\s+5[\s-]?pass/i, "references both 4-pass standard and 5-pass heavy cycles"],
  [/brass\s+wire/i, /tungsten\s+wire|molybdenum\s+wire/i, "mixes brass + tungsten/molybdenum wire selection"],
];

/** WEDM domain vocabulary (case-insensitive). */
const WEDM_DOMAIN_TERMS = [
  "wire-edm", "wedm", "wire edm", "spark gap", "kerf", "overburn",
  "wire diameter", "wire tension", "wire-break", "awt", "auto-thread",
  "dielectric", "deionized", "anti-electrolysis", "conductivity",
  "flush", "rooster tail", "nozzle",
  "pulse-on", "pulse-off", "t_on", "ton", "toff", "ip", "peak current",
  "rough", "skim", "trim", "pass",
  "taper", "u-v", "uv axis", "4-axis",
  "recast", "haz", "white layer", "ra", "surface finish",
  "e-code", "e-pack", "tech table", "condition file",
  "fa-10s", "mitsubishi", "sodick", "agie", "charmilles", "makino",
  "klocke", "kunieda", "toenshoff", "sato", "carslaw-jaeger",
] as const;

/** Per-dimension regex — first match qualifies the dimension as covered. */
const DIMENSION_DETECTORS: Record<WedmDimension, RegExp> = {
  wire_selection: /wire\s*(?:diameter|d|⌀|brass|coated|gamma)/i,
  pass_strategy: /\d[\s-]?pass|skim|rough|trim|cycle/i,
  controller_dialect: /\b(M\d{1,3}|E\d{3,4}|T\d{2,3}|FA-10S|MV\d+|NF\d+|sodick|mitsubishi|agie|charmilles|makino)\b/i,
  physics_citation: /klocke|kunieda|sommer|toenshoff|sato|carslaw|berkenhoff|bedra|CIRP|ISO\s?\d{4}/i,
  safety_consideration: /verif|check|confirm|ensure|inspect|safety|wire[\s-]?break|awt|recovery|anti[\s-]?electrolysis|safe/i,
  material_workpiece: /(D2|A2|S7|M2|H13|4140|4340|O1|W1|stainless|304|316|17-4|Inconel|Ti[\s-]?6Al[\s-]?4V|titanium|carbide|WC[-\s]?Co|PCD|brass\s+plate|beryllium|CuBe)/i,
  tolerance_target: /(?:tolerance|tol|Ra)\s*[:=±+]?\s*\d/i,
};

const PASS_SCORE_FLOOR = 70;

// ============================================================================
// ENGINE
// ============================================================================

class WEDMLoRAReasoningEvaluatorEngine {
  private config: WedmReasoningConfig = {
    ...DEFAULT_CONFIG,
    required_dimensions: [...DEFAULT_CONFIG.required_dimensions],
  };

  setConfig(config: Partial<WedmReasoningConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      required_dimensions: config.required_dimensions
        ? [...config.required_dimensions]
        : this.config.required_dimensions,
    };
  }

  getConfig(): WedmReasoningConfig {
    return {
      ...this.config,
      required_dimensions: [...this.config.required_dimensions],
    };
  }

  evaluate(output: string): WedmReasoningEvaluation {
    const findings: WedmReasoningFinding[] = [];

    const coherence = this.evaluateCoherence(output, findings);
    const domain = this.evaluateDomainKnowledge(output, findings);
    const justification = this.evaluateJustification(output, findings);
    const structure = this.evaluateStructure(output, findings);
    const completeness = this.evaluateCompleteness(output, findings);

    const overall =
      coherence * AXIS_WEIGHTS.coherence +
      domain * AXIS_WEIGHTS.domain_knowledge +
      justification * AXIS_WEIGHTS.justification +
      structure * AXIS_WEIGHTS.structure +
      completeness * AXIS_WEIGHTS.completeness;

    const passed = overall / 100 >= this.config.pass_threshold;

    return {
      overall_score: Math.round(overall),
      coherence: Math.round(coherence),
      domain_knowledge: Math.round(domain),
      justification: Math.round(justification),
      structure: Math.round(structure),
      completeness: Math.round(completeness),
      findings,
      passed,
    };
  }

  /**
   * Coherence — penalize logical contradictions; empty input is auto-zero.
   */
  private evaluateCoherence(output: string, findings: WedmReasoningFinding[]): number {
    if (output.trim().length === 0) {
      findings.push({
        category: "coherence", severity: "high",
        message: "Output is empty — no coherence to evaluate",
        recommendation: "Emit a non-empty response with reasoning steps",
      });
      return 0;
    }

    let score = 100;
    for (const [pattern1, pattern2, msg] of CONTRADICTION_PAIRS) {
      if (pattern1.test(output) && pattern2.test(output)) {
        score -= 25;
        findings.push({
          category: "coherence", severity: "medium",
          message: `Logical contradiction: ${msg}`,
          recommendation: "Pick one path and remove the contradiction",
        });
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Domain knowledge — count distinct WEDM-vocabulary terms; cap at the
   * configured threshold so a single output doesn't need to spam every term.
   */
  private evaluateDomainKnowledge(output: string, findings: WedmReasoningFinding[]): number {
    const hits = new Set<string>();
    for (const term of WEDM_DOMAIN_TERMS) {
      // Word-boundary regex avoids short terms (e.g. "ip") matching inside
      // unrelated words (e.g. "ipsum"). Escape special regex chars in term.
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|[^a-z0-9_-])${escaped}(?=$|[^a-z0-9_-])`, "i");
      if (re.test(output)) hits.add(term);
    }
    const required = this.config.domain_terms_required;
    const score = Math.min(100, (hits.size / required) * 100);
    if (hits.size === 0) {
      findings.push({
        category: "domain", severity: "high",
        message: "No WEDM domain terms detected in output",
        recommendation: "Reference wire / dielectric / E-code / pass / taper concepts explicitly",
      });
    } else if (hits.size < required) {
      findings.push({
        category: "domain", severity: "low",
        message: `${hits.size}/${required} domain terms present`,
        recommendation: "Expand domain vocabulary coverage for richer training signal",
      });
    }
    return score;
  }

  /**
   * Justification — count distinct causal connectives; absence of any
   * justification is high-severity (model is asserting without reasoning).
   */
  private evaluateJustification(output: string, findings: WedmReasoningFinding[]): number {
    const lower = output.toLowerCase();
    const hits = new Set<string>();
    for (const c of JUSTIFICATION_CONNECTIVES) {
      if (lower.includes(c)) hits.add(c);
    }
    const required = this.config.justification_connectives_required;
    const score = Math.min(100, (hits.size / required) * 100);
    if (hits.size === 0) {
      findings.push({
        category: "justification", severity: "high",
        message: "No justification connectives — output asserts without explaining",
        recommendation: "Add 'because / therefore / since' to tie choices to reasons",
      });
    } else if (hits.size < required) {
      findings.push({
        category: "justification", severity: "medium",
        message: `${hits.size}/${required} justification connectives present`,
        recommendation: "Strengthen reasoning with additional causal links",
      });
    }
    return score;
  }

  /**
   * Structure — credit step markers, structured bullets, headers, and
   * substantive length. Sub-200-char outputs cap at 60.
   */
  private evaluateStructure(output: string, findings: WedmReasoningFinding[]): number {
    let score = 30;
    const hits: string[] = [];
    if (/\bstep[\s-]?\d/i.test(output))                     { score += 20; hits.push("step markers"); }
    if (/(\n\s*[-*]\s+|\n\s*\d+\.\s+)/.test(output))         { score += 20; hits.push("bullets"); }
    if (/(^|\n)\s*#{1,3}\s+\S/.test(output))                 { score += 10; hits.push("headers"); }
    if (output.length >= this.config.min_length_for_structure) {
      score += 20;
      hits.push("substantive length");
    } else {
      score = Math.min(score, 60);
      findings.push({
        category: "structure", severity: "low",
        message: `Output is ${output.length} chars (< ${this.config.min_length_for_structure} threshold)`,
        recommendation: "Expand reasoning to at least the structure-length threshold",
      });
    }
    if (hits.length === 0) {
      findings.push({
        category: "structure", severity: "medium",
        message: "No structural markers (steps / bullets / headers) detected",
        recommendation: "Add step numbers or bullets to organize the reasoning",
      });
    }
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Completeness — fraction of required WEDM dimensions covered.
   */
  private evaluateCompleteness(output: string, findings: WedmReasoningFinding[]): number {
    const covered: WedmDimension[] = [];
    const missing: WedmDimension[] = [];
    for (const dim of this.config.required_dimensions) {
      if (DIMENSION_DETECTORS[dim].test(output)) {
        covered.push(dim);
      } else {
        missing.push(dim);
      }
    }
    const score = this.config.required_dimensions.length === 0
      ? 100
      : (covered.length / this.config.required_dimensions.length) * 100;
    if (missing.length > 0) {
      findings.push({
        category: "completeness", severity: missing.length > covered.length ? "high" : "medium",
        message: `Missing required dimensions: ${missing.join(", ")}`,
        recommendation: `Add reasoning for: ${missing.slice(0, 3).join(", ")}`,
      });
    }
    return Math.max(0, Math.min(100, score));
  }

  /** Convenience getter — does this output pass the configured threshold? */
  passes(output: string): boolean {
    return this.evaluate(output).passed;
  }

  /** Documented pass floor for downstream consumers. */
  passScoreFloor(): number {
    return PASS_SCORE_FLOOR;
  }
}

export const wedmLoRAReasoningEvaluatorEngine = new WEDMLoRAReasoningEvaluatorEngine();
