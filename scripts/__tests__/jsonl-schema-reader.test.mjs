/**
 * jsonl-schema-reader.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-SCHEMA-READER.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip via createReader().readFile
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseJsonlLine,
  createReader,
  validateAdditiveOnly,
  loadActiveVersions,
  recordActiveVersion,
  writeActiveVersions,
  pruneStaleVersions,
  DEFAULT_SCHEMA_VERSION,
  MAX_LINE_BYTES,
} from "../../.claude/helpers/jsonl-schema-reader.mjs";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRoot() {
  return mkdtempSync(join(tmpdir(), "jsonl-schema-reader-"));
}

function writeJsonl(root, name, lines) {
  const p = join(root, name);
  writeFileSync(p, lines.join("\n") + "\n", "utf8");
  return p;
}

// ──────────────────────────────────────────────────────────────────────
// Constants exported
// ──────────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_SCHEMA_VERSION === 1 (legacy lines)", () => {
    expect(DEFAULT_SCHEMA_VERSION).toBe(1);
  });
  it("MAX_LINE_BYTES is 1 MiB", () => {
    expect(MAX_LINE_BYTES).toBe(1024 * 1024);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseJsonlLine — pure
// ──────────────────────────────────────────────────────────────────────

describe("parseJsonlLine", () => {
  it("parses a valid object line + extracts explicit schemaVersion", () => {
    const out = parseJsonlLine('{"schemaVersion":2,"foo":"bar"}');
    expect(out.ok).toBe(true);
    expect(out.value).toEqual({ schemaVersion: 2, foo: "bar" });
    expect(out.schemaVersion).toBe(2);
  });

  it("defaults schemaVersion to 1 when missing", () => {
    const out = parseJsonlLine('{"foo":"bar"}');
    expect(out.ok).toBe(true);
    expect(out.schemaVersion).toBe(1);
  });

  it("respects opts.defaultVersion for missing schemaVersion", () => {
    const out = parseJsonlLine('{"foo":1}', { defaultVersion: 5 });
    expect(out.schemaVersion).toBe(5);
  });

  it("strips trailing CRLF before parsing", () => {
    const out = parseJsonlLine('{"a":1}\r\n');
    expect(out.ok).toBe(true);
    expect(out.value).toEqual({ a: 1 });
  });

  it("empty line → ok:true with empty:true marker", () => {
    const out = parseJsonlLine("");
    expect(out.ok).toBe(true);
    expect(out.empty).toBe(true);
    expect(out.value).toBe(null);
  });

  it("whitespace-only line is parse-failed (not empty)", () => {
    const out = parseJsonlLine("   ");
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/parse failed/);
  });

  it("rejects non-string input", () => {
    expect(parseJsonlLine(null).ok).toBe(false);
    expect(parseJsonlLine(42).ok).toBe(false);
  });

  it("rejects malformed JSON with parse-failed reason", () => {
    const out = parseJsonlLine("{not valid");
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/parse failed/);
  });

  it("rejects non-object root: array, scalar, null", () => {
    expect(parseJsonlLine("[1,2,3]").ok).toBe(false);
    expect(parseJsonlLine("[1,2,3]").reason).toMatch(/non-object root \(array\)/);
    expect(parseJsonlLine("42").ok).toBe(false);
    expect(parseJsonlLine("42").reason).toMatch(/non-object root \(number\)/);
    expect(parseJsonlLine("null").ok).toBe(false);
    expect(parseJsonlLine('"string"').ok).toBe(false);
  });

  it("rejects line above MAX_LINE_BYTES ceiling", () => {
    const big = '{"a":"' + "x".repeat(MAX_LINE_BYTES) + '"}';
    const out = parseJsonlLine(big);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/exceeds.*byte ceiling/);
  });

  it("clamps non-finite / fractional schemaVersion to floor + min(1)", () => {
    expect(parseJsonlLine('{"schemaVersion":2.7,"a":1}').schemaVersion).toBe(2);
    expect(parseJsonlLine('{"schemaVersion":-3,"a":1}').schemaVersion).toBe(1);
    expect(parseJsonlLine('{"schemaVersion":"two","a":1}').schemaVersion).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// createReader — registry + dispatch
// ──────────────────────────────────────────────────────────────────────

describe("createReader.register / dispatch", () => {
  it("dispatches each line to the registered version handler; counts per-version", () => {
    const seen = { v1: [], v2: [] };
    const reader = createReader();
    reader.register(1, (row) => seen.v1.push(row));
    reader.register(2, (row) => seen.v2.push(row));
    const lines = [
      '{"id":"a"}',
      '{"schemaVersion":2,"id":"b","extra":"new"}',
      '{"schemaVersion":1,"id":"c"}',
    ];
    const out = reader.readLines(lines);
    expect(out.totalLines).toBe(3);
    expect(out.parsed).toBe(3);
    expect(out.dispatched).toBe(3);
    expect(out.counts).toEqual({ 1: 2, 2: 1 });
    expect(seen.v1.map((r) => r.id)).toEqual(["a", "c"]);
    expect(seen.v2.map((r) => r.id)).toEqual(["b"]);
  });

  it("skips lines whose version has no registered reader; surfaces in errors", () => {
    const reader = createReader();
    reader.register(1, () => {});
    const out = reader.readLines(['{"id":"a"}', '{"schemaVersion":99,"id":"b"}']);
    expect(out.parsed).toBe(2);
    expect(out.dispatched).toBe(1);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]).toMatchObject({ line: 2, reason: "no_reader_for_version", version: 99 });
  });

  it("handler that throws is captured as error (does not halt the read)", () => {
    const reader = createReader();
    reader.register(1, () => { throw new Error("boom"); });
    const out = reader.readLines(['{"id":"a"}', '{"id":"b"}']);
    expect(out.parsed).toBe(2);
    expect(out.dispatched).toBe(0);
    expect(out.errors).toHaveLength(2);
    expect(out.errors[0].reason).toMatch(/handler threw: boom/);
  });

  it("register throws on invalid version / handler", () => {
    const reader = createReader();
    expect(() => reader.register(0, () => {})).toThrow(/positive integer/);
    expect(() => reader.register(1.5, () => {})).toThrow(/positive integer/);
    expect(() => reader.register("v1", () => {})).toThrow(/positive integer/);
    expect(() => reader.register(1, "not a fn")).toThrow(/must be a function/);
  });

  it("hasReader / listVersions reflect the registry", () => {
    const reader = createReader();
    reader.register(1, () => {});
    reader.register(3, () => {});
    expect(reader.hasReader(1)).toBe(true);
    expect(reader.hasReader(2)).toBe(false);
    expect(reader.listVersions()).toEqual([1, 3]);
  });

  it("opts.schemaName feeds the observed-versions tracker", () => {
    const reader = createReader();
    reader.register(1, () => {});
    reader.register(2, () => {});
    reader.readLines(['{"id":"a"}', '{"schemaVersion":2,"id":"b"}'], { schemaName: "AGENT_CHAT" });
    expect(reader.observed("AGENT_CHAT")).toEqual([1, 2]);
    expect(reader.observed("OTHER")).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// readFile — fs round-trip + failure modes
// ──────────────────────────────────────────────────────────────────────

describe("createReader.readFile (round-trip)", () => {
  let root;
  beforeEach(() => { root = makeRoot(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("happy: 3-line JSONL, mixed v1/v2, all dispatched", () => {
    const p = writeJsonl(root, "events.jsonl", [
      '{"id":"a","ts":"t1"}',
      '{"schemaVersion":2,"id":"b","ts":"t2","extra":"new"}',
      '{"id":"c","ts":"t3"}',
    ]);
    const reader = createReader();
    let v1 = 0, v2 = 0;
    reader.register(1, () => { v1++; });
    reader.register(2, () => { v2++; });
    const out = reader.readFile(p);
    expect(out.ok).toBe(true);
    expect(out.totalLines).toBe(4); // 3 lines + trailing newline-induced empty
    expect(out.dispatched).toBe(3);
    expect(out.empty).toBe(1);
    expect(v1).toBe(2);
    expect(v2).toBe(1);
  });

  it("failure: missing file → ok:false with reason", () => {
    const reader = createReader();
    const out = reader.readFile(join(root, "nope.jsonl"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });

  it("failure: bad lines mixed with good ones — partial dispatch + per-line errors", () => {
    const p = writeJsonl(root, "noisy.jsonl", [
      '{"id":"a"}',
      '{not valid json',
      '{"id":"c"}',
      '[1,2,3]',
      '{"id":"d"}',
    ]);
    const reader = createReader();
    reader.register(1, () => {});
    const out = reader.readFile(p);
    expect(out.ok).toBe(true); // ok refers to the file read, not per-line
    expect(out.dispatched).toBe(3);
    expect(out.errors).toHaveLength(2);
    expect(out.errors[0]).toMatchObject({ line: 2 });
    expect(out.errors[1]).toMatchObject({ line: 4 });
    expect(out.errors[1].reason).toMatch(/non-object root/);
  });

  it("failure: line above MAX_LINE_BYTES is skipped + reported, file read continues", () => {
    const big = '{"a":"' + "x".repeat(MAX_LINE_BYTES) + '"}';
    const p = writeJsonl(root, "huge.jsonl", ['{"id":"a"}', big, '{"id":"c"}']);
    const reader = createReader();
    reader.register(1, () => {});
    const out = reader.readFile(p);
    expect(out.dispatched).toBe(2);
    expect(out.errors.some((e) => /byte ceiling/.test(e.reason))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// validateAdditiveOnly — pure
// ──────────────────────────────────────────────────────────────────────

describe("validateAdditiveOnly", () => {
  it("PASS: v2 adds a field, keeps all v1 fields", () => {
    const v1 = { schemaVersion: 1, fields: { id: "string", ts: "string" } };
    const v2 = { schemaVersion: 2, fields: { id: "string", ts: "string", extra: "number" } };
    const r = validateAdditiveOnly(v1, v2);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.additions).toEqual(["extra"]);
  });

  it("FAIL: v2 removes a v1 field", () => {
    const v1 = { schemaVersion: 1, fields: { id: "string", ts: "string" } };
    const v2 = { schemaVersion: 2, fields: { id: "string" } };
    const r = validateAdditiveOnly(v1, v2);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toEqual({ kind: "field_removed", field: "ts" });
  });

  it("FAIL: object↔array shape flip on a field", () => {
    const v1 = { schemaVersion: 1, fields: { meta: "object" } };
    const v2 = { schemaVersion: 2, fields: { meta: "array" } };
    const r = validateAdditiveOnly(v1, v2);
    expect(r.ok).toBe(false);
    expect(r.errors[0].kind).toBe("object_array_flip");
  });

  it("WARN (not fail): scalar type widening (string → number)", () => {
    const v1 = { schemaVersion: 1, fields: { count: "string" } };
    const v2 = { schemaVersion: 2, fields: { count: "number" } };
    const r = validateAdditiveOnly(v1, v2);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toEqual({ kind: "type_changed", field: "count", prev: "string", next: "number" });
  });

  it("FAIL: missing prev or next descriptor", () => {
    expect(validateAdditiveOnly(null, {}).ok).toBe(false);
    expect(validateAdditiveOnly({}, null).ok).toBe(false);
  });

  it("PASS with empty fields on both sides (degenerate but valid)", () => {
    expect(validateAdditiveOnly({ fields: {} }, { fields: {} }).ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Active-version registry
// ──────────────────────────────────────────────────────────────────────

describe("loadActiveVersions / recordActiveVersion / writeActiveVersions", () => {
  let root;
  beforeEach(() => { root = makeRoot(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("missing file → empty default registry", () => {
    const r = loadActiveVersions(join(root, "no.json"));
    expect(r).toEqual({ schemaVersion: 1, schemas: {} });
  });

  it("malformed JSON → empty default (defensive)", () => {
    const p = join(root, "bad.json");
    writeFileSync(p, "{not", "utf8");
    expect(loadActiveVersions(p).schemas).toEqual({});
  });

  it("recordActiveVersion adds version + last_seen + sorts", () => {
    const reg = { schemaVersion: 1, schemas: {} };
    recordActiveVersion(reg, "AGENT_CHAT", 2, "2026-05-13T22:00:00Z");
    recordActiveVersion(reg, "AGENT_CHAT", 1, "2026-05-13T22:01:00Z");
    expect(reg.schemas.AGENT_CHAT.active_versions).toEqual([1, 2]);
    expect(reg.schemas.AGENT_CHAT.last_seen).toEqual({ 1: "2026-05-13T22:01:00Z", 2: "2026-05-13T22:00:00Z" });
  });

  it("recordActiveVersion is idempotent — same (schema, version) replaces last_seen, no dup version", () => {
    const reg = { schemaVersion: 1, schemas: {} };
    recordActiveVersion(reg, "X", 1, "t1");
    recordActiveVersion(reg, "X", 1, "t2");
    expect(reg.schemas.X.active_versions).toEqual([1]);
    expect(reg.schemas.X.last_seen[1]).toBe("t2");
  });

  it("writeActiveVersions creates parent dir + atomic-rename writes JSON", () => {
    const reg = { schemaVersion: 1, schemas: { X: { active_versions: [1], last_seen: { 1: "t" }, last_updated: "t" } } };
    const p = join(root, "deep/nested/.schema-active-versions.json");
    writeActiveVersions(p, reg);
    expect(existsSync(p)).toBe(true);
    const back = JSON.parse(readFileSync(p, "utf8"));
    expect(back.schemas.X.active_versions).toEqual([1]);
    const residue = readdirSync(join(root, "deep/nested")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("pruneStaleVersions removes versions past staleAfterMs threshold; preserves active ones", () => {
    const reg = {
      schemaVersion: 1,
      schemas: {
        X: {
          active_versions: [1, 2, 3],
          last_seen: {
            1: "2026-01-01T00:00:00Z",  // ancient
            2: "2026-05-10T00:00:00Z",  // 3 days ago vs nowMs
            3: "2026-05-13T22:00:00Z",  // recent
          },
          last_updated: "2026-05-13T22:00:00Z",
        },
      },
    };
    const nowMs = Date.parse("2026-05-13T22:30:00Z");
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const r = pruneStaleVersions(reg, "X", nowMs, fortyEightHoursMs);
    expect(r.pruned.map((p) => p.version).sort()).toEqual([1, 2]);
    expect(r.remaining).toEqual([3]);
    expect(reg.schemas.X.active_versions).toEqual([3]);
    // last_seen for the pruned versions must be deleted; the surviving v3 keeps its timestamp
    expect(Object.keys(reg.schemas.X.last_seen).sort()).toEqual(["3"]);
    expect(reg.schemas.X.last_seen[3]).toBe("2026-05-13T22:00:00Z");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Adversarial + spanning
// ──────────────────────────────────────────────────────────────────────

describe("adversarial + spanning", () => {
  let root;
  beforeEach(() => { root = makeRoot(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("adversarial: file is entirely empty (no lines) → ok:true, dispatched=0", () => {
    const p = join(root, "empty.jsonl");
    writeFileSync(p, "", "utf8");
    const reader = createReader();
    reader.register(1, () => {});
    const out = reader.readFile(p);
    expect(out.ok).toBe(true);
    expect(out.dispatched).toBe(0);
  });

  it("adversarial: line with schemaVersion exactly 0 clamps to 1", () => {
    const out = parseJsonlLine('{"schemaVersion":0,"a":1}');
    expect(out.schemaVersion).toBe(1);
  });

  it("spanning: 1000-line file with v1+v2 mix dispatches all", () => {
    const lines = [];
    for (let i = 0; i < 1000; i++) {
      lines.push(i % 2 === 0 ? `{"id":${i}}` : `{"schemaVersion":2,"id":${i}}`);
    }
    const p = writeJsonl(root, "big.jsonl", lines);
    let v1 = 0, v2 = 0;
    const reader = createReader();
    reader.register(1, () => { v1++; });
    reader.register(2, () => { v2++; });
    const out = reader.readFile(p);
    expect(out.dispatched).toBe(1000);
    expect(v1).toBe(500);
    expect(v2).toBe(500);
    expect(out.counts).toEqual({ 1: 500, 2: 500 });
  });

  it("spanning: only-v1 file with no v2 reader registered still dispatches everything", () => {
    const p = writeJsonl(root, "v1only.jsonl", ['{"id":"a"}', '{"id":"b"}', '{"id":"c"}']);
    const reader = createReader();
    reader.register(1, () => {});
    const out = reader.readFile(p);
    expect(out.dispatched).toBe(3);
    expect(out.errors).toEqual([]);
  });

  it("spanning: schemaName tracking populates observed across multi-version reads", () => {
    const reader = createReader();
    reader.register(1, () => {});
    reader.register(2, () => {});
    reader.register(3, () => {});
    reader.readLines(['{"id":"a"}', '{"schemaVersion":2,"id":"b"}', '{"schemaVersion":3,"id":"c"}'], { schemaName: "EVENT_LOG" });
    expect(reader.observed("EVENT_LOG")).toEqual([1, 2, 3]);
  });

  it("reset() clears observed-versions tracker (long-lived daemon discipline)", () => {
    const reader = createReader();
    reader.register(1, () => {});
    reader.readLines(['{"id":"a"}'], { schemaName: "X" });
    expect(reader.observed("X")).toEqual([1]);
    reader.reset();
    expect(reader.observed("X")).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Realistic PRISM-shape fixtures (B-P0-2 — tests must verify intent on
// the actual JSONL shapes hooks consume in production)
// ──────────────────────────────────────────────────────────────────────

describe("realistic PRISM JSONL shapes", () => {
  it("AGENT_CHAT.jsonl shape: {ts, from, scope, unit, event, summary} dispatches as v1 (no schemaVersion field)", () => {
    const seen = [];
    const reader = createReader();
    reader.register(1, (row) => seen.push(row));
    const realRow = '{"ts":"2026-05-13T22:05:30.000Z","from":"claude-cleanup-g3","scope":"CLEANUP-MS0","unit":"U-CLEANUP-G3","event":"ship","summary":"jsonl-orphan-scan.mjs shipped"}';
    const out = reader.readLines([realRow]);
    expect(out.dispatched).toBe(1);
    expect(out.counts).toEqual({ 1: 1 });
    expect(seen[0].scope).toBe("CLEANUP-MS0");
    expect(seen[0].event).toBe("ship");
  });

  it("COORDINATION_LEDGER.jsonl shape: {ts, action, sessionId, resource} dispatches v1 cleanly", () => {
    const seen = [];
    const reader = createReader();
    reader.register(1, (row) => seen.push(row));
    const realRow = '{"ts":"2026-05-13T22:00:00Z","action":"claim","sessionId":"claude-b89c3f50","resource":"H:/prism/scripts/build-system-viz-livediff.mjs"}';
    const out = reader.readLines([realRow]);
    expect(out.dispatched).toBe(1);
    expect(seen[0].action).toBe("claim");
  });

  it("future-shape with explicit schemaVersion:2 dispatches to v2 handler when registered", () => {
    const seen = [];
    const reader = createReader();
    reader.register(1, () => { throw new Error("must not be v1"); });
    reader.register(2, (row) => seen.push(row));
    const v2row = '{"schemaVersion":2,"ts":"2026-05-13T22:05:30.000Z","from":"claude-x","scope":"FOO","unit":"U-1","event":"ship","summary":"x","tokens_spent":1234}';
    const out = reader.readLines([v2row]);
    expect(out.dispatched).toBe(1);
    expect(out.errors).toEqual([]);
    expect(seen[0].tokens_spent).toBe(1234);
  });

  it("real heterogeneous batch (real shape v1 + future v2 + a parse-fail half-line) — partial dispatch + errors surfaced", () => {
    const seen = { v1: 0, v2: 0 };
    const reader = createReader();
    reader.register(1, () => { seen.v1++; });
    reader.register(2, () => { seen.v2++; });
    const lines = [
      '{"ts":"2026-05-13T22:05:30.000Z","from":"claude-a","scope":"X","event":"ship","summary":"r1"}',
      '{"schemaVersion":2,"ts":"2026-05-13T22:05:35.000Z","from":"claude-b","scope":"X","event":"ship","summary":"r2","tokens_spent":50}',
      '{"ts":"2026-05-13T22:05:40.000Z","from":"claude',  // truncated mid-string — partial write from in-progress JSONL append
      '{"ts":"2026-05-13T22:05:45.000Z","from":"claude-c","scope":"X","event":"ship","summary":"r3"}',
    ];
    const out = reader.readLines(lines);
    expect(out.dispatched).toBe(3);
    expect(seen.v1).toBe(2);
    expect(seen.v2).toBe(1);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].line).toBe(3);
    expect(out.errors[0].reason).toMatch(/parse failed/);
  });

  it("async handler: returned Promise rejection lands in asyncErrors[] after awaitAsync()", async () => {
    const reader = createReader();
    reader.register(1, async (row) => {
      if (row.id === "bad") throw new Error("async-boom");
    });
    const out = reader.readLines(['{"id":"good"}', '{"id":"bad"}']);
    // Sync surface: dispatched count includes async ones (they were "dispatched")
    expect(out.dispatched).toBe(2);
    expect(out.errors).toEqual([]);
    // Drain async — failed handler now appears in asyncErrors[]
    const asyncErrors = await out.awaitAsync();
    expect(asyncErrors).toHaveLength(1);
    expect(asyncErrors[0].reason).toMatch(/async-threw: async-boom/);
    expect(asyncErrors[0].version).toBe(1);
  });
});
