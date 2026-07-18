// lathe-gcode-lint.test.mjs — node:test suite for the whiskey lathe physics linter.
// Run: node --test scripts/lib/lathe-gcode-lint.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lintLatheGcode, lintLathePlan, maxSeverity, formatFindings, LD_LIMIT, SEVERITY_RANK,
} from "./lathe-gcode-lint.mjs";

const rules = (fs) => fs.map((f) => f.rule);
const has = (fs, rule) => fs.some((f) => f.rule === rule);
const find = (fs, rule) => fs.find((f) => f.rule === rule);

// ── R1 (#1) CSS overspeed cap ────────────────────────────────────────────────
test("R1: G96 without G50 S cap → ERROR css-no-rpm-cap", () => {
  const f = lintLatheGcode("G21\nG96 S200 M3\nG01 X10 F0.2");
  assert.ok(has(f, "css-no-rpm-cap"), "expected css-no-rpm-cap");
  assert.equal(find(f, "css-no-rpm-cap").severity, "ERROR");
});
test("R1: G96 WITH G50 S cap → no css finding", () => {
  const f = lintLatheGcode("G21\nG50 S3000\nG96 S200 M3\nG01 X10 F0.2");
  assert.ok(!has(f, "css-no-rpm-cap"), "G50 S cap should suppress the finding");
});
test("R1: pure G97 (no CSS) → no css finding", () => {
  const f = lintLatheGcode("G21\nG97 S1500 M3\nG01 X10 F0.2");
  assert.ok(!has(f, "css-no-rpm-cap"));
});

// ── R2 (#8) feed mode IPR/IPM ─────────────────────────────────────────────────
test("R2: G94 only → WARN feed-mode-ipm", () => {
  const f = lintLatheGcode("G94\nG97 S1200\nG01 X10 F100");
  assert.equal(find(f, "feed-mode-ipm").severity, "WARN");
});
test("R2: G94 + G95 → WARN feed-mode-mixed", () => {
  const f = lintLatheGcode("G94\nG95\nG97 S1200\nG01 X10 F0.2");
  assert.ok(has(f, "feed-mode-mixed"));
});
test("R2: F present, no G94/G95 → INFO feed-mode-undeclared", () => {
  const f = lintLatheGcode("G97 S1200\nG01 X10 F0.2");
  assert.equal(find(f, "feed-mode-undeclared").severity, "INFO");
});
test("R2: G95 only → no feed-mode finding", () => {
  const f = lintLatheGcode("G95\nG97 S1200\nG01 X10 F0.2");
  assert.ok(!rules(f).some((r) => r.startsWith("feed-mode")));
});
test("R2: G94 inside a comment is ignored (comment-strip)", () => {
  const f = lintLatheGcode("(WAS G94 EARLIER)\nG97 S1200\nG01 X10 F0.2");
  assert.ok(!has(f, "feed-mode-ipm"), "comment G94 must not trigger ipm");
  assert.ok(has(f, "feed-mode-undeclared"), "real program has no feed mode → undeclared INFO");
});

// ── R3 (#4) threading (delegated to G76 validator) ───────────────────────────
test("R3: bare G92 threading → a thread-* finding surfaces", () => {
  // bare G92 thread (deprecated vs G76) — the delegated validator should flag it.
  const f = lintLatheGcode("G97 S800\nG92 X19.5 Z-20 F2.0\nG92 X19.2 Z-20 F2.0", { controller: "fanuc" });
  assert.ok(rules(f).some((r) => r.startsWith("thread-")), `expected a thread-* finding, got ${rules(f)}`);
});
test("R3: no threading codes → no thread-* finding", () => {
  const f = lintLatheGcode("G95\nG97 S1200\nG01 X10 F0.2");
  assert.ok(!rules(f).some((r) => r.startsWith("thread-")));
});

// ── R4 (#5) parting / deep-groove peck ───────────────────────────────────────
test("R4: plunge to center (X≈0) without G75 → INFO partoff-no-peck", () => {
  const f = lintLatheGcode("G95\nG97 S900\nG01 X0.5 F0.05");
  assert.equal(find(f, "partoff-no-peck").severity, "INFO");
});
test("R4: modal G01 then bare X≈0 line (no G on line) still detected", () => {
  const f = lintLatheGcode("G95\nG97 S900\nG01 Z-2 F0.05\nX0.2");
  assert.ok(has(f, "partoff-no-peck"), "modal-G01 plunge should be detected");
});
test("R4: part-off WITH G75 peck → no partoff finding", () => {
  const f = lintLatheGcode("G95\nG97 S900\nG75 R0.5\nG75 X0.5 Z-2 P500 Q1000 F0.05");
  assert.ok(!has(f, "partoff-no-peck"));
});

// ── R5 (#7) C-axis polar ─────────────────────────────────────────────────────
test("R5: C-axis + Y contour without G12.1/G13.1 → WARN caxis-no-polar", () => {
  const f = lintLatheGcode("G97 S1500 M3\nG01 X10 Y5 C30 F0.1");
  assert.equal(find(f, "caxis-no-polar").severity, "WARN");
});
test("R5: C-axis contour WITH G12.1 → no caxis finding", () => {
  const f = lintLatheGcode("G12.1\nG01 X10 Y5 C30 F0.1\nG13.1");
  assert.ok(!has(f, "caxis-no-polar"));
});

