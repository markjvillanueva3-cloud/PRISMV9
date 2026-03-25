/**
 * Complete Tool Annotations Reference for ALL PRISM Dispatchers
 *
 * This file provides a simplified annotation map for every dispatcher,
 * organized by safety classification. It complements the main toolAnnotations.ts
 * which uses MCP ToolAnnotationConfig format.
 *
 * Classifications:
 * - readOnly: Pure data access, no side effects
 * - destructive: May modify persistent state or external systems
 * - idempotent: Same input always produces same output
 * - openWorld: Interacts with external systems (network, hardware, APIs)
 *
 * @see toolAnnotations.ts for the MCP-native format used at runtime
 */

export interface SimpleToolAnnotation {
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
  description: string;
  category: "read-only" | "compute" | "orchestration" | "mutating" | "external" | "autonomous" | "generator";
  actionCount?: number;
}

/**
 * Complete tool annotation map for all 68 PRISM dispatchers.
 * Synchronized with src/tools/dispatchers/*.ts as of 2026-03-20.
 */
export const completeToolAnnotations: Record<string, SimpleToolAnnotation> = {
  // ═══════════════════════════════════════════════════════════════════════
  // READ-ONLY: Data access, lookups, queries — no side effects
  // ═══════════════════════════════════════════════════════════════════════

  calcDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Physics calculations and formulas — Kienzle, Taylor, deflection, stability lobes, 1130+ actions",
    category: "compute",
    actionCount: 1130,
  },
  dataDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Material/machine/tool/alarm registry — 2957 materials, 910 machines, 95K+ tools, 10K+ alarms",
    category: "read-only",
  },
  knowledgeDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Knowledge base query — tribal tips, playbook rules, shop practices",
    category: "read-only",
  },
  knowledgeExtDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Extended knowledge query — 3700+ tribal tips across 18 CAM systems",
    category: "read-only",
  },
  shopPracticeDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Shop practice knowledge base — real-world machining guidance",
    category: "read-only",
  },
  documentDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Document registry — structured document access",
    category: "read-only",
  },
  diagnosisDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Diagnostic analysis — root cause, failure mode identification",
    category: "read-only",
  },
  industryDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Industry standards — ISO, DIN, ASME reference lookups",
    category: "read-only",
  },
  exportDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Data export — format conversion, report generation",
    category: "read-only",
  },
  safetyDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Safety validation — G-code safety rules, compliance checks",
    category: "compute",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COMPUTE: Pure physics/math calculations, idempotent
  // ═══════════════════════════════════════════════════════════════════════

  threadDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Threading calculator — ISO/UN/NPT thread parameters",
    category: "compute",
  },
  toolpathDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Toolpath strategy engine — 24 novel algorithms, cross-CAM synthesis",
    category: "compute",
  },
  turningDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Turning operations — OD/ID/face/bore/groove/thread turning physics",
    category: "compute",
  },
  fiveAxisDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "5-axis machining — TCPC/RTCP, singularity, contour/port milling",
    category: "compute",
  },
  edmDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "EDM operations — wire/sinker/hole-pop, discharge physics",
    category: "compute",
  },
  grindingDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Grinding operations — surface/cylindrical/centerless grinding physics",
    category: "compute",
  },
  scientificMathDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Scientific mathematics — regression, time series, reliability, signal processing",
    category: "compute",
  },
  vibrationPhysicsDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Vibration physics — stability lobes, chatter prediction, modal analysis",
    category: "compute",
  },
  mechanicalDesignDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Mechanical design — stress, fatigue, bolted joints, springs, gears (51 actions)",
    category: "compute",
    actionCount: 51,
  },
  fluidThermalDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Fluid & thermal analysis — coolant dynamics, heat transfer, cryogenic (35 actions)",
    category: "compute",
    actionCount: 35,
  },
  formingCastingDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Forming & casting — sheet metal, forging, casting, springback (16 actions)",
    category: "compute",
    actionCount: 16,
  },
  weldingJoiningDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Welding & joining — MIG/TIG/laser welding, HAZ, distortion (6 actions)",
    category: "compute",
    actionCount: 6,
  },
  materialProcessingDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Material processing — heat treatment, hardening, annealing (11 actions)",
    category: "compute",
    actionCount: 11,
  },
  cncOpsDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "CNC operations — probe routines, cycle time, energy optimization (32 actions)",
    category: "compute",
    actionCount: 32,
  },
  machineSetupDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Machine setup — fixture, workholding, alignment, error budget (25 actions)",
    category: "compute",
    actionCount: 25,
  },
  qualityDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Quality engineering — SPC, Cpk, GD&T, CMM path planning",
    category: "compute",
  },
  processControlDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Process control — adaptive feed, spindle control, digital twin sync",
    category: "compute",
  },
  businessDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Business analytics — quoting, ROI, cost-per-part, TCO",
    category: "compute",
  },
  schedulingDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Production scheduling — job sequencing, bottleneck analysis",
    category: "compute",
  },
  feasibilityDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Machining feasibility — 7-engine forward simulation, 43 failure modes",
    category: "compute",
  },
  multiOpDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Multi-op orchestration — operation sequencing, setup planning",
    category: "compute",
  },
  l2EngineDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Legacy engine bridge — backward-compatible engine access",
    category: "compute",
  },
  adaptiveControlDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Adaptive control — real-time feed/speed adjustment algorithms",
    category: "compute",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ORCHESTRATION: Multi-step pipelines, may be slow but read-only
  // ═══════════════════════════════════════════════════════════════════════

  camDispatcher: {
    readOnly: true,
    idempotent: false,
    description: "CAM operations — strategy selection, toolpath generation, cross-CAM analysis (22 actions)",
    category: "orchestration",
    actionCount: 22,
  },
  cadDispatcher: {
    destructive: false,
    idempotent: false,
    description: "CAD operations — Fusion 360 script gen, CadQuery, CAD taxonomy (24 actions)",
    category: "orchestration",
    actionCount: 24,
  },
  omegaDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Omega quality scoring — cross-pipeline consistency verification",
    category: "orchestration",
  },
  validationDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Validation engine — physics cross-check, benchmark suite",
    category: "orchestration",
  },
  ralphDispatcher: {
    readOnly: true,
    idempotent: false,
    description: "Ralph iterative validator — multi-pass refinement loops",
    category: "orchestration",
  },
  orchestrationDispatcher: {
    readOnly: true,
    idempotent: false,
    description: "Workflow orchestration — pipeline coordination, multi-engine chains",
    category: "orchestration",
  },
  intelligenceDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Intelligence engine — cross-domain analysis, pattern recognition",
    category: "orchestration",
  },
  productDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "Product intelligence — feature extraction, manufacturability analysis",
    category: "orchestration",
  },
  integrationDispatcher: {
    readOnly: true,
    idempotent: true,
    description: "System integration — cross-engine wiring, pipeline management",
    category: "orchestration",
  },
  provenPipelineDispatcher: {
    readOnly: true,
    idempotent: false,
    description: "Proven pipeline — production-validated multi-step workflows",
    category: "orchestration",
  },
  monitoringDispatcher: {
    readOnly: true,
    idempotent: false,
    description: "System monitoring — health checks, performance metrics, diagnostics",
    category: "orchestration",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MUTATING: Modifies internal state (memory, config, calibration)
  // ═══════════════════════════════════════════════════════════════════════

  sessionDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Session management — context tracking, state persistence",
    category: "mutating",
  },
  memoryDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Cross-session memory — persistent knowledge storage",
    category: "mutating",
  },
  contextDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Context management — window pressure, integrity tracking",
    category: "mutating",
  },
  hookDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Hook configuration — 213 hookify rules, 9 hook scripts",
    category: "mutating",
  },
  nlHookDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Natural language hooks — dynamic rule creation from plain text",
    category: "mutating",
  },
  telemetryDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Telemetry & self-optimization — usage tracking, performance tuning",
    category: "mutating",
  },
  pfpDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Predictive failure prevention — proactive issue detection",
    category: "mutating",
  },
  guardDispatcher: {
    destructive: true,
    idempotent: false,
    description: "Safety guard — enforces constraints, blocks dangerous operations",
    category: "mutating",
  },
  complianceDispatcher: {
    destructive: false,
    idempotent: true,
    description: "Compliance templates — ISO/AS9100/IATF documentation generation",
    category: "mutating",
  },
  tenantDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Multi-tenant isolation — workspace separation, access control",
    category: "mutating",
  },
  authDispatcher: {
    destructive: true,
    idempotent: false,
    description: "Authentication — OAuth 2.1 + PKCE, JWT tokens, role hierarchy",
    category: "mutating",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EXTERNAL: Interacts with outside systems (network, hardware, APIs)
  // ═══════════════════════════════════════════════════════════════════════

  bridgeDispatcher: {
    openWorld: true,
    idempotent: false,
    description: "Protocol bridge gateway — OPC-UA, MTConnect, MQTT, Grafana",
    category: "external",
  },
  realtimeDispatcher: {
    openWorld: true,
    idempotent: false,
    description: "Real-time WebSocket — live streaming, push notifications",
    category: "external",
  },
  automationDispatcher: {
    destructive: true,
    openWorld: true,
    idempotent: false,
    description: "Automation engine — external system control, workflow execution",
    category: "external",
  },
  machineLiveDispatcher: {
    readOnly: true,
    openWorld: true,
    idempotent: false,
    description: "Machine live data — real-time CNC status via OPC-UA/MTConnect",
    category: "external",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTONOMOUS: Agent/autopilot systems — self-directed execution
  // ═══════════════════════════════════════════════════════════════════════

  atcsDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Autonomous task completion — self-directed multi-step tasks",
    category: "autonomous",
  },
  autonomousDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Autonomous execution — self-healing, adaptive workflows",
    category: "autonomous",
  },
  autoPilotDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Autopilot controller — milestone-driven autonomous builds",
    category: "autonomous",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GENERATORS & LEARNING: Code generation, skill scripts, document learning
  // ═══════════════════════════════════════════════════════════════════════

  generatorDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Code generator — Fusion 360 scripts, CadQuery, G-code templates",
    category: "generator",
  },
  skillScriptDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Skill script engine — dynamic skill creation and execution",
    category: "generator",
  },
  spDispatcher: {
    destructive: false,
    idempotent: false,
    description: "SP engine — structured prompt execution",
    category: "generator",
  },
  devDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Development tools — debugging, testing, introspection",
    category: "generator",
  },
  gsdDispatcher: {
    destructive: false,
    idempotent: false,
    description: "GSD engine — get stuff done task runner",
    category: "generator",
  },
  manusDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Manus engine — manufacturing instruction generation",
    category: "generator",
  },
  documentLearningDispatcher: {
    destructive: false,
    idempotent: false,
    description: "Document learning — PDF/video extraction, knowledge ingestion",
    category: "generator",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════════════════════════════

/** Total dispatcher count */
export const DISPATCHER_COUNT = Object.keys(completeToolAnnotations).length;

/** Get all dispatchers by category */
export function getDispatchersByCategory(category: SimpleToolAnnotation["category"]): string[] {
  return Object.entries(completeToolAnnotations)
    .filter(([, ann]) => ann.category === category)
    .map(([name]) => name);
}

/** Get all read-only dispatchers (safe for unrestricted use) */
export function getReadOnlyDispatchers(): string[] {
  return Object.entries(completeToolAnnotations)
    .filter(([, ann]) => ann.readOnly === true)
    .map(([name]) => name);
}

/** Get all destructive dispatchers (require confirmation) */
export function getDestructiveDispatchers(): string[] {
  return Object.entries(completeToolAnnotations)
    .filter(([, ann]) => ann.destructive === true)
    .map(([name]) => name);
}

/** Get all open-world dispatchers (access external resources) */
export function getOpenWorldDispatchers(): string[] {
  return Object.entries(completeToolAnnotations)
    .filter(([, ann]) => ann.openWorld === true)
    .map(([name]) => name);
}

/** Summary statistics */
export function getAnnotationSummary(): {
  total: number;
  readOnly: number;
  destructive: number;
  openWorld: number;
  byCategory: Record<string, number>;
} {
  const entries = Object.values(completeToolAnnotations);
  const byCategory: Record<string, number> = {};
  for (const ann of entries) {
    byCategory[ann.category] = (byCategory[ann.category] ?? 0) + 1;
  }
  return {
    total: entries.length,
    readOnly: entries.filter((a) => a.readOnly).length,
    destructive: entries.filter((a) => a.destructive).length,
    openWorld: entries.filter((a) => a.openWorld).length,
    byCategory,
  };
}
