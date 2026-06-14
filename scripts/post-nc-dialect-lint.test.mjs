#!/usr/bin/env node
/**
 * post-nc-dialect-lint.test.mjs — behavior tests for the static NC dialect linter.
 * Run: node --test scripts/post-nc-dialect-lint.test.mjs
 *
 * Real-value assertions (R9): every case encodes WHY the rule matters. No
 * toBeDefined() stubs. Covers happy path + 8 rule failure modes + 4 dialects
 * (fanuc/okuma/siemens/heidenhain) + adversarial (empty/null/garbage/large)
 * + false-positive precision guards (macros must NOT trip the comment rule;
 * M50/M51 aux codes must NOT trip the coolant rule).
 *
 * NOTE: adversarial control/binary bytes are injected via \x / \u ESCAPES (not
 * literal bytes) so this source file stays plain-text — see
 * feedback_read_tool_strips_control_chars + the scrutiny P1 that caught a raw NUL.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "post-nc-dialect-lint.mjs");
const { lintNc } = await import("file:///" + SCRIPT.replace(/\\/g, "/"));

const rules = (res) => res.findings.map((f) => f.rule);
const rulesOf = (res, sev) => res.findings.filter((f) => f.severity === sev).map((f) => f.rule);

// A clean, dialect-pure Fanuc program: speed before spindle, spindle before
// coolant, feed-mode before feed, retract before tool change, M30 end.
const CLEAN_FANUC = [
  "(PART 12345 - OP1)",
  "G21 G90 G94 G17 G54",
  "T1 M06",
  "S6000 M03",
  "M08",
  "G00 X0 Y0",
  "G43 Z25. H01",
  "G01 Z-2. F300.",
  "G01 X40. F600.",
  "G00 Z25.",
  "M09",
  "G91 G28 Z0.",
  "T2 M06",
  "S5000 M03",
  "G00 Z25.",
  "M30",
].join("\n");

test("happy path: clean dialect-pure Fanuc program is clean", () => {
  const res = lintNc(CLEAN_FANUC, { dialect: "fanuc" });
  assert.equal(res.counts.ERROR, 0, `unexpected errors: ${JSON.stringify(res.findings)}`);
  assert.equal(res.counts.WARN, 0, `unexpected warnings: ${JSON.stringify(res.findings)}`);
  assert.equal(res.dialect, "fanuc");
});

test("R1 coolant-before-spindle is an ERROR (wet floor before tool engages)", () => {
  const nc = "G21 G90 G94\nM08\nS6000 M03\nG00 X0 Y0\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "ERROR").includes("coolant-before-spindle"));
  assert.equal(res.counts.ERROR, 1);
});

test("R1 precision: M50 (aux, NOT coolant) before M03 must NOT be an ERROR", () => {
  // M50/M51 are auxiliary (chip conveyor / parts catcher / work light) on many
  // controllers — not coolant. R1 is the only ERROR rule, so a false positive
  // here is the loudest possible failure. Caught by scrutiny arm-A (P1).
  const nc = "G21 G90 G94\nM50\nS6000 M03\nM08\nG00 X0 Y0\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.equal(res.counts.ERROR, 0, `M50 wrongly flagged: ${JSON.stringify(res.findings)}`);
});

test("R1 turning-aware: M8-before-M3 on a lathe (G96/G97) is INFO, not ERROR", () => {
  // Real-world pattern from JM Okuma .MIN programs: coolant on, then CSS spindle.
  const nc = "G50 S2500\nG95 G18\nN1 T010101\nM8\nG97 S1053 M3\nG0 Z0.1\nM30\n";
  const res = lintNc(nc, { dialect: "okuma" });
  assert.equal(res.counts.ERROR, 0, `turning M8-before-M3 must not be an ERROR: ${JSON.stringify(res.findings)}`);
  const cool = res.findings.find((f) => f.rule === "coolant-before-spindle");
  assert.ok(cool, "rule should still surface as INFO");
  assert.equal(cool.severity, "INFO");
});

test("R1 does NOT fire when coolant and spindle start on the same block", () => {
  const nc = "G21 G90 G94\nS6000 M03 M08\nG00 X0 Y0\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(!rules(res).includes("coolant-before-spindle"));
});

test("R2 spindle-start-no-speed warns when M03 has no S", () => {
  const nc = "G21 G90 G94\nM03\nG00 X0 Y0\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "WARN").includes("spindle-start-no-speed"));
});

test("R3 missing-program-end warns with no M30/M2", () => {
  const nc = "G21 G90 G94\nS6000 M03\nG00 X0 Y0\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rules(res).includes("missing-program-end"));
});

test("R4 tool-change-no-retract warns when M06 follows a cut with no Z retract", () => {
  const nc = "G21 G90 G94\nS6000 M03\nG01 Z-5. F300.\nG01 X10. F600.\nT2 M06\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "WARN").includes("tool-change-no-retract"));
});

test("R4 does NOT warn when a G28 Z retract precedes the tool change", () => {
  const nc = "G21 G90 G94\nS6000 M03\nG01 X10. F600.\nG91 G28 Z0.\nT2 M06\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(!rules(res).includes("tool-change-no-retract"));
});

test("R5 feed-no-feedmode warns on a feed move before any G94/G95/G93", () => {
  const nc = "G21 G90 G17\nS6000 M03\nG01 Z-2. F300.\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "WARN").includes("feed-no-feedmode"));
});

test("R6 comment-style-okuma warns when an Okuma post uses () comments", () => {
  const nc = "(THIS IS A FANUC STYLE COMMENT)\nG21 G90 G94\nS6000 M03\nM08\nM30\n";
  const res = lintNc(nc, { dialect: "okuma" });
  assert.ok(rulesOf(res, "WARN").includes("comment-style-okuma"));
});

test("R7 comment-style-fanuc warns when a Fanuc post has an Okuma [] prose comment", () => {
  const nc = "[ROUGH POCKET]\nG21 G90 G94\nS6000 M03\nM08\nM30\n";
  const res = lintNc(nc, { dialect: "haas" });
  assert.ok(rulesOf(res, "WARN").includes("comment-style-fanuc"));
});

test("R7 precision: a Fanuc MACRO [#1+#2] must NOT be flagged as a comment", () => {
  const nc = "G21 G90 G94\n#100=[#1+#2]\nS6000 M03\nM08\nG01 X[#100] F600.\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(!rules(res).includes("comment-style-fanuc"),
    `macro wrongly flagged: ${JSON.stringify(res.findings)}`);
});

test("R8 modal-tap-dialect: Siemens G84 warns", () => {
  const nc = "G21 G90 G94\nS2000 M03\nG84 Z-10. R2. F1.5\nM30\n";
  const res = lintNc(nc, { dialect: "siemens" });
  assert.ok(rulesOf(res, "WARN").includes("modal-tap-dialect"));
});

test("R8 modal-tap-dialect: Fanuc MCALL warns", () => {
  const nc = "G21 G90 G94\nS2000 M03\nMCALL CYCLE84\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "WARN").includes("modal-tap-dialect"));
});

test("dialect variability: Heidenhain conversational skips ISO rules, checks END PGM", () => {
  const noEnd = "0 BEGIN PGM TEST MM\n1 BLK FORM 0.1 Z X-50 Y-50 Z-25\nL X+10 Y+10 R0 FMAX\n";
  const res = lintNc(noEnd, { dialect: "heidenhain" });
  assert.ok(rules(res).includes("missing-program-end"));
  // ISO safety rules must NOT fire on conversational text
  assert.ok(!rules(res).includes("coolant-before-spindle"));

  const withEnd = noEnd + "99 END PGM TEST MM\n";
  const ok = lintNc(withEnd, { dialect: "heidenhain" });
  assert.ok(!rules(ok).includes("missing-program-end"));
});

test("zero-padded codes: M08 detected same as M8", () => {
  const nc = "G21 G90 G94\nM08\nS6000 M03\nG00 X0\nM30\n";
  const res = lintNc(nc, { dialect: "fanuc" });
  assert.ok(rulesOf(res, "ERROR").includes("coolant-before-spindle"));
});

test("autodetect: () heavy program defaults to fanuc-generic", () => {
  const res = lintNc(CLEAN_FANUC, { dialect: "auto" });
  assert.equal(res.dialect, "fanuc-generic");
});

test("adversarial: empty string does not throw and reports missing-program-end", () => {
  const res = lintNc("", { dialect: "fanuc" });
  assert.ok(Array.isArray(res.findings));
  assert.ok(rules(res).includes("missing-program-end"));
});

test("adversarial: null / number inputs do not throw", () => {
  assert.doesNotThrow(() => lintNc(null, { dialect: "fanuc" }));
  assert.doesNotThrow(() => lintNc(12345, { dialect: "fanuc" }));
  assert.doesNotThrow(() => lintNc(undefined, {}));
});

test("adversarial: garbage binary-ish content does not throw", () => {
  // NUL + replacement char injected via escapes (plain-text source — no raw bytes).
  const junk = "\x00�()[]###\nG\nM\n%%%\n";
  assert.doesNotThrow(() => lintNc(junk, { dialect: "okuma" }));
});

test("scale: 5000-line program lints without error and stays bounded", () => {
  const big = ("G01 X1. F600.\n".repeat(5000)) + "M30\n";
  const res = lintNc(big, { dialect: "fanuc" });
  assert.ok(res.lineCount >= 5000);
  assert.ok(Array.isArray(res.findings));
});

test("scale: a single pathological 200k-char line is bounded (no O(n^2) blowup)", () => {
  // P2 hardening from scrutiny: minified/corrupt one-line NC must not hang.
  const longLine = "(".repeat(200000); // unclosed parens — worst case for the strip regex
  assert.doesNotThrow(() => lintNc(longLine + "\nM30\n", { dialect: "fanuc" }));
});

// ── CLI round-trip (exercises the real entry point + exit codes) ──
test("CLI: exits 1 and emits findings on a file with an ERROR", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ncl-"));
  try {
    const f = path.join(dir, "bad.nc");
    writeFileSync(f, "G21 G90 G94\nM08\nS6000 M03\nM30\n");
    const r = spawnSync(process.execPath, [SCRIPT, f, "--dialect", "fanuc"], { encoding: "utf8" });
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /coolant-before-spindle/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: --json emits parseable JSON and exits 0 on a clean program", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ncl-"));
  try {
    const f = path.join(dir, "ok.nc");
    writeFileSync(f, CLEAN_FANUC + "\n");
    const r = spawnSync(process.execPath, [SCRIPT, f, "--dialect", "fanuc", "--json"], { encoding: "utf8" });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stdout}${r.stderr}`);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.schemaVersion, "1.0.0");
    assert.equal(parsed.results[0].counts.ERROR, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: bad flag exits 2", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--nonsense"], { encoding: "utf8" });
  assert.equal(r.status, 2);
});
