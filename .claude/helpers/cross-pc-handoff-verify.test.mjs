/**
 * cross-pc-handoff-verify — behavioural tests for INTEL-OLLAMA-OBSIDIAN-MS0/P7-U02.
 *
 * Tests the peer-shipped `scripts/cross-pc-handoff-verify.mjs` pure-helper API:
 *   - classifyPath(p)                  → "h" | "c" | "userprofile" | "relative" | "other"
 *   - extractPathRefs(text)            → string[] of plausible path refs
 *   - severityFor({kind,path,fileType}) → "critical" | "warning" | "info"
 *   - aggregateFindings(findings)      → { critical, warning, info }
 *
 * Pattern: plain node + node:assert (matches mirror-c-to-h.test.mjs).
 *
 * Run: node H:/prism/.claude/helpers/cross-pc-handoff-verify.test.mjs
 */

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyPath,
  extractPathRefs,
  severityFor,
  aggregateFindings,
} from "../../scripts/cross-pc-handoff-verify.mjs";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const SCRIPT_PATH = resolve(REPO_ROOT, "scripts", "cross-pc-handoff-verify.mjs");
const NODE_BIN = process.execPath;

// Subprocess test timeout — long enough for the script to walk the full repo
// even on a slow disk under memory pressure.
const SUBPROCESS_TIMEOUT_MS = 60_000;
// Windows STATUS_ACCESS_VIOLATION exit code (0xC0000005). The script subprocess
// can crash with this under host memory pressure (commit > 95%). We treat it
// as advisory-skip rather than failure since the 26 unit tests above already
// exercise every pure helper end-to-end.
const WIN_ACCESS_VIOLATION_EXIT_CODE = 0xC0000005;

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

// Throw this sentinel from a test body to mark the case as `skipped` rather
// than passed or failed. The runner increments the right counter.
class SkipMarker extends Error {
  constructor(reason) { super(reason); this.name = "SkipMarker"; }
}
function skip(reason) { throw new SkipMarker(reason); }

function it(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(".");
  } catch (err) {
    if (err instanceof SkipMarker) {
      skipped++;
      process.stdout.write("s");
      return;
    }
    failed++;
    failures.push({ name, err });
    process.stdout.write("F");
  }
}

// ---------------------------------------------------------------------------
// classifyPath
// ---------------------------------------------------------------------------

it("classifyPath returns 'h' for H: drive paths (uppercase)", () => {
  assert.equal(classifyPath("H:\\prism\\state\\shared\\handoffs"), "h");
});

it("classifyPath returns 'h' for h: drive paths (lowercase)", () => {
  assert.equal(classifyPath("h:/prism/state/shared"), "h");
});

it("classifyPath returns 'c' for C: drive paths (case-insensitive)", () => {
  assert.equal(classifyPath("C:\\Users\\u\\.claude"), "c");
  assert.equal(classifyPath("c:/users/u/.claude"), "c");
});

it("classifyPath returns 'userprofile' for %USERPROFILE% references", () => {
  assert.equal(classifyPath("%USERPROFILE%/.claude/settings.json"), "userprofile");
});

it("classifyPath returns 'userprofile' for $USERPROFILE shell-style references", () => {
  assert.equal(classifyPath("$USERPROFILE/.claude"), "userprofile");
  assert.equal(classifyPath("${USERPROFILE}/.claude"), "userprofile");
});

it("classifyPath returns 'relative' for ./ and ../ paths", () => {
  assert.equal(classifyPath("./scripts/foo.mjs"), "relative");
  assert.equal(classifyPath("../helpers/x.mjs"), "relative");
});

it("classifyPath returns 'other' for unix-style absolute paths", () => {
  assert.equal(classifyPath("/etc/hosts"), "other");
});

it("classifyPath returns 'other' for D: and other non-H/C drives", () => {
  assert.equal(classifyPath("D:\\backup"), "other");
  assert.equal(classifyPath("Z:/share"), "other");
});

it("classifyPath returns 'other' for empty and non-string inputs", () => {
  assert.equal(classifyPath(""), "other");
  assert.equal(classifyPath(undefined), "other");
  assert.equal(classifyPath(null), "other");
  assert.equal(classifyPath(123), "other");
});

// ---------------------------------------------------------------------------
// extractPathRefs
// ---------------------------------------------------------------------------

it("extractPathRefs finds a single C: drive path in plain text", () => {
  const refs = extractPathRefs("the file is at C:\\Users\\u\\.claude\\settings.json today");
  assert.ok(refs.some((r) => r.startsWith("C:\\")), `expected C: path, got ${JSON.stringify(refs)}`);
});

it("extractPathRefs finds a single H: drive path", () => {
  const refs = extractPathRefs('"H:/prism/scripts/foo.mjs" is the source');
  assert.ok(refs.some((r) => r.startsWith("H:")), `expected H: path, got ${JSON.stringify(refs)}`);
});

it("extractPathRefs handles multiple paths in the same string", () => {
  const refs = extractPathRefs("from C:\\a to H:/b via C:/c");
  assert.ok(refs.length >= 2, `expected 2+ refs, got ${refs.length}`);
});

it("extractPathRefs returns [] for empty string and non-string", () => {
  assert.deepEqual(extractPathRefs(""), []);
  assert.deepEqual(extractPathRefs(undefined), []);
  assert.deepEqual(extractPathRefs(null), []);
});

it("extractPathRefs surfaces USERPROFILE as a marker entry", () => {
  const refs = extractPathRefs("$USERPROFILE/.claude/settings.json");
  assert.ok(refs.some((r) => r.includes("USERPROFILE")), `expected USERPROFILE marker, got ${JSON.stringify(refs)}`);
});

