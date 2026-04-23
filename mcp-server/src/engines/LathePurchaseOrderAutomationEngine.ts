/**
 * LathePurchaseOrderAutomationEngine — U-LTH52 (LATHE-MASTER P5 ERP)
 *
 * Generates purchase-order line items from job requirements:
 *   - Material stock (computed from QuotePackage.evidence: OD/length/density)
 *   - Tooling (inserts, drills, threading tools by ISO group)
 *   - Consumables (coolant concentrate, chip-pan liners, fasteners)
 *
 * Behavior:
 *   1. Read job requirements (job_id, quote, quantity, on_hand inventory)
 *   2. Compute required quantities with scrap allowance
 *   3. Subtract on-hand inventory (if provided) — only short items emit PO lines
 *   4. Split by preferred vendor per category (configurable catalog override)
 *   5. Compute line totals (qty × unit_cost) with EOQ-aware suggest_qty
 *   6. Aggregate into PO drafts — one PO per vendor
 *
 * Physics:
 *   - Required mass kg = (π/4)(OD² − ID²) · L · density_kg_m³ · (1 + scrap)
 *   - EOQ = √(2·D·S / H) where D=annual demand, S=order cost, H=holding cost/unit
 *
 * Citations:
 *   - Machinery's Handbook 31st (material density by ISO group)
 *   - Kennametal / Sandvik insert grade recommendations by ISO group
 *   - Harris EOQ formula (1913)
 *
 * @milestone LATHE-MASTER U-LTH52
 * @version 1.0.0
 */

import { z } from "zod";
import { CANONICAL_MATERIAL_DB, type ISOGroup } from "../physics/constants.js";
import type { QuotePackage } from "./LatheAutoQuoteFromPrintEngine.js";

// ============================================================================
// VENDOR / CATEGORY CATALOG
// ============================================================================

export const VENDOR_DEFAULTS = {
  material: { vendor: "Ryerson", lead_time_days: 5 },
  insert_carbide: { vendor: "Kennametal", lead_time_days: 3 },
  insert_ceramic: { vendor: "Sandvik", lead_time_days: 7 },
  drill: { vendor: "Guhring", lead_time_days: 4 },
  thread_tap: { vendor: "OSG", lead_time_days: 5 },
  coolant: { vendor: "Castrol", lead_time_days: 2 },
  workholding: { vendor: "Dillon", lead_time_days: 10 },
} as const;

export type POCategory = keyof typeof VENDOR_DEFAULTS;

/** Insert grade recommendations by ISO group. */
const INSERT_BY_ISO: Record<ISOGroup, { grade: string; unit_cost_usd: number }> = {
  P: { grade: "KCU10 PVD-coated carbide", unit_cost_usd: 12 },
  M: { grade: "KCU40 PVD-coated carbide (SS)", unit_cost_usd: 15 },
  K: { grade: "KCK20 CVD-coated cast iron grade", unit_cost_usd: 11 },
  N: { grade: "KC5010 uncoated polished (AL)", unit_cost_usd: 14 },
  S: { grade: "KC5525 Ceramic (superalloy)", unit_cost_usd: 40 },
  H: { grade: "CBN KB9610 (hard turning)", unit_cost_usd: 90 },
};

// ============================================================================
// CONSTANTS
// ============================================================================

const SCRAP_ALLOWANCE_BY_ISO: Record<ISOGroup, number> = {
  P: 0.20, M: 0.20, K: 0.20, N: 0.15, S: 0.25, H: 0.25,
};

/** Density (kg/m³) fallback by ISO group when material name not in DB. */
const ISO_DENSITY_DEFAULT: Record<ISOGroup, number> = {
  P: 7850, M: 8000, K: 7200, N: 2700, S: 4430, H: 7800,
};

/** Inserts consumed per hour of cutting, by ISO group (rough average). */
const INSERTS_PER_CUT_HOUR_BY_ISO: Record<ISOGroup, number> = {
  P: 0.4, M: 0.6, K: 0.3, N: 0.2, S: 1.2, H: 0.8,
};

const MATERIAL_PRICE_USD_PER_KG: Record<ISOGroup, number> = {
  P: 2.5, M: 6.0, K: 1.5, N: 3.5, S: 45.0, H: 4.0,
};

/** EOQ inputs default. */
const ANNUAL_DEMAND_ASSUMED_RUNS = 12;
const ORDER_COST_USD = 50;
const HOLDING_COST_FRACTION = 0.2; // 20% of unit cost per year

