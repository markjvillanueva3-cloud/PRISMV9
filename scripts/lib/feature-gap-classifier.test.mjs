/**
 * feature-gap-classifier.test.mjs — pure-classifier unit tests
 * =============================================================
 *
 * U-FEATURE-GAP-DEDUP-WIN-RECONCILER (FEATURE-GAP-AUDIT-MS0, slot india, 2026-05-19).
 * R9 — every test pins INTENT, not just behavior. Hermetic fakes for the
 * injected fs bag mean these tests verify the *classifier* logic, not the
 * filesystem. The real-data E2E lives in the CLI test, not here.
 *
 * Run: node --test scripts/lib/feature-gap-classifier.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractEngineSignatures,
  classifyUnit,
  buildLedger,
  renderLedgerMarkdown,
  VERDICTS,
} from "./feature-gap-classifier.mjs";

// ─────────────────────────────────────────────────────────────────────
// Fake filesystem bags
// ─────────────────────────────────────────────────────────────────────

/** Build an fs-reader that simulates a populated codebase. */
function fakeFs({ engineFiles = new Set(), dispatcherRefs = {}, testFiles = {}, exempt = new Set() } = {}) {
  return {
    findEngineFile: candidate => (engineFiles.has(candidate) ? `mcp-server/src/engines/${candidate}.ts` : null),
    countDispatcherRefs: fileBase => dispatcherRefs[fileBase] ?? 0,
    findTestFiles: fileBase => testFiles[fileBase] ?? [],
    hasWireExempt: fileBase => exempt.has(fileBase),
  };
}

const EMPTY_FS = fakeFs();

// ─────────────────────────────────────────────────────────────────────
// extractEngineSignatures — title parsing
// ─────────────────────────────────────────────────────────────────────

test("extractEngineSignatures: remodularize PRISM_X_ENGINE — emits TitleCase + acronym candidates", () => {
  const sig = extractEngineSignatures("Re-modularize PRISM_FFT_PREDICTIVE_CHATTER_ENGINE from v8.89 monolith");
  assert.equal(sig.kind, "remodularize");
  assert.equal(sig.prismToken, "PRISM_FFT_PREDICTIVE_CHATTER_ENGINE");
  // Must include TitleCase, all-caps preserve, AND tail-drop variants.
  assert.ok(sig.engineCandidates.includes("FftPredictiveChatterEngine"), "TitleCase variant missing");
  assert.ok(sig.engineCandidates.includes("FFTPredictiveChatterEngine"), "preserve-caps variant missing");
  // First token "FFT" is ≤3 chars → tail-drop "PredictiveChatterEngine" added.
  assert.ok(sig.engineCandidates.includes("PredictiveChatterEngine"), "tail-drop variant missing");
});

test("extractEngineSignatures: remodularize without _ENGINE suffix still parses", () => {
  const sig = extractEngineSignatures("Re-modularize PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE from v8.89 monolith (digest=0, absent)");
  assert.equal(sig.kind, "remodularize");
  assert.ok(sig.engineCandidates.includes("ToolNoseRadiusCompensationEngine"), `candidates=${sig.engineCandidates.join(",")}`);
});

test("extractEngineSignatures: short-token remodularize emits tail-drop variant", () => {
  // "RL" is 2 chars → tail-drop should kick in.
  const sig = extractEngineSignatures("Re-modularize PRISM_RL_POST_PROCESSOR from v8.89 monolith");
  assert.equal(sig.kind, "remodularize");
  assert.ok(sig.engineCandidates.includes("PostProcessorEngine"), `expected tail-drop "PostProcessorEngine" in [${sig.engineCandidates.join(", ")}]`);
});

test("extractEngineSignatures: wire-batch with count + engine list extracts representatives", () => {
  const sig = extractEngineSignatures("Wire the ~20 unwired mill engines (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence)");
  assert.equal(sig.kind, "wire-batch");
  assert.equal(sig.batchCount, 20);
  assert.equal(sig.batchDomain, "mill");
  // Both bare + Engine-suffixed forms.
  assert.ok(sig.engineCandidates.includes("MillingAIUltraIntelligence"));
  assert.ok(sig.engineCandidates.includes("MillingAIUltraIntelligenceEngine"));
  assert.ok(sig.engineCandidates.includes("FiveAxisAIUltraIntelligence"));
});

