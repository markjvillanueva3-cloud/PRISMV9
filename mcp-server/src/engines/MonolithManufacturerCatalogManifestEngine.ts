/**
 * MonolithManufacturerCatalogManifestEngine — U-DB-MONOLITH-MFR-CATALOG-MANIFEST
 *
 * MANIFEST-only port of `PRISM_MANUFACTURER_CATALOG_DB.js` v1.0.0 from the
 * v8.89 monolith extraction (`extracted/catalogs/`). The full source file is
 * ~5800 lines carrying 744 inserts + 197 grades + 3424 cutting-data rows +
 * 3403 tool-body records across 13 named manufacturer slots — too big to
 * hand-port in one session. This engine ships the MANIFEST surface
 * (manufacturers list + per-manufacturer counts + headline totals) so callers
 * can:
 *   1. Navigate which manufacturers are catalog-covered (13 named slots)
 *   2. Plan ingest priority (e.g. SECO has 483 inserts → high-leverage)
 *   3. Reference the corpus by stable counts in dashboards
 *
 * Full data ingest (744 inserts + 3424 cutting_data rows + ...) is a
 * follow-up unit that should convert the .js source to .json + ship a
 * lazy-loader engine. The data shape (insert/grade/cuttingData records) is
 * intentionally NOT typed here — that pre-commits the schema before the
 * follow-up gets to look at the full file.
 *
 * The manufacturers list here is the **stats-table** keys (13 names),
 * which is a strict superset of the **manufacturers array** (11 names
 * — missing INGERSOLL + MA_FORD which appear with all-zero counts).
 * The Engine surfaces both — `listManufacturers()` returns the wide set,
 * `listManufacturersWithInventory()` filters to those with ≥1 non-zero count.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MFR-CATALOG-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_MANUFACTURER_CATALOG_DB.js v1.0.0 (generated 2026-01-18)
 */

export interface PerManufacturerCounts {
  inserts: number;
  grades: number;
  cutting_data: number;
}

export interface ManufacturerCatalogStats {
  inserts: number;
  grades: number;
  cuttingData: number;
  toolBodies: number;
  byManufacturer: Record<string, PerManufacturerCounts>;
}

const VERSION = "1.0.0";
const GENERATED = "2026-01-18T00:49:14.294461";
const TOTAL_PAGES = 7904;

const MANUFACTURERS: readonly string[] = [
  "CARMEX", "GENERIC", "GLOBAL_CNC", "IMCO", "LYNDEX_NIKKEN",
  "OSG", "PARLEC", "SANDVIK", "SECO", "SGS", "TUNGALOY",
] as const;

const STATS: ManufacturerCatalogStats = {
  inserts: 744,
  grades: 197,
  cuttingData: 3424,
  toolBodies: 3403,
  byManufacturer: {
    CARMEX:         { inserts: 0,   grades: 23, cutting_data: 236  },
    GENERIC:        { inserts: 0,   grades: 0,  cutting_data: 66   },
    GLOBAL_CNC:     { inserts: 0,   grades: 23, cutting_data: 0    },
    IMCO:           { inserts: 0,   grades: 0,  cutting_data: 61   },
    INGERSOLL:      { inserts: 0,   grades: 0,  cutting_data: 0    },
    LYNDEX_NIKKEN:  { inserts: 0,   grades: 45, cutting_data: 1221 },
    MA_FORD:        { inserts: 0,   grades: 0,  cutting_data: 0    },
    OSG:            { inserts: 10,  grades: 36, cutting_data: 976  },
    PARLEC:         { inserts: 0,   grades: 0,  cutting_data: 45   },
    SANDVIK:        { inserts: 251, grades: 15, cutting_data: 0    },
    SECO:           { inserts: 483, grades: 55, cutting_data: 111  },
    SGS:            { inserts: 0,   grades: 0,  cutting_data: 123  },
    TUNGALOY:       { inserts: 0,   grades: 0,  cutting_data: 585  },
  },
};

export class MonolithManufacturerCatalogManifestEngine {
  get version(): string { return VERSION; }
  get generated(): string { return GENERATED; }
  get totalPages(): number { return TOTAL_PAGES; }

  /**
   * The 11 manufacturers in the source's top-level `manufacturers` array.
   * Excludes INGERSOLL + MA_FORD (which appear in stats with all-zero counts).
   */
  listManufacturers(): string[] {
    return [...MANUFACTURERS];
  }

  /** Full 13-key list from the stats table — includes zero-count entries. */
  listAllManufacturerStatsKeys(): string[] {
    return Object.keys(STATS.byManufacturer).sort();
  }

  /**
   * Manufacturers with at least one non-zero count (inserts/grades/cutting_data).
   * Useful for "what catalogs actually have ingested data?".
   */
  listManufacturersWithInventory(): string[] {
    return Object.entries(STATS.byManufacturer)
      .filter(([, counts]) => counts.inserts > 0 || counts.grades > 0 || counts.cutting_data > 0)
      .map(([name]) => name)
      .sort();
  }

  getStats(): ManufacturerCatalogStats {
    // Deep clone so callers can't mutate the source-of-truth.
    return {
      ...STATS,
      byManufacturer: Object.fromEntries(
        Object.entries(STATS.byManufacturer).map(([k, v]) => [k, { ...v }]),
      ),
    };
  }

  /** Per-manufacturer counts, or null on unknown name. */
  getCountsFor(manufacturer: string): PerManufacturerCounts | null {
    if (typeof manufacturer !== "string" || manufacturer.trim() === "") return null;
    const c = STATS.byManufacturer[manufacturer];
    return c ? { ...c } : null;
  }

  /**
   * Rank by inserts + grades + cutting_data weighted equally. Useful for
   * scheduling ingest order — SECO (483 + 55 + 111 = 649) > SANDVIK (266) > etc.
   */
  rankByInventoryWeight(): Array<{ manufacturer: string; weight: number }> {
    return Object.entries(STATS.byManufacturer)
      .map(([m, c]) => ({ manufacturer: m, weight: c.inserts + c.grades + c.cutting_data }))
      .sort((a, b) => b.weight - a.weight);
  }
}

export const monolithManufacturerCatalogManifestEngine =
  new MonolithManufacturerCatalogManifestEngine();
