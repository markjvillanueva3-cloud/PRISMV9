/**
 * Extraction Intelligence Router
 *
 * Automatically reasons about extracted knowledge and routes it to
 * ALL systems where it can provide value. No extracted data should
 * sit unused or be wired to just one place.
 *
 * Pipeline: Extract → Classify → Route → Wire → Verify → Log
 *
 * @module engines/ExtractionIntelligenceRouter
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Classification of extracted content */
export interface ContentClassification {
  primary_type: ContentType;
  secondary_types: ContentType[];
  domain: KnowledgeDomain;
  specificity: "general" | "machine_specific" | "material_specific" | "operation_specific";
  confidence: number;
  tags: string[];
}

/** Types of extractable content */
export type ContentType =
  | "tribal_tip"           // Shop floor wisdom, best practices
  | "workflow_sequence"    // Order of operations, process flows
  | "formula"              // Mathematical relationships
  | "parameter_set"        // Cutting parameters, speeds/feeds
  | "material_property"    // Material characteristics
  | "tool_specification"   // Tool geometry, capabilities
  | "machine_capability"   // Machine specs, limits
  | "error_solution"       // Troubleshooting, error fixes
  | "quality_standard"     // Tolerances, inspection criteria
  | "safety_rule"          // Safety constraints, limits
  | "api_reference"        // Software API documentation
  | "ui_workflow"          // UI/UX patterns from CAD/CAM
  | "post_processor_rule"  // G-code generation rules
  | "algorithm"            // Computational methods
  | "case_study";          // Real-world examples

/** Knowledge domains */
export type KnowledgeDomain =
  | "milling"
  | "turning"
  | "wire_edm"
  | "sinker_edm"
  | "grinding"
  | "5axis"
  | "mill_turn"
  | "cad"
  | "cam"
  | "post_processing"
  | "quality"
  | "tooling"
  | "materials"
  | "fixturing"
  | "metrology"
  | "automation"
  | "general";

/** A consumer that can use extracted knowledge */
export interface KnowledgeConsumer {
  id: string;
  name: string;
  type: "engine" | "dispatcher" | "pipeline" | "registry" | "hook" | "algorithm";
  file_path: string;
  accepts: ContentType[];
  domains: KnowledgeDomain[];
  wiring_method: "direct_import" | "registry_add" | "config_update" | "code_gen" | "tip_inject";
  priority: number; // Higher = more important to wire
}

/** Routing decision for a piece of extracted content */
export interface RoutingDecision {
  content_id: string;
  classification: ContentClassification;
  routes: RouteTarget[];
  upgrade_suggestions: UpgradeSuggestion[];
  reasoning: string[];
  timestamp: string;
}

/** A specific routing target */
export interface RouteTarget {
  consumer: KnowledgeConsumer;
  relevance_score: number;
  wiring_action: string;
  status: "pending" | "wired" | "failed" | "skipped";
  reason?: string;
}

/** Suggested upgrade based on extracted knowledge */
export interface UpgradeSuggestion {
  target_system: string;
  suggestion_type: "new_capability" | "enhancement" | "optimization" | "integration";
  description: string;
  extracted_evidence: string;
  priority: "low" | "medium" | "high" | "critical";
  estimated_effort: "trivial" | "small" | "medium" | "large";
}

// ============================================================================
// CONSUMER REGISTRY — ALL PRISM SYSTEMS THAT CAN USE KNOWLEDGE
// ============================================================================

