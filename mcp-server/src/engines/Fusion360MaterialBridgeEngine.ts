/**
 * Fusion360MaterialBridgeEngine — Bridge Fusion 360 material library to PRISM physics
 *
 * Maps Fusion 360 material library entries to:
 *   - ISO material groups (P, M, K, N, S, H)
 *   - Kienzle coefficients (kc1.1, mc) sourced from CANONICAL_KIENZLE
 *   - Common shop-floor properties (hardness, density, tensile, yield)
 *
 * Sister engine: MastercamMaterialBridgeEngine (same shape, Fusion catalog).
 *
 * @module engines/Fusion360MaterialBridgeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-MAT-01
 */

import { z } from "zod";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ISOGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]);
export type ISOGroup = z.infer<typeof ISOGroupSchema>;

export const Fusion360MaterialSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, "id must be snake_case"),
  display_name: z.string().min(1),
  fusion_class: z.string().min(1),
  iso_group: ISOGroupSchema,
  hardness_hb: z.number().positive().optional(),
  hardness_hrc: z.number().optional(),
  density_kg_m3: z.number().positive(),
  tensile_strength_mpa: z.number().positive(),
  yield_strength_mpa: z.number().positive(),
  elongation_pct: z.number().min(0),
  notes: z.string().optional(),
});
export type Fusion360Material = z.infer<typeof Fusion360MaterialSchema>;

export const KienzleCoefficientsSchema = z.object({
  kc1_1: z.number().positive(),
  mc: z.number().positive(),
  source: z.string().min(1),
});
export type KienzleCoefficients = z.infer<typeof KienzleCoefficientsSchema>;

// ── Material catalog (24 entries) ───────────────────────────────────────────

