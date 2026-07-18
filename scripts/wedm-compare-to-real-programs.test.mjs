/**
 * wedm-compare-to-real-programs.test.mjs — node:test suite for the real-program comparator.
 *   npx tsx --test scripts/wedm-compare-to-real-programs.test.mjs
 * (tsx, not plain node: the live-oracle tests import the .ts JM tech tables.)
 *
 * R9 intent: these encode WHY each field matters and assert against the LIVE
 * JM_DIE_ECODE_FAMILIES oracle (NOT a hand-stub) so the suite goes RED if the
 * shipping oracle table ever drifts away from the real JM cascades. Two locked
 * behaviors:
 *   1. The feed-parse fix: "F.12" must parse to 0.12, NOT 12 (old regex bug that
 *      made the harness score 0%). A revert fails the leading-dot assertions.
 *   2. In-sample fidelity: the fixtures below are byte-faithful to the REAL
 *      on-disk FA-10S programs (ITW SHAKEPROOF / 38 CAL CANNELURE / NOZE TEST),
 *      and the live oracle must reproduce them. The oracle was calibrated FROM
 *      these programs, so this is an IN-SAMPLE fidelity gate, NOT a held-out
 *      generalization proof — see the script header.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseRealProgram,
  compareToOracle,
  matchOracleFamily,
  OFFSET_TOL_IN,
  FEED_TOL_IPM,
} from "./wedm-compare-to-real-programs.mjs";
import { JM_DIE_ECODE_FAMILIES } from "../mcp-server/src/data/jm-die-wedm-tech-tables.js";

const near = (a, b, eps = 1e-5) => Math.abs(a - b) <= eps;

// ── Faithful slices of the REAL on-disk FA-10S programs (verified by dumping the
//    parser over "H:/PRISM/JM DIE/WIRE EDM"). H175 is the GLOBAL trim def and must
//    NOT be captured as a pass offset; programs repeat the cycle per contour. ──

// ITW SHAKEPROOF 500-30540-24000-04.NC — E12 standard 4-pass.
const ITW_SLICE = [
  "H175=.0000",
  "H1 =.0085 + H175",
  "H2 =.0064 + H175",
  "H3 =.0058 + H175",
  "H4 =.0053 + H175",
  "(CONTOUR 1)",
  "N50 E1221 H1 F.12 (PASS=1)",
  "N60 E1222 H2 F.24 (PASS=2)",
  "N70 E1223 H3 F.21 (PASS=3)",
  "N80 E1224 H4 F.20 (PASS=4)",
  "(CONTOUR 2 - repeats the cycle, must be de-duped)",
  "N150 E1221 H1 F.12 (PASS=1)",
  "N160 E1222 H2 F.24 (PASS=2)",
].join("\n");

// 38 CAL CANNELURE 30TPI.txt — E12 heavy 5-pass.
const CAL38_SLICE = [
  "H175=.0000",
  "H1 =.00995 + H175",
  "H2 =.00725 + H175",
  "H3 =.00585 + H175",
  "H4 =.00535 + H175",
  "H5 =.0052 + H175",
  "N50 E1281 H1 F.06 (PASS=1)",
  "N60 E1282 H2 F.15 (PASS=2)",
  "N70 E1283 H3 F.12 (PASS=3)",
  "N80 E1284 H4 F.16 (PASS=4)",
  "N90 E1285 H5 F.13 (PASS=5)",
].join("\n");

// NOZE TEST.NC — E28 taper, 4 passes on disk (oracle family is the 5-pass taper).
const NOZE_SLICE = [
  "H1 =.0000",
  "H2 =.0000",
  "H3 =.0000",
  "H4 =.0000",
  "N50 E2821 H1 F.16 (PASS=1)",
  "N60 E2822 H2 F.23 (PASS=2)",
  "N70 E2823 H3 F.26 (PASS=3)",
  "N80 E2824 H4 F.30 (PASS=4)",
].join("\n");

const famById = (id) => JM_DIE_ECODE_FAMILIES.find((f) => f.id === id);

describe("parseRealProgram", () => {
  test("parses the four-pass cascade in pass order", () => {
    const { passes } = parseRealProgram(ITW_SLICE);
    assert.deepEqual(passes.map((p) => p.pass), [1, 2, 3, 4]);
    assert.deepEqual(passes.map((p) => p.e_code), ["E1221", "E1222", "E1223", "E1224"]);
  });

  test("FEED keeps its leading-dot magnitude (F.12 => 0.12, NOT 12) — locks the 0%->100% fix", () => {
    const { passes } = parseRealProgram(ITW_SLICE);
    assert.ok(near(passes[0].feed_ipm, 0.12), "pass1 feed " + passes[0].feed_ipm + " != 0.12");
    assert.ok(near(passes[1].feed_ipm, 0.24), "pass2 feed " + passes[1].feed_ipm + " != 0.24");
    // a real WEDM skim feed is sub-ipm; anything >1 is the old F.12->12 parse bug.
    for (const p of passes) assert.ok(p.feed_ipm < 1, "feed " + p.feed_ipm + " >= 1 (old parse bug?)");
  });

  test("resolves H-register offsets from their base def (real ITW values), excluding the H175 global trim", () => {
    const { passes } = parseRealProgram(ITW_SLICE);
    assert.ok(near(passes[0].offset_in, 0.0085), "pass1 off " + passes[0].offset_in);
    assert.ok(near(passes[1].offset_in, 0.0064), "pass2 off " + passes[1].offset_in);
    assert.ok(near(passes[3].offset_in, 0.0053), "pass4 off " + passes[3].offset_in);
    for (const p of passes) assert.ok(!/^H175$/i.test(p.h_register), "H175 leaked into a pass");
  });

  test("offsets are strictly decreasing rough->skim (cascade-correctness invariant)", () => {
    const { passes } = parseRealProgram(ITW_SLICE);
    for (let i = 1; i < passes.length; i++) {
      assert.ok(passes[i].offset_in < passes[i - 1].offset_in, "offset not strictly decreasing at pass " + passes[i].pass);
    }
  });

  test("de-dupes repeated contour cycles (first occurrence of each PASS wins)", () => {
    assert.equal(parseRealProgram(ITW_SLICE).passes.length, 4); // not 6
  });

  test("derives the family prefix from the first pass E-code", () => {
    assert.equal(parseRealProgram(ITW_SLICE).family_prefix, "E12");
    assert.equal(parseRealProgram(NOZE_SLICE).family_prefix, "E28");
  });

  test("degrades safely on empty / junk input", () => {
    assert.deepEqual(parseRealProgram("").passes, []);
    assert.deepEqual(parseRealProgram(null).passes, []);
    assert.equal(parseRealProgram("just some text\nno cascade here").family_prefix, null);
  });
});

describe("matchOracleFamily (live JM_DIE_ECODE_FAMILIES)", () => {
  test("E12 4-pass binds the STANDARD family EXACTLY (not the 5-pass heavy)", () => {
    const m = matchOracleFamily(parseRealProgram(ITW_SLICE), JM_DIE_ECODE_FAMILIES);
    assert.equal(m.matched_via, "exact");
    assert.equal(m.family.id, "E12xx_standard_4pass");
  });

  test("E12 5-pass binds the HEAVY family EXACTLY (disambiguates the shared E12 prefix)", () => {
    const m = matchOracleFamily(parseRealProgram(CAL38_SLICE), JM_DIE_ECODE_FAMILIES);
    assert.equal(m.matched_via, "exact");
    assert.equal(m.family.id, "E12xx_heavy_5pass");
  });

  test("E28 4-pass (no exact-length taper family) falls back to prefix — flagged, not silent", () => {
    const m = matchOracleFamily(parseRealProgram(NOZE_SLICE), JM_DIE_ECODE_FAMILIES);
    assert.equal(m.matched_via, "prefix-fallback"); // oracle taper is 5-pass; real NOZE is 4
    assert.equal(m.family.id, "E28xx_taper_5pass");
  });

  test("unknown prefix => unmatched (no crash, no false bind)", () => {
    const m = matchOracleFamily(parseRealProgram("N10 E9991 H1 F.05 (PASS=1)"), JM_DIE_ECODE_FAMILIES);
    assert.equal(m.matched_via, "unmatched");
    assert.equal(m.family, null);
  });
});

describe("compareToOracle against the LIVE oracle (in-sample fidelity gate)", () => {
  test("ITW SHAKEPROOF reproduces E12xx_standard_4pass at 4/4 — the real in-sample number", () => {
    const parsed = parseRealProgram(ITW_SLICE);
    const { family } = matchOracleFamily(parsed, JM_DIE_ECODE_FAMILIES);
    const cmp = compareToOracle(parsed.passes, family);
    assert.equal(cmp.matched, 4);
    assert.equal(cmp.accuracy, 1);
  });

  test("38 CAL CANNELURE reproduces E12xx_heavy_5pass at 5/5", () => {
    const parsed = parseRealProgram(CAL38_SLICE);
    const { family } = matchOracleFamily(parsed, JM_DIE_ECODE_FAMILIES);
    const cmp = compareToOracle(parsed.passes, family);
    assert.equal(cmp.matched, 5);
    assert.equal(cmp.accuracy, 1);
  });

  test("NOZE TEST reproduces the first 4 passes of E28xx_taper_5pass at 4/4 (via prefix-fallback)", () => {
    const parsed = parseRealProgram(NOZE_SLICE);
    const { family } = matchOracleFamily(parsed, JM_DIE_ECODE_FAMILIES);
    const cmp = compareToOracle(parsed.passes, family);
    assert.equal(cmp.matched, 4);
    assert.equal(cmp.accuracy, 1);
  });

  test("a per-pass feed drift in the oracle DROPS the score (gate bites on table drift)", () => {
    // clone the live standard family but perturb pass-2 feed past tolerance.
    const live = famById("E12xx_standard_4pass");
    const drifted = { ...live, passes: live.passes.map((p) => (p.pass_number === 2 ? { ...p, feed_ipm: p.feed_ipm + FEED_TOL_IPM * 2 } : p)) };
    const cmp = compareToOracle(parseRealProgram(ITW_SLICE).passes, drifted);
    assert.equal(cmp.matched, 3); // pass 2 now fails
    assert.ok(cmp.diffs.some((d) => d.pass === 2 && d.feedOk === false));
  });

  test("a per-pass offset drift in the oracle DROPS the score", () => {
    const live = famById("E12xx_standard_4pass");
    const drifted = { ...live, passes: live.passes.map((p) => (p.pass_number === 3 ? { ...p, offset_inches: p.offset_inches + OFFSET_TOL_IN * 2 } : p)) };
    const cmp = compareToOracle(parseRealProgram(ITW_SLICE).passes, drifted);
    assert.equal(cmp.matched, 3);
    assert.ok(cmp.diffs.some((d) => d.pass === 3 && d.offOk === false));
  });

  test("returns zero accuracy (not a crash) when no oracle family is supplied", () => {
    const cmp = compareToOracle(parseRealProgram(ITW_SLICE).passes, null);
    assert.equal(cmp.accuracy, 0);
    assert.equal(cmp.matched, 0);
  });
});
