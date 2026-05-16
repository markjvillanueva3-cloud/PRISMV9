// SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY tests.
// Uses node:test (vitest harness broken — see [[reference_fleet_reaper_ms1]]).
// Run: node --test H:/prism/scripts/verify-unit-ready.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import {
  parseDep,
  lookupUnitStatus,
  verifyUnitReady,
  isSafeId,
  parseArgs,
  safeLoadEnvelope,
} from "./verify-unit-ready.mjs";

const SCRIPT_PATH = "H:/prism/scripts/verify-unit-ready.mjs";

// ── parseDep ────────────────────────────────────────────────────────────────

test("parseDep — in-milestone notation inherits host milestone", () => {
  const r = parseDep("U-FOO", "MS-HOST");
  assert.equal(r.milestone, "MS-HOST");
  assert.equal(r.unit_id, "U-FOO");
  assert.equal(r.malformed, undefined);
});

test("parseDep — cross-milestone notation splits cleanly with both sides trimmed", () => {
  const r = parseDep("  MS-OTHER  :  U-BAR  ", "MS-HOST");
  assert.equal(r.milestone, "MS-OTHER");
  assert.equal(r.unit_id, "U-BAR");
});

test("parseDep — malformed inputs all caught", () => {
  for (const bad of ["", ":", "MS-X:", ":U-X", 42, null]) {
    const r = parseDep(bad, "MS-HOST");
    assert.equal(r.malformed, true, `bad=${String(bad)}`);
  }
});

test("parseDep — rejects path-traversal attempts on milestone OR unit_id", () => {
  // No path traversal possible — ID_REGEX rejects all path chars.
  for (const evil of [
    "../../../etc/passwd",
    "../foo:U-X",
    "MS-X:../../shadow",
    "MS-X:..\\..\\windows",
    "MS-X:U with space",
    "ms-lowercase:U-X",
  ]) {
    const r = parseDep(evil, "MS-HOST");
    assert.equal(r.malformed, true, `evil=${evil}`);
  }
});

test("parseDep — rejects prototype-pollution dep strings", () => {
  for (const evil of ["__proto__:U-X", "MS-X:__proto__", "constructor:U-X"]) {
    const r = parseDep(evil, "MS-HOST");
    assert.equal(r.malformed, true, `evil=${evil}`);  // ID_REGEX rejects __proto__ (underscores at start)
  }
});

// ── isSafeId ────────────────────────────────────────────────────────────────

test("isSafeId — accepts canonical milestone + unit ids", () => {
  for (const ok of ["MS-FOO", "U-P0-AUDIT-VIZ-FIRST", "SYSTEM-VIZ-BRAIN-MS0", "A1", "U_X"]) {
    assert.equal(isSafeId(ok), true, `ok=${ok}`);
  }
});

test("isSafeId — rejects every traversal/non-conforming form", () => {
  for (const bad of ["", "..", "../x", "/etc/passwd", "x.y", "lowercase", "-leading-dash", "_leading-underscore", "with space", "x".repeat(65), null, undefined, 42, {}]) {
    assert.equal(isSafeId(bad), false, `bad=${String(bad)}`);
  }
});

// ── lookupUnitStatus ────────────────────────────────────────────────────────

test("lookupUnitStatus — envelope missing returns envelope_missing", () => {
  const r = lookupUnitStatus({}, "MS-NONE", "U-X");
  assert.equal(r.found, false);
  assert.equal(r.reason, "envelope_missing");
});

test("lookupUnitStatus — unit missing from envelope returns unit_missing_from_envelope", () => {
  const env = { units: { "U-EXISTS": { status: "complete" } } };
  const r = lookupUnitStatus({ "MS-A": env }, "MS-A", "U-DOES-NOT-EXIST");
  assert.equal(r.found, false);
  assert.equal(r.reason, "unit_missing_from_envelope");
});

test("lookupUnitStatus — happy path returns found=true with status", () => {
  const env = { units: { "U-FOO": { status: "complete" } } };
  const r = lookupUnitStatus({ "MS-A": env }, "MS-A", "U-FOO");
  assert.equal(r.found, true);
  assert.equal(r.status, "complete");
});

