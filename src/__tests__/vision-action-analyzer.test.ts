/**
 * Tests for VisionActionAnalyzerEngine
 * Tests error handling, class structure, and parseJSON via reflection.
 * API-dependent methods are tested for proper error propagation.
 */
import { describe, it, expect } from "vitest";
import {
  VisionActionAnalyzerEngine,
  visionActionAnalyzerEngine,
} from "../engines/VisionActionAnalyzerEngine.js";

describe("VisionActionAnalyzerEngine", () => {
  // ── Singleton export ───────────────────────────────────────────

  describe("singleton", () => {
    it("should export a singleton instance", () => {
      expect(visionActionAnalyzerEngine).toBeDefined();
      expect(visionActionAnalyzerEngine).toBeInstanceOf(
        VisionActionAnalyzerEngine
      );
    });
  });

  // ── Constructor and class structure ────────────────────────────

  describe("engine structure", () => {
    it("should be instantiable", () => {
      const eng = new VisionActionAnalyzerEngine();
      expect(eng).toBeDefined();
    });

    it("should expose all public methods", () => {
      const eng = new VisionActionAnalyzerEngine();
      expect(typeof eng.estimateCost).toBe("function");
      expect(typeof eng.analyzeFrame).toBe("function");
      expect(typeof eng.analyzeFramePair).toBe("function");
      expect(typeof eng.processVideo).toBe("function");
      expect(typeof eng.analyzeLocalFrames).toBe("function");
      expect(typeof eng.extractKeyframes).toBe("function");
    });
  });

  // ── Error handling: missing files ──────────────────────────────

  describe("analyzeFrame", () => {
    it("should throw for non-existent image file", async () => {
      await expect(
        visionActionAnalyzerEngine.analyzeFrame(
          "/nonexistent/frame.png"
        )
      ).rejects.toThrow(/not found|not set/i);
    });
  });

  describe("analyzeFramePair", () => {
    it("should throw for non-existent image files", async () => {
      await expect(
        visionActionAnalyzerEngine.analyzeFramePair(
          "/nonexistent/before.png",
          "/nonexistent/after.png"
        )
      ).rejects.toThrow(/not found|not set/i);
    });
  });

  describe("processVideo", () => {
    it("should throw for non-existent video file", async () => {
      await expect(
        visionActionAnalyzerEngine.processVideo(
          "/nonexistent/video.mp4"
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("extractKeyframes", () => {
    it("should throw for non-existent video file", async () => {
      await expect(
        visionActionAnalyzerEngine.extractKeyframes(
          "/nonexistent/video.mp4"
        )
      ).rejects.toThrow(/not found|ffmpeg|ffprobe/i);
    });
  });

  describe("estimateCost", () => {
    it("should throw for non-existent video file", async () => {
      await expect(
        visionActionAnalyzerEngine.estimateCost(
          "/nonexistent/video.mp4"
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  // ── parseJSON via reflection ───────────────────────────────────

  describe("parseJSON (private, tested via reflection)", () => {
    const eng = new VisionActionAnalyzerEngine() as any;

    it("should parse plain JSON", () => {
      const result = eng.parseJSON('{"operation": "extrude"}');
      expect(result).toEqual({ operation: "extrude" });
    });

    it("should parse JSON wrapped in markdown code fences", () => {
      const fenced = '```json\n{"operation": "fillet"}\n```';
      const result = eng.parseJSON(fenced);
      expect(result).toEqual({ operation: "fillet" });
    });

    it("should throw on invalid JSON", () => {
      expect(() => eng.parseJSON("not json at all")).toThrow(
        /Failed to parse/
      );
    });

    it("should parse JSON with whitespace padding", () => {
      const result = eng.parseJSON(
        '  \n  {"confidence": 0.9}  \n  '
      );
      expect(result).toEqual({ confidence: 0.9 });
    });

    it("should strip code fences without json label", () => {
      const fenced = '```\n{"action": "revolve"}\n```';
      const result = eng.parseJSON(fenced);
      expect(result).toEqual({ action: "revolve" });
    });
  });
});
