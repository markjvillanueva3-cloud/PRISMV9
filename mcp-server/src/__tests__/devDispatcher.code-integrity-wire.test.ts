/**
 * CODE-INTEGRITY-WIRE — wire the orphaned CodeGenerationIntegrityEngine (0 dispatcher refs;
 * its only mention in another engine is a doc comment, not a call — a true
 * stop_on_unwired_assets orphan) into devDispatcher (prism_dev) as
 * code_integrity_{quick_validate,validate,stats}. Round-trips the REAL dispatcher
 * (registerDevDispatcher → fakeServer handler) through the pure generated-code validators
 * and asserts the corruption-detection verdicts + ValidationResult + stats land in the
 * JSON response. No mocks of the system-under-test.
 *
 * slot:bravo /loop (2026-06-02, claude-5e210e4e) — close the orphan + make the
 * pre-write code-integrity guard invokable as a dev tool.
 * @module __tests__/devDispatcher.code-integrity-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

describe("prism_dev::code_integrity_* (CodeGenerationIntegrityEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => {
        captured = handler;
      },
    };
    registerDevDispatcher(fakeServer);
    if (!captured) throw new Error("registerDevDispatcher did not register the prism_dev tool");
    const h = captured;
    invoke = async (action, params = {}) =>
      JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("quick_validate passes clean TS, flags empty content and a sourcemap-leak", async () => {
    // clean TS — firstLine matches /^export\s/ (a VALID_TS_STARTS pattern), no binary, no sourcemap.
    const ok = await invoke("code_integrity_quick_validate", { content: "export const x = 1;\n" });
    expect(ok.likely_valid).toBe(true);
    expect(((ok.issues as string[]) ?? []).length).toBe(0); // slimResponse drops the empty issues array

    // empty content — deterministic reject.
    const empty = await invoke("code_integrity_quick_validate", { content: "" });
    expect(empty.likely_valid).toBe(false);
    expect((empty.issues as string[]).join(" ")).toContain("Empty");

    // a compiled-artifact sourcemap directive leaking into source — flagged corrupt.
    const sm = await invoke("code_integrity_quick_validate", { content: "export const y = 2;\n//# sourceMappingURL=y.js.map" });
    expect(sm.likely_valid).toBe(false);
    expect((sm.issues as string[]).join(" ").toLowerCase()).toContain("sourcemap");
  });

  it("validate returns a well-formed ValidationResult (valid:boolean, confidence in [0,1])", async () => {
    const r = await invoke("code_integrity_validate", {
      input: { filepath: "clean.ts", content: "export const greeting = 'hi';\nexport function f(): number { return 1; }\n" },
    });
    const v = r as { valid: boolean; confidence: number };
    // clean, well-formed TS (valid start + zero critical/major errors) → engine returns valid:true
    // with full confidence. Asserting the concrete verdict (not just typeof) keeps R9 teeth.
    expect(v.valid).toBe(true);
    expect(typeof v.confidence).toBe("number");
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
  });

  it("stats aggregates the validation history through the dispatcher", async () => {
    // two validate calls populate the singleton history; stats must reflect them.
    await invoke("code_integrity_validate", { input: { filepath: "a.ts", content: "export const a = 1;\n" } });
    await invoke("code_integrity_validate", { input: { filepath: "b.ts", content: "export const b = 2;\n" } });
    const s = (await invoke("code_integrity_stats")) as {
      total: number; passed: number; failed: number; passRate: number;
    };
    expect(typeof s.total).toBe("number");
    expect(s.total).toBeGreaterThanOrEqual(2); // at least the two we just recorded
    expect(s.passed + s.failed).toBe(s.total); // accounting invariant
    expect(typeof s.passRate).toBe("number");
  });
});
