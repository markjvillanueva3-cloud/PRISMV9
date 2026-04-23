/**
 * CADFormatConversionMatrixEngine.test.ts — U-FS-09 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADFormatConversionMatrixEngine } from "../engines/CADFormatConversionMatrixEngine.js";

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("CADFormatConversionMatrixEngine (U-FS-09)", () => {
  let eng: CADFormatConversionMatrixEngine;

  beforeEach(() => {
    eng = new CADFormatConversionMatrixEngine();
  });

  describe("built-in matrix", () => {
    it("ships with ≥15 built-in edges", () => {
      expect(eng.edgeCount).toBeGreaterThanOrEqual(15);
    });

    it("lists edges without mutation", () => {
      const count1 = eng.listEdges().length;
      eng.listEdges().push({} as any);
      expect(eng.listEdges().length).toBe(count1);
    });
  });

  describe("classifyConversion", () => {
    it("identity is lossless", () => {
      const r = eng.classifyConversion("step", "step");
      expect(r.quality).toBe("lossless");
      expect(r.compositeScore).toBe(1);
      expect(r.risk).toBe("green");
    });

    it("dwg → dxf is lossless (high score, green)", () => {
      const r = eng.classifyConversion("dwg", "dxf");
      expect(r.quality).toBe("lossless");
      expect(r.risk).toBe("green");
      expect(r.compositeScore).toBeGreaterThan(0.95);
    });

    it("step → stl is lossy_geometry (yellow or red risk)", () => {
      const r = eng.classifyConversion("step", "stl");
      expect(r.quality).toBe("lossy_geometry");
      expect(r.semanticRetention).toBe(0);
      expect(r.risk).not.toBe("green");
    });

    it("unsupported pair returns unsupported", () => {
      const r = eng.classifyConversion("sldprt", "3dm");
      expect(r.quality).toBe("unsupported");
      expect(r.risk).toBe("red");
      expect(r.compositeScore).toBe(0);
    });

    it("sldprt → step is lossy_visual (features lost)", () => {
      const r = eng.classifyConversion("sldprt", "step");
      expect(r.quality).toBe("lossy_visual");
      expect(r.geometricAccuracy).toBeGreaterThan(0.9);
      expect(r.semanticRetention).toBeLessThan(0.5);
    });
  });

  describe("bestPath", () => {
    it("finds direct path if available", () => {
      const p = eng.bestPath("step", "stl")!;
      expect(p.path).toEqual(["step", "stl"]);
    });

    it("finds 2-hop path when no direct edge", () => {
      // sldprt → step → iges
      const p = eng.bestPath("sldprt", "iges");
      expect(p).not.toBeNull();
      expect(p!.path[0]).toBe("sldprt");
      expect(p!.path[p!.path.length - 1]).toBe("iges");
      expect(p!.path.length).toBeGreaterThan(2);
    });

    it("returns null when unreachable", () => {
      const p = eng.bestPath("sldprt", "3dm");
      expect(p).toBeNull();
    });

    it("identity is zero-hop with score 1", () => {
      const p = eng.bestPath("step", "step")!;
      expect(p.path).toEqual(["step"]);
      expect(p.compositeScore).toBe(1);
    });
  });

  describe("addEdge (runtime extension)", () => {
    it("lets new edges be registered", () => {
      eng.addEdge({
        from: "custom_a",
        to: "custom_b",
        quality: "lossless",
        notes: "internal",
        geometricAccuracy: 1,
        semanticRetention: 1,
      });
      const r = eng.classifyConversion("custom_a", "custom_b");
      expect(r.quality).toBe("lossless");
    });
  });

  describe("sniffFormat", () => {
    it("identifies STEP by ISO-10303-21 header", () => {
      const bytes = utf8Bytes("ISO-10303-21;\nHEADER;");
      expect(eng.sniffFormat(bytes)).toBe("step");
    });

    it("identifies PDF by %PDF- magic", () => {
      const bytes = utf8Bytes("%PDF-1.4\nbody");
      expect(eng.sniffFormat(bytes)).toBe("pdf");
    });

    it("identifies glTF by glTF magic", () => {
      const bytes = utf8Bytes("glTF\x02\x00\x00\x00");
      expect(eng.sniffFormat(bytes)).toBe("glb");
    });

    it("returns undefined for unknown magic", () => {
      const bytes = utf8Bytes("RANDOM STUFF THAT DOES NOT MATCH ANYTHING");
      expect(eng.sniffFormat(bytes)).toBeUndefined();
    });
  });

  describe("probeValidity", () => {
    it("flags extension matching sniffed format as valid", () => {
      const probe = eng.probeValidity("part.step", utf8Bytes("ISO-10303-21;"));
      expect(probe.likelyValid).toBe(true);
      expect(probe.extensionMatch).toBe(true);
      expect(probe.sniffedFormat).toBe("step");
    });

    it("flags extension/sniff mismatch", () => {
      const probe = eng.probeValidity("part.sldprt", utf8Bytes("%PDF-1.4"));
      expect(probe.likelyValid).toBe(true);
      expect(probe.extensionMatch).toBe(false);
      expect(probe.sniffedFormat).toBe("pdf");
      expect(probe.notes).toMatch(/mislabeling|extension=/);
    });

    it("flags unknown magic as not likely valid", () => {
      const probe = eng.probeValidity("part.xyz", utf8Bytes("UNKNOWN MAGIC"));
      expect(probe.likelyValid).toBe(false);
      expect(probe.sniffedFormat).toBeUndefined();
    });
  });

  describe("case-insensitive inputs", () => {
    it("classifyConversion is case-insensitive", () => {
      expect(eng.classifyConversion("STEP", "STL").quality).toBe("lossy_geometry");
    });

    it("bestPath is case-insensitive", () => {
      const p = eng.bestPath("STEP", "STL")!;
      expect(p.path[0]).toBe("step");
    });
  });
});
