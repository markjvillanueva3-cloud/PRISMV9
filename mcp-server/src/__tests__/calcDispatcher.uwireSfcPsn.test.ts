/**
 * calcDispatcher U-WIRE-SFC-PSN round-trip tests -- SpeedFeedPSNDecisionPriorEngine.
 *
 * Validates the new sfc_psn_decision_prior action wires through prism_calc:
 *   sfc_psn_decision_prior -> speedFeedPSNDecisionPriorEngine.query(NineAxisInput)
 *
 * query() fuses a speed/feed decision prior from 3 PSN surfaces (outcome ledger
 * JSONL + tribal knowledge + wiki), best-effort on each (never throws; no matching
 * data -> prior_exists:false, all confidences 0, "use pure physics" summary). It is
 * READ-ONLY -- this wire exposes the query surface; the engine's priors / fusion
 * physics are NOT edited (oscar owns the SFC galaxy).
 *
 * Engine-direct tests inject a tmp projectRoot (constructor injection) so the 3
 * sources are provably empty -> deterministic prior_exists:false. The dispatcher
 * round-trip uses the singleton (real root) and asserts structure only (the prior
 * values depend on live PSN data).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:oscar engine wired into prism_calc).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SFC-PSN
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as os from "node:os";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { SpeedFeedPSNDecisionPriorEngine } from "../engines/SpeedFeedPSNDecisionPriorEngine.js";

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
  const tool = server.tools.find((t) => t.name === "prism_calc") ?? server.tools[0]!;
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

// A unique material name guarantees no PSN match in any source (deterministic empty prior).
const INPUT = {
  material: { name: "TestSteel_UWIRE_SFC_PSN_xyz", iso_group: "P" },
  tooling: { tool_diameter_mm: 10, flutes: 4, tool_material: "carbide" }, // engine reads tooling.tool_diameter_mm
};
type QueryInput = Parameters<SpeedFeedPSNDecisionPriorEngine["query"]>[0];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct contract (hermetic: tmp root => no PSN data) ---------------
describe("U-WIRE-SFC-PSN -- query contract (hermetic empty sources)", () => {
  it("fuses 3 PSN sources and reports prior_exists:false when no data matches", () => {
    const eng = new SpeedFeedPSNDecisionPriorEngine(os.tmpdir()); // tmp root: no ledger/tribal/wiki
    const prior = eng.query(INPUT as unknown as QueryInput);
    expect(prior.per_source.length).toBe(3);          // outcome ledger + tribal + wiki
    expect(prior.prior_exists).toBe(false);           // nothing matched in an empty root
    expect(prior.fused.confidence).toBe(0);
    expect(typeof prior.summary).toBe("string");
    expect(prior.summary.length).toBeGreaterThan(0);
    for (const s of prior.per_source) {
      expect(s.sample_count).toBe(0);
      expect(s.confidence).toBe(0);
    }
  });

  it("never throws on a minimal input (best-effort per source)", () => {
    const eng = new SpeedFeedPSNDecisionPriorEngine(os.tmpdir());
    expect(() => eng.query(INPUT as unknown as QueryInput)).not.toThrow();
  });
});

// -- LIVE round-trip through prism_calc (the wire proof) ----------------------
describe("U-WIRE-SFC-PSN -- dispatcher round-trip (prism_calc)", () => {
  it("sfc_psn_decision_prior returns a fused prior through the dispatcher", async () => {
    const r = await call(server, "sfc_psn_decision_prior", INPUT);
    expect(r.ok).toBe(true);
    expect((r.data.per_source as unknown[]).length).toBe(3);  // 3 PSN sources fused
    expect(typeof r.data.summary).toBe("string");
    expect(r.data.fused).toBeTruthy();                         // fused contribution object present
  });

  it("the sfc_psn_decision_prior action is accepted by the registered dispatcher", async () => {
    const r = await call(server, "sfc_psn_decision_prior", INPUT);
    expect(r.ok).toBe(true);
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-SFC-PSN -- schema rejection (prism_calc)", () => {
  it("rejects a missing material (required)", async () => {
    const r = await call(server, "sfc_psn_decision_prior", { tooling: INPUT.tooling });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing tooling (required)", async () => {
    const r = await call(server, "sfc_psn_decision_prior", { material: INPUT.material });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-object material (must be a NineAxisMaterial object)", async () => {
    const r = await call(server, "sfc_psn_decision_prior", { material: "steel", tooling: INPUT.tooling });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-object tooling (must be a NineAxisTooling object)", async () => {
    const r = await call(server, "sfc_psn_decision_prior", { material: INPUT.material, tooling: "carbide" });
    expect(r.ok).toBe(false);
  });
});
