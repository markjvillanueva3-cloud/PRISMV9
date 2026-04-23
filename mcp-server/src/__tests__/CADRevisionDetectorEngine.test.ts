/**
 * CADRevisionDetectorEngine.test.ts — U-FS-03 (PHASE-47)
 *
 * Verifies filename → revision tokenization + latest-rev resolution.
 */

import { describe, it, expect } from "vitest";
import { CADRevisionDetectorEngine } from "../engines/CADRevisionDetectorEngine.js";

const eng = new CADRevisionDetectorEngine();

describe("CADRevisionDetectorEngine (U-FS-03)", () => {
  describe("extension stripping", () => {
    it("strips known CAD extensions", () => {
      const tag = eng.detect("bracket_A.SLDPRT");
      expect(tag.extension).toBe(".sldprt");
      expect(tag.drawingNumber).toBe("BRACKET");
    });

    it("preserves unknown short extensions", () => {
      const tag = eng.detect("PART-02.xyz");
      // .xyz is 4 chars, within dotIdx heuristic
      expect(tag.extension.toLowerCase()).toBe(".xyz");
    });

    it("handles no-extension file", () => {
      const tag = eng.detect("bracket_A");
      expect(tag.extension).toBe("");
      expect(tag.revision).toBe("A");
    });
  });

  describe("explicit Rev tag (highest confidence)", () => {
    it("parses 'Rev.A'", () => {
      const tag = eng.detect("bracket-Rev.A.sldprt");
      expect(tag.revision).toBe("A");
      expect(tag.scheme).toBe("alpha");
      expect(tag.source).toBe("explicit_tag");
      expect(tag.confidence).toBeGreaterThan(0.95);
    });

    it("parses 'REV-B'", () => {
      const tag = eng.detect("Bracket-01_REV-B.prt");
      expect(tag.revision).toBe("B");
      expect(tag.source).toBe("explicit_tag");
    });

    it("parses 'RevC2' mixed alpha-numeric", () => {
      const tag = eng.detect("part_RevC2.step");
      expect(tag.revision).toBe("C2");
      expect(tag.scheme).toBe("alpha_num");
    });
  });

  describe("R-number suffix", () => {
    it("parses '_R3'", () => {
      const tag = eng.detect("housing_R3.catpart");
      expect(tag.revision).toBe("R3");
      expect(tag.revisionNumber).toBe(3);
      expect(tag.scheme).toBe("numeric");
    });

    it("parses '-R12'", () => {
      const tag = eng.detect("frame-R12.ipt");
      expect(tag.revision).toBe("R12");
      expect(tag.revisionNumber).toBe(12);
    });
  });

  describe("v-version suffix", () => {
    it("parses 'v3'", () => {
      const tag = eng.detect("bracket_v3.sldprt");
      expect(tag.revision).toBe("V3");
      expect(tag.revisionNumber).toBe(3);
      expect(tag.source).toBe("version_v");
    });

    it("parses 'V12'", () => {
      const tag = eng.detect("assembly-V12.stp");
      expect(tag.revision).toBe("V12");
    });
  });

  describe("single-letter suffix", () => {
    it("parses '_A'", () => {
      const tag = eng.detect("bracket_A.sldprt");
      expect(tag.revision).toBe("A");
      expect(tag.scheme).toBe("alpha");
      expect(tag.source).toBe("underscore_alpha");
    });

    it("parses '-C'", () => {
      const tag = eng.detect("ptA-C.prt");
      expect(tag.revision).toBe("C");
    });
  });

  describe("numeric suffix (-02, -03)", () => {
    it("parses '-02'", () => {
      const tag = eng.detect("bracket-02.sldprt");
      expect(tag.revision).toBe("02");
      expect(tag.revisionNumber).toBe(2);
      expect(tag.source).toBe("dash_numeric");
    });

    it("parses '_03'", () => {
      const tag = eng.detect("housing_03.prt");
      expect(tag.revision).toBe("03");
      expect(tag.revisionNumber).toBe(3);
    });
  });

  describe("dotted version", () => {
    it("parses '1.2'", () => {
      const tag = eng.detect("assy 1.2.sldasm");
      expect(tag.revision).toBe("1.2");
      expect(tag.scheme).toBe("dotted");
    });
  });

  describe("ISO date", () => {
    it("parses YYYY-MM-DD", () => {
      const tag = eng.detect("bracket_2024-03-15.sldprt");
      expect(tag.revision).toBe("2024-03-15");
      expect(tag.scheme).toBe("iso_date");
      expect(tag.source).toBe("iso_date");
    });
  });

  describe("trailing letter (low confidence)", () => {
    it("parses 'bracketA' as low-confidence letter rev", () => {
      const tag = eng.detect("BracketA.sldprt");
      expect(tag.revision).toBe("A");
      expect(tag.source).toBe("trailing_letter");
      expect(tag.confidence).toBeLessThan(0.6);
    });

    it("does NOT match single-char base", () => {
      const tag = eng.detect("A.sldprt");
      expect(tag.revision).toBe("");
      expect(tag.scheme).toBe("unknown");
    });
  });

  describe("no revision token", () => {
    it("returns empty revision for plain name", () => {
      const tag = eng.detect("bracket.sldprt");
      expect(tag.revision).toBe("");
      expect(tag.scheme).toBe("unknown");
      expect(tag.source).toBe("none");
      expect(tag.confidence).toBe(0);
    });

    it("normalizes drawing number to uppercase", () => {
      const tag = eng.detect("bracket.sldprt");
      expect(tag.drawingNumber).toBe("BRACKET");
    });
  });

  describe("stripRevision helper", () => {
    it("returns canonical drawing number", () => {
      expect(eng.stripRevision("bracket_Rev.B.sldprt")).toBe("BRACKET");
      expect(eng.stripRevision("housing-R3.prt")).toBe("HOUSING");
      expect(eng.stripRevision("frame_v12.stp")).toBe("FRAME");
    });
  });

  describe("group + resolveLatest", () => {
    it("groups by drawing number + finds latest numeric revision", () => {
      const groups = eng.group([
        "bracket_R1.sldprt",
        "bracket_R3.sldprt",
        "bracket_R2.sldprt",
      ]);
      expect(groups.length).toBe(1);
      expect(groups[0].drawingNumber).toBe("BRACKET");
      expect(groups[0].revisions.length).toBe(3);
      expect(groups[0].latestRevision?.revision).toBe("R3");
      expect(groups[0].sortOrder).toBe("numeric");
    });

    it("groups + finds latest alpha revision (C > B > A)", () => {
      const groups = eng.group([
        "housing_RevA.prt",
        "housing_RevB.prt",
        "housing_RevC.prt",
      ]);
      expect(groups[0].latestRevision?.revision).toBe("C");
      expect(groups[0].sortOrder).toBe("alpha");
    });

    it("splits separate drawing numbers into separate groups", () => {
      const groups = eng.group([
        "bracket_A.sldprt",
        "bracket_B.sldprt",
        "housing_R1.sldprt",
        "housing_R2.sldprt",
      ]);
      expect(groups.length).toBe(2);
      const drawings = groups.map((g) => g.drawingNumber).sort();
      expect(drawings).toEqual(["BRACKET", "HOUSING"]);
    });

    it("marks mixed-scheme group as 'mixed'", () => {
      const groups = eng.group([
        "part_A.sldprt",
        "part_R2.sldprt",
      ]);
      expect(groups[0].sortOrder).toBe("mixed");
    });

    it("handles files with no revision tokens", () => {
      const groups = eng.group(["bracket.sldprt", "housing.prt"]);
      expect(groups.length).toBe(2);
      // Unrecognized → latestRevision undefined
      expect(groups[0].latestRevision).toBeUndefined();
    });
  });

  describe("schema enforcement", () => {
    it("every returned tag has confidence in [0,1]", () => {
      const samples = [
        "bracket_A.sldprt",
        "bracket_Rev.C.sldprt",
        "part_v12.step",
        "plain.prt",
        "file-03.prt",
      ];
      for (const f of samples) {
        const tag = eng.detect(f);
        expect(tag.confidence).toBeGreaterThanOrEqual(0);
        expect(tag.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
