/**
 * SpeedFeedShopLibraryBridgeEngine — operator's REAL Fusion 360 tool library → MRR-ranked SFC
 *
 * Closes U-OSC9-08 of OSCAR-SFC-9AXIS-MS0: every prior SFC ranking surface
 * (NineAxisOrchestrator.mrr_ranking, ExhaustiveCombinationEngine.aggregates,
 * BaselineComparator vs vendors) operates on SYNTHETIC tool lists hand-passed
 * by the caller. The operator's ACTUAL shop tools — hundreds of proven Fusion 360
 * CSV entries with measured speeds/feeds, real holders, real flute geometry —
 * were never wired into the ranking surface.
 *
 * This engine is pure COMPOSITION (R8 / R11):
 *   ShopToolLibraryEngine  →  unit + material normalize  →  NineAxisOrchestrator.run()
 *
 * It does NOT re-implement physics, ranking, or scoring. The orchestrator's existing
 * `rankToolLibrary()` (line 528 of SpeedFeedNineAxisOrchestratorEngine) is the
 * canonical ranker; we just feed it the operator's REAL inventory instead of a
 * hand-crafted list. Same MRRRankingEntry[] shape returned — downstream
 * subscribers (PropagationBridge, DownstreamSubscriber, PSN prior) work unchanged.
 *
 * Filtering:
 *   - category_filter: limit to one Fusion CSV category (e.g. "end_mill", "twist_drill")
 *   - diameter_range_mm: clip to [min, max] diameter window
 *   - max_tools: cap library size sent to orchestrator (perf guard; orchestrator
 *     scans the full library — for shops with 1000+ tools this matters)
 *
 * Edge cases (structured-error returns, never throw):
 *   - empty shop library                → { mrr_ranking: [], summary: {filtered_count: 0}, warnings: [...] }
 *   - all tools filtered out            → ditto with explicit reason
 *   - tool missing diameter             → silently skipped + counted in `dropped_no_diameter`
 *   - tool material unknown             → defaults to "carbide" with per-tool warning (most common shop tool)
 *   - diameter unit is "in"             → multiplied by 25.4 → mm
 *
 * Cost handling:
 *   - ShopTool has no `cost_usd` field. We accept an optional `cost_overrides_by_tool_number`
 *     map; tools without an override default to FALLBACK_TOOL_COST_USD ($30). All
 *     defaulted tools are listed in result.warnings.
 *
 * @module engines/SpeedFeedShopLibraryBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-08
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { z } from "zod";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
  type NineAxisResult,
  type MRRRankingEntry,
  type OptimizationMode,
} from "./SpeedFeedNineAxisOrchestratorEngine.js";
import { shopToolLibraryEngine, type ShopTool } from "./ShopToolLibraryEngine.js";
import type { ISOGroup, ToolMaterial } from "./UltimateSpeedFeedEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Fallback cost for shop tools that have no cost override and no CSV cost field. */
const FALLBACK_TOOL_COST_USD = 30;

/** Default flute count when ShopTool.flutes is missing. Conservative — 2 covers most end mills + drills. */
const DEFAULT_FLUTES_BY_CATEGORY: Record<string, number> = {
  end_mill: 4,
  milling: 4,
  face_mill: 5,
  twist_drill: 2,
  insert_drill: 2,
  drilling: 2,
  boring_bar: 1,
  turning: 1,
  reamer: 4,
  tap: 3,
};

/** Default tool material when ShopTool.material is missing or unrecognized. */
const FALLBACK_TOOL_MATERIAL: ToolMaterial = "carbide";

/** Max per-tool warnings retained verbatim; surplus collapsed into one summary line.
 *  Prevents memory blow-up on 2000-tool shops where every entry triggers fallback warnings. */
const MAX_WARNINGS_RETAINED = 50;

/** Material-string → canonical ToolMaterial normalization. Case-insensitive, substring match. */
const MATERIAL_PATTERNS: Array<{ pattern: RegExp; material: ToolMaterial }> = [
  { pattern: /\b(carbide|solid\s*carbide|tungsten\s*carbide|wc)\b/i, material: "carbide" },
  { pattern: /\b(hss|high\s*speed\s*steel|m2|m35|m42|co5|co8|cobalt)\b/i, material: "hss" },
  { pattern: /\bcermet\b/i, material: "cermet" },
  { pattern: /\b(ceramic|sialon|si3n4|al2o3|alumina)\b/i, material: "ceramic" },
  { pattern: /\b(cbn|cubic\s*boron\s*nitride)\b/i, material: "cbn" },
  { pattern: /\b(pcd|polycrystalline\s*diamond|diamond)\b/i, material: "pcd" },
];