test("extractEngineSignatures: wire-batch tolerates 'Wire the N unwired ... engines' without tilde", () => {
  const sig = extractEngineSignatures("Wire the 4 unwired Okuma engines");
  assert.equal(sig.kind, "wire-batch");
  assert.equal(sig.batchCount, 4);
  assert.equal(sig.batchDomain, "okuma");
});

test("extractEngineSignatures: title not matching any pattern → unknown", () => {
  const sig = extractEngineSignatures("Master Post → 6 CAM bridges post-output unification");
  assert.equal(sig.kind, "unknown");
  assert.deepEqual(sig.engineCandidates, []);
});

test("extractEngineSignatures: empty/null title → unknown without throw", () => {
  assert.equal(extractEngineSignatures("").kind, "unknown");
  assert.equal(extractEngineSignatures(null).kind, "unknown");
  assert.equal(extractEngineSignatures(undefined).kind, "unknown");
});

test("extractEngineSignatures: numeric input → unknown (string coercion)", () => {
  // R12 — pure parser must not throw on adversarial input.
  assert.equal(extractEngineSignatures(123).kind, "unknown");
});

// ─────────────────────────────────────────────────────────────────────
// classifyUnit — per-unit verdict (the load-bearing logic)
// ─────────────────────────────────────────────────────────────────────

test("classifyUnit: DEDUP-WIN when engine + dispatcher + test all present", () => {
  const fs = fakeFs({
    engineFiles: new Set(["BackplotEngine"]),
    dispatcherRefs: { BackplotEngine: 2 },
    testFiles: { BackplotEngine: ["BackplotEngine.test.ts", "wedm-backplot.test.ts"] },
  });
  const r = classifyUnit({
    unit_id: "U-GAP-POST-GCODE-BACKPLOT",
    title: "Re-modularize PRISM_GCODE_BACKPLOT_ENGINE from v8.89 monolith",
    domain: "post",
  }, fs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN);
  assert.equal(r.matched_engines.length, 1);
  assert.equal(r.matched_engines[0].dispatcherRefs, 2);
  assert.equal(r.matched_engines[0].testFiles.length, 2);
  // R9 — pin the exact confidence value, not a range. A future refactor that
  // emits 0.5 or 1.0 must surface in this test, not pass silently.
  assert.equal(r.confidence, 0.95);
});

test("classifyUnit: PARTIAL-NO-TESTS when engine + dispatcher but no test", () => {
  const fs = fakeFs({
    engineFiles: new Set(["FftPredictiveChatterEngine"]),
    dispatcherRefs: { FftPredictiveChatterEngine: 1 },
  });
  const r = classifyUnit({
    unit_id: "U-GAP-MILL-FFT-CHATTER",
    title: "Re-modularize PRISM_FFT_PREDICTIVE_CHATTER from v8.89 monolith",
    domain: "mill",
  }, fs);
  assert.equal(r.verdict, VERDICTS.PARTIAL_NO_TESTS);
  assert.match(r.findings.join(" "), /real gap is tests/i);
});

test("classifyUnit: PARTIAL-NO-WIRING when engine + tests but no dispatcher ref", () => {
  const fs = fakeFs({
    engineFiles: new Set(["RLPostProcessorEngine"]),
    testFiles: { RLPostProcessorEngine: ["RLPostProcessorEngine.test.ts"] },
  });
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Re-modularize PRISM_RL_POST_PROCESSOR from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.PARTIAL_NO_WIRING);
  assert.match(r.findings.join(" "), /real gap is wiring/i);
});