const KNOWLEDGE_CONSUMERS: KnowledgeConsumer[] = [
  // ─── TRIBAL KNOWLEDGE ENGINES ───
  {
    id: "tribal-knowledge-engine",
    name: "TribalKnowledgeEngine",
    type: "engine",
    file_path: "src/engines/TribalKnowledgeEngine.ts",
    accepts: ["tribal_tip", "error_solution", "safety_rule", "case_study"],
    domains: ["milling", "turning", "wire_edm", "sinker_edm", "grinding", "5axis", "mill_turn", "general"],
    wiring_method: "tip_inject",
    priority: 100,
  },
  {
    id: "machining-playbook-engine",
    name: "MachiningPlaybookEngine",
    type: "engine",
    file_path: "src/engines/MachiningPlaybookEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "error_solution", "case_study"],
    domains: ["milling", "turning", "5axis", "mill_turn", "general"],
    wiring_method: "registry_add",
    priority: 95,
  },

  // ─── SEQUENCING & WORKFLOW ENGINES ───
  {
    id: "workflow-template-engine",
    name: "WorkflowTemplateEngine",
    type: "engine",
    file_path: "src/engines/WorkflowTemplateEngine.ts",
    accepts: ["workflow_sequence", "ui_workflow"],
    domains: ["cad", "cam", "milling", "turning", "5axis", "general"],
    wiring_method: "direct_import",
    priority: 90,
  },
  {
    id: "intelligent-sequencing-engine",
    name: "IntelligentSequencingEngine",
    type: "engine",
    file_path: "src/engines/IntelligentSequencingEngine.ts",
    accepts: ["workflow_sequence", "tribal_tip", "case_study"],
    domains: ["milling", "turning", "5axis", "mill_turn", "general"],
    wiring_method: "direct_import",
    priority: 90,
  },
  {
    id: "operation-sequencer",
    name: "OperationSequencerEngine",
    type: "engine",
    file_path: "src/engines/OperationSequencerEngine.ts",
    accepts: ["workflow_sequence"],
    domains: ["milling", "turning", "5axis"],
    wiring_method: "registry_add",
    priority: 85,
  },

  // ─── CALCULATION ENGINES ───
  {
    id: "speed-feed-orchestrator",
    name: "SpeedFeedOrchestrator",
    type: "engine",
    file_path: "src/engines/SpeedFeedOrchestrator.ts",
    accepts: ["formula", "parameter_set", "material_property"],
    domains: ["milling", "turning", "grinding", "general"],
    wiring_method: "config_update",
    priority: 95,
  },
  {
    id: "kienzle-force-model",
    name: "KienzleForceModel",
    type: "engine",
    file_path: "src/engines/KienzleForceModel.ts",
    accepts: ["formula", "material_property"],
    domains: ["milling", "turning", "general"],
    wiring_method: "config_update",
    priority: 90,
  },
  {
    id: "cutting-force-engine",
    name: "CuttingForceEngine",
    type: "engine",
    file_path: "src/engines/CuttingForceEngine.ts",
    accepts: ["formula", "material_property", "parameter_set"],
    domains: ["milling", "turning", "general"],
    wiring_method: "config_update",
    priority: 90,
  },
  {
    id: "surface-finish-engine",
    name: "SurfaceFinishEngine",
    type: "engine",
    file_path: "src/engines/SurfaceFinishPredictor.ts",
    accepts: ["formula", "parameter_set", "quality_standard"],
    domains: ["milling", "turning", "grinding", "general"],
    wiring_method: "config_update",
    priority: 85,
  },
  {
    id: "tool-life-engine",
    name: "ToolLifeEngine",
    type: "engine",
    file_path: "src/engines/ToolLifeEngine.ts",
    accepts: ["formula", "parameter_set", "material_property", "tool_specification"],
    domains: ["milling", "turning", "general"],
    wiring_method: "config_update",
    priority: 85,
  },
  {
    id: "chatter-stability-engine",
    name: "ChatterStabilityLobe",
    type: "engine",
    file_path: "src/engines/ChatterStabilityLobe.ts",
    accepts: ["formula", "parameter_set", "machine_capability"],
    domains: ["milling", "turning", "general"],
    wiring_method: "config_update",
    priority: 85,
  },

  // ─── MACHINE-SPECIFIC ENGINES ───
  {
    id: "lathe-turning-engine",
    name: "LatheTurningEngine",
    type: "engine",
    file_path: "src/engines/LatheTurningEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set", "tool_specification"],
    domains: ["turning"],
    wiring_method: "tip_inject",
    priority: 80,
  },
  {
    id: "wire-edm-engine",
    name: "WireEDMEngine",
    type: "engine",
    file_path: "src/engines/WireEDMEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set", "material_property"],
    domains: ["wire_edm"],
    wiring_method: "tip_inject",
    priority: 80,
  },
  {
    id: "sinker-edm-engine",
    name: "SinkerEDMEngine",
    type: "engine",
    file_path: "src/engines/SinkerEDMEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set"],
    domains: ["sinker_edm"],
    wiring_method: "tip_inject",
    priority: 80,
  },
  {
    id: "grinding-engine",
    name: "GrindingEngine",
    type: "engine",
    file_path: "src/engines/GrindingEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set", "formula"],
    domains: ["grinding"],
    wiring_method: "tip_inject",
    priority: 80,
  },
  {
    id: "five-axis-engine",
    name: "FiveAxisEngine",
    type: "engine",
    file_path: "src/engines/FiveAxisEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set", "algorithm"],
    domains: ["5axis"],
    wiring_method: "tip_inject",
    priority: 80,
  },
  {
    id: "mill-turn-engine",
    name: "MillTurnEngine",
    type: "engine",
    file_path: "src/engines/MillTurnEngine.ts",
    accepts: ["tribal_tip", "workflow_sequence", "parameter_set"],
    domains: ["mill_turn"],
    wiring_method: "tip_inject",
    priority: 80,
  },

  // ─── POST PROCESSOR & CODE GEN ───
  {
    id: "post-processor-pipeline",
    name: "PostProcessorPipeline",
    type: "pipeline",
    file_path: "src/engines/PostProcessorPipeline.ts",
    accepts: ["post_processor_rule", "machine_capability", "safety_rule"],
    domains: ["post_processing", "milling", "turning", "5axis"],
    wiring_method: "config_update",
    priority: 85,
  },
  {
    id: "lathe-post-processor",
    name: "LathePostProcessor",
    type: "engine",
    file_path: "src/engines/LathePostProcessor.ts",
    accepts: ["post_processor_rule", "machine_capability"],
    domains: ["turning", "post_processing"],
    wiring_method: "config_update",
    priority: 80,
  },
  {
    id: "five-axis-post",
    name: "FiveAxisPost",
    type: "engine",
    file_path: "src/engines/FiveAxisPost.ts",
    accepts: ["post_processor_rule", "machine_capability", "algorithm"],
    domains: ["5axis", "post_processing"],
    wiring_method: "config_update",
    priority: 80,
  },

  // ─── PIPELINES ───
  {
    id: "print-to-program-pipeline",
    name: "PrintToProgramPipelineEngine",
    type: "pipeline",
    file_path: "src/engines/PrintToProgramPipelineEngine.ts",
    accepts: ["workflow_sequence", "tribal_tip", "quality_standard"],
    domains: ["cad", "cam", "milling", "turning", "general"],
    wiring_method: "direct_import",
    priority: 95,
  },
  {
    id: "turning-pipeline",
    name: "TurningPipelineEngine",
    type: "pipeline",
    file_path: "src/engines/TurningPipelineEngine.ts",
    accepts: ["workflow_sequence", "tribal_tip", "parameter_set"],
    domains: ["turning"],
    wiring_method: "direct_import",
    priority: 85,
  },
  {
    id: "multiaxis-pipeline",
    name: "MultiAxisPipelineEngine",
    type: "pipeline",
    file_path: "src/engines/MultiAxisPipelineEngine.ts",
    accepts: ["workflow_sequence", "tribal_tip", "algorithm"],
    domains: ["5axis", "milling"],
    wiring_method: "direct_import",
    priority: 85,
  },

  // ─── REGISTRIES ───
  {
    id: "material-registry",
    name: "MaterialRegistry",
    type: "registry",
    file_path: "src/registries/MaterialRegistry.ts",
    accepts: ["material_property"],
    domains: ["materials", "general"],
    wiring_method: "registry_add",
    priority: 90,
  },
  {
    id: "tool-catalog-engine",
    name: "ToolCatalogEngine",
    type: "registry",
    file_path: "src/engines/ToolCatalogEngine.ts",
    accepts: ["tool_specification"],
    domains: ["tooling", "general"],
    wiring_method: "registry_add",
    priority: 90,
  },
  {
    id: "machine-registry",
    name: "MachineRegistry",
    type: "registry",
    file_path: "src/registries/MachineRegistry.ts",
    accepts: ["machine_capability"],
    domains: ["milling", "turning", "wire_edm", "sinker_edm", "grinding", "5axis"],
    wiring_method: "registry_add",
    priority: 90,
  },
  {
    id: "formula-registry",
    name: "FormulaRegistry",
    type: "registry",
    file_path: "src/registries/FormulaRegistry.ts",
    accepts: ["formula"],
    domains: ["general"],
    wiring_method: "registry_add",
    priority: 95,
  },
  {
    id: "algorithm-registry",
    name: "AlgorithmRegistry",
    type: "registry",
    file_path: "src/registries/AlgorithmRegistry.ts",
    accepts: ["algorithm"],
    domains: ["general"],
    wiring_method: "registry_add",
    priority: 90,
  },

  // ─── SAFETY & VALIDATION ───
  {
    id: "safety-validator",
    name: "SafetyValidatorEngine",
    type: "engine",
    file_path: "src/engines/SafetyValidatorEngine.ts",
    accepts: ["safety_rule", "machine_capability"],
    domains: ["general"],
    wiring_method: "config_update",
    priority: 100,
  },
  {
    id: "collision-engine",
    name: "CollisionEngine",
    type: "engine",
    file_path: "src/engines/CollisionEngine.ts",
    accepts: ["safety_rule", "machine_capability"],
    domains: ["milling", "turning", "5axis"],
    wiring_method: "config_update",
    priority: 95,
  },
  {
    id: "spindle-protection-engine",
    name: "SpindleProtectionEngine",
    type: "engine",
    file_path: "src/engines/SpindleProtectionEngine.ts",
    accepts: ["safety_rule", "machine_capability", "parameter_set"],
    domains: ["milling", "turning"],
    wiring_method: "config_update",
    priority: 95,
  },

  // ─── QUALITY & METROLOGY ───
  {
    id: "quality-validation-engine",
    name: "QualityValidationEngine",
    type: "engine",
    file_path: "src/engines/QualityValidationEngine.ts",
    accepts: ["quality_standard", "formula"],
    domains: ["quality", "metrology", "general"],
    wiring_method: "config_update",
    priority: 85,
  },
  {
    id: "gdt-engine",
    name: "GDTEngine",
    type: "engine",
    file_path: "src/engines/GDTEngine.ts",
    accepts: ["quality_standard", "tribal_tip"],
    domains: ["quality", "cad"],
    wiring_method: "tip_inject",
    priority: 80,
  },

  // ─── CAD/CAM BRIDGES ───
  {
    id: "hypermill-bridge",
    name: "HyperMillBridge",
    type: "engine",
    file_path: "src/engines/HyperMillBridge.ts",
    accepts: ["api_reference", "ui_workflow", "tribal_tip", "workflow_sequence"],
    domains: ["cam", "milling", "5axis"],
    wiring_method: "direct_import",
    priority: 85,
  },
  {
    id: "hypercad-bridge",
    name: "HyperCADBridge",
    type: "engine",
    file_path: "src/engines/HyperCADBridge.ts",
    accepts: ["api_reference", "ui_workflow", "tribal_tip"],
    domains: ["cad"],
    wiring_method: "direct_import",
    priority: 85,
  },
  {
    id: "mastercam-bridge",
    name: "MastercamBridge",
    type: "engine",
    file_path: "src/engines/MastercamBridge.ts",
    accepts: ["api_reference", "ui_workflow", "tribal_tip", "workflow_sequence"],
    domains: ["cam", "milling", "turning"],
    wiring_method: "direct_import",
    priority: 85,
  },

  // ─── DISPATCHERS ───
  {
    id: "knowledge-dispatcher",
    name: "knowledgeDispatcher",
    type: "dispatcher",
    file_path: "src/tools/dispatchers/knowledgeDispatcher.ts",
    accepts: ["tribal_tip", "workflow_sequence", "error_solution"],
    domains: ["general"],
    wiring_method: "direct_import",
    priority: 75,
  },
  {
    id: "calc-dispatcher",
    name: "calcDispatcher",
    type: "dispatcher",
    file_path: "src/tools/dispatchers/calcDispatcher.ts",
    accepts: ["formula", "parameter_set"],
    domains: ["general"],
    wiring_method: "config_update",
    priority: 75,
  },

  // ─── HOOKS ───
  {
    id: "cross-field-physics-hook",
    name: "crossFieldPhysicsHook",
    type: "hook",
    file_path: "src/hooks/crossFieldPhysicsHook.ts",
    accepts: ["formula", "safety_rule"],
    domains: ["general"],
    wiring_method: "config_update",
    priority: 90,
  },
  {
    id: "material-sanity-hook",
    name: "materialSanityHook",
    type: "hook",
    file_path: "src/hooks/materialSanityHook.ts",
    accepts: ["material_property", "safety_rule"],
    domains: ["materials"],
    wiring_method: "config_update",
    priority: 90,
  },
];

