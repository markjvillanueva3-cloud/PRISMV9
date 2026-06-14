/**
 * CatalogExtractionResult — TypeScript interface for per-vendor PDF→structured-JSON output.
 *
 * Produced by:  scripts/extract-vendor-pdf.mjs (Phase B-1 of TOOL-CATALOG-INGEST-MS0)
 * Consumed by:  scripts/merge-catalog-extraction-to-registry.mjs (Phase D-1)
 *               dataDispatcher action `catalog_extraction_merge` (Phase D-1)
 *
 * Schema alignment:
 *   Top-level keys (schemaVersion, generatedAt, advisoryOnly, must_human_verify,
 *   purpose, summary, raw_tools) deliberately mirror mike's 2026-05-23 Fusion 360
 *   tooling catalog extractor output (H:/prism-slot-mike/state/shared/
 *   FUSION-TOOLING-CATALOG-2026-05-23.json) so the two ingest paths produce
 *   interoperable JSON that the same merge orchestrator can consume.
 *
 *   Per-tool CuttingDataSet shape reuses CatalogExtractionEngine.CuttingDataSet
 *   (existing — see mcp-server/src/engines/CatalogExtractionEngine.ts) so the
 *   downstream UltimateSpeedFeedEngine calibration-overlay wiring (Phase E2)
 *   can read either pipeline's output without an adapter.
 *
 * Output path convention (scripts/lib/catalog-storage-paths.mjs#extractedJsonPathFor):
 *   H:/prism/mcp-server/data/catalog-extractions/<vendor>-<type>-extracted.json
 *
 * Matches the `targetJson` contract in
 *   H:/prism/mcp-server/data/vendor-catalog-manifest.json[].targetJson
 *
 * Schema is ADVISORY ONLY by default (must_human_verify=true). The merge orchestrator
 * gates ingestion behind R12 spot-check (5 random tools per catalog) and confidence
 * scoring.
 *
 * @module schemas/CatalogExtractionResult
 * @since   TOOL-CATALOG-INGEST-MS0/U-TCI-A1 (2026-05-24, slot juliett)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const CATALOG_EXTRACTION_SCHEMA_VERSION = "1.0.0";

/** ISO 513 material groups — keep in sync with mcp-server/src/physics/constants.ts. */
export type IsoMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Coolant modes — keep aligned with ToolPerformance.recommendations[].coolant in ToolRegistry.ts. */
export type CoolantMode = "flood" | "mist" | "air" | "none" | "through_tool" | "mql";

/** Operation categories that drive cutting-parameter lookups. */
export type Operation =
  | "turning"
  | "facing"
  | "boring"
  | "grooving"
  | "parting"
  | "threading"
  | "drilling"
  | "milling_face"
  | "milling_side"
  | "milling_slot"
  | "milling_profile"
  | "milling_pocket"
  | "milling_adaptive"
  | "tapping"
  | "reaming"
  | "chamfering";

// ============================================================================
// SOURCE PROVENANCE
// ============================================================================

/** Where a single field's value came from + how trustworthy it is. */
export interface DataSource {
  type: "pdf_table" | "pdf_text" | "pdf_image_ocr" | "vendor_portal" | "step_metadata" | "operator_override";
  catalog: string; // filename (e.g., "GC_2023-2024_US_Tooling.pdf") or portal URL
  page?: number; // PDF page number when type starts with "pdf_"
  confidence: number; // 0..1, R12 fail-loud — low confidence must surface, never silently average
  extracted_at: string; // ISO-8601
  extractor_version?: string; // for re-extraction tracking
  notes?: string;
}

// ============================================================================
// CUTTING DATA (per ISO group × operation)
// ============================================================================

/**
 * One row of recommended cutting parameters for an (ISO group, operation) pair.
 *
 * Field semantics mirror CatalogExtractionEngine.CuttingDataSet — units are:
 *   Vc → SFM (surface feet per minute) or m/min, indicated by `vc_unit`
 *   fz → chipload (mm/tooth or in/tooth, indicated by `fz_unit`)
 *   ap → axial depth of cut (mm or in, indicated by `linear_unit`)
 *   ae → radial engagement (mm or in, indicated by `linear_unit`)
 */
export interface CuttingDataSet {
  iso_group: IsoMaterialGroup;
  operation: Operation;

  // Recommended cutting speed (catalog typically prints a range)
  vc_min?: number;
  vc_max?: number;
  vc_recommended?: number;
  vc_unit: "sfm" | "m_per_min";

  // Feed per tooth (chipload)
  fz_min?: number;
  fz_max?: number;
  fz_recommended?: number;
  fz_unit: "mm_per_tooth" | "in_per_tooth" | "mm_per_rev" | "in_per_rev";

