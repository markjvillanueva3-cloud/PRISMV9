/**
 * PRISM Product Catalog — Source of Truth for Pricing Tiers & Feature Gating
 *
 * Maps every dispatcher to a pricing tier with metering rules.
 * Used by middleware, UI, and billing to decide what each user can access.
 *
 * Tier hierarchy (cumulative):
 *   Free < Machinist < Programmer < Engineer < Enterprise
 *
 * @milestone APP-MS0 P0-U01
 */

// ============================================================================
// TYPES
// ============================================================================

export enum PricingTier {
  FREE = "free",
  MACHINIST = "machinist",
  PROGRAMMER = "programmer",
  ENGINEER = "engineer",
  ENTERPRISE = "enterprise",
}

/** Numeric rank for tier comparison — higher = more access */
const TIER_RANK: Record<PricingTier, number> = {
  [PricingTier.FREE]: 0,
  [PricingTier.MACHINIST]: 1,
  [PricingTier.PROGRAMMER]: 2,
  [PricingTier.ENGINEER]: 3,
  [PricingTier.ENTERPRISE]: 4,
};

export type MeteringType = "per-calculation" | "unlimited" | "daily-limit";
export type ExportFormat = "clipboard" | "csv" | "json" | "pdf" | "gcode";

export interface TierDefinition {
  id: PricingTier;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  annualPriceCents: number; // per-month price when billed annually
  features: string[];
  limits: TierLimits;
  color: string; // UI badge color
}

export interface TierLimits {
  calculationsPerDay: number; // -1 = unlimited
  maxSavedResults: number;
  maxApiCallsPerMonth: number; // -1 = unlimited, 0 = no API access
  maxConcurrentJobs: number;
  exportFormats: ExportFormat[];
}

export interface DispatcherAccess {
  dispatcher: string;
  minimumTier: PricingTier | "system"; // "system" = always available (auth, session, etc.)
  metering: MeteringType;
  dailyLimit?: number; // only when metering === "daily-limit"
  description: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  dispatchers: string[]; // dispatcher names this add-on unlocks
  icon: string;
}

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export const TIERS: Record<PricingTier, TierDefinition> = {
  [PricingTier.FREE]: {
    id: PricingTier.FREE,
    name: "Free",
    tagline: "Try PRISM — basic calculations and lookups",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    color: "gray",
    features: [
      "5 speed/feed calculations per day",
      "Material, tool, and machine lookups",
      "Basic CNC calculators",
      "Clipboard export",
    ],
    limits: {
      calculationsPerDay: 5,
      maxSavedResults: 10,
      maxApiCallsPerMonth: 0,
      maxConcurrentJobs: 1,
      exportFormats: ["clipboard"],
    },
  },
  [PricingTier.MACHINIST]: {
    id: PricingTier.MACHINIST,
    name: "Machinist",
    tagline: "Daily shop floor tools — speeds, feeds, setups",
    monthlyPriceCents: 2900,
    annualPriceCents: 2400, // $24/mo billed annually ($288/yr)
    color: "blue",
    features: [
      "Unlimited speed/feed calculations",
      "1,229 CNC calculators (milling, turning, drilling, threading)",
      "Full material database (2,957 materials)",
      "Full tool database (95,608 tools)",
      "Machine setup and quality tools",
      "CSV and JSON export",
    ],
    limits: {
      calculationsPerDay: -1,
      maxSavedResults: 500,
      maxApiCallsPerMonth: 0,
      maxConcurrentJobs: 2,
      exportFormats: ["clipboard", "csv", "json"],
    },
  },
  [PricingTier.PROGRAMMER]: {
    id: PricingTier.PROGRAMMER,
    name: "Programmer",
    tagline: "CAM programming and CNC program generation",
    monthlyPriceCents: 7900,
    annualPriceCents: 6600, // $66/mo billed annually ($792/yr)
    color: "green",
    features: [
      "Everything in Machinist",
      "CAM toolpath strategies (794 actions across 18 CAM systems)",
      "Post-processor pipeline (20 controller dialects)",
      "CNC program generation (milling, turning, multi-axis)",
      "Multi-operation orchestration",
      "Proven pipeline workflows",
      "PDF and G-code export",
    ],
    limits: {
      calculationsPerDay: -1,
      maxSavedResults: 2000,
      maxApiCallsPerMonth: 0,
      maxConcurrentJobs: 3,
      exportFormats: ["clipboard", "csv", "json", "pdf", "gcode"],
    },
  },
  [PricingTier.ENGINEER]: {
    id: PricingTier.ENGINEER,
    name: "Engineer",
    tagline: "Advanced physics, simulation, and DFM analysis",
    monthlyPriceCents: 19900,
    annualPriceCents: 16600, // $166/mo billed annually ($1,992/yr)
    color: "purple",
    features: [
      "Everything in Programmer",
      "Adaptive control and digital twin",
      "Chatter stability and vibration analysis",
      "Thermal/deflection/wear simulation",
      "DFM feasibility analysis",
      "CAD geometry analysis (96 actions)",
      "Process control and DOE",
      "Predictive failure prevention",
    ],
    limits: {
      calculationsPerDay: -1,
      maxSavedResults: 10000,
      maxApiCallsPerMonth: 5000,
      maxConcurrentJobs: 5,
      exportFormats: ["clipboard", "csv", "json", "pdf", "gcode"],
    },
  },
  [PricingTier.ENTERPRISE]: {
    id: PricingTier.ENTERPRISE,
    name: "Enterprise",
    tagline: "Full business suite — quoting, scheduling, ERP, live monitoring",
    monthlyPriceCents: 49900,
    annualPriceCents: 41600, // $416/mo billed annually ($4,992/yr)
    color: "amber",
    features: [
      "Everything in Engineer",
      "Business operations (305 actions: quoting, costing, OEE, GL)",
      "Production scheduling and capacity planning",
      "Machine live monitoring (70 actions)",
      "ERP integration and automation",
      "Multi-tenant management",
      "Compliance and audit trail",
      "Parts library and file storage",
      "Unlimited API access",
    ],
    limits: {
      calculationsPerDay: -1,
      maxSavedResults: -1,
      maxApiCallsPerMonth: -1,
      maxConcurrentJobs: 10,
      exportFormats: ["clipboard", "csv", "json", "pdf", "gcode"],
    },
  },
};

