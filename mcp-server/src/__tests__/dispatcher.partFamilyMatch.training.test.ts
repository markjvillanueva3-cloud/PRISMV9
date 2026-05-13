/**
 * dispatcher.partFamilyMatch.training.test.ts — round-trip integration
 * coverage for TRAINING-LEARNING-MS0/U-TL-U5-DOMAIN-MATCHERS dispatcher wiring.
 *
 * Drives the three new matcher actions through their real dispatchers:
 *   - prism_turning:lathe_part_family_match → LathePartFamilyMatcherEngine.matchPartFamily
 *   - prism_cam:mill_part_family_match      → MillPartFamilyMatcherEngine.matchPartFamily
 *   - prism_edm:wedm_part_family_match      → WEDMPartFamilyMatcherEngine.matchPartFamily
 *
 * Closes the wiring gap that engine-only tests can't catch: a rename of the
 * matcher engine's `matchPartFamily` method would silently break the action
 * enum without failing any unit test — this file is the wiring guard.
 *
 * Asserts the dispatcher's `success` flag is bridged from the engine's
 * discriminated `{ok: true|false}` shape:
 *   - engine ok:true  → result.success === true
 *   - engine ok:false → result.success === false (plus error/detail surfaced
 *     at the dispatcher level, not buried inside data).
 *
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let turningHandler: CapturedTool["handler"];
let camHandler: CapturedTool["handler"];
let edmHandler: CapturedTool["handler"];

beforeAll(() => {
  const turningSrv = makeStubServer();
  registerTurningDispatcher(turningSrv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = turningSrv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;

  const camSrv = makeStubServer();
  registerCamDispatcher(camSrv as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const c = camSrv.tools.find((x) => x.name === "prism_cam");
  if (!c) throw new Error("prism_cam not registered");
  camHandler = c.handler;

  const edmSrv = makeStubServer();
  registerEdmDispatcher(edmSrv as unknown as Parameters<typeof registerEdmDispatcher>[0]);
  const e = edmSrv.tools.find((x) => x.name === "prism_edm");
  if (!e) throw new Error("prism_edm not registered");
  edmHandler = e.handler;
});

describe("prism_turning :: lathe_part_family_match", () => {
  it("happy path: shaft descriptor → success:true, matches non-empty, top family=shaft", async () => {
    const r = await invokeHandler(turningHandler, "lathe_part_family_match", {
      descriptor: {
        kind: "shaft",
        material: "AISI 1045",
        features: ["od-turning", "shoulder", "keyway"],
        source_filename: "drive-shaft-A.min",
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: true; matches: Array<{ family: string; similarity: number }> };
    expect(data.ok).toBe(true);
    expect(data.matches.length).toBeGreaterThan(0);
    expect(data.matches[0].family).toBe("shaft");
    expect(data.matches[0].similarity).toBeGreaterThan(0);
  });

  it("descriptor as flat params (not nested) is accepted via fallback", async () => {
    const r = await invokeHandler(turningHandler, "lathe_part_family_match", {
      kind: "shaft",
      material: "1045",
      keywordsOnly: true,
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: true; matches: Array<{ family: string }> };
    expect(data.matches[0].family).toBe("shaft");
  });

  it("empty descriptor → success:false, error=empty_descriptor surfaced at dispatcher level", async () => {
    const r = await invokeHandler(turningHandler, "lathe_part_family_match", {
      descriptor: {},
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("empty_descriptor");
  });

  it("topK option is respected (snake_case alias accepted)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_part_family_match", {
      descriptor: { kind: "shaft", material: "1045", features: ["shoulder"] },
      opts: { keywords_only: true, top_k: 3, min_similarity: 0 },
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches: Array<unknown> };
    expect(data.matches.length).toBe(3);
  });
});

describe("prism_cam :: mill_part_family_match", () => {
  it("happy path: plate descriptor → success:true, top family=plate", async () => {
    const r = await invokeHandler(camHandler, "mill_part_family_match", {
      descriptor: {
        kind: "plate",
        material: "Mic-6 aluminum",
        features: ["face", "surface-mill", "large-flat"],
        source_filename: "fixture-plate-base.sldprt",
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: true; matches: Array<{ family: string; similarity: number }> };
    expect(data.ok).toBe(true);
    expect(data.matches[0].family).toBe("plate");
    expect(data.matches[0].similarity).toBeGreaterThan(0);
  });

  it("flat-params fallback works for mill", async () => {
    const r = await invokeHandler(camHandler, "mill_part_family_match", {
      kind: "electrode-mill",
      material: "Copper C110",
      keywordsOnly: true,
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches: Array<{ family: string }> };
    expect(data.matches[0].family).toBe("electrode-mill");
  });

  it("empty descriptor → success:false, error=empty_descriptor", async () => {
    const r = await invokeHandler(camHandler, "mill_part_family_match", {
      descriptor: {},
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("empty_descriptor");
  });

  it("ranks aerospace-bracket for thin-wall titanium descriptor", async () => {
    const r = await invokeHandler(camHandler, "mill_part_family_match", {
      descriptor: {
        kind: "aerospace-bracket",
        material: "Ti-6Al-4V titanium",
        features: ["thin-wall", "lightening-pocket", "web"],
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches: Array<{ family: string }> };
    expect(data.matches[0].family).toBe("aerospace-bracket");
  });
});

describe("prism_edm :: wedm_part_family_match", () => {
  it("happy path: punch-die descriptor → success:true, top family=punch-die", async () => {
    const r = await invokeHandler(edmHandler, "wedm_part_family_match", {
      descriptor: {
        kind: "punch-die",
        material: "D2 tool steel",
        features: ["punch", "die", "blanking"],
        source_filename: "blanking-punch-A.dxf",
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: true; matches: Array<{ family: string; similarity: number }> };
    expect(data.ok).toBe(true);
    expect(data.matches[0].family).toBe("punch-die");
    expect(data.matches[0].similarity).toBeGreaterThan(0);
  });

  it("ranks pcd-tipped-tooling for a PCD descriptor", async () => {
    const r = await invokeHandler(edmHandler, "wedm_part_family_match", {
      descriptor: {
        kind: "pcd",
        material: "PCD polycrystalline diamond",
        features: ["pcd-tip", "diamond", "extreme-tolerance"],
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches: Array<{ family: string }> };
    expect(data.matches[0].family).toBe("pcd-tipped-tooling");
  });

  it("ranks aerospace-fir-tree for an Inconel turbine-blade descriptor", async () => {
    const r = await invokeHandler(edmHandler, "wedm_part_family_match", {
      descriptor: {
        kind: "fir-tree",
        material: "Inconel 718",
        features: ["fir-tree", "blade-root", "turbine-airfoil"],
      },
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches: Array<{ family: string }> };
    expect(data.matches[0].family).toBe("aerospace-fir-tree");
  });

  it("empty descriptor → success:false, error=empty_descriptor", async () => {
    const r = await invokeHandler(edmHandler, "wedm_part_family_match", {
      descriptor: {},
      opts: { keywordsOnly: true },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("empty_descriptor");
  });
});

describe("cross-domain action enum integrity", () => {
  it("all 3 matcher actions are accepted by their dispatchers", async () => {
    // Each dispatcher rejects unknown actions; getting a typed result (not a
    // schema error) proves the action is in the z.enum allowlist.
    const lathe = await invokeHandler(turningHandler, "lathe_part_family_match", {
      kind: "shaft",
      material: "1045",
      keywordsOnly: true,
    });
    const mill = await invokeHandler(camHandler, "mill_part_family_match", {
      kind: "plate",
      material: "6061",
      keywordsOnly: true,
    });
    const wedm = await invokeHandler(edmHandler, "wedm_part_family_match", {
      kind: "punch-die",
      material: "D2",
      keywordsOnly: true,
    });
    expect(lathe.success).toBe(true);
    expect(mill.success).toBe(true);
    expect(wedm.success).toBe(true);
  });
});
