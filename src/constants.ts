/**
 * PRISM MCP Server Constants
 * Centralized configuration values for the MCP server
 */

// Server identification
export const SERVER_NAME = "prism-mcp-server";
export const SERVER_VERSION = "2.10.0";
export const SERVER_DESCRIPTION = "PRISM Manufacturing Intelligence - 45 dispatchers, 1060 actions, 169 engines, 50 algorithms, 9 registries, 157 hooks — CNC machining intelligence platform";

// Response limits
export const CHARACTER_LIMIT = 50000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Timeout configuration (milliseconds)
export const DEFAULT_TIMEOUT = 30000;
export const AGENT_TIMEOUT = 60000;
export const SCRIPT_TIMEOUT = 120000;

// Data paths (Windows) - CONSOLIDATED 2026-02-01
export const PATHS = {
  // Root directory (single unified location)
  PRISM_ROOT: "H:\\prism",
  
  // Skills and modules
  SKILLS: "H:\\prism\\skills-consolidated",
  SKILLS_DIR: "H:\\prism\\skills-consolidated",
  EXTRACTED_MODULES: "H:\\prism\\extracted_modules",
  EXTRACTED_DIR: "H:\\prism\\extracted",
  
  // Scripts
  SCRIPTS: "H:\\prism\\scripts",
  
  // Database directories - JSON data in C:\PRISM\data
  MATERIALS: "H:\\prism\\data\\materials",
  MATERIALS_DB: "H:\\prism\\data\\materials",
  MACHINES: "H:\\prism\\extracted\\machines",
  MACHINES_DB: "H:\\prism\\extracted\\machines",
  TOOLS: "H:\\prism\\extracted\\tools",
  TOOLS_DB: "H:\\prism\\extracted\\tools",
  CONTROLLERS: "H:\\prism\\extracted\\controllers",
  WORKHOLDING: "H:\\prism\\extracted\\workholding",
  KNOWLEDGE_BASES: "H:\\prism\\extracted\\knowledge_bases",
  
  // Material layers
  MATERIALS_CORE: "H:\\prism\\extracted\\materials\\core",
  MATERIALS_ENHANCED: "H:\\prism\\extracted\\materials\\enhanced",
  MATERIALS_USER: "H:\\prism\\extracted\\materials\\user",
  MATERIALS_LEARNED: "H:\\prism\\extracted\\materials\\learned",
  
  // Machine layers
  MACHINES_BASIC: "H:\\prism\\extracted\\machines\\BASIC",
  MACHINES_CORE: "H:\\prism\\extracted\\machines\\CORE",
  MACHINES_ENHANCED: "H:\\prism\\extracted\\machines\\ENHANCED",
  MACHINES_LEVEL5: "H:\\prism\\extracted\\machines\\LEVEL5",
  
  // State and memory (consolidated)
  STATE_FILE: "H:\\prism\\state\\CURRENT_STATE.json",
  STATE_DIR: "H:\\prism\\state",
  SESSION_MEMORY: "H:\\prism\\state\\SESSION_MEMORY.json",
  
  // Data coordination
  DATA_DIR: "H:\\prism\\data",
  COORDINATION: "H:\\prism\\data\\coordination",
  AGENT_REGISTRY: "H:\\prism\\data\\coordination\\AGENT_REGISTRY.json",
  
  // Agents and hooks
  AGENTS: "H:\\prism\\data\\agents",
  HOOKS: "H:\\prism\\data\\hooks",
  
  // MCP server
  MCP_SERVER: "H:\\prism\\mcp-server",
  MCP_CACHE: "H:\\prism\\mcp-server\\cache",

  // Scripts subdirectories
  SCRIPTS_CORE: "H:\\prism\\scripts\\core",

  // GSD protocol
  GSD_DIR: "H:\\prism\\mcp-server\\data\\docs\\gsd",

  // Python runtime — env var override for portability, fallback to PATH lookup
  PYTHON: process.env.PRISM_PYTHON_PATH || "python",

  // Knowledge
  KNOWLEDGE_DIR: "H:\\prism\\knowledge",

  // Autonomous tasks
  AUTONOMOUS_TASKS: "H:\\prism\\autonomous-tasks",

  // Hooks registry
  HOOKS_REGISTRY: "H:\\prism\\data\\DEVELOPMENT_HOOKS_REGISTRY.json",

  // Extracted module directories (P-MS2 Wave 2)
  FORMULAS: "H:\\prism\\extracted\\formulas",
  OPTIMIZATION: "H:\\prism\\extracted\\engines\\optimization",
  SIMULATION: "H:\\prism\\extracted\\engines\\simulation",
  QUALITY: "H:\\prism\\extracted\\engines\\quality",
  BUSINESS: "H:\\prism\\extracted\\engines\\business",
  BUSINESS_MODULES: "H:\\prism\\extracted\\business",

  // Extracted module directories (P-MS3 Wave 1 CRITICAL)
  PHYSICS: "H:\\prism\\extracted\\engines\\physics",
  POST_PROCESSORS: "H:\\prism\\extracted\\engines\\post_processor",
  VIBRATION: "H:\\prism\\extracted\\engines\\vibration",
  ENGINES_ROOT: "H:\\prism\\extracted\\engines",

  // Extracted module directories (P-MS4 Wave 3 MEDIUM)
  ALGORITHMS: "H:\\prism\\extracted\\algorithms",
  MATERIALS_EXTRACTED: "H:\\prism\\extracted\\materials",
  MATERIALS_V9: "H:\\prism\\extracted\\materials_v9_complete",
  ENGINES_CAD_CAM: "H:\\prism\\extracted\\engines\\cad_cam",
  ENGINES_CAD_COMPLETE: "H:\\prism\\extracted\\engines\\cad_complete",
  ENGINES_MACHINES: "H:\\prism\\extracted\\engines\\machines",
  ENGINES_MATERIALS: "H:\\prism\\extracted\\engines\\materials",
  ENGINES_TOOLS: "H:\\prism\\extracted\\engines\\tools",

  // Extracted module directories (P-MS5 Wave 4 LOW)
  CATALOGS: "H:\\prism\\extracted\\catalogs",
  CORE_MODULES: "H:\\prism\\extracted\\core",
  INFRASTRUCTURE: "H:\\prism\\extracted\\infrastructure",
  INTEGRATION: "H:\\prism\\extracted\\integration",
  LEARNING: "H:\\prism\\extracted\\learning",
  MIT: "H:\\prism\\extracted\\mit",
  SYSTEMS: "H:\\prism\\extracted\\systems",
  UNITS: "H:\\prism\\extracted\\units",
  MATERIALS_COMPLETE: "H:\\prism\\extracted\\materials_complete",
  MATERIALS_ENHANCED_DIR: "H:\\prism\\extracted\\materials_enhanced",
  ENGINES_AI_ML: "H:\\prism\\extracted\\engines\\ai_ml",
  ENGINES_AI_COMPLETE: "H:\\prism\\extracted\\engines\\ai_complete",
  ENGINES_CORE: "H:\\prism\\extracted\\engines\\core",
  ENGINES_INFRA: "H:\\prism\\extracted\\engines\\infrastructure"
} as const;

