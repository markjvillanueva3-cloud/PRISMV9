/**
 * MonolithFixtureDatabaseEngine — U-DB-MONOLITH-FIXTURE-LOADER
 *
 * TS-typed port of `PRISM_FIXTURE_DATABASE.js` from the v8.89 monolith
 * extraction (`extracted/workholding/PRISM_FIXTURE_DATABASE.js`).
 *
 * Data tables ported:
 *   - 7 fixture categories with codes + subcategories
 *     (VISE/CHUCK/FIXTURE_PLATE/TOMBSTONE/CLAMP/COLLET/FIVE_AXIS)
 *   - 16 stiffness defaults (N/μm) — vises, chucks, fixture plates,
 *     zero-point systems, clamps
 *   - 10 friction coefficients (jaw/material pairs)
 *   - 6 clamping-safety factors by operation type
 *   - 5 manufacturer slots (kurt populated via toolHolderDatabase; others
 *     future)
 *
 * Engine methods from the monolith (recommendFixture, calculateMinClampingForce,
 * viseTorqueToForce, hydraulicForce) are intentionally NOT ported — they
 * belong with the physics engines (WorkholdingForceEngine.ts already
 * houses clamping-force calculations).
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FIXTURE-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted/workholding/PRISM_FIXTURE_DATABASE.js v1.0.0 (PRISM v8.89)
 */

// ── Schema ────────────────────────────────────────────────────────────────

export interface FixtureCategorySpec {
  id: string;
  code: string;
  subcategories: readonly string[];
}

export interface StiffnessSpec {
  id: string;
  /** N/μm — radial OR x-axis stiffness. Schema varies by fixture class. */
  kx?: number;
  ky?: number;
  kz?: number;
  radial?: number;
  axial?: number;
  /** Per-inch-thickness for fixture plates. */
  kz_per_inch?: number;
}

export interface FrictionCoefficient {
  id: string;
  /** Dimensionless static friction (μ). */
  mu: number;
}

export interface SafetyFactorSpec {
  operation: string;
  factor: number;
}

// ── Data tables (hand-ported from monolith) ───────────────────────────────

const CATEGORIES: Record<string, Omit<FixtureCategorySpec, "id">> = {
  VISE: {
    code: "VIS",
    subcategories: ["precision", "production", "self_centering", "multi_station", "modular", "low_profile", "double_station"],
  },
  CHUCK: {
    code: "CHK",
    subcategories: ["three_jaw", "four_jaw", "six_jaw", "collet", "power", "diaphragm", "magnetic"],
  },
  FIXTURE_PLATE: {
    code: "PLT",
    subcategories: ["grid_plate", "subplate", "vacuum", "t_slot"],
  },
  TOMBSTONE: {
    code: "TMB",
    subcategories: ["two_face", "four_face", "six_face", "angle"],
  },
  CLAMP: {
    code: "CLP",
    subcategories: ["strap", "toe", "swing", "toggle", "cam", "edge"],
  },
  COLLET: {
    code: "COL",
    subcategories: ["ER", "R8", "5C", "dead_length", "expanding"],
  },
  FIVE_AXIS: {
    code: "5AX",
    subcategories: ["dovetail", "zero_point", "pull_stud", "grip"],
  },
};

const STIFFNESS_DEFAULTS: Record<string, Omit<StiffnessSpec, "id">> = {
  // Vises by size — kx/ky/kz in N/μm
  vise_4in: { kx: 100, ky: 130, kz: 220 },
  vise_6in: { kx: 150, ky: 200, kz: 300 },
  vise_8in: { kx: 200, ky: 260, kz: 400 },
  // Chucks — radial + axial
  chuck_6in:    { radial: 150, axial: 350 },
  chuck_8in:    { radial: 180, axial: 400 },
  chuck_10in:   { radial: 220, axial: 500 },
  chuck_12in:   { radial: 280, axial: 600 },
  collet_chuck: { radial: 300, axial: 600 },
  power_chuck:  { radial: 350, axial: 700 },
  // Fixture plates — per inch thickness
  plate_aluminum:  { kz_per_inch: 50 },
  plate_steel:     { kz_per_inch: 150 },
  plate_cast_iron: { kz_per_inch: 175 },
  // Zero-point
  zero_point: { kx: 400, ky: 400, kz: 800 },
  // Clamps
  strap_clamp:  { kz: 30 },
  toe_clamp:    { kz: 20 },
  toggle_clamp: { kz: 15 },
};

const FRICTION_COEFFICIENTS: Record<string, number> = {
  steel_on_steel_dry:    0.15,
  steel_on_steel_oily:   0.10,
  steel_on_aluminum:     0.12,
  aluminum_on_aluminum:  0.10,
  serrated_jaws:         0.25,
  diamond_jaws:          0.35,
  carbide_jaws:          0.30,
  smooth_jaws:           0.12,
  rubber_pads:           0.40,
  soft_jaws_machined:    0.20,
};