// ============================================================================
// CONTENT CLASSIFICATION
// ============================================================================

/** Keywords that indicate content type */
const TYPE_INDICATORS: Record<ContentType, string[]> = {
  tribal_tip: ["tip", "trick", "best practice", "recommendation", "avoid", "always", "never", "pro tip", "experienced", "veteran"],
  workflow_sequence: ["sequence", "order", "step", "workflow", "process", "first", "then", "finally", "before", "after", "procedure"],
  formula: ["formula", "equation", "calculate", "=", "coefficient", "constant", "^", "sqrt", "log", "exp"],
  parameter_set: ["speed", "feed", "rpm", "ipm", "sfm", "doc", "woc", "stepover", "stepdown", "parameter"],
  material_property: ["material", "hardness", "tensile", "yield", "density", "thermal", "conductivity", "HRC", "BHN"],
  tool_specification: ["tool", "insert", "endmill", "drill", "tap", "geometry", "coating", "flute", "diameter", "length"],
  machine_capability: ["machine", "axis", "spindle", "travel", "max", "min", "capacity", "envelope", "rapid"],
  error_solution: ["error", "fix", "solution", "problem", "issue", "troubleshoot", "resolve", "workaround"],
  quality_standard: ["tolerance", "GD&T", "inspection", "CMM", "gauge", "measurement", "specification", "acceptance"],
  safety_rule: ["safety", "danger", "warning", "limit", "maximum", "minimum", "protect", "avoid crash", "collision"],
  api_reference: ["API", "function", "method", "class", "parameter", "return", "property", "interface", "SDK"],
  ui_workflow: ["click", "select", "dialog", "menu", "button", "UI", "interface", "screen", "panel", "window"],
  post_processor_rule: ["G-code", "M-code", "post", "NC", "output", "format", "block", "line number"],
  algorithm: ["algorithm", "optimization", "iteration", "converge", "compute", "recursive", "complexity"],
  case_study: ["example", "case", "project", "customer", "shop", "real-world", "application", "success"],
};

