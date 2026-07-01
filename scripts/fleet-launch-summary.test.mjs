/**
 * fleet-launch-summary.test.mjs -- FLEET-LAUNCHER-IMPROVE-MS0/U-FLI03 (slot:tango, 2026-06-10)
 *
 * CLI-spawn tests (the script runs main() unconditionally, so we exercise the real
 * surface rather than importing). Covers: --mark, bucket tally, since-marker filter,
 * missing-marker fallback, malformed-line tolerance, and log bounding.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "fleet-launch-summary.mjs");
const NODE = process.execPath;

function tmp(name) {
  return path.join(os.tmpdir(), `fls-${process.pid}-${name}`);
}
function run(extraArgs) {
  return execFileSync(NODE, [SCRIPT, ...extraArgs], { encoding: "utf-8" });
}

test("--mark writes a numeric epoch marker", () => {
  const marker = tmp("mark");
  try {
    run(["--mark", "--marker", marker]);
    const v = Number(fs.readFileSync(marker, "utf-8").trim());
    assert.ok(Number.isFinite(v) && v > 1e12, `marker should be epoch ms, got ${v}`);
  } finally { fs.rmSync(marker, { force: true }); }
});

test("tally buckets correctly + filters entries before the marker", () => {
  const log = tmp("log.jsonl");
  const marker = tmp("mark");
  try {
    const now = Date.now();
    fs.writeFileSync(marker, String(now), "utf-8");
    const lines = [
      { ts: now - 999999, slot: "stale", action: "resume-tier1" },     // before marker -> excluded
      { ts: now + 10, slot: "alpha", action: "resume-tier1" },
      { ts: now + 20, slot: "sierra", action: "resume-tier2" },
      { ts: now + 30, slot: "foxtrot", action: "fresh-checkin" },
      { ts: now + 40, slot: "india", action: "oversized-fresh" },
      { ts: now + 50, slot: "tango", action: "skip-live" },
      "garbage-not-json",
    ].map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n") + "\n";
    fs.writeFileSync(log, lines, "utf-8");
    const out = run(["--log", log, "--marker", marker, "--expected", "24"]);
    assert.match(out, /resumed today's session\s*: 2\s+alpha sierra/);
    assert.match(out, /fresh \/checkin\s*: 1\s+foxtrot/);
    assert.match(out, /oversized -> fresh\s*: 1\s+india/);
    assert.match(out, /skipped \(already live\)\s*: 1\s+tango/);
    assert.doesNotMatch(out, /stale/, "entry before marker must be excluded");
    assert.match(out, /5 slots reported \(5 of 24\)/);
  } finally { fs.rmSync(log, { force: true }); fs.rmSync(marker, { force: true }); }
});

test("missing marker -> fallback window, still summarizes recent entries", () => {
  const log = tmp("log2.jsonl");
  const marker = tmp("nomark"); // does not exist
  try {
    fs.writeFileSync(log, JSON.stringify({ ts: Date.now(), slot: "kilo", action: "fresh-checkin" }) + "\n", "utf-8");
    const out = run(["--log", log, "--marker", marker]);
    assert.match(out, /fresh \/checkin\s*: 1\s+kilo/);
  } finally { fs.rmSync(log, { force: true }); }
});

test("log is bounded to <=500 lines after a summary run", () => {
  const log = tmp("big.jsonl");
  const marker = tmp("markbig");
  try {
    fs.writeFileSync(marker, String(Date.now()), "utf-8");
    const big = Array.from({ length: 800 }, (_, i) => JSON.stringify({ ts: Date.now() + i, slot: `s${i}`, action: "fresh-checkin" })).join("\n") + "\n";
    fs.writeFileSync(log, big, "utf-8");
    run(["--log", log, "--marker", marker]);
    const remaining = fs.readFileSync(log, "utf-8").split(/\r?\n/).filter((l) => l.trim()).length;
    assert.ok(remaining <= 500, `expected <=500 lines after bound, got ${remaining}`);
  } finally { fs.rmSync(log, { force: true }); fs.rmSync(marker, { force: true }); }
});

test("empty/absent log -> graceful note, no throw", () => {
  const out = run(["--log", tmp("absent.jsonl"), "--marker", tmp("absentmark")]);
  assert.match(out, /FLEET LAUNCH SUMMARY/);
  assert.match(out, /No (launch marker|tab decisions)/);
});
