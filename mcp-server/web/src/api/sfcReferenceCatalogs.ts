import { getAuthHeaders } from './authToken';
/**
 * PRISM SFC -- Reference-Catalog Fetchers (frontend)
 * ==================================================
 * Typed client fetchers for the 6 SFC reference-catalog endpoints that back the
 * Speed-and-Feed calculator's DB-driven select inputs. These mirror the backend
 * accessors in `mcp-server/src/utils/calculator*Catalog.ts` (served by
 * `routes/data.ts` under `/api/v1/data`):
 *
 *   coating          -> GET /coating/catalog
 *   insert (milling) -> GET /insert/catalog
 *   coolant (method) -> GET /coolant/catalog
 *   coolant-product  -> GET /coolant-product/catalog
 *   turning-insert   -> GET /turning-insert/catalog
 *   stock            -> GET /stock/catalog
 *
 * This is the dependency-root for the shared DB-backed select component + the
 * SpeedFeedPage / SfcCalculatorPage wiring. Each response carries `source`
 * ("database" | "curated") + `liveCount` so the UI can surface a live/fallback
 * state honestly (the backend never returns a silent-empty list).
 *
 * Pure fetch layer -- unit-testable with a mocked `fetch` (no live server needed).
 */

const API_BASE = '/api/v1/data';

/** Fields every catalog option carries (the minimum a `<select>` needs). */
export interface CatalogOptionBase {
  id: string;
  label: string;
  detail: string;
}

/** Common envelope returned by every catalog endpoint. */
export interface CatalogResponseBase<TOption extends CatalogOptionBase> {
  options: TOption[];
  total: number;
  source: 'database' | 'curated';
  liveCount: number;
  fallbackCount: number;
  note: string;
}

export interface CoatingOption extends CatalogOptionBase {
  category: string;
  maxTempC: number;
  hardnessHv: number;
  frictionCoef: number;
  costFactor: number;
}
export interface CoatingCatalogResponse extends CatalogResponseBase<CoatingOption> {
  recommendedByMaterial: Record<string, string[]>;
}

export interface InsertOption extends CatalogOptionBase {
  manufacturer: string;
  grade: string;
  coating: string;
  material: string;
  family: string;
}
export interface InsertCatalogResponse extends CatalogResponseBase<InsertOption> {
  manufacturers: string[];
  materials: string[];
}

export interface CoolantOption extends CatalogOptionBase {
  effectiveness: number | null;
  factor: number | null;
}
export interface CoolantRecommendation {
  material: string;
  challenges: string[];
  recommended: { supplier: string; product: string; score: number; reason: string }[];
  avoid: string[];
  optimalConcentration: string | null;
}
export interface CoolantCatalogResponse extends CatalogResponseBase<CoolantOption> {
  recommendedByMaterial: Record<string, CoolantRecommendation>;
}

export type CoolingType = 'flood' | 'mql';
export interface CoolantProductOption extends CatalogOptionBase {
  vendor: string;
  vendorCountry: string;
  type: string;
  coolingType: CoolingType;
  bestFor: string;
}
export interface CoolantProductCatalogResponse extends CatalogResponseBase<CoolantProductOption> {
  vendors: string[];
  coolingTypes: CoolingType[];
}

export interface TurningInsertOption extends CatalogOptionBase {
  iso: string;
  ansi: string;
  shapeCode: string;
  shapeName: string;
  noseRadius: number;
  edges: number;
  type: string;
  application: string;
}
export interface TurningInsertCatalogResponse extends CatalogResponseBase<TurningInsertOption> {
  shapes: string[];
}

export interface StockOption extends CatalogOptionBase {
  materialSpec: string;
  isoGroup: string;
  form: string;
  sizeLabel: string;
  hardnessHrc: number | null;
}
export interface StockCatalogResponse extends CatalogResponseBase<StockOption> {
  forms: string[];
  isoGroups: string[];
}

export interface MaterialCatalogOption extends CatalogOptionBase {
  isoGroup: string;
  isoLabel: string;
  hardnessHb: number | null;
  hardnessHrc: number | null;
  hasKienzle: boolean;
}
export interface MaterialCatalogResponse extends CatalogResponseBase<MaterialCatalogOption> {
  isoGroups: string[];
}

