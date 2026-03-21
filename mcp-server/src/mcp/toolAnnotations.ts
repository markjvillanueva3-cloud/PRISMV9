/**
 * MCP Tool Annotations for PRISM Dispatchers
 *
 * Maps each dispatcher to ToolAnnotations hints:
 * - readOnlyHint: Tool does not modify state
 * - destructiveHint: Tool may perform destructive updates (only when readOnly=false)
 * - idempotentHint: Repeated calls with same args produce same result
 * - openWorldHint: Tool interacts with external entities
 * - title: Human-readable display name
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#annotations
 */

export interface ToolAnnotationConfig {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  title?: string;
}

/**
 * Annotation map for all 68 PRISM dispatchers.
 * Categorized by safety profile:
 * - READ_ONLY: Data queries, lookups, calculations (no side effects)
 * - COMPUTE: Pure computation, idempotent (same input = same output)
 * - MUTATING: Modifies state (calibration, memory, config)
 * - EXTERNAL: Interacts with external systems (Fusion 360, controllers)
 */
export const DISPATCHER_ANNOTATIONS: Record<string, ToolAnnotationConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // READ-ONLY: Data access, lookups, queries
  // ═══════════════════════════════════════════════════════════════
  prism_data: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "PRISM Data Registry",
  },
  prism_knowledge: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Knowledge Base Query",
  },
  prism_knowledge_ext: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Extended Knowledge Query",
  },
  prism_shop_practice: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Shop Practice KB",
  },
  prism_document: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Document Registry",
  },
  prism_diagnosis: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Diagnostic Analysis",
  },
  prism_industry: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Industry Standards",
  },
  prism_export: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Data Export",
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPUTE: Pure calculations, idempotent physics/math
  // ═══════════════════════════════════════════════════════════════
  prism_calc: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Manufacturing Calculator (1130+ actions)",
  },
  prism_safety: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Safety Validation",
  },
  prism_thread: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Threading Calculator",
  },
  prism_toolpath: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Toolpath Strategy Engine",
  },
  prism_turning: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Turning Operations",
  },
  prism_five_axis: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "5-Axis Machining",
  },
  prism_edm: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "EDM Operations",
  },
  prism_grinding: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Grinding Operations",
  },
  prism_scientific_math: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Scientific Mathematics",
  },
  prism_vibration_physics: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Vibration Physics",
  },
  prism_mechanical_design: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Mechanical Design",
  },
  prism_fluid_thermal: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Fluid & Thermal Analysis",
  },
  prism_forming_casting: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Forming & Casting",
  },
  prism_welding_joining: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Welding & Joining",
  },
  prism_material_processing: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Material Processing",
  },
  prism_cnc_ops: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "CNC Operations",
  },
  prism_machine_setup: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Machine Setup",
  },
  prism_quality: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Quality Engineering",
  },
  prism_process_control: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Process Control",
  },
  prism_business: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Business Analytics",
  },
  prism_scheduling: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Production Scheduling",
  },
  prism_feasibility: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Machining Feasibility",
  },
  prism_multi_op: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Multi-Op Orchestration",
  },
  prism_l2_engine: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Legacy Engine Bridge",
  },
  prism_adaptive_control: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Adaptive Control",
  },

  // ═══════════════════════════════════════════════════════════════
  // ORCHESTRATION: Multi-step pipelines (read-only, may be slow)
  // ═══════════════════════════════════════════════════════════════
  prism_cam: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "CAM Operations",
  },
  prism_cad: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "CAD Operations",
  },
  prism_omega: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Omega Quality Scoring",
  },
  prism_validation: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Validation Engine",
  },
  prism_ralph: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "Ralph Iterative Validator",
  },
  prism_orchestration: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "Workflow Orchestration",
  },
  prism_intelligence: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Intelligence Engine",
  },
  prism_product: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    title: "Product Intelligence",
  },
  prism_machine_live: {
    readOnlyHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: "Machine Live Data",
  },
  prism_integration: {
    readOnlyHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: "System Integration",
  },
  prism_proven_pipeline: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "Proven Pipeline Workflows",
  },
  prism_monitoring: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "System Monitoring",
  },

  // ═══════════════════════════════════════════════════════════════
  // MUTATING: Modifies internal state
  // ═══════════════════════════════════════════════════════════════
  prism_session: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Session Management",
  },
  prism_memory: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Cross-Session Memory",
  },
  prism_context: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Context Management",
  },
  prism_hook: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Hook Configuration",
  },
  prism_nl_hook: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Natural Language Hooks",
  },
  prism_telemetry: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Telemetry & Self-Optimization",
  },
  prism_pfp: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Predictive Failure Prevention",
  },
  prism_guard: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "Safety Guard",
  },
  prism_compliance: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: "Compliance Templates",
  },
  prism_tenant: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Multi-Tenant Isolation",
  },
  prism_auth: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
    title: "Authentication",
  },

  // ═══════════════════════════════════════════════════════════════
  // EXTERNAL: Interacts with outside systems
  // ═══════════════════════════════════════════════════════════════
  prism_bridge: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: "Protocol Bridge Gateway",
  },
  prism_realtime: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: "Real-Time WebSocket",
  },
  prism_automation: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
    title: "Automation Engine",
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTONOMOUS: Agent/autopilot systems
  // ═══════════════════════════════════════════════════════════════
  prism_atcs: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Autonomous Task Completion",
  },
  prism_autonomous: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Autonomous Execution",
  },
  prism_autopilot: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Autopilot Controller",
  },

  // ═══════════════════════════════════════════════════════════════
  // GENERATORS & LEARNING
  // ═══════════════════════════════════════════════════════════════
  prism_generator: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Code Generator",
  },
  prism_skill_script: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Skill Script Engine",
  },
  prism_sp: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "SP Engine",
  },
  prism_dev: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Development Tools",
  },
  prism_gsd: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "GSD Engine",
  },
  prism_manus: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Manus Engine",
  },
  prism_document_learning: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    title: "Document Learning",
  },
};

/**
 * Get annotations for a dispatcher by its tool name.
 * Returns empty object if dispatcher not found (safe default).
 */
export function getAnnotations(toolName: string): ToolAnnotationConfig {
  return DISPATCHER_ANNOTATIONS[toolName] ?? {};
}

/**
 * Classify a dispatcher's safety profile.
 */
export function getToolSafetyClass(toolName: string): "read-only" | "compute" | "mutating" | "external" | "unknown" {
  const ann = DISPATCHER_ANNOTATIONS[toolName];
  if (!ann) return "unknown";
  if (ann.openWorldHint) return "external";
  if (ann.readOnlyHint) return ann.idempotentHint ? "compute" : "read-only";
  return "mutating";
}
