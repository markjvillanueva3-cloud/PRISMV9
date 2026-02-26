/**
 * UserAssistanceSkillsEngine.ts — R8-MS7 User Assistance Skills
 * ===============================================================
 *
 * 10 assistance skills that EXPLAIN the work (vs workflow skills that DO it).
 * These build trust by showing WHY PRISM recommends specific parameters.
 *
 * Skills:
 *   1. explain-physics          — "WHY this speed?" → plain-language physics
 *   2. explain-recommendations  — "WHY this tool?" → decision rationale
 *   3. confidence-communication — "How sure are you?" → uncertainty bounds
 *   4. alternative-explorer     — "What else could work?" → runner-up options
 *   5. feedback-integration     — "That didn't work" → record + adjust
 *   6. safety-verification      — "Is this safe?" → S(x) score + risks
 *   7. documentation-setup      — "Give me a setup sheet" → printable doc
 *   8. decision-flow-diagrams   — "Walk me through this" → decision tree
 *   9. anti-machining-mistakes  — "Common mistakes?" → proactive warnings
 *  10. onboarding               — "I'm new to PRISM" → progressive tour
 *
 * @version 1.0.0 — R8-MS7
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssistanceSkill {
  id: string;
  name: string;
  description: string;
  category: "explain" | "verify" | "document" | "learn";
  trigger_patterns: string[];
  trigger_regex: RegExp[];
  response_template: string;
  data_sources: string[];
  persona_adaptation: {
    machinist: string;
    programmer: string;
    manager: string;
  };
}

export interface PhysicsExplanation {
  parameter: string;
  value: number | string;
  unit: string;
  explanation: string;
  factors: { name: string; effect: string; weight: string }[];
  simplified: string;
}

export interface ConfidenceReport {
  overall_confidence: number;
  data_quality: "high" | "medium" | "low";
  factors: { name: string; confidence: number; note: string }[];
  uncertainty_bounds: { parameter: string; low: number; high: number; unit: string }[];
  recommendation: string;
}

export interface AlternativeOption {
  rank: number;
  name: string;
  description: string;
  tradeoff: string;
  vs_primary: { better: string[]; worse: string[] };
}

export interface SafetyReport {
  score: number;
  grade: "SAFE" | "CAUTION" | "WARNING" | "DANGER";
  risks: { name: string; severity: "low" | "medium" | "high"; mitigation: string }[];
  limits_checked: string[];
  recommendation: string;
}

export interface CommonMistake {
  id: string;
  mistake: string;
  consequence: string;
  prevention: string;
  severity: "minor" | "moderate" | "severe";
  applies_to: string[];
}

// ─── Skill Definitions ──────────────────────────────────────────────────────

const ASSISTANCE_SKILLS: AssistanceSkill[] = [
  {
    id: "explain-physics",
    name: "Explain Physics",
    description: "Plain-language explanation of WHY specific parameters are recommended",
    category: "explain",
    trigger_patterns: ["why this speed", "why this feed", "explain parameters", "how does this work", "why not faster"],
    trigger_regex: [/why\s+(this|that)\s+(speed|feed|depth)/i, /explain\s+(the\s+)?param/i, /why\s+not\s+(faster|slower|deeper)/i],
    response_template: "The {parameter} is set to {value} {unit} because {explanation}.",
    data_sources: ["material_properties", "tool_specifications", "physics_models"],
    persona_adaptation: {
      machinist: "Keep it practical — relate to shop floor experience",
      programmer: "Include the math model and coefficients used",
      manager: "Focus on how this affects cost and quality",
    },
  },
  {
    id: "explain-recommendations",
    name: "Explain Recommendations",
    description: "Decision rationale showing why a specific tool/strategy was chosen",
    category: "explain",
    trigger_patterns: ["why this tool", "why not", "explain recommendation", "decision rationale", "alternatives considered"],
    trigger_regex: [/why\s+(this|that)\s+(tool|strategy|approach)/i, /explain\s+recommendation/i, /why\s+did\s+you\s+(choose|pick|recommend)/i],
    response_template: "I recommended {choice} because {reason}. Alternatives considered: {alternatives}.",
    data_sources: ["tool_registry", "strategy_engine", "material_compatibility"],
    persona_adaptation: {
      machinist: "Show the tool specs and why it fits this job",
      programmer: "Compare scored alternatives with ranking criteria",
      manager: "Cost-benefit analysis of chosen vs alternatives",
    },
  },
  {
    id: "confidence-communication",
    name: "Confidence Communication",
    description: "Uncertainty bounds and data quality assessment",
    category: "verify",
    trigger_patterns: ["how sure", "confidence", "how accurate", "uncertainty", "can I trust"],
    trigger_regex: [/how\s+(sure|confident|accurate)/i, /uncertainty/i, /can\s+I\s+trust/i, /how\s+reliable/i],
    response_template: "Confidence: {confidence}%. Based on {data_quality} data. {recommendation}.",
    data_sources: ["data_quality_metrics", "model_validation", "calibration_data"],
    persona_adaptation: {
      machinist: "Give a simple thumbs up/down with key caveats",
      programmer: "Show confidence intervals and data sources",
      manager: "Risk assessment — what happens if parameters are off",
    },
  },
  {
    id: "alternative-explorer",
    name: "Alternative Explorer",
    description: "Runner-up options with clear tradeoff analysis",
    category: "explain",
    trigger_patterns: ["what else", "alternatives", "other options", "another way", "could also use"],
    trigger_regex: [/what\s+else/i, /alternative/i, /other\s+option/i, /another\s+(way|approach)/i],
    response_template: "Besides {primary}, you could also: {alternatives_list}.",
    data_sources: ["tool_registry", "strategy_engine", "material_registry"],
    persona_adaptation: {
      machinist: "Practical alternatives with tool availability notes",
      programmer: "Scored comparison matrix",
      manager: "Cost comparison of alternatives",
    },
  },
  {
    id: "feedback-integration",
    name: "Feedback Integration",
    description: "Record actual outcomes and adjust future recommendations",
    category: "learn",
    trigger_patterns: ["that didn't work", "actual results", "tool lasted", "surface was", "feedback"],
    trigger_regex: [/didn'?t\s+work/i, /actual\s+results?/i, /tool\s+lasted/i, /surface\s+(finish\s+)?was/i],
    response_template: "Recorded: {outcome}. Adjusting future recommendations for {context}.",
    data_sources: ["job_learning_engine", "outcome_history"],
    persona_adaptation: {
      machinist: "Quick confirmation of what you observed",
      programmer: "Data point recorded with deviation analysis",
      manager: "Impact on future cost estimates and quality predictions",
    },
  },
  {
    id: "safety-verification",
    name: "Safety Verification",
    description: "S(x) safety score with risk factors and mitigation",
    category: "verify",
    trigger_patterns: ["is this safe", "safety check", "risk", "what could go wrong", "danger"],
    trigger_regex: [/is\s+(this|it)\s+safe/i, /safety\s+check/i, /what\s+could\s+go\s+wrong/i, /risk\s+(factor|assess)/i],
    response_template: "Safety Score: {score}. Grade: {grade}. {recommendation}.",
    data_sources: ["safety_engine", "force_calculations", "stability_analysis"],
    persona_adaptation: {
      machinist: "Clear go/no-go with specific warnings",
      programmer: "Full safety matrix with limit margins",
      manager: "Risk assessment and liability considerations",
    },
  },
  {
    id: "documentation-setup",
    name: "Documentation & Setup",
    description: "Generate printable setup sheets and documentation",
    category: "document",
    trigger_patterns: ["setup sheet", "print this", "documentation", "give me a sheet", "operator sheet"],
    trigger_regex: [/setup\s+sheet/i, /print\s+(this|out)/i, /operator\s+(sheet|doc)/i],
    response_template: "Setup sheet generated for {part}. Format: {format}.",
    data_sources: ["setup_sheet_engine", "job_plan"],
    persona_adaptation: {
      machinist: "Printable format with big, clear numbers",
      programmer: "Detailed with all parameters and G-code references",
      manager: "Include cost summary and time estimates",
    },
  },
  {
    id: "decision-flow-diagrams",
    name: "Decision Flow Diagrams",
    description: "Walk through the decision tree visually",
    category: "explain",
    trigger_patterns: ["walk me through", "decision tree", "how did you decide", "show the logic", "flow diagram"],
    trigger_regex: [/walk\s+me\s+through/i, /decision\s+tree/i, /show\s+(the\s+)?logic/i, /flow\s+diagram/i],
    response_template: "Decision flow: {steps}.",
    data_sources: ["decision_tree_engine", "workflow_chains"],
    persona_adaptation: {
      machinist: "Simple step-by-step walkthrough",
      programmer: "Full decision tree with branching logic",
      manager: "High-level process overview with key decision points",
    },
  },
  {
    id: "anti-machining-mistakes",
    name: "Anti-Machining Mistakes",
    description: "Proactive warnings about common mistakes per material/operation",
    category: "verify",
    trigger_patterns: ["common mistakes", "watch out for", "pitfalls", "beginner mistakes", "what to avoid"],
    trigger_regex: [/common\s+mistakes?/i, /watch\s+out/i, /pitfall/i, /what\s+to\s+avoid/i, /beginner/i],
    response_template: "Common mistakes for {context}: {mistakes_list}.",
    data_sources: ["failure_library", "material_properties", "experience_data"],
    persona_adaptation: {
      machinist: "Practical do's and don'ts from the shop floor",
      programmer: "Technical pitfalls and parameter traps",
      manager: "Cost of common mistakes and prevention ROI",
    },
  },
  {
    id: "onboarding",
    name: "Onboarding Tour",
    description: "Progressive disclosure tour for new PRISM users",
    category: "learn",
    trigger_patterns: ["new to prism", "getting started", "tutorial", "help me learn", "how do I use"],
    trigger_regex: [/new\s+to\s+prism/i, /getting\s+started/i, /tutorial/i, /how\s+do\s+I\s+use/i],
    response_template: "Welcome to PRISM! Let's start with {first_step}.",
    data_sources: ["onboarding_engine", "capability_overview"],
    persona_adaptation: {
      machinist: "Start with speed & feed — show value immediately",
      programmer: "Show the full action catalog and workflow chains",
      manager: "Demonstrate cost analysis and quoting capabilities",
    },
  },
];

// ─── Common Machining Mistakes Database ─────────────────────────────────────

const COMMON_MISTAKES: CommonMistake[] = [
  { id: "CM01", mistake: "Running too fast in stainless steel", consequence: "Work hardening, rapid tool wear, poor surface finish", prevention: "Keep speed below material's max Vc, use flood coolant", severity: "severe", applies_to: ["stainless", "316", "304", "duplex"] },
  { id: "CM02", mistake: "Insufficient chip load in titanium", consequence: "Rubbing instead of cutting, heat buildup, tool failure", prevention: "Maintain minimum fz — never go below 0.05mm/tooth", severity: "severe", applies_to: ["titanium", "Ti-6Al-4V", "Ti"] },
  { id: "CM03", mistake: "Too much radial engagement in aluminum", consequence: "Chip welding, built-up edge, poor surface finish", prevention: "Use sharp tools, high speed, air blast or MQL", severity: "moderate", applies_to: ["aluminum", "7075", "6061", "2024"] },
  { id: "CM04", mistake: "Ignoring tool stickout ratio", consequence: "Chatter, deflection, poor dimensional accuracy", prevention: "Keep L/D ratio below 4:1, use stub-length when possible", severity: "moderate", applies_to: ["all"] },
  { id: "CM05", mistake: "No peck cycle for deep holes", consequence: "Chip packing, drill breakage, hole quality issues", prevention: "Use peck drilling when depth > 3x diameter", severity: "severe", applies_to: ["drilling", "all"] },
  { id: "CM06", mistake: "Wrong coolant strategy for Inconel", consequence: "Thermal shock, insert cracking, inconsistent tool life", prevention: "Either flood consistently or go dry — never intermittent", severity: "severe", applies_to: ["inconel", "718", "625", "nickel"] },
  { id: "CM07", mistake: "Climb milling on loose workholding", consequence: "Part pull-out, crash, damaged workpiece", prevention: "Verify clamping force, consider conventional milling", severity: "severe", applies_to: ["all"] },
  { id: "CM08", mistake: "Not checking spindle warmup", consequence: "Thermal growth, dimensional drift on first parts", prevention: "Run warmup cycle, check first part dimensions", severity: "minor", applies_to: ["all", "precision"] },
  { id: "CM09", mistake: "Using worn inserts for finishing", consequence: "Poor surface finish, out-of-tolerance parts", prevention: "Track insert edges, change before finish passes", severity: "moderate", applies_to: ["turning", "milling", "all"] },
  { id: "CM10", mistake: "Ignoring interrupted cuts in turning", consequence: "Insert chipping, unpredictable tool life", prevention: "Use tougher insert grade, reduce DOC, check entry angle", severity: "moderate", applies_to: ["turning", "casting", "forging"] },
];

// ─── Access Functions ───────────────────────────────────────────────────────

/** Get all assistance skills */
export function getAllAssistanceSkills(): AssistanceSkill[] {
  return [...ASSISTANCE_SKILLS];
}

