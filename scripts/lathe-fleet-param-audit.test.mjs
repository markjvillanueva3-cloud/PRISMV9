// lathe-fleet-param-audit.test.mjs — CLOSED-LOOP-MS0/U-CL15 (slot:whiskey)
// Real-behavior assertions for auditProgramParams + aggregateParamAudit. No stub asserts.
// Run: node --test scripts/lathe-fleet-param-audit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { auditProgramParams, aggregateParamAudit } from "./lathe-fleet-param-audit.mjs";

// A capped-CSS, G95-feed, inch Okuma program that annotates the JM finishing practices.
const CAPPED = [
  "[OD ROUGH - LEAVE .010 FOR OD GRIND]",
  "G20",
  "G50 S3000",
  "G96 S400 M3",
  "G95",
  "T0101",
  "G71 P10 Q20 D0.08 F0.012",
  "[BORE FOR PRESS FIT CARBIDE - LEAVE .003 FOR ID HONE]",
  "[COUNTERBORE WITH CORNER RELIEF SO CARBIDE SITS TRUE]",
  "T0303",
  "G70 P10 Q20",
  "T0000",
  "M2",
].join("\n");

// G96 CSS with NO G50 clamp — the load-bearing safety defect.
const UNCAPPED = ["G96 S350 M3", "G95", "T0202", "G71 P1 Q2 F0.01"].join("\n");

// Constant-RPM (G97) program, mm units, no finishing notes.
const G97_MM = ["G21", "G97 S1200 M3", "G94", "T0404", "G01 X10 F250"].join("\n");

test("CAPPED: G96 mode, vc captured, G50 cap present, css_without_cap=false", () => {
  const p = auditProgramParams(CAPPED);
  assert.equal(p.css.mode, "G96");
  assert.deepEqual(p.css.vc_values, [400]);
  assert.equal(p.css.g50_cap_present, true);
  assert.equal(p.css.g50_cap_rpm, 3000);
  assert.equal(p.css.css_without_cap, false);
});

test("CAPPED: feed mode G95, units G20, feed value parsed", () => {
  const p = auditProgramParams(CAPPED);
  assert.equal(p.feed.mode, "G95");
  assert.equal(p.units.declared, "G20");
  assert.ok(p.feed.values.includes(0.012), `feed values ${JSON.stringify(p.feed.values)} should include 0.012`);
});

test("CAPPED: finishing-allowance flags all true (grind/hone/counterbore-relief/press-fit/carbide)", () => {
  const f = auditProgramParams(CAPPED).finishing;
  assert.equal(f.od_grind, true);
  assert.equal(f.id_hone, true);
  assert.equal(f.counterbore, true);
  assert.equal(f.relief, true);
  assert.equal(f.counterbore_relief, true);
  assert.equal(f.press_fit, true);
  assert.equal(f.carbide, true);
  assert.equal(f.any, true);
});

test("CAPPED: tool stations deduped, T0000 cancel excluded", () => {
  const t = auditProgramParams(CAPPED).tools;
  assert.deepEqual(t.stations, ["101", "303"]);
  assert.equal(t.count, 2);
});

test("CAPPED: ops include od_rough (G71) and od_finish (G70)", () => {
  const ops = auditProgramParams(CAPPED).ops;
  assert.equal(ops.od_rough, 1);
  assert.equal(ops.od_finish, 1);
});

test("UNCAPPED: G96 present but no G50 → css_without_cap=true", () => {
  const p = auditProgramParams(UNCAPPED);
  assert.equal(p.css.mode, "G96");
  assert.equal(p.css.g50_cap_present, false);
  assert.equal(p.css.g50_cap_rpm, null);
  assert.equal(p.css.css_without_cap, true);
});

test("G97_MM: constant-rpm regime, mm units, G94 feed, no finishing notes", () => {
  const p = auditProgramParams(G97_MM);
  assert.equal(p.css.mode, "G97");
  assert.deepEqual(p.css.rpm_values, [1200]);
  assert.equal(p.css.css_without_cap, false); // no G96 active
  assert.equal(p.units.declared, "G21");
  assert.equal(p.feed.mode, "G94");
  assert.equal(p.finishing.any, false);
});

test("mixed feed mode when both G94 and G95 present", () => {
  const p = auditProgramParams("G95\nT0101\nG94\nX1 F0.01");
  assert.equal(p.feed.mode, "mixed");
});

