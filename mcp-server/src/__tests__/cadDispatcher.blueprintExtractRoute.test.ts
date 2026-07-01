/**
 * cadDispatcher.blueprintExtractRoute.test.ts -- round-trip wire test for the
 * `blueprint_extract_route` action (U-XRAY-EXTRACT-CONSUMER-ROUTER). Proves the full app chain THROUGH
 * prism_cad: a producer extraction -> `blueprint_extract_contract` (versioned contract) ->
 * `blueprint_extract_route` (the fan-out plan: which prism features can consume it, with confirm-gates).
 * The router's own logic is covered exhaustively by blueprintExtractionRouter.test.ts; THIS file proves
 * the DISPATCHER contract: the ACTIONS enum entry, the lazy imports, the contract-validation guard, and
 * that the chain produces real routing numbers end-to-end.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { BLUEPRINT_ROUTING_PLAN_VERSION } from "../engines/blueprint-vision/blueprintExtractionRouter.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = (await handler({ action, params })) as any;
  if (res && res.success === false) return res;
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}
const routeById = (plan: any, id: string) => plan.routes.find((r: any) => r.consumer === id);

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher blueprint_extract_route (U-XRAY-EXTRACT-CONSUMER-ROUTER fan-out through prism_cad)", () => {
  it("high-trust extraction -> contract -> route: dim consumers ready, no PII/material consumers", async () => {
    // chain the two app actions exactly as the upload->extract->route flow will
    const c = await invoke("blueprint_extract_contract", {
      fused: {
        dimensions: [{ value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated" }],
        gdt: [{ raw_text: "|POS|0.05|A|", confidence: 0.85, corroboration: 2, n_models: 2 }],
        notes: [], profiles: [], surface_finishes: [],
        summary: { n_models: 2 },
      },
    });
    expect(c.success).toBe(true);
    const res = await invoke("blueprint_extract_route", { contract: c.data.contract });
    expect(res.success).toBe(true);
    const plan = res.data.plan;
    expect(plan.schemaVersion).toBe(BLUEPRINT_ROUTING_PLAN_VERSION);
    // 1 high-trust dim + 1 high-trust gd&t, NO title-block -> dim/gdt consumers (feature/cad/quote/program/
    // inspection + fai_run + cmm + spc + stock/fixture/tool + job_create + the 4 gap-close dim consumers
    // smart_tool_select/stock_allowance/lathe_workholding/setup_sheet) = 16 eligible+ready; redact (no customer),
    // material_resolve + speed_feed + material_price_lookup (no material) ineligible
    expect(plan.summary.n_eligible).toBe(16);
    expect(plan.summary.n_ready).toBe(16);
    expect(plan.summary.n_blocked_on_confirm).toBe(0);
    expect(plan.summary.n_ineligible).toBe(4);
    expect(routeById(plan, "fai_run").eligible).toBe(true); // dims+gd&t -> AS9102 characteristics
    expect(routeById(plan, "job_create").eligible).toBe(true); // dims -> job pre-populatable
    expect(routeById(plan, "material_price_lookup").eligible).toBe(false); // no material extracted
    expect(routeById(plan, "redact").eligible).toBe(false);
    expect(routeById(plan, "speed_feed").eligible).toBe(false); // no material extracted
    expect(routeById(plan, "tool_select").eligible).toBe(true); // dims -> tools recommendable
    expect(routeById(plan, "inspection_plan").eligible).toBe(true);
    expect(routeById(plan, "quote").action).toBe("blueprint_to_quote");
  });

  it("low-confidence dims + a customer title-block -> redact eligible + commitment consumers confirm-gated", async () => {
    const c = await invoke("blueprint_extract_contract", {
      fused: {
        dimensions: [{ value_mm: 10, type: "linear", agreement_confidence: 0.5, status: "singleton" }],
        gdt: [], notes: [], profiles: [], surface_finishes: [],
        summary: { n_models: 2 },
      },
      titleBlock: { customer: "SEMBLEX", material: "4140 steel" },
    });
    expect(c.success).toBe(true);
    expect(c.data.contract.dimensions[0].needs_confirm).toBe(true); // 0.5 < 0.70 floor
    const res = await invoke("blueprint_extract_route", { contract: c.data.contract });
    const plan = res.data.plan;
    expect(plan.summary.n_eligible).toBe(20); // every consumer eligible (dims + customer + material)
    expect(plan.summary.n_blocked_on_confirm).toBe(5); // quote, print_to_program, inspection_plan, fai_run, cmm_plan_path
    expect(plan.summary.n_ready).toBe(15); // 5 advisory/privacy + 4 machining-prep + spc + 2 business + 4 gap-close stay ready
    expect(plan.summary.n_needs_confirm).toBe(1);
    expect(routeById(plan, "redact").eligible).toBe(true);
    // the operator-facing reason names the masked FIELD PATH, never the cleartext value (no PII echo)
    expect(routeById(plan, "redact").reason).toContain("title_block.customer");
    expect(routeById(plan, "redact").reason).not.toContain("SEMBLEX");
    // R15 round-trip: the AUTO-REDACTED artifact survives contract -> route -> JSON through prism_cad
    expect(routeById(plan, "redact").payload.redacted_extraction.title_block.customer).toBe("[REDACTED]");
    expect(routeById(plan, "redact").payload.pii_fields).toContain("title_block.customer");
    expect(routeById(plan, "quote").requires_confirmation).toBe(true);
    expect(routeById(plan, "quote").blocking_fields).toBe(1);
    expect(routeById(plan, "feature_recognize").requires_confirmation).toBe(false); // advisory never gated
    expect(routeById(plan, "speed_feed").eligible).toBe(true); // material "4140 steel" present
    expect(routeById(plan, "speed_feed").requires_confirmation).toBe(false); // advisory, never gated on the unconfirmed dim
  });

  it("includeIneligible:false through the dispatcher -> only eligible routes returned", async () => {
    const c = await invoke("blueprint_extract_contract", {
      fused: { dimensions: [], gdt: [{ raw_text: "|FLAT|0.1|", confidence: 0.9, corroboration: 2, n_models: 2 }], summary: { n_models: 2 } },
    });
    const res = await invoke("blueprint_extract_route", { contract: c.data.contract, includeIneligible: false });
    const plan = res.data.plan;
    expect(plan.routes.length).toBe(3); // GD&T drives inspection_plan + fai_run + cmm_plan_path
    expect(plan.routes.map((r: any) => r.consumer).sort()).toEqual(["cmm_plan_path", "fai_run", "inspection_plan"]);
    expect(plan.summary.n_ineligible).toBe(17); // summary still spans the full consumer set (20 - 3 eligible)
  });

  it("redactPayloads:true -> external-safe plan: customer masked in payloads + plan.redacted, material preserved", async () => {
    const c = await invoke("blueprint_extract_contract", {
      fused: {
        dimensions: [{ value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated" }],
        gdt: [], notes: [], profiles: [], surface_finishes: [],
        summary: { n_models: 2 },
      },
      titleBlock: { customer: "SEMBLEX", material: "4140 steel" },
    });
    const res = await invoke("blueprint_extract_route", { contract: c.data.contract, redactPayloads: true });
    const plan = res.data.plan;
    expect(plan.redacted).toBe(true);
    const quoteTb = routeById(plan, "quote").payload.title_block;
    expect(quoteTb.customer).toBe("[REDACTED]"); // PII masked in the consumer payload through the dispatcher
    expect(quoteTb.material).toBe("4140 steel");  // non-PII preserved
    // default (no redactPayloads) keeps the raw customer -- proves the flag is the gate
    const plain = (await invoke("blueprint_extract_route", { contract: c.data.contract })).data.plan;
    expect(plain.redacted).toBeUndefined();
    expect(routeById(plain, "quote").payload.title_block.customer).toBe("SEMBLEX");
  });

  it("missing contract -> descriptive error (no silent empty success)", async () => {
    const res = await invoke("blueprint_extract_route", {});
    expect(JSON.stringify(res).toLowerCase()).toContain("requires contract");
  });

  it("invalid contract (wrong schemaVersion) -> rejected, never routed", async () => {
    const res = await invoke("blueprint_extract_route", { contract: { schemaVersion: "9.9.9", dimensions: [] } });
    expect(JSON.stringify(res).toLowerCase()).toContain("invalid contract");
  });
});

describe("cadDispatcher blueprint_extract_and_route (U-XRAY-EXTRACT-AND-ROUTE one-call chain)", () => {
  it("fused producer -> contract + confirm-gated fan-out plan in ONE dispatcher call", async () => {
    const res = await invoke("blueprint_extract_and_route", {
      fused: {
        dimensions: [{ value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated" }],
        gdt: [], notes: [], profiles: [], surface_finishes: [],
        summary: { n_models: 2 },
      },
      titleBlock: { customer: "SEMBLEX", material: "4140 steel" },
    });
    expect(res.success).toBe(true);
    expect(res.data.producer).toBe("fused");
    expect(res.data.valid).toBe(true);
    expect(res.data.contract.dimensions).toHaveLength(1); // contract produced
    expect(res.data.plan.schemaVersion).toBeTruthy(); // plan produced -- the chain ran end to end
    expect(routeById(res.data.plan, "redact").eligible).toBe(true); // customer -> PII redact
    expect(routeById(res.data.plan, "quote").eligible).toBe(true); // dim + material -> quotable
    expect(res.data.plan.summary.n_eligible).toBeGreaterThan(5);
  });

  it("NEITHER producer -> descriptive error (the exactly-one guard runs before any work)", async () => {
    const res = await invoke("blueprint_extract_and_route", {});
    expect(JSON.stringify(res).toLowerCase()).toContain("exactly one");
  });
});
