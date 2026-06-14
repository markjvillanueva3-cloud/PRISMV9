/**
 * sessionDispatcher × OperatorPreferencesEngine wire
 * ([WIRING]/U-WIRE-OPERATOR-PREFS, slot:romeo).
 *
 * OperatorPreferencesEngine (per-operator preference store + override applier) was BUILT but
 * UNWIRED — verified GENUINE_ORPHAN (self-contained zero-arg singleton) via
 * scripts/classify-engine-reachability.mjs (U-CLASSIFIER-AWARE-HUNT). This wires 3 actions into
 * prism_session: operator_prefs_set / _get / _apply.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import). The singleton holds
 * state in-process, so the set→get→apply lifecycle is exercised across calls.
 * ANTI-STUB: the `applied` flag + `found` flag reflect whether prefs were actually stored — a
 * no-op case returning {applied:false}/{found:false} fails the post-set assertions. `ok()` applies
 * slimResponse (strips null scalars + empty arrays), so assertions tolerate stripped falses/nulls.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-OPERATOR-PREFS
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { operatorPreferencesEngine } from "../engines/OperatorPreferencesEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  return { ok: parsed.success === true, data: parsed };
}

const PREFS = (operatorId: string, tenantId: string, bias: string) => ({
  operatorId, tenantId,
  speedFeedBias: bias,
  surfaceFinishPriority: "high",
  cycleTimeVsToolLife: "favor_tool_life",
  coolantPreference: "flood",
  safetyMarginPercent: 25,
  chipBreakStrategy: "standard",
  notificationPreferences: { toolChangeAlerts: true, cycleCompleteAlerts: false, qualityCheckReminders: true, maintenanceReminders: true },
  machineNotes: { "VMC-01": "watch Z reach" },
});

let server: MockMCPServer;
beforeEach(() => {
  operatorPreferencesEngine.clear(); // isolate the in-process singleton per test
  server = new MockMCPServer();
  registerSessionDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("sessionDispatcher × OperatorPreferences wire (U-WIRE-OPERATOR-PREFS)", () => {
  it("operator_prefs_set stores prefs and stamps timestamps (anti-stub)", async () => {
    const r = await call(server, "operator_prefs_set", { preferences: PREFS("op1", "acme", "aggressive") });
    expect(r.ok).toBe(true);
    const prefs = r.data.preferences as Record<string, unknown>;
    expect(prefs.operatorId).toBe("op1");
    expect(prefs.speedFeedBias).toBe("aggressive");
    expect(prefs.safetyMarginPercent).toBe(25);
    expect(typeof prefs.created_at).toBe("string"); // upsert stamps timestamps
    expect(typeof prefs.updated_at).toBe("string");
  });

  it("operator_prefs_get returns stored prefs after set (round-trip through the singleton)", async () => {
    await call(server, "operator_prefs_set", { preferences: PREFS("op1", "acme", "aggressive") });
    const r = await call(server, "operator_prefs_get", { tenantId: "acme", operatorId: "op1" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect((r.data.preferences as Record<string, unknown>).speedFeedBias).toBe("aggressive");
  });

  it("operator_prefs_get for an unknown operator with withDefaults returns engine defaults", async () => {
    const r = await call(server, "operator_prefs_get", { tenantId: "acme", operatorId: "ghost", withDefaults: true });
    expect(r.ok).toBe(true);
    expect(r.data.found !== true).toBe(true);     // not found (slimmer may strip the false)
    expect(r.data.usedDefaults).toBe(true);
    expect((r.data.preferences as Record<string, unknown>).speedFeedBias).toBe("balanced"); // default
  });

  it("operator_prefs_get for an unknown operator WITHOUT defaults yields no preferences", async () => {
    const r = await call(server, "operator_prefs_get", { tenantId: "acme", operatorId: "ghost" });
    expect(r.ok).toBe(true);
    expect(r.data.found !== true).toBe(true);
    expect(r.data.preferences == null).toBe(true); // slimmer strips the null scalar
  });

  it("operator_prefs_apply applies overrides when prefs exist (applied=true)", async () => {
    await call(server, "operator_prefs_set", { preferences: PREFS("op1", "acme", "conservative") });
    const r = await call(server, "operator_prefs_apply", { tenantId: "acme", operatorId: "op1", baseParams: { rpm: 5000, feed: 1200 } });
    expect(r.ok).toBe(true);
    expect(r.data.applied).toBe(true);
  });

  it("operator_prefs_apply for an operator with no prefs fails soft (applied!=true + note)", async () => {
    const r = await call(server, "operator_prefs_apply", { tenantId: "acme", operatorId: "nobody", baseParams: { rpm: 5000 } });
    expect(r.ok).toBe(true);
    expect(r.data.applied !== true).toBe(true);
    expect(((r.data.notes ?? []) as string[]).join(" ").toLowerCase()).toMatch(/no operator preferences/);
  });

  it("operator_prefs_get rejects a missing tenantId (schema requires it)", async () => {
    const r = await call(server, "operator_prefs_get", { operatorId: "op1" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/tenant|invalid|required|expected/);
  });

  it("operator_prefs_set action is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "operator_prefs_set", { preferences: PREFS("op2", "acme", "balanced") });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  });
});
