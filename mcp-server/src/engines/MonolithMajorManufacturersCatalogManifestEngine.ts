/**
 * MonolithMajorManufacturersCatalogManifestEngine — U-DB-MONOLITH-MAJOR-MFRS-MANIFEST
 *
 * MANIFEST port of `PRISM_MAJOR_MANUFACTURERS_CATALOG.js` v1.0.0 from the
 * v8.89 monolith extraction (`extracted/catalogs/`). The source is 1932 lines
 * of premium-tier cutting-tool manufacturer catalogs (Sandvik Coromant + 6
 * peer-tier global cutting-tool brands).
 *
 * SCOPE: Ships pinned manufacturer records (name/country/founded/quality/
 * priceLevel/marketPosition/website/specialty) for all 7 major manufacturers
 * + the catalog's section structure (milling/turning/drilling/grades per
 * manufacturer). Full product-line ingest (hundreds of tool series + grade
 * names) is a follow-up unit requiring .js→.json conversion.
 *
 * The 7 manufacturers covered here are the global cutting-tool leaders by
 * market position — Sandvik leads on quality (Ultra-Premium, priceLevel 5),
 * the other 6 cluster as Premium / priceLevel 4. Founding years span
 * 1871 (Mitsubishi Materials) to 1952 (ISCAR), giving the catalog a wide
 * historical baseline for vendor-stability analysis.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MAJOR-MFRS-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_MAJOR_MANUFACTURERS_CATALOG.js v1.0.0
 */

export interface MajorManufacturerRecord {
  id: string;
  name: string;
  country: string;
  founded: number;
  /** "Ultra-Premium" or "Premium". */
  quality: "Ultra-Premium" | "Premium";
  /** 1=economy through 5=ultra-premium. */
  priceLevel: number;
  marketPosition: string;
  website: string;
  specialty: string;
  /** Parent corporation if applicable (Tungaloy → IMC Group). */
  parent?: string;
}

const VERSION = "1.0.0";
const LAST_UPDATED = "2026-01-06";

const MANUFACTURERS: readonly MajorManufacturerRecord[] = [
  {
    id: "sandvik",
    name: "Sandvik Coromant",
    country: "Sweden",
    founded: 1942,
    quality: "Ultra-Premium",
    priceLevel: 5,
    marketPosition: "Global Leader",
    website: "sandvik.coromant.com",
    specialty: "Complete machining solutions",
  },
  {
    id: "kennametal",
    name: "Kennametal",
    country: "USA",
    founded: 1938,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 3 Global",
    website: "kennametal.com",
    specialty: "Metalworking solutions and wear-resistant materials",
  },
  {
    id: "iscar",
    name: "ISCAR",
    country: "Israel",
    founded: 1952,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 5 Global",
    website: "iscar.com",
    specialty: "Innovative cutting tool solutions",
  },
  {
    id: "seco",
    name: "Seco Tools",
    country: "Sweden",
    founded: 1932,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 5 Global",
    website: "secotools.com",
    specialty: "Complete metal cutting solutions",
  },
  {
    id: "mitsubishi",
    name: "Mitsubishi Materials",
    country: "Japan",
    founded: 1871,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 10 Global",
    website: "mmc-carbide.com",
    specialty: "Carbide tools and materials technology",
  },
  {
    id: "walter",
    name: "Walter",
    country: "Germany",
    founded: 1919,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 10 Global",
    website: "walter-tools.com",
    specialty: "Precision tools for metalworking",
  },
  {
    id: "tungaloy",
    name: "Tungaloy",
    country: "Japan",
    founded: 1929,
    quality: "Premium",
    priceLevel: 4,
    marketPosition: "Top 10 Global",
    website: "tungaloy.com",
    specialty: "Cemented carbide and cutting tools",
    parent: "IMC Group",
  },
] as const;

/** All 7 manufacturers carry these 4 catalog sections in the source. */
const CATALOG_SECTIONS: readonly string[] = [
  "milling", "turning", "drilling", "grades",
] as const;

export class MonolithMajorManufacturersCatalogManifestEngine {
  get version(): string { return VERSION; }
  get lastUpdated(): string { return LAST_UPDATED; }

  /** All 7 major manufacturer records. */
  listManufacturers(): MajorManufacturerRecord[] {
    return MANUFACTURERS.map((m) => ({ ...m }));
  }

  /** Get a single manufacturer by id (lowercase canonical key). Returns null on miss. */
  getManufacturer(id: string): MajorManufacturerRecord | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const want = id.trim().toLowerCase();
    const m = MANUFACTURERS.find((x) => x.id === want);
    return m ? { ...m } : null;
  }

  /** Manufacturers filtered by country (case-insensitive exact match). */
  listByCountry(country: string): MajorManufacturerRecord[] {
    if (typeof country !== "string" || country.trim() === "") return [];
    const want = country.trim().toLowerCase();
    return MANUFACTURERS
      .filter((m) => m.country.toLowerCase() === want)
      .map((m) => ({ ...m }));
  }

  /** Manufacturers filtered by quality tier. */
  listByQuality(quality: "Ultra-Premium" | "Premium"): MajorManufacturerRecord[] {
    return MANUFACTURERS
      .filter((m) => m.quality === quality)
      .map((m) => ({ ...m }));
  }

  /**
   * Manufacturers founded within a year range (inclusive). Useful for
   * vendor-stability analysis. Returns [] on inverted range or invalid input.
   */
  listFoundedBetween(startYear: number, endYear: number): MajorManufacturerRecord[] {
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return [];
    if (startYear > endYear) return [];
    return MANUFACTURERS
      .filter((m) => m.founded >= startYear && m.founded <= endYear)
      .map((m) => ({ ...m }));
  }

  /** Sorted by founding year (oldest first). */
  listByFoundedAscending(): MajorManufacturerRecord[] {
    return [...MANUFACTURERS]
      .sort((a, b) => a.founded - b.founded)
      .map((m) => ({ ...m }));
  }

  /** 4 catalog sections every major manufacturer carries. */
  listCatalogSections(): string[] {
    return [...CATALOG_SECTIONS];
  }

  stats(): {
    version: string;
    lastUpdated: string;
    manufacturerCount: number;
    catalogSectionCount: number;
    byCountry: Record<string, number>;
    byQuality: Record<string, number>;
    foundedRange: { earliest: number; latest: number };
  } {
    const byCountry: Record<string, number> = {};
    const byQuality: Record<string, number> = {};
    let earliest = Infinity, latest = -Infinity;
    for (const m of MANUFACTURERS) {
      byCountry[m.country] = (byCountry[m.country] ?? 0) + 1;
      byQuality[m.quality] = (byQuality[m.quality] ?? 0) + 1;
      if (m.founded < earliest) earliest = m.founded;
      if (m.founded > latest) latest = m.founded;
    }
    return {
      version: VERSION,
      lastUpdated: LAST_UPDATED,
      manufacturerCount: MANUFACTURERS.length,
      catalogSectionCount: CATALOG_SECTIONS.length,
      byCountry,
      byQuality,
      foundedRange: { earliest, latest },
    };
  }
}

export const monolithMajorManufacturersCatalogManifestEngine =
  new MonolithMajorManufacturersCatalogManifestEngine();