/** Get assistance skill by ID */
export function getAssistanceSkillById(id: string): AssistanceSkill | null {
  return ASSISTANCE_SKILLS.find(s => s.id === id) ?? null;
}

/** Search assistance skills */
export function searchAssistanceSkills(query: string): AssistanceSkill[] {
  const lower = query.toLowerCase();
  return ASSISTANCE_SKILLS.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.trigger_patterns.some(t => t.includes(lower)) ||
    s.category.includes(lower)
  );
}

/** Match query to best assistance skill */
export function matchAssistanceSkill(query: string): { skill: AssistanceSkill; confidence: number; trigger: string } | null {
  const lower = query.toLowerCase();
  let best: { skill: AssistanceSkill; confidence: number; trigger: string } | null = null;

  for (const skill of ASSISTANCE_SKILLS) {
    for (const phrase of skill.trigger_patterns) {
      if (lower.includes(phrase)) {
        const conf = 0.7 + (phrase.length / Math.max(lower.length, 1)) * 0.3;
        if (!best || conf > best.confidence) {
          best = { skill, confidence: Math.min(conf, 1.0), trigger: phrase };
        }
      }
    }
    for (const regex of skill.trigger_regex) {
      if (regex.test(lower)) {
        const conf = 0.65;
        if (!best || conf > best.confidence) {
          best = { skill, confidence: conf, trigger: `regex:${regex.source}` };
        }
      }
    }
  }
  return best;
}

