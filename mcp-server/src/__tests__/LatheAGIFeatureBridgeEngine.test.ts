/**
 * LatheAGIFeatureBridgeEngine tests — U-LTH58
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LatheAGIFeatureBridgeEngine,
  AGI_FEATURES,
} from "../engines/LatheAGIFeatureBridgeEngine.js";

function makeEngine() {
  const dir = mkdtempSync(join(tmpdir(), "agi-bridge-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheAGIFeatureBridgeEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheAGIFeatureBridgeEngine — feature enumeration", () => {
  it("exposes exactly 5 features", () => {
    expect(AGI_FEATURES.length).toBe(5);
    expect([...AGI_FEATURES].sort()).toEqual(
      ["erp", "masterpost", "postgen", "print_to_program", "speed_feed"],
    );
  });
});

describe("LatheAGIFeatureBridgeEngine — speed_feed reasoner", () => {
  it("produces ≥5 trace steps and confidence in [0.5, 1]", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "speed_feed",
      context: { iso_group: "P", ap_mm: 2.0, fz_mm: 0.3, vc_hint_m_min: 180 },
    });
    expect(result.trace.length).toBeGreaterThanOrEqual(5);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.feature).toBe("speed_feed");
    expect(result.prediction.fc_n).toBeGreaterThan(0);
  });

  it("surfaces 'Taylor life < 5 min' insight when Vc is too high", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "speed_feed",
      context: { iso_group: "P", ap_mm: 2.0, fz_mm: 0.3, vc_hint_m_min: 900 },
    });
    expect(result.novel_insights.some((s) => s.includes("Taylor life"))).toBe(true);
  });

  it("rejects invalid iso_group", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.reason({ feature: "speed_feed", context: { iso_group: "Z" } }),
    ).toThrow(/invalid iso_group/);
  });

  it("rejects NaN ap", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.reason({
        feature: "speed_feed",
        context: { iso_group: "P", ap_mm: Number.NaN, fz_mm: 0.3, vc_hint_m_min: 180 },
      }),
    ).toThrow(/positive finite/);
  });
});

describe("LatheAGIFeatureBridgeEngine — postgen reasoner", () => {
  it("resolves known controller 'okuma_osp' with high confidence", () => {
    const { engine } = makeEngine();
    const result = engine.reason({ feature: "postgen", context: { controller: "okuma_osp" } });
    expect(result.prediction.controller).toBe("okuma_osp");
    expect(result.prediction.file_extension).toBe(".min");
    expect(result.confidence).toBe(0.9);
  });

  it("falls back to generic on unknown controller with soft warning", () => {
    const { engine } = makeEngine();
    const result = engine.reason({ feature: "postgen", context: { controller: "made_up" } });
    expect(result.prediction.controller).toBe("generic");
    expect(result.novel_insights.some((s) => s.includes("Unknown controller"))).toBe(true);
  });
});

describe("LatheAGIFeatureBridgeEngine — masterpost reasoner", () => {
  it("routes swiss → swiss_multichannel", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "masterpost",
      context: { machine_type: "swiss_cnc_lathe", has_live_tool: true, has_sub_spindle: true },
    });
    expect(result.prediction.post_pattern).toBe("swiss_multichannel");
  });

  it("routes complex kinematic → twin_spindle_post", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "masterpost",
      context: { machine_type: "turret_lathe", has_live_tool: true, has_sub_spindle: true },
    });
    expect(result.prediction.post_pattern).toBe("twin_spindle_post");
  });
});

describe("LatheAGIFeatureBridgeEngine — print_to_program reasoner", () => {
  it("tight tolerance (<0.02mm) → finish_single_pass", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "print_to_program",
      context: { feature_type: "od_turn", tolerance_mm: 0.01, ra_um_target: 0.4, iso_group: "P" },
    });
    expect(result.prediction.strategy).toBe("finish_single_pass");
  });

  it("standard tolerance → rough_then_finish", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "print_to_program",
      context: { feature_type: "od_turn", tolerance_mm: 0.1, ra_um_target: 3.2, iso_group: "P" },
    });
    expect(result.prediction.strategy).toBe("rough_then_finish");
  });

  it("ISO S (superalloy) adds ceramic-insert insight", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "print_to_program",
      context: { feature_type: "od_turn", tolerance_mm: 0.05, ra_um_target: 1.6, iso_group: "S" },
    });
    expect(result.novel_insights.some((s) => s.includes("ceramic"))).toBe(true);
  });
});

describe("LatheAGIFeatureBridgeEngine — erp reasoner", () => {
  it("5% variance → accept", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "erp",
      context: { quoted_unit_usd: 100, actual_unit_usd: 105, quantity: 10 },
    });
    expect(result.prediction.action).toBe("accept");
    expect(result.prediction.variance_pct).toBe(5);
  });

  it("15% variance → flag_review", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "erp",
      context: { quoted_unit_usd: 100, actual_unit_usd: 115, quantity: 10 },
    });
    expect(result.prediction.action).toBe("flag_review");
  });

  it("25% variance → block_until_approval", () => {
    const { engine } = makeEngine();
    const result = engine.reason({
      feature: "erp",
      context: { quoted_unit_usd: 100, actual_unit_usd: 125, quantity: 10 },
    });
    expect(result.prediction.action).toBe("block_until_approval");
  });

  it("rejects zero quoted_unit_usd", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.reason({ feature: "erp", context: { quoted_unit_usd: 0, actual_unit_usd: 100, quantity: 1 } }),
    ).toThrow(/positive/);
  });
});

describe("LatheAGIFeatureBridgeEngine — call history + persistence", () => {
  it("records every call with step count and confidence", () => {
    const { engine } = makeEngine();
    engine.reason({ feature: "speed_feed", context: { iso_group: "P", ap_mm: 2, fz_mm: 0.3, vc_hint_m_min: 180 } });
    const history = engine.history();
    expect(history).toHaveLength(1);
    expect(history[0].feature).toBe("speed_feed");
    expect(history[0].step_count).toBeGreaterThanOrEqual(5);
  });

  it("confidenceStats returns per-feature mean/min/max after calls", () => {
    const { engine } = makeEngine();
    engine.reason({ feature: "speed_feed", context: { iso_group: "P", ap_mm: 2, fz_mm: 0.3, vc_hint_m_min: 180 } });
    engine.reason({ feature: "postgen", context: { controller: "fanuc" } });
    const stats = engine.confidenceStats();
    expect(stats.speed_feed.count).toBe(1);
    expect(stats.postgen.count).toBe(1);
    expect(stats.speed_feed.mean_confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("state survives new engine instance", () => {
    const { engine, statePath } = makeEngine();
    engine.reason({ feature: "postgen", context: { controller: "haas" } });
    expect(existsSync(statePath)).toBe(true);
    const engine2 = new LatheAGIFeatureBridgeEngine(statePath);
    expect(engine2.__getState().calls).toHaveLength(1);
  });
});

describe("LatheAGIFeatureBridgeEngine — dispatcher wiring", () => {
  it("lathe_agi_reason action wired with handler + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_agi_reason"');
    expect(src).toMatch(/case "lathe_agi_reason"/);
    expect(src).toContain('"../../engines/LatheAGIFeatureBridgeEngine.js"');
    expect(src).toContain('case "latheAGIBridge"');
  });
});