/** Keywords that indicate domain */
const DOMAIN_INDICATORS: Record<KnowledgeDomain, string[]> = {
  milling: ["mill", "milling", "endmill", "face mill", "slot", "pocket", "contour", "3-axis"],
  turning: ["turn", "turning", "lathe", "OD", "ID", "facing", "boring", "threading", "chuck"],
  wire_edm: ["wire EDM", "wire-cut", "WEDM", "wire erosion", "spark gap", "dielectric"],
  sinker_edm: ["sinker EDM", "ram EDM", "die sink", "electrode", "plunge EDM"],
  grinding: ["grind", "grinding", "wheel", "abrasive", "surface finish", "cylindrical"],
  "5axis": ["5-axis", "5 axis", "simultaneous", "RTCP", "tilting", "swivel", "A-axis", "B-axis", "C-axis"],
  mill_turn: ["mill-turn", "turn-mill", "multitasking", "live tooling", "Y-axis", "sub-spindle"],
  cad: ["CAD", "model", "sketch", "solid", "surface", "assembly", "drawing", "dimension"],
  cam: ["CAM", "toolpath", "strategy", "operation", "stock", "fixture", "simulation"],
  post_processing: ["post", "G-code", "NC code", "output", "controller", "machine code"],
  quality: ["quality", "inspection", "CMM", "tolerance", "GD&T", "measure"],
  tooling: ["tool", "insert", "holder", "collet", "arbor", "shrink fit"],
  materials: ["material", "steel", "aluminum", "titanium", "inconel", "carbide"],
  fixturing: ["fixture", "clamp", "vise", "workholding", "setup", "datum"],
  metrology: ["metrology", "gauge", "calibration", "uncertainty", "CMM", "probe"],
  automation: ["automation", "robot", "pallet", "cell", "unmanned", "lights-out"],
  general: [],
};