/** Generate physics explanation */
export function explainPhysics(params: Record<string, any>): PhysicsExplanation {
  const param = params.parameter ?? "cutting_speed";
  const value = params.value ?? 200;
  const material = params.material ?? "Steel";

  const explanations: Record<string, { explanation: string; factors: PhysicsExplanation["factors"]; simplified: string }> = {
    cutting_speed: {
      explanation: `Based on the material's thermal conductivity and hardness, ${value} m/min keeps the cutting temperature in the optimal zone where the carbide tool performs best without excessive diffusion wear.`,
      factors: [
        { name: "Material hardness", effect: "Higher hardness → lower speed", weight: "high" },
        { name: "Tool coating", effect: "Better coating → higher speed possible", weight: "medium" },
        { name: "Coolant", effect: "Effective cooling → can push speed 10-20% higher", weight: "medium" },
      ],
      simplified: `${material} machines well at ${value} m/min — fast enough for productivity, slow enough for tool life.`,
    },
    feed_per_tooth: {
      explanation: `Feed of ${value} mm/tooth ensures each cutting edge removes enough material to cut cleanly rather than rub, while keeping chip thickness below the critical value for this material.`,
      factors: [
        { name: "Material ductility", effect: "More ductile → can handle higher feed", weight: "high" },
        { name: "Tool edge radius", effect: "Sharper edge → can use lower feed", weight: "medium" },
        { name: "Surface finish target", effect: "Better finish → lower feed needed", weight: "high" },
      ],
      simplified: `${value} mm/tooth gives a good balance between surface finish and cutting efficiency in ${material}.`,
    },
    axial_depth: {
      explanation: `Depth of ${value} mm uses the tool's cutting edge efficiently while keeping deflection within acceptable limits for the tool diameter and stickout.`,
      factors: [
        { name: "Tool diameter", effect: "Larger tool → can go deeper", weight: "high" },
        { name: "Tool stickout", effect: "More stickout → need to reduce depth", weight: "high" },
        { name: "Stability", effect: "Chatter risk increases with depth", weight: "medium" },
      ],
      simplified: `${value} mm depth works well here — deep enough to be productive, shallow enough to avoid chatter.`,
    },
  };

  const data = explanations[param] ?? explanations.cutting_speed;

  return {
    parameter: param,
    value,
    unit: param === "cutting_speed" ? "m/min" : param === "feed_per_tooth" ? "mm/tooth" : "mm",
    explanation: data.explanation,
    factors: data.factors,
    simplified: data.simplified,
  };
}

