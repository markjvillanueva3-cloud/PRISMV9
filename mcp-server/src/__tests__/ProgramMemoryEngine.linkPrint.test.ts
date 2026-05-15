/**
 * U-PPL-D2 — ProgramMemoryEngine print-pointer fields + linkPrint()
 *
 * Coverage floor (CLAUDE.md COMPREHENSIVE-BUILD):
 *   - Happy path: explicit link via save(), explicit link via linkPrint().
 *   - Failure modes (≥3): malformed link payload (empty path / empty
 *     confidence / non-integer page), unknown customer/part on linkPrint,
 *     prior-link preservation on re-save without new linkInfo.
 *   - Adversarial inputs (≥2): NaN/Infinity/negative page, oversize string,
 *     null vs undefined linkInfo distinction (null=clear, undefined=preserve).
 *   - Variability (≥3): three distinct customer/PN/dialect configurations.
 *
 * Real-value assertions (no toBeDefined() stubs).
 *
 * @module __tests__/ProgramMemoryEngine.linkPrint
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ProgramMemoryEngine,
  type ToolAssignment,
  type BlueprintLinkInfo,
} from "../engines/ProgramMemoryEngine.js";

const SAMPLE_ASSIGNMENTS: ToolAssignment[] = [
  {
    station: 1,
    tool_id: "T0101",
    tool_description: "OD ROUGH 80°",
    operation_type: "rough_od",
    speed_rpm: 1800,
    feed_rate: 0.012,
    notes: null,
  },
];

describe("ProgramMemoryEngine — print-pointer fields (U-PPL-D2)", () => {
  let engine: ProgramMemoryEngine;
  beforeEach(() => {
    engine = new ProgramMemoryEngine();
  });

  describe("save() with linkInfo", () => {
    it("attaches an explicit link on first save", () => {
      const link: BlueprintLinkInfo = {
        path: "H:/PRISM/JM DIE/PRINTS/ITW/T8047D3.pdf",
        confidence: "exact",
        page: 1,
      };
      const rec = engine.save("ITW", "T8047D3", "T8047D3.MIN", "okuma_osp", SAMPLE_ASSIGNMENTS, link);
      expect(rec.linked_blueprint_path).toBe(link.path);
      expect(rec.linked_blueprint_confidence).toBe("exact");
      expect(rec.linked_blueprint_page).toBe(1);
    });

    it("omits the page field when caller did not supply one", () => {
      const link: BlueprintLinkInfo = {
        path: "H:/PRISM/JM DIE/PRINTS/AGRATI/9082526.pdf",
        confidence: "loose",
      };
      const rec = engine.save("AGRATI", "9082526", "9082526.MIN", "fanuc_31i", SAMPLE_ASSIGNMENTS, link);
      expect(rec.linked_blueprint_path).toBe(link.path);
      expect(rec.linked_blueprint_confidence).toBe("loose");
      expect("linked_blueprint_page" in rec).toBe(false);
    });

    it("preserves a prior link on re-save without new linkInfo (must not silently strip)", () => {
      const link: BlueprintLinkInfo = {
        path: "H:/PRISM/JM DIE/PRINTS/SCREWS/C2500-2497.pdf",
        confidence: "filename_exact",
        page: 2,
      };
      engine.save("SCREWS", "C2500-2497", "C2500-2497.MIN", "fanuc_18i", SAMPLE_ASSIGNMENTS, link);
      const second = engine.save("SCREWS", "C2500-2497", "C2500-2497-rev2.MIN", "fanuc_18i", SAMPLE_ASSIGNMENTS);
      expect(second.linked_blueprint_path).toBe(link.path);
      expect(second.linked_blueprint_confidence).toBe("filename_exact");
      expect(second.linked_blueprint_page).toBe(2);
      expect(second.use_count).toBe(2);
    });

    it("OVERWRITES a prior link when a new linkInfo is supplied", () => {
      engine.save("TFI", "BU-1365-0000-002", "f1.MIN", "okuma_osp", SAMPLE_ASSIGNMENTS, {
        path: "/old.pdf",
        confidence: "loose",
      });
      const newer: BlueprintLinkInfo = {
        path: "/new.pdf",
        confidence: "exact",
        page: 3,
      };
      const rec = engine.save("TFI", "BU-1365-0000-002", "f2.MIN", "okuma_osp", SAMPLE_ASSIGNMENTS, newer);
      expect(rec.linked_blueprint_path).toBe("/new.pdf");
      expect(rec.linked_blueprint_confidence).toBe("exact");
      expect(rec.linked_blueprint_page).toBe(3);
    });

    it("does NOT attach the link when path or confidence is empty (silent skip on save)", () => {
      const rec1 = engine.save("ITW", "P1", "p1.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "",
        confidence: "exact",
      });
      expect("linked_blueprint_path" in rec1).toBe(false);

      const rec2 = engine.save("ITW", "P2", "p2.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/foo.pdf",
        confidence: "",
      });
      expect("linked_blueprint_path" in rec2).toBe(false);
    });

    it("trims whitespace on path and confidence", () => {
      const rec = engine.save("ITW", "P3", "p3.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "   /trimmed.pdf   ",
        confidence: "  exact  ",
      });
      expect(rec.linked_blueprint_path).toBe("/trimmed.pdf");
      expect(rec.linked_blueprint_confidence).toBe("exact");
    });

    it("silently drops a malformed page on save() but keeps path+confidence", () => {
      const rec = engine.save("ITW", "P4", "p4.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/ok.pdf",
        confidence: "exact",
        page: -3,
      });
      expect(rec.linked_blueprint_path).toBe("/ok.pdf");
      expect("linked_blueprint_page" in rec).toBe(false);
    });

    it("save with null linkInfo behaves identically to undefined (preserve prior)", () => {
      engine.save("ITW", "P5", "p5.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/keep.pdf",
        confidence: "exact",
      });
      const rec = engine.save("ITW", "P5", "p5b.MIN", "fanuc", SAMPLE_ASSIGNMENTS, null);
      expect(rec.linked_blueprint_path).toBe("/keep.pdf");
    });
  });

  describe("linkPrint() — post-hoc operator path", () => {
    it("returns null when no record exists for the customer/part", () => {
      const result = engine.linkPrint("UNKNOWN", "X999", {
        path: "/foo.pdf",
        confidence: "exact",
      });
      expect(result).toBeNull();
    });

    it("attaches a link to an existing record (returns updated record)", () => {
      engine.save("ITW", "P10", "p10.MIN", "fanuc", SAMPLE_ASSIGNMENTS);
      const updated = engine.linkPrint("ITW", "P10", {
        path: "/p10.pdf",
        confidence: "filename_loose",
        page: 5,
      });
      expect(updated).not.toBeNull();
      expect(updated!.linked_blueprint_path).toBe("/p10.pdf");
      expect(updated!.linked_blueprint_confidence).toBe("filename_loose");
      expect(updated!.linked_blueprint_page).toBe(5);
    });

    it("CLEARS the link when called with linkInfo=null", () => {
      engine.save("ITW", "P11", "p11.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/p11.pdf",
        confidence: "exact",
        page: 2,
      });
      const cleared = engine.linkPrint("ITW", "P11", null);
      expect(cleared).not.toBeNull();
      expect("linked_blueprint_path" in cleared!).toBe(false);
      expect("linked_blueprint_confidence" in cleared!).toBe(false);
      expect("linked_blueprint_page" in cleared!).toBe(false);
    });

    it("THROWS on malformed payload (FAIL-LOUD) — not the same as save's silent skip", () => {
      engine.save("ITW", "P12", "p12.MIN", "fanuc", SAMPLE_ASSIGNMENTS);
      expect(() =>
        engine.linkPrint("ITW", "P12", { path: "", confidence: "exact" }),
      ).toThrow(/invalid linkInfo/);
      expect(() =>
        engine.linkPrint("ITW", "P12", { path: "/x", confidence: "" }),
      ).toThrow(/invalid linkInfo/);
    });

    it("strips an existing page when the new linkInfo omits page", () => {
      engine.save("ITW", "P13", "p13.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/p13.pdf",
        confidence: "exact",
        page: 4,
      });
      const updated = engine.linkPrint("ITW", "P13", {
        path: "/p13b.pdf",
        confidence: "loose",
      });
      expect(updated!.linked_blueprint_path).toBe("/p13b.pdf");
      expect("linked_blueprint_page" in updated!).toBe(false);
    });
  });

  describe("Adversarial inputs", () => {
    it.each([
      ["NaN", Number.NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["zero", 0],
      ["negative", -5],
      ["float (non-integer)", 2.5],
    ])("silently drops malformed page on save (%s)", (_label, badPage) => {
      const rec = engine.save("ADV", "PG", "pg.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/pg.pdf",
        confidence: "exact",
        page: badPage as number,
      });
      expect(rec.linked_blueprint_path).toBe("/pg.pdf");
      expect("linked_blueprint_page" in rec).toBe(false);
    });

    it("accepts an absurdly large but finite integer page", () => {
      const rec = engine.save("ADV", "PG2", "pg2.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/pg2.pdf",
        confidence: "exact",
        page: 999_999,
      });
      expect(rec.linked_blueprint_page).toBe(999_999);
    });

    it("accepts an oversized path string (no upstream limit imposed)", () => {
      const longPath = "H:/PRISM/" + "x".repeat(2000) + ".pdf";
      const rec = engine.save("ADV", "PG3", "pg3.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: longPath,
        confidence: "exact",
      });
      expect(rec.linked_blueprint_path).toBe(longPath);
      expect(rec.linked_blueprint_path!.length).toBeGreaterThan(2000);
    });
  });

  describe("Variability — three spanning JM-Die customer configurations", () => {
    it("ITW with leading customer-prefix + Okuma OSP dialect + page-1 print", () => {
      const rec = engine.save("ITW", "T8047D3", "T8047D3.MIN", "okuma_osp", SAMPLE_ASSIGNMENTS, {
        path: "H:/PRISM/JM DIE/PRINTS/ITW/T8047D3.pdf",
        confidence: "exact",
        page: 1,
      });
      expect(rec.dialect).toBe("okuma_osp");
      expect(rec.linked_blueprint_path).toMatch(/ITW/);
    });

    it("AGRATI with bare numeric PN + Fanuc 31i + multi-page Docustrata container", () => {
      const rec = engine.save("AGRATI", "9082526", "9082526.MIN", "fanuc_31i", SAMPLE_ASSIGNMENTS, {
        path: "H:/PRISM/JM DIE/PRINTS/AGRATI/CONTAINER_2026_Q1.pdf",
        confidence: "filename_exact",
        page: 7,
      });
      expect(rec.dialect).toBe("fanuc_31i");
      expect(rec.linked_blueprint_page).toBe(7);
    });

    it("TFI with multi-letter prefix BU-… + Mazatrol + filename_loose match", () => {
      const rec = engine.save("TFI", "BU-1365-0000-002", "BU-1365-0000-002.PGM", "mazatrol", SAMPLE_ASSIGNMENTS, {
        path: "H:/PRISM/JM DIE/PRINTS/TFI/BU-1365.pdf",
        confidence: "filename_loose",
      });
      expect(rec.dialect).toBe("mazatrol");
      expect(rec.linked_blueprint_confidence).toBe("filename_loose");
      expect("linked_blueprint_page" in rec).toBe(false);
    });
  });

  describe("Persistence round-trip — exportJSON / importJSON preserve link fields", () => {
    it("exports + re-imports the link payload byte-equal", () => {
      engine.save("ITW", "RT1", "rt1.MIN", "okuma_osp", SAMPLE_ASSIGNMENTS, {
        path: "/rt1.pdf",
        confidence: "exact",
        page: 3,
      });
      const json = engine.exportJSON();
      const fresh = new ProgramMemoryEngine();
      fresh.importJSON(json);
      const rec = fresh.recall("ITW", "RT1");
      expect(rec).not.toBeNull();
      expect(rec!.linked_blueprint_path).toBe("/rt1.pdf");
      expect(rec!.linked_blueprint_confidence).toBe("exact");
      expect(rec!.linked_blueprint_page).toBe(3);
    });

    it("an exported record WITHOUT a link survives the round-trip cleanly", () => {
      engine.save("ITW", "RT2", "rt2.MIN", "fanuc", SAMPLE_ASSIGNMENTS);
      const json = engine.exportJSON();
      const fresh = new ProgramMemoryEngine();
      fresh.importJSON(json);
      const rec = fresh.recall("ITW", "RT2");
      expect(rec).not.toBeNull();
      expect("linked_blueprint_path" in rec!).toBe(false);
    });
  });

  describe("Stats are unaffected by the new fields", () => {
    it("getStats() returns canonical counts regardless of link presence", () => {
      engine.save("ITW", "S1", "s1.MIN", "fanuc", SAMPLE_ASSIGNMENTS, {
        path: "/s1.pdf",
        confidence: "exact",
      });
      engine.save("ITW", "S2", "s2.MIN", "fanuc", SAMPLE_ASSIGNMENTS);
      const stats = engine.getStats();
      expect(stats.total_records).toBe(2);
      expect(stats.total_assignments).toBe(2);
      expect(stats.unique_customers).toBe(1);
      expect(stats.unique_parts).toBe(2);
    });
  });
});
