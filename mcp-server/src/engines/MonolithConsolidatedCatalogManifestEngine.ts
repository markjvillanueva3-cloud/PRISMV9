/**
 * MonolithConsolidatedCatalogManifestEngine — U-DB-MONOLITH-CONSOLIDATED-CATALOG-MANIFEST
 *
 * MANIFEST port of `PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.js` v1.0.0 from
 * the v8.89 monolith extraction (`extracted/catalogs/`). The source is
 * 1001 lines consolidated from 8 sub-files (8823 total source lines)
 * representing 44 vendor PDF catalogs (~3.1 GB). Full hand-port is a
 * follow-up unit requiring .js→.json conversion.
 *
 * This manifest ships the HIGH-LEVERAGE pinned data:
 *   - Catalog metadata (version + build + source-file count + total lines
 *     + PDF catalog count + total PDF size)
 *   - 5-category manufacturer index (24 entries by domain — superset of
 *     the manifest in FinalCatalogGateway, with category-specific routing)
 *   - Guhring hydraulic chuck specifications — the catalog's flagship
 *     tool-holder data (10 size records, clamping diameter 6mm-32mm)
 *
 * Cross-references:
 *   - MonolithFinalCatalogGatewayManifestEngine — sibling gateway-route manifest
 *   - MonolithManufacturerCatalogManifestEngine — sibling stats-table manifest
 *   - MonolithZeniCatalogManifestEngine — Zeni-specific vendor catalog (1 of 14 cutting-tool vendors)
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-CONSOLIDATED-CATALOG-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.js v1.0.0 (2026-01-17)
 */

export interface ConsolidatedCatalogMetadata {
  version: string;
  generated: string;
  build: string;
  sourceFiles: number;
  totalSourceLines: number;
  totalPdfCatalogs: number;
  totalPdfSize: string;
}

export interface ManufacturerCategoryIndex {
  toolHolders: string[];
  workholding: string[];
  cuttingTools: string[];
  latheTooling: string[];
  drilling: string[];
}

export interface GuhringHydraulicChuckSpec {
  /** Clamping diameter in mm. */
  clampingDia: number;
  /** Max RPM (50000 for ≤20mm, 25000 for 25-32mm). */
  maxRpm: number;
  /** Max torque in Nm. */
  maxTorque: number;
  /** Minimum tool insertion depth in mm. */
  minInsertionDepth: number;
  /** Max radial force (N). */
  maxRadialForce: number;
  /** Required shank tolerance (always 'h6'). */
  shankTolerance: "h6";
}

const METADATA: ConsolidatedCatalogMetadata = {
  version: "1.0.0",
  generated: "2026-01-17",
  build: "v8.65.032",
  sourceFiles: 8,
  totalSourceLines: 8823,
  totalPdfCatalogs: 44,
  totalPdfSize: "3.1 GB",
};

const MANUFACTURERS: ManufacturerCategoryIndex = {
  toolHolders:   ["Guhring", "BIG DAISHOWA", "REGO-FIX", "Haimer"],
  workholding:   ["Orange Vise"],
  cuttingTools:  ["OSG", "Kennametal", "Sandvik", "ISCAR", "SECO", "SGS", "MA Ford", "EMUGE", "Korloy", "Ingersoll", "Accupro", "Tungaloy", "Ceratizit", "Zeni"],
  latheTooling:  ["Global CNC", "ISCAR CAMFIX"],
  drilling:      ["Allied Machine", "OSG", "Kennametal"],
};

/**
 * Guhring hydraulic chuck specifications (catalog's flagship tool-holder
 * data — 10 size records pinned verbatim from monolith).
 * High RPM (50000) for clamping ≤20mm, 25000 for 25-32mm.
 */
const GUHRING_HYDRAULIC_CHUCKS: readonly GuhringHydraulicChuckSpec[] = [
  { clampingDia:  6, maxRpm: 50000, maxTorque:  16, minInsertionDepth: 27, maxRadialForce:  225, shankTolerance: "h6" },
  { clampingDia:  8, maxRpm: 50000, maxTorque:  26, minInsertionDepth: 27, maxRadialForce:  370, shankTolerance: "h6" },
  { clampingDia: 10, maxRpm: 50000, maxTorque:  50, minInsertionDepth: 31, maxRadialForce:  540, shankTolerance: "h6" },
  { clampingDia: 12, maxRpm: 50000, maxTorque:  82, minInsertionDepth: 36, maxRadialForce:  650, shankTolerance: "h6" },
  { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxRadialForce:  900, shankTolerance: "h6" },
  { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxRadialForce: 1410, shankTolerance: "h6" },
  { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxRadialForce: 1580, shankTolerance: "h6" },
  { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxRadialForce: 1860, shankTolerance: "h6" },
  { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxRadialForce: 4400, shankTolerance: "h6" },
  { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxRadialForce: 6500, shankTolerance: "h6" },
] as const;

