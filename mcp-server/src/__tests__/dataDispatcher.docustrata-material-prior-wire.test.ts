/**
 * dataDispatcher.docustrata-material-prior-wire.test.ts
 *
 * ROMEO WIRING/U-WIRE-DOCUSTRATA -- round-trip wire test for the 5 docustrata_material_*
 * actions wrapping DocuStrataMaterialPriorEngine (read-only per-grade material-cost prior
 * lookup over the JM DocuStrata manifest) through prism_data. Invokes THROUGH the dispatcher
 * (normalize -> schema-validate -> manifest-resolve -> engine method), NOT the engine
 * singleton directly, so the action enum + inline lazy import + switch case + the
 * process.cwd()-vs-repo-root manifest resolver are all proven coherent. Engine internals
 * (normalizeGrade, aggregation quantiles, doc-type filter) are independently covered by
 * DocuStrataMaterialPriorEngine.test.ts.
 *
 * Result contract: jsonResponse(slimResponse(result)) STRIPS null + empty-array fields, so a
 * bare {success,data} cannot represent a miss. The cases therefore emit slim-surviving signals:
 *   unit_price/spend_bracket -> { found: boolean, unit_price_usd?/spend_bracket_usd? }
 *   grades/evidence          -> { count: number, grades?/evidence? }
 * The test asserts those concrete signals (found:false / count:0 on a miss) -- never presence-only.
 *
 * The test injects a small synthetic manifest via params.manifestPath (the same override the
 * resolver honors) so it is fast + deterministic; the LIVE 69MB H:/PRISM/Docustrata/manifest.json
 * is validated separately (numbers cited in the commit) to keep the fleet suite fast.
 *
 * Fixture math (MIN_EVIDENCE_ROWS_PER_GRADE = 2; percentile = floor(n*p) index):
 *   A2: unit prices [100,200] -> p25=100 median=200 p75=200 min=100 max=200  (2 rows -> kept)
 *   D2: unit prices [50,60,70] -> p25=50 median=60 p75=70                     (3 rows -> kept)
 *       per-job bracket: low=1*50=50 median=2*60=120 high=3*70=210
 *   S7: unit price [999]                                                       (1 row  -> dropped)
 *   doc3 (document_type "purchase_order") A2@5                                 (wrong type -> ignored)
 *   => summary: total_line_items=6 (A2*2 + D2*3 + S7*1), total_spend=1479, distinct_grades=2
 *   => grades => ["A2","D2"]
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";
import { DocuStrataMaterialPriorEngine } from "../engines/DocuStrataMaterialPriorEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDataDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) { try { return JSON.parse(text); } catch { /* fall through */ } }
  return r;
}

const FIXTURE_MANIFEST = {
  documents: [
    {
      id: "doc1",
      document_type: "invoice",
      extracted_data: {
        date: "2026-01-01",
        vendor: { name: "GRIGGS STEEL" },
        line_items: [
          { unit_price: 100, quantity: 1, amount: 100, description: "A2 tool steel blank", parsed: { grade: "A2" } },
          { unit_price: 200, quantity: 1, amount: 200, description: "A2 tool steel blank", parsed: { grade: "A2" } },
        ],
      },
    },
    {
      id: "doc2",
      document_type: "quote",
      extracted_data: {
        date: "2026-02-01",
        vendor: { name: "CINCINNATI TOOL STEEL" },
        line_items: [
          { unit_price: 50, quantity: 1, amount: 50, description: "D2 die steel", parsed: { grade: "D2" } },
          { unit_price: 60, quantity: 1, amount: 60, description: "D2 die steel", parsed: { grade: "D2" } },
          { unit_price: 70, quantity: 1, amount: 70, description: "D2 die steel", parsed: { grade: "D2" } },
          { unit_price: 999, quantity: 1, amount: 999, description: "S7 single shot", parsed: { grade: "S7" } },
        ],
      },
    },
    {
      // wrong document_type -> the extractor must IGNORE this entirely
      id: "doc3",
      document_type: "purchase_order",
      extracted_data: {
        line_items: [{ unit_price: 5, quantity: 1, amount: 5, description: "A2 should be ignored", parsed: { grade: "A2" } }],
      },
    },
  ],
};

