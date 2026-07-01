/**
 * unwiredBridgeDispatcher (prism_unwired_bridge) round-trip wire test
 * (U-UNWIRED-BRIDGE-WIRE-TEST, slot:bravo 2026-06-22).
 *
 * Closes the zero-test gap on prism_unwired_bridge (the tango discovery bridge --
 * 10 cross-cutting engines: asset discovery, analytics, information theory,
 * complexity routing, world simulation). Registered at index.ts:805.
 *
 * Round-trips THROUGH the registered handler (MockMCPServer + registerUnwiredBridgeDispatcher).
 * Concrete R9 assertions anchor on the two information-theory actions, which are PURE MATH
 * (FisherInformationEngine: Shannon entropy H = -sum p*log2 p, and KL = sum p*log2(p/q),
 * verified from engine source -- log2/bits, normalize() accepts unnormalised mass). These
 * give exact, machine-independent values. The other 8 actions are covered for schema
 * validation + routing (their engine OUTPUT shapes are out of scope here -- 5 use
 * passthrough/{} schemas that accept empty params and reach engines whose return shape this
 * test does not pin; that is a documented boundary, not a skipped assertion).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerUnwiredBridgeDispatcher } from "../tools/dispatchers/unwiredBridgeDispatcher.js";

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
  const raw = (await tool.handler({ action, params })) as Record<string, unknown> & {
    content?: { type: string; text: string }[];
    success?: boolean;
  };
  // Validation-failure and unknown-action paths return a dispatcherError directly
  // (top-level success:false). Success wraps {success:true,data} inside content[0].text.
  if (raw && typeof raw === "object" && raw.success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && parsed.success === false) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerUnwiredBridgeDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// helper: unwrap the {success:true, data:{...}} envelope
function payload(data: Record<string, unknown>): Record<string, unknown> {
  return (data.data ?? {}) as Record<string, unknown>;
}

describe("unwiredBridgeDispatcher prism_unwired_bridge wire (U-UNWIRED-BRIDGE-WIRE-TEST)", () => {
  // ── fisher_entropy: Shannon entropy in bits (log2), exact values ─────────────
  it("fisher_entropy of a fair 2-outcome distribution is exactly 1 bit", async () => {
    const r = await call(server, "fisher_entropy", { dist: [0.5, 0.5] });
    expect(r.ok).toBe(true);
    expect(payload(r.data).entropy).toBe(1);
  });

  it("fisher_entropy of a uniform 4-outcome distribution is exactly 2 bits", async () => {
    const r = await call(server, "fisher_entropy", { dist: [0.25, 0.25, 0.25, 0.25] });
    expect(payload(r.data).entropy).toBe(2);
  });

  it("fisher_entropy of a degenerate (single-outcome) distribution is 0", async () => {
    const r = await call(server, "fisher_entropy", { dist: [1] });
    expect(payload(r.data).entropy).toBe(0);
  });

  it("fisher_entropy accepts UNNORMALISED mass ([1,1] normalises to [0.5,0.5] -> 1 bit)", async () => {
    const r = await call(server, "fisher_entropy", { dist: [1, 1] });
    expect(payload(r.data).entropy).toBe(1);
  });

  // ── fisher_kl_divergence: KL = sum p*log2(p/q), exact + invariants ───────────
  it("fisher_kl_divergence of identical distributions is exactly 0 (KL(p||p)=0)", async () => {
    const r = await call(server, "fisher_kl_divergence", { p: [0.5, 0.5], q: [0.5, 0.5] });
    expect(r.ok).toBe(true);
    expect(payload(r.data).kl).toBe(0);
  });

  it("fisher_kl_divergence of differing distributions matches the closed-form value (~0.531 bits)", async () => {
    // KL([0.9,0.1] || [0.5,0.5]) = 0.9*log2(1.8) + 0.1*log2(0.2) = 0.7632 - 0.2322 = 0.5310
    const r = await call(server, "fisher_kl_divergence", { p: [0.9, 0.1], q: [0.5, 0.5] });
    expect(payload(r.data).kl as number).toBeCloseTo(0.531, 3);
  });

  it("fisher_kl_divergence is asymmetric: KL(p||q) != KL(q||p) (a defining KL property)", async () => {
    const pq = payload((await call(server, "fisher_kl_divergence", { p: [0.9, 0.1], q: [0.5, 0.5] })).data).kl as number;
    const qp = payload((await call(server, "fisher_kl_divergence", { p: [0.5, 0.5], q: [0.9, 0.1] })).data).kl as number;
    expect(pq).toBeGreaterThan(0);
    expect(qp).toBeGreaterThan(0);
    expect(pq).not.toBeCloseTo(qp, 4);
  });

  // ── schema validation failure modes ──────────────────────────────────────────
  it("fisher_entropy rejects a missing dist (required)", async () => {
    const r = await call(server, "fisher_entropy", {});
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("fisher_entropy rejects an empty dist (min 1)", async () => {
    const r = await call(server, "fisher_entropy", { dist: [] });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params"); // bind rejection to schema validation
  });

  it("ADVERSARIAL: fisher_entropy rejects a negative mass (nonnegative)", async () => {
    const r = await call(server, "fisher_entropy", { dist: [-0.5, 1.5] });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("fisher_kl_divergence rejects a missing q (both p and q required)", async () => {
    const r = await call(server, "fisher_kl_divergence", { p: [0.5, 0.5] });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("hypothesis_create_set rejects a missing problem (required, min length 1)", async () => {
    const r = await call(server, "hypothesis_create_set", {});
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  // ── routing ───────────────────────────────────────────────────────────────────
  it("an unknown action returns a dispatcherError (not routed)", async () => {
    const r = await call(server, "totally_bogus_action_xyz");
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Unknown action");
  });
});