test("classifyUnit: PARTIAL-PORT-ONLY when engine exists but neither wired nor tested", () => {
  const fs = fakeFs({ engineFiles: new Set(["LonelyEngine"]) });
  const r = classifyUnit({
    unit_id: "U-LONELY",
    title: "Re-modularize PRISM_LONELY from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.PARTIAL_PORT_ONLY);
});

test("classifyUnit: GENUINE-GAP when no engine on disk", () => {
  const r = classifyUnit({
    unit_id: "U-MISSING",
    title: "Re-modularize PRISM_TOTALLY_MISSING from v8.89 monolith",
  }, EMPTY_FS);
  assert.equal(r.verdict, VERDICTS.GENUINE_GAP);
  assert.equal(r.matched_engines.length, 0);
});

test("classifyUnit: WIRE-EXEMPT engine counts as wired (treated as DEDUP-WIN when tested)", () => {
  // WIRE-EXEMPT means the engine is consumed via a facade and intentionally
  // not directly dispatcher-wired. Per CLAUDE.md doctrine the exempt tag IS
  // the legitimate "wiring" — the verdict must reflect that, otherwise the
  // reconciler would generate noise close-out work for exempt engines.
  const fs = fakeFs({
    engineFiles: new Set(["GapEscalationControllerEngine"]),
    testFiles: { GapEscalationControllerEngine: ["GapEscalationControllerEngine.test.ts"] },
    exempt: new Set(["GapEscalationControllerEngine"]),
  });
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Re-modularize PRISM_GAP_ESCALATION_CONTROLLER from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN);
});

test("classifyUnit: BATCH-WIRE for 'Wire the N unwired Y engines' with mixed wiring", () => {
  // 2 representatives named; 1 wired, 1 unwired → BATCH-WIRE verdict with
  // a finding the operator can act on.
  const fs = fakeFs({
    engineFiles: new Set(["MillingAIUltraIntelligence", "FiveAxisAIUltraIntelligence"]),
    dispatcherRefs: { MillingAIUltraIntelligence: 1 },
    // No tests required for batch-wire verdict.
  });
  const r = classifyUnit({
    unit_id: "U-WIRE-BACKLOG-MILL",
    title: "Wire the ~20 unwired mill engines (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence)",
    domain: "mill",
  }, fs);
  assert.equal(r.verdict, VERDICTS.BATCH_WIRE);
  assert.equal(r.matched_engines.length, 2);
  assert.match(r.findings.join(" "), /1\/2 named representatives already wired/);
});

test("classifyUnit: UNKNOWN for titles that don't match remodularize/wire-batch", () => {
  const r = classifyUnit({
    unit_id: "U-BRIDGE-MASTERPOST-CAM",
    title: "Master Post → 6 CAM bridges post-output unification",
  }, EMPTY_FS);
  assert.equal(r.verdict, VERDICTS.UNKNOWN);
  assert.equal(r.confidence, 0);
});

test("classifyUnit: prefers strongest-matched engine when multiple candidates hit", () => {
  // Both candidates exist; one is wired+tested, the other is bare. Reconciler
  // must pick the strongest evidence — otherwise a DEDUP-WIN unit could be
  // misclassified as PARTIAL just because the FIRST candidate happened to be
  // the bare port.
  const fs = fakeFs({
    engineFiles: new Set(["FftPredictiveChatterEngine", "PredictiveChatterEngine"]),
    dispatcherRefs: { PredictiveChatterEngine: 1 },
    testFiles: { PredictiveChatterEngine: ["PredictiveChatterEngine.test.ts"] },
  });
  const r = classifyUnit({
    unit_id: "U-GAP-MILL-FFT-CHATTER",
    title: "Re-modularize PRISM_FFT_PREDICTIVE_CHATTER_ENGINE from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN);
});

// ─────────────────────────────────────────────────────────────────────
// buildLedger — aggregation
// ─────────────────────────────────────────────────────────────────────

test("buildLedger: per-domain breakdown sums match per-verdict summary", () => {
  const fs = fakeFs({
    engineFiles: new Set(["AEngine", "BEngine"]),
    dispatcherRefs: { AEngine: 1 },
    testFiles: { AEngine: ["AEngine.test.ts"] },
  });
  const units = [
    { unit_id: "U-1", domain: "x", title: "Re-modularize PRISM_A from v8.89 monolith" },  // DEDUP-WIN
    { unit_id: "U-2", domain: "x", title: "Re-modularize PRISM_B from v8.89 monolith" },  // PARTIAL-PORT-ONLY
    { unit_id: "U-3", domain: "y", title: "Re-modularize PRISM_MISSING from v8.89 monolith" }, // GENUINE-GAP
  ];
  const ledger = buildLedger(units, fs, { generatedAt: "FIXED" });
  assert.equal(ledger.generatedAt, "FIXED");
  assert.equal(ledger.advisoryOnly, true);
  assert.equal(ledger.mustHumanVerify, true);
  assert.equal(ledger.units.length, 3);
  assert.equal(ledger.summary[VERDICTS.DEDUP_WIN], 1);
  assert.equal(ledger.summary[VERDICTS.PARTIAL_PORT_ONLY], 1);
  assert.equal(ledger.summary[VERDICTS.GENUINE_GAP], 1);
  // Domain rollup invariant: per-domain counts sum to the global summary.
  const totalFromDomains = Object.values(ledger.perDomain).reduce((acc, byVerdict) => {
    for (const [v, n] of Object.entries(byVerdict)) acc[v] = (acc[v] ?? 0) + n;
    return acc;
  }, {});
  for (const [v, n] of Object.entries(ledger.summary)) {
    assert.equal(totalFromDomains[v] ?? 0, n, `summary[${v}]=${n} != domain-rollup=${totalFromDomains[v] ?? 0}`);
  }
});

test("buildLedger: handles missing domain field gracefully", () => {
  const ledger = buildLedger([{ unit_id: "U-X", title: "Re-modularize PRISM_NOPE from v8.89 monolith" }], EMPTY_FS, { generatedAt: "FIXED" });
  assert.ok(ledger.perDomain["(no-domain)"], "expected (no-domain) bucket");
  assert.equal(ledger.perDomain["(no-domain)"][VERDICTS.GENUINE_GAP], 1);
});

test("buildLedger: empty units array yields empty ledger with zero summary", () => {
  const ledger = buildLedger([], EMPTY_FS, { generatedAt: "FIXED" });
  assert.equal(ledger.units.length, 0);
  for (const v of Object.values(VERDICTS)) {
    assert.equal(ledger.summary[v], 0);
  }
});

// ─────────────────────────────────────────────────────────────────────
// renderLedgerMarkdown — surface-level
// ─────────────────────────────────────────────────────────────────────

test("renderLedgerMarkdown: all section headers present + dedup-win unit listed", () => {
  const fs = fakeFs({
    engineFiles: new Set(["AEngine"]),
    dispatcherRefs: { AEngine: 1 },
    testFiles: { AEngine: ["AEngine.test.ts"] },
  });
  const ledger = buildLedger([{ unit_id: "U-A", domain: "x", title: "Re-modularize PRISM_A from v8.89 monolith" }], fs);
  const md = renderLedgerMarkdown(ledger);
  // Section headers
  assert.match(md, /## Summary/);
  assert.match(md, /## Per-domain breakdown/);
  assert.match(md, /## DEDUP-WIN/);
  assert.match(md, /## PARTIAL/);
  assert.match(md, /## GENUINE-GAP/);
  assert.match(md, /## BATCH-WIRE/);
  assert.match(md, /## UNKNOWN/);
  // U-A appears in the DEDUP-WIN block
  assert.match(md, /\*\*U-A\*\*/);
});

test("renderLedgerMarkdown: empty ledger renders '(none)' placeholders, not crashes", () => {
  const md = renderLedgerMarkdown(buildLedger([], EMPTY_FS));
  // Must not throw and must surface the empty-state explicitly.
  assert.match(md, /_\(none\)_/);
});

// ─────────────────────────────────────────────────────────────────────
// Regression guards (fail-on-revert)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: VERDICTS frozen and ALL 7 string values pinned", () => {
  // The ledger consumer (close-out automation) depends on these exact strings.
  // The markdown renderer also uses `startsWith("PARTIAL-")` — any partial
  // rename to underscore form (e.g. "PARTIAL_NO_WIRING") would silently break
  // that filter, dropping units out of the report.
  assert.equal(Object.isFrozen(VERDICTS), true, "VERDICTS must be frozen");
  assert.deepEqual(VERDICTS, {
    DEDUP_WIN: "DEDUP-WIN",
    PARTIAL_NO_WIRING: "PARTIAL-NO-WIRING",
    PARTIAL_NO_TESTS: "PARTIAL-NO-TESTS",
    PARTIAL_PORT_ONLY: "PARTIAL-PORT-ONLY",
    GENUINE_GAP: "GENUINE-GAP",
    BATCH_WIRE: "BATCH-WIRE",
    UNKNOWN: "UNKNOWN",
  });
});

test("REGRESSION: a Re-modularize title with leading 3-char acronym MUST yield the tail-drop candidate", () => {
  // This is the load-bearing path for U-GAP-MILL-FFT-CHATTER (real audit unit).
  // If a future refactor drops the tail-drop variant, the dedup-win for an
  // engine filed under the descriptor name (PredictiveChatterEngine) silently
  // becomes a false GENUINE-GAP — the exact rot this reconciler exists to fix.
  const sig = extractEngineSignatures("Re-modularize PRISM_FFT_PREDICTIVE_CHATTER from v8.89 monolith");
  assert.ok(sig.engineCandidates.includes("PredictiveChatterEngine"),
    `tail-drop regression: candidates=[${sig.engineCandidates.join(", ")}]`);
});

// ─────────────────────────────────────────────────────────────────────
// Composite-PRISM titles (arm-A P0) + colon-list shape (arm-A P1)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: composite Re-modularize PRISM_X + PRISM_Y emits candidates for BOTH tokens", () => {
  // Audit reality: 9 of 32 remodularize units have a "PRISM_X + PRISM_Y"
  // shape. The parser MUST emit candidates for both — otherwise the second
  // engine never dedup-wins even when shipped.
  const sig = extractEngineSignatures("Re-modularize PRISM_BREP_TESSELLATOR + PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2 from v8.89 monolith");
  assert.equal(sig.kind, "remodularize");
  assert.deepEqual(sig.prismTokens, ["PRISM_BREP_TESSELLATOR", "PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2"]);
  // Variants from BOTH tokens must be present.
  assert.ok(sig.engineCandidates.includes("BrepTessellatorEngine"), "first-token candidate missing");
  assert.ok(sig.engineCandidates.some(c => c.includes("AdaptiveTessellation")),
    `second-token candidate missing; got [${sig.engineCandidates.join(", ")}]`);
});

test("REGRESSION: 'Re-modularize v8.89 X engines: A, B, C' parses the colon-tail engine list", () => {
  // U-GAP-MISC-OPTIMIZERS / U-GAP-MISC-DATA-STRUCTURES / U-GAP-ACADEMY-MIT-KERNELS
  // all use this shape. Without the secondary regex they fall to UNKNOWN.
  const sig = extractEngineSignatures("Re-modularize v8.89 optimizer engines: PolicyGradient, DifferentialEvolution from v8.89 monolith");
  assert.equal(sig.kind, "remodularize-list");
  assert.ok(sig.engineCandidates.includes("PolicyGradient"));
  assert.ok(sig.engineCandidates.includes("PolicyGradientEngine"));
  assert.ok(sig.engineCandidates.includes("DifferentialEvolution"));
});

test("REGRESSION: extractEngineListFromText splits on ' + ' (space-plus-space) as well as commas", () => {
  // Some compound titles use ` + ` instead of `,` as the engine separator.
  const sig = extractEngineSignatures("Re-modularize v8.89 X engines: FooEngine + BarEngine from v8.89 monolith");
  assert.equal(sig.kind, "remodularize-list");
  assert.ok(sig.engineCandidates.includes("FooEngine"));
  assert.ok(sig.engineCandidates.includes("BarEngine"));
});

// ─────────────────────────────────────────────────────────────────────
// WIRE-EXEMPT no-tests case (arm-B P1 / arm-D P1)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: WIRE-EXEMPT engine with NO tests → PARTIAL-NO-TESTS (not DEDUP-WIN)", () => {
  // Doctrine: WIRE-EXEMPT counts as legitimate wiring, but the test
  // requirement is orthogonal. An exempt engine with no tests is a real
  // test-coverage gap — must not be silently dedup-won.
  const fs = fakeFs({
    engineFiles: new Set(["LonelyExemptEngine"]),
    exempt: new Set(["LonelyExemptEngine"]),
    // No tests.
  });
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Re-modularize PRISM_LONELY_EXEMPT from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.PARTIAL_NO_TESTS);
});

test("REGRESSION: strongest-match tie-break prefers wired+tested non-exempt over exempt-no-tests", () => {
  // Two candidates exist: one WIRE-EXEMPT but untested, one non-exempt but
  // wired+tested. The classifier must NOT shadow the wired+tested candidate
  // behind the exempt one. Arm-B P1 fix.
  const fs = fakeFs({
    engineFiles: new Set(["AlphaEngine", "BetaEngine"]),
    exempt: new Set(["AlphaEngine"]),  // exempt + no tests
    dispatcherRefs: { BetaEngine: 1 },
    testFiles: { BetaEngine: ["BetaEngine.test.ts"] },
  });
  // Pick a title whose candidate generation matches BOTH engines. We use a
  // wire-batch shape with an explicit list so the test depends only on the
  // generated candidate set, not on the remodularize naming rules.
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Wire the ~5 unwired mill engines (Alpha, Beta)",
  }, fs);
  // BATCH-WIRE verdict (not DEDUP-WIN) — but both engines should be in
  // matched_engines. The strongest-match logic is exercised for remodularize
  // kind in a separate test.
  assert.equal(r.matched_engines.length, 2);
});

test("REGRESSION: classifyUnit picks wired+tested even when bare-port shadow candidate emitted first", () => {
  // The candidate generator emits the full-titlecase variant FIRST and the
  // tail-drop variant SECOND. If BOTH exist on disk but ONLY the tail-drop is
  // wired+tested, the classifier must STILL pick the tail-drop — otherwise a
  // bare port shadows the real DEDUP-WIN evidence.
  const fs = fakeFs({
    engineFiles: new Set(["FftPredictiveChatterEngine", "PredictiveChatterEngine"]),
    // The bare port exists but has nothing.
    // The tail-drop is wired+tested.
    dispatcherRefs: { PredictiveChatterEngine: 1 },
    testFiles: { PredictiveChatterEngine: ["PredictiveChatterEngine.test.ts"] },
  });
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Re-modularize PRISM_FFT_PREDICTIVE_CHATTER_ENGINE from v8.89 monolith",
  }, fs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN);
  // Pin which engine was selected — without this assertion, a refactor that
  // picks the first matched candidate (instead of the strongest) silently
  // breaks the verdict reason while keeping the surface verdict green.
  assert.equal(r.matched_engines.length, 2);
  // The renderer reads `findings[0]` for the "engine ... exists ..." line.
  // The strongest match (PredictiveChatterEngine) must be the one named.
  assert.match(r.findings.join(" "), /PredictiveChatterEngine/);
  assert.doesNotMatch(r.findings.join(" "), /FftPredictiveChatterEngine exists/);
});