// ── edge cases ───────────────────────────────────────────────────────────────
test("edge: empty / whitespace / non-string → []", () => {
  assert.deepEqual(lintLatheGcode(""), []);
  assert.deepEqual(lintLatheGcode("   \n  "), []);
  assert.deepEqual(lintLatheGcode(null), []);
  assert.deepEqual(lintLatheGcode(42), []);
});
test("edge: comment-only program → []", () => {
  assert.deepEqual(lintLatheGcode("(G96 S200 IN A COMMENT, NO CAP)\n(JUST NOTES)"), []);
});
test("edge: lowercase g-codes still parsed (G96/G50 case-insensitive)", () => {
  const f = lintLatheGcode("g21\ng96 s200 m3\ng01 x10 f0.2");
  assert.ok(has(f, "css-no-rpm-cap"), "lowercase g96 without g50 cap should flag");
});

// ── plan-mode P1 (#2) boring-bar L/D ─────────────────────────────────────────
test("P1: boring bar L/D=5 steel (limit 4) → ERROR boring-bar-ld", () => {
  const f = lintLathePlan({ operations: [{ name: "bore1", boringBar: { stickout: 50, diameter: 10, material: "steel" } }] });
  assert.equal(find(f, "boring-bar-ld").severity, "ERROR");
  assert.equal(find(f, "boring-bar-ld").op, "bore1");
});
test("P1: boring bar L/D=3 steel → no finding", () => {
  const f = lintLathePlan({ operations: [{ boringBar: { stickout: 30, diameter: 10, material: "steel" } }] });
  assert.ok(!has(f, "boring-bar-ld"));
});
test("P1: carbide raises limit to 6 (L/D=5.5 ok, 7 flagged)", () => {
  assert.ok(!has(lintLathePlan({ operations: [{ boringBar: { stickout: 55, diameter: 10, material: "carbide" } }] }), "boring-bar-ld"));
  assert.ok(has(lintLathePlan({ operations: [{ boringBar: { stickout: 70, diameter: 10, material: "carbide" } }] }), "boring-bar-ld"));
  assert.equal(LD_LIMIT.steel, 4);
  assert.equal(LD_LIMIT.carbide, 6);
});

// ── plan-mode P2 (#3) nose-radius Ra ─────────────────────────────────────────
test("P2: feed too high for target Ra → WARN nose-radius-ra", () => {
  // f=0.3mm, rε=0.4mm → Ra≈7.03µm > target 1.6µm
  const f = lintLathePlan({ operations: [{ name: "finish", finish: { feed: 0.3, noseRadius: 0.4, targetRa: 1.6 } }] });
  const nr = find(f, "nose-radius-ra");
  assert.equal(nr.severity, "WARN");
  assert.match(nr.msg, /7\.0/); // predicted Ra ≈ 7.03 µm
});
test("P2: feed within target Ra → no finding", () => {
  // f=0.1mm, rε=0.8mm → Ra≈0.39µm < 1.6µm
  const f = lintLathePlan({ operations: [{ finish: { feed: 0.1, noseRadius: 0.8, targetRa: 1.6 } }] });
  assert.ok(!has(f, "nose-radius-ra"));
});
test("P2/P1: missing/malformed plan inputs are safe", () => {
  assert.deepEqual(lintLathePlan(null), []);
  assert.deepEqual(lintLathePlan({}), []);
  assert.deepEqual(lintLathePlan({ operations: [] }), []);
  assert.deepEqual(lintLathePlan({ operations: [{ boringBar: { stickout: "x", diameter: 0 } }] }), []);
});

// ── helpers ──────────────────────────────────────────────────────────────────
test("maxSeverity: ERROR list → 3, empty → 0", () => {
  assert.equal(maxSeverity([{ severity: "ERROR" }, { severity: "INFO" }]), 3);
  assert.equal(maxSeverity([]), 0);
  assert.equal(SEVERITY_RANK.ERROR, 3);
});
test("formatFindings: empty → check mark; findings → severity + rule present", () => {
  assert.match(formatFindings([]), /no findings/);
  assert.equal(formatFindings([], { quiet: true }), "");
  const out = formatFindings([{ rule: "css-no-rpm-cap", severity: "ERROR", line: 2, msg: "x", fix: "y" }], { file: "a.nc" });
  assert.match(out, /ERROR/);
  assert.match(out, /css-no-rpm-cap/);
  assert.match(out, /a\.nc/);
});

// ── ReDoS / O(n²) guard: a pathological long line must not hang ───────────────
test("perf: 200k-char unmatched-paren single line completes fast (per-line cap)", () => {
  const t0 = Date.now();
  const f = lintLatheGcode("G96 S200 M3\n" + "(".repeat(200000) + "\nG01 X1 F0.1");
  const ms = Date.now() - t0;
  assert.ok(ms < 2000, `per-line cap must defuse O(n^2); took ${ms}ms`);
  assert.ok(has(f, "css-no-rpm-cap"), "short G96 line still flagged despite the giant line");
});

// ── integration: a multi-fault program surfaces multiple distinct rules ───────
test("integration: crash-bait program surfaces ≥3 distinct rules", () => {
  const prog = [
    "G21",
    "G96 S250 M3",        // CSS, no G50 cap → R1 ERROR
    "G94",                // IPM in turning → R2 WARN
    "G01 X0.3 F50",       // plunge to center, no G75 → R4 INFO
  ].join("\n");
  const f = lintLatheGcode(prog);
  const set = new Set(rules(f));
  assert.ok(set.has("css-no-rpm-cap"));
  assert.ok(set.has("feed-mode-ipm"));
  assert.ok(set.has("partoff-no-peck"));
  assert.equal(maxSeverity(f), 3, "an ERROR is present");
});
