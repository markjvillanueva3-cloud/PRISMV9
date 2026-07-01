#!/usr/bin/env node
/**
 * Tests for quoting-baseline-guard.mjs (QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD).
 * node:test — real assertions (machine-name TP/TN, degeneracy fingerprints,
 * validateBaseline gate, and a real-file invariant oracle). Run:
 *   node --test scripts/lib/quoting-baseline-guard.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isMachineNameCustomer,
  detectDegeneracy,
  validateBaseline,
  MACHINE_BUILDERS,
  MODEL_FAMILY_TOKENS,
} from "./quoting-baseline-guard.mjs";

// ---------------------------------------------------------------------------
// isMachineNameCustomer — TRUE POSITIVES (the exact poisoning found 2026-06-01)
// ---------------------------------------------------------------------------
test("machine-name TP: the 7 Okuma models that poisoned the baseline", () => {
  for (const m of [
    "Okuma_Multus_B250II",
    "Okuma_LB-3000EX-BigBore",
    "Okuma_LB-3000EX_II",
    "Okuma_LB-3000EX",
    "Okuma_LNC8",
    "Okuma_GENOS_L200E-M",
    "Okuma_GENOS_L300-M",
  ]) {
    assert.equal(isMachineNameCustomer(m), true, `should flag machine: ${m}`);
  }
});

test("machine-name TP: other builders + model evidence", () => {
  for (const m of [
    "Mazak_Integrex_i200",
    "Mazak QuickTurn 250",
    "Haas_VF2",
    "Haas VF-4SS",
    "DMG_MORI_NLX2500",
    "Doosan_Puma_2600",
    "Makino_a51nx",
    "Brother_Speedio_S700X1",
  ]) {
    assert.equal(isMachineNameCustomer(m), true, `should flag machine: ${m}`);
  }
});

test("machine-name TP: standalone unambiguous model-family token", () => {
  assert.equal(isMachineNameCustomer("MULTUS"), true);
  assert.equal(isMachineNameCustomer("Integrex"), true);
  assert.equal(isMachineNameCustomer("robodrill"), true);
});

// ---------------------------------------------------------------------------
// isMachineNameCustomer — TRUE NEGATIVES (real JM customers + cost vendors)
// ---------------------------------------------------------------------------
test("machine-name TN: real JM Die customers are NOT machines", () => {
  for (const c of [
    "ITW",
    "Alcoa",
    "Optimas",
    "SFS",
    "Holo-Krome",
    "ACME",
    "ADDISON",
    "ACCURATE THREADED",
    "ACUMENT GLOBAL TECHNOLOGIES",
    "AAAMECONINGPIN", // OCR-mangled real customer
    "AAFAS",
  ]) {
    assert.equal(isMachineNameCustomer(c), false, `must NOT flag customer: ${c}`);
  }
});

test("machine-name TN: cutting-tool / material cost vendors are NOT builders", () => {
  // these are legitimate quoting COST vendors — never in MACHINE_BUILDERS
  for (const v of [
    "Sandvik Coromant",
    "Kennametal",
    "Iscar",
    "Mitsubishi Materials", // builder-adjacent name but NOT a CNC builder token
    "3M Abrasive Systems",
    "Blaser Swisslube",
    "Michigan Carbide",
  ]) {
    assert.equal(isMachineNameCustomer(v), false, `must NOT flag cost vendor: ${v}`);
  }
});

test("machine-name TN: model-number alone (no builder) is NOT a machine — double-gate", () => {
  // a real customer/part token with digits must not trip the filter without a builder
  assert.equal(isMachineNameCustomer("PART123 INC"), false);
  assert.equal(isMachineNameCustomer("A0763-99-12"), false);
  assert.equal(isMachineNameCustomer("3D Systems"), false);
});

test("machine-name TN (P1-B): builder-WORD + ordinal/unit must NOT flag a real customer", () => {
  // these contain a builder TOKEN (brother/spinner/feeler) AND an ordinal/dimension
  // token — the pre-fix regex wrongly flagged them and silently dropped the record.
  for (const c of [
    "Brother's Machine Shop 2nd Ave",
    "Spinner Industries 3rd Floor",
    "Feeler Tool 1st St",
    "Brother International 10mm Division",
    "Goodway 2x Plant",
  ]) {
    assert.equal(isMachineNameCustomer(c), false, `must NOT flag real customer: ${c}`);
  }
  // but a genuine Haas super-speed model code (4ss) is still caught (TP preserved)
  assert.equal(isMachineNameCustomer("Haas VF-4SS"), true);
});

test("machine-name TN (reviewer-B P1): ambiguous-builder WORD + cert/product token must NOT flag", () => {
  // brother/citizen/goodway/grob/spinner/feeler are real CNC builders AND common
  // company words. A real customer with one + a cert/product alnum token (AS9100,
  // i9, G5, B2B) must NOT be flagged (silently dropping it is the cardinal sin).
  for (const c of [
    "Brother AS9100",
    "Brother ISO9001 Certified",
    "Citizen i9 Systems",
    "Spinner B2B",
    "Goodway G5 Corp",
    "Grob Systems",
    "Feeler ISO9001",
    "Brother Industries",
    "Citizen Watch",
  ]) {
    assert.equal(isMachineNameCustomer(c), false, `must NOT flag ambiguous-builder customer: ${c}`);
  }
  // but an ambiguous builder + a genuine model-FAMILY token still flags (TP preserved)
  assert.equal(isMachineNameCustomer("Brother Speedio S700X1"), true);
});

test("machine-name edge cases: empty / null / non-string", () => {
  assert.equal(isMachineNameCustomer(""), false);
  assert.equal(isMachineNameCustomer("   "), false);
  assert.equal(isMachineNameCustomer(null), false);
  assert.equal(isMachineNameCustomer(undefined), false);
  assert.equal(isMachineNameCustomer(12345), false);
  assert.equal(isMachineNameCustomer({}), false);
});

test("MACHINE_BUILDERS excludes cost-vendor brands (conservative invariant)", () => {
  for (const notBuilder of ["sandvik", "kennametal", "iscar", "mitsubishi", "walter", "seco"]) {
    assert.equal(MACHINE_BUILDERS.has(notBuilder), false, `${notBuilder} must not be a builder`);
  }
  assert.equal(MACHINE_BUILDERS.has("okuma"), true);
  assert.ok(MODEL_FAMILY_TOKENS.has("multus"));
});

// ---------------------------------------------------------------------------
// detectDegeneracy
// ---------------------------------------------------------------------------
const degenRec = {
  customer: "Okuma_Multus_B250II",
  actual_revenue_usd: 10,
  estimated_time_in_cut_s: 600,
  machine_rate_usd_per_hr: 95,
  estimated_material_spend_usd: 60,
  machine_class: "mill",
};

function cleanFixture() {
  // varied customers + varied revenue — a realistic healthy baseline
  return [
    { customer: "ITW", actual_revenue_usd: 1240, machine_class: "mill" },
    { customer: "Alcoa", actual_revenue_usd: 880, machine_class: "lathe" },
    { customer: "Holo-Krome", actual_revenue_usd: 2310, machine_class: "wire-edm" },
    { customer: "SFS", actual_revenue_usd: 560, machine_class: "mill" },
    { customer: "Optimas", actual_revenue_usd: 1990, machine_class: "lathe" },
    { customer: "ACME", actual_revenue_usd: 705, machine_class: "grinder" },
  ];
}

test("detectDegeneracy: fully degenerate set flags machine + constant-revenue", () => {
  const recs = Array.from({ length: 10 }, () => ({ ...degenRec }));
  const d = detectDegeneracy(recs);
  assert.equal(d.total, 10);
  assert.equal(d.machineNameCount, 10);
  assert.equal(d.revenueUniqueValues, 1);
  assert.ok(d.flags.some((f) => f.startsWith("machine_name_customers")));
  assert.ok(d.flags.some((f) => f.startsWith("constant_revenue")));
});

test("detectDegeneracy: clean set raises NO flags", () => {
  const d = detectDegeneracy(cleanFixture());
  assert.deepEqual(d.flags, []);
  assert.equal(d.machineNameCount, 0);
  assert.ok(d.revenueUniqueValues >= 5);
});

test("detectDegeneracy: tiny set below minRecords is never flagged", () => {
  const recs = [{ ...degenRec }, { ...degenRec }]; // 2 < default minRecords=5
  const d = detectDegeneracy(recs);
  assert.equal(d.machineNameCount, 2);
  assert.deepEqual(d.flags, []); // gated — too small to judge
});

test("detectDegeneracy (reviewer-B P1-#2): builder-word prevalence catches bare-number models w/ VARIED revenue", () => {
  // "Haas 2600" (builder + bare number, no family token) slips the per-name filter...
  assert.equal(isMachineNameCustomer("Haas 2600"), false);
  // ...but a baseline dominated by builder-word customers is refused via prevalence,
  // even when revenue is VARIED (constant_revenue does NOT fire here).
  const recs = Array.from({ length: 12 }, (_, i) => ({
    customer: `Haas ${2600 + i * 10}`,
    actual_revenue_usd: 800 + i * 137,
  }));
  const d = detectDegeneracy(recs);
  assert.ok(d.builderWordShare > 0.9, `builderWordShare=${d.builderWordShare}`);
  assert.equal(d.revenueUniqueValues, 12); // revenue genuinely varied
  assert.ok(d.flags.some((f) => f.startsWith("machine_builder_word_prevalence")));
  assert.equal(validateBaseline(recs).refuse, true);
});

test("detectDegeneracy (reviewer-B P2): ambiguous-builder-WORD-heavy REAL baseline is NOT falsely refused", () => {
  // a diverse real customer list heavy in common English words that happen to be
  // ambiguous builders (Goodway Technologies, Brother Industries, Citizen Watch) —
  // with NO model token and varied revenue — must pass (prevalence excludes them).
  const recs = [
    { customer: "Goodway Technologies", actual_revenue_usd: 1450 },
    { customer: "Brother Industries", actual_revenue_usd: 920 },
    { customer: "Citizen Watch Co", actual_revenue_usd: 2110 },
    { customer: "Spinner GmbH", actual_revenue_usd: 640 },
    { customer: "ITW Fasteners", actual_revenue_usd: 1830 },
    { customer: "Alcoa", actual_revenue_usd: 770 },
    { customer: "Holo-Krome", actual_revenue_usd: 1290 },
  ];
  const d = detectDegeneracy(recs);
  assert.equal(d.builderWordCount, 0, "ambiguous-word-only customers must NOT count toward prevalence");
  assert.deepEqual(d.flags, []);
  assert.equal(validateBaseline(recs).ok, true);
});

test("detectDegeneracy: near-constant revenue flag (>=90% one value)", () => {
  const recs = [
    ...Array.from({ length: 9 }, (_, i) => ({ customer: `Cust${i}`, actual_revenue_usd: 500 })),
    { customer: "CustX", actual_revenue_usd: 999 },
  ];
  const d = detectDegeneracy(recs);
  assert.ok(d.flags.some((f) => f.startsWith("near_constant_revenue")));
});

// ---------------------------------------------------------------------------
// validateBaseline — the gate
// ---------------------------------------------------------------------------
test("validateBaseline: degenerate baseline => refuse, ok=false, clean_count=0", () => {
  const recs = Array.from({ length: 10 }, () => ({ ...degenRec }));
  const res = validateBaseline(recs);
  assert.equal(res.refuse, true);
  assert.equal(res.ok, false);
  assert.equal(res.poisoned, 10);
  assert.equal(res.clean_count, 0);
  assert.ok(res.reasons.length >= 2);
});

test("validateBaseline: clean baseline => ok=true, refuse=false", () => {
  const res = validateBaseline(cleanFixture());
  assert.equal(res.ok, true);
  assert.equal(res.refuse, false);
  assert.equal(res.poisoned, 0);
  assert.equal(res.clean_count, 6);
  assert.deepEqual(res.reasons, []);
});

test("validateBaseline: partial poisoning filters machine rows into clean_records", () => {
  const recs = [
    ...cleanFixture(), // 6 clean, varied revenue
    { ...degenRec, actual_revenue_usd: 11 },
    { ...degenRec, customer: "Mazak_Integrex_i200", actual_revenue_usd: 12 },
    { ...degenRec, customer: "Haas_VF2", actual_revenue_usd: 13 },
  ]; // 9 total, 3 machine => 33% > 20% => machine flag fires
  const res = validateBaseline(recs);
  assert.equal(res.poisoned, 3);
  assert.equal(res.clean_count, 6);
  assert.equal(res.refuse, true); // machine share over threshold
  assert.ok(res.clean_records.every((r) => !isMachineNameCustomer(r.customer)));
});

test("validateBaseline: empty baseline => ok (train-cycle owns the 0-record reject)", () => {
  const res = validateBaseline([]);
  assert.equal(res.ok, true);
  assert.equal(res.total, 0);
  assert.deepEqual(res.reasons, []);
});

test("validateBaseline: non-array input is fail-soft", () => {
  for (const bad of [null, undefined, {}, "x", 42]) {
    const res = validateBaseline(bad);
    assert.equal(res.ok, true);
    assert.equal(res.total, 0);
  }
});

test("P1-A backstop: machine names that slip the per-name filter are STILL refused", () => {
  // "Haas VF-2" (hyphen + single-digit model) is a KNOWN per-name false-negative
  // (deliberate conservatism boundary). Confirm it slips the name filter...
  assert.equal(isMachineNameCustomer("Haas VF-2"), false);
  // ...but a baseline seeded with it is still refused via the degeneracy backstop
  // (constant_revenue), so the gate's job is not defeated by the per-name gap.
  const slipped = Array.from({ length: 10 }, () => ({
    customer: "Haas VF-2",
    actual_revenue_usd: 10,
  }));
  const res = validateBaseline(slipped);
  assert.equal(res.refuse, true);
  assert.ok(res.reasons.some((r) => r.startsWith("constant_revenue")));
});

// ---------------------------------------------------------------------------
// U-QP-GUARD-VOLUME-AND-SYNTH — high-volume admit + synthetic-revenue advisory
// ---------------------------------------------------------------------------

// Build a parameterizable corpus. Real-shaped customer names (no builder token).
// markupJitter>0 widens realized markup (real shops scatter); distinctTimes sets
// how quantized the cost-input grid is (real cut-times are ~continuous).
function corpus({ n = 200, nCust = 50, markup = 1.4, markupJitter = 0, distinctTimes = 4 } = {}) {
  const rates = [85, 95, 110];
  const mats = [40, 60, 80];
  const recs = [];
  for (let i = 0; i < n; i++) {
    const t = 120 + (i % distinctTimes) * 137; // `distinctTimes` distinct values
    const rate = rates[i % rates.length];
    const mat = mats[i % mats.length];
    const cost = rate * (t / 3600) + mat;
    const m = markupJitter ? markup * (1 + (((i % 11) - 5) / 5) * markupJitter) : markup;
    recs.push({
      customer: `RealCo ${i % nCust}`,
      part_id: `P${i}`,
      actual_revenue_usd: +(cost * m).toFixed(2),
      estimated_time_in_cut_s: t,
      machine_rate_usd_per_hr: rate,
      estimated_material_spend_usd: mat,
    });
  }
  return recs;
}

test("U-VOLUME: high-volume corpus (low ratio, many distinct customers) is ADMITTED, not low_unique-refused", () => {
  // 5000 records / 474 distinct => 9.48% ratio < 10% — the OLD ratio-only test FALSE-refused this.
  const recs = corpus({ n: 5000, nCust: 474, markupJitter: 0.6, distinctTimes: 60 });
  const d = detectDegeneracy(recs);
  assert.ok(d.uniqueRatio < 0.1, `ratio must be < 10% to exercise the bug, got ${d.uniqueRatio}`);
  assert.equal(d.uniqueCustomers, 474);
  assert.equal(
    d.flags.some((f) => f.startsWith("low_unique_customers")),
    false,
    "high-volume corpus with 474 distinct customers must NOT trip low_unique",
  );
});

test("U-VOLUME: low_unique STILL fires on genuine collapse (<8 distinct) with varied revenue", () => {
  // 5 distinct customers across 100 records, varied revenue + continuous times so ONLY
  // low_unique can fire (no machine / constant / synthetic co-flag) — proves the fix
  // did not gut the degenerate-collapse catch.
  const recs = corpus({ n: 100, nCust: 5, markupJitter: 0.6, distinctTimes: 50 });
  const d = detectDegeneracy(recs);
  assert.equal(d.uniqueCustomers, 5);
  assert.ok(d.flags.some((f) => f.startsWith("low_unique_customers")), "5 distinct < 8 floor must fire");
  const res = validateBaseline(recs);
  assert.equal(res.refuse, true);
  assert.equal(res.reasons.length, 1, "only low_unique should fire");
});

test("U-SYNTH: synthetic corpus (fixed markup + quantized times) WARNS but does NOT refuse", () => {
  const recs = corpus({ n: 200, nCust: 50, markup: 1.4, markupJitter: 0, distinctTimes: 4 });
  const d = detectDegeneracy(recs);
  assert.ok(d.syntheticMarkupCoV < 0.15, `markup CoV should be ~0, got ${d.syntheticMarkupCoV}`);
  assert.ok(d.distinctTimeInCut < 10, `distinct times should be 4, got ${d.distinctTimeInCut}`);
  assert.ok(
    d.warnings.some((w) => w.startsWith("synthetic_revenue_dominant")),
    "fixed-markup + quantized-input corpus must raise synthetic warning",
  );
  // ADVISORY: it must NOT cause a refuse, and the synthetic note must NOT be in reasons.
  assert.deepEqual(d.flags, [], "synthetic corpus has no degeneracy FLAGS (real customers, varied revenue)");
  const res = validateBaseline(recs);
  assert.equal(res.refuse, false, "synthetic dominance is advisory, never a refuse");
  assert.equal(res.ok, true);
  assert.ok(res.warnings.some((w) => w.startsWith("synthetic_revenue_dominant")));
  assert.equal(res.reasons.some((r) => r.includes("synthetic")), false, "synthetic must not be a refuse reason");
});

test("U-SYNTH negative #1: VARIED markup (real margins) does NOT warn even if times are coarse", () => {
  const recs = corpus({ n: 200, nCust: 50, markup: 1.4, markupJitter: 0.6, distinctTimes: 4 });
  const d = detectDegeneracy(recs);
  assert.ok(d.syntheticMarkupCoV > 0.15, `varied markup must lift CoV > 0.15, got ${d.syntheticMarkupCoV}`);
  assert.equal(d.distinctTimeInCut, 4);
  assert.equal(
    d.warnings.some((w) => w.startsWith("synthetic_revenue_dominant")),
    false,
    "the markup-CoV arm must veto a synthetic warning when margins genuinely scatter",
  );
});

test("U-SYNTH negative #2: continuous cut-times does NOT warn even if markup is disciplined", () => {
  const recs = corpus({ n: 200, nCust: 50, markup: 1.4, markupJitter: 0, distinctTimes: 60 });
  const d = detectDegeneracy(recs);
  assert.ok(d.syntheticMarkupCoV < 0.15, "markup is fixed here");
  assert.ok(d.distinctTimeInCut >= 10, `continuous times must clear the floor, got ${d.distinctTimeInCut}`);
  assert.equal(
    d.warnings.some((w) => w.startsWith("synthetic_revenue_dominant")),
    false,
    "the time-quantization arm must veto a synthetic warning when cut-times are continuous",
  );
});

test("U-SYNTH: below minScorableForSynth (too few scorable records) raises no synthetic warning", () => {
  const recs = corpus({ n: 10, nCust: 10, markup: 1.4, markupJitter: 0, distinctTimes: 4 });
  const d = detectDegeneracy(recs);
  assert.ok(d.scorableForSynth < 20);
  assert.deepEqual(d.warnings, [], "too few scorable records to judge synthetic dominance");
});

test("U-SYNTH: records lacking cost inputs are not scorable (no false synthetic warning)", () => {
  // cleanFixture has no time/rate/material fields -> scorableForSynth 0 -> no warning.
  const d = detectDegeneracy(cleanFixture());
  assert.equal(d.scorableForSynth, 0);
  assert.deepEqual(d.warnings, []);
});

test("U-SYNTH (3-of-3 P2): negative-revenue rows (credit memos) are excluded — no nonsensical advisory", () => {
  // 25 records, quantized times, but NEGATIVE outbound revenue (refund/credit-memo shape).
  // Pre-fix these left markupMean<0, the variance branch was skipped, CoV stayed at its
  // init 0 (< 0.15), and synthetic_revenue_dominant fired with "markup mean -1.40x". The
  // fix excludes non-positive markups from the population entirely.
  const recs = corpus({ n: 25, nCust: 12, markup: 1.4, distinctTimes: 4 }).map((r) => ({
    ...r,
    actual_revenue_usd: -r.actual_revenue_usd,
  }));
  const d = detectDegeneracy(recs);
  assert.equal(d.scorableForSynth, 0, "negative-markup rows must be excluded from the synthetic population");
  assert.deepEqual(d.warnings, [], "no synthetic advisory when markup is not a positive multiple");
  assert.equal(validateBaseline(recs).warnings.length, 0);
});

// Real-corpus oracle: the actual 47,905-record with-real corpus MUST be admitted
// (the false-refuse fix) AND carry the synthetic_revenue_dominant warning (match_pct=0).
// Skip-safe: parses ~18MB only if present on this host.
test("real corpus baseline-records-corpus-with-real.json: admitted + synthetic-flagged (invariant)", () => {
  const candidates = [
    "H:/prism/state/shared/quoting/baseline-records-corpus-with-real.json",
    "H:/prism-slot-charlie/state/shared/quoting/baseline-records-corpus-with-real.json",
  ];
  let payload = null;
  for (const p of candidates) {
    try {
      payload = JSON.parse(readFileSync(p, "utf8"));
      break;
    } catch {
      /* try next */
    }
  }
  if (!payload) return; // absent on this host — skip, not a failure
  const recs = Array.isArray(payload.records) ? payload.records : [];
  if (recs.length < 1000) return; // not the big corpus — skip
  const res = validateBaseline(recs);
  // The fix: a 474-distinct-customer corpus must NOT be refused for low_unique.
  assert.equal(
    res.reasons.some((r) => r.startsWith("low_unique_customers")),
    false,
    "high-volume real corpus must not be low_unique-refused",
  );
  assert.equal(res.refuse, false, "the real corpus is admissible (real customers, varied revenue)");
  // And it IS synthetic (overlay_report.match_pct=0) — the advisory must fire.
  assert.ok(
    res.warnings.some((w) => w.startsWith("synthetic_revenue_dominant")),
    "the all-synthetic corpus must carry the advisory warning",
  );
});