// Data Layers (4-layer hierarchy)
export const DATA_LAYERS = {
  CORE: "CORE",
  ENHANCED: "ENHANCED",
  USER: "USER",
  LEARNED: "LEARNED"
} as const;
export type DataLayer = typeof DATA_LAYERS[keyof typeof DATA_LAYERS];

// ISO Groups (for material registry)
export const ISO_GROUPS = {
  P: "P",  // Steel
  M: "M",  // Stainless Steel
  K: "K",  // Cast Iron
  N: "N",  // Non-ferrous
  S: "S",  // Superalloys
  H: "H",  // Hardened Steel
  X: "X"   // Specialty
} as const;

// Tool Coatings
export const TOOL_COATINGS = [
  "TiN", "TiCN", "TiAlN", "AlTiN", "AlCrN",
  "DLC", "Diamond", "Uncoated", "CVD", "PVD"
] as const;

// ISO 513 Material Groups
export const ISO_MATERIAL_GROUPS = ["P", "M", "K", "N", "S", "H", "X"] as const;
export type IsoMaterialGroup = typeof ISO_MATERIAL_GROUPS[number];

// Material Categories
export const MATERIAL_CATEGORIES = [
  "carbon_steel", "alloy_steel", "tool_steel", "free_machining_steel", "hsla_steel",
  "austenitic_stainless", "ferritic_stainless", "martensitic_stainless", "duplex_stainless", "ph_stainless",
  "gray_cast_iron", "ductile_iron", "malleable_iron", "white_cast_iron", "cgi",
  "wrought_aluminum", "cast_aluminum", "copper", "brass", "bronze", "magnesium", "zinc",
  "nickel_alloy", "cobalt_alloy", "titanium_alloy",
  "hardened_steel",
  "composite", "plastic", "ceramic", "refractory"
] as const;
export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

// Machine Types
export const MACHINE_TYPES = [
  "vertical_mill", "horizontal_mill", "5_axis", "lathe", "turn_mill", 
  "swiss", "edm_wire", "edm_sinker", "grinder", "multi_spindle"
] as const;
export type MachineType = typeof MACHINE_TYPES[number];

