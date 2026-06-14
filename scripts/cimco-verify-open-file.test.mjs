// cimco-verify-open-file.test.mjs — real-behavior tests for the blind-safe External-Command verifier.
// Run: node --test scripts/cimco-verify-open-file.test.mjs
//
// Asserts the FAIL-CLOSED contract: clearance is EARNED only by a golden byte-equivalence pass; an
// empty NC, a missing golden, a semantic-drift, or an unknown dialect never reads "cleared". Uses
// temp-dir NC fixtures + INJECTED synthetic allowlists so the dialect-lint arm is deterministic
// (independent of the live JM-golden corpus).
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VERDICTS, verifyPost, renderOutfile, writeOutfile } from "./cimco-verify-open-file.mjs";

const DIR = mkdtempSync(join(tmpdir(), "cimco-verify-"));
const nc = (name, body) => {
  const p = join(DIR, name);
  writeFileSync(p, body, "utf8");
  return p;
};

// Generic NC (detectDialect → "unknown"); codes normalize to G0,G1,G20,G54,G90 + M30.
const BODY = "O0001 (TEST)\nG20\nG90 G54\nG0 X0 Y0\nG1 Z-0.1 F10.\nM30\n";
const CAND = nc("cand.nc", BODY);
const GOLD_SAME = nc("gold_same.nc", BODY);
const GOLD_DRIFT = nc("gold_drift.nc", "O0001 (TEST)\nG20\nG90 G54\nG0 X0 Y0\nG1 Z-0.9 F40.\nM30\n");
// Injected allowlists keyed to the "unknown" classification detectDialect returns for BODY.
const FULL = { families: { unknown: { gCodes: ["G20", "G90", "G54", "G0", "G1"], mCodes: ["M30"], sampleCount: 7 } } };
const PARTIAL = { families: { unknown: { gCodes: ["G90", "G0", "G1"], mCodes: ["M30"], sampleCount: 7 } } }; // missing G20,G54

process.on("exit", () => rmSync(DIR, { recursive: true, force: true }));

// ─── constants ──────────────────────────────────────────────────────────────
test("VERDICTS are ordered worst→best", () => {
  assert.deepEqual(VERDICTS, ["FAIL", "INCONCLUSIVE", "WARN", "PASS"]);
});

// ─── fail-loud inputs ─────────────────────────────────────────────────────────
test("verifyPost THROWS on missing ncFile / nonexistent path", () => {
  assert.throws(() => verifyPost({}), /required/);
  assert.throws(() => verifyPost({ ncFile: join(DIR, "nope.nc") }), /not found/);
});

// ─── empty NC → FAIL-CLOSED (never 'nothing wrong') ──────────────────────────
test("empty NC is FAIL-closed, never cleared", () => {
  const empty = nc("empty.nc", "   \n\t\n");
  const v = verifyPost({ ncFile: empty });
  assert.equal(v.verdict, "FAIL");
  assert.equal(v.cleared, false);
  assert.ok(v.blockers.includes("empty-nc"));
});

// ─── no golden → INCONCLUSIVE (byte-equiv is the only clearance arm) ──────────
test("no golden ⇒ INCONCLUSIVE, never cleared (static lint is necessary-not-sufficient)", () => {
  const v = verifyPost({ ncFile: CAND, allowlist: FULL });
  assert.equal(v.arms.dialectLint.status, "pass"); // all codes observed
  assert.equal(v.arms.byteEquiv.ran, false);
  assert.equal(v.verdict, "INCONCLUSIVE");
  assert.equal(v.cleared, false, "a clean lint alone must NOT clear a post");
  assert.ok(v.blockers.includes("no-golden-for-byte-equivalence"));
});

// ─── byte-identical golden → PASS cleared ────────────────────────────────────
test("byte-identical golden + clean lint ⇒ PASS, cleared", () => {
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_SAME, allowlist: FULL });
  assert.equal(v.arms.byteEquiv.classification, "byte-identical");
  assert.equal(v.arms.byteEquiv.status, "pass");
  assert.equal(v.verdict, "PASS");
  assert.equal(v.cleared, true);
});

// ─── semantic-drift golden → FAIL (genuine divergence, not header churn) ──────
test("semantic-drift golden ⇒ FAIL, not cleared", () => {
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_DRIFT, allowlist: FULL });
  assert.equal(v.arms.byteEquiv.classification, "semantic-drift");
  assert.equal(v.verdict, "FAIL");
  assert.equal(v.cleared, false);
  assert.ok(v.blockers.includes("semantic-drift-vs-golden"));
});

