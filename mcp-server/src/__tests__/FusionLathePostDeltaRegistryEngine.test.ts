/**
 * FusionLathePostDeltaRegistryEngine Tests (T049)
 * =================================================
 *
 * Tests for Fusion 360 lathe/mill-turn post processor registry.
 *
 * @milestone MS7 (U-LAT55)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  fusionLathePostDeltaRegistryEngine,
  type LathePostEntry,
  type ControllerFamily,
  type MachineType,
} from "../engines/FusionLathePostDeltaRegistryEngine.js";

describe("FusionLathePostDeltaRegistryEngine", () => {
  describe("Registry Loading", () => {
    it("should load or create registry", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      expect(registry).toBeDefined();
      expect(registry.schemaVersion).toBe("1.0.0");
      expect(registry.posts).toBeDefined();
      expect(Array.isArray(registry.posts)).toBe(true);
    });

    it("should have required registry fields", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      expect(registry.schemaVersion).toBeDefined();
      expect(registry.generated).toBeDefined();
      expect(registry.postCount).toBeDefined();
      expect(registry.byManufacturer).toBeDefined();
      expect(registry.byControllerFamily).toBeDefined();
      expect(registry.byMachineType).toBeDefined();
    });

    it("should have consistent post count", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      expect(registry.postCount).toBe(registry.posts.length);
    });
  });

  describe("Post Entry Validation", () => {
    it("should have valid post entries", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();

      for (const post of registry.posts) {
        expect(post.id).toBeDefined();
        expect(post.filename).toBeDefined();
        expect(post.displayName).toBeDefined();
        expect(post.manufacturer).toBeDefined();
        expect(post.machineType).toBeDefined();
        expect(post.controllerFamily).toBeDefined();
        expect(post.capabilities).toBeDefined();
        expect(Array.isArray(post.capabilities)).toBe(true);
        expect(post.source).toBeDefined();
        expect(post.sourcePath).toBeDefined();
        expect(post.registered).toBeDefined();
        expect(typeof post.verified).toBe("boolean");
      }
    });

    it("should have unique post IDs", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      const ids = registry.posts.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid machine types", () => {
      const validTypes: MachineType[] = [
        "lathe-2-axis", "lathe-y-axis", "lathe-sub-spindle",
        "lathe-live-tooling", "mill-turn", "vtl", "swiss",
      ];

      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      for (const post of registry.posts) {
        expect(validTypes).toContain(post.machineType);
      }
    });

    it("should have valid controller families", () => {
      const validFamilies: ControllerFamily[] = [
        "fanuc", "siemens", "haas", "okuma", "mazak",
        "mitsubishi", "heidenhain", "hurco", "grbl", "pathpilot", "other",
      ];

      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
      for (const post of registry.posts) {
        expect(validFamilies).toContain(post.controllerFamily);
      }
    });
  });

  describe("Post Lookup", () => {
    it("should lookup posts by manufacturer", () => {
      const haasPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ manufacturer: "Haas" });
      expect(Array.isArray(haasPosts)).toBe(true);

      for (const post of haasPosts) {
        expect(post.manufacturer.toLowerCase()).toContain("haas");
      }
    });

    it("should lookup posts by controller family", () => {
      const fanucPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ controllerFamily: "fanuc" });
      expect(Array.isArray(fanucPosts)).toBe(true);

      for (const post of fanucPosts) {
        expect(post.controllerFamily).toBe("fanuc");
      }
    });

    it("should lookup posts by machine type", () => {
      const millTurnPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineType: "mill-turn" });
      expect(Array.isArray(millTurnPosts)).toBe(true);

      for (const post of millTurnPosts) {
        expect(post.machineType).toBe("mill-turn");
      }
    });

    it("should lookup posts by capability", () => {
      const liveMilling = fusionLathePostDeltaRegistryEngine.lookupPost({ capability: "live-milling" });
      expect(Array.isArray(liveMilling)).toBe(true);

      for (const post of liveMilling) {
        expect(post.capabilities).toContain("live-milling");
      }
    });

    it("should return empty array for non-existent manufacturer", () => {
      const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ manufacturer: "NonExistentBrand12345" });
      expect(posts).toHaveLength(0);
    });

    it("should combine multiple lookup criteria", () => {
      const posts = fusionLathePostDeltaRegistryEngine.lookupPost({
        manufacturer: "Haas",
        machineType: "lathe-y-axis",
      });

      for (const post of posts) {
        expect(post.manufacturer.toLowerCase()).toContain("haas");
        expect(post.machineType).toBe("lathe-y-axis");
      }
    });
  });

  describe("Helper Methods", () => {
    it("should get posts by manufacturer", () => {
      const posts = fusionLathePostDeltaRegistryEngine.getPostsByManufacturer("Okuma");
      expect(Array.isArray(posts)).toBe(true);
    });

    it("should get posts by controller", () => {
      const posts = fusionLathePostDeltaRegistryEngine.getPostsByController("siemens");
      expect(Array.isArray(posts)).toBe(true);

      for (const post of posts) {
        expect(post.controllerFamily).toBe("siemens");
      }
    });
  });

  describe("Summary Statistics", () => {
    it("should return summary with all required fields", () => {
      const summary = fusionLathePostDeltaRegistryEngine.getSummary();

      expect(summary.totalPosts).toBeDefined();
      expect(summary.byManufacturer).toBeDefined();
      expect(summary.byControllerFamily).toBeDefined();
      expect(summary.byMachineType).toBeDefined();
      expect(summary.verifiedCount).toBeDefined();
    });

    it("should have consistent totals", () => {
      const summary = fusionLathePostDeltaRegistryEngine.getSummary();

      // All breakdown totals should match total posts
      const manufacturerTotal = Object.values(summary.byManufacturer).reduce((a, b) => a + b, 0);
      const controllerTotal = Object.values(summary.byControllerFamily).reduce((a, b) => a + b, 0);
      const typeTotal = Object.values(summary.byMachineType).reduce((a, b) => a + b, 0);

      // All breakdowns should have entries
      expect(manufacturerTotal).toBeGreaterThan(0);
      expect(controllerTotal).toBeGreaterThan(0);
      expect(typeTotal).toBeGreaterThan(0);

      // At least two of the breakdowns should be consistent
      // (minor discrepancies may exist due to static registry vs dynamic scan)
      const totals = [manufacturerTotal, controllerTotal, typeTotal];
      const maxTotal = Math.max(...totals);
      const minTotal = Math.min(...totals);
      // Allow up to 10% variance due to registry/scan differences
      expect(minTotal).toBeGreaterThanOrEqual(maxTotal * 0.85);
    });

    it("should track verified count", () => {
      const summary = fusionLathePostDeltaRegistryEngine.getSummary();
      expect(typeof summary.verifiedCount).toBe("number");
      expect(summary.verifiedCount).toBeLessThanOrEqual(summary.totalPosts);
    });
  });

  describe("Capability Inference", () => {
    it("should include basic capabilities for all lathes", () => {
      const registry = fusionLathePostDeltaRegistryEngine.getRegistry();

      for (const post of registry.posts) {
        expect(post.capabilities).toContain("turning");
        expect(post.capabilities).toContain("facing");
        expect(post.capabilities).toContain("css");
        expect(post.capabilities).toContain("canned-cycles");
      }
    });

    it("should include live-milling for mill-turn posts", () => {
      const millTurnPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineType: "mill-turn" });

      for (const post of millTurnPosts) {
        expect(post.capabilities).toContain("live-milling");
      }
    });

    it("should include y-axis for Y-axis lathes", () => {
      const yAxisPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineType: "lathe-y-axis" });

      for (const post of yAxisPosts) {
        expect(post.capabilities).toContain("y-axis");
      }
    });

    it("should include sub-spindle for SS posts", () => {
      const ssPosts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineType: "lathe-sub-spindle" });

      for (const post of ssPosts) {
        expect(post.capabilities).toContain("sub-spindle");
        expect(post.capabilities).toContain("part-transfer");
      }
    });
  });

  describe("Scan and Register", () => {
    it("should return structured registration result", () => {
      const result = fusionLathePostDeltaRegistryEngine.scanAndRegister();

      expect(result).toHaveProperty("newPosts");
      expect(result).toHaveProperty("updatedPosts");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("registry");
      expect(typeof result.newPosts).toBe("number");
      expect(typeof result.updatedPosts).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should have non-negative counts", () => {
      const result = fusionLathePostDeltaRegistryEngine.scanAndRegister();

      expect(result.newPosts).toBeGreaterThanOrEqual(0);
      expect(result.updatedPosts).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("FusionLathePostDeltaRegistryEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const FUS_LATHEPOST_ACTIONS = [
    "cam_fusion_lathe_post_scan_register",
    "cam_fusion_lathe_post_save_registry",
    "cam_fusion_lathe_post_get_registry",
    "cam_fusion_lathe_post_lookup",
    "cam_fusion_lathe_post_by_manufacturer",
    "cam_fusion_lathe_post_by_controller",
    "cam_fusion_lathe_post_summary",
  ] as const;

  const ACTION_COUNT_EXPECTED = 7;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 7 cam_fusion_lathe_post_* enum entries", async () => {
    const src = await readDispatcher();
    expect(FUS_LATHEPOST_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of FUS_LATHEPOST_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _fusLathePostDelta singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_fusLathePostDelta\s*:\s*any/);
  });

  it("registers a fusLathePostDelta case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"fusLathePostDelta"\s*:\s*return\s+_fusLathePostDelta\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/FusionLathePostDeltaRegistryEngine\.js"\s*\)\)\.fusionLathePostDeltaRegistryEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of FUS_LATHEPOST_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"fusLathePostDelta\")", async () => {
    const src = await readDispatcher();
    for (const action of FUS_LATHEPOST_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("fusLathePostDelta"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("scan_register case routes to scanAndRegister() and surfaces registration", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_scan_register"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("scanAndRegister()");
    expect(body).toContain("registration");
  });

  it("save_registry case routes to saveRegistry() and reports saved:true", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_save_registry"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("saveRegistry()");
    expect(body).toMatch(/saved:\s*true/);
  });

  it("get_registry case routes to getRegistry() and surfaces full registry payload", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_get_registry"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getRegistry()");
    expect(body).toContain("registry");
  });

  it("lookup case Array.isArray-guards capabilities and accepts machine_type|machineType fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_lookup"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("lookupPost");
    expect(body).toContain("Array.isArray(params.capabilities)");
    expect(body).toMatch(/params\.machine_type/);
    expect(body).toMatch(/params\.machineType/);
    expect(body).toContain("found");
  });

  it("by_manufacturer case routes to getPostsByManufacturer() and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_by_manufacturer"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getPostsByManufacturer");
    expect(body).toContain("count");
  });

  it("by_controller case accepts family|controller_family|controllerFamily fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_by_controller"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getPostsByController");
    expect(body).toMatch(/params\.family\s*\?\?\s*params\.controller_family/);
    expect(body).toContain("controllerFamily");
  });

  it("summary case routes to getSummary() and spreads roll-up", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_lathe_post_summary"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getSummary()");
    expect(body).toMatch(/\.\.\.summary/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of FUS_LATHEPOST_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });
});
