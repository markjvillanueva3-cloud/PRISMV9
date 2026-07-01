/**
 * PRISM Calculator -- Coolant-Product Catalog Accessor
 * ====================================================
 * Normalizes the consolidated coolant reference database
 * (`mcp-server/data/prism-reference-db/coolants.json`, stores `COOLANT_DATABASE`
 * + `MQL_DATABASE`) into frontend-ready select-option lists for the SFC
 * calculator's coolant-PRODUCT input -- the deeper "which brand" pick beneath the
 * coolant-METHOD catalog (see calculatorCoolantCatalog.ts). Backs
 * `GET /api/v1/data/coolant-product/catalog`.
 *
 * Both stores are vendor-keyed (`vendor -> {name, country, products: {...}}`).
 * `COOLANT_DATABASE` holds flood/emulsion products (semi-synthetic, soluble oil,
 * straight oil); `MQL_DATABASE` holds minimum-quantity-lubrication products
 * (vegetable ester, synthetic). They are flattened into a single option list with
 * a `coolingType` discriminator ("flood" | "mql") and a `vendors`/`coolingTypes`
 * facet for frontend filtering.
 *
 * Fail-soft: a missing or malformed DB degrades to a small curated product set
 * (source = "curated", liveCount = 0) so the select is never empty -- the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-COOLANT-PRODUCT-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** Which delivery class a coolant product belongs to. */
export type CoolingType = "flood" | "mql";

/** A single coolant-product option ready for a frontend `<select>`. */
export interface CoolantProductOption {
  id: string;
  label: string;
  detail: string;
  vendor: string;
  vendorCountry: string;
  type: string;
  coolingType: CoolingType;
  bestFor: string;
}

/** Catalog response envelope -- mirrors the insert/coating catalog contract. */
export interface CoolantProductCatalogResponse {
  options: CoolantProductOption[];
  /** Distinct vendor display names present (for a facet filter). */
  vendors: string[];
  /** Delivery classes present (subset of ["flood","mql"]). */
  coolingTypes: CoolingType[];
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const COOLANTS_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "prism-reference-db", "coolants.json");

/**
 * Curated fallback -- used only when the reference DB is missing/unreadable so the
 * SFC coolant-product select is never empty; `source` is reported as "curated" when used.
 */
