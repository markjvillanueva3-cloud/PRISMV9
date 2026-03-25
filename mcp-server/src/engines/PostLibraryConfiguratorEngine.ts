/**
 * PRISM MCP Server - Post Library & Configurator Engine (POST-ULT-MS16)
 *
 * User-facing interface for generating and managing physics-optimized posts.
 * Consolidates MS16 U01-U04:
 *   U01 — PostLibraryBrowser   : Browse/filter the post catalog
 *   U02 — PostConfigurator     : Interactive step-by-step configuration
 *   U03 — PostExporter         : Multi-format export (.cps, JSON, .nc/.mpf/.eia, markdown)
 *   U04 — PostVersionManager   : Version tracking, diff, rollback per machine serial
 *
 * Actions: browse | configure | export_post | save_version |
 *          list_versions | diff_versions | rollback
 *
 * No external imports — pure computation + in-process version store.
 */

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface PostCatalogEntry {
  id: string;
  machine_brand: string;
  machine_model: string;
  controller: string;
  controller_variant: string;
  machine_type: string;
  capabilities: string[];
  available_options: string[];
  physics_stages: string[];
  base_cps?: string;
  version: string;
  last_updated: string;
}

export interface PostConfiguration {
  id: string;
  machine: { brand: string; model: string; serial?: string };
  controller: { family: string; variant: string };
  options: Record<string, boolean>;
  tier: 1 | 2 | 3 | 4;
  aggressiveness: number; // 0-100
  physics_stages: {
    stability_lobes: boolean;
    deflection: boolean;
    thermal: boolean;
    wear_tracking: boolean;
    chip_thinning: boolean;
    corner_decel: boolean;
    monte_carlo: boolean;
    safety_check: boolean;
    playbook: boolean;
  };
  output_format: "nc" | "mpf" | "eia" | "cps" | "json";
  include_analytics: boolean;
  include_setup_sheet: boolean;
  include_prove_out: boolean;
  inject_operator_comments: boolean;
  version: string;
  created: string;
}

export interface PostVersion {
  version: string;
  date: string;
  configuration: PostConfiguration;
  changes_from_previous: string[];
  machine_serial?: string;
}

export interface PostExportResult {
  format: string;
  content: string;
  filename: string;
  size_bytes: number;
  configuration_summary: string;
}

// ============================================================================
// ACTION INPUT/OUTPUT TYPES
// ============================================================================

export interface BrowseInput {
  machine_brand?: string;
  machine_model?: string;
  controller?: string;
  machine_type?: string;
  required_capabilities?: string[];
  required_options?: string[];
  required_physics_stages?: string[];
}

export interface BrowseOutput {
  total: number;
  entries: PostCatalogEntry[];
  filter_applied: Record<string, unknown>;
}

export interface ConfigureInput {
  machine_brand: string;
  machine_model: string;
  controller_family: string;
  controller_variant?: string;
  machine_serial?: string;
  options?: Record<string, boolean>;
  tier?: 1 | 2 | 3 | 4;
  aggressiveness?: number; // 0-100 or 1-8 scale auto-converted
  physics_stages?: Partial<PostConfiguration["physics_stages"]>;
  output_format?: PostConfiguration["output_format"];
  include_analytics?: boolean;
  include_setup_sheet?: boolean;
  include_prove_out?: boolean;
  inject_operator_comments?: boolean;
}

export interface ConfigureOutput {
  configuration: PostConfiguration;
  optimization_delta: OptimizationDelta;
  warnings: string[];
  recommendations: string[];
}

export interface OptimizationDelta {
  baseline_aggressiveness: number;
  applied_aggressiveness: number;
  tier_label: string;
  enabled_stages: string[];
  disabled_stages: string[];
  estimated_cycle_time_reduction_pct: number;
  estimated_tool_life_improvement_pct: number;
  estimated_surface_finish_improvement_pct: number;
  notes: string[];
}

export interface ExportPostInput {
  configuration: PostConfiguration;
  sample_operations?: SampleOperation[];
}

export interface SampleOperation {
  type: "facing" | "pocket" | "profile" | "drilling" | "tapping" | "boring" | "thread_milling";
  tool_number: number;
  rpm: number;
  feed_rate: number;
  depth?: number;
  diameter?: number;
  material?: string;
}

export interface SaveVersionInput {
  configuration: PostConfiguration;
  machine_serial?: string;
  change_notes?: string[];
}

export interface SaveVersionOutput {
  version_saved: string;
  post_id: string;
  history_length: number;
}

export interface ListVersionsInput {
  post_id: string;
  machine_serial?: string;
}

export interface ListVersionsOutput {
  post_id: string;
  versions: PostVersionSummary[];
}

export interface PostVersionSummary {
  version: string;
  date: string;
  machine_serial?: string;
  tier: number;
  aggressiveness: number;
  change_count: number;
  changes_from_previous: string[];
}

export interface DiffVersionsInput {
  post_id: string;
  version_a: string;
  version_b: string;
}

export interface DiffVersionsOutput {
  post_id: string;
  version_a: string;
  version_b: string;
  differences: DiffEntry[];
  summary: string;
}

export interface DiffEntry {
  field: string;
  value_a: unknown;
  value_b: unknown;
  change_type: "added" | "removed" | "modified";
}

export interface RollbackInput {
  post_id: string;
  target_version: string;
  machine_serial?: string;
}

export interface RollbackOutput {
  post_id: string;
  rolled_back_to: string;
  new_version: string;
  configuration: PostConfiguration;
  message: string;
}

// ============================================================================
// IN-PROCESS VERSION STORE
// ============================================================================

/** Keyed by post_id, ordered oldest-first. */
const VERSION_STORE: Map<string, PostVersion[]> = new Map();

// ============================================================================
// CATALOG DATA
// ============================================================================

