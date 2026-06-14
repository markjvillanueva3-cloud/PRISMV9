/**
 * MonolithZeniCatalogManifestEngine — U-DB-MONOLITH-ZENI-CATALOG-MANIFEST
 *
 * MANIFEST port of `PRISM_ZENI_COMPLETE_CATALOG.js` v3.0.0 from the v8.89
 * monolith extraction (`extracted/catalogs/`). The source is 993 lines of
 * rich Zeni Tools catalog data (turning inserts + external holders + boring
 * bars + grooving + threading + solid carbide + face/shoulder/slot mills +
 * indexable drills). Hand-porting the full catalog is a follow-up unit
 * (.js → .json conversion + lazy-loader engine).
 *
 * This engine ships the HIGH-LEVERAGE manifest data:
 *   - Manufacturer record (Zeni Tools — USA, Professional, Value High-Performance)
 *   - Version + last-updated date
 *   - 5 grade families (ZC25/ZC15/ZC35/ZM20/ZK20) with ISO equivalents +
 *     coating + application + canonical-color tags (preserved verbatim)
 *   - 13 canonical CNMG insert sizes (the catalog's flagship turning insert series)
 *   - Per-ISO-class cutting data envelopes (vc / fn / ap min-max for P/M/K)
 *
 * Engine surfaces these as typed constants + provides getGrade/getGradesByISO/
 * listCNMGSizes/getCuttingEnvelope methods. All fail-soft.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-ZENI-CATALOG-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_ZENI_COMPLETE_CATALOG.js v3.0.0 (2026-01-06)
 */

export interface ZeniManufacturerRecord {
  name: string;
  country: string;
  quality: string;
  specialty: string;
  /** 1=premium, 2=value, 3=economy (PRISM-internal scale). */
  priceLevel: number;
  website: string;
  description: string;
}

export interface ZeniGradeSpec {
  /** Zeni's internal grade name, e.g. "ZC25". */
  name: string;
  /** ISO grade equivalent (P/M/K class + number), e.g. "P25". */
  iso: string;
  /** "CVD" or "PVD". */
  coating: "CVD" | "PVD";
  application: string;
  /** Canonical color of the grade for visual catalog ID. */
  color: string;
}

export interface CuttingEnvelopeRange {
  min: number;
  max: number;
}

export interface CuttingEnvelope {
  /** Cutting speed (m/min). */
  vc: CuttingEnvelopeRange;
  /** Feed per revolution (mm/rev). */
  fn: CuttingEnvelopeRange;
  /** Depth of cut (mm). */
  ap: CuttingEnvelopeRange;
}

const VERSION = "3.0.0";
const LAST_UPDATED = "2026-01-06";

const MANUFACTURER: ZeniManufacturerRecord = {
  name: "Zeni Tools",
  country: "USA",
  quality: "Professional",
  specialty: "Value High-Performance",
  priceLevel: 2,
  website: "zenitools.com",
  description: "American-designed, high-quality cutting tools at competitive prices",
};

const GRADES: readonly ZeniGradeSpec[] = [
  { name: "ZC25", iso: "P25", coating: "CVD", application: "steel_general",   color: "gold"   },
  { name: "ZC15", iso: "P15", coating: "CVD", application: "steel_finishing", color: "gold"   },
  { name: "ZC35", iso: "P35", coating: "CVD", application: "steel_roughing",  color: "gold"   },
  { name: "ZM20", iso: "M20", coating: "PVD", application: "stainless",       color: "purple" },
  { name: "ZK20", iso: "K20", coating: "CVD", application: "cast_iron",       color: "black"  },
] as const;

const CNMG_SIZES: readonly string[] = [
  "CNMG090304", "CNMG090308", "CNMG090312",
  "CNMG120404", "CNMG120408", "CNMG120412", "CNMG120416",
  "CNMG160608", "CNMG160612", "CNMG160616",
  "CNMG190612", "CNMG190616", "CNMG190624",
] as const;

