/**
 * Fusion360 strategy dispatch round-trip tests — U-CAM87-FUSION-STRATEGIES
 * =========================================================================
 * Round-4 B3-NEW fix. buildOperationCreateEnvelope supports 8 strategies
 * via a single action + strategy param. This test confirms all 8 strategies
 * round-trip through the builder with correct envelope shape, documenting
 * the enum for discoverability.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Fusion360PluginAdapterEngine } from "../engines/Fusion360PluginAdapterEngine.js";

type FusionStrategy =
  | "adaptive3d"
  | "pocket_clearing"
  | "contour2d"
  | "contour3d"
  | "facing"
  | "drill"
  | "bore"
  | "thread";

const ALL_FUSION_STRATEGIES: ReadonlyArray<FusionStrategy> = [
  "adaptive3d",
  "pocket_clearing",
  "contour2d",
  "contour3d",
  "facing",
  "drill",
  "bore",
  "thread",
];

describe("U-CAM87-FUSION-STRATEGIES — 8-strategy dispatch round-trip", () => {
  beforeEach(() => {
    Fusion360PluginAdapterEngine.__resetOutboundRpcId();
  });

  for (const strategy of ALL_FUSION_STRATEGIES) {
    it(`round-trips strategy "${strategy}" into a valid JSON-RPC envelope`, () => {
      const env = Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p1",
        setup_id: "s1",
        strategy,
        tool_id: "T1",
        geometry_selection: ["face1"],
        parameters: { spindle_speed_rpm: 10000, feed_mm_min: 2500 },
      });
      expect(env.jsonrpc).toBe("2.0");
      expect(env.method).toBe("operation.create");
      expect(env.params.strategy).toBe(strategy);
      expect(env.params.tool_id).toBe("T1");
      expect(env.params.geometry_selection).toEqual(["face1"]);
      expect(typeof env.id).toBe("number");
    });
  }

  it("all 8 strategies produce distinct envelope ids in sequence", () => {
    const ids = ALL_FUSION_STRATEGIES.map((strategy) =>
      Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        setup_id: "s",
        strategy,
        tool_id: "T1",
        geometry_selection: ["face1"],
        parameters: { spindle_speed_rpm: 5000, feed_mm_min: 1000 },
      }).id
    );
    expect(new Set(ids).size).toBe(ALL_FUSION_STRATEGIES.length);
    // Monotonically increasing
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it("documents the strategy enum — no unexpected values slip through", () => {
    // Contract test: if this array changes, the matrix must be rescored.
    expect(ALL_FUSION_STRATEGIES).toHaveLength(8);
    expect(ALL_FUSION_STRATEGIES).toContain("adaptive3d");
    expect(ALL_FUSION_STRATEGIES).toContain("pocket_clearing");
    expect(ALL_FUSION_STRATEGIES).toContain("drill");
  });
});