const CATALOG_RAW: Fusion360Material[] = [
  // ── Aluminum (N) ──
  { id: "aluminum_6061_t6", display_name: "Aluminum 6061-T6", fusion_class: "Aluminum, 6061", iso_group: "N", hardness_hb: 95, density_kg_m3: 2700, tensile_strength_mpa: 310, yield_strength_mpa: 276, elongation_pct: 12, notes: "Most common workshop alu. T6 temper after solution heat-treat + artificial age." },
  { id: "aluminum_7075_t6", display_name: "Aluminum 7075-T6", fusion_class: "Aluminum, 7075", iso_group: "N", hardness_hb: 150, density_kg_m3: 2810, tensile_strength_mpa: 572, yield_strength_mpa: 503, elongation_pct: 11, notes: "Aerospace grade, harder than 6061; runs hot in finishing." },
  { id: "aluminum_2024_t3", display_name: "Aluminum 2024-T3", fusion_class: "Aluminum, 2024", iso_group: "N", hardness_hb: 120, density_kg_m3: 2780, tensile_strength_mpa: 483, yield_strength_mpa: 345, elongation_pct: 18 },

  // ── Steel (P) ──
  { id: "steel_1018_crs", display_name: "1018 Cold Rolled Steel", fusion_class: "Steel, Carbon, 1018", iso_group: "P", hardness_hb: 126, density_kg_m3: 7870, tensile_strength_mpa: 440, yield_strength_mpa: 370, elongation_pct: 15, notes: "Free-machining structural steel. Rusts easily — store oiled." },
  { id: "steel_1045", display_name: "1045 Medium Carbon Steel", fusion_class: "Steel, Carbon, 1045", iso_group: "P", hardness_hb: 170, density_kg_m3: 7870, tensile_strength_mpa: 565, yield_strength_mpa: 310, elongation_pct: 16 },
  { id: "steel_4140_ph", display_name: "4140 Pre-Hardened Steel", fusion_class: "Steel, Alloy, 4140", iso_group: "P", hardness_hb: 285, hardness_hrc: 30, density_kg_m3: 7850, tensile_strength_mpa: 980, yield_strength_mpa: 855, elongation_pct: 17, notes: "Pre-hardened for through-hardening capability after machining." },
  { id: "steel_a36", display_name: "A36 Structural Steel", fusion_class: "Steel, Carbon, A36", iso_group: "P", hardness_hb: 119, density_kg_m3: 7850, tensile_strength_mpa: 400, yield_strength_mpa: 250, elongation_pct: 23 },

  // ── Stainless (M) ──
  { id: "stainless_304", display_name: "Stainless 304", fusion_class: "Steel, Stainless, 304", iso_group: "M", hardness_hb: 201, density_kg_m3: 8000, tensile_strength_mpa: 505, yield_strength_mpa: 215, elongation_pct: 70, notes: "Work-hardens aggressively — keep tool engaged with positive feed." },
  { id: "stainless_316", display_name: "Stainless 316", fusion_class: "Steel, Stainless, 316", iso_group: "M", hardness_hb: 217, density_kg_m3: 8000, tensile_strength_mpa: 580, yield_strength_mpa: 290, elongation_pct: 50, notes: "Marine grade. Same machining behavior as 304 with slightly more difficulty." },
  { id: "stainless_17_4ph", display_name: "Stainless 17-4 PH", fusion_class: "Steel, Stainless, 17-4 PH", iso_group: "M", hardness_hb: 363, hardness_hrc: 38, density_kg_m3: 7800, tensile_strength_mpa: 1170, yield_strength_mpa: 1070, elongation_pct: 14 },

  // ── Cast Iron (K) ──
  { id: "cast_iron_gray_g3000", display_name: "Gray Cast Iron G3000", fusion_class: "Iron, Cast, Gray, G3000", iso_group: "K", hardness_hb: 200, density_kg_m3: 7100, tensile_strength_mpa: 200, yield_strength_mpa: 175, elongation_pct: 1, notes: "Brittle; chips do NOT need cutting fluid (graphite is self-lubricating)." },
  { id: "cast_iron_ductile_65_45_12", display_name: "Ductile Iron 65-45-12", fusion_class: "Iron, Cast, Ductile, 65-45-12", iso_group: "K", hardness_hb: 200, density_kg_m3: 7100, tensile_strength_mpa: 450, yield_strength_mpa: 310, elongation_pct: 12 },

  // ── Tool steel (P or H depending on hardness) ──
  { id: "tool_steel_d2_annealed", display_name: "D2 Tool Steel (Annealed)", fusion_class: "Steel, Tool, D2", iso_group: "P", hardness_hb: 250, density_kg_m3: 7700, tensile_strength_mpa: 760, yield_strength_mpa: 560, elongation_pct: 15, notes: "Annealed condition — machinable. After hardening flips to ISO H." },
  { id: "tool_steel_d2_hardened", display_name: "D2 Tool Steel (Hardened)", fusion_class: "Steel, Tool, D2 (Hardened)", iso_group: "H", hardness_hrc: 60, density_kg_m3: 7700, tensile_strength_mpa: 2070, yield_strength_mpa: 1900, elongation_pct: 1, notes: "Post-hardening — ISO H regime. Hard milling only with CBN/coated carbide." },
  { id: "tool_steel_a2", display_name: "A2 Tool Steel", fusion_class: "Steel, Tool, A2", iso_group: "P", hardness_hb: 235, density_kg_m3: 7860, tensile_strength_mpa: 660, yield_strength_mpa: 530, elongation_pct: 16 },
  { id: "tool_steel_h13", display_name: "H13 Hot-Work Tool Steel", fusion_class: "Steel, Tool, H13", iso_group: "P", hardness_hb: 230, density_kg_m3: 7800, tensile_strength_mpa: 1400, yield_strength_mpa: 1200, elongation_pct: 14, notes: "Common die material. Holds toughness at red heat." },

  // ── Superalloys (S) ──
  { id: "inconel_718", display_name: "Inconel 718", fusion_class: "Nickel Alloy, Inconel 718", iso_group: "S", hardness_hb: 360, hardness_hrc: 38, density_kg_m3: 8190, tensile_strength_mpa: 1350, yield_strength_mpa: 1100, elongation_pct: 12, notes: "Aged condition. Work-hardens severely — DO NOT dwell in cut." },
  { id: "inconel_625", display_name: "Inconel 625", fusion_class: "Nickel Alloy, Inconel 625", iso_group: "S", hardness_hb: 220, density_kg_m3: 8440, tensile_strength_mpa: 970, yield_strength_mpa: 480, elongation_pct: 50, notes: "Easier than 718 but still S-group; needs conservative speed/feed." },
  { id: "ti_6al_4v", display_name: "Ti-6Al-4V (Grade 5)", fusion_class: "Titanium, Ti-6Al-4V", iso_group: "S", hardness_hb: 334, hardness_hrc: 36, density_kg_m3: 4430, tensile_strength_mpa: 950, yield_strength_mpa: 880, elongation_pct: 14, notes: "Titanium burns at ~600°C — flood coolant + sharp tools." },
  { id: "ti_grade_2_cp", display_name: "Titanium Grade 2 CP", fusion_class: "Titanium, Grade 2", iso_group: "S", hardness_hb: 200, density_kg_m3: 4510, tensile_strength_mpa: 345, yield_strength_mpa: 275, elongation_pct: 20, notes: "Commercially-pure titanium; gummier than Ti-6Al-4V." },

  // ── Copper / brass (N) ──
  { id: "brass_360", display_name: "Brass 360 (Free-Machining)", fusion_class: "Brass, 360", iso_group: "N", hardness_hb: 78, density_kg_m3: 8500, tensile_strength_mpa: 365, yield_strength_mpa: 125, elongation_pct: 53, notes: "Best-machining brass; lead inclusions self-lubricate." },
  { id: "copper_c110", display_name: "Copper C110 (ETP)", fusion_class: "Copper, C110", iso_group: "N", hardness_hb: 50, density_kg_m3: 8940, tensile_strength_mpa: 220, yield_strength_mpa: 70, elongation_pct: 45, notes: "Soft + gummy — sharp tools and high feed. EDM electrodes." },

  // ── Plastics (N — outside ISO but bucketed there) ──
  { id: "uhmw_polyethylene", display_name: "UHMW Polyethylene", fusion_class: "Plastic, UHMW", iso_group: "N", hardness_hb: 12, density_kg_m3: 940, tensile_strength_mpa: 40, yield_strength_mpa: 21, elongation_pct: 350, notes: "Very low strength but excellent abrasion resistance. Soft jaws only." },
  { id: "acetal_delrin", display_name: "Acetal (Delrin)", fusion_class: "Plastic, Acetal", iso_group: "N", hardness_hb: 28, density_kg_m3: 1410, tensile_strength_mpa: 70, yield_strength_mpa: 65, elongation_pct: 40, notes: "Easy-cutting engineering plastic. Sharp tools, high RPM, no coolant." },
];

