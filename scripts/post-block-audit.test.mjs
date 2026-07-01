// post-block-audit.test.mjs -- R9 reference-value tests for the block-by-block NC analyzer.
// Run: node scripts/post-block-audit.test.mjs   (node:test auto-runs on exit)
// Reference values verified against real JM golden NC (JM DIE/CNC LATHE/9007405.MIN)
// and synthetic programs whose expected analysis is hand-derived.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parseBlock, classifyBlock, auditNc, crossRefGolden } from "./post-block-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "post-block-audit.mjs");

// -- parseBlock: tokenization ------------------------------------------------
test("parseBlock tokenizes address words, strips comments, keeps macro brackets", () => {
  const b = parseBlock("N50 G1 X10.5 Y-2. F250 (RGH PASS)", 50);
  assert.equal(b.line, 50);
  assert.equal(b.hasCode, true);
  assert.equal(b.comment, "(RGH PASS)");
  assert.deepEqual(b.words.map((w) => w.raw), ["N50", "G1", "X10.5", "Y-2.", "F250"]);
  // a coordinate INSIDE a comment must not be tokenized
  const c = parseBlock("(MOVE TO X99 Y99)", 1);
  assert.equal(c.hasCode, false);
  // an Okuma macro expression [#100+5] must survive (not stripped as a comment)
  const m = parseBlock("X[#100+5]", 2);
  assert.equal(m.words.length, 0, "macro bracket retained -> no bare numeric word tokenized outside it");
});

test("parseBlock detects block-skip '/' and bounds a pathological line", () => {
  assert.equal(parseBlock("/N5 G0 Z1.", 5).blockSkip, true);
  assert.equal(parseBlock("N5 G0 Z1.", 5).blockSkip, false);
  const huge = "G1 " + "X1.".repeat(40000); // > MAX_LINE_LEN
  const b = parseBlock(huge, 1);
  assert.ok(b.raw.length <= 50_000, "raw is length-bounded");
});

// -- classifyBlock: every intent class (real reference values) ----------------
test("classifyBlock maps each primary intent (most safety-salient wins)", () => {
  const cls = (line) => classifyBlock(parseBlock(line, 1));
  assert.equal(cls("G0 X0 Y0"), "rapid");
  assert.equal(cls("G00 X0"), "rapid", "leading-zero G00 == G0");
  assert.equal(cls("G1 X1 F10"), "linear-feed");
  assert.equal(cls("G2 X1 Y1 R0.5"), "arc-feed");
  assert.equal(cls("G3 X1 Y1 I0 J1"), "arc-feed");
  assert.equal(cls("G4 P0.5"), "dwell");
  assert.equal(cls("G81 X1 Y1 Z-0.5 R0.1 F10"), "canned-cycle");
  assert.equal(cls("M6 T2"), "tool-change");
  assert.equal(cls("M03 S1200"), "spindle", "M3 spindle; leading zero ok");
  assert.equal(cls("M8"), "coolant");
  assert.equal(cls("G54"), "wcs-select");
  assert.equal(cls("G28 Z0"), "home/machine-ref");
  assert.equal(cls("M98 P1000"), "subprogram");
  assert.equal(cls("M30"), "program-end");
  assert.equal(cls("M0"), "program-stop");
  assert.equal(cls("G21"), "modal-setup");
  assert.equal(cls("X1.37"), "motion-cont", "bare-coordinate continuation move");
  assert.equal(cls("(JUST A COMMENT)"), "comment");
  // safety-salient precedence: a canned cycle line that also has a coordinate is a cycle, not motion-cont
  assert.equal(cls("G83 X1 Y1 Z-1 R0.1 Q0.2 F10"), "canned-cycle");
});

// -- auditNc: modal-state FSM + invariants (synthetic, hand-derived) ----------
test("auditNc: coolant-before-spindle ERROR + modal trace on a deliberately broken mill program", () => {
  const nc = "O1234 (TEST)\nG20\nG0 X0 Y0\nM8\nM3 S1200\nG1 Z-0.5 F10.\nG0 Z1.\n";
  const res = auditNc(nc, { dialect: "haas" });
  assert.equal(res.blockCount, 7);
  assert.equal(res.counts.ERROR, 1, "one coolant-before-spindle ERROR");
  // the ERROR is attached to the M8 block (line 4), composed from lintNc
  const m8 = res.blocks.find((b) => b.line === 4);
  assert.equal(m8.class, "coolant");
  assert.ok(m8.issues.some((i) => i.rule === "coolant-before-spindle" && i.severity === "ERROR"));
  // modal-state FSM after the whole program
  assert.equal(res.modal.units, "in", "G20 -> inch");
  assert.equal(res.modal.spindle, "cw", "M3 -> cw");
  assert.equal(res.modal.coolant, "on", "M8, never M9 -> still on");
  // invariants derived from final modal state
  const rules = new Set(res.invariants.map((i) => i.rule));
  assert.ok(rules.has("spindle-on-at-end"), "spindle left on");
  assert.ok(rules.has("coolant-on-at-end"), "coolant left on");
  // program-end detection is single-sourced to lintNc (folded as an unattached finding)
  assert.ok(rules.has("missing-program-end"), "no M30/M2 (from composed lintNc)");
  assert.ok(rules.has("feedmode-undeclared"), "cutting move but no G93/94/95");
  // vocabulary (distinct codes)
  assert.deepEqual(res.vocabulary.g, ["0", "1", "20"]);
  assert.deepEqual(res.vocabulary.m, ["3", "8"]);
});

