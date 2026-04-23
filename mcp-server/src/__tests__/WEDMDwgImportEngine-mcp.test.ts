/**
 * U-P2PFS12: WEDMDwgImportEngine MCP Wiring Tests
 * Verifies dispatcher action wedm_dwg_import
 */
import { describe, it, expect } from "vitest";
import { wedmDwgImportEngine } from "../engines/WEDMDwgImportEngine.js";

describe("WEDMDwgImportEngine MCP Wiring (U-P2PFS12)", () => {
  describe("import()", () => {
    it("returns DwgImportResult structure with converter_used", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("invalid data"),
        filename: "test.dwg",
      });

      expect(result).toHaveProperty("converter_used");
      expect(result).toHaveProperty("conversion_time_ms");
      expect(result).toHaveProperty("total_time_ms");
      expect(result).toHaveProperty("contours");
      expect(result).toHaveProperty("issues");
    });

    it("accepts base64 string input", async () => {
      const base64Data = Buffer.from("test").toString("base64");
      const result = await wedmDwgImportEngine.import({
        dwg_data: base64Data,
        filename: "test.dwg",
      });

      expect(typeof result.conversion_time_ms).toBe("number");
      expect(typeof result.total_time_ms).toBe("number");
      expect(Array.isArray(result.contours)).toBe(true);
    });

    it("accepts Buffer input", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from([0x41, 0x43, 0x31, 0x30]),
        filename: "test.dwg",
      });

      expect(result).toHaveProperty("converter_used");
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("respects force_units parameter", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("test"),
        filename: "test.dwg",
        force_units: "mm",
      });

      expect(result).toHaveProperty("source_units");
    });

    it("handles gap_tolerance_mm parameter", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("test"),
        filename: "test.dwg",
        gap_tolerance_mm: 0.02,
      });

      expect(result).toHaveProperty("contours");
    });

    it("handles chord_tolerance_mm parameter", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("test"),
        filename: "test.dwg",
        chord_tolerance_mm: 0.01,
      });

      expect(result).toHaveProperty("contours");
    });

    it("tracks conversion and total time", async () => {
      const result = await wedmDwgImportEngine.import({
        dwg_data: Buffer.from("test"),
        filename: "test.dwg",
      });

      expect(result.conversion_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.total_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.total_time_ms).toBeGreaterThanOrEqual(result.conversion_time_ms);
    });
  });
});