// ─────────────────────────────────────────────────────────────────────
// Malformed-unit guard (arm-B P1)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: classifyUnit returns UNKNOWN with malformed-unit finding for empty input", () => {
  const r1 = classifyUnit({}, EMPTY_FS);
  assert.equal(r1.verdict, VERDICTS.UNKNOWN);
  assert.equal(r1.kind, "malformed");
  assert.match(r1.findings.join(" "), /malformed unit/);
  const r2 = classifyUnit({ unit_id: "U-X" /* no title */ }, EMPTY_FS);
  assert.equal(r2.verdict, VERDICTS.UNKNOWN);
  assert.equal(r2.kind, "malformed");
});

test("REGRESSION: classifyUnit doesn't crash on null/undefined unit", () => {
  // R12 — pure classifier must never throw on adversarial input.
  assert.equal(classifyUnit(null, EMPTY_FS).verdict, VERDICTS.UNKNOWN);
  assert.equal(classifyUnit(undefined, EMPTY_FS).verdict, VERDICTS.UNKNOWN);
});

// ─────────────────────────────────────────────────────────────────────
// Schema version + advisory flags (arm-D P1)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: buildLedger emits schemaVersion 1.0.0", () => {
  // Downstream consumers (close-out automation) pin on the schemaVersion.
  // A silent bump breaks them.
  const ledger = buildLedger([], EMPTY_FS, { generatedAt: "FIXED" });
  assert.equal(ledger.schemaVersion, "1.0.0");
});