// ── Frozen catalog ───────────────────────────────────────────────────────────

function buildCatalog(): { byId: Map<string, Fusion360Material>; ordered: readonly Fusion360Material[] } {
  const byId = new Map<string, Fusion360Material>();
  const ordered: Fusion360Material[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = Fusion360MaterialSchema.parse(raw);
    if (byId.has(parsed.id)) throw new Error(`Fusion360MaterialBridge: duplicate id "${parsed.id}"`);
    Object.freeze(parsed);
    byId.set(parsed.id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360MaterialBridgeEngine {
  static readonly EXPECTED_TOTAL = 24;

  static list(): Fusion360Material[] {
    return CATALOG_ORDERED.map(m => m);
  }

  static lookup(id: string): Fusion360Material | null {
    return CATALOG_BY_ID.get(id) ?? null;
  }

  static mustLookup(id: string): Fusion360Material {
    const m = CATALOG_BY_ID.get(id);
    if (!m) throw new Error(`Fusion360MaterialBridge: unknown material id "${id}"`);
    return m;
  }

  static listByISOGroup(iso: ISOGroup): Fusion360Material[] {
    const i = ISOGroupSchema.parse(iso);
    return CATALOG_ORDERED.filter(m => m.iso_group === i);
  }

  /** Get the canonical Kienzle coefficients for a material (by id). */
  static kienzleFor(material_id: string): KienzleCoefficients {
    const mat = Fusion360MaterialBridgeEngine.mustLookup(material_id);
    const k = CANONICAL_KIENZLE[mat.iso_group];
    return KienzleCoefficientsSchema.parse({
      kc1_1: k.kc1_1,
      mc: k.mc,
      source: `CANONICAL_KIENZLE[${mat.iso_group}] (src/physics/constants.ts)`,
    });
  }

  /** Free-text search across id / display_name / fusion_class. */
  static search(query: string): Fusion360Material[] {
    const q = query.toLowerCase().trim();
    if (q.length === 0) return [];
    return CATALOG_ORDERED.filter(m =>
      m.id.toLowerCase().includes(q) ||
      m.display_name.toLowerCase().includes(q) ||
      m.fusion_class.toLowerCase().includes(q)
    );
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static countByISOGroup(): Record<ISOGroup, number> {
    const out: Record<string, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
    for (const m of CATALOG_ORDERED) out[m.iso_group] += 1;
    return out as Record<ISOGroup, number>;
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360MaterialBridgeEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360MaterialBridgeEngine.EXPECTED_TOTAL} materials, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const m of CATALOG_ORDERED) {
      if (ids.has(m.id)) errors.push(`duplicate id "${m.id}"`);
      ids.add(m.id);
      // Verify CANONICAL_KIENZLE has the iso group.
      if (CANONICAL_KIENZLE[m.iso_group] === undefined) {
        errors.push(`material ${m.id}: ISO group ${m.iso_group} missing from CANONICAL_KIENZLE`);
      }
    }
    // Every ISO group should have at least one representative.
    const seen = new Set(CATALOG_ORDERED.map(m => m.iso_group));
    for (const iso of ISOGroupSchema.options) {
      if (!seen.has(iso)) errors.push(`ISO group ${iso} has no representative material`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360MaterialBridgeEngine = Fusion360MaterialBridgeEngine;
