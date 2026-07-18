/**
 * safetyDispatcher U-WIRE-WETRET round-trip tests — WetRunRetentionPolicyEngine.
 *
 * Validates the 9 new actions (wetret_register / wetret_can_purge /
 * wetret_schedule_purge / wetret_cancel_purge / wetret_execute_purge /
 * wetret_set_legal_hold / wetret_release_legal_hold / wetret_get / wetret_list)
 * wire through prism_safety and that the compliance-retention lifecycle behaves
 * per contract: retention window (created_at + max regime window) gates purge,
 * four-eyes on schedule/hold, 40-char reason floor, legal hold pins an artifact.
 *
 * Pattern: LIVE dispatcher round-trip. Singleton with module-global store + NO
 * reset surface, so each test uses a UNIQUE artifact_id. Time math uses a fixed
 * NOW + a created_at 400 days in the past (> the 365-day INTERNAL_RND window) so
 * artifacts are purge-eligible at NOW (deterministic, no Date.now()).
 *
 * Wired slot:papa 2026-06-14 — WIRE-UNWIRED-PAPA autonomous loop iteration 4.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-WETRET
 */

import { describe, it, expect } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 2_000_000_000_000;
const PAST = NOW - 400 * DAY_MS;   // 400d ago > 365d INTERNAL_RND window => eligible at NOW
const RECENT = NOW - 10 * DAY_MS;  // 10d ago => NOT eligible
const REASON = "retention window expired; routine compliance purge per documented ITAR schedule"; // >=40

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
function regArgs(artifact_id: string, over: Record<string, unknown> = {}) {
  return { artifact_id, pilot_id: "PILOT-A", kind: "session_log", regimes: ["INTERNAL_RND"], created_at: PAST, ...over };
}

