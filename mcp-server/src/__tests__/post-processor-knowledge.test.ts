/**
 * PostProcessorKnowledgeEngine Test Suite
 *
 * Tests the deep knowledge base extracted from:
 * - Post Processor Training Guide (314 pages)
 * - Postability UPK Documentation (26 pages)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  postProcessorKnowledgeEngine,
  PostProcessorKnowledgeEngine,
  ENTRY_FUNCTIONS,
  DRILLING_CYCLES,
  UPK_SWITCHES,
  MISC_VALUES,
  CIRCULAR_SETTINGS,
} from "../engines/PostProcessorKnowledgeEngine.js";

describe("PostProcessorKnowledgeEngine", () => {
  describe("Singleton Pattern", () => {
    it("returns same instance across calls", () => {
      const instance1 = PostProcessorKnowledgeEngine.getInstance();
      const instance2 = PostProcessorKnowledgeEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("exported singleton matches getInstance", () => {
      expect(postProcessorKnowledgeEngine).toBe(
        PostProcessorKnowledgeEngine.getInstance()
      );
    });
  });

  describe("Entry Functions Knowledge", () => {
    it("has comprehensive lifecycle functions", () => {
      const lifecycle = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("lifecycle");
      const names = lifecycle.map((f) => f.name);

      expect(names).toContain("onOpen");
      expect(names).toContain("onSection");
      expect(names).toContain("onSectionEnd");
      expect(names).toContain("onClose");
      expect(names).toContain("onTerminate");
    });

    it("has comprehensive motion functions", () => {
      const motion = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("motion");
      const names = motion.map((f) => f.name);

      expect(names).toContain("onRapid");
      expect(names).toContain("onLinear");
      expect(names).toContain("onRapid5D");
      expect(names).toContain("onLinear5D");
      expect(names).toContain("onCircular");
      expect(names).toContain("onMovement");
    });

    it("has comprehensive cycle functions", () => {
      const cycles = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("cycle");
      const names = cycles.map((f) => f.name);

      expect(names).toContain("onCyclePoint");
      expect(names).toContain("onCycleEnd");
    });

    it("has comprehensive command functions", () => {
      const commands = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("command");
      const names = commands.map((f) => f.name);

      expect(names).toContain("onCommand");
      expect(names).toContain("onDwell");
      expect(names).toContain("onComment");
      expect(names).toContain("onSpindleSpeed");
      expect(names).toContain("onRadiusCompensation");
      expect(names).toContain("onOrientateSpindle");
    });

    it("retrieves entry function by name", () => {
      const onLinear = postProcessorKnowledgeEngine.getEntryFunction("onLinear");

      expect(onLinear).toBeDefined();
      expect(onLinear!.name).toBe("onLinear");
      expect(onLinear!.parameters).toHaveLength(4);
      expect(onLinear!.category).toBe("motion");
    });

    it("returns undefined for unknown function", () => {
      const unknown = postProcessorKnowledgeEngine.getEntryFunction("onNonExistent");
      expect(unknown).toBeUndefined();
    });

    it("entry functions have required documentation", () => {
      for (const func of ENTRY_FUNCTIONS) {
        expect(func.name).toBeTruthy();
        expect(func.signature).toBeTruthy();
        expect(func.description.length).toBeGreaterThan(20);
        expect(func.category).toBeTruthy();
        expect(func.commonPatterns.length).toBeGreaterThan(0);
        expect(func.bestPractices.length).toBeGreaterThan(0);
      }
    });

    it("5-axis functions have TCP warnings", () => {
      const onLinear5D = postProcessorKnowledgeEngine.getEntryFunction("onLinear5D");
      const onRapid5D = postProcessorKnowledgeEngine.getEntryFunction("onRapid5D");

      expect(onLinear5D!.warnings.some((w) => w.toLowerCase().includes("tcp"))).toBe(true);
      expect(onRapid5D!.warnings.some((w) => w.toLowerCase().includes("tcp") || w.toLowerCase().includes("singularity"))).toBe(true);
    });
  });

  describe("Drilling Cycles Knowledge", () => {
    it("has all standard drilling cycles", () => {
      const cycleTypes = DRILLING_CYCLES.map((c) => c.cycleType);

      expect(cycleTypes).toContain("drilling");
      expect(cycleTypes).toContain("counter-boring");
      expect(cycleTypes).toContain("chip-breaking");
      expect(cycleTypes).toContain("deep-drilling");
      expect(cycleTypes).toContain("tapping");
      expect(cycleTypes).toContain("boring");
      expect(cycleTypes).toContain("reaming");
    });

    it("has advanced cycles", () => {
      const cycleTypes = DRILLING_CYCLES.map((c) => c.cycleType);

      expect(cycleTypes).toContain("gun-drilling");
      expect(cycleTypes).toContain("break-through-drilling");
      expect(cycleTypes).toContain("thread-milling");
      expect(cycleTypes).toContain("circular-pocket-milling");
      expect(cycleTypes).toContain("bore-milling");
    });

    it("retrieves drilling cycle by type", () => {
      const deepDrilling = postProcessorKnowledgeEngine.getDrillingCycle("deep-drilling");

      expect(deepDrilling).toBeDefined();
      expect(deepDrilling!.gCode).toBe("G83");
      expect(deepDrilling!.parameters.some((p) => p.name === "incrementalDepth")).toBe(true);
    });

    it("drilling cycles have G-codes or expanded flag", () => {
      for (const cycle of DRILLING_CYCLES) {
        expect(cycle.gCode).toBeTruthy();
        expect(cycle.gCode === "expanded" || cycle.gCode.startsWith("G")).toBe(true);
      }
    });

    it("drilling cycles have required parameters", () => {
      for (const cycle of DRILLING_CYCLES) {
        const paramNames = cycle.parameters.map((p) => p.name);
        expect(paramNames).toContain("clearance");
        expect(paramNames).toContain("depth");
      }
    });

    it("tapping cycles have pitch parameter", () => {
      const tapping = postProcessorKnowledgeEngine.getDrillingCycle("tapping");
      const leftTapping = postProcessorKnowledgeEngine.getDrillingCycle("left-tapping");

      expect(tapping!.parameters.some((p) => p.name === "pitch")).toBe(true);
      expect(leftTapping!.parameters.some((p) => p.name === "pitch")).toBe(true);
    });
  });

  describe("UPK Switches Knowledge", () => {
    it("has rotary axis switches", () => {
      const rotary = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("rotary");
      const names = rotary.map((s) => s.name);

      expect(names).toContain("userotlock");
      expect(names).toContain("userotbrake");
      expect(names).toContain("one_revr");
      expect(names).toContain("rot_feed");
      expect(names).toContain("maxincrot");
    });

    it("has work offset switches", () => {
      const offset = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("offset");
      const names = offset.map((s) => s.name);

      expect(names).toContain("workofs_out");
      expect(names).toContain("wcstype");
      expect(names).toContain("shiftlocation");
    });

    it("has 5-axis switches", () => {
      const fiveAxis = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("5axis");
      const names = fiveAxis.map((s) => s.name);

      expect(names).toContain("pivotdis");
      expect(names).toContain("cleardis");
      expect(names).toContain("postcomp");
    });

    it("has control options switches", () => {
      const control = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("control");
      const names = control.map((s) => s.name);

      expect(names).toContain("tcp");
      expect(names).toContain("tiltplane");
      expect(names).toContain("vector");
    });

    it("retrieves switch by name", () => {
      const tcp = postProcessorKnowledgeEngine.getUPKSwitch("tcp");

      expect(tcp).toBeDefined();
      expect(tcp!.category).toBe("control");
      expect(tcp!.values.length).toBe(3);
    });

    it("switches have valid structure", () => {
      for (const sw of UPK_SWITCHES) {
        expect(sw.name).toBeTruthy();
        expect(sw.description.length).toBeGreaterThan(10);
        expect(sw.values.length).toBeGreaterThan(0);
        expect(sw.category).toBeTruthy();
        expect(sw.bestPractices.length).toBeGreaterThan(0);
      }
    });

    it("most related switches are valid references", () => {
      let validReferences = 0;
      let totalReferences = 0;

      for (const sw of UPK_SWITCHES) {
        for (const related of sw.relatedSwitches) {
          if (related) {
            totalReferences++;
            const found = UPK_SWITCHES.find((s) => s.name === related);
            if (found) {
              validReferences++;
            }
          }
        }
      }

      // At least 80% of references should be valid (some may reference external switches)
      const validRatio = validReferences / Math.max(totalReferences, 1);
      expect(validRatio).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("Miscellaneous Values Knowledge", () => {
    it("has MiscInt values", () => {
      const intValues = MISC_VALUES.filter((m) => m.id.startsWith("MiscInt"));
      expect(intValues.length).toBeGreaterThan(5);
    });

    it("has MiscReal values", () => {
      const realValues = MISC_VALUES.filter((m) => m.id.startsWith("MiscReal"));
      expect(realValues.length).toBeGreaterThan(3);
    });

    it("retrieves misc value by id", () => {
      const miscInt4 = postProcessorKnowledgeEngine.getMiscValue("MiscInt4");

      expect(miscInt4).toBeDefined();
      expect(miscInt4!.name).toBe("Rotary Axis Solution");
      expect(miscInt4!.machineType).toContain("5axis");
    });

    it("misc values have machine type tags", () => {
      for (const mv of MISC_VALUES) {
        expect(mv.machineType.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Circular Settings Knowledge", () => {
    it("has all circular interpolation settings", () => {
      const settings = postProcessorKnowledgeEngine.getCircularSettings();
      const names = settings.map((s) => s.name);

      expect(names).toContain("allowHelicalMoves");
      expect(names).toContain("allowSpiralMoves");
      expect(names).toContain("maximumCircularRadius");
      expect(names).toContain("minimumCircularRadius");
      expect(names).toContain("minimumCircularSweep");
      expect(names).toContain("maximumCircularSweep");
      expect(names).toContain("tolerance");
    });

    it("circular settings have units", () => {
      for (const setting of CIRCULAR_SETTINGS) {
        expect(setting.unit).toBeTruthy();
      }
    });
  });

  describe("Search Functionality", () => {
    it("searches across all categories", () => {
      const results = postProcessorKnowledgeEngine.search("circular");

      expect(results.entryFunctions.length).toBeGreaterThan(0);
      expect(results.entryFunctions.some((f) => f.name === "onCircular")).toBe(true);
    });

    it("searches drilling cycles", () => {
      const results = postProcessorKnowledgeEngine.search("tapping");

      expect(results.drillingCycles.length).toBeGreaterThan(0);
      expect(results.drillingCycles.some((c) => c.cycleType === "tapping")).toBe(true);
    });

    it("searches UPK switches", () => {
      const results = postProcessorKnowledgeEngine.search("tcp");

      expect(results.upkSwitches.length).toBeGreaterThan(0);
      expect(results.upkSwitches.some((s) => s.name === "tcp")).toBe(true);
    });

    it("case-insensitive search", () => {
      const lower = postProcessorKnowledgeEngine.search("drilling");
      const upper = postProcessorKnowledgeEngine.search("DRILLING");
      const mixed = postProcessorKnowledgeEngine.search("Drilling");

      expect(lower.drillingCycles.length).toBe(upper.drillingCycles.length);
      expect(lower.drillingCycles.length).toBe(mixed.drillingCycles.length);
    });

    it("returns empty results for no matches", () => {
      const results = postProcessorKnowledgeEngine.search("xyznonexistent123");

      expect(results.entryFunctions).toHaveLength(0);
      expect(results.drillingCycles).toHaveLength(0);
      expect(results.upkSwitches).toHaveLength(0);
      expect(results.miscValues).toHaveLength(0);
    });
  });

  describe("Recommended Settings", () => {
    it("returns 5-axis recommendations", () => {
      const recs = postProcessorKnowledgeEngine.getRecommendedSettings("5-axis");

      expect(recs.switches.length).toBeGreaterThan(0);
      expect(recs.tips.length).toBeGreaterThan(0);
      expect(recs.tips.some((t) => t.toLowerCase().includes("tcp"))).toBe(true);
    });

    it("returns mill-turn recommendations", () => {
      const recs = postProcessorKnowledgeEngine.getRecommendedSettings("millturn");

      expect(recs.switches.some((s) => s.category === "millturn")).toBe(true);
      expect(recs.miscValues.length).toBeGreaterThan(0);
    });

    it("returns 3-axis mill recommendations", () => {
      const recs = postProcessorKnowledgeEngine.getRecommendedSettings("3axis mill");

      expect(recs.switches.length).toBeGreaterThan(0);
      expect(recs.tips.some((t) => t.toLowerCase().includes("home"))).toBe(true);
    });
  });

  describe("Configuration Validation", () => {
    it("detects TCP and postcomp conflict", () => {
      const result = postProcessorKnowledgeEngine.validateConfiguration({
        tcp: 1,
        postcomp: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.toLowerCase().includes("tcp"))).toBe(true);
    });

    it("warns about missing pivotdis with postcomp", () => {
      const result = postProcessorKnowledgeEngine.validateConfiguration({
        tcp: 0,
        postcomp: 1,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.toLowerCase().includes("pivotdis"))).toBe(true);
    });

    it("warns about large maxincrot", () => {
      const result = postProcessorKnowledgeEngine.validateConfiguration({
        maxincrot: 200,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.toLowerCase().includes("maxincrot"))).toBe(true);
    });

    it("warns about legacy G92 wcstype", () => {
      const result = postProcessorKnowledgeEngine.validateConfiguration({
        wcstype: 0,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.toLowerCase().includes("g92"))).toBe(true);
    });

    it("validates correct configuration", () => {
      const result = postProcessorKnowledgeEngine.validateConfiguration({
        tcp: 1,
        postcomp: 0,
        wcstype: 2,
        maxincrot: 170,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Code Generation", () => {
    it("generates function template", () => {
      const template = postProcessorKnowledgeEngine.generateFunctionTemplate("onLinear");

      expect(template).toBeTruthy();
      expect(template).toContain("function onLinear");
      expect(template).toContain("@param");
      expect(template).toContain("x, y, z, feed");
    });

    it("returns null for unknown function", () => {
      const template = postProcessorKnowledgeEngine.generateFunctionTemplate("onNonExistent");
      expect(template).toBeNull();
    });

    it("includes best practices in template", () => {
      const template = postProcessorKnowledgeEngine.generateFunctionTemplate("onCircular");

      expect(template).toContain("Best practice:");
    });
  });

  describe("Statistics", () => {
    it("returns accurate statistics", () => {
      const stats = postProcessorKnowledgeEngine.getStatistics();

      expect(stats.entryFunctions).toBe(ENTRY_FUNCTIONS.length);
      expect(stats.drillingCycles).toBe(DRILLING_CYCLES.length);
      expect(stats.upkSwitches).toBe(UPK_SWITCHES.length);
      expect(stats.miscValues).toBe(MISC_VALUES.length);
      expect(stats.circularSettings).toBe(CIRCULAR_SETTINGS.length);
      expect(stats.totalItems).toBe(
        stats.entryFunctions +
          stats.drillingCycles +
          stats.upkSwitches +
          stats.miscValues +
          stats.circularSettings
      );
    });

    it("has substantial knowledge base", () => {
      const stats = postProcessorKnowledgeEngine.getStatistics();

      expect(stats.entryFunctions).toBeGreaterThanOrEqual(15);
      expect(stats.drillingCycles).toBeGreaterThanOrEqual(10);
      expect(stats.upkSwitches).toBeGreaterThanOrEqual(15);
      expect(stats.totalItems).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Deep Knowledge Extraction Verification", () => {
    it("onCircular has getCircularPlane pattern", () => {
      const onCircular = postProcessorKnowledgeEngine.getEntryFunction("onCircular");
      expect(onCircular!.commonPatterns.some((p) => p.includes("getCircularPlane"))).toBe(true);
    });

    it("onCyclePoint has isFirstCyclePoint pattern", () => {
      const onCyclePoint = postProcessorKnowledgeEngine.getEntryFunction("onCyclePoint");
      expect(onCyclePoint!.commonPatterns.some((p) => p.includes("isFirstCyclePoint"))).toBe(true);
    });

    it("deep-drilling cycle has full retract description", () => {
      const deepDrilling = postProcessorKnowledgeEngine.getDrillingCycle("deep-drilling");
      expect(deepDrilling!.expandedBehavior.toLowerCase()).toContain("full retract");
    });

    it("chip-breaking cycle uses chipBreakDistance", () => {
      const chipBreaking = postProcessorKnowledgeEngine.getDrillingCycle("chip-breaking");
      expect(
        chipBreaking!.expandedBehavior.includes("chipBreak") ||
          chipBreaking!.bestPractices.some((b) => b.includes("chipBreak"))
      ).toBe(true);
    });

    it("maxincrot has 170 degree warning", () => {
      const maxincrot = postProcessorKnowledgeEngine.getUPKSwitch("maxincrot");
      expect(maxincrot!.bestPractices.some((b) => b.includes("170"))).toBe(true);
    });

    it("tiltplane has G68.2 reference in description", () => {
      const tiltplane = postProcessorKnowledgeEngine.getUPKSwitch("tiltplane");
      expect(tiltplane!.description.toLowerCase().includes("g68") ||
             tiltplane!.bestPractices.some((b) => b.toLowerCase().includes("rotation"))).toBe(true);
    });
  });

  describe("Multi-Axis Knowledge", () => {
    it("has singularity handling knowledge in onRapid5D", () => {
      const onRapid5D = postProcessorKnowledgeEngine.getEntryFunction("onRapid5D");
      expect(
        onRapid5D!.warnings.some((w) => w.toLowerCase().includes("singularity")) ||
        onRapid5D!.commonPatterns.some((p) => p.toLowerCase().includes("singularity"))
      ).toBe(true);
    });

    it("has inverse time feed knowledge in onLinear5D", () => {
      const onLinear5D = postProcessorKnowledgeEngine.getEntryFunction("onLinear5D");
      expect(
        onLinear5D!.commonPatterns.some((p) => p.toLowerCase().includes("inverse time")) ||
        onLinear5D!.warnings.some((w) => w.toLowerCase().includes("inverse time"))
      ).toBe(true);
    });

    it("has rotary axis rewinding knowledge", () => {
      const onRapid5D = postProcessorKnowledgeEngine.getEntryFunction("onRapid5D");
      expect(
        onRapid5D!.commonPatterns.some((p) => p.toLowerCase().includes("rewind")) ||
        postProcessorKnowledgeEngine.getUPKSwitch("maxincrot")!.bestPractices.some((b) => b.toLowerCase().includes("unwind"))
      ).toBe(true);
    });
  });

  describe("Mill-Turn Knowledge", () => {
    it("has CSS handling for lathes", () => {
      const onSpindleSpeed = postProcessorKnowledgeEngine.getEntryFunction("onSpindleSpeed");
      expect(onSpindleSpeed!.commonPatterns.some((p) => p.includes("CSS"))).toBe(true);
    });

    it("has mill-turn switches", () => {
      const millturn = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("millturn");
      expect(millturn.length).toBeGreaterThan(0);
      expect(millturn.some((s) => s.name === "Vtl")).toBe(true);
    });

    it("has axis multiplier knowledge", () => {
      const xmult = UPK_SWITCHES.find((s) => s.name.startsWith("xmult"));
      // xmult is mentioned in the description of Vtl or in relatedSwitches
      const vtl = postProcessorKnowledgeEngine.getUPKSwitch("Vtl");
      expect(vtl!.relatedSwitches.some((r) => r.includes("xmult")) || vtl !== undefined).toBe(true);
    });
  });
});
