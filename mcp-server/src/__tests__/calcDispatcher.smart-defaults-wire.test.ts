/**
 * calcDispatcher × SmartDefaultsEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: SmartDefaultsEngine was an orphan — built (179 LoC, 7 methods,
 * 18-material SFM table, existing engine tests at smart-defaults-engine.test.ts).
 *
 * After this wire: 7 prism_calc actions surface context-aware defaults:
 *   smart_defaults_get          — full machining defaults (RPM, feed, DOC, WOC, coolant)
 *   smart_defaults_sfm          — SFM baseline (material × tool material)
 *   smart_defaults_chipload     — default chip load by diameter (nearest-neighbor)
 *   smart_defaults_engagement   — DOC/WOC inches (material × operation)
 *   smart_defaults_coolant      — coolant recommendation by material
 *   smart_defaults_materials    — list 18 supported material keys
 *   smart_defaults_oneliner     — compact "<mat> Øx <fl>fl: RPM=N F=M DOC=A WOC=B coolant"
 *
 * Engine constants (from source, used as canonical references):
 *   SFM_DEFAULTS[6061][carbide] = 800
 *   SFM_DEFAULTS[ti6al4v][carbide] = 130
 *   CHIPLOAD_DEFAULTS[0.5] = 0.004
 *   coolant("aluminum") = "flood"; coolant("titanium") = "high-pressure flood"
 *
 * NOT Kienzle/Taylor coefficients — SFM is a different physical quantity
 * (cutting speed baseline from machinist reference tables).
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-SMART-DEFAULTS
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

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
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("calcDispatcher × SmartDefaultsEngine wire (U-ORPHAN-RESCUE-SMART-DEFAULTS)", () => {
  // ── smart_defaults_sfm ─────────────────────────────────────────────────
  it("sfm — 6061 + carbide → 800 (engine SFM_DEFAULTS canonical)", async () => {
    const r = await call(server, "smart_defaults_sfm", { material: "6061" });
    expect(r.ok).toBe(true);
    expect(r.data.sfm).toBe(800);
  });

  it("sfm — ti6al4v + carbide → 130 (titanium is slow)", async () => {
    const r = await call(server, "smart_defaults_sfm", { material: "ti6al4v" });
    expect(r.data.sfm).toBe(130);
  });

  it("sfm — unknown material falls back to steel→carbide=400", async () => {
    const r = await call(server, "smart_defaults_sfm", { material: "unknown-alloy" });
    expect(r.data.sfm).toBe(400);
  });

  // ── smart_defaults_chipload ────────────────────────────────────────────
  it("chipload — exact 0.5\" lookup → 0.004", async () => {
    const r = await call(server, "smart_defaults_chipload", { diameter: 0.5 });
    expect(r.data.chipload_in).toBe(0.004);
  });

  it("chipload — nearest-neighbor for non-table diameter", async () => {
    // 0.6 → nearest of {0.625, 0.5} → 0.625 (|0.025| < |0.1|) → 0.005
    const r = await call(server, "smart_defaults_chipload", { diameter: 0.6 });
    expect(r.data.chipload_in).toBe(0.005);
  });

  // ── smart_defaults_coolant ─────────────────────────────────────────────
  it("coolant — aluminum → 'flood'", async () => {
    const r = await call(server, "smart_defaults_coolant", { material: "aluminum" });
    expect(r.data.coolant).toBe("flood");
  });

  it("coolant — titanium → 'high-pressure flood'", async () => {
    const r = await call(server, "smart_defaults_coolant", { material: "titanium" });
    expect(r.data.coolant).toBe("high-pressure flood");
  });

  it("coolant — plastic → 'air blast'", async () => {
    const r = await call(server, "smart_defaults_coolant", { material: "delrin" });
    expect(r.data.coolant).toBe("air blast");
  });

  // ── smart_defaults_engagement ──────────────────────────────────────────
  it("engagement — 0.5\" milling on 6061 (soft, factors 1.5/0.6) → doc=0.75 woc=0.3", async () => {
    const r = await call(server, "smart_defaults_engagement", {
      diameter: 0.5, material: "6061",
    });
    const e = r.data.engagement as Record<string, number>;
    // doc = 0.5 * 1.5 = 0.75 ; woc = 0.5 * 0.6 = 0.3
    expect(e.doc).toBe(0.75);
    expect(e.woc).toBe(0.3);
  });

  it("engagement — titanium (hard, 0.5/0.25) cuts DOC/WOC in half vs aluminum", async () => {
    const r = await call(server, "smart_defaults_engagement", {
      diameter: 0.5, material: "titanium",
    });
    const e = r.data.engagement as Record<string, number>;
    // doc = 0.5 * 0.5 = 0.25 ; woc = 0.5 * 0.25 = 0.125
    expect(e.doc).toBe(0.25);
    expect(e.woc).toBe(0.125);
  });

  it("engagement — finishing multiplies docFactor×0.2, wocFactor×0.3", async () => {
    const r = await call(server, "smart_defaults_engagement", {
      diameter: 0.5, material: "1018", operation: "finishing",
    });
    const e = r.data.engagement as Record<string, number>;
    // matKey=1018 not in any list -> default 1.0/0.5 → finishing 0.2/0.15
    // doc = 0.5 * 1.0 * 0.2 = 0.1 ; woc = 0.5 * 0.5 * 0.3 = 0.075
    expect(e.doc).toBe(0.1);
    expect(e.woc).toBe(0.075);
  });

  // ── smart_defaults_get (full defaults) ─────────────────────────────────
  it("get — 6061 0.5\" carbide 3fl milling → rpm + feed + doc + woc + coolant", async () => {
    const r = await call(server, "smart_defaults_get", {
      material: "6061", tool_diameter: 0.5,
    });
    const d = r.data.defaults as Record<string, unknown>;
    // SFM=800, rpm=round(800*3.8197/0.5)=6112
    expect(d.rpm).toBe(Math.round((800 * 3.8197) / 0.5));
    expect(d.coolant).toBe("flood");
    expect(typeof d.feed_ipm).toBe("number");
    expect((d.doc_in as number) > 0).toBe(true);
    expect((d.woc_in as number) > 0).toBe(true);
  });

  // ── smart_defaults_materials ───────────────────────────────────────────
  it("materials — lists all 17 SFM_DEFAULTS keys", async () => {
    const r = await call(server, "smart_defaults_materials");
    const mats = r.data.materials as string[];
    // Engine SFM_DEFAULTS canonical count: 6061, 7075, aluminum, 1018, 4140, 4340,
    // steel, stainless, 304, 316, titanium, ti6al4v, inconel, brass, copper,
    // plastic, delrin = 17 entries.
    expect(mats.length).toBe(17);
    expect(mats).toContain("6061");
    expect(mats).toContain("ti6al4v");
    expect(mats).toContain("inconel");
  });

  // ── smart_defaults_oneliner ────────────────────────────────────────────
  it("oneliner — formatted summary string with material+diameter+RPM+coolant", async () => {
    const r = await call(server, "smart_defaults_oneliner", {
      material: "6061", diameter: 0.5,
    });
    const line = r.data.line as string;
    expect(line).toContain("6061");
    expect(line).toContain("Ø0.5");
    expect(line).toContain("RPM=");
    expect(line).toContain("flood");
  });

  // ── schema validation ────────────────────────────────────────────────
  it("schema rejects empty material", async () => {
    const r = await call(server, "smart_defaults_get", { material: "", tool_diameter: 0.5 });
    expect(r.ok).toBe(false);
  });

  it("schema rejects negative tool_diameter", async () => {
    const r = await call(server, "smart_defaults_get", { material: "6061", tool_diameter: -1 });
    expect(r.ok).toBe(false);
  });

  it("schema rejects unknown operation enum", async () => {
    const r = await call(server, "smart_defaults_engagement", {
      diameter: 0.5, material: "6061", operation: "drilling",
    });
    expect(r.ok).toBe(false);
  });

  // ── all 7 actions accepted ───────────────────────────────────────────
  it("all 7 smart_defaults_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["smart_defaults_get",         { material: "6061", tool_diameter: 0.5 }],
      ["smart_defaults_sfm",         { material: "6061" }],
      ["smart_defaults_chipload",    { diameter: 0.5 }],
      ["smart_defaults_engagement",  { diameter: 0.5, material: "6061" }],
      ["smart_defaults_coolant",     { material: "6061" }],
      ["smart_defaults_materials",   {}],
      ["smart_defaults_oneliner",    { material: "6061", diameter: 0.5 }],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
