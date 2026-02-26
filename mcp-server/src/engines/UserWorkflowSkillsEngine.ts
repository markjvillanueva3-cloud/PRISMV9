/**
 * UserWorkflowSkillsEngine.ts — R8-MS6 User Workflow Skills
 * ===========================================================
 *
 * 12 guided workflow skills that take users from question to answer.
 * Each skill defines trigger patterns, required PRISM actions,
 * conversation flow steps, and persona adaptation.
 *
 * Skills:
 *   1. material-guide       — Material identification → properties → machining approach
 *   2. speed-feed-wizard    — Guided parameter selection + safety validation
 *   3. tool-select          — Material + operation → tool recommendation
 *   4. machine-setup        — Machine-specific setup guide + controller hints
 *   5. toolpath-advisor     — Strategy recommendation + comparison
 *   6. troubleshoot         — Diagnosis → root cause → parameter adjustment
 *   7. quality-analysis     — Cause analysis → parameter correction
 *   8. cost-optimization    — Optimization → cost comparison
 *   9. post-debug           — Controller-specific G-code validation
 *  10. fixture-selection    — Fixture recommendation + clamping analysis
 *  11. cycle-time-optimize  — Estimate → optimization suggestions
 *  12. quoting-assistance   — Full cost breakdown → quote recommendation
 *
 * @version 1.0.0 — R8-MS6
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SkillStep {
  id: string;
  action: string;
  description: string;
  required_params: string[];
  optional_params: string[];
  depends_on?: string;
}

export interface PersonaAdaptation {
  machinist: { detail_level: "minimal" | "standard" | "detailed"; focus: string };
  programmer: { detail_level: "minimal" | "standard" | "detailed"; focus: string };
  manager: { detail_level: "minimal" | "standard" | "detailed"; focus: string };
}

export interface WorkflowSkill {
  id: string;
  name: string;
  description: string;
  trigger_patterns: string[];
  trigger_regex: RegExp[];
  required_actions: string[];
  data_dependencies: string[];
  steps: SkillStep[];
  fallback_behavior: string;
  persona_adaptation: PersonaAdaptation;
  category: "parameter" | "strategy" | "diagnosis" | "cost" | "setup";
  estimated_steps: number;
}

// ─── Skill Definitions ──────────────────────────────────────────────────────

const SKILLS: WorkflowSkill[] = [
  // 1. Material Guide
  {
    id: "material-guide",
    name: "Material Guide",
    description: "Identify material, show properties, recommend machining approach",
    trigger_patterns: [
      "what material", "identify material", "material properties",
      "machining approach for", "how to machine",
    ],
    trigger_regex: [
      /what\s+(is|material)/i,
      /identify\s+this\s+material/i,
      /how\s+(do\s+I|to)\s+machine/i,
      /material\s+properties/i,
    ],
    required_actions: ["material_search", "material_get", "speed_feed_calc"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "identify", action: "material_search", description: "Search for material by name or spec", required_params: ["query"], optional_params: ["iso_group"] },
      { id: "properties", action: "material_get", description: "Get full material properties", required_params: ["material_id"], optional_params: [], depends_on: "identify" },
      { id: "approach", action: "speed_feed_calc", description: "Calculate baseline parameters", required_params: ["material", "tool_diameter"], optional_params: ["operation"], depends_on: "properties" },
    ],
    fallback_behavior: "If material not found, suggest closest matches and ask for clarification",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "practical machining tips and speeds" },
      programmer: { detail_level: "detailed", focus: "ISO group, machinability index, thermal properties" },
      manager: { detail_level: "minimal", focus: "cost implications and supplier options" },
    },
    category: "parameter",
    estimated_steps: 3,
  },

  // 2. Speed & Feed Wizard
  {
    id: "speed-feed-wizard",
    name: "Speed & Feed Wizard",
    description: "Guided parameter selection with safety validation",
    trigger_patterns: [
      "what speed", "what feed", "speed and feed",
      "cutting parameters", "how fast", "rpm for",
    ],
    trigger_regex: [
      /what\s+(speed|feed|rpm)/i,
      /speed\s+and\s+feed/i,
      /cutting\s+param/i,
      /how\s+fast/i,
    ],
    required_actions: ["speed_feed_calc", "tool_life", "stability"],
    data_dependencies: ["material_registry", "tool_registry"],
    steps: [
      { id: "calc", action: "speed_feed_calc", description: "Calculate optimal speed and feed", required_params: ["material", "tool_diameter", "operation"], optional_params: ["machine_id", "depth", "width"] },
      { id: "safety", action: "cutting_force", description: "Verify cutting forces are safe", required_params: ["material", "Vc", "fz", "ap", "ae"], optional_params: [], depends_on: "calc" },
    ],
    fallback_behavior: "Use conservative parameters if material data incomplete",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "RPM, feed rate, DOC in shop units" },
      programmer: { detail_level: "detailed", focus: "all parameters with stability analysis" },
      manager: { detail_level: "minimal", focus: "cycle time and tool life estimate" },
    },
    category: "parameter",
    estimated_steps: 2,
  },

  // 3. Tool Select
  {
    id: "tool-select",
    name: "Tool Selection",
    description: "Recommend best tool for material and operation",
    trigger_patterns: [
      "what tool", "which tool", "tool for",
      "recommend a tool", "best endmill", "best drill",
    ],
    trigger_regex: [
      /what\s+tool/i,
      /which\s+tool/i,
      /recommend\s+a?\s*tool/i,
      /best\s+(endmill|drill|insert|cutter)/i,
    ],
    required_actions: ["tool_recommend", "tool_search"],
    data_dependencies: ["tool_registry", "material_registry"],
    steps: [
      { id: "recommend", action: "tool_recommend", description: "Get tool recommendations", required_params: ["material", "operation"], optional_params: ["machine_id", "budget"] },
      { id: "details", action: "tool_get", description: "Get detailed tool specs", required_params: ["tool_id"], optional_params: [], depends_on: "recommend" },
      { id: "params", action: "speed_feed_calc", description: "Calculate parameters for recommended tool", required_params: ["material", "tool_diameter"], optional_params: [], depends_on: "details" },
    ],
    fallback_behavior: "If no exact match, suggest generic carbide tool with conservative parameters",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "tool description, holder, stickout" },
      programmer: { detail_level: "detailed", focus: "geometry, coating, grade comparison" },
      manager: { detail_level: "minimal", focus: "cost per tool, estimated life" },
    },
    category: "parameter",
    estimated_steps: 3,
  },

  // 4. Machine Setup
  {
    id: "machine-setup",
    name: "Machine Setup Guide",
    description: "Machine-specific setup guide with controller hints",
    trigger_patterns: [
      "setting up", "machine setup", "setup my",
      "controller settings", "workholding",
    ],
    trigger_regex: [
      /set(ting)?\s+up/i,
      /machine\s+setup/i,
      /controller\s+(settings|hints)/i,
    ],
    required_actions: ["machine_get", "machine_capabilities"],
    data_dependencies: ["machine_registry"],
    steps: [
      { id: "machine", action: "machine_get", description: "Get machine specifications", required_params: ["machine_id"], optional_params: [] },
      { id: "capabilities", action: "machine_capabilities", description: "Check machine capabilities", required_params: ["machine_id"], optional_params: ["operation"] },
      { id: "setup", action: "setup_sheet_format", description: "Generate setup sheet", required_params: ["material", "operations"], optional_params: ["programmer"], depends_on: "capabilities" },
    ],
    fallback_behavior: "If machine not in registry, ask for spindle power and max RPM",
    persona_adaptation: {
      machinist: { detail_level: "detailed", focus: "step-by-step setup, G-code snippets" },
      programmer: { detail_level: "detailed", focus: "controller parameters, compensation values" },
      manager: { detail_level: "minimal", focus: "setup time estimate" },
    },
    category: "setup",
    estimated_steps: 3,
  },

  // 5. Toolpath Advisor
  {
    id: "toolpath-advisor",
    name: "Toolpath Strategy Advisor",
    description: "Strategy recommendation and comparison",
    trigger_patterns: [
      "best strategy", "toolpath for", "adaptive vs",
      "trochoidal", "high speed machining", "roughing strategy",
    ],
    trigger_regex: [
      /best\s+strategy/i,
      /toolpath\s+(for|strategy)/i,
      /adaptive\s+vs/i,
      /trochoidal/i,
      /(roughing|finishing)\s+strategy/i,
    ],
    required_actions: ["strategy_select", "what_if"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "select", action: "strategy_select", description: "Select best toolpath strategy", required_params: ["feature", "material"], optional_params: ["machine_id", "depth", "width"] },
      { id: "compare", action: "what_if", description: "Compare with alternative strategy", required_params: ["material", "operation"], optional_params: [], depends_on: "select" },
      { id: "params", action: "speed_feed_calc", description: "Calculate parameters for chosen strategy", required_params: ["material", "tool_diameter", "strategy"], optional_params: [], depends_on: "select" },
    ],
    fallback_behavior: "Default to conventional milling with moderate parameters",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "which strategy, key parameters" },
      programmer: { detail_level: "detailed", focus: "strategy comparison, engagement angles" },
      manager: { detail_level: "minimal", focus: "cycle time difference between strategies" },
    },
    category: "strategy",
    estimated_steps: 3,
  },

  // 6. Troubleshoot
  {
    id: "troubleshoot",
    name: "Troubleshooting",
    description: "Diagnose machining problems, find root cause, suggest fixes",
    trigger_patterns: [
      "getting chatter", "vibration", "tool breaking",
      "bad surface", "problem with", "troubleshoot",
    ],
    trigger_regex: [
      /chatter/i,
      /vibrat/i,
      /tool\s+break/i,
      /bad\s+surface/i,
      /troubleshoot/i,
      /problem\s+with/i,
    ],
    required_actions: ["failure_diagnose", "stability", "parameter_optimize"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "diagnose", action: "failure_diagnose", description: "Diagnose the problem", required_params: ["symptoms"], optional_params: ["material", "machine_id", "operation"] },
      { id: "analyze", action: "stability", description: "Check stability limits", required_params: ["material", "tool_diameter"], optional_params: ["spindle_speed"], depends_on: "diagnose" },
      { id: "fix", action: "parameter_optimize", description: "Suggest parameter adjustments", required_params: ["material", "operation"], optional_params: [], depends_on: "analyze" },
    ],
    fallback_behavior: "Ask for more symptoms if diagnosis unclear",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "what to change right now at the machine" },
      programmer: { detail_level: "detailed", focus: "root cause analysis, stability diagrams" },
      manager: { detail_level: "minimal", focus: "downtime impact, fix cost" },
    },
    category: "diagnosis",
    estimated_steps: 3,
  },

  // 7. Quality Analysis
  {
    id: "quality-analysis",
    name: "Quality Analysis",
    description: "Analyze quality issues, find causes, correct parameters",
    trigger_patterns: [
      "out of tolerance", "surface finish", "dimension wrong",
      "quality problem", "Ra too high", "part rejected",
    ],
    trigger_regex: [
      /out\s+of\s+tolerance/i,
      /surface\s+finish/i,
      /quality\s+problem/i,
      /Ra\s+(too|is)/i,
      /part\s+rejected/i,
    ],
    required_actions: ["quality_predict", "surface_finish", "deflection"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "predict", action: "quality_predict", description: "Predict quality with current parameters", required_params: ["material", "Vc", "fz", "ap"], optional_params: ["ae", "tool_diameter"] },
      { id: "correct", action: "parameter_optimize", description: "Optimize for quality target", required_params: ["material", "target_Ra"], optional_params: ["operation"], depends_on: "predict" },
    ],
    fallback_behavior: "If target not specified, aim for Ra 1.6 um (standard finish)",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "what to adjust, expected improvement" },
      programmer: { detail_level: "detailed", focus: "surface model, scallop analysis" },
      manager: { detail_level: "minimal", focus: "reject rate prediction" },
    },
    category: "diagnosis",
    estimated_steps: 2,
  },

  // 8. Cost Optimization
  {
    id: "cost-optimization",
    name: "Cost Optimization",
    description: "Reduce cycle time and machining cost",
    trigger_patterns: [
      "reduce cycle time", "cost optimization", "cheaper",
      "faster machining", "optimize cost", "save money",
    ],
    trigger_regex: [
      /reduce\s+cycle/i,
      /cost\s+optim/i,
      /(cheaper|faster)\s+machining/i,
      /save\s+money/i,
    ],
    required_actions: ["process_cost", "parameter_optimize", "cycle_time_estimate"],
    data_dependencies: ["material_registry", "tool_registry"],
    steps: [
      { id: "baseline", action: "process_cost", description: "Calculate current cost", required_params: ["material", "operations"], optional_params: ["machine_id", "shop_rate"] },
      { id: "optimize", action: "parameter_optimize", description: "Find optimal parameters for cost", required_params: ["material", "operation", "goal"], optional_params: [], depends_on: "baseline" },
      { id: "compare", action: "process_cost", description: "Calculate optimized cost", required_params: ["material", "operations"], optional_params: [], depends_on: "optimize" },
    ],
    fallback_behavior: "Show current cost breakdown even if optimization limited",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "parameter changes needed" },
      programmer: { detail_level: "detailed", focus: "full optimization path with tradeoffs" },
      manager: { detail_level: "detailed", focus: "cost savings, ROI, payback period" },
    },
    category: "cost",
    estimated_steps: 3,
  },

  // 9. Post Debug (G-code Validation)
  {
    id: "post-debug",
    name: "G-code Debug",
    description: "Controller-specific G-code validation and troubleshooting",
    trigger_patterns: [
      "g-code", "gcode", "program error",
      "alarm code", "controller error", "post processor",
    ],
    trigger_regex: [
      /g-?code/i,
      /program\s+error/i,
      /alarm\s+(code|error)/i,
      /post\s+processor/i,
    ],
    required_actions: ["alarm_decode", "alarm_fix", "machine_get"],
    data_dependencies: ["alarm_registry", "machine_registry"],
    steps: [
      { id: "decode", action: "alarm_decode", description: "Decode alarm or error code", required_params: ["code"], optional_params: ["controller", "machine_id"] },
      { id: "fix", action: "alarm_fix", description: "Get fix recommendations", required_params: ["code"], optional_params: ["controller"], depends_on: "decode" },
    ],
    fallback_behavior: "If alarm code not recognized, suggest checking controller manual section",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "what buttons to press, what to check" },
      programmer: { detail_level: "detailed", focus: "G-code line analysis, parameter range" },
      manager: { detail_level: "minimal", focus: "severity, expected downtime" },
    },
    category: "diagnosis",
    estimated_steps: 2,
  },

  // 10. Fixture Selection
  {
    id: "fixture-selection",
    name: "Fixture Selection",
    description: "Fixture recommendation and clamping analysis",
    trigger_patterns: [
      "how to hold", "fixture", "workholding",
      "clamp", "vise setup", "chuck",
    ],
    trigger_regex: [
      /how\s+to\s+hold/i,
      /fixture/i,
      /workholding/i,
      /clamp(ing)?/i,
      /vise/i,
    ],
    required_actions: ["cutting_force", "validate_workholding_setup"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "forces", action: "cutting_force", description: "Calculate cutting forces for clamping", required_params: ["material", "Vc", "fz", "ap", "ae"], optional_params: [] },
      { id: "clamp", action: "validate_workholding_setup", description: "Validate workholding setup", required_params: ["part_weight", "cutting_force_N"], optional_params: ["fixture_type"], depends_on: "forces" },
    ],
    fallback_behavior: "Recommend standard vise with 2x safety factor on clamping force",
    persona_adaptation: {
      machinist: { detail_level: "detailed", focus: "clamping force, jaw placement, indicators" },
      programmer: { detail_level: "standard", focus: "coordinate system, fixture offsets" },
      manager: { detail_level: "minimal", focus: "fixture cost, setup time" },
    },
    category: "setup",
    estimated_steps: 2,
  },

  // 11. Cycle Time Optimize
  {
    id: "cycle-time-optimize",
    name: "Cycle Time Optimization",
    description: "Estimate cycle time and suggest optimizations",
    trigger_patterns: [
      "how long", "cycle time", "estimate time",
      "faster", "reduce time", "time per part",
    ],
    trigger_regex: [
      /how\s+long/i,
      /cycle\s+time/i,
      /estimate\s+time/i,
      /time\s+per\s+part/i,
    ],
    required_actions: ["cycle_time_estimate", "parameter_optimize"],
    data_dependencies: ["material_registry"],
    steps: [
      { id: "estimate", action: "cycle_time_estimate", description: "Estimate current cycle time", required_params: ["material", "operations"], optional_params: ["machine_id"] },
      { id: "optimize", action: "parameter_optimize", description: "Find time-optimized parameters", required_params: ["material", "operation", "goal"], optional_params: [], depends_on: "estimate" },
    ],
    fallback_behavior: "Give rough estimate based on MRR and volume if detailed data unavailable",
    persona_adaptation: {
      machinist: { detail_level: "standard", focus: "time per operation, bottleneck operation" },
      programmer: { detail_level: "detailed", focus: "per-operation breakdown, rapid moves" },
      manager: { detail_level: "minimal", focus: "parts per hour, shift capacity" },
    },
    category: "cost",
    estimated_steps: 2,
  },

  // 12. Quoting Assistance
  {
    id: "quoting-assistance",
    name: "Quoting Assistance",
    description: "Full cost breakdown and quote recommendation",
    trigger_patterns: [
      "cost per part", "quote", "pricing",
      "how much", "estimate cost", "bid",
    ],
    trigger_regex: [
      /cost\s+per\s+part/i,
      /quote/i,
      /pricing/i,
      /how\s+much/i,
      /estimate\s+cost/i,
    ],
    required_actions: ["process_cost", "cycle_time_estimate", "tool_life"],
    data_dependencies: ["material_registry", "tool_registry"],
    steps: [
      { id: "cost", action: "process_cost", description: "Calculate full process cost", required_params: ["material", "operations"], optional_params: ["machine_id", "shop_rate", "batch_size"] },
      { id: "time", action: "cycle_time_estimate", description: "Estimate cycle time", required_params: ["material", "operations"], optional_params: [], depends_on: "cost" },
      { id: "tools", action: "tool_life", description: "Estimate tool costs", required_params: ["material", "Vc", "fz"], optional_params: [], depends_on: "cost" },
    ],
    fallback_behavior: "Use industry-average shop rate ($85/hr) if not specified",
    persona_adaptation: {
      machinist: { detail_level: "minimal", focus: "bottom line cost" },
      programmer: { detail_level: "standard", focus: "cost per operation breakdown" },
      manager: { detail_level: "detailed", focus: "full cost breakdown, margin analysis, batch pricing" },
    },
    category: "cost",
    estimated_steps: 3,
  },
];

// ─── Skill Access Functions ─────────────────────────────────────────────────

/** Get all workflow skills */
export function getAllSkills(): WorkflowSkill[] {
  return [...SKILLS];
}

