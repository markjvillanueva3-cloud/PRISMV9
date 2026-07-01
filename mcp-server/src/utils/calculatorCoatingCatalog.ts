/**
 * PRISM Calculator -- Coating Catalog Accessor
 * ============================================
 * Normalizes the consolidated tool-coating reference database
 * (`mcp-server/data/prism-reference-db/coatings.json`, store `PRISM_COATINGS_COMPLETE`)
 * into frontend-ready select-option lists for the SFC calculator's `tool_coating`
 * input. Backs `GET /api/v1/data/coating/catalog`.
 *
 * The coating reference DB carries ~60 coatings, each with category / hardness /
 * thermal limit / friction / relative cost. `goodCoatings` maps a workpiece
 * material family to its recommended coatings, exposed as `recommendedByMaterial`
 * so the frontend can surface material-aware suggestions.
 *
 * Fail-soft: a missing or malformed DB degrades to a small curated coating set
 * (source = "curated", liveCount = 0) so the select is never empty -- but the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-COATING-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** A single coating option ready for a frontend `<select>`. */
export interface CoatingOption {
  id: string;
  label: string;
  detail: string;
  category: string;
  maxTempC: number;
  hardnessHv: number;
  frictionCoef: number;
  costFactor: number;
}

/** Catalog response envelope -- mirrors the workholding/holder catalog contract. */
export interface CoatingCatalogResponse {
  options: CoatingOption[];
  /** Workpiece-material family -> recommended coating labels (from `goodCoatings`). */
  recommendedByMaterial: Record<string, string[]>;
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const COATINGS_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "prism-reference-db", "coatings.json");

/**
 * Curated fallback -- used only when the reference DB is missing/unreadable so the
 * SFC coating select is never empty. Values are the canonical PVD/CVD families a
 * shop always has access to; `source` is reported as "curated" when this is used.
 */
