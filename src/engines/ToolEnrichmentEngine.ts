/**
 * ToolEnrichmentEngine — SQ3-1-TOOL: Tool database enrichment
 *
 * Audits, enriches, and validates the 95K+ tool database with:
 * - Cutting data per ISO material group (Vc/fz ranges from canonical physics)
 * - Taylor tool-life coefficients adjusted by substrate + coating
 * - Geometry gap-filling via standard dimension tables
 * - Holder-to-tool compatibility matching
 * - Confidence scoring for all enriched fields
 *
 * Composes with existing engines and registries (does NOT duplicate):
 * - ToolCatalogEngine — source of CatalogTool records (30+ manufacturer catalogs)
 * - CoatingRegistry — 100+ coatings with SFC correction factors (speed_multiplier, tool_life_multiplier)
 * - ToolHolderDatabaseEngine — 80+ holder interface specs (CAT/BT/HSK/CAPTO/ER/VDI/BMT)
 * - InsertGradeSelectionEngine — turning insert grade selection
 * - DimensionImputationEngine — statistical geometry gap-fill
 *
 * Pattern: follows MachineDataHardeningEngine (SQ3-0-MACH) audit/harden/validate/summary
 *
 * Source: CANONICAL_TAYLOR (ISO 3685), CANONICAL_MATERIAL_DB (Sandvik/Kennametal),
 *         CoatingRegistry sfc_factors (Walter/Oerlikon Balzers/Kennametal studies).
 *
 * @engine ToolEnrichmentEngine
 * @dispatcher dataDispatcher
 * @actions tool_enrich_audit, tool_enrich_batch, tool_enrich_validate,
 *          tool_enrich_holder_matrix, tool_enrich_summary
 */