const SAFETY_FACTORS: Record<string, number> = {
  finishing:        1.5,
  semi_finishing:   2.0,
  roughing:         2.5,
  heavy_roughing:   3.0,
  interrupted_cut:  3.5,
  slotting:         3.0,
};

const MANUFACTURERS: readonly string[] = [
  "kurt", "schunk", "lang", "jergens", "fifth_axis",
];

// ── Engine ────────────────────────────────────────────────────────────────

export class MonolithFixtureDatabaseEngine {
  /** All 7 fixture-category records. */
  listCategories(): FixtureCategorySpec[] {
    return Object.entries(CATEGORIES).map(([id, spec]) => ({ id, ...spec }));
  }

  /** Single category by id (e.g. "VISE"), or null on miss. */
  getCategory(id: string): FixtureCategorySpec | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const spec = CATEGORIES[id];
    return spec ? { id, ...spec } : null;
  }

  /** Category by code (e.g. "CHK"), case-insensitive. */
  getCategoryByCode(code: string): FixtureCategorySpec | null {
    if (typeof code !== "string" || code.trim() === "") return null;
    const want = code.trim().toUpperCase();
    for (const [id, spec] of Object.entries(CATEGORIES)) {
      if (spec.code === want) return { id, ...spec };
    }
    return null;
  }

  /** All stiffness records. */
  listStiffness(): StiffnessSpec[] {
    return Object.entries(STIFFNESS_DEFAULTS).map(([id, spec]) => ({ id, ...spec }));
  }

  /** Single stiffness record by id (e.g. "vise_6in"). */
  getStiffness(id: string): StiffnessSpec | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const spec = STIFFNESS_DEFAULTS[id];
    return spec ? { id, ...spec } : null;
  }

  /** All friction coefficients. */
  listFrictions(): FrictionCoefficient[] {
    return Object.entries(FRICTION_COEFFICIENTS).map(([id, mu]) => ({ id, mu }));
  }

  /** Single friction coefficient by id (e.g. "serrated_jaws"). 0..1 floor inherently. */
  getFriction(id: string): number | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const mu = FRICTION_COEFFICIENTS[id];
    return typeof mu === "number" ? mu : null;
  }

  /** All operation-class safety factors. */
  listSafetyFactors(): SafetyFactorSpec[] {
    return Object.entries(SAFETY_FACTORS).map(([operation, factor]) => ({ operation, factor }));
  }

  /** Safety factor for a named operation class. */
  getSafetyFactor(operation: string): number | null {
    if (typeof operation !== "string" || operation.trim() === "") return null;
    const f = SAFETY_FACTORS[operation];
    return typeof f === "number" ? f : null;
  }

  /** Manufacturer slot names (5 — kurt is populated by ToolHolderDB; others pending). */
  listManufacturers(): readonly string[] {
    return MANUFACTURERS;
  }

  /**
   * Fuzzy search across categories + stiffness + friction + safety entries.
   * Returns hits with discriminating `_kind` so caller knows the source table.
   */
  search(query: string, limit = 20): Array<
    | { _kind: "category"; record: FixtureCategorySpec }
    | { _kind: "stiffness"; record: StiffnessSpec }
    | { _kind: "friction"; record: FrictionCoefficient }
    | { _kind: "safety"; record: SafetyFactorSpec }
  > {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: Array<
      | { _kind: "category"; record: FixtureCategorySpec }
      | { _kind: "stiffness"; record: StiffnessSpec }
      | { _kind: "friction"; record: FrictionCoefficient }
      | { _kind: "safety"; record: SafetyFactorSpec }
    > = [];

    for (const c of this.listCategories()) {
      const hay = `${c.id} ${c.code} ${c.subcategories.join(" ")}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({ _kind: "category", record: c });
        if (hits.length >= limit) return hits;
      }
    }
    for (const s of this.listStiffness()) {
      if (s.id.toLowerCase().includes(q)) {
        hits.push({ _kind: "stiffness", record: s });
        if (hits.length >= limit) return hits;
      }
    }
    for (const f of this.listFrictions()) {
      if (f.id.toLowerCase().includes(q)) {
        hits.push({ _kind: "friction", record: f });
        if (hits.length >= limit) return hits;
      }
    }
    for (const sf of this.listSafetyFactors()) {
      if (sf.operation.toLowerCase().includes(q)) {
        hits.push({ _kind: "safety", record: sf });
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  /** Counts — telemetry. */
  stats(): {
    categories: number;
    stiffness_defaults: number;
    friction_coefficients: number;
    safety_factors: number;
    manufacturer_slots: number;
  } {
    return {
      categories: Object.keys(CATEGORIES).length,
      stiffness_defaults: Object.keys(STIFFNESS_DEFAULTS).length,
      friction_coefficients: Object.keys(FRICTION_COEFFICIENTS).length,
      safety_factors: Object.keys(SAFETY_FACTORS).length,
      manufacturer_slots: MANUFACTURERS.length,
    };
  }
}

export const monolithFixtureDatabaseEngine = new MonolithFixtureDatabaseEngine();