const CURATED_FALLBACK: CoolantProductOption[] = [
  { id: "generic-semi-synthetic", label: "Generic Semi-Synthetic", detail: "Generic - Semi-synthetic - Steel/Cast Iron/Aluminum", vendor: "Generic", vendorCountry: "", type: "Semi-synthetic", coolingType: "flood", bestFor: "Steel, Cast Iron, Aluminum" },
  { id: "generic-soluble-oil", label: "Generic Soluble Oil", detail: "Generic - Soluble oil - General machining", vendor: "Generic", vendorCountry: "", type: "Soluble oil", coolingType: "flood", bestFor: "General machining" },
  { id: "generic-vegetable-ester-mql", label: "Generic Vegetable Ester (MQL)", detail: "Generic - Vegetable Ester - MQL", vendor: "Generic", vendorCountry: "", type: "Vegetable Ester", coolingType: "mql", bestFor: "" },
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

/** Slugify a product key/name into a stable, select-safe option id. */
export function coolantProductOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildDetail(vendor: string, type: string, tail: string): string {
  const parts: string[] = [];
  if (vendor) parts.push(vendor);
  if (type) parts.push(type);
  if (tail) parts.push(tail);
  return parts.join(" - ");
}

/**
 * PURE: flatten one vendor-keyed store (`vendor -> {name, country, products}`)
 * into option rows tagged with the given coolingType. `tailField` is the
 * product-specific field appended to the detail (bestFor for flood, flowRate for mql).
 * `seen` is shared across stores so ids stay globally unique.
 */
function flattenVendorStore(
  store: unknown,
  coolingType: CoolingType,
  tailField: string,
  seen: Set<string>,
  out: CoolantProductOption[],
): void {
  const root = asRecord(store);
  if (!root) return;
  for (const [, rawVendor] of Object.entries(root)) {
    const vendor = asRecord(rawVendor);
    if (!vendor) continue;
    const vendorName = readText(vendor.name);
    const vendorCountry = readText(vendor.country);
    const products = asRecord(vendor.products);
    if (!products) continue;

    for (const [prodKey, rawProd] of Object.entries(products)) {
      const prod = asRecord(rawProd);
      if (!prod) continue;
      const name = readText(prod.name);
      const baseId = name || prodKey;
      if (!baseId) continue;
      const id = coolantProductOptionId(baseId, `coolant-product-${out.length}`);
      if (seen.has(id)) continue;
      seen.add(id);

      const type = readText(prod.type);
      const bestFor = readText(prod.bestFor);
      const tail = readText(prod[tailField]) || bestFor;
      const label = name || id;
      out.push({
        id,
        label,
        detail: buildDetail(vendorName, type, tail) || label,
        vendor: vendorName,
        vendorCountry,
        type,
        coolingType,
        bestFor,
      });
    }
  }
}

/**
 * PURE: normalize the `stores` object of coolants.json into coolant-product options
 * by flattening COOLANT_DATABASE (flood) + MQL_DATABASE (mql). Exported for direct
 * R9 testing of malformed/empty inputs without filesystem IO.
 */
export function buildCoolantProductOptionsFromStores(stores: unknown): CoolantProductOption[] {
  const root = asRecord(stores);
  if (!root) return [];
  const seen = new Set<string>();
  const out: CoolantProductOption[] = [];
  // MQL flattened FIRST so a product duplicated across both stores resolves to the
  // authoritative MQL tag (MQL_DATABASE is the canonical source for near-dry products).
  // The one real-data collision -- Hangsterfer's "Coolube 2210" -- is mis-filed under
  // COOLANT_DATABASE.hangsterfers (its own `type` reads "MQL Lubricant"); mql-first tags
  // it correctly as "mql" and drops the flood mis-file. The shared seen Set keeps option
  // ids globally unique (a single `<select>` over both classes never gets a dup id).
  // NOTE for juliett (DB owner): the coolube_2210 duplicate in COOLANT_DATABASE should be
  // removed from coolants.json -- it belongs only in MQL_DATABASE.
  flattenVendorStore(root.MQL_DATABASE, "mql", "flowRate", seen, out);
  flattenVendorStore(root.COOLANT_DATABASE, "flood", "bestFor", seen, out);
  return out;
}

/** Distinct, sorted, non-empty vendor names across the option set. */
function distinctVendors(options: CoolantProductOption[]): string[] {
  const set = new Set<string>();
  for (const o of options) {
    if (o.vendor) set.add(o.vendor);
  }
  return [...set].sort();
}

/** Delivery classes present, in canonical order (flood before mql). */
function presentCoolingTypes(options: CoolantProductOption[]): CoolingType[] {
  const set = new Set<CoolingType>();
  for (const o of options) set.add(o.coolingType);
  return (["flood", "mql"] as CoolingType[]).filter((t) => set.has(t));
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
export function resetCoolantProductCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded DB object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 */
export function buildCoolantProductCatalog(db: Record<string, unknown> | null): CoolantProductCatalogResponse {
  const stores = db ? db.stores : null;
  const liveOptions = buildCoolantProductOptionsFromStores(stores);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      vendors: distinctVendors(CURATED_FALLBACK),
      coolingTypes: presentCoolingTypes(CURATED_FALLBACK),
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated coolant-product set active -- the consolidated coolant reference database was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    vendors: distinctVendors(liveOptions),
    coolingTypes: presentCoolingTypes(liveOptions),
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live coolant-product catalog from the PRISM consolidated reference database (COOLANT_DATABASE + MQL_DATABASE).",
  };
}

/**
 * Build the SFC coolant-product select catalog from the consolidated reference DB
 * (cached read). Thin wrapper over the pure `buildCoolantProductCatalog`.
 */
export function getCalculatorCoolantProductCatalog(): CoolantProductCatalogResponse {
  return buildCoolantProductCatalog(loadCoolantDb());
}
