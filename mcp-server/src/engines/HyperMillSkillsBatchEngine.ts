/**
 * HyperMillSkillsBatchEngine — Manages 45 Phase 2+3 hyperMILL skills
 *
 * Tracks and validates all 60 hyperMILL skills across three phases:
 *   Phase 1 (15 skills, built in HM-REV-MS3): core navigation + data access
 *   Phase 2 (20 skills, HM-REV-MS12 U-HMR64): operational milling skills
 *   Phase 3 (25 skills, HM-REV-MS12 U-HMR65): advanced / specialist skills
 *
 * Each skill entry records:
 *   - Skill name (slug used in /hypermill-<slug>)
 *   - Phase (1/2/3)
 *   - Category (core | operational | advanced)
 *   - Primary engine dependency
 *   - Primary dispatcher action
 *
 * Engine responsibilities:
 *   - resolveSkill()   — return skill metadata by slug
 *   - listByPhase()    — all skills in a given phase
 *   - validateAll()    — assert all 60 skills have unique slugs + required fields
 *   - batchResolve()   — resolve multiple slugs, return found/missing counts
 *
 * References:
 *   - HM-REV-MS3 U-HMR21: Phase 1 skill registry (HyperMillSkillRegistryMap.ts)
 *   - HM-REV-MS12 U-HMR64/65: Phase 2+3 skills
 *
 * HM-REV-MS12 / U-HMR64, U-HMR65
 */

// ============================================================================
// Types
// ============================================================================

export type SkillPhase = 1 | 2 | 3;
export type SkillCategory = "core" | "operational" | "advanced";

export interface HyperMillSkill {
  /** URL-safe slug: e.g. "hypermill-pocket" */
  slug: string;
  /** Human-readable title */
  title: string;
  /** Which phase this skill belongs to */
  phase: SkillPhase;
  /** Category */
  category: SkillCategory;
  /** Primary PRISM engine class */
  primary_engine: string;
  /** Primary cam: dispatcher action */
  primary_action: string;
  /** Short description */
  description: string;
}

export interface SkillBatchResolveResult {
  /** Successfully resolved skills */
  found: HyperMillSkill[];
  /** Slugs that were not found */
  missing: string[];
  /** Total requested */
  requested: number;
  /** Resolution rate (0–1) */
  resolution_rate: number;
}

export interface SkillValidationResult {
  /** All 60 skills present and unique */
  valid: boolean;
  /** Total skill count */
  total: number;
  /** Duplicate slugs found (should be empty) */
  duplicates: string[];
  /** Skills missing required fields */
  incomplete: string[];
  /** Count by phase */
  by_phase: Record<SkillPhase, number>;
  /** Count by category */
  by_category: Record<SkillCategory, number>;
}

// ============================================================================
// Phase 1 skills (15 — from HyperMillSkillRegistryMap, HM-REV-MS3)
// ============================================================================