// ============================================================================
// SCHEMA
// ============================================================================

/**
 * Shop-library bridge input. All NineAxisInput fields are pass-through except
 * `tooling` + `tool_library`, which this engine synthesizes from the shop library.
 */
export const ShopLibraryBridgeInputSchema = z.object({
  /** Material spec (required — drives ISO group, kc, baseline cutting params). */
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hb: z.number().positive().optional(),
    name: z.string().optional(),
  }),
  /** Optional category filter — only include shop tools in this Fusion category. */
  category_filter: z.string().optional(),
  /** Optional diameter window in mm. Tools outside [min, max] are dropped. */
  diameter_range_mm: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().positive(),
    })
    .refine((r) => r.max >= r.min, { message: "diameter_range_mm.max must be >= min" })
    .optional(),
  /** Cap library size sent to orchestrator (perf). Default 200 — covers typical shop crib. */
  max_tools: z.number().int().positive().max(2000).default(200),
  /** Per-tool cost overrides keyed by T-number. Tools without override use FALLBACK_TOOL_COST_USD. */
  cost_overrides_by_tool_number: z.record(z.string(), z.number().positive()).optional(),
  /** Optional pass-through to orchestrator. */
  optimization_mode: z.enum(["cost_batch", "aggressive_rush", "prism_optimized"]).optional(),
  /** Optional pass-through. Drives ROI popup + cost_per_part calc. */
  part_volume_cm3: z.number().positive().optional(),
  /** Optional pass-through. */
  batch_size: z.number().int().positive().optional(),
  /** Optional pass-through — entire NineAxisInput minus material/tooling/tool_library. */
  passthrough: z.record(z.string(), z.unknown()).optional(),
});

export type ShopLibraryBridgeInput = z.infer<typeof ShopLibraryBridgeInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface ShopLibraryBridgeSummary {
  /** Total tools in the shop library before filtering. */
  total_shop_tools: number;
  /** Tools that survived filtering (category, diameter, drop-rules). */
  filtered_count: number;
  /** Tools passed to orchestrator (filtered_count clipped at max_tools). */
  ranked_count: number;
  /** Counts of tools dropped per reason (transparent skip reasons). */
  dropped: {
    no_diameter: number;
    out_of_diameter_range: number;
    category_mismatch: number;
    duplicate_tool_number: number;
  };
  /** Number of tools that used FALLBACK_TOOL_MATERIAL because their material string didn't match any known pattern. */
  defaulted_material_count: number;
  /** Number of tools that used FALLBACK_TOOL_COST_USD because no override was provided. */
  defaulted_cost_count: number;
}

