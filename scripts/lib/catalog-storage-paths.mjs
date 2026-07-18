/**
 * catalog-storage-paths.mjs — single source of truth for vendor-catalog ingest disk layout.
 *
 * Used by:
 *   scripts/extract-vendor-pdf.mjs                              (Phase B-1, planned)
 *   scripts/merge-catalog-extraction-to-registry.mjs            (Phase D-1, planned)
 *   scripts/scrape-{pts-tools,misumi,sandvik,kennametal,iscar,grabcad}.mjs  (Phase D-2..6, planned)
 *   scripts/index-step-files.mjs                                (Phase C-2, planned)
 *   scripts/generate-vendor-catalog-features.mjs                (Phase F-1, shipped iter15)
 *
 * Why centralize: TOOL-CATALOG-INGEST-MS0 spans ~7 scripts + 4 dispatcher actions, and the
 * iter12-15 audit chain proved that even a single regex (the `/^GC_2023-2024_/i` Sandvik
 * mis-classification, [[reference_vendor_catalog_misclassification_2026_05_23]]) drifts
 * fast across files. Path conventions drift the same way. One module owns them.
 *
 * Naming aligns with vendor-catalog-manifest.json[].targetJson contract
 * (e.g., "iscar-rotating-extracted.json", "tungaloy-general-extracted.json").
 *
 * Pure functions. No I/O. Returns POSIX-style forward-slash paths (cross-platform safe;
 * Windows resolves /h/prism/... and H:/prism/... to the same inode).
 *
 * @module scripts/lib/catalog-storage-paths
 * @since  TOOL-CATALOG-INGEST-MS0/U-TCI-A3 (2026-05-24, slot juliett)
 */

// ---------------------------------------------------------------------------
// Constants — keep these in lockstep with the disk layout documented in
// state/shared/specs/TOOL-CATALOG-INGEST-MS0-2026-05-24.md
// ---------------------------------------------------------------------------

export const REPO_ROOT = "H:/prism";

export const PATHS = Object.freeze({
  /** Where vendor-uploaded PDFs already live (existing, 38 files). */
  uploadedPdfsDir: `${REPO_ROOT}/resources/MANUFACTURER_CATALOGS/uploaded`,
  /** Per-part STEP files downloaded from vendor portals (new). */
  stepRootDir: `${REPO_ROOT}/resources/MANUFACTURER_CATALOGS/step`,
  /** Per-part spec sheet PDFs from D-phase scrapers (new). */
  datasheetsRootDir: `${REPO_ROOT}/resources/MANUFACTURER_CATALOGS/datasheets`,
  /** Per-vendor structured extraction JSONs (existing empty dir — Phase B fills it). */
  extractionsDir: `${REPO_ROOT}/mcp-server/data/catalog-extractions`,
  /** April 16 vendor-catalog-manifest (existing — authoritative per-vendor targetJson). */
  manifestPath: `${REPO_ROOT}/mcp-server/data/vendor-catalog-manifest.json`,
  /** Inventory sidecar with iter14 pdftotext_extraction blocks. */
  inventoryPath: `${REPO_ROOT}/mcp-server/data/tool-catalog-inventory.json`,
});

// ---------------------------------------------------------------------------
// Slugification — must match iter15 generate-vendor-catalog-features.mjs
// (lowercase, non-alphanumeric → "-", trim leading/trailing dashes, slice(0,60)).
// Tests assert exact match so future per-vendor outputs stay byte-stable.
// ---------------------------------------------------------------------------

/**
 * Canonicalize a vendor name or part number to a filesystem-safe slug.
 * Rules:
 *   - lowercase
 *   - any run of non [a-z0-9] characters → single dash
 *   - trim leading/trailing dashes
 *   - cap length at 60 chars (matches iter15 vendor-catalog-features generator)
 *
 * Examples:
 *   "Tungaloy GC_2023-2024" → "tungaloy-gc-2023-2024"
 *   "Big Daishowa Co., Ltd." → "big-daishowa-co-ltd"
 *   "MA Ford"               → "ma-ford"
 *   ""                      → ""
 *   "---"                   → ""
 *
 * @param {string} input — raw vendor or part name
 * @returns {string} kebab-case slug, max 60 chars
 */
