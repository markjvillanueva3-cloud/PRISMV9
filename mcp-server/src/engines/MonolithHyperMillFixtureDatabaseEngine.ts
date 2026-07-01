/**
 * MonolithHyperMillFixtureDatabaseEngine — U-DB-MONOLITH-HYPERMILL-FIXTURE-LOADER
 *
 * TS-typed port of `PRISM_HYPERMILL_FIXTURE_DATABASE.js` from the v8.89 monolith
 * extraction (`extracted_modules/databases/`). Carries OPEN MIND / hyperMILL's
 * canonical fixture catalog: 6 vises (3 centric + 3 standard), 7 chucks
 * (3 three-jaw + 1 four-jaw + 3 collet), 3 clamp families (step / simple / toe)
 * with size + projection catalogs, plus the monolith's pure dim-based
 * auto-selection logic.
 *
 * Distinct from `MonolithFixtureDatabaseEngine` (PRISM_FIXTURE_DATABASE) and
 * `MonolithWorkholdingDatabaseEngine` (PRISM_WORKHOLDING_DATABASE) — those are
 * generic-CAM catalogs. This one is the hyperMILL-bound subset used by the
 * `prism_cam` hyperMILL strategies.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-HYPERMILL-FIXTURE-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted_modules/databases/PRISM_HYPERMILL_FIXTURE_DATABASE.js v1.0.0
 */

export interface ViseSpec {
  id: string;
  family: "centric" | "standard";
  type: string;
  jawWidth: number;       // mm
  minY?: number;          // mm (centric only)
  maxY?: number;          // mm (centric only)
  maxOpening?: number;    // mm (standard only)
  baseHeight: number;     // mm
}

export interface ChuckSpec {
  id: string;
  family: "three_jaw" | "four_jaw" | "collet";
  type: string;
  minDia: number;         // mm
  maxDia: number;         // mm
  jawStroke?: number;     // mm (jaw chucks)
  colletType?: string;    // "5C" | "16C" | "3J" (collet chucks)
}

export interface ClampSpec {
  family: "step" | "simple" | "toe";
  sizes: string[];
  projections?: string[];
  material?: string;
  finish?: string;
  application?: string;
}

export interface PartDimsMm {
  x: number;
  y: number;
  z: number;
}

export interface AutoSelectResult {
  vise: string | null;
  chuck: string | null;
  clamp: { size: string; projection: string } | null;
}

const VISES: Record<string, Omit<ViseSpec, "id">> = {
  "Centric_6-200":  { family: "centric",  type: "Centric Vise",  jawWidth: 120, minY: 0,   maxY: 200, baseHeight: 50 },
  "Centric_6-300":  { family: "centric",  type: "Centric Vise",  jawWidth: 120, minY: 200, maxY: 300, baseHeight: 50 },
  "Centric_6-500":  { family: "centric",  type: "Centric Vise",  jawWidth: 120, minY: 300, maxY: 500, baseHeight: 50 },
  "Standard_4-100": { family: "standard", type: "Standard Vise", jawWidth: 100, maxOpening: 100, baseHeight: 40 },
  "Standard_6-150": { family: "standard", type: "Standard Vise", jawWidth: 150, maxOpening: 150, baseHeight: 50 },
  "Standard_8-200": { family: "standard", type: "Standard Vise", jawWidth: 200, maxOpening: 200, baseHeight: 60 },
};

const CHUCKS: Record<string, Omit<ChuckSpec, "id">> = {
  "3_Jaw_Chuck_20-150": { family: "three_jaw", type: "3-Jaw Chuck",       minDia: 20, maxDia: 150, jawStroke: 10 },
  "3_Jaw_Chuck_20-400": { family: "three_jaw", type: "3-Jaw Chuck",       minDia: 20, maxDia: 400, jawStroke: 15 },
  "3_Jaw_Chuck_20-600": { family: "three_jaw", type: "3-Jaw Chuck",       minDia: 20, maxDia: 600, jawStroke: 20 },
  "4_Jaw_Chuck_10-130": { family: "four_jaw",  type: "4-Jaw Independent", minDia: 10, maxDia: 130, jawStroke: 8 },
  "5C_Collet":          { family: "collet",    type: "5C Collet Chuck",  minDia: 1,  maxDia: 26.5, colletType: "5C" },
  "16C_Collet":         { family: "collet",    type: "16C Collet Chuck", minDia: 6,  maxDia: 43,   colletType: "16C" },
  "3J_Collet":          { family: "collet",    type: "3J Collet Chuck",  minDia: 1,  maxDia: 50,   colletType: "3J" },
};

