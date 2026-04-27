/**
 * Lazy Catalog Loader — loads tool catalog JSON from disk on first access.
 *
 * Instead of importing 25MB of static arrays that bake into the bundle,
 * catalogs are stored as JSON files in dist/data/ and loaded on demand.
 *
 * Usage:
 *   const tools = loadCatalog<OSGTool[]>("osg-tools.json");
 *
 * The JSON files are generated at build time by scripts/build-catalog-json.mjs.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, unknown>();

function dataDir(): string {
  // dist/index.js → __dirname/data; dist/chunks/*.js → __dirname/../data.
  for (const c of [join(__dirname, "data"), join(__dirname, "..", "data")]) {
    if (existsSync(c)) return c;
  }
  return join(__dirname, "data");
}

/**
 * Load a catalog JSON file lazily. First call reads from disk and caches;
 * subsequent calls return the cached value.
 */
export function loadCatalog<T>(filename: string): T {
  let data = cache.get(filename);
  if (data === undefined) {
    const filePath = join(dataDir(), filename);
    data = JSON.parse(readFileSync(filePath, "utf8"));
    cache.set(filename, data);
  }
  return data as T;
}

/**
 * Load a specific named export from a multi-export catalog JSON.
 * The JSON file is structured as { exportName: data, ... }.
 */
export function loadCatalogExport<T>(filename: string, exportName: string): T {
  const bundle = loadCatalog<Record<string, unknown>>(filename);
  return bundle[exportName] as T;
}

/** Clear all cached catalogs (useful for testing) */
export function clearCatalogCache(): void {
  cache.clear();
}
