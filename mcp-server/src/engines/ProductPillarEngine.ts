/**
 * ProductPillarEngine — MXU-MS6
 *
 * Bundle engines into product pillars for user-facing capability packages:
 *   1. Pillar definitions — Calculator, Toolpath, Quote, Quality, PostProcessor
 *   2. Completeness scoring — how ready is each pillar for users
 *   3. Entry point mapping — which action/skill starts each pillar
 *   4. Dependency resolution — what each pillar needs from other pillars
 *   5. Feature gate — enable/disable pillars per subscription tier
 *
 * Sources:
 *   - MXU-MS6: Product-Pillar Capability Packages
 */

// ============================================================================
// TYPES
// ============================================================================

export type PillarId = "calculator" | "toolpath" | "quote" | "quality" | "postprocessor" | "edm" | "knowledge" | "automation";

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface ProductPillar {
  id: PillarId;
  name: string;
  tagline: string;
  engines: string[];
  entry_actions: string[];
  entry_skills: string[];
  dependencies: PillarId[];
  min_tier: SubscriptionTier;
}

export interface PillarCompleteness {
  pillar_id: PillarId;
  pillar_name: string;
  total_engines: number;
  wired_engines: number;
  completeness_pct: number;
  entry_points_active: number;
  missing: string[];
  status: "ready" | "partial" | "stub";
}

export interface PillarSummary {
  total_pillars: number;
  ready: number;
  partial: number;
  stub: number;
  avg_completeness_pct: number;
  pillars: PillarCompleteness[];
}

export interface FeatureGate {
  pillar_id: PillarId;
  tier: SubscriptionTier;
  allowed: boolean;
  reason: string;
}

// ============================================================================
// PILLAR DEFINITIONS
// ============================================================================

