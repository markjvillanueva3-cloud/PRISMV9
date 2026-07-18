/**
 * ManufacturerCatalogIndexEngine — Indexes all external manufacturer data sources
 *
 * Provides a searchable registry of manufacturer catalogs (PDFs), workholding catalogs,
 * machine 3D models, and raw tooling table extractions from Box PRISM.
 * Enables queries like "find all turning catalogs", "which manufacturers have holder data",
 * "list machine models for Haas", etc.
 *
 * Actions: catalog_get, catalog_workholding, catalog_machines, catalog_raw_tooling,
 *          catalog_search_mfr, catalog_search_product, catalog_gaps, catalog_summary,
 *          catalog_ingestion_priority
 *
 * @module ManufacturerCatalogIndexEngine
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface CatalogEntry {
  manufacturer: string;
  file: string;
  path: string;
  category: string;
  products: string[];
  year: string;
  sizeMB: number;
  inPrism: boolean;
  extractionStatus: "not_started" | "raw_tables" | "partially_extracted" | "fully_extracted";
}

export interface WorkholdingCatalogEntry {
  manufacturer: string;
  files: number;
  sizeMB: number;
  products: string[];
  inPrism: boolean;
  path: string;
}

export interface MachineModelEntry {
  manufacturer: string;
  model: string;
  file: string;
  path: string;
  format: "step" | "mch" | "stl";
}

export interface RawToolingEntry {
  manufacturer: string;
  file: string;
  path: string;
  tables: number;
  prismCoverage: number;
}

export interface CatalogFilter {
  manufacturer?: string;
  category?: string;
  product?: string;
  yearMin?: string;
}

export interface ManufacturerSearchResult {
  manufacturer: string;
  catalogs: CatalogEntry[];
  workholding: WorkholdingCatalogEntry[];
  machineModels: MachineModelEntry[];
  rawTooling: RawToolingEntry[];
}

export interface GapReport {
  manufacturersWithoutPrismData: string[];
  categoriesWithoutPrismData: string[];
  rawTablesNotIngested: RawToolingEntry[];
  staleCatalogs: CatalogEntry[];
  totalGaps: number;
}

export interface CatalogSummary {
  totalCatalogs: number;
  totalWorkholdingEntries: number;
  totalMachineModels: number;
  totalRawToolingFiles: number;
  totalRawTables: number;
  totalSizeGB: number;
  uniqueManufacturers: number;
  manufacturerList: string[];
  categoryCounts: Record<string, number>;
}

export interface IngestionPriorityEntry {
  manufacturer: string;
  source: "catalog" | "raw_tables" | "workholding";
  priority: number;
  reason: string;
  tables?: number;
  sizeMB?: number;
}

// ============================================================================
// PATHS
// ============================================================================

const BASE_PATH = "C:/Users/Admin.DIGITALSTORM-PC/Box/PRISM";
const CATALOG_PATH = `${BASE_PATH}/MANUFACTURER_CATALOGS/uploaded`;
const WORKHOLDING_PATH = `${BASE_PATH}/WORKHOLDING AND FIXTURE CATALOGS`;
const MACHINE_MODEL_PATH = `${BASE_PATH}/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION`;
const RAW_TOOLING_PATH = `${BASE_PATH}/TOOLING DATABASE THAT NEEDS INTEGRATION`;

// ============================================================================
// HARDCODED DATA — Manufacturer Catalogs (38 PDFs, ~5.3GB)
// ============================================================================

const MANUFACTURER_CATALOGS: CatalogEntry[] = [
  {
    manufacturer: "YG-1",
    file: "YU25_America.pdf",
    path: `${CATALOG_PATH}/YU25_America.pdf`,
    category: "full_catalog",
    products: ["holemaking", "threading", "milling", "tooling_systems"],
    year: "2025-2026",
    sizeMB: 387,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "REGO-FIX",
    file: "REGO-FIX Catalogue 2026 ENGLISH.pdf",
    path: `${CATALOG_PATH}/REGO-FIX Catalogue 2026 ENGLISH.pdf`,
    category: "toolholders",
    products: ["collet_chucks", "er_collets", "powrgrip", "securgrip"],
    year: "2026",
    sizeMB: 208,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "EMUGE-FRANKEN",
    file: "ZK12023_DEGB RevA EMUGE Katalog 160.pdf",
    path: `${CATALOG_PATH}/ZK12023_DEGB RevA EMUGE Katalog 160.pdf`,
    category: "threading",
    products: ["taps", "thread_mills", "drills", "clamping"],
    year: "2023",
    sizeMB: 233,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Kennametal",
    file: "Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf",
    path: `${CATALOG_PATH}/Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf`,
    category: "rotating_tools",
    products: ["holemaking", "tapping", "endmilling", "indexable_milling"],
    year: "2018",
    sizeMB: 259,
    inPrism: true,
    extractionStatus: "partially_extracted"
  },
  {
    manufacturer: "Kennametal",
    file: "Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf",
    path: `${CATALOG_PATH}/Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf`,
    category: "turning",
    products: ["iso_turning", "grooving", "threading", "cutoff"],
    year: "2018",
    sizeMB: 118,
    inPrism: true,
    extractionStatus: "partially_extracted"
  },
  {
    manufacturer: "ISCAR",
    file: "TURNING_CATALOG_PART 1.pdf",
    path: `${CATALOG_PATH}/TURNING_CATALOG_PART 1.pdf`,
    category: "turning",
    products: ["iso_turning", "grooving", "parting", "threading"],
    year: "2020",
    sizeMB: 204,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Mitsubishi Materials",
    file: "catalog_c010b_full.pdf",
    path: `${CATALOG_PATH}/catalog_c010b_full.pdf`,
    category: "full_catalog",
    products: ["turning", "milling", "drilling", "boring"],
    year: "2020",
    sizeMB: 99,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "OSG",
    file: "OSG.pdf",
    path: `${CATALOG_PATH}/OSG.pdf`,
    category: "full_catalog",
    products: ["drilling", "threading", "end_mills", "indexable"],
    year: "2022",
    sizeMB: 110,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Allied Machine",
    file: "AMPC_US-EN.pdf",
    path: `${CATALOG_PATH}/AMPC_US-EN.pdf`,
    category: "holemaking",
    products: ["gen3sys", "ta_drilling", "boring", "reaming", "burnishing"],
    year: "2022",
    sizeMB: 167,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "M.A. Ford",
    file: "MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf",
    path: `${CATALOG_PATH}/MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf`,
    category: "full_catalog",
    products: ["end_mills", "drills", "reamers", "routers"],
    year: "2022",
    sizeMB: 162,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Korloy",
    file: "korloy solid.pdf",
    path: `${CATALOG_PATH}/korloy solid.pdf`,
    category: "solid_tools",
    products: ["end_mills", "solid_drills", "pcd_tools"],
    year: "2025-2026",
    sizeMB: 94,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Korloy",
    file: "korloy turning.pdf",
    path: `${CATALOG_PATH}/korloy turning.pdf`,
    category: "turning",
    products: ["turning_inserts", "holders", "grades"],
    year: "2025-2026",
    sizeMB: 43,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Global CNC Industries",
    file: "01-Global-CNC-Full-Catalog-2023.pdf",
    path: `${CATALOG_PATH}/01-Global-CNC-Full-Catalog-2023.pdf`,
    category: "lathe_toolholders",
    products: ["static_holders", "live_tooling", "vdi", "boring_sleeves"],
    year: "2023",
    sizeMB: 54,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Seco Tools",
    file: "Milling 2018.1.pdf",
    path: `${CATALOG_PATH}/Milling 2018.1.pdf`,
    category: "milling",
    products: ["shoulder", "face", "disc", "plunge", "copy", "high_feed"],
    year: "2018",
    sizeMB: 39,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Seco Tools",
    file: "Solid End Mills.pdf",
    path: `${CATALOG_PATH}/Solid End Mills.pdf`,
    category: "solid_endmills",
    products: ["universal", "steel", "stainless", "aluminum", "hardened"],
    year: "2018",
    sizeMB: 40,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Seco Tools",
    file: "Turning 2018.1.pdf",
    path: `${CATALOG_PATH}/Turning 2018.1.pdf`,
    category: "turning",
    products: ["iso_turning", "mdt", "grooving", "parting"],
    year: "2018",
    sizeMB: 53,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Seco Tools",
    file: "Threading 2018.1.pdf",
    path: `${CATALOG_PATH}/Threading 2018.1.pdf`,
    category: "threading",
    products: ["thread_turning", "thread_milling", "taps"],
    year: "2018",
    sizeMB: 20,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Seco Tools",
    file: "Tooling Systems.pdf",
    path: `${CATALOG_PATH}/Tooling Systems.pdf`,
    category: "toolholders",
    products: ["hsk", "bt", "cat", "shrinkfit", "steadyline", "er_collets"],
    year: "2018",
    sizeMB: 29,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Kennametal",
    file: "Tooling Systems News 2018 English MetricInch.pdf",
    path: `${CATALOG_PATH}/Tooling Systems News 2018 English MetricInch.pdf`,
    category: "toolholders",
    products: ["turret_adapted", "shrink_fit", "machine_specific"],
    year: "2018",
    sizeMB: 12,
    inPrism: true,
    extractionStatus: "partially_extracted"
  },
  {
    manufacturer: "Guhring",
    file: "guhring full catalog.pdf",
    path: `${CATALOG_PATH}/guhring full catalog.pdf`,
    category: "full_catalog",
    products: ["drills", "end_mills", "taps", "reamers"],
    year: "2023",
    sizeMB: 49,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Guhring",
    file: "guhring tool holders.pdf",
    path: `${CATALOG_PATH}/guhring tool holders.pdf`,
    category: "toolholders",
    products: ["shrink_fit", "hydraulic", "cat_taper"],
    year: "2023",
    sizeMB: 0.6,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "IMCO Carbide Tool",
    file: "Metalmorphosis-2021-FINAL-reduced-for-Web.pdf",
    path: `${CATALOG_PATH}/Metalmorphosis-2021-FINAL-reduced-for-Web.pdf`,
    category: "end_mills",
    products: ["hem", "titanium", "stainless", "aluminum", "inconel"],
    year: "2021",
    sizeMB: 24,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "ISCAR",
    file: "Flash_Solid_catalog_INCH.pdf",
    path: `${CATALOG_PATH}/Flash_Solid_catalog_INCH.pdf`,
    category: "solid_endmills",
    products: ["flashline", "variable_pitch"],
    year: "2020",
    sizeMB: 86,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "ISCAR",
    file: "CAMFIX_Catalog.pdf",
    path: `${CATALOG_PATH}/CAMFIX_Catalog.pdf`,
    category: "modular_tooling",
    products: ["turning", "grooving", "threading", "quick_change"],
    year: "2020",
    sizeMB: 53,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "BIG DAISHOWA",
    file: "BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf",
    path: `${CATALOG_PATH}/BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf`,
    category: "toolholders",
    products: ["bt", "hsk", "capto", "kaiser_boring", "measuring"],
    year: "2022",
    sizeMB: 25,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Accupro",
    file: "Accupro 2013.pdf",
    path: `${CATALOG_PATH}/Accupro 2013.pdf`,
    category: "full_catalog",
    products: ["end_mills", "drills", "taps"],
    year: "2013",
    sizeMB: 42,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Kyocera SGS",
    file: "SGS_Global_Catalog_v26.1.pdf",
    path: `${CATALOG_PATH}/SGS_Global_Catalog_v26.1.pdf`,
    category: "full_catalog",
    products: ["end_mills", "drills", "countersinks", "reamers"],
    year: "2022",
    sizeMB: 16,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Tungaloy",
    file: "GC_2023-2024_US_Turning-Grooving.pdf",
    path: `${CATALOG_PATH}/GC_2023-2024_US_Turning-Grooving.pdf`,
    category: "turning",
    products: ["turning_inserts", "grooving", "grades"],
    year: "2023-2024",
    sizeMB: 48,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Tungaloy",
    file: "GC_2023-2024_US_Milling.pdf",
    path: `${CATALOG_PATH}/GC_2023-2024_US_Milling.pdf`,
    category: "milling",
    products: ["indexable_milling", "inserts"],
    year: "2023-2024",
    sizeMB: 48,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Tungaloy",
    file: "GC_2023-2024_US_Drilling.pdf",
    path: `${CATALOG_PATH}/GC_2023-2024_US_Drilling.pdf`,
    category: "drilling",
    products: ["indexable_drills", "solid_drills"],
    year: "2023-2024",
    sizeMB: 16,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "Tungaloy",
    file: "GC_2023-2024_US_Tooling.pdf",
    path: `${CATALOG_PATH}/GC_2023-2024_US_Tooling.pdf`,
    category: "toolholders",
    products: ["tooling_systems"],
    year: "2023-2024",
    sizeMB: 10,
    inPrism: true,
    extractionStatus: "raw_tables"
  },
  {
    manufacturer: "ZENIT",
    file: "zeni catalog.pdf",
    path: `${CATALOG_PATH}/zeni catalog.pdf`,
    category: "full_catalog",
    products: ["cutoff", "grooving", "turning", "milling", "drilling", "taps"],
    year: "2020",
    sizeMB: 183,
    inPrism: false,
    extractionStatus: "not_started"
  },
  {
    manufacturer: "Rapidkut",
    file: "2018 Rapidkut Catalog.pdf",
    path: `${CATALOG_PATH}/2018 Rapidkut Catalog.pdf`,
    category: "specialty",
    products: ["custom_tools"],
    year: "2018",
    sizeMB: 4,
    inPrism: false,
    extractionStatus: "not_started"
  }
];

// ============================================================================
// HARDCODED DATA — Workholding Catalogs (36 PDFs, ~831MB)
// ============================================================================

const WORKHOLDING_CATALOGS: WorkholdingCatalogEntry[] = [
  {
    manufacturer: "Kurt",
    files: 6,
    sizeMB: 120,
    products: ["dx_vise", "maxlock", "anglock", "crossover", "hydraulic"],
    inPrism: true,
    path: `${WORKHOLDING_PATH}/Kurt`
  },
  {
    manufacturer: "Jergens",
    files: 7,
    sizeMB: 174,
    products: ["ball_lock", "fixture_keys", "clamps", "zero_point", "modular"],
    inPrism: true,
    path: `${WORKHOLDING_PATH}/Jergens`
  },
  {
    manufacturer: "Schunk",
    files: 3,
    sizeMB: 151,
    products: ["vero_s", "tendo", "tribos", "kontec", "power_chucks"],
    inPrism: true,
    path: `${WORKHOLDING_PATH}/Schunk`
  },
  {
    manufacturer: "5th Axis",
    files: 2,
    sizeMB: 41,
    products: ["fixture_plates", "dovetail_vises", "pull_studs", "zero_point"],
    inPrism: true,
    path: `${WORKHOLDING_PATH}/5th Axis`
  },
  {
    manufacturer: "Lang Technik",
    files: 2,
    sizeMB: 41,
    products: ["makro_grip", "stamping_unit", "quick_point"],
    inPrism: true,
    path: `${WORKHOLDING_PATH}/Lang Technik`
  },
  {
    manufacturer: "Bison",
    files: 8,
    sizeMB: 110,
    products: ["manual_chucks", "power_chucks", "centers", "toolholders"],
    inPrism: false,
    path: `${WORKHOLDING_PATH}/Bison`
  },
  {
    manufacturer: "Kitagawa",
    files: 2,
    sizeMB: 33,
    products: ["power_chucks", "rotary_tables", "steady_rests"],
    inPrism: false,
    path: `${WORKHOLDING_PATH}/Kitagawa`
  },
  {
    manufacturer: "System 3R",
    files: 2,
    sizeMB: 61,
    products: ["macro_pallet", "micro_pallet", "edm_tooling", "reference_systems"],
    inPrism: false,
    path: `${WORKHOLDING_PATH}/System 3R`
  },
  {
    manufacturer: "Royal Products",
    files: 2,
    sizeMB: 71,
    products: ["live_centers", "5c_collets", "cnc_pullers"],
    inPrism: false,
    path: `${WORKHOLDING_PATH}/Royal Products`
  },
  {
    manufacturer: "Mate Precision",
    files: 2,
    sizeMB: 29,
    products: ["er_collets", "shrink_fit", "hydraulic_holders"],
    inPrism: false,
    path: `${WORKHOLDING_PATH}/Mate Precision`
  }
];

// ============================================================================
// HARDCODED DATA — Raw Tooling Tables (4,710 tables in JS files)
// ============================================================================

const RAW_TOOLING_ENTRIES: RawToolingEntry[] = [
  { manufacturer: "Korloy", file: "Korloy_Complete.js", path: `${RAW_TOOLING_PATH}/Korloy_Complete.js`, tables: 966, prismCoverage: 320 },
  { manufacturer: "Tungaloy", file: "Tungaloy_US_Tooling.js", path: `${RAW_TOOLING_PATH}/Tungaloy_US_Tooling.js`, tables: 906, prismCoverage: 280 },
  { manufacturer: "OSG", file: "OSG_Complete.js", path: `${RAW_TOOLING_PATH}/OSG_Complete.js`, tables: 675, prismCoverage: 210 },
  { manufacturer: "Ingersoll", file: "Ingersoll_Complete.js", path: `${RAW_TOOLING_PATH}/Ingersoll_Complete.js`, tables: 554, prismCoverage: 0 },
  { manufacturer: "Sandvik", file: "Sandvik_Complete.js", path: `${RAW_TOOLING_PATH}/Sandvik_Complete.js`, tables: 364, prismCoverage: 0 },
  { manufacturer: "EMUGE", file: "EMUGE_Complete.js", path: `${RAW_TOOLING_PATH}/EMUGE_Complete.js`, tables: 330, prismCoverage: 150 },
  { manufacturer: "M.A. Ford", file: "MA_Ford_Complete.js", path: `${RAW_TOOLING_PATH}/MA_Ford_Complete.js`, tables: 279, prismCoverage: 90 },
  { manufacturer: "ISCAR", file: "ISCAR_Complete.js", path: `${RAW_TOOLING_PATH}/ISCAR_Complete.js`, tables: 259, prismCoverage: 100 },
  { manufacturer: "BIG DAISHOWA", file: "BIG_DAISHOWA_Complete.js", path: `${RAW_TOOLING_PATH}/BIG_DAISHOWA_Complete.js`, tables: 184, prismCoverage: 60 },
  { manufacturer: "Haimer", file: "Haimer_Complete.js", path: `${RAW_TOOLING_PATH}/Haimer_Complete.js`, tables: 153, prismCoverage: 0 }
];

// ============================================================================
// KNOWN MACHINE MODEL MANUFACTURERS — used for directory-based enumeration
// ============================================================================

const KNOWN_MACHINE_MANUFACTURERS: Record<string, string[]> = {
  "Brother": ["brother"],
  "Datron": ["datron"],
  "DMG Mori": ["dmg", "mori"],
  "DN Solutions": ["dn solutions", "doosan", "dn_solutions"],
  "Haas": ["haas"],
  "Heller": ["heller"],
  "Hurco": ["hurco"],
  "Kern": ["kern"],
  "Makino": ["makino"],
  "Matsuura": ["matsuura"],
  "Mazak": ["mazak"],
  "Okuma": ["okuma"]
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class ManufacturerCatalogIndexEngineImpl {

  private machineModelsCache: MachineModelEntry[] | null = null;

  // ── getCatalogs ─────────────────────────────────────────────────────────
  /** List all manufacturer catalogs, optionally filtered by manufacturer/category/product. */
  getCatalogs(filter?: CatalogFilter): CatalogEntry[] {
    let results = [...MANUFACTURER_CATALOGS];

    if (filter?.manufacturer) {
      const mfr = filter.manufacturer.toLowerCase();
      results = results.filter(c => c.manufacturer.toLowerCase().includes(mfr));
    }
    if (filter?.category) {
      const cat = filter.category.toLowerCase();
      results = results.filter(c => c.category.toLowerCase().includes(cat));
    }
    if (filter?.product) {
      const prod = filter.product.toLowerCase();
      results = results.filter(c =>
        c.products.some(p => p.toLowerCase().includes(prod))
      );
    }
    if (filter?.yearMin) {
      const minYear = parseInt(filter.yearMin, 10);
      results = results.filter(c => {
        const yearStr = c.year.split("-")[0];
        const year = parseInt(yearStr, 10);
        return !isNaN(year) && year >= minYear;
      });
    }

    return results;
  }

  // ── getWorkholding ──────────────────────────────────────────────────────
  /** List workholding catalogs, optionally filtered by manufacturer or product. */
  getWorkholding(filter?: { manufacturer?: string; product?: string }): WorkholdingCatalogEntry[] {
    let results = [...WORKHOLDING_CATALOGS];

    if (filter?.manufacturer) {
      const mfr = filter.manufacturer.toLowerCase();
      results = results.filter(w => w.manufacturer.toLowerCase().includes(mfr));
    }
    if (filter?.product) {
      const prod = filter.product.toLowerCase();
      results = results.filter(w =>
        w.products.some(p => p.toLowerCase().includes(prod))
      );
    }

    return results;
  }

  // ── getMachineModels ────────────────────────────────────────────────────
  /** List machine 3D models, optionally filtered by manufacturer. Reads directory on first call. */
  getMachineModels(manufacturer?: string): MachineModelEntry[] {
    if (!this.machineModelsCache) {
      this.machineModelsCache = this.enumerateMachineModels();
    }

    let results = [...this.machineModelsCache];

    if (manufacturer) {
      const mfr = manufacturer.toLowerCase();
      results = results.filter(m => m.manufacturer.toLowerCase().includes(mfr));
    }

    return results;
  }

  // ── getRawTooling ───────────────────────────────────────────────────────
  /** List raw tooling table files with table counts. */
  getRawTooling(): RawToolingEntry[] {
    return [...RAW_TOOLING_ENTRIES];
  }

  // ── searchByManufacturer ────────────────────────────────────────────────
  /** Find ALL data across all sources for a manufacturer. */
  searchByManufacturer(name: string): ManufacturerSearchResult {
    const lowerName = name.toLowerCase();

    return {
      manufacturer: name,
      catalogs: MANUFACTURER_CATALOGS.filter(c =>
        c.manufacturer.toLowerCase().includes(lowerName)
      ),
      workholding: WORKHOLDING_CATALOGS.filter(w =>
        w.manufacturer.toLowerCase().includes(lowerName)
      ),
      machineModels: this.getMachineModels(name),
      rawTooling: RAW_TOOLING_ENTRIES.filter(r =>
        r.manufacturer.toLowerCase().includes(lowerName)
      )
    };
  }

  // ── searchByProduct ─────────────────────────────────────────────────────
  /** Find catalogs containing a product type across catalogs and workholding. */
  searchByProduct(product: string): {
    catalogs: CatalogEntry[];
    workholding: WorkholdingCatalogEntry[];
  } {
    const prod = product.toLowerCase();

    return {
      catalogs: MANUFACTURER_CATALOGS.filter(c =>
        c.products.some(p => p.toLowerCase().includes(prod)) ||
        c.category.toLowerCase().includes(prod)
      ),
      workholding: WORKHOLDING_CATALOGS.filter(w =>
        w.products.some(p => p.toLowerCase().includes(prod))
      )
    };
  }

  // ── getGaps ─────────────────────────────────────────────────────────────
  /** Report what manufacturers/product types are NOT yet in PRISM. */
  getGaps(): GapReport {
    const mfrsWithoutPrism = Array.from(new Set(
      MANUFACTURER_CATALOGS
        .filter(c => !c.inPrism)
        .map(c => c.manufacturer)
    ));

    // Categories where no catalog has inPrism = true
    const allCategories = Array.from(new Set(MANUFACTURER_CATALOGS.map(c => c.category)));
    const categoriesInPrism = new Set(
      MANUFACTURER_CATALOGS.filter(c => c.inPrism).map(c => c.category)
    );
    const categoriesNotInPrism = allCategories.filter(cat => !categoriesInPrism.has(cat));

    // Raw tables not fully ingested
    const rawNotIngested = RAW_TOOLING_ENTRIES.filter(r =>
      r.prismCoverage < r.tables * 0.5
    );

    // Catalogs older than 2020
    const currentYear = new Date().getFullYear();
    const staleCatalogs = MANUFACTURER_CATALOGS.filter(c => {
      const yearStr = c.year.split("-")[0];
      const year = parseInt(yearStr, 10);
      return !isNaN(year) && (currentYear - year) > 5;
    });

    return {
      manufacturersWithoutPrismData: mfrsWithoutPrism,
      categoriesWithoutPrismData: categoriesNotInPrism,
      rawTablesNotIngested: rawNotIngested,
      staleCatalogs,
      totalGaps: mfrsWithoutPrism.length + categoriesNotInPrism.length +
                 rawNotIngested.length + staleCatalogs.length
    };
  }

  // ── getSummary ──────────────────────────────────────────────────────────
  /** Quick stats: catalogs, workholding, models, raw tables, total manufacturers. */
  getSummary(): CatalogSummary {
    const models = this.getMachineModels();
    const totalCatalogSizeMB = MANUFACTURER_CATALOGS.reduce((s, c) => s + c.sizeMB, 0);
    const totalWorkholdingSizeMB = WORKHOLDING_CATALOGS.reduce((s, w) => s + w.sizeMB, 0);
    const totalSizeGB = (totalCatalogSizeMB + totalWorkholdingSizeMB) / 1024;

    const allMfrs = new Set<string>();
    MANUFACTURER_CATALOGS.forEach(c => allMfrs.add(c.manufacturer));
    WORKHOLDING_CATALOGS.forEach(w => allMfrs.add(w.manufacturer));
    models.forEach(m => allMfrs.add(m.manufacturer));
    RAW_TOOLING_ENTRIES.forEach(r => allMfrs.add(r.manufacturer));

    const categoryCounts: Record<string, number> = {};
    for (const c of MANUFACTURER_CATALOGS) {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    }

    return {
      totalCatalogs: MANUFACTURER_CATALOGS.length,
      totalWorkholdingEntries: WORKHOLDING_CATALOGS.length,
      totalMachineModels: models.length,
      totalRawToolingFiles: RAW_TOOLING_ENTRIES.length,
      totalRawTables: RAW_TOOLING_ENTRIES.reduce((s, r) => s + r.tables, 0),
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      uniqueManufacturers: allMfrs.size,
      manufacturerList: Array.from(allMfrs).sort(),
      categoryCounts
    };
  }

  // ── getIngestionPriority ────────────────────────────────────────────────
  /** Return prioritized ingestion list based on gaps, data freshness, and size. */
  getIngestionPriority(): IngestionPriorityEntry[] {
    const priorities: IngestionPriorityEntry[] = [];

    // Priority 1: Raw tables with zero PRISM coverage (highest-value quick wins)
    for (const r of RAW_TOOLING_ENTRIES) {
      if (r.prismCoverage === 0) {
        priorities.push({
          manufacturer: r.manufacturer,
          source: "raw_tables",
          priority: 1,
          reason: `${r.tables} tables with 0 PRISM coverage — structured data ready for ingestion`,
          tables: r.tables
        });
      }
    }

    // Priority 2: Raw tables with low PRISM coverage (<25%)
    for (const r of RAW_TOOLING_ENTRIES) {
      if (r.prismCoverage > 0 && r.prismCoverage < r.tables * 0.25) {
        const pct = Math.round((r.prismCoverage / r.tables) * 100);
        priorities.push({
          manufacturer: r.manufacturer,
          source: "raw_tables",
          priority: 2,
          reason: `${r.tables} tables, only ${pct}% in PRISM — high ROI expansion`,
          tables: r.tables
        });
      }
    }

    // Priority 3: Large catalogs not in PRISM (>100MB, likely high-value)
    for (const c of MANUFACTURER_CATALOGS) {
      if (!c.inPrism && c.sizeMB > 100) {
        priorities.push({
          manufacturer: c.manufacturer,
          source: "catalog",
          priority: 3,
          reason: `${c.sizeMB}MB ${c.category} catalog, not yet in PRISM — major data source`,
          sizeMB: c.sizeMB
        });
      }
    }

    // Priority 4: Workholding catalogs not in PRISM
    for (const w of WORKHOLDING_CATALOGS) {
      if (!w.inPrism) {
        priorities.push({
          manufacturer: w.manufacturer,
          source: "workholding",
          priority: 4,
          reason: `${w.files} workholding PDFs (${w.sizeMB}MB) — ${w.products.join(", ")}`,
          sizeMB: w.sizeMB
        });
      }
    }

    // Priority 5: Remaining catalogs not in PRISM (smaller ones)
    for (const c of MANUFACTURER_CATALOGS) {
      if (!c.inPrism && c.sizeMB <= 100) {
        // Skip if already added at higher priority
        const alreadyAdded = priorities.some(
          p => p.manufacturer === c.manufacturer && p.source === "catalog"
        );
        if (!alreadyAdded) {
          priorities.push({
            manufacturer: c.manufacturer,
            source: "catalog",
            priority: 5,
            reason: `${c.sizeMB}MB ${c.category} catalog — supplemental data`,
            sizeMB: c.sizeMB
          });
        }
      }
    }

    return priorities.sort((a, b) => a.priority - b.priority);
  }

  // ── Private: enumerateMachineModels ─────────────────────────────────────
  /** Read the machine models directory and parse files into MachineModelEntry records. */
  private enumerateMachineModels(): MachineModelEntry[] {
    const models: MachineModelEntry[] = [];

    try {
      if (!fs.existsSync(MACHINE_MODEL_PATH)) {
        return models;
      }

      const entries = this.readDirectoryRecursive(MACHINE_MODEL_PATH);

      for (const filePath of entries) {
        const ext = path.extname(filePath).toLowerCase();
        let format: MachineModelEntry["format"] | null = null;

        if (ext === ".step" || ext === ".stp") {
          format = "step";
        } else if (ext === ".mch") {
          format = "mch";
        } else if (ext === ".stl") {
          format = "stl";
        }

        if (!format) continue;

        const fileName = path.basename(filePath);
        const manufacturer = this.detectManufacturer(filePath, fileName);
        const model = this.extractModelName(fileName);

        models.push({
          manufacturer,
          model,
          file: fileName,
          path: filePath.replace(/\\/g, "/"),
          format
        });
      }
    } catch {
      // Directory not accessible — return empty array
    }

    return models;
  }

  /** Recursively read all files under a directory. */
  private readDirectoryRecursive(dirPath: string): string[] {
    const results: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.readDirectoryRecursive(fullPath));
        } else {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip inaccessible directories
    }

    return results;
  }

  /** Detect manufacturer from file path and name using known patterns. */
  private detectManufacturer(filePath: string, fileName: string): string {
    const lower = (filePath + "/" + fileName).toLowerCase();

    for (const [mfr, patterns] of Object.entries(KNOWN_MACHINE_MANUFACTURERS)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          return mfr;
        }
      }
    }

    // Try to extract from parent directory name
    const parts = filePath.replace(/\\/g, "/").split("/");
    const parentDir = parts.length >= 2 ? parts[parts.length - 2] : "";
    if (parentDir && parentDir !== path.basename(MACHINE_MODEL_PATH)) {
      return parentDir;
    }

    return "Unknown";
  }

  /** Extract a model name from a filename by removing extension and common prefixes. */
  private extractModelName(fileName: string): string {
    return fileName
      .replace(/\.(step|stp|mch|stl)$/i, "")
      .replace(/_/g, " ")
      .trim();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const manufacturerCatalogIndexEngine = new ManufacturerCatalogIndexEngineImpl();
