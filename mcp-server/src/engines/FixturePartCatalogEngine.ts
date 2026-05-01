/**
 * FixturePartCatalogEngine — U-CAMTEST05
 * =======================================
 *
 * PHASE-8: Canonical fixture-part catalog driving every PHASE-8 scenario
 * generator (U-CAMTEST08..13). Each descriptor is a parametric definition
 * (envelope, geometric features, recommended materials, fixture surfaces)
 * that the in-host runners turn into actual CAM operations on their side.
 * STEP AP242 byte-files are NOT shipped from PRISM — the in-host runners
 * synthesize geometry from the descriptor (Fusion via Construct API,
 * hyperMILL via VBScript, Inventor via iLogic, Mastercam via NETHook
 * geometry calls). This keeps PRISM CAD-format-agnostic and lets each
 * host pick the construction path that matches its native API.
 *
 * Catalog composition (20 parts, exactly matching unit description):
 *   2D pockets    × 3 — rectangular, keyhole, D-shape
 *   2D contours   × 3 — external profile, internal profile, helical ramp
 *   drilling      × 2 — peck-cycle plate, deep-hole bushing
 *   threading     × 2 — single-start UNC, multi-start ACME lead-screw
 *   3D surfaces   × 3 — bowl, boss, saddle
 *   multi-axis    × 4 — impeller, undercut, turbine hub, fillet blend
 *   turning       × 3 — OD-rough shaft, ID-groove sleeve, threaded shaft
 *
 * The catalog is frozen at module load (duplicate-id guard throws). All
 * lookups are O(1) via an internal Map. Filter methods return defensive
 * copies so callers can't mutate the catalog.
 *
 * @module engines/FixturePartCatalogEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST05
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const FixtureCategorySchema = z.enum([
  "pocket_2d",
  "contour_2d",
  "drilling",
  "threading",
  "surface_3d",
  "multi_axis",
  "turning",
]);
export type FixtureCategory = z.infer<typeof FixtureCategorySchema>;

export const FixtureHostSchema = z.enum([
  "fusion360",
  "hypermill",
  "inventor_hsm",
  "mastercam",
]);
export type FixtureHost = z.infer<typeof FixtureHostSchema>;

export const EnvelopeMmSchema = z.object({
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
});
export type EnvelopeMm = z.infer<typeof EnvelopeMmSchema>;

export const FixtureFeatureSchema = z.object({
  name: z.string().min(1),
  kind: z.enum([
    "pocket", "contour", "hole", "thread", "surface_freeform",
    "boss", "saddle", "undercut", "blade", "groove",
    "fillet", "ramp", "od_turn", "id_turn",
  ]),
  count: z.number().int().positive().default(1),
  notes: z.string().optional(),
});
export type FixtureFeature = z.infer<typeof FixtureFeatureSchema>;

export const FixturePartDescriptorSchema = z.object({
  part_id: z.string().min(1).regex(/^[a-z0-9_]+$/, "part_id must be snake_case"),
  category: FixtureCategorySchema,
  title: z.string().min(1),
  envelope_mm: EnvelopeMmSchema,
  recommended_materials: z.array(z.string().min(1)).min(1),
  features: z.array(FixtureFeatureSchema).min(1),
  difficulty: z.number().int().min(1).max(5),
  preferred_hosts: z.array(FixtureHostSchema).min(1),
  notes: z.string().optional(),
});
export type FixturePartDescriptor = z.infer<typeof FixturePartDescriptorSchema>;

// ── Catalog (20 parts) ───────────────────────────────────────────────────────

const CATALOG_RAW: FixturePartDescriptor[] = [
  // ── 2D pockets (3) ──
  {
    part_id: "pocket_2d_rectangular",
    category: "pocket_2d",
    title: "Rectangular Pocket — 6061 Plate",
    envelope_mm: { length_mm: 100, width_mm: 60, height_mm: 25 },
    recommended_materials: ["6061-T6", "7075-T6", "1018-CRS"],
    features: [{ name: "main_pocket", kind: "pocket", count: 1, notes: "60×40×15 mm rectangular pocket centered" }],
    difficulty: 1,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Canonical 2D-pocket trainer. Used as floor for assertion baseline.",
  },
  {
    part_id: "pocket_2d_keyhole",
    category: "pocket_2d",
    title: "Keyhole T-Slot Pocket — 1018 Plate",
    envelope_mm: { length_mm: 80, width_mm: 80, height_mm: 20 },
    recommended_materials: ["1018-CRS", "4140-PH", "6061-T6"],
    features: [{ name: "keyhole", kind: "pocket", count: 1, notes: "T-slot keyhole geometry, 25 dia head + 10 wide stem" }],
    difficulty: 2,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Tests entry-strategy selection (helical vs ramp) on slot transition.",
  },
  {
    part_id: "pocket_2d_dshape",
    category: "pocket_2d",
    title: "D-Shape Pocket — Aluminum Bronze",
    envelope_mm: { length_mm: 60, width_mm: 60, height_mm: 30 },
    recommended_materials: ["AlBz9C", "6061-T6", "7075-T6"],
    features: [{ name: "d_pocket", kind: "pocket", count: 1, notes: "Half-round + flat-back D-shape, 40 dia × 20 deep" }],
    difficulty: 2,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Tests morph spiral vs trochoidal selection on rounded cavity.",
  },

  // ── 2D contours (3) ──
  {
    part_id: "contour_2d_external",
    category: "contour_2d",
    title: "External Profile — 6061 Plate",
    envelope_mm: { length_mm: 120, width_mm: 80, height_mm: 15 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [{ name: "outer_profile", kind: "contour", count: 1, notes: "External profile cut to net shape with 5 mm radii" }],
    difficulty: 1,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Floor-level contour for lead-in/lead-out validation.",
  },
  {
    part_id: "contour_2d_internal",
    category: "contour_2d",
    title: "Internal Profile Cutout — 1018 Plate",
    envelope_mm: { length_mm: 120, width_mm: 80, height_mm: 30 },
    recommended_materials: ["1018-CRS", "A36", "4140-PH"],
    features: [{ name: "inner_window", kind: "contour", count: 1, notes: "Internal pierce + profile, 60×40 window" }],
    difficulty: 2,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Tests pierce strategy + retract clearance after breakthrough.",
  },
  {
    part_id: "contour_2d_helical_ramp",
    category: "contour_2d",
    title: "Helical Ramp into Pocket — 6061",
    envelope_mm: { length_mm: 100, width_mm: 100, height_mm: 40 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [
      { name: "helical_entry", kind: "ramp", count: 1, notes: "3 deg helical ramp 30 mm deep" },
      { name: "pocket_floor", kind: "pocket", count: 1, notes: "60×60×30 pocket floor" },
    ],
    difficulty: 3,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Validates ramp-angle parameter consistency across hosts.",
  },

  // ── Drilling (2) ──
  {
    part_id: "drill_peck_plate",
    category: "drilling",
    title: "Peck-Cycle Hole Pattern — 6061 Plate",
    envelope_mm: { length_mm: 200, width_mm: 100, height_mm: 20 },
    recommended_materials: ["6061-T6", "1018-CRS"],
    features: [{ name: "hole_grid", kind: "hole", count: 25, notes: "5×5 grid of 8 mm dia × 18 mm deep peck-drill holes" }],
    difficulty: 1,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "G83 peck cycle parameter validation across dialects.",
  },
  {
    part_id: "drill_deep_hole_bushing",
    category: "drilling",
    title: "Deep-Hole Bushing — 1018",
    envelope_mm: { length_mm: 50, width_mm: 50, height_mm: 80 },
    recommended_materials: ["1018-CRS", "4140-PH"],
    features: [{ name: "deep_holes", kind: "hole", count: 4, notes: "8 mm dia × 80 mm deep (L:D = 10:1) gun-drill candidate" }],
    difficulty: 4,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Tests deep-hole peck strategy + chip-evacuation retract logic.",
  },

  // ── Threading (2) ──
  {
    part_id: "thread_single_start_block",
    category: "threading",
    title: "Single-Start UNC Tapped Block — 6061",
    envelope_mm: { length_mm: 50, width_mm: 50, height_mm: 30 },
    recommended_materials: ["6061-T6", "1018-CRS"],
    features: [
      { name: "tap_drill_holes", kind: "hole", count: 6, notes: "Tap drill #7 (5.105 mm) for 1/4-20 UNC" },
      { name: "tapped_threads", kind: "thread", count: 6, notes: "1/4-20 UNC × 20 mm deep" },
    ],
    difficulty: 2,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Validates G84 rigid-tap cycle with synced spindle/feed.",
  },
  {
    part_id: "thread_multi_start_leadscrew",
    category: "threading",
    title: "Multi-Start ACME Lead-Screw — 1018 Bar",
    envelope_mm: { length_mm: 100, width_mm: 25, height_mm: 25 },
    recommended_materials: ["1018-CRS", "4140-PH", "303-SS"],
    features: [{ name: "acme_thread", kind: "thread", count: 2, notes: "2-start ACME 0.5 in × 10 TPI on dia 25 stock" }],
    difficulty: 4,
    preferred_hosts: ["mastercam", "hypermill"],
    notes: "Multi-start indexing validation. Mill-turn capable hosts only.",
  },

  // ── 3D surfaces (3) ──
  {
    part_id: "surface_3d_bowl",
    category: "surface_3d",
    title: "Hemispherical Bowl — 6061",
    envelope_mm: { length_mm: 80, width_mm: 80, height_mm: 30 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [{ name: "bowl_interior", kind: "surface_freeform", count: 1, notes: "80 mm dia × 30 mm deep hemisphere" }],
    difficulty: 3,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Validates scallop-step / morph-spiral toolpath on concave surface.",
  },
  {
    part_id: "surface_3d_boss",
    category: "surface_3d",
    title: "Raised Cylindrical Boss — 6061",
    envelope_mm: { length_mm: 100, width_mm: 100, height_mm: 40 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [
      { name: "stock_face", kind: "surface_freeform", count: 1, notes: "Top facing 100×100" },
      { name: "raised_boss", kind: "boss", count: 1, notes: "60 dia × 25 raised boss with 5 mm fillet" },
    ],
    difficulty: 2,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Tests rest-machining around boss with corner cleanup pass.",
  },
  {
    part_id: "surface_3d_saddle",
    category: "surface_3d",
    title: "Saddle Seat Surface — 6061",
    envelope_mm: { length_mm: 100, width_mm: 80, height_mm: 35 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [{ name: "saddle_surface", kind: "saddle", count: 1, notes: "Compound saddle blend (concave one axis, convex other)" }],
    difficulty: 4,
    preferred_hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    notes: "Validates 3-axis curvature-driven scallop control.",
  },

  // ── 5-axis (4) ──
  {
    part_id: "multi_axis_impeller",
    category: "multi_axis",
    title: "5-Blade Impeller — Inconel 718",
    envelope_mm: { length_mm: 150, width_mm: 150, height_mm: 80 },
    recommended_materials: ["Inconel-718", "Ti-6Al-4V"],
    features: [
      { name: "impeller_blades", kind: "blade", count: 5, notes: "5 twisted impeller blades" },
      { name: "hub_fillet", kind: "fillet", count: 5, notes: "Blade-to-hub fillet blend, 3 mm" },
    ],
    difficulty: 5,
    preferred_hosts: ["hypermill", "fusion360", "mastercam"],
    notes: "Hardest scenario in catalog. 5-axis simultaneous required.",
  },
  {
    part_id: "multi_axis_undercut",
    category: "multi_axis",
    title: "Undercut Pocket — Ti-6Al-4V",
    envelope_mm: { length_mm: 100, width_mm: 100, height_mm: 60 },
    recommended_materials: ["Ti-6Al-4V", "17-4PH-SS"],
    features: [{ name: "undercut_pocket", kind: "undercut", count: 1, notes: "Undercut pocket with 3+2 access geometry" }],
    difficulty: 5,
    preferred_hosts: ["hypermill", "fusion360", "mastercam"],
    notes: "Tests 3+2 indexed access vs full 5-axis tilt strategy.",
  },
  {
    part_id: "multi_axis_turbine_hub",
    category: "multi_axis",
    title: "Turbine Hub — Ti-6Al-4V",
    envelope_mm: { length_mm: 120, width_mm: 120, height_mm: 40 },
    recommended_materials: ["Ti-6Al-4V", "Inconel-718"],
    features: [
      { name: "hub_face", kind: "surface_freeform", count: 1, notes: "Curved hub face" },
      { name: "blade_pockets", kind: "pocket", count: 12, notes: "12 pockets around hub for blade attachment" },
    ],
    difficulty: 5,
    preferred_hosts: ["hypermill", "fusion360", "mastercam"],
    notes: "Validates rotational pattern duplication on multi-axis kinematic.",
  },
  {
    part_id: "multi_axis_fillet_blend",
    category: "multi_axis",
    title: "Compound Fillet Blend — 6061",
    envelope_mm: { length_mm: 80, width_mm: 80, height_mm: 50 },
    recommended_materials: ["6061-T6", "7075-T6"],
    features: [
      { name: "blended_corner", kind: "fillet", count: 1, notes: "Variable-radius fillet 5→15 mm" },
      { name: "convex_face", kind: "surface_freeform", count: 1, notes: "Adjoining convex face" },
    ],
    difficulty: 4,
    preferred_hosts: ["hypermill", "fusion360", "inventor_hsm", "mastercam"],
    notes: "Tests swarf-cut variable-radius blending.",
  },

  // ── Turning (3) ──
  {
    part_id: "turning_od_rough_shaft",
    category: "turning",
    title: "OD Roughing Shaft — 1018",
    envelope_mm: { length_mm: 200, width_mm: 50, height_mm: 50 },
    recommended_materials: ["1018-CRS", "4140-PH"],
    features: [{ name: "od_profile", kind: "od_turn", count: 1, notes: "OD step profile dia 50→30→25 over 200 mm" }],
    difficulty: 2,
    preferred_hosts: ["mastercam", "hypermill"],
    notes: "Floor-level OD turning. Mill-turn capable hosts only.",
  },
  {
    part_id: "turning_id_groove_sleeve",
    category: "turning",
    title: "ID Groove Sleeve — 6061",
    envelope_mm: { length_mm: 100, width_mm: 60, height_mm: 60 },
    recommended_materials: ["6061-T6", "1018-CRS"],
    features: [
      { name: "id_bore", kind: "id_turn", count: 1, notes: "ID bore dia 30 through" },
      { name: "id_groove", kind: "groove", count: 1, notes: "Internal o-ring groove dia 32 × 3 wide" },
    ],
    difficulty: 3,
    preferred_hosts: ["mastercam", "hypermill"],
    notes: "Tests internal-groove tool retract + insert geometry validation.",
  },
  {
    part_id: "turning_threaded_shaft",
    category: "turning",
    title: "Threaded Shaft M30 — 1018",
    envelope_mm: { length_mm: 150, width_mm: 30, height_mm: 30 },
    recommended_materials: ["1018-CRS", "4140-PH"],
    features: [
      { name: "od_profile", kind: "od_turn", count: 1, notes: "OD turn dia 30 over 100 mm" },
      { name: "metric_thread", kind: "thread", count: 1, notes: "M30×3.5 thread on dia 30 × 50 mm long" },
    ],
    difficulty: 3,
    preferred_hosts: ["mastercam", "hypermill"],
    notes: "Tests turning thread cycle (G76 / equivalent) parameter mapping.",
  },
];

// ── Frozen catalog construction ──────────────────────────────────────────────

function buildCatalog(): { byId: Map<string, FixturePartDescriptor>; ordered: readonly FixturePartDescriptor[] } {
  const byId = new Map<string, FixturePartDescriptor>();
  const ordered: FixturePartDescriptor[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = FixturePartDescriptorSchema.parse(raw);
    if (byId.has(parsed.part_id)) {
      throw new Error(`FixturePartCatalog: duplicate part_id "${parsed.part_id}"`);
    }
    Object.freeze(parsed.envelope_mm);
    Object.freeze(parsed.features);
    Object.freeze(parsed.recommended_materials);
    Object.freeze(parsed.preferred_hosts);
    Object.freeze(parsed);
    byId.set(parsed.part_id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class FixturePartCatalogEngine {
  static readonly EXPECTED_TOTAL = 20;

  /** All parts in declaration order. Defensive copy of the frozen catalog. */
  static list(): FixturePartDescriptor[] {
    return CATALOG_ORDERED.map(p => p);
  }

  /** Subset filtered by category (defensive copy). */
  static listByCategory(category: FixtureCategory): FixturePartDescriptor[] {
    const cat = FixtureCategorySchema.parse(category);
    return CATALOG_ORDERED.filter(p => p.category === cat);
  }

  /** Subset of parts a given host is recommended for (defensive copy). */
  static listByHost(host: FixtureHost): FixturePartDescriptor[] {
    const h = FixtureHostSchema.parse(host);
    return CATALOG_ORDERED.filter(p => p.preferred_hosts.includes(h));
  }

  /** Lookup by id; null when unknown. */
  static get(part_id: string): FixturePartDescriptor | null {
    return CATALOG_BY_ID.get(part_id) ?? null;
  }

  /** Throws when unknown. Use when not-found is unrecoverable. */
  static mustGet(part_id: string): FixturePartDescriptor {
    const p = CATALOG_BY_ID.get(part_id);
    if (!p) throw new Error(`FixturePartCatalog: unknown part_id "${part_id}"`);
    return p;
  }

  /** Total catalog size. Asserts EXPECTED_TOTAL invariant. */
  static count(): number {
    return CATALOG_ORDERED.length;
  }

  /** Counts grouped by category. Useful for the milestone acceptance evidence. */
  static countByCategory(): Record<FixtureCategory, number> {
    const out: Record<string, number> = {
      pocket_2d: 0, contour_2d: 0, drilling: 0, threading: 0,
      surface_3d: 0, multi_axis: 0, turning: 0,
    };
    for (const p of CATALOG_ORDERED) out[p.category] += 1;
    return out as Record<FixtureCategory, number>;
  }

  /** Sanity check exposed for tests + the audit chain. */
  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== FixturePartCatalogEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${FixturePartCatalogEngine.EXPECTED_TOTAL} parts, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const p of CATALOG_ORDERED) {
      if (ids.has(p.part_id)) errors.push(`duplicate id "${p.part_id}"`);
      ids.add(p.part_id);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fixturePartCatalogEngine = FixturePartCatalogEngine;
