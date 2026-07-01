/**
 * SamplingWorkflowEngine — MCP Sampling Workflow Generator
 *
 * Implements structured MCP sampling workflows that enable the server to
 * request help from the LLM client during complex manufacturing decisions.
 * Each workflow defines a decision point where human/LLM input improves
 * the result.
 *
 * Workflows generate structured sampling request objects (messages, system
 * prompts, tool sets) that can be sent via MCP's createMessage sampling
 * API. The server orchestrates multi-step analysis by chaining sampling
 * requests with PRISM physics results.
 *
 * Actions:
 *   sampling_feasibility      — Fixture/access resolution sampling
 *   sampling_cam_strategy     — Optimal CAM strategy selection sampling
 *   sampling_post_processor   — Controller dialect verification sampling
 *   sampling_print_to_program — Full autonomous description→G-code chain
 *   sampling_self_correct_sf  — Self-correcting speed/feed iteration loop
 *
 * @module SamplingWorkflowEngine
 * @see sampling.ts for MCP sampling primitives
 */

import { SAMPLING_TOOL_SETS, type SamplingTool } from "../mcp/sampling.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Role in a sampling message */
type MessageRole = "user" | "assistant";

/** A single message in a sampling conversation */
interface SamplingMessage {
  role: MessageRole;
  content: string;
}

/** Core sampling request structure sent via MCP createMessage */
interface SamplingRequest {
  messages: SamplingMessage[];
  maxTokens: number;
  systemPrompt: string;
  tools?: SamplingTool[];
  includeContext?: string;
  modelPreferences?: {
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
}

/** Constraint identified during feasibility analysis */
interface FeasibilityConstraint {
  type: "fixture" | "access" | "clearance" | "rigidity" | "thermal" | "tolerance";
  severity: "critical" | "warning" | "info";
  description: string;
  affectedOperations: string[];
}

/** Open question requiring LLM resolution */
interface OpenQuestion {
  id: string;
  question: string;
  options?: string[];
  defaultAnswer?: string;
}

/** Ranked strategy with tradeoffs */
interface RankedStrategy {
  name: string;
  score: number;
  tradeoffs: string[];
  suitability: string;
}

/** Controller dialect match result */
interface DialectMatch {
  dialect: string;
  confidence: number;
  features: string[];
  limitations?: string[];
}

/** A step in a multi-step sampling chain */
interface ChainStep {
  step: number;
  name: string;
  samplingRequest: SamplingRequest;
  dependsOn?: number[];
  outputKey: string;
}

/** Speed/feed iteration result */
interface SFIteration {
  iteration: number;
  sfParams: {
    rpm: number;
    feedPerTooth: number;
    axialDepth: number;
    radialDepth: number;
  };
  simulationResult: {
    force_N: number;
    toolLife_min: number;
    surfaceRoughness_um: number;
    mrr_cm3_min: number;
    power_kW: number;
  };
  adjustment: string;
  convergenceMetric: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Controller dialect database — 20 dialects with identifying features */
const CONTROLLER_DIALECTS: Record<string, {
  family: string;
  features: string[];
  identifiers: string[];
  hsmSupport?: string;
}> = {
  "fanuc_0i": { family: "Fanuc", features: ["G05", "macro_b"], identifiers: ["Fanuc 0i", "0i-F", "0i-TF"], hsmSupport: "G05.1" },
  "fanuc_16i": { family: "Fanuc", features: ["G05", "macro_b", "look_ahead"], identifiers: ["Fanuc 16i", "16i-MB"], hsmSupport: "G05.1" },
  "fanuc_18i": { family: "Fanuc", features: ["G05", "macro_b"], identifiers: ["Fanuc 18i", "18i-MB"], hsmSupport: "G05.1" },
  "fanuc_30i": { family: "Fanuc", features: ["G05.1", "AICC", "nano_smooth", "macro_b"], identifiers: ["Fanuc 30i", "30i-B"], hsmSupport: "G05.1 Q1" },
  "fanuc_31i": { family: "Fanuc", features: ["G05.1", "AICC", "nano_smooth", "macro_b"], identifiers: ["Fanuc 31i", "31i-B5"], hsmSupport: "G05.1 Q1" },
  "siemens_828d": { family: "Siemens", features: ["CYCLE832", "ShopMill", "top_surface"], identifiers: ["Sinumerik 828D", "828D"], hsmSupport: "CYCLE832" },
  "siemens_840d": { family: "Siemens", features: ["CYCLE832", "COMPCAD", "spline_interp", "compile_cycles"], identifiers: ["Sinumerik 840D", "840D sl"], hsmSupport: "CYCLE832" },
  "siemens_one": { family: "Siemens", features: ["CYCLE832", "digital_twin", "AI_optimize"], identifiers: ["Sinumerik ONE", "S-ONE"], hsmSupport: "CYCLE832" },
  "heidenhain_tnc640": { family: "Heidenhain", features: ["G187", "ADP", "AFC", "cycle_32"], identifiers: ["TNC 640", "iTNC 640"], hsmSupport: "G187" },
  "heidenhain_tnc7": { family: "Heidenhain", features: ["G187", "ADP", "AFC", "dynamic_precision"], identifiers: ["TNC 7", "TNC7"], hsmSupport: "G187" },
  "haas_ngc": { family: "Haas", features: ["G187", "macro_b_subset", "TCPC"], identifiers: ["Haas NGC", "NGC", "Haas Next Gen"], hsmSupport: "G187 P1-P3" },
  "mazak_smoothai": { family: "Mazak", features: ["G05.1", "smooth_machining", "AI_thermal"], identifiers: ["SmoothAi", "Smooth Ai"], hsmSupport: "G05.1" },
  "mazak_smoothg": { family: "Mazak", features: ["G05.1", "mazatrol", "EIA"], identifiers: ["SmoothG", "Smooth G"], hsmSupport: "G05.1" },
  "okuma_p300": { family: "Okuma", features: ["G134", "super_nurbs", "navi"], identifiers: ["OSP-P300", "P300A"], hsmSupport: "G134" },
  "okuma_p500": { family: "Okuma", features: ["G134", "super_nurbs", "5axis_auto_tuning"], identifiers: ["OSP-P500", "P500"], hsmSupport: "G134" },
  "brother": { family: "Brother", features: ["G05", "high_speed_tap", "overlap_corner"], identifiers: ["Brother CNC", "Brother C00"], hsmSupport: "G05" },
  "mitsubishi": { family: "Mitsubishi", features: ["G05.1", "SSS_control", "OMR"], identifiers: ["Mitsubishi M800", "M80", "M800W"], hsmSupport: "G05.1" },
  "fagor": { family: "Fagor", features: ["HSC_mode", "RTCP"], identifiers: ["Fagor 8060", "Fagor 8070", "Fagor CNC"], hsmSupport: "HSC" },
  "generic_iso": { family: "Generic", features: ["G00", "G01", "G02", "G03"], identifiers: ["Generic", "ISO 6983"], hsmSupport: undefined },
  "generic_conversational": { family: "Generic", features: ["conversational", "graphical"], identifiers: ["Conversational", "Shop mode"], hsmSupport: undefined },
};

/** Kienzle specific cutting force coefficients by ISO group */
const KIENZLE_DEFAULTS: Record<string, { kc1_1: number; mc: number; description: string }> = {
  P: { kc1_1: 1800, mc: 0.25, description: "Steel (carbon/alloy)" },
  M: { kc1_1: 2100, mc: 0.25, description: "Stainless steel" },
  K: { kc1_1: 1100, mc: 0.25, description: "Cast iron" },
  N: { kc1_1: 700, mc: 0.23, description: "Non-ferrous (aluminum)" },
  S: { kc1_1: 2800, mc: 0.25, description: "Superalloys (Ti, Inconel)" },
  H: { kc1_1: 3200, mc: 0.28, description: "Hardened steel" },
};

/** Taylor tool life constants by ISO group */
const TAYLOR_DEFAULTS: Record<string, { C: number; n: number }> = {
  P: { C: 250, n: 0.25 },
  M: { C: 180, n: 0.20 },
  K: { C: 300, n: 0.28 },
  N: { C: 600, n: 0.40 },
  S: { C: 120, n: 0.15 },
  H: { C: 150, n: 0.18 },
};

/** Standard operations with typical parameters */
const OPERATION_PROFILES: Record<string, {
  type: string;
  typicalAe: number;
  typicalAp: number;
  description: string;
}> = {
  face_milling: { type: "milling", typicalAe: 0.7, typicalAp: 2.0, description: "Face milling — large ae, moderate ap" },
  slot_milling: { type: "milling", typicalAe: 1.0, typicalAp: 1.0, description: "Slot milling — full width engagement" },
  profile_milling: { type: "milling", typicalAe: 0.3, typicalAp: 1.5, description: "Profile/contour milling" },
  pocket_milling: { type: "milling", typicalAe: 0.5, typicalAp: 1.0, description: "Pocket roughing" },
  finishing: { type: "milling", typicalAe: 0.1, typicalAp: 0.5, description: "Finish pass — light cuts" },
  drilling: { type: "holemaking", typicalAe: 1.0, typicalAp: 3.0, description: "Drilling — full engagement" },
  tapping: { type: "holemaking", typicalAe: 1.0, typicalAp: 1.5, description: "Tapping" },
  turning_rough: { type: "turning", typicalAe: 3.0, typicalAp: 2.0, description: "Turning roughing" },
  turning_finish: { type: "turning", typicalAe: 0.5, typicalAp: 0.3, description: "Turning finishing" },
  hsm_roughing: { type: "milling", typicalAe: 0.15, typicalAp: 3.0, description: "HSM roughing — low ae, high ap" },
};

/** Combined tool set for feasibility sampling */
const FEASIBILITY_TOOLS: SamplingTool[] = [
  ...SAMPLING_TOOL_SETS.materialResolve,
  ...SAMPLING_TOOL_SETS.machineSelect,
  {
    name: "feasibility_check",
    description: "Run PRISM feasibility analysis on a part with operations. Returns constraints, fixture issues, and access problems.",
    inputSchema: {
      type: "object",
      properties: {
        partDescription: { type: "string", description: "Part geometry description" },
        operations: { type: "array", items: { type: "string" }, description: "List of operations" },
        material: { type: "string" },
      },
      required: ["partDescription", "operations", "material"],
    },
  },
];

/** Combined tool set for CAM strategy sampling */
const CAM_STRATEGY_TOOLS: SamplingTool[] = [
  ...SAMPLING_TOOL_SETS.speedFeedValidate,
  {
    name: "cam_strategy_list",
    description: "List available CAM strategies for a material/operation combo. Returns ranked strategies with physics scores.",
    inputSchema: {
      type: "object",
      properties: {
        material: { type: "string" },
        operation: { type: "string" },
        machineAxes: { type: "number", description: "Number of axes (3, 4, or 5)" },
      },
      required: ["material", "operation"],
    },
  },
];

/** Combined tool set for print-to-program chain */
const PROGRAM_CHAIN_TOOLS: SamplingTool[] = [
  ...SAMPLING_TOOL_SETS.materialResolve,
  ...SAMPLING_TOOL_SETS.speedFeedValidate,
  ...SAMPLING_TOOL_SETS.machineSelect,
  {
    name: "tool_search",
    description: "Search tool catalog for suitable cutting tools. Returns tools with geometry, grades, and recommended parameters.",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string" },
        material: { type: "string" },
        diameter_mm: { type: "number" },
      },
      required: ["operation"],
    },
  },
];

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Resolve ISO material group from a material description string.
 * Heuristic matching against common material names.
 *
 * @param material - Material name or description
 * @returns ISO group letter (P/M/K/N/S/H) or "P" as default
 */
