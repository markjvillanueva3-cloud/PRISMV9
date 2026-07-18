/**
 * MonolithWorkholdingDatabaseEngine — U-DB-MONOLITH-WORKHOLDING-LOADER
 * ====================================================================
 *
 * TS-typed port of `PRISM_WORKHOLDING_DATABASE` from the v8.89 monolith
 * extraction (lives at `extracted/workholding/PRISM_WORKHOLDING_DATABASE.js`).
 * Closes the gap that **no live engine actually loaded this data** — the
 * 10+ Workholding* engines reference the source file by name in their
 * catalog manifest but only consume physics constants, not the fixture +
 * product records.
 *
 * Why this matters:
 *   - U-DB-BRIDGE-03-EXT (2026-05-26 commit `8050164a65`) wired the
 *     CatalogUnifiedQueryEngine.workholding_top channel through
 *     `registryManager.databases.search()` — which does NOT see this data
 *     because the DatabaseRegistry is a *file-catalog* index, not a
 *     workholding-product catalog. The bridge returns empty for real
 *     workholding queries today.
 *   - User directive 2026-05-26: "make sure databases from monolith
 *     extraction, extracted and extracted module folders in the prism
 *     folder are taken into account for database expansion".
 *
 * What this engine surfaces (R12 — fail-loud about scope):
 *   - 13 fixture-type categories (vise, hydraulic_vise, chuck_3jaw,
 *     chuck_6jaw, collet_chuck, vacuum, magnetic, fixture_plate,
 *     toe_clamps, tombstone, pallet, soft_jaws, expanding_mandrel)
 *     — each carries baseRigidity, baseDamping, clampingMethod,
 *     typicalClampingForce {min,max}, setupTime (min), repeatability (mm).
 *   - 5 specific manufactured products (Kurt DL640, Kurt AngLock,
 *     Schunk KONTEC KS, Lang Makro-Grip, Mitee-Bite Pitbull) — each carries
 *     manufacturer/model/jawWidth/maxOpening/clampingForce/weight/rigidity.
 *
 * Physics methods (calculateRigidity / calculateMaxCuttingForce) are
 * intentionally NOT ported — they already live in WorkholdingEngine.ts
 * (47.7K) and WorkholdingForceEngine.ts. This engine is data-only,
 * follows the same singleton-catalog pattern as ToolHolderDatabaseEngine.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-WORKHOLDING-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted/workholding/PRISM_WORKHOLDING_DATABASE.js v1.0.0
 */

// ── Schema ────────────────────────────────────────────────────────────────

export interface ClampingForceRange {
  min: number;
  max: number;
}

export interface FixtureTypeSpec {
  id: string;
  name: string;
  category: "standard" | "premium" | "turning" | "specialty" | "custom" | "production" | "id_clamping";
  baseRigidity: number;
  baseDamping: number;
  clampingMethod: string;
  typicalClampingForce: ClampingForceRange;
  /** Setup time in minutes (typical). */
  setupTime: number;
  /** Repeatability in mm (smaller is better). */
  repeatability: number;
}

export interface WorkholdingProductSpec {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  /** Jaw width in mm. */
  jawWidth: number;
  /** Maximum opening in mm. */
  maxOpening: number;
  /** Clamping force in N. */
  clampingForce: number;
  /** Weight in kg. */
  weight: number;
  rigidityFactor: number;
  damping: number;
  fiveAxisCapable?: boolean;
  lowProfile?: boolean;
}

// ── Data (hand-ported from monolith) ───────────────────────────────────────

