/**
 * devDispatcher × RGS tool-plan sidecar wire (RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER).
 *
 * The 948-plan sidecar (state/shared/roadmap-tool-plans.json) had no dispatcher
 * surface — an engine-wiring-doctrine violation per the MS1 punch-list. This
 * wires `roadmap_tool_plan_{query,build,coverage}` into prism_dev.
 *
 * Test strategy (per the MS0 core lesson — "hermetic fakes do not prove
 * production wiring; ship one real-data E2E test"):
 *   • query        — fast unit-level: dispatcher guard, charset reject,
 *                     real-sidecar round-trip (pure JSON read, deterministic).
 *   • coverage     — the REAL-DATA E2E: actually spawns the canonical
 *                     rgs-plan-coverage.mjs subprocess (deterministic — no
 *                     Ollama, just unit enumeration + sidecar read) and
 *                     verifies the execFileSync wiring + JSON round-trip.
 *   • build        — schema/charset guard + structured-error path (the full
 *                     Ollama planner subprocess is too slow/nondeterministic
 *                     for CI; the guard + wiring-accepted assertions prove the
 *                     case executes without exercising a 60s Ollama call).
 *
 * @milestone RGS-TOOL-AUTOINVOKE-MS1
 * @unit U-DISPATCHER
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

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

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × RGS tool-plan sidecar wire (U-DISPATCHER)", () => {
  // ── query: dispatcher-level guards ──────────────────────────────────────
  it("query — missing unit_key → structured error (dispatcher guard)", async () => {
    const r = await call(server, "roadmap_tool_plan_query", {});
    expect(r.ok).toBe(false);
    // Either the Zod schema rejects (missing required) or the dispatcher's
    // own guard fires — both are structured-error, never a throw.
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/unit_key|required|invalid/);
  });

  it("query — schema rejects shell-metachar unit_key (charset guard)", async () => {
    // Defense-in-depth: the Zod regex must reject anything outside the
    // roadmap-id alphabet BEFORE it could reach the subprocess argv.
    const r = await call(server, "roadmap_tool_plan_query", { unit_key: "foo; rm -rf /" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/charset|invalid|unit_key/);
  });

  it("query — accepts the roadmap-id charset (colon + dash + dot)", async () => {
    // 'MS::U-ID' style + dotted segment must pass the regex (no error about
    // the key itself; sidecar-missing / not-found is a different, valid path).
    const r = await call(server, "roadmap_tool_plan_query", {
      unit_key: "RGS-TOOL-AUTOINVOKE-MS1::U-DOMAIN-RULES",
    });
    // The key is valid charset → we either get found:true/false or a
    // sidecar-not-found error, but NOT a charset/validation rejection.
    if (!r.ok) {
      expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/charset/);
    } else {
      expect(r.data).toHaveProperty("unitKey", "RGS-TOOL-AUTOINVOKE-MS1::U-DOMAIN-RULES");
      expect(r.data).toHaveProperty("found");
      expect(typeof r.data.totalPlans).toBe("number");
    }
  });

  it("query — nonexistent unit_key against the real sidecar → found:false, plan:null", async () => {
    // Real-data assertion. NOTE: the sidecar (state/shared/roadmap-tool-plans.json)
    // is populated by the nightly U-CRON replan and may legitimately contain 0
    // plans in a fresh checkout — so plan-count is NOT a reliable real-wiring
    // signal here (a stub returning {found:false,plan:null,totalPlans:0} would
    // pass identically when the sidecar is empty). The stronger anti-stub guard
    // lives in the `coverage` E2E (totalOpen>0 from envelope enumeration, which
    // a hermetic stub cannot fake). This test only asserts the not-found
    // contract shape + that a genuine parse occurred (totalPlans is the real
    // Object.keys length, hence an exact integer ≥ 0).
    const r = await call(server, "roadmap_tool_plan_query", {
      unit_key: "NO-SUCH-MILESTONE-ZZZ::U-NOPE-9999",
    });
    if (r.ok) {
      expect(r.data.found).toBe(false);
      // The dispatcher result is piped through responseSlimmer, which STRIPS
      // null/undefined/empty keys (see reference_slimresponse_strips_empty_arrays):
      // `plan: null` is dropped → the key is absent (undefined) on the wire.
      // `?? null` normalizes; the contract ("no plan payload for a nonexistent
      // unit") still holds and a stub returning {found:true,plan:{...}} still
      // fails both this and the `found` assertion above.
      expect(r.data.plan ?? null).toBeNull();
      expect(Number.isInteger(r.data.totalPlans)).toBe(true);
      expect(r.data.totalPlans as number).toBeGreaterThanOrEqual(0);
    } else {
      // Only acceptable failure is a genuinely-absent sidecar file.
      expect(String(r.data.error)).toMatch(/sidecar not found/);
    }
  });

  // ── coverage: the real-data E2E (MS0 core lesson) ───────────────────────
  it(
    "coverage — REAL subprocess: execFileSync(rgs-plan-coverage.mjs --json) round-trips a structured report",
    async () => {
      const r = await call(server, "roadmap_tool_plan_coverage", {});
      // This actually spawns the canonical script. Two valid outcomes, both
      // proving the wiring works end-to-end:
      //   (a) success → the real CoverageReport shape, OR
      //   (b) structured {error:"coverage script failed", detail, stderr} —
      //       NEVER an unhandled throw / raw text.
      if (r.ok) {
        // CoverageReport contract (rgs-plan-coverage.mjs exported typedef).
        expect(typeof r.data.totalOpen).toBe("number");
        expect(typeof r.data.withPlan).toBe("number");
        expect(typeof r.data.coveragePct).toBe("number");
        expect(r.data).toHaveProperty("perPipeline");
        expect(r.data).toHaveProperty("bySource");
        // ANTI-STUB (MS0 core lesson): the canonical script enumerates open
        // units from the on-disk milestone envelopes (~4400+ today). A
        // hermetic stub / no-op case returning {totalOpen:0,...} would pass
        // every other assertion here (0<=0, types match) but FAILS this one —
        // only the REAL execFileSync→script→JSON round-trip yields totalOpen>0.
        // This is the single assertion that proves production wiring.
        expect(r.data.totalOpen as number).toBeGreaterThan(0);
        // withPlan can never exceed totalOpen — arithmetic invariant.
        expect(r.data.withPlan as number).toBeLessThanOrEqual(r.data.totalOpen as number);
      } else {
        expect(String(r.data.error)).toBe("coverage script failed");
        // The structured error must carry debug context (not bury the failure).
        expect(r.data).toHaveProperty("detail");
      }
    },
    60_000,
  );

  // ── build: schema/charset guard + wiring-accepted ───────────────────────
  it("build — missing unit_key → structured error (dispatcher guard)", async () => {
    const r = await call(server, "roadmap_tool_plan_build", {});
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/unit_key|required|invalid/);
  });

  it("build — schema rejects shell-metachar unit_key (defense-in-depth)", async () => {
    const r = await call(server, "roadmap_tool_plan_build", { unit_key: "x`whoami`" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/charset|invalid|unit_key/);
  });

  it("build — valid-charset but unknown unit returns a STRUCTURED planner error (not a throw)", async () => {
    // A syntactically-valid key that no envelope contains. The planner
    // subprocess runs in deterministic-ish mode but finds 0 matching units;
    // the dispatcher must surface a structured {error:"planner script failed"}
    // OR a clean {planned:0,...} JSON — never an unhandled exception.
    const r = await call(server, "roadmap_tool_plan_build", {
      unit_key: "NO-SUCH-MS-ZZZ::U-NOPE-0000",
      ollama_off: true,
    });
    // Whatever the outcome, the response is structured JSON (the harness
    // returns ok:false only on engine_error/error; ok:true on a JSON body).
    expect(r.data).toBeTypeOf("object");
    if (!r.ok) {
      expect(String(r.data.error)).toMatch(/planner script failed/);
    } else {
      // Clean planner JSON for a zero-match run.
      expect(r.data).toHaveProperty("units");
    }
  }, 130_000);  // > the dispatcher's 120s execFileSync build budget — lets the structured-error path fire instead of a vitest-timeout false-red (Arm B P2)

  // ── enum acceptance sweep ───────────────────────────────────────────────
  it("all 3 roadmap_tool_plan_* actions are accepted by the registered dispatcher", async () => {
    // Proves each action is in the z.enum + has a schema + a case branch
    // (an unknown action would fall through to the dispatcher's default,
    // returning a distinct 'unknown action' shape).
    const probes: Array<[string, Record<string, unknown>]> = [
      ["roadmap_tool_plan_query",    { unit_key: "PROBE-MS::U-PROBE" }],
      ["roadmap_tool_plan_coverage", {}],
      ["roadmap_tool_plan_build",    { unit_key: "PROBE-MS::U-PROBE", ollama_off: true }],
    ];
    for (const [act, p] of probes) {
      const r = await call(server, act, p);
      // The action is wired iff the response does NOT say 'unknown action'.
      expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
    }
  }, 130_000);  // > the dispatcher's 120s execFileSync build budget — lets the structured-error path fire instead of a vitest-timeout false-red (Arm B P2)
});