function resolveISOGroup(material: string): string {
  const m = material.toLowerCase();
  if (/alumin|al\s?\d|6061|7075|2024/.test(m)) return "N";
  if (/stainless|ss\s?\d|304|316|17-4|inox/.test(m)) return "M";
  if (/inconel|hastelloy|waspaloy|nimonic|rene/.test(m)) return "S";
  if (/titani|ti[\s-]?\d|ti-6|grade\s?5/.test(m)) return "S";
  if (/cast\s*iron|grey\s*iron|ductile|ggg|fcd/.test(m)) return "K";
  if (/hard|hrc\s*[4-9]|hrc\s*[5-6]\d|d2|m2|cpm|s7/.test(m)) return "H";
  return "P"; // Default to steel
}

/**
 * Calculate basic Kienzle cutting force.
 * Fc = kc1.1 * ap * fz^(1 - mc)
 *
 * @param isoGroup - ISO material group
 * @param ap - Axial depth of cut (mm)
 * @param fz - Feed per tooth (mm)
 * @returns Cutting force in Newtons
 */
function kienzleForce(isoGroup: string, ap: number, fz: number): number {
  const k = KIENZLE_DEFAULTS[isoGroup] ?? KIENZLE_DEFAULTS["P"];
  return k.kc1_1 * ap * Math.pow(Math.max(fz, 0.01), 1 - k.mc);
}

/**
 * Calculate Taylor tool life.
 * T = (C / Vc)^(1/n)
 *
 * @param isoGroup - ISO material group
 * @param vc - Cutting speed (m/min)
 * @returns Tool life in minutes
 */
function taylorLife(isoGroup: string, vc: number): number {
  const t = TAYLOR_DEFAULTS[isoGroup] ?? TAYLOR_DEFAULTS["P"];
  if (vc <= 0) return 999;
  return Math.pow(t.C / vc, 1 / t.n);
}

/**
 * Calculate basic speed/feed parameters from material and tool.
 *
 * @param material - Material name
 * @param toolDiameter - Tool diameter in mm
 * @param operation - Operation type
 * @returns Calculated S/F parameters
 */