  // Cut geometry limits
  ap_max?: number; // axial depth of cut
  ae_max?: number; // radial engagement
  linear_unit: "mm" | "in";

  // Conditions string from the catalog (e.g., "1018 steel, dry, climb")
  conditions?: string;

  coolant: CoolantMode;

  // Provenance for this specific row
  source: DataSource;
}

// ============================================================================
// COLLISION ENVELOPE (parametric, NOT mesh — feeds CollisionDetectionEngine)
// ============================================================================

/**
 * Parametric bounding-cylinder + holder envelope.
 * Used by CollisionDetectionEngine to build AABB/OBB tests without parsing STEP files.
 * STEP file (when downloaded) is referenced separately via `step_file_path`
 * for richer-geometry checks via StepImportEngine.
 *
 * All linear units in mm; angles in degrees.
 */
export interface CollisionEnvelope {
  // Primary tool body
  boundingCylinderD: number;
  boundingCylinderL: number;

  // Neck (relieved section between flutes and shank, for reach scenarios)
  neckD?: number;
  neckL?: number;

  // Shank
  shankD: number;
  shankL?: number;

  // Gauge from holder face (useful for tool projection / stickout collision)
  gaugeLength?: number;

  // Optional taper (e.g., draft on ball-nose body)
  taperAngle?: number;

  // Source — were these measured from the PDF table, scraped from a portal,
  // or extracted from a downloaded STEP file?
  source: DataSource;
}

// ============================================================================
// APPLICATION SCENARIO (free-form usage hint from the catalog)
// ============================================================================

export type ApplicationCategory =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "high_feed"
  | "high_speed_machining"
  | "trochoidal"
  | "adaptive_clearing"
  | "deep_pocket"
  | "thin_wall"
  | "hardened_material"
  | "stainless_steel"
  | "titanium"
  | "aluminum"
  | "cast_iron"
  | "superalloy";

export interface ApplicationScenario {
  category: ApplicationCategory;
  description: string;
  recommended_materials?: string[]; // free-form material names from the catalog
  target_surface_finish_ra_um?: number; // micrometers
  notes?: string;
  source: DataSource;
}

// ============================================================================
// HOLDER COMPATIBILITY
// ============================================================================

/**
 * Cross-reference into ToolHolderDatabaseEngine (80+ holder types: BT/CAT/HSK/CAPTO/VDI/ER).
 * `holder_interface` should match a value in ToolHolderDatabaseEngine.
 */
export interface HolderCompatibility {
  holder_interface: string; // BT40, CAT50, HSK-A63, ER32, etc.
  gauge_length_mm?: number;
  max_rpm?: number;
  shank_id?: string; // vendor's shank catalog number
  source: DataSource;
}

// ============================================================================
// RAW TOOL ENTRY (one per cataloged SKU)
// ============================================================================

/**
 * A single tool extracted from the catalog.
 *
 * Maps to ToolRegistry.CuttingTool 1:1 after the merge orchestrator runs
 * (see scripts/merge-catalog-extraction-to-registry.mjs, U-TCI-D1). The merge
 * dedups via duplicationGuardEngine using (vendor, catalog_number) as the key.
 *
 * All geometry units in mm; angles in degrees; consistent with ToolGeometry
 * in ToolRegistry.ts.
 */
export interface RawCatalogTool {
  // Identity
  vendor: string; // canonical vendor slug (e.g., "tungaloy", "iscar")
  catalog_number: string; // vendor's part number — primary dedup key with vendor
  name: string;
  type: string; // endmill, drill, face_mill, insert, etc. — aligns with CuttingTool.type
  category?: string; // broad category
  subcategory?: string;

  // Material + coating
  substrate: string; // carbide, HSS, ceramic, PCD, CBN
  grade: string; // vendor's grade name (GC4325, AH725, etc.)
  coating?: {
    type: string;
    thickness_um?: number;
    hardness_hv?: number;
    max_temperature_c?: number;
    multi_layer?: boolean;
    layer_count?: number;
  };

  // Geometry — mirrors ToolGeometry in ToolRegistry.ts
  geometry: {
    diameter_mm: number;
    overall_length_mm: number;
    flute_length_mm?: number;
    shank_diameter_mm: number;
    flutes?: number;
    helix_angle_deg?: number;
    rake_angle_deg?: number;
    relief_angle_deg?: number;
    corner_radius_mm?: number;
    chamfer_angle_deg?: number;
    taper_angle_deg?: number;
    point_angle_deg?: number;
    edge_preparation?: "sharp" | "honed" | "chamfered" | "radiused";
    edge_radius_um?: number;
    chip_breaker?: string;
  };

  // Compatibility
  material_groups: IsoMaterialGroup[]; // empty array allowed but discouraged
  application_categories?: ApplicationCategory[];

  // Cutting data (one row per ISO group × operation that the catalog publishes)
  cutting_data: CuttingDataSet[];