test("auditNc: a clean, well-formed program raises NO warnings/errors", () => {
  const nc = [
    "O100 (CLEAN)", "G21", "G94", "G54", "T1 M6", "M3 S1000", "G0 X0 Y0 Z1.",
    "G1 Z-1. F100", "G0 Z1.", "M5", "M9", "M30",
  ].join("\n") + "\n";
  const res = auditNc(nc, { dialect: "fanuc" });
  assert.equal(res.counts.ERROR, 0);
  assert.equal(res.counts.WARN, 0, "no warnings on a well-formed program");
  assert.equal(res.modal.units, "mm");
  assert.equal(res.modal.feedMode, "ipm/mmpm");
  assert.equal(res.modal.wcs, 54);
  assert.equal(res.modal.spindle, "off", "M5 closed it");
  assert.equal(res.modal.coolant, "off", "M9 closed it");
});

test("auditNc: multiple-M and multiple-motion within one block", () => {
  // real pattern from JM golden 9007405.MIN line: 'G97 S558 M3 M42'
  const r1 = auditNc("G97 S558 M3 M42\nM30\n", { dialect: "fanuc" });
  const b = r1.blocks.find((x) => x.issues.some((i) => i.rule === "multiple-m-per-block"));
  assert.ok(b, "two M-codes flagged");
  // two group-1 motion codes in one block (G0 G1) -> second wins silently
  const r2 = auditNc("G21\nG0 G1 X10 F50\nM30\n", { dialect: "fanuc" });
  assert.ok(
    r2.blocks.some((x) => x.issues.some((i) => i.rule === "multiple-motion-per-block")),
    "G0 G1 in one block flagged",
  );
});

// -- adversarial inputs -------------------------------------------------------
test("auditNc: adversarial -- null/empty/comment-only/CRLF never crash", () => {
  assert.equal(auditNc(null).blockCount, 0);
  assert.equal(auditNc("").blockCount, 0);
  assert.equal(auditNc(undefined).blockCount, 0);
  const commentOnly = auditNc("(JUST)\n(COMMENTS)\n", { dialect: "fanuc" });
  assert.equal(commentOnly.blockCount, 2);
  assert.ok(commentOnly.blocks.every((b) => b.class === "comment"));
  // CRLF line endings parse identically to LF
  const lf = auditNc("G21\nG0 X0\nM30\n", { dialect: "fanuc" });
  const crlf = auditNc("G21\r\nG0 X0\r\nM30\r\n", { dialect: "fanuc" });
  assert.equal(lf.blockCount, crlf.blockCount);
  assert.deepEqual(lf.vocabulary.g, crlf.vocabulary.g);
});

test("auditNc: adversarial -- maxBlocks bound + blank lines are not blocks", () => {
  const nc = "G21\n\n\nG0 X0\n\nG1 X1 F10\nM30\n"; // 4 real blocks among blanks
  assert.equal(auditNc(nc).blockCount, 4, "blank lines skipped");
  assert.equal(auditNc(nc, { maxBlocks: 2 }).blockCount, 2, "maxBlocks caps the walk");
});

// -- per-file-scrutiny P1 regression locks ------------------------------------
test("REGRESSION P1: Okuma hyphenated [] prose comment is NOT tokenized as code", () => {
  // [] IS the comment delimiter on Okuma. A hyphenated prose comment must strip,
  // not leak phantom address words (the old '-'-as-arithmetic guard mis-kept it).
  const r = auditNc("[ROUGH-PASS 1]\n[X-2 RAPID OK]\nG0 X0\nM30\n", { dialect: "okuma" });
  assert.deepEqual(r.vocabulary.g, ["0"], "no phantom G-1/X-2 from the comments");
  assert.equal(r.blocks[0].class, "comment", "[ROUGH-PASS 1] is a comment");
  assert.equal(r.blocks[1].class, "comment", "[X-2 RAPID OK] is a comment");
  // a genuine macro expression must STILL survive (variable + arithmetic kept)
  const m = parseBlock("X[#100+5]", 1);
  assert.equal(m.words.length, 0, "macro bracket retained, no bare word leaked");
  const m2 = auditNc("G65 P[#1*#2]\nM30\n", { dialect: "okuma" });
  assert.ok(m2.vocabulary.g.includes("65"), "macro arithmetic block still parses its G65");
});

