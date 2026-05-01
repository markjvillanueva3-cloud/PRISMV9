/**
 * ToolCostPerPartEngine — Tool Cost Per Part Calculator
 *
 * Calculates tooling economics:
 * - Tool cost per part from tool life and price
 * - Insert cost per edge and edges per part
 * - Regrind vs replace breakeven
 * - Cost comparison between tool options
 * - Annual tooling budget from production volume
 * - Cost per cubic cm removed
 *
 * Key physics: Cost/part = tool_price / (tool_life × parts_per_life).
 * For indexable: cost/edge = insert_price / edges. Parts per edge
 * depends on cutting time per part and tool life in minutes.
 * Regrind saves 60-80% but loses 10-20% life per regrind.
 *
 * Reference: Sandvik tooling economics guide,
 *            Kennametal cost-per-hole analysis,
 *            SME tooling cost models
 *
 * Actions: tool_cost_per_part_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ToolCostPerPartInput {
  tool_price?: number;
  tool_type?: "solid_carbide" | "indexable" | "hss" | "pcd";
  /** U-BIZREG3: Catalog number for ToolRegistry lookup (95K tools with prices/life data) */
  catalog_number?: string;
  insert_price?: number;
  edges_per_insert?: number;
  inserts_per_tool?: number;
  tool_life_min?: number;
  cutting_time_per_part_min?: number;
  regrind_cost?: number;
  regrind_life_pct?: number;
  max_regrinds?: number;
  annual_production?: number;
  holder_price?: number;
  holder_life_parts?: number;
}

export interface ToolCostPerPartResult {
  cost_per_part: AtomicValue;
  cost_per_edge: AtomicValue;
  parts_per_edge: AtomicValue;
  parts_per_tool: AtomicValue;
  regrind_cost_per_part: AtomicValue;
  regrind_savings_pct: AtomicValue;
  annual_tool_cost: AtomicValue;
  cost_per_cm3: AtomicValue;
  holder_cost_per_part: AtomicValue;
  total_tooling_cost_per_part: AtomicValue;
  warnings: string[];
}

// ── Reference Data (fallbacks — used when ToolRegistry unavailable) ──

/** Default tool prices by type */
const DEFAULT_PRICES: Record<string, number> = {
  solid_carbide: 85,
  indexable: 15,
  hss: 25,
  pcd: 350,
};

/** Default tool life (minutes) by type */
const DEFAULT_LIFE: Record<string, number> = {
  solid_carbide: 45,
  indexable: 15,  // per edge
  hss: 20,
  pcd: 120,
};

/** Default edges per insert */
const DEFAULT_EDGES: Record<string, number> = {
  solid_carbide: 1,
  indexable: 4,
  hss: 1,
  pcd: 1,
};

/**
 * U-BIZREG3: Resolve tool price and life from ToolRegistry (95K tools) by catalog number.
 * Falls back to type-based defaults when registry lookup fails.
 */
function _resolveToolFromRegistry(catalogNumber: string | undefined, toolType: string): {
  price: number | null; lifeMin: number | null; source: string;
} {
  if (!catalogNumber) return { price: null, lifeMin: null, source: "no_catalog_number" };
  try {
    const registry = require("../registries/ToolRegistry.js").toolRegistry;
    const tool = registry.getByIdOrCatalog?.(catalogNumber) ?? registry.getByCatalogNumber?.(catalogNumber);
    if (tool) {
      return {
        price: tool.price ?? null,
        lifeMin: tool.performance?.expected_life_minutes ?? null,
        source: "ToolRegistry",
      };
    }
  } catch { /* registry not available */ }
  return { price: null, lifeMin: null, source: "not_found" };
}

// ── Engine ─────────────────────────────────────────────────────────