// ============================================================================
// SCHEMAS
// ============================================================================

export const InventoryOnHandSchema = z.object({
  material_kg: z.number().min(0).finite().default(0),
  // ISO keys are optional; any subset of P/M/K/N/S/H may be provided.
  inserts_by_iso: z
    .object({
      P: z.number().min(0).optional(),
      M: z.number().min(0).optional(),
      K: z.number().min(0).optional(),
      N: z.number().min(0).optional(),
      S: z.number().min(0).optional(),
      H: z.number().min(0).optional(),
    })
    .default({}),
  coolant_gallons: z.number().min(0).finite().default(0),
});
export type InventoryOnHand = z.infer<typeof InventoryOnHandSchema>;

export const BuildPOInputSchema = z.object({
  job_id: z.string().min(1),
  quote: z.any(), // QuotePackage — structural check in-code
  on_hand: InventoryOnHandSchema.optional(),
  vendor_overrides: z.record(z.string(), z.string()).optional(),
});
export type BuildPOInput = z.infer<typeof BuildPOInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface POLine {
  category: POCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost_usd: number;
  line_total_usd: number;
  suggest_eoq: number;
  iso_group?: ISOGroup;
  notes?: string;
}

export interface PODraft {
  po_id: string;
  vendor: string;
  lead_time_days: number;
  lines: POLine[];
  total_usd: number;
  required_by_iso: string;
}

