import { describe, it, expect } from "vitest";
import { ToolRouterEngine } from "../engines/ToolRouterEngine.js";

describe("ToolRouterEngine", () => {
  const router = new ToolRouterEngine();

  describe("route", () => {
    it("routes RPM queries to QuickCalcEngine", () => {
      const results = router.route("calculate rpm for my cutter");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].target).toBe("QuickCalcEngine");
    });

    it("routes feed rate queries to QuickCalcEngine", () => {
      const results = router.route("what feed rate should I use");
      expect(results[0].target).toBe("QuickCalcEngine");
      expect(results[0].action).toContain("feedRate");
    });

    it("routes system status to SystemSnapshotEngine", () => {
      const results = router.route("show system status");
      expect(results[0].target).toBe("SystemSnapshotEngine");
    });

    it("routes action search to DispatcherMapEngine", () => {
      const results = router.route("find action for material lookup");
      expect(results.some(r => r.target === "DispatcherMapEngine")).toBe(true);
    });

    it("routes material queries to calcDispatcher", () => {
      const results = router.route("material properties of 6061 aluminum");
      expect(results.some(r => r.target === "calcDispatcher")).toBe(true);
    });

    it("returns empty array for unknown intent", () => {
      const results = router.route("zzz completely unrelated zzz");
      expect(results).toEqual([]);
    });

    it("returns at most 3 results", () => {
      const results = router.route("rpm feed rate chip load mrr");
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("prefers direct routes over dispatcher routes", () => {
      const results = router.route("calculate rpm");
      if (results.length > 0) {
        expect(results[0].route).toBe("direct");
      }
    });
  });

  describe("bestRoute", () => {
    it("returns single best match", () => {
      const best = router.bestRoute("tap drill for M10");
      expect(best).not.toBeNull();
      expect(best!.target).toBe("QuickCalcEngine");
      expect(best!.action).toContain("tapDrill");
    });

    it("returns null for no match", () => {
      const best = router.bestRoute("zzz nothing zzz");
      expect(best).toBeNull();
    });
  });

  describe("getPatterns", () => {
    it("returns all registered patterns", () => {
      const patterns = router.getPatterns();
      expect(patterns.length).toBeGreaterThan(10);
      patterns.forEach(p => {
        expect(p).toHaveProperty("keywords");
        expect(p).toHaveProperty("target");
        expect(p).toHaveProperty("action");
      });
    });
  });

  describe("getStats", () => {
    it("returns pattern and target counts", () => {
      const stats = router.getStats();
      expect(stats.patterns).toBeGreaterThan(50);
      expect(stats.targets).toBeGreaterThan(15);
      expect(stats.avgTokens).toBeGreaterThan(0);
    });
  });

  describe("dispatcher coverage", () => {
    it("routes turning queries to turningDispatcher", () => {
      const r = router.route("turning lathe boring bar");
      expect(r.some(x => x.target === "turningDispatcher")).toBe(true);
    });

    it("routes grinding to grindingDispatcher", () => {
      const r = router.route("surface grind centerless");
      expect(r.some(x => x.target === "grindingDispatcher")).toBe(true);
    });

    it("routes EDM to edmDispatcher", () => {
      const r = router.route("wire edm sinker edm");
      expect(r.some(x => x.target === "edmDispatcher")).toBe(true);
    });

    it("routes 5-axis to fiveAxisDispatcher", () => {
      const r = router.route("5 axis rtcp tool vector");
      expect(r.some(x => x.target === "fiveAxisDispatcher")).toBe(true);
    });

    it("routes quality to qualityDispatcher", () => {
      const r = router.route("inspection cmm measurement");
      expect(r.some(x => x.target === "qualityDispatcher")).toBe(true);
    });

    it("routes scheduling to schedulingDispatcher", () => {
      const r = router.route("job scheduling production plan");
      expect(r.some(x => x.target === "schedulingDispatcher")).toBe(true);
    });

    it("routes adaptive control to adaptiveControlDispatcher", () => {
      const r = router.route("adaptive control pid tuning");
      expect(r.some(x => x.target === "adaptiveControlDispatcher")).toBe(true);
    });

    it("routes threading to threadDispatcher", () => {
      const r = router.route("thread mill single point thread");
      expect(r.some(x => x.target === "threadDispatcher" || x.target === "camDispatcher")).toBe(true);
    });

    it("routes intelligence to intelligenceDispatcher", () => {
      const r = router.route("ai recommend parameter optimize");
      expect(r.some(x => x.target === "intelligenceDispatcher")).toBe(true);
    });

    it("routes batch operations to BatchQueryEngine", () => {
      const r = router.route("batch multiple actions");
      expect(r.some(x => x.target === "BatchQueryEngine")).toBe(true);
    });

    it("routes boring bar to calcDispatcher", () => {
      const r = router.route("boring bar deflection L/D ratio");
      expect(r.some(x => x.target === "calcDispatcher" && x.action === "boring_bar_calc")).toBe(true);
    });

    it("routes chatter prediction to calcDispatcher", () => {
      const r = router.route("stability lobe chatter prediction");
      expect(r.some(x => x.target === "calcDispatcher" && x.action === "machine_vibration_calc")).toBe(true);
    });

    it("routes broaching to calcDispatcher", () => {
      const r = router.route("broaching keyway broach force");
      expect(r.some(x => x.target === "calcDispatcher" && x.action === "broaching_calc")).toBe(true);
    });

    it("routes fatigue life to calcDispatcher", () => {
      const r = router.route("fatigue life s-n curve goodman diagram");
      expect(r.some(x => x.target === "calcDispatcher" && x.action === "fatigue_life_calc")).toBe(true);
    });

    it("routes spindle load monitor to safetyDispatcher", () => {
      const r = router.route("spindle load monitor breakage detection");
      expect(r.some(x => x.target === "safetyDispatcher" && x.action === "spindle_load_monitor")).toBe(true);
    });

    it("routes master post processor to camDispatcher", () => {
      const r = router.route("master post processor multi cam gcode");
      expect(r.some(x => x.target === "camDispatcher" && x.action === "master_post_process")).toBe(true);
    });
  });
});
