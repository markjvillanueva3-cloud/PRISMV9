/**
 * safetyDispatcher U-WIRE-WETRUN-FSM round-trip tests — WetRunStateMachineEngine.
 *
 * Validates the 8 new actions (wetrun_start_session / wetrun_record_part /
 * wetrun_record_safety_event / wetrun_get_session / wetrun_list_sessions /
 * wetrun_list_transitions / wetrun_list_scrap_events / wetrun_list_safety_events)
 * wire through prism_safety and that the wet-run FSM behaves per contract:
 * start -> WET_PASS, a safety event forces escalation, scrap requires a root_cause.
 *
 * Pattern: LIVE dispatcher round-trip (registerSafetyDispatcher(shim) -> capture
 * handler -> invoke -> assert JSON). The engine is a SINGLETON with a module-global
 * in-memory session store (no reset export), so each test uses a UNIQUE session_id
 * to stay order-independent.
 *
 * Wired slot:papa 2026-06-14 — WIRE-UNWIRED-PAPA autonomous loop iteration 2.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-WETRUN-FSM
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { wetRunStateMachineEngine } from "../engines/WetRunStateMachineEngine.js";

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

function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerSafetyDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}

function startArgs(session_id: string, over: Record<string, unknown> = {}) {
  return { session_id, tenant_id: "T-ACME", part_id: "P-100", machine_id: "VMC-01", operator: "alice", ...over };
}

describe("U-WIRE-WETRUN-FSM — WetRunStateMachineEngine via prism_safety", () => {
  // Reset the module-global singleton FSM store before each test so list/transition
  // queries see only this test's data (scrutiny arm B P1 — direct-import reset is
  // acceptable for setup; the dispatcher path is still exercised by the calls).
  beforeEach(() => { wetRunStateMachineEngine.clearAll(); });

  it("registers exactly one prism_safety tool", () => {
    expect(newServer().tools).toHaveLength(1);
  });

  it("wetrun_start_session -> session in WET_PASS", async () => {
    const s = newServer();
    const r = await call(s, "wetrun_start_session", startArgs("WR-START-1"));
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("WET_PASS");
    expect(r.data.session_id).toBe("WR-START-1");
    expect(r.data.total_parts_attempted).toBe(0);
  });

  it("wetrun_start_session duplicate -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-DUP-1"));
    const r = await call(s, "wetrun_start_session", startArgs("WR-DUP-1"));
    expect(r.ok).toBe(false);
  });

  it("wetrun_get_session round-trips a started session", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-GET-1"));
    const r = await call(s, "wetrun_get_session", { session_id: "WR-GET-1" });
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("WET_PASS");
    expect(r.data.operator).toBe("alice");
  });

  it("wetrun_get_session unknown -> error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetrun_get_session", { session_id: "NOPE-xyz" });
    expect(r.ok).toBe(false);
  });

  it("wetrun_record_part passed -> total_parts_attempted increments", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-PART-1"));
    const r = await call(s, "wetrun_record_part", { session_id: "WR-PART-1", passed: true });
    expect(r.ok).toBe(true);
    expect((r.data.session as Record<string, unknown>).total_parts_attempted).toBe(1);
  });

  it("wetrun_record_part scrap WITHOUT root_cause -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-SCRAP-NORC"));
    const r = await call(s, "wetrun_record_part", { session_id: "WR-SCRAP-NORC", passed: false });
    expect(r.ok).toBe(false);
  });

  it("wetrun_record_part scrap WITH root_cause -> recorded; appears in scrap events", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-SCRAP-1"));
    const r = await call(s, "wetrun_record_part", { session_id: "WR-SCRAP-1", passed: false, root_cause: "chip recutting on op20" });
    expect(r.ok).toBe(true);
    const ev = await call(s, "wetrun_list_scrap_events", { session_id: "WR-SCRAP-1" });
    expect(ev.ok).toBe(true);
    expect((ev.data.scrapEvents as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it("wetrun_record_safety_event escalates the FSM out of WET_PASS", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-SAFE-1"));
    const r = await call(s, "wetrun_record_safety_event", {
      session_id: "WR-SAFE-1", kind: "collision", severity: "critical", detail: "z-axis crash into fixture",
    });
    expect(r.ok).toBe(true);
    // Engine contract: any safety event -> WET_HARD_FAIL -> auto-QUARANTINE (deterministic).
    expect((r.data.session as Record<string, unknown>).state).toBe("QUARANTINE");
    const ev = await call(s, "wetrun_list_safety_events", { session_id: "WR-SAFE-1" });
    expect((ev.data.safetyEvents as unknown[]).length).toBe(1);
  });

  it("wetrun_record_safety_event bad severity enum -> rejected at boundary (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-SAFE-BAD"));
    const r = await call(s, "wetrun_record_safety_event", {
      session_id: "WR-SAFE-BAD", kind: "collision", severity: "trivial", detail: "should be rejected",
    });
    expect(r.ok).toBe(false);
  });

  it("wetrun_list_sessions filters by tenant_id", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-LIST-1", { tenant_id: "T-FILTER" }));
    const r = await call(s, "wetrun_list_sessions", { tenant_id: "T-FILTER" });
    expect(r.ok).toBe(true);
    expect((r.data.sessions as Array<{ session_id: string }>).some((x) => x.session_id === "WR-LIST-1")).toBe(true);
  });

  it("wetrun_list_transitions returns transitions after escalation", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-TRANS-1"));
    await call(s, "wetrun_record_safety_event", { session_id: "WR-TRANS-1", kind: "tool_breakage", severity: "high", detail: "endmill snapped mid-cut" });
    const r = await call(s, "wetrun_list_transitions", { session_id: "WR-TRANS-1" });
    expect(r.ok).toBe(true);
    // A safety event pushes exactly 2 transitions: WET_PASS->WET_HARD_FAIL->QUARANTINE.
    expect((r.data.transitions as unknown[]).length).toBe(2);
  });

  it("wetrun_record_part scrap root_cause boundary: 9 chars rejected, 10 accepted (engine guard)", async () => {
    const s = newServer();
    await call(s, "wetrun_start_session", startArgs("WR-RC-9"));
    const tooShort = await call(s, "wetrun_record_part", { session_id: "WR-RC-9", passed: false, root_cause: "123456789" });
    expect(tooShort.ok).toBe(false); // 9 chars < 10-char floor
    await call(s, "wetrun_start_session", startArgs("WR-RC-10"));
    const ok = await call(s, "wetrun_record_part", { session_id: "WR-RC-10", passed: false, root_cause: "1234567890" });
    expect(ok.ok).toBe(true); // exactly 10 chars accepted
  });

  it("wetrun_start_session missing session_id -> rejected at boundary (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetrun_start_session", { tenant_id: "T", part_id: "P", machine_id: "M", operator: "o" });
    expect(r.ok).toBe(false);
  });
});