/**
 * Classify a piece of extracted content
 */
function classifyContent(content: any): ContentClassification {
  const text = JSON.stringify(content).toLowerCase();

  // Score each content type
  const typeScores: Record<ContentType, number> = {} as any;
  for (const [type, keywords] of Object.entries(TYPE_INDICATORS)) {
    typeScores[type as ContentType] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.toLowerCase(), "gi");
      const matches = text.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }

  // Find primary and secondary types
  const sortedTypes = Object.entries(typeScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);

  const primaryType = sortedTypes[0]?.[0] as ContentType || "tribal_tip";
  const secondaryTypes = sortedTypes.slice(1, 4).map(([t]) => t as ContentType);

  // Score each domain
  const domainScores: Record<KnowledgeDomain, number> = {} as any;
  for (const [domain, keywords] of Object.entries(DOMAIN_INDICATORS)) {
    domainScores[domain as KnowledgeDomain] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.toLowerCase(), "gi");
      const matches = text.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }

  const sortedDomains = Object.entries(domainScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);

  const domain = sortedDomains[0]?.[0] as KnowledgeDomain || "general";

  // Determine specificity
  let specificity: ContentClassification["specificity"] = "general";
  if (text.includes("machine") && (text.includes("okuma") || text.includes("haas") || text.includes("mazak"))) {
    specificity = "machine_specific";
  } else if (text.includes("material") && (text.includes("steel") || text.includes("aluminum") || text.includes("titanium"))) {
    specificity = "material_specific";
  } else if (text.includes("operation") || text.includes("roughing") || text.includes("finishing")) {
    specificity = "operation_specific";
  }

  // Extract tags
  const tags: string[] = [];
  if (content.tags) tags.push(...content.tags);
  if (content.category) tags.push(content.category);
  if (content.type) tags.push(content.type);

  // Calculate confidence
  const maxScore = Math.max(...Object.values(typeScores));
  const confidence = Math.min(0.95, 0.5 + (maxScore * 0.05));

  return {
    primary_type: primaryType,
    secondary_types: secondaryTypes,
    domain,
    specificity,
    confidence,
    tags: [...new Set(tags)],
  };
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Find all consumers that can use this content
 */
