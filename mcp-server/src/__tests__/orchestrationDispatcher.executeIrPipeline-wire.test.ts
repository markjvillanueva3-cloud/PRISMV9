/**
 * orchestrationDispatcher U-PIR03 round-trip tests (PIPELINE-IR-MS0, slot:bravo).
 *
 * Validates the prism_orchestrate `execute_ir_pipeline` action that wires
 * PipelineIRExecutorEngine through the live dispatcher with an INJECTED DRY-RUN
 * invoker. The action validates + topo-orders + DRY-RUN-previews a declarative
 * PipelineIR and records the {dispatcher, action, params} each stage WOULD invoke
 * in topological order -- with ZERO cross-dispatcher actuation (every result
 * carries `actuated:false`). Live actuation is intentionally REFUSED (bravo soul:
 * unsafe-fleet-control-before-governance) until a safety-tier allowlist gate ships.
 *
 * Pattern mirrors camDispatcher.holderSelect-wire.test.ts: LIVE dispatcher
 * round-trip via registerOrchestrationDispatcher(shim). A successful handler return
 * is content[0].text = JSON.stringify(slimResponse(payload)); slimResponse strips
 * null/undefined/empty (so empty executed/skipped/failed arrays vanish -> read with
 * `?? []`) but KEEPS false/0 (so `actuated:false` and `ok:false` survive). A schema
 * rejection returns raw { success:false }.
 *
 * Reference fixture: PRINT_TO_PROGRAM_IR (the worked 4-stage example from the
 * U-PIR01 schema) -- topo order extract -> speed_feed -> toolpath -> safety.
 *
 * @milestone PIPELINE-IR-MS0
 * @unit U-PIR03
 */
import { describe, it, expect } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";
import { PRINT_TO_PROGRAM_IR } from "../schemas/PipelineIR.js";

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
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerOrchestrationDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_orchestrate") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  // A top-level `error` (without `success`) is a logical refusal/handler error.
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("U-PIR03 -- execute_ir_pipeline via prism_orchestrate", () => {
  it("registers the prism_orchestrate tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_orchestrate");
    expect(tool?.name).toBe("prism_orchestrate");
  });

  // ── happy path: the worked print-to-program IR ──────────────────────────
  it("dry-runs PRINT_TO_PROGRAM_IR in topo order with zero actuation", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", { pipeline: PRINT_TO_PROGRAM_IR });
    expect(r.ok).toBe(true);
    expect(r.data.ok).toBe(true);
    expect(r.data.phase).toBe("run");
    expect(r.data.actuated).toBe(false); // <- the safety invariant: never actuated
    // executed in dependency-respecting topo order
    expect(r.data.executed).toEqual(["extract", "speed_feed", "toolpath", "safety"]);
    expect((r.data.skipped as string[] | undefined) ?? []).toEqual([]);
    expect((r.data.failed as string[] | undefined) ?? []).toEqual([]);
    // the "would-invoke" trace: one descriptor per stage, in topo order
    const invocations = r.data.invocations as { dispatcher: string; action: string }[];
    expect(invocations.map((i) => `${i.dispatcher}:${i.action}`)).toEqual([
      "prism_cad:extract_features",
      "prism_calc:speed_feed",
      "prism_cam:toolpath_generate",
      "prism_safety:validate_physics",
    ]);
  });

  // ── variability: single-stage pipeline ──────────────────────────────────
  it("dry-runs a single-stage pipeline (one invocation)", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", {
      pipeline: { id: "one", stages: [{ id: "only", dispatcher: "prism_calc", action: "ping", dependsOn: [] }] },
    });
    expect(r.ok).toBe(true);
    expect(r.data.ok).toBe(true);
    expect(r.data.executed).toEqual(["only"]);
    expect((r.data.invocations as unknown[]).length).toBe(1);
    expect(r.data.actuated).toBe(false);
  });

  // ── condition gate round-trips through the dispatcher ────────────────────
  it("skips a stage whose condition is a literal false (and never invokes it)", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", {
      pipeline: {
        id: "gated",
        stages: [
          { id: "a", dispatcher: "d", action: "a", dependsOn: [] },
          { id: "gated", dispatcher: "d", action: "g", dependsOn: ["a"], condition: { value: false } },
        ],
      },
    });
    expect(r.ok).toBe(true);
    expect(r.data.executed).toEqual(["a"]);
    expect(r.data.skipped).toEqual(["gated"]);
    // only the non-gated stage was previewed as a would-invoke
    expect((r.data.invocations as { action: string }[]).map((i) => i.action)).toEqual(["a"]);
  });

  // ── governance refusal: live mode is intentionally blocked ──────────────
  it("REFUSES mode='live' (unsafe-fleet-control governance), never actuates", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", { pipeline: PRINT_TO_PROGRAM_IR, mode: "live" });
    expect(r.ok).toBe(false); // logical refusal surfaced as a top-level error
    expect(String(r.data.error)).toMatch(/dry_run|refused|gated/i);
    expect(r.data.actuated).toBe(false);
    expect(r.data.supported_modes).toEqual(["dry_run"]);
  });

  // ── convert-phase failure modes (graph integrity) ───────────────────────
  it("returns phase=convert on a cyclic pipeline (never executes)", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", {
      pipeline: { id: "cyc", stages: [
        { id: "a", dispatcher: "d", action: "a", dependsOn: ["b"] },
        { id: "b", dispatcher: "d", action: "b", dependsOn: ["a"] },
      ] },
    });
    expect(r.data.ok).toBe(false);
    expect(r.data.phase).toBe("convert");
    expect(r.data.actuated).toBe(false);
    const errs = r.data.convertErrors as { code: string }[];
    expect(errs.some((e) => e.code === "cycle")).toBe(true);
  });

  it("returns phase=convert on a dangling dependsOn (adversarial graph)", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", {
      pipeline: { id: "dang", stages: [{ id: "a", dispatcher: "d", action: "a", dependsOn: ["ghost"] }] },
    });
    expect(r.data.ok).toBe(false);
    expect(r.data.phase).toBe("convert");
    const errs = r.data.convertErrors as { code: string }[];
    expect(errs.some((e) => e.code === "dangling-depends-on")).toBe(true);
  });

  // ── schema rejection (failure mode at the validation boundary) ──────────
  it("rejects a missing pipeline at the schema boundary", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", {});
    expect(r.ok).toBe(false);
  });

  // ── adversarial: a structurally-empty pipeline (no stages) ──────────────
  it("rejects an empty-stages pipeline (schema requires >= 1 stage)", async () => {
    const s = newServer();
    const r = await call(s, "execute_ir_pipeline", { pipeline: { id: "empty", stages: [] } });
    // empty stages fails the converter's schema gate -> convert phase, not a throw
    expect(r.data.ok).toBe(false);
    expect(r.data.phase).toBe("convert");
    const errs = r.data.convertErrors as { code: string }[];
    expect(errs.some((e) => e.code === "schema")).toBe(true);
  });
});
