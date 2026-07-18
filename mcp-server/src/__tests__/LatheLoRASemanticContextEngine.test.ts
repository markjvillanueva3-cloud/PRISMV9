/**
 * LATHE-LORA-MS0/U-LLR-CONTEXT — real-behavior tests for the RAG context engine
 * (thin facade over crossProcessOutcomeStore.retrieveSimilar, lathe-scoped).
 *
 * Isolation: retrieveSimilar scores ALL records, but an EXACT material match scores
 * distance 0 (categorical mismatch dominates), so a unique-material query reliably
 * surfaces this test's own rows at the top. Concrete assertions via the retrieved
 * material/outcome fields (fail if absent — no weak toBeDefined).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRASemanticContextEngine as ctx } from "../engines/LatheLoRASemanticContextEngine.js";
import { latheLoRAExperienceLedgerEngine as ledger } from "../engines/LatheLoRAExperienceLedgerEngine.js";

let _n = 0;
const uniqMat = () => `LATHE_CTX_TEST_${++_n}`;

describe("LatheLoRASemanticContextEngine — retrieval + context assembly", () => {
  it("buildContext throws on missing/empty operation", () => {
    expect(() => ctx.buildContext({ operation: "" })).toThrow(/operation/);
    expect(() => ctx.buildContext({} as never)).toThrow(/operation/);
  });

  it("retrieves a recorded labeled lathe outcome (exact material → top hit) and names it in contextText", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "od_rough", material: mat, vc: 210 });
    ledger.recordOutcome(id, { kind: "success" });

    const bundle = ctx.buildContext({ operation: "od_rough", material: mat }, { k: 5 });
    const mine = bundle.retrieved.filter((r) => r.material === mat);
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(mine[0]?.outcome).toBe("success");
    expect(bundle.contextText).toContain(mat);
    expect(bundle.contextText).toMatch(/Similar past lathe outcomes/);
  });

  it("excludes pending rows by default; includePending surfaces them", () => {
    const mat = uniqMat();
    ledger.record({ operation: "id_bore", material: mat }); // pending (never closed)
    const id = ledger.record({ operation: "id_bore", material: mat });
    ledger.recordOutcome(id, { kind: "success" }); // labeled

    const labeledOnly = ctx.buildContext({ operation: "id_bore", material: mat }, { k: 10 });
    expect(labeledOnly.retrieved.filter((r) => r.material === mat).length).toBe(1);

    const withPending = ctx.buildContext({ operation: "id_bore", material: mat }, { k: 10, includePending: true });
    expect(withPending.retrieved.filter((r) => r.material === mat).length).toBe(2);
  });

  it("k=0 → empty bundle with the no-data context line", () => {
    const bundle = ctx.buildContext({ operation: "face" }, { k: 0 });
    expect(bundle.count).toBe(0);
    expect(bundle.retrieved.length).toBe(0);
    expect(bundle.contextText).toMatch(/No similar past lathe outcomes/);
  });

  it("k is clamped: 999 → 50 (MAX_K), -5 → 0", () => {
    expect(ctx.buildContext({ operation: "thread" }, { k: 999 }).k).toBe(50);
    expect(ctx.buildContext({ operation: "thread" }, { k: -5 }).k).toBe(0);
  });

  it("retrieved examples are sorted ascending by distance (closest first)", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "part_off", material: mat });
    ledger.recordOutcome(id, { kind: "success" });
    const bundle = ctx.buildContext({ operation: "part_off", material: mat }, { k: 8 });
    const d = bundle.retrieved.map((r) => r.distance);
    expect(d.every((x, i) => i === 0 || x >= d[i - 1])).toBe(true);
  });

  it("corpusSnippets are appended to the context as Reference lines", () => {
    const bundle = ctx.buildContext(
      { operation: "od_finish" },
      { k: 3, corpusSnippets: ["USE_WIPER_INSERT_FOR_RA_TARGET"] },
    );
    expect(bundle.contextText).toContain("Reference: USE_WIPER_INSERT_FOR_RA_TARGET");
  });
});

describe("LATHE-LORA-MS0/U-LLR-CONTEXT — dispatcher + schema wiring", () => {
  it("turningDispatcher source has the ACTIONS entry + case-block for lathe_lora_semantic_context", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    expect(src.includes('case "lathe_lora_semantic_context":')).toBe(true);
    expect(src.includes('"lathe_lora_semantic_context",')).toBe(true);
  });

  it("schema requires operation; accepts a full query; rejects null + missing operation", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_semantic_context?.safeParse).toBe("function");
    expect(m.lathe_lora_semantic_context!.safeParse({ operation: "od_rough", k: 5 }).success).toBe(true);
    expect(m.lathe_lora_semantic_context!.safeParse({ k: 5 }).success).toBe(false); // missing operation
    expect(m.lathe_lora_semantic_context!.safeParse(null).success).toBe(false);
  });
});
