/**
 * Tests for scripts/lib/ollama-bridge-telemetry.mjs.
 *
 * Suite goals (matches the U-OE-BRIDGE-TELEMETRY spec):
 *   - Pure helpers verified end-to-end (recordToolCallEvent / eventToJsonLine /
 *     summarizeTelemetry / percentile / pickLedgerPath / telemetryDisabled).
 *   - The ONE impure entry (appendTelemetryEvent) is exercised through
 *     injected appendImpl + mkdirImpl substitutes — disk health is irrelevant.
 *   - One real-data E2E writes to an OS tmpdir to prove the wired path
 *     (per the "pure-core + injected-readers MUST ship one real-data E2E"
 *     lesson from [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]).
 *   - Fail-soft contract: a thrown appendImpl returns {ok:false}, NEVER throws,
 *     so the bridge's agent loop is never crashed by a disk failure.
 *   - Schema fail-on-revert guards: malformed/missing/extra fields are
 *     normalized deterministically; ERROR_CLASSES whitelist is honored.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, isAbsolute, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SCHEMA_VERSION,
  DEFAULT_LEDGER_REL,
  KNOWN_TOOLS,
  MAX_EVENT_BYTES,
  ERROR_CLASSES,
  telemetryDisabled,
  recordToolCallEvent,
  eventToJsonLine,
  appendTelemetryEvent,
  pickLedgerPath,
  summarizeTelemetry,
  percentile,
} from "./ollama-bridge-telemetry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

// ─────────────────────────────────────────────────────────────────────────
// Constants / module shape
// ─────────────────────────────────────────────────────────────────────────

test("SCHEMA_VERSION is the stable 1.0.0 string", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

test("DEFAULT_LEDGER_REL is under state/shared and ends .jsonl", () => {
  assert.match(DEFAULT_LEDGER_REL, /state[\\/]shared[\\/]ollama-bridge-telemetry\.jsonl$/);
});

test("KNOWN_TOOLS mirrors the bridge TOOL_NAMES — frozen 3-tool surface", () => {
  // KEEP IN SYNC with scripts/ollama-prism-bridge.mjs TOOL_NAMES.
  // If L2b adds a tool, both sets update together; this test fails on revert.
  assert.deepEqual([...KNOWN_TOOLS], ["viz_search", "wiki_lookup", "read_excerpt"]);
  assert.equal(Object.isFrozen(KNOWN_TOOLS), true);
});

test("MAX_EVENT_BYTES is a defensive 4KB cap", () => {
  assert.equal(MAX_EVENT_BYTES, 4096);
});

test("ERROR_CLASSES is the frozen enum the bridge call-sites depend on", () => {
  assert.deepEqual([...ERROR_CLASSES], [
    "abort",
    "timeout",
    "unknown-tool",
    "validation",
    "exception",
  ]);
  assert.equal(Object.isFrozen(ERROR_CLASSES), true);
});

// ─────────────────────────────────────────────────────────────────────────
// telemetryDisabled — env-driven kill switch
// ─────────────────────────────────────────────────────────────────────────

test("telemetryDisabled returns false when env unset", () => {
  assert.equal(telemetryDisabled({}), false);
});

test("telemetryDisabled returns true on '1', 'true', 'yes' (case-insensitive)", () => {
  for (const v of ["1", "true", "TRUE", "yes", "YES", "  true  "]) {
    assert.equal(telemetryDisabled({ PRISM_OBB_TELEMETRY_DISABLE: v }), true, `value=${JSON.stringify(v)}`);
  }
});

test("telemetryDisabled returns false on '0', 'false', empty, unrelated text", () => {
  for (const v of ["0", "false", "", "no", "off", "definitely not"]) {
    assert.equal(telemetryDisabled({ PRISM_OBB_TELEMETRY_DISABLE: v }), false, `value=${JSON.stringify(v)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// recordToolCallEvent — schema normalization
// ─────────────────────────────────────────────────────────────────────────

test("recordToolCallEvent — full happy path is frozen and complete", () => {
  const ev = recordToolCallEvent({
    ts: "2026-05-18T13:00:00.000Z",
    model: "qwen2.5-coder:3b",
    tool: "viz_search",
    outcome: "ok",
    latencyMs: 42.7,
    args: { query: "kienzle" },
    result: "hit1\nhit2",
    iteration: 2,
    errorClass: null,
    runId: "abcd-1234",
  });
  assert.equal(ev.schemaVersion, "1.0.0");
  assert.equal(ev.ts, "2026-05-18T13:00:00.000Z");
  assert.equal(ev.model, "qwen2.5-coder:3b");
  assert.equal(ev.tool, "viz_search");
  assert.equal(ev.outcome, "ok");
  assert.equal(ev.latencyMs, 43); // rounded
  assert.equal(ev.iteration, 2);
  assert.equal(ev.errorClass, null);
  assert.equal(ev.runId, "abcd-1234");
  assert.ok(ev.argsBytes > 0, "argsBytes derived from JSON.stringify(args)");
  assert.ok(ev.resultBytes > 0, "resultBytes derived from result string");
  assert.equal(Object.isFrozen(ev), true);
});

test("recordToolCallEvent — missing ts uses injected now()", () => {
  const fixed = new Date("2026-05-18T14:00:00.000Z");
  const ev = recordToolCallEvent({ tool: "viz_search", outcome: "ok" }, { now: () => fixed });
  assert.equal(ev.ts, fixed.toISOString());
});

test("recordToolCallEvent — empty/missing model normalizes to 'unknown'", () => {
  const a = recordToolCallEvent({ tool: "viz_search", outcome: "ok" });
  const b = recordToolCallEvent({ tool: "viz_search", outcome: "ok", model: "" });
  const c = recordToolCallEvent({ tool: "viz_search", outcome: "ok", model: "   " });
  assert.equal(a.model, "unknown");
  assert.equal(b.model, "unknown");
  assert.equal(c.model, "unknown");
});

test("recordToolCallEvent — empty tool normalizes to '(malformed)'", () => {
  const ev = recordToolCallEvent({ tool: "", outcome: "error" });
  assert.equal(ev.tool, "(malformed)");
});

test("recordToolCallEvent — outcome whitelist enforced", () => {
  const okOutcomes = ["ok", "error", "malformed", "unknown-tool"];
  for (const o of okOutcomes) {
    assert.equal(recordToolCallEvent({ tool: "viz_search", outcome: o }).outcome, o);
  }
  // Garbage outcome → defaults to 'error' (fail-loud — never silent-pass as ok)
  assert.equal(recordToolCallEvent({ tool: "viz_search", outcome: "weird" }).outcome, "error");
  assert.equal(recordToolCallEvent({ tool: "viz_search" }).outcome, "error");
});

test("recordToolCallEvent — invalid latencyMs becomes null", () => {
  for (const bad of [-1, NaN, Infinity, -Infinity, "42", null, undefined]) {
    const ev = recordToolCallEvent({ tool: "viz_search", outcome: "ok", latencyMs: bad });
    assert.equal(ev.latencyMs, null, `bad=${String(bad)}`);
  }
});

test("recordToolCallEvent — non-OK errorClass rejected (R12)", () => {
  assert.equal(recordToolCallEvent({ tool: "x", outcome: "error", errorClass: "abort" }).errorClass, "abort");
  // Unknown errorClass is dropped to null — analyst sees no false attribution
  assert.equal(recordToolCallEvent({ tool: "x", outcome: "error", errorClass: "wat" }).errorClass, null);
});

test("recordToolCallEvent — iteration must be ≥1 finite int", () => {
  assert.equal(recordToolCallEvent({ tool: "x", iteration: 0 }).iteration, null);
  assert.equal(recordToolCallEvent({ tool: "x", iteration: -2 }).iteration, null);
  assert.equal(recordToolCallEvent({ tool: "x", iteration: 3.7 }).iteration, 4);
  assert.equal(recordToolCallEvent({ tool: "x" }).iteration, null);
});

test("recordToolCallEvent — argsBytes/resultBytes derive from raw when not explicit", () => {
  const ev = recordToolCallEvent({
    tool: "viz_search",
    outcome: "ok",
    args: { query: "hello" },
    result: "1234567890",
  });
  assert.equal(ev.argsBytes, Buffer.byteLength(JSON.stringify({ query: "hello" }), "utf8"));
  assert.equal(ev.resultBytes, 10);
});

test("recordToolCallEvent — explicit byte sizes win when valid", () => {
  const ev = recordToolCallEvent({
    tool: "viz_search",
    outcome: "ok",
    argsBytes: 17,
    resultBytes: 1024,
  });
  assert.equal(ev.argsBytes, 17);
  assert.equal(ev.resultBytes, 1024);
});

// ─────────────────────────────────────────────────────────────────────────
// eventToJsonLine — serialization + cap
// ─────────────────────────────────────────────────────────────────────────

test("eventToJsonLine — round-trips a normal event with trailing newline", () => {
  const ev = recordToolCallEvent({ tool: "viz_search", outcome: "ok", model: "x" });
  const s = eventToJsonLine(ev);
  assert.equal(s.ok, true);
  assert.ok(s.line.endsWith("\n"));
  const parsed = JSON.parse(s.line);
  assert.equal(parsed.tool, "viz_search");
  assert.equal(parsed.outcome, "ok");
  assert.equal(parsed.schemaVersion, "1.0.0");
});

test("eventToJsonLine — rejects oversized events with explicit error (no truncation)", () => {
  const huge = recordToolCallEvent({
    tool: "viz_search",
    outcome: "ok",
    model: "x",
    result: "A".repeat(MAX_EVENT_BYTES + 100),
  });
  // result text isn't in the serialized event (we store resultBytes only), so
  // this should NOT exceed the cap — assert that schema design intent first.
  const ser = eventToJsonLine(huge);
  assert.equal(ser.ok, true, "well-formed events stay under cap");
  // To force the cap, blow up the runId.
  const bombed = recordToolCallEvent({
    tool: "viz_search",
    outcome: "ok",
    runId: "B".repeat(MAX_EVENT_BYTES + 100),
  });
  const ser2 = eventToJsonLine(bombed);
  assert.equal(ser2.ok, false);
  assert.match(ser2.error, /MAX_EVENT_BYTES/);
});

// ─────────────────────────────────────────────────────────────────────────
// pickLedgerPath — confined path resolution
// ─────────────────────────────────────────────────────────────────────────

test("pickLedgerPath — undefined → default under REPO_ROOT, absolute", () => {
  const p = pickLedgerPath();
  assert.ok(isAbsolute(p));
  assert.ok(p.startsWith(REPO_ROOT));
  assert.ok(p.endsWith(".jsonl"));
});

test("pickLedgerPath — empty/whitespace override → default", () => {
  assert.equal(pickLedgerPath(""), pickLedgerPath());
  assert.equal(pickLedgerPath("   "), pickLedgerPath());
});

test("pickLedgerPath — absolute override is preserved verbatim", () => {
  const abs = resolve(tmpdir(), "out.jsonl");
  assert.equal(pickLedgerPath(abs), abs);
});

test("pickLedgerPath — relative override resolves against REPO_ROOT", () => {
  const out = pickLedgerPath("custom/foo.jsonl");
  assert.equal(out, resolve(REPO_ROOT, "custom/foo.jsonl"));
});

// ─────────────────────────────────────────────────────────────────────────
// appendTelemetryEvent — injected I/O, disabled, fail-soft
// ─────────────────────────────────────────────────────────────────────────

test("appendTelemetryEvent — disabled env short-circuits with reason", () => {
  const calls = [];
  const r = appendTelemetryEvent(recordToolCallEvent({ tool: "viz_search", outcome: "ok" }), {
    env: { PRISM_OBB_TELEMETRY_DISABLE: "1" },
    appendImpl: (...args) => calls.push(args),
    mkdirImpl: () => {},
  });
  assert.equal(r.ok, true);
  assert.equal(r.written, false);
  assert.equal(r.reason, "disabled");
  assert.equal(calls.length, 0, "no I/O when disabled");
});

test("appendTelemetryEvent — writes via injected appendImpl on happy path", () => {
  const writes = [];
  const mkdirs = [];
  const r = appendTelemetryEvent(recordToolCallEvent({
    tool: "viz_search", outcome: "ok", model: "qwen2.5-coder:3b",
  }), {
    env: {},
    appendImpl: (p, data) => writes.push({ p, data }),
    mkdirImpl: (p, opts) => mkdirs.push({ p, opts }),
    ledgerPath: "tmp/test.jsonl",
  });
  assert.equal(r.ok, true);
  assert.equal(r.written, true);
  assert.equal(writes.length, 1);
  assert.ok(writes[0].data.endsWith("\n"));
  const parsed = JSON.parse(writes[0].data);
  assert.equal(parsed.tool, "viz_search");
  assert.equal(mkdirs.length, 1);
  assert.deepEqual(mkdirs[0].opts, { recursive: true });
});

test("appendTelemetryEvent — fail-soft: appendImpl throw returns {ok:false}, never throws", () => {
  const r = appendTelemetryEvent(recordToolCallEvent({ tool: "viz_search", outcome: "ok" }), {
    env: {},
    appendImpl: () => { throw new Error("disk full"); },
    mkdirImpl: () => {},
    ledgerPath: "tmp/test.jsonl",
  });
  assert.equal(r.ok, false);
  assert.equal(r.written, false);
  assert.match(r.error, /disk full/);
  // R12 invariant: telemetry is observability, never load-bearing — caller does
  // not need a try/catch around appendTelemetryEvent.
});

test("appendTelemetryEvent — fail-soft: mkdirImpl non-EEXIST throw is returned, not raised", () => {
  const r = appendTelemetryEvent(recordToolCallEvent({ tool: "viz_search", outcome: "ok" }), {
    env: {},
    appendImpl: () => {},
    mkdirImpl: () => { throw new Error("EACCES"); },
    ledgerPath: "tmp/test.jsonl",
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /EACCES/);
});

test("appendTelemetryEvent — mkdirImpl EEXIST is swallowed (idempotent dir creation)", () => {
  let appended = false;
  const r = appendTelemetryEvent(recordToolCallEvent({ tool: "viz_search", outcome: "ok" }), {
    env: {},
    appendImpl: () => { appended = true; },
    mkdirImpl: () => { const e = new Error("exists"); e.code = "EEXIST"; throw e; },
    ledgerPath: "tmp/test.jsonl",
  });
  assert.equal(r.ok, true);
  assert.equal(r.written, true);
  assert.equal(appended, true);
});

test("appendTelemetryEvent — oversized event returns serialization error before any I/O", () => {
  let writeCount = 0;
  const oversized = recordToolCallEvent({
    tool: "viz_search",
    outcome: "ok",
    runId: "B".repeat(MAX_EVENT_BYTES + 100),
  });
  const r = appendTelemetryEvent(oversized, {
    env: {},
    appendImpl: () => { writeCount++; },
    mkdirImpl: () => {},
  });
  assert.equal(r.ok, false);
  assert.equal(writeCount, 0, "no I/O issued for oversized event");
});

// ─────────────────────────────────────────────────────────────────────────
// summarizeTelemetry / percentile — analysis surface
// ─────────────────────────────────────────────────────────────────────────

test("summarizeTelemetry — empty input returns deterministic zero shape", () => {
  const s = summarizeTelemetry([]);
  assert.equal(s.total, 0);
  assert.deepEqual(s.byTool, {});
  assert.deepEqual(s.byOutcome, {});
  assert.deepEqual(s.toolSuccessRate, {});
  assert.equal(s.latency, null);
});

test("summarizeTelemetry — non-array input is normalized to empty", () => {
  const s = summarizeTelemetry(null);
  assert.equal(s.total, 0);
});

test("summarizeTelemetry — accurate counts + per-tool success rate", () => {
  const evs = [
    { tool: "viz_search", outcome: "ok", latencyMs: 10 },
    { tool: "viz_search", outcome: "ok", latencyMs: 20 },
    { tool: "viz_search", outcome: "error", errorClass: "abort", latencyMs: 30 },
    { tool: "wiki_lookup", outcome: "ok", latencyMs: 40 },
    { tool: "read_excerpt", outcome: "error", errorClass: "validation" },
  ];
  const s = summarizeTelemetry(evs);
  assert.equal(s.total, 5);
  assert.deepEqual(s.byTool, { viz_search: 3, wiki_lookup: 1, read_excerpt: 1 });
  assert.deepEqual(s.byOutcome, { ok: 3, error: 2 });
  assert.deepEqual(s.byErrorClass, { abort: 1, validation: 1 });
  assert.equal(s.toolSuccessRate.viz_search, 2 / 3);
  assert.equal(s.toolSuccessRate.wiki_lookup, 1);
  assert.equal(s.toolSuccessRate.read_excerpt, 0);
  assert.equal(s.latency.count, 4);
  assert.equal(s.latency.min, 10);
  assert.equal(s.latency.max, 40);
  assert.equal(s.latency.mean, (10 + 20 + 30 + 40) / 4);
});

test("summarizeTelemetry — uncalled tool gets NO success-rate entry (no false zeros)", () => {
  const s = summarizeTelemetry([{ tool: "viz_search", outcome: "ok" }]);
  assert.equal(s.toolSuccessRate.viz_search, 1);
  assert.equal(s.toolSuccessRate.wiki_lookup, undefined);
  assert.equal(s.toolSuccessRate.read_excerpt, undefined);
});

test("summarizeTelemetry — junk events are dropped, valid ones counted", () => {
  const s = summarizeTelemetry([null, undefined, "not-an-event", { tool: "viz_search", outcome: "ok" }]);
  assert.equal(s.total, 4, "total counts the raw input length"); // total is length-based
  assert.deepEqual(s.byTool, { viz_search: 1 });
});

test("percentile — nearest-rank semantics", () => {
  assert.equal(percentile([10, 20, 30, 40, 50], 0.5), 30);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.95), 50);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.01), 10);
});

test("percentile — defensive guards", () => {
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile(null, 0.5), null);
  assert.equal(percentile([1, 2, 3], 0), null);
  assert.equal(percentile([1, 2, 3], 1.1), null);
});

// ─────────────────────────────────────────────────────────────────────────
// Real-data E2E — writes the full happy path to a tmpdir, then summarizes
// ─────────────────────────────────────────────────────────────────────────

test("E2E — append → readback → summarize on a tmpdir ledger", () => {
  const root = mkdtempSync(join(tmpdir(), "obb-telemetry-"));
  const ledgerPath = join(root, "deep", "ledger.jsonl");
  try {
    const events = [
      recordToolCallEvent({ tool: "viz_search", outcome: "ok", model: "qwen2.5-coder:3b", latencyMs: 12, iteration: 1, runId: "r1" }),
      recordToolCallEvent({ tool: "wiki_lookup", outcome: "error", model: "qwen2.5-coder:3b", latencyMs: 34, iteration: 1, errorClass: "exception", runId: "r1" }),
      recordToolCallEvent({ tool: "read_excerpt", outcome: "ok", model: "qwen2.5-coder:3b", latencyMs: 8, iteration: 2, runId: "r1" }),
    ];
    for (const ev of events) {
      const r = appendTelemetryEvent(ev, { env: {}, ledgerPath });
      assert.equal(r.ok, true);
      assert.equal(r.written, true);
    }
    assert.ok(existsSync(ledgerPath));
    const lines = readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean);
    assert.equal(lines.length, 3);
    const parsed = lines.map((l) => JSON.parse(l));
    assert.deepEqual(parsed.map((p) => p.tool), ["viz_search", "wiki_lookup", "read_excerpt"]);
    assert.deepEqual(parsed.map((p) => p.outcome), ["ok", "error", "ok"]);
    const s = summarizeTelemetry(parsed);
    assert.equal(s.total, 3);
    assert.equal(s.toolSuccessRate.viz_search, 1);
    assert.equal(s.toolSuccessRate.wiki_lookup, 0);
    assert.equal(s.toolSuccessRate.read_excerpt, 1);
    assert.equal(s.latency.count, 3);
    assert.equal(s.latency.min, 8);
    assert.equal(s.latency.max, 34);
    // File size sanity — nothing pathologically huge written.
    assert.ok(statSync(ledgerPath).size < MAX_EVENT_BYTES * 3 * 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