const PHASE_1_SKILLS: HyperMillSkill[] = [
  { slug: "hypermill-material-lookup",     phase: 1, category: "core",        title: "Material Lookup",       primary_engine: "HyperMillMaterialPhysicsBridge",  primary_action: "cam_hypermill_material_to_physics",    description: "Resolve material name to ISO group + Kienzle params" },
  { slug: "hypermill-speeds-feeds",        phase: 1, category: "core",        title: "Speeds & Feeds",        primary_engine: "SpeedFeedOrchestratorEngine",      primary_action: "cam_hypermill_cycle_recommend",        description: "Physics-backed S/F for hyperMILL operations" },
  { slug: "hypermill-drill",               phase: 1, category: "core",        title: "Drill Cycles",          primary_engine: "HyperMillCycleCatalogEngine",      primary_action: "cam_cycle_catalog",                    description: "Drilling cycles, defaults, tap drill sizes" },
  { slug: "hypermill-thread",              phase: 1, category: "core",        title: "Thread Standards",      primary_engine: "HyperMillThreadStandardEngine",    primary_action: "cam_thread_lookup",                    description: "Thread standards and milling cycle params" },
  { slug: "hypermill-2d-strategy",         phase: 1, category: "core",        title: "2D Strategies",         primary_engine: "HyperMillStrategyEngine",          primary_action: "cam_strategy_recommend",               description: "Pocket, contour, face strategy recommendation" },
  { slug: "hypermill-3d-strategy",         phase: 1, category: "core",        title: "3D Strategies",         primary_engine: "HyperMillMultiAxisEngine",         primary_action: "cam_multiaxis_recommend",              description: "3D roughing, finishing, rest machining" },
  { slug: "hypermill-rough",               phase: 1, category: "core",        title: "Roughing",              primary_engine: "HyperMillCycleDefaultsEngine",     primary_action: "cam_cycle_defaults",                   description: "Roughing cycle defaults and parameters" },
  { slug: "hypermill-finish",              phase: 1, category: "core",        title: "Finishing",             primary_engine: "HyperMillCycleDefaultsEngine",     primary_action: "cam_cycle_defaults",                   description: "Finishing cycle defaults with tolerance-driven stepover" },
  { slug: "hypermill-controller-select",   phase: 1, category: "operational", title: "Controller Select",     primary_engine: "HyperMillControllerCatalogEngine", primary_action: "cam_controller_catalog",               description: "Select controller family and post config" },
  { slug: "hypermill-nc-generate",         phase: 1, category: "operational", title: "NC Generation",         primary_engine: "HyperMillCodeGeneratorEngine",     primary_action: "cam_nc_generate",                      description: "Generate NC code for hyperMILL operations" },
  { slug: "hypermill-safety-audit",        phase: 1, category: "operational", title: "Safety Audit",          primary_engine: "HyperMillSafetyHooks",             primary_action: "cam_safety_audit",                     description: "Run all hyperMILL safety hooks" },
  { slug: "hypermill-collision-check",     phase: 1, category: "operational", title: "Collision Check",       primary_engine: "HyperMillMultiAxisEngine",         primary_action: "cam_collision_check",                  description: "Check for collisions in 5-axis paths" },
  { slug: "hypermill-tool-export",         phase: 1, category: "operational", title: "Tool Export",           primary_engine: "HyperMillToolExportEngine",        primary_action: "cam_tool_export",                      description: "Export tool list to hyperMILL database format" },
  { slug: "hypermill-automation-script",   phase: 1, category: "operational", title: "Automation Script",     primary_engine: "HyperMillACScriptExecutor",        primary_action: "cam_automation_script",                description: "Execute hyperMILL Automation Center scripts" },
  { slug: "hypermill-full-job",            phase: 1, category: "operational", title: "Full Job",              primary_engine: "HyperMillCycleParameterPipeline", primary_action: "cam_full_job",                         description: "Run complete hyperMILL job pipeline" },
];

// ============================================================================
// Phase 2 skills (20 — operational, HM-REV-MS12 U-HMR64)
// ============================================================================

