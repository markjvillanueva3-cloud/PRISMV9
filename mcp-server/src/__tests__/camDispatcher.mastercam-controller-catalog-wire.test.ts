/**
 * camDispatcher — MastercamControllerCatalogEngine wiring suite
 * =============================================================
 *
 * INDIA-POST-WIRE U-MASTERCAM-CTRL-CAT (india /loop 2026-05-22) — wires the
 * orphaned rich Mastercam controller catalog (E1204, 18 families / 70+ post
 * variants) into prism_cam. Prior state: the engine's own JSDoc declared
 * @actions mastercam_controller_list/lookup/... but those names route to a
 * DIFFERENT engine (BatchCAMControllerEngines via getEngine("mastercamCtrlCat"),
 * which exposes only .lookup()/.listControllers()). The 9-method E1204 catalog
 * (listFamilies/getFamily/search/byAxisCount/byCapability/getDialect/
 * getTribalTips/findForMachine/stats) had ZERO dispatcher refs.
 *
 * 9 actions mirror the Fusion360 controller-catalog wiring (cam_fusion360_*):
 *   cam_mastercam_controller_{list,get,search,by_axis,by_capability,
 *                             dialect,tribal_tips,find_for_machine,stats}
 *
 * Tests exercise the deterministic, no-I/O catalog surface end-to-end through
 * the dispatcher (z.enum gate → case → engine → JSON envelope) plus the
 * enum-membership guard (RGS-TOOL-AUTOINVOKE-MS1 false-green class).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

const MASTERCAM_CTRL_ACTIONS = [
  "cam_mastercam_controller_list",
  "cam_mastercam_controller_get",
  "cam_mastercam_controller_search",
  "cam_mastercam_controller_by_axis",
  "cam_mastercam_controller_by_capability",
  "cam_mastercam_controller_dialect",
  "cam_mastercam_controller_tribal_tips",
  "cam_mastercam_controller_find_for_machine",
  "cam_mastercam_controller_stats",
] as const;

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("U-MASTERCAM-CTRL-CAT — enum membership", () => {
  it("registers all 9 mastercam controller catalog actions in ACTIONS", () => {
    for (const a of MASTERCAM_CTRL_ACTIONS) {
      expect(ACTIONS).toContain(a);
    }
  });

  it("does not collide with the legacy BatchCAMControllerEngines actions", () => {
    // legacy mastercam_controller_lookup/list stay distinct (different engine)
    expect(ACTIONS).toContain("mastercam_controller_lookup");
    expect(MASTERCAM_CTRL_ACTIONS).not.toContain("mastercam_controller_lookup" as never);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. catalog round-trip through the dispatcher
// ─────────────────────────────────────────────────────────────────────
describe("U-MASTERCAM-CTRL-CAT — catalog dispatch", () => {
  it("list returns all 18 controller families with summary fields", async () => {
    const r = await call(server, "cam_mastercam_controller_list");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.families)).toBe(true);
    expect(r.data.families.length).toBe(18);
    const fanuc = r.data.families.find((f: any) => f.id === "fanuc");
    expect(fanuc.id).toBe("fanuc");
    expect(fanuc.manufacturer).toBe("FANUC Corporation");
    expect(typeof fanuc.variantCount).toBe("number");
    expect(fanuc.variantCount).toBeGreaterThan(0);
  });

  it("get resolves a known family by id", async () => {
    const r = await call(server, "cam_mastercam_controller_get", { id: "fanuc" });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe("fanuc");
    expect(r.data.family).not.toBeNull();
    expect(r.data.family.id).toBe("fanuc");
    expect(Array.isArray(r.data.family.variants)).toBe(true);
    expect(r.data.family.gCodeDialect).toBe("fanuc");
  });

  it("get returns no family for an unknown id (no throw)", async () => {
    const r = await call(server, "cam_mastercam_controller_get", { id: "no_such_controller" });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe("no_such_controller");
    // engine returns null; responseSlimmer drops null keys at transport — both encode "not found"
    expect(r.data.family == null).toBe(true);
  });

  it("search ranks matches by confidence (fanuc query)", async () => {
    const r = await call(server, "cam_mastercam_controller_search", { query: "fanuc" });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.matches)).toBe(true);
    expect(r.data.matches.length).toBeGreaterThan(0);
    // sorted descending by confidence
    for (let i = 1; i < r.data.matches.length; i++) {
      expect(r.data.matches[i - 1].confidence).toBeGreaterThanOrEqual(r.data.matches[i].confidence);
    }
    expect(r.data.matches[0].family.id).toBe("fanuc");
  });

  it("by_axis returns only variants meeting the minimum axis count", async () => {
    const r = await call(server, "cam_mastercam_controller_by_axis", { axes: 5 });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.matches)).toBe(true);
    expect(r.data.matches.length).toBeGreaterThan(0);
    for (const m of r.data.matches) {
      expect(m.variant.axisCount).toBeGreaterThanOrEqual(5);
    }
  });

  it("by_capability filters variants by a real capability tag", async () => {
    const r = await call(server, "cam_mastercam_controller_by_capability", { capability: "5axis" });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.matches)).toBe(true);
    expect(r.data.matches.length).toBeGreaterThan(0);
    for (const m of r.data.matches) {
      const caps = m.variant.capabilities.map((c: string) => c.toLowerCase());
      expect(caps.some((c: string) => c.includes("5axis"))).toBe(true);
    }
  });

  it("dialect returns G-code dialect features for a known family", async () => {
    const r = await call(server, "cam_mastercam_controller_dialect", { familyId: "fanuc" });
    expect(r.ok).toBe(true);
    expect(r.data.familyId).toBe("fanuc");
    expect(r.data.dialect).not.toBeNull();
    expect(typeof r.data.dialect).toBe("object");
  });

  it("tribal_tips returns shop-floor tips for a known family", async () => {
    const r = await call(server, "cam_mastercam_controller_tribal_tips", { familyId: "fanuc" });
    expect(r.ok).toBe(true);
    expect(r.data.familyId).toBe("fanuc");
    expect(Array.isArray(r.data.tips)).toBe(true);
    expect(r.data.tips.length).toBeGreaterThan(0);
    expect(typeof r.data.tips[0]).toBe("string");
  });

  it("find_for_machine resolves a controller from a machine name", async () => {
    const r = await call(server, "cam_mastercam_controller_find_for_machine", { machineName: "VMC" });
    expect(r.ok).toBe(true);
    expect(r.data.machineName).toBe("VMC");
    expect(r.data.match).not.toBeNull();
    expect(r.data.match.confidence).toBeGreaterThan(0);
    expect(typeof r.data.match.family.id).toBe("string");
    expect(r.data.match.family.id.length).toBeGreaterThan(0);
  });

  it("stats reports catalog-wide aggregates", async () => {
    const r = await call(server, "cam_mastercam_controller_stats");
    expect(r.ok).toBe(true);
    expect(r.data.families).toBe(18);
    expect(r.data.totalVariants).toBeGreaterThan(0);
    expect(r.data.dialects).toBeGreaterThan(0);
    expect(r.data.totalTribalTips).toBeGreaterThan(0);
    expect(typeof r.data.byAxis).toBe("object");
  });
});
