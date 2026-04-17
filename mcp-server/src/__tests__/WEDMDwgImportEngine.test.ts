/**
 * Tests for WEDMDwgImportEngine
 *
 * Tests DWG import functionality including:
 * - DXF passthrough (already DXF files)
 * - DWG version detection
 * - Converter availability check
 * - Error handling for invalid files
 * - Integration with DXFGeometryParserEngine
 */

import { describe, it, expect, beforeAll } from "vitest";
import { wedmDwgImportEngine, WEDMDwgImportEngine } from "../engines/WEDMDwgImportEngine.js";

describe("WEDMDwgImportEngine", () => {
  // ── Singleton Export ─────────────────────────────────────────────

  it("exports singleton instance", () => {
    expect(wedmDwgImportEngine).toBeInstanceOf(WEDMDwgImportEngine);
  });

  // ── Converter Availability ───────────────────────────────────────

  describe("checkConverterAvailability", () => {
    it("returns availability status for converters", async () => {
      const result = await wedmDwgImportEngine.checkConverterAvailability();

      expect(result).toHaveProperty("libredwg");
      expect(result).toHaveProperty("oda");
      expect(result).toHaveProperty("any");
      expect(result).toHaveProperty("recommended");
      expect(typeof result.libredwg).toBe("boolean");
      expect(typeof result.oda).toBe("boolean");
      expect(typeof result.any).toBe("boolean");
      expect(["libredwg", "oda", "none"]).toContain(result.recommended);
    });

    it("recommended is none when no converters available", async () => {
      const result = await wedmDwgImportEngine.checkConverterAvailability();
      if (!result.any) {
        expect(result.recommended).toBe("none");
      }
    });
  });

  // ── Supported Versions ───────────────────────────────────────────

  describe("getSupportedVersions", () => {
    it("returns list of supported DWG versions", () => {
      const versions = wedmDwgImportEngine.getSupportedVersions();

      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions.some(v => v.includes("R2018"))).toBe(true);
      expect(versions.some(v => v.includes("R14"))).toBe(true);
    });

    it("includes version codes", () => {
      const versions = wedmDwgImportEngine.getSupportedVersions();

      expect(versions.some(v => v.includes("AC1032"))).toBe(true);
      expect(versions.some(v => v.includes("AC1014"))).toBe(true);
    });
  });

  // ── DXF Passthrough ──────────────────────────────────────────────

  describe("DXF passthrough", () => {
    const minimalDxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
LINE
10
100.0
20
0.0
11
100.0
21
50.0
0
LINE
10
100.0
20
50.0
11
0.0
21
50.0
0
LINE
10
0.0
20
50.0
11
0.0
21
0.0
0
ENDSEC
0
EOF
`;

    it("parses DXF directly without conversion", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(minimalDxf, "utf8"),
        filename: "test.dxf",
      });

      expect(result.converter_used).toBe("direct");
      expect(result.conversion_time_ms).toBe(0);
      expect(result.contours.length).toBeGreaterThan(0);
    });

    it("extracts geometry from DXF rectangle", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(minimalDxf, "utf8"),
      });

      expect(result.contours.length).toBe(1);
      expect(result.contours[0].segments.length).toBe(4);
      expect(result.contours[0].is_closed).toBe(true);
    });

    it("handles base64-encoded DXF", async () => {
      const base64 = Buffer.from(minimalDxf, "utf8").toString("base64");

      const result = await wedmDwgImportEngine.import({
        dwg_data: base64,
        filename: "test.dxf",
      });

      expect(result.converter_used).toBe("direct");
      expect(result.contours.length).toBeGreaterThan(0);
    });

    it("respects force_units parameter", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(minimalDxf, "utf8"),
        force_units: "inch",
      });

      expect(result.source_units).toBe("inch");
    });
  });

  // ── Invalid File Handling ────────────────────────────────────────

  describe("invalid file handling", () => {
    it("rejects empty file", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(""),
      });

      expect(result.contours).toHaveLength(0);
      expect(result.issues.some(i => i.severity === "error")).toBe(true);
    });

    it("rejects random binary data", async () => {
      const randomData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

      const result = await wedmDwgImportEngine.import({
        dwg_data: randomData,
      });

      expect(result.contours).toHaveLength(0);
      expect(result.issues.some(i => i.message.includes("Invalid file format"))).toBe(true);
    });

    it("rejects text file pretending to be DWG", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("This is not a DWG file"),
      });

      expect(result.contours).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ── DWG Version Detection ────────────────────────────────────────

  describe("DWG version detection", () => {
    it("detects R2018 DWG magic", async () => {
      // AC1032 = R2018, followed by padding
      const r2018Header = Buffer.from("AC1032\x00\x00\x00\x00");

      const result = await wedmDwgImportEngine.import({
        dwg_data: r2018Header,
      });

      // Conversion will fail (not a real DWG) but version should be detected
      expect(result.dwg_version).toBe("AC1032");
    });

    it("detects R2000 DWG magic", async () => {
      const r2000Header = Buffer.from("AC1015\x00\x00\x00\x00");

      const result = await wedmDwgImportEngine.import({
        dwg_data: r2000Header,
      });

      expect(result.dwg_version).toBe("AC1015");
    });
  });

  // ── Result Structure ─────────────────────────────────────────────

  describe("result structure", () => {
    it("includes all required fields", async () => {
      const minimalDxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF
`;
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(minimalDxf, "utf8"),
      });

      expect(result).toHaveProperty("contours");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("entity_count");
      expect(result).toHaveProperty("source_format");
      expect(result).toHaveProperty("source_units");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("converter_used");
      expect(result).toHaveProperty("conversion_time_ms");
      expect(result).toHaveProperty("total_time_ms");
    });

    it("tracks timing information", async () => {
      const minimalDxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF
`;
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(minimalDxf, "utf8"),
      });

      expect(typeof result.conversion_time_ms).toBe("number");
      expect(typeof result.total_time_ms).toBe("number");
      expect(result.total_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Integration with DXFGeometryParser ───────────────────────────

  describe("DXFGeometryParser integration", () => {
    it("delegates to DXFGeometryParser for parsing", async () => {
      const dxfWithMultipleLines = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
LINE
10
100.0
20
0.0
11
100.0
21
50.0
0
ENDSEC
0
EOF
`;
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(dxfWithMultipleLines, "utf8"),
      });

      // Parser should extract the geometry
      expect(result.entity_count).toBeGreaterThan(0);
      expect(result.source_format).toBe("dxf");
    });

    it("handles empty DXF gracefully", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from(`0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF
`, "utf8"),
      });

      // Should not throw for empty geometry
      expect(result).toBeDefined();
      expect(result.contours).toBeDefined();
    });
  });

  // ── Constructor Options ──────────────────────────────────────────

  describe("constructor options", () => {
    it("accepts custom converter paths", () => {
      const engine = new WEDMDwgImportEngine({
        libredwg_path: "/custom/path/dwg2dxf",
        oda_converter_path: "/custom/oda/converter",
        timeout_ms: 60000,
      });

      expect(engine).toBeInstanceOf(WEDMDwgImportEngine);
    });

    it("uses default timeout when not specified", () => {
      const engine = new WEDMDwgImportEngine({});
      expect(engine).toBeInstanceOf(WEDMDwgImportEngine);
    });
  });
});