export class MonolithConsolidatedCatalogManifestEngine {
  getMetadata(): ConsolidatedCatalogMetadata {
    return { ...METADATA };
  }

  getManufacturersByCategory(): ManufacturerCategoryIndex {
    return {
      toolHolders: [...MANUFACTURERS.toolHolders],
      workholding: [...MANUFACTURERS.workholding],
      cuttingTools: [...MANUFACTURERS.cuttingTools],
      latheTooling: [...MANUFACTURERS.latheTooling],
      drilling: [...MANUFACTURERS.drilling],
    };
  }

  /** Flat list of unique manufacturer names across all categories. */
  listAllManufacturers(): string[] {
    const set = new Set<string>();
    for (const m of MANUFACTURERS.toolHolders)  set.add(m);
    for (const m of MANUFACTURERS.workholding)  set.add(m);
    for (const m of MANUFACTURERS.cuttingTools) set.add(m);
    for (const m of MANUFACTURERS.latheTooling) set.add(m);
    for (const m of MANUFACTURERS.drilling)     set.add(m);
    return Array.from(set).sort();
  }

  /** Categories a given manufacturer appears in. Empty array if unknown. */
  getCategoriesFor(manufacturer: string): Array<keyof ManufacturerCategoryIndex> {
    if (typeof manufacturer !== "string" || manufacturer.trim() === "") return [];
    const hits: Array<keyof ManufacturerCategoryIndex> = [];
    if (MANUFACTURERS.toolHolders.includes(manufacturer))  hits.push("toolHolders");
    if (MANUFACTURERS.workholding.includes(manufacturer))  hits.push("workholding");
    if (MANUFACTURERS.cuttingTools.includes(manufacturer)) hits.push("cuttingTools");
    if (MANUFACTURERS.latheTooling.includes(manufacturer)) hits.push("latheTooling");
    if (MANUFACTURERS.drilling.includes(manufacturer))     hits.push("drilling");
    return hits;
  }

  listGuhringHydraulicChucks(): GuhringHydraulicChuckSpec[] {
    return GUHRING_HYDRAULIC_CHUCKS.map((c) => ({ ...c }));
  }

  /** Find a Guhring chuck by clamping diameter (mm). Returns null on miss. */
  getGuhringChuckByClampingDia(dia: number): GuhringHydraulicChuckSpec | null {
    if (typeof dia !== "number" || !Number.isFinite(dia)) return null;
    const c = GUHRING_HYDRAULIC_CHUCKS.find((x) => x.clampingDia === dia);
    return c ? { ...c } : null;
  }

  stats(): {
    version: string;
    build: string;
    sourceFiles: number;
    totalSourceLines: number;
    totalPdfCatalogs: number;
    totalPdfSize: string;
    manufacturerCountByCategory: Record<keyof ManufacturerCategoryIndex, number>;
    uniqueManufacturerCount: number;
    guhringChuckCount: number;
  } {
    return {
      version: METADATA.version,
      build: METADATA.build,
      sourceFiles: METADATA.sourceFiles,
      totalSourceLines: METADATA.totalSourceLines,
      totalPdfCatalogs: METADATA.totalPdfCatalogs,
      totalPdfSize: METADATA.totalPdfSize,
      manufacturerCountByCategory: {
        toolHolders: MANUFACTURERS.toolHolders.length,
        workholding: MANUFACTURERS.workholding.length,
        cuttingTools: MANUFACTURERS.cuttingTools.length,
        latheTooling: MANUFACTURERS.latheTooling.length,
        drilling: MANUFACTURERS.drilling.length,
      },
      uniqueManufacturerCount: this.listAllManufacturers().length,
      guhringChuckCount: GUHRING_HYDRAULIC_CHUCKS.length,
    };
  }
}

export const monolithConsolidatedCatalogManifestEngine =
  new MonolithConsolidatedCatalogManifestEngine();