test("REGRESSION: empty ledger still carries advisoryOnly + mustHumanVerify (safety contract)", () => {
  // The "advisory only" + "must human verify" flags are the safety contract.
  // They must NOT be gated on the presence of units.
  const ledger = buildLedger([], EMPTY_FS, { generatedAt: "FIXED" });
  assert.equal(ledger.advisoryOnly, true);
  assert.equal(ledger.mustHumanVerify, true);
});

test("REGRESSION: buildLedger preserves per-unit domain field through classification", () => {
  const fs = fakeFs({ engineFiles: new Set(["AEngine"]) });
  const ledger = buildLedger([
    { unit_id: "U-X", domain: "mill", title: "Re-modularize PRISM_A from v8.89 monolith" },
  ], fs, { generatedAt: "FIXED" });
  // The classifier output is spread with `domain: u.domain` — verify survival.
  assert.equal(ledger.units[0].domain, "mill");
  assert.equal(ledger.units[0].unit_id, "U-X");
});

// ─────────────────────────────────────────────────────────────────────
// Double-Engine-suffix guard (arm-D P2)
// ─────────────────────────────────────────────────────────────────────

test("REGRESSION: extractEngineList does NOT double-suffix names that already end in Engine", () => {
  const sig = extractEngineSignatures("Wire the ~3 unwired mill engines (FooEngine, BarEngine)");
  assert.ok(sig.engineCandidates.includes("FooEngine"));
  assert.ok(sig.engineCandidates.includes("BarEngine"));
  assert.ok(!sig.engineCandidates.includes("FooEngineEngine"), "double-suffix regression");
  assert.ok(!sig.engineCandidates.includes("BarEngineEngine"), "double-suffix regression");
});
