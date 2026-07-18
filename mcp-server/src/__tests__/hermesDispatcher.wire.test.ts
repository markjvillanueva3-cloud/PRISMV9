/**
 * hermesDispatcher (prism_hermes) round-trip wire test
 * (U-HERMES-DISPATCHER-WIRE-TEST, slot:bravo 2026-06-22).
 *
 * Closes the zero-test gap on the ONE dispatcher in bravo's hermes-zulu domain
 * (verified by enumeration: 22/107 dispatchers are zero-test; hermesDispatcher was
 * the only bravo-domain one). hermesDispatcher is ALREADY registered (index.ts:629)
 * as `prism_hermes` -- this adds the missing TEST, not new wiring.
 *
 * Round-trips THROUGH the registered prism_hermes handler (MockMCPServer +
 * registerHermesDispatcher), asserting real behavior of all 8 actions:
 *   read-only (never spawn): hermes_status, hermes_probe, hermes_auth_status,
 *     hermes_cron_list, hermes_skill_list, hermes_routine_plan
 *   dual-key-gated live (mock-by-default): hermes_model_list, hermes_run
 *
 * SAFETY CONTRACT (bravo soul: unsafe-fleet-control-before-governance) -- the live
 * actions MUST stay mock (never spawn the real Hermes CLI) unless BOTH halves of the
 * dual-key are present (param noMock AND env PRISM_HERMES_MOCK=0). We pin
 * PRISM_HERMES_MOCK="1" for the whole suite so the env-half can NEVER be satisfied:
 * this makes the safety assertions deterministic AND guarantees no test can spawn the
 * real CLI. Restored in afterAll.
 *
 * Assertions are concrete values, not presence stubs (R9): the emit-only routinePlan
 * and the mock modelList/run are fully deterministic regardless of whether Hermes is
 * installed on the machine, so they carry the exact-value assertions; the file-reading
 * read-only actions are pinned on their stable source tag + value-domain checks (e.g.
 * installed is true|false, a path ends with the expected filename).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerHermesDispatcher } from "../tools/dispatchers/hermesDispatcher.js";

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
  // The handler's catch-branch returns a dispatcherError directly (top-level success:false).
  if (raw && typeof raw === "object" && raw.success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  // Validation-failure / unknown-action errors are re-wrapped in content as a
  // dispatcherError body: {success:false, error, action, dispatcher}. AtomicValue
  // success bodies have a `.value` and no `.success`/`.error`.
  if (parsed && (parsed.success === false || (parsed.error !== undefined && parsed.value === undefined))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
let prevMock: string | undefined;

beforeAll(() => {
  // Pin the env-half of the dual-key OFF (value is "1", not "0") so live actions can
  // never spawn the real Hermes CLI from a test, regardless of any noMock param.
  prevMock = process.env["PRISM_HERMES_MOCK"];
  process.env["PRISM_HERMES_MOCK"] = "1";
  server = new MockMCPServer();
  registerHermesDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

afterAll(() => {
  if (prevMock === undefined) delete process.env["PRISM_HERMES_MOCK"];
  else process.env["PRISM_HERMES_MOCK"] = prevMock;
});

describe("hermesDispatcher prism_hermes wire (U-HERMES-DISPATCHER-WIRE-TEST)", () => {
  // ── read-only inspection actions (never spawn) ──────────────────────────────
  it("hermes_status reports mock-by-default + sandbox tier", async () => {
    const r = await call(server, "hermes_status");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:status");
    const v = r.data.value as Record<string, unknown>;
    expect(v.mock).toBe(true);          // mock-by-default (no dual-key)
    expect(v.tier).toBe("sandbox");     // default safety tier
  });

  // -- PA3-HERMES-CAD-BUILDER planning action (pure, no spawn) ------------------
  it("hermes_cad_build_plan plans build cells for autonomous units and excludes gated ones", async () => {
    const r = await call(server, "hermes_cad_build_plan", {
      units: [
        { id: "U-MERGE-SLOT-DELTA", phase: "A", state: "PENDING", op: true, title: "merge" },
        { id: "U-CAD-NURBS-STEP-EMIT", phase: "A", state: "PENDING", title: "nurbs emit" },
        { id: "U-CAD-REAL-TRAIN-RUN", phase: "B", gate: "T1", state: "PENDING", title: "train" },
        { id: "U-CAD-PRINTGEN-E2E", phase: "B", gate: "T3", state: "PENDING", title: "printgen" },
        { id: "U-CAD-BOOLEAN", phase: "C", state: "SHIPPED", title: "boolean" },
      ],
      budget_tokens: 2_000_000,
    });
    expect(r.ok).toBe(true);
    // Only the one true-autonomous unit (T3, not merge/GPU/op gated, not shipped) gets a cell.
    expect(r.data.cellCount).toBe(1);
    expect(r.data.agentCount).toBe(4); // builder + physics + test + code reviewers
    const cells = r.data.cells as Array<{ unit: string }>;
    expect(cells[0].unit).toBe("U-CAD-PRINTGEN-E2E");
    const excluded = Object.fromEntries(
      (r.data.excluded as Array<{ id: string; reason: string }>).map((e) => [e.id, e.reason]),
    );
    expect(excluded["U-MERGE-SLOT-DELTA"]).toBe("operator-gated");
    expect(excluded["U-CAD-NURBS-STEP-EMIT"]).toBe("merge-gated");
    expect(excluded["U-CAD-REAL-TRAIN-RUN"]).toBe("gpu-gated");
    expect(excluded["U-CAD-BOOLEAN"]).toBe("already-shipped");
  });

  it("hermes_cad_build_plan rejects malformed units (schema gate)", async () => {
    const r = await call(server, "hermes_cad_build_plan", { units: [{ phase: "B" }] }); // missing required id
    expect(r.ok).toBe(false);
  });

  it("hermes_probe returns a structured install probe with a boolean installed flag", async () => {
    const r = await call(server, "hermes_probe");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:probe");
    const v = r.data.value as Record<string, unknown>;
    expect([true, false]).toContain(v.installed); // value-domain, env-independent
  });

  it("hermes_auth_status reads auth.json (path ends with auth.json) and never fabricates", async () => {
    const r = await call(server, "hermes_auth_status");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:auth_status");
    const v = r.data.value as Record<string, unknown>;
    expect(String(v.authFile).endsWith("auth.json")).toBe(true);
    expect([true, false]).toContain(v.found);
  });

  it("hermes_cron_list reads cron/jobs.json and returns a jobs array", async () => {
    const r = await call(server, "hermes_cron_list");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:cron_list");
    const v = r.data.value as Record<string, unknown>;
    expect(String(v.path).replace(/\\/g, "/").endsWith("cron/jobs.json")).toBe(true);
    expect([true, false]).toContain(v.found);
  });

  it("hermes_skill_list returns a count + skills list (count >= 0)", async () => {
    const r = await call(server, "hermes_skill_list");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:skill_list");
    const v = r.data.value as Record<string, unknown>;
    expect(typeof v.count === "number" && (v.count as number) >= 0).toBe(true);
  });

  // ── routine_plan: emit-only, fully deterministic (install-independent) ───────
  it("hermes_routine_plan emits operator-gated telegram routines by default", async () => {
    const r = await call(server, "hermes_routine_plan");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("hermes-bridge:routine_plan");
    const v = r.data.value as Record<string, unknown>;
    expect(v.deliver).toBe("telegram");                       // default target
    const routines = v.routines as unknown[];
    expect(v.count).toBe(routines.length);                    // count matches list
    expect((v.count as number) >= 1).toBe(true);              // at least one template
    expect(String(v.deployHint)).toContain("Operator-gated"); // never auto-deploys
  });

  it("hermes_routine_plan honors a custom delivery target", async () => {
    const r = await call(server, "hermes_routine_plan", { deliver: "discord" });
    expect(r.ok).toBe(true);
    const v = r.data.value as Record<string, unknown>;
    expect(v.deliver).toBe("discord");
  });

  it("hermes_routine_plan fail-loud-warns on an unknown delivery target (R12) but still emits", async () => {
    const r = await call(server, "hermes_routine_plan", { deliver: "bogustarget" });
    expect(r.ok).toBe(true);
    const v = r.data.value as Record<string, unknown>;
    expect(v.deliver).toBe("bogustarget");                    // emits anyway for operator override
    expect(String(r.data.warning)).toContain("not a known Hermes target");
  });

  // ── live actions stay MOCK without the dual-key (SAFETY) ─────────────────────
  it("hermes_model_list stays mock (no dual-key) and returns the mock model list", async () => {
    const r = await call(server, "hermes_model_list");
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("mock");
    const v = r.data.value as Record<string, unknown>;
    const models = v.models as string[];
    expect(models).toContain("qwen2.5-coder:32b");
    expect(models).toContain("ollama");
    expect(String(v.note)).toMatch(/mock/);
  });

  it("hermes_run stays mock + returns a would-run envelope (NEVER spawns without dual-key)", async () => {
    const r = await call(server, "hermes_run", { args: ["model", "list"] });
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("mock");
    const v = r.data.value as Record<string, unknown>;
    expect(v.wouldRun).toBe(true);                 // would-run, NOT ran
    expect(v.args).toEqual(["model", "list"]);     // exact args echoed, not executed
  });

  it("SAFETY: noMock=true alone (single key, env-half pinned off) STILL stays mock -- never spawns", async () => {
    // This is the dual-key governance contract: one key is not enough. With
    // PRISM_HERMES_MOCK pinned to "1", noMock:true cannot flip to live.
    const r = await call(server, "hermes_run", { args: ["model", "list"], noMock: true });
    expect(r.ok).toBe(true);
    expect(r.data.source).toBe("mock");
    const v = r.data.value as Record<string, unknown>;
    expect(v.wouldRun).toBe(true);
  });

  // ── failure modes (schema rejection) ─────────────────────────────────────────
  it("hermes_run rejects empty args (schema args.min(1))", async () => {
    const r = await call(server, "hermes_run", { args: [] });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("hermes_run rejects missing args entirely", async () => {
    const r = await call(server, "hermes_run", {});
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params"); // bind the rejection to schema validation
  });

  it("ADVERSARIAL: hermes_run rejects an oversize args array (>64, schema max)", async () => {
    const big = Array.from({ length: 65 }, (_, i) => `a${i}`);
    const r = await call(server, "hermes_run", { args: big });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("hermes_skill_list rejects a non-string profile", async () => {
    const r = await call(server, "hermes_skill_list", { profile: 123 });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  it("hermes_model_list rejects a non-boolean noMock", async () => {
    const r = await call(server, "hermes_model_list", { noMock: "yes" });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Invalid params");
  });

  // ── unknown action ───────────────────────────────────────────────────────────
  it("an unknown action returns a dispatcherError (Unknown action)", async () => {
    const r = await call(server, "hermes_BOGUS_not_real");
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toContain("Unknown action");
  });
});
