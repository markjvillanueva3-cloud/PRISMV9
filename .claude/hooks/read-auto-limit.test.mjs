// read-auto-limit.test.mjs
// -------------------------
// Tests for U-READ-AUTO-LIMIT-LEDGER (slot:alpha 2026-06-20): the read-auto-limit
// PreToolUse hook now re-lights its dark telemetry ledger (one {kind:"nudge-emitted"}
// line per nudge) and exposes pure helpers for hermetic testing. Covers the gating
// thresholds, the byte-identical advisory message, the ledger entry shape, the
// fail-soft/knob-gated write, an AGGREGATOR round-trip (R12 honesty: a nudge never
// inflates realized savedTokens), and a SUBPROCESS round-trip (proves the spawned
// hook actually appends to the ledger -- the re-lit-from-dark proof).
// Run: node H:/prism/.claude/hooks/read-auto-limit.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  estimateLines,
  shouldNudge,
  buildSuggestion,
  buildMessage,
  buildLedgerEntry,
  recordNudge,
  LARGE_FILE_BYTES,
  LARGE_FILE_LINES,
} from "./read-auto-limit.mjs";
import { aggregateSavings } from "../../scripts/lib/psn-savings-aggregate.mjs";

const HOOK_PATH = fileURLToPath(new URL("./read-auto-limit.mjs", import.meta.url));

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), "read-auto-limit-"));
  return { dir, file: join(dir, "f"), ledger: join(dir, "ledger.jsonl") };
}

describe("estimateLines", () => {
  test("byte size -> ~50 bytes/line", () => {
    assert.equal(estimateLines(50000), 1000);
    assert.equal(estimateLines(60000), 1200);
    assert.equal(estimateLines(0), 0);
    assert.equal(estimateLines("not-a-number"), 0); // defensive
  });
});

describe("shouldNudge -- gating thresholds", () => {
  test("large file + no limit -> nudge", () => {
    assert.equal(shouldNudge({ fileSize: 60000, lineEstimate: 1200, limit: undefined }), true);
  });
  test("FAILURE: limit already set -> no nudge (even for a huge file)", () => {
    assert.equal(shouldNudge({ fileSize: 999999, lineEstimate: 20000, limit: 200 }), false);
  });
  test("FAILURE: small file -> no nudge", () => {
    assert.equal(shouldNudge({ fileSize: 1000, lineEstimate: 20, limit: undefined }), false);
  });
  test("ADVERSARIAL boundary: exactly at threshold does NOT nudge; one over does", () => {
    // rule is strictly greater-than on BOTH axes
    assert.equal(shouldNudge({ fileSize: LARGE_FILE_BYTES, lineEstimate: LARGE_FILE_LINES, limit: undefined }), false);
    assert.equal(shouldNudge({ fileSize: LARGE_FILE_BYTES + 1, lineEstimate: LARGE_FILE_LINES + 1, limit: undefined }), true);
  });
  test("nudges on a byte-heavy file even if estimated lines are under (long lines)", () => {
    // 60KB but pretend only 100 lines (very long lines): bytes axis still trips
    assert.equal(shouldNudge({ fileSize: 60000, lineEstimate: 100, limit: undefined }), true);
  });
});

describe("buildSuggestion -- per-type, order-sensitive", () => {
  test(".json wins over a 'test' substring (original order preserved)", () => {
    assert.match(buildSuggestion("test-data.json"), /JSON: read first 100 lines/);
  });
  test(".jsonl / .log -> logs offset advice", () => {
    assert.match(buildSuggestion("events.jsonl"), /logs: use offset/);
    assert.match(buildSuggestion("server.log"), /logs: use offset/);
  });
  test("a test source -> specific-test advice", () => {
    assert.match(buildSuggestion("src/foo.test.ts"), /tests: read specific test/);
  });
  test("plain code -> generic limit advice", () => {
    assert.match(buildSuggestion("src/Engine.ts"), /limit: 200 for overview/);
  });
});

describe("buildMessage -- byte-identical to the pre-refactor output", () => {
  test("exact string for a known fixture (regression-locks the refactor)", () => {
    const msg = buildMessage({ filePath: "src/big.ts", fileSize: 60000, lineEstimate: 1200 });
    const expected = [
      "\u{1F4C4} Large file detected: 58.6KB (~1200 lines)",
      "  File: src/big.ts",
      "  Consider: limit: 200 for overview, or offset + limit for specific section",
      "  Token impact: Reading full file uses ~15000 tokens.",
      "  Tip: Add limit parameter to read only what you need.",
    ].join("\n");
    assert.equal(msg, expected);
  });
});