/** Generate confidence report */
export function assessConfidence(params: Record<string, any>): ConfidenceReport {
  const material = params.material ?? "Unknown";
  const hasMaterial = material !== "Unknown";
  const hasMachine = !!params.machine;
  const hasTool = !!params.tool;

  let confidence = 0.5;
  const factors: ConfidenceReport["factors"] = [];

  if (hasMaterial) {
    confidence += 0.2;
    factors.push({ name: "Material data", confidence: 0.9, note: "Calibrated Kienzle/Taylor data available" });
  } else {
    factors.push({ name: "Material data", confidence: 0.3, note: "Using generic estimates" });
  }

  if (hasMachine) {
    confidence += 0.15;
    factors.push({ name: "Machine specs", confidence: 0.85, note: "Power and speed limits known" });
  } else {
    factors.push({ name: "Machine specs", confidence: 0.4, note: "Assuming general-purpose machine" });
  }

  if (hasTool) {
    confidence += 0.1;
    factors.push({ name: "Tool data", confidence: 0.8, note: "Tool geometry and grade known" });
  } else {
    factors.push({ name: "Tool data", confidence: 0.5, note: "Using default tool assumptions" });
  }

  confidence = Math.min(confidence, 0.95);

  const dataQuality: ConfidenceReport["data_quality"] =
    confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low";

  return {
    overall_confidence: Math.round(confidence * 100) / 100,
    data_quality: dataQuality,
    factors,
    uncertainty_bounds: [
      { parameter: "cutting_speed", low: -15, high: 10, unit: "%" },
      { parameter: "feed_per_tooth", low: -20, high: 15, unit: "%" },
      { parameter: "tool_life", low: -30, high: 50, unit: "%" },
    ],
    recommendation: confidence >= 0.8
      ? "High confidence — parameters are well-supported by calibrated data"
      : confidence >= 0.6
        ? "Moderate confidence — consider a test cut with conservative parameters first"
        : "Low confidence — recommend starting 20% below suggested values and adjusting",
  };
}

