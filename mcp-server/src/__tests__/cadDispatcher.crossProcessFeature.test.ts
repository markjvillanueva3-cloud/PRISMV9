/**
 * cadDispatcher.crossProcessFeature.test.ts — U-XPROC-FEAT-01 dispatcher tests
 *
 * Round-trip tests for the cross-process feature bridge dispatcher actions:
 *   - cross_process_feature_route
 *   - cross_process_feature_options
 *   - cross_process_feature_known
 *
 * @see src/engines/CrossProcessFeatureBridge.ts
 * @see src/tools/dispatchers/cadDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool not registered");
  handler = tool.handler;
});

describe("cadDispatcher cross-process feature bridge (U-XPROC-FEAT-01)", () => {
  describe("cross_process_feature_known", () => {
    it("returns 12 known features in canonical order", async () => {
      const r = await invoke("cross_process_feature_known");
      expect(r.success).toBe(true);
      expect(r.count).toBe(12);
      const features = r.features as Array<{ feature: string }>;
      expect(features.map((f) => f.feature)).toEqual([
        "pocket_2d",
        "pocket_3d",
        "slot",
        "hole_drill",
        "hole_thread_internal",
        "hole_thread_external",
        "groove_external",
        "groove_internal",
        "profile_2d",
        "face_milling",
        "boring",
        "chamfer",
      ]);
    });
  });

  describe("cross_process_feature_options", () => {
    it("returns 3 process options for pocket_2d (mill primary)", async () => {
      const r = await invoke("cross_process_feature_options", { feature: "pocket_2d" });
      expect(r.success).toBe(true);
      expect(r.feature).toBe("pocket_2d");
      const options = r.options as Array<{ process: string; feasibility: string }>;
      expect(options).toHaveLength(3);
      const mill = options.find((o) => o.process === "mill");
      expect(mill?.feasibility).toBe("primary");
    });

    it("propagates unknown-feature error through dispatcher", async () => {
      const r = await invoke("cross_process_feature_options", {
        feature: "totally_made_up",
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/unknown feature/);
    });

    it("rejects missing feature param", async () => {
      const r = await invoke("cross_process_feature_options", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `feature`/);
    });
  });

  describe("cross_process_feature_route", () => {
    it("routes pocket_2d with all 3 process options + mill recommendation", async () => {
      const r = await invoke("cross_process_feature_route", { feature: "pocket_2d" });
      expect(r.success).toBe(true);
      expect(r.feature).toBe("pocket_2d");
      expect(r.recommended_process).toBe("mill");
      const options = r.process_options as Array<{ process: string }>;
      expect(options).toHaveLength(3);
    });

    it("routes groove_external with lathe recommendation", async () => {
      const r = await invoke("cross_process_feature_route", { feature: "groove_external" });
      expect(r.success).toBe(true);
      expect(r.recommended_process).toBe("lathe");
    });

    it("routes profile_2d with wedm recommendation", async () => {
      const r = await invoke("cross_process_feature_route", { feature: "profile_2d" });
      expect(r.success).toBe(true);
      expect(r.recommended_process).toBe("wedm");
    });

    it("filters processes when processes=['mill'] is supplied", async () => {
      const r = await invoke("cross_process_feature_route", {
        feature: "pocket_2d",
        processes: ["mill"],
      });
      expect(r.success).toBe(true);
      const options = r.process_options as Array<{ process: string }>;
      expect(options).toHaveLength(1);
      expect(options[0].process).toBe("mill");
    });

    it("returns no recommendation when filter excludes the canonical primary", async () => {
      // Engine returns null; slimResponse strips null → field is absent (undefined)
      // post-serialization. Both representations mean "no recommendation".
      const r = await invoke("cross_process_feature_route", {
        feature: "pocket_2d",
        processes: ["wedm"],
      });
      expect(r.success).toBe(true);
      expect(r.recommended_process == null).toBe(true);
      // And the only surviving process option is wedm (non-primary)
      const options = r.process_options as Array<{ process: string; feasibility: string }>;
      expect(options).toHaveLength(1);
      expect(options[0].process).toBe("wedm");
      expect(options[0].feasibility).toBe("alternate");
    });

    it("propagates engine error for invalid process filter", async () => {
      const r = await invoke("cross_process_feature_route", {
        feature: "pocket_2d",
        processes: ["bogus"],
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/invalid process/);
    });

    it("performs CAD coverage lookup when cad_operation_id is supplied", async () => {
      const r = await invoke("cross_process_feature_route", {
        feature: "pocket_2d",
        cad_operation_id: "EXTRUDE_CUT",
      });
      expect(r.success).toBe(true);
      const coverage = r.cad_coverage as Array<{ operation_id: string }>;
      expect(Array.isArray(coverage)).toBe(true);
      coverage.forEach((m) => {
        expect(m.operation_id).toBe("EXTRUDE_CUT");
      });
    });

    it("rejects missing feature param at dispatcher boundary", async () => {
      const r = await invoke("cross_process_feature_route", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `feature`/);
    });

    it("accepts camelCase featureId param (auto-normalized)", async () => {
      const r = await invoke("cross_process_feature_route", { featureId: "boring" });
      expect(r.success).toBe(true);
      expect(r.feature).toBe("boring");
    });
  });
});