test("undeclared feed mode when neither G94 nor G95 present", () => {
  const p = auditProgramParams("G96 S300\nT0101\nG71 F0.01");
  assert.equal(p.feed.mode, "undeclared");
});

test("empty / non-string input → safe all-false defaults (no throw)", () => {
  for (const bad of ["", null, undefined, 42, {}]) {
    const p = auditProgramParams(bad);
    assert.equal(p.css.present, false);
    assert.equal(p.feed.mode, "undeclared");
    assert.equal(p.units.declared, null);
    assert.equal(p.finishing.any, false);
    assert.deepEqual(p.tools.stations, []);
  }
});

test("aggregateParamAudit rolls up counts, pcts, and value distribution", () => {
  const per = [CAPPED, UNCAPPED, G97_MM].map((t) => ({
    proper: true,
    errorCount: 0,
    params: auditProgramParams(t),
  }));
  const agg = aggregateParamAudit(per);
  assert.equal(agg.n, 3);
  assert.equal(agg.properRate, 1);
  // feed: 1 G95 (CAPPED), 1 G95 (UNCAPPED), 1 G94 (G97_MM) → declared 100%
  assert.equal(agg.feedMode.G95, 2);
  assert.equal(agg.feedMode.G94, 1);
  assert.equal(agg.feedModeUndeclaredPct, 0);
  // css: 2 with G96 (CAPPED capped, UNCAPPED uncapped), of which 1 withoutCap
  assert.equal(agg.css.g96, 2);
  assert.equal(agg.css.g97, 1);
  assert.equal(agg.css.withoutCap, 1);
  assert.equal(agg.cssWithoutCapPct, +(1 / 3).toFixed(3));
  // finishing: only CAPPED annotates
  assert.equal(agg.finishing.any, 1);
  assert.equal(agg.finishing.od_grind, 1);
  assert.equal(agg.finishing.id_hone, 1);
  // vc distribution: CAPPED (G96 S400) + UNCAPPED (G96 S350) both contribute
  assert.equal(agg.dist.vc.n, 2);
  assert.equal(agg.dist.vc.min, 350);
  assert.equal(agg.dist.vc.max, 400);
  // g50 cap distribution: only CAPPED
  assert.equal(agg.dist.g50_cap_rpm.n, 1);
  assert.equal(agg.dist.g50_cap_rpm.max, 3000);
});

test("aggregateParamAudit on empty set → n=0, null rates, empty distributions", () => {
  const agg = aggregateParamAudit([]);
  assert.equal(agg.n, 0);
  assert.equal(agg.properRate, null);
  assert.equal(agg.feedModeDeclaredPct, null);
  assert.equal(agg.dist.vc.n, 0);
  assert.equal(agg.dist.vc.mean, null);
});

// ── finishing-allowance spelling variants (the JM tribal signal must not be undercounted) ──
test("hyphenated drawing spellings detected: PRESS-FIT and COUNTER-BORE", () => {
  const p = auditProgramParams("[BORE - PRESS-FIT CARBIDE INSERT]\n[COUNTER-BORE .500 DIA WITH RELIEF]");
  assert.equal(p.finishing.press_fit, true);
  assert.equal(p.finishing.counterbore, true);
  assert.equal(p.finishing.counterbore_relief, true);
});

test("re-machine verbs detected: REGRIND → od_grind, REHONE → id_hone", () => {
  assert.equal(auditProgramParams("[REGRIND .010 OD AFTER HEAT TREAT]").finishing.od_grind, true);
  assert.equal(auditProgramParams("[REHONE BORE TO .7505]").finishing.id_hone, true);
});

test("PHONE in a comment does NOT false-trigger id_hone", () => {
  assert.equal(auditProgramParams("[CALL SHOP PHONE EXT 12 IF UNSURE]").finishing.id_hone, false);
});

test("counterbore present WITHOUT relief → counterbore_relief AND-gate stays false", () => {
  const f = auditProgramParams("[COUNTERBORE .500 DIA X .250 DEEP]").finishing;
  assert.equal(f.counterbore, true);
  assert.equal(f.relief, false);
  assert.equal(f.counterbore_relief, false);
});

test("aggregateParamAudit fail-soft: paramless / null records are dropped, not crashed", () => {
  const good = { proper: true, errorCount: 0, params: auditProgramParams(CAPPED) };
  const agg = aggregateParamAudit([{ proper: true }, null, undefined, good]);
  assert.equal(agg.n, 1);            // only the valid record counts
  assert.equal(agg.properRate, 1);
  assert.equal(agg.finishing.any, 1);
});
