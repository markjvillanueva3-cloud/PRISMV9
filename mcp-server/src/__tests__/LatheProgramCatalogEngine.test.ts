/**
 * LatheProgramCatalogEngine Test Suite (T053)
 * ============================================
 *
 * MS10 (U-LAT76) — Tests for the lathe program catalog, classification,
 * similarity search, history aggregation, and style distribution.
 *
 * @milestone LATHE-AWARE-HARDEN MS10
 * @unit U-LAT76
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheProgramCatalogEngine,
  type ProgramCatalogEntry,
} from "../engines/LatheProgramCatalogEngine.js";

function makeEntry(overrides: Partial<ProgramCatalogEntry> = {}): ProgramCatalogEntry {
  return {
    program_id: overrides.program_id ?? `ALCOA__${Math.random().toString(36).slice(2, 8)}.min`,
    path: overrides.path ?? `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${Math.random().toString(36).slice(2, 8)}.min`,
    programming_style: overrides.programming_style ?? "hardcode",
    controller: overrides.controller ?? "okuma_osp",
    customer: overrides.customer ?? "ALCOA",
    features: overrides.features ?? [],
    file_ext: overrides.file_ext ?? ".min",
    ...overrides,
  };
}

// Clean catalog before every test so suites don't leak
beforeEach(() => {
  latheProgramCatalogEngine.clear();
});

describe("LatheProgramCatalogEngine", () => {
  // ── register() + size() ────────────────────────────────────────────────

  describe("register/registerMany", () => {
    it("should register a single entry", () => {
      latheProgramCatalogEngine.register(makeEntry());
      expect(latheProgramCatalogEngine.size()).toBe(1);
    });

    it("should bulk register entries", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ path: "/p1.min" }),
        makeEntry({ path: "/p2.min" }),
        makeEntry({ path: "/p3.min" }),
      ]);
      expect(latheProgramCatalogEngine.size()).toBe(3);
    });

    it("should deduplicate by path (last write wins)", () => {
      latheProgramCatalogEngine.register(
        makeEntry({ path: "/dup.min", customer: "A" })
      );
      latheProgramCatalogEngine.register(
        makeEntry({ path: "/dup.min", customer: "B" })
      );
      expect(latheProgramCatalogEngine.size()).toBe(1);
      expect(latheProgramCatalogEngine.getEntry("/dup.min")?.customer).toBe("B");
    });

    it("clear() should empty the catalog", () => {
      latheProgramCatalogEngine.register(makeEntry());
      latheProgramCatalogEngine.clear();
      expect(latheProgramCatalogEngine.size()).toBe(0);
    });
  });

  // ── classifyFile by extension ──────────────────────────────────────────

  describe("classifyFile() extension classification", () => {
    it("classifies .min as hardcode by default", () => {
      const e = latheProgramCatalogEngine.classifyFile("/does/not/exist.min", "ALCOA");
      expect(e.programming_style).toBe("hardcode");
      expect(e.file_ext).toBe(".min");
    });

    it("classifies .mcx-8 as cam", () => {
      const e = latheProgramCatalogEngine.classifyFile("/does/not/exist.mcx-8", "ALCOA");
      expect(e.programming_style).toBe("cam");
    });

    it("classifies .pgm as conversational mazatrol", () => {
      const e = latheProgramCatalogEngine.classifyFile("/does/not/exist.pgm", "ALCOA");
      expect(e.programming_style).toBe("conversational");
      expect(e.conversational_type).toBe("mazatrol");
    });

    it("classifies .mpf as hardcode (Siemens)", () => {
      const e = latheProgramCatalogEngine.classifyFile("/does/not/exist.mpf", "ALCOA");
      expect(e.programming_style).toBe("hardcode");
    });

    it("classifies .eia as hardcode (Heidenhain)", () => {
      const e = latheProgramCatalogEngine.classifyFile("/does/not/exist.eia", "ALCOA");
      expect(e.programming_style).toBe("hardcode");
    });

    it("guesses okuma_osp controller from .min extension", () => {
      const e = latheProgramCatalogEngine.classifyFile("/test.min", "ITW");
      expect(e.controller).toBe("okuma_osp");
    });

    it("guesses mazatrol controller from .pgm extension", () => {
      const e = latheProgramCatalogEngine.classifyFile("/test.pgm", "ITW");
      expect(e.controller).toBe("mazatrol");
    });

    it("falls back to 'unknown' controller for unrecognized extension", () => {
      const e = latheProgramCatalogEngine.classifyFile("/test.xyz", "ITW");
      expect(e.controller).toBe("unknown");
    });

    it("respects explicit controller override", () => {
      const e = latheProgramCatalogEngine.classifyFile("/test.min", "ITW", "custom_ctrl");
      expect(e.controller).toBe("custom_ctrl");
    });

    it("assigns customer from parameter", () => {
      const e = latheProgramCatalogEngine.classifyFile("/test.min", "FASTENAL");
      expect(e.customer).toBe("FASTENAL");
    });
  });

  // ── findSimilarPrograms() ──────────────────────────────────────────────

  describe("findSimilarPrograms()", () => {
    it("returns empty array when catalog is empty", () => {
      const matches = latheProgramCatalogEngine.findSimilarPrograms({ features: ["threading"] });
      expect(matches).toEqual([]);
    });

    it("ranks programs with more matched features higher", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ path: "/all.min", features: ["threading", "grooving", "live_tooling"] }),
        makeEntry({ path: "/one.min", features: ["threading"] }),
        makeEntry({ path: "/none.min", features: [] }),
      ]);
      const matches = latheProgramCatalogEngine.findSimilarPrograms({
        features: ["threading", "grooving", "live_tooling"],
      });
      // /all.min should be first
      expect(matches[0]?.entry.path).toBe("/all.min");
      expect(matches[0]!.similarity_score).toBeGreaterThan(matches[1]!.similarity_score);
    });

    it("boosts controller match", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ path: "/a.min", controller: "fanuc", features: ["threading"] }),
        makeEntry({ path: "/b.min", controller: "okuma_osp", features: ["threading"] }),
      ]);
      const matches = latheProgramCatalogEngine.findSimilarPrograms({
        features: ["threading"],
        controller: "okuma",
      });
      // Okuma entry should rank higher due to controller bonus
      expect(matches[0]?.entry.controller).toBe("okuma_osp");
    });

    it("boosts same-customer match", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ path: "/other.min", customer: "OTHER", features: ["threading"] }),
        makeEntry({ path: "/alcoa.min", customer: "ALCOA", features: ["threading"] }),
      ]);
      const matches = latheProgramCatalogEngine.findSimilarPrograms({
        features: ["threading"],
        customer: "ALCOA",
      });
      expect(matches[0]?.entry.customer).toBe("ALCOA");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 20; i++) {
        latheProgramCatalogEngine.register(
          makeEntry({ path: `/p${i}.min`, features: ["threading"] })
        );
      }
      const matches = latheProgramCatalogEngine.findSimilarPrograms(
        { features: ["threading"] },
        5
      );
      expect(matches.length).toBe(5);
    });

    it("includes match_reasoning for every match", () => {
      latheProgramCatalogEngine.register(makeEntry({ features: ["threading"] }));
      const matches = latheProgramCatalogEngine.findSimilarPrograms({
        features: ["threading"],
      });
      expect(matches[0]!.match_reasoning.length).toBeGreaterThan(0);
    });

    it("completes under 500ms for 1000 catalog entries", () => {
      for (let i = 0; i < 1000; i++) {
        latheProgramCatalogEngine.register(
          makeEntry({
            path: `/p${i}.min`,
            customer: i % 2 === 0 ? "ALCOA" : "ITW",
            controller: i % 3 === 0 ? "okuma_osp" : "fanuc",
            features: i % 4 === 0 ? ["threading", "grooving"] : ["boring"],
          })
        );
      }
      const start = Date.now();
      latheProgramCatalogEngine.findSimilarPrograms(
        { features: ["threading"], controller: "okuma", customer: "ALCOA" },
        10
      );
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });

  // ── getProgrammingHistory() ────────────────────────────────────────────

  describe("getProgrammingHistory()", () => {
    it("returns empty history for unknown customer", () => {
      const h = latheProgramCatalogEngine.getProgrammingHistory("UNKNOWN");
      expect(h.program_count).toBe(0);
      expect(h.most_common_style).toBeNull();
    });

    it("counts entries per style for a customer", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ customer: "ALCOA", programming_style: "macro", path: "/1.min" }),
        makeEntry({ customer: "ALCOA", programming_style: "macro", path: "/2.min" }),
        makeEntry({ customer: "ALCOA", programming_style: "hardcode", path: "/3.min" }),
      ]);
      const h = latheProgramCatalogEngine.getProgrammingHistory("ALCOA");
      expect(h.program_count).toBe(3);
      expect(h.style_distribution.macro).toBe(2);
      expect(h.style_distribution.hardcode).toBe(1);
      expect(h.most_common_style).toBe("macro");
    });

    it("is case-insensitive on customer name", () => {
      latheProgramCatalogEngine.register(makeEntry({ customer: "ALCOA" }));
      const h = latheProgramCatalogEngine.getProgrammingHistory("alcoa");
      expect(h.program_count).toBe(1);
    });

    it("tracks unique controllers used by the customer", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ customer: "ITW", controller: "okuma_osp", path: "/1.min" }),
        makeEntry({ customer: "ITW", controller: "fanuc", path: "/2.min" }),
        makeEntry({ customer: "ITW", controller: "okuma_osp", path: "/3.min" }),
      ]);
      const h = latheProgramCatalogEngine.getProgrammingHistory("ITW");
      expect(h.controllers_used.sort()).toEqual(["fanuc", "okuma_osp"]);
    });

    it("reports most_common_cam_system when entries have cam_system", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({
          customer: "ALCOA",
          programming_style: "cam",
          cam_system: "mastercam",
          path: "/1.mcx",
        }),
        makeEntry({
          customer: "ALCOA",
          programming_style: "cam",
          cam_system: "mastercam",
          path: "/2.mcx",
        }),
        makeEntry({
          customer: "ALCOA",
          programming_style: "cam",
          cam_system: "fusion",
          path: "/3.mcx",
        }),
      ]);
      const h = latheProgramCatalogEngine.getProgrammingHistory("ALCOA");
      expect(h.most_common_cam_system).toBe("mastercam");
    });
  });

  // ── getStyleDistribution() ─────────────────────────────────────────────

  describe("getStyleDistribution()", () => {
    it("returns zero totals for empty catalog", () => {
      const d = latheProgramCatalogEngine.getStyleDistribution();
      expect(d.total_programs).toBe(0);
      expect(d.by_style.every((s) => s.count === 0)).toBe(true);
    });

    it("returns percentages that sum to 100 (within rounding)", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ programming_style: "macro", path: "/1" }),
        makeEntry({ programming_style: "hardcode", path: "/2" }),
        makeEntry({ programming_style: "cam", path: "/3" }),
        makeEntry({ programming_style: "conversational", path: "/4" }),
      ]);
      const d = latheProgramCatalogEngine.getStyleDistribution();
      const sum = d.by_style.reduce((a, b) => a + b.percentage, 0);
      expect(sum).toBeCloseTo(100, 1);
    });

    it("sorts styles by count descending", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ programming_style: "cam", path: "/1" }),
        makeEntry({ programming_style: "cam", path: "/2" }),
        makeEntry({ programming_style: "cam", path: "/3" }),
        makeEntry({ programming_style: "hardcode", path: "/4" }),
      ]);
      const d = latheProgramCatalogEngine.getStyleDistribution();
      expect(d.by_style[0]!.style).toBe("cam");
      expect(d.by_style[0]!.count).toBe(3);
    });

    it("breaks down cam_system counts with percentages", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ programming_style: "cam", cam_system: "mastercam", path: "/1" }),
        makeEntry({ programming_style: "cam", cam_system: "mastercam", path: "/2" }),
        makeEntry({ programming_style: "cam", cam_system: "hypermill", path: "/3" }),
      ]);
      const d = latheProgramCatalogEngine.getStyleDistribution();
      const masterEntry = d.by_cam_system.find((c) => c.cam_system === "mastercam");
      expect(masterEntry?.count).toBe(2);
    });

    it("includes by_conversational_type breakdown", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({
          programming_style: "conversational",
          conversational_type: "mazatrol",
          path: "/1",
        }),
        makeEntry({
          programming_style: "conversational",
          conversational_type: "winmax",
          path: "/2",
        }),
      ]);
      const d = latheProgramCatalogEngine.getStyleDistribution();
      expect(d.by_conversational_type.length).toBe(2);
    });
  });

  // ── getStats() ─────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns zero totals when catalog is empty", () => {
      const s = latheProgramCatalogEngine.getStats();
      expect(s.total_entries).toBe(0);
      expect(s.styles_present.length).toBe(0);
      expect(s.customers_count).toBe(0);
    });

    it("counts unique customers", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ customer: "A", path: "/1" }),
        makeEntry({ customer: "B", path: "/2" }),
        makeEntry({ customer: "A", path: "/3" }),
      ]);
      expect(latheProgramCatalogEngine.getStats().customers_count).toBe(2);
    });

    it("reports unique cam systems present", () => {
      latheProgramCatalogEngine.registerMany([
        makeEntry({ cam_system: "mastercam", path: "/1" }),
        makeEntry({ cam_system: "hypermill", path: "/2" }),
      ]);
      const s = latheProgramCatalogEngine.getStats();
      expect(s.cam_systems_present.sort()).toEqual(["hypermill", "mastercam"]);
    });
  });

  // ── scanDirectory() — guarded against missing paths ────────────────────

  describe("scanDirectory()", () => {
    it("returns 0 when directory does not exist", () => {
      const count = latheProgramCatalogEngine.scanDirectory(
        "H:/definitely/does/not/exist",
        "GHOST_CUSTOMER"
      );
      expect(count).toBe(0);
    });

    it("does not register anything for missing path", () => {
      latheProgramCatalogEngine.scanDirectory(
        "H:/definitely/does/not/exist",
        "GHOST_CUSTOMER"
      );
      expect(latheProgramCatalogEngine.size()).toBe(0);
    });
  });
});