/**
 * GET a catalog endpoint and unwrap the `{ result }` envelope (matching the
 * backend route contract + the existing calculatorData `dataRequest` helper).
 * Throws on a non-2xx response so the caller can fall back / surface an error.
 */
export async function fetchCatalog<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'GET' });
  if (!res.ok) throw new Error(`SFC catalog ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json.result ?? json.data ?? json) as T;
}

export const fetchCoatingCatalog = (): Promise<CoatingCatalogResponse> =>
  fetchCatalog<CoatingCatalogResponse>('/coating/catalog');

export const fetchInsertCatalog = (): Promise<InsertCatalogResponse> =>
  fetchCatalog<InsertCatalogResponse>('/insert/catalog');

export const fetchCoolantCatalog = (): Promise<CoolantCatalogResponse> =>
  fetchCatalog<CoolantCatalogResponse>('/coolant/catalog');

export const fetchCoolantProductCatalog = (): Promise<CoolantProductCatalogResponse> =>
  fetchCatalog<CoolantProductCatalogResponse>('/coolant-product/catalog');

export const fetchTurningInsertCatalog = (): Promise<TurningInsertCatalogResponse> =>
  fetchCatalog<TurningInsertCatalogResponse>('/turning-insert/catalog');

export const fetchStockCatalog = (): Promise<StockCatalogResponse> =>
  fetchCatalog<StockCatalogResponse>('/stock/catalog');

export const fetchMaterialCatalog = (): Promise<MaterialCatalogResponse> =>
  fetchCatalog<MaterialCatalogResponse>('/material/catalog');

// ===========================================================================
// POST-catalog fetchers (machine / CAM-programming / tool-holder / workholding)
// ===========================================================================
// These four backend catalogs were already served by `routes/data.ts` but had
// NO frontend fetcher, so the SFC machine / CAM / holder / workholding inputs
// could never be DB-backed. Unlike the six GET catalogs above, these endpoints
// are POST (they take a machine `mode` or a `calculatorCatalog` flag), and they
// return catalog-specific envelopes. Each fetcher below NORMALIZES its native
// response into the shared `CatalogResponseBase` shape so the existing
// `DbBackedSelect` component consumes them unchanged (R8 -- adapt at the fetch
// boundary, not the component). Default `mode` is "mill" (this is the milling
// SFC page); a lathe page passes mode="lathe".

type CatalogMachineMode = 'mill' | 'lathe' | 'edm' | 'wire_edm' | 'laser' | 'waterjet';

/** POST a catalog endpoint and unwrap the `{ result }` envelope. Mirrors `fetchCatalog` for the POST endpoints. */
export async function postCatalog<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`SFC catalog ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json.result ?? json.data ?? json) as T;
}

/** Read a string field off an untyped catalog row, trying each key in order. */
function rowStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

