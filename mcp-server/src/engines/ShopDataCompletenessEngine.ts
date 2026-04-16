/**
 * ShopDataCompletenessEngine — Data population scoring for My Shop
 *
 * Calculates a completeness score for each seed domain (programs, employees,
 * machines, controllers, tool_holders, tooling, materials, prints) by
 * querying the relevant engines. Identifies gaps and recommends next
 * ingestion actions to improve shop data coverage.
 *
 * JM Die baselines: 21 machines, 15 controllers, 10 standard materials,
 * ~15 employees, ~50 tool holders, ~200 tools, ~500 prints, ~10K programs.
 *
 * INGEST-MS6 / U-SHOP01
 * @module ShopDataCompletenessEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type SeedDomainId =
  | "programs"
  | "employee_database"
  | "machines"
  | "controllers"
  | "tool_holders"
  | "tooling"
  | "materials"
  | "prints";

export interface DomainScore {
  domain: SeedDomainId;
  label: string;
  count: number;
  baseline: number;
  percentage: number;
  status: "empty" | "partial" | "seeded" | "complete";
  gap: string;
  next_action: string;
}

export interface CompletenessReport {
  overall_percentage: number;
  overall_status: "empty" | "getting_started" | "partially_populated" | "well_populated" | "complete";
  domains: DomainScore[];
  total_items: number;
  total_baseline: number;
  empty_domains: string[];
  recommendations: string[];
  generated_at: string;
}

/** Baselines: minimum expected counts for a "complete" JM Die shop profile */
const DOMAIN_BASELINES: Record<SeedDomainId, { label: string; baseline: number; weight: number }> = {
  programs:          { label: "CNC Programs",      baseline: 100,  weight: 1.5 },
  employee_database: { label: "Employees",         baseline: 10,   weight: 1.0 },
  machines:          { label: "Machines",           baseline: 15,   weight: 1.5 },
  controllers:       { label: "Controllers",        baseline: 10,   weight: 1.0 },
  tool_holders:      { label: "Tool Holders",       baseline: 20,   weight: 1.0 },
  tooling:           { label: "Shop Tooling",       baseline: 50,   weight: 1.0 },
  materials:         { label: "Material Stock",     baseline: 8,    weight: 1.0 },
  prints:            { label: "Engineering Prints",  baseline: 50,   weight: 1.0 },
};

// ============================================================================
// ENGINE
// ============================================================================

class ShopDataCompletenessEngine {

  /**
   * Calculate completeness scores across all seed domains.
   * Lazy-imports each engine to avoid circular dependencies.
   */
  async calculateCompleteness(profileId?: string): Promise<CompletenessReport> {
    const domains: DomainScore[] = [];

    // Collect counts from each engine
    const counts = await this.collectDomainCounts(profileId);

    for (const [domainId, config] of Object.entries(DOMAIN_BASELINES)) {
      const id = domainId as SeedDomainId;
      const count = counts[id] ?? 0;
      const pct = Math.min(100, Math.round((count / config.baseline) * 100));

      let status: DomainScore["status"];
      if (count === 0) status = "empty";
      else if (pct < 50) status = "partial";
      else if (pct < 100) status = "seeded";
      else status = "complete";

      domains.push({
        domain: id,
        label: config.label,
        count,
        baseline: config.baseline,
        percentage: pct,
        status,
        gap: this.describeGap(id, count, config.baseline),
        next_action: this.recommendAction(id, count, config.baseline),
      });
    }

    // Weighted overall score
    let weightedSum = 0;
    let totalWeight = 0;
    for (const d of domains) {
      const w = DOMAIN_BASELINES[d.domain].weight;
      weightedSum += d.percentage * w;
      totalWeight += w;
    }
    const overall = Math.round(weightedSum / totalWeight);

    let overallStatus: CompletenessReport["overall_status"];
    if (overall === 0) overallStatus = "empty";
    else if (overall < 25) overallStatus = "getting_started";
    else if (overall < 60) overallStatus = "partially_populated";
    else if (overall < 100) overallStatus = "well_populated";
    else overallStatus = "complete";

    const emptyDomains = domains.filter(d => d.count === 0).map(d => d.label);
    const recommendations = domains
      .filter(d => d.status !== "complete")
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .map(d => d.next_action);

    const totalItems = domains.reduce((s, d) => s + d.count, 0);
    const totalBaseline = domains.reduce((s, d) => s + d.baseline, 0);

    const report: CompletenessReport = {
      overall_percentage: overall,
      overall_status: overallStatus,
      domains,
      total_items: totalItems,
      total_baseline: totalBaseline,
      empty_domains: emptyDomains,
      recommendations,
      generated_at: new Date().toISOString(),
    };

    log.info(`[ShopCompleteness] Overall: ${overall}% (${overallStatus}) — ${totalItems}/${totalBaseline} items`);
    return report;
  }