test("REGRESSION P1: G80 retains motion when a move shares the block", () => {
  // G80 G0 Z1. = canned-cycle cancel + rapid retract -> motion stays rapid (0).
  const r = auditNc("G81 X1 Y1 Z-1 R0.1 F10\nG80 G0 Z1.\nM30\n", { dialect: "fanuc" });
  const cancelBlk = r.blocks.find((b) => b.codes.g.includes("G80"));
  assert.equal(cancelBlk.modalAfter.motion, 0, "G80 G0 -> rapid retained, not nulled");
  // bare G80 (no move) DOES clear the motion mode
  const r2 = auditNc("G81 X1 Y1 Z-1 R0.1 F10\nG80\nM30\n", { dialect: "fanuc" });
  const bare = r2.blocks.find((b) => b.codes.g.includes("G80"));
  assert.equal(bare.modalAfter.motion, null, "bare G80 clears motion");
});

test("REGRESSION P2: Heidenhain conversational is FSM-exempt (no spurious modal invariants)", () => {
  const r = auditNc("BEGIN PGM TEST MM\nL X+0 Y+0 R0 FMAX\nL Z-5 F500\nEND PGM TEST MM\n");
  assert.equal(r.dialect, "heidenhain");
  const rules = new Set(r.invariants.map((i) => i.rule));
  assert.ok(!rules.has("units-undeclared"), "no spurious units invariant on Heidenhain");
  assert.ok(!rules.has("wcs-unselected"), "no spurious wcs invariant on Heidenhain");
});

// -- crossRefGolden: surprise/missing vocabulary ------------------------------
test("crossRefGolden flags codes the post emits that the golden never used", () => {
  const cand = auditNc("G21\nG0 X0\nG1 X1 F10\nG43 H1 Z5\nM30\n", { dialect: "fanuc" });
  const gold = auditNc("G21\nG0 X0\nG1 X1 F10\nM30\n", { dialect: "fanuc" });
  const x = crossRefGolden(cand, gold);
  assert.deepEqual(x.surprise_g, ["G43"], "candidate's G43 absent from golden -> surprise");
  assert.deepEqual(x.missing_g, [], "candidate covers every golden code");
  // reverse: golden uses a code the candidate omits
  const x2 = crossRefGolden(gold, cand);
  assert.deepEqual(x2.missing_g, ["G43"]);
  assert.deepEqual(x2.surprise_g, []);
});

// -- real JM golden integration ----------------------------------------------
test("auditNc: parses a REAL JM golden lathe program without crashing", () => {
  const golden = join(HERE, "..", "JM DIE", "CNC LATHE", "9007405.MIN");
  if (!existsSync(golden)) return; // skip if the corpus is not present on this host
  const text = readFileSync(golden, "utf8");
  const res = auditNc(text, { dialect: "auto", filename: golden });
  // 9007405.MIN is a short Mastercam-posted lathe program: 27 real blocks,
  // vocabulary G[0 1 18 50 95 96 97 140] M[3 42 ...] (verified 2026-06-25).
  assert.equal(res.blockCount, 27, "real golden block count");
  assert.ok(res.vocabulary.g.includes("0"), "uses rapids");
  // lathe CSS family: G96 (constant surface speed) + G97 (constant RPM) + G50 (max-RPM clamp)
  assert.ok(res.vocabulary.g.includes("97"), "lathe G97 present");
  assert.ok(res.vocabulary.g.includes("96"), "lathe G96 CSS present");
  assert.ok(res.vocabulary.g.includes("50"), "lathe G50 max-RPM clamp present");
});

// -- CLI exit-code contract (round-trip through the real script) --------------
test("CLI exits 1 on an ERROR finding, 0 on a clean program", () => {
  const broken = "G20\nM8\nM3 S1000\nG1 Z-1 F10\nM30\n"; // coolant-before-spindle ERROR
  const r1 = spawnSync(process.execPath, [SCRIPT, "--dialect", "haas", "--quiet"], { input: broken, encoding: "utf8" });
  assert.equal(r1.status, 1, "ERROR -> exit 1");
  const clean = "O1\nG21\nG94\nG54\nM3 S1000\nG1 X1 F50\nM5\nM30\n";
  const r2 = spawnSync(process.execPath, [SCRIPT, "--dialect", "fanuc", "--quiet"], { input: clean, encoding: "utf8" });
  assert.equal(r2.status, 0, "clean -> exit 0");
  // bad flag -> exit 2
  const r3 = spawnSync(process.execPath, [SCRIPT, "--nonsense"], { input: "", encoding: "utf8" });
  assert.equal(r3.status, 2, "bad invocation -> exit 2");
});