describe("buildLedgerEntry -- nudge record shape", () => {
  test("records kind=nudge-emitted + informational est_tokens", () => {
    const e = buildLedgerEntry({ filePath: "src/big.ts", fileSize: 60000, now: 1000 });
    assert.deepEqual(e, {
      ts: 1000,
      kind: "nudge-emitted",
      file: "src/big.ts",
      file_kb: 58.6,
      est_tokens: 15000, // ceil(60000/4)
    });
  });
});

describe("recordNudge -- fail-soft + knob-gated", () => {
  test("writes one JSONL line to the ledger path", () => {
    const { dir, ledger } = tmp();
    try {
      const e = buildLedgerEntry({ filePath: "x.ts", fileSize: 60000, now: 1 });
      const ok = recordNudge(e, { env: { PRISM_READ_AUTO_LIMIT_LEDGER_PATH: ledger } });
      assert.equal(ok, true);
      const lines = readFileSync(ledger, "utf8").trim().split("\n");
      assert.equal(lines.length, 1);
      assert.deepEqual(JSON.parse(lines[0]), e);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  test("disable knob -> no write, returns false", () => {
    const { dir, ledger } = tmp();
    try {
      const ok = recordNudge(buildLedgerEntry({ filePath: "x", fileSize: 60000, now: 1 }), {
        env: { PRISM_READ_AUTO_LIMIT_LEDGER_DISABLE: "1", PRISM_READ_AUTO_LIMIT_LEDGER_PATH: ledger },
      });
      assert.equal(ok, false);
      assert.equal(existsSync(ledger), false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  test("ADVERSARIAL: an unwritable ledger path fails soft (no throw, returns false)", () => {
    // a path whose parent cannot be created (a file used as a directory) -> mkdir/append throw -> caught
    const { dir, file } = tmp();
    try {
      writeFileSync(file, "i am a file, not a dir", "utf8");
      const badLedger = join(file, "nested", "ledger.jsonl"); // file/... is not a valid dir
      const ok = recordNudge(buildLedgerEntry({ filePath: "x", fileSize: 60000, now: 1 }), {
        env: { PRISM_READ_AUTO_LIMIT_LEDGER_PATH: badLedger },
      });
      assert.equal(ok, false); // fail-soft, never throws
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("AGGREGATOR round-trip -- R12 honesty", () => {
  test("a nudge-emitted line counts as a HIT with ZERO savedTokens (never inflates realized savings)", () => {
    const e = buildLedgerEntry({ filePath: "x.ts", fileSize: 4_000_000, now: 1 }); // 1M est_tokens
    const { totals } = aggregateSavings({ "read-auto-limit": JSON.stringify(e) + "\n" });
    assert.equal(totals.hits, 1, "nudge-emitted -> 1 hit");
    assert.equal(totals.savedTokens, 0, "advisory nudge must add 0 realized savedTokens despite 1M est_tokens");
  });
});

describe("SUBPROCESS round-trip -- the re-lit-from-dark proof", () => {
  test("spawning the hook on a >50KB Read appends a nudge-emitted line to the ledger", () => {
    const { dir, file, ledger } = tmp();
    try {
      writeFileSync(file, "x".repeat(60000), "utf8"); // 60KB -> trips the nudge
      const payload = JSON.stringify({ tool_name: "Read", tool_input: { file_path: file } });
      const r = spawnSync(process.execPath, [HOOK_PATH], {
        input: payload,
        encoding: "utf8",
        env: { ...process.env, PRISM_READ_AUTO_LIMIT_LEDGER_PATH: ledger },
      });
      assert.equal(r.status, 0, "hook exits 0");
      const out = JSON.parse(r.stdout.trim().split("\n").pop());
      assert.ok(out.hookSpecificOutput?.additionalContext?.includes("Large file detected"), "emits the advisory");
      // the ledger (previously dark) now has the nudge line
      const lines = readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean);
      assert.equal(lines.length, 1, "exactly one nudge logged");
      const entry = JSON.parse(lines[0]);
      assert.equal(entry.kind, "nudge-emitted");
      assert.equal(entry.file, file);
      assert.equal(entry.est_tokens, 15000);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("a Read with limit already set does NOT nudge and writes NOTHING", () => {
    const { dir, file, ledger } = tmp();
    try {
      writeFileSync(file, "x".repeat(60000), "utf8");
      const payload = JSON.stringify({ tool_name: "Read", tool_input: { file_path: file, limit: 200 } });
      const r = spawnSync(process.execPath, [HOOK_PATH], {
        input: payload,
        encoding: "utf8",
        env: { ...process.env, PRISM_READ_AUTO_LIMIT_LEDGER_PATH: ledger },
      });
      assert.equal(r.status, 0);
      assert.equal(existsSync(ledger), false, "no nudge -> no ledger write (hits-only)");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