test("lookupUnitStatus — defends against prototype-pollution lookups", () => {
  // `units["__proto__"]` would normally return Object.prototype which is truthy;
  // hasOwnProperty guard prevents that. ID_REGEX would also reject this upstream,
  // but defense-in-depth means lookupUnitStatus is safe even with a hostile input.
  const env = { units: { "U-FOO": { status: "complete" } } };
  const r = lookupUnitStatus({ "MS-A": env }, "MS-A", "__proto__");
  assert.equal(r.found, false);
  assert.equal(r.reason, "unit_missing_from_envelope");
});

test("lookupUnitStatus — array as envelope or units rejected (not silently truthy)", () => {
  const r1 = lookupUnitStatus({ "MS-A": [] }, "MS-A", "U-X");
  assert.equal(r1.found, false);
  assert.equal(r1.reason, "envelope_missing");
  const r2 = lookupUnitStatus({ "MS-A": { units: [] } }, "MS-A", "U-X");
  assert.equal(r2.found, false);
  assert.equal(r2.reason, "unit_missing_from_envelope");
});

// ── verifyUnitReady — deps absent/empty ─────────────────────────────────────

test("verifyUnitReady — no depends_on field → ready, reason=deps_not_declared", () => {
  const env = { units: { "U-CHECK": { status: "pending" } } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, true);
  assert.equal(r.reason, "deps_not_declared");
  assert.equal(r.hostFound, true);
  assert.deepEqual(r.missingDeps, []);
  assert.equal(r.chain.length, 1);
});

test("verifyUnitReady — empty depends_on array → ready, reason=deps_empty (distinguishable from not_declared)", () => {
  const env = { units: { "U-CHECK": { status: "pending", depends_on: [] } } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, true);
  assert.equal(r.reason, "deps_empty");
});

// ── verifyUnitReady — single deps ──────────────────────────────────────────

test("verifyUnitReady — single complete in-milestone dep → ready, chain has [host, dep]", () => {
  const env = { units: {
    "U-CHECK": { status: "pending", depends_on: ["U-PREREQ"] },
    "U-PREREQ": { status: "complete" },
  } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, true);
  assert.equal(r.reason, "all_deps_complete");
  assert.equal(r.chain.length, 2);
  assert.equal(r.chain[1].unit_id, "U-PREREQ");
});

test("verifyUnitReady — single pending dep → BLOCKED with status_not_complete + actual status carried", () => {
  const env = { units: {
    "U-CHECK": { status: "pending", depends_on: ["U-PREREQ"] },
    "U-PREREQ": { status: "in_progress" },
  } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false);
  assert.equal(r.reason, "missing_deps");
  assert.equal(r.missingDeps.length, 1);
  assert.equal(r.missingDeps[0].reason, "status_not_complete");
  assert.equal(r.missingDeps[0].status, "in_progress");
  assert.equal(r.missingDeps[0].unit_id, "U-PREREQ");
});

// ── verifyUnitReady — cross-milestone deps ─────────────────────────────────