export class ToolCostPerPartEngine {
  calculate(input: ToolCostPerPartInput): ToolCostPerPartResult {
    const warnings: string[] = [];
    const tType = input.tool_type ?? "solid_carbide";

    // U-BIZREG3: Try ToolRegistry first if catalog_number provided
    const regTool = _resolveToolFromRegistry(input.catalog_number, tType);
    const toolPrice = input.tool_price ?? regTool.price ?? DEFAULT_PRICES[tType] ?? 85;
    const toolLife = input.tool_life_min ?? regTool.lifeMin ?? DEFAULT_LIFE[tType] ?? 45;
    if (regTool.source === "ToolRegistry") warnings.push(`Price/life from ToolRegistry (catalog: ${input.catalog_number})`);
    const cutTime = input.cutting_time_per_part_min ?? 2;
    const annualProd = input.annual_production ?? 10000;
    const holderPrice = input.holder_price ?? 200;
    const holderLifeParts = input.holder_life_parts ?? 50000;

    // Regrind parameters
    const regrindCost = input.regrind_cost ?? toolPrice * 0.3;
    const regrindLifePct = input.regrind_life_pct ?? 80;
    const maxRegrinds = input.max_regrinds
      ?? (tType === "solid_carbide" ? 3 : tType === "hss" ? 5 : 0);

    // Indexable parameters
    const insertPrice = input.insert_price
      ?? (tType === "indexable" ? 15 : toolPrice);
    const edgesPerInsert = input.edges_per_insert
      ?? DEFAULT_EDGES[tType] ?? 1;
    const insertsPerTool = input.inserts_per_tool ?? 1;

    // Parts per edge
    const partsPerEdge = cutTime > 0 ? toolLife / cutTime : 1;

    // Cost per edge
    let costPerEdge: number;
    if (tType === "indexable") {
      costPerEdge = insertPrice / edgesPerInsert;
    } else {
      costPerEdge = toolPrice; // solid tool = 1 "edge"
    }

    // Cost per part (new tool only)
    const costPerPart = partsPerEdge > 0
      ? costPerEdge / partsPerEdge : costPerEdge;

    // Parts per tool (total)
    let partsPerTool: number;
    if (tType === "indexable") {
      partsPerTool = partsPerEdge * edgesPerInsert * insertsPerTool;
    } else {
      partsPerTool = partsPerEdge;
    }

    // Regrind economics
    let regrindCostPerPart = costPerPart; // default = no savings
    let regrindSavings = 0;
    if (maxRegrinds > 0) {
      // Total parts with regrinds
      let totalParts = partsPerEdge; // first life
      let totalCost = toolPrice;
      let remainingLife = regrindLifePct / 100;
      for (let i = 0; i < maxRegrinds; i++) {
        totalParts += partsPerEdge * remainingLife;
        totalCost += regrindCost;
        remainingLife *= regrindLifePct / 100;
      }
      regrindCostPerPart = totalParts > 0
        ? totalCost / totalParts : costPerPart;
      regrindSavings = costPerPart > 0
        ? ((costPerPart - regrindCostPerPart) / costPerPart) * 100
        : 0;
    }

    // Annual tool cost
    const annualCost = costPerPart * annualProd;

    // Cost per cm³ removed (estimate: assume 5 cm³/min MRR typical)
    const mrr = 5; // cm³/min
    const cm3PerPart = mrr * cutTime;
    const costPerCm3 = cm3PerPart > 0
      ? costPerPart / cm3PerPart : 0;

    // Holder cost per part
    const holderCostPerPart = holderLifeParts > 0
      ? holderPrice / holderLifeParts : 0;

    // Total tooling cost
    const totalPerPart = costPerPart + holderCostPerPart;

    // Warnings
    if (costPerPart > 5) {
      warnings.push(
        `Tool cost $${r2(costPerPart)}/part is high — ` +
        "consider indexable or regrind"
      );
    }
    if (partsPerEdge < 5) {
      warnings.push(
        `Only ${r1(partsPerEdge)} parts per edge — ` +
        "tool life may be too short, check parameters"
      );
    }
    if (regrindSavings > 30 && maxRegrinds > 0) {
      warnings.push(
        `Regrinding saves ${r0(regrindSavings)}% — ` +
        "implement regrind program"
      );
    }
    if (annualCost > 50000) {
      warnings.push(
        `Annual tooling $${r0(annualCost)} — ` +
        "negotiate volume pricing or explore alternatives"
      );
    }
    if (tType === "hss" && cutTime > 5) {
      warnings.push(
        "Long cut time with HSS — carbide may be more economical"
      );
    }

    return {
      cost_per_part: av(r3(costPerPart), "$/part", 0.01,
        `$${r2(costPerEdge)} / ${r1(partsPerEdge)} parts`),
      cost_per_edge: av(r2(costPerEdge), "$/edge", 0.1,
        tType === "indexable"
          ? `$${insertPrice} / ${edgesPerInsert} edges`
          : `$${toolPrice} per tool`),
      parts_per_edge: av(r1(partsPerEdge), "parts", 0.5,
        `${toolLife}min life / ${cutTime}min cut`),
      parts_per_tool: av(r0(partsPerTool), "parts", 1,
        tType === "indexable"
          ? `${r1(partsPerEdge)} × ${edgesPerInsert} edges × ${insertsPerTool}`
          : `${r1(partsPerEdge)} parts per tool`),
      regrind_cost_per_part: av(r3(regrindCostPerPart), "$/part", 0.01,
        `${maxRegrinds} regrinds at ${regrindLifePct}% life`),
      regrind_savings_pct: av(r1(regrindSavings), "%", 1,
        "New vs regrind cost comparison"),
      annual_tool_cost: av(r0(annualCost), "$/year", 10,
        `$${r3(costPerPart)} × ${annualProd} parts`),
      cost_per_cm3: av(r4(costPerCm3), "$/cm³", 0.001,
        `$${r3(costPerPart)} / ${r1(cm3PerPart)} cm³`),
      holder_cost_per_part: av(r4(holderCostPerPart), "$/part", 0.001,
        `$${holderPrice} / ${holderLifeParts} parts`),
      total_tooling_cost_per_part: av(r3(totalPerPart), "$/part", 0.01,
        "Tool + holder cost"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const toolCostPerPartEngine = new ToolCostPerPartEngine();
