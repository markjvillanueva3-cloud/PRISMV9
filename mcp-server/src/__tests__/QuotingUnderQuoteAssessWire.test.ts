/**
 * QuotingUnderQuoteAssessWire.test.ts — U-QP-UNDERQUOTE-ASSESS-WIRE (charlie 2026-06-03)
 *
 * Proves the iter-13 pure `assessUnderQuotes` is wired end-to-end as a dispatcher action:
 *   1. Schema/enum wiring — `jm_die_training_loop_under_quote_assess` is in `quotingActionEnum`
 *      AND has a usable schema in `QUOTING_ACTION_SCHEMAS` (the enum membership is the gate a
 *      MockMCPServer that bypasses `z.enum(ACTIONS)` would falsely pass — see CLAUDE.md
 *      RGS-TOOL/MS1 lesson; we assert against the REAL enum.options).
 *   2. Dispatcher round-trip — registerQuotingDispatcher → captured handler → invoke the action
 *      through the SAME path production uses, feeding a report's `all_records[]` and asserting the
 *      concrete under-quote payload (counts, dollars-left-on-table, worst sorted, advisory).
 *   3. Defensive — a report with no `all_records` round-trips as ok:false (the dispatcher's
 *      `Array.isArray` guard → empty → assessUnderQuotes ok:false), and invalid schema params
 *      surface schema-validation-failed (isError), never a thrown dispatcher error.
 *
 * All assertions are concrete-value (a wrong count/sum/sort fails). The pure-function logic itself
 * is exhaustively covered by QuotingUnderQuoteAssess.test.ts (iter-13); this file is the wiring oracle.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { type PerRecordPrediction } from "../engines/QuotingTrainingLoopEngine.js";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../schemas/quotingActionSchemas.js";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";

const ACTION = "jm_die_training_loop_under_quote_assess";

// Mirror iter-13's mk(): pct_error computed exactly as the loop does (((fair-actual)/actual)*100).
const mk = (customer: string, part_id: string, actual: number, fair: number): PerRecordPrediction => ({
  customer,
  part_id,
  actual_usd: actual,
  predicted_fmv_usd: fair,
  abs_error_usd: Math.abs(fair - actual),
  pct_error: actual !== 0 ? ((fair - actual) / actual) * 100 : Infinity,
});

// Canonical mixed set (iter-13 fixture): 3 under (+50/+60/+30%), 1 fair (+5%), 1 over (-30%);
// dollars left on the table = 50 + 30 + 60 = 140.
const MIXED: PerRecordPrediction[] = [
  mk("ACME", "P1", 100, 150),
  mk("ACME", "P5", 50, 80),
  mk("BETA", "P2", 100, 70),
  mk("BETA", "P3", 100, 105),
  mk("GAMMA", "P4", 200, 260),
];

describe("schema/enum wiring", () => {
  it("under_quote_assess action IS in the real action enum (the gate a mock bypasses)", () => {
    expect(quotingActionEnum.options).toContain(ACTION);
  });

  it("has a usable Zod schema in QUOTING_ACTION_SCHEMAS", () => {
    const schema = QUOTING_ACTION_SCHEMAS[ACTION];
    expect(typeof schema.safeParse).toBe("function");
    expect(schema.safeParse({ report: { all_records: [] } }).success).toBe(true);
  });

  it("schema requires `report` and accepts optional bandPct/topN", () => {
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({}).success).toBe(false); // report missing
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({ report: {}, bandPct: 15, topN: 5 }).success).toBe(true);
  });

  it("schema rejects invalid bandPct/topN (non-positive, non-int, wrong type)", () => {
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({ report: {}, bandPct: -1 }).success).toBe(false);
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({ report: {}, bandPct: 0 }).success).toBe(false);
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({ report: {}, topN: 1.5 }).success).toBe(false);
    expect(QUOTING_ACTION_SCHEMAS[ACTION].safeParse({ report: {}, topN: "ten" }).success).toBe(false);
  });
});

describe("dispatcher round-trip — invoke through the registered handler", () => {
  // Capture the REAL tool handler exactly as the MCP server receives it; the SUT (dispatcher
  // switch + assessUnderQuotes) is real — only server.tool registration is intercepted.
  let handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<any>;
  beforeAll(() => {
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: unknown, h: any) => { handler = h; },
    };
    registerQuotingDispatcher(mockServer as unknown as Parameters<typeof registerQuotingDispatcher>[0]);
  });

  it("assesses a report's all_records: 3 under / 1 fair / 1 over, $140 left on the table, advisory", async () => {
    const res = await handler({ action: ACTION, params: { report: { all_records: MIXED } } });
    expect(res.isError).not.toBe(true);
    const a = JSON.parse(res.content[0].text);
    expect(a.ok).toBe(true);
    expect(a.total_jobs).toBe(5);
    expect(a.under_quoted_count).toBe(3);
    expect(a.fair_count).toBe(1);
    expect(a.over_quoted_count).toBe(1);
    expect(a.total_dollars_left_on_table).toBe(140);
    expect(a.advisory).toBe(true);
  });

  it("topN flows through — worst_under_quotes sorted by gap_usd desc, capped at topN (P4 60 > P1 50)", async () => {
    const res = await handler({ action: ACTION, params: { report: { all_records: MIXED }, topN: 2 } });
    const a = JSON.parse(res.content[0].text);
    expect(a.worst_under_quotes.length).toBe(2);
    expect(a.worst_under_quotes[0].part_id).toBe("P4");
    expect(a.worst_under_quotes[0].gap_usd).toBe(60);
    expect(a.worst_under_quotes[1].part_id).toBe("P1");
    expect(a.worst_under_quotes[1].gap_usd).toBe(50);
  });

  it("bandPct override flows through — band 100 reclassifies every job as fair", async () => {
    const res = await handler({ action: ACTION, params: { report: { all_records: MIXED }, bandPct: 100 } });
    const a = JSON.parse(res.content[0].text);
    expect(a.under_quoted_count).toBe(0);
    expect(a.fair_count).toBe(5);
  });

  it("report with NO all_records → empty → ok:false (the Array.isArray guard, not a thrown error)", async () => {
    const res = await handler({ action: ACTION, params: { report: { total_predicted: 0 } } });
    expect(res.isError).not.toBe(true);
    const a = JSON.parse(res.content[0].text);
    expect(a.ok).toBe(false);
    expect(a.total_jobs).toBe(0);
  });

  it("invalid schema params → schema-validation-failed (isError), never a thrown dispatcher error", async () => {
    const res = await handler({ action: ACTION, params: { report: {}, bandPct: -5 } });
    expect(res.isError).toBe(true);
    const payload = JSON.parse(res.content[0].text);
    expect(payload.error).toBe("schema-validation-failed");
  });
});