/** Get a skill by ID */
export function getSkillById(id: string): WorkflowSkill | null {
  return SKILLS.find(s => s.id === id) ?? null;
}

/** Search skills by query */
export function searchSkills(query: string): WorkflowSkill[] {
  const lower = query.toLowerCase();
  return SKILLS.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.trigger_patterns.some(t => t.includes(lower)) ||
    s.category.includes(lower)
  );
}

/** Match a user query to the best skill */
export function matchSkill(query: string): { skill: WorkflowSkill; confidence: number; trigger: string } | null {
  const lower = query.toLowerCase();
  let bestMatch: { skill: WorkflowSkill; confidence: number; trigger: string } | null = null;

  for (const skill of SKILLS) {
    // Check trigger phrases
    for (const phrase of skill.trigger_patterns) {
      if (lower.includes(phrase)) {
        const conf = 0.7 + (phrase.length / Math.max(lower.length, 1)) * 0.3;
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = { skill, confidence: Math.min(conf, 1.0), trigger: phrase };
        }
      }
    }

    // Check regex patterns
    for (const regex of skill.trigger_regex) {
      if (regex.test(lower)) {
        const conf = 0.65;
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = { skill, confidence: conf, trigger: `regex:${regex.source}` };
        }
      }
    }
  }

  return bestMatch;
}