// ─── byte-equiv pass BUT foreign G/M code ⇒ WARN, clearance withheld ──────────
test("byte-identical golden + foreign G/M code ⇒ WARN, NOT unqualified-cleared", () => {
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_SAME, allowlist: PARTIAL });
  assert.equal(v.arms.dialectLint.status, "warn");
  assert.deepEqual(v.arms.dialectLint.unknownCodes.sort(), ["G20", "G54"]);
  assert.equal(v.verdict, "WARN");
  assert.equal(v.cleared, false, "an unobserved code blocks an unqualified clearance even when byte-equivalent");
  assert.ok(v.blockers.includes("unobserved-gm-codes-vs-goldens"));
});

// ─── unknown dialect (no allowlist family) ⇒ lint inconclusive + blocker ──────
test("unknown dialect ⇒ dialectLint inconclusive + dialect-not-in-allowlist-corpus blocker", () => {
  const v = verifyPost({ ncFile: CAND, allowlist: { families: {} } });
  assert.equal(v.arms.dialectLint.status, "inconclusive");
  assert.ok(v.blockers.includes("dialect-not-in-allowlist-corpus"));
  assert.equal(v.cleared, false);
});

// ─── unknown dialect + byte-IDENTICAL golden ⇒ cleared (byte-identity subsumes the un-runnable lint) ──
test("unknown dialect + byte-identical golden ⇒ PASS/cleared, even with an inconclusive lint blocker", () => {
  // No allowlist family for the dialect ⇒ lint inconclusive; but byte-identity to the golden is the
  // strongest offline evidence and earns clearance. Pins the intended (reviewer-confirmed) behavior.
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_SAME, allowlist: { families: {} } });
  assert.equal(v.arms.byteEquiv.classification, "byte-identical");
  assert.equal(v.arms.dialectLint.status, "inconclusive");
  assert.equal(v.verdict, "PASS");
  assert.equal(v.cleared, true, "byte-identity to a proven golden clears even when vocab-lint cannot run");
  assert.ok(v.blockers.includes("dialect-not-in-allowlist-corpus"), "the lint-gap is still surfaced as a blocker");
});

// ─── coverage statement is always honest about the sim gap ───────────────────
test("verdict always discloses it does NOT cover the collision sim verdict (R12)", () => {
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_SAME, allowlist: FULL });
  assert.match(v.coverage, /does NOT include the CIMCO Machine-Simulation collision/i);
});

// ─── $OUTFILE render + write ──────────────────────────────────────────────────
test("renderOutfile is operator-legible (verdict header + arms + JSON block)", () => {
  const v = verifyPost({ ncFile: CAND, goldenFile: GOLD_SAME, allowlist: FULL });
  const out = renderOutfile(v);
  assert.match(out, /^PRISM VERIFY: PASS \(cleared\)/);
  assert.match(out, /byteEquiv: pass/);
  assert.match(out, /--- JSON ---/);
  assert.ok(JSON.parse(out.split("--- JSON ---")[1]).cleared === true, "JSON block round-trips");
});
test("writeOutfile writes the verdict file and THROWS on an unwritable path", () => {
  const v = verifyPost({ ncFile: CAND, allowlist: FULL });
  const outPath = join(DIR, "verdict.NEW");
  writeOutfile(v, outPath);
  assert.ok(existsSync(outPath));
  assert.match(readFileSync(outPath, "utf8"), /PRISM VERIFY:/);
  assert.throws(() => writeOutfile(v, join(DIR, "no_such_subdir", "x.NEW")), /could not write/);
  assert.throws(() => writeOutfile(v, ""), /required/);
});

// ─── volatile-header-only is treated as a safe pass (header churn, same program) ──
test("volatile-header-only classification clears (safe header churn, not divergence)", () => {
  // Mastercam-classified NC (the `MCX FILE` token routes detectDialect → mastercam, which carries the
  // DATE/TIME/FILE volatile masks). Golden vs candidate differ ONLY in the masked MCX-FILE line → the
  // round-trip must classify header-only (safe), never semantic-drift.
  const body = (path) =>
    `%\nO0001 (PART)\n(MCX FILE - ${path})\n(DATE=DD-MM-YY - 04-06-26)\nG20\nG90 G54\nG0 X0\nG1 Z-0.1 F10.\nM30\n%\n`;
  const cand = nc("mc_cand.nc", body("C:\\jobs\\new\\PART.MCX-8"));
  const gold = nc("mc_gold.nc", body("D:\\archive\\old\\PART.MCX-8"));
  const allow = { families: { mastercam: { gCodes: ["G20", "G90", "G54", "G0", "G1"], mCodes: ["M30"], sampleCount: 9 } } };
  const v = verifyPost({ ncFile: cand, goldenFile: gold, allowlist: allow });
  assert.notEqual(v.arms.byteEquiv.classification, "semantic-drift", "a masked-header-only diff must not read as semantic drift");
  assert.ok(["byte-identical", "volatile-header-only"].includes(v.arms.byteEquiv.classification));
  assert.equal(v.arms.byteEquiv.status, "pass", "header-only churn is a safe pass");
});