const CLAMPS: ClampSpec[] = [
  {
    family: "step",
    sizes:       ["080-020","080-040","080-080","120-025","120-050","120-080","120-120"],
    projections: ["06-48","06-147","70-112","120-267"],
    material: "Hardened Steel",
    finish: "Black Oxide",
  },
  {
    family: "simple",
    sizes:       ["080-020","080-040","080-080","120-025","120-050","120-080","120-120"],
    projections: ["06-48","70-112"],
    material: "Steel",
    finish: "Zinc Plated",
  },
  {
    family: "toe",
    sizes: ["Small","Medium","Large"],
    application: "Low-profile clamping",
  },
];

// Selection thresholds — monolith-faithful (lines 58-75 of source).
const VISE_SELECT_THRESHOLDS = { small: 200, medium: 300 } as const;
const CHUCK_SELECT_THRESHOLDS = { small: 150, medium: 400 } as const;
const CLAMP_SELECT_THRESHOLDS = { short: 48, medium: 112 } as const;

export class MonolithHyperMillFixtureDatabaseEngine {
  listVises(): ViseSpec[] {
    return Object.entries(VISES).map(([id, spec]) => ({ id, ...spec }));
  }

  listChucks(): ChuckSpec[] {
    return Object.entries(CHUCKS).map(([id, spec]) => ({ id, ...spec }));
  }

  listClamps(): ClampSpec[] {
    return CLAMPS.map((c) => ({ ...c }));
  }

  getVise(id: string): ViseSpec | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const spec = VISES[id];
    return spec ? { id, ...spec } : null;
  }

  getChuck(id: string): ChuckSpec | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const spec = CHUCKS[id];
    return spec ? { id, ...spec } : null;
  }

  /**
   * Monolith auto-selection (PRISM_HYPERMILL_FIXTURE_DATABASE.fixtureSelection
   * lines 49-76). Returns null fields for any axis where dim validation fails
   * (NaN, negative, missing) — never throws.
   */
  autoSelect(partDims: PartDimsMm): AutoSelectResult {
    if (!partDims || typeof partDims !== "object") {
      return { vise: null, chuck: null, clamp: null };
    }
    const { x, y, z } = partDims;
    const validXY = Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0;
    const validZ  = Number.isFinite(z) && z >= 0;

    return {
      vise:  validXY ? this.selectVise(partDims)  : null,
      chuck: validXY ? this.selectChuck(partDims) : null,
      clamp: validZ  ? this.selectClamp(partDims) : null,
    };
  }

  selectVise(dims: PartDimsMm): string {
    const maxDim = Math.max(dims.y, dims.x);
    if (maxDim <= VISE_SELECT_THRESHOLDS.small)  return "Centric_6-200";
    if (maxDim <= VISE_SELECT_THRESHOLDS.medium) return "Centric_6-300";
    return "Centric_6-500";
  }

  selectChuck(dims: PartDimsMm): string {
    const dia = Math.max(dims.x, dims.y);
    if (dia <= CHUCK_SELECT_THRESHOLDS.small)  return "3_Jaw_Chuck_20-150";
    if (dia <= CHUCK_SELECT_THRESHOLDS.medium) return "3_Jaw_Chuck_20-400";
    return "3_Jaw_Chuck_20-600";
  }

  selectClamp(dims: PartDimsMm): { size: string; projection: string } {
    const height = dims.z;
    if (height <= CLAMP_SELECT_THRESHOLDS.short)  return { size: "080-020", projection: "06-48" };
    if (height <= CLAMP_SELECT_THRESHOLDS.medium) return { size: "080-040", projection: "70-112" };
    return { size: "120-050", projection: "120-267" };
  }

  /**
   * Fuzzy search across vises + chucks. Returns merged hits capped at `limit`.
   * Each hit carries `_kind` discriminator. Clamp families are NOT included
   * (they're size-list catalogs, not individual fixture records).
   */
  search(query: string, limit = 20): Array<
    | (ViseSpec & { _kind: "vise" })
    | (ChuckSpec & { _kind: "chuck" })
  > {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: Array<
      | (ViseSpec & { _kind: "vise" })
      | (ChuckSpec & { _kind: "chuck" })
    > = [];

    for (const v of this.listVises()) {
      const hay = `${v.id} ${v.family} ${v.type}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({ ...v, _kind: "vise" });
        if (hits.length >= limit) return hits;
      }
    }
    for (const c of this.listChucks()) {
      const hay = `${c.id} ${c.family} ${c.type} ${c.colletType ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({ ...c, _kind: "chuck" });
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  stats(): { vises: number; chucks: number; clamp_families: number; total: number } {
    const v = Object.keys(VISES).length;
    const c = Object.keys(CHUCKS).length;
    const cl = CLAMPS.length;
    return { vises: v, chucks: c, clamp_families: cl, total: v + c + cl };
  }
}

export const monolithHyperMillFixtureDatabaseEngine = new MonolithHyperMillFixtureDatabaseEngine();