function calculateBaseSF(
  material: string,
  toolDiameter: number,
  operation: string
): { rpm: number; feedPerTooth: number; vc: number; axialDepth: number; radialDepth: number } {
  const iso = resolveISOGroup(material);
  // Base cutting speed by ISO group (m/min)
  const vcBase: Record<string, number> = { P: 180, M: 120, K: 200, N: 400, S: 50, H: 80 };
  const vc = vcBase[iso] ?? 180;
  const rpm = Math.round((vc * 1000) / (Math.PI * toolDiameter));

  // Feed per tooth by ISO group (mm/tooth)
  const fzBase: Record<string, number> = { P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.05, H: 0.06 };
  const fz = fzBase[iso] ?? 0.10;

  const profile = OPERATION_PROFILES[operation] ?? OPERATION_PROFILES["pocket_milling"];
  const ap = profile.typicalAp;
  const ae = profile.typicalAe * toolDiameter;

  return { rpm, feedPerTooth: fz, vc, axialDepth: ap, radialDepth: ae };
}

/**
 * Match a machine/controller string against the 20 controller dialects.
 * Returns scored matches sorted by confidence.
 *
 * @param machine - Machine name or model
 * @param controller - Optional explicit controller name
 * @param features - Optional feature requirements
 * @returns Sorted array of dialect matches
 */