describe("U-WIRE-WETRET — WetRunRetentionPolicyEngine via prism_safety", () => {
  it("registers exactly one prism_safety tool", () => {
    expect(newServer().tools).toHaveLength(1);
  });

  it("wetret_register -> retained, purge_eligible_at computed", async () => {
    const s = newServer();
    const r = await call(s, "wetret_register", regArgs("ART-REG-1"));
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("retained");
    expect(r.data.purge_eligible_at).toBe(PAST + 365 * DAY_MS);
  });

  it("wetret_register duplicate -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-DUP-1"));
    const r = await call(s, "wetret_register", regArgs("ART-DUP-1"));
    expect(r.ok).toBe(false);
  });

  it("wetret_get round-trips a registered artifact", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-GET-1"));
    const r = await call(s, "wetret_get", { artifact_id: "ART-GET-1" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect((r.data.artifact as Record<string, unknown>).pilot_id).toBe("PILOT-A");
  });

  it("wetret_can_purge: not eligible before window expiry", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-NOTYET-1", { created_at: RECENT }));
    const r = await call(s, "wetret_can_purge", { artifact_id: "ART-NOTYET-1", now_ts: NOW });
    expect(r.ok).toBe(true);
    expect(r.data.allowed).toBe(false);
  });

  it("wetret_can_purge: eligible after window expiry", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-ELIG-1"));
    const r = await call(s, "wetret_can_purge", { artifact_id: "ART-ELIG-1", now_ts: NOW });
    expect(r.ok).toBe(true);
    expect(r.data.allowed).toBe(true);
  });

  it("wetret_schedule_purge (four-eyes + reason floor + target>=eligible) -> purge_scheduled", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-SCHED-1"));
    const r = await call(s, "wetret_schedule_purge", {
      artifact_id: "ART-SCHED-1", target_purge_at: NOW, scheduled_by: "records-mgr", approver: "compliance-lead", reason: REASON,
    });
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("purge_scheduled");
  });

  it("wetret_schedule_purge with <40-char reason -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-SHORTR-1"));
    const r = await call(s, "wetret_schedule_purge", {
      artifact_id: "ART-SHORTR-1", target_purge_at: NOW, scheduled_by: "a", approver: "b", reason: "too short",
    });
    expect(r.ok).toBe(false);
  });

  it("wetret_schedule_purge four-eyes violation -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-4EYES-1"));
    const r = await call(s, "wetret_schedule_purge", {
      artifact_id: "ART-4EYES-1", target_purge_at: NOW, scheduled_by: "same-person", approver: "same-person", reason: REASON,
    });
    expect(r.ok).toBe(false);
  });

  it("wetret_execute_purge after schedule -> purged", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-EXEC-1"));
    await call(s, "wetret_schedule_purge", {
      artifact_id: "ART-EXEC-1", target_purge_at: NOW, scheduled_by: "records-mgr", approver: "compliance-lead", reason: REASON,
    });
    const r = await call(s, "wetret_execute_purge", { artifact_id: "ART-EXEC-1", purged_at: NOW });
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("purged");
  });

  it("wetret_set_legal_hold -> legal_hold; blocks purge", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-HOLD-1"));
    const h = await call(s, "wetret_set_legal_hold", {
      artifact_id: "ART-HOLD-1", set_by: "legal-counsel", approver: "gc", reason: REASON, set_at: NOW,
    });
    expect(h.ok).toBe(true);
    expect(h.data.state).toBe("legal_hold");
    const cp = await call(s, "wetret_can_purge", { artifact_id: "ART-HOLD-1", now_ts: NOW });
    expect(cp.data.allowed).toBe(false);
  });

  it("wetret_set_legal_hold four-eyes violation -> error (failure mode)", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-HOLD-4E"));
    const r = await call(s, "wetret_set_legal_hold", {
      artifact_id: "ART-HOLD-4E", set_by: "x", approver: "x", reason: REASON, set_at: NOW,
    });
    expect(r.ok).toBe(false);
  });

  it("wetret_cancel_purge returns a scheduled artifact to retained", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-CANCEL-1"));
    await call(s, "wetret_schedule_purge", {
      artifact_id: "ART-CANCEL-1", target_purge_at: NOW, scheduled_by: "records-mgr", approver: "compliance-lead", reason: REASON,
    });
    const r = await call(s, "wetret_cancel_purge", { artifact_id: "ART-CANCEL-1", cancelled_by: "records-mgr", reason: REASON });
    expect(r.ok).toBe(true);
    expect(r.data.state).toBe("retained");
  });

  it("wetret_release_legal_hold lifts a hold (state leaves legal_hold)", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-REL-1"));
    await call(s, "wetret_set_legal_hold", {
      artifact_id: "ART-REL-1", set_by: "legal-counsel", approver: "gc", reason: REASON, set_at: NOW,
    });
    const r = await call(s, "wetret_release_legal_hold", {
      artifact_id: "ART-REL-1", released_by: "legal-counsel", approver: "gc", reason: REASON, released_at: NOW + 1000,
    });
    expect(r.ok).toBe(true);
    expect(r.data.state).not.toBe("legal_hold");
  });

  it("wetret_list filters by pilot_id", async () => {
    const s = newServer();
    await call(s, "wetret_register", regArgs("ART-LIST-1", { pilot_id: "PILOT-FILTER" }));
    const r = await call(s, "wetret_list", { pilot_id: "PILOT-FILTER" });
    expect(r.ok).toBe(true);
    expect((r.data.artifacts as Array<{ artifact_id: string }>).some((a) => a.artifact_id === "ART-LIST-1")).toBe(true);
  });

  it("wetret_register invalid regime enum -> error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetret_register", regArgs("ART-BADREG", { regimes: ["NOT_A_REGIME"] }));
    expect(r.ok).toBe(false);
  });

  it("wetret_register missing required param -> error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "wetret_register", { artifact_id: "ART-MISSING" });
    expect(r.ok).toBe(false);
  });
});
