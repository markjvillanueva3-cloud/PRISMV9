/**
 * Tests for CatalogExtractionResult schema type guards.
 *
 * Validates the runtime guards used by scripts/merge-catalog-extraction-to-registry.mjs
 * (Phase D-1 of TOOL-CATALOG-INGEST-MS0) to gate ingestion of per-vendor extracted
 * JSON files. Per CLAUDE.md test-legitimacy rule: all assertions are real-value
 * checks against the SUT, no toBeTruthy/toBeDefined stubs.
 *
 * @since TOOL-CATALOG-INGEST-MS0/U-TCI-A1 (2026-05-24, slot juliett)
 */

import { describe, it, expect } from "vitest";
import {
  CATALOG_EXTRACTION_SCHEMA_VERSION,
  isCatalogExtractionResult,
  isRawCatalogTool,
  type CatalogExtractionResult,
  type RawCatalogTool,
  type DataSource,
  type CuttingDataSet,
} from "../schemas/CatalogExtractionResult.js";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const dataSource: DataSource = {
  type: "pdf_table",
  catalog: "GC_2023-2024_US_Tooling.pdf",
  page: 42,
  confidence: 0.95,
  extracted_at: "2026-05-24T05:00:00.000Z",
  extractor_version: "1.0.0",
};

const cuttingRow: CuttingDataSet = {
  iso_group: "P",
  operation: "milling_face",
  vc_min: 150,
  vc_max: 250,
  vc_recommended: 200,
  vc_unit: "sfm",
  fz_min: 0.05,
  fz_max: 0.15,
  fz_recommended: 0.1,
  fz_unit: "mm_per_tooth",
  ap_max: 3.0,
  ae_max: 12.0,
  linear_unit: "mm",
  conditions: "1018 steel, dry, climb",
  coolant: "flood",
  source: dataSource,
};

const validTool: RawCatalogTool = {
  vendor: "tungaloy",
  catalog_number: "ETPN16T308PDPRE-LT-AH725",
  name: "Tungaloy AH725 face mill insert",
  type: "insert",
  category: "milling",
  subcategory: "face_milling",
  substrate: "carbide",
  grade: "AH725",
  coating: { type: "AlTiN", thickness_um: 3.5, hardness_hv: 3200, max_temperature_c: 1100 },
  geometry: {
    diameter_mm: 16.0,
    overall_length_mm: 9.5,
    shank_diameter_mm: 16.0,
    corner_radius_mm: 0.8,
  },
  material_groups: ["P", "M"],
  cutting_data: [cuttingRow],
  source: dataSource,
};

const validResult: CatalogExtractionResult = {
  schemaVersion: CATALOG_EXTRACTION_SCHEMA_VERSION,
  generatedAt: "2026-05-24T05:00:00.000Z",
  generatedBy: "scripts/extract-vendor-pdf.mjs@1.0.0",
  advisoryOnly: true,
  must_human_verify: true,
  purpose: "Per-vendor structured extraction from GC_2023-2024_US_Tooling.pdf",
  source_catalogs: [
    {
      filename: "GC_2023-2024_US_Tooling.pdf",
      path: "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Tooling.pdf",
      size_bytes: 12345678,
      pages: 246,
      publisher_verified: true,
      publisher_evidence: ["Tungaloy's Insights → Smart Manufacturing", "tungaloy.com/us"],
      extracted_at: "2026-05-24T05:00:00.000Z",
    },
  ],
  vendor: "tungaloy",
  vendor_display_name: "Tungaloy",
  summary: {
    catalog_count: 1,
    total_tools: 1,
    total_cutting_data_rows: 1,
    total_application_scenarios: 0,
    distinct_tool_types: 1,
    publisher_confidence: 0.95,
    publisher_evidence: ["Tungaloy's Insights → Smart Manufacturing"],
    step_file_coverage: 0,
    datasheet_pdf_coverage: 0,
    collision_envelope_coverage: 0,
    per_iso_group_counts: { P: 1, M: 0, K: 0, N: 0, S: 0, H: 0 },
    per_operation_counts: { milling_face: 1 },
    unknown_fields_flagged: 0,
  },
  raw_tools: [validTool],
  speed_feed_backbone_by_type: {
    insert: {
      count: 1,
      diameter_mm: { n: 1, min: 16.0, median: 16.0, max: 16.0 },
      vc_sfm: { n: 1, min: 200, median: 200, max: 200 },
      fz_mm_per_tooth: { n: 1, min: 0.1, median: 0.1, max: 0.1 },
      ap_max_mm: { n: 1, min: 3.0, median: 3.0, max: 3.0 },
      per_iso_group_counts: { P: 1 },
    },
  },
};

// ---------------------------------------------------------------------------
// CATALOG_EXTRACTION_SCHEMA_VERSION
// ---------------------------------------------------------------------------

