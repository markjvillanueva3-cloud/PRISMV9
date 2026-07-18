/**
 * devDispatcher U-WIRE-PACT round-trip tests -- PactContractTestEngine.
 *
 * Validates the 3 new pact_* actions wire through prism_dev:
 *   pact_define_contract       -> PactContractTestEngine.defineContract(params)
 *   pact_verify_interaction    -> PactContractTestEngine.verifyInteraction(contract, id, actual)
 *   pact_check_backward_compat -> PactContractTestEngine.checkBackwardCompat(oldC, newC)
 *
 * PactContractTestEngine is consumer-driven contract testing: a contract pins the
 * response shape (matchers + required paths) a consumer expects from a provider;
 * verification checks a real response against it; backward-compat diffs two contract
 * versions and flags breaking changes. Pure compute -- no HTTP, no broker, no stubs.
 * All methods are static on the exported class.
 *
 * Content-sensitive proofs (a stub would fail these):
 *   - a type:number matcher PASSES {rpm:1000} and FAILS {rpm:"fast"} (real matcher logic).
 *   - adding a required field to a new contract version is flagged required_field_added.
 *   - defineContract THROWS on duplicate interaction ids.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2.1 (post-11/11 audit
 * re-run surfaced this CLEAN engine; galaxy:dev wired into prism_dev, papa home).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-PACT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { PactContractTestEngine } from "../engines/PactContractTestEngine.js";

// A minimal interaction: the provider response must carry a numeric "rpm".
const IX = {
  id: "orch:success",
  description: "successful run",
  expected: { rpm: { kind: "type", type: "number" } },
  required: ["rpm"],
};
const CONTRACT_PARAMS = { consumer: "ui", provider: "orch", version: "1.0.0", interactions: [IX], now: 1000 };
// A *built* Contract (verify/compat inputs) carries createdAt -- the defineContract output shape,
// NOT the define params (which carry `now`). PACT_CONTRACT_SCHEMA requires createdAt.
const CONTRACT = { consumer: "ui", provider: "orch", version: "1.0.0", createdAt: 1000, interactions: [IX] };

type DefineParams = Parameters<typeof PactContractTestEngine.defineContract>[0];
type ContractT = Parameters<typeof PactContractTestEngine.verifyInteraction>[0];

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
  const tool = server.tools.find((t) => t.name === "prism_dev") ?? server.tools[0]!;
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

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-PACT -- PactContractTestEngine contract", () => {
  it("defineContract builds a contract from interactions", () => {
    const c = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    expect(c.consumer).toBe("ui");
    expect(c.provider).toBe("orch");
    expect(c.createdAt).toBe(1000);                 // `now` override is honored (deterministic)
    expect(c.interactions.length).toBe(1);
  });

  it("defineContract throws on a duplicate interaction id", () => {
    const dup = { ...CONTRACT_PARAMS, interactions: [IX, { ...IX }] };
    expect(() => PactContractTestEngine.defineContract(dup as unknown as DefineParams)).toThrow();
  });

  it("verifyInteraction PASSES a response that satisfies the matcher", () => {
    const c = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    const r = PactContractTestEngine.verifyInteraction(c, "orch:success", { rpm: 1000 });
    expect(r.passed).toBe(true);
    expect(r.failures.length).toBe(0);
    expect(r.requiredChecked).toBe(1);              // the one required path was checked
  });

  it("verifyInteraction FAILS a response that violates the type matcher", () => {
    const c = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    const r = PactContractTestEngine.verifyInteraction(c, "orch:success", { rpm: "fast" });
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => f.path === "rpm")).toBe(true); // the rpm matcher is the failure (real matcher logic)
  });

  it("checkBackwardCompat flags an added required field as breaking", () => {
    const oldC = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    const newIx = { ...IX, required: ["rpm", "torque"] };
    const newC = PactContractTestEngine.defineContract({ ...CONTRACT_PARAMS, version: "2.0.0", interactions: [newIx] } as unknown as DefineParams);
    const r = PactContractTestEngine.checkBackwardCompat(oldC, newC);
    expect(r.backwardCompatible).toBe(false);
    expect(r.breakingChanges.some((b) => b.kind === "required_field_added")).toBe(true);
  });

  it("checkBackwardCompat reports identical contracts as compatible", () => {
    const a = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    const b = PactContractTestEngine.defineContract(CONTRACT_PARAMS as unknown as DefineParams);
    const r = PactContractTestEngine.checkBackwardCompat(a, b);
    expect(r.backwardCompatible).toBe(true);
    expect(r.breakingChanges.length).toBe(0);
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-PACT -- dispatcher round-trip (prism_dev)", () => {
  it("pact_define_contract returns a built contract through the dispatcher", async () => {
    const r = await call(server, "pact_define_contract", CONTRACT_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data.consumer).toBe("ui");
    expect(r.data.createdAt).toBe(1000);
    expect((r.data.interactions as unknown[]).length).toBe(1);
  });

  it("pact_verify_interaction round-trips a PASS verdict", async () => {
    const r = await call(server, "pact_verify_interaction", { contract: CONTRACT, interactionId: "orch:success", actualResponse: { rpm: 1000 } });
    expect(r.ok).toBe(true);
    expect(r.data.passed).toBe(true);               // true survives slimResponse
    expect(r.data.interactionId).toBe("orch:success");
  });

  it("pact_verify_interaction round-trips a FAIL verdict with the failure path", async () => {
    const r = await call(server, "pact_verify_interaction", { contract: CONTRACT, interactionId: "orch:success", actualResponse: { rpm: "fast" } });
    expect(r.ok).toBe(true);
    expect(r.data.passed).toBe(false);              // false survives slimResponse
    const failures = r.data.failures as { path: string }[];
    expect(failures.some((f) => f.path === "rpm")).toBe(true);  // non-empty array survives slim
  });

  it("pact_check_backward_compat round-trips a breaking-change verdict", async () => {
    const newIx = { ...IX, required: ["rpm", "torque"] };
    const newContract = { ...CONTRACT, version: "2.0.0", interactions: [newIx] };
    const r = await call(server, "pact_check_backward_compat", { oldContract: CONTRACT, newContract });
    expect(r.ok).toBe(true);
    expect(r.data.backwardCompatible).toBe(false);  // false survives slim
    expect((r.data.breakingChanges as unknown[]).length).toBeGreaterThan(0);
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-PACT -- schema rejection (prism_dev)", () => {
  it("rejects pact_define_contract with a missing consumer", async () => {
    const r = await call(server, "pact_define_contract", { provider: "orch", version: "1.0.0", interactions: [IX] });
    expect(r.ok).toBe(false);
  });

  it("rejects pact_define_contract with an empty interactions array", async () => {
    const r = await call(server, "pact_define_contract", { consumer: "ui", provider: "orch", version: "1.0.0", interactions: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects pact_verify_interaction with a missing interactionId", async () => {
    // Use a VALID contract (createdAt present) so the ONLY schema violation is the absent
    // interactionId -- proving interactionId is required, not rejecting on the contract shape.
    const r = await call(server, "pact_verify_interaction", { contract: CONTRACT, actualResponse: { rpm: 1000 } });
    expect(r.ok).toBe(false);
  });
});