const PHASE_2_SKILLS: HyperMillSkill[] = [
  { slug: "hypermill-pocket",              phase: 2, category: "operational", title: "Pocket Machining",      primary_engine: "HyperMillCycleCatalogEngine",      primary_action: "cam_cycle_catalog",                    description: "Pocket cycle selection and parameter setup" },
  { slug: "hypermill-contour",             phase: 2, category: "operational", title: "Contour Milling",       primary_engine: "HyperMillStrategyEngine",          primary_action: "cam_strategy_recommend",               description: "Contour milling strategy and parameters" },
  { slug: "hypermill-face-mill",           phase: 2, category: "operational", title: "Face Milling",          primary_engine: "HyperMillCycleDefaultsEngine",     primary_action: "cam_cycle_defaults",                   description: "Face milling cycle defaults and setup" },
  { slug: "hypermill-bore",                phase: 2, category: "operational", title: "Boring",                primary_engine: "HyperMillCycleCatalogEngine",      primary_action: "cam_cycle_catalog",                    description: "Boring cycle selection (G76 fine bore)" },
  { slug: "hypermill-chamfer",             phase: 2, category: "operational", title: "Chamfer",               primary_engine: "HyperMillCycleDefaultsEngine",     primary_action: "cam_cycle_defaults",                   description: "Chamfer milling cycle parameters" },
  { slug: "hypermill-rest",                phase: 2, category: "operational", title: "Rest Machining",        primary_engine: "HyperMillStrategyEngine",          primary_action: "cam_strategy_recommend",               description: "Rest machining with reference tool model" },
  { slug: "hypermill-pencil",              phase: 2, category: "operational", title: "Pencil Trace",          primary_engine: "HyperMillStrategyEngine",          primary_action: "cam_strategy_recommend",               description: "Pencil trace finishing for corners" },
  { slug: "hypermill-plunge",              phase: 2, category: "operational", title: "Plunge Roughing",       primary_engine: "HyperMillCycleDefaultsEngine",     primary_action: "cam_cycle_defaults",                   description: "Plunge roughing cycle for deep cavities" },
  { slug: "hypermill-hsc",                 phase: 2, category: "operational", title: "High-Speed Cutting",    primary_engine: "HyperMillStrategyEngine",          primary_action: "cam_strategy_recommend",               description: "HSC strategy selection with trochoidal paths" },
  { slug: "hypermill-defaults",            phase: 2, category: "operational", title: "Cycle Defaults",        primary_engine: "HyperMillCycleDefaultsValidation", primary_action: "cam_cycle_defaults",                   description: "Retrieve and validate hyperMILL cycle factory defaults" },
  { slug: "hypermill-allowance-calc",      phase: 2, category: "operational", title: "Allowance Calc",        primary_engine: "HyperMillCycleParameterPipeline", primary_action: "cam_hypermill_cycle_recommend",        description: "Calculate stock allowance for multi-pass operations" },
  { slug: "hypermill-surface-quality",     phase: 2, category: "operational", title: "Surface Quality",       primary_engine: "HyperMillSurfaceIntegrityBridge", primary_action: "cam_surface_integrity",                description: "Surface quality analysis and Rth estimation" },
  { slug: "hypermill-impeller",            phase: 2, category: "operational", title: "Impeller Machining",    primary_engine: "HyperMillBladeRoughingEngine",     primary_action: "cam_multiaxis_recommend",              description: "Impeller / turbine blade machining strategy" },
  { slug: "hypermill-blade",               phase: 2, category: "operational", title: "Blade Finishing",       primary_engine: "HyperMillBladeRoughingEngine",     primary_action: "cam_multiaxis_recommend",              description: "Blade finishing with barrel cutter scallop control" },
  { slug: "hypermill-port",                phase: 2, category: "operational", title: "Port Machining",        primary_engine: "HyperMillMultiAxisEngine",         primary_action: "cam_multiaxis_recommend",              description: "Port machining with collision avoidance" },
  { slug: "hypermill-swarf",               phase: 2, category: "operational", title: "Swarf Cutting",         primary_engine: "HyperMillMultiAxisEngine",         primary_action: "cam_multiaxis_recommend",              description: "5-axis swarf cutting for ruled surfaces" },
  { slug: "hypermill-dental",              phase: 2, category: "operational", title: "Dental Blank",          primary_engine: "HyperMillDentalBlankRouter",       primary_action: "cam_dental_route",                     description: "Dental blank routing and zirconia machining" },
  { slug: "hypermill-5axis-drill",         phase: 2, category: "operational", title: "5-Axis Drilling",       primary_engine: "HyperMillMultiAxisEngine",         primary_action: "cam_multiaxis_recommend",              description: "5-axis drilling with RTCP and tilt control" },
  { slug: "hypermill-turning-strategy",    phase: 2, category: "operational", title: "Turning Strategy",      primary_engine: "HyperMillMillTurnStrategyEngine",  primary_action: "cam_strategy_recommend",               description: "Turning strategy for mill-turn machines" },
  { slug: "hypermill-millturn",            phase: 2, category: "operational", title: "Mill-Turn",             primary_engine: "HyperMillMillTurnBridge",          primary_action: "cam_millturn_route",                   description: "Complete mill-turn workflow coordination" },
];

// ============================================================================
// Phase 3 skills (25 — advanced/specialist, HM-REV-MS12 U-HMR65)
// ============================================================================