import {
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";
import { toolHolderDatabaseEngine, type ToolHolderSpec } from "./ToolHolderDatabaseEngine.js";
import { coatingRegistry, type CoatingEntry } from "../registries/CoatingRegistry.js";

// ── Types ──

export interface EnrichField {
  field: string;
  status: "present" | "missing" | "enriched" | "suspect";
  value?: unknown;
  source?: string;
  confidence?: number;
}

export interface ToolAuditEntry {
  tool_id: string;
  manufacturer: string;
  type: string;
  completeness_pct: number;
  fields: EnrichField[];
  missing_count: number;
  enrichable_count: number;
}

export interface AuditReport {
  timestamp: string;
  total_tools: number;
  avg_completeness_pct: number;
  tools_above_90: number;
  tools_below_50: number;
  field_coverage: Record<string, { present: number; missing: number; pct: number }>;
  iso_group_coverage: Record<string, number>;
  by_manufacturer: Record<string, { total: number; complete: number }>;
  by_type: Record<string, { total: number; complete: number }>;
  warnings: string[];
}

export interface TaylorCoefficients {
  C_adjusted: number;
  n: number;
  expected_life_min: number;
  coating_multiplier: number;
  substrate_correction: number;
  source: string;
}

export interface EnrichedCuttingData {
  vc_min: number;
  vc_max: number;
  fz_min: number;
  fz_max: number;
  ap_max?: number;
  ae_max?: number;
  taylor?: TaylorCoefficients;
  confidence: number;
  source: "manufacturer" | "canonical" | "interpolated";
}

export interface EnrichResult {
  timestamp: string;
  dry_run: boolean;
  total_tools: number;
  gaps_found: number;
  gaps_filled: number;
  taylor_added: number;
  cutting_data_added: number;
  geometry_filled: number;
  fills: Array<{
    tool_id: string;
    field: string;
    old_value: unknown;
    new_value: unknown;
    source: string;
    confidence: number;
  }>;
  warnings: string[];
}

export interface ValidationIssue {
  tool_id: string;
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  value?: unknown;
  expected?: string;
}

export interface ValidationReport {
  timestamp: string;
  total_tools: number;
  valid: number;
  issues_count: number;
  issues: ValidationIssue[];
}

export interface HolderMatch {
  holder_id: string;
  holder_type: string;
  taper: string;
  max_rpm: number;
  compatibility_score: number;
  notes: string[];
}

export interface HolderCompatibilityMatrix {
  timestamp: string;
  total_tools: number;
  total_holders: number;
  matches: Array<{
    tool_id: string;
    tool_type: string;
    shank_diameter_mm: number;
    compatible_holders: HolderMatch[];
    recommended_holder: string | null;
  }>;
  coverage_pct: number;
}

// ── Canonical Correction Factors ──

/**
 * Substrate correction for Taylor C.
 * Source: Kennametal Grade Selection Guide, Sandvik Turning Guide.
 */
const SUBSTRATE_CORRECTION: Record<string, number> = {
  carbide: 1.0, hss: 0.45, hss_cobalt: 0.55, cermet: 1.15,
  ceramic: 0.80, cbn: 1.40, pcd: 2.00, indexable: 1.0,
};

/**
 * Fallback coating speed multiplier for Taylor C adjustment.
 * Used ONLY when CoatingRegistry is not loaded.
 * Canonical source: CoatingRegistry.sfc_factors.speed_multiplier.
 */
const FALLBACK_COATING_SPEED: Record<string, number> = {
  uncoated: 1.0, TiN: 1.3, TiCN: 1.4, TiAlN: 1.6, AlTiN: 1.6,
  AlCrN: 1.5, nACo: 1.7, CVD_Al2O3: 1.5, CVD_TiCN_Al2O3: 1.8,
  Tiger_tec_Gold: 2.0, PVD_multilayer: 1.4, DLC: 1.3, diamond: 3.0,
};

/**
 * Feed-per-tooth ranges by tool type and ISO group.
 * Source: Sandvik General Turning/Milling catalogs, Kennametal Master Catalog.
 */
const CANONICAL_FEED: Record<string, Record<string, { fz_min: number; fz_max: number }>> = {
  end_mill:     { P: { fz_min: 0.04, fz_max: 0.20 }, M: { fz_min: 0.03, fz_max: 0.15 }, K: { fz_min: 0.05, fz_max: 0.25 }, N: { fz_min: 0.05, fz_max: 0.30 }, S: { fz_min: 0.02, fz_max: 0.08 }, H: { fz_min: 0.02, fz_max: 0.08 } },
  ball_mill:    { P: { fz_min: 0.03, fz_max: 0.15 }, M: { fz_min: 0.02, fz_max: 0.12 }, K: { fz_min: 0.04, fz_max: 0.18 }, N: { fz_min: 0.04, fz_max: 0.25 }, S: { fz_min: 0.015, fz_max: 0.06 }, H: { fz_min: 0.015, fz_max: 0.06 } },
  bull_mill:    { P: { fz_min: 0.04, fz_max: 0.18 }, M: { fz_min: 0.03, fz_max: 0.14 }, K: { fz_min: 0.05, fz_max: 0.22 }, N: { fz_min: 0.05, fz_max: 0.28 }, S: { fz_min: 0.02, fz_max: 0.07 }, H: { fz_min: 0.02, fz_max: 0.07 } },
  face_mill:    { P: { fz_min: 0.10, fz_max: 0.40 }, M: { fz_min: 0.08, fz_max: 0.30 }, K: { fz_min: 0.10, fz_max: 0.40 }, N: { fz_min: 0.10, fz_max: 0.50 }, S: { fz_min: 0.05, fz_max: 0.15 }, H: { fz_min: 0.04, fz_max: 0.12 } },
  drill:        { P: { fz_min: 0.05, fz_max: 0.35 }, M: { fz_min: 0.04, fz_max: 0.25 }, K: { fz_min: 0.06, fz_max: 0.40 }, N: { fz_min: 0.06, fz_max: 0.45 }, S: { fz_min: 0.02, fz_max: 0.10 }, H: { fz_min: 0.02, fz_max: 0.10 } },
  turning_tool: { P: { fz_min: 0.10, fz_max: 0.40 }, M: { fz_min: 0.08, fz_max: 0.30 }, K: { fz_min: 0.10, fz_max: 0.40 }, N: { fz_min: 0.08, fz_max: 0.30 }, S: { fz_min: 0.05, fz_max: 0.15 }, H: { fz_min: 0.04, fz_max: 0.15 } },
  insert:       { P: { fz_min: 0.10, fz_max: 0.40 }, M: { fz_min: 0.08, fz_max: 0.30 }, K: { fz_min: 0.10, fz_max: 0.40 }, N: { fz_min: 0.08, fz_max: 0.30 }, S: { fz_min: 0.05, fz_max: 0.15 }, H: { fz_min: 0.04, fz_max: 0.15 } },
  boring_bar:   { P: { fz_min: 0.05, fz_max: 0.25 }, M: { fz_min: 0.04, fz_max: 0.20 }, K: { fz_min: 0.05, fz_max: 0.30 }, N: { fz_min: 0.05, fz_max: 0.25 }, S: { fz_min: 0.03, fz_max: 0.10 }, H: { fz_min: 0.03, fz_max: 0.10 } },
  reamer:       { P: { fz_min: 0.08, fz_max: 0.30 }, M: { fz_min: 0.06, fz_max: 0.25 }, K: { fz_min: 0.08, fz_max: 0.35 }, N: { fz_min: 0.08, fz_max: 0.35 }, S: { fz_min: 0.04, fz_max: 0.12 }, H: { fz_min: 0.04, fz_max: 0.12 } },
  tap:          { P: { fz_min: 0.50, fz_max: 2.00 }, M: { fz_min: 0.50, fz_max: 1.50 }, K: { fz_min: 0.50, fz_max: 2.00 }, N: { fz_min: 0.50, fz_max: 2.50 }, S: { fz_min: 0.25, fz_max: 1.00 }, H: { fz_min: 0.25, fz_max: 0.75 } },
};

/** ER collet shank capacity [min, max] mm. Source: DIN 6499. */
const ER_CAPACITY: Record<string, [number, number]> = {
  ER8: [0.5, 5.0], ER11: [0.5, 7.0], ER16: [1.0, 10.0], ER20: [1.0, 13.0],
  ER25: [1.0, 16.0], ER32: [2.0, 20.0], ER40: [3.0, 26.0], ER50: [6.0, 34.0],
};

const REQUIRED_FIELDS = [
  "iso_groups", "cutting_data", "physical.cutting_diameter_mm",
  "physical.overall_length_mm", "physical.flute_length_mm", "physical.shank_diameter_mm",
];

// ── Loose tool interface (CatalogTool + registry records) ──

interface ToolLike {
  id: string;
  type?: string;
  manufacturer?: string;
  material?: string;
  substrate?: string;
  coating?: unknown;
  iso_groups?: string[];
  operations?: string[];
  cutting_data?: Record<string, Record<string, unknown>>;
  holder_interface?: string;
  physical?: {
    cutting_diameter_mm: number;
    overall_length_mm: number;
    flute_length_mm: number;
    shank_diameter_mm: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ── Engine ──

export class ToolEnrichmentEngine {

  // ─── Action: audit ───────────────────────────────────────────────

  audit(tools: ToolLike[]): AuditReport {
    const fieldCoverage: Record<string, { present: number; missing: number; pct: number }> = {};
    const byMfg: Record<string, { total: number; complete: number }> = {};
    const byType: Record<string, { total: number; complete: number }> = {};
    const isoGroupCoverage: Record<string, number> = {};
    const warnings: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      fieldCoverage[field] = { present: 0, missing: 0, pct: 0 };
    }

    const entries: ToolAuditEntry[] = [];

    for (const t of tools) {
      const mfg = t.manufacturer ?? "unknown";
      if (!byMfg[mfg]) byMfg[mfg] = { total: 0, complete: 0 };
      byMfg[mfg].total++;

      const type = t.type ?? "unknown";
      if (!byType[type]) byType[type] = { total: 0, complete: 0 };
      byType[type].total++;

      const fields = this._auditFields(t);
      const presentCount = fields.filter(f => f.status === "present").length;
      const missingCount = fields.filter(f => f.status === "missing").length;
      const completeness = REQUIRED_FIELDS.length > 0
        ? Math.round((presentCount / REQUIRED_FIELDS.length) * 100) : 0;

      if (completeness >= 90) { byMfg[mfg].complete++; byType[type].complete++; }

      for (const f of fields) {
        const fc = fieldCoverage[f.field];
        if (fc) { if (f.status === "present") fc.present++; else fc.missing++; }
      }

      for (const g of (t.iso_groups ?? [])) {
        isoGroupCoverage[g] = (isoGroupCoverage[g] ?? 0) + 1;
      }

      entries.push({
        tool_id: t.id, manufacturer: mfg, type, completeness_pct: completeness,
        fields, missing_count: missingCount, enrichable_count: missingCount,
      });
    }

    for (const [, fc] of Object.entries(fieldCoverage)) {
      fc.pct = tools.length > 0 ? Math.round((fc.present / tools.length) * 1000) / 10 : 0;
    }

    const avgComplete = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.completeness_pct, 0) / entries.length) : 0;

    if (avgComplete < 50) warnings.push("Average completeness below 50% -- bulk enrichment recommended");
    if (!fieldCoverage.cutting_data || fieldCoverage.cutting_data.pct < 30) {
      warnings.push("Cutting data coverage below 30% -- physics pipeline will use canonical defaults");
    }

    return {
      timestamp: new Date().toISOString(),
      total_tools: tools.length,
      avg_completeness_pct: avgComplete,
      tools_above_90: entries.filter(e => e.completeness_pct >= 90).length,
      tools_below_50: entries.filter(e => e.completeness_pct < 50).length,
      field_coverage: fieldCoverage,
      iso_group_coverage: isoGroupCoverage,
      by_manufacturer: byMfg,
      by_type: byType,
      warnings,
    };
  }

  // ─── Action: enrich ──────────────────────────────────────────────

  enrich(tools: ToolLike[], options?: { dry_run?: boolean; max_tools?: number }): EnrichResult {
    const dryRun = options?.dry_run ?? true;
    const maxTools = options?.max_tools ?? tools.length;
    const fills: EnrichResult["fills"] = [];
    const warnings: string[] = [];
    let gapsFound = 0, gapsFilled = 0, taylorCount = 0, cutDataCount = 0, geoCount = 0;

    const toProcess = tools.slice(0, maxTools);

    for (const tool of toProcess) {
      // 1. ISO groups
      if (!tool.iso_groups || tool.iso_groups.length === 0) {
        const inferred = this._inferISOGroups(tool);
        gapsFound++;
        if (inferred.length > 0) {
          fills.push({ tool_id: tool.id, field: "iso_groups", old_value: [], new_value: inferred, source: "substrate_inference", confidence: 0.70 });
          if (!dryRun) tool.iso_groups = inferred;
          gapsFilled++;
        }
      }

      const groups = tool.iso_groups ?? ["P", "M", "K"];

      // 2. Cutting data per ISO group
      if (!tool.cutting_data && !dryRun) tool.cutting_data = {};
      for (const group of groups) {
        if (tool.cutting_data?.[group]) continue;
        gapsFound++;
        const cd = this._computeCuttingData(tool, group as ISOGroup);
        if (cd) {
          fills.push({ tool_id: tool.id, field: `cutting_data.${group}`, old_value: null, new_value: cd, source: `canonical_${group}`, confidence: cd.confidence });
          if (!dryRun && tool.cutting_data) tool.cutting_data[group] = cd as unknown as Record<string, unknown>;
          gapsFilled++; cutDataCount++;
        }
      }

      // 3. Taylor coefficients per ISO group
      for (const group of groups) {
        const taylor = this._computeTaylor(tool, group as ISOGroup);
        if (taylor) {
          fills.push({ tool_id: tool.id, field: `cutting_data.${group}.taylor`, old_value: null, new_value: taylor, source: `taylor_${group}`, confidence: 0.75 });
          if (!dryRun && tool.cutting_data?.[group]) {
            (tool.cutting_data[group] as Record<string, unknown>).taylor = taylor;
          }
          gapsFilled++; taylorCount++;
        }
      }

      // 4. Geometry gaps
      const geo = tool.physical;
      if (geo && geo.cutting_diameter_mm > 0) {
        const toolType = tool.type ?? "end_mill";
        if (!geo.overall_length_mm || geo.overall_length_mm <= 0) {
          const oal = this._estimateOAL(toolType, geo.cutting_diameter_mm);
          fills.push({ tool_id: tool.id, field: "physical.overall_length_mm", old_value: geo.overall_length_mm, new_value: oal, source: "standard_dims", confidence: 0.65 });
          if (!dryRun) geo.overall_length_mm = oal;
          gapsFound++; gapsFilled++; geoCount++;
        }
        if (!geo.flute_length_mm || geo.flute_length_mm <= 0) {
          const loc = this._estimateLOC(toolType, geo.cutting_diameter_mm);
          fills.push({ tool_id: tool.id, field: "physical.flute_length_mm", old_value: geo.flute_length_mm, new_value: loc, source: "standard_dims", confidence: 0.65 });
          if (!dryRun) geo.flute_length_mm = loc;
          gapsFound++; gapsFilled++; geoCount++;
        }
        if (!geo.shank_diameter_mm || geo.shank_diameter_mm <= 0) {
          const shank = this._estimateShank(toolType, geo.cutting_diameter_mm);
          fills.push({ tool_id: tool.id, field: "physical.shank_diameter_mm", old_value: geo.shank_diameter_mm, new_value: shank, source: "standard_dims", confidence: 0.80 });
          if (!dryRun) geo.shank_diameter_mm = shank;
          gapsFound++; gapsFilled++; geoCount++;
        }
      }
    }

    if (dryRun && fills.length > 0) {
      warnings.push(`Dry run: ${fills.length} enrichments identified but not applied. Set dry_run=false to apply.`);
    }

    return {
      timestamp: new Date().toISOString(), dry_run: dryRun, total_tools: toProcess.length,
      gaps_found: gapsFound, gaps_filled: gapsFilled, taylor_added: taylorCount,
      cutting_data_added: cutDataCount, geometry_filled: geoCount, fills, warnings,
    };
  }

  // ─── Action: validate ────────────────────────────────────────────

  validate(tools: ToolLike[]): ValidationReport {
    const issues: ValidationIssue[] = [];

    for (const t of tools) {
      const geo = t.physical;
      if (!geo) {
        issues.push({ tool_id: t.id, field: "physical", severity: "error", message: "No physical dimensions" });
        continue;
      }

      const dia = geo.cutting_diameter_mm;
      const oal = geo.overall_length_mm;
      const loc = geo.flute_length_mm;
      const shank = geo.shank_diameter_mm;

      if (dia <= 0) {
        issues.push({ tool_id: t.id, field: "cutting_diameter_mm", severity: "error", message: "Diameter must be > 0", value: dia });
      }
      if (dia > 0 && oal > 0 && oal < dia) {
        issues.push({ tool_id: t.id, field: "overall_length_mm", severity: "error", message: "OAL less than diameter", value: oal, expected: `>= ${dia}` });
      }
      if (dia > 0 && loc > 0 && loc > oal) {
        issues.push({ tool_id: t.id, field: "flute_length_mm", severity: "error", message: "LOC exceeds OAL", value: loc, expected: `<= ${oal}` });
      }
      if (dia > 0 && shank > 0 && shank > dia * 2) {
        issues.push({ tool_id: t.id, field: "shank_diameter_mm", severity: "warning", message: "Shank > 2x cutting diameter", value: shank });
      }
      if (dia > 0 && loc > 0 && loc / dia > 8) {
        issues.push({ tool_id: t.id, field: "L/D_ratio", severity: "warning", message: `L/D=${(loc / dia).toFixed(1)} -- high deflection risk`, value: loc / dia });
      }

      if (t.cutting_data) {
        for (const [group, cd] of Object.entries(t.cutting_data)) {
          const data = cd as Record<string, unknown>;
          const vcMin = data.vc_min as number;
          const vcMax = data.vc_max as number;
          if (vcMin != null && vcMax != null && vcMin > vcMax) {
            issues.push({ tool_id: t.id, field: `cutting_data.${group}.vc`, severity: "error", message: "vc_min > vc_max", value: `${vcMin}-${vcMax}` });
          }
          if (vcMax != null && vcMax > 2000) {
            issues.push({ tool_id: t.id, field: `cutting_data.${group}.vc_max`, severity: "warning", message: "vc_max > 2000 m/min -- check units", value: vcMax });
          }
        }
      }
    }

    return {
      timestamp: new Date().toISOString(), total_tools: tools.length,
      valid: tools.length - new Set(issues.filter(i => i.severity === "error").map(i => i.tool_id)).size,
      issues_count: issues.length, issues,
    };
  }

  // ─── Action: holder_matrix ───────────────────────────────────────

  holderMatrix(tools: ToolLike[], options?: { taper_filter?: string }): HolderCompatibilityMatrix {
    const allHolders = this._getAllHolders(options?.taper_filter);
    const matches: HolderCompatibilityMatrix["matches"] = [];
    let matchedCount = 0;

    for (const t of tools) {
      const shank = t.physical?.shank_diameter_mm ?? 0;
      if (shank <= 0) continue;

      const compatible = this._findCompatibleHolders(shank, t.holder_interface, allHolders);
      const recommended = compatible.length > 0
        ? compatible.reduce((best, h) => h.compatibility_score > best.compatibility_score ? h : best).holder_id
        : null;

      matches.push({
        tool_id: t.id, tool_type: t.type ?? "unknown", shank_diameter_mm: shank,
        compatible_holders: compatible, recommended_holder: recommended,
      });
      if (compatible.length > 0) matchedCount++;
    }

    return {
      timestamp: new Date().toISOString(), total_tools: tools.length,
      total_holders: allHolders.length, matches,
      coverage_pct: tools.length > 0 ? Math.round((matchedCount / tools.length) * 1000) / 10 : 0,
    };
  }

  // ─── Action: summary ─────────────────────────────────────────────

  summary(tools: ToolLike[]): {
    total: number; with_cutting_data: number; with_taylor: number;
    with_geometry: number; avg_iso_groups: number; coverage_pct: number;
  } {
    let withCutting = 0, withTaylor = 0, withGeo = 0, totalIso = 0;

    for (const t of tools) {
      const cd = t.cutting_data;
      if (cd && Object.keys(cd).length > 0) {
        withCutting++;
        if (Object.values(cd).some((v: Record<string, unknown>) => v.taylor != null)) withTaylor++;
      }
      const geo = t.physical;
      if (geo && geo.cutting_diameter_mm > 0 && geo.overall_length_mm > 0) withGeo++;
      totalIso += (t.iso_groups?.length ?? 0);
    }

    return {
      total: tools.length, with_cutting_data: withCutting, with_taylor: withTaylor,
      with_geometry: withGeo,
      avg_iso_groups: tools.length > 0 ? Math.round((totalIso / tools.length) * 10) / 10 : 0,
      coverage_pct: tools.length > 0 ? Math.round((withCutting / tools.length) * 1000) / 10 : 0,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────

  private _auditFields(tool: ToolLike): EnrichField[] {
    const fields: EnrichField[] = [];
    const geo = tool.physical;

    fields.push({ field: "iso_groups", status: tool.iso_groups && tool.iso_groups.length > 0 ? "present" : "missing", value: tool.iso_groups });
    fields.push({ field: "cutting_data", status: tool.cutting_data && Object.keys(tool.cutting_data).length > 0 ? "present" : "missing" });
    fields.push({ field: "physical.cutting_diameter_mm", status: geo && geo.cutting_diameter_mm > 0 ? "present" : "missing", value: geo?.cutting_diameter_mm });
    fields.push({ field: "physical.overall_length_mm", status: geo && geo.overall_length_mm > 0 ? "present" : "missing", value: geo?.overall_length_mm });
    fields.push({ field: "physical.flute_length_mm", status: geo && geo.flute_length_mm > 0 ? "present" : "missing", value: geo?.flute_length_mm });
    fields.push({ field: "physical.shank_diameter_mm", status: geo && geo.shank_diameter_mm > 0 ? "present" : "missing", value: geo?.shank_diameter_mm });

    return fields;
  }

  private _inferISOGroups(tool: ToolLike): string[] {
    const substrate = (tool.material ?? tool.substrate ?? "").toLowerCase();
    // PCD/CBN/ceramic are material-specific (per InsertGradeSelectionEngine patterns)
    if (substrate === "pcd") return ["N"];
    if (substrate === "cbn") return ["H", "K"];
    if (substrate === "ceramic") return ["H", "K"];
    if (substrate === "hss" || substrate === "hss_cobalt") return ["P", "M", "K", "N"];

    const groups: string[] = ["P", "M", "K"];
    if (substrate === "carbide" || substrate === "cermet" || substrate === "indexable" || !substrate) {
      const coat = this._normalizeCoating(tool.coating);
      // DLC/diamond coatings are aluminum-friendly (per ToolCoatingSelectionEngine)
      if (coat === "dlc" || coat === "cvd-diamond" || coat === "pcd-diamond") groups.push("N");
    }
    return groups;
  }

  private _computeCuttingData(tool: ToolLike, group: ISOGroup): EnrichedCuttingData | null {
    const matEntry = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === group);
    if (!matEntry) return null;

    const substrate = (tool.material ?? tool.substrate ?? "carbide").toLowerCase();
    const coatingId = this._normalizeCoating(tool.coating);
    const subCorr = SUBSTRATE_CORRECTION[substrate] ?? 1.0;
    const speedMult = this._getCoatingSpeedMultiplier(coatingId);
    // Vc scaling uses sqrt(speedMult) — coatings enable higher speed but not linearly.
    // This is intentionally different from Taylor C (line ~573) which uses linear speedMult,
    // because Taylor C represents the theoretical max speed at T=1min, while Vc bounds
    // are conservative operational ranges. Source: Sandvik speed recommendation methodology.
    // Extended Taylor (variable speed, hardness, coolant, Weibull) handled by SpeedFeedOrchestratorEngine.
    const scaleFactor = subCorr * Math.sqrt(speedMult);

    let vcMin = Math.round(matEntry.vc_base_roughing * scaleFactor * 0.7);
    let vcMax = Math.round(matEntry.vc_base_finishing * scaleFactor * 1.1);

    // Per-ISO-group Vc ceiling — S/H groups physically cannot exceed 500 m/min
    // (titanium/Inconel/hardened steel). P/M/K/N allow higher speeds.
    const VC_MAX_BY_GROUP: Record<string, number> = { P: 2000, M: 1500, K: 2000, N: 2000, S: 500, H: 500 };
    const vcCeiling = VC_MAX_BY_GROUP[group] ?? 2000;
    vcMin = Math.max(5, Math.min(vcMin, vcCeiling));
    vcMax = Math.max(vcMin + 1, Math.min(vcMax, vcCeiling));

    const toolType = tool.type ?? "end_mill";
    const feedRanges = CANONICAL_FEED[toolType]?.[group] ?? CANONICAL_FEED.end_mill[group];

    const dia = tool.physical?.cutting_diameter_mm ?? 10;
    const loc = tool.physical?.flute_length_mm ?? dia * 2;

    return {
      vc_min: vcMin, vc_max: vcMax,
      fz_min: feedRanges.fz_min, fz_max: feedRanges.fz_max,
      ap_max: Math.round(Math.min(loc, dia * 1.5) * 10) / 10,
      ae_max: Math.round(dia * 0.5 * 10) / 10,
      confidence: this._cuttingDataConfidence(tool, group),
      source: "canonical",
    };
  }

  private _computeTaylor(tool: ToolLike, group: ISOGroup): TaylorCoefficients | null {
    const canonical = CANONICAL_TAYLOR[group];
    if (!canonical) return null;

    const substrate = (tool.material ?? tool.substrate ?? "carbide").toLowerCase();
    const coatingId = this._normalizeCoating(tool.coating);
    const subCorr = SUBSTRATE_CORRECTION[substrate] ?? 1.0;
    const speedMult = this._getCoatingSpeedMultiplier(coatingId);
    const cAdjusted = Math.round(canonical.C * subCorr * speedMult * 10) / 10;

    const matEntry = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === group);
    const vcMid = matEntry
      ? (matEntry.vc_base_roughing + matEntry.vc_base_finishing) / 2 * subCorr * Math.sqrt(speedMult)
      : cAdjusted * 0.5;

    const expectedLife = vcMid > 0 ? Math.round(Math.pow(cAdjusted / vcMid, 1 / canonical.n)) : 60;

    return {
      C_adjusted: cAdjusted, n: canonical.n,
      expected_life_min: Math.max(1, Math.min(expectedLife, 999)),
      coating_multiplier: speedMult, substrate_correction: subCorr,
      source: `CANONICAL_TAYLOR[${group}] adjusted for ${substrate}/${coatingId}`,
    };
  }

  /**
   * Get coating speed multiplier from CoatingRegistry (primary) or fallback table.
   * CoatingRegistry.sfc_factors.speed_multiplier is the canonical source.
   */
  private _getCoatingSpeedMultiplier(coatingId: string): number {
    // Primary: CoatingRegistry (100+ coatings with validated data)
    const entry = coatingRegistry.get(coatingId) as CoatingEntry | undefined;
    if (entry?.sfc_factors?.speed_multiplier) {
      return entry.sfc_factors.speed_multiplier;
    }
    // Fallback: static table (for when registry not loaded or coating not found)
    return FALLBACK_COATING_SPEED[coatingId] ?? FALLBACK_COATING_SPEED.TiAlN ?? 1.5;
  }

  private _normalizeCoating(coating: unknown): string {
    if (!coating) return "uncoated";
    const str = typeof coating === "string" ? coating : (coating as { type?: string }).type ?? "";
    const lo = str.toLowerCase().trim();
    if (!lo || lo === "none") return "uncoated";
    // Map to CoatingRegistry IDs (which use lowercase identifiers)
    if (lo.includes("tialn") || lo.includes("ti-al-n")) return "tialn";
    if (lo.includes("altin") || lo.includes("al-ti-n")) return "altin";
    if (lo.includes("alcrn")) return "alcrn";
    if (lo.includes("ticn") && lo.includes("al2o3")) return "cvd-ticn-al2o3";
    if (lo.includes("ticn") && lo.includes("cvd")) return "ticn-cvd";
    if (lo.includes("ticn")) return "ticn-pvd";
    if (lo.includes("tin")) return "tin";
    if (lo.includes("naco")) return "tialn"; // nACo is a TiAlN nanocomposite trade name
    if (lo.includes("dlc")) return "dlc";
    if (lo.includes("diamond") && lo.includes("cvd")) return "cvd-diamond";
    if (lo.includes("diamond") || lo.includes("pcd")) return "pcd-diamond";
    if (lo.includes("tiger") || lo.includes("gold")) return "cvd-ticn-al2o3"; // Tiger-tec is CVD multi-layer
    if (lo.includes("al2o3") || lo.includes("alumina")) return "cvd-al2o3";
    if (lo.includes("pvd") && lo.includes("multi")) return "tialn"; // Most PVD multi-layer is TiAlN-based
    // Direct match against CoatingRegistry entry IDs
    const regEntry = coatingRegistry.get(lo) as CoatingEntry | undefined;
    if (regEntry) return lo;
    return "tialn"; // Default: most common modern coating
  }

  /** Estimate OAL. Source: ISO 7388, manufacturer catalog averages. */
  private _estimateOAL(type: string, diameter: number): number {
    switch (type) {
      case "drill": return Math.round(diameter * 8 + 14);
      case "end_mill": case "ball_mill": case "bull_mill": case "slot_drill": case "chamfer_mill":
        if (diameter <= 3) return 38; if (diameter <= 6) return 50; if (diameter <= 10) return 72;
        if (diameter <= 16) return 92; if (diameter <= 20) return 104;
        return Math.round(diameter * 4.5 + 20);
      case "face_mill": return Math.round(diameter * 0.8 + 40);
      case "reamer": return Math.round(diameter * 10 + 20);
      case "tap": return Math.round(diameter * 5 + 40);
      default: return Math.round(diameter * 5 + 20);
    }
  }

  /** Estimate LOC (flute length). Source: Sandvik/Kennametal standard series. */
  private _estimateLOC(type: string, diameter: number): number {
    switch (type) {
      case "drill": return Math.round(diameter * 5);
      case "end_mill": case "ball_mill": case "bull_mill": case "slot_drill": case "chamfer_mill":
        return Math.round(diameter * 2);
      case "face_mill": return Math.round(diameter * 0.15 + 2);
      case "reamer": return Math.round(diameter * 3);
      case "tap": return Math.round(diameter * 2.5);
      default: return Math.round(diameter * 2);
    }
  }

  /** Estimate shank diameter. */
  private _estimateShank(type: string, diameter: number): number {
    if (type === "face_mill" || type === "boring_bar") return diameter;
    if (diameter <= 20) return diameter;
    if (diameter <= 32) return 25;
    return 32;
  }

  private _cuttingDataConfidence(tool: ToolLike, group: string): number {
    let confidence = 0.60;
    if (tool.iso_groups?.includes(group)) confidence += 0.10;
    const premiumMfgs = ["Sandvik", "Kennametal", "ISCAR", "Seco", "Walter", "Mitsubishi", "SGS", "OSG", "Tungaloy"];
    if (premiumMfgs.some(m => (tool.manufacturer ?? "").includes(m))) confidence += 0.10;
    if (tool.coating) confidence += 0.05;
    const substrate = (tool.material ?? tool.substrate ?? "").toLowerCase();
    if ((group === "S" || group === "H") && (substrate === "hss" || substrate === "hss_cobalt")) confidence -= 0.15;
    return Math.round(Math.max(0.30, Math.min(0.95, confidence)) * 100) / 100;
  }

  private _getAllHolders(taperFilter?: string): Array<ToolHolderSpec & { bore_min?: number; bore_max?: number }> {
    const holders: Array<ToolHolderSpec & { bore_min?: number; bore_max?: number }> = [];

    // ER collets have known bore ranges (DIN 6499)
    for (const [id, range] of Object.entries(ER_CAPACITY)) {
      const spec = toolHolderDatabaseEngine.get(id);
      if (spec && (!taperFilter || id.toLowerCase().includes(taperFilter.toLowerCase()))) {
        holders.push({ ...spec, bore_min: range[0], bore_max: range[1] });
      }
    }

    // Other holders from ToolHolderDatabaseEngine
    const allTypes = toolHolderDatabaseEngine.getTypes();
    for (const type of allTypes) {
      for (const h of toolHolderDatabaseEngine.listByType(type)) {
        if (taperFilter && !h.id.toLowerCase().includes(taperFilter.toLowerCase())) continue;
        if (holders.some(existing => existing.id === h.id)) continue;
        const cr = (h as unknown as { capacity_range?: [number, number] }).capacity_range;
        if (cr) holders.push({ ...h, bore_min: cr[0], bore_max: cr[1] });
        else holders.push(h);
      }
    }
    return holders;
  }

  private _findCompatibleHolders(
    shankDiameter: number, preferredInterface: string | undefined,
    allHolders: Array<ToolHolderSpec & { bore_min?: number; bore_max?: number }>,
  ): HolderMatch[] {
    const matches: HolderMatch[] = [];

    for (const h of allHolders) {
      if (h.bore_min == null || h.bore_max == null) continue;
      if (shankDiameter < h.bore_min || shankDiameter > h.bore_max) continue;

      let score = 50;
      const notes: string[] = [];

      // Bore fit quality (tighter = better concentricity)
      const boreRange = h.bore_max - h.bore_min;
      const fitPosition = boreRange > 0 ? (shankDiameter - h.bore_min) / boreRange : 0.5;
      if (fitPosition > 0.3 && fitPosition < 0.7) { score += 15; notes.push("optimal bore fit"); }
      else { score += 5; notes.push("within bore range"); }

      // Preferred interface match
      if (preferredInterface && h.id.toLowerCase().includes(preferredInterface.toLowerCase())) {
        score += 20; notes.push("matches declared interface");
      }
      // High-speed capability
      if (h.max_rpm >= 20000) { score += 5; notes.push(`high speed: ${h.max_rpm} RPM`); }
      // Precision holder types (per BIG DAISHOWA/Haimer recommendations)
      if (h.type === "shrink_fit" || h.type === "hydraulic") { score += 10; notes.push("precision holder"); }
      if (h.type === "er_collet" || h.type === "collet_chuck") { score += 5; notes.push("collet chuck"); }

      matches.push({
        holder_id: h.id, holder_type: h.type, taper: h.taper ?? h.id,
        max_rpm: h.max_rpm, compatibility_score: Math.min(100, score), notes,
      });
    }

    return matches.sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 10);
  }
}

export const toolEnrichmentEngine = new ToolEnrichmentEngine();