export interface ShopLibraryBridgeResult {
  /** Canonical MRR ranking from orchestrator — keyed by config_label (`T<n>: <desc>`). */
  mrr_ranking: MRRRankingEntry[];
  /** Bridge-side summary (filter audit). */
  summary: ShopLibraryBridgeSummary;
  /** Per-tool warnings (defaulted material, defaulted cost, etc.). */
  warnings: string[];
  /** Pointer back to source ShopTool by config_label (operator can grab the actual tool by T#). */
  source_tool_by_label: Record<string, { tool_number: number; description: string; category: string }>;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Bridge engine — exposed as a singleton on the standard PRISM engine pattern.
 * Methods are intentionally async (loadAll is sync today but reload from disk
 * is on the horizon; keep the interface forward-compatible).
 */
export class SpeedFeedShopLibraryBridgeEngine {
  /**
   * Run the SFC orchestrator against the operator's REAL Fusion 360 tool library
   * and return the MRR-ranked subset of tools that actually exist in the shop.
   *
   * @param raw Input (validated via Zod before use)
   * @returns ShopLibraryBridgeResult — MRR ranking + filter audit + per-tool warnings
   */
  run(raw: unknown): ShopLibraryBridgeResult {
    const input = ShopLibraryBridgeInputSchema.parse(raw);

    // 1. Load + filter the shop library.
    const allTools = shopToolLibraryEngine.loadAll();
    const totalShopTools = allTools.length;

    const dropped = {
      no_diameter: 0,
      out_of_diameter_range: 0,
      category_mismatch: 0,
      duplicate_tool_number: 0,
    };

    const seenToolNumbers = new Set<number>();
    const filtered: ShopTool[] = [];

    for (const t of allTools) {
      // Drop tools with no usable diameter (drilling tools without dia, etc.).
      if (typeof t.diameter !== "number" || t.diameter <= 0 || Number.isNaN(t.diameter)) {
        dropped.no_diameter++;
        continue;
      }

      // Category filter (case-insensitive substring match — Fusion uses snake_case categories).
      if (input.category_filter) {
        const want = input.category_filter.toLowerCase().replace(/[\s-]/g, "_");
        if (!t.category.includes(want)) {
          dropped.category_mismatch++;
          continue;
        }
      }

      // Diameter unit conversion (Fusion CSV mixes mm + in).
      const diameterMm = t.unit === "in" ? t.diameter * 25.4 : t.diameter;

      // Diameter range filter (post-conversion to mm).
      if (input.diameter_range_mm) {
        if (diameterMm < input.diameter_range_mm.min || diameterMm > input.diameter_range_mm.max) {
          dropped.out_of_diameter_range++;
          continue;
        }
      }

      // De-dup by T-number (Fusion CSVs occasionally repeat T#s across categories).
      if (seenToolNumbers.has(t.toolNumber)) {
        dropped.duplicate_tool_number++;
        continue;
      }
      seenToolNumbers.add(t.toolNumber);

      filtered.push(t);
    }

    // Cap at max_tools (perf guard for huge shop libraries).
    const capped = filtered.slice(0, input.max_tools);

    // 2. Map ShopTool → orchestrator tool_library entry.
    const warnings: string[] = [];
    const sourceToolByLabel: Record<string, { tool_number: number; description: string; category: string }> = {};
    let defaultedMaterialCount = 0;
    let defaultedCostCount = 0;

    const orchestratorLibrary: NonNullable<NineAxisInput["tool_library"]> = capped.map((t) => {
      const diameterMm = t.unit === "in" ? t.diameter * 25.4 : t.diameter;

      // Material normalization.
      const { material: toolMaterial, defaulted: matDefaulted } = normalizeToolMaterial(t.material);
      if (matDefaulted) {
        defaultedMaterialCount++;
        if (warnings.length < MAX_WARNINGS_RETAINED) {
          warnings.push(`T${t.toolNumber}: material "${t.material ?? "(none)"}" not recognized — defaulted to ${FALLBACK_TOOL_MATERIAL}`);
        }
      }

      // Flutes default by category.
      const flutes = t.flutes ?? DEFAULT_FLUTES_BY_CATEGORY[t.category] ?? 2;

      // Cost — override or fallback.
      const overrideKey = String(t.toolNumber);
      const costUsd = input.cost_overrides_by_tool_number?.[overrideKey];
      const finalCost = costUsd ?? FALLBACK_TOOL_COST_USD;
      if (costUsd === undefined) {
        defaultedCostCount++;
      }

      // Label (matches NineAxisOrchestrator MRRRankingEntry.config_label).
      const label = `T${t.toolNumber}: ${t.description.slice(0, 50)}`;
      sourceToolByLabel[label] = {
        tool_number: t.toolNumber,
        description: t.description,
        category: t.category,
      };

      return {
        label,
        diameter_mm: diameterMm,
        flutes,
        tool_material: toolMaterial,
        coating: undefined,
        cost_usd: finalCost,
      };
    });

    // 3. Empty-library guard — return structured-empty result, don't call orchestrator.
    if (orchestratorLibrary.length === 0) {
      return {
        mrr_ranking: [],
        summary: {
          total_shop_tools: totalShopTools,
          filtered_count: 0,
          ranked_count: 0,
          dropped,
          defaulted_material_count: 0,
          defaulted_cost_count: 0,
        },
        warnings: ["no shop tools survived filtering — check category_filter / diameter_range_mm / shop CSVs"],
        source_tool_by_label: {},
      };
    }

    if (defaultedCostCount > 0) {
      warnings.push(`${defaultedCostCount} tools used fallback cost $${FALLBACK_TOOL_COST_USD} (no override). Pass cost_overrides_by_tool_number for accurate ROI.`);
    }

    // P1-fix (Reviewer B): cap per-tool warning surface so 2000-tool shops don't blow memory.
    // Per-reason counts are preserved in summary.defaulted_material_count / defaulted_cost_count.
    if (defaultedMaterialCount > MAX_WARNINGS_RETAINED) {
      warnings.push(`+${defaultedMaterialCount - MAX_WARNINGS_RETAINED} more material-defaulted warnings suppressed (see summary.defaulted_material_count)`);
    }

    // 4. Anchor tooling = first library entry (orchestrator requires `tooling.diameter` at minimum).
    const anchor = orchestratorLibrary[0];

    // 5. Build NineAxisInput. NineAxisMaterial.name is REQUIRED — default to ISO group letter
    // when caller omits it (e.g. "P" → "ISO-P generic"). NineAxisTooling uses `tool_diameter_mm`
    // (NOT `diameter_mm` — that's the tool_library entry shape; they differ on purpose).
    // P1-fix (Reviewer A): top-level fields use `??` against passthrough so an omitted top-level
    // field does NOT silently clobber a passthrough-provided value to undefined.
    const passthrough = (input.passthrough ?? {}) as Partial<NineAxisInput>;
    const materialName = input.material.name ?? `ISO-${input.material.iso_group} generic`;
    const orchestratorInput: NineAxisInput = {
      ...passthrough,
      material: {
        iso_group: input.material.iso_group as ISOGroup,
        hardness_hb: input.material.hardness_hb,
        name: materialName,
      },
      tooling: {
        tool_diameter_mm: anchor.diameter_mm,
        flutes: anchor.flutes,
        tool_material: anchor.tool_material,
      },
      tool_library: orchestratorLibrary,
      mode: (input.optimization_mode as OptimizationMode | undefined) ?? passthrough.mode ?? "prism_optimized",
      part_volume_cm3: input.part_volume_cm3 ?? passthrough.part_volume_cm3,
      batch_size: input.batch_size ?? passthrough.batch_size,
    };

    // 6. Delegate to canonical orchestrator.
    let nineAxisResult: NineAxisResult;
    try {
      nineAxisResult = speedFeedNineAxisOrchestratorEngine.run(orchestratorInput);
    } catch (err) {
      // Orchestrator throws are downgraded to structured-error result so the
      // bridge respects engines/CLAUDE.md "edge cases return errors, never throw".
      const msg = err instanceof Error ? err.message : String(err);
      return {
        mrr_ranking: [],
        summary: {
          total_shop_tools: totalShopTools,
          filtered_count: filtered.length,
          ranked_count: orchestratorLibrary.length,
          dropped,
          defaulted_material_count: defaultedMaterialCount,
          defaulted_cost_count: defaultedCostCount,
        },
        warnings: [...warnings, `orchestrator failure (bridge handled): ${msg}`],
        source_tool_by_label: sourceToolByLabel,
      };
    }

    // 7. Return ranked subset (orchestrator already sorts by score desc).
    return {
      mrr_ranking: nineAxisResult.mrr_ranking,
      summary: {
        total_shop_tools: totalShopTools,
        filtered_count: filtered.length,
        ranked_count: orchestratorLibrary.length,
        dropped,
        defaulted_material_count: defaultedMaterialCount,
        defaulted_cost_count: defaultedCostCount,
      },
      warnings,
      source_tool_by_label: sourceToolByLabel,
    };
  }

