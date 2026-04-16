/**
 * catalogLoader — Dynamic Catalog Loading Utilities
 * ===================================================
 * Lazy-loads tool, material, and machine catalogs from JSON files.
 * Used for large catalogs (>1000 entries) to avoid bloating the bundle.
 *
 * Load paths (searched in order):
 *   1. dist/data/{filename}     — production build output
 *   2. src/data/{filename}      — source directory
 *   3. data/catalogs/{filename} — external catalog directory
 *
 * @module data/catalogLoader
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Generic catalog entry - minimal interface */
export interface CatalogEntry {
  [key: string]: unknown;
}

/** Catalog metadata for tracking */
export interface CatalogMeta {
  name: string;
  version: string;
  entry_count: number;
  last_updated: string;
  file_path?: string;
  load_time_ms?: number;
}

/** Loaded catalog with metadata */
export interface LoadedCatalog<T = unknown> {
  meta: CatalogMeta;
  entries: T[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Base directories to search for catalogs */
const CATALOG_SEARCH_PATHS = [
  path.join(process.cwd(), "dist", "data"),
  path.join(process.cwd(), "src", "data"),
  path.join(process.cwd(), "data", "catalogs"),
  path.join(process.cwd(), "data"),
];

// ============================================================================
// CATALOG CACHE
// ============================================================================

const catalogCache = new Map<string, unknown>();
const metaCache = new Map<string, CatalogMeta>();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Load a catalog JSON file by name.
 * Returns the parsed content directly (as array or object).
 *
 * @param catalogName - Filename (e.g., "osg-tools.json") or path fragment
 * @returns Parsed catalog content
 */
export function loadCatalog<T = unknown[]>(catalogName: string): T {
  // Check cache
  if (catalogCache.has(catalogName)) {
    return catalogCache.get(catalogName) as T;
  }

  const startTime = Date.now();

  // Find the file
  const filePath = findCatalogFile(catalogName);
  if (!filePath) {
    log.warn(`catalogLoader: catalog not found: ${catalogName}`);
    // Return empty array as fallback for array-expected catalogs
    const empty = [] as unknown as T;
    catalogCache.set(catalogName, empty);
    metaCache.set(catalogName, {
      name: catalogName,
      version: "0.0.0",
      entry_count: 0,
      last_updated: new Date().toISOString(),
      file_path: undefined,
      load_time_ms: Date.now() - startTime,
    });
    return empty;
  }

  // Load and parse
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as T;

    // Cache it
    catalogCache.set(catalogName, data);

    // Build metadata
    const entryCount = Array.isArray(data) ? data.length : Object.keys(data).length;
    metaCache.set(catalogName, {
      name: catalogName,
      version: "1.0.0",
      entry_count: entryCount,
      last_updated: fs.statSync(filePath).mtime.toISOString(),
      file_path: filePath,
      load_time_ms: Date.now() - startTime,
    });

    log.debug(`catalogLoader: loaded ${catalogName} (${entryCount} entries, ${Date.now() - startTime}ms)`);
    return data;
  } catch (err) {
    log.error(`catalogLoader: failed to load ${catalogName}`, { error: err, path: filePath });
    const empty = [] as unknown as T;
    catalogCache.set(catalogName, empty);
    return empty;
  }
}

/**
 * Load a named export from a catalog file.
 * Useful for files that export multiple arrays.
 *
 * @param catalogName - Filename (e.g., "ampc-tools.json")
 * @param exportName - Name of the export to extract (e.g., "AMPC_TOOLS")
 * @returns Extracted export or empty array
 */
export function loadCatalogExport<T = unknown[]>(catalogName: string, exportName: string): T {
  const cacheKey = `${catalogName}::${exportName}`;

  // Check cache
  if (catalogCache.has(cacheKey)) {
    return catalogCache.get(cacheKey) as T;
  }

  // Load the full catalog
  const data = loadCatalog<Record<string, unknown>>(catalogName);

  // Extract the named export
  if (data && typeof data === "object" && exportName in data) {
    const exported = data[exportName] as T;
    catalogCache.set(cacheKey, exported);
    return exported;
  }

  log.warn(`catalogLoader: export '${exportName}' not found in ${catalogName}`);
  const empty = [] as unknown as T;
  catalogCache.set(cacheKey, empty);
  return empty;
}

/**
 * Find a catalog file in the search paths.
 */
function findCatalogFile(catalogName: string): string | null {
  // If it's already an absolute path, use it directly
  if (path.isAbsolute(catalogName) && fs.existsSync(catalogName)) {
    return catalogName;
  }

  // Normalize the filename
  const filename = catalogName.endsWith(".json") ? catalogName : `${catalogName}.json`;

  // Search in configured paths
  for (const basePath of CATALOG_SEARCH_PATHS) {
    const fullPath = path.join(basePath, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    // Also try without .json extension for TypeScript-exported catalogs
    const tsPath = fullPath.replace(".json", ".ts");
    if (fs.existsSync(tsPath)) {
      // Can't dynamically import TS at runtime, so skip
      continue;
    }
  }

  return null;
}

/**
 * Clear the catalog cache (for testing or memory management).
 */
export function clearCatalogCache(): void {
  catalogCache.clear();
  metaCache.clear();
  log.info("catalogLoader: cache cleared");
}

/**
 * Get list of cached catalog names.
 */
export function getCachedCatalogs(): string[] {
  return Array.from(catalogCache.keys());
}

/**
 * Get metadata for a loaded catalog.
 */
export function getCatalogMeta(catalogName: string): CatalogMeta | undefined {
  return metaCache.get(catalogName);
}

/**
 * Get all catalog metadata.
 */
export function getAllCatalogMeta(): Map<string, CatalogMeta> {
  return new Map(metaCache);
}

/**
 * Preload multiple catalogs in parallel.
 * Useful for warming up frequently-used catalogs.
 */
export function preloadCatalogs(catalogNames: string[]): void {
  log.info(`catalogLoader: preloading ${catalogNames.length} catalogs`);
  for (const name of catalogNames) {
    loadCatalog(name);
  }
}

/**
 * Get total memory estimate of cached catalogs.
 */
export function getCacheMemoryEstimate(): { total_entries: number; catalog_count: number } {
  let totalEntries = 0;
  for (const meta of metaCache.values()) {
    totalEntries += meta.entry_count;
  }
  return {
    total_entries: totalEntries,
    catalog_count: catalogCache.size,
  };
}
