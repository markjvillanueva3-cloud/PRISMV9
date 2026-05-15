/**
 * U-PPL-D2 — LatheProgramCatalogEngine print-pointer fields + linkPrint / linkPrintBatch
 *
 * Coverage floor:
 *   - Happy path: register with link + linkPrint attach + linkPrintBatch.
 *   - Failure modes (≥3): missing entry, malformed payload (throws), batch
 *     bad-row counted but does NOT abort.
 *   - Adversarial inputs (≥2): NaN/Infinity/negative page, empty path/conf.
 *   - Variability (≥3): three controller × programming-style configs.
 *
 * Real-value assertions; no toBeDefined() stubs.
 *
 * @module __tests__/LatheProgramCatalogEngine.linkPrint
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheProgramCatalogEngine,
  validateLinkInfo,
  type ProgramCatalogEntry,
} from "../engines/LatheProgramCatalogEngine.js";

function mkEntry(over: Partial<ProgramCatalogEntry> = {}): ProgramCatalogEntry {
  return {
    program_id: "JM__test.min",
    path: "H:/PRISM/JM DIE/CNC LATHE/ITW/test.min",
    programming_style: "hardcode",
    controller: "okuma_osp",
    customer: "ITW",
    features: ["threading"],
    file_ext: ".min",
    ...over,
  };
}

describe("LatheProgramCatalogEngine — print-pointer fields (U-PPL-D2)", () => {
  beforeEach(() => {
    latheProgramCatalogEngine.clear();
  });

  describe("register() with link payload", () => {
    it("accepts an entry that carries the link payload directly", () => {
      const e = mkEntry({
        linked_blueprint_path: "/x.pdf",
        linked_blueprint_confidence: "exact",
        linked_blueprint_page: 1,
      });
      latheProgramCatalogEngine.register(e);
      const got = latheProgramCatalogEngine.getEntry(e.path);
      expect(got?.path).toBe(e.path);
      expect(got!.linked_blueprint_path).toBe("/x.pdf");
      expect(got!.linked_blueprint_confidence).toBe("exact");
      expect(got!.linked_blueprint_page).toBe(1);
    });

    it("PRESERVES a prior link when re-registered without one (auto-rescan safety)", () => {
      latheProgramCatalogEngine.register(mkEntry({
        linked_blueprint_path: "/preserve.pdf",
        linked_blueprint_confidence: "filename_exact",
        linked_blueprint_page: 2,
      }));
      latheProgramCatalogEngine.register(mkEntry({ features: ["threading", "grooving"] }));
      const got = latheProgramCatalogEngine.getEntry(mkEntry().path);
      expect(got!.linked_blueprint_path).toBe("/preserve.pdf");
      expect(got!.linked_blueprint_confidence).toBe("filename_exact");
      expect(got!.linked_blueprint_page).toBe(2);
      expect(got!.features).toEqual(["threading", "grooving"]);
    });

    it("OVERWRITES a prior link when the new entry supplies a new one", () => {
      latheProgramCatalogEngine.register(mkEntry({
        linked_blueprint_path: "/old.pdf",
        linked_blueprint_confidence: "loose",
      }));
      latheProgramCatalogEngine.register(mkEntry({
        linked_blueprint_path: "/new.pdf",
        linked_blueprint_confidence: "exact",
      }));
      const got = latheProgramCatalogEngine.getEntry(mkEntry().path);
      expect(got!.linked_blueprint_path).toBe("/new.pdf");
      expect(got!.linked_blueprint_confidence).toBe("exact");
    });
  });

  describe("linkPrint() — post-hoc operator path", () => {
    it("returns null when no entry exists for the path", () => {
      const r = latheProgramCatalogEngine.linkPrint("/missing.min", {
        path: "/p.pdf",
        confidence: "exact",
      });
      expect(r).toBeNull();
    });

    it("attaches a link to an existing entry", () => {
      latheProgramCatalogEngine.register(mkEntry());
      const r = latheProgramCatalogEngine.linkPrint(mkEntry().path, {
        path: "/p.pdf",
        confidence: "exact",
        page: 7,
      });
      expect(r).not.toBeNull();
      expect(r!.linked_blueprint_path).toBe("/p.pdf");
      expect(r!.linked_blueprint_page).toBe(7);
    });

    it("CLEARS a link when called with linkInfo=null", () => {
      latheProgramCatalogEngine.register(mkEntry({
        linked_blueprint_path: "/clear-me.pdf",
        linked_blueprint_confidence: "exact",
        linked_blueprint_page: 3,
      }));
      const r = latheProgramCatalogEngine.linkPrint(mkEntry().path, null);
      expect(r).not.toBeNull();
      expect("linked_blueprint_path" in r!).toBe(false);
      expect("linked_blueprint_confidence" in r!).toBe(false);
      expect("linked_blueprint_page" in r!).toBe(false);
    });

    it("THROWS on malformed payload (FAIL-LOUD per CLAUDE.md R12)", () => {
      latheProgramCatalogEngine.register(mkEntry());
      expect(() =>
        latheProgramCatalogEngine.linkPrint(mkEntry().path, {
          path: "",
          confidence: "exact",
        }),
      ).toThrow(/invalid linkInfo/);
      expect(() =>
        latheProgramCatalogEngine.linkPrint(mkEntry().path, {
          path: "/x",
          confidence: "",
        }),
      ).toThrow(/invalid linkInfo/);
    });

    it("strips a prior page when the new linkInfo omits page", () => {
      latheProgramCatalogEngine.register(mkEntry({
        linked_blueprint_path: "/old.pdf",
        linked_blueprint_confidence: "exact",
        linked_blueprint_page: 4,
      }));
      const r = latheProgramCatalogEngine.linkPrint(mkEntry().path, {
        path: "/new.pdf",
        confidence: "loose",
      });
      expect(r!.linked_blueprint_path).toBe("/new.pdf");
      expect("linked_blueprint_page" in r!).toBe(false);
    });
  });

  describe("linkPrintBatch() — bulk back-annotation", () => {
    it("classifies attached/missing/invalid/cleared correctly across a mixed batch", () => {
      latheProgramCatalogEngine.register(mkEntry({ path: "/a.min" }));
      latheProgramCatalogEngine.register(mkEntry({ path: "/b.min" }));
      latheProgramCatalogEngine.register(mkEntry({
        path: "/c.min",
        linked_blueprint_path: "/c.pdf",
        linked_blueprint_confidence: "exact",
      }));

      const result = latheProgramCatalogEngine.linkPrintBatch([
        { programPath: "/a.min", linkInfo: { path: "/a.pdf", confidence: "exact" } },
        { programPath: "/b.min", linkInfo: { path: "", confidence: "exact" } }, // invalid
        { programPath: "/c.min", linkInfo: null }, // cleared
        { programPath: "/missing.min", linkInfo: { path: "/q.pdf", confidence: "exact" } },
      ]);

      expect(result).toEqual({ attached: 1, missing: 1, invalid: 1, cleared: 1 });

      expect(latheProgramCatalogEngine.getEntry("/a.min")!.linked_blueprint_path).toBe("/a.pdf");
      expect("linked_blueprint_path" in latheProgramCatalogEngine.getEntry("/b.min")!).toBe(false);
      expect("linked_blueprint_path" in latheProgramCatalogEngine.getEntry("/c.min")!).toBe(false);
    });

    it("does NOT abort the batch on a single bad row", () => {
      latheProgramCatalogEngine.register(mkEntry({ path: "/1.min" }));
      latheProgramCatalogEngine.register(mkEntry({ path: "/2.min" }));
      const result = latheProgramCatalogEngine.linkPrintBatch([
        { programPath: "/1.min", linkInfo: { path: "", confidence: "exact" } },
        { programPath: "/2.min", linkInfo: { path: "/2.pdf", confidence: "loose" } },
      ]);
      expect(result.attached).toBe(1);
      expect(result.invalid).toBe(1);
      expect(latheProgramCatalogEngine.getEntry("/2.min")!.linked_blueprint_path).toBe("/2.pdf");
    });
  });

  describe("validateLinkInfo() — exported helper for dispatcher pre-validation", () => {
    it("returns null on empty path", () => {
      expect(validateLinkInfo({ path: "", confidence: "exact" })).toBeNull();
    });
    it("returns null on whitespace-only confidence", () => {
      expect(validateLinkInfo({ path: "/x", confidence: "   " })).toBeNull();
    });
    it("canonicalizes a valid payload (trim path + conf)", () => {
      const r = validateLinkInfo({ path: " /trim.pdf ", confidence: " exact " });
      expect(r).toEqual({ path: "/trim.pdf", confidence: "exact" });
    });
    it("drops a malformed page from a valid payload", () => {
      const r = validateLinkInfo({ path: "/x", confidence: "exact", page: 0 });
      expect(r).toEqual({ path: "/x", confidence: "exact" });
    });
    it("preserves a valid finite-integer page", () => {
      const r = validateLinkInfo({ path: "/x", confidence: "exact", page: 42 });
      expect(r).toEqual({ path: "/x", confidence: "exact", page: 42 });
    });
  });

  describe("Adversarial inputs", () => {
    beforeEach(() => latheProgramCatalogEngine.register(mkEntry()));

    it.each([
      ["NaN", Number.NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["zero", 0],
      ["negative", -1],
      ["float 1.5", 1.5],
    ])("attaches with page silently dropped — %s", (_label, badPage) => {
      const r = latheProgramCatalogEngine.linkPrint(mkEntry().path, {
        path: "/p.pdf",
        confidence: "exact",
        page: badPage as number,
      });
      expect(r!.linked_blueprint_path).toBe("/p.pdf");
      expect("linked_blueprint_page" in r!).toBe(false);
    });

    it("accepts a 10000-char path", () => {
      const longPath = "/" + "x".repeat(10_000) + ".pdf";
      const r = latheProgramCatalogEngine.linkPrint(mkEntry().path, {
        path: longPath,
        confidence: "exact",
      });
      expect(r!.linked_blueprint_path!.length).toBe(longPath.length);
    });
  });

  describe("Variability — three spanning controller × style configurations", () => {
    it("Okuma OSP / hardcode / .min programs", () => {
      latheProgramCatalogEngine.register(mkEntry({
        path: "/okuma.min",
        controller: "okuma_osp",
        programming_style: "hardcode",
        file_ext: ".min",
      }));
      const r = latheProgramCatalogEngine.linkPrint("/okuma.min", {
        path: "/okuma.pdf",
        confidence: "exact",
      });
      expect(r!.controller).toBe("okuma_osp");
      expect(r!.programming_style).toBe("hardcode");
    });

    it("Mastercam / cam / .mcam programs", () => {
      latheProgramCatalogEngine.register(mkEntry({
        path: "/mastercam.mcam",
        controller: "haas_ngc",
        programming_style: "cam",
        cam_system: "mastercam",
        file_ext: ".mcam",
      }));
      const r = latheProgramCatalogEngine.linkPrint("/mastercam.mcam", {
        path: "/mastercam.pdf",
        confidence: "filename_loose",
        page: 12,
      });
      expect(r!.cam_system).toBe("mastercam");
      expect(r!.linked_blueprint_page).toBe(12);
    });

    it("Mazatrol / conversational / .pgm programs", () => {
      latheProgramCatalogEngine.register(mkEntry({
        path: "/maza.pgm",
        controller: "mazatrol",
        programming_style: "conversational",
        conversational_type: "mazatrol",
        file_ext: ".pgm",
      }));
      const r = latheProgramCatalogEngine.linkPrint("/maza.pgm", {
        path: "/maza.pdf",
        confidence: "loose",
      });
      expect(r!.conversational_type).toBe("mazatrol");
      expect(r!.linked_blueprint_confidence).toBe("loose");
    });
  });
});
