// Tests for scripts/lib/outcome-actual-emit.mjs (FLEET-CLOSEDLOOP-MS0/U-CL-PRODUCER).
// Run: node --test scripts/lib/outcome-actual-emit.test.mjs  (or: node scripts/lib/outcome-actual-emit.test.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasDeterminingInput,
  buildOutcomeEvent,
  emitOutcomeActual,
  pickSchemaVersion,
  OUTCOME_DOMAINS,
  OUTCOME_KINDS,
  OUTCOME_SOURCES,
  OUTCOME_SEVERITIES,
  DETERMINING_INPUT_KEYS,
  MAX_LINE_BYTES,
} from "./outcome-actual-emit.mjs";
import { outcomeToAlpaca, convertJsonlText } from "./outcome-to-alpaca-converter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.resolve(__dirname, "..", "..", "mcp-server", "src", "schemas", "outcomeEventSchema.ts");

// Fixed injectors for deterministic events.
const fixed = { uuid: () => "11111111-1111-1111-1111-111111111111", clock: () => new Date("2026-06-19T00:00:00.000Z") };
const goodQuote = () => ({
  domain: "quote",
  kind: "quote_vs_actual",
  source: "import",
  context: { operation: "5-axis-mill", material: "4140" },
  actual: { final_price_usd: 1875.5, lead_days: 12 },
  ...fixed,
});

test("hasDeterminingInput: true only when a determining key is a non-empty string", () => {
  assert.equal(hasDeterminingInput({ material: "4140" }), true);
  assert.equal(hasDeterminingInput({ tool_id: "EM-0.5" }), true);
  assert.equal(hasDeterminingInput({ engine: "x", action: "y", hook: "z" }), false); // the prediction-only shape on disk
  assert.equal(hasDeterminingInput({ material: "   " }), false); // whitespace is empty
  assert.equal(hasDeterminingInput(null), false);
  assert.equal(hasDeterminingInput("nope"), false);
});

test("buildOutcomeEvent: happy path -> valid v1.0.0 event the converter accepts, output = ACTUAL", () => {
  const ev = buildOutcomeEvent(goodQuote());
  assert.equal(ev.schemaVersion, "1.0.0");
  assert.equal(ev.domain, "quote");
  assert.equal(ev.kind, "quote_vs_actual");
  assert.equal(ev.severity, "info");
  assert.equal(ev.timestamp, "2026-06-19T00:00:00.000Z");
  assert.equal(ev.event_id, "11111111-1111-1111-1111-111111111111");
  assert.ok(ev.actual && ev.recommended === undefined, "actual present, recommended absent");
  // The converter must accept it AND its output must reflect the ACTUAL (not a prediction).
  const pair = outcomeToAlpaca(ev);
  assert.ok(pair, "converter accepts the event");
  assert.match(pair.instruction, /material=4140/);
  assert.match(pair.output, /final_price_usd=1875\.5/);
});

test("buildOutcomeEvent: recommended is preserved when supplied, with actual as the measured side", () => {
  const ev = buildOutcomeEvent({ ...goodQuote(), recommended: { quoted_price_usd: 2000 }, delta: { price_err_usd: 124.5 } });
  assert.equal(ev.recommended.quoted_price_usd, 2000);
  assert.equal(ev.actual.final_price_usd, 1875.5);
  assert.equal(ev.delta.price_err_usd, 124.5);
});

test("buildOutcomeEvent: rejects invalid enum values (domain/kind/source/severity)", () => {
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), domain: "quoting" }), /invalid domain/); // common mistake: it's "quote"
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), kind: "made_up" }), /invalid kind/);
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), source: "magic" }), /invalid source/);
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), severity: "fatal" }), /invalid severity/);
});

test("buildOutcomeEvent: rejects context without a determining input (would be silently skipped)", () => {
  assert.throws(
    () => buildOutcomeEvent({ ...goodQuote(), context: { engine: "x", action: "y", hook: "z" } }),
    /determining input/,
  );
});

test("buildOutcomeEvent: rejects empty actual AND recommended", () => {
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), actual: {}, recommended: undefined }), /at least one of actual\/recommended/);
});

test("buildOutcomeEvent: rejects out-of-range confidence", () => {
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), confidence: 1.5 }), /confidence must be in/);
});

test("buildOutcomeEvent (ADVERSARIAL): rejects a payload with no extractable scalar leaves", () => {
  // determining input present, but actual has only empty nested objects -> converter buildOutput -> null.
  assert.throws(
    () => buildOutcomeEvent({ ...goodQuote(), actual: { summary: {}, raw: {} } }),
    /not learnable/,
  );
});

test("buildOutcomeEvent (ADVERSARIAL): non-object opts throws, never silently returns", () => {
  assert.throws(() => buildOutcomeEvent(null), TypeError);
  assert.throws(() => buildOutcomeEvent("event"), TypeError);
});

