/**
 * CLOSED-LOOP-MS0/U-CL2 — LatheToolpathTemplateEngine tests.
 * Real fail-on-revert assertions: cutting-condition CENTERS must equal the imported
 * canonical constants (proving they are sourced, not inlined/guessed), G-code cycle + CSS
 * mode + safety gates per category, variable bands, full-library coverage, error paths.
 */
import { describe, it, expect } from "vitest";
import { LatheToolpathTemplateEngine } from "../engines/LatheToolpathTemplateEngine.js";
import {
  CANONICAL_TURNING_SPEEDS, CANONICAL_TURNING_FEEDS, CANONICAL_KIENZLE,
} from "../physics/constants.js";
import { TURNING_STRATEGY_CATALOG } from "../engines/TurningStrategyCatalog.js";

describe("LatheToolpathTemplateEngine.buildParams — cutting conditions sourced from constants", () => {
  it("P roughing vc/fn centers equal the canonical turning speed/feed (NOT inlined)", () => {
    const params = LatheToolpathTemplateEngine.buildParams("P", "rough");
    const vc = params.find((p) => p.param === "vc")!;
    const fn = params.find((p) => p.param === "fn")!;
    expect(vc.default).toBe(CANONICAL_TURNING_SPEEDS.P.rough); // 220
    expect(fn.default).toBe(CANONICAL_TURNING_FEEDS.P.rough);
    expect(vc.unit).toBe("m/min");
    expect(fn.unit).toBe("mm/rev");
  });

  it("N finishing vc center equals canonical finish speed (600) and uses the finish AP band", () => {
    const params = LatheToolpathTemplateEngine.buildParams("N", "finish");
    const vc = params.find((p) => p.param === "vc")!;
    const ap = params.find((p) => p.param === "ap")!;
    expect(vc.default).toBe(CANONICAL_TURNING_SPEEDS.N.finish); // 600
    expect(ap.max).toBe(0.6); // AP_FINISH.max — finishing is a shallow cut
  });

  it("vc band is ±25% of the canonical center (practical speed window)", () => {
    const params = LatheToolpathTemplateEngine.buildParams("S", "rough");
    const vc = params.find((p) => p.param === "vc")!;
    const c = CANONICAL_TURNING_SPEEDS.S.rough; // 35
    expect(vc.min).toBe(Math.round(c * 0.75 * 100) / 100);
    expect(vc.max).toBe(Math.round(c * 1.25 * 100) / 100);
    expect(vc.min).toBeLessThan(vc.default);
    expect(vc.default).toBeLessThan(vc.max);
  });
});

describe("LatheToolpathTemplateEngine.buildTemplate — cycle, CSS mode, safety gates per category", () => {
  it("roughing → G71 + G96 CSS + css-no-rpm-cap gate", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ category: "rough", iso_group: "P" });
    expect(t.cannedCycle).toBe("G71");
    expect(t.cssMode).toBe("G96");
    expect(t.safetyGates).toContain("css-no-rpm-cap");
    expect(t.machine).toBe("okuma-osp");
  });

  it("threading → G76 + G97 constant-RPM (NOT G96) + thread gate", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ category: "thread", iso_group: "P" });
    expect(t.cannedCycle).toBe("G76");
    expect(t.cssMode).toBe("G97"); // threading must be constant-RPM, not CSS
    expect(t.safetyGates).toContain("thread-g76");
  });

  it("boring → boring-bar-ld deflection gate present", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ category: "bore", iso_group: "M" });
    expect(t.safetyGates).toContain("boring-bar-ld");
  });

  it("grooving → G75 + partoff-no-peck gate", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ category: "groove", iso_group: "P" });
    expect(t.cannedCycle).toBe("G75");
    expect(t.safetyGates).toContain("partoff-no-peck");
  });

  it("notes carry the canonical Kienzle kc1.1/mc for the ISO group (force est, by reference)", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ category: "rough", iso_group: "H" });
    expect(t.notes).toContain(String(CANONICAL_KIENZLE.H.kc1_1)); // 3200
    expect(t.notes).toContain(String(CANONICAL_KIENZLE.H.mc));    // 0.3
  });

  it("by explicit strategyId resolves the right category", () => {
    const t = LatheToolpathTemplateEngine.buildTemplate({ strategyId: "turning_thread_single_point", iso_group: "P" });
    expect(t.category).toBe("thread");
    expect(t.cssMode).toBe("G97");
  });
});

describe("LatheToolpathTemplateEngine — full library + error paths", () => {
  it("buildAllTemplates covers EVERY catalog strategy with params + gates (templates for every type)", () => {
    const all = LatheToolpathTemplateEngine.buildAllTemplates({ iso_group: "P" });
    expect(all.length).toBe(TURNING_STRATEGY_CATALOG.length);
    expect(all.every((t) => t.params.length >= 2)).toBe(true);       // at least vc + fn
    expect(all.every((t) => t.safetyGates.length >= 1)).toBe(true);
    expect(all.every((t) => t.cannedCycle.startsWith("G"))).toBe(true);
  });

  it("listCategories covers all 8 turning categories", () => {
    const cats = LatheToolpathTemplateEngine.listCategories().sort();
    expect(cats).toEqual(["bore", "contour", "drill", "finish", "groove", "rough", "specialty", "thread"]);
  });

  it("unknown material throws (no silent fallback)", () => {
    expect(() => LatheToolpathTemplateEngine.buildTemplate({ category: "rough", material: "unobtanium" }))
      .toThrow(/Unknown material/);
  });

  it("no strategyId and no category throws", () => {
    // @ts-expect-error — exercising the runtime Zod refine guard
    expect(() => LatheToolpathTemplateEngine.buildTemplate({ iso_group: "P" })).toThrow();
  });

  it("unknown strategyId throws", () => {
    expect(() => LatheToolpathTemplateEngine.buildTemplate({ strategyId: "turning_does_not_exist" }))
      .toThrow(/Unknown strategyId/);
  });
});