/** Humanize a snake/kebab token for display ("vertical_machining_center" -> "Vertical Machining Center"). */
function humanize(token: string): string {
  return token
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface MachineCatalogOption extends CatalogOptionBase {
  manufacturer: string;
  model: string;
  type: string;
  maxRpm: number | null;
}
export interface MachineCatalogResponse extends CatalogResponseBase<MachineCatalogOption> {
  manufacturers: string[];
}

/** Live aggregated machine catalog (extended machine profiles + registry rows). */
export const fetchMachineCatalog = async (
  mode: CatalogMachineMode = 'mill',
): Promise<MachineCatalogResponse> => {
  const result = await postCatalog<{
    machines?: Record<string, unknown>[];
    total?: number;
    source?: string;
  }>('/machine/search', { calculatorCatalog: true, limit: 5000, offset: 0, mode });
  const rows = Array.isArray(result.machines) ? result.machines : [];
  const options: MachineCatalogOption[] = rows.map((row) => {
    const manufacturer = rowStr(row, 'manufacturer', 'brand');
    const model = rowStr(row, 'model');
    const name = rowStr(row, 'name') || [manufacturer, model].filter(Boolean).join(' ');
    const type = rowStr(row, 'type');
    const controller = (() => {
      const c = row.controller;
      return c && typeof c === 'object' ? rowStr(c as Record<string, unknown>, 'brand', 'model', 'type') : rowStr(row, 'controller');
    })();
    const maxRpm = (() => {
      const s = row.spindle;
      const v = s && typeof s === 'object' ? Number((s as Record<string, unknown>).max_rpm) : NaN;
      return Number.isFinite(v) ? v : null;
    })();
    const detail = [type ? humanize(type) : '', controller, maxRpm ? `${maxRpm.toLocaleString()} RPM` : '']
      .filter(Boolean)
      .join(' · ');
    return {
      id: rowStr(row, 'id') || name,
      label: name || rowStr(row, 'id'),
      detail,
      manufacturer,
      model,
      type,
      maxRpm,
    };
  });
  const manufacturers = [...new Set(options.map((o) => o.manufacturer).filter(Boolean))].sort();
  return {
    options,
    total: typeof result.total === 'number' ? result.total : options.length,
    source: 'database',
    liveCount: options.length,
    fallbackCount: 0,
    note: '',
    manufacturers,
  };
};

export interface ProgrammingCatalogOption extends CatalogOptionBase {
  vendor: string;
  kind: string;
  badge: string;
}
export interface ProgrammingCatalogResponse extends CatalogResponseBase<ProgrammingCatalogOption> {
  vendors: string[];
}

/** CAM / programming-environment catalog (Mastercam, Fusion360, hyperMILL, manual, nesting...). */
export const fetchProgrammingCatalog = async (
  mode: CatalogMachineMode = 'mill',
): Promise<ProgrammingCatalogResponse> => {
  const result = await postCatalog<{
    programming?: Record<string, unknown>[];
    total?: number;
    source?: string;
  }>('/programming/catalog', { mode });
  const rows = Array.isArray(result.programming) ? result.programming : [];
  const options: ProgrammingCatalogOption[] = rows.map((row) => {
    const label = rowStr(row, 'label');
    const vendor = rowStr(row, 'vendor');
    const summary = rowStr(row, 'summary');
    const kind = rowStr(row, 'kind');
    const badge = rowStr(row, 'badge');
    return {
      id: rowStr(row, 'id') || label,
      label: label || vendor,
      detail: [badge, summary].filter(Boolean).join(' · '),
      vendor,
      kind,
      badge,
    };
  });
  const vendors = [...new Set(options.map((o) => o.vendor).filter(Boolean))].sort();
  const source = result.source === 'database' ? 'database' : 'curated';
  return {
    options,
    total: typeof result.total === 'number' ? result.total : options.length,
    source,
    liveCount: source === 'database' ? options.length : 0,
    fallbackCount: source === 'curated' ? options.length : 0,
    note: '',
    vendors,
  };
};

export interface HolderCatalogOption extends CatalogOptionBase {
  brandLabel: string;
  holderType: string;
  spindleInterface: string;
  maxRpm: number | null;
}
export interface HolderCatalogResponse extends CatalogResponseBase<HolderCatalogOption> {
  brands: string[];
}

/** Tool-holder catalog (brand/model holders from TOOLHOLDERS.json + tool_holders/ + JM-Die seeds). */
export const fetchHolderCatalog = async (
  mode: CatalogMachineMode = 'mill',
): Promise<HolderCatalogResponse> => {
  const result = await postCatalog<{ holders?: Record<string, unknown>[] }>('/holder/catalog', { mode });
  const rows = Array.isArray(result.holders) ? result.holders : [];
  const options: HolderCatalogOption[] = rows.map((row) => {
    const maxRpmRaw = Number(row.maxRpm);
    return {
      id: rowStr(row, 'id'),
      label: rowStr(row, 'label'),
      detail: rowStr(row, 'detail'),
      brandLabel: rowStr(row, 'brandLabel'),
      holderType: rowStr(row, 'holderType'),
      spindleInterface: rowStr(row, 'spindleInterface'),
      maxRpm: Number.isFinite(maxRpmRaw) ? maxRpmRaw : null,
    };
  });
  const brands = [...new Set(options.map((o) => o.brandLabel).filter(Boolean))].sort();
  return {
    options,
    total: options.length,
    source: 'database',
    liveCount: options.length,
    fallbackCount: 0,
    note: '',
    brands,
  };
};

export interface WorkholdingCatalogOption extends CatalogOptionBase {
  categoryId: string;
  brandId: string;
  /** Finer product id (e.g. "vacuum-fixture", "magnetic-chuck", "tombstone-pallet") --
   * the coarse `categoryId` tags vacuum/magnetic/tombstone all as "fixture", so the
   * consumer refines the enum cascade off this token. */
  workholdingId: string;
}
export interface WorkholdingCatalogResponse extends CatalogResponseBase<WorkholdingCatalogOption> {
  categories: { id: string; label: string }[];
}

/**
 * Workholding / fixture catalog (preset products). Sources the monolith
 * PRISM_WORKHOLDING_DATABASE.js + PRISM_FIXTURE_DATABASE.js via the backend's
 * `getCalculatorWorkholdingCatalog`, so this is the SFC surface for the
 * monolith-extracted fixture databases. Uses `presetOptions` (specific products);
 * `categoryOptions` are exposed separately for an optional category filter.
 */
export const fetchWorkholdingCatalog = async (
  mode: CatalogMachineMode = 'mill',
): Promise<WorkholdingCatalogResponse> => {
  const result = await postCatalog<{
    presetOptions?: Record<string, unknown>[];
    categoryOptions?: Record<string, unknown>[];
    total?: number;
    source?: string;
    liveCount?: number;
    fallbackCount?: number;
    note?: string;
  }>('/workholding/catalog', { mode });
  const presets = Array.isArray(result.presetOptions) ? result.presetOptions : [];
  const options: WorkholdingCatalogOption[] = presets.map((row) => ({
    id: rowStr(row, 'id'),
    label: rowStr(row, 'label'),
    detail: rowStr(row, 'detail'),
    categoryId: rowStr(row, 'categoryId'),
    brandId: rowStr(row, 'brandId'),
    workholdingId: rowStr(row, 'workholdingId'),
  }));
  const categories = (Array.isArray(result.categoryOptions) ? result.categoryOptions : []).map((row) => ({
    id: rowStr(row, 'id'),
    label: rowStr(row, 'label'),
  }));
  const source = result.source === 'database' || result.source === 'hybrid' ? 'database' : 'curated';
  return {
    options,
    total: typeof result.total === 'number' ? result.total : options.length,
    source,
    liveCount: typeof result.liveCount === 'number' ? result.liveCount : options.length,
    fallbackCount: typeof result.fallbackCount === 'number' ? result.fallbackCount : 0,
    note: typeof result.note === 'string' ? result.note : '',
    categories,
  };
};

// ===========================================================================
// Tool SEARCH (query-driven, NOT a load-all catalog)
// ===========================================================================
// The tool corpus is ~86K rows (toolRegistry loads the brand catalogs), far too
// many for a mount-time <datalist>/<select>. So the SFC tool input is wired via a
// query-driven typeahead against the existing POST /tool/search route -- the
// orchestrator's tool geometry fields (diameter/flutes/coating/helix/flute-length)
// cascade from the picked catalog tool. Read tool rows are loose (brand catalogs use
// many field-name dialects: DC/ZEFP/APMX vs cutting_diameter_mm/flute_count), so the
// normalizer below reads each value via a key-fallback list (mirrors the existing
// SmartToolSelector.mapBackendTool). Pure -- unit-testable with mocked rows.

/** Read a number off an untyped row, trying each (optionally dotted) key in order; null if none finite. */
function rowNum(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    let cur: unknown = row;
    for (const part of key.split('.')) {
      if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = (cur as Record<string, unknown>)[part];
      else { cur = undefined; break; }
    }
    const n = Number(cur);
    if (cur != null && Number.isFinite(n)) return n;
  }
  return null;
}