test("emitOutcomeActual: appends one line to <dir>/<domain>.jsonl and round-trips through the converter", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-oae-"));
  try {
    const r1 = emitOutcomeActual(goodQuote(), { dir });
    const r2 = emitOutcomeActual(
      { domain: "wedm", kind: "surface_finish_ra", source: "cmm", context: { operation: "skim-pass", material: "D2" }, actual: { actual_ra_um: 0.42, wire_break_count: 0 }, ...fixed },
      { dir },
    );
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(path.basename(r1.path), "quote.jsonl");
    assert.equal(path.basename(r2.path), "wedm.jsonl");
    // The written file is real, valid JSONL the EXISTING builder converts to a training pair.
    const text = fs.readFileSync(r2.path, "utf8");
    const { rows, invalid, skipped } = convertJsonlText(text);
    assert.equal(invalid, 0);
    assert.equal(skipped, 0);
    assert.equal(rows.length, 1);
    assert.match(rows[0].output, /actual_ra_um=0\.42/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("emitOutcomeActual: I/O failure is fail-soft (ok:false) but the event still built", () => {
  const boom = () => { throw new Error("disk full"); };
  const r = emitOutcomeActual(goodQuote(), { dir: "/x", appendImpl: boom, mkdirImpl: () => {} });
  assert.equal(r.ok, false);
  assert.match(r.error, /disk full/);
  assert.ok(r.event, "event was built even though the write failed");
});

test("emitOutcomeActual: a caller bug (invalid enum) PROPAGATES, not swallowed as fail-soft", () => {
  assert.throws(() => emitOutcomeActual({ ...goodQuote(), domain: "bogus" }, { appendImpl: () => {}, mkdirImpl: () => {} }), /invalid domain/);
});

test("buildOutcomeEvent: auto-bumps schemaVersion to 1.1.0 for a v1.1.0 context key (no version-bleed)", () => {
  // A 1.0.0 stamp + a v1.1.0 context key is rejected by the canonical schema -> the bus would
  // silently drop it. The producer must bump the version so the record survives both consumers.
  const ev = buildOutcomeEvent({ ...goodQuote(), context: { material: "4140", job_id: "J-42" } });
  assert.equal(ev.schemaVersion, "1.1.0");
  assert.equal(pickSchemaVersion("quote_vs_actual", { material: "x" }), "1.0.0");
  assert.equal(pickSchemaVersion("cross_process_stage_complete", { material: "x" }), "1.1.0");
});

test("buildOutcomeEvent: rejects camelCase context keys the schema would silently drop", () => {
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), context: { material: "4140", jobId: "J-42" } }), /camelCase variant/);
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), context: { partNumber: "P1", material: "4140" } }), /camelCase variant/);
});

test("buildOutcomeEvent (ADVERSARIAL): rejects non-finite numbers (would serialize to null)", () => {
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), actual: { lead_days: Infinity } }), /non-finite/);
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), actual: { final_price_usd: NaN } }), /non-finite/);
  assert.throws(() => buildOutcomeEvent({ ...goodQuote(), recommended: { quoted_price_usd: 100 }, actual: { x: -Infinity } }), /non-finite/);
});

test("buildOutcomeEvent: strips a __proto__ own-key from context (ledger hygiene, no pollution)", () => {
  const ctx = JSON.parse('{"material":"4140","__proto__":{"polluted":true}}'); // own-enumerable __proto__
  const ev = buildOutcomeEvent({ ...goodQuote(), context: ctx });
  assert.equal(Object.prototype.hasOwnProperty.call(ev.context, "__proto__"), false);
  assert.equal({}.polluted, undefined); // global proto intact
});

test("emitOutcomeActual: refuses a line over MAX_LINE_BYTES, fail-soft, no write attempted", () => {
  let wrote = false;
  const big = "x".repeat(MAX_LINE_BYTES + 100);
  const r = emitOutcomeActual(
    { ...goodQuote(), actual: { final_price_usd: 1, blob: big } },
    { appendImpl: () => { wrote = true; }, mkdirImpl: () => {} },
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /MAX_LINE_BYTES/);
  assert.equal(wrote, false, "must not attempt the torn-line write");
});

// Regression guard (the module comment promises this): the mirrored enum Sets must stay in
// sync with the canonical zod enums. If outcomeEventSchema.ts adds/removes a value, this fails.
test("enum mirrors stay in sync with mcp-server/src/schemas/outcomeEventSchema.ts", () => {
  const src = fs.readFileSync(SCHEMA, "utf8");
  const enumValues = (constName) => {
    const m = src.match(new RegExp(`export const ${constName} = z\\.enum\\(\\[([\\s\\S]*?)\\]\\)`));
    assert.ok(m, `could not find ${constName} z.enum in schema`);
    return new Set([...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]));
  };
  assert.deepEqual([...OUTCOME_DOMAINS].sort(), [...enumValues("OutcomeDomain")].sort());
  assert.deepEqual([...OUTCOME_KINDS].sort(), [...enumValues("OutcomeKind")].sort());
  assert.deepEqual([...OUTCOME_SOURCES].sort(), [...enumValues("OutcomeSource")].sort());
  assert.deepEqual([...OUTCOME_SEVERITIES].sort(), [...enumValues("OutcomeSeverity")].sort());
  // DETERMINING_INPUT_KEYS must match the converter's INPUT_KEYS.
  assert.deepEqual(DETERMINING_INPUT_KEYS, ["material", "tool_id", "tool", "operation", "feature", "machine_id", "process"]);
});