  /**
   * Get gap analysis for a specific domain.
   */
  async getDomainGaps(domainId: SeedDomainId, profileId?: string): Promise<DomainScore> {
    const report = await this.calculateCompleteness(profileId);
    const domain = report.domains.find(d => d.domain === domainId);
    if (!domain) throw new Error(`Unknown domain: ${domainId}`);
    return domain;
  }

  /**
   * Get the top recommended actions to improve completeness.
   */
  async getRecommendations(profileId?: string): Promise<string[]> {
    const report = await this.calculateCompleteness(profileId);
    return report.recommendations;
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async collectDomainCounts(profileId?: string): Promise<Record<SeedDomainId, number>> {
    const counts: Record<SeedDomainId, number> = {
      programs: 0,
      employee_database: 0,
      machines: 0,
      controllers: 0,
      tool_holders: 0,
      tooling: 0,
      materials: 0,
      prints: 0,
    };

    try {
      const { shopConfigurationEngine } = await import("./ShopConfigurationEngine.js");
      const machines = shopConfigurationEngine.getMachines(profileId);
      counts.machines = machines.length;
    } catch { /* engine not available */ }

    try {
      const { JM_DIE_CONTROLLER_MAP } = await import("../data/jm-die-profile.js");
      counts.controllers = JM_DIE_CONTROLLER_MAP.length;
    } catch { /* data not available */ }

    try {
      const { employeeEngine } = await import("./EmployeeEngine.js");
      counts.employee_database = employeeEngine.list().length;
    } catch { /* engine not available */ }

    try {
      const { toolHolderCatalogEngine } = await import("./ToolHolderCatalogEngine.js");
      counts.tool_holders = toolHolderCatalogEngine.list().length;
    } catch { /* engine not available */ }

    try {
      const { shopToolLibraryEngine } = await import("./ShopToolLibraryEngine.js");
      const summary = shopToolLibraryEngine.getSummary();
      counts.tooling = summary.totalTools ?? 0;
    } catch { /* engine not available */ }

    try {
      const { materialStockEngine } = await import("./MaterialStockEngine.js");
      counts.materials = materialStockEngine.list().length;
    } catch { /* engine not available */ }

    try {
      const { printLibraryEngine } = await import("./PrintLibraryEngine.js");
      counts.prints = printLibraryEngine.list().length;
    } catch { /* engine not available */ }

    // Programs: use FolderScannerEngine scan summary if available
    try {
      const { folderScannerEngine } = await import("./FolderScannerEngine.js");
      const summary = folderScannerEngine.getSummary();
      counts.programs = summary.total_files_tracked ?? 0;
    } catch { /* engine not available */ }

    return counts;
  }

  private describeGap(domain: SeedDomainId, count: number, baseline: number): string {
    if (count >= baseline) return "Fully populated";
    if (count === 0) {
      const gaps: Record<SeedDomainId, string> = {
        programs: "No programs scanned — run folder scan on JM Die program archive",
        employee_database: "No employees loaded — seed JM Die roster or import from spreadsheet",
        machines: "No machines configured — should auto-seed from ShopConfigurationEngine",
        controllers: "No controllers mapped — should auto-seed from JM Die controller map",
        tool_holders: "No tool holders in inventory — import holder catalog or add manually",
        tooling: "No shop tooling loaded — import tool crib inventory",
        materials: "No material stock — run /material-stock seed to load JM Die standard materials",
        prints: "No prints indexed — scan print folders or ingest individual drawings",
      };
      return gaps[domain];
    }
    const remaining = baseline - count;
    return `${count}/${baseline} loaded — ${remaining} more needed for baseline coverage`;
  }

  private recommendAction(domain: SeedDomainId, count: number, baseline: number): string {
    if (count >= baseline) return `${DOMAIN_BASELINES[domain].label}: complete`;
    const actions: Record<SeedDomainId, string> = {
      programs: "Run /data scan_folder on H:/PRISM/JM DIE/ to index program files",
      employee_database: "Use /data employee_import with JM Die roster spreadsheet",
      machines: "Machines auto-seed on startup — verify with /my-shop",
      controllers: "Controllers auto-seed from jm-die-profile — verify mappings",
      tool_holders: "Use /tooling add or bulk import to populate holder inventory",
      tooling: "Use /data tool_import to load shop tool crib from spreadsheet",
      materials: "Run /material-stock seed to load JM Die standard materials (D2, M2, S7, etc.)",
      prints: "Use /prints ingest to index engineering drawings from print folders",
    };
    return actions[domain];
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const shopDataCompletenessEngine = new ShopDataCompletenessEngine();
