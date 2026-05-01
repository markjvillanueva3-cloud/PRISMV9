/**
 * StockWorkholdingCatalogEngine — U-CAMTEST06
 * ============================================
 *
 * PHASE-8: 100 stock + workholding setups derived as the cross-product of
 * the 20 fixture parts (U-CAMTEST05) × 5 material/form templates. Each
 * setup tells the in-host runner what raw stock to spawn and how to clamp
 * it — the in-host runners then synthesize the actual stock body and a
 * matching workholding fixture using their native CAD API.
 *
 * Material/form templates (one per stock slot per part):
 *   slot A — 6061-T6      plate         (machinist vise, steel jaws)
 *   slot B — 1018-CRS     plate         (machinist vise, steel jaws)
 *   slot C — D2 tool-steel billet       (machinist vise, hardened jaws)
 *   slot D — Inconel-718  billet        (machinist vise, hardened jaws)
 *   slot E — UHMW         plate         (vise with soft jaws)
 *
 * Stock envelope = part envelope + per-template margin (per side). The
 * generator runs deterministically at module load; the catalog is frozen
 * with a duplicate-id guard.
 *
 * @module engines/StockWorkholdingCatalogEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST06
 */

import { z } from "zod";
import {
  FixturePartCatalogEngine,
  FixturePartDescriptorSchema,
  type FixturePartDescriptor,
} from "./FixturePartCatalogEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const StockMaterialSlotSchema = z.enum([
  "alu_6061_t6",
  "steel_1018_crs",
  "tool_steel_d2",
  "inconel_718",
  "polymer_uhmw",
]);
export type StockMaterialSlot = z.infer<typeof StockMaterialSlotSchema>;

export const StockFormSchema = z.enum([
  "plate",
  "bar",
  "billet",
  "casting",
  "extrusion",
]);
export type StockForm = z.infer<typeof StockFormSchema>;

export const WorkholdingKindSchema = z.enum([
  "machinist_vise",
  "soft_jaw_vise",
  "lathe_chuck_3jaw",
  "lathe_chuck_6jaw",
  "fixture_plate",
  "v_block",
  "custom_soft_jaws",
]);
export type WorkholdingKind = z.infer<typeof WorkholdingKindSchema>;

export const JawTypeSchema = z.enum([
  "steel_serrated",
  "steel_smooth",
  "hardened_grippy",
  "aluminum_soft",
  "machinable_soft",
]);
export type JawType = z.infer<typeof JawTypeSchema>;

export const WorkholdingSchema = z.object({
  kind: WorkholdingKindSchema,
  jaw_type: JawTypeSchema,
  clamp_mm: z.number().nonnegative(),
  notes: z.string().optional(),
});
export type Workholding = z.infer<typeof WorkholdingSchema>;

export const StockEnvelopeMmSchema = z.object({
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  margin_per_side_mm: z.number().nonnegative(),
});
export type StockEnvelopeMm = z.infer<typeof StockEnvelopeMmSchema>;

export const StockSetupDescriptorSchema = z.object({
  stock_id: z.string().min(1).regex(/^[a-z0-9_]+$/, "stock_id must be snake_case"),
  part_id: z.string().min(1),
  slot: z.enum(["A", "B", "C", "D", "E"]),
  material_slot: StockMaterialSlotSchema,
  form: StockFormSchema,
  envelope: StockEnvelopeMmSchema,
  workholding: WorkholdingSchema,
  notes: z.string().optional(),
});
export type StockSetupDescriptor = z.infer<typeof StockSetupDescriptorSchema>;

// ── Templates ────────────────────────────────────────────────────────────────

interface StockTemplate {
  slot: "A" | "B" | "C" | "D" | "E";
  material_slot: StockMaterialSlot;
  form: StockForm;
  margin_per_side_mm: number;
  workholding: Workholding;
}

const STOCK_TEMPLATES: readonly StockTemplate[] = Object.freeze([
  {
    slot: "A",
    material_slot: "alu_6061_t6",
    form: "plate",
    margin_per_side_mm: 5,
    workholding: {
      kind: "machinist_vise",
      jaw_type: "steel_smooth",
      clamp_mm: 25,
      notes: "6061-T6 plate, generic 6\" machinist vise with smooth steel jaws.",
    },
  },
  {
    slot: "B",
    material_slot: "steel_1018_crs",
    form: "plate",
    margin_per_side_mm: 5,
    workholding: {
      kind: "machinist_vise",
      jaw_type: "steel_serrated",
      clamp_mm: 25,
      notes: "1018 CRS plate, serrated jaws for grip on harder stock.",
    },
  },
  {
    slot: "C",
    material_slot: "tool_steel_d2",
    form: "billet",
    margin_per_side_mm: 8,
    workholding: {
      kind: "machinist_vise",
      jaw_type: "hardened_grippy",
      clamp_mm: 30,
      notes: "D2 billet allowance for grind allowance + hardening distortion.",
    },
  },
  {
    slot: "D",
    material_slot: "inconel_718",
    form: "billet",
    margin_per_side_mm: 6,
    workholding: {
      kind: "machinist_vise",
      jaw_type: "hardened_grippy",
      clamp_mm: 30,
      notes: "Inconel 718 billet — hardened jaws to resist work-hardening of slips.",
    },
  },
  {
    slot: "E",
    material_slot: "polymer_uhmw",
    form: "plate",
    margin_per_side_mm: 4,
    workholding: {
      kind: "soft_jaw_vise",
      jaw_type: "machinable_soft",
      clamp_mm: 20,
      notes: "UHMW deflects under steel jaws — machined soft jaws preserve surface.",
    },
  },
]);