const PHASE_3_SKILLS: HyperMillSkill[] = [
  { slug: "hypermill-probe-setup",         phase: 3, category: "advanced", title: "Probe Setup",           primary_engine: "HyperMillProbingBridge",           primary_action: "cam_probe_setup",                      description: "Configure probing cycles and WCS establishment" },
  { slug: "hypermill-probe-validate",      phase: 3, category: "advanced", title: "Probe Validate",        primary_engine: "HyperMillProbingBridge",           primary_action: "cam_probe_validate",                   description: "Validate probe measurement results against tolerances" },
  { slug: "hypermill-tool-measure",        phase: 3, category: "advanced", title: "Tool Measurement",      primary_engine: "HyperMillProbingBridge",           primary_action: "cam_tool_measure",                     description: "Tool length and diameter measurement cycles" },
  { slug: "hypermill-batch",               phase: 3, category: "advanced", title: "Batch Processing",      primary_engine: "HyperMillACScriptExecutor",        primary_action: "cam_hypermill_batch_script",           description: "Batch process multiple hyperMILL jobs via AC" },
  { slug: "hypermill-gcode-check",         phase: 3, category: "advanced", title: "G-Code Check",          primary_engine: "HyperMillPPPInputAdapter",         primary_action: "cam_hypermill_ppp_process",            description: "Validate G-code against controller dialect rules" },
  { slug: "hypermill-simulate",            phase: 3, category: "advanced", title: "Simulation",            primary_engine: "HyperMillMultiAxisPhysicsPipeline", primary_action: "cam_multiaxis_recommend",             description: "Simulate material removal and time estimation" },
  { slug: "hypermill-first-part-right",    phase: 3, category: "advanced", title: "First Part Right",      primary_engine: "HyperMillSetupSheetBridge",        primary_action: "cam_setup_sheet",                      description: "Complete first-part checklist with quality gates" },
  { slug: "hypermill-cycle-time",          phase: 3, category: "advanced", title: "Cycle Time",            primary_engine: "HyperMillCycleParameterPipeline", primary_action: "cam_hypermill_cycle_recommend",        description: "Cycle time estimation with feed optimisation" },
  { slug: "hypermill-print-to-program",    phase: 3, category: "advanced", title: "Print to Program",      primary_engine: "HyperMillMaterialBridgeEngine",    primary_action: "cam_hypermill_material_to_orchestrator", description: "Full drawing-to-NC pipeline via hyperMILL bridge" },
  { slug: "hypermill-setup-sheet",         phase: 3, category: "advanced", title: "Setup Sheet",           primary_engine: "HyperMillSetupSheetBridge",        primary_action: "cam_setup_sheet",                      description: "Generate setup sheet from hyperMILL job data" },
  { slug: "hypermill-tips",                phase: 3, category: "advanced", title: "Tips & Tricks",         primary_engine: "HyperMillStrategyRegistration",    primary_action: "cam_strategy_recommend",               description: "hyperMILL best-practice tips from tribal knowledge" },
  { slug: "hypermill-troubleshoot",        phase: 3, category: "advanced", title: "Troubleshoot",          primary_engine: "HyperMillSafetyHooks",             primary_action: "cam_safety_audit",                     description: "Diagnose chatter, vibration, surface defects" },
  { slug: "hypermill-learn",               phase: 3, category: "advanced", title: "Learning Mode",         primary_engine: "HyperMillStrategyRegistration",    primary_action: "cam_strategy_recommend",               description: "Guided learning for hyperMILL programming" },
  { slug: "hypermill-spc",                 phase: 3, category: "advanced", title: "SPC Control Plan",      primary_engine: "HyperMillSPCBridge",               primary_action: "cam_spc_plan",                         description: "Generate SPC control plan from operation sequence" },
  { slug: "hypermill-fai",                 phase: 3, category: "advanced", title: "FAI Plan",              primary_engine: "HyperMillFAIBridge",               primary_action: "cam_fai_plan",                         description: "AS9102 First Article Inspection plan generation" },
  { slug: "hypermill-quality-gate",        phase: 3, category: "advanced", title: "Quality Gate",          primary_engine: "HyperMillSetupSheetBridge",        primary_action: "cam_setup_sheet",                      description: "Verify complete quality package before job release" },
  { slug: "hypermill-ppp-optimize",        phase: 3, category: "advanced", title: "PPP Optimize",          primary_engine: "HyperMillPPPInputAdapter",         primary_action: "cam_hypermill_ppp_process",            description: "Post-process hyperMILL NC with per-block S/F physics" },
  { slug: "hypermill-grinding",            phase: 3, category: "advanced", title: "Grinding",              primary_engine: "HyperMillGrindingBridge",          primary_action: "cam_grinding_route",                   description: "Grinding wheel selection and dressing parameters" },
  { slug: "hypermill-edm",                 phase: 3, category: "advanced", title: "Wire EDM",              primary_engine: "HyperMillEDMBridge",               primary_action: "cam_edm_route",                        description: "Wire EDM taper cut and bi-material zone routing" },
  { slug: "hypermill-heat-treat",          phase: 3, category: "advanced", title: "Heat Treatment",        primary_engine: "HyperMillHeatTreatmentRouter",     primary_action: "cam_heat_treat",                       description: "Heat treatment routing for hardened steel operations" },
  { slug: "hypermill-cost-estimate",       phase: 3, category: "advanced", title: "Cost Estimate",         primary_engine: "HyperMillCycleParameterPipeline", primary_action: "cam_hypermill_cycle_recommend",        description: "Machine cost estimation from cycle times" },
  { slug: "hypermill-multi-face",          phase: 3, category: "advanced", title: "Multi-Face Setup",      primary_engine: "HyperMillSetupSheetBridge",        primary_action: "cam_setup_sheet",                      description: "Multi-face machining setup with WCS rotation" },
  { slug: "hypermill-macro",               phase: 3, category: "advanced", title: "Macro Generation",      primary_engine: "HyperMillCodeGeneratorEngine",     primary_action: "cam_nc_generate",                      description: "Generate parametric macros for families of parts" },
  { slug: "hypermill-secondary-ops",       phase: 3, category: "advanced", title: "Secondary Ops",         primary_engine: "HyperMillSecondaryOpsSequencer",   primary_action: "cam_secondary_ops",                    description: "Sequence secondary operations after primary machining" },
  { slug: "hypermill-validate-part",       phase: 3, category: "advanced", title: "Validate Part",         primary_engine: "HyperMillMultiAxisPhysicsPipeline", primary_action: "cam_hypermill_ppp_process",           description: "E2E part validation: material → tool → S/F → G-code" },
];

