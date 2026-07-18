/**
 * ConsumableReconcileWire.test.ts -- QUOTING-OPTIMAL/U4b
 *
 * Dispatcher round-trip coverage for prism_quoting:consumable_reconcile. Invokes
 * THROUGH the registered dispatcher (enum -> schema -> case -> engine -> content
 * envelope), not just the engine singleton (R15). Also proves the schema layer
 * rejects malformed params and that the output carries NO shop-rate/margin
 * constant (charlie soul leak-scan).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";

type Handler = (args: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;

function makeServer(): Handler {
  let captured: Handler | null = null;
  registerQuotingDispatcher({
    tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
      captured = h;
    },
  });
  if (!captured) throw new Error("dispatcher did not register a handler");
  return captured;
}
const parse = (out: { content: Array<{ type: "text"; text: string }> }) => JSON.parse(out.content[0].text);

let fixtureDir: string;
let basisPath: string;
let priorCaptureEnv: string | undefined;
beforeAll(() => {
  // Hermetic: short-circuit the OutcomeCaptureBus so the round-trip does not append
  // a real line to state/outcomes/quote.jsonl (the case emits telemetry on success).
  priorCaptureEnv = process.env.PRISM_OUTCOME_CAPTURE_DISABLE;
  process.env.PRISM_OUTCOME_CAPTURE_DISABLE = "1";
  fixtureDir = mkdtempSync(join(tmpdir(), "consrec-wire-"));
  basisPath = join(fixtureDir, "jm-tool-purchases.json");
  writeFileSync(
    basisPath,
    JSON.stringify({
      schemaVersion: "1.0.0",
      byType: { insert: { count: 200, spend: 1000 } }, // $5.00 / line-item
    }),
    "utf8",
  );
});
afterAll(() => {
  if (priorCaptureEnv === undefined) delete process.env.PRISM_OUTCOME_CAPTURE_DISABLE;
  else process.env.PRISM_OUTCOME_CAPTURE_DISABLE = priorCaptureEnv;
  rmSync(fixtureDir, { recursive: true, force: true });
});

describe("quotingDispatcher: consumable_reconcile round-trip (enum -> schema -> case)", () => {
  it("happy round-trip returns the reconciliation report with exact per-type variance", async () => {
    const out = parse(
      await makeServer()({
        action: "consumable_reconcile",
        params: {
          job_id: "J-1",
          quote_id: "Q-1",
          customer: "OPTIMAS",
          predicted: [{ type: "rough_ins", category: "insert", predicted_qty: 4, cost_per_unit: 12.5 }],
          actual: [{ type: "rough_ins", qty_used: 6, qty_broken: 1 }],
          unit_cost_basis_path: basisPath,
        },
      }),
    );
    expect(out.reconciliation_id).toBe("consrec-Q-1-J-1");
    expect(out.total_predicted_consumable_usd).toBe(50);
    expect(out.total_actual_consumable_usd).toBe(75);
    expect(out.total_variance_usd).toBe(25);
    expect(out.consumables[0].multiplier).toBe(1.2); // 1.5 clamped
    expect(out.feedback_multipliers.rough_ins).toBe(1.2);
  });

  it("advisory-prior fallback flows through the dispatcher (omitted cost_per_unit)", async () => {
    const out = parse(
      await makeServer()({
        action: "consumable_reconcile",
        params: {
          job_id: "J-2",
          quote_id: "Q-2",
          predicted: [{ type: "ins", category: "insert", predicted_qty: 2 }],
          actual: [{ type: "ins", qty_used: 2 }],
          unit_cost_basis_path: basisPath,
        },
      }),
    );
    expect(out.consumables[0].cost_per_unit_source).toBe("advisory-prior");
    expect(out.consumables[0].cost_per_unit).toBe(5); // 1000/200 line-item avg
  });

  it("rejects a missing job_id at the schema layer (z.string().min(1))", async () => {
    const out = parse(
      await makeServer()({
        action: "consumable_reconcile",
        params: {
          quote_id: "Q-3",
          predicted: [],
          actual: [],
        },
      }),
    );
    // pin the reject to the SCHEMA layer (not an engine throw): the dispatcher emits
    // {error:"schema-validation-failed", issues:[...]} before the engine is imported.
    expect(out.error).toBe("schema-validation-failed");
    expect(Array.isArray(out.issues)).toBe(true);
    expect(JSON.stringify(out.issues).toLowerCase()).toContain("job_id");
  });

  it("rejects an unknown consumable category at the schema layer (z.enum)", async () => {
    const out = parse(
      await makeServer()({
        action: "consumable_reconcile",
        params: {
          job_id: "J-4",
          quote_id: "Q-4",
          predicted: [{ type: "x", category: "plutonium", predicted_qty: 1 }],
          actual: [],
          unit_cost_basis_path: basisPath,
        },
      }),
    );
    expect(out.error).toBe("schema-validation-failed");
    expect(JSON.stringify(out.issues).toLowerCase()).toContain("category");
  });

  it("the exact quote_vs_actual event the case emits VALIDATES + stamps schemaVersion 1.1.0 (drop-guard)", () => {
    // Regression tripwire: if a future refactor moves USD onto numeric_features or adds a
    // v11-only kind that fails superRefine, the event would be silently dropped. Feed a temp-dir
    // bus the EXACT payload shape the dispatcher case builds and assert it is accepted + stamped.
    const busDir = mkdtempSync(join(tmpdir(), "consrec-bus-"));
    const prevDisable = process.env.PRISM_OUTCOME_CAPTURE_DISABLE;
    delete process.env.PRISM_OUTCOME_CAPTURE_DISABLE; // bus must be ENABLED for this assertion
    try {
      const bus = new OutcomeCaptureBusEngine(busDir);
      const res = bus.record({
        domain: "quote",
        kind: "quote_vs_actual",
        source: "system",
        lineage_id: "Q-BUS-1",
        context: { engine: "ConsumableReconciliation", job_id: "J-BUS-1", customer: "OPTIMAS" },
        recommended: { total_predicted_consumable_usd: 50 },
        actual: { total_actual_consumable_usd: 75 },
        delta: { total_variance_pct: 50, feedback_multipliers: { ins: 1.2 } },
      });
      expect(res.ok).toBe(true); // NOT silently dropped
      const written = readFileSync(join(busDir, "quote.jsonl"), "utf8").trim().split("\n");
      const ev = JSON.parse(written[written.length - 1]);
      expect(ev.schemaVersion).toBe("1.1.0"); // job_id context key auto-bumps to 1.1.0
      expect(ev.numeric_features).toBeUndefined(); // USD stayed off the physics-key surface
      expect(ev.recommended.total_predicted_consumable_usd).toBe(50);
    } finally {
      if (prevDisable !== undefined) process.env.PRISM_OUTCOME_CAPTURE_DISABLE = prevDisable;
      else process.env.PRISM_OUTCOME_CAPTURE_DISABLE = "1"; // restore suite-wide disable
      rmSync(busDir, { recursive: true, force: true });
    }
  });

  it("output carries NO shop-rate/margin constant (charlie soul leak-scan)", async () => {
    const out = parse(
      await makeServer()({
        action: "consumable_reconcile",
        params: {
          job_id: "J-5",
          quote_id: "Q-5",
          predicted: [{ type: "t", category: "insert", predicted_qty: 1, cost_per_unit: 5 }],
          actual: [{ type: "t", qty_used: 1 }],
          unit_cost_basis_path: basisPath,
        },
      }),
    );
    const blob = JSON.stringify(out).toLowerCase();
    // the report must not smuggle shop-rate/margin fields into the customer-adjacent surface
    expect(blob).not.toContain("shop_rate");
    expect(blob).not.toContain("machine_rate");
    expect(blob).not.toContain("margin_pct");
    expect(blob).not.toContain("overhead_pct");
  });
});
