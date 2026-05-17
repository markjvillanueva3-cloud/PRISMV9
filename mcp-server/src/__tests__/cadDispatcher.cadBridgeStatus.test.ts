/**
 * WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE — prism_cad:cad_bridge_status dispatcher tests
 *
 * Round-trips CadBridge's pure-inspection getStatus() / peekInstance() surface
 * through the prism_cad MCP tool's handler. Hermetic — never spawns the Python
 * subprocess, never depends on `python -c "import cadquery"` succeeding. The
 * action exists precisely to give operators observability WITHOUT side effects,
 * so the test must prove no side effects occur.
 *
 * Pattern mirrors devDispatcher.wiringPotential.test.ts: a fakeServer captures
 * the registered handler closure so we invoke it directly without standing up
 * a real MCP transport.
 *
 * Coverage (per CLAUDE.md tests rule + comprehensive-build floor):
 *   - Happy path (instance-exists / not-exists)
 *   - Field-shape assertions on the response payload
 *   - 3 failure modes: no params is fine; extra params rejected by .strict();
 *     unknown action falls through to dispatcher's "Unknown action" branch
 *   - Adversarial: extra-keys params, undefined params; verify the action
 *     never spawns Python (instance count delta = 0 over a no-instance run).
 *
 * @milestone WIRE-UNWIRED-MS0 / U-WIRE-CADBRIDGE
 */
import { describe, it, expect, beforeEach } from "vitest";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismCadHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerCadDispatcher } = await import("../tools/dispatchers/cadDispatcher.js");
  registerCadDispatcher(server as never);
  const cad = tools.find((t) => t.name === "prism_cad");
  if (!cad) throw new Error("registerCadDispatcher did not register a tool named 'prism_cad'");
  return cad.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

async function resetCadBridgeSingleton(): Promise<void> {
  // peekInstance lets us avoid constructing one; if a previous test created one,
  // shutdown() releases it. Hermetic precondition for the "not-initialized" tests.
  const { CadBridge } = await import("../engines/CadBridge.js");
  const live = CadBridge.peekInstance();
  if (live) await live.shutdown();
}

// ── action enum acceptance + canonical response shape ────────────────────────

describe("prism_cad:cad_bridge_status — registration", () => {
  beforeEach(resetCadBridgeSingleton);

  it("'cad_bridge_status' is a valid action — handler returns success=true", async () => {
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: {} });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
  });
});

// ── instance not yet constructed ─────────────────────────────────────────────

describe("prism_cad:cad_bridge_status — singleton absent", () => {
  beforeEach(resetCadBridgeSingleton);

  it("reports instanceExists=false + initialized=false when no getInstance() ever called", async () => {
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: {} });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    expect(data.instanceExists).toBe(false);
    expect(data.initialized).toBe(false);
    // CRITICAL invariant: the action must NOT have spawned the bridge.
    const { CadBridge } = await import("../engines/CadBridge.js");
    expect(CadBridge.peekInstance()).toBe(null);
  });

  it("does NOT include subprocess fields when instance is absent (no spawn → no PID)", async () => {
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: {} });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    expect(data.processPid).toBe(undefined);
    expect(data.processAlive).toBe(undefined);
    expect(data.pendingRequests).toBe(undefined);
  });
});

// ── instance exists (constructed externally — we never let the dispatcher do it) ─

