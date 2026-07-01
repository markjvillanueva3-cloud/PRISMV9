/**
 * Tests for quotingDispatcher — QUOTING-PIPELINE-MS0 / U-QP08.
 * Round-trip through each of 8 actions via a fake MCP server harness.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";

// Fake MCP server harness — captures the handler so tests can call it directly.
type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
function makeServer(): { handler: Handler; toolName: string | null } {
  let captured: Handler | null = null;
  let toolName: string | null = null;
  const server = {
    tool: (name: string, _desc: string, _schema: unknown, handler: Handler) => {
      toolName = name;
      captured = handler;
    },
  };
  registerQuotingDispatcher(server);
  return { handler: captured!, toolName };
}

function parse(out: { content: Array<{ type: "text"; text: string }> }) {
  return JSON.parse(out.content[0].text);
}

// U-QP-OUTBOUND-PROMOTE-GATE round-trip over HERMETIC synthetic fixtures (charlie 2026-06-09).
// Mirrors OutboundPriceIndexEngine.test.ts (we control the numbers) -- NO dependency on the
// gitignored real jm-sold-orders.json, so the round-trip is CI-safe. The OCR-noise fixture makes
// the live OCR-$1-median finding a hermetic, always-run regression.
describe("quotingDispatcher -- outbound_promote_check (hermetic fixtures)", () => {
  // CLEAN: 40 medium-confidence single-line orders, varied ext_price 100..295 -> reliable + wide IQR.
  const CLEAN = {
    schemaVersion: "1.0.0", source: "synthetic-test-fixture", advisoryOnly: true, mustHumanVerify: true, caveat: null,
    records: Array.from({ length: 40 }, (_, i) => ({
      file: `c${i}.pdf`, po_number: null, quote_ref: null,
      line_items: [{ qty: 1, unit_price: 100 + i * 5, ext_price: 100 + i * 5 }],
      order_ext_total: 100 + i * 5, confidence: "medium",
    })),
  };
  const CLEAN_EXT = CLEAN.records.map((r) => r.line_items[0].ext_price); // 100..295
  // OCR-NOISE: 30 OCR "$1" rows + 12 real ($200..$530) -> median collapses to $1 while IQR stays WIDE,
  // so the IQR-collapse reliability check still reads reliable (the documented false-`reliable` gap).
  const OCR = {
    schemaVersion: "1.0.0", source: "synthetic-test-fixture", advisoryOnly: true, mustHumanVerify: true, caveat: null,
    records: [
      ...Array.from({ length: 30 }, (_, i) => ({ file: `o${i}.pdf`, po_number: null, quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "medium" })),
      ...Array.from({ length: 12 }, (_, i) => ({ file: `r${i}.pdf`, po_number: null, quote_ref: null, line_items: [{ qty: 1, unit_price: 200 + i * 30, ext_price: 200 + i * 30 }], order_ext_total: 200 + i * 30, confidence: "medium" })),
    ],
  };
  const OCR_REAL = OCR.records.filter((r) => r.line_items[0].ext_price > 50).map((r) => r.line_items[0].ext_price);

  let dir: string;
  let cleanPath: string;
  let ocrPath: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "outbound-promote-gate-"));
    cleanPath = join(dir, "clean.json");
    ocrPath = join(dir, "ocr.json");
    writeFileSync(cleanPath, JSON.stringify(CLEAN), "utf-8");
    writeFileSync(ocrPath, JSON.stringify(OCR), "utf-8");
  });
  afterAll(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("identity: clean ext_prices vs themselves -> against=line, reliable, aligned, block false", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: CLEAN_EXT, against: "line", minConfidence: "medium", indexPath: cleanPath } }));
    expect(out.match.against).toBe("line"); // grain-lock proven (FMV is per-part-job = line ext_price)
    expect(out.match.referenceReliable).toBe(true); // n=40, wide IQR
    expect(out.gate.verdict).toBe("aligned"); // predicted == reference => medianRatio ~ 1.0
    expect(out.gate.block).toBe(false);
  });

  it("drift: clean ext_prices x1.5 -> predicted-high, withheld-outbound-drift, block true", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: CLEAN_EXT.map((v) => v * 1.5), against: "line", minConfidence: "medium", indexPath: cleanPath } }));
    expect(out.match.medianRatio).toBeGreaterThan(1.15); // ~1.5
    expect(out.gate.verdict).toBe("withheld-outbound-drift");
    expect(out.gate.block).toBe(true);
  });

  it("grain is forwarded: against=order (single-line => order total === line ext) stays aligned (R9: a mis-forward would change against)", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: CLEAN_EXT, against: "order", minConfidence: "medium", indexPath: cleanPath } }));
    expect(out.match.against).toBe("order");
    expect(out.gate.block).toBe(false);
  });

  it("unverified: non-existent index path -> reference unusable, gate unverified, block false (never throws)", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: [100, 200, 300], against: "line", minConfidence: "high", indexPath: join(dir, "nope.json") } }));
    expect(out.match.ok).toBe(false);
    expect(out.gate.verdict).toBe("unverified");
    expect(out.gate.block).toBe(false);
  });

  it("FLOOR-SPIKE FIX (hermetic): an OCR-$1 floor-spike reference is now degenerate-reference -> unverified, so real $-magnitude predictions no longer FALSE-drift", async () => {
    // 30 OCR "$1" rows + 12 real ($200..$530): the $1 mass (71%) pins the median to the noise floor
    // while the IQR stays WIDE -> the IQR-collapse guard MISSES it. The floor-spike guard
    // (U-QP-OUTBOUND-FLOOR-SPIKE-GUARD: dominant min-mass + median-pinned-to-floor) now catches it,
    // so the reference reads degenerate-reference (referenceReliable:false) and the gate is unverified.
    // The prior false `withheld-outbound-drift`/block:true veto on real quotes is GONE.
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: OCR_REAL, against: "line", minConfidence: "medium", indexPath: ocrPath } }));
    expect(out.match.reference.median).toBeLessThan(10); // OCR-$1 collapsed median (~$1, unchanged)
    expect(out.match.reference.minMassFrac).toBeGreaterThanOrEqual(0.25); // dominant $1 floor mass (30/42)
    expect(out.match.referenceReliable).toBe(false); // FIX: floor-spike guard catches the wide-IQR bottom-spike
    expect(out.gate.verdict).toBe("unverified"); // FIX: was "withheld-outbound-drift" (the false veto)
    expect(out.gate.block).toBe(false); // FIX: a directional-only OCR-noise reference must NOT veto a real improvement
  });

  it("schema exposes maxConcentration: a huge bound flags the wide-IQR OCR reference degenerate -> unverified (closes the strip-gap)", async () => {
    // Without minReferenceN/maxConcentration in the schema, zod strips them and the engine pins defaults;
    // this proves the dispatcher can now reach the reliability pivot (R9: revert the schema -> reliable:true -> fails).
    const { handler } = makeServer();
    const out = parse(await handler({ action: "outbound_promote_check", params: { predicted: OCR_REAL, against: "line", minConfidence: "medium", indexPath: ocrPath, maxConcentration: 1000 } }));
    expect(out.match.referenceReliable).toBe(false);
    expect(out.gate.verdict).toBe("unverified");
    expect(out.gate.block).toBe(false);
  });
});

describe("quotingDispatcher — registration", () => {
  it("registers as prism_quoting tool", () => {
    const { toolName } = makeServer();
    expect(toolName).toBe("prism_quoting");
  });
});

describe("quotingDispatcher — action round-trip", () => {
  it("camera_intake_route: blueprint text → route=blueprint", async () => {
    const { handler } = makeServer();
    const out = await handler({
      action: "camera_intake_route",
      params: { text: "DRAWING NO 12345 SCALE 1:1 Ø10mm Ø20mm Ø30mm tolerance ±0.05" },
    });
    expect(parse(out).route).toBe("blueprint");
  });

  it("insert_box_lookup: SANDVIK ISO 1832 → catalog_match with vendor=Sandvik", async () => {
    const { handler } = makeServer();
    const out = await handler({
      action: "insert_box_lookup",
      params: { text: "SANDVIK CNMG120408 grade 4325" },
    });
    expect(parse(out).catalog_match.vendor).toBe("Sandvik");
  });

  it("machine_tag_extract: Haas tag → make=HAAS, success=true", async () => {
    const { handler } = makeServer();
    const out = await handler({
      action: "machine_tag_extract",
      params: { text: "HAAS Model VF-2 S/N: 1098761" },
    });
    const res = parse(out);
    expect(res.success).toBe(true);
    expect(res.fields.make).toBe("HAAS");
  });

  it("machine_parts_bom_resolve: Haas VF-2 → BOM length 6", async () => {
    const { handler } = makeServer();
    const out = await handler({
      action: "machine_parts_bom_resolve",
      params: { make: "Haas", model: "VF-2" },
    });
    const res = parse(out);
    expect(res.resolved).toBe(true);
    expect(res.bom.length).toBe(6);
  });

  it("vendor_realtime_price: cached lookup returns unit_price_usd", async () => {
    const { handler } = makeServer();
    const out = await handler({
      action: "vendor_realtime_price",
      params: {
        adapter: "mcmaster",
        sku: "VACTRA-2",
        cachedPrices: { mcmaster: { "VACTRA-2": { unit_price_usd: 28.50, source: "csv" } } },
      },
    });
    expect(parse(out).unit_price_usd).toBe(28.50);
  });

  it("live_chat lifecycle: open → turn → close (3 round-trips)", async () => {
    const { handler } = makeServer();
    const opened = parse(await handler({ action: "live_chat_session_open" }));
    expect(opened.state).toBe("open");
    const sessionId = opened.sessionId;
    // Without an assistant callback wired, turn returns an explicit error (not a fake reply)
    const turnRes = parse(await handler({ action: "live_chat_session_turn", params: { sessionId, userText: "test" } }));
    expect(turnRes.text).toMatch(/no assistant callback/);
    const closed = parse(await handler({ action: "live_chat_session_close", params: { sessionId } }));
    expect(closed.closed).toBe(true);
  });
});

describe("quotingDispatcher — error handling (R12 fail-loud)", () => {
  it("unknown action → isError=true with unknown-action error", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "no_such_action" });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toMatch(/unknown action/);
  });

  it("missing required params → isError=true with schema-validation-failed", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "machine_tag_extract", params: {} });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toBe("schema-validation-failed");
  });
});

// QUOTING-COST-SAVINGS-WIRE (charlie 2026-06-11): prove the previously-DORMANT CostSavingsTrackerEngine
// (13/13 engine tests but 0 dispatcher consumers) is now invokable THROUGH prism_quoting end-to-end.
// Round-trips use read-only sub-actions + schema-reject paths so they never mutate the engine's real store.
describe("quotingDispatcher -- cost_savings (CostSavingsTrackerEngine wire, was 0-consumer dormant)", () => {
  it("routes read-only roi_summary to the engine (NOT the Unknown-action default) -> {totalSavings, eventCount, byCategory}", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "cost_savings", params: { savingsAction: "roi_summary", period: "month" } }));
    // Proves the wire reaches CostSavingsTrackerEngine.getSummary: a number totalSavings + eventCount + byCategory map.
    // If the action were unrouted, the engine's calculate() default would return {error:"Unknown action..."}.
    expect(out).not.toHaveProperty("error");
    expect(typeof out.totalSavings).toBe("number");
    expect(typeof out.eventCount).toBe("number");
    expect(typeof out.byCategory).toBe("object");
  });

  it("passes through a roi_trend window param to the engine without crashing -> structured (non-error) trend", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "cost_savings", params: { savingsAction: "roi_trend", months: 3 } }));
    expect(out).not.toHaveProperty("error"); // passthrough() carried `months` to getTrend; routed, not rejected
    expect(typeof out).toBe("object");
  });

  it("FAILURE: an out-of-enum savingsAction is rejected by the schema (never reaches the engine)", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "cost_savings", params: { savingsAction: "roi_bogus" } });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toBe("schema-validation-failed");
  });

  it("FAILURE: a missing savingsAction is rejected by the schema", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "cost_savings", params: {} });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toBe("schema-validation-failed");
  });

  it("ADVERSARIAL: a non-string savingsAction (number) is rejected by the schema", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "cost_savings", params: { savingsAction: 42 } });
    expect(out.isError).toBe(true);
  });
});

// QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST round-trip (charlie 2026-06-11).
// The action MUST be in quotingActionEnum + QUOTING_ACTION_SCHEMAS or the real z.enum SDK gate
// rejects it -- this round-trip through the captured handler is the only test that proves the
// full enum->schema->case wiring (a unit test of the engine alone cannot, per the MockMCPServer caveat).
describe("quotingDispatcher -- closed_loop_outcome_digest (wiring round-trip)", () => {
  let dir: string;
  let ledgerPath: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "outcome-digest-"));
    ledgerPath = join(dir, "quoting-cycle-outcomes.jsonl");
    // 6 cycles: 3 WITHHELD_SYNTHETIC (0.5 >= threshold), 2 PROMOTED (delta 8,4), 1 NO_DRIFT_NO_OP.
    const lines = [
      { cycle_id: "c1", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T10:00:00.000Z" },
      { cycle_id: "c2", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T10:05:00.000Z" },
      { cycle_id: "c3", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T10:10:00.000Z" },
      { cycle_id: "c4", verdict: "PROMOTED", drift_detected: true, mape_delta: 8, applied: true, provenance: "real", fed_at: "2026-06-11T10:15:00.000Z" },
      { cycle_id: "c5", verdict: "PROMOTED", drift_detected: true, mape_delta: 4, applied: true, provenance: "real", fed_at: "2026-06-11T10:20:00.000Z" },
      { cycle_id: "c6", verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false, provenance: null, fed_at: "2026-06-11T10:25:00.000Z" },
    ];
    writeFileSync(ledgerPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf-8");
  });
  afterAll(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("round-trips the ledger -> behavior distribution + provenance_problem health verdict", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "closed_loop_outcome_digest", params: { ledgerPath } }));
    expect(out.total_cycles).toBe(6);
    expect(out.by_verdict.WITHHELD_SYNTHETIC.count).toBe(3);
    expect(out.by_verdict.PROMOTED.count).toBe(2);
    expect(out.withhold_rate).toBeCloseTo(0.5, 10);
    expect(out.mean_applied_mape_delta).toBe(6); // (8+4)/2 over the 2 PROMOTED
    expect(out.health.provenance_problem).toBe(true); // 0.5 >= threshold
    expect(out.health.healthy).toBe(false);
    expect(out.window.first_iso).toBe("2026-06-11T10:00:00.000Z");
    expect(out.window.last_iso).toBe("2026-06-11T10:25:00.000Z");
  });

  it("missing ledger path -> a zero digest (fail-soft), not an error", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "closed_loop_outcome_digest", params: { ledgerPath: join(dir, "does-not-exist.jsonl") } }));
    expect(out.total_cycles).toBe(0);
    expect(out.health.insufficient_cycles).toBe(true);
  });

  it("ADVERSARIAL: a non-string ledgerPath (number) is rejected by the schema", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "closed_loop_outcome_digest", params: { ledgerPath: 42 } });
    expect(out.isError).toBe(true);
  });
});

// QUOTING-SYNERGY-MS0/U-QP-OUTCOME-DIGEST-IN-STATUS (charlie 2026-06-11). The loop-health verdict is
// consumable through the SAME training_status read the calibration-health UI already calls -- opt-in.
describe("quotingDispatcher -- training_status includeOutcomeDigest (closed-loop health surfacing)", () => {
  let dir: string;
  let ledgerPath: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "status-digest-"));
    ledgerPath = join(dir, "quoting-cycle-outcomes.jsonl");
    const lines = [
      { cycle_id: "s1", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T09:00:00.000Z" },
      { cycle_id: "s2", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T09:05:00.000Z" },
      { cycle_id: "s3", verdict: "WITHHELD_SYNTHETIC", drift_detected: true, mape_delta: null, applied: false, provenance: "synthetic", fed_at: "2026-06-11T09:10:00.000Z" },
      { cycle_id: "s4", verdict: "PROMOTED", drift_detected: true, mape_delta: 6, applied: true, provenance: "real", fed_at: "2026-06-11T09:15:00.000Z" },
      { cycle_id: "s5", verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false, provenance: null, fed_at: "2026-06-11T09:20:00.000Z" },
    ];
    writeFileSync(ledgerPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf-8");
  });
  afterAll(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("includeOutcomeDigest=true surfaces the digest + health verdict in the training_status response", async () => {
    const { handler } = makeServer();
    // statusPath -> a non-existent file so the status read is deterministic (ENOENT -> not-found, never
    // throws); includeActiveFactor:false skips the active-factor disk read; the digest reads the tmp ledger.
    const out = parse(await handler({
      action: "training_status",
      params: { statusPath: join(dir, "no-status.json"), includeActiveFactor: false, includeOutcomeDigest: true, outcomeLedgerPath: ledgerPath },
    }));
    expect(out.outcome_digest.total_cycles).toBe(5);
    expect(out.outcome_digest.by_verdict.WITHHELD_SYNTHETIC.count).toBe(3);
    expect(out.outcome_digest.withhold_rate).toBeCloseTo(0.6, 10);
    expect(out.outcome_digest.health.provenance_problem).toBe(true); // 0.6 >= 0.5
    expect(out.outcome_digest.health.healthy).toBe(false);
    expect(out.outcome_digest.mean_applied_mape_delta).toBe(6); // the single PROMOTED cycle
  });

  it("omitting includeOutcomeDigest produces NO outcome_digest key (zero contract change)", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "training_status",
      params: { statusPath: join(dir, "no-status.json"), includeActiveFactor: false },
    }));
    // undefined-valued keys are dropped by JSON.stringify -> the key is absent on the wire.
    expect("outcome_digest" in out).toBe(false);
    // The base action still resolves: a missing statusPath -> ENOENT -> deterministic not-found verdict.
    expect(out.ok).toBe(false);
    expect(out.reason).toBe("training-status-file-missing");
    expect(out.training_status.ok).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Customer-safe public quote actions (U-QP-PUBLIC-QUOTE + U-QP-PUBLIC-INSTANT).
// Round-trip through the dispatcher to prove the boundary holds AND that an engine
// throw is CONTAINED (never surfaces a raw internal error to the customer).
// ──────────────────────────────────────────────────────────────────────────
describe("quotingDispatcher -- quoting_public_quote (customer-safe FMV)", () => {
  it("valid FMV input -> quotable, only the 4 safe keys, no internal leak", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "quoting_public_quote",
      params: { time_in_cut_s: 600, machine_rate_usd_per_hr: 95, material_spend_usd: 40, target_margin_pct: 20 },
    }));
    expect(out.quotable).toBe(true);
    expect(typeof out.quote_usd).toBe("number");
    expect(out.quote_usd).toBeGreaterThan(0);
    expect(out.currency).toBe("USD");
    expect(out.reason).toBe(null);
    // No internal cost-basis field crosses the boundary.
    const blob = JSON.stringify(out);
    for (const s of ["components", "gap_pct", "verdict", "charged_usd", "margin_usd"]) {
      expect(blob).not.toContain(s);
    }
  });

  it("missing required FMV inputs -> schema-validation-failed (not a fabricated $0)", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({ action: "quoting_public_quote", params: { time_in_cut_s: 600 } }));
    expect(out.error).toBe("schema-validation-failed");
  });
});

describe("quotingDispatcher -- quoting_public_instant_quote (customer-safe instant quote + DFM gate)", () => {
  it("real part -> quotable customer-safe quote; NO internal cost-basis leak", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "quoting_public_instant_quote",
      params: {
        part_name: "bracket-A", material: "aluminum_6061", quantity: 10,
        bounding_box_mm: { x: 80, y: 60, z: 20 }, part_volume_cm3: 40,
        machine_type: "cnc_mill_3axis",
      },
    }));
    expect(out.quotable).toBe(true);
    expect(out.quote_usd).toBeGreaterThan(0);
    expect(out.unit_price_usd).toBeGreaterThan(0);
    expect(out.currency).toBe("USD");
    // Only the customer-safe keys; no internal cost breakdown / machine / physics leak.
    const blob = JSON.stringify(out);
    for (const s of [
      "cost_breakdown", "machine_rate_hr", "similar_parts", "historical_price",
      "recommended_machine", "physics_engines_used", "cycle_time_source",
      "total_cost_per_part", "confidence_factors",
    ]) {
      expect(blob).not.toContain(s);
    }
  });

  it("schema rejects a degenerate quantity (0 / negative / non-integer)", async () => {
    const { handler } = makeServer();
    for (const q of [0, -5, 2.5]) {
      const out = parse(await handler({
        action: "quoting_public_instant_quote",
        params: { part_name: "x", material: "aluminum_6061", quantity: q },
      }));
      expect(out.error).toBe("schema-validation-failed");
    }
  });

  it("CONTAINMENT: a part input that trips the engine still returns a customer-safe shape, never a raw error", async () => {
    const { handler } = makeServer();
    // An unknown/garbage material + minimal geometry exercises the deepest estimate path.
    // Whatever the engine does (quote or throw), the dispatcher must return a customer-safe
    // PublicInstantQuoteResult -- NEVER {error:"dispatcher-runtime-error", detail:<internal>}.
    const out = parse(await handler({
      action: "quoting_public_instant_quote",
      params: { part_name: "edge", material: "totally_unknown_material_xyz", quantity: 1 },
    }));
    // The shape is always the customer-safe contract: a boolean `quotable`, and on the
    // not-quotable path a sanitized reason category -- not an internal error/detail.
    expect(typeof out.quotable).toBe("boolean");
    expect("error" in out).toBe(false);
    expect("detail" in out).toBe(false);
    if (out.quotable === false) {
      expect(["quote-unavailable", "dfm-revision-required", "insufficient-part-data"]).toContain(out.reason);
    }
    // No internal failure string leaked regardless of path.
    const blob = JSON.stringify(out);
    expect(blob).not.toContain("Quote estimation failed");
    expect(blob).not.toContain("dispatcher-runtime-error");
  });
});

// U-QP-QUOTE-PACKET round-trip: the customer-deliverable packet (MVP S4). Runs the
// instant quote -> customer-safe public projection -> packet. Asserts the packet
// structure AND that no internal cost-basis field leaks through the whole chain.
describe("quotingDispatcher -- quote_packet_generate (customer-deliverable packet)", () => {
  it("real part + meta -> structured packet (header + line + breaks + tiers); NO internal leak", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "quote_packet_generate",
      params: {
        part_name: "bracket-A", material: "aluminum_6061", quantity: 10,
        bounding_box_mm: { x: 80, y: 60, z: 20 }, part_volume_cm3: 40,
        machine_type: "cnc_mill_3axis",
        meta: { quote_id: "Q-RT-1", date: "2026-06-22", customer_ref: "PO-RT", part_name: "bracket-A", quantity: 10 },
      },
    }));
    expect(out.quotable).toBe(true);
    expect(out.reason).toBe(null);
    // Header identity comes from meta (never from the internal quote).
    expect(out.header.quote_id).toBe("Q-RT-1");
    expect(out.header.customer_ref).toBe("PO-RT");
    expect(out.header.currency).toBe("USD");
    expect(out.header.valid_until_days).toBe(30); // default
    // Price line carries a real customer price.
    expect(out.line.total_price_usd).toBeGreaterThan(0);
    expect(typeof out.terms).toBe("string");
    // No internal cost-basis field leaks through the instant->public->packet chain.
    const blob = JSON.stringify(out);
    for (const s of [
      "cost_breakdown", "machine_rate_hr", "similar_parts", "historical_price",
      "recommended_machine", "physics_engines_used", "total_cost_per_part", "margin_usd",
    ]) {
      expect(blob).not.toContain(s);
    }
  });

  it("schema rejects a degenerate quantity (0 / negative / non-integer)", async () => {
    const { handler } = makeServer();
    for (const q of [0, -5, 2.5]) {
      const out = parse(await handler({
        action: "quote_packet_generate",
        params: { part_name: "x", material: "aluminum_6061", quantity: q },
      }));
      expect(out.error).toBe("schema-validation-failed");
    }
  });

  it("CONTAINMENT: a part input that trips the engine fails closed to a packet, never a raw error", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "quote_packet_generate",
      params: { part_name: "edge", material: "totally_unknown_material_xyz", quantity: 1, meta: { quote_id: "Q-EDGE" } },
    }));
    // Always the packet contract: a boolean quotable + a populated header, never an internal error.
    expect(typeof out.quotable).toBe("boolean");
    expect("error" in out).toBe(false);
    expect("detail" in out).toBe(false);
    expect(out.header.quote_id).toBe("Q-EDGE"); // header populated even on fail-closed
    if (out.quotable === false) {
      expect(out.line.total_price_usd).toBe(null);
      expect(["quote-unavailable", "dfm-revision-required", "insufficient-part-data"]).toContain(out.reason);
    }
    const blob = JSON.stringify(out);
    expect(blob).not.toContain("Quote estimation failed");
    expect(blob).not.toContain("dispatcher-runtime-error");
  });
});

// QUOTING-OPTIMAL-MS0/U8 -- the two-layer optimal-quote algorithm head, through the dispatcher.
// Uses the real on-disk corpus (state/shared/quoting/real-actuals-corpus.json, 1,787 records).
describe("quotingDispatcher -- optimal_quote_recommend (U8 round-trip)", () => {
  it("returns a predicted price + CI band; profit_optimal honestly suppressed (won-only corpus)", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "optimal_quote_recommend",
      params: { cost_floor_usd: 500, customer: "OPTIMAS SOLUTIONS", tier_score: 0.6, quantity: 1 },
    }));
    if (out.ok === false && out.reason === "price-model-unavailable") {
      expect(out.detail).toBeTruthy(); // fail-loud carries the cause
      return;
    }
    expect(out.ok).toBe(true);
    expect(out.predicted_price_usd).toBeGreaterThan(0);
    expect(out.ci95_low_usd).toBeLessThanOrEqual(out.predicted_price_usd);
    expect(out.ci95_high_usd).toBeGreaterThanOrEqual(out.predicted_price_usd);
    expect(out.markup_source).toBe("per-customer");
    expect(out.n_customer).toBeGreaterThan(10);
    expect(out.profit_optimal).toBeNull();
    expect(out.profit_optimal_reason).toBe("insufficient-win-loss-data");
  });

  it("an unknown customer falls back to the global markup", async () => {
    const { handler } = makeServer();
    const out = parse(await handler({
      action: "optimal_quote_recommend",
      params: { cost_floor_usd: 500, customer: "ZZ-BRAND-NEW-CUSTOMER-ZZ" },
    }));
    if (out.ok === false && out.reason === "price-model-unavailable") return;
    expect(out.ok).toBe(true);
    expect(out.markup_source).toBe("global");
    expect(out.predicted_price_usd).toBeGreaterThan(0);
  });

  it("rejects a non-positive cost floor at the schema layer", async () => {
    const { handler } = makeServer();
    const out = await handler({ action: "optimal_quote_recommend", params: { cost_floor_usd: 0, customer: "X" } });
    expect(out.isError === true || parse(out).ok === false).toBe(true);
  });
});