describe("CATALOG_EXTRACTION_SCHEMA_VERSION", () => {
  it("is a semver 1.0.0 (per U-TCI-A1 ship)", () => {
    expect(CATALOG_EXTRACTION_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("is a string parseable by semver-style MAJOR.MINOR.PATCH check", () => {
    expect(CATALOG_EXTRACTION_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ---------------------------------------------------------------------------
// isCatalogExtractionResult
// ---------------------------------------------------------------------------

describe("isCatalogExtractionResult", () => {
  it("accepts a fully-formed valid result", () => {
    expect(isCatalogExtractionResult(validResult)).toBe(true);
  });

  it("rejects null and undefined explicitly", () => {
    expect(isCatalogExtractionResult(null)).toBe(false);
    expect(isCatalogExtractionResult(undefined)).toBe(false);
  });

  it("rejects primitives (string, number, boolean)", () => {
    expect(isCatalogExtractionResult("not an object")).toBe(false);
    expect(isCatalogExtractionResult(42)).toBe(false);
    expect(isCatalogExtractionResult(true)).toBe(false);
  });

  it("rejects an empty object (missing required keys)", () => {
    expect(isCatalogExtractionResult({})).toBe(false);
  });

  it("rejects when raw_tools is not an array (string instead)", () => {
    const bad = { ...validResult, raw_tools: "should be an array" } as unknown;
    expect(isCatalogExtractionResult(bad)).toBe(false);
  });

  it("rejects when advisoryOnly is false (R12 fail-loud — silent inventory mutation guard)", () => {
    const bad = { ...validResult, advisoryOnly: false } as unknown;
    expect(isCatalogExtractionResult(bad)).toBe(false);
  });

  it("rejects when must_human_verify is false (R12 fail-loud)", () => {
    const bad = { ...validResult, must_human_verify: false } as unknown;
    expect(isCatalogExtractionResult(bad)).toBe(false);
  });

  it("rejects when schemaVersion is missing", () => {
    const { schemaVersion: _omit, ...rest } = validResult;
    expect(isCatalogExtractionResult(rest)).toBe(false);
  });

  it("rejects when vendor is missing", () => {
    const { vendor: _omit, ...rest } = validResult;
    expect(isCatalogExtractionResult(rest)).toBe(false);
  });

  it("rejects when summary is null", () => {
    const bad = { ...validResult, summary: null } as unknown;
    expect(isCatalogExtractionResult(bad)).toBe(false);
  });

  it("accepts a result with empty raw_tools array (zero-tool catalog is a valid degenerate case)", () => {
    const minimal = { ...validResult, raw_tools: [] };
    expect(isCatalogExtractionResult(minimal)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isRawCatalogTool
// ---------------------------------------------------------------------------

describe("isRawCatalogTool", () => {
  it("accepts a fully-formed valid tool", () => {
    expect(isRawCatalogTool(validTool)).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isRawCatalogTool(null)).toBe(false);
    expect(isRawCatalogTool(undefined)).toBe(false);
  });

  it("rejects when vendor is missing", () => {
    const { vendor: _omit, ...rest } = validTool;
    expect(isRawCatalogTool(rest)).toBe(false);
  });

  it("rejects when catalog_number is missing (the dedup-key half)", () => {
    const { catalog_number: _omit, ...rest } = validTool;
    expect(isRawCatalogTool(rest)).toBe(false);
  });

  it("rejects when cutting_data is not an array", () => {
    const bad = { ...validTool, cutting_data: { iso_group: "P" } } as unknown;
    expect(isRawCatalogTool(bad)).toBe(false);
  });

  it("rejects when geometry is null", () => {
    const bad = { ...validTool, geometry: null } as unknown;
    expect(isRawCatalogTool(bad)).toBe(false);
  });

  it("rejects when type is missing", () => {
    const { type: _omit, ...rest } = validTool;
    expect(isRawCatalogTool(rest)).toBe(false);
  });

  it("accepts a tool with empty cutting_data (some catalog entries are accessory items with no SFM/fz)", () => {
    const accessory = { ...validTool, cutting_data: [] };
    expect(isRawCatalogTool(accessory)).toBe(true);
  });

  it("accepts a tool with no material_groups (genuine 'universal' SKU)", () => {
    const universal = { ...validTool, material_groups: [] };
    expect(isRawCatalogTool(universal)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture sanity — confirm the fixture itself is internally consistent
// (catches schema-drift regressions where the fixture types stop compiling)
// ---------------------------------------------------------------------------

describe("validResult fixture invariants", () => {
  it("summary.total_tools matches raw_tools.length", () => {
    expect(validResult.summary.total_tools).toBe(validResult.raw_tools.length);
  });

  it("summary.total_cutting_data_rows matches sum of raw_tools[].cutting_data.length", () => {
    const computed = validResult.raw_tools.reduce((acc, t) => acc + t.cutting_data.length, 0);
    expect(validResult.summary.total_cutting_data_rows).toBe(computed);
  });

  it("per_iso_group_counts P-count matches actual tools tagged P", () => {
    const computed = validResult.raw_tools.filter((t) => t.material_groups.includes("P")).length;
    expect(validResult.summary.per_iso_group_counts.P).toBe(computed);
  });

  it("publisher_confidence is in [0, 1]", () => {
    expect(validResult.summary.publisher_confidence).toBeGreaterThanOrEqual(0);
    expect(validResult.summary.publisher_confidence).toBeLessThanOrEqual(1);
  });

  it("every cutting_data row's source.confidence is in [0, 1]", () => {
    for (const tool of validResult.raw_tools) {
      for (const row of tool.cutting_data) {
        expect(row.source.confidence).toBeGreaterThanOrEqual(0);
        expect(row.source.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});