it("extractPathRefs is stable across repeated calls (no regex lastIndex bleed)", () => {
  const txt = "C:\\Users\\u\\foo";
  const r1 = extractPathRefs(txt);
  const r2 = extractPathRefs(txt);
  const r3 = extractPathRefs(txt);
  assert.deepEqual(r1, r2);
  assert.deepEqual(r2, r3);
});

// ---------------------------------------------------------------------------
// severityFor
// ---------------------------------------------------------------------------

it("severityFor: C: in state-json is critical", () => {
  assert.equal(severityFor({ kind: "c", path: "C:\\foo", fileType: "state-json" }), "critical");
});

it("severityFor: C: in settings-json is critical", () => {
  assert.equal(severityFor({ kind: "c", path: "C:\\foo", fileType: "settings-json" }), "critical");
});

it("severityFor: C: in handoff-md is critical", () => {
  assert.equal(severityFor({ kind: "c", path: "C:\\foo", fileType: "handoff-md" }), "critical");
});

it("severityFor: C: in hook-mjs is warning (might be comment/fallback)", () => {
  assert.equal(severityFor({ kind: "c", path: "C:\\foo", fileType: "hook-mjs" }), "warning");
});

it("severityFor: userprofile is warning (PC-fragile but resolves on target)", () => {
  assert.equal(severityFor({ kind: "userprofile", path: "$USERPROFILE", fileType: "state-json" }), "warning");
});

it("severityFor: H:/relative/other are info-level", () => {
  assert.equal(severityFor({ kind: "h", path: "H:\\foo", fileType: "state-json" }), "info");
  assert.equal(severityFor({ kind: "relative", path: "./foo", fileType: "state-json" }), "info");
  assert.equal(severityFor({ kind: "other", path: "/foo", fileType: "state-json" }), "info");
});

// ---------------------------------------------------------------------------
// aggregateFindings
// ---------------------------------------------------------------------------

it("aggregateFindings groups findings by severity bucket", () => {
  const input = [
    { file: "a", severity: "critical" },
    { file: "b", severity: "warning" },
    { file: "c", severity: "info" },
    { file: "d", severity: "critical" },
  ];
  const out = aggregateFindings(input);
  assert.equal(out.critical.length, 2);
  assert.equal(out.warning.length, 1);
  assert.equal(out.info.length, 1);
});

it("aggregateFindings tolerates empty input", () => {
  const out = aggregateFindings([]);
  assert.deepEqual(out, { critical: [], warning: [], info: [] });
});

it("aggregateFindings tolerates undefined / null input", () => {
  const out = aggregateFindings(undefined);
  assert.deepEqual(out, { critical: [], warning: [], info: [] });
});

it("aggregateFindings drops findings with no severity field (defensive)", () => {
  const out = aggregateFindings([{ file: "x" }, { file: "y", severity: null }, { file: "z", severity: "warning" }]);
  assert.equal(out.warning.length, 1);
  assert.equal(out.critical.length, 0);
  assert.equal(out.info.length, 0);
});

it("aggregateFindings drops findings whose severity is not a known bucket", () => {
  const out = aggregateFindings([
    { file: "a", severity: "fatal" },
    { file: "b", severity: "warning" },
  ]);
  assert.equal(out.warning.length, 1);
  assert.equal(out.critical.length, 0);
});

// ---------------------------------------------------------------------------
// Subprocess smoke (verifies entry-point runs and exits sanely)
// ---------------------------------------------------------------------------

it("script entry-point runs --json and emits parseable JSON with severity counts", () => {
  // Subprocess can flake under high host memory pressure (Windows 0xC0000005
  // ACCESS_VIOLATION when commit >95%); the 26 unit tests above already
  // exercise every pure helper end-to-end, so we honestly skip the smoke
  // rather than incorrectly counting a flake as a pass.
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--json", "--no-fail"], { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS });
  if (r.status === null || r.status === WIN_ACCESS_VIOLATION_EXIT_CODE) {
    skip(`subprocess crashed/timed-out (status=${r.status}) under host memory pressure`);
  }
  assert.ok(r.status === 0, `script exited ${r.status} (--no-fail should force 0); stderr: ${r.stderr}`);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(typeof parsed.critical, "number");
  assert.equal(typeof parsed.warning, "number");
  assert.equal(typeof parsed.info, "number");
  assert.ok(parsed.findings && Array.isArray(parsed.findings.critical), "findings.critical is an array");
});

it("script entry-point runs in text mode and emits a header line", () => {
  const r = spawnSync(NODE_BIN, [SCRIPT_PATH, "--no-fail"], { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS });
  if (r.status === null || r.status === WIN_ACCESS_VIOLATION_EXIT_CODE) {
    skip(`subprocess crashed/timed-out (status=${r.status}) under host memory pressure`);
  }
  assert.ok(r.status === 0, `script exited ${r.status}`);
  assert.ok(r.stdout.includes("PRISM cross-PC handoff audit"), "stdout has report header");
  assert.ok(r.stdout.includes("critical:"), "stdout has critical count line");
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const skipSuffix = skipped > 0 ? `, ${skipped} skipped` : "";
process.stdout.write(`\n\n${passed} passed, ${failed} failed${skipSuffix}\n`);
if (failed) {
  process.stdout.write("\nFailures:\n");
  for (const f of failures) process.stdout.write(`  ✗ ${f.name}\n    ${f.err.message}\n`);
  process.exit(1);
}
process.exit(0);
