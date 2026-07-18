/**
 * devDispatcher × FormulaHarvesterEngine wire (FEATURE-GAP-AUDIT-MS0 / U-GAP-TRIBAL-FORMULA-REGISTRY).
 *
 * FormulaHarvesterEngine (RES-MS1) was BUILT + tested (19/19) but UNWIRED —
 * no dispatcher referenced it, so the ~107 machining formulas it harvests
 * from the 3 JS knowledge files were unreachable through the MCP surface
 * (the classic FEATURE-GAP-AUDIT "built-but-orphan engine"). This wires
 * `formula_harvest{,_sources,_audit}` into prism_dev.
 *
 * Test strategy (per the RGS-TOOL-AUTOINVOKE-MS0 core lesson — "hermetic
 * fakes do not prove production wiring; ship one real-data E2E test"):
 *   • formula_harvest        — REAL-DATA E2E: actually reads the 3 JS files
 *                              from disk through the dispatcher. ANTI-STUB:
 *                              totalFormulas > 50 (a no-op/stub returning
 *                              {totalFormulas:0} passes every type/shape
 *                              assertion but FAILS this — only the real
 *                              disk-parse yields ~107).
 *   • formula_harvest_sources — deterministic lightweight: the 3 known
 *                              source files + totalExpected (no disk parse).
 *   • formula_harvest_audit  — REAL-DATA: re-harvest + domain breakdown;
 *                              anti-stub totalHarvested > 50 + arithmetic
 *                              invariant (withImplementation ≤ totalHarvested).
 *   • enum sweep             — all 3 actions accepted (not "unknown action").
 *
 * @milestone FEATURE-GAP-AUDIT-MS0
 * @unit U-GAP-TRIBAL-FORMULA-REGISTRY
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

describe("devDispatcher × FormulaHarvester wire (U-GAP-TRIBAL-FORMULA-REGISTRY)", () => {
  // ── formula_harvest_sources: deterministic, no disk parse ────────────────
  it("formula_harvest_sources — returns the 3 known JS source files + totalExpected", async () => {
    const r = await call(server, "formula_harvest_sources", {});
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.files)).toBe(true);
    expect((r.data.files as unknown[]).length).toBe(3);
    // The 3 canonical knowledge files (RES-MS1 SOURCE_FILES).
    const names = (r.data.files as Array<{ filename: string }>).map(f => f.filename).join("|");
    expect(names).toMatch(/PRISM_CROSS_DISCIPLINARY_FORMULAS/);
    expect(names).toMatch(/PRISM_ADVANCED_CROSS_DOMAIN/);
    expect(names).toMatch(/PRISM_UNIVERSITY_COURSE_REFERENCE/);
    expect(typeof r.data.totalExpected).toBe("number");
    expect(r.data.totalExpected as number).toBeGreaterThan(100);
    expect(typeof r.data.rootPath).toBe("string");
  });

  // ── formula_harvest: the REAL-DATA E2E (MS0 core lesson) ─────────────────
  it(
    "formula_harvest — REAL disk parse of the 3 JS files round-trips a HarvestResult",
    async () => {
      const r = await call(server, "formula_harvest", {});
      expect(r.ok).toBe(true);
      // HarvestResult contract (FormulaHarvesterEngine typedef).
      expect(typeof r.data.totalFormulas).toBe("number");
      expect(r.data).toHaveProperty("byFile");
      expect(r.data).toHaveProperty("byDomain");
      expect(Array.isArray(r.data.formulas)).toBe(true);
      expect(Array.isArray(r.data.registryEntries)).toBe(true);
      expect(typeof r.data.timestamp).toBe("string");
      // ANTI-STUB (MS0 core lesson): the engine reads 3 real JS knowledge
      // files off disk and parses ~107 formula blocks. A hermetic stub / no-op
      // case returning {totalFormulas:0,...} passes every type+shape assertion
      // above but FAILS this one — only the REAL dispatcher→engine→disk-read
      // round-trip yields totalFormulas > 50. This is the single assertion
      // that proves production wiring.
      expect(r.data.totalFormulas as number).toBeGreaterThan(50);
      // R12 fail-loud signal: the 3 knowledge files are git-tracked, so a
      // genuine harvest MUST report degraded=false + all 3 files read. If a
      // file were missing the engine no longer silently undercounts — it
      // sets degraded=true + populates errors[]. A green `degraded:false`
      // here proves the corpus was actually found AND the R12 signal exists.
      expect(r.data.degraded).toBe(false);
      // NOTE: the dispatcher pipes through responseSlimmer which STRIPS empty
      // arrays (mcp-server/src/utils/responseSlimmer.ts:24) — a clean harvest's
      // `errors: []` is therefore ABSENT on the wire, not an empty array. The
      // contract ("zero read errors") holds whether the key is stripped or a
      // present-but-empty array; `?? []` normalizes. (`degraded:false` +
      // `filesRead:3` are scalars → NOT stripped → they survive as the
      // load-bearing R12 + real-corpus proof.)
      expect(((r.data.errors as unknown[] | undefined) ?? []).length).toBe(0);
      expect(r.data.filesRead).toBe(3);
      // Arithmetic invariant: one registry entry per harvested formula.
      expect((r.data.registryEntries as unknown[]).length).toBe(r.data.totalFormulas as number);
      expect((r.data.formulas as unknown[]).length).toBe(r.data.totalFormulas as number);
    },
    30_000,
  );

  // ── formula_harvest_audit: REAL-DATA breakdown ──────────────────────────
  it(
    "formula_harvest_audit — REAL re-harvest yields a domain breakdown with invariants",
    async () => {
      const r = await call(server, "formula_harvest_audit", {});
      expect(r.ok).toBe(true);
      expect(typeof r.data.totalHarvested).toBe("number");
      expect(r.data).toHaveProperty("byFile");
      expect(r.data).toHaveProperty("byDomain");
      expect(typeof r.data.withImplementation).toBe("number");
      expect(typeof r.data.withConstants).toBe("number");
      expect(Array.isArray(r.data.uniqueConsumers)).toBe(true);
      // ANTI-STUB: same real-disk-read guard as formula_harvest.
      expect(r.data.totalHarvested as number).toBeGreaterThan(50);
      // R12: audit propagates the harvest fail-loud signal (git-tracked corpus).
      expect(r.data.degraded).toBe(false);
      expect(r.data.filesRead).toBe(3);
      // Subset invariants — these counts are filters of the harvested set,
      // can never exceed the total (a stub fabricating inflated counts fails).
      expect(r.data.withImplementation as number).toBeLessThanOrEqual(r.data.totalHarvested as number);
      expect(r.data.withConstants as number).toBeLessThanOrEqual(r.data.totalHarvested as number);
      expect((r.data.uniqueConsumers as unknown[]).length).toBeGreaterThan(0);
    },
    30_000,
  );

  // ── enum acceptance sweep ───────────────────────────────────────────────
  it("all 3 formula_harvest* actions are accepted by the registered dispatcher", async () => {
    // Proves each action is in the z.enum + has a case branch (an unknown
    // action falls through to the dispatcher default → 'unknown action').
    for (const act of ["formula_harvest", "formula_harvest_sources", "formula_harvest_audit"]) {
      const r = await call(server, act, {});
      expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
    }
  }, 30_000);
});