// ============================================================================
// All 60 skills combined
// ============================================================================

const ALL_SKILLS: HyperMillSkill[] = [
  ...PHASE_1_SKILLS,
  ...PHASE_2_SKILLS,
  ...PHASE_3_SKILLS,
];

// ============================================================================
// Engine
// ============================================================================

export class HyperMillSkillsBatchEngine {
  /**
   * Resolve a single skill by slug.
   *
   * @param slug - Skill slug (e.g. "hypermill-pocket")
   * @returns The skill entry or undefined
   */
  resolveSkill(slug: string): HyperMillSkill | undefined {
    return ALL_SKILLS.find((s) => s.slug === slug);
  }

  /**
   * List all skills in a given phase.
   *
   * @param phase - Phase number (1, 2, or 3)
   * @returns Skills in that phase
   */
  listByPhase(phase: SkillPhase): HyperMillSkill[] {
    return ALL_SKILLS.filter((s) => s.phase === phase);
  }

  /**
   * Validate all 60 skills: unique slugs, required fields, correct counts.
   *
   * @returns Validation report
   */
  validateAll(): SkillValidationResult {
    const slugs = ALL_SKILLS.map((s) => s.slug);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const incomplete: string[] = [];

    for (const slug of slugs) {
      if (seen.has(slug)) {
        duplicates.push(slug);
      }
      seen.add(slug);
    }

    for (const skill of ALL_SKILLS) {
      if (
        !skill.slug ||
        !skill.title ||
        !skill.primary_engine ||
        !skill.primary_action ||
        !skill.description
      ) {
        incomplete.push(skill.slug);
      }
    }

    const byPhase: Record<SkillPhase, number> = { 1: 0, 2: 0, 3: 0 };
    const byCategory: Record<SkillCategory, number> = {
      core: 0,
      operational: 0,
      advanced: 0,
    };

    for (const s of ALL_SKILLS) {
      byPhase[s.phase]++;
      byCategory[s.category]++;
    }

    return {
      valid: duplicates.length === 0 && incomplete.length === 0,
      total: ALL_SKILLS.length,
      duplicates,
      incomplete,
      by_phase: byPhase,
      by_category: byCategory,
    };
  }

  /**
   * Resolve multiple skill slugs in a single call.
   *
   * @param slugs - Array of skill slugs to resolve
   * @returns Found skills, missing slugs, and resolution rate
   */
  batchResolve(slugs: string[]): SkillBatchResolveResult {
    const found: HyperMillSkill[] = [];
    const missing: string[] = [];

    for (const slug of slugs) {
      const skill = this.resolveSkill(slug);
      if (skill) {
        found.push(skill);
      } else {
        missing.push(slug);
      }
    }

    return {
      found,
      missing,
      requested: slugs.length,
      resolution_rate: slugs.length > 0 ? found.length / slugs.length : 0,
    };
  }

  /** Total skill count across all phases */
  get totalCount(): number {
    return ALL_SKILLS.length;
  }

  /** Phase 1 count (should be 15) */
  get phase1Count(): number {
    return PHASE_1_SKILLS.length;
  }

  /** Phase 2 count (should be 20) */
  get phase2Count(): number {
    return PHASE_2_SKILLS.length;
  }

  /** Phase 3 count (should be 25) */
  get phase3Count(): number {
    return PHASE_3_SKILLS.length;
  }
}

export const hyperMillSkillsBatchEngine = new HyperMillSkillsBatchEngine();