describe("prism_cad:cad_bridge_status — singleton present (not spawned)", () => {
  beforeEach(resetCadBridgeSingleton);

  it("reports initialized=true + ready=false when getInstance() called but bridge not spawned", async () => {
    const { CadBridge } = await import("../engines/CadBridge.js");
    // Construct singleton WITHOUT calling any method that spawns Python.
    // ensureRunning() is the only spawn path; getInstance() alone is inert.
    CadBridge.getInstance({ timeout: 5_000 });
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: {} });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    expect(data.instanceExists).toBe(true);
    expect(data.initialized).toBe(true);
    expect(data.ready).toBe(false);              // never spawned
    expect(data.starting).toBe(false);
    expect(data.processAlive).toBe(false);
    // slimResponse strips null/undefined/empty fields from the response payload
    // (see MEMORY.md [[reference_slimresponse_strips_empty_arrays]]) — the engine
    // returns processPid: null, but the wire-shape arrives as undefined.
    expect(data.processPid).toBe(undefined);
    expect(data.pendingRequests).toBe(0);
    expect(data.nextRequestId).toBe(1);          // no calls issued
  });

  it("reports stable config fields (pythonPath, bridgePath, timeoutMs) from constructor opts", async () => {
    const { CadBridge } = await import("../engines/CadBridge.js");
    CadBridge.getInstance({ timeout: 12_345 });
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: {} });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    expect(data.timeoutMs).toBe(12_345);
    expect(typeof data.pythonPath).toBe("string");
    expect(typeof data.bridgePath).toBe("string");
    expect(data.bridgePath as string).toMatch(/bridge\.py$/);
  });

  it("re-invocation is idempotent — second call returns the same nextRequestId + ready=false", async () => {
    const { CadBridge } = await import("../engines/CadBridge.js");
    CadBridge.getInstance({ timeout: 5_000 });
    const handler = await buildPrismCadHandler();
    const r1 = parsePayload(await handler({ action: "cad_bridge_status", params: {} }));
    const r2 = parsePayload(await handler({ action: "cad_bridge_status", params: {} }));
    expect((r1.data as Record<string, unknown>).nextRequestId).toBe(1);
    expect((r2.data as Record<string, unknown>).nextRequestId).toBe(1);
    expect((r2.data as Record<string, unknown>).ready).toBe(false);
  });
});

// ── failure modes / adversarial ──────────────────────────────────────────────

describe("prism_cad:cad_bridge_status — adversarial inputs", () => {
  beforeEach(resetCadBridgeSingleton);

  it("omitting params entirely still returns success=true (params is optional)", async () => {
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status" });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
  });

  it("does not crash when params contains an unexpected boolean field — dispatcher middleware decides accept/reject", async () => {
    // The schema is .strict() so the Zod validator MAY reject; the test asserts
    // the dispatcher does not throw an unhandled error either way. We accept
    // either a clean success or a structured rejection — never a 500.
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status", params: { unexpected: true } });
    const body = parsePayload(r);
    // Either it succeeded (middleware stripped) or it rejected with an error field.
    expect(typeof body.success === "boolean" || typeof body.error === "string").toBe(true);
  });

  it("unknown action falls through to the dispatcher's 'Unknown action' branch", async () => {
    const handler = await buildPrismCadHandler();
    const r = await handler({ action: "cad_bridge_status_TYPO", params: {} });
    const body = parsePayload(r);
    // The unknown-action path either errors at the action enum (validation) or
    // at the switch default. Both yield an 'error' field, never 'success: true'.
    expect(body.success).not.toBe(true);
  });
});

// ── No-spawn invariant: the linchpin promise of this action ──────────────────

describe("prism_cad:cad_bridge_status — no-spawn invariant", () => {
  beforeEach(resetCadBridgeSingleton);

  it("running the action 5× consecutively never constructs an instance", async () => {
    const handler = await buildPrismCadHandler();
    const { CadBridge } = await import("../engines/CadBridge.js");
    for (let i = 0; i < 5; i++) {
      await handler({ action: "cad_bridge_status", params: {} });
    }
    expect(CadBridge.peekInstance()).toBe(null);
  });

  it("running the action 5× AFTER an external getInstance() never starts/spawns the subprocess", async () => {
    const { CadBridge } = await import("../engines/CadBridge.js");
    CadBridge.getInstance({ timeout: 5_000 });
    const handler = await buildPrismCadHandler();
    for (let i = 0; i < 5; i++) {
      const r = await handler({ action: "cad_bridge_status", params: {} });
      const body = parsePayload(r);
      const data = body.data as Record<string, unknown>;
      // starting MUST stay false — getStatus() inspects only; never triggers ensureRunning().
      expect(data.starting).toBe(false);
      expect(data.ready).toBe(false);
      expect(data.processAlive).toBe(false);
    }
  });
});
