/**
 * cadAutomationDispatcher.test.ts — U-CAUT11 unit tests
 *
 * Tests exercise the dispatcher through a stub MCP server that captures the
 * tool handler, then invoke every action under PRISM_CAD_MOCK=1 so the router
 * short-circuits to the CADAutomationMockLayer. This validates:
 *   - registration succeeds and the tool name/schema are well-formed
 *   - every enumerated action has a working case branch
 *   - schema validation rejects bad inputs
 *   - mock-layer passthrough actions return fingerprint-stable data
 */

import { describe, it, expect, beforeAll } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
  type CadAutomationAction,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

// ─ Stub MCP server — captures { name, description, schema, handler } ─────────

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
  const res = await handler({ action, params });
  const text = res.content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(server as any);
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

// ─ Tests ───────────────────────────────────────────────────────────────────────

describe("registration", () => {
  it("registers under the canonical tool name", () => {
    expect(handler).toBeDefined();
  });

  it("exposes at least the original 14 actions in CAD_AUTOMATION_ACTIONS (anti-regression floor)", () => {
    // Later units added AI-control / planner / decomposer actions; the
    // only invariant is we never drop below the original 14.
    expect(CAD_AUTOMATION_ACTIONS.length).toBeGreaterThanOrEqual(14);
  });

  it("action list contains the canonical action names", () => {
    const expected: CadAutomationAction[] = [
      "route",
      "list_supported_extensions",
      "supports_extension",
      "open",
      "close",
      "get_geometry",
      "get_operation_tree",
      "get_toolpaths",
      "export_step",
      "mock_geometry",
      "mock_operation_tree",
      "mock_toolpaths",
      "mock_fingerprint",
      "mock_all_fingerprints",
    ];
    for (const a of expected) expect(CAD_AUTOMATION_ACTIONS).toContain(a);
  });
});

describe("route / list_supported_extensions / supports_extension", () => {
  it("route() resolves a file path to bridge+ext", async () => {
    const r = await invoke("route", { filePath: "core.hmc" });
    expect(r["bridge"]).toBe("hypermill");
    expect(r["ext"]).toBe(".hmc");
  });

  it("list_supported_extensions() returns 12 extensions", async () => {
    const r = await invoke("list_supported_extensions", {});
    const exts = r["extensions"] as string[];
    expect(Array.isArray(exts)).toBe(true);
    expect(exts.length).toBe(12);
  });

  it("supports_extension() is case-insensitive and truthful", async () => {
    const ok = await invoke("supports_extension", { ext: ".HMC" });
    expect(ok["supported"]).toBe(true);
    const no = await invoke("supports_extension", { ext: ".xlsx" });
    expect(no["supported"]).toBe(false);
  });
});

describe("open / data-access / close lifecycle", () => {
  it("open → get_geometry → get_operation_tree → close round-trip", async () => {
    const filePath = "C:/parts/core.hmc";
    const o = await invoke("open", { filePath });
    expect((o["value"] as Record<string, unknown>)["filePath"]).toBe(filePath);

    const g = await invoke("get_geometry", { filePath });
    const gVal = g["value"] as Record<string, number>;
    expect(gVal["totalEntities"]).toBe(56);

    const t = await invoke("get_operation_tree", { filePath });
    const tVal = t["value"] as Record<string, unknown>;
    expect(tVal["totalOperations"]).toBe(32);

    const tp = await invoke("get_toolpaths", { filePath });
    // slimResponse may wrap long arrays as { _items, _total, _showing }
    const tpVal = tp["value"] as unknown;
    const tpCount = Array.isArray(tpVal)
      ? tpVal.length
      : ((tpVal as Record<string, number>)["_total"] ?? (tpVal as Record<string, unknown[]>)["_items"]?.length);
    expect(tpCount).toBe(32);

    const c = await invoke("close", { filePath });
    expect((c["value"] as Record<string, unknown>)["closed"]).toBe(true);
  });

  it("export_step returns AP242 envelope", async () => {
    await invoke("open", { filePath: "C:/parts/e.f3d" });
    const r = await invoke("export_step", {
      filePath: "C:/parts/e.f3d",
      outputPath: "C:/out/e.step",
    });
    const v = r["value"] as Record<string, unknown>;
    expect(v["outputPath"]).toBe("C:/out/e.step");
    expect(v["format"]).toBe("STEP AP242");
  });
});

describe("mock-layer passthrough actions", () => {
  it("mock_geometry resolves via filePath", async () => {
    const r = await invoke("mock_geometry", { filePath: "foo.hmc" });
    expect(r["ext"]).toBe(".hmc");
    expect(r["totalEntities"]).toBe(56);
  });

  it("mock_geometry resolves via ext only", async () => {
    const r = await invoke("mock_geometry", { ext: ".FCStd" });
    expect(r["ext"]).toBe(".FCStd");
    expect(r["totalEntities"]).toBe(46);
  });

  it("mock_fingerprint returns stable string", async () => {
    const a = await invoke("mock_fingerprint", { ext: ".hmc" });
    const b = await invoke("mock_fingerprint", { ext: ".hmc" });
    expect(a["fingerprint"]).toBe(b["fingerprint"]);
    expect(typeof a["fingerprint"]).toBe("string");
  });

  it("mock_all_fingerprints covers all 12 extensions", async () => {
    const r = await invoke("mock_all_fingerprints", {});
    const keys = Object.keys(r);
    expect(keys.length).toBe(12);
    expect(keys).toContain(".hmc");
    expect(keys).toContain(".FCStd");
  });

  it("mock_toolpaths length matches mock_operation_tree totalOperations", async () => {
    const tp = await invoke("mock_toolpaths", { ext: ".hmc" });
    const tree = await invoke("mock_operation_tree", { ext: ".hmc" });
    // slimResponse may wrap long arrays under ops as { _items, _total, _showing }.
    const opsVal = tp["ops"] as unknown;
    const opsCount = Array.isArray(opsVal)
      ? opsVal.length
      : ((opsVal as Record<string, number>)["_total"] ??
        (opsVal as Record<string, unknown[]>)["_items"]?.length);
    expect(opsCount).toBe(tree["totalOperations"]);
  });
});

describe("schema validation", () => {
  it("open without filePath is rejected", async () => {
    const r = await invoke("open", {});
    expect(r["success"] === false || (r["error"] as unknown) !== undefined).toBe(true);
  });

  it("export_step without outputPath is rejected", async () => {
    const r = await invoke("export_step", { filePath: "core.hmc" });
    expect(r["success"] === false || (r["error"] as unknown) !== undefined).toBe(true);
  });

  it("supports_extension without ext is rejected", async () => {
    const r = await invoke("supports_extension", {});
    expect(r["success"] === false || (r["error"] as unknown) !== undefined).toBe(true);
  });
});

describe("unknown-extension errors", () => {
  it("route() on an unsupported extension returns an error envelope", async () => {
    const r = await invoke("route", { filePath: "report.xlsx" });
    expect(r["success"] === false || (r["error"] as unknown) !== undefined).toBe(true);
  });
});