  // Application scenarios (free-form usage guidance from catalog narrative)
  application_scenarios?: ApplicationScenario[];

  // Holder compatibility
  holder_compat?: HolderCompatibility[];

  // Dimensional envelope for collision avoidance
  collision_envelope?: CollisionEnvelope;

  // File paths (relative to H:/prism or absolute — extractor records absolute, merge normalizes)
  step_file_path?: string;
  datasheet_pdf_path?: string;

  // Source provenance (catalog-wide; each field above carries its own DataSource for finer trust)
  source: DataSource;

  // Optional — vendor's published price USD (rare in catalogs but ingest if present)
  price_usd?: number;
}

// ============================================================================
// SUMMARY (top-level rollup — mirrors mike's Fusion catalog schema)
// ============================================================================

export interface ExtractionSummary {
  catalog_count: number; // PDFs feeding this extraction (usually 1)
  total_tools: number; // raw_tools.length
  total_cutting_data_rows: number; // sum of raw_tools[].cutting_data.length
  total_application_scenarios: number;
  distinct_tool_types: number;
  publisher_confidence: number; // 0..1, from iter12-15 pdftotext verification
  publisher_evidence?: string[]; // verbatim cover-page snippets confirming publisher
  step_file_coverage: number; // count of raw_tools[] with step_file_path != null
  datasheet_pdf_coverage: number; // count with datasheet_pdf_path != null
  collision_envelope_coverage: number; // count with collision_envelope != null
  per_iso_group_counts: Record<IsoMaterialGroup, number>; // ISO group → tool count
  per_operation_counts: Partial<Record<Operation, number>>;
  unknown_fields_flagged: number; // count of fields the extractor couldn't classify
}

// ============================================================================
// SPEED/FEED BACKBONE (per-type rollup — mirrors mike's Fusion schema)
// ============================================================================

export interface SpeedFeedBackboneStats {
  n: number;
  min: number | null;
  median: number | null;
  max: number | null;
}

export interface SpeedFeedBackboneByType {
  count: number;
  diameter_mm: SpeedFeedBackboneStats;
  vc_sfm: SpeedFeedBackboneStats;
  fz_mm_per_tooth: SpeedFeedBackboneStats;
  ap_max_mm: SpeedFeedBackboneStats;
  per_iso_group_counts: Partial<Record<IsoMaterialGroup, number>>;
}

// ============================================================================
// TOP-LEVEL RESULT
// ============================================================================

/**
 * The complete extraction artifact. One file per (vendor, type) tuple.
 *
 * Naming: `<vendor>-<type>-extracted.json` per
 *   vendor-catalog-manifest.json[].targetJson
 *
 * R12 fail-loud: `advisoryOnly` and `must_human_verify` are set to true by
 * default. The merge orchestrator will refuse silent inventory mutations
 * — every diff must be operator-approved.
 */
export interface CatalogExtractionResult {
  schemaVersion: string; // CATALOG_EXTRACTION_SCHEMA_VERSION
  generatedAt: string; // ISO-8601
  generatedBy: string; // tool that produced this (e.g., "scripts/extract-vendor-pdf.mjs@1.0.0")

  advisoryOnly: true; // R12 — never auto-flips ToolRegistry without operator review
  must_human_verify: true;

  purpose: string; // human-readable one-liner

  // Source catalogs feeding this extraction
  source_catalogs: Array<{
    filename: string;
    path: string;
    size_bytes: number;
    pages?: number;
    publisher_verified: boolean;
    publisher_evidence?: string[];
    extracted_at: string;
  }>;

  // Vendor identity (canonical slug — single vendor per file)
  vendor: string;
  vendor_display_name?: string; // human-readable

  summary: ExtractionSummary;

  raw_tools: RawCatalogTool[];

  speed_feed_backbone_by_type: Record<string, SpeedFeedBackboneByType>;

  // Operator notes + open questions surfaced by the extractor
  notes?: string[];
}

// ============================================================================
// TYPE GUARDS (cheap runtime validation for the merge orchestrator)
// ============================================================================

export function isCatalogExtractionResult(x: unknown): x is CatalogExtractionResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.schemaVersion === "string" &&
    typeof o.vendor === "string" &&
    Array.isArray(o.raw_tools) &&
    typeof o.summary === "object" &&
    o.summary !== null && // JS `typeof null === "object"` gotcha — explicit null guard
    o.advisoryOnly === true &&
    o.must_human_verify === true
  );
}

export function isRawCatalogTool(x: unknown): x is RawCatalogTool {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.vendor === "string" &&
    typeof o.catalog_number === "string" &&
    typeof o.name === "string" &&
    typeof o.type === "string" &&
    Array.isArray(o.cutting_data) &&
    !!o.geometry
  );
}