describe("prism_data docustrata_material_* wire (ROMEO U-WIRE-DOCUSTRATA)", () => {
  let handler: Handler;
  let fixturePath: string;

  beforeAll(async () => {
    fixturePath = join(tmpdir(), `prism-docustrata-fixture-${process.pid}.json`);
    writeFileSync(fixturePath, JSON.stringify(FIXTURE_MANIFEST), "utf8");
    DocuStrataMaterialPriorEngine.resetCache(); // hermetic: don't inherit a prior path-keyed cache
    handler = await createServer().handler;
  });
  afterAll(() => {
    try { rmSync(fixturePath, { force: true }); } catch { /* best effort */ }
    DocuStrataMaterialPriorEngine.resetCache();
  });

  // ── happy path: all 5 actions round-trip with the fixture-derived reference values ──

  it("docustrata_material_summary -> total_line_items 6, spend 1479, distinct_grades 2", async () => {
    const r = await call(handler, "docustrata_material_summary", { manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.data.total_line_items).toBe(6); // A2*2 + D2*3 + S7*1; doc3 (purchase_order) excluded
    expect(r.data.total_spend_usd).toBe(1479);
    expect(r.data.distinct_grades).toBe(2); // A2, D2 (S7 has <2 evidence rows -> no prior)
    expect(r.data.manifest_path).toBe(fixturePath);
  });

  it("docustrata_material_grades -> count 2, grades ['A2','D2'] (S7 dropped, sorted)", async () => {
    const r = await call(handler, "docustrata_material_grades", { manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.count).toBe(2);
    expect(r.grades).toEqual(["A2", "D2"]);
  });

  it("docustrata_material_unit_price A2 -> found, {min100,p25 100,median200,p75 200,max200}", async () => {
    const r = await call(handler, "docustrata_material_unit_price", { grade: "A2", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(true);
    expect(r.grade).toBe("A2");
    expect(r.unit_price_usd).toEqual({ min: 100, p25: 100, median: 200, p75: 200, max: 200 });
  });

  it("docustrata_material_unit_price normalizes case (lowercase 'a2' -> same prior, median 200)", async () => {
    const r = await call(handler, "docustrata_material_unit_price", { grade: "a2", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(true);
    expect(r.unit_price_usd.median).toBe(200); // proves the dispatcher forwarded grade to the engine's uppercase lookup
  });

  it("docustrata_material_spend_bracket D2 -> found, {low50,median120,high210}", async () => {
    const r = await call(handler, "docustrata_material_spend_bracket", { grade: "D2", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(true);
    expect(r.spend_bracket_usd).toEqual({ low: 50, median: 120, high: 210 });
  });

  it("docustrata_material_evidence A2 -> count 2, raw line items [100,200] all grade A2 from doc1", async () => {
    const r = await call(handler, "docustrata_material_evidence", { grade: "A2", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.count).toBe(2);
    expect(r.evidence.length).toBe(2);
    expect(r.evidence.map((i: any) => i.unit_price_usd).sort((a: number, b: number) => a - b)).toEqual([100, 200]);
    expect(r.evidence.every((i: any) => i.grade === "A2")).toBe(true);
    expect(r.evidence.every((i: any) => i.doc_id === "doc1")).toBe(true);
  });

  // ── failure modes: required-grade rejection through the dispatcher try/catch ──

  it("docustrata_material_unit_price with no grade -> fail-loud error", async () => {
    const r = await call(handler, "docustrata_material_unit_price", { manifestPath: fixturePath });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("docustrata_material_spend_bracket with no grade -> fail-loud error", async () => {
    const r = await call(handler, "docustrata_material_spend_bracket", { manifestPath: fixturePath });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("docustrata_material_evidence with no grade -> fail-loud error", async () => {
    const r = await call(handler, "docustrata_material_evidence", { manifestPath: fixturePath });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  // ── adversarial: misses must report found:false / count:0 (concrete), never crash ──

  it("docustrata_material_unit_price for an insufficient-evidence grade (S7) -> found:false", async () => {
    const r = await call(handler, "docustrata_material_unit_price", { grade: "S7", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(false);
  });

  it("docustrata_material_unit_price for an unknown grade -> found:false (miss, not crash)", async () => {
    const r = await call(handler, "docustrata_material_unit_price", { grade: "ZZZ_NOT_A_GRADE", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(false);
  });

  it("docustrata_material_spend_bracket for an unknown grade -> found:false (miss, not crash)", async () => {
    const r = await call(handler, "docustrata_material_spend_bracket", { grade: "ZZZ_NOT_A_GRADE", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.found).toBe(false);
  });

  it("docustrata_material_evidence for an unknown grade -> count:0 (miss, not crash)", async () => {
    const r = await call(handler, "docustrata_material_evidence", { grade: "ZZZ_NOT_A_GRADE", manifestPath: fixturePath });
    expect(r.success).toBe(true);
    expect(r.count).toBe(0);
  });
});