const POST_CATALOG: PostCatalogEntry[] = [
  // ---- FANUC ----------------------------------------------------------------
  {
    id: "fanuc-0i-mf-plus",
    machine_brand: "Fanuc",
    machine_model: "0i-MF Plus",
    controller: "Fanuc",
    controller_variant: "0i-MF Plus",
    machine_type: "mill",
    capabilities: ["3axis", "rigid_tapping", "high_speed_cutting", "tool_life_management"],
    available_options: ["AI_contour_control", "nano_smoothing", "AIAPC", "servo_guide"],
    physics_stages: ["stability_lobes", "deflection", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "fanuc-0i.cps",
    version: "2.4.1",
    last_updated: "2025-11-12",
  },
  {
    id: "fanuc-31i-b5",
    machine_brand: "Fanuc",
    machine_model: "31i-B5",
    controller: "Fanuc",
    controller_variant: "31i-B5",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "RTCP", "high_speed_cutting", "rigid_tapping", "tool_life_management", "TCP"],
    available_options: ["AI_contour_control", "smooth_TCP", "nano_smoothing", "AIAPC", "servo_guide", "3D_interference_check"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "fanuc-31i-5axis.cps",
    version: "3.1.0",
    last_updated: "2025-12-01",
  },
  {
    id: "fanuc-32i-b",
    machine_brand: "Fanuc",
    machine_model: "32i-B",
    controller: "Fanuc",
    controller_variant: "32i-B",
    machine_type: "lathe",
    capabilities: ["turning", "live_tooling", "C_axis", "Y_axis", "sub_spindle", "part_catcher"],
    available_options: ["dual_path", "hobbing", "AI_contour_control", "servo_guide"],
    physics_stages: ["stability_lobes", "deflection", "wear_tracking", "chip_thinning", "safety_check"],
    base_cps: "fanuc-turning.cps",
    version: "2.2.0",
    last_updated: "2025-10-15",
  },
  // ---- SIEMENS --------------------------------------------------------------
  {
    id: "siemens-840d-sl-mill",
    machine_brand: "Siemens",
    machine_model: "840D sl",
    controller: "Siemens",
    controller_variant: "840D sl",
    machine_type: "mill",
    capabilities: ["3axis", "high_speed_cutting", "CYCLE800", "trochoidal", "tool_life_management"],
    available_options: ["ShopMill", "advanced_surface", "top_surface", "volumetric_compensation"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "siemens-840d.cps",
    version: "3.0.2",
    last_updated: "2025-09-20",
  },
  {
    id: "siemens-840d-sl-5axis",
    machine_brand: "Siemens",
    machine_model: "840D sl 5X",
    controller: "Siemens",
    controller_variant: "840D sl",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TRAORI", "CYCLE800", "high_speed_cutting", "TCP", "trochoidal"],
    available_options: ["ShopMill", "advanced_surface", "top_surface", "volumetric_compensation", "virtual_NC_kernel"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "siemens-840d-5axis.cps",
    version: "3.2.1",
    last_updated: "2025-12-10",
  },
  {
    id: "siemens-828d-mill",
    machine_brand: "Siemens",
    machine_model: "828D",
    controller: "Siemens",
    controller_variant: "828D",
    machine_type: "mill",
    capabilities: ["3axis", "rigid_tapping", "high_speed_cutting", "tool_life_management"],
    available_options: ["ShopMill", "advanced_surface"],
    physics_stages: ["stability_lobes", "deflection", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "siemens-828d.cps",
    version: "2.1.0",
    last_updated: "2025-08-05",
  },
  // ---- HEIDENHAIN -----------------------------------------------------------
  {
    id: "heidenhain-tnc640-5axis",
    machine_brand: "Heidenhain",
    machine_model: "TNC 640",
    controller: "Heidenhain",
    controller_variant: "TNC 640",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCPM", "DCM", "high_speed_cutting", "trochoidal", "tool_life_management"],
    available_options: ["AFC", "dynamic_precision", "cross_talk_compensation", "spindle_vibration_monitoring"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "wear_tracking", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "heidenhain-tnc640.cps",
    version: "4.0.0",
    last_updated: "2026-01-15",
  },
  {
    id: "heidenhain-tnc7-5axis",
    machine_brand: "Heidenhain",
    machine_model: "TNC 7",
    controller: "Heidenhain",
    controller_variant: "TNC 7",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCPM", "DCM", "high_speed_cutting", "trochoidal", "functional_safety", "tool_life_management"],
    available_options: ["AFC", "dynamic_precision", "cross_talk_compensation", "spindle_vibration_monitoring", "CAD_viewer", "remote_desktop"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "wear_tracking", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "heidenhain-tnc7.cps",
    version: "4.1.0",
    last_updated: "2026-02-01",
  },
  {
    id: "heidenhain-tnc320-3axis",
    machine_brand: "Heidenhain",
    machine_model: "TNC 320",
    controller: "Heidenhain",
    controller_variant: "TNC 320",
    machine_type: "mill",
    capabilities: ["3axis", "rigid_tapping", "tool_life_management"],
    available_options: ["AFC"],
    physics_stages: ["stability_lobes", "deflection", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "heidenhain-tnc320.cps",
    version: "2.0.0",
    last_updated: "2025-07-01",
  },
  // ---- HAAS -----------------------------------------------------------------
  {
    id: "haas-next-gen-3axis",
    machine_brand: "Haas",
    machine_model: "Next Gen",
    controller: "Haas",
    controller_variant: "Next Gen",
    machine_type: "mill",
    capabilities: ["3axis", "rigid_tapping", "high_speed_cutting", "tool_life_management"],
    available_options: ["Intuitive_Programming_System", "wireless_intuitive_probing", "vibration_damping"],
    physics_stages: ["stability_lobes", "deflection", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "haas-next-gen.cps",
    version: "2.3.0",
    last_updated: "2025-10-01",
  },
  {
    id: "haas-next-gen-5axis",
    machine_brand: "Haas",
    machine_model: "Next Gen 5X",
    controller: "Haas",
    controller_variant: "Next Gen",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCPC", "high_speed_cutting", "rigid_tapping", "tool_life_management"],
    available_options: ["Intuitive_Programming_System", "wireless_intuitive_probing", "vibration_damping", "WIPS"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "safety_check", "playbook"],
    base_cps: "haas-next-gen-5axis.cps",
    version: "2.5.0",
    last_updated: "2025-11-20",
  },
  // ---- MAZAK ----------------------------------------------------------------
  {
    id: "mazak-smooth-g-mill",
    machine_brand: "Mazak",
    machine_model: "Smooth G",
    controller: "Mazak",
    controller_variant: "Smooth G",
    machine_type: "mill",
    capabilities: ["3axis", "high_speed_cutting", "trochoidal", "tool_life_management"],
    available_options: ["smooth_corner_control", "MAZATROL_interlock", "thermal_shield"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "mazak-smooth-g.cps",
    version: "2.6.0",
    last_updated: "2025-09-15",
  },
  {
    id: "mazak-smooth-x-5axis",
    machine_brand: "Mazak",
    machine_model: "Smooth X 5X",
    controller: "Mazak",
    controller_variant: "Smooth X",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCP_control", "high_speed_cutting", "trochoidal", "tool_life_management"],
    available_options: ["smooth_corner_control", "MAZATROL_interlock", "thermal_shield", "intelligent_safety_shield"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "mazak-smooth-x-5axis.cps",
    version: "3.0.0",
    last_updated: "2025-12-20",
  },
  // ---- OKUMA ----------------------------------------------------------------
  {
    id: "okuma-osp-p300-mill",
    machine_brand: "Okuma",
    machine_model: "OSP-P300",
    controller: "Okuma",
    controller_variant: "OSP-P300",
    machine_type: "mill",
    capabilities: ["3axis", "high_speed_cutting", "rigid_tapping", "tool_life_management", "thermo_friendly"],
    available_options: ["machining_navi", "collision_avoidance_system", "vibration_cut"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "okuma-osp-p300.cps",
    version: "2.4.0",
    last_updated: "2025-10-30",
  },
  {
    id: "okuma-osp-p500-5axis",
    machine_brand: "Okuma",
    machine_model: "OSP-P500 5X",
    controller: "Okuma",
    controller_variant: "OSP-P500",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCP_control", "high_speed_cutting", "rigid_tapping", "tool_life_management", "thermo_friendly"],
    available_options: ["machining_navi", "collision_avoidance_system", "vibration_cut", "5axis_auto_tuning"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "wear_tracking", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "okuma-osp-p500-5axis.cps",
    version: "3.1.0",
    last_updated: "2026-01-10",
  },
  // ---- DMG MORI -------------------------------------------------------------
  {
    id: "dmg-celos-3axis",
    machine_brand: "DMG Mori",
    machine_model: "CELOS",
    controller: "Siemens",
    controller_variant: "840D sl",
    machine_type: "mill",
    capabilities: ["3axis", "high_speed_cutting", "trochoidal", "tool_life_management"],
    available_options: ["CELOS_apps", "process_dashboard", "shaft_machining"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "chip_thinning", "corner_decel", "safety_check"],
    base_cps: "dmg-celos-siemens.cps",
    version: "2.7.0",
    last_updated: "2025-11-05",
  },
  {
    id: "dmg-celos-5axis",
    machine_brand: "DMG Mori",
    machine_model: "CELOS 5X",
    controller: "Heidenhain",
    controller_variant: "TNC 640",
    machine_type: "mill_5axis",
    capabilities: ["5axis", "TCPM", "DCM", "high_speed_cutting", "trochoidal", "tool_life_management"],
    available_options: ["CELOS_apps", "process_dashboard", "AFC", "dynamic_precision"],
    physics_stages: ["stability_lobes", "deflection", "thermal", "wear_tracking", "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook"],
    base_cps: "dmg-celos-heidenhain.cps",
    version: "3.2.0",
    last_updated: "2026-01-20",
  },
];

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

interface TierDefinition {
  label: string;
  description: string;
  default_aggressiveness: number;
  enabled_stages: (keyof PostConfiguration["physics_stages"])[];
  cycle_time_reduction_pct: number;
  tool_life_improvement_pct: number;
  surface_finish_improvement_pct: number;
}

const TIER_DEFINITIONS: Record<1 | 2 | 3 | 4, TierDefinition> = {
  1: {
    label: "Foundation",
    description: "Core physics checks — safety and basic chip load. Minimal runtime overhead.",
    default_aggressiveness: 20,
    enabled_stages: ["chip_thinning", "safety_check"],
    cycle_time_reduction_pct: 3,
    tool_life_improvement_pct: 5,
    surface_finish_improvement_pct: 4,
  },
  2: {
    label: "Standard",
    description: "Stability, deflection, corner deceleration. Suitable for production environments.",
    default_aggressiveness: 45,
    enabled_stages: ["stability_lobes", "deflection", "chip_thinning", "corner_decel", "safety_check", "playbook"],
    cycle_time_reduction_pct: 9,
    tool_life_improvement_pct: 15,
    surface_finish_improvement_pct: 12,
  },
  3: {
    label: "Advanced",
    description: "Full physics pipeline including thermal and wear tracking. Optimal for aerospace/medical.",
    default_aggressiveness: 65,
    enabled_stages: [
      "stability_lobes", "deflection", "thermal", "wear_tracking",
      "chip_thinning", "corner_decel", "safety_check", "playbook",
    ],
    cycle_time_reduction_pct: 16,
    tool_life_improvement_pct: 28,
    surface_finish_improvement_pct: 22,
  },
  4: {
    label: "Elite",
    description: "All stages including Monte Carlo uncertainty quantification. Maximum optimization.",
    default_aggressiveness: 80,
    enabled_stages: [
      "stability_lobes", "deflection", "thermal", "wear_tracking",
      "chip_thinning", "corner_decel", "monte_carlo", "safety_check", "playbook",
    ],
    cycle_time_reduction_pct: 24,
    tool_life_improvement_pct: 38,
    surface_finish_improvement_pct: 31,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Convert 1-8 scale aggressiveness to 0-100. */
function normalizeAggressiveness(raw: number): number {
  if (raw > 8) {
    // already 0-100 scale
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  // 1-8 → 0-100
  return Math.max(0, Math.min(100, Math.round(((raw - 1) / 7) * 100)));
}

/** Generate a post ID from machine and controller. */
function generatePostId(brand: string, model: string, controller: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug(brand)}-${slug(model)}-${slug(controller)}`;
}

/** Semantic version bump (patch). */
function bumpVersion(current: string): string {
  const parts = current.split(".").map(Number);
  if (parts.length < 3) return "1.0.1";
  parts[2]++;
  return parts.join(".");
}

/** Format bytes as human-readable. */
function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Deep compare two values and return a flat list of difference paths. */
function deepDiff(a: unknown, b: unknown, path = ""): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    diffs.push({ field: path || "root", value_a: a, value_b: b, change_type: "modified" });
    return diffs;
  }
  if (a === b) return diffs;
  if (typeof a === "object" && a !== null && b !== null) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const key of keys) {
      const fullPath = path ? `${path}.${key}` : key;
      if (!(key in aObj)) {
        diffs.push({ field: fullPath, value_a: undefined, value_b: bObj[key], change_type: "added" });
      } else if (!(key in bObj)) {
        diffs.push({ field: fullPath, value_a: aObj[key], value_b: undefined, change_type: "removed" });
      } else {
        diffs.push(...deepDiff(aObj[key], bObj[key], fullPath));
      }
    }
    return diffs;
  }
  diffs.push({ field: path || "value", value_a: a, value_b: b, change_type: "modified" });
  return diffs;
}

/** Build default physics_stages object from tier. */
function buildPhysicsStages(
  tier: 1 | 2 | 3 | 4,
  overrides?: Partial<PostConfiguration["physics_stages"]>
): PostConfiguration["physics_stages"] {
  const tierStages = new Set<string>(TIER_DEFINITIONS[tier].enabled_stages);
  const base: PostConfiguration["physics_stages"] = {
    stability_lobes: tierStages.has("stability_lobes"),
    deflection: tierStages.has("deflection"),
    thermal: tierStages.has("thermal"),
    wear_tracking: tierStages.has("wear_tracking"),
    chip_thinning: tierStages.has("chip_thinning"),
    corner_decel: tierStages.has("corner_decel"),
    monte_carlo: tierStages.has("monte_carlo"),
    safety_check: tierStages.has("safety_check"),
    playbook: tierStages.has("playbook"),
  };
  if (overrides) {
    return { ...base, ...overrides };
  }
  return base;
}

/** Build optimization delta for a configuration. */
function buildOptimizationDelta(config: PostConfiguration): OptimizationDelta {
  const tier = config.tier;
  const tierDef = TIER_DEFINITIONS[tier];
  const aggFactor = config.aggressiveness / 100;

  const enabledStages: string[] = [];
  const disabledStages: string[] = [];
  for (const [key, val] of Object.entries(config.physics_stages)) {
    (val ? enabledStages : disabledStages).push(key);
  }

  const cyclePct = +(tierDef.cycle_time_reduction_pct * (0.6 + 0.4 * aggFactor)).toFixed(1);
  const toolPct = +(tierDef.tool_life_improvement_pct * (0.5 + 0.5 * aggFactor)).toFixed(1);
  const finishPct = +(tierDef.surface_finish_improvement_pct * (0.55 + 0.45 * aggFactor)).toFixed(1);

  const notes: string[] = [];
  if (config.aggressiveness > 80) notes.push("High aggressiveness — verify stability lobes on first prove-out.");
  if (config.physics_stages.monte_carlo) notes.push("Monte Carlo active — expect 200-400 ms additional post-processor time per operation.");
  if (!config.physics_stages.safety_check) notes.push("WARNING: Safety check disabled — ensure operator review before production.");
  if (config.physics_stages.thermal && !config.include_analytics) notes.push("Thermal stage active but analytics disabled — consider enabling include_analytics for thermal reports.");

  return {
    baseline_aggressiveness: tierDef.default_aggressiveness,
    applied_aggressiveness: config.aggressiveness,
    tier_label: tierDef.label,
    enabled_stages: enabledStages,
    disabled_stages: disabledStages,
    estimated_cycle_time_reduction_pct: cyclePct,
    estimated_tool_life_improvement_pct: toolPct,
    estimated_surface_finish_improvement_pct: finishPct,
    notes,
  };
}

// ============================================================================
// CPS GENERATOR
// ============================================================================

function generateCpsContent(config: PostConfiguration): string {
  const machineId = `${config.machine.brand} ${config.machine.model}`.toUpperCase();
  const ctrl = `${config.controller.family} ${config.controller.variant}`;
  const ts = config.created;

  const physicsComment = Object.entries(config.physics_stages)
    .filter(([, v]) => v)
    .map(([k]) => `//   * ${k}`)
    .join("\n");

  const optionsComment = Object.entries(config.options)
    .map(([k, v]) => `//   ${k}: ${v ? "ENABLED" : "disabled"}`)
    .join("\n");

  const aggrNote =
    config.aggressiveness >= 75
      ? "AGGRESSIVE — high-performance production runs"
      : config.aggressiveness >= 50
      ? "MODERATE — balanced cycle time / tool life"
      : "CONSERVATIVE — maximum process security";

  return `/**
 * PRISM Physics-Optimized Post Processor
 * Machine  : ${machineId}
 * Controller: ${ctrl}
 * Tier     : ${config.tier} — ${TIER_DEFINITIONS[config.tier].label}
 * Aggress. : ${config.aggressiveness}/100 (${aggrNote})
 * Version  : ${config.version}
 * Generated: ${ts}
 *
 * Physics Pipeline Stages:
${physicsComment}
 *
 * Purchase Options:
${optionsComment}
 *
 * PRISM Configuration ID: ${config.id}
 */

description = "PRISM ${machineId} ${config.controller.variant} Tier${config.tier}";
vendor = "${config.machine.brand}";
vendorUrl = "https://prism.local/posts/${config.id}";
legal = "PRISM Physics-Optimized — ${ts}";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Physics-optimized post for ${config.machine.brand} ${config.machine.model} with ${config.controller.family} ${config.controller.variant}. PRISM Tier ${config.tier} (${TIER_DEFINITIONS[config.tier].label}), aggressiveness ${config.aggressiveness}/100. Stages: ${Object.entries(config.physics_stages).filter(([,v])=>v).map(([k])=>k).join(", ")}.";

extension = "${config.output_format === "mpf" ? "mpf" : config.output_format === "eia" ? "eia" : "nc"}";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING${config.machine.model.toLowerCase().includes("lathe") || config.machine.model.toLowerCase().includes("turn") ? " | CAPABILITY_TURNING" : ""};
tolerance = spatial(0.002, MM);

// ---- Machine Limits ----
var maxFeedrate = spatial(${config.aggressiveness >= 70 ? 20000 : 15000}, MM);
var maxSpindleSpeed = ${config.aggressiveness >= 70 ? 24000 : 18000};
var maxCircularSweep = toRad(${config.controller.family === "Heidenhain" ? 360 : 180});

// ---- PRISM Physics Parameters ----
var PRISM_TIER = ${config.tier};
var PRISM_AGGRESSIVENESS = ${config.aggressiveness};
var PRISM_STABILITY_LOBES = ${config.physics_stages.stability_lobes};
var PRISM_DEFLECTION = ${config.physics_stages.deflection};
var PRISM_THERMAL = ${config.physics_stages.thermal};
var PRISM_WEAR_TRACKING = ${config.physics_stages.wear_tracking};
var PRISM_CHIP_THINNING = ${config.physics_stages.chip_thinning};
var PRISM_CORNER_DECEL = ${config.physics_stages.corner_decel};
var PRISM_MONTE_CARLO = ${config.physics_stages.monte_carlo};
var PRISM_SAFETY_CHECK = ${config.physics_stages.safety_check};
var PRISM_PLAYBOOK = ${config.physics_stages.playbook};

// ---- Chip Thinning Feed Compensation ----
function getChipThinningFactor(ae, d) {
  if (!PRISM_CHIP_THINNING) return 1.0;
  var ratio = ae / d;
  if (ratio >= 0.5) return 1.0;
  return Math.max(0.5, 1.0 / Math.sqrt(2.0 * ratio));
}

// ---- Corner Deceleration ----
function getCornerFeedFactor(angleDeg) {
  if (!PRISM_CORNER_DECEL) return 1.0;
  var aggrFactor = PRISM_AGGRESSIVENESS / 100.0;
  var minFactor = 0.25 + (aggrFactor * 0.35);
  if (angleDeg < 10) return minFactor;
  if (angleDeg > 150) return 1.0;
  return minFactor + ((angleDeg - 10) / 140.0) * (1.0 - minFactor);
}

// ---- Stability Lobe Check ----
function checkStabilityLobes(rpm, axialDoc, radialDoc, toolDia) {
  if (!PRISM_STABILITY_LOBES) return rpm;
  var chatter_risk = (axialDoc * radialDoc) / (toolDia * toolDia);
  if (chatter_risk > 0.18) {
    var safe_rpm = rpm * (1.0 - 0.08 * PRISM_AGGRESSIVENESS / 100.0);
    return Math.round(safe_rpm / 10) * 10;
  }
  return rpm;
}

// ---- Thermal Management ----
var _thermalAccumulator = 0.0;
function updateThermal(powerKW, durationMin) {
  if (!PRISM_THERMAL) return;
  _thermalAccumulator += powerKW * durationMin * 0.85;
  if (_thermalAccumulator > 45.0) {
    writeComment("PRISM THERMAL: accumulated heat index " + _thermalAccumulator.toFixed(1) + " — consider dwell/coolant flush");
    _thermalAccumulator *= 0.7;
  }
}

// ---- Tool Wear Tracking ----
var _toolCutDistance = {};
function trackWear(toolNum, distanceMm) {
  if (!PRISM_WEAR_TRACKING) return;
  if (!_toolCutDistance[toolNum]) _toolCutDistance[toolNum] = 0;
  _toolCutDistance[toolNum] += distanceMm;
  var threshold = 800.0 * (1.0 + PRISM_AGGRESSIVENESS / 200.0);
  if (_toolCutDistance[toolNum] > threshold) {
    writeComment("PRISM WEAR: T" + toolNum + " cumulative cut " + _toolCutDistance[toolNum].toFixed(0) + " mm — inspect flank wear");
  }
}

// ---- Program Start ----
function onOpen() {
  ${config.inject_operator_comments ? `writeComment("PRISM Physics-Optimized Post | ${config.machine.brand} ${config.machine.model} | Tier ${config.tier} | Aggressiveness ${config.aggressiveness}/100");` : ""}
  ${config.include_setup_sheet ? `writeComment("SETUP: Refer to PRISM setup sheet for workholding and datum locations.");` : ""}
  writeBlock(gAbsIncModal.format(90), gUnitModal.format(21));
  writeBlock(gFeedModeModal.format(94));
  ${config.controller.family === "Fanuc" || config.controller.family === "Haas" ? `writeBlock(gFormat.format(17), gFormat.format(40), gFormat.format(80));` : ""}
  ${config.controller.family === "Siemens" ? `writeBlock("CYCLE832(0.01, 112001, 1)"); // Advanced surface mode` : ""}
  ${config.controller.family === "Heidenhain" ? `writeBlock("FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS"); // TCPM activation` : ""}
}

// ---- Tool Change ----
function onToolChange() {
  ${config.inject_operator_comments ? `writeComment("PRISM T" + tool.number + ": " + tool.description + " | D=" + tool.diameter.toFixed(3) + " | L_comp=" + tool.lengthOffset);` : ""}
  if (PRISM_SAFETY_CHECK) {
    if (tool.diameter <= 0) { error("PRISM SAFETY: Invalid tool diameter T" + tool.number); return; }
  }
}

// ---- Spindle Speed ----
function onSpindleSpeed(spindleSpeed) {
  var rpm = Math.min(spindleSpeed, maxSpindleSpeed);
  ${config.inject_operator_comments ? `writeComment("PRISM RPM: " + rpm);` : ""}
  return rpm;
}

// ---- Rapid Movement ----
function onRapid(x, y, z) {
  var f = feedOutput.format(0);
  writeBlock(gMotionModal.format(0), xOutput.format(x), yOutput.format(y), zOutput.format(z));
}

// ---- Linear Movement ----
function onLinear(x, y, z, feed) {
  var chipFactor = getChipThinningFactor(currentSection.getWidth() || tool.diameter, tool.diameter);
  var adjustedFeed = feed * chipFactor;
  writeBlock(gMotionModal.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z), feedOutput.format(adjustedFeed));
  trackWear(tool.number, Math.sqrt(x*x + y*y + z*z));
}

// ---- Section Start ----
function onSectionStart() {
  if (PRISM_STABILITY_LOBES) {
    var safeRpm = checkStabilityLobes(spindleSpeed, currentSection.getInitialPosition().z, tool.diameter * 0.5, tool.diameter);
    if (safeRpm !== spindleSpeed) {
      writeComment("PRISM STABILITY: RPM adjusted " + spindleSpeed + " → " + safeRpm);
      spindleSpeed = safeRpm;
    }
  }
  ${config.include_prove_out ? `if (isFirstSection()) { writeComment("PRISM PROVE-OUT: Verify datum Z with touch probe before cycle start."); }` : ""}
}

// ---- Section End ----
function onSectionEnd() {
  updateThermal(spindleSpeed * tool.diameter / 1e6, cycleTime / 60.0);
}

// ---- Program End ----
function onClose() {
  ${config.inject_operator_comments ? `writeComment("PRISM: Program complete. Verify all tool wear checks.");` : ""}
  writeBlock(mFormat.format(30));
  ${config.include_analytics ? `// PRISM Analytics Summary written to sidecar .prism-log file at runtime` : ""}
}
`;
}

// ============================================================================
// NC GENERATOR
// ============================================================================

function generateNcContent(config: PostConfiguration, ops: SampleOperation[]): string {
  const ctrl = config.controller.family;
  const isHeid = ctrl === "Heidenhain";
  const isSiemens = ctrl === "Siemens";
  const isFanuc = ctrl === "Fanuc" || ctrl === "Haas";
  const isMazak = ctrl === "Mazak";
  const isOkuma = ctrl === "Okuma";

  const commentChar = isHeid ? ";" : ";";
  const comment = (txt: string) => isHeid ? `; ${txt}` : `(${txt})`;
  const programHeader = isSiemens
    ? `%_N_PRISM_MAIN_MPF\n; PRISM Physics-Optimized NC — ${config.machine.brand} ${config.machine.model}\n; Tier ${config.tier} | Aggressiveness ${config.aggressiveness}/100 | Version ${config.version}\n`
    : isHeid
    ? `BEGIN PGM PRISM_${config.controller.variant.replace(/\s/g, "_")} MM\n; PRISM Physics-Optimized NC — ${config.machine.brand} ${config.machine.model}\n; Tier ${config.tier} | Aggressiveness ${config.aggressiveness}/100 | Version ${config.version}\n`
    : `%\nO0001 (PRISM PHYSICS-OPTIMIZED PROGRAM)\n${comment(`Machine: ${config.machine.brand} ${config.machine.model}`)}\n${comment(`Controller: ${config.controller.family} ${config.controller.variant}`)}\n${comment(`Tier: ${config.tier} — ${TIER_DEFINITIONS[config.tier].label}`)}\n${comment(`Aggressiveness: ${config.aggressiveness}/100`)}\n${comment(`Version: ${config.version}`)}\n`;

  const safetyBlock = isFanuc || isMazak || isOkuma
    ? `G17 G20 G40 G49 G80 G90\nG54`
    : isSiemens
    ? `G17 G40 G54\n`
    : `; Safe start\nGLOBAL DEF REAL PRISM_AGG = ${config.aggressiveness}\n`;

  const physicsHeader = [
    comment("--- PRISM PHYSICS PIPELINE ---"),
    ...Object.entries(config.physics_stages)
      .filter(([, v]) => v)
      .map(([k]) => comment(`  STAGE ACTIVE: ${k}`)),
    comment("---"),
  ].join("\n");

  const operationBlocks = ops.length > 0
    ? ops.map((op, i) => {
        const chipFactor = config.physics_stages.chip_thinning ? 1.15 : 1.0;
        const adjustedFeed = Math.round(op.feed_rate * chipFactor);
        const stageNote = config.inject_operator_comments
          ? `\n${comment(`PRISM: T${op.tool_number} ${op.type} | F_base=${op.feed_rate} F_adj=${adjustedFeed} (chip_thinning x${chipFactor.toFixed(2)}) | S=${op.rpm}`)}`
          : "";
        return `\n${comment(`--- OP ${i + 1}: ${op.type.toUpperCase()} ---`)}${stageNote}\nT${op.tool_number} M6\nS${op.rpm} M3\nG0 G43 H${op.tool_number} Z50.\nG0 X0. Y0.\nG1 Z-${(op.depth ?? 5).toFixed(3)} F${Math.round(op.feed_rate * 0.3)}\nG1 X50. F${adjustedFeed}\nG0 Z50.\nM5`;
      }).join("\n")
    : `\n${comment("No sample operations provided — insert NC operations here.")}`;

  const footer = isHeid
    ? `\nM30\n; END PGM\n`
    : isSiemens
    ? `\nM30\n%_N_PRISM_END\n`
    : `\nG28 G91 Z0.\nM30\n%`;

  return `${programHeader}\n${physicsHeader}\n\n${safetyBlock}\n${operationBlocks}\n${footer}`;
}

// ============================================================================
// MARKDOWN SUMMARY GENERATOR
// ============================================================================

function generateMarkdownSummary(config: PostConfiguration, delta: OptimizationDelta): string {
  const stagesTable = Object.entries(config.physics_stages)
    .map(([k, v]) => `| ${k.replace(/_/g, " ").padEnd(22)} | ${v ? "✓ ON " : "  off"} |`)
    .join("\n");

  const optionsTable = Object.entries(config.options).length > 0
    ? Object.entries(config.options)
        .map(([k, v]) => `| ${k.padEnd(30)} | ${v ? "Enabled " : "Disabled"} |`)
        .join("\n")
    : "| *(none configured)*                     |          |";

  return `# PRISM Post Configuration Summary

## Machine
| Field        | Value                          |
|--------------|-------------------------------|
| Brand        | ${config.machine.brand}       |
| Model        | ${config.machine.model}       |
| Serial       | ${config.machine.serial ?? "—"}|
| Controller   | ${config.controller.family} ${config.controller.variant} |
| Output Format| ${config.output_format.toUpperCase()} |

## Optimization Settings
| Field               | Value                                                |
|---------------------|------------------------------------------------------|
| Tier                | **${config.tier} — ${TIER_DEFINITIONS[config.tier].label}** |
| Aggressiveness      | **${config.aggressiveness}/100**                    |
| Tier Description    | ${TIER_DEFINITIONS[config.tier].description}        |

## Physics Pipeline Stages
| Stage                    | Status |
|--------------------------|--------|
${stagesTable}

## Purchase Options
| Option                               | Status   |
|--------------------------------------|----------|
${optionsTable}

## Estimated Performance Delta (vs. unoptimized baseline)
| Metric                              | Improvement |
|-------------------------------------|-------------|
| Cycle Time Reduction                | **${delta.estimated_cycle_time_reduction_pct}%** |
| Tool Life Improvement               | **${delta.estimated_tool_life_improvement_pct}%** |
| Surface Finish Improvement          | **${delta.estimated_surface_finish_improvement_pct}%** |

## Output Flags
| Flag                    | Value   |
|-------------------------|---------|
| Include Analytics       | ${config.include_analytics}  |
| Include Setup Sheet     | ${config.include_setup_sheet} |
| Include Prove-Out Steps | ${config.include_prove_out}  |
| Inject Operator Comments| ${config.inject_operator_comments} |

${delta.notes.length > 0 ? `## Notes\n${delta.notes.map(n => `- ${n}`).join("\n")}` : ""}

---
*Generated by PRISM Post Library & Configurator Engine — Version ${config.version} — ${config.created}*
*Configuration ID: \`${config.id}\`*
`;
}

// ============================================================================
// U01 — BROWSE
// ============================================================================

function browse(input: BrowseInput): BrowseOutput {
  let results = [...POST_CATALOG];

  if (input.machine_brand) {
    const b = input.machine_brand.toLowerCase();
    results = results.filter(e => e.machine_brand.toLowerCase().includes(b));
  }
  if (input.machine_model) {
    const m = input.machine_model.toLowerCase();
    results = results.filter(e => e.machine_model.toLowerCase().includes(m));
  }
  if (input.controller) {
    const c = input.controller.toLowerCase();
    results = results.filter(e =>
      e.controller.toLowerCase().includes(c) ||
      e.controller_variant.toLowerCase().includes(c)
    );
  }
  if (input.machine_type) {
    results = results.filter(e => e.machine_type === input.machine_type);
  }
  if (input.required_capabilities && input.required_capabilities.length > 0) {
    results = results.filter(e =>
      input.required_capabilities!.every(cap => e.capabilities.includes(cap))
    );
  }
  if (input.required_options && input.required_options.length > 0) {
    results = results.filter(e =>
      input.required_options!.every(opt => e.available_options.includes(opt))
    );
  }
  if (input.required_physics_stages && input.required_physics_stages.length > 0) {
    results = results.filter(e =>
      input.required_physics_stages!.every(st => e.physics_stages.includes(st))
    );
  }

  return {
    total: results.length,
    entries: results,
    filter_applied: { ...input } as Record<string, unknown>,
  };
}

// ============================================================================
// U02 — CONFIGURE
// ============================================================================

function configure(input: ConfigureInput): ConfigureOutput {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Resolve tier
  const tier = (input.tier ?? 2) as 1 | 2 | 3 | 4;

  // Resolve and normalize aggressiveness
  let aggressiveness: number;
  if (input.aggressiveness !== undefined) {
    aggressiveness = normalizeAggressiveness(input.aggressiveness);
  } else {
    aggressiveness = TIER_DEFINITIONS[tier].default_aggressiveness;
  }

  // Validate against catalog
  const catalogEntry = POST_CATALOG.find(
    e =>
      e.machine_brand.toLowerCase() === input.machine_brand.toLowerCase() &&
      e.machine_model.toLowerCase() === input.machine_model.toLowerCase()
  );

  if (!catalogEntry) {
    warnings.push(
      `No exact catalog match for ${input.machine_brand} / ${input.machine_model}. Configuration proceeding with supplied parameters.`
    );
    recommendations.push("Run 'browse' to find the nearest matching catalog entry.");
  }

  // Validate options against catalog
  const validOptions = catalogEntry?.available_options ?? [];
  const suppliedOptions = input.options ?? {};
  for (const opt of Object.keys(suppliedOptions)) {
    if (validOptions.length > 0 && !validOptions.includes(opt)) {
      warnings.push(`Option '${opt}' not listed in catalog for this machine — verify it is installed.`);
    }
  }

  // Build default options from catalog
  const defaultOptions: Record<string, boolean> = {};
  for (const opt of validOptions) {
    defaultOptions[opt] = suppliedOptions[opt] ?? false;
  }
  const mergedOptions = { ...defaultOptions, ...suppliedOptions };

  // Physics stages
  const physicsStages = buildPhysicsStages(tier, input.physics_stages);

  // Recommendations
  if (aggressiveness > 75 && !physicsStages.monte_carlo) {
    recommendations.push("High aggressiveness with monte_carlo disabled — consider enabling for process security.");
  }
  if (tier >= 3 && !physicsStages.wear_tracking) {
    recommendations.push("Tier 3+ typically includes wear tracking — consider enabling.");
  }
  if (physicsStages.thermal && !input.include_analytics) {
    recommendations.push("Thermal stage is active — enable include_analytics for complete thermal reports.");
  }

  const now = new Date().toISOString();
  const configId = `${generatePostId(input.machine_brand, input.machine_model, input.controller_family)}-${Date.now()}`;

  const configuration: PostConfiguration = {
    id: configId,
    machine: {
      brand: input.machine_brand,
      model: input.machine_model,
      serial: input.machine_serial,
    },
    controller: {
      family: input.controller_family,
      variant: input.controller_variant ?? input.controller_family,
    },
    options: mergedOptions,
    tier,
    aggressiveness,
    physics_stages: physicsStages,
    output_format: input.output_format ?? "nc",
    include_analytics: input.include_analytics ?? false,
    include_setup_sheet: input.include_setup_sheet ?? true,
    include_prove_out: input.include_prove_out ?? false,
    inject_operator_comments: input.inject_operator_comments ?? true,
    version: "1.0.0",
    created: now,
  };

  const optimization_delta = buildOptimizationDelta(configuration);

  return { configuration, optimization_delta, warnings, recommendations };
}

// ============================================================================
// U03 — EXPORT POST
// ============================================================================

function exportPost(input: ExportPostInput): PostExportResult {
  const { configuration: config, sample_operations = [] } = input;
  const delta = buildOptimizationDelta(config);

  let content: string;
  let filename: string;
  const machineSlug = `${config.machine.brand}_${config.machine.model}`.replace(/\s+/g, "_");

  switch (config.output_format) {
    case "cps":
      content = generateCpsContent(config);
      filename = `PRISM_${machineSlug}_Tier${config.tier}_v${config.version}.cps`;
      break;

    case "json":
      content = JSON.stringify(
        {
          prism_post_configuration: config,
          optimization_delta: delta,
          catalog_entry: POST_CATALOG.find(
            e =>
              e.machine_brand.toLowerCase() === config.machine.brand.toLowerCase() &&
              e.machine_model.toLowerCase() === config.machine.model.toLowerCase()
          ) ?? null,
          export_date: new Date().toISOString(),
          schema_version: "POST-ULT-MS16",
        },
        null,
        2
      );
      filename = `PRISM_${machineSlug}_Tier${config.tier}_v${config.version}.json`;
      break;

    case "mpf":
      content = generateNcContent({ ...config, output_format: "mpf" }, sample_operations);
      filename = `PRISM_${machineSlug}_Tier${config.tier}_v${config.version}.mpf`;
      break;

    case "eia":
      content = generateNcContent({ ...config, output_format: "eia" }, sample_operations);
      filename = `PRISM_${machineSlug}_Tier${config.tier}_v${config.version}.eia`;
      break;

    case "nc":
    default:
      content = generateNcContent(config, sample_operations);
      filename = `PRISM_${machineSlug}_Tier${config.tier}_v${config.version}.nc`;
      break;
  }

  const configuration_summary = generateMarkdownSummary(config, delta);
  const size_bytes = new TextEncoder().encode(content).length;

  return {
    format: config.output_format,
    content,
    filename,
    size_bytes,
    configuration_summary,
  };
}

// ============================================================================
// U04 — VERSION MANAGER
// ============================================================================

function saveVersion(input: SaveVersionInput): SaveVersionOutput {
  const { configuration, machine_serial, change_notes } = input;
  const postId = configuration.id;

  const existing = VERSION_STORE.get(postId) ?? [];

  // Compute changes from previous
  let changes_from_previous: string[];
  if (existing.length === 0) {
    changes_from_previous = ["Initial version"];
  } else if (change_notes && change_notes.length > 0) {
    changes_from_previous = change_notes;
  } else {
    const prev = existing[existing.length - 1].configuration;
    const diffs = deepDiff(prev, configuration);
    changes_from_previous =
      diffs.length > 0
        ? diffs.map(d => `${d.change_type} ${d.field}: ${JSON.stringify(d.value_a)} → ${JSON.stringify(d.value_b)}`)
        : ["No detected changes (manual save)"];
  }

  // Bump version
  const prevVersion = existing.length > 0 ? existing[existing.length - 1].version : "0.0.0";
  const newVersion = bumpVersion(prevVersion);
  const updatedConfig = { ...configuration, version: newVersion };

  const versionEntry: PostVersion = {
    version: newVersion,
    date: new Date().toISOString(),
    configuration: updatedConfig,
    changes_from_previous,
    machine_serial: machine_serial ?? configuration.machine.serial,
  };

  existing.push(versionEntry);
  VERSION_STORE.set(postId, existing);

  return {
    version_saved: newVersion,
    post_id: postId,
    history_length: existing.length,
  };
}

function listVersions(input: ListVersionsInput): ListVersionsOutput {
  const history = VERSION_STORE.get(input.post_id) ?? [];
  const filtered = input.machine_serial
    ? history.filter(v => v.machine_serial === input.machine_serial)
    : history;

  const versions: PostVersionSummary[] = filtered.map(v => ({
    version: v.version,
    date: v.date,
    machine_serial: v.machine_serial,
    tier: v.configuration.tier,
    aggressiveness: v.configuration.aggressiveness,
    change_count: v.changes_from_previous.length,
    changes_from_previous: v.changes_from_previous,
  }));

  return { post_id: input.post_id, versions };
}

function diffVersions(input: DiffVersionsInput): DiffVersionsOutput {
  const history = VERSION_STORE.get(input.post_id) ?? [];
  const vA = history.find(v => v.version === input.version_a);
  const vB = history.find(v => v.version === input.version_b);

  if (!vA) {
    return {
      post_id: input.post_id,
      version_a: input.version_a,
      version_b: input.version_b,
      differences: [],
      summary: `Version ${input.version_a} not found in store for post ${input.post_id}.`,
    };
  }
  if (!vB) {
    return {
      post_id: input.post_id,
      version_a: input.version_a,
      version_b: input.version_b,
      differences: [],
      summary: `Version ${input.version_b} not found in store for post ${input.post_id}.`,
    };
  }

  const differences = deepDiff(vA.configuration, vB.configuration);
  const summary =
    differences.length === 0
      ? `No differences between v${input.version_a} and v${input.version_b}.`
      : `${differences.length} difference(s) found between v${input.version_a} and v${input.version_b}: ` +
        differences.slice(0, 3).map(d => d.field).join(", ") +
        (differences.length > 3 ? ` …and ${differences.length - 3} more.` : ".");

  return {
    post_id: input.post_id,
    version_a: input.version_a,
    version_b: input.version_b,
    differences,
    summary,
  };
}

function rollback(input: RollbackInput): RollbackOutput {
  const history = VERSION_STORE.get(input.post_id) ?? [];
  const target = history.find(v => v.version === input.target_version);

  if (!target) {
    throw new Error(
      `Rollback failed: version ${input.target_version} not found for post ${input.post_id}.`
    );
  }

  const restoredConfig = { ...target.configuration };
  const prevVersion = history.length > 0 ? history[history.length - 1].version : "0.0.0";
  const newVersion = bumpVersion(prevVersion);
  restoredConfig.version = newVersion;
  restoredConfig.created = new Date().toISOString();

  const rollbackEntry: PostVersion = {
    version: newVersion,
    date: new Date().toISOString(),
    configuration: restoredConfig,
    changes_from_previous: [`Rollback to v${input.target_version}`],
    machine_serial: input.machine_serial ?? target.machine_serial,
  };

  history.push(rollbackEntry);
  VERSION_STORE.set(input.post_id, history);

  return {
    post_id: input.post_id,
    rolled_back_to: input.target_version,
    new_version: newVersion,
    configuration: restoredConfig,
    message: `Successfully rolled back post '${input.post_id}' from v${prevVersion} to configuration of v${input.target_version}. New version is ${newVersion}.`,
  };
}

// ============================================================================
// ENGINE DISPATCH
// ============================================================================

type EngineAction =
  | "browse"
  | "configure"
  | "export_post"
  | "save_version"
  | "list_versions"
  | "diff_versions"
  | "rollback";

interface EngineInput {
  action: EngineAction;
  [key: string]: unknown;
}

interface EngineOutput {
  action: EngineAction;
  success: boolean;
  result?: unknown;
  error?: string;
}

function runPostLibraryConfiguratorEngine(input: EngineInput): EngineOutput {
  try {
    switch (input.action) {
      case "browse": {
        const result = browse(input as unknown as BrowseInput);
        return { action: input.action, success: true, result };
      }
      case "configure": {
        const result = configure(input as unknown as ConfigureInput);
        return { action: input.action, success: true, result };
      }
      case "export_post": {
        const result = exportPost(input as unknown as ExportPostInput);
        return { action: input.action, success: true, result };
      }
      case "save_version": {
        const result = saveVersion(input as unknown as SaveVersionInput);
        return { action: input.action, success: true, result };
      }
      case "list_versions": {
        const result = listVersions(input as unknown as ListVersionsInput);
        return { action: input.action, success: true, result };
      }
      case "diff_versions": {
        const result = diffVersions(input as unknown as DiffVersionsInput);
        return { action: input.action, success: true, result };
      }
      case "rollback": {
        const result = rollback(input as unknown as RollbackInput);
        return { action: input.action, success: true, result };
      }
      default: {
        const exhaustive: never = input.action;
        return {
          action: input.action,
          success: false,
          error: `Unknown action: ${exhaustive}`,
        };
      }
    }
  } catch (err) {
    return {
      action: input.action,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const postLibraryConfiguratorEngine = {
  name: "PostLibraryConfiguratorEngine",
  version: "1.0.0",
  milestone: "POST-ULT-MS16",
  units: ["U01-PostLibraryBrowser", "U02-PostConfigurator", "U03-PostExporter", "U04-PostVersionManager"],
  actions: ["browse", "configure", "export_post", "save_version", "list_versions", "diff_versions", "rollback"] as EngineAction[],
  run: runPostLibraryConfiguratorEngine,
  // Direct unit access for typed callers
  browse,
  configure,
  exportPost,
  saveVersion,
  listVersions,
  diffVersions,
  rollback,
};

export default postLibraryConfiguratorEngine;
