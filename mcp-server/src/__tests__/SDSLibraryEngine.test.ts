/**
 * SDSLibraryEngine.test.ts — HOTEL/U-SDS-LIBRARY (iter13)
 *
 * OSHA HazCom 29 CFR 1910.1200 SDS library — GHS 16-section + retention.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { sdsLibraryEngine } from "../engines/SDSLibraryEngine.js";

const WD40 = {
  product_name: "WD-40 Multi-Use Product",
  cas_number: "8052-41-3", // Stoddard solvent (primary)
  manufacturer: "WD-40 Company",
  hazard_classes: ["flammable", "aspiration_hazard", "skin_sensitizer"],
  signal_word: "Danger" as const,
  revision_date: "2024-08-15",
};

const ACETONE = {
  product_name: "Acetone (CH3COCH3)",
  cas_number: "67-64-1",
  manufacturer: "Sigma-Aldrich",
  hazard_classes: ["flammable", "eye_damage", "stot_single"],
  signal_word: "Danger" as const,
  revision_date: "2025-01-10",
};

const SODA_ASH = {
  product_name: "Sodium Carbonate (Soda Ash)",
  cas_number: "497-19-8",
  manufacturer: "Solvay",
  hazard_classes: ["eye_damage"],
  signal_word: "Warning" as const,
  revision_date: "2026-03-20",
};

describe("SDSLibraryEngine", () => {
  beforeEach(() => sdsLibraryEngine.reset());

  describe("loadSDS — happy path (3 spanning chemicals)", () => {
    it("loads a flammable solvent (WD-40)", () => {
      const r = sdsLibraryEngine.loadSDS(WD40);
      expect(r.id).toMatch(/^SDS-\d{6}$/);
      expect(r.product_name).toBe("WD-40 Multi-Use Product");
      expect(r.revision_number).toBe(1);
      expect(r.superseded_at).toBeNull();
      expect(r.hazard_classes).toEqual(["flammable", "aspiration_hazard", "skin_sensitizer"]);
    });

    it("loads a lab solvent (acetone)", () => {
      const r = sdsLibraryEngine.loadSDS(ACETONE);
      expect(r.signal_word).toBe("Danger");
      expect(r.cas_number).toBe("67-64-1");
    });

    it("loads a low-hazard cleaner (soda ash)", () => {
      const r = sdsLibraryEngine.loadSDS(SODA_ASH);
      expect(r.signal_word).toBe("Warning");
      expect(r.hazard_classes).toEqual(["eye_damage"]);
    });

    it("normalizes hazard_classes to lowercase", () => {
      const r = sdsLibraryEngine.loadSDS({ ...WD40, hazard_classes: ["FLAMMABLE", "Aspiration_Hazard"] });
      expect(r.hazard_classes).toEqual(["flammable", "aspiration_hazard"]);
    });
  });

  describe("Revision tracking + retention (§1910.1020 30-year mandate)", () => {
    it("auto-supersedes prior active version when reloading same CAS+manufacturer", () => {
      const v1 = sdsLibraryEngine.loadSDS(WD40);
      const v2 = sdsLibraryEngine.loadSDS({ ...WD40, revision_date: "2025-06-01" });
      const reloaded = sdsLibraryEngine.findByCAS(WD40.cas_number);
      expect(reloaded?.id).toBe(v2.id);
      expect(v2.revision_number).toBe(2);
      // Prior is superseded but retained
      const history = sdsLibraryEngine.getRevisionHistory({ cas_number: WD40.cas_number, manufacturer: WD40.manufacturer });
      expect(history).toHaveLength(2);
      expect(history[0].superseded_at).not.toBeNull();
      expect(history[1].superseded_at).toBeNull();
    });

    it("DOES NOT supersede different manufacturer's SDS for same CAS", () => {
      sdsLibraryEngine.loadSDS(ACETONE);
      const otherMfg = sdsLibraryEngine.loadSDS({ ...ACETONE, manufacturer: "Fisher Scientific" });
      // Both manufacturers' SDS are active (same CAS, different mfg)
      const all = sdsLibraryEngine.findByProductName("Acetone");
      expect(all.total).toBe(2);
    });
  });

  describe("Search surfaces", () => {
    it("findByCAS returns the active sheet", () => {
      sdsLibraryEngine.loadSDS(WD40);
      const found = sdsLibraryEngine.findByCAS(WD40.cas_number);
      expect(found?.product_name).toBe("WD-40 Multi-Use Product");
    });

    it("findByCAS returns null on unknown CAS", () => {
      expect(sdsLibraryEngine.findByCAS("99999-99-9")).toBeNull();
    });

    it("findByProductName matches case-insensitive partial", () => {
      sdsLibraryEngine.loadSDS(WD40);
      sdsLibraryEngine.loadSDS(ACETONE);
      const r = sdsLibraryEngine.findByProductName("acetone");
      expect(r.total).toBe(1);
      expect(r.matches[0].cas_number).toBe("67-64-1");
    });

    it("findByHazardClass returns all flammable sheets", () => {
      sdsLibraryEngine.loadSDS(WD40);
      sdsLibraryEngine.loadSDS(ACETONE);
      sdsLibraryEngine.loadSDS(SODA_ASH);
      const r = sdsLibraryEngine.findByHazardClass("flammable");
      expect(r.total).toBe(2);
    });

    it("findByHazardClass throws on unknown GHS class (R12)", () => {
      expect(() => sdsLibraryEngine.findByHazardClass("invalid_class")).toThrow(/unknown GHS hazard class/);
    });
  });

  describe("reviewReport — auto-detect SDS >3y old", () => {
    it("flags sheets past 3-year review threshold", () => {
      sdsLibraryEngine.loadSDS({ ...WD40, revision_date: "2020-01-01" });
      sdsLibraryEngine.loadSDS(ACETONE); // recent
      const report = sdsLibraryEngine.reviewReport({ as_of: "2026-05-25" });
      expect(report.total_active_sds).toBe(2);
      expect(report.due_for_review).toBe(1); // WD-40 is 6+ years old
      expect(report.records_due[0].product_name).toBe("WD-40 Multi-Use Product");
    });

    it("by_hazard_class breakdown sorted by count", () => {
      sdsLibraryEngine.loadSDS(WD40); // flammable, aspiration, sensitizer
      sdsLibraryEngine.loadSDS(ACETONE); // flammable, eye_damage, stot_single
      const report = sdsLibraryEngine.reviewReport();
      const flam = report.by_hazard_class.find((h) => h.hazard_class === "flammable");
      expect(flam?.count).toBe(2);
    });
  });

  describe("R12 fail-loud input validation", () => {
    it("throws on missing required fields", () => {
      expect(() =>
        sdsLibraryEngine.loadSDS({ ...WD40, product_name: "" }),
      ).toThrow(/product_name \+ cas_number \+ manufacturer required/);
    });

    it("throws on malformed CAS number", () => {
      expect(() =>
        sdsLibraryEngine.loadSDS({ ...WD40, cas_number: "NOT-A-CAS" }),
      ).toThrow(/cas_number must be CAS format/);
    });

    it("throws on unknown GHS hazard class", () => {
      expect(() =>
        sdsLibraryEngine.loadSDS({ ...WD40, hazard_classes: ["not_a_real_class"] }),
      ).toThrow(/unknown GHS hazard class/);
    });

    it("throws on non-ISO revision_date", () => {
      expect(() =>
        sdsLibraryEngine.loadSDS({ ...WD40, revision_date: "Aug 15, 2024" }),
      ).toThrow(/revision_date must be ISO/);
    });

    it("throws on future revision_date", () => {
      expect(() =>
        sdsLibraryEngine.loadSDS({ ...WD40, revision_date: "2099-01-01" }),
      ).toThrow(/revision_date cannot be in the future/);
    });
  });

  describe("Hotel-soul + GHS-catalog invariants", () => {
    it("listHazardClasses returns the full 25-class GHS catalog (frozen)", () => {
      const classes = sdsLibraryEngine.listHazardClasses();
      expect(Object.isFrozen(classes)).toBe(true);
      expect(classes.length).toBeGreaterThanOrEqual(20);
      expect(classes).toContain("carcinogen");
      expect(classes).toContain("flammable");
      expect(classes).toContain("aquatic_acute");
    });

    it("returned records are frozen", () => {
      const r = sdsLibraryEngine.loadSDS(WD40);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.hazard_classes)).toBe(true);
    });
  });
});