// Machine Data Layers
export const MACHINE_LAYERS = ["BASIC", "CORE", "ENHANCED", "LEVEL5"] as const;
export type MachineLayer = typeof MACHINE_LAYERS[number];

// Material Data Layers  
export const MATERIAL_LAYERS = ["CORE", "ENHANCED", "USER", "LEARNED"] as const;
export type MaterialLayer = typeof MATERIAL_LAYERS[number];

// Controller Families
export const CONTROLLER_FAMILIES = [
  "FANUC", "HAAS", "SIEMENS", "MAZAK", "OKUMA", "HEIDENHAIN",
  "MITSUBISHI", "BROTHER", "HURCO", "FAGOR", "DMG_MORI", "DOOSAN"
] as const;
export type ControllerFamily = typeof CONTROLLER_FAMILIES[number];

// Alarm Severity Levels
export const ALARM_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type AlarmSeverity = typeof ALARM_SEVERITIES[number];

// Alarm Categories
export const ALARM_CATEGORIES = [
  "SERVO", "SPINDLE", "ATC", "PROGRAM", "SAFETY", "SYSTEM",
  "COMMUNICATION", "OVERTRAVEL", "OVERLOAD", "TEMPERATURE",
  "HYDRAULIC", "PNEUMATIC", "LUBRICATION", "PARAMETER", "PMC", "MACRO"
] as const;
export type AlarmCategory = typeof ALARM_CATEGORIES[number];

// Tool Types
export const TOOL_TYPES = [
  "end_mill", "face_mill", "ball_mill", "bull_mill", "drill", "tap",
  "reamer", "boring_bar", "insert", "turning_tool", "threading_tool",
  "grooving_tool", "chamfer_mill", "slot_drill"
] as const;
export type ToolType = typeof TOOL_TYPES[number];

// Tool Materials
export const TOOL_MATERIALS = [
  "hss", "hss_cobalt", "carbide", "coated_carbide", 
  "cermet", "ceramic", "cbn", "pcd"
] as const;
export type ToolMaterial = typeof TOOL_MATERIALS[number];

// Agent Tiers
export const AGENT_TIERS = ["OPUS", "SONNET", "HAIKU"] as const;
export type AgentTier = typeof AGENT_TIERS[number];

// Hook Patterns
export const HOOK_PATTERNS = [
  "bayesian", "optimization", "multi_objective", 
  "gradient", "reinforcement", "system_law"
] as const;
export type HookPattern = typeof HOOK_PATTERNS[number];

// Hook Levels
export const HOOK_LEVELS = ["L0", "L1", "L2"] as const;
export type HookLevel = typeof HOOK_LEVELS[number];

// Response Formats
export const RESPONSE_FORMATS = ["json", "markdown"] as const;
export type ResponseFormat = typeof RESPONSE_FORMATS[number];

// Optimization Targets
export const OPTIMIZATION_TARGETS = ["mrr", "surface_finish", "tool_life", "balanced"] as const;
export type OptimizationTarget = typeof OPTIMIZATION_TARGETS[number];

// Operation Types
export const OPERATION_TYPES = ["roughing", "finishing", "drilling", "tapping", "boring"] as const;
export type OperationType = typeof OPERATION_TYPES[number];

// Formula Domains
export const FORMULA_DOMAINS = [
  "KIENZLE", "TAYLOR", "JOHNSON_COOK", "MERCHANT", "OXLEY",
  "THERMAL", "STABILITY", "DEFLECTION", "SURFACE", "OPTIMIZATION",
  "STATISTICS", "AI_ML", "SIGNAL", "COST", "LEARNING", "numerical"
] as const;
export type FormulaDomain = typeof FORMULA_DOMAINS[number];

// Quality Components
export const QUALITY_COMPONENTS = ["R(x)", "C(x)", "P(x)", "S(x)", "L(x)", "Omega(x)"] as const;
export type QualityComponent = typeof QUALITY_COMPONENTS[number];

// Swarm Patterns
export const SWARM_PATTERNS = [
  "parallel", "pipeline", "map_reduce", "consensus",
  "hierarchical", "ensemble", "competition", "collaboration"
] as const;
export type SwarmPattern = typeof SWARM_PATTERNS[number];

// Workflow Types
export const WORKFLOW_TYPES = ["sequential", "parallel", "conditional", "loop", "ralph"] as const;
export type WorkflowType = typeof WORKFLOW_TYPES[number];

// Script Categories
export const SCRIPT_CATEGORIES = [
  "extraction", "materials", "validation", "gsd",
  "orchestration", "api", "utility", "testing", "controller"
] as const;
export type ScriptCategory = typeof SCRIPT_CATEGORIES[number];

// Export Formats
export const EXPORT_FORMATS = ["pdf", "html", "markdown", "excel", "json"] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];
