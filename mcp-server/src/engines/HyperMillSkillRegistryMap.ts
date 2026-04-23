/**
 * HyperMillSkillRegistryMap — Maps 15 hyperMILL skills to their engine dependencies
 *
 * Provides a queryable registry linking each /hypermill-* skill to:
 *   - Engine dependencies (which PRISM engines it invokes)
 *   - Primary dispatcher action (the main cam: action it calls)
 *   - Effort tier and description
 *
 * HM-REV-MS3 / U-HMR21
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillEffort = "LOW" | "MEDIUM" | "HIGH";

export interface HyperMillSkillEntry {
  /** Skill slug, e.g. "hypermill-material-lookup" */
  name: string;
  /** Human-readable description */
  description: string;
  /** Primary MCP action this skill calls */
  primaryAction: string;
  /** All MCP actions this skill may call */
  actions: string[];
  /** PRISM engine class names this skill depends on */
  engineDependencies: string[];
  /** Effort tier */
  effort: SkillEffort;
  /** Category */
  category: "core" | "operational";
}

// ── Skill registry ────────────────────────────────────────────────────────────

const SKILL_REGISTRY: HyperMillSkillEntry[] = [
  // ── Core Skills (8) ─────────────────────────────────────────────────────
  {
    name: "hypermill-material-lookup",
    description: "Resolve any hyperMILL material name to ISO group and Kienzle physics parameters",
    primaryAction: "cam_hypermill_material_to_physics",
    actions: [
      "cam_hypermill_material_to_physics",
      "cam_hypermill_material_to_orchestrator",
    ],
    engineDependencies: [
      "HyperMillMaterialPhysicsBridge",
      "HyperMillMaterialMapEngine",
    ],
    effort: "LOW",
    category: "core",
  },
  {
    name: "hypermill-speeds-feeds",
    description: "Calculate physics-backed speeds and feeds for hyperMILL operations using SpeedFeedOrchestrator with hyperMILL material bridge",
    primaryAction: "cam_hypermill_cycle_recommend",
    actions: [
      "cam_hypermill_cycle_recommend",
      "cam_hypermill_material_to_physics",
      "cam_hypermill_material_to_orchestrator",
      "cam_hypermill_calibration_compare",
    ],
    engineDependencies: [
      "SpeedFeedOrchestratorEngine",
      "HyperMillMaterialPhysicsBridge",
      "HyperMillCycleParameterPipeline",
    ],
    effort: "MEDIUM",
    category: "core",
  },
  {
    name: "hypermill-drill",
    description: "Look up drilling cycles, defaults, and tap drill sizes for hyperMILL drilling operations",
    primaryAction: "cam_cycle_catalog",
    actions: [
      "cam_cycle_catalog",
      "cam_cycle_defaults",
      "cam_hypermill_cycle_recommend",
    ],
    engineDependencies: [
      "HyperMillCycleCatalogEngine",
      "HyperMillCycleDefaultsEngine",
      "HyperMillCycleParameterPipeline",
      "HyperMillThreadStandardEngine",
    ],
    effort: "LOW",
    category: "core",
  },
  {
    name: "hypermill-thread",
    description: "Look up thread standards, tap drill sizes, and generate hyperMILL thread milling cycle parameters",
    primaryAction: "cam_thread_lookup",
    actions: [
      "cam_thread_lookup",
      "cam_cycle_catalog",
      "cam_hypermill_cycle_recommend",
    ],
    engineDependencies: [
      "HyperMillThreadStandardEngine",
      "HyperMillCycleCatalogEngine",
      "HyperMillCycleParameterPipeline",
    ],
    effort: "LOW",
    category: "core",
  },
  {
    name: "hypermill-2d-strategy",
    description: "Recommend 2D milling strategies (pocket, contour, face) with cycle type and factory defaults",
    primaryAction: "cam_strategy_recommend",
    actions: [
      "cam_strategy_recommend",
      "cam_hypermill_cycle_recommend",
      "cam_cycle_defaults",
    ],
    engineDependencies: [
      "HyperMillStrategyEngine",
      "HyperMillCycleParameterPipeline",
      "HyperMillCycleDefaultsEngine",
      "HyperMillCycleCatalogEngine",
    ],
    effort: "MEDIUM",
    category: "core",
  },
  {
    name: "hypermill-3d-strategy",
    description: "Recommend 3D milling strategies (roughing, finishing, rest machining) with physics cycle pipeline",
    primaryAction: "cam_multiaxis_recommend",
    actions: [
      "cam_multiaxis_recommend",
      "cam_hypermill_cycle_recommend",
      "cam_cycle_defaults",
      "cam_strategy_recommend",
    ],
    engineDependencies: [
      "HyperMillStrategyEngine",
      "HyperMillMultiAxisEngine",
      "HyperMillCycleParameterPipeline",
      "HyperMillCycleDefaultsEngine",
    ],
    effort: "HIGH",
    category: "core",
  },
  {
    name: "hypermill-rough",
    description: "Look up roughing cycle defaults and recommend roughing parameters for 2D/3D operations",
    primaryAction: "cam_cycle_defaults",
    actions: [
      "cam_cycle_defaults",
      "cam_hypermill_cycle_recommend",
    ],
    engineDependencies: [
      "HyperMillCycleDefaultsEngine",
      "HyperMillCycleParameterPipeline",
      "HyperMillCycleCatalogEngine",
    ],
    effort: "LOW",
    category: "core",
  },
  {
    name: "hypermill-finish",
    description: "Look up finishing cycle defaults and recommend finish pass parameters with tolerance-driven stepover",
    primaryAction: "cam_cycle_defaults",
    actions: [
      "cam_cycle_defaults",
      "cam_hypermill_cycle_recommend",
    ],
    engineDependencies: [
      "HyperMillCycleDefaultsEngine",
      "HyperMillCycleParameterPipeline",
      "HyperMillCycleCatalogEngine",
    ],
    effort: "LOW",
    category: "core",
  },

  // ── Operational Skills (7) ───────────────────────────────────────────────
  {
    name: "hypermill-controller-select",
    description: "Select and configure a CNC controller family for hyperMILL post-processor output",
    primaryAction: "cam_controller_catalog",
    actions: [
      "cam_controller_catalog",
      "cam_compare_controllers",
      "cam_hypermill_ppp_defaults",
    ],
    engineDependencies: [
      "HyperMillControllerCatalogEngine",
      "HyperMillPPPDefaultConfig",
    ],
    effort: "MEDIUM",
    category: "operational",
  },
  {
    name: "hypermill-nc-generate",
    description: "Generate hyperMILL NC code using CodeGeneratorEngine AC script output",
    primaryAction: "cam_hypermill_code_generate",
    actions: [
      "cam_hypermill_code_generate",
      "cam_hypermill_ppp_defaults",
    ],
    engineDependencies: [
      "HyperMillCodeGeneratorEngine",
      "HyperMillControllerCatalogEngine",
      "HyperMillPPPDefaultConfig",
    ],
    effort: "HIGH",
    category: "operational",
  },
  {
    name: "hypermill-safety-audit",
    description: "Run all hyperMILL SafetyHooks validators to check toolpath safety and constraint compliance",
    primaryAction: "cam_safety_validate",
    actions: [
      "cam_safety_validate",
    ],
    engineDependencies: [
      "HyperMillSafetyHooks",
    ],
    effort: "MEDIUM",
    category: "operational",
  },
  {
    name: "hypermill-collision-check",
    description: "Run CollisionPreventionEngine checks for holder/shank clearance and axis travel limits",
    primaryAction: "collision_check_full",
    actions: [
      "collision_check_full",
      "cam_safety_validate",
    ],
    engineDependencies: [
      "HyperMillSafetyHooks",
    ],
    effort: "HIGH",
    category: "operational",
  },
  {
    name: "hypermill-tool-export",
    description: "Export tool definitions to hyperMILL .hmt tool library format",
    primaryAction: "cam_hypermill_tool_export",
    actions: [
      "cam_hypermill_tool_export",
    ],
    engineDependencies: [
      "HyperMillToolExportEngine",
    ],
    effort: "MEDIUM",
    category: "operational",
  },
  {
    name: "hypermill-automation-script",
    description: "Generate hyperMILL automation macro scripts using CodeGeneratorEngine",
    primaryAction: "cam_hypermill_generate_macro",
    actions: [
      "cam_hypermill_generate_macro",
      "cam_hypermill_code_generate",
    ],
    engineDependencies: [
      "HyperMillCodeGeneratorEngine",
    ],
    effort: "HIGH",
    category: "operational",
  },
  {
    name: "hypermill-full-job",
    description: "Orchestrate the full hyperMILL workflow: material → cycle → S/F → controller → NC output → safety audit",
    primaryAction: "cam_hypermill_cycle_recommend",
    actions: [
      "cam_hypermill_material_to_physics",
      "cam_hypermill_cycle_recommend",
      "cam_controller_catalog",
      "cam_hypermill_ppp_defaults",
      "cam_safety_validate",
      "cam_hypermill_code_generate",
    ],
    engineDependencies: [
      "HyperMillMaterialPhysicsBridge",
      "HyperMillCycleParameterPipeline",
      "HyperMillCycleDefaultsEngine",
      "HyperMillControllerCatalogEngine",
      "HyperMillCodeGeneratorEngine",
      "HyperMillSafetyHooks",
      "SpeedFeedOrchestratorEngine",
    ],
    effort: "HIGH",
    category: "operational",
  },
];

