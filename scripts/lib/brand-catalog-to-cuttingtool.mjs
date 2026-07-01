/**
 * brand-catalog-to-cuttingtool.mjs -- pure mapper: canonical brand-tool-catalog record ->
 * ToolRegistry `CuttingTool` JSON shape.
 *
 * WHY (slot:romeo, BRAND-CATALOG-APP-WIRING 2026-06-19): the web app's "Search tool catalog
 * (75K+ tools)" field calls POST /api/v1/data/tool/search -> `toolRegistry.search()`
 * (mcp-server/src/routes/data.ts:60 -> src/registries/ToolRegistry.ts). The registry auto-loads
 * every `.json` under DATA_DIR/tools + TOOLS_DB into the `CuttingTool` schema. The 72,406-tool
 * brand catalog (scripts/lib/brand-tool-catalog.mjs) was emitted only as CAM-seat lane files
 * (.tools/.hmt.sql/.csv -- gitignored, wrong shape) + a metadata-only index. This mapper is the
 * adapter that lets the emitter (emit-brand-catalog-registry-json.mjs) write the corpus as tracked
 * registry JSON so the EXISTING /tool/search route + the EXISTING frontend serve it -- no route,
 * registry, or frontend edit. It EXTENDS the juliett TOOL-CATALOG-INGEST-MS0 pattern (same registry,
 * same CuttingTool schema); brand-catalog ids are namespaced (`BC::<slug>::<id>`) so they can never
 * collide with the existing extracted/curated tool ids (EM-SQ-..., etc.).
 *
 * Pure + deterministic: no Date.now / fs / network. The emitter passes `stampedAt` for last_updated.
 * Every transform is unit-testable in brand-catalog-to-cuttingtool.test.mjs.
 */

/** Source tag stamped on every emitted record (also the search-text discriminator). */
export const BRAND_CATALOG_SOURCE = "brand-catalog";
/** Namespace prefix that guarantees brand-catalog ids never collide with existing registry ids. */
export const BRAND_CATALOG_ID_PREFIX = "BC";

/**
 * Deterministic, filesystem-safe brand slug. MUST match the emitter's shard file naming so a
 * record's id namespace and its shard file agree. Falls back to UNKNOWN for empty/garbage brands.
 */
export function brandSlug(brand) {
  const s = String(brand ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "UNKNOWN";
}

/** Finite, strictly-positive number or undefined. Guards NaN / Infinity / 0 / negative / non-number
 *  -- critical because JSON.stringify turns Infinity/NaN into `null`, which would corrupt a diameter
 *  index entry and silently break diameter-range search. */
function finitePos(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Positive integer flute count or undefined. */
function fluteInt(v) {
  const n = finitePos(v);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}

/** Trim a string to a non-empty value or undefined. */
function str(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/** Build only the geometry sub-fields we actually have a source for (no fabricated angles -- R12).
 *  `dia` is the plausibility-gated diameter resolved by the caller (undefined when the loader
 *  flagged geometry_plausible === false), so a bogus parsed diameter never reaches the geometry. */
function buildGeometry(rec, dia) {
  const geometry = {};
  const oal = finitePos(rec.oal_mm);
  const fl = finitePos(rec.flute_len_mm);
  const shank = finitePos(rec.shank_mm);
  const flutes = fluteInt(rec.num_flutes);
  const cr = finitePos(rec.corner_radius_mm);
  if (dia !== undefined) geometry.diameter = dia;
  if (oal !== undefined) geometry.overall_length = oal;
  if (fl !== undefined) geometry.flute_length = fl;
  if (shank !== undefined) geometry.shank_diameter = shank;
  if (flutes !== undefined) geometry.flutes = flutes;
  if (cr !== undefined) geometry.corner_radius = cr;
  return Object.keys(geometry).length ? geometry : undefined;
}

/** Human + searchable display name: "<Brand> <type> Ø<dia> mm (<catalog id>)". */
function buildName(rec, dia) {
  const brand = str(rec.brand);
  const typeLabel = str(rec.subtype) || str(rec.type) || str(rec.category);
  const diaLabel = dia !== undefined ? `Ø${dia} mm` : undefined;
  const head = [brand, typeLabel, diaLabel].filter(Boolean).join(" ");
  const cat = str(rec.id);
  return (head || cat || "tool") + (cat ? ` (${cat})` : "");
}

/**
 * Map ONE canonical brand-catalog record to a `CuttingTool` registry record.
 * Returns null for an unusable record (missing id) -- the emitter filters nulls.
 *
 * @param {object} rec canonical record from loadBrandCatalog() / normalizeRecord()
 * @param {{stampedAt?: string}} [opts] emitter passes an ISO timestamp for last_updated
 */
export function toCuttingTool(rec, opts = {}) {
  if (!rec || typeof rec !== "object") return null;
  const origId = str(rec.id);
  if (!origId) return null; // ToolRegistry keys by id; a record with no id is unloadable.

  const slug = brandSlug(rec.brand);
  // Plausibility gate: the loader flags geometry_plausible === false for records whose parsed
  // diameter is physically impossible (e.g. a thread-code "YG1-380.0" parsed as a 380mm drill).
  // Treat an implausible diameter as UNKNOWN -> drop it (top-level + geometry) so the bogus value
  // never reaches ToolRegistry's diameter index / diameter_min/max search. The record is KEPT
  // (searchable by name/brand/type) -- this is the catalog use case; the sibling CAM-lane emitter
  // (emit-brand-tool-libraries.mjs) drops the whole record because a bad-geometry tool is unusable
  // for machining, whereas a catalog entry without a diameter is still a valid listing.
  const dia = rec.geometry_plausible === false ? undefined : finitePos(rec.diameter_mm);
  const flutes = fluteInt(rec.num_flutes);

  const tool = {
    id: `${BRAND_CATALOG_ID_PREFIX}::${slug}::${origId}`,
    name: buildName(rec, dia),
    type: str(rec.type) || str(rec.category) || "tool",
    manufacturer: str(rec.brand) || "Unknown",
    vendor: str(rec.brand) || "Unknown",
    catalog_number: origId,
    category: str(rec.category) || undefined,
    subcategory: str(rec.subtype) || undefined,
    // top-level shorthands ToolRegistry indexes + filters on (cutting_diameter_mm / flute_count)
    cutting_diameter_mm: dia,
    flute_count: flutes,
    coating: str(rec.coating) || undefined,
    // brand catalogs do not carry reliable ISO workpiece groups -> empty, never fabricated.
    material_groups: [],
    application: [],
    geometry: buildGeometry(rec, dia),
    description: str(rec.description) || str(rec.material) || undefined,
    // data-completeness proxy (honest): a geometry-complete row is more trustworthy than a name-only one.
    confidence: rec.geometry_complete ? 0.9 : 0.6,
    source: BRAND_CATALOG_SOURCE,
  };
  if (opts.stampedAt) tool.last_updated = opts.stampedAt;

  // strip undefined keys so emitted JSON is compact + stable
  for (const k of Object.keys(tool)) if (tool[k] === undefined) delete tool[k];
  return tool;
}

/**
 * Map an array of canonical records, dropping unusable ones. Returns {tools, skipped}.
 */
export function mapRecords(records, opts = {}) {
  const tools = [];
  let skipped = 0;
  for (const rec of records || []) {
    const t = toCuttingTool(rec, opts);
    if (t) tools.push(t);
    else skipped++;
  }
  return { tools, skipped };
}
