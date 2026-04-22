// WIRE-EXEMPT: Tests at __tests__/engines/CAMInputExhaustionPlannerEngine.test.ts (40 tests, ESM spy fix pending), dispatcher at camDispatcher.ts
/**
 * CAMInputExhaustionPlannerEngine — U-LP01 (CAM-UIX-INFRA-01)
 *
 * Plans and prioritizes CAM system exhaustion work. Reads coverage baseline,
 * compares to current state, calculates gaps, and returns prioritized next
 * work items. Emits coverage reports for monitoring progress toward omega=1.0.
 *
 * Key functions:
 *   1. planNext() — Returns prioritized next CAM/unit to work on
 *   2. getCoverageReport() — Full coverage breakdown by CAM and metric
 *   3. auditCam() — Deep audit of single CAM's coverage gaps
 *   4. promoteCoverage() — Updates current coverage after work completion
 *
 * @unit CAM-UIX-INFRA-01/U-LP01
 * @layer CAM-UIX-INFRA-01
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export type CAMTier = 1 | 2 | 3;

export interface CAMCoverageMetrics {
  strategy_catalog_coverage_pct: number;
  ui_field_schema_coverage_pct: number;
  post_dialect_coverage_pct: number;
  sample_reproducibility_pct: number;
  strategies_enumerated: number;
  strategies_total_estimated: number;
  fields_schematized: number;
  fields_total_estimated: number;
  last_audit: string | null;
}

export interface CAMSystemEntry {
  tier: CAMTier;
  vendor: string;
  display_name: string;
  file_prefixes: string[];
  engine_pattern: string;
  tips_file: string;
  bridge_engine: string;
  scripting_sdk: string;
  post_language: string;
  strategies_estimated: number;
  fields_estimated: number;
  jmdie_program_count?: number;
  in_scope: boolean;
  note?: string;
  eol_note?: string;
  patent_block?: string;
  consolidates?: string[];
}

export interface CoverageBaseline {
  schemaVersion: number;
  per_cam_baseline: Record<string, CAMCoverageMetrics & { tier: CAMTier }>;
  aggregate_totals: {
    tier_1_cams: number;
    tier_2_cams: number;
    tier_3_cams: number;
    total_strategies_estimated: number;
    total_fields_estimated: number;
    current_strategy_coverage_pct: number;
    current_field_coverage_pct: number;
  };
}

export interface VendorRegistry {
  schemaVersion: number;
  tier_definitions: Record<string, { coverage_floor_strategy_pct: number; coverage_floor_ui_field_pct: number }>;
  cam_systems: Record<string, CAMSystemEntry>;
}

export interface PlanNextResult {
  recommended_cam: string;
  recommended_unit: string;
  rationale: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  tier: CAMTier;
  coverage_gap: {
    strategy_gap_pct: number;
    field_gap_pct: number;
    combined_score: number;
  };
  blocked_by?: string[];
}

export interface CoverageReport {
  generated_at: string;
  overall_omega: number;
  tier_summary: {
    tier_1: { cams: number; avg_strategy_pct: number; avg_field_pct: number; meets_floor: boolean };
    tier_2: { cams: number; avg_strategy_pct: number; avg_field_pct: number; meets_floor: boolean };
    tier_3: { cams: number; avg_strategy_pct: number; avg_field_pct: number };
  };
  per_cam: Array<{
    cam_id: string;
    display_name: string;
    tier: CAMTier;
    strategy_coverage_pct: number;
    field_coverage_pct: number;
    meets_tier_floor: boolean;
    gaps: string[];
  }>;
  next_actions: string[];
}

export interface CAMAuditResult {
  cam_id: string;
  display_name: string;
  tier: CAMTier;
  current_metrics: CAMCoverageMetrics;
  floor_requirements: {
    strategy_floor_pct: number;
    field_floor_pct: number;
  };
  gaps: Array<{
    metric: string;
    current: number;
    required: number;
    delta: number;
    units_to_close: string[];
  }>;
  recommended_ingestion_sources: string[];
  estimated_effort_hours: number;
  blocked_by?: string;
}

// ============================================================================
// Engine
// ============================================================================

export class CAMInputExhaustionPlannerEngine {
  private static instance: CAMInputExhaustionPlannerEngine | null = null;

  private baselinePath: string;
  private currentPath: string;
  private vendorRegistryPath: string;

  private baselineCache: CoverageBaseline | null = null;
  private currentCache: CoverageBaseline | null = null;
  private vendorCache: VendorRegistry | null = null;

  private constructor() {
    const dataRoot = process.cwd().includes("mcp-server")
      ? process.cwd()
      : join(process.cwd(), "mcp-server");

    this.baselinePath = join(dataRoot, "data/state/CAM_UIX_COVERAGE_BASELINE.json");
    this.currentPath = join(dataRoot, "data/state/CAM_UIX_COVERAGE_CURRENT.json");
    this.vendorRegistryPath = join(dataRoot, "data/state/CAM_VENDOR_REGISTRY.json");
  }

  static getInstance(): CAMInputExhaustionPlannerEngine {
    if (!CAMInputExhaustionPlannerEngine.instance) {
      CAMInputExhaustionPlannerEngine.instance = new CAMInputExhaustionPlannerEngine();
    }
    return CAMInputExhaustionPlannerEngine.instance;
  }

  static resetInstance(): void {
    CAMInputExhaustionPlannerEngine.instance = null;
  }

  // ==========================================================================
  // Core Planning
  // ==========================================================================

  /**
   * Plan next CAM/unit to work on based on coverage gaps and priorities.
   * Tier-1 CAMs with largest gaps come first.
   */
  planNext(): PlanNextResult {
    const baseline = this.loadBaseline();
    const current = this.loadCurrent();
    const vendors = this.loadVendorRegistry();

    const scored: Array<{
      cam_id: string;
      tier: CAMTier;
      strategy_gap: number;
      field_gap: number;
      combined: number;
      blocked?: string;
    }> = [];

    for (const [camId, entry] of Object.entries(vendors.cam_systems)) {
      if (!entry.in_scope) continue;

      const baselineMetrics = baseline.per_cam_baseline[camId];
      const currentMetrics = current?.per_cam_baseline?.[camId] ?? baselineMetrics;
      const tierDef = vendors.tier_definitions[`tier_${entry.tier}`];

      const strategyGap = Math.max(0, (tierDef?.coverage_floor_strategy_pct ?? 0) - (currentMetrics?.strategy_catalog_coverage_pct ?? 0));
      const fieldGap = Math.max(0, (tierDef?.coverage_floor_ui_field_pct ?? 0) - (currentMetrics?.ui_field_schema_coverage_pct ?? 0));

      const tierWeight = entry.tier === 1 ? 3 : entry.tier === 2 ? 2 : 1;
      const combined = (strategyGap * 0.6 + fieldGap * 0.4) * tierWeight;

      scored.push({
        cam_id: camId,
        tier: entry.tier,
        strategy_gap: strategyGap,
        field_gap: fieldGap,
        combined,
        blocked: entry.patent_block,
      });
    }

    scored.sort((a, b) => b.combined - a.combined);
    const top = scored[0];

    if (!top || top.combined === 0) {
      return {
        recommended_cam: "none",
        recommended_unit: "CAM-UIX-MS0 complete",
        rationale: "All CAMs meet their tier floor requirements",
        priority: "LOW",
        tier: 3,
        coverage_gap: { strategy_gap_pct: 0, field_gap_pct: 0, combined_score: 0 },
      };
    }

    const nextUnit = this.determineNextUnit(top.cam_id, current?.per_cam_baseline?.[top.cam_id]);

    return {
      recommended_cam: top.cam_id,
      recommended_unit: nextUnit,
      rationale: `Tier-${top.tier} CAM with ${top.strategy_gap.toFixed(1)}% strategy gap and ${top.field_gap.toFixed(1)}% field gap`,
      priority: top.tier === 1 ? "CRITICAL" : top.tier === 2 ? "HIGH" : "MEDIUM",
      tier: top.tier,
      coverage_gap: {
        strategy_gap_pct: top.strategy_gap,
        field_gap_pct: top.field_gap,
        combined_score: top.combined,
      },
      blocked_by: top.blocked ? [top.blocked] : undefined,
    };
  }

  private determineNextUnit(camId: string, metrics?: CAMCoverageMetrics): string {
    if (!metrics || metrics.strategies_enumerated === 0) {
      return `CAM-UIX-${camId.toUpperCase()}-MS0/U-CAT01`;
    }
    if (metrics.strategy_catalog_coverage_pct < 100) {
      return `CAM-UIX-${camId.toUpperCase()}-MS0/U-CAT01 (continue)`;
    }
    if (metrics.ui_field_schema_coverage_pct < 95) {
      return `CAM-UIX-${camId.toUpperCase()}-MS0/U-UIS01`;
    }
    return `CAM-UIX-${camId.toUpperCase()}-MS0/U-ING-PARALLEL`;
  }

  // ==========================================================================
  // Coverage Reporting
  // ==========================================================================

  /**
   * Generate comprehensive coverage report across all CAMs.
   */
  getCoverageReport(): CoverageReport {
    const baseline = this.loadBaseline();
    const current = this.loadCurrent();
    const vendors = this.loadVendorRegistry();

    const tierBuckets: Record<1 | 2 | 3, { strategyPcts: number[]; fieldPcts: number[]; count: number }> = {
      1: { strategyPcts: [], fieldPcts: [], count: 0 },
      2: { strategyPcts: [], fieldPcts: [], count: 0 },
      3: { strategyPcts: [], fieldPcts: [], count: 0 },
    };

    const perCam: CoverageReport["per_cam"] = [];

    for (const [camId, entry] of Object.entries(vendors.cam_systems)) {
      if (!entry.in_scope) continue;

      const metrics = current?.per_cam_baseline?.[camId] ?? baseline.per_cam_baseline[camId];
      const tierDef = vendors.tier_definitions[`tier_${entry.tier}`];

      const stratPct = metrics?.strategy_catalog_coverage_pct ?? 0;
      const fieldPct = metrics?.ui_field_schema_coverage_pct ?? 0;

      tierBuckets[entry.tier].strategyPcts.push(stratPct);
      tierBuckets[entry.tier].fieldPcts.push(fieldPct);
      tierBuckets[entry.tier].count++;

      const meetsFloor =
        stratPct >= (tierDef?.coverage_floor_strategy_pct ?? 0) &&
        fieldPct >= (tierDef?.coverage_floor_ui_field_pct ?? 0);

      const gaps: string[] = [];
      if (stratPct < (tierDef?.coverage_floor_strategy_pct ?? 0)) {
        gaps.push(`Strategy: ${stratPct.toFixed(1)}% < ${tierDef?.coverage_floor_strategy_pct}%`);
      }
      if (fieldPct < (tierDef?.coverage_floor_ui_field_pct ?? 0)) {
        gaps.push(`Fields: ${fieldPct.toFixed(1)}% < ${tierDef?.coverage_floor_ui_field_pct}%`);
      }

      perCam.push({
        cam_id: camId,
        display_name: entry.display_name,
        tier: entry.tier,
        strategy_coverage_pct: stratPct,
        field_coverage_pct: fieldPct,
        meets_tier_floor: meetsFloor,
        gaps,
      });
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const tier1Strat = avg(tierBuckets[1].strategyPcts);
    const tier1Field = avg(tierBuckets[1].fieldPcts);
    const tier2Strat = avg(tierBuckets[2].strategyPcts);
    const tier2Field = avg(tierBuckets[2].fieldPcts);

    const tier1Floor = vendors.tier_definitions.tier_1;
    const tier2Floor = vendors.tier_definitions.tier_2;

    const overallOmega = this.calculateOmega(perCam, vendors);

    const nextActions: string[] = [];
    const plan = this.planNext();
    if (plan.recommended_cam !== "none") {
      nextActions.push(`Work on ${plan.recommended_cam}: ${plan.recommended_unit}`);
    }

    return {
      generated_at: new Date().toISOString(),
      overall_omega: overallOmega,
      tier_summary: {
        tier_1: {
          cams: tierBuckets[1].count,
          avg_strategy_pct: tier1Strat,
          avg_field_pct: tier1Field,
          meets_floor: tier1Strat >= (tier1Floor?.coverage_floor_strategy_pct ?? 0) &&
                       tier1Field >= (tier1Floor?.coverage_floor_ui_field_pct ?? 0),
        },
        tier_2: {
          cams: tierBuckets[2].count,
          avg_strategy_pct: tier2Strat,
          avg_field_pct: tier2Field,
          meets_floor: tier2Strat >= (tier2Floor?.coverage_floor_strategy_pct ?? 0) &&
                       tier2Field >= (tier2Floor?.coverage_floor_ui_field_pct ?? 0),
        },
        tier_3: {
          cams: tierBuckets[3].count,
          avg_strategy_pct: avg(tierBuckets[3].strategyPcts),
          avg_field_pct: avg(tierBuckets[3].fieldPcts),
        },
      },
      per_cam: perCam.sort((a, b) => a.tier - b.tier || b.strategy_coverage_pct - a.strategy_coverage_pct),
      next_actions: nextActions,
    };
  }

  private calculateOmega(perCam: CoverageReport["per_cam"], vendors: VendorRegistry): number {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const cam of perCam) {
      const weight = cam.tier === 1 ? 3 : cam.tier === 2 ? 2 : 1;
      const tierDef = vendors.tier_definitions[`tier_${cam.tier}`];
      const stratFloor = tierDef?.coverage_floor_strategy_pct ?? 0;
      const fieldFloor = tierDef?.coverage_floor_ui_field_pct ?? 0;

      const stratScore = stratFloor > 0 ? Math.min(1, cam.strategy_coverage_pct / stratFloor) : 1;
      const fieldScore = fieldFloor > 0 ? Math.min(1, cam.field_coverage_pct / fieldFloor) : 1;

      totalWeight += weight;
      weightedScore += weight * (stratScore * 0.5 + fieldScore * 0.5);
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  // ==========================================================================
  // Per-CAM Audit
  // ==========================================================================

  /**
   * Deep audit of a single CAM's coverage gaps.
   */
  auditCam(camId: string): CAMAuditResult {
    const baseline = this.loadBaseline();
    const current = this.loadCurrent();
    const vendors = this.loadVendorRegistry();

    const entry = vendors.cam_systems[camId];
    if (!entry) {
      throw new Error(`Unknown CAM: ${camId}`);
    }

    const metrics = current?.per_cam_baseline?.[camId] ?? baseline.per_cam_baseline[camId];
    const tierDef = vendors.tier_definitions[`tier_${entry.tier}`];

    const stratFloor = tierDef?.coverage_floor_strategy_pct ?? 0;
    const fieldFloor = tierDef?.coverage_floor_ui_field_pct ?? 0;

    const gaps: CAMAuditResult["gaps"] = [];

    if ((metrics?.strategy_catalog_coverage_pct ?? 0) < stratFloor) {
      gaps.push({
        metric: "strategy_catalog",
        current: metrics?.strategy_catalog_coverage_pct ?? 0,
        required: stratFloor,
        delta: stratFloor - (metrics?.strategy_catalog_coverage_pct ?? 0),
        units_to_close: [`U-CAT01: Enumerate all ${entry.strategies_estimated} strategies`],
      });
    }

    if ((metrics?.ui_field_schema_coverage_pct ?? 0) < fieldFloor) {
      gaps.push({
        metric: "ui_field_schema",
        current: metrics?.ui_field_schema_coverage_pct ?? 0,
        required: fieldFloor,
        delta: fieldFloor - (metrics?.ui_field_schema_coverage_pct ?? 0),
        units_to_close: [`U-UIS01: Schema ${entry.fields_estimated} UI fields`],
      });
    }

    const ingestionSources = [
      "S0A: /pdf-learn vendor PDFs",
      "S0B: /video-learn training videos",
      "S2: Forum scrape (CNCzone, eMastercam, Reddit)",
      "S5: API/SDK documentation",
    ];
    if (entry.tier === 1 && entry.jmdie_program_count) {
      ingestionSources.push(`S7: Reverse-engineer ${entry.jmdie_program_count} JMDie programs`);
    }

    const effortHours = (gaps.length * 4) + (entry.strategies_estimated / 10) + (entry.fields_estimated / 100);

    return {
      cam_id: camId,
      display_name: entry.display_name,
      tier: entry.tier,
      current_metrics: metrics ?? {
        strategy_catalog_coverage_pct: 0,
        ui_field_schema_coverage_pct: 0,
        post_dialect_coverage_pct: 0,
        sample_reproducibility_pct: 0,
        strategies_enumerated: 0,
        strategies_total_estimated: entry.strategies_estimated,
        fields_schematized: 0,
        fields_total_estimated: entry.fields_estimated,
        last_audit: null,
      },
      floor_requirements: {
        strategy_floor_pct: stratFloor,
        field_floor_pct: fieldFloor,
      },
      gaps,
      recommended_ingestion_sources: ingestionSources,
      estimated_effort_hours: Math.round(effortHours),
      blocked_by: entry.patent_block,
    };
  }

  // ==========================================================================
  // Coverage Promotion
  // ==========================================================================

  /**
   * Update current coverage after completing work on a CAM.
   */
  promoteCoverage(camId: string, updates: Partial<CAMCoverageMetrics>): void {
    const current = this.loadCurrent();
    const baseline = this.loadBaseline();

    if (!current.per_cam_baseline[camId]) {
      current.per_cam_baseline[camId] = { ...baseline.per_cam_baseline[camId] };
    }

    Object.assign(current.per_cam_baseline[camId], updates, {
      last_audit: new Date().toISOString(),
    });

    this.recalculateAggregates(current);
    this.saveCurrent(current);
    this.clearCaches();
  }

  private recalculateAggregates(current: CoverageBaseline): void {
    let totalStrategies = 0;
    let coveredStrategies = 0;
    let totalFields = 0;
    let coveredFields = 0;

    for (const metrics of Object.values(current.per_cam_baseline)) {
      totalStrategies += metrics.strategies_total_estimated;
      coveredStrategies += metrics.strategies_enumerated;
      totalFields += metrics.fields_total_estimated;
      coveredFields += metrics.fields_schematized;
    }

    current.aggregate_totals.current_strategy_coverage_pct =
      totalStrategies > 0 ? (coveredStrategies / totalStrategies) * 100 : 0;
    current.aggregate_totals.current_field_coverage_pct =
      totalFields > 0 ? (coveredFields / totalFields) * 100 : 0;
  }

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  private loadBaseline(): CoverageBaseline {
    if (this.baselineCache) return this.baselineCache;

    if (!existsSync(this.baselinePath)) {
      throw new Error(`Coverage baseline not found: ${this.baselinePath}`);
    }

    const content = readFileSync(this.baselinePath, "utf-8");
    this.baselineCache = JSON.parse(content);
    return this.baselineCache!;
  }

  private loadCurrent(): CoverageBaseline {
    if (this.currentCache) return this.currentCache;

    if (!existsSync(this.currentPath)) {
      const baseline = this.loadBaseline();
      this.currentCache = JSON.parse(JSON.stringify(baseline));
      return this.currentCache!;
    }

    const content = readFileSync(this.currentPath, "utf-8");
    this.currentCache = JSON.parse(content);
    return this.currentCache!;
  }

  private saveCurrent(current: CoverageBaseline): void {
    writeFileSync(this.currentPath, JSON.stringify(current, null, 2));
  }

  private loadVendorRegistry(): VendorRegistry {
    if (this.vendorCache) return this.vendorCache;

    if (!existsSync(this.vendorRegistryPath)) {
      throw new Error(`Vendor registry not found: ${this.vendorRegistryPath}`);
    }

    const content = readFileSync(this.vendorRegistryPath, "utf-8");
    this.vendorCache = JSON.parse(content);
    return this.vendorCache!;
  }

  clearCaches(): void {
    this.baselineCache = null;
    this.currentCache = null;
    this.vendorCache = null;
  }

  /**
   * Get list of all in-scope CAM systems.
   */
  getInScopeCams(): Array<{ id: string; tier: CAMTier; display_name: string }> {
    const vendors = this.loadVendorRegistry();
    return Object.entries(vendors.cam_systems)
      .filter(([, entry]) => entry.in_scope)
      .map(([id, entry]) => ({ id, tier: entry.tier, display_name: entry.display_name }))
      .sort((a, b) => a.tier - b.tier);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const camInputExhaustionPlannerEngine = CAMInputExhaustionPlannerEngine.getInstance();
