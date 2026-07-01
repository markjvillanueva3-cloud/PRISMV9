/**
 * qualityDispatcher → psn_synergy_inspect — wiring integration test
 *
 * Verifies WIRE-UNWIRED/U-WIRE-PSNSynergyInspector: the engine was unwired on disk
 * (per UNWIRED-ENGINE-AUDIT-2026-05-07.json) before romeo wired it into
 * prism_quality. This test pins the wiring shape so regressions surface fast.
 *
 * Tests the round-trip:
 *   action enum → schema validation → lazy import → engine call → summary + report
 */

import { describe, it, expect } from "vitest";
import { QUALITY_ACTION_SCHEMAS } from "../schemas/qualityActionSchemas.js";
import type { PSNLegInventory } from "../engines/PSNSynergyInspectorEngine.js";

interface PsnSynergyInspectParams {
  inventories: PSNLegInventory[];
  topK?: number;
  densityFloor?: number;
}

describe("qualityDispatcher · psn_synergy_inspect (WIRE-UNWIRED romeo)", () => {
  describe("schema registration", () => {
    it("registers psn_synergy_inspect with a safeParse method in QUALITY_ACTION_SCHEMAS", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      expect(typeof schema?.safeParse).toBe("function");
    });

    it("accepts a minimal valid inventory payload", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      const parsed = schema.safeParse({
        inventories: [
          { leg: "engines", node_count: 10, cross_refs: { wiki: 5 } },
          { leg: "wiki",    node_count: 20, cross_refs: { engines: 5 } },
        ],
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects an empty inventories array", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      const parsed = schema.safeParse({ inventories: [] });
      expect(parsed.success).toBe(false);
    });

    it("rejects an inventory entry with an unknown leg name", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      const parsed = schema.safeParse({
        inventories: [{ leg: "made_up_leg", node_count: 1, cross_refs: {} }],
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects negative node_count", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      const parsed = schema.safeParse({
        inventories: [{ leg: "engines", node_count: -1, cross_refs: {} }],
      });
      expect(parsed.success).toBe(false);
    });

    it("accepts optional topK and densityFloor", () => {
      const schema = QUALITY_ACTION_SCHEMAS.psn_synergy_inspect;
      const parsed = schema.safeParse({
        inventories: [{ leg: "engines", node_count: 1, cross_refs: {} }],
        topK: 5,
        densityFloor: 0.005,
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("dispatcher round-trip via lazy-imported engine", () => {
    it("end-to-end inspect returns { summary, report } with the expected shape", async () => {
      // Mirror the dispatcher case body so the test fails the same way the
      // dispatcher would if the engine API drifts (R12 fail-loud).
      const mod = await import("../engines/PSNSynergyInspectorEngine.js");
      const params: PsnSynergyInspectParams = {
        inventories: [
          { leg: "engines",  node_count: 100, cross_refs: { wiki: 50, memories: 20 } },
          { leg: "wiki",     node_count: 200, cross_refs: { engines: 60 } },
          { leg: "memories", node_count: 150, cross_refs: { engines: 25, wiki: 35 } },
          { leg: "nn_gnn",   node_count:  10, cross_refs: {} }, // isolated → P0_critical pairs expected
        ],
        topK: 3,
      };
      const opts: { topK?: number; densityFloor?: number } = {};
      if (typeof params.topK === "number") opts.topK = params.topK;
      if (typeof params.densityFloor === "number") opts.densityFloor = params.densityFloor;
      const report = mod.psnSynergyInspectorEngine.inspect(params.inventories, opts);
      const summary = mod.psnSynergyInspectorEngine.summarize(report);
      const result = { summary, report };

      expect(result.report.schemaVersion).toBe("1.0.0");
      expect(result.report.total_legs).toBe(4);
      expect(result.report.pairs.length).toBe(6); // C(4,2)
      expect(result.report.top_under_wired.length).toBeLessThanOrEqual(3);
      expect(result.summary.legs).toBe(4);
      expect(result.summary.pairs).toBe(6);
      // nn_gnn is isolated from all 3 peers → should produce P0_critical pairs.
      expect(result.summary.p0_critical).toBeGreaterThan(0);
      expect(result.summary.most_isolated_leg).toBe("nn_gnn");
    });

    it("dispatcher's `case psn_synergy_inspect` is registered in qualityDispatcher ACTIONS", async () => {
      // Pin the action enum so a future ACTIONS-array edit doesn't silently drop the wire.
      const src = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../tools/dispatchers/qualityDispatcher.ts", import.meta.url), "utf8")
      );
      expect(src).toMatch(/"psn_synergy_inspect"/);
      expect(src).toMatch(/case "psn_synergy_inspect":/);
      expect(src).toMatch(/PSNSynergyInspectorEngine\.js/);
    });
  });
});