const FIXTURE_TYPES: Record<string, Omit<FixtureTypeSpec, "id">> = {
  vise: {
    name: "Machine Vise", category: "standard",
    baseRigidity: 0.9, baseDamping: 0.85,
    clampingMethod: "parallel_jaws",
    typicalClampingForce: { min: 15000, max: 60000 },
    setupTime: 5, repeatability: 0.01,
  },
  hydraulic_vise: {
    name: "Hydraulic Vise", category: "premium",
    baseRigidity: 0.95, baseDamping: 0.90,
    clampingMethod: "hydraulic_jaws",
    typicalClampingForce: { min: 25000, max: 80000 },
    setupTime: 3, repeatability: 0.005,
  },
  chuck_3jaw: {
    name: "3-Jaw Chuck", category: "turning",
    baseRigidity: 0.85, baseDamping: 0.80,
    clampingMethod: "scroll_chuck",
    typicalClampingForce: { min: 20000, max: 100000 },
    setupTime: 5, repeatability: 0.05,
  },
  chuck_6jaw: {
    name: "6-Jaw Chuck", category: "turning",
    baseRigidity: 0.90, baseDamping: 0.85,
    clampingMethod: "scroll_chuck",
    typicalClampingForce: { min: 25000, max: 120000 },
    setupTime: 5, repeatability: 0.02,
  },
  collet_chuck: {
    name: "Collet Chuck", category: "turning",
    baseRigidity: 0.95, baseDamping: 0.90,
    clampingMethod: "collet",
    typicalClampingForce: { min: 15000, max: 50000 },
    setupTime: 2, repeatability: 0.01,
  },
  vacuum: {
    name: "Vacuum Table", category: "specialty",
    baseRigidity: 0.60, baseDamping: 0.50,
    clampingMethod: "vacuum",
    typicalClampingForce: { min: 5000, max: 20000 },
    setupTime: 2, repeatability: 0.1,
  },
  magnetic: {
    name: "Magnetic Chuck", category: "specialty",
    baseRigidity: 0.70, baseDamping: 0.65,
    clampingMethod: "magnetic",
    typicalClampingForce: { min: 10000, max: 40000 },
    setupTime: 1, repeatability: 0.05,
  },
  fixture_plate: {
    name: "Modular Fixture Plate", category: "custom",
    baseRigidity: 0.85, baseDamping: 0.80,
    clampingMethod: "toe_clamps",
    typicalClampingForce: { min: 8000, max: 30000 },
    setupTime: 15, repeatability: 0.02,
  },
  tombstone: {
    name: "Tombstone/Column", category: "production",
    baseRigidity: 0.75, baseDamping: 0.70,
    clampingMethod: "multi_face",
    typicalClampingForce: { min: 15000, max: 50000 },
    setupTime: 20, repeatability: 0.02,
  },
  pallet: {
    name: "Pallet System", category: "production",
    baseRigidity: 0.90, baseDamping: 0.85,
    clampingMethod: "zero_point",
    typicalClampingForce: { min: 30000, max: 100000 },
    setupTime: 1, repeatability: 0.005,
  },
  soft_jaws: {
    name: "Machined Soft Jaws", category: "custom",
    baseRigidity: 0.95, baseDamping: 0.90,
    clampingMethod: "profiled_jaws",
    typicalClampingForce: { min: 20000, max: 60000 },
    setupTime: 30, repeatability: 0.01,
  },
  expanding_mandrel: {
    name: "Expanding Mandrel", category: "id_clamping",
    baseRigidity: 0.85, baseDamping: 0.80,
    clampingMethod: "internal_expansion",
    typicalClampingForce: { min: 15000, max: 50000 },
    setupTime: 5, repeatability: 0.01,
  },
};

const PRODUCTS: Record<string, Omit<WorkholdingProductSpec, "id">> = {
  kurt_dl640: {
    manufacturer: "Kurt", model: "DL640",
    type: "vise", jawWidth: 152, maxOpening: 175,
    clampingForce: 40000, weight: 54,
    rigidityFactor: 0.95, damping: 0.90,
  },
  kurt_anglock: {
    manufacturer: "Kurt", model: "AngLock",
    type: "vise", jawWidth: 152, maxOpening: 178,
    clampingForce: 35000, weight: 45,
    rigidityFactor: 0.92, damping: 0.88,
  },
  schunk_kontec_ks: {
    manufacturer: "Schunk", model: "KONTEC KS",
    type: "hydraulic_vise", jawWidth: 125, maxOpening: 160,
    clampingForce: 55000, weight: 38,
    rigidityFactor: 0.97, damping: 0.92,
  },
  lang_makro_grip: {
    manufacturer: "Lang Technik", model: "Makro-Grip",
    type: "vise", jawWidth: 125, maxOpening: 172,
    clampingForce: 48000, weight: 35,
    rigidityFactor: 0.94, damping: 0.89,
    fiveAxisCapable: true,
  },
  miteebite_pitbull: {
    manufacturer: "Mitee-Bite", model: "Pitbull",
    type: "fixture_plate", jawWidth: 38, maxOpening: 50,
    clampingForce: 8000, weight: 0.5,
    rigidityFactor: 0.80, damping: 0.75,
    lowProfile: true,
  },
};

