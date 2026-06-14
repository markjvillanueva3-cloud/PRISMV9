/**
 * MonolithFinalCatalogManifestEngine — U-DB-MONOLITH-FINAL-CATALOG-MANIFEST
 *
 * MANIFEST port of `PRISM_CATALOG_FINAL.js` v1.0.0 from the v8.89 monolith
 * extraction (`extracted/catalogs/`). The source is 903 lines representing
 * the "complete" 44-PDF integration (vs the "consolidated" summary in
 * MonolithConsolidatedCatalogManifestEngine).
 *
 * SCOPE: This engine ships the data UNIQUE to PRISM_CATALOG_FINAL that
 * was NOT in PRISM_MANUFACTURER_CATALOG_CONSOLIDATED — primarily the
 * **extended** Guhring hydraulic chuck specs (with operatingTemp + maxCoolantPressure
 * + maxAdjustment fields that the consolidated version omits) plus the
 * CAT40/CAT50 hydraulic holder series 4216 metadata (balance, taper standard,
 * retention knob threads).
 *
 * For the OVERLAPPING data (5-category manufacturer index, basic Guhring
 * chuck dims, etc.) use MonolithConsolidatedCatalogManifestEngine — this
 * engine deliberately does NOT duplicate it. Both engines pin the
 * underlying catalog so divergence between the two source files would
 * surface as test failures.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FINAL-CATALOG-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_CATALOG_FINAL.js v1.0.0 (2026-01-17)
 */

export interface FinalCatalogMetadata {
  version: string;
  generated: string;
  description: string;
  totalManufacturers: number;
  totalLines: number;
}

/**
 * EXTENDED Guhring hydraulic chuck spec — adds operatingTemp,
 * maxCoolantPressure, maxAdjustment to the base spec from the
 * consolidated catalog.
 */
export interface GuhringExtendedChuckSpec {
  clampingDia: number;
  maxRpm: number;
  maxTorque: number;
  minInsertionDepth: number;
  /** Max axial adjustment in mm (always 10 per source). */
  maxAdjustment: number;
  maxRadialForce: number;
  /** Operating temperature range, e.g. "20-50°C". */
  operatingTemp: string;
  /** Max coolant pressure in bar (always 80 per source). */
  maxCoolantPressure: number;
  shankTolerance: "h6";
}

export interface CatHydraulicHolderSeriesMetadata {
  seriesNumber: string;
  balanceQuality: string;
  taperStandard: string;
  coolant: string;
  retentionKnob: {
    CAT40: string;
    CAT50: string;
  };
}

const METADATA: FinalCatalogMetadata = {
  version: "1.0.0",
  generated: "2026-01-17",
  description: "Complete manufacturer catalog integration from 44 PDFs",
  totalManufacturers: 25,
  totalLines: 9500,
};

const GUHRING_EXTENDED_CHUCKS: readonly GuhringExtendedChuckSpec[] = [
  { clampingDia:  6, maxRpm: 50000, maxTorque:  16, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce:  225, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia:  8, maxRpm: 50000, maxTorque:  26, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce:  370, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 10, maxRpm: 50000, maxTorque:  50, minInsertionDepth: 31, maxAdjustment: 10, maxRadialForce:  540, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 12, maxRpm: 50000, maxTorque:  82, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce:  650, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce:  900, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1410, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1580, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxAdjustment: 10, maxRadialForce: 1860, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxAdjustment: 10, maxRadialForce: 4400, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
  { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxAdjustment: 10, maxRadialForce: 6500, operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6" },
] as const;

const CAT_SERIES_4216: CatHydraulicHolderSeriesMetadata = {
  seriesNumber: "4216",
  balanceQuality: "G6.3 at 15,000 RPM",
  taperStandard: "ANSI/ASME B 5.50",
  coolant: "Through center and flange",
  retentionKnob: { CAT40: "5/8-11", CAT50: "1-8" },
};

/**
 * 4 "extended features" the catalog flags for Guhring hydraulic chucks
 * (verbatim from PRISM_CATALOG_FINAL features array, more descriptive than
 * the abbreviated features list in MonolithConsolidatedCatalogManifestEngine).
 */
const GUHRING_HYDRAULIC_CHUCK_FEATURES: readonly string[] = [
  "Max 3μm concentricity deviation",
  "Fast and simple tool change",
  "Vibration cushioning effect",
  "Optimal tool life and surface quality",
] as const;

export class MonolithFinalCatalogManifestEngine {
  getMetadata(): FinalCatalogMetadata {
    return { ...METADATA };
  }

  /** 10 extended Guhring hydraulic chuck records with operating temp + coolant pressure. */
  listGuhringExtendedChucks(): GuhringExtendedChuckSpec[] {
    return GUHRING_EXTENDED_CHUCKS.map((c) => ({ ...c }));
  }

  getGuhringExtendedChuckByClampingDia(dia: number): GuhringExtendedChuckSpec | null {
    if (typeof dia !== "number" || !Number.isFinite(dia)) return null;
    const c = GUHRING_EXTENDED_CHUCKS.find((x) => x.clampingDia === dia);
    return c ? { ...c } : null;
  }

  /** CAT40/50 hydraulic holder series 4216 metadata (balance, taper, etc.). */
  getCatSeries4216Metadata(): CatHydraulicHolderSeriesMetadata {
    return {
      ...CAT_SERIES_4216,
      retentionKnob: { ...CAT_SERIES_4216.retentionKnob },
    };
  }

  /** Verbatim feature list from monolith (4 entries). */
  listGuhringHydraulicChuckFeatures(): string[] {
    return [...GUHRING_HYDRAULIC_CHUCK_FEATURES];
  }

  stats(): {
    version: string;
    totalManufacturers: number;
    totalLines: number;
    extendedChuckCount: number;
    catSeriesNumber: string;
    featureCount: number;
  } {
    return {
      version: METADATA.version,
      totalManufacturers: METADATA.totalManufacturers,
      totalLines: METADATA.totalLines,
      extendedChuckCount: GUHRING_EXTENDED_CHUCKS.length,
      catSeriesNumber: CAT_SERIES_4216.seriesNumber,
      featureCount: GUHRING_HYDRAULIC_CHUCK_FEATURES.length,
    };
  }
}

export const monolithFinalCatalogManifestEngine =
  new MonolithFinalCatalogManifestEngine();
