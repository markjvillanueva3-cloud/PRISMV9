/**
 * PostProcessorUnificationEngine Tests — Phase 0.23 U-UTL5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { postProcessorUnificationEngine } from "../engines/PostProcessorUnificationEngine.js";

describe("PostProcessorUnificationEngine", () => {
  beforeEach(() => {
    postProcessorUnificationEngine.reset();
  });

  it("initializes with seeded configs", async () => {
    const stats = await postProcessorUnificationEngine.getStats();
    expect(stats.totalConfigs).toBeGreaterThan(0);
  });

  it("queries configs by controller", async () => {
    const configs = await postProcessorUnificationEngine.query({ controller: "Fanuc" });
    expect(configs.every(c => c.controller === "Fanuc")).toBe(true);
  });

  it("queries configs by machine type", async () => {
    const configs = await postProcessorUnificationEngine.query({ machineType: "mill" });
    expect(configs.every(c => c.machineTypes.includes("mill"))).toBe(true);
  });

  it("queries configs by feature", async () => {
    const configs = await postProcessorUnificationEngine.query({ feature: "coolant" });
    expect(configs.every(c => c.features.includes("coolant"))).toBe(true);
  });

  it("gets config by id", async () => {
    const configs = await postProcessorUnificationEngine.query({ limit: 1 });
    if (configs.length > 0) {
      const config = await postProcessorUnificationEngine.getConfig(configs[0].id);
      expect(config).not.toBeNull();
      expect(config?.id).toBe(configs[0].id);
    }
  });

  it("returns null for unknown config id", async () => {
    const config = await postProcessorUnificationEngine.getConfig("nonexistent");
    expect(config).toBeNull();
  });

  it("gets configs by controller shortcut", async () => {
    const configs = await postProcessorUnificationEngine.getByController("Okuma");
    expect(configs.every(c => c.controller === "Okuma")).toBe(true);
  });

  it("respects query limit", async () => {
    const configs = await postProcessorUnificationEngine.query({ limit: 3 });
    expect(configs.length).toBeLessThanOrEqual(3);
  });

  it("stats include controller breakdown", async () => {
    const stats = await postProcessorUnificationEngine.getStats();
    expect(stats.byController).toBeDefined();
    expect(typeof stats.byController).toBe("object");
  });

  it("stats include dialect breakdown", async () => {
    const stats = await postProcessorUnificationEngine.getStats();
    expect(stats.byDialect).toBeDefined();
  });

  it("stats include verified count", async () => {
    const stats = await postProcessorUnificationEngine.getStats();
    expect(typeof stats.verifiedConfigs).toBe("number");
  });

  it("stats include coverage percent", async () => {
    const stats = await postProcessorUnificationEngine.getStats();
    expect(typeof stats.coveragePercent).toBe("number");
  });

  it("reset clears state", async () => {
    await postProcessorUnificationEngine.getStats();
    postProcessorUnificationEngine.reset();
    const stats = await postProcessorUnificationEngine.getStats();
    expect(stats.totalConfigs).toBeGreaterThan(0);
  });

  describe("execute(action, params) dispatcher wrapper", () => {
    it("pp_unify_query routes to query()", async () => {
      const r = (await postProcessorUnificationEngine.execute("pp_unify_query", {
        controller: "Fanuc",
      })) as Array<{ controller: string }>;
      expect(Array.isArray(r)).toBe(true);
      expect(r.every((c) => c.controller === "Fanuc")).toBe(true);
    });

    it("pp_unify_get routes to getConfig()", async () => {
      const list = (await postProcessorUnificationEngine.execute("pp_unify_query", {
        limit: 1,
      })) as Array<{ id: string }>;
      if (list.length > 0) {
        const c = (await postProcessorUnificationEngine.execute("pp_unify_get", {
          id: list[0].id,
        })) as { id: string } | null;
        expect(c).not.toBeNull();
        expect(c?.id).toBe(list[0].id);
      }
    });

    it("pp_unify_get returns null for unknown id", async () => {
      const c = await postProcessorUnificationEngine.execute("pp_unify_get", {
        id: "definitely-not-real",
      });
      expect(c).toBeNull();
    });

    it("pp_unify_stats routes to getStats()", async () => {
      const s = (await postProcessorUnificationEngine.execute("pp_unify_stats", {})) as {
        totalConfigs: number;
      };
      expect(typeof s.totalConfigs).toBe("number");
      expect(s.totalConfigs).toBeGreaterThan(0);
    });

    it("pp_unify_by_controller routes to getByController()", async () => {
      const r = (await postProcessorUnificationEngine.execute(
        "pp_unify_by_controller",
        { controller: "Okuma" },
      )) as Array<{ controller: string }>;
      expect(r.every((c) => c.controller === "Okuma")).toBe(true);
    });

    it("throws on unknown action (fail-loud per R12)", async () => {
      await expect(
        postProcessorUnificationEngine.execute("pp_unify_no_such_action", {}),
      ).rejects.toThrow(/unknown action/i);
    });

    it("tolerates missing params (defaults applied)", async () => {
      const r = (await postProcessorUnificationEngine.execute("pp_unify_query", undefined)) as Array<unknown>;
      expect(Array.isArray(r)).toBe(true);
    });
  });
});