export function slugify(input) {
  if (typeof input !== "string" || input.length === 0) return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Path builders — all return POSIX-style absolute paths under REPO_ROOT
// ---------------------------------------------------------------------------

/**
 * Path for a vendor STEP file (Phase D scrapers + Phase C-2 indexer).
 *
 *   stepPathFor("Misumi", "MSCBR8-10-100")
 *     → "H:/prism/resources/MANUFACTURER_CATALOGS/step/misumi/MSCBR8-10-100.step"
 *
 * Throws on empty vendor or partNumber — silent empty-path returns are R12 fail-loud violations
 * (a downstream Write to "/step//.step" would clobber the directory marker).
 *
 * @param {string} vendor      — canonical vendor name (will be slugified)
 * @param {string} partNumber  — vendor's part number (will be slugified)
 * @returns {string} absolute POSIX path
 * @throws {TypeError} if either input slugifies to empty
 */
export function stepPathFor(vendor, partNumber) {
  const vSlug = slugify(vendor);
  const pSlug = slugify(partNumber);
  if (!vSlug) throw new TypeError(`stepPathFor: vendor "${vendor}" slugifies to empty`);
  if (!pSlug) throw new TypeError(`stepPathFor: partNumber "${partNumber}" slugifies to empty`);
  return `${PATHS.stepRootDir}/${vSlug}/${pSlug}.step`;
}

/**
 * Path for a per-vendor structured extraction JSON (Phase B output, Phase D merge input).
 *
 *   extractedJsonPathFor("Iscar", "rotating")
 *     → "H:/prism/mcp-server/data/catalog-extractions/iscar-rotating-extracted.json"
 *
 * Matches vendor-catalog-manifest.json[].targetJson naming convention.
 *
 * @param {string} vendor — canonical vendor name
 * @param {string} type   — catalog type bucket ("rotating", "turning", "general", "threading", etc.)
 * @returns {string} absolute POSIX path
 * @throws {TypeError} if either input slugifies to empty
 */
export function extractedJsonPathFor(vendor, type) {
  const vSlug = slugify(vendor);
  const tSlug = slugify(type);
  if (!vSlug) throw new TypeError(`extractedJsonPathFor: vendor "${vendor}" slugifies to empty`);
  if (!tSlug) throw new TypeError(`extractedJsonPathFor: type "${type}" slugifies to empty`);
  return `${PATHS.extractionsDir}/${vSlug}-${tSlug}-extracted.json`;
}

/**
 * Path for a vendor-uploaded source PDF (passthrough — these are existing files).
 *
 *   pdfPathFor("GC_2023-2024_US_Tooling.pdf")
 *     → "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Tooling.pdf"
 *
 * The filename is NOT slugified — it must match the on-disk filename exactly
 * (the audit pattern table works against verbatim filenames).
 *
 * @param {string} filename — exact on-disk filename including .pdf extension
 * @returns {string} absolute POSIX path
 * @throws {TypeError} on empty filename
 */
export function pdfPathFor(filename) {
  if (typeof filename !== "string" || filename.length === 0) {
    throw new TypeError(`pdfPathFor: filename must be a non-empty string, got ${typeof filename}`);
  }
  return `${PATHS.uploadedPdfsDir}/${filename}`;
}

/**
 * Path for a per-part datasheet PDF scraped from a vendor portal (Phase D output).
 *
 *   datasheetPdfPathFor("Sandvik", "R390-11T308M-PM-1130")
 *     → "H:/prism/resources/MANUFACTURER_CATALOGS/datasheets/sandvik/r390-11t308m-pm-1130.pdf"
 *
 * @param {string} vendor     — canonical vendor name
 * @param {string} partNumber — vendor's part number
 * @returns {string} absolute POSIX path
 * @throws {TypeError} if either input slugifies to empty
 */
export function datasheetPdfPathFor(vendor, partNumber) {
  const vSlug = slugify(vendor);
  const pSlug = slugify(partNumber);
  if (!vSlug) throw new TypeError(`datasheetPdfPathFor: vendor "${vendor}" slugifies to empty`);
  if (!pSlug) throw new TypeError(`datasheetPdfPathFor: partNumber "${partNumber}" slugifies to empty`);
  return `${PATHS.datasheetsRootDir}/${vSlug}/${pSlug}.pdf`;
}

/**
 * Inverse of stepPathFor — given a path under stepRootDir, recover (vendorSlug, partSlug).
 * Used by scripts/index-step-files.mjs (C-2) to cross-reference disk STEP files
 * back to vendor + part-number for ToolRegistry.step_file_path linkage.
 *
 * Returns null when the path is not under stepRootDir or doesn't match the
 * "<root>/<vendor>/<part>.step" shape — callers must handle the null branch
 * (R12 fail-loud, no silent guesses).
 *
 * @param {string} absPath — absolute path to a .step file
 * @returns {{vendorSlug: string, partSlug: string} | null}
 */
export function parseStepPath(absPath) {
  if (typeof absPath !== "string" || absPath.length === 0) return null;
  const normalized = absPath.replace(/\\/g, "/");
  if (!normalized.startsWith(PATHS.stepRootDir + "/")) return null;
  const rel = normalized.slice(PATHS.stepRootDir.length + 1);
  const parts = rel.split("/");
  if (parts.length !== 2) return null;
  const [vendorSlug, fileName] = parts;
  if (!vendorSlug || !fileName.toLowerCase().endsWith(".step")) return null;
  const partSlug = fileName.slice(0, -".step".length);
  if (!partSlug) return null;
  return { vendorSlug, partSlug };
}