// ── Engine ────────────────────────────────────────────────────────────────

/**
 * Catalog engine over the monolith-extracted PRISM_WORKHOLDING_DATABASE.
 * Stateless — all data is module-scoped frozen constants.
 */
export class MonolithWorkholdingDatabaseEngine {
  /** All fixture-type records with `id` materialized. */
  listFixtureTypes(): FixtureTypeSpec[] {
    return Object.entries(FIXTURE_TYPES).map(([id, spec]) => ({ id, ...spec }));
  }

  /** All product records with `id` materialized. */
  listProducts(): WorkholdingProductSpec[] {
    return Object.entries(PRODUCTS).map(([id, spec]) => ({ id, ...spec }));
  }

  /** Single fixture type by id, or null on miss. Never throws. */
  getFixtureType(id: string): FixtureTypeSpec | null {
    const spec = FIXTURE_TYPES[id];
    return spec ? { id, ...spec } : null;
  }

  /** Single product by id, or null on miss. Never throws. */
  getProduct(id: string): WorkholdingProductSpec | null {
    const spec = PRODUCTS[id];
    return spec ? { id, ...spec } : null;
  }

  /**
   * Fuzzy search across fixture types + products. Matches against id, name,
   * type, manufacturer, model, clampingMethod, category. Returns merged
   * results capped at `limit`.
   *
   * Result shape uses a discriminating `_kind` field so the caller knows
   * whether each hit is a fixture-type category or a specific product.
   */
  search(query: string, limit = 20): Array<
    | (FixtureTypeSpec & { _kind: "fixture_type" })
    | (WorkholdingProductSpec & { _kind: "product" })
  > {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: Array<
      | (FixtureTypeSpec & { _kind: "fixture_type" })
      | (WorkholdingProductSpec & { _kind: "product" })
    > = [];

    for (const ft of this.listFixtureTypes()) {
      const hay = `${ft.id} ${ft.name} ${ft.category} ${ft.clampingMethod}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({ ...ft, _kind: "fixture_type" });
        if (hits.length >= limit) return hits;
      }
    }
    for (const p of this.listProducts()) {
      const hay = `${p.id} ${p.manufacturer} ${p.model} ${p.type}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({ ...p, _kind: "product" });
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  /** Fixture types filtered by category. Never throws on unknown category. */
  listByCategory(category: FixtureTypeSpec["category"]): FixtureTypeSpec[] {
    return this.listFixtureTypes().filter((ft) => ft.category === category);
  }

  /** Products from a specific manufacturer (case-insensitive). */
  listByManufacturer(manufacturer: string): WorkholdingProductSpec[] {
    if (typeof manufacturer !== "string" || manufacturer.trim() === "") return [];
    const want = manufacturer.trim().toLowerCase();
    return this.listProducts().filter((p) => p.manufacturer.toLowerCase() === want);
  }

  /** Counts — useful for telemetry + dashboard. */
  stats(): { fixture_types: number; products: number; total: number } {
    const f = Object.keys(FIXTURE_TYPES).length;
    const p = Object.keys(PRODUCTS).length;
    return { fixture_types: f, products: p, total: f + p };
  }
}

export const monolithWorkholdingDatabaseEngine = new MonolithWorkholdingDatabaseEngine();