const PILLARS: ProductPillar[] = [
  {
    id: "calculator",
    name: "Speed & Feed Calculator",
    tagline: "Physics-optimized cutting parameters for any material/tool/machine",
    engines: [
      "SpeedFeedOrchestratorEngine", "KienzleForceModelEngine", "ChatterStabilityLobeEngine",
      "CuttingTemperatureEngine", "SurfaceFinishPredictorEngine", "DeflectionAnalysisEngine",
      "ThermalWearCouplingEngine", "SpeedFeedAutopilotEngine", "UltimateSpeedFeedEngine",
    ],
    entry_actions: ["calc.speed_feed", "calc.cutting_force", "sf_autopilot_run"],
    entry_skills: ["sfc-quick-start", "auto-speed-feed", "calc"],
    dependencies: [],
    min_tier: "free",
  },
  {
    id: "toolpath",
    name: "Toolpath Intelligence",
    tagline: "CAM strategy selection, feature recognition, adaptive toolpaths",
    engines: [
      "ToolpathStrategyEngine", "FeatureRecognitionEngine", "AdaptiveToolpathRouterEngine",
      "PrintToProgramPipelineEngine", "MultiAxisPrintToProgramEngine",
    ],
    entry_actions: ["cam.strategy_select", "cam.feature_recognize"],
    entry_skills: ["cam-toolpath-guide", "print-to-program"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "postprocessor",
    name: "Post Processor",
    tagline: "G-code generation for 20+ controller dialects with per-block optimization",
    engines: [
      "PostProcessorPipelineEngine", "PostProcessorAutopilotEngine",
      "ControllerProgrammingIntelligenceEngine", "PostLibraryCatalogEngine",
      "PostValidationHardeningEngine", "PostValidationReportEngine",
    ],
    entry_actions: ["pp_autopilot_run", "pp_autopilot_resolve_dialect", "pp_autopilot_print_to_program"],
    entry_skills: ["ppg-quick-start", "pp-resolve", "program-gen", "program-optimize"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "quote",
    name: "Quote & Cost",
    tagline: "Physics-backed quoting with DFM feedback and quantity breaks",
    engines: [
      "QuoteToShipOrchestratorEngine", "QuoteAutopilotEngine",
      "OEECalculatorEngine", "CapacityPlanningEngine",
    ],
    entry_actions: ["quote_autopilot_run", "business.quote_generate"],
    entry_skills: ["quote-job", "estimate", "bid-to-win", "cost-estimation-guide"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "quality",
    name: "Quality Management",
    tagline: "SPC, FAI, dimensional analysis, process capability",
    engines: [
      "SPCEngine", "FAIEngine", "MetrologyEngine", "MaterialCertEngine",
    ],
    entry_actions: ["quality.spc_analyze", "quality.fai_generate"],
    entry_skills: ["quality-check", "quality-spc-guide", "first-part-right", "measure"],
    dependencies: [],
    min_tier: "pro",
  },
  {
    id: "edm",
    name: "Wire EDM Studio",
    tagline: "Physics-optimized WEDM programs with Kunieda MRR and DiBitonto offsets",
    engines: [
      "WireEDMSettingsEngine", "EDMProgramAssemblerEngine",
      "WireEDMPulseParameterEngine", "WireEDMDimensionalAccuracyEngine",
    ],
    entry_actions: ["edm.wire_settings", "edm.program_assemble"],
    entry_skills: ["wire-edm-studio", "wire-edm-analyze", "wedm-program"],
    dependencies: [],
    min_tier: "pro",
  },
  {
    id: "knowledge",
    name: "Shop Knowledge",
    tagline: "Tribal knowledge, playbook rules, apprentice learning",
    engines: [
      "TribalKnowledgeEngine", "PlaybookEngine", "ApprenticeEngine", "LearningPathEngine",
    ],
    entry_actions: ["knowledge.tribal_search", "knowledge.playbook_query"],
    entry_skills: ["shop-knowledge", "tribal-knowledge-guide", "playbook"],
    dependencies: [],
    min_tier: "free",
  },
  {
    id: "automation",
    name: "Automation & Intelligence",
    tagline: "Task classification, chain orchestration, self-healing workflows",
    engines: [
      "AutomationChainEngine", "BuildGuardChainEngine", "ChainFailureRecoveryEngine",
      "ContextChainEngine", "WorkflowOrchestrationEngine", "CodingCopilotEngine",
    ],
    entry_actions: ["build_guard_chain", "copilot_suggest", "chain_recover"],
    entry_skills: ["autopilot", "forge", "smart"],
    dependencies: [],
    min_tier: "enterprise",
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class ProductPillarEngine {

  // ── Pillar Catalog ─────────────────────────────────────────

  listPillars(): Array<{ id: PillarId; name: string; tagline: string; engines: number; tier: SubscriptionTier }> {
    return PILLARS.map(p => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      engines: p.engines.length,
      tier: p.min_tier,
    }));
  }

  getPillar(id: PillarId): ProductPillar | undefined {
    return PILLARS.find(p => p.id === id);
  }

  // ── Completeness Scoring ───────────────────────────────────

  /**
   * Score pillar completeness based on which engines are actually wired.
   *
   * @param pillarId Pillar to score
   * @param wiredEngines Set of engine names that have dispatcher actions
   * @param activeSkills Set of skill names that exist
   * @returns Completeness assessment
   */
  scorePillar(
    pillarId: PillarId,
    wiredEngines: Set<string>,
    activeSkills: Set<string>,
  ): PillarCompleteness {
    const pillar = PILLARS.find(p => p.id === pillarId);
    if (!pillar) {
      return { pillar_id: pillarId, pillar_name: "Unknown", total_engines: 0, wired_engines: 0, completeness_pct: 0, entry_points_active: 0, missing: [], status: "stub" };
    }

    const wired = pillar.engines.filter(e => wiredEngines.has(e)).length;
    const missing = pillar.engines.filter(e => !wiredEngines.has(e));
    const entryActive = pillar.entry_skills.filter(s => activeSkills.has(s)).length;
    const pct = parseFloat(((wired / pillar.engines.length) * 100).toFixed(1));

    let status: PillarCompleteness["status"];
    if (pct >= 80 && entryActive > 0) status = "ready";
    else if (pct >= 30) status = "partial";
    else status = "stub";

    return {
      pillar_id: pillarId,
      pillar_name: pillar.name,
      total_engines: pillar.engines.length,
      wired_engines: wired,
      completeness_pct: pct,
      entry_points_active: entryActive,
      missing,
      status,
    };
  }

  // ── Full Summary ───────────────────────────────────────────

  /**
   * Score all pillars and produce a summary.
   */
  getSummary(wiredEngines: Set<string>, activeSkills: Set<string>): PillarSummary {
    const pillars = PILLARS.map(p => this.scorePillar(p.id, wiredEngines, activeSkills));
    const ready = pillars.filter(p => p.status === "ready").length;
    const partial = pillars.filter(p => p.status === "partial").length;
    const stub = pillars.filter(p => p.status === "stub").length;
    const avgPct = pillars.length > 0
      ? parseFloat((pillars.reduce((s, p) => s + p.completeness_pct, 0) / pillars.length).toFixed(1))
      : 0;

    return { total_pillars: pillars.length, ready, partial, stub, avg_completeness_pct: avgPct, pillars };
  }

  // ── Feature Gates ──────────────────────────────────────────

  /**
   * Check if a pillar is accessible at a given subscription tier.
   */
  checkGate(pillarId: PillarId, userTier: SubscriptionTier): FeatureGate {
    const pillar = PILLARS.find(p => p.id === pillarId);
    if (!pillar) {
      return { pillar_id: pillarId, tier: userTier, allowed: false, reason: "Unknown pillar" };
    }

    const tierRank: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
    const allowed = tierRank[userTier] >= tierRank[pillar.min_tier];

    return {
      pillar_id: pillarId,
      tier: userTier,
      allowed,
      reason: allowed
        ? `${pillar.name} is included in ${userTier} tier`
        : `${pillar.name} requires ${pillar.min_tier} tier (current: ${userTier})`,
    };
  }

  /**
   * Get all pillars accessible at a given tier.
   */
  getAccessiblePillars(tier: SubscriptionTier): PillarId[] {
    const tierRank: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
    return PILLARS.filter(p => tierRank[tier] >= tierRank[p.min_tier]).map(p => p.id);
  }

  /**
   * Get total pillar count.
   */
  getPillarCount(): number {
    return PILLARS.length;
  }
}

export const productPillarEngine = new ProductPillarEngine();
