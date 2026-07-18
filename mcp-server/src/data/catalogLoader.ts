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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cache = new Map<string, unknown>();

// ESM-safe module dir. A bare `__dirname` is undefined in ES-module scope, so any raw-ESM
// runner (e.g. `tsx scripts/*.ts` that transitively imports a catalog) crashed with a
// ReferenceError before it could even look for the data. Deriving it from import.meta.url works
// under BOTH raw ESM (tsx: resolves to src/data) AND the esbuild ESM bundle (esbuild.config.mjs
// sets format:"esm" and preserves import.meta.url natively -> resolves to the chunk dir in dist,
// identical to the old __dirname; the two-candidate dataDir() loop handles entry-vs-chunk
// placement). The data-resolution is byte-identical to the prior behavior in every bundled/test
// context that already worked, and newly correct under raw ESM. (Idiom matches 50+ bundled src/.)
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function dataDir(): string {
  // bundle: MODULE_DIR/data (dist/data); chunked bundle: MODULE_DIR/../data.
  for (const c of [join(MODULE_DIR, "data"), join(MODULE_DIR, "..", "data")]) {
    if (existsSync(c)) return c;
  }
  return join(MODULE_DIR, "data");
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
