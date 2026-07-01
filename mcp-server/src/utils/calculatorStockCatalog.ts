/**
 * PRISM Calculator -- Raw-Material Stock Catalog Accessor
 * ======================================================
 * Normalizes the persisted raw-material stock store
 * (`mcp-server/data/state/materials-stock.json`, array `materials_stock`) into
 * frontend-ready select-option lists for the SFC calculator's STOCK input. Backs
 * `GET /api/v1/data/stock/catalog`.
 *
 * Records conform to `MaterialStockItem` in `src/engines/MaterialStockEngine.ts`.
 * That engine is the ERP-style INVENTORY manager (create / adjust / reorder, an
 * in-memory Map seeded from code -- empty at rest); THIS accessor is the read-only
 * SELECT view of the persisted JM-Die stock file (so it is not a duplicate of the
 * engine -- different concern: a cut-selection catalog vs inventory CRUD). Only the
 * cut-relevant fields are surfaced (material / form / size / ISO group / hardness);
 * inventory fields (quantity / location / cost) are intentionally omitted.
 *
 * Fail-soft: a missing or malformed store degrades to a small curated stock set
 * (source = "curated", liveCount = 0) so the select is never empty -- the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-STOCK-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** A single raw-material stock option ready for a frontend `<select>`. */
export interface StockOption {
  id: string;
  label: string;
  detail: string;
  materialSpec: string;
  /** ISO machining group (P/M/K/N/S/H) or "" if unspecified. */
  isoGroup: string;
  /** Stock form: plate / round / square / hex / tube / ... */
  form: string;
  sizeLabel: string;
  hardnessHrc: number | null;
}

/** Catalog response envelope -- mirrors the coating/insert catalog contract. */
export interface StockCatalogResponse {
  options: StockOption[];
  /** Distinct stock forms present (for a facet filter). */
  forms: string[];
  /** Distinct ISO groups present. */
  isoGroups: string[];
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const STOCK_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "state", "materials-stock.json");

/**
 * Curated fallback -- used only when the store is missing/unreadable so the SFC
 * stock select is never empty; `source` is reported as "curated" when used.
 */
const CURATED_FALLBACK: StockOption[] = [
  { id: "stk-1018-plate", label: "AISI 1018 plate", detail: "Plate - 1018 - ISO P", materialSpec: "AISI 1018", isoGroup: "P", form: "plate", sizeLabel: "", hardnessHrc: null },
  { id: "stk-4140-round", label: "AISI 4140 round", detail: "Round - 4140 - ISO P", materialSpec: "AISI 4140", isoGroup: "P", form: "round", sizeLabel: "", hardnessHrc: null },
  { id: "stk-6061-plate", label: "Aluminum 6061 plate", detail: "Plate - 6061 - ISO N", materialSpec: "Aluminum 6061", isoGroup: "N", form: "plate", sizeLabel: "", hardnessHrc: null },
  { id: "stk-d2-plate", label: "AISI D2 plate", detail: "Plate - D2 - ISO H", materialSpec: "AISI D2", isoGroup: "H", form: "plate", sizeLabel: "", hardnessHrc: null },
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

/** Finite-number coercion that preserves 0 (returns null for non-finite). */
function finiteOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Slugify a stock id/spec into a stable, select-safe option id. */
export function stockOptionId(value: string, fallback: string): string {
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

function buildDetail(form: string, materialSpec: string, isoGroup: string, sizeLabel: string, hardnessHrc: number | null): string {
  const parts: string[] = [];
  if (form) parts.push(titleCase(form));
  if (materialSpec) parts.push(materialSpec);
  if (isoGroup) parts.push(`ISO ${isoGroup}`);
  if (sizeLabel) parts.push(sizeLabel);
  if (hardnessHrc !== null && hardnessHrc > 0) parts.push(`${hardnessHrc} HRC`);
  return parts.join(" - ");
}

/**
 * PURE: normalize a `materials_stock` array (or the wrapping store object) into
 * stock options. Accepts either the raw array or the `{materials_stock: [...]}`
 * wrapper. Exported for direct R9 testing without filesystem IO.
 */
export function buildStockOptionsFromStore(store: unknown): StockOption[] {
  const arr = Array.isArray(store)
    ? store
    : (() => {
        const root = asRecord(store);
        return root && Array.isArray(root.materials_stock) ? root.materials_stock : null;
      })();
  if (!arr) return [];

  const seen = new Set<string>();
  const options: StockOption[] = [];
  for (const rawItem of arr) {
    const item = asRecord(rawItem);
    if (!item) continue;
    const materialSpec = readText(item.material_spec);
    const commonName = readText(item.common_name);
    const rawId = readText(item.id) || materialSpec || commonName;
    if (!rawId) continue;
    const id = stockOptionId(rawId, `stock-${options.length}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const isoGroup = readText(item.iso_group);
    const form = readText(item.form);
    const sizeLabel = readText(item.size_label);
    const hardnessHrc = finiteOrNull(item.hardness_hrc);
    const label = commonName || materialSpec || id;
    options.push({
      id,
      label,
      detail: buildDetail(form, materialSpec, isoGroup, sizeLabel, hardnessHrc) || label,
      materialSpec,
      isoGroup,
      form,
      sizeLabel,
      hardnessHrc,
    });
  }
  return options;
}

/** Distinct, sorted, non-empty values of a field across the option set. */
function distinct(options: StockOption[], field: "form" | "isoGroup"): string[] {
  const set = new Set<string>();
  for (const o of options) {
    if (o[field]) set.add(o[field]);
  }
  return [...set].sort();
}

let cachedDb: Record<string, unknown> | null = null;
let cachedDbAttempted = false;

function loadStockDb(): Record<string, unknown> | null {
  if (cachedDbAttempted) return cachedDb;
  try {
    if (!fs.existsSync(STOCK_DB_PATH)) {
      // File genuinely absent -- a deterministic outcome; latch it.
      cachedDb = null;
      cachedDbAttempted = true;
      return null;
    }
    cachedDb = JSON.parse(fs.readFileSync(STOCK_DB_PATH, "utf8")) as Record<string, unknown>;
    cachedDbAttempted = true;
  } catch {
    // Transient/partial-write read or parse failure -- do NOT latch; retry next call.
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook -- clears the module-level DB cache. */
export function resetStockCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded store object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 */
export function buildStockCatalog(db: Record<string, unknown> | null): StockCatalogResponse {
  const liveOptions = buildStockOptionsFromStore(db);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      forms: distinct(CURATED_FALLBACK, "form"),
      isoGroups: distinct(CURATED_FALLBACK, "isoGroup"),
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated stock set active -- the persisted raw-material stock store was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    forms: distinct(liveOptions, "form"),
    isoGroups: distinct(liveOptions, "isoGroup"),
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live raw-material stock catalog from the persisted JM-Die stock store (materials-stock.json).",
  };
}

/**
 * Build the SFC stock select catalog from the persisted stock store (cached read).
 * Thin wrapper over the pure `buildStockCatalog`.
 */
export function getCalculatorStockCatalog(): StockCatalogResponse {
  return buildStockCatalog(loadStockDb());
}
