/**
 * PRISM Calculator -- Indexable-Insert Catalog Accessor
 * =====================================================
 * Normalizes the consolidated insert reference database
 * (`mcp-server/data/prism-reference-db/inserts.json`, store `INSERT_DATABASE`)
 * into frontend-ready select-option lists for the SFC calculator's tooling /
 * insert input. Backs `GET /api/v1/data/insert/catalog`.
 *
 * `INSERT_DATABASE` is keyed by insert family (R245-12, R390-11, SDMT1204, ...);
 * each family holds an array of physical insert products carrying manufacturer /
 * grade / coating / workpiece-material / chipbreaker / edges. They are flattened
 * into a single option list, with distinct `manufacturers` and `materials` facets
 * for frontend filtering.
 *
 * Fail-soft: a missing or malformed DB degrades to a small curated insert set
 * (source = "curated", liveCount = 0) so the select is never empty -- the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-INSERT-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** A single indexable-insert option ready for a frontend `<select>`. */
export interface InsertOption {
  id: string;
  label: string;
  detail: string;
  manufacturer: string;
  grade: string;
  coating: string;
  material: string;
  family: string;
}

/** Catalog response envelope -- mirrors the coating/workholding catalog contract. */
export interface InsertCatalogResponse {
  options: InsertOption[];
  /** Distinct manufacturers present (for a facet filter). */
  manufacturers: string[];
  /** Distinct workpiece-material families present (e.g. "Steel (P)"). */
  materials: string[];
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const INSERTS_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "prism-reference-db", "inserts.json");

/**
 * Curated fallback -- used only when the reference DB is missing/unreadable so the
 * SFC insert select is never empty. A handful of the most common indexable inserts;
 * `source` is reported as "curated" when this is used.
 */
const CURATED_FALLBACK: InsertOption[] = [
  { id: "cnmg120408", label: "CNMG 120408", detail: "Generic - General turning - CVD - Steel (P) - 4 edges", manufacturer: "Generic", grade: "General turning", coating: "CVD", material: "Steel (P)", family: "CNMG" },
  { id: "dnmg150408", label: "DNMG 150408", detail: "Generic - Profiling - PVD - Stainless (M) - 4 edges", manufacturer: "Generic", grade: "Profiling", coating: "PVD", material: "Stainless (M)", family: "DNMG" },
  { id: "apmt1604", label: "APMT 1604", detail: "Generic - High feed - PVD - Steel (P) - 2 edges", manufacturer: "Generic", grade: "High feed", coating: "PVD", material: "Steel (P)", family: "APMT" },
  { id: "r245-12", label: "R245-12", detail: "Generic - Face mill - CVD - Steel (P) - 4 edges", manufacturer: "Generic", grade: "Face mill", coating: "CVD", material: "Steel (P)", family: "R245-12" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Slugify an insert id/name into a stable, URL/select-safe option id. */
export function insertOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildInsertDetail(manufacturer: string, grade: string, coating: string, material: string, edges: number): string {
  const parts: string[] = [];
  if (manufacturer) parts.push(manufacturer);
  if (grade) parts.push(grade);
  if (coating) parts.push(coating);
  if (material) parts.push(material);
  if (edges > 0) parts.push(`${edges} edges`);
  return parts.join(" - ");
}

/**
 * PURE: normalize the `stores` object of inserts.json into option rows by
 * flattening `INSERT_DATABASE` (family -> product[]). Exported for direct R9
 * testing of malformed/empty inputs without filesystem IO.
 */
export function buildInsertOptionsFromStores(stores: unknown): InsertOption[] {
  const root = asRecord(stores);
  const db = root ? asRecord(root.INSERT_DATABASE) : null;
  if (!db) return [];

  const seen = new Set<string>();
  const options: InsertOption[] = [];
  for (const [family, rawArr] of Object.entries(db)) {
    if (!Array.isArray(rawArr)) continue;
    for (const rawEntry of rawArr) {
      const entry = asRecord(rawEntry);
      if (!entry) continue;
      const name = readText(entry.name);
      const rawId = readText(entry.id) || name;
      if (!rawId) continue;
      const id = insertOptionId(rawId, `insert-${options.length}`);
      if (seen.has(id)) continue;
      seen.add(id);

      const manufacturer = readText(entry.manufacturer);
      const grade = readText(entry.grade);
      const coating = readText(entry.coating);
      const material = readText(entry.material);
      const edges = safeNum(entry.edges);
      const label = name || id;
      options.push({
        id,
        label,
        detail: buildInsertDetail(manufacturer, grade, coating, material, edges) || label,
        manufacturer,
        grade,
        coating,
        material,
        family,
      });
    }
  }
  return options;
}

/** Distinct, sorted, non-empty values of a field across the option set. */
function distinct(options: InsertOption[], field: "manufacturer" | "material"): string[] {
  const set = new Set<string>();
  for (const o of options) {
    if (o[field]) set.add(o[field]);
  }
  return [...set].sort();
}

let cachedDb: Record<string, unknown> | null = null;
let cachedDbAttempted = false;

function loadInsertDb(): Record<string, unknown> | null {
  if (cachedDbAttempted) return cachedDb;
  try {
    if (!fs.existsSync(INSERTS_DB_PATH)) {
      // File genuinely absent -- a deterministic outcome; latch it.
      cachedDb = null;
      cachedDbAttempted = true;
      return null;
    }
    cachedDb = JSON.parse(fs.readFileSync(INSERTS_DB_PATH, "utf8")) as Record<string, unknown>;
    cachedDbAttempted = true;
  } catch {
    // Transient/partial-write read or parse failure -- do NOT latch; retry next call.
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook -- clears the module-level DB cache. */
export function resetInsertCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded DB object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 */
export function buildInsertCatalog(db: Record<string, unknown> | null): InsertCatalogResponse {
  const stores = db ? db.stores : null;
  const liveOptions = buildInsertOptionsFromStores(stores);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      manufacturers: distinct(CURATED_FALLBACK, "manufacturer"),
      materials: distinct(CURATED_FALLBACK, "material"),
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated insert set active -- the consolidated insert reference database was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    manufacturers: distinct(liveOptions, "manufacturer"),
    materials: distinct(liveOptions, "material"),
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live indexable-insert catalog from the PRISM consolidated reference database (INSERT_DATABASE).",
  };
}

/**
 * Build the SFC insert select catalog from the consolidated reference DB (cached read).
 * Thin wrapper over the pure `buildInsertCatalog` so the HTTP route stays trivial.
 */
export function getCalculatorInsertCatalog(): InsertCatalogResponse {
  return buildInsertCatalog(loadInsertDb());
}