// ── Generator ────────────────────────────────────────────────────────────────

function materialShort(slot: StockMaterialSlot): string {
  switch (slot) {
    case "alu_6061_t6":   return "6061";
    case "steel_1018_crs": return "1018";
    case "tool_steel_d2":  return "d2";
    case "inconel_718":    return "inconel718";
    case "polymer_uhmw":   return "uhmw";
  }
}

function generateStockSetup(part: FixturePartDescriptor, tpl: StockTemplate): StockSetupDescriptor {
  const margin = tpl.margin_per_side_mm;
  const env: StockEnvelopeMm = {
    length_mm: part.envelope_mm.length_mm + margin * 2,
    width_mm:  part.envelope_mm.width_mm  + margin * 2,
    height_mm: part.envelope_mm.height_mm + margin * 2,
    margin_per_side_mm: margin,
  };
  const stock_id = `stock_${part.part_id}_${materialShort(tpl.material_slot)}`;
  const setup: StockSetupDescriptor = {
    stock_id,
    part_id: part.part_id,
    slot: tpl.slot,
    material_slot: tpl.material_slot,
    form: tpl.form,
    envelope: env,
    workholding: tpl.workholding,
    notes: `Generated from ${part.part_id} × slot ${tpl.slot} (${tpl.material_slot}).`,
  };
  return setup;
}

function buildCatalog(): { byId: Map<string, StockSetupDescriptor>; ordered: readonly StockSetupDescriptor[] } {
  const byId = new Map<string, StockSetupDescriptor>();
  const ordered: StockSetupDescriptor[] = [];
  for (const part of FixturePartCatalogEngine.list()) {
    // Cross-validate the part with the same schema we depend on, in case the
    // upstream catalog was extended without re-running its self-audit.
    FixturePartDescriptorSchema.parse(part);
    for (const tpl of STOCK_TEMPLATES) {
      const setup = StockSetupDescriptorSchema.parse(generateStockSetup(part, tpl));
      if (byId.has(setup.stock_id)) {
        throw new Error(`StockWorkholdingCatalog: duplicate stock_id "${setup.stock_id}"`);
      }
      Object.freeze(setup.envelope);
      Object.freeze(setup.workholding);
      Object.freeze(setup);
      byId.set(setup.stock_id, setup);
      ordered.push(setup);
    }
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class StockWorkholdingCatalogEngine {
  static readonly EXPECTED_TOTAL = 100;
  static readonly STOCK_TEMPLATES = STOCK_TEMPLATES;

  /** All setups in declaration order (defensive copy). */
  static list(): StockSetupDescriptor[] {
    return CATALOG_ORDERED.map(s => s);
  }

  /** Setups for one part (5 expected — one per slot). */
  static listByPart(part_id: string): StockSetupDescriptor[] {
    return CATALOG_ORDERED.filter(s => s.part_id === part_id);
  }

  /** Setups using one material slot (20 expected — one per part). */
  static listByMaterial(slot: StockMaterialSlot): StockSetupDescriptor[] {
    const m = StockMaterialSlotSchema.parse(slot);
    return CATALOG_ORDERED.filter(s => s.material_slot === m);
  }

  /** Setups using one stock form. */
  static listByForm(form: StockForm): StockSetupDescriptor[] {
    const f = StockFormSchema.parse(form);
    return CATALOG_ORDERED.filter(s => s.form === f);
  }

  /** Lookup by id; null when unknown. */
  static get(stock_id: string): StockSetupDescriptor | null {
    return CATALOG_BY_ID.get(stock_id) ?? null;
  }

  /** Throws when unknown. */
  static mustGet(stock_id: string): StockSetupDescriptor {
    const s = CATALOG_BY_ID.get(stock_id);
    if (!s) throw new Error(`StockWorkholdingCatalog: unknown stock_id "${stock_id}"`);
    return s;
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static countByMaterial(): Record<StockMaterialSlot, number> {
    const out: Record<string, number> = {
      alu_6061_t6: 0, steel_1018_crs: 0, tool_steel_d2: 0,
      inconel_718: 0, polymer_uhmw: 0,
    };
    for (const s of CATALOG_ORDERED) out[s.material_slot] += 1;
    return out as Record<StockMaterialSlot, number>;
  }

  static countByForm(): Record<StockForm, number> {
    const out: Record<string, number> = {
      plate: 0, bar: 0, billet: 0, casting: 0, extrusion: 0,
    };
    for (const s of CATALOG_ORDERED) out[s.form] += 1;
    return out as Record<StockForm, number>;
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== StockWorkholdingCatalogEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${StockWorkholdingCatalogEngine.EXPECTED_TOTAL} stock setups, got ${CATALOG_ORDERED.length}`);
    }
    const partsCount = FixturePartCatalogEngine.count();
    const slotsPerPart = STOCK_TEMPLATES.length;
    if (CATALOG_ORDERED.length !== partsCount * slotsPerPart) {
      errors.push(`product mismatch: ${partsCount} parts × ${slotsPerPart} slots ≠ ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const s of CATALOG_ORDERED) {
      if (ids.has(s.stock_id)) errors.push(`duplicate stock_id "${s.stock_id}"`);
      ids.add(s.stock_id);
    }
    // Every part must have exactly STOCK_TEMPLATES.length setups.
    const perPart = new Map<string, number>();
    for (const s of CATALOG_ORDERED) perPart.set(s.part_id, (perPart.get(s.part_id) ?? 0) + 1);
    for (const [pid, n] of perPart) {
      if (n !== slotsPerPart) errors.push(`part ${pid} has ${n} setups, expected ${slotsPerPart}`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const stockWorkholdingCatalogEngine = StockWorkholdingCatalogEngine;