// ── Registry class ────────────────────────────────────────────────────────────

export class HyperMillSkillRegistryMap {
  /** List all 15 skills */
  listSkills(): HyperMillSkillEntry[] {
    return SKILL_REGISTRY;
  }

  /** Get a skill by name */
  getSkill(name: string): HyperMillSkillEntry | null {
    return SKILL_REGISTRY.find(s => s.name === name) ?? null;
  }

  /** Get map of skill name → engine dependencies */
  getEngineMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const skill of SKILL_REGISTRY) {
      map[skill.name] = skill.engineDependencies;
    }
    return map;
  }

  /** Get all skills in a category */
  byCategory(category: "core" | "operational"): HyperMillSkillEntry[] {
    return SKILL_REGISTRY.filter(s => s.category === category);
  }

  /** Get all skills that depend on a specific engine */
  byEngine(engineName: string): HyperMillSkillEntry[] {
    return SKILL_REGISTRY.filter(s =>
      s.engineDependencies.some(e =>
        e.toLowerCase().includes(engineName.toLowerCase())
      )
    );
  }

  /** Get skills by effort tier */
  byEffort(effort: SkillEffort): HyperMillSkillEntry[] {
    return SKILL_REGISTRY.filter(s => s.effort === effort);
  }

  /** Stats */
  stats(): {
    total: number;
    core: number;
    operational: number;
    byEffort: Record<SkillEffort, number>;
  } {
    const byEffort: Record<SkillEffort, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const skill of SKILL_REGISTRY) {
      byEffort[skill.effort]++;
    }
    return {
      total: SKILL_REGISTRY.length,
      core: SKILL_REGISTRY.filter(s => s.category === "core").length,
      operational: SKILL_REGISTRY.filter(s => s.category === "operational").length,
      byEffort,
    };
  }
}

export const hyperMillSkillRegistryMap = new HyperMillSkillRegistryMap();