// ---------------------------------------------------------------------------
// Real-file invariant oracle — true in BOTH degenerate and fixed states.
// (Documents the 2026-06-01 finding without breaking once the baseline is fixed.)
// ---------------------------------------------------------------------------
test("real baseline-records.json: degenerate => refuse, clean => ok (invariant)", () => {
  const candidates = [
    "H:/prism/state/shared/quoting/baseline-records.json",
    "H:/prism-slot-charlie/state/shared/quoting/baseline-records.json",
  ];
  let payload = null;
  for (const p of candidates) {
    try {
      payload = JSON.parse(readFileSync(p, "utf8"));
      break;
    } catch {
      /* try next */
    }
  }
  if (!payload) return; // file absent on this host — skip, not a failure
  const recs = Array.isArray(payload.records) ? payload.records : [];
  if (recs.length === 0) return;
  const res = validateBaseline(recs);
  // consistency invariants — always hold
  assert.equal(res.ok, !res.refuse);
  assert.equal(res.refuse, res.reasons.length > 0);
  // degeneracy invariant — a constant-revenue OR machine-heavy baseline MUST refuse
  const constRev = res.degeneracy.revenueUniqueValues <= 1;
  const machineHeavy = res.degeneracy.machineNameShare > 0.2;
  if (recs.length >= 5 && (constRev || machineHeavy)) {
    assert.equal(res.refuse, true, "degenerate production baseline must be refused");
  }
});