const CUTTING_ENVELOPES: Record<string, CuttingEnvelope> = {
  steel_p:      { vc: { min: 150, max: 350 }, fn: { min: 0.15, max: 0.5 }, ap: { min: 0.5, max: 5.0 } },
  stainless_m:  { vc: { min: 100, max: 250 }, fn: { min: 0.1,  max: 0.4 }, ap: { min: 0.5, max: 4.0 } },
  cast_iron_k:  { vc: { min: 150, max: 400 }, fn: { min: 0.15, max: 0.6 }, ap: { min: 0.5, max: 6.0 } },
};

/**
 * Catalog SECTIONS known to exist in the full 993-line source. Listed here so
 * downstream consumers know what's there but not yet hand-ported. Use this to
 * scope follow-up ingest work.
 */
const KNOWN_SECTIONS: readonly string[] = [
  "turning.inserts",        // line 27 (this manifest covers the CNMG sub-set)
  "turning.externalHolders", // line 227
  "turning.boringBars",      // line 359
  "turning.grooving",        // line 432
  "turning.threading",       // line 454
  "solidCarbide",            // line 489 (drilling/milling — solid carbide)
  "faceMills",               // line 572
  "shoulderMills",           // line 655
  "slotMills",               // line 684
  "indexableDrills",         // line 711
] as const;

export class MonolithZeniCatalogManifestEngine {
  get version(): string { return VERSION; }
  get lastUpdated(): string { return LAST_UPDATED; }

  getManufacturer(): ZeniManufacturerRecord {
    return { ...MANUFACTURER };
  }

  listGrades(): ZeniGradeSpec[] {
    return GRADES.map((g) => ({ ...g }));
  }

  /** Single grade by Zeni internal name (e.g. "ZC25"). Returns null on miss. */
  getGrade(name: string): ZeniGradeSpec | null {
    if (typeof name !== "string" || name.trim() === "") return null;
    const g = GRADES.find((x) => x.name === name);
    return g ? { ...g } : null;
  }

  /**
   * All grades for a given ISO class letter (P/M/K). Case-insensitive.
   * Returns [] on unknown class.
   */
  getGradesByISO(isoClass: string): ZeniGradeSpec[] {
    if (typeof isoClass !== "string" || isoClass.trim() === "") return [];
    const want = isoClass.trim().toUpperCase();
    return GRADES
      .filter((g) => g.iso.startsWith(want))
      .map((g) => ({ ...g }));
  }

  /** The 13 canonical CNMG insert sizes shipped by Zeni. */
  listCNMGSizes(): string[] {
    return [...CNMG_SIZES];
  }

  /** Cutting envelope for an ISO material class. Keys: steel_p/stainless_m/cast_iron_k. */
  getCuttingEnvelope(materialClass: string): CuttingEnvelope | null {
    if (typeof materialClass !== "string" || materialClass.trim() === "") return null;
    const env = CUTTING_ENVELOPES[materialClass];
    if (!env) return null;
    return {
      vc: { ...env.vc },
      fn: { ...env.fn },
      ap: { ...env.ap },
    };
  }

  listCuttingEnvelopeKeys(): string[] {
    return Object.keys(CUTTING_ENVELOPES).sort();
  }

  /** Section names known to exist in the full source (for ingest planning). */
  listKnownSections(): string[] {
    return [...KNOWN_SECTIONS];
  }

  stats(): {
    version: string;
    lastUpdated: string;
    gradeCount: number;
    cnmgSizeCount: number;
    cuttingEnvelopeCount: number;
    knownSectionCount: number;
    priceLevel: number;
  } {
    return {
      version: VERSION,
      lastUpdated: LAST_UPDATED,
      gradeCount: GRADES.length,
      cnmgSizeCount: CNMG_SIZES.length,
      cuttingEnvelopeCount: Object.keys(CUTTING_ENVELOPES).length,
      knownSectionCount: KNOWN_SECTIONS.length,
      priceLevel: MANUFACTURER.priceLevel,
    };
  }
}

export const monolithZeniCatalogManifestEngine = new MonolithZeniCatalogManifestEngine();
