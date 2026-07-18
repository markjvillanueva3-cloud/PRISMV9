#!/usr/bin/env node
/**
 * cam-tool-library-cron.test.mjs -- tests for the regen->validate->place cron orchestrator.
 * Run: node scripts/cam-tool-library-cron.test.mjs   (node:test auto-runs on exit)
 * Uses place:false so no native binding / external seat write is needed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { runCron, formatCronReport, sqliteAvailable } from "./cam-tool-library-cron.mjs";

const CRON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cam-tool-library-cron.mjs");
const CRON_URL = pathToFileURL(CRON).href; // valid ESM specifier on Windows (raw H:/ path is not)

test("runCron: validate-only cycle returns a complete, valid record", async () => {
  const rec = await runCron({ place: false, nowIso: "2026-06-19T12:00:00.000Z" });
  assert.equal(rec.startedAt, "2026-06-19T12:00:00.000Z");
  assert.equal(rec.valid, true);          // live libraries on disk all validate
  assert.equal(rec.ok, true);             // valid + no-place => ok
  assert.equal(rec.placed, null);         // no placement attempted
});

test("runCron: perFormat carries real per-format counts for all 3 CAM systems", async () => {
  const rec = await runCron({ place: false });
  for (const fmt of ["fusion", "hypermill", "mastercam"]) {
    assert.ok(rec.perFormat[fmt], `${fmt} present`);
    assert.ok(rec.perFormat[fmt].tools > 0, `${fmt} has tools`);
    assert.equal(rec.perFormat[fmt].failures, 0, `${fmt} no failures`);
    assert.equal(rec.perFormat[fmt].files, rec.perFormat[fmt].validFiles, `${fmt} all files valid`);
  }
});

test("runCron: record is JSON-serializable (cron appends it to JSONL)", async () => {
  const rec = await runCron({ place: false, nowIso: "2026-06-19T12:00:00.000Z" });
  const round = JSON.parse(JSON.stringify(rec));
  assert.equal(round.startedAt, rec.startedAt);
  assert.equal(round.valid, rec.valid);
});

// R12 -- a FAILED run MUST surface every seat's reason, never a silent "FAILED" with all lanes OK
// (the real defect: without --experimental-sqlite the .hmt build fails but the reason was swallowed).
test("formatCronReport: FAILED run lists each seat's error reason", () => {
  const rec = {
    startedAt: "2026-06-19T00:00:00.000Z", ok: false,
    perFormat: { hypermill: { files: 20, validFiles: 20, tools: 45894, failures: 0 } },
    placed: { hypermill: { placed: 20, toolsBuilt: 0, errors: 2, errorMessages: ["PRISM_X.hmt: node:sqlite unavailable (re-run with --experimental-sqlite)", "PRISM_Y.hmt: node:sqlite unavailable (re-run with --experimental-sqlite)"] } },
  };
  const out = formatCronReport(rec).join("\n");
  assert.match(out, /FAILED/);
  assert.match(out, /2 ERR/);                                   // error count surfaced on the lane line
  assert.match(out, /FAIL hypermill: PRISM_X\.hmt: node:sqlite unavailable/); // exact reason surfaced
  assert.match(out, /PRISM_Y\.hmt/);                            // every (capped) message, not just the first
});

// R12 (arm-B P1) -- errorMessages is capped at 3; the 4th+ seat error must NOT vanish silently.
test("formatCronReport: caps shown messages at 3 but surfaces the remaining count (no silent drop)", () => {
  const rec = {
    startedAt: "2026-06-19T00:00:00.000Z", ok: false,
    perFormat: { hypermill: { files: 20, validFiles: 20, tools: 45894, failures: 0 } },
    placed: { hypermill: { placed: 20, toolsBuilt: 0, errors: 5, errorMessages: ["a.hmt: x", "b.hmt: x", "c.hmt: x"] } },
  };
  const out = formatCronReport(rec).join("\n");
  assert.match(out, /FAIL hypermill: a\.hmt/);
  assert.match(out, /FAIL hypermill: c\.hmt/);          // all 3 shown messages present
  assert.match(out, /FAIL hypermill: \.\.\. \(\+2 more\)/); // the 4th+5th surfaced as "+2 more", not dropped
});

// R12 (arm-B P2) -- an index-build failure must reach the console even when placement (the ok-determinant) succeeded.
test("formatCronReport: surfaces an index-build error even on an OK run", () => {
  const rec = {
    startedAt: "2026-06-19T00:00:00.000Z", ok: true,
    perFormat: { fusion: { files: 19, validFiles: 19, tools: 43200, failures: 0 } },
    placed: { fusion: { placed: 19, toolsBuilt: 0, errors: 0, errorMessages: [] } },
    indexError: "ENOSPC: no space left on device",
  };
  const out = formatCronReport(rec).join("\n");
  assert.match(out, /: OK/);
  assert.match(out, /index ERROR: ENOSPC/);             // surfaced despite ok=true
});

test("formatCronReport: a clean OK run prints no FAIL lines", () => {
  const rec = {
    startedAt: "2026-06-19T00:00:00.000Z", ok: true,
    perFormat: { fusion: { files: 19, validFiles: 19, tools: 43200, failures: 0 } },
    placed: { fusion: { placed: 19, toolsBuilt: 0, errors: 0, errorMessages: [] } },
  };
  const out = formatCronReport(rec).join("\n");
  assert.match(out, /: OK/);
  assert.doesNotMatch(out, /FAIL/);
  assert.doesNotMatch(out, /ERR/);
});

// The self-reexec hinges on this probe correctly detecting the --experimental-sqlite capability.
// Prove it distinguishes the two runtimes via a real subprocess (in-process is whatever ran the suite).
test("sqliteAvailable: false without the flag, true with it (reexec linchpin)", () => {
  const probe = "import('" + CRON_URL + "').then(m=>m.sqliteAvailable()).then(b=>process.exit(b?0:1))";
  const without = spawnSync(process.execPath, ["-e", probe], { encoding: "utf8" });
  const withFlag = spawnSync(process.execPath, ["--experimental-sqlite", "-e", probe], { encoding: "utf8" });
  assert.equal(without.status, 1, "no flag -> sqliteAvailable() false");
  assert.equal(withFlag.status, 0, "--experimental-sqlite -> sqliteAvailable() true");
});

test("sqliteAvailable: returns a boolean in-process", async () => {
  assert.equal(typeof (await sqliteAvailable()), "boolean");
});