  /**
   * Convenience: rank just the top-K tools for a given material+diameter window.
   * Equivalent to `run({material, diameter_range_mm, max_tools: K})` then `.slice(0, K)`.
   *
   * @param materialIsoGroup ISO 513 group letter
   * @param diameterMinMm Lower bound (inclusive)
   * @param diameterMaxMm Upper bound (inclusive)
   * @param topK Max tools returned
   * @returns ShopLibraryBridgeResult with at most topK entries in mrr_ranking
   */
  topKForMaterialAndDiameter(
    materialIsoGroup: ISOGroup,
    diameterMinMm: number,
    diameterMaxMm: number,
    topK: number = 5,
  ): ShopLibraryBridgeResult {
    const full = this.run({
      material: { iso_group: materialIsoGroup },
      diameter_range_mm: { min: diameterMinMm, max: diameterMaxMm },
      max_tools: Math.max(topK * 4, 50),
    });
    return {
      ...full,
      mrr_ranking: full.mrr_ranking.slice(0, topK),
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Normalize a free-form shop CSV material string to canonical ToolMaterial. */
function normalizeToolMaterial(raw: string | undefined): { material: ToolMaterial; defaulted: boolean } {
  if (!raw || typeof raw !== "string") return { material: FALLBACK_TOOL_MATERIAL, defaulted: true };
  for (const { pattern, material } of MATERIAL_PATTERNS) {
    if (pattern.test(raw)) return { material, defaulted: false };
  }
  return { material: FALLBACK_TOOL_MATERIAL, defaulted: true };
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedShopLibraryBridgeEngine = new SpeedFeedShopLibraryBridgeEngine();
