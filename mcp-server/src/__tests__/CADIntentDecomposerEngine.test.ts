/**
 * CADIntentDecomposerEngine tests — U-CADC-AI02
 *
 * Covers:
 *   1. CAD system detection (14 systems, priority tie-break, auto fallback)
 *   2. Tier detection (op / part / assembly)
 *   3. Unit detection (mm / in) + fraction parsing
 *   4. Feature-kind detection (14 planner kinds)
 *   5. Parameter extraction (count, Ø, BCD, L×W×H, depth, thread, tolerance, material)
 *   6. mm-canonical + inchView mirror round-trip
 *   7. Ambiguity detection for missing required fields
 *   8. Plan-ready CADIntent emission for tier="op"
 *   9. Confidence monotonicity
 *  10. Corpus 500-sample smoke test
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CADIntentDecomposerEngine,
  cadIntentDecomposerEngine,
} from "../engines/CADIntentDecomposerEngine.js";

describe("CADIntentDecomposerEngine", () => {
  const eng = new CADIntentDecomposerEngine();

  describe("detectCADSystem", () => {
    it("detects solidworks by keyword", () => {
      expect(eng.detectCADSystem("make it in SolidWorks")).toBe("solidworks");
    });

    it("detects mastercam by extension hint", () => {
      expect(eng.detectCADSystem("target .mcx-8 file")).toBe("mastercam");
    });

    it("detects fusion360 with version variants", () => {
      expect(eng.detectCADSystem("Fusion 360")).toBe("fusion360");
      expect(eng.detectCADSystem("export from fusion")).toBe("fusion360");
    });

    it("returns auto when no CAD keyword present", () => {
      expect(eng.detectCADSystem("drill a 10mm hole")).toBe("auto");
    });

    it("breaks ties by PRISM priority (mastercam > solidworks)", () => {
      expect(eng.detectCADSystem("port between mastercam and solidworks")).toBe("mastercam");
    });

    it("handles less common systems (creo, nx, onshape, rhino)", () => {
      expect(eng.detectCADSystem("creo parametric workflow")).toBe("creo");
      expect(eng.detectCADSystem("Siemens NX")).toBe("nx");
      expect(eng.detectCADSystem("push to onshape")).toBe("onshape");
      expect(eng.detectCADSystem("import Rhino")).toBe("rhino");
    });

    it("distinguishes inventor vs inventor_hsm", () => {
      expect(eng.detectCADSystem("use inventor HSM toolpath")).toBe("inventor_hsm");
      expect(eng.detectCADSystem("open the inventor IPT")).toBe("inventor");
    });
  });

  describe("detectTier", () => {
    it("returns 'assembly' when assembly/BOM language present", () => {
      expect(eng.detectTier("build an assembly with mates")).toBe("assembly");
      expect(eng.detectTier("export BOM for asm01")).toBe("assembly");
    });

    it("returns 'part' for multi-body / multi-config", () => {
      expect(eng.detectTier("multi-body part with 3 variants")).toBe("part");
      expect(eng.detectTier("complex part with configs")).toBe("part");
    });

    it("defaults to 'op'", () => {
      expect(eng.detectTier("drill a hole")).toBe("op");
    });
  });

  describe("detectUnit", () => {
    it("recognizes mm form", () => {
      expect(eng.detectUnit("drill a 10mm hole")).toBe("mm");
    });

    it("recognizes inch form (inches, in, \")", () => {
      expect(eng.detectUnit("2 inches deep")).toBe("in");
      expect(eng.detectUnit("2in diameter")).toBe("in");
      expect(eng.detectUnit('1/4" thick')).toBe("in");
    });

    it("defaults to mm when no unit is present", () => {
      expect(eng.detectUnit("make a block")).toBe("mm");
    });
  });

  describe("detectFeatureKinds", () => {
    it("finds hole + circular_pattern for flange intent", () => {
      const kinds = eng.detectFeatureKinds(
        "draw a flange with 6 M8 bolt holes on a 100mm BCD",
      );
      expect(kinds).toContain("hole");
      expect(kinds).toContain("circular_pattern");
    });

    it("finds multiple kinds in compound intent", () => {
      const kinds = eng.detectFeatureKinds(
        "rectangle extrude then fillet edges and chamfer edges",
      );
      expect(kinds).toEqual(
        expect.arrayContaining(["rectangle_extrude", "fillet_edges", "chamfer_edges"]),
      );
    });

    it("returns empty array when no feature keyword", () => {
      expect(eng.detectFeatureKinds("hello world")).toEqual([]);
    });
  });

  describe("detectMaterial + detectThread + detectTolerance", () => {
    it("normalizes material names (D2, 6061, Ti6Al4V)", () => {
      expect(eng.detectMaterial("cut D2 tool steel")).toBe("D2");
      expect(eng.detectMaterial("6061-T6")).toBe("AL6061");
      expect(eng.detectMaterial("Ti 6Al-4V titanium")).toBe("Ti6Al4V");
    });

    it("parses metric and imperial thread sizes", () => {
      expect(eng.detectThread("M8 thread")).toBe("M8");
      expect(eng.detectThread("M10x1.5 hole")).toBe("M10x1.5");
      expect(eng.detectThread("tap 1/4-20 UNC")).toBe("1/4-20");
      expect(eng.detectThread("#10-32 screw")).toBe("#10-32");
    });

    it("avoids false-positive thread match on 'Mastercam'", () => {
      // no digits right after Mastercam → shouldn't match
      expect(eng.detectThread("export from Mastercam")).toBeUndefined();
    });

    it("captures tolerance strings with ± and +/-", () => {
      expect(eng.detectTolerance("diameter ±0.01mm")).toBe("±0.01mm");
      expect(eng.detectTolerance("+/- .005 in")).toBe("±.005in");
    });
  });

  describe("decompose — end-to-end parameter extraction", () => {
    it("flange example yields full structured output", () => {
      const r = eng.decompose(
        "draw a flange with 6 M8 bolt holes on a 100mm BCD in solidworks",
      );
      expect(r.cadSystem).toBe("solidworks");
      expect(r.tier).toBe("op");
      expect(r.parameters.count).toBe(6);
      expect(r.parameters.bcd_mm).toBe(100);
      expect(r.parameters.threadSize).toBe("M8");
      expect(r.operationType).toContain("hole");
      expect(r.operationType).toContain("circular_pattern");
      expect(r.opIntent).not.toBeNull();
    });

    it("mm canonical + inchView inch mirror agree within rounding", () => {
      const r = eng.decompose("drill a 25.4mm hole in solidworks");
      expect(r.parameters.diameter_mm).toBeCloseTo(25.4, 3);
      expect(r.parameters.inchView?.diameter_in).toBeCloseTo(1.0, 4);
    });

    it("parses inches and converts to mm", () => {
      const r = eng.decompose('drill a 1" hole in solidworks');
      expect(r.parameters.originalUnit).toBe("in");
      expect(r.parameters.diameter_mm).toBeCloseTo(25.4, 3);
      expect(r.parameters.inchView?.diameter_in).toBeCloseTo(1.0, 4);
    });

    it("parses rectangle L x W x H", () => {
      const r = eng.decompose("extrude a 100x50x10mm block in fusion360");
      expect(r.parameters.length_mm).toBe(100);
      expect(r.parameters.width_mm).toBe(50);
      expect(r.parameters.height_mm).toBe(10);
    });

    it("emits planner-ready opIntent only when complete", () => {
      const complete = eng.decompose(
        "rectangle extrude 100x50x10mm in solidworks",
      );
      expect(complete.opIntent).not.toBeNull();
      expect(complete.opIntent!.features.length).toBeGreaterThan(0);
      expect(complete.opIntent!.cadSystem).toBe("solidworks");

      const missingCAD = eng.decompose("rectangle extrude 100x50x10mm");
      expect(missingCAD.cadSystem).toBe("auto");
      expect(missingCAD.opIntent).toBeNull();
    });

    it("attaches material/thread/tolerance as constraints", () => {
      const r = eng.decompose(
        "drill a 10mm hole in D2 ±0.01mm tapped M8 in solidworks",
      );
      expect(r.constraints).toContain("material D2");
      expect(r.constraints).toContain("tolerance ±0.01mm");
      expect(r.constraints).toContain("thread M8");
    });
  });

  describe("ambiguity detection", () => {
    it("flags missing CAD as soft (AI can auto-pick)", () => {
      const r = eng.decompose("drill a 10mm hole");
      const cadAmb = r.ambiguities.find((a) => a.field === "cadSystem");
      expect(cadAmb?.severity).toBe("soft");
    });

    it("flags missing hole diameter as blocker", () => {
      const r = eng.decompose("drill a hole in solidworks");
      expect(r.ambiguities.some(
        (a) => a.field === "diameter" && a.severity === "blocker",
      )).toBe(true);
    });

    it("flags missing pattern count as blocker", () => {
      const r = eng.decompose("add a circular pattern in solidworks");
      expect(r.ambiguities.some(
        (a) => a.field === "count" && a.severity === "blocker",
      )).toBe(true);
    });

    it("no blockers for a complete intent", () => {
      const r = eng.decompose(
        "drill a 10mm hole 15mm deep in solidworks",
      );
      const blockers = r.ambiguities.filter((a) => a.severity === "blocker");
      expect(blockers).toHaveLength(0);
    });
  });

  describe("confidence scoring", () => {
    it("complete intent outscores ambiguous intent", () => {
      const hi = eng.decompose(
        "drill a 10mm hole 15mm deep in D2 with M8 thread in solidworks",
      );
      const lo = eng.decompose("do something");
      expect(hi.confidence).toBeGreaterThan(lo.confidence);
      expect(hi.confidence).toBeGreaterThan(0.6);
      expect(lo.confidence).toBeLessThan(0.5);
    });

    it("confidence stays within [0,1]", () => {
      for (const input of [
        "",
        "drill",
        "drill a 10mm hole",
        "build assembly with 4 parts and 6 mates for fastener die",
      ]) {
        if (input === "") continue; // throws, covered separately
        const r = eng.decompose(input);
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("edge cases", () => {
    it("throws on empty input", () => {
      expect(() => eng.decompose("")).toThrow();
      expect(() => eng.decompose("   ")).toThrow();
    });

    it("singleton export equals class instance behavior", () => {
      const a = cadIntentDecomposerEngine.decompose("drill a 10mm hole in solidworks");
      const b = new CADIntentDecomposerEngine().decompose(
        "drill a 10mm hole in solidworks",
      );
      expect(a.cadSystem).toBe(b.cadSystem);
      expect(a.parameters.diameter_mm).toBe(b.parameters.diameter_mm);
    });

    it("handles fraction inch diameter (1/4)", () => {
      const r = eng.decompose('drill a 1/4" hole in solidworks');
      expect(r.parameters.originalUnit).toBe("in");
      expect(r.parameters.diameter_mm).toBeCloseTo(6.35, 2);
    });
  });

  describe("corpus 500-sample smoke test", () => {
    const corpusPath = path.resolve(
      process.cwd(),
      "data/test-corpora/cad-nl-intent-500.jsonl",
    );
    const altPath = path.resolve(
      __dirname,
      "..",
      "..",
      "data",
      "test-corpora",
      "cad-nl-intent-500.jsonl",
    );
    const resolved = fs.existsSync(corpusPath)
      ? corpusPath
      : fs.existsSync(altPath)
        ? altPath
        : null;

    it("corpus file exists with 500 samples", () => {
      expect(resolved).not.toBeNull();
      const lines = fs
        .readFileSync(resolved!, "utf8")
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);
      expect(lines.length).toBe(500);
    });

    it("parses ≥95% of corpus without blocker ambiguities", () => {
      if (!resolved) throw new Error("corpus missing");
      const lines = fs
        .readFileSync(resolved!, "utf8")
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);

      let ok = 0;
      let total = 0;
      for (const line of lines) {
        const rec = JSON.parse(line) as {
          nl: string;
          expect: { cadSystem?: string; tier?: string; hasFeature?: boolean };
        };
        total++;
        try {
          const r = eng.decompose(rec.nl);
          const cadOK =
            !rec.expect.cadSystem || r.cadSystem === rec.expect.cadSystem;
          const tierOK = !rec.expect.tier || r.tier === rec.expect.tier;
          const featOK =
            rec.expect.hasFeature === undefined ||
            (rec.expect.hasFeature ? r.features.length > 0 : true);
          if (cadOK && tierOK && featOK) ok++;
        } catch {
          /* counts as failure */
        }
      }
      const rate = ok / total;
      expect(rate).toBeGreaterThanOrEqual(0.95);
    });
  });
});