export interface ToolSearchOption {
  id: string;
  /** Display name (the tool's catalog name/description). */
  label: string;
  detail: string;
  diameterMm: number | null;
  flutes: number | null;
  /** Coating name ("" when none / uncoated). */
  coating: string;
  helixDeg: number | null;
  fluteLengthMm: number | null;
  toolType: string;
}
export interface ToolSearchResponse {
  options: ToolSearchOption[];
  total: number;
  hasMore: boolean;
}

/**
 * PURE: normalize loose toolRegistry rows into ToolSearchOptions. Exported for R9
 * testing without a live server. Skips rows with no usable identifier/name.
 */
export function normalizeToolRows(rows: unknown): ToolSearchOption[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const options: ToolSearchOption[] = [];
  for (const raw of rows) {
    const row = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    if (!row) continue;
    const name = rowStr(row, 'name', 'description', 'catalog_number', 'catalog_id', 'id');
    if (!name) continue;
    const id = rowStr(row, 'id', 'catalog_id', 'catalog_number') || name;
    if (seen.has(id)) continue;
    seen.add(id);

    const diameterMm = rowNum(row, 'cutting_diameter_mm', 'geometry.diameter', 'diameter', 'DC', 'tool_diameter');
    const flutes = rowNum(row, 'flute_count', 'geometry.flutes', 'flutes', 'ZEFP');
    // Coating is either a nested object ({type:"AlTiN"}) or a flat string ("TiAlN").
    // Guard the object branch -- reading `.type` off the ROW (not the coating object)
    // would grab the tool TYPE (e.g. "face_mill") for a flat-string coating row.
    const coating = row.coating && typeof row.coating === 'object' && !Array.isArray(row.coating)
      ? rowStr(row.coating as Record<string, unknown>, 'type')
      : rowStr(row, 'coating', 'coating_type');
    const helixDeg = rowNum(row, 'geometry.helix_angle', 'helix_angle_deg', 'helix_angle', 'helixAngle');
    const fluteLengthMm = rowNum(row, 'geometry.flute_length', 'flute_length', 'flute_length_mm', 'APMX');
    const toolType = rowStr(row, 'tool_type', 'type', 'category');

    const detail = [
      diameterMm != null ? `${diameterMm} mm` : '',
      flutes != null ? `${flutes}F` : '',
      toolType ? humanize(toolType) : '',
      coating,
    ].filter(Boolean).join(' · ');

    options.push({ id, label: name, detail: detail || name, diameterMm, flutes, coating, helixDeg, fluteLengthMm, toolType });
  }
  return options;
}

