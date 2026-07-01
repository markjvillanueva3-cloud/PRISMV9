/**
 * safetyDispatcher U-WIRE-WETFREEZE round-trip tests — WetRunChangeFreezeEngine.
 *
 * Validates the 8 new actions (wetfreeze_declare_window / wetfreeze_grant_override /
 * wetfreeze_check / wetfreeze_list_active / wetfreeze_get_window /
 * wetfreeze_get_override / wetfreeze_list_windows / wetfreeze_list_overrides) wire
 * through prism_safety and that the change-freeze gate behaves per contract: an
 * active freeze window blocks a change unless an override grants that change_kind.
 *
 * Pattern: LIVE dispatcher round-trip. The engine is a SINGLETON with a module-global
 * store and NO reset surface, AND enforces a non-emergency overlap rule + a 40-char
 * reason floor + four-eyes (declared_by != approved_by). So each test uses a UNIQUE id
 * AND a UNIQUE non-overlapping time base (10M ms apart >> 1M-ms window width), declares
 * with a >=40-char reason, and checks at a now_ts inside its own window. list queries
 * use .some() (cross-test accumulation expected without a reset).
 *
 * Wired slot:papa 2026-06-14 — WIRE-UNWIRED-PAPA autonomous loop iteration 3.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-WETFREEZE
 */

import { describe, it, expect } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";

const NOW = 2_000_000_000_000;     // fixed epoch ms (deterministic, no Date.now())
const SPAN = 1_000_000;            // window width (ms)
const REASON = "annual financial audit change-freeze window for Q4 compliance review"; // >=40 chars

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerSafetyDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
// A window active across [base, base+SPAN]; declared_at = base so state == "active".
// four-eyes: declared_by != approved_by; reason >= 40 chars.
function windowArgs(id: string, base: number, over: Record<string, unknown> = {}) {
  return {
    id, name: `freeze ${id}`, kind: "audit",
    start_ts: base, end_ts: base + SPAN,
    declared_by: "qa-lead", approved_by: "plant-mgr", reason: REASON,
    declared_at: base, ...over,
  };
}

describe("U-WIRE-WETFREEZE — WetRunChangeFreezeEngine via prism_safety", () => {
  it("registers exactly one prism_safety tool", () => {
    expect(newServer().tools).toHaveLength(1);
  });

  it("wetfreeze_declare_window -> active window (state computed from declared_at)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_declare_window", windowArgs("FW-DECL-1", NOW));
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe("FW-DECL-1");
    expect(r.data.kind).toBe("audit");
    expect(r.data.state).toBe("active");
  });

  it("wetfreeze_check inside an active freeze -> NOT allowed (no override)", async () => {
    const s = newServer();
    const base = NOW + 10_000_000;
    await call(s, "wetfreeze_declare_window", windowArgs("FW-BLOCK-1", base));
    const r = await call(s, "wetfreeze_check", { now_ts: base + 500, change_kind: "program_release" });
    expect(r.ok).toBe(true);
    expect(r.data.allowed).toBe(false);
  });

  it("wetfreeze_grant_override then check -> allowed for the granted change_kind", async () => {
    const s = newServer();
    const base = NOW + 20_000_000;
    await call(s, "wetfreeze_declare_window", windowArgs("FW-OVR-1", base));
    const g = await call(s, "wetfreeze_grant_override", {
      window_id: "FW-OVR-1", change_kinds: ["program_release"],
      granted_by: "plant-mgr", granted_to: "ops", expires_at: base + SPAN,
      reason: "critical production hotfix release explicitly authorized by the plant manager during the active audit change-freeze window", granted_at: base + 100,
    });
    expect(g.ok).toBe(true);
    const r = await call(s, "wetfreeze_check", { now_ts: base + 500, change_kind: "program_release" });
    expect(r.ok).toBe(true);
    expect(r.data.allowed).toBe(true);
  });

  it("wetfreeze_check with no active window -> allowed", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_check", { now_ts: 1, change_kind: "deviation" }); // "prehistory" sentinel: before any declared window base
    expect(r.ok).toBe(true);
    expect(r.data.allowed).toBe(true);
  });

  it("wetfreeze_get_window round-trips a declared window", async () => {
    const s = newServer();
    await call(s, "wetfreeze_declare_window", windowArgs("FW-GET-1", NOW + 30_000_000));
    const r = await call(s, "wetfreeze_get_window", { id: "FW-GET-1" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect((r.data.window as Record<string, unknown>).reason).toBe(REASON);
  });

  it("wetfreeze_get_window unknown -> found:false", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_get_window", { id: "FW-NOPE-xyz" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(false);
  });

  it("wetfreeze_list_active includes a currently-active window", async () => {
    const s = newServer();
    const base = NOW + 40_000_000;
    await call(s, "wetfreeze_declare_window", windowArgs("FW-LIST-1", base));
    const r = await call(s, "wetfreeze_list_active", { now_ts: base + 500 });
    expect(r.ok).toBe(true);
    expect((r.data.windows as Array<{ id: string }>).some((w) => w.id === "FW-LIST-1")).toBe(true);
  });

  it("wetfreeze_list_windows includes a declared window", async () => {
    const s = newServer();
    await call(s, "wetfreeze_declare_window", windowArgs("FW-LW-1", NOW + 70_000_000));
    const r = await call(s, "wetfreeze_list_windows");
    expect(r.ok).toBe(true);
    expect((r.data.windows as Array<{ id: string }>).some((w) => w.id === "FW-LW-1")).toBe(true);
  });

  it("wetfreeze_list_overrides includes a granted override", async () => {
    const s = newServer();
    const base = NOW + 80_000_000;
    await call(s, "wetfreeze_declare_window", windowArgs("FW-LO-1", base));
    await call(s, "wetfreeze_grant_override", {
      window_id: "FW-LO-1", change_kinds: ["deviation"],
      granted_by: "plant-mgr", granted_to: "ops", expires_at: base + SPAN,
      reason: "documented deviation override authorized by the plant manager for the active freeze window", granted_at: base + 100,
    });
    const r = await call(s, "wetfreeze_list_overrides");
    expect(r.ok).toBe(true);
    expect((r.data.overrides as Array<{ window_id: string }>).some((o) => o.window_id === "FW-LO-1")).toBe(true);
  });

  it("wetfreeze_grant_override on unknown window -> error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_grant_override", {
      window_id: "FW-DOES-NOT-EXIST", change_kinds: ["deviation"],
      granted_by: "x", granted_to: "y", expires_at: NOW + 1000, reason: "r", granted_at: NOW,
    });
    expect(r.ok).toBe(false);
  });

  it("declare rejects a <40-char reason (engine four-eyes/reason floor, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_declare_window", windowArgs("FW-SHORTR", NOW + 50_000_000, { reason: "too short" }));
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid FreezeKind enum at the boundary (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_declare_window", windowArgs("FW-BADKIND", NOW + 60_000_000, { kind: "not-a-kind" }));
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid change_kind enum on check (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_check", { now_ts: NOW, change_kind: "not-a-change" });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing required param on declare (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetfreeze_declare_window", { id: "FW-MISSING", name: "x" });
    expect(r.ok).toBe(false);
  });
});
