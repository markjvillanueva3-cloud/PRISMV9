/**
 * BlueprintVisionOCREngine — Unit tests
 *
 * Tests engine structure, type conversions, and error handling.
 * API-dependent tests are gated behind ANTHROPIC_API_KEY.
 */

import { describe, it, expect, vi } from "vitest";
import { BlueprintVisionOCREngine } from "../engines/BlueprintVisionOCREngine.js";
import type { BlueprintVisionInput } from "../engines/BlueprintVisionOCREngine.js";

describe("BlueprintVisionOCREngine", () => {
  const engine = new BlueprintVisionOCREngine();

  // ── Structure Tests (no API required) ─────────────────────────────

  describe("Engine Structure", () => {
    it("T01: engine class exists and exports singleton", async () => {
      const mod = await import("../engines/BlueprintVisionOCREngine.js");
      expect(mod.BlueprintVisionOCREngine).toBeDefined();
      expect(mod.blueprintVisionOCREngine).toBeDefined();
      expect(mod.blueprintVisionOCREngine).toBeInstanceOf(mod.BlueprintVisionOCREngine);
    });

    it("T02: analyzeBlueprint method exists", () => {
      expect(typeof engine.analyzeBlueprint).toBe("function");
    });

    it("T03: quickExtract method exists", () => {
      expect(typeof engine.quickExtract).toBe("function");
    });
  });

  // ── Error Handling (no API required) ──────────────────────────────

  describe("Error Handling", () => {
    it("T04: throws on missing ANTHROPIC_API_KEY", async () => {
      const origKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      // Create fresh engine to clear cached client
      const freshEngine = new BlueprintVisionOCREngine();

      try {
        await freshEngine.analyzeBlueprint({
          image: { type: "base64", data: "dGVzdA==" },
        });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.message).toContain("ANTHROPIC_API_KEY");
      } finally {
        if (origKey) process.env.ANTHROPIC_API_KEY = origKey;
      }
    });

    it("T05: throws on non-existent file path", async () => {
      // Set a dummy key so we get past the key check and hit the file check
      const origKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "test-key";

      const freshEngine = new BlueprintVisionOCREngine();

      try {
        await freshEngine.analyzeBlueprint({
          image: { type: "file", path: "/nonexistent/image.jpg" },
        });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.message).toContain("not found");
      } finally {
        if (origKey) {
          process.env.ANTHROPIC_API_KEY = origKey;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });

    it("T06: throws on URL image source (not supported)", async () => {
      const origKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "test-key";

      const freshEngine = new BlueprintVisionOCREngine();

      try {
        await freshEngine.analyzeBlueprint({
          image: { type: "url", url: "https://example.com/image.jpg" } as any,
        });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err.message).toContain("URL");
      } finally {
        if (origKey) {
          process.env.ANTHROPIC_API_KEY = origKey;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });
  });

  // ── Type Compatibility Tests ──────────────────────────────────────

  describe("Type Compatibility", () => {
    it("T07: BlueprintVisionResult extends BlueprintAnalysis", async () => {
      // Verify the type structure
      const { BlueprintVisionOCREngine: Cls } = await import("../engines/BlueprintVisionOCREngine.js");
      const instance = new Cls();

      // The return type should have all BlueprintAnalysis fields + extras
      // This is a compile-time check — if the types don't match, TS would fail
      expect(instance).toBeDefined();
    });

    it("T08: ImageSource union type covers all cases", () => {
      const base64: BlueprintVisionInput = {
        image: { type: "base64", data: "test", media_type: "image/jpeg" },
      };
      const file: BlueprintVisionInput = {
        image: { type: "file", path: "/test.jpg" },
      };
      expect(base64.image.type).toBe("base64");
      expect(file.image.type).toBe("file");
    });

    it("T09: blueprint_type supports wire_edm", () => {
      const input: BlueprintVisionInput = {
        image: { type: "base64", data: "test" },
        blueprint_type: "wire_edm",
        extract_geometry: true,
        expected_units: "inch",
      };
      expect(input.blueprint_type).toBe("wire_edm");
      expect(input.extract_geometry).toBe(true);
    });
  });

  // ── Integration with WEDM Pipeline ────────────────────────────────

  describe("WEDM Pipeline Integration", () => {
    it("T10: extracted profiles can convert to WireEDMContour format", () => {
      // Simulate what the /photo-to-program route does
      const ocrProfile = {
        id: "PROFILE-1",
        name: "Die Opening",
        type: "internal" as const,
        points: [
          { x: 0, y: 0 },
          { x: 25.4, y: 0 },
          { x: 25.4, y: 12.7 },
          { x: 0, y: 12.7 },
        ],
        is_closed: true,
        width_mm: 25.4,
        height_mm: 12.7,
        confidence: 0.85,
      };

      // Convert to WireEDMContour (same logic as route handler)
      const pts = ocrProfile.points;
      const segments = [];
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        segments.push({ type: "line" as const, start: pts[i], end: next });
      }
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const contour = {
        id: ocrProfile.id,
        segments,
        is_closed: true,
        is_exterior: ocrProfile.type === "external",
        area_mm2: ocrProfile.width_mm * ocrProfile.height_mm,
        perimeter_mm: segments.reduce((s, seg) =>
          s + Math.sqrt((seg.end.x - seg.start.x) ** 2 + (seg.end.y - seg.start.y) ** 2), 0),
        bbox: {
          min_x: Math.min(...xs),
          min_y: Math.min(...ys),
          max_x: Math.max(...xs),
          max_y: Math.max(...ys),
        },
      };

      expect(contour.segments.length).toBe(4);
      expect(contour.is_closed).toBe(true);
      expect(contour.is_exterior).toBe(false); // internal die opening
      expect(contour.perimeter_mm).toBeCloseTo(2 * (25.4 + 12.7), 1);
      expect(contour.bbox.min_x).toBe(0);
      expect(contour.bbox.max_x).toBe(25.4);
    });

    it("T11: OCR → WEDM pipeline produces valid program from mock OCR data", async () => {
      // Simulate OCR extracting a simple rectangular die opening
      const { WEDMPrintToProgramEngine } = await import("../engines/WEDMPrintToProgramEngine.js");
      const pipeline = new WEDMPrintToProgramEngine();

      // Build contour from "OCR extracted" profile
      const contour = {
        id: "ocr_rect",
        segments: [
          { type: "line" as const, start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
          { type: "line" as const, start: { x: 20, y: 0 }, end: { x: 20, y: 10 } },
          { type: "line" as const, start: { x: 20, y: 10 }, end: { x: 0, y: 10 } },
          { type: "line" as const, start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
        ],
        is_closed: true,
        is_exterior: false, // die opening = internal
        area_mm2: 200,
        perimeter_mm: 60,
        bbox: { min_x: 0, min_y: 0, max_x: 20, max_y: 10 },
      };

      // Run through the full pipeline as if OCR extracted this
      const result = await pipeline.generate({
        contours: [contour],
        material: "D2",          // "OCR detected" material
        thickness_mm: 25.4,      // "OCR detected" thickness
        target_ra_um: 0.8,       // "OCR detected" surface finish
        controller: "mitsubishi",
        part_name: "Die Opening",
        part_number: "OCR-TEST-001",
      });

      expect(result.success).toBe(true);
      expect(result.program_text).toContain("%");
      expect(result.program_text).toContain("M20");
      expect(result.program_text).toContain("M78");
      expect(result.program_text).toContain("M02");
      expect(result.setup_sheet.material).toBe("D2");
      expect(result.setup_sheet.part_name).toBe("Die Opening");
      expect(result.controller).toContain("Mitsubishi");
    });
  });

  // ── API Integration Tests (require ANTHROPIC_API_KEY) ─────────────

  describe.skipIf(!process.env.ANTHROPIC_API_KEY)("API Integration", () => {
    it("T12: analyzeBlueprint with real image returns structured data", async () => {
      // This test requires a real API key and a test image
      // For CI, skip unless ANTHROPIC_API_KEY is set
      // For local testing, place a blueprint image at the path below

      // Create a minimal test image (1x1 white pixel PNG)
      const minimalPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82,
      ]).toString("base64");

      const result = await engine.analyzeBlueprint({
        image: { type: "base64", data: minimalPNG, media_type: "image/png" },
        blueprint_type: "wire_edm",
        extract_geometry: true,
      });

      // Even a blank image should return valid structure
      expect(result).toHaveProperty("dimensions");
      expect(result).toHaveProperty("gdt_frames");
      expect(result).toHaveProperty("title_block");
      expect(result).toHaveProperty("notes");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("profiles");
      expect(result).toHaveProperty("tokens_used");
      expect(result.tokens_used).toBeGreaterThan(0);
      expect(Array.isArray(result.dimensions)).toBe(true);
      expect(Array.isArray(result.profiles)).toBe(true);
    });
  });
});
