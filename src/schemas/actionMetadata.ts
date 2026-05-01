/**
 * Action Metadata — Schema-Driven Tool Discovery
 * ================================================
 * Rich metadata for actions: examples, related actions, tags, and hints.
 * Feeds MCP tool descriptions so the LLM routes to the right action faster
 * without parsing giant enum lists.
 *
 * Clean-room implementation inspired by self-describing tool patterns.
 *
 * @module schemas/actionMetadata
 * @version 1.0.0
 */

/** Metadata entry for a single action */
export interface ActionMeta {
  /** One-line description of what this action does */
  description: string;
  /** Example input params the LLM can reference */
  example?: Record<string, unknown>;
  /** Related actions the LLM should consider */
  related?: string[];
  /** Tags for semantic routing */
  tags?: string[];
  /** Typical response time hint */
  latencyHint?: "fast" | "medium" | "slow";
}

/**
 * Action metadata registry. Key = "dispatcher:action" (e.g., "prism_calc:cutting_force").
 * Not every action needs metadata — focus on the most frequently misrouted or ambiguous ones.
 */
export const ACTION_METADATA: Record<string, ActionMeta> = {
  // =========================================================================
  // prism_calc — Physics calculations
  // =========================================================================
  "prism_calc:cutting_force": {
    description: "Calculate cutting force using Kienzle model (Fc = kc1.1 * ap * fz^(1-mc))",
    example: {
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3, radial_depth: 10,
      tool_diameter: 20, number_of_teeth: 4, material_id: "steel_1045",
    },
    related: ["prism_calc:power", "prism_calc:torque", "prism_calc:deflection", "prism_calc:tool_life"],
    tags: ["force", "kienzle", "physics", "milling"],
    latencyHint: "fast",
  },
  "prism_calc:tool_life": {
    description: "Calculate tool life using Taylor equation (T = (C/Vc)^(1/n))",
    example: { cutting_speed: 200, material_id: "steel_1045", tool_material: "carbide" },
    related: ["prism_calc:cutting_force", "prism_calc:speed_feed", "prism_calc:thermal"],
    tags: ["tool_life", "taylor", "wear", "cost"],
    latencyHint: "fast",
  },
  "prism_calc:speed_feed": {
    description: "Calculate optimal speed and feed for a material/tool/operation combination",
    example: { material_id: "aluminum_6061_T6", tool_diameter: 12, operation: "roughing" },
    related: ["prism_calc:cutting_force", "prism_calc:tool_life", "prism_calc:surface_finish"],
    tags: ["speed", "feed", "optimization", "parameters"],
    latencyHint: "fast",
  },
  "prism_calc:surface_finish": {
    description: "Predict surface roughness Ra from feed, nose radius, and operation type",
    example: { feed: 0.15, nose_radius: 0.8, is_milling: false },
    related: ["prism_calc:speed_feed", "prism_calc:deflection", "prism_calc:vibration"],
    tags: ["surface", "roughness", "Ra", "finish"],
    latencyHint: "fast",
  },
  "prism_calc:deflection": {
    description: "Calculate tool/part deflection (delta = FL^3/3EI) for stiffness validation",
    example: { cutting_force: 500, tool_diameter: 10, overhang: 60, tool_material: "carbide" },
    related: ["prism_calc:cutting_force", "prism_calc:surface_finish", "prism_calc:stability"],
    tags: ["deflection", "stiffness", "chatter", "tooling"],
    latencyHint: "fast",
  },
  "prism_calc:stability": {
    description: "Compute stability lobe diagram (SLD) for chatter-free parameter selection",
    example: { tool_diameter: 20, number_of_teeth: 4, overhang: 60, material_id: "steel_4140" },
    related: ["prism_calc:deflection", "prism_calc:cutting_force", "prism_vibration_physics:modal_analysis"],
    tags: ["chatter", "stability", "SLD", "vibration"],
    latencyHint: "medium",
  },
  "prism_calc:power": {
    description: "Calculate spindle power required for a cut (P = Fc * Vc / 60000 / eta)",
    example: { cutting_force: 1200, cutting_speed: 200, tool_diameter: 20, efficiency: 0.85 },
    related: ["prism_calc:cutting_force", "prism_calc:torque", "prism_safety:check_spindle_power"],
    tags: ["power", "spindle", "machine", "capacity"],
    latencyHint: "fast",
  },
  "prism_calc:thermal": {
    description: "Predict cutting temperature using analytical/FEM thermal models",
    example: { cutting_speed: 250, feed_per_tooth: 0.12, axial_depth: 2, material_id: "titanium_Ti6Al4V" },
    related: ["prism_calc:tool_life", "prism_calc:cutting_force", "prism_calc:flow_stress"],
    tags: ["temperature", "thermal", "heat", "wear"],
    latencyHint: "fast",
  },
  "prism_calc:mrr": {
    description: "Calculate material removal rate (cm^3/min) and estimate cycle time",
    example: {
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3, radial_depth: 10,
      tool_diameter: 20, number_of_teeth: 4, volume_to_remove: 150,
    },
    related: ["prism_calc:cycle_time", "prism_calc:power", "prism_business:cost_breakdown"],
    tags: ["MRR", "productivity", "cycle_time", "removal_rate"],
    latencyHint: "fast",
  },

  // =========================================================================
  // prism_data — Data lookups
  // =========================================================================
  "prism_data:material_get": {
    description: "Get full material record by ID (properties, Kienzle coefficients, machinability)",
    example: { material_id: "steel_1045" },
    related: ["prism_data:material_search", "prism_calc:speed_feed"],
    tags: ["material", "lookup", "properties"],
    latencyHint: "fast",
  },
  "prism_data:material_search": {
    description: "Search materials by name, group, hardness range, or property filters",
    example: { query: "stainless 316", hardness_min: 150, hardness_max: 250 },
    related: ["prism_data:material_get", "prism_calc:speed_feed"],
    tags: ["material", "search", "filter"],
    latencyHint: "medium",
  },
  "prism_data:tool_search": {
    description: "Search cutting tools by type, diameter, material, coating, or manufacturer",
    example: { tool_type: "end_mill", diameter: 12, coating: "TiAlN", material: "carbide" },
    related: ["prism_data:tool_get", "prism_calc:speed_feed", "prism_data:tool_facets"],
    tags: ["tool", "search", "cutter", "inventory"],
    latencyHint: "medium",
  },
  "prism_data:machine_get": {
    description: "Get full machine record (spindle specs, travel limits, controller, options)",
    example: { machine_id: "haas_vf2" },
    related: ["prism_data:machine_search", "prism_safety:check_spindle_power"],
    tags: ["machine", "lookup", "specs"],
    latencyHint: "fast",
  },
  "prism_data:alarm_decode": {
    description: "Decode CNC controller alarm code to human-readable cause + fix",
    example: { controller: "fanuc", alarm_code: "2074" },
    related: ["prism_diagnosis:troubleshoot", "prism_data:machine_get"],
    tags: ["alarm", "error", "troubleshoot", "controller"],
    latencyHint: "fast",
  },

  // =========================================================================
  // prism_safety — Safety validation
  // =========================================================================
  "prism_safety:check_spindle_power": {
    description: "Verify cutting parameters don't exceed machine spindle power rating",
    example: { cutting_force: 1500, cutting_speed: 200, machine_id: "haas_vf2" },
    related: ["prism_calc:power", "prism_calc:cutting_force", "prism_safety:check_spindle_torque"],
    tags: ["safety", "spindle", "power", "machine_limits"],
    latencyHint: "fast",
  },
  "prism_safety:check_toolpath_collision": {
    description: "Check toolpath for collisions with fixture, part, or machine envelope",
    example: { toolpath_id: "op1_rough", machine_id: "haas_vf2" },
    related: ["prism_safety:check_fixture_clearance", "prism_safety:detect_near_miss"],
    tags: ["collision", "safety", "toolpath", "simulation"],
    latencyHint: "slow",
  },

  // =========================================================================
  // prism_cam — CAM operations
  // =========================================================================
  "prism_cam:generate_toolpath": {
    description: "Generate optimized toolpath for a machining operation",
    example: { operation: "adaptive_roughing", material_id: "steel_4140", tool_diameter: 20 },
    related: ["prism_cam:full_cam_pipeline", "prism_calc:speed_feed", "prism_toolpath:select_strategy"],
    tags: ["toolpath", "CAM", "machining", "generation"],
    latencyHint: "slow",
  },

  // =========================================================================
  // prism_intelligence — Compound operations
  // =========================================================================
  "prism_intelligence:dfm_check": {
    description: "Design for Manufacturability check — analyze part for machining feasibility",
    example: { part_description: "aluminum housing with internal channels", material: "6061-T6" },
    related: ["prism_intelligence:feasibility_check", "prism_intelligence:quote_job"],
    tags: ["DFM", "design", "feasibility", "manufacturing"],
    latencyHint: "slow",
  },
  "prism_intelligence:quote_job": {
    description: "Generate manufacturing quote with cycle time, tooling, and cost breakdown",
    example: { part_description: "steel bracket", quantity: 100, material: "steel_1018" },
    related: ["prism_business:quote_estimate", "prism_intelligence:dfm_check", "prism_calc:cycle_time"],
    tags: ["quote", "cost", "pricing", "business"],
    latencyHint: "slow",
  },

  // =========================================================================
  // prism_thread — Threading
  // =========================================================================
  "prism_thread:calculate_tap_drill": {
    description: "Calculate tap drill size for a given thread specification",
    example: { thread_spec: "M10x1.5", thread_percentage: 75 },
    related: ["prism_thread:get_thread_specifications", "prism_thread:calculate_thread_mill_params"],
    tags: ["thread", "tap", "drill", "hole"],
    latencyHint: "fast",
  },
};

/**
 * Get metadata for an action, returning undefined if not registered.
 * Callers should fall back to the default schema description.
 */
export function getActionMeta(action: string): ActionMeta | undefined {
  return ACTION_METADATA[action];
}

/**
 * Build an enriched tool description from metadata.
 * Appends example and related actions to the base description.
 */
export function buildEnrichedDescription(action: string, baseDescription: string): string {
  const meta = ACTION_METADATA[action];
  if (!meta) return baseDescription;

  let desc = meta.description || baseDescription;
  if (meta.example) {
    const exStr = JSON.stringify(meta.example);
    if (exStr.length < 200) {
      desc += ` | Example: ${exStr}`;
    }
  }
  if (meta.related && meta.related.length > 0) {
    desc += ` | Related: ${meta.related.join(", ")}`;
  }
  return desc;
}