/** Get common mistakes for context */
export function getCommonMistakes(params: Record<string, any>): CommonMistake[] {
  const material = (params.material ?? "").toLowerCase();
  const operation = (params.operation ?? "").toLowerCase();

  return COMMON_MISTAKES.filter(m =>
    m.applies_to.some(tag => {
      const t = tag.toLowerCase();
      return t === "all" || material.includes(t) || operation.includes(t);
    })
  );
}

/** Generate safety report */
export function generateSafetyReport(params: Record<string, any>): SafetyReport {
  const score = params.safety_score ?? 0.85;
  const grade: SafetyReport["grade"] =
    score >= 0.9 ? "SAFE" : score >= 0.7 ? "CAUTION" : score >= 0.5 ? "WARNING" : "DANGER";

  const risks: SafetyReport["risks"] = [];

  if (params.force_ratio && params.force_ratio > 0.8) {
    risks.push({ name: "High cutting forces", severity: "high", mitigation: "Reduce DOC or feed" });
  }
  if (params.deflection_mm && params.deflection_mm > 0.05) {
    risks.push({ name: "Tool deflection", severity: "medium", mitigation: "Reduce stickout or use stiffer tool" });
  }
  if (params.temperature_C && params.temperature_C > 800) {
    risks.push({ name: "High cutting temperature", severity: "high", mitigation: "Reduce speed or improve cooling" });
  }
  if (risks.length === 0) {
    risks.push({ name: "All parameters within limits", severity: "low", mitigation: "None required" });
  }

  return {
    score,
    grade,
    risks,
    limits_checked: ["spindle_power", "cutting_force", "tool_deflection", "temperature", "stability"],
    recommendation: grade === "SAFE"
      ? "Parameters are within safe limits. Proceed with confidence."
      : grade === "CAUTION"
        ? "Parameters are near limits. Monitor closely during first cuts."
        : grade === "WARNING"
          ? "Parameters exceed recommended limits. Reduce before cutting."
          : "STOP — parameters are dangerous. Do not proceed without review.",
  };
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Actions:
 *   assist_list          — List all assistance skills
 *   assist_get           — Get skill by ID
 *   assist_search        — Search skills
 *   assist_match         — Match query to best skill
 *   assist_explain       — Generate physics explanation
 *   assist_confidence    — Assess confidence
 *   assist_mistakes      — Get common mistakes
 *   assist_safety        — Generate safety report
 */
export function userAssistanceSkills(action: string, params: Record<string, any>): any {
  switch (action) {
    case "assist_list": {
      const category = params.category;
      const skills = category
        ? ASSISTANCE_SKILLS.filter(s => s.category === category)
        : ASSISTANCE_SKILLS;
      return {
        total: skills.length,
        skills: skills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
        })),
      };
    }

    case "assist_get": {
      const skill = getAssistanceSkillById(params.skill_id ?? "");
      if (!skill) return { error: "Skill not found", skill_id: params.skill_id };
      return skill;
    }

    case "assist_search": {
      const results = searchAssistanceSkills(params.query ?? "");
      return {
        query: params.query,
        total: results.length,
        results: results.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
        })),
      };
    }

    case "assist_match": {
      const match = matchAssistanceSkill(params.query ?? "");
      if (!match) return { matched: false, query: params.query };
      return {
        matched: true,
        skill_id: match.skill.id,
        skill_name: match.skill.name,
        confidence: match.confidence,
        trigger: match.trigger,
      };
    }

    case "assist_explain": {
      return explainPhysics(params);
    }

    case "assist_confidence": {
      return assessConfidence(params);
    }

    case "assist_mistakes": {
      const mistakes = getCommonMistakes(params);
      return {
        material: params.material,
        operation: params.operation,
        total: mistakes.length,
        mistakes,
      };
    }

    case "assist_safety": {
      return generateSafetyReport(params);
    }

    default:
      throw new Error(`UserAssistanceSkillsEngine: unknown action "${action}"`);
  }
}