// ============================================================================
// DISPATCHER → TIER MAPPING
// ============================================================================

export const DISPATCHER_ACCESS: DispatcherAccess[] = [
  // --- SYSTEM (always available — infrastructure, not user-facing features) ---
  { dispatcher: "prism_auth", minimumTier: "system", metering: "unlimited", description: "Authentication and authorization" },
  { dispatcher: "prism_session", minimumTier: "system", metering: "unlimited", description: "Session management" },
  { dispatcher: "prism_context", minimumTier: "system", metering: "unlimited", description: "Context management" },
  { dispatcher: "prism_memory", minimumTier: "system", metering: "unlimited", description: "Cross-session memory graph" },
  { dispatcher: "prism_telemetry", minimumTier: "system", metering: "unlimited", description: "Usage telemetry" },
  { dispatcher: "prism_realtime", minimumTier: "system", metering: "unlimited", description: "WebSocket messaging" },
  { dispatcher: "prism_bridge", minimumTier: "system", metering: "unlimited", description: "Multi-protocol API gateway" },
  { dispatcher: "prism_guard", minimumTier: "system", metering: "unlimited", description: "Safety enforcement" },
  { dispatcher: "prism_omega", minimumTier: "system", metering: "unlimited", description: "Quality metrics" },
  { dispatcher: "prism_monitoring", minimumTier: "system", metering: "unlimited", description: "System observability" },
  { dispatcher: "prism_hook", minimumTier: "system", metering: "unlimited", description: "Hook and event management" },
  { dispatcher: "prism_dev", minimumTier: "system", metering: "unlimited", description: "Developer tools" },
  { dispatcher: "prism_generator", minimumTier: "system", metering: "unlimited", description: "Code generation" },
  { dispatcher: "prism_gsd", minimumTier: "system", metering: "unlimited", description: "GSD protocol" },
  { dispatcher: "prism_sp", minimumTier: "system", metering: "unlimited", description: "Superpowers dev protocol" },
  { dispatcher: "prism_skill_script", minimumTier: "system", metering: "unlimited", description: "Skill scripting" },
  { dispatcher: "prism_nl_hook", minimumTier: "system", metering: "unlimited", description: "Natural language hooks" },
  { dispatcher: "prism_manus", minimumTier: "system", metering: "unlimited", description: "Manus AI agent" },
  { dispatcher: "prism_autonomous", minimumTier: "system", metering: "unlimited", description: "Autonomous execution" },
  { dispatcher: "prism_autopilot_d", minimumTier: "system", metering: "unlimited", description: "AutoPilot orchestration" },
  { dispatcher: "prism_atcs", minimumTier: "system", metering: "unlimited", description: "Task completion system" },
  { dispatcher: "prism_ralph", minimumTier: "system", metering: "unlimited", description: "Ralph validation" },
  { dispatcher: "prism_operating_system", minimumTier: "system", metering: "unlimited", description: "Shell and navigation" },

  // --- FREE TIER (basic lookups and limited calculations) ---
  { dispatcher: "prism_knowledge", minimumTier: PricingTier.FREE, metering: "daily-limit", dailyLimit: 20, description: "Material, tool, and machine lookups" },
  { dispatcher: "prism_data", minimumTier: PricingTier.FREE, metering: "daily-limit", dailyLimit: 10, description: "Data access and search" },
  { dispatcher: "prism_doc", minimumTier: PricingTier.FREE, metering: "daily-limit", dailyLimit: 5, description: "Document management" },
  { dispatcher: "prism_export", minimumTier: PricingTier.FREE, metering: "daily-limit", dailyLimit: 3, description: "Export and reports" },
  { dispatcher: "prism_validate", minimumTier: PricingTier.FREE, metering: "daily-limit", dailyLimit: 5, description: "Input validation" },

  // --- MACHINIST TIER (daily shop floor tools) ---
  { dispatcher: "prism_calc", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "1,229 CNC calculators" },
  { dispatcher: "prism_cnc_ops", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "CNC operations (facing, slotting, pocketing)" },
  { dispatcher: "prism_machine_setup", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Machine setup and calibration" },
  { dispatcher: "prism_turning", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Turning-specific calculations" },
  { dispatcher: "prism_toolpath", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Basic toolpath calculations" },
  { dispatcher: "prism_hole_pattern", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Hole pattern pipeline" },
  { dispatcher: "prism_material_processing", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Material processing parameters" },
  { dispatcher: "prism_quality", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Quality and metrology" },
  { dispatcher: "prism_thread", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Threading calculations" },
  { dispatcher: "prism_threading_pipeline", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Threading pipeline" },
  { dispatcher: "prism_secondary_ops", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Secondary operations (anodize, heat treat, plating)" },
  { dispatcher: "prism_safety", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Safety validations" },
  { dispatcher: "prism_shop_practice", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Shop practice and tribal knowledge" },
  { dispatcher: "prism_machining_kb", minimumTier: PricingTier.MACHINIST, metering: "unlimited", description: "Machining knowledge base" },

  // --- PROGRAMMER TIER (CAM, post-processing, program generation) ---
  { dispatcher: "prism_cam", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "CAM toolpath strategies (18 CAM systems)" },
  { dispatcher: "prism_multiaxis_program", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Multi-axis program generation" },
  { dispatcher: "prism_turning_program", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Turning program generation" },
  { dispatcher: "prism_multi_op", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Multi-operation orchestration" },
  { dispatcher: "prism_product", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Product tools (SFC, PPG, Shop, ACNC)" },
  { dispatcher: "prism_cpl", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "CAM pipeline track" },
  { dispatcher: "prism_proven_pipeline", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Proven pipeline workflows" },
  { dispatcher: "prism_doc_learn", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "Document-based learning" },
  { dispatcher: "prism_cad_drawing_kb", minimumTier: PricingTier.PROGRAMMER, metering: "unlimited", description: "CAD drawing knowledge base" },

  // --- ENGINEER TIER (advanced physics, simulation, DFM) ---
  { dispatcher: "prism_adaptive_control", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Adaptive control and digital twin" },
  { dispatcher: "prism_feasibility", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "DFM and feasibility analysis" },
  { dispatcher: "prism_vibration_physics", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Vibration, dynamics, and cutting physics" },
  { dispatcher: "prism_fluid_thermal", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Fluid, thermal, and material science" },
  { dispatcher: "prism_mechanical", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Mechanical design calculators" },
  { dispatcher: "prism_forming", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Forming and casting analysis" },
  { dispatcher: "prism_scientific_math", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Scientific mathematics" },
  { dispatcher: "prism_process_control", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Process control and DOE" },
  { dispatcher: "prism_intelligence", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Manufacturing intelligence" },
  { dispatcher: "prism_diagnosis", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Diagnosis and troubleshooting" },
  { dispatcher: "prism_l2", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "L2 advanced engine capabilities" },
  { dispatcher: "prism_cad", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "CAD geometry analysis" },
  { dispatcher: "prism_knowledge_ext", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Extended knowledge base" },
  { dispatcher: "prism_5axis", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "5-axis kinematics" },
  { dispatcher: "prism_pfp", minimumTier: PricingTier.ENGINEER, metering: "unlimited", description: "Predictive failure prevention" },

  // --- ENTERPRISE TIER (business operations, ERP, monitoring) ---
  { dispatcher: "prism_business", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Business ops (quoting, costing, OEE, GL, invoicing)" },
  { dispatcher: "prism_scheduling", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Production scheduling" },
  { dispatcher: "prism_machine_live", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Machine live monitoring" },
  { dispatcher: "prism_compliance", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Regulatory compliance" },
  { dispatcher: "prism_industry", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Industry-specific compliance" },
  { dispatcher: "prism_integration", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "ERP and system integration" },
  { dispatcher: "prism_tenant", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Multi-tenant management" },
  { dispatcher: "prism_parts", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Parts library and file storage" },
  { dispatcher: "prism_automation", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Shop floor automation" },
  { dispatcher: "prism_orchestrate", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Workflow orchestration" },
  { dispatcher: "prism_simulate_task", minimumTier: PricingTier.ENTERPRISE, metering: "unlimited", description: "Task simulation" },
];

// Build lookup map for O(1) access
const DISPATCHER_ACCESS_MAP = new Map<string, DispatcherAccess>(
  DISPATCHER_ACCESS.map((da) => [da.dispatcher, da]),
);

// ============================================================================
// ADD-ONS
// ============================================================================

export const ADD_ONS: AddOn[] = [
  {
    id: "edm-suite",
    name: "EDM Suite",
    description: "Wire EDM, sinker EDM, and micro EDM — 6 machine dialects, 70 actions",
    monthlyPriceCents: 4900,
    annualPriceCents: 4100,
    dispatchers: ["prism_edm"],
    icon: "zap",
  },
  {
    id: "grinding-suite",
    name: "Grinding Suite",
    description: "Surface, cylindrical, centerless, creep-feed, and tool grinding",
    monthlyPriceCents: 2900,
    annualPriceCents: 2400,
    dispatchers: ["prism_grinding"],
    icon: "disc",
  },
  {
    id: "welding-joining",
    name: "Welding & Joining",
    description: "MIG, TIG, laser welding, brazing — joint design and parameter optimization",
    monthlyPriceCents: 1900,
    annualPriceCents: 1600,
    dispatchers: ["prism_welding"],
    icon: "flame",
  },
  {
    id: "learning-platform",
    name: "Learning Platform",
    description: "Interactive machining courses, apprentice training, and certification tracking",
    monthlyPriceCents: 3900,
    annualPriceCents: 3200,
    dispatchers: ["prism_doc_learn", "prism_cad_drawing_kb"],
    icon: "graduation-cap",
  },
  {
    id: "api-access",
    name: "API Access",
    description: "REST API access to all PRISM calculations — build custom integrations",
    monthlyPriceCents: 9900,
    annualPriceCents: 8300,
    dispatchers: [], // No extra dispatchers — unlocks API key generation
    icon: "code",
  },
];

const ADD_ON_MAP = new Map<string, AddOn>(ADD_ONS.map((a) => [a.id, a]));

// ============================================================================
// FEATURE FLAG SYSTEM
// ============================================================================

/**
 * Check if a user has access to a dispatcher based on their tier and add-ons.
 *
 * Returns true if:
 * 1. The dispatcher is a system dispatcher (always available), OR
 * 2. The user's tier meets or exceeds the dispatcher's minimum tier, OR
 * 3. The user has an add-on that unlocks the dispatcher
 */
export function checkAccess(
  userTier: PricingTier,
  dispatcher: string,
  userAddOns: string[] = [],
): boolean {
  const access = DISPATCHER_ACCESS_MAP.get(dispatcher);

  // Unknown dispatcher — deny by default (safe fallback)
  if (!access) return false;

  // System dispatchers are always available
  if (access.minimumTier === "system") return true;

  // Check tier hierarchy
  if (TIER_RANK[userTier] >= TIER_RANK[access.minimumTier]) return true;

  // Check add-ons
  for (const addOnId of userAddOns) {
    const addOn = ADD_ON_MAP.get(addOnId);
    if (addOn && addOn.dispatchers.includes(dispatcher)) return true;
  }

  return false;
}

/**
 * Get the metering rule for a dispatcher given the user's tier.
 * Returns null if the user lacks access to this dispatcher.
 * Free-tier users get daily limits on basic dispatchers;
 * paid users get unlimited access to their tier's dispatchers.
 */
export function getMetering(
  userTier: PricingTier,
  dispatcher: string,
): { type: MeteringType; dailyLimit?: number } | null {
  const access = DISPATCHER_ACCESS_MAP.get(dispatcher);
  if (!access) return null;

  // System dispatchers are always unlimited
  if (access.minimumTier === "system") return { type: "unlimited" };

  // User must have tier access to this dispatcher
  if (TIER_RANK[userTier] < TIER_RANK[access.minimumTier]) return null;

  // Free tier with daily-limit dispatchers gets the limit enforced
  if (userTier === PricingTier.FREE && access.metering === "daily-limit") {
    return { type: "daily-limit", dailyLimit: access.dailyLimit };
  }

  // Paid users with access get unlimited
  return { type: "unlimited" };
}

/**
 * Get the tier required for a specific dispatcher.
 * Returns null for system dispatchers.
 */
export function getRequiredTier(dispatcher: string): PricingTier | null {
  const access = DISPATCHER_ACCESS_MAP.get(dispatcher);
  if (!access || access.minimumTier === "system") return null;
  return access.minimumTier;
}

/**
 * Get all dispatchers available to a given tier (including lower tiers and system).
 */
export function getAvailableDispatchers(userTier: PricingTier): string[] {
  return DISPATCHER_ACCESS.filter((da) => {
    if (da.minimumTier === "system") return true;
    return TIER_RANK[userTier] >= TIER_RANK[da.minimumTier];
  }).map((da) => da.dispatcher);
}

/**
 * Get all dispatchers a user is missing (would unlock with an upgrade).
 */
export function getLockedDispatchers(userTier: PricingTier): DispatcherAccess[] {
  return DISPATCHER_ACCESS.filter((da) => {
    if (da.minimumTier === "system") return false;
    return TIER_RANK[userTier] < TIER_RANK[da.minimumTier];
  });
}

/**
 * Suggest the next tier upgrade based on what the user tried to access.
 */
export function suggestUpgrade(
  userTier: PricingTier,
  dispatcher: string,
): { requiredTier: PricingTier; tierDef: TierDefinition; relevantAddOn?: AddOn } | null {
  const access = DISPATCHER_ACCESS_MAP.get(dispatcher);
  if (!access || access.minimumTier === "system") return null;

  const requiredTier = access.minimumTier;
  if (TIER_RANK[userTier] >= TIER_RANK[requiredTier]) return null;

  // Check if an add-on could provide access instead of a full upgrade
  const relevantAddOn = ADD_ONS.find((a) => a.dispatchers.includes(dispatcher));

  return {
    requiredTier,
    tierDef: TIERS[requiredTier],
    relevantAddOn,
  };
}

// ============================================================================
// CATALOG SUMMARY (for UI display)
// ============================================================================

export interface TierSummary {
  tier: PricingTier;
  name: string;
  dispatcherCount: number;
  actionCount: number;
}

/** Build a summary of what each tier unlocks (for pricing page display). */
export function getTierSummaries(actionCounts: Record<string, number>): TierSummary[] {
  return Object.values(PricingTier).map((tier) => {
    const dispatchers = getAvailableDispatchers(tier).filter((d) => {
      const access = DISPATCHER_ACCESS_MAP.get(d);
      return access && access.minimumTier !== "system";
    });
    const actions = dispatchers.reduce((sum, d) => sum + (actionCounts[d] || 0), 0);
    return {
      tier,
      name: TIERS[tier].name,
      dispatcherCount: dispatchers.length,
      actionCount: actions,
    };
  });
}