function findRelevantConsumers(classification: ContentClassification): KnowledgeConsumer[] {
  const allTypes = [classification.primary_type, ...classification.secondary_types];

  return KNOWLEDGE_CONSUMERS.filter(consumer => {
    // Must accept at least one of the content types
    const acceptsType = allTypes.some(type => consumer.accepts.includes(type));
    if (!acceptsType) return false;

    // Must match domain (or be general)
    const matchesDomain =
      consumer.domains.includes(classification.domain) ||
      consumer.domains.includes("general") ||
      classification.domain === "general";

    return matchesDomain;
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Calculate relevance score for a consumer
 */
function calculateRelevance(consumer: KnowledgeConsumer, classification: ContentClassification): number {
  let score = consumer.priority / 100;

  // Boost for primary type match
  if (consumer.accepts.includes(classification.primary_type)) {
    score += 0.2;
  }

  // Boost for domain match
  if (consumer.domains.includes(classification.domain)) {
    score += 0.15;
  }

  // Boost for high confidence classification
  score += classification.confidence * 0.1;

  return Math.min(1.0, score);
}

/**
 * Generate wiring action description
 */
function getWiringAction(consumer: KnowledgeConsumer, content: any): string {
  switch (consumer.wiring_method) {
    case "tip_inject":
      return `Inject tip into ${consumer.name} tip collection`;
    case "registry_add":
      return `Add entry to ${consumer.name}`;
    case "config_update":
      return `Update ${consumer.name} configuration/constants`;
    case "direct_import":
      return `Update ${consumer.name} to import from extracted knowledge bridge`;
    case "code_gen":
      return `Generate code addition for ${consumer.name}`;
    default:
      return `Wire to ${consumer.name}`;
  }
}

/**
 * Generate upgrade suggestions based on extracted content
 */
function generateUpgradeSuggestions(
  content: any,
  classification: ContentClassification,
  consumers: KnowledgeConsumer[]
): UpgradeSuggestion[] {
  const suggestions: UpgradeSuggestion[] = [];
  const contentStr = JSON.stringify(content).toLowerCase();

  // Check for formulas that might improve existing calculations
  if (classification.primary_type === "formula") {
    if (contentStr.includes("new") || contentStr.includes("improved") || contentStr.includes("better")) {
      suggestions.push({
        target_system: "FormulaRegistry",
        suggestion_type: "enhancement",
        description: "New or improved formula detected - consider adding to FormulaRegistry",
        extracted_evidence: content.formula || content.equation || content.description?.slice(0, 100),
        priority: "high",
        estimated_effort: "medium",
      });
    }
  }

  // Check for new material properties
  if (classification.primary_type === "material_property") {
    suggestions.push({
      target_system: "MaterialRegistry",
      suggestion_type: "new_capability",
      description: "New material property data - add to MaterialRegistry",
      extracted_evidence: content.material || content.property || JSON.stringify(content).slice(0, 100),
      priority: "medium",
      estimated_effort: "small",
    });
  }

  // Check for workflow improvements
  if (classification.primary_type === "workflow_sequence") {
    if (contentStr.includes("faster") || contentStr.includes("efficient") || contentStr.includes("optimal")) {
      suggestions.push({
        target_system: "IntelligentSequencingEngine",
        suggestion_type: "optimization",
        description: "Optimized workflow sequence - update sequencing rules",
        extracted_evidence: content.sequence || content.steps || content.description?.slice(0, 100),
        priority: "high",
        estimated_effort: "medium",
      });
    }
  }

  // Check for safety rules
  if (classification.primary_type === "safety_rule") {
    suggestions.push({
      target_system: "SafetyValidatorEngine",
      suggestion_type: "enhancement",
      description: "New safety rule - must be added to safety validation",
      extracted_evidence: content.rule || content.limit || content.description?.slice(0, 100),
      priority: "critical",
      estimated_effort: "small",
    });
  }

  // Check for API references that could enable new integrations
  if (classification.primary_type === "api_reference") {
    const camSystem = contentStr.includes("hypermill") ? "HyperMill" :
                      contentStr.includes("mastercam") ? "Mastercam" :
                      contentStr.includes("hypercad") ? "HyperCAD" : "CAM System";
    suggestions.push({
      target_system: `${camSystem}Bridge`,
      suggestion_type: "integration",
      description: `New API endpoint discovered - could enable deeper ${camSystem} integration`,
      extracted_evidence: content.endpoint || content.method || content.function || content.description?.slice(0, 100),
      priority: "medium",
      estimated_effort: "large",
    });
  }

  return suggestions;
}

// ============================================================================
// MAIN ROUTER CLASS
// ============================================================================

export class ExtractionIntelligenceRouter {
  private routingLog: RoutingDecision[] = [];
  private logFile: string;

  constructor() {
    this.logFile = join(process.cwd(), "data/state/extraction-routing-log.json");
    this.loadLog();
  }

  private loadLog(): void {
    try {
      if (existsSync(this.logFile)) {
        this.routingLog = JSON.parse(readFileSync(this.logFile, "utf-8"));
      }
    } catch {
      this.routingLog = [];
    }
  }

  private saveLog(): void {
    try {
      const dir = join(process.cwd(), "data/state");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      // Keep only last 1000 decisions
      const trimmed = this.routingLog.slice(-1000);
      writeFileSync(this.logFile, JSON.stringify(trimmed, null, 2));
    } catch (err) {
      log.warn(`[ExtractionRouter] Failed to save routing log: ${err}`);
    }
  }

  /**
   * Route a piece of extracted content to all relevant consumers
   */
  routeContent(content: any, sourceFile: string): RoutingDecision {
    const contentId = `${sourceFile}:${Date.now()}`;
    const reasoning: string[] = [];

    // Step 1: Classify
    reasoning.push("STEP 1: Classifying content...");
    const classification = classifyContent(content);
    reasoning.push(`  → Primary type: ${classification.primary_type} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`);
    reasoning.push(`  → Domain: ${classification.domain}`);
    reasoning.push(`  → Secondary types: ${classification.secondary_types.join(", ") || "none"}`);

    // Step 2: Find consumers
    reasoning.push("STEP 2: Finding relevant consumers...");
    const consumers = findRelevantConsumers(classification);
    reasoning.push(`  → Found ${consumers.length} potential consumers`);

    // Step 3: Create routes
    reasoning.push("STEP 3: Creating routing targets...");
    const routes: RouteTarget[] = consumers.map(consumer => {
      const relevance = calculateRelevance(consumer, classification);
      const action = getWiringAction(consumer, content);

      // Check if consumer file exists
      const consumerPath = join(process.cwd(), consumer.file_path);
      const exists = existsSync(consumerPath);

      return {
        consumer,
        relevance_score: relevance,
        wiring_action: action,
        status: exists ? "pending" : "skipped",
        reason: exists ? undefined : `File not found: ${consumer.file_path}`,
      };
    });

    // Filter to routes with relevance > 0.5
    const activeRoutes = routes.filter(r => r.relevance_score > 0.5 && r.status !== "skipped");
    reasoning.push(`  → ${activeRoutes.length} routes with relevance > 0.5`);

    // Step 4: Generate upgrade suggestions
    reasoning.push("STEP 4: Analyzing for upgrade opportunities...");
    const upgradeSuggestions = generateUpgradeSuggestions(content, classification, consumers);
    reasoning.push(`  → Generated ${upgradeSuggestions.length} upgrade suggestions`);

    // Step 5: Log decision
    const decision: RoutingDecision = {
      content_id: contentId,
      classification,
      routes: activeRoutes,
      upgrade_suggestions: upgradeSuggestions,
      reasoning,
      timestamp: new Date().toISOString(),
    };

    this.routingLog.push(decision);
    this.saveLog();

    log.info(`[ExtractionRouter] Routed content to ${activeRoutes.length} consumers, ${upgradeSuggestions.length} upgrade suggestions`);

    return decision;
  }

  /**
   * Route multiple content items from an extraction file
   */
  routeExtractionFile(filePath: string): RoutingDecision[] {
    const decisions: RoutingDecision[] = [];

    try {
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      // Handle different extraction formats
      if (Array.isArray(content)) {
        // Array of items
        for (const item of content.slice(0, 100)) { // Limit to 100 for performance
          decisions.push(this.routeContent(item, filePath));
        }
      } else if (content.items && Array.isArray(content.items)) {
        // Object with items array
        for (const item of content.items.slice(0, 100)) {
          decisions.push(this.routeContent(item, filePath));
        }
      } else if (content.tips && Array.isArray(content.tips)) {
        // Tips format
        for (const tip of content.tips.slice(0, 100)) {
          decisions.push(this.routeContent(tip, filePath));
        }
      } else if (content.workflows && Array.isArray(content.workflows)) {
        // Workflows format
        for (const wf of content.workflows.slice(0, 100)) {
          decisions.push(this.routeContent(wf, filePath));
        }
      } else {
        // Single object
        decisions.push(this.routeContent(content, filePath));
      }
    } catch (err) {
      log.error(`[ExtractionRouter] Failed to route file ${filePath}: ${err}`);
    }

    return decisions;
  }

  /**
   * Get routing summary statistics
   */
  getRoutingSummary(): {
    total_decisions: number;
    by_content_type: Record<string, number>;
    by_domain: Record<string, number>;
    by_consumer: Record<string, number>;
    pending_upgrades: UpgradeSuggestion[];
  } {
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    const byConsumer: Record<string, number> = {};
    const pendingUpgrades: UpgradeSuggestion[] = [];

    for (const decision of this.routingLog) {
      // Count by type
      const type = decision.classification.primary_type;
      byType[type] = (byType[type] || 0) + 1;

      // Count by domain
      const domain = decision.classification.domain;
      byDomain[domain] = (byDomain[domain] || 0) + 1;

      // Count by consumer
      for (const route of decision.routes) {
        if (route.status === "wired" || route.status === "pending") {
          const name = route.consumer.name;
          byConsumer[name] = (byConsumer[name] || 0) + 1;
        }
      }

      // Collect pending upgrades
      pendingUpgrades.push(...decision.upgrade_suggestions);
    }

    return {
      total_decisions: this.routingLog.length,
      by_content_type: byType,
      by_domain: byDomain,
      by_consumer: byConsumer,
      pending_upgrades: pendingUpgrades.slice(-50), // Last 50
    };
  }

  /**
   * Get all pending upgrade suggestions, prioritized
   */
  getPendingUpgrades(): UpgradeSuggestion[] {
    const allUpgrades: UpgradeSuggestion[] = [];

    for (const decision of this.routingLog) {
      allUpgrades.push(...decision.upgrade_suggestions);
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return allUpgrades.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Get the consumer registry for external use
   */
  getConsumerRegistry(): KnowledgeConsumer[] {
    return [...KNOWLEDGE_CONSUMERS];
  }

  /**
   * Analyze what consumers are missing for a content type
   */
  analyzeGaps(contentType: ContentType): {
    covered_by: KnowledgeConsumer[];
    missing_coverage: string[];
  } {
    const covered = KNOWLEDGE_CONSUMERS.filter(c => c.accepts.includes(contentType));
    const coveredTypes = new Set(covered.map(c => c.type));

    const allTypes: KnowledgeConsumer["type"][] = ["engine", "dispatcher", "pipeline", "registry", "hook", "algorithm"];
    const missing = allTypes.filter(t => !coveredTypes.has(t));

    return {
      covered_by: covered,
      missing_coverage: missing.map(t => `No ${t} accepts ${contentType}`),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const extractionRouter = new ExtractionIntelligenceRouter();
