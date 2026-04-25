import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MCP_SERVER = path.resolve(HERE, "..");
const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");

function normalizeWinPath(value: string): string {
  return path.resolve(value).replace(/\//g, "\\");
}

function resolvePath(fallbackPath: string, envNames: string[] = []): string {
  for (const envName of envNames) {
    const candidate = process.env[envName];
    if (candidate && candidate.trim()) return normalizeWinPath(candidate.trim());
  }
  return normalizeWinPath(fallbackPath);
}

function preferExisting(primary: string, alternates: string[] = []): string {
  const candidates = [primary, ...alternates].map(normalizeWinPath);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const PRISM_ROOT = resolvePath(DEFAULT_PRISM_ROOT, ["PRISM_ROOT", "PRISM_ROOT_PATH"]);
const MCP_SERVER = resolvePath(DEFAULT_MCP_SERVER, ["PRISM_MCP_SERVER", "PRISM_MCP_SERVER_PATH"]);
const DATA_DIR = resolvePath(path.join(PRISM_ROOT, "data"), ["PRISM_DATA_DIR"]);
const STATE_DIR = resolvePath(path.join(PRISM_ROOT, "state"), ["PRISM_STATE_DIR"]);
const EXTRACTED_DIR = resolvePath(path.join(PRISM_ROOT, "extracted"), ["PRISM_EXTRACTED_DIR"]);
const SCRIPTS_ROOT = preferExisting(path.join(PRISM_ROOT, "scripts"), [path.join(MCP_SERVER, "scripts")]);
const SCRIPTS_CORE = preferExisting(path.join(SCRIPTS_ROOT, "core"), [path.join(MCP_SERVER, "scripts"), SCRIPTS_ROOT]);
const SKILLS_DIR = preferExisting(path.join(PRISM_ROOT, "skills-consolidated"), [
  path.join(MCP_SERVER, "skills"),
  path.join(PRISM_ROOT, ".agents", "skills"),
  path.join(PRISM_ROOT, ".codex", "skills"),
]);

export const SERVER_NAME = "prism-mcp-server";
export const SERVER_VERSION = "2.10.0";
export const SERVER_DESCRIPTION = "PRISM Manufacturing Intelligence - source-run MCP development surfaces";

/** Maximum characters for a single MCP tool text response — long replies are truncated to keep transport payloads bounded. */
export const CHARACTER_LIMIT = 25_000;

export const PATHS = {
  PRISM_ROOT,
  MCP_SERVER,
  MCP_CACHE: resolvePath(path.join(MCP_SERVER, "cache"), ["PRISM_MCP_CACHE"]),
  DATA_DIR,
  STATE_DIR,
  STATE_FILE: path.join(STATE_DIR, "CURRENT_STATE.json"),
  SESSION_MEMORY: path.join(STATE_DIR, "SESSION_MEMORY.json"),
  SCRIPTS: SCRIPTS_ROOT,
  SCRIPTS_CORE,
  SKILLS: SKILLS_DIR,
  SKILLS_DIR,
  EXTRACTED_DIR,
  EXTRACTED_MODULES: resolvePath(path.join(PRISM_ROOT, "extracted_modules"), ["PRISM_EXTRACTED_MODULES"]),
  MATERIALS: resolvePath(path.join(DATA_DIR, "materials"), ["PRISM_MATERIALS_DIR"]),
  MATERIALS_DB: resolvePath(path.join(DATA_DIR, "materials"), ["PRISM_MATERIALS_DB"]),
  MACHINES: resolvePath(path.join(EXTRACTED_DIR, "machines"), ["PRISM_MACHINES_DIR"]),
  MACHINES_DB: resolvePath(path.join(EXTRACTED_DIR, "machines"), ["PRISM_MACHINES_DB"]),
  TOOLS: resolvePath(path.join(EXTRACTED_DIR, "tools"), ["PRISM_TOOLS_DIR"]),
  TOOLS_DB: resolvePath(path.join(EXTRACTED_DIR, "tools"), ["PRISM_TOOLS_DB"]),
  CONTROLLERS: resolvePath(path.join(EXTRACTED_DIR, "controllers"), ["PRISM_CONTROLLERS_DIR"]),
  WORKHOLDING: resolvePath(path.join(EXTRACTED_DIR, "workholding"), ["PRISM_WORKHOLDING_DIR"]),
  KNOWLEDGE_BASES: resolvePath(path.join(EXTRACTED_DIR, "knowledge_bases"), ["PRISM_KNOWLEDGE_BASES_DIR"]),
  MATERIALS_CORE: resolvePath(path.join(EXTRACTED_DIR, "materials", "core")),
  MATERIALS_ENHANCED: resolvePath(path.join(EXTRACTED_DIR, "materials", "enhanced")),
  MATERIALS_USER: resolvePath(path.join(EXTRACTED_DIR, "materials", "user")),
  MATERIALS_LEARNED: resolvePath(path.join(EXTRACTED_DIR, "materials", "learned")),
  MACHINES_BASIC: resolvePath(path.join(EXTRACTED_DIR, "machines", "BASIC")),
  MACHINES_CORE: resolvePath(path.join(EXTRACTED_DIR, "machines", "CORE")),
  MACHINES_ENHANCED: resolvePath(path.join(EXTRACTED_DIR, "machines", "ENHANCED")),
  MACHINES_LEVEL5: resolvePath(path.join(EXTRACTED_DIR, "machines", "LEVEL5")),
  COORDINATION: resolvePath(path.join(DATA_DIR, "coordination")),
  AGENT_REGISTRY: resolvePath(path.join(DATA_DIR, "coordination", "AGENT_REGISTRY.json")),
  AGENTS: resolvePath(path.join(DATA_DIR, "agents")),
  HOOKS: resolvePath(path.join(DATA_DIR, "hooks")),
  GSD_DIR: resolvePath(path.join(MCP_SERVER, "data", "docs", "gsd")),
  PYTHON: process.env.PRISM_PYTHON_PATH || "python",
  KNOWLEDGE_DIR: resolvePath(path.join(PRISM_ROOT, "knowledge")),
  AUTONOMOUS_TASKS: resolvePath(path.join(PRISM_ROOT, "autonomous-tasks")),
  HOOKS_REGISTRY: resolvePath(path.join(DATA_DIR, "DEVELOPMENT_HOOKS_REGISTRY.json")),
  FORMULAS: resolvePath(path.join(EXTRACTED_DIR, "formulas")),
  OPTIMIZATION: resolvePath(path.join(EXTRACTED_DIR, "engines", "optimization")),
  SIMULATION: resolvePath(path.join(EXTRACTED_DIR, "engines", "simulation")),
  QUALITY: resolvePath(path.join(EXTRACTED_DIR, "engines", "quality")),
  BUSINESS: resolvePath(path.join(EXTRACTED_DIR, "engines", "business")),
  BUSINESS_MODULES: resolvePath(path.join(EXTRACTED_DIR, "business")),
  PHYSICS: resolvePath(path.join(EXTRACTED_DIR, "engines", "physics")),
  POST_PROCESSORS: resolvePath(path.join(EXTRACTED_DIR, "engines", "post_processor")),
  VIBRATION: resolvePath(path.join(EXTRACTED_DIR, "engines", "vibration")),
  ENGINES_ROOT: resolvePath(path.join(EXTRACTED_DIR, "engines")),
  ALGORITHMS: resolvePath(path.join(EXTRACTED_DIR, "algorithms")),
  MATERIALS_EXTRACTED: resolvePath(path.join(EXTRACTED_DIR, "materials")),
  MATERIALS_V9: resolvePath(path.join(EXTRACTED_DIR, "materials_v9_complete")),
  ENGINES_CAD_CAM: resolvePath(path.join(EXTRACTED_DIR, "engines", "cad_cam")),
  ENGINES_CAD_COMPLETE: resolvePath(path.join(EXTRACTED_DIR, "engines", "cad_complete")),
  ENGINES_MACHINES: resolvePath(path.join(EXTRACTED_DIR, "engines", "machines")),
  ENGINES_MATERIALS: resolvePath(path.join(EXTRACTED_DIR, "engines", "materials")),
  ENGINES_TOOLS: resolvePath(path.join(EXTRACTED_DIR, "engines", "tools")),
  CATALOGS: resolvePath(path.join(EXTRACTED_DIR, "catalogs")),
  CORE_MODULES: resolvePath(path.join(EXTRACTED_DIR, "core")),
  INFRASTRUCTURE: resolvePath(path.join(EXTRACTED_DIR, "infrastructure")),
  INTEGRATION: resolvePath(path.join(EXTRACTED_DIR, "integration")),
  LEARNING: resolvePath(path.join(EXTRACTED_DIR, "learning")),
  MIT: resolvePath(path.join(EXTRACTED_DIR, "mit")),
  SYSTEMS: resolvePath(path.join(EXTRACTED_DIR, "systems")),
  UNITS: resolvePath(path.join(EXTRACTED_DIR, "units")),
  MATERIALS_COMPLETE: resolvePath(path.join(EXTRACTED_DIR, "materials_complete")),
  MATERIALS_ENHANCED_DIR: resolvePath(path.join(EXTRACTED_DIR, "materials_enhanced")),
  ENGINES_AI_ML: resolvePath(path.join(EXTRACTED_DIR, "engines", "ai_ml")),
  ENGINES_AI_COMPLETE: resolvePath(path.join(EXTRACTED_DIR, "engines", "ai_complete")),
  ENGINES_CORE: resolvePath(path.join(EXTRACTED_DIR, "engines", "core")),
  ENGINES_INFRA: resolvePath(path.join(EXTRACTED_DIR, "engines", "infrastructure")),
} as const;

export const DATA_LAYERS = {
  CORE: "CORE",
  ENHANCED: "ENHANCED",
  USER: "USER",
  LEARNED: "LEARNED",
} as const;

export const ISO_GROUPS = {
  P: "P",
  M: "M",
  K: "K",
  N: "N",
  S: "S",
  H: "H",
  X: "X",
} as const;

export const MATERIAL_CATEGORIES = [
  "carbon_steel",
  "alloy_steel",
  "tool_steel",
  "free_machining_steel",
  "hsla_steel",
  "austenitic_stainless",
  "ferritic_stainless",
  "martensitic_stainless",
  "duplex_stainless",
  "ph_stainless",
  "gray_cast_iron",
  "ductile_iron",
  "malleable_iron",
  "white_cast_iron",
  "cgi",
  "wrought_aluminum",
  "cast_aluminum",
  "copper",
  "brass",
  "bronze",
  "magnesium",
  "zinc",
  "nickel_alloy",
  "cobalt_alloy",
  "titanium_alloy",
  "hardened_steel",
  "composite",
  "plastic",
  "ceramic",
  "refractory",
] as const;

export type PrismPaths = typeof PATHS;

// ============================================================================
// REGISTRY TYPE COMPAT SHIMS
// String-literal unions imported by src/types.ts and downstream registry types.
// These are loose enough to accept incoming legacy data; tighten incrementally.
// ============================================================================

export type IsoMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H" | "X";

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

export type MaterialLayer = "core" | "extended" | "specialty" | "user" | "legacy";

export type MachineType =
  | "mill" | "lathe" | "mill_turn" | "swiss" | "vmc" | "hmc" | "vtl"
  | "wire_edm" | "sinker_edm" | "grinder" | "waterjet" | "laser" | "router"
  | "drill_press" | "saw" | "press" | "robot" | "additive" | "other";

export type MachineLayer = "core" | "extended" | "user" | "legacy";

export type ControllerFamily =
  | "fanuc" | "siemens" | "haas" | "okuma" | "mitsubishi" | "mazak" | "heidenhain"
  | "fagor" | "centroid" | "linuxcnc" | "grbl" | "mach3" | "mach4" | "pathpilot"
  | "marlin" | "fluidnc" | "selca" | "nakamura" | "tsugami" | "sodick"
  | "agie" | "makino" | "charmilles" | "other";

export type AlarmSeverity = "info" | "warning" | "error" | "critical" | "fatal";

export type AlarmCategory =
  | "axis" | "spindle" | "coolant" | "tool_change" | "controller" | "power"
  | "communication" | "memory" | "safety" | "limit" | "servo" | "lubrication"
  | "hydraulic" | "pneumatic" | "operator" | "program" | "feedback" | "other";

export type ToolType =
  | "endmill" | "ballmill" | "facemill" | "drill" | "reamer" | "tap" | "thread_mill"
  | "boring_bar" | "turning_insert" | "grooving_insert" | "threading_insert"
  | "parting_tool" | "broach" | "countersink" | "counterbore" | "spot_drill"
  | "chamfer_mill" | "lollipop_mill" | "form_tool" | "knurling_tool"
  | "burnishing_tool" | "probe" | "wheel" | "dresser" | "edm_electrode"
  | "wire_edm_electrode" | "laser_head" | "waterjet_head" | "other";

export type ToolMaterial = "carbide" | "cermet" | "ceramic" | "cbn" | "pcd" | "hss" | "diamond";

export type AgentTier = "tier-0" | "tier-1" | "tier-2" | "tier-3" | "specialist" | "advisor" | "supervisor";

export type HookPattern = "pre" | "post" | "wrap" | "stream" | "cadence" | "error" | "validation" | "advisory";

export type HookLevel = "info" | "warning" | "error" | "block" | "critical";

export type ResponseFormat = "json" | "markdown" | "text" | "table" | "code" | "stream";

export type OptimizationTarget =
  | "cost" | "time" | "quality" | "tool_life" | "energy" | "throughput"
  | "surface_finish" | "force" | "power" | "deflection" | "chatter" | "balanced";

export type OperationType =
  | "roughing" | "finishing" | "semi_finishing" | "facing" | "profiling" | "pocketing"
  | "drilling" | "boring" | "reaming" | "tapping" | "thread_milling" | "turning"
  | "grooving" | "parting" | "threading" | "knurling" | "chamfering"
  | "deburring" | "engraving" | "polishing" | "grinding" | "honing" | "lapping"
  | "wire_edm" | "sinker_edm" | "laser_cut" | "waterjet_cut" | "plasma_cut"
  | "additive" | "probing" | "other";

export type FormulaDomain =
  | "cutting_force" | "tool_life" | "power" | "torque" | "deflection" | "thermal"
  | "vibration" | "stability" | "surface_finish" | "wear" | "stress" | "strain"
  | "fatigue" | "fracture" | "material" | "tribology" | "kinematic"
  | "geometric" | "statistical" | "control" | "other";

export type QualityComponent = "R" | "C" | "P" | "S" | "L";

export type SwarmPattern =
  | "hierarchical" | "mesh" | "ring" | "star" | "hybrid" | "adaptive"
  | "consensus" | "leader_follower" | "peer_to_peer" | "broadcast";

export type WorkflowType =
  | "linear" | "branching" | "parallel" | "iterative" | "ralph" | "consensus"
  | "supervised" | "autonomous" | "interactive" | "scheduled" | "event_driven";

export type ScriptCategory =
  | "build" | "test" | "deploy" | "extract" | "validate" | "report" | "migration"
  | "fixture" | "tool" | "data" | "ai" | "ci" | "release" | "diagnostic" | "other";
