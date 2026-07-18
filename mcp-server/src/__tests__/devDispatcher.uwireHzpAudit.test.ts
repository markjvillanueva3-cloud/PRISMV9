/**
 * devDispatcher U-WIRE-HZPAUDIT round-trip tests -- HzpDashAuditEngine.
 *
 * Validates the 3 new audit-envelope actions wire through prism_dev:
 *   hzp_audit_build       -> HzpDashAuditEngine.build       (validates + mints id)
 *   hzp_audit_to_jsonl    -> HzpDashAuditEngine.toJsonl     (serialize one JSONL line)
 *   hzp_audit_render_line -> HzpDashAuditEngine.renderLine  (1-line human view)
 *
 * The engine (HZD-03, HZP-DASH-MS0, slot:bravo) builds narrow audit envelopes for
 * the Hermes/Zebra dashboard control server. build() re-validates via its own zod
 * schema (throws on a bad operation/missing actor) and throws on an invalid ts_iso
 * -> the dispatcher catch turns both into success:false (fail-loud, never silent).
 *
 * Pattern mirrors devDispatcher.uwireEntropy/uwireCohortShim. Engine-direct tests
 * pin reference values; LIVE round-trip proves the wire. NOTE: renderLine emits
 * non-ASCII glyphs (check/cross/arrow) -- this test stays ASCII by asserting via
 * String.fromCharCode + ASCII substrings, never literal glyphs (ascii-guard hook).
 *
 * Wired slot:papa->golf 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:golf engine wired into prism_dev, papa's home dispatcher).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-HZPAUDIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { HzpDashAuditEngine } from "../engines/HzpDashAuditEngine.js";

const CHECK = String.fromCharCode(0x2713); // U+2713 CHECK MARK (engine "authorized" glyph)
const CROSS = String.fromCharCode(0x2717); // U+2717 BALLOT X     (engine "unauthorized" glyph)

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
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A valid request fixture (deterministic via ts_iso + randHex6).
const TS = "2026-06-15T00:00:00.000Z";
function req(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation: "assign",
    actor: "operator",
    target_slot: "alpha",
    authorized: true,
    authority_reason: "operator directive",
    ts_iso: TS,
    ...over,
  };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference values -------------------------------------------
describe("U-WIRE-HZPAUDIT -- build reference values", () => {
  it("mints a deterministic audit_id and maps every field", () => {
    const env = HzpDashAuditEngine.build(req() as never, "abc123");
    expect(env.audit_id).toMatch(/^hzpd-[0-9a-z]+-abc123$/); // t36 + fixed seed
    expect(env.ts).toBe(TS);
    expect(env.operation).toBe("assign");
    expect(env.actor).toBe("operator");
    expect(env.target_slot).toBe("alpha");
    expect(env.authorized).toBe(true);
    expect(env.authority_reason).toBe("operator directive");
    expect(env.schema_version).toBe("hzp-dash-audit-1.0.0");
  });

  it("defaults optional fields to null (not undefined)", () => {
    const env = HzpDashAuditEngine.build(
      { operation: "veto", actor: "golf", authorized: false, authority_reason: "no authority", ts_iso: TS } as never,
      "000000",
    );
    expect(env.target_slot).toBeNull();
    expect(env.task_id).toBeNull();
    expect(env.payload).toBeNull();
  });

  it("throws on an invalid operation (engine schema .parse)", () => {
    expect(() => HzpDashAuditEngine.build(req({ operation: "frobnicate" }) as never)).toThrow();
  });

  it("throws on an invalid ts_iso (fail-loud date guard)", () => {
    expect(() => HzpDashAuditEngine.build(req({ ts_iso: "not-a-date" }) as never)).toThrow(/invalid ts_iso/);
  });
});

describe("U-WIRE-HZPAUDIT -- toJsonl / renderLine reference values", () => {
  it("toJsonl round-trips through JSON.parse to the same envelope", () => {
    const env = HzpDashAuditEngine.build(req() as never, "abc123");
    const line = HzpDashAuditEngine.toJsonl(env);
    expect(JSON.parse(line)).toEqual(env);
  });

  it("renderLine shows the check glyph + fields when authorized", () => {
    const env = HzpDashAuditEngine.build(req() as never, "abc123");
    const line = HzpDashAuditEngine.renderLine(env);
    expect(line).toContain("[assign]");
    expect(line).toContain("operator");
    expect(line).toContain("alpha");
    expect(line).toContain("operator directive");
    expect(line).toContain(CHECK);
    expect(line).not.toContain(CROSS);
  });

  it("renderLine shows the cross glyph when unauthorized", () => {
    const env = HzpDashAuditEngine.build(req({ authorized: false, authority_reason: "denied" }) as never, "abc123");
    const line = HzpDashAuditEngine.renderLine(env);
    expect(line).toContain(CROSS);
    expect(line).not.toContain(CHECK);
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-HZPAUDIT -- dispatcher round-trip (prism_dev)", () => {
  it("hzp_audit_build returns a validated envelope through the dispatcher", async () => {
    const r = await call(server, "hzp_audit_build", { req: req(), randHex6: "abc123" });
    expect(r.ok).toBe(true);
    expect(r.data.audit_id as string).toMatch(/^hzpd-[0-9a-z]+-abc123$/);
    expect(r.data.schema_version).toBe("hzp-dash-audit-1.0.0");
    expect(r.data.operation).toBe("assign");
  });

  it("hzp_audit_to_jsonl serializes a built envelope to a JSONL string", async () => {
    const env = HzpDashAuditEngine.build(req() as never, "abc123") as unknown as Record<string, unknown>;
    const r = await call(server, "hzp_audit_to_jsonl", { env });
    expect(r.ok).toBe(true);
    const jsonl = r.data.jsonl as string;
    expect(typeof jsonl).toBe("string");
    expect((JSON.parse(jsonl) as Record<string, unknown>).operation).toBe("assign");
  });

  it("hzp_audit_render_line renders the 1-line human view", async () => {
    const env = HzpDashAuditEngine.build(req() as never, "abc123") as unknown as Record<string, unknown>;
    const r = await call(server, "hzp_audit_render_line", { env });
    expect(r.ok).toBe(true);
    const line = r.data.line as string;
    expect(line).toContain("[assign]");
    expect(line).toContain("operator directive");
  });

  it("all 3 hzp_audit_* actions are accepted by the registered dispatcher", async () => {
    const builtEnv = HzpDashAuditEngine.build(req() as never, "abc123") as unknown as Record<string, unknown>;
    const calls: Array<[string, Record<string, unknown>]> = [
      ["hzp_audit_build", { req: req() }],
      ["hzp_audit_to_jsonl", { env: builtEnv }],
      ["hzp_audit_render_line", { env: builtEnv }],
    ];
    for (const [action, params] of calls) {
      const r = await call(server, action, params);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// -- Schema validation + fail-loud through the dispatcher (adversarial) -------
describe("U-WIRE-HZPAUDIT -- schema rejection + fail-loud (prism_dev)", () => {
  it("hzp_audit_build rejects an invalid operation at the boundary (z.enum)", async () => {
    const r = await call(server, "hzp_audit_build", { req: req({ operation: "frobnicate" }) });
    expect(r.ok).toBe(false);
  });

  it("hzp_audit_build rejects a missing actor (required)", async () => {
    const bad = req();
    delete bad.actor;
    const r = await call(server, "hzp_audit_build", { req: bad });
    expect(r.ok).toBe(false);
  });

  it("hzp_audit_build rejects a missing authorized flag (required boolean)", async () => {
    const bad = req();
    delete bad.authorized;
    const r = await call(server, "hzp_audit_build", { req: bad });
    expect(r.ok).toBe(false);
  });

  it("hzp_audit_build fails loud (ok:false) on an invalid ts_iso -- engine throw, not silent", async () => {
    // ts_iso is a string so it passes the boundary schema; the engine throws -> dispatcherError.
    const r = await call(server, "hzp_audit_build", { req: req({ ts_iso: "not-a-date" }) });
    expect(r.ok).toBe(false);
  });
});