export interface BuildPOResult {
  job_id: string;
  generated_at: string;
  quote_id: string;
  inventory_shortage: {
    material_kg: number;
    inserts: Array<{ iso_group: string; shortage: number }>;
    coolant_gallons: number;
  };
  pos: PODraft[];
  aggregate_total_usd: number;
  aggregate_lead_time_days: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePurchaseOrderAutomationEngine {
  /**
   * Build PO drafts from a job's requirements.
   * Only items short of inventory become PO lines.
   */
  build(input: BuildPOInput): BuildPOResult {
    const parsed = BuildPOInputSchema.parse(input);
    const quote = parsed.quote as QuotePackage;
    this.structuralCheck(quote);

    const iso = quote.evidence.iso_group as ISOGroup;
    const onHand: InventoryOnHand = parsed.on_hand ?? {
      material_kg: 0,
      inserts_by_iso: {},
      coolant_gallons: 0,
    };

    // --- Material requirement with scrap ---
    const scrap = SCRAP_ALLOWANCE_BY_ISO[iso];
    const requiredMaterialKg = quote.evidence.stock_mass_kg * quote.quantity * (1 + scrap);
    const materialShortage = Math.max(0, requiredMaterialKg - onHand.material_kg);

    // --- Insert requirement from cycle time ---
    const cycleHours = (quote.evidence.total_cycle_min * quote.quantity) / 60;
    const requiredInserts = Math.ceil(cycleHours * INSERTS_PER_CUT_HOUR_BY_ISO[iso]);
    const onHandInserts = onHand.inserts_by_iso?.[iso] ?? 0;
    const insertShortage = Math.max(0, requiredInserts - onHandInserts);

    // --- Coolant consumption (0.05 gal/cycle-hr heuristic) ---
    const requiredCoolantGal = Math.ceil(cycleHours * 0.05);
    const coolantShortage = Math.max(0, requiredCoolantGal - onHand.coolant_gallons);

    const poDrafts = new Map<string, PODraft>();

    if (materialShortage > 0) {
      this.addLine(poDrafts, parsed.vendor_overrides, "material", {
        category: "material",
        description: this.describeMaterial(quote.evidence.material_name, iso),
        quantity: round2(materialShortage),
        unit: "kg",
        unit_cost_usd: MATERIAL_PRICE_USD_PER_KG[iso],
        line_total_usd: round2(materialShortage * MATERIAL_PRICE_USD_PER_KG[iso]),
        suggest_eoq: this.computeEOQ(materialShortage * ANNUAL_DEMAND_ASSUMED_RUNS, MATERIAL_PRICE_USD_PER_KG[iso]),
        iso_group: iso,
      });
    }

    if (insertShortage > 0) {
      const insertInfo = INSERT_BY_ISO[iso];
      const category: POCategory = iso === "S" ? "insert_ceramic" : "insert_carbide";
      this.addLine(poDrafts, parsed.vendor_overrides, category, {
        category,
        description: insertInfo.grade,
        quantity: insertShortage,
        unit: "inserts",
        unit_cost_usd: insertInfo.unit_cost_usd,
        line_total_usd: round2(insertShortage * insertInfo.unit_cost_usd),
        suggest_eoq: this.computeEOQ(insertShortage * ANNUAL_DEMAND_ASSUMED_RUNS, insertInfo.unit_cost_usd),
        iso_group: iso,
      });
    }

    if (coolantShortage > 0) {
      this.addLine(poDrafts, parsed.vendor_overrides, "coolant", {
        category: "coolant",
        description: "Semi-synthetic water-soluble coolant concentrate",
        quantity: coolantShortage,
        unit: "gallons",
        unit_cost_usd: 35,
        line_total_usd: round2(coolantShortage * 35),
        suggest_eoq: this.computeEOQ(coolantShortage * ANNUAL_DEMAND_ASSUMED_RUNS, 35),
      });
    }

    const pos = Array.from(poDrafts.values());
    pos.forEach((po) => {
      po.total_usd = round2(po.lines.reduce((s, l) => s + l.line_total_usd, 0));
    });

    const aggregateTotal = round2(pos.reduce((s, p) => s + p.total_usd, 0));
    const aggregateLead = pos.reduce((m, p) => Math.max(m, p.lead_time_days), 0);

    return {
      job_id: parsed.job_id,
      generated_at: new Date().toISOString(),
      quote_id: quote.quote_id,
      inventory_shortage: {
        material_kg: round2(materialShortage),
        inserts: insertShortage > 0 ? [{ iso_group: iso, shortage: insertShortage }] : [],
        coolant_gallons: coolantShortage,
      },
      pos,
      aggregate_total_usd: aggregateTotal,
      aggregate_lead_time_days: aggregateLead,
    };
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private structuralCheck(quote: QuotePackage): void {
    if (!quote || typeof quote !== "object") {
      throw new Error("LathePurchaseOrderAutomationEngine: quote missing");
    }
    if (!quote.evidence) {
      throw new Error("LathePurchaseOrderAutomationEngine: quote.evidence missing");
    }
    if (!["P", "M", "K", "N", "S", "H"].includes(quote.evidence.iso_group)) {
      throw new Error(`LathePurchaseOrderAutomationEngine: invalid iso_group ${quote.evidence.iso_group}`);
    }
    if (!Number.isFinite(quote.evidence.stock_mass_kg) || quote.evidence.stock_mass_kg <= 0) {
      throw new Error("LathePurchaseOrderAutomationEngine: stock_mass_kg must be positive and finite");
    }
  }

  private describeMaterial(name: string, iso: ISOGroup): string {
    const entry = CANONICAL_MATERIAL_DB[name];
    const density = entry?.density_kg_m3 ?? ISO_DENSITY_DEFAULT[iso];
    return `${name} bar stock (ISO ${iso}, ρ ${density} kg/m³)`;
  }

  private addLine(
    map: Map<string, PODraft>,
    overrides: Record<string, string> | undefined,
    category: POCategory,
    line: POLine,
  ): void {
    const defaults = VENDOR_DEFAULTS[category];
    const vendor = overrides?.[category] ?? defaults.vendor;
    const key = vendor;
    let po = map.get(key);
    if (!po) {
      po = {
        po_id: `PO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${vendor.replace(/\s+/g, "_")}`,
        vendor,
        lead_time_days: defaults.lead_time_days,
        lines: [],
        total_usd: 0,
        required_by_iso: new Date(Date.now() + defaults.lead_time_days * 86_400_000).toISOString(),
      };
      map.set(key, po);
    }
    // Keep the longest lead time across categories for the vendor (conservative)
    po.lead_time_days = Math.max(po.lead_time_days, defaults.lead_time_days);
    po.lines.push(line);
  }

  /**
   * Harris EOQ formula: sqrt(2·D·S / H). Returns 0 when inputs are degenerate.
   * D = annual demand (units), S = ORDER_COST_USD, H = HOLDING_COST_FRACTION · unit_cost.
   */
  private computeEOQ(annualDemand: number, unitCost: number): number {
    if (annualDemand <= 0 || unitCost <= 0) return 0;
    const h = HOLDING_COST_FRACTION * unitCost;
    if (h <= 0) return 0;
    const eoq = Math.sqrt((2 * annualDemand * ORDER_COST_USD) / h);
    return Math.ceil(eoq);
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const lathePurchaseOrderAutomationEngine = new LathePurchaseOrderAutomationEngine();
export { LathePurchaseOrderAutomationEngine };