/** Get skills by category */
export function getSkillsByCategory(category: string): WorkflowSkill[] {
  return SKILLS.filter(s => s.category === category);
}

/** Get skill step details */
export function getSkillSteps(skillId: string): SkillStep[] {
  const skill = getSkillById(skillId);
  return skill ? [...skill.steps] : [];
}

/** Get persona-adapted skill info */
export function getSkillForPersona(
  skillId: string,
  persona: "machinist" | "programmer" | "manager",
): { skill: WorkflowSkill; adaptation: PersonaAdaptation[typeof persona] } | null {
  const skill = getSkillById(skillId);
  if (!skill) return null;
  return { skill: { ...skill }, adaptation: skill.persona_adaptation[persona] };
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Actions:
 *   skill_list       — List all workflow skills
 *   skill_get        — Get skill by ID
 *   skill_search     — Search skills by query
 *   skill_match      — Match user query to best skill
 *   skill_steps      — Get skill execution steps
 *   skill_for_persona — Get persona-adapted skill info
 */
export function userWorkflowSkills(action: string, params: Record<string, any>): any {
  switch (action) {
    case "skill_list": {
      const category = params.category;
      const skills = category ? getSkillsByCategory(category) : getAllSkills();
      return {
        total: skills.length,
        skills: skills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          estimated_steps: s.estimated_steps,
        })),
      };
    }

    case "skill_get": {
      const skill = getSkillById(params.skill_id ?? "");
      if (!skill) return { error: "Skill not found", skill_id: params.skill_id };
      return skill;
    }

    case "skill_search": {
      const results = searchSkills(params.query ?? "");
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

    case "skill_match": {
      const match = matchSkill(params.query ?? "");
      if (!match) return { matched: false, query: params.query };
      return {
        matched: true,
        skill_id: match.skill.id,
        skill_name: match.skill.name,
        confidence: match.confidence,
        trigger: match.trigger,
        steps: match.skill.steps.length,
        required_actions: match.skill.required_actions,
      };
    }

    case "skill_steps": {
      const steps = getSkillSteps(params.skill_id ?? "");
      if (steps.length === 0) return { error: "Skill not found or has no steps" };
      return { skill_id: params.skill_id, steps };
    }

    case "skill_for_persona": {
      const persona = params.persona ?? "machinist";
      const result = getSkillForPersona(params.skill_id ?? "", persona);
      if (!result) return { error: "Skill not found" };
      return {
        skill_id: result.skill.id,
        name: result.skill.name,
        persona,
        detail_level: result.adaptation.detail_level,
        focus: result.adaptation.focus,
        steps: result.skill.estimated_steps,
      };
    }

    default:
      throw new Error(`UserWorkflowSkillsEngine: unknown action "${action}"`);
  }
}
