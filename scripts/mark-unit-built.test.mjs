// Tests for mark-unit-built.mjs -- the build-loop closure CLI (node:test).
// Pure helpers (normalizeId/buildRecord/parseArgs) + an IO roundtrip via env-overridden ledger.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { normalizeId, buildRecord, parseArgs } from "./mark-unit-built.mjs";
import { builtIdsFromLedger } from "./lib/hermes-build-ready-queue.mjs";

const NODE = fs.existsSync("H:/Tools/nodejs/node.exe") ? "H:/Tools/nodejs/node.exe" : process.execPath;

// ── normalizeId ─────────────────────────────────────────────────────────────
test("normalizeId: pads a bare number to 4 digits; passes a canonical id through", () => {
  assert.equal(normalizeId("28"), "0028");
  assert.equal(normalizeId("0028"), "0028");
  assert.equal(normalizeId(28), "0028");
  assert.equal(normalizeId("  31 "), "0031", "trims surrounding whitespace");
});
test("normalizeId: rejects non-numeric / 5-digit / empty -> null", () => {
  assert.equal(normalizeId("12345"), null, "5-digit rejected (unit ids are 4)");
  assert.equal(normalizeId("UNIT-0028"), null);
  assert.equal(normalizeId(""), null);
  assert.equal(normalizeId(null), null);
  assert.equal(normalizeId("abc"), null);
});

// ── buildRecord ─────────────────────────────────────────────────────────────
test("buildRecord: full record includes sha + note; ts + source are always present", () => {
  const r = buildRecord({ id: "0028", by: "echo", sha: "abc1234", note: "done", nowIso: "2026-07-04T00:00:00Z" });
  assert.deepEqual(r, { id: "0028", by: "echo", source: "mark-unit-built", ts: "2026-07-04T00:00:00Z", sha: "abc1234", note: "done" });
});
test("buildRecord: omits empty sha/note; defaults by to 'unknown'", () => {
  const r = buildRecord({ id: "0030", nowIso: "t" });
  assert.equal(r.by, "unknown");
  assert.equal(r.source, "mark-unit-built");
  assert.ok(!("sha" in r), "empty sha omitted");
  assert.ok(!("note" in r), "empty note omitted");
});

// ── parseArgs ───────────────────────────────────────────────────────────────
test("parseArgs: positional id + flags", () => {
  assert.deepEqual(parseArgs(["0028", "--by", "echo", "--sha", "abc", "--note", "x y"]),
    { id: "0028", by: "echo", sha: "abc", note: "x y", list: false });
  assert.equal(parseArgs(["--list"]).list, true);
  assert.equal(parseArgs(["0028"]).id, "0028");
  assert.equal(parseArgs([]).id, null, "no positional -> null id");
});

// ── IO roundtrip (env-overridden ledger, real CLI subprocess) ───────────────
test("main(): appends a real ledger line that builtIdsFromLedger reads back; --list echoes it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mub-"));
  try {
    const ledger = path.join(dir, "built-ledger.jsonl");
    const env = { ...process.env, PRISM_BUILT_LEDGER_PATH: ledger };
    const run = (extra) => execFileSync(NODE, ["scripts/mark-unit-built.mjs", ...extra], {
      cwd: path.resolve("."), env, encoding: "utf8",
    });
    const out1 = JSON.parse(run(["28", "--by", "echo", "--sha", "deadbee", "--note", "hardened"]));
    assert.equal(out1.ok, true);
    assert.equal(out1.marked, "0028", "bare 28 normalized to 0028");
    // the ledger now drains 0028
    const text = fs.readFileSync(ledger, "utf8");
    assert.deepEqual([...builtIdsFromLedger(text)], ["0028"]);
    // second mark of the same id appends but the reader still dedups
    run(["0028", "--by", "foxtrot"]);
    assert.deepEqual([...builtIdsFromLedger(fs.readFileSync(ledger, "utf8"))], ["0028"], "dedup on read");
    assert.equal(fs.readFileSync(ledger, "utf8").trim().split("\n").length, 2, "both appends persisted (append-only)");
    // --list reports it
    const listed = JSON.parse(run(["--list"]));
    assert.deepEqual(listed.builtIds, ["0028"]);
    assert.equal(listed.builtCount, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("main(): an invalid id exits non-zero and writes NOTHING to the ledger", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mub-"));
  try {
    const ledger = path.join(dir, "built-ledger.jsonl");
    const env = { ...process.env, PRISM_BUILT_LEDGER_PATH: ledger };
    let threw = false;
    try {
      execFileSync(NODE, ["scripts/mark-unit-built.mjs", "not-an-id"], { cwd: path.resolve("."), env, encoding: "utf8" });
    } catch (e) { threw = true; assert.equal(e.status, 1, "exit 1 on invalid id"); }
    assert.ok(threw, "invalid id must exit non-zero");
    assert.ok(!fs.existsSync(ledger), "no ledger written for an invalid id");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
