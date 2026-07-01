/**
 * PRISM Calculator -- Coolant-Method Catalog Accessor
 * ===================================================
 * Normalizes the consolidated coolant reference database
 * (`mcp-server/data/prism-reference-db/coolants.json`, stores `coolantEffectiveness`
 * + `coolantFactors`) into frontend-ready select-option lists for the SFC
 * calculator's `coolant` input. Backs `GET /api/v1/data/coolant/catalog`.
 *
 * The SFC coolant input picks a coolant *strategy/method* (dry, air, mist, flood,
 * high-pressure, through-spindle, cryogenic). `coolantEffectiveness` rates the
 * cooling fraction (0..0.85); `coolantFactors` carries a tool-life/speed factor.
 * Methods are the key-union of both stores, attaching whichever fields are present.
 *
 * Material-aware guidance: `COOLANT_RECOMMENDATIONS` (material -> coolant guidance)
 * IS distilled here into the `recommendedByMaterial` facet -- the coolant analogue of
 * the coating catalog's `recommendedByMaterial`.
 *
 * Note: the coolant *product* catalogs in the same file (`COOLANT_DATABASE` vendor
 * products, `MQL_DATABASE`) are a deeper "which brand" pick and are intentionally
 * NOT exposed by this method catalog -- they remain a queued follow-up. The
 * `COOLANT_CODES` store holds unresolved template strings and is not consumed.
 *
 * Fail-soft: a missing or malformed DB degrades to a small curated method set
 * (source = "curated", liveCount = 0) so the select is never empty -- the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-COOLANT-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** A single coolant-method option ready for a frontend `<select>`. */
export interface CoolantOption {
  id: string;
  label: string;
  detail: string;
  /** Cooling effectiveness fraction 0..1 from `coolantEffectiveness` (null if unrated). */
  effectiveness: number | null;
  /** Tool-life / speed factor from `coolantFactors` (null if absent). */
  factor: number | null;
}

/** Per-material coolant guidance distilled from `COOLANT_RECOMMENDATIONS`. */
export interface CoolantRecommendation {
  material: string;
  challenges: string[];
  recommended: { supplier: string; product: string; score: number; reason: string }[];
  avoid: string[];
  optimalConcentration: string | null;
}

/** Catalog response envelope -- mirrors the coating/insert catalog contract. */
export interface CoolantCatalogResponse {
  options: CoolantOption[];
  /** Workpiece-material key -> coolant guidance (the coolant analogue of the coating
   * catalog's recommendedByMaterial). Empty {} when the recommendations store is absent. */
  recommendedByMaterial: Record<string, CoolantRecommendation>;
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const COOLANTS_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "prism-reference-db", "coolants.json");

/**
 * Curated fallback -- used only when the reference DB is missing/unreadable so the
 * SFC coolant select is never empty; `source` is reported as "curated" when used.
 */
const CURATED_FALLBACK: CoolantOption[] = [
  { id: "dry", label: "Dry", detail: "No coolant", effectiveness: 0, factor: null },
  { id: "air", label: "Air", detail: "20% cooling", effectiveness: 0.2, factor: null },
  { id: "mist", label: "Mist", detail: "40% cooling", effectiveness: 0.4, factor: null },
  { id: "flood", label: "Flood", detail: "70% cooling", effectiveness: 0.7, factor: null },
  { id: "high-pressure", label: "High Pressure", detail: "85% cooling", effectiveness: 0.85, factor: null },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Finite-number coercion that preserves 0 (returns null for non-finite). */
function finiteOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readText).filter((s) => s.length > 0) : [];
}