const CURATED_FALLBACK: CoatingOption[] = [
  { id: "uncoated", label: "Uncoated", detail: "Uncoated - 500C - mu0.50", category: "uncoated", maxTempC: 500, hardnessHv: 0, frictionCoef: 0.5, costFactor: 1 },
  { id: "tin", label: "TiN", detail: "PVD - 2300 HV - 550C - mu0.45", category: "pvd", maxTempC: 550, hardnessHv: 2300, frictionCoef: 0.45, costFactor: 1.25 },
  { id: "ticn", label: "TiCN", detail: "PVD - 3000 HV - 400C - mu0.40", category: "pvd", maxTempC: 400, hardnessHv: 3000, frictionCoef: 0.4, costFactor: 1.35 },
  { id: "tialn", label: "TiAlN", detail: "PVD - 3300 HV - 800C - mu0.35", category: "pvd", maxTempC: 800, hardnessHv: 3300, frictionCoef: 0.35, costFactor: 1.5 },
  { id: "altin", label: "AlTiN", detail: "PVD - 3500 HV - 900C - mu0.32", category: "pvd", maxTempC: 900, hardnessHv: 3500, frictionCoef: 0.32, costFactor: 1.6 },
  { id: "alcrn", label: "AlCrN", detail: "PVD - 3200 HV - 1000C - mu0.35", category: "pvd", maxTempC: 1000, hardnessHv: 3200, frictionCoef: 0.35, costFactor: 1.55 },
  { id: "dlc", label: "DLC", detail: "DLC - 3500 HV - 350C - mu0.10", category: "dlc", maxTempC: 350, hardnessHv: 3500, frictionCoef: 0.1, costFactor: 1.75 },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Slugify a coating name into a stable, URL/select-safe option id. */
export function coatingOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

/** "CVD_TiCN" -> "CVD TiCN"; preserves existing casing of the chemical symbols. */
function coatingLabel(name: string): string {
  return name.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCaseCategory(value: string): string {
  const cleaned = String(value).replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "";
  // Keep common acronyms upper (pvd/cvd/dlc/mtcvd) for shop readability.
  if (/^(pvd|cvd|dlc|mtcvd)$/i.test(cleaned)) return cleaned.toUpperCase();
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDetail(category: string, hardnessHv: number, maxTempC: number, frictionCoef: number, costFactor: number): string {
  const parts: string[] = [];
  const cat = titleCaseCategory(category);
  if (cat) parts.push(cat);
  if (hardnessHv > 0) parts.push(`${Math.round(hardnessHv).toLocaleString()} HV`);
  if (maxTempC > 0) parts.push(`${Math.round(maxTempC)}C`);
  if (frictionCoef > 0) parts.push(`mu${frictionCoef.toFixed(2)}`);
  if (costFactor > 0 && costFactor !== 1) parts.push(`${costFactor}x cost`);
  return parts.join(" - ");
}

/**
 * PURE: normalize the `stores` object of coatings.json into option rows.
 * Exported for direct R9 testing of malformed/empty inputs without filesystem IO.
 */
export function buildCoatingOptionsFromStores(stores: unknown): CoatingOption[] {
  const root = asRecord(stores);
  const complete = root ? asRecord(root.PRISM_COATINGS_COMPLETE) : null;
  if (!complete) return [];

  const seen = new Set<string>();
  const options: CoatingOption[] = [];
  for (const [name, rawEntry] of Object.entries(complete)) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;
    const id = coatingOptionId(name, `coating-${options.length}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const category = typeof entry.category === "string" ? entry.category : "coating";
    const hardnessHv = safeNum(entry.hardness_hv);
    const maxTempC = safeNum(entry.max_temp_c);
    const frictionCoef = safeNum(entry.friction_coef);
    const costFactor = safeNum(entry.cost_factor);
    const label = coatingLabel(name) || id;
    options.push({
      id,
      label,
      detail: buildDetail(category, hardnessHv, maxTempC, frictionCoef, costFactor) || label,
      category,
      maxTempC,
      hardnessHv,
      frictionCoef,
      costFactor,
    });
  }
  return options;
}

/**
 * PURE: extract the workpiece-material -> recommended-coating map from `goodCoatings`.
 * Exported for R9 testing.
 */
export function buildRecommendedByMaterial(stores: unknown): Record<string, string[]> {
  const root = asRecord(stores);
  const good = root ? asRecord(root.goodCoatings) : null;
  if (!good) return {};
  const out: Record<string, string[]> = {};
  for (const [material, rawList] of Object.entries(good)) {
    if (!Array.isArray(rawList)) continue;
    const list = rawList.map((v) => String(v)).filter((v) => v.length > 0);
    if (list.length > 0) out[material] = list;
  }
  return out;
}

let cachedDb: Record<string, unknown> | null = null;
let cachedDbAttempted = false;

function loadCoatingDb(): Record<string, unknown> | null {
  if (cachedDbAttempted) return cachedDb;
  try {
    if (!fs.existsSync(COATINGS_DB_PATH)) {
      // File genuinely absent -- a deterministic outcome; latch it.
      cachedDb = null;
      cachedDbAttempted = true;
      return null;
    }
    cachedDb = JSON.parse(fs.readFileSync(COATINGS_DB_PATH, "utf8")) as Record<string, unknown>;
    cachedDbAttempted = true;
  } catch {
    // Transient/partial-write read or parse failure -- do NOT latch; retry next call
    // (e.g. the reference DB being mid-rewrite during a regen). Serves curated until readable.
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook -- clears the module-level DB cache. */
export function resetCoatingCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded DB object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 * Falls back to the curated set on any null/empty/malformed DB, reporting the
 * degradation honestly via `source`/`liveCount` (never a silent empty).
 */
export function buildCoatingCatalog(db: Record<string, unknown> | null): CoatingCatalogResponse {
  const stores = db ? db.stores : null;
  const liveOptions = buildCoatingOptionsFromStores(stores);
  const recommendedByMaterial = buildRecommendedByMaterial(stores);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      recommendedByMaterial,
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated coating set active -- the consolidated coating reference database was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    recommendedByMaterial,
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live coating catalog from the PRISM consolidated reference database (PRISM_COATINGS_COMPLETE).",
  };
}

/**
 * Build the SFC coating select catalog from the consolidated reference DB (cached read).
 * Thin wrapper over the pure `buildCoatingCatalog` so the HTTP route stays trivial.
 */
export function getCalculatorCoatingCatalog(): CoatingCatalogResponse {
  return buildCoatingCatalog(loadCoatingDb());
}
