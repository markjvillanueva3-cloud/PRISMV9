/**
 * KiloFusionFileParserEngine Tests — KILO-CAM-TRAINING-MS0 iter 3
 *
 * @milestone KILO-CAM-TRAINING-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloFusionFileParserEngine,
  FusionFileSummarySchema,
  type FusionFileInput,
} from "../engines/KiloFusionFileParserEngine.js";

const F3D_GOOD: FusionFileInput = {
  file_path: "C:/test/Bracket.f3d",
  extension: "f3d",
  entries: [
    { path: "Document.json", size_bytes: 2_048, content: JSON.stringify({
      name: "Bracket",
      features: [
        { id: "F1", type: "extrude", tolerance_total_mm: 0.05 },
        { id: "F2", type: "fillet",  tolerance_total_mm: 0.025 },
        { id: "F3", type: "hole" },
      ],
      cam: {
        operations: [
          { id: "OP1", strategy: "adaptive_clearing", tool_number: 5 },
          { id: "OP2", strategy: "contour", tool_number: 8 },
        ],
      },
    }) },
    { path: "Geometry/sketches.json", size_bytes: 1_024 },
    { path: "Thumbnails/preview.png", size_bytes: 8_192 },
  ],
};

const F3D_NO_CAM: FusionFileInput = {
  file_path: "C:/test/Sketch.f3d",
  extension: "f3d",
  entries: [
    { path: "Document.json", size_bytes: 512, content: JSON.stringify({
      name: "SketchOnly",
      features: [{ id: "F1", type: "sketch", tolerance_total_mm: 0.1 }],
    }) },
  ],
};

const F3D_MISSING_DOC: FusionFileInput = {
  file_path: "C:/test/Broken.f3d",
  extension: "f3d",
  entries: [
    { path: "Geometry/orphan.json", size_bytes: 256 },
  ],
};

const F3D_INVALID_JSON: FusionFileInput = {
  file_path: "C:/test/Corrupt.f3d",
  extension: "f3d",
  entries: [
    { path: "Document.json", size_bytes: 64, content: "{ not valid json" },
  ],
};

describe("KiloFusionFileParserEngine", () => {
  describe("happy path", () => {
    it("good f3d with 3 features + 2 cam ops parses fully", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      expect(out.parsed).toBe(true);
      expect(out.gap).toBe(null);
      expect(out.document_name).toBe("Bracket");
      expect(out.feature_count).toBe(3);
      expect(out.cam_op_count).toBe(2);
      expect(out.total_uncompressed_bytes).toBe(11_264); // 2048+1024+8192
    });

    it("cam operation strategy + tool_number extracted verbatim", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      expect(out.cam_operations[0].strategy).toBe("adaptive_clearing");
      expect(out.cam_operations[0].tool_number).toBe(5);
      expect(out.cam_operations[1].strategy).toBe("contour");
      expect(out.cam_operations[1].tool_number).toBe(8);
    });

    it("CAD-only file (no cam block) parses to cam_op_count=0 without error", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_NO_CAM);
      expect(out.parsed).toBe(true);
      expect(out.cam_op_count).toBe(0);
      expect(out.feature_count).toBe(1);
      expect(out.document_name).toBe("SketchOnly");
    });
  });

  describe("refuse: dropping-tolerance-stack-on-translate", () => {
    it("explicit tolerance 0.05 + 0.025 flow through verbatim", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      expect(out.features[0].tolerance_total_mm).toBe(0.05);
      expect(out.features[1].tolerance_total_mm).toBe(0.025);
    });

    it("feature F3 (no tolerance in source JSON) maps to missing-tolerance list", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      expect(out.features_missing_tolerance).toEqual(["F3"]);
    });

    it("F3 tolerance is NOT heuristic-filled — output equals source (omitted)", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      const f3 = out.features.find((f) => f.feature_id === "F3");
      // Assert concrete shape: F3 is in the output, and its tolerance field
      // strictly equals undefined (not a heuristic 0, not 0.1, not a default).
      expect(f3?.feature_id).toBe("F3");
      expect(f3?.feature_type).toBe("hole");
      expect(f3?.tolerance_total_mm === undefined).toBe(true);
    });

    it("file with full tolerance produces empty missing_tolerance array", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_NO_CAM);
      expect(out.features_missing_tolerance.length).toBe(0);
    });
  });

  describe("refuse: no-silent-fallback on broken files", () => {
    it("missing Document.json → parsed=false + gap names the reason", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_MISSING_DOC);
      expect(out.parsed).toBe(false);
      expect(out.gap).toMatch(/missing Document.json/);
      expect(out.feature_count).toBe(0);
      expect(out.cam_op_count).toBe(0);
      expect(out.document_name).toBe(null);
    });

    it("invalid JSON in Document.json → parsed=false + gap names the reason", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_INVALID_JSON);
      expect(out.parsed).toBe(false);
      expect(out.gap).toMatch(/invalid JSON/);
      expect(out.feature_count).toBe(0);
      expect(out.cam_op_count).toBe(0);
      expect(out.document_name).toBe(null);
    });
  });

  describe("edge cases", () => {
    it("Document.json at nested path (subdir/Document.json) is detected", () => {
      const nested: FusionFileInput = {
        file_path: "C:/test/Nested.f3d",
        extension: "f3d",
        entries: [
          { path: "Root/Document.json", size_bytes: 256, content: JSON.stringify({ name: "Nested", features: [] }) },
        ],
      };
      const out = kiloFusionFileParserEngine.parseFusionFile(nested);
      expect(out.parsed).toBe(true);
      expect(out.document_name).toBe("Nested");
    });

    it(".f2d (drawing) extension is also accepted", () => {
      const f2d: FusionFileInput = {
        file_path: "C:/test/Drawing.f2d",
        extension: "f2d",
        entries: [
          { path: "Document.json", size_bytes: 256, content: JSON.stringify({ name: "Drawing", features: [] }) },
        ],
      };
      const out = kiloFusionFileParserEngine.parseFusionFile(f2d);
      expect(out.extension).toBe("f2d");
      expect(out.parsed).toBe(true);
    });
  });

  describe("R12 schema gates", () => {
    it("output passes own zod schema round-trip", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      const parsed = FusionFileSummarySchema.parse(out);
      expect(parsed.feature_count).toBe(3);
    });

    it("invalid extension ('stp') rejected at input gate", () => {
      const bad = { ...F3D_GOOD, extension: "stp" as never };
      expect(() => kiloFusionFileParserEngine.parseFusionFile(bad as FusionFileInput)).toThrow();
    });

    it("output fingerprints source for auditability", () => {
      const out = kiloFusionFileParserEngine.parseFusionFile(F3D_GOOD);
      expect(out.source).toBe("kilo_fusion_file_parser");
      expect(out.schemaVersion).toBe("1.0.0");
    });
  });
});