/** Slugify a coolant method key into a stable, select-safe option id. */
export function coolantOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function titleCase(value: string): string {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDetail(effectiveness: number | null, factor: number | null): string {
  const parts: string[] = [];
  if (effectiveness !== null) {
    parts.push(effectiveness <= 0 ? "No coolant" : `${Math.round(effectiveness * 100)}% cooling`);
  }
  if (factor !== null) parts.push(`${factor}x factor`);
  return parts.join(" - ");
}

/**
 * PURE: normalize the `stores` object of coolants.json into coolant-method options
 * by key-union of `coolantEffectiveness` and `coolantFactors`. Exported for direct
 * R9 testing of malformed/empty inputs without filesystem IO.
 */
export function buildCoolantOptionsFromStores(stores: unknown): CoolantOption[] {
  const root = asRecord(stores);
  const eff = root ? asRecord(root.coolantEffectiveness) : null;
  const fac = root ? asRecord(root.coolantFactors) : null;
  if (!eff && !fac) return [];

  const keys: string[] = [];
  const seenKey = new Set<string>();
  for (const k of [...Object.keys(eff ?? {}), ...Object.keys(fac ?? {})]) {
    if (!seenKey.has(k)) {
      seenKey.add(k);
      keys.push(k);
    }
  }

  const seenId = new Set<string>();
  const options: CoolantOption[] = [];
  for (const key of keys) {
    const id = coolantOptionId(key, `coolant-${options.length}`);
    if (seenId.has(id)) continue;
    seenId.add(id);

    const effectiveness = eff ? finiteOrNull(eff[key]) : null;
    const factor = fac ? finiteOrNull(fac[key]) : null;
    // A method must carry at least one numeric attribute to be meaningful.
    if (effectiveness === null && factor === null) continue;

    const label = titleCase(key) || id;
    options.push({
      id,
      label,
      detail: buildDetail(effectiveness, factor) || label,
      effectiveness,
      factor,
    });
  }
  return options;
}

/**
 * PURE: distill `COOLANT_RECOMMENDATIONS` (material-key -> guidance) into a clean
 * per-material recommendation map. Exported for direct R9 testing without filesystem IO.
 */
export function buildCoolantRecommendationsFromStores(stores: unknown): Record<string, CoolantRecommendation> {
  const root = asRecord(stores);
  const rec = root ? asRecord(root.COOLANT_RECOMMENDATIONS) : null;
  if (!rec) return {};

  const out: Record<string, CoolantRecommendation> = {};
  for (const [matKey, rawEntry] of Object.entries(rec)) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;

    const recommended = (Array.isArray(entry.recommendations) ? entry.recommendations : [])
      .map((raw) => {
        const r = asRecord(raw);
        if (!r) return null;
        const supplier = readText(r.supplier);
        const product = readText(r.product);
        if (!supplier && !product) return null;
        return {
          supplier,
          product,
          score: finiteOrNull(r.score) ?? 0,
          reason: readText(r.reason),
        };
      })
      .filter((r): r is CoolantRecommendation["recommended"][number] => r !== null);

    const optimal = readText(entry.optimalConcentration);
    out[matKey] = {
      material: readText(entry.material) || titleCase(matKey),
      challenges: readStringArray(entry.challenges),
      recommended,
      avoid: readStringArray(entry.avoid),
      optimalConcentration: optimal.length > 0 ? optimal : null,
    };
  }
  return out;
}

let cachedDb: Record<string, unknown> | null = null;
let cachedDbAttempted = false;

function loadCoolantDb(): Record<string, unknown> | null {
  if (cachedDbAttempted) return cachedDb;
  try {
    if (!fs.existsSync(COOLANTS_DB_PATH)) {
      // File genuinely absent -- a deterministic outcome; latch it.
      cachedDb = null;
      cachedDbAttempted = true;
      return null;
    }
    cachedDb = JSON.parse(fs.readFileSync(COOLANTS_DB_PATH, "utf8")) as Record<string, unknown>;
    cachedDbAttempted = true;
  } catch {
    // Transient/partial-write read or parse failure -- do NOT latch; retry next call.
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook -- clears the module-level DB cache. */
export function resetCoolantCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded DB object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 */
export function buildCoolantCatalog(db: Record<string, unknown> | null): CoolantCatalogResponse {
  const stores = db ? db.stores : null;
  const liveOptions = buildCoolantOptionsFromStores(stores);
  // Recommendations are an independent store -- present them even on the curated-method
  // branch (they degrade to {} when COOLANT_RECOMMENDATIONS is absent).
  const recommendedByMaterial = buildCoolantRecommendationsFromStores(stores);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      recommendedByMaterial,
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated coolant-method set active -- the consolidated coolant reference database was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    recommendedByMaterial,
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live coolant-method catalog from the PRISM consolidated reference database (coolantEffectiveness + coolantFactors).",
  };
}

/**
 * Build the SFC coolant select catalog from the consolidated reference DB (cached read).
 * Thin wrapper over the pure `buildCoolantCatalog` so the HTTP route stays trivial.
 */
export function getCalculatorCoolantCatalog(): CoolantCatalogResponse {
  return buildCoolantCatalog(loadCoolantDb());
}
