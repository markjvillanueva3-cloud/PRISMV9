import { describe, it, expect } from "vitest";
import { GCodeUnderstandingTransformerEngine } from "../engines/GCodeUnderstandingTransformerEngine.js";

describe("GCodeUnderstandingTransformerEngine", () => {
  const engine = new GCodeUnderstandingTransformerEngine();

  const sampleGCode = `
O1001
N10 G90 G54 G17
N20 T1 M6
N30 S8000 M3
N40 G43 H1 Z50.0
N50 G0 X0 Y0
N60 G1 Z-5.0 F500
N70 G1 X50.0 F1000
N80 G2 X100.0 Y50.0 I25.0 J0
N90 G1 Y100.0
N100 G0 Z50.0
N110 M5
N120 M30
`;

  describe("tokenize", () => {
    it("should tokenize G-code into tokens", () => {
      const tokens = engine.tokenize(sampleGCode);

      expect(tokens.length).toBeGreaterThan(10);
      expect(tokens.some(t => t.type === "G")).toBe(true);
      expect(tokens.some(t => t.type === "M")).toBe(true);
      expect(tokens.some(t => t.type === "X")).toBe(true);
    });

    it("should extract G-code numbers", () => {
      const tokens = engine.tokenize("G0 G1 G2 G90");

      const gTokens = tokens.filter(t => t.type === "G");
      expect(gTokens.some(t => t.code === 0)).toBe(true);
      expect(gTokens.some(t => t.code === 1)).toBe(true);
      expect(gTokens.some(t => t.code === 2)).toBe(true);
      expect(gTokens.some(t => t.code === 90)).toBe(true);
    });

    it("should extract coordinate values", () => {
      const tokens = engine.tokenize("X100.5 Y-50.0 Z25.0");

      const xToken = tokens.find(t => t.type === "X");
      const yToken = tokens.find(t => t.type === "Y");
      const zToken = tokens.find(t => t.type === "Z");

      expect(xToken?.value).toBeCloseTo(100.5);
      expect(yToken?.value).toBeCloseTo(-50.0);
      expect(zToken?.value).toBeCloseTo(25.0);
    });

    it("should handle comments", () => {
      const tokens = engine.tokenize("(This is a comment)\nG0 X0");

      const comment = tokens.find(t => t.type === "COMMENT");
      expect(comment).toBeDefined();
    });
  });

  describe("understand", () => {
    it("should return understanding result with all fields", () => {
      const result = engine.understand(sampleGCode);

      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.embeddings.length).toBe(result.tokens.length);
      expect(result.operation_classifications.length).toBeGreaterThan(0);
      expect(result.semantic_summary).toBeDefined();
      expect(result.model_version).toBeDefined();
    });

    it("should detect circular interpolation pattern", () => {
      const result = engine.understand("G2 X10 Y10 I5 J0");

      expect(result.detected_patterns).toContain("circular_interpolation");
    });

    it("should detect drilling cycle pattern", () => {
      const result = engine.understand("G83 X0 Y0 Z-20 Q5 R2 F100");

      expect(result.detected_patterns).toContain("drilling_cycle");
    });

    it("should detect cutter compensation pattern", () => {
      const result = engine.understand("G41 D1 X10 Y10");

      expect(result.detected_patterns).toContain("cutter_compensation");
    });

    it("should flag anomalies for extreme values", () => {
      const result = engine.understand("G1 X100 F50000");

      expect(result.anomalies).toContain("unusually_high_feedrate");
    });
  });

  describe("embeddings", () => {
    it("should produce embeddings with correct dimension", () => {
      const result = engine.understand("G0 X0 Y0");

      result.embeddings.forEach(emb => {
        expect(emb.embedding.length).toBe(64);
      });
    });

    it("should include position information", () => {
      const result = engine.understand("G0 G1 G2");

      expect(result.embeddings[0].position).toBe(0);
      expect(result.embeddings[1].position).toBe(1);
      expect(result.embeddings[2].position).toBe(2);
    });
  });

  describe("classification", () => {
    it("should classify operations with confidence", () => {
      const result = engine.understand(sampleGCode);

      result.operation_classifications.forEach(cls => {
        expect(cls.confidence).toBeGreaterThan(0);
        expect(cls.confidence).toBeLessThanOrEqual(1);
        expect(cls.operation_type).toBeDefined();
      });
    });
  });
});
