/**
 * dataDispatcher — tool-setup validation round-trip suite
 * =======================================================
 *
 * Wires ToolDatabaseDeepLearningEngine into prism_data:
 *   ToolDatabaseDeepLearningEngine.validateToolSetup(assembly, machineId)
 *     → prism_data:tool_setup_validate
 *
 * Validates a built tool assembly against a real JM Die machine (taper / RPM /
 * gauge-length / coolant / runout / reach). Reference values are the engine's
 * live JM_DIE_MACHINES["haas-vf2"] = {CAT40, max_rpm 8100, gauge 400, TSC true}.
 * Assertions exercise the real pass/fail decision logic (R9), not toBeDefined.
 *
 * NOTE: the dispatcher slim transform may drop falsy fields (e.g. pass:false,
 * empty issues), so boolean/array reads are coerced with `?? default`.
 *
 * @milestone DB-COVERAGE-GAPFILL-MS0
 * @unit U-ROMEO-TOOL-SETUP-VALIDATE-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

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
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// Minimal assembly carrying exactly the fields validateToolSetup reads.
function assembly(over: { taper?: string; rpm?: number; gauge?: number; runout?: number; stickout?: number; tsc?: boolean } = {}) {
  return {
    assembly_id: "ASM-001",
    holder: { taper: over.taper ?? "CAT40", coolant_through: over.tsc ?? true },
    config: {
      rpm_limit: over.rpm ?? 6000,
      total_gauge_length_mm: over.gauge ?? 200,
      runout_um: over.runout ?? 3,
      stick_out_mm: over.stickout ?? 30,
    },
  };
}

type Issue = { severity: string; code: string; message: string };
function codes(data: Record<string, unknown>): string[] {
  return ((data.issues as Issue[] | undefined) ?? []).map((i) => i.code);
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("U-ROMEO-TOOL-SETUP-VALIDATE-WIRE — round-trip via prism_data:tool_setup_validate", () => {
  it("wire is live — action resolves and returns a validation result", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly(), machine_id: "haas-vf2" });
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("checks");
    expect(r.data.machine_id).toBe("haas-vf2");
  });

  it("a compatible CAT40 assembly PASSES on haas-vf2 (score 100, no issues)", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly(), machine_id: "haas-vf2" });
    expect(r.data.pass).toBe(true);
    expect(r.data.score).toBe(100);
    const checks = r.data.checks as Record<string, boolean>;
    expect(checks.taper_compatible).toBe(true);
    expect(checks.rpm_within_limit).toBe(true);
    expect(codes(r.data).length).toBe(0);
  });

  it("a BT30 holder FAILS taper compatibility (CAT40 machine) → error + fail", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly({ taper: "BT30" }), machine_id: "haas-vf2" });
    expect(r.data.pass ?? false).toBe(false);
    expect(codes(r.data)).toContain("TAPER_MISMATCH");
    expect((r.data.checks as Record<string, boolean>).taper_compatible ?? false).toBe(false);
  });

  it("an over-speed assembly FAILS the RPM limit (10000 > 8100)", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly({ rpm: 10000 }), machine_id: "haas-vf2" });
    expect(r.data.pass ?? false).toBe(false);
    expect(codes(r.data)).toContain("RPM_EXCEEDED");
  });

  it("an unknown machine id fails loud (MACH_NOT_FOUND, score 0)", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly(), machine_id: "no-such-machine" });
    expect(r.data.pass ?? false).toBe(false);
    expect(r.data.score ?? 0).toBe(0);
    expect(codes(r.data)).toContain("MACH_NOT_FOUND");
  });

  it("a short stick-out raises an advisory SHORT_REACH (still passes)", async () => {
    const r = await call(server, "tool_setup_validate", { assembly: assembly({ stickout: 10 }), machine_id: "haas-vf2" });
    expect(codes(r.data)).toContain("SHORT_REACH");
    expect(r.data.pass).toBe(true); // info-level only, no error
  });
});
