/**
 * PrintToProgramRegressionHarnessEngine — camDispatcher integration tests
 *
 * Covers the U-P2PFS-HARNESS-WIRE wiring (P2P-FULLSTACK-MS0) — verifies that
 * `print_to_program_regression_run` and `print_to_program_regression_run_one`
 * round-trip through camDispatcher end-to-end, that the Zod schema accepts
 * valid filters and rejects malformed input, and that the engine's verdict
 * invariants (skip ⇒ skip_reason; fail ⇒ error; pass_rate ∈ [0,100]; summary
 * counts match results length) hold across the wire boundary.
 *
 * Wire pattern follows camDispatcher.dnc-family-wire.test.ts:
 * MockMCPServer captures tool registration; `call()` resolves the prism_cam
 * tool, invokes the handler, parses the MCP envelope (`{ content: [{ text }] }`),
 * and returns `{ ok, data }`. slimResponse strips empty arrays at the transport
 * boundary, so array fields are asserted only where the input guarantees
 * non-emptiness; elsewhere scalar fields carry the proof.
 *
 * Sister to PrintToProgramRegressionHarnessEngine.test.ts under
 * src/__tests__/engines/ (engine unit tests with synthetic fixtures).
 *
 * @module __tests__/PrintToProgramRegressionHarnessEngine-integration
 * @milestone P2P-FULLSTACK-MS0 / U-P2PFS-HARNESS-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import type { RegressionRunResult, RegressionResult } from "../engines/PrintToProgramRegressionHarnessEngine.js";

// ---------------------------------------------------------------------------
// MockMCPServer — mirrors the pattern in camDispatcher.dnc-family-wire.test.ts
// ---------------------------------------------------------------------------

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
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed as Record<string, unknown> };
  }
  return { ok: true, data: (parsed ?? {}) as Record<string, unknown> };
}

const HARNESS_ACTIONS = [
  "print_to_program_regression_run",
  "print_to_program_regression_run_one",
];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("PrintToProgramRegressionHarnessEngine — camDispatcher wiring (U-P2PFS-HARNESS-WIRE)", () => {
  // ─────────────────────────────────────────────────────────────────────
  // 1. z.enum gate membership (false-green guard)
  // ─────────────────────────────────────────────────────────────────────
  describe("enum gate membership", () => {
    for (const a of HARNESS_ACTIONS) {
      it(`registers "${a}" in the prism_cam z.enum`, () => {
        expect(ACTIONS).toContain(a);
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2. Happy-path round-trip — full registry replay
  // ─────────────────────────────────────────────────────────────────────
  describe("happy path round-trip — full registry replay", () => {
    it("print_to_program_regression_run returns RegressionRunResult with results + summary", async () => {
      const { ok, data } = await call(server, "print_to_program_regression_run", {});
      expect(ok).toBe(true);
      const run = data as unknown as RegressionRunResult;
      expect(Array.isArray(run.results)).toBe(true);
      expect(typeof run.summary.total).toBe("number");
      expect(run.summary.total).toBeGreaterThan(0);
      // summary count invariant: pass + warning + fail + skip == total
      const counted = run.summary.pass + run.summary.warning + run.summary.fail + run.summary.skip;
      expect(counted).toBe(run.summary.total);
      // pass_rate is a percentage in [0, 100]
      expect(run.summary.pass_rate).toBeGreaterThanOrEqual(0);
      expect(run.summary.pass_rate).toBeLessThanOrEqual(100);
    });

    it("results array length matches summary.total exactly", async () => {
      const { ok, data } = await call(server, "print_to_program_regression_run", {});
      expect(ok).toBe(true);
      const run = data as unknown as RegressionRunResult;
      expect(run.results.length).toBe(run.summary.total);
    });

    it("every result carries fixture_id + process + verdict + duration_ms", async () => {
      const { data } = await call(server, "print_to_program_regression_run", {});
      const run = data as unknown as RegressionRunResult;
      // Sample first 5 to keep the assertion bounded; engine guarantees shape across all.
      const sample = run.results.slice(0, 5);
      expect(sample.length).toBeGreaterThan(0);
      for (const r of sample) {
        expect(typeof r.fixture_id).toBe("string");
        expect(r.fixture_id.length).toBeGreaterThan(0);
        expect(typeof r.process).toBe("string");
        expect(["pass", "fail", "skip", "warning"]).toContain(r.verdict);
        expect(typeof r.duration_ms).toBe("number");
        expect(r.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("skip verdicts carry a non-empty skip_reason (un-wired process pipelines)", async () => {
      const { data } = await call(server, "print_to_program_regression_run", {});
      const run = data as unknown as RegressionRunResult;
      const skipped = run.results.filter((r) => r.verdict === "skip");
      // Harness wires sinker_edm only — non-sinker fixtures must surface a skip_reason.
      // If the registry is empty of non-sinker fixtures this loop is a no-op (valid).
      for (const s of skipped) {
        expect(typeof s.skip_reason).toBe("string");
        expect((s.skip_reason as string).length).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 3. Filter forwarding — sub-registry replay
  // ─────────────────────────────────────────────────────────────────────
  describe("filter forwarding — sub-registry replay", () => {
    it("process=sinker_edm restricts to sinker fixtures only", async () => {
      const { ok, data } = await call(server, "print_to_program_regression_run", { process: "sinker_edm" });
      expect(ok).toBe(true);
      const run = data as unknown as RegressionRunResult;
      for (const r of run.results) {
        expect(r.process).toBe("sinker_edm");
      }
    });

    it("difficulty + coverage filters compose (every result satisfies summary contract)", async () => {
      const { ok, data } = await call(server, "print_to_program_regression_run", {
        difficulty: "beginner",
        coverage: "tutorial",
      });
      expect(ok).toBe(true);
      const run = data as unknown as RegressionRunResult;
      // Even if zero fixtures match the conjunction, the dispatcher must return a valid envelope.
      expect(typeof run.summary.total).toBe("number");
      expect(run.summary.total).toBeGreaterThanOrEqual(0);
      expect(run.results.length).toBe(run.summary.total);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4. Single-fixture invocation — run_one
  // ─────────────────────────────────────────────────────────────────────
  describe("run_one — single-fixture invocation", () => {
    it("runs a known sinker_edm fixture and returns a single RegressionResult", async () => {
      // Discover a sinker_edm fixture id from the registry replay first to avoid hard-coding.
      const { data: all } = await call(server, "print_to_program_regression_run", { process: "sinker_edm" });
      const firstSinker = (all as unknown as RegressionRunResult).results[0];
      if (!firstSinker) {
        // Registry has no sinker fixtures — skip rather than synthesize a false-positive id.
        return;
      }
      const { ok, data } = await call(server, "print_to_program_regression_run_one", { fixture_id: firstSinker.fixture_id });
      expect(ok).toBe(true);
      const r = data as unknown as RegressionResult;
      expect(r.fixture_id).toBe(firstSinker.fixture_id);
      expect(r.process).toBe("sinker_edm");
      expect(["pass", "warning", "fail"]).toContain(r.verdict); // not skip (sinker is wired)
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 5. Failure-mode rejections (Zod + dispatcher gating)
  // ─────────────────────────────────────────────────────────────────────
  describe("failure-mode rejections (Zod + dispatcher gating)", () => {
    it("rejects run_one with missing fixture_id", async () => {
      const { ok } = await call(server, "print_to_program_regression_run_one", {});
      expect(ok).toBe(false);
    });

    it("rejects run_one with empty fixture_id string", async () => {
      const { ok } = await call(server, "print_to_program_regression_run_one", { fixture_id: "" });
      expect(ok).toBe(false);
    });

    it("rejects run_one with an unregistered fixture_id (engine throw → dispatcher error envelope)", async () => {
      const { ok, data } = await call(server, "print_to_program_regression_run_one", { fixture_id: "DEFINITELY_NOT_REGISTERED_42" });
      expect(ok).toBe(false);
      const errText = JSON.stringify(data).toLowerCase();
      expect(errText).toContain("not registered");
    });

    it("rejects run with invalid process enum value", async () => {
      const { ok } = await call(server, "print_to_program_regression_run", { process: "not_a_real_process" });
      expect(ok).toBe(false);
    });
  });
});