test("verifyUnitReady — cross-milestone dep complete → ready", () => {
  const envA = { units: { "U-CHECK": { status: "pending", depends_on: ["MS-B:U-FOREIGN"] } } };
  const envB = { units: { "U-FOREIGN": { status: "complete" } } };
  const r = verifyUnitReady({ envelopes: { "MS-A": envA, "MS-B": envB }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, true);
  assert.equal(r.chain[1].milestone, "MS-B");
});

test("verifyUnitReady — cross-milestone with missing envelope → BLOCKED envelope_missing", () => {
  const envA = { units: { "U-CHECK": { status: "pending", depends_on: ["MS-MISSING:U-X"] } } };
  const r = verifyUnitReady({ envelopes: { "MS-A": envA }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false);
  assert.equal(r.missingDeps[0].reason, "envelope_missing");
  assert.equal(r.missingDeps[0].milestone, "MS-MISSING");
});

// ── verifyUnitReady — mixed + malformed + edge cases ────────────────────────

test("verifyUnitReady — mixed deps (1 complete + 1 pending) → BLOCKED listing ONLY the pending dep", () => {
  const env = { units: {
    "U-CHECK": { status: "pending", depends_on: ["U-DONE", "U-WIP"] },
    "U-DONE":  { status: "complete" },
    "U-WIP":   { status: "in_progress" },
  } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false);
  assert.equal(r.missingDeps.length, 1, "ONLY the pending dep should be flagged");
  assert.equal(r.missingDeps[0].unit_id, "U-WIP");
  // Explicit: complete dep is NOT in missingDeps
  assert.equal(r.missingDeps.find(m => m.unit_id === "U-DONE"), undefined);
});

test("verifyUnitReady — self-reference dep (U-CHECK depends_on=[U-CHECK]) — passes if self is complete, blocks if not", () => {
  // Self-reference is semantically weird but not a syntactic cycle in the
  // non-transitive walker. Verify it behaves as a direct dep lookup of itself.
  const envPending = { units: { "U-CHECK": { status: "pending", depends_on: ["U-CHECK"] } } };
  const r1 = verifyUnitReady({ envelopes: { "MS-A": envPending }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r1.ready, false);
  assert.equal(r1.missingDeps[0].reason, "status_not_complete");

  const envComplete = { units: { "U-CHECK": { status: "complete", depends_on: ["U-CHECK"] } } };
  const r2 = verifyUnitReady({ envelopes: { "MS-A": envComplete }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r2.ready, true);
});

test("verifyUnitReady — duplicate deps in depends_on emit duplicate missingDeps entries (no de-dup)", () => {
  // De-dup is the picker's concern, not this helper's. Verify the array is
  // returned faithfully so callers can choose to de-dup.
  const env = { units: {
    "U-CHECK": { status: "pending", depends_on: ["U-WIP", "U-WIP"] },
    "U-WIP":   { status: "in_progress" },
  } };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false);
  assert.equal(r.missingDeps.length, 2);
});

test("verifyUnitReady — depends_on exceeds CYCLE_LIMIT (65 entries) — truncates + flags deps_exceeded_cycle_limit", () => {
  const huge = Array.from({ length: 65 }, (_, i) => `U-D${i}`);
  const units = { "U-CHECK": { status: "pending", depends_on: huge } };
  for (const d of huge) units[d] = { status: "complete" };
  const env = { units };
  const r = verifyUnitReady({ envelopes: { "MS-A": env }, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false, "should NOT silently pass when deps truncated");
  // Despite all 65 being complete, the truncation itself surfaces as a missingDep
  const truncated = r.missingDeps.find(m => m.reason === "deps_exceeded_cycle_limit");
  assert.ok(truncated, "deps_exceeded_cycle_limit should be in missingDeps");
});

test("verifyUnitReady — malformed envelopes input → ready=false reason=envelopes_not_provided", () => {
  for (const bad of [null, undefined, "not-an-object", 42, []]) {
    const r = verifyUnitReady({ envelopes: bad, unitRef: { milestone: "MS-A", unit_id: "U-X" } });
    assert.equal(r.ready, false, `bad envelopes=${String(bad)}`);
    assert.equal(r.reason, "envelopes_not_provided");
  }
});

test("verifyUnitReady — host envelope missing → BLOCKED + hostFound=false + chain has the unitRef", () => {
  const r = verifyUnitReady({ envelopes: {}, unitRef: { milestone: "MS-A", unit_id: "U-CHECK" } });
  assert.equal(r.ready, false);
  assert.equal(r.hostFound, false);
  assert.equal(r.reason, "envelope_missing");
  assert.equal(r.chain.length, 1);
});

// ── Integration with real SYSTEM-VIZ-BRAIN-MS0 envelope ─────────────────────

test("verifyUnitReady — real SYSTEM-VIZ-BRAIN-MS0 envelope: locks today's actual behavior (U-P3 has no depends_on field)", () => {
  // Read envelope and check what depends_on ACTUALLY is for U-P3-VERIFY-UNIT-READY,
  // then assert the matching reason — fail-loud if the envelope changes meaning.
  const env = JSON.parse(fs.readFileSync("H:/prism/mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json", "utf8"));
  const u = env.units["U-P3-VERIFY-UNIT-READY"];
  assert.ok(u, "U-P3-VERIFY-UNIT-READY must exist in envelope");
  const r = verifyUnitReady({
    envelopes: { "SYSTEM-VIZ-BRAIN-MS0": env },
    unitRef: { milestone: "SYSTEM-VIZ-BRAIN-MS0", unit_id: "U-P3-VERIFY-UNIT-READY" },
  });
  assert.equal(r.ready, true);
  // Lock today's reason: the envelope has no depends_on field, so it MUST be deps_not_declared.
  // If the envelope later gets `depends_on: []`, the reason becomes deps_empty and this assert
  // forces an explicit update of the test (intentional fail-loud per Karpathy R12).
  const expected = Array.isArray(u.depends_on)
    ? (u.depends_on.length === 0 ? "deps_empty" : "all_deps_complete")
    : "deps_not_declared";
  assert.equal(r.reason, expected,
    `envelope shape changed: depends_on=${JSON.stringify(u.depends_on)} → expected reason=${expected} but got ${r.reason}`);
});

// ── parseArgs — CLI argument parsing ────────────────────────────────────────

test("parseArgs — happy path parses --milestone + --unit + --envelope-dir + --json", () => {
  const { args, errors } = parseArgs(["--milestone", "MS-A", "--unit", "U-X", "--envelope-dir", "/tmp", "--json"]);
  assert.equal(args.milestone, "MS-A");
  assert.equal(args.unit, "U-X");
  assert.equal(args.envelopeDir, "/tmp");
  assert.equal(args.json, true);
  assert.deepEqual(errors, []);
});

test("parseArgs — unknown flag captured in errors (not silently consumed)", () => {
  const { args, errors } = parseArgs(["--milestone", "MS-A", "--unit-id", "U-X"]);  // typo: --unit-id
  assert.equal(args.milestone, "MS-A");
  assert.equal(args.unit, null);
  assert.ok(errors.includes("--unit-id"), "unknown flag should be in errors");
});

test("parseArgs — missing value for --milestone or --unit leaves them null (CLI rejects later)", () => {
  const { args } = parseArgs(["--milestone"]);
  assert.equal(args.milestone, null);
});

// ── safeLoadEnvelope — path-traversal defense ───────────────────────────────

test("safeLoadEnvelope — rejects unsafe milestone id (path traversal attempt)", () => {
  const r = safeLoadEnvelope("/tmp", "../../etc/passwd");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_milestone_id");
});

test("safeLoadEnvelope — rejects lowercase / dotted milestone id", () => {
  for (const evil of ["../foo", "foo.bar", "lowercase", "with space", ""]) {
    const r = safeLoadEnvelope("/tmp", evil);
    assert.equal(r.ok, false, `evil=${evil}`);
    assert.equal(r.reason, "unsafe_milestone_id", `evil=${evil}`);
  }
});

test("safeLoadEnvelope — safe id but file missing returns read_failed (not crash)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vur-test-"));
  const r = safeLoadEnvelope(tmpDir, "MS-NONEXISTENT");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "read_failed");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("safeLoadEnvelope — invalid JSON returns parse_failed (not crash)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vur-test-"));
  fs.writeFileSync(path.join(tmpDir, "MS-BAD.json"), "{not json");
  const r = safeLoadEnvelope(tmpDir, "MS-BAD");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "parse_failed");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("safeLoadEnvelope — happy path reads + parses JSON", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vur-test-"));
  fs.writeFileSync(path.join(tmpDir, "MS-OK.json"), JSON.stringify({ units: { "U-FOO": { status: "complete" } } }));
  const r = safeLoadEnvelope(tmpDir, "MS-OK");
  assert.equal(r.ok, true);
  assert.equal(r.envelope.units["U-FOO"].status, "complete");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── CLI end-to-end via spawnSync ────────────────────────────────────────────

// process.execPath = absolute path to the currently-running node executable —
// always exists + always resolves, immune to Windows spawn-PATH ENOENT.
const NODE_BIN = process.execPath;

test("CLI — exit code 3 on missing --milestone", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--unit", "U-X"], { encoding: "utf8" });
  assert.equal(r.status, 3);
});

test("CLI — exit code 3 on unsafe milestone id (path traversal blocked at CLI)", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--milestone", "../etc/passwd", "--unit", "U-X"], { encoding: "utf8" });
  assert.equal(r.status, 3);
});

test("CLI — exit code 3 on unknown flag (not silently ignored)", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--milestone", "MS-A", "--unit-id", "U-X"], { encoding: "utf8" });
  assert.equal(r.status, 3);
});

test("CLI — exit code 0 on ready unit (real envelope: U-P3 has no deps)", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--milestone", "SYSTEM-VIZ-BRAIN-MS0", "--unit", "U-P3-VERIFY-UNIT-READY"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes("READY"));
});

test("CLI — --json flag emits valid JSON with the expected keys", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--milestone", "SYSTEM-VIZ-BRAIN-MS0", "--unit", "U-P3-VERIFY-UNIT-READY", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.ready, true);
  assert.equal(typeof parsed.reason, "string");
  assert.ok(Array.isArray(parsed.missingDeps));
  assert.ok(Array.isArray(parsed.chain));
  assert.equal(typeof parsed.hostFound, "boolean");
});