function matchControllerDialect(
  machine: string,
  controller?: string,
  features?: string[]
): DialectMatch[] {
  const searchStr = `${machine} ${controller ?? ""}`.toLowerCase();
  const results: DialectMatch[] = [];

  for (const [dialectKey, dialect] of Object.entries(CONTROLLER_DIALECTS)) {
    let score = 0;

    // Match against identifiers
    for (const id of dialect.identifiers) {
      if (searchStr.includes(id.toLowerCase())) {
        score += 50;
      }
    }

    // Match against family name
    if (searchStr.includes(dialect.family.toLowerCase())) {
      score += 20;
    }

    // Bonus for feature matches
    if (features) {
      for (const feat of features) {
        if (dialect.features.some(f => f.toLowerCase().includes(feat.toLowerCase()))) {
          score += 10;
        }
      }
    }

    // Machine brand heuristics
    if (/haas|vf-|dm-|umc-/.test(searchStr) && dialect.family === "Haas") score += 30;
    if (/dmg|mori|dmg\s*mori/.test(searchStr) && dialect.family === "Siemens") score += 15;
    if (/mazak|integrex|variaxis/.test(searchStr) && dialect.family === "Mazak") score += 30;
    if (/okuma|multus|genos/.test(searchStr) && dialect.family === "Okuma") score += 30;
    if (/brother|speedio/.test(searchStr) && dialect.family === "Brother") score += 30;
    if (/hermle|grob|makino/.test(searchStr) && dialect.family === "Heidenhain") score += 15;

    if (score > 0) {
      results.push({
        dialect: dialectKey,
        confidence: Math.min(score / 100, 1.0),
        features: dialect.features,
        limitations: dialect.hsmSupport ? undefined : ["No HSM interpolation support"],
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  // If no matches, return generic ISO
  if (results.length === 0) {
    results.push({
      dialect: "generic_iso",
      confidence: 0.3,
      features: CONTROLLER_DIALECTS["generic_iso"].features,
      limitations: ["Generic dialect — verify G-code compatibility"],
    });
  }

  return results;
}

// ─── Engine Class ────────────────────────────────────────────────────────────

/**
 * SamplingWorkflowEngine generates structured MCP sampling request objects
 * for complex manufacturing decisions. Each action builds a workflow that
 * can be executed via the MCP sampling API (createMessage with tools).
 *
 * The engine does NOT execute the sampling itself — it produces the
 * request structures that the MCP server layer sends to the client.
 * This separation keeps the engine testable and deterministic.
 *
 * @example
 * ```ts
 * const result = samplingWorkflowEngine.calculate("sampling_feasibility", {
 *   partDescription: "Aluminum bracket with 3 pockets and 12 holes",
 *   operations: ["face_milling", "pocket_milling", "drilling"],
 *   material: "6061-T6",
 * });
 * // result.samplingRequest is ready for MCP createMessage
 * ```
 */
export class SamplingWorkflowEngine {
  /**
   * Main dispatch method — routes to the appropriate workflow generator.
   *
   * @param action - One of the 5 sampling workflow actions
   * @param params - Action-specific parameters
   * @returns Workflow-specific result with sampling request(s)
   */
  calculate(action: string, params: Record<string, unknown>): Record<string, unknown> {
    switch (action) {
      case "sampling_feasibility":
        return this.feasibilityWorkflow(params);
      case "sampling_cam_strategy":
        return this.camStrategyWorkflow(params);
      case "sampling_post_processor":
        return this.postProcessorWorkflow(params);
      case "sampling_print_to_program":
        return this.printToProgramWorkflow(params);
      case "sampling_self_correct_sf":
        return this.selfCorrectSFWorkflow(params);
      default:
        return { error: `Unknown action: ${action}`, availableActions: [
          "sampling_feasibility", "sampling_cam_strategy", "sampling_post_processor",
          "sampling_print_to_program", "sampling_self_correct_sf",
        ]};
    }
  }

  // ─── Action 1: Feasibility Sampling ──────────────────────────────────────

  /**
   * Generate a sampling request for fixture/access resolution.
   *
   * Analyzes the part description and operations to identify feasibility
   * constraints (fixture strategy, tool access, clearance, rigidity).
   * Produces a structured prompt asking the LLM to help resolve fixture
   * strategy and access issues using PRISM feasibility tools.
   *
   * @param params - { partDescription, operations, material, machineType? }
   * @returns { samplingRequest, context: { constraints, openQuestions } }
   */
  private feasibilityWorkflow(params: Record<string, unknown>): Record<string, unknown> {
    const partDescription = String(params.partDescription ?? "unknown part");
    const operations = (Array.isArray(params.operations) ? params.operations : []).map(String);
    const material = String(params.material ?? "steel");
    const machineType = params.machineType ? String(params.machineType) : undefined;

    const isoGroup = resolveISOGroup(material);
    const constraints = this.analyzeFeasibilityConstraints(partDescription, operations, material, machineType);
    const openQuestions = this.generateFeasibilityQuestions(constraints, partDescription);

    // Build rich context for the LLM
    const constraintSummary = constraints
      .map(c => `[${c.severity.toUpperCase()}] ${c.type}: ${c.description} (affects: ${c.affectedOperations.join(", ")})`)
      .join("\n");

    const systemPrompt =
      "You are a manufacturing feasibility expert with deep knowledge of " +
      "workholding, fixturing, and tool access for CNC machining. " +
      "Analyze the constraints identified by PRISM and recommend a " +
      "fixture strategy that resolves all access issues. " +
      "Use the provided tools to validate your recommendations. " +
      "Consider: (1) number of setups needed, (2) datum strategy, " +
      "(3) workholding method (vise/fixture/vacuum/magnetic), " +
      "(4) potential interference between operations. " +
      `Material ISO group: ${isoGroup} (${KIENZLE_DEFAULTS[isoGroup]?.description ?? "unknown"}).`;

    const userMessage =
      `Resolve feasibility constraints for this part:\n\n` +
      `**Part:** ${partDescription}\n` +
      `**Material:** ${material} (ISO ${isoGroup})\n` +
      `**Operations:** ${operations.join(", ")}\n` +
      (machineType ? `**Machine:** ${machineType}\n` : "") +
      `\n**Identified Constraints:**\n${constraintSummary}\n\n` +
      `**Questions to resolve:**\n` +
      openQuestions.map(q => `- ${q.question}`).join("\n") +
      `\n\nRecommend a complete fixture strategy with setup sequence.`;

    const samplingRequest: SamplingRequest = {
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
      systemPrompt,
      tools: FEASIBILITY_TOOLS,
      modelPreferences: {
        intelligencePriority: 0.9,
        speedPriority: 0.3,
        costPriority: 0.3,
      },
    };

    return {
      samplingRequest,
      context: {
        constraints,
        openQuestions,
        isoGroup,
        operationCount: operations.length,
        estimatedSetups: this.estimateSetupCount(operations),
      },
    };
  }

  /**
   * Analyze part/operations for feasibility constraints.
   * Heuristic analysis based on operation types and part description.
   */
  private analyzeFeasibilityConstraints(
    partDescription: string,
    operations: string[],
    material: string,
    machineType?: string
  ): FeasibilityConstraint[] {
    const constraints: FeasibilityConstraint[] = [];
    const desc = partDescription.toLowerCase();
    const isoGroup = resolveISOGroup(material);

    // Fixture constraints from geometry keywords
    if (/thin\s*wall|thin\s*section|wall\s*thickness\s*[<]\s*[23]/.test(desc)) {
      constraints.push({
        type: "rigidity",
        severity: "critical",
        description: "Thin wall detected — risk of vibration and deflection during cutting",
        affectedOperations: operations.filter(o => /milling|pocket/.test(o)),
      });
    }

    if (/deep\s*pocket|pocket.*deep|depth.*[>]\s*[4-9]/.test(desc)) {
      constraints.push({
        type: "access",
        severity: "warning",
        description: "Deep pocket — tool reach and chip evacuation concerns",
        affectedOperations: operations.filter(o => /pocket|slot/.test(o)),
      });
    }

    if (/undercut|back\s*face|internal\s*groove/.test(desc)) {
      constraints.push({
        type: "access",
        severity: "critical",
        description: "Undercut feature — requires special tooling or multi-setup access",
        affectedOperations: operations,
      });
    }

    // Multi-side machining detection
    const sideKeywords = ["top", "bottom", "left", "right", "front", "back", "both sides", "all sides"];
    const sidesFound = sideKeywords.filter(s => desc.includes(s));
    if (sidesFound.length >= 2) {
      constraints.push({
        type: "fixture",
        severity: "warning",
        description: `Multi-side machining detected (${sidesFound.join(", ")}) — multiple setups needed`,
        affectedOperations: operations,
      });
    }

    // Tolerance constraints
    if (/±\s*0\.0[0-2]|tolerance.*tight|h[67]\s*fit|js[67]/.test(desc)) {
      constraints.push({
        type: "tolerance",
        severity: "warning",
        description: "Tight tolerances — fixture must provide excellent repeatability and rigidity",
        affectedOperations: operations,
      });
    }

    // Material-specific constraints
    if (isoGroup === "S") {
      constraints.push({
        type: "thermal",
        severity: "warning",
        description: "Superalloy material — thermal management critical, fixture must allow coolant access",
        affectedOperations: operations,
      });
    }

    if (isoGroup === "N" && /thin|sheet/.test(desc)) {
      constraints.push({
        type: "fixture",
        severity: "warning",
        description: "Thin aluminum — vacuum or soft jaws recommended to prevent distortion",
        affectedOperations: operations,
      });
    }

    // Machine-specific constraints
    if (machineType && /3[\s-]*axis/.test(machineType.toLowerCase())) {
      const needs5ax = operations.some(o => /contour|5.?ax|impeller|blisk/.test(o));
      if (needs5ax) {
        constraints.push({
          type: "access",
          severity: "critical",
          description: "Operations require multi-axis access but machine is 3-axis — need indexing fixture or redesign",
          affectedOperations: operations.filter(o => /contour|5.?ax|impeller|blisk/.test(o)),
        });
      }
    }

    // Clearance for large tools
    if (operations.some(o => /face_milling/.test(o)) && /small|compact|miniature/.test(desc)) {
      constraints.push({
        type: "clearance",
        severity: "info",
        description: "Face mill may have clearance issues on compact part — verify tool diameter fits",
        affectedOperations: operations.filter(o => /face/.test(o)),
      });
    }

    // Default: always add a fixture strategy question
    if (constraints.length === 0) {
      constraints.push({
        type: "fixture",
        severity: "info",
        description: "Standard part — confirm workholding strategy (vise, fixture plate, or custom)",
        affectedOperations: operations,
      });
    }

    return constraints;
  }

  /**
   * Generate open questions from identified constraints.
   */
  private generateFeasibilityQuestions(
    constraints: FeasibilityConstraint[],
    partDescription: string
  ): OpenQuestion[] {
    const questions: OpenQuestion[] = [];
    let id = 1;

    // Always ask about workholding
    questions.push({
      id: `FQ-${id++}`,
      question: "What workholding method is preferred?",
      options: ["Vise", "Fixture plate with clamps", "Vacuum", "Magnetic chuck", "Custom fixture", "Soft jaws"],
      defaultAnswer: "Vise",
    });

    // Constraint-driven questions
    for (const c of constraints) {
      if (c.type === "access" && c.severity === "critical") {
        questions.push({
          id: `FQ-${id++}`,
          question: `How to access: ${c.description}? Can the part be reoriented, or is special tooling needed?`,
          options: ["Additional setup/flip", "Lollipop cutter", "5-axis tilt", "Redesign feature"],
        });
      }
      if (c.type === "rigidity") {
        questions.push({
          id: `FQ-${id++}`,
          question: "What support strategy for thin features?",
          options: ["Wax fill", "Support material", "Reduced cutting parameters", "Rest machining sequence"],
        });
      }
      if (c.type === "thermal") {
        questions.push({
          id: `FQ-${id++}`,
          question: "What coolant strategy for thermal management?",
          options: ["Flood coolant", "High-pressure through-tool", "MQL", "Cryogenic LN2/CO2"],
        });
      }
    }

    // Multi-setup question
    if (constraints.some(c => c.description.includes("multi-side") || c.description.includes("multiple setups"))) {
      questions.push({
        id: `FQ-${id++}`,
        question: "What datum strategy across setups?",
        options: ["Datum holes in first setup", "Edge-find each setup", "Probe reference points", "Pallet system"],
      });
    }

    return questions;
  }

  /**
   * Estimate number of setups from operation types.
   */
  private estimateSetupCount(operations: string[]): number {
    const hasMultiSide = operations.some(o => /flip|back|bottom|reverse/.test(o));
    const has5ax = operations.some(o => /5.?ax|contour_5|swarf/.test(o));
    if (has5ax) return 1; // 5-axis can often do single setup
    if (hasMultiSide) return 2;
    return operations.length > 5 ? 2 : 1;
  }

  // ─── Action 2: CAM Strategy Sampling ─────────────────────────────────────

  /**
   * Generate a sampling request for optimal CAM strategy selection.
   *
   * Ranks available strategies using Kienzle/Taylor physics, then generates
   * a sampling request asking the LLM to verify and refine the selection
   * based on feature geometry and tolerance requirements.
   *
   * @param params - { material, operation, features, tolerance, surfaceFinish, machineAxes }
   * @returns { samplingRequest, rankedStrategies }
   */
  private camStrategyWorkflow(params: Record<string, unknown>): Record<string, unknown> {
    const material = String(params.material ?? "steel");
    const operation = String(params.operation ?? "pocket_milling");
    const features = (Array.isArray(params.features) ? params.features : []).map(String);
    const tolerance = Number(params.tolerance ?? 0.05);
    const surfaceFinish = Number(params.surfaceFinish ?? 3.2);
    const machineAxes = Number(params.machineAxes ?? 3);

    const isoGroup = resolveISOGroup(material);
    const rankedStrategies = this.rankStrategies(isoGroup, operation, tolerance, surfaceFinish, machineAxes);

    const strategyTable = rankedStrategies
      .map((s, i) => `${i + 1}. **${s.name}** (score: ${s.score.toFixed(1)}/100)\n   Suitability: ${s.suitability}\n   Tradeoffs: ${s.tradeoffs.join("; ")}`)
      .join("\n");

    const systemPrompt =
      "You are a CAM programming expert. Review the physics-ranked strategies " +
      "from PRISM and select the best one for the given part features. " +
      "Consider: (1) feature geometry and accessibility, (2) tolerance " +
      "requirements, (3) surface finish targets, (4) cycle time. " +
      "Use the provided tools to validate speed/feed for your chosen strategy. " +
      `Material: ${material} (ISO ${isoGroup}), Tolerance: ±${tolerance}mm, Ra: ${surfaceFinish}μm.`;

    const userMessage =
      `Select optimal CAM strategy:\n\n` +
      `**Material:** ${material} (ISO ${isoGroup})\n` +
      `**Operation:** ${operation}\n` +
      `**Features:** ${features.length > 0 ? features.join(", ") : "standard"}\n` +
      `**Tolerance:** ±${tolerance} mm\n` +
      `**Surface finish:** Ra ${surfaceFinish} μm\n` +
      `**Machine axes:** ${machineAxes}\n\n` +
      `**PRISM-ranked strategies:**\n${strategyTable}\n\n` +
      `Validate the top strategy with speed/feed calculations and confirm ` +
      `or override the ranking based on the specific features.`;

    const samplingRequest: SamplingRequest = {
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1536,
      systemPrompt,
      tools: CAM_STRATEGY_TOOLS,
      includeContext: "thisServer",
      modelPreferences: {
        intelligencePriority: 0.8,
        speedPriority: 0.5,
        costPriority: 0.4,
      },
    };

    return {
      samplingRequest,
      rankedStrategies,
      context: {
        isoGroup,
        kienzleParams: KIENZLE_DEFAULTS[isoGroup],
        taylorParams: TAYLOR_DEFAULTS[isoGroup],
      },
    };
  }

  /**
   * Rank CAM strategies based on physics and requirements.
   */
  private rankStrategies(
    isoGroup: string,
    operation: string,
    tolerance: number,
    surfaceFinish: number,
    machineAxes: number
  ): RankedStrategy[] {
    const strategies: RankedStrategy[] = [];

    // Adaptive/HSM roughing
    if (/rough|pocket|slot/.test(operation)) {
      const score = isoGroup === "S" ? 95 : isoGroup === "H" ? 90 : 80;
      strategies.push({
        name: "Adaptive Clearing (HSM)",
        score: score - (machineAxes < 3 ? 20 : 0),
        tradeoffs: ["High MRR", "Consistent tool load", "Requires HSM-capable controller"],
        suitability: "Excellent for deep pockets and hard materials — constant chip load",
      });
    }

    // Trochoidal milling
    if (/slot|groove|narrow/.test(operation)) {
      strategies.push({
        name: "Trochoidal Milling",
        score: isoGroup === "H" || isoGroup === "S" ? 90 : 75,
        tradeoffs: ["Reduced radial force", "Good chip evacuation", "Longer cycle time"],
        suitability: "Best for narrow slots in hard materials — prevents full-width engagement",
      });
    }

    // Contour/profile
    if (/profile|contour|finish/.test(operation)) {
      const finishBonus = surfaceFinish <= 1.6 ? 15 : surfaceFinish <= 3.2 ? 5 : 0;
      strategies.push({
        name: "High-Speed Finishing",
        score: 70 + finishBonus + (machineAxes >= 5 ? 10 : 0),
        tradeoffs: ["Excellent surface finish", "Low tool wear", "Light cuts only"],
        suitability: `Targets Ra ≤${surfaceFinish}μm — uses high speed, low depth`,
      });
    }

    // Pencil finishing
    if (/finish|fillet|corner/.test(operation) && tolerance <= 0.02) {
      strategies.push({
        name: "Pencil Finishing",
        score: 85,
        tradeoffs: ["Cleans internal fillets", "Targeted passes only", "Needs good rest detection"],
        suitability: "Internal corner cleanup for tight tolerances",
      });
    }

    // 5-axis strategies
    if (machineAxes >= 5) {
      strategies.push({
        name: "5-Axis Swarf Cutting",
        score: /contour|wall|blade/.test(operation) ? 90 : 60,
        tradeoffs: ["Full flute engagement on walls", "Superior surface finish", "Complex programming"],
        suitability: "Ruled surface machining with side of tool — single pass walls",
      });
    }

    // Plunge roughing for deep features
    if (/deep|pocket.*deep/.test(operation) && isoGroup !== "N") {
      strategies.push({
        name: "Plunge Roughing",
        score: 75,
        tradeoffs: ["Axial force only", "Good for weak setups", "Leaves scallops"],
        suitability: "Deep features where radial force would cause chatter",
      });
    }

    // Standard approach as fallback
    strategies.push({
      name: "Conventional Zig-Zag",
      score: 50,
      tradeoffs: ["Simple programming", "All controllers support it", "Higher tool wear"],
      suitability: "Universal fallback — works everywhere but not optimal",
    });

    // Sort by score descending
    strategies.sort((a, b) => b.score - a.score);
    return strategies;
  }

  // ─── Action 3: Post-Processor Sampling ───────────────────────────────────

  /**
   * Generate a sampling request for controller dialect selection.
   *
   * Matches the machine/controller against 20 known dialects, scores
   * each match, and generates a sampling request asking the LLM to
   * verify the selection and configure dialect-specific features.
   *
   * @param params - { machine, controller?, features: string[] }
   * @returns { samplingRequest, bestMatch, alternatives }
   */
  private postProcessorWorkflow(params: Record<string, unknown>): Record<string, unknown> {
    const machine = String(params.machine ?? "");
    const controller = params.controller ? String(params.controller) : undefined;
    const features = (Array.isArray(params.features) ? params.features : []).map(String);

    const matches = matchControllerDialect(machine, controller, features);
    const bestMatch = matches[0];
    const alternatives = matches.slice(1, 4);

    const matchTable = matches.slice(0, 5)
      .map((m, i) => `${i + 1}. **${m.dialect}** (confidence: ${(m.confidence * 100).toFixed(0)}%)\n   Features: ${m.features.join(", ")}${m.limitations ? `\n   Limitations: ${m.limitations.join(", ")}` : ""}`)
      .join("\n");

    const dialectInfo = CONTROLLER_DIALECTS[bestMatch.dialect];
    const hsmInfo = dialectInfo?.hsmSupport
      ? `HSM command: ${dialectInfo.hsmSupport}`
      : "No HSM interpolation — use short linear segments";

    const systemPrompt =
      "You are a CNC post-processor expert. Verify the controller dialect " +
      "selection for this machine and configure any dialect-specific features. " +
      "Consider: (1) correct G-code dialect (Fanuc vs Siemens vs Heidenhain), " +
      "(2) HSM/look-ahead commands, (3) work offset format, (4) tool change " +
      "macro format, (5) any machine-specific quirks. " +
      `Best match: ${bestMatch.dialect} (${(bestMatch.confidence * 100).toFixed(0)}% confidence). ${hsmInfo}.`;

    const userMessage =
      `Verify post-processor dialect for:\n\n` +
      `**Machine:** ${machine}\n` +
      (controller ? `**Controller:** ${controller}\n` : "") +
      `**Required features:** ${features.length > 0 ? features.join(", ") : "standard"}\n\n` +
      `**PRISM dialect matches:**\n${matchTable}\n\n` +
      `Confirm the best match or select an alternative. ` +
      `Specify any dialect-specific configuration (work offset format, ` +
      `tool change sequence, program start/end blocks).`;

    const postTools: SamplingTool[] = [
      ...SAMPLING_TOOL_SETS.machineSelect,
      {
        name: "post_processor_test",
        description: "Test a post-processor dialect against sample G-code. Returns compatibility score and issues.",
        inputSchema: {
          type: "object",
          properties: {
            dialect: { type: "string", description: "Controller dialect key" },
            testCode: { type: "string", description: "Sample G-code to test" },
          },
          required: ["dialect"],
        },
      },
    ];

    const samplingRequest: SamplingRequest = {
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1024,
      systemPrompt,
      tools: postTools,
      modelPreferences: {
        intelligencePriority: 0.7,
        speedPriority: 0.6,
        costPriority: 0.5,
      },
    };

    return {
      samplingRequest,
      bestMatch: {
        dialect: bestMatch.dialect,
        confidence: bestMatch.confidence,
        family: dialectInfo?.family ?? "unknown",
        hsmCommand: dialectInfo?.hsmSupport ?? null,
        features: bestMatch.features,
      },
      alternatives: alternatives.map(a => ({
        dialect: a.dialect,
        confidence: a.confidence,
        features: a.features,
      })),
      totalDialectsChecked: Object.keys(CONTROLLER_DIALECTS).length,
    };
  }

  // ─── Action 4: Print-to-Program Chain ────────────────────────────────────

  /**
   * Generate a multi-step sampling chain: description to G-code.
   *
   * Produces a chain of 5 dependent sampling steps that, when executed
   * sequentially, transform a natural-language part description into a
   * complete CNC program. Each step's output feeds into the next.
   *
   * Steps: (1) parse features, (2) select tools, (3) sequence ops,
   * (4) generate S/F, (5) assemble program.
   *
   * @param params - { description, material?, machine? }
   * @returns { chain: ChainStep[], estimatedSteps, metadata }
   */
  private printToProgramWorkflow(params: Record<string, unknown>): Record<string, unknown> {
    const description = String(params.description ?? "");
    const material = String(params.material ?? "6061-T6 aluminum");
    const machine = String(params.machine ?? "Haas VF-2");

    const isoGroup = resolveISOGroup(material);
    const dialectMatches = matchControllerDialect(machine);
    const bestDialect = dialectMatches[0]?.dialect ?? "generic_iso";

    const chain: ChainStep[] = [];

    // Step 1: Parse features from description
    chain.push({
      step: 1,
      name: "Feature Extraction",
      outputKey: "features",
      samplingRequest: {
        messages: [{
          role: "user",
          content:
            `Extract all machining features from this part description:\n\n` +
            `"${description}"\n\n` +
            `Material: ${material} (ISO ${isoGroup})\n\n` +
            `For each feature, identify:\n` +
            `- Feature type (pocket, hole, slot, face, contour, chamfer, fillet, thread)\n` +
            `- Approximate dimensions (depth, width, diameter)\n` +
            `- Tolerance if mentioned\n` +
            `- Surface finish requirement if mentioned\n\n` +
            `Return a JSON array of features.`,
        }],
        maxTokens: 1024,
        systemPrompt:
          "You are a manufacturing engineer reading a part description. " +
          "Extract every machining feature with dimensions. Be thorough — " +
          "include implied features (e.g., a bracket implies face milling the datum). " +
          "Use the material search tool to confirm material properties.",
        tools: [...SAMPLING_TOOL_SETS.materialResolve],
        modelPreferences: { intelligencePriority: 0.8, speedPriority: 0.5, costPriority: 0.4 },
      },
    });

    // Step 2: Select tools for each feature
    chain.push({
      step: 2,
      name: "Tool Selection",
      outputKey: "tools",
      dependsOn: [1],
      samplingRequest: {
        messages: [{
          role: "user",
          content:
            `Select cutting tools for each feature from Step 1.\n\n` +
            `Material: ${material} (ISO ${isoGroup})\n` +
            `Machine: ${machine}\n\n` +
            `For each feature, recommend:\n` +
            `- Tool type and diameter\n` +
            `- Number of flutes\n` +
            `- Tool material/coating (carbide/HSS, TiAlN/AlCrN/uncoated)\n` +
            `- Holder type if relevant\n\n` +
            `Use the tool_search tool to find specific catalog tools. ` +
            `Minimize tool count by reusing tools across compatible features.`,
        }],
        maxTokens: 1024,
        systemPrompt:
          "You are a tool selection expert. Choose optimal cutting tools from " +
          "PRISM's catalog (46K+ tools). Prefer carbide for production, HSS " +
          "for prototyping. Match coating to ISO group. Minimize tool changes.",
        tools: PROGRAM_CHAIN_TOOLS,
        modelPreferences: { intelligencePriority: 0.7, speedPriority: 0.5, costPriority: 0.5 },
      },
    });

    // Step 3: Sequence operations
    chain.push({
      step: 3,
      name: "Operation Sequencing",
      outputKey: "sequence",
      dependsOn: [1, 2],
      samplingRequest: {
        messages: [{
          role: "user",
          content:
            `Sequence the operations from Steps 1-2 into an optimal order.\n\n` +
            `Rules:\n` +
            `- Face datum surfaces first\n` +
            `- Rough before finish\n` +
            `- Drill before tap\n` +
            `- Group by tool to minimize tool changes\n` +
            `- Heavy cuts before light cuts (to maintain rigidity)\n` +
            `- Chamfer/deburr last\n\n` +
            `Return an ordered list with tool change points marked.`,
        }],
        maxTokens: 768,
        systemPrompt:
          "You are a CNC programming expert. Sequence operations for " +
          "minimum cycle time while maintaining process integrity. " +
          "Consider: datum strategy, rigidity preservation, tool change time.",
        tools: [],
        modelPreferences: { intelligencePriority: 0.8, speedPriority: 0.6, costPriority: 0.3 },
      },
    });

    // Step 4: Generate speed/feed for each operation
    chain.push({
      step: 4,
      name: "Speed/Feed Calculation",
      outputKey: "speedFeeds",
      dependsOn: [2, 3],
      samplingRequest: {
        messages: [{
          role: "user",
          content:
            `Calculate speed and feed for each operation in the sequence.\n\n` +
            `Material: ${material} (ISO ${isoGroup})\n` +
            `Kienzle: kc1.1=${KIENZLE_DEFAULTS[isoGroup]?.kc1_1 ?? 1800} MPa, mc=${KIENZLE_DEFAULTS[isoGroup]?.mc ?? 0.25}\n` +
            `Taylor: C=${TAYLOR_DEFAULTS[isoGroup]?.C ?? 250}, n=${TAYLOR_DEFAULTS[isoGroup]?.n ?? 0.25}\n\n` +
            `Use sf_quick for each operation to get physics-validated parameters. ` +
            `Target 45-minute tool life for roughing, 60-minute for finishing. ` +
            `Check playbook for any material-specific warnings.`,
        }],
        maxTokens: 1536,
        systemPrompt:
          "You are a speeds and feeds expert. Use PRISM's sf_quick tool for " +
          "each operation to get physics-backed parameters. Verify force is " +
          "within machine power limits. Check playbook for best practices.",
        tools: [...SAMPLING_TOOL_SETS.speedFeedValidate],
        modelPreferences: { intelligencePriority: 0.7, speedPriority: 0.4, costPriority: 0.5 },
      },
    });

    // Step 5: Assemble final program
    chain.push({
      step: 5,
      name: "Program Assembly",
      outputKey: "program",
      dependsOn: [3, 4],
      samplingRequest: {
        messages: [{
          role: "user",
          content:
            `Assemble the final CNC program from the sequenced operations and S/F values.\n\n` +
            `Controller dialect: ${bestDialect}\n` +
            `Machine: ${machine}\n\n` +
            `Include:\n` +
            `- Program header (number, date, material, part name)\n` +
            `- Safety start block (G90, G17, G21/G20, home position)\n` +
            `- Tool changes with proper sequence\n` +
            `- Speed/feed for each operation from Step 4\n` +
            `- Coolant on/off (M8/M9)\n` +
            `- Proper retract heights between operations\n` +
            `- Program end (M30)\n\n` +
            `Output valid G-code for the ${bestDialect} dialect.`,
        }],
        maxTokens: 2048,
        systemPrompt:
          `You are a G-code expert for ${CONTROLLER_DIALECTS[bestDialect]?.family ?? "CNC"} controllers. ` +
          "Assemble a complete, safe, runnable CNC program. " +
          "Include comments for each operation. Verify all tool numbers " +
          "match the tool list. Use proper canned cycles where applicable.",
        tools: [],
        modelPreferences: { intelligencePriority: 0.9, speedPriority: 0.3, costPriority: 0.3 },
      },
    });

    return {
      chain,
      estimatedSteps: chain.length,
      metadata: {
        material,
        isoGroup,
        machine,
        controllerDialect: bestDialect,
        dialectConfidence: dialectMatches[0]?.confidence ?? 0,
        kienzleParams: KIENZLE_DEFAULTS[isoGroup],
        taylorParams: TAYLOR_DEFAULTS[isoGroup],
      },
    };
  }

  // ─── Action 5: Self-Correcting Speed/Feed ────────────────────────────────

  /**
   * Generate a self-correcting speed/feed iteration loop.
   *
   * Produces an iterative sampling workflow: calculate initial S/F using
   * Kienzle/Taylor physics, simulate cutting forces, evaluate against
   * target metric, and adjust. Converges when the target metric is within
   * acceptable bounds.
   *
   * @param params - { material, tool, operation, targetMetric }
   * @returns { iterations, convergence, finalParams }
   */
  private selfCorrectSFWorkflow(params: Record<string, unknown>): Record<string, unknown> {
    const material = String(params.material ?? "steel");
    const tool = params.tool as Record<string, unknown> | undefined ?? {};
    const toolDiameter = Number(tool.diameter_mm ?? tool.diameter ?? 10);
    const toolFlutes = Number(tool.flutes ?? 4);
    const operation = String(params.operation ?? "pocket_milling");
    const targetMetric = String(params.targetMetric ?? "tool_life") as "tool_life" | "surface_finish" | "mrr";

    const isoGroup = resolveISOGroup(material);
    const baseSF = calculateBaseSF(material, toolDiameter, operation);

    // Run convergence iterations (simulated — real execution would use sampling)
    const iterations = this.runConvergenceIterations(
      isoGroup, toolDiameter, toolFlutes, operation, baseSF, targetMetric
    );

    const finalIteration = iterations[iterations.length - 1];
    const converged = finalIteration ? finalIteration.convergenceMetric < 0.05 : false;

    // Build sampling request for the final verification step
    const systemPrompt =
      "You are a speed/feed optimization expert. Review the convergence " +
      "iterations from PRISM's physics engine and verify the final parameters. " +
      `Target metric: ${targetMetric}. Material: ${material} (ISO ${isoGroup}).` +
      " Check for any safety concerns or further optimization opportunities.";

    const iterationSummary = iterations.map(it =>
      `Iter ${it.iteration}: RPM=${it.sfParams.rpm}, fz=${it.sfParams.feedPerTooth.toFixed(3)}mm, ` +
      `Fc=${it.simulationResult.force_N.toFixed(0)}N, T=${it.simulationResult.toolLife_min.toFixed(1)}min, ` +
      `Ra=${it.simulationResult.surfaceRoughness_um.toFixed(2)}μm, MRR=${it.simulationResult.mrr_cm3_min.toFixed(1)}cm³/min — ${it.adjustment}`
    ).join("\n");

    const userMessage =
      `Verify self-correcting speed/feed result:\n\n` +
      `**Material:** ${material} (ISO ${isoGroup})\n` +
      `**Tool:** ∅${toolDiameter}mm, ${toolFlutes} flutes\n` +
      `**Operation:** ${operation}\n` +
      `**Target:** Optimize for ${targetMetric.replace("_", " ")}\n\n` +
      `**Convergence iterations:**\n${iterationSummary}\n\n` +
      `**Converged:** ${converged ? "Yes" : "No — may need manual adjustment"}\n\n` +
      `Review the final parameters and confirm they are safe and optimal. ` +
      `Use sf_quick and playbook_query to cross-check.`;

    const samplingRequest: SamplingRequest = {
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1536,
      systemPrompt,
      tools: [...SAMPLING_TOOL_SETS.speedFeedValidate],
      modelPreferences: {
        intelligencePriority: 0.8,
        speedPriority: 0.4,
        costPriority: 0.4,
      },
    };

    return {
      samplingRequest,
      iterations,
      convergence: {
        converged,
        iterations: iterations.length,
        finalMetric: finalIteration?.convergenceMetric ?? 1.0,
        targetMetric,
      },
      finalParams: finalIteration ? {
        rpm: finalIteration.sfParams.rpm,
        feedPerTooth_mm: finalIteration.sfParams.feedPerTooth,
        axialDepth_mm: finalIteration.sfParams.axialDepth,
        radialDepth_mm: finalIteration.sfParams.radialDepth,
        tableSpeed_mmMin: Math.round(finalIteration.sfParams.rpm * finalIteration.sfParams.feedPerTooth * toolFlutes),
        force_N: finalIteration.simulationResult.force_N,
        toolLife_min: finalIteration.simulationResult.toolLife_min,
        surfaceRoughness_um: finalIteration.simulationResult.surfaceRoughness_um,
        mrr_cm3_min: finalIteration.simulationResult.mrr_cm3_min,
        power_kW: finalIteration.simulationResult.power_kW,
      } : null,
    };
  }

  /**
   * Run simulated convergence iterations for speed/feed optimization.
   *
   * Each iteration: calculate forces (Kienzle), estimate tool life (Taylor),
   * compute surface roughness, evaluate target metric, adjust parameters.
   *
   * @param isoGroup - ISO material group
   * @param toolDiameter - Tool diameter in mm
   * @param flutes - Number of flutes
   * @param operation - Operation type
   * @param baseSF - Base speed/feed parameters
   * @param targetMetric - Optimization target
   * @returns Array of iteration results
   */
  private runConvergenceIterations(
    isoGroup: string,
    toolDiameter: number,
    flutes: number,
    operation: string,
    baseSF: { rpm: number; feedPerTooth: number; vc: number; axialDepth: number; radialDepth: number },
    targetMetric: "tool_life" | "surface_finish" | "mrr"
  ): SFIteration[] {
    const iterations: SFIteration[] = [];
    const maxIterations = 5;

    let rpm = baseSF.rpm;
    let fz = baseSF.feedPerTooth;
    let ap = baseSF.axialDepth;
    let ae = baseSF.radialDepth;

    // Target values
    const targets = {
      tool_life: { toolLife_min: 45, tolerance: 0.10 },
      surface_finish: { ra_um: 1.6, tolerance: 0.15 },
      mrr: { mrr_cm3_min: 50, tolerance: 0.10 },
    };

    for (let i = 0; i < maxIterations; i++) {
      // Kienzle cutting force: Fc = kc1.1 * ap * fz^(1-mc)
      const force = kienzleForce(isoGroup, ap, fz);

      // Cutting speed: Vc = π * D * n / 1000
      const vc = (Math.PI * toolDiameter * rpm) / 1000;

      // Taylor tool life: T = (C/Vc)^(1/n)
      const toolLife = taylorLife(isoGroup, vc);

      // Surface roughness estimate: Ra ≈ fz² / (32 * r), r ≈ D/2 corner radius approx
      const cornerRadius = Math.min(toolDiameter / 2, 0.8);
      const ra = (fz * fz) / (32 * cornerRadius) * 1000; // convert to μm

      // MRR: ae * ap * vf / 1000, vf = fz * z * n (mm³/min → cm³/min)
      const vf = fz * flutes * rpm;
      const mrr = (ae * ap * vf) / 1000;

      // Power: P = Fc * Vc / (60000)
      const power = (force * vc) / 60000;

      const simResult = {
        force_N: force,
        toolLife_min: toolLife,
        surfaceRoughness_um: ra,
        mrr_cm3_min: mrr,
        power_kW: power,
      };

      // Evaluate convergence against target
      let convergenceMetric: number;
      let adjustment: string;

      switch (targetMetric) {
        case "tool_life": {
          const target = targets.tool_life.toolLife_min;
          convergenceMetric = Math.abs(toolLife - target) / target;
          if (toolLife < target * 0.8) {
            // Tool life too short — reduce speed
            rpm = Math.round(rpm * 0.90);
            adjustment = `Tool life ${toolLife.toFixed(1)}min < ${target}min target → reduce RPM by 10%`;
          } else if (toolLife > target * 1.5) {
            // Tool life excessive — can push speed
            rpm = Math.round(rpm * 1.10);
            adjustment = `Tool life ${toolLife.toFixed(1)}min >> ${target}min target → increase RPM by 10%`;
          } else {
            adjustment = `Tool life ${toolLife.toFixed(1)}min ≈ ${target}min target — converged`;
          }
          break;
        }

        case "surface_finish": {
          const target = targets.surface_finish.ra_um;
          convergenceMetric = Math.abs(ra - target) / target;
          if (ra > target * 1.2) {
            // Too rough — reduce feed
            fz = fz * 0.85;
            adjustment = `Ra ${ra.toFixed(2)}μm > ${target}μm target → reduce fz by 15%`;
          } else if (ra < target * 0.5) {
            // Finer than needed — can increase feed for productivity
            fz = fz * 1.10;
            adjustment = `Ra ${ra.toFixed(2)}μm << ${target}μm target → increase fz by 10%`;
          } else {
            adjustment = `Ra ${ra.toFixed(2)}μm ≈ ${target}μm target — converged`;
          }
          break;
        }

        case "mrr": {
          const target = targets.mrr.mrr_cm3_min;
          convergenceMetric = Math.abs(mrr - target) / target;
          if (mrr < target * 0.8) {
            // MRR too low — increase depths and feed
            ap = ap * 1.15;
            fz = fz * 1.05;
            adjustment = `MRR ${mrr.toFixed(1)}cm³/min < ${target} target → increase ap by 15%, fz by 5%`;
          } else if (mrr > target * 1.3 && force > 2000) {
            // MRR high but force dangerous — back off
            ap = ap * 0.90;
            adjustment = `MRR ${mrr.toFixed(1)}cm³/min OK but Fc=${force.toFixed(0)}N high → reduce ap by 10%`;
          } else {
            adjustment = `MRR ${mrr.toFixed(1)}cm³/min ≈ ${target} target — converged`;
          }
          break;
        }

        default:
          convergenceMetric = 1.0;
          adjustment = "Unknown target metric";
      }

      iterations.push({
        iteration: i + 1,
        sfParams: { rpm, feedPerTooth: fz, axialDepth: ap, radialDepth: ae },
        simulationResult: simResult,
        adjustment,
        convergenceMetric,
      });

      // Stop if converged
      if (convergenceMetric < 0.05) break;
    }

    return iterations;
  }
}

/** Singleton instance */
export const samplingWorkflowEngine = new SamplingWorkflowEngine();