/**
 * Query the tool corpus (POST /tool/search -> toolRegistry, ~86K rows) and normalize
 * the results for the SFC tool picker. Empty/blank query returns no options (the
 * typeahead only searches once the user types). Fail-soft: a non-2xx throws so the
 * caller can surface the error / show no results.
 */
export const fetchToolSearch = async (query: string, limit = 25): Promise<ToolSearchResponse> => {
  const q = query.trim();
  if (!q) return { options: [], total: 0, hasMore: false };
  const result = await postCatalog<{ tools?: Record<string, unknown>[]; total?: number; hasMore?: boolean }>(
    '/tool/search',
    { query: q, limit },
  );
  const options = normalizeToolRows(result.tools);
  return {
    options,
    total: typeof result.total === 'number' ? result.total : options.length,
    hasMore: Boolean(result.hasMore),
  };
};

/** Map a catalog endpoint key to its fetcher (for a generic DB-backed select). */
export const SFC_CATALOG_FETCHERS = {
  coating: fetchCoatingCatalog,
  insert: fetchInsertCatalog,
  coolant: fetchCoolantCatalog,
  'coolant-product': fetchCoolantProductCatalog,
  'turning-insert': fetchTurningInsertCatalog,
  stock: fetchStockCatalog,
  material: fetchMaterialCatalog,
  machine: fetchMachineCatalog,
  programming: fetchProgrammingCatalog,
  holder: fetchHolderCatalog,
  workholding: fetchWorkholdingCatalog,
} as const;

export type SfcCatalogKey = keyof typeof SFC_CATALOG_FETCHERS;
