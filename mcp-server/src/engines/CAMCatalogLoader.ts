/**
 * CAMCatalogLoader — CAM-AI-TRAINING-MS0/U-CAMT-B-CLICK runtime loader
 *
 * Production fs adapter for the CAMClickSequenceEngine. Reads the
 * per-software function-index JSON catalogs from
 *   mcp-server/data/cam-functions/<system>/
 * and merges them into a single SoftwareCatalog the click engine can
 * consume.
 *
 * Tests pass canned catalogs inline — this loader is ONLY for runtime
 * dispatcher invocations.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CamSystem } from "./CAMOperationTaxonomyEngine.js";
import type { SoftwareCatalog, CatalogToolpath } from "./CAMClickSequenceEngine.js";

const here = dirname(fileURLToPath(import.meta.url));

// Resolve the data root from the engine's compiled location. Works in
// both dev (src/engines) and prod (dist/engines).
const DATA_ROOT_CANDIDATES = [
  join(here, "..", "..", "data", "cam-functions"),
  join(here, "..", "..", "..", "data", "cam-functions"),
  join(here, "..", "..", "..", "mcp-server", "data", "cam-functions"),
];

function resolveDataRoot(): string | null {
  for (const c of DATA_ROOT_CANDIDATES) {
    if (existsSync(c)) return c;
  }
  return null;
}

// System → directory name in data/cam-functions/
const SYSTEM_DIR: Record<CamSystem, string> = {
  fusion360: "fusion360",
  mastercam: "mastercam",
  hypermill: "hypermill",
  solidcam: "solidcam",
  inventor_hsm: "inventor-hsm",
  nx_cam: "nxcam",
  powermill: "powermill",
  esprit: "esprit",
  catia_machining: "catia",
  edgecam: "edgecam",
  gibbscam: "gibbscam",
  worknc: "worknc",
  topsolid: "topsolid",
  camworks: "camworks",
  tebis: "tebis",
  bobcad: "bobcad",
  cimatron: "cimatron",
  sprutcam: "sprutcam",
  alphacam: "alphacam",
  featurecam: "featurecam",
  vericut: "vericut",
  surfcam: "surfcam",
  visi: "visi",
  creo: "creo",
  partmaker: "partmaker",
};

/** Light in-process cache so repeated dispatcher hits don't re-read disk. */
const cache = new Map<CamSystem, SoftwareCatalog | null>();

// Normalize a vendor catalog entry into the canonical CatalogToolpath shape.
// Fusion 360 uses { tabs: { TAB: { parameters: [...] } } }.
// Mastercam / hyperMILL / SolidCAM use { pages: { TAB: { params: [...] } } }
// or { module: { toolpaths: [...] } } with the pages-inside-each-entry shape.
function normalizeToolpathEntry(raw: unknown): CatalogToolpath | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const tabsRaw = (r.tabs ?? r.pages) as Record<string, unknown> | undefined;
  if (!tabsRaw || typeof tabsRaw !== "object") return null;
  const tabs: Record<string, { parameters: Array<{ name: string; type: string; required?: boolean; default?: unknown; unit?: string; options?: ReadonlyArray<string> }> }> = {};
  for (const [tabName, tabBody] of Object.entries(tabsRaw)) {
    if (!tabBody || typeof tabBody !== "object") continue;
    const tb = tabBody as Record<string, unknown>;
    const paramArr = (tb.parameters ?? tb.params) as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(paramArr)) continue;
    const params = paramArr.map((p) => ({
      name: String(p.name ?? p.id ?? ""),
      type: String(p.type ?? "numeric"),
      required: p.required as boolean | undefined,
      default: p.default,
      unit: p.unit as string | undefined,
      options: (p.values ?? p.options) as ReadonlyArray<string> | undefined,
    })).filter((p) => p.name.length > 0);
    if (params.length > 0) tabs[tabName] = { parameters: params };
  }
  if (Object.keys(tabs).length === 0) return null;
  return {
    description: r.description as string | undefined,
    category: r.category as string | undefined,
    parameterCount: r.params_count as number | undefined ?? r.parameterCount as number | undefined,
    tabs: tabs as CatalogToolpath["tabs"],
  };
}

/** Pure FS reader — read every JSON in the system dir, merge toolpath blocks. */
function readCatalog(system: CamSystem): SoftwareCatalog | null {
  const root = resolveDataRoot();
  if (!root) return null;
  const dirName = SYSTEM_DIR[system];
  if (!dirName) return null;
  const dir = join(root, dirName);
  if (!existsSync(dir)) return null;

  let entries: string[];
  try {
    entries = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return null;
  }

  const merged: SoftwareCatalog = {
    schemaVersion: "1.0.0",
    metadata: { title: `${system} merged catalog`, source: dir },
    toolpaths: {},
  };
  const outTps = merged.toolpaths as Record<string, CatalogToolpath>;

  for (const f of entries) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch {
      continue;          // skip malformed file, keep going
    }
    if (!parsed || typeof parsed !== "object") continue;
    const p = parsed as Record<string, unknown>;

    // Three shapes seen in the wild:
    //   { toolpaths: { KEY: {tabs:...} } }              — Fusion 360
    //   { module: { toolpaths: [{id,name,pages}, ...] } } — Mastercam, hyperMILL
    //   { KEY: {tabs:...} }                              — flat (rare)
    if (p.module && typeof p.module === "object") {
      const mod = p.module as Record<string, unknown>;
      const arr = mod.toolpaths as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          const id = String(entry.id ?? entry.name ?? "");
          if (!id) continue;
          const norm = normalizeToolpathEntry(entry);
          if (norm) outTps[id] = norm;
        }
        continue;
      }
    }
    const tps = (p.toolpaths ?? p) as Record<string, unknown>;
    for (const [k, v] of Object.entries(tps)) {
      if (k === "schemaVersion" || k === "metadata" || k === "commonTabs"
          || k === "system_id" || k === "module" || k === "provenance") continue;
      const norm = normalizeToolpathEntry(v);
      if (norm) outTps[k] = norm;
    }
  }

  if (Object.keys(outTps).length === 0) return null;
  return merged;
}

/**
 * Fuzzy match a catalog key against a target name (typically the taxonomy
 * nativeName for an op). Re-exported for convenience — the canonical
 * implementation lives on CAMClickSequenceEngine.resolveByNativeName so
 * the click engine stays self-contained and there's no circular dep.
 */
export function resolveCatalogKey(catalog: SoftwareCatalog, target: string): string | null {
  if (!target) return null;
  const tps = catalog.toolpaths ?? {};
  const keys = Object.keys(tps);
  if (keys.length === 0) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetN = norm(target);
  if (!targetN) return null;
  for (const k of keys) {
    if (norm(k) === targetN) return k;
    const name = (tps[k] as { name?: string }).name;
    if (name && norm(name) === targetN) return k;
  }
  for (const k of keys) {
    const kN = norm(k);
    if (kN.includes(targetN) || targetN.includes(kN)) return k;
    const name = (tps[k] as { name?: string }).name;
    if (name) {
      const nameN = norm(name);
      if (nameN.includes(targetN) || targetN.includes(nameN)) return k;
    }
  }
  return null;
}

/** Cached catalog loader — the production CatalogLoader the dispatcher wires. */
export function loadCAMCatalog(system: CamSystem): SoftwareCatalog | null {
  if (cache.has(system)) return cache.get(system) ?? null;
  const c = readCatalog(system);
  cache.set(system, c);
  return c;
}

/** Test helper — clear the in-process cache. */
export function clearCAMCatalogCache(): void {
  cache.clear();
}
