// Tests for the AI-systems-synergy goal gate (the deterministic loss function for the
// recurring "improve ai systems across all galaxies" /goal). R9: every assertion encodes
// WHY a leg passes/fails. Mostly pure -- injected payloads, no filesystem -- EXCEPT the
// two wiring tests at the bottom (disk-path freshness E2E via ARTIFACTS redirection +
// env-knob subprocess probe): the pure core alone cannot pin the load-bearing
// runGateFromDisk enforcement line (scrutiny P1 2026-06-12, the fake-reader lesson).
// Variability: happy + >=3 failure modes + >=2 adversarial.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import {
  evalLegA,
  evalLegB,
  evalLegC,
  evalLegD,
  evalGoalGate,
  runGateFromDisk,
  ARTIFACTS,
  GNN_AUROC_FLOOR,
  LORA_READY_FLOOR,
  CAG_COVERAGE_FLOOR,
} from "./ai-systems-synergy-goal-gate.mjs";

// reference fixtures mirroring the REAL artifact shapes (2026-06-11 live)
const auditPass = { galaxies: Array.from({ length: 34 }, (_, i) => ({ galaxy: `g${i}`, score: 1 })), gaps: [] };
const loraPass = Array.from({ length: 1138 }, (_, i) => JSON.stringify({ galaxy: `g${i % 34}`, instruction: "x", output: "y" })).join("\n");
// Real NN-EVAL shape: metrics.auroc + selective.curve[].{brierClears,macroF1Clears}; full-coverage grade.pass=false.
const nnEvalPass = {
  metrics: { auroc: 0.8084, macroF1: 0.4389, brier: 0.179 },
  grade: { pass: false, verdict: "shipped-research-only" },
  selective: { curve: [
    { tau: 0.4, coverage: 0.69, brier: 0.157, macroF1: 0.546, brierClears: false, macroF1Clears: false },
    { tau: 0.5, coverage: 0.4677, brier: 0.1013, macroF1: 0.5867, brierClears: true, macroF1Clears: true },
  ] },
};
// Real CAG coverage report shape (cag-cold-anchor-coverage buildReport): live fleet
// measures 100% presence across 500 sessions.
const cagPass = { sessions: 500, sourceCount: 9, overallPresenceRate: 1.0, avgColdBytesPerSession: 4530000, sources: [{ id: "galaxy-digest", presenceRate: 1.0 }] };

// LEG-A
test("LEG-A: 34/34 score>=1 + gaps=0 -> pass", () => {
  const r = evalLegA(auditPass);
  assert.equal(r.pass, true);
  assert.match(r.detail, /34\/34/);
});

test("LEG-A: a gap present -> FAIL (synergy incomplete)", () => {
  const r = evalLegA({ galaxies: auditPass.galaxies, gaps: ["mill: missing AWARENESS.md"] });
  assert.equal(r.pass, false);
});

test("LEG-A: one galaxy score<1 -> FAIL", () => {
  const gs = auditPass.galaxies.map((g, i) => (i === 0 ? { ...g, score: 0.5 } : g));
  assert.equal(evalLegA({ galaxies: gs, gaps: [] }).pass, false);
});

test("LEG-A: missing audit (null) -> FAIL LOUD, never silent-pass (R12)", () => {
  const r = evalLegA(null);
  assert.equal(r.pass, false);
  assert.match(r.detail, /missing/i);
});

// LEG-A freshness (U-LEGA-FRESHNESS 2026-06-12): stale data != pass, same R12
// class as missing data. Opt-in so injected fixtures stay hermetic; the disk
// path (runGateFromDisk) always requires it. Clock injected (nowMs) -- no Date.now flake.
const NOW = Date.parse("2026-06-12T12:00:00Z");
const freshAudit = { ...auditPass, generatedAt: "2026-06-12T11:00:00Z" }; // 1h old

test("LEG-A freshness: 1h-old audit within 24h ceiling -> pass", () => {
  const r = evalLegA(freshAudit, { requireFreshness: true, nowMs: NOW, maxAgeH: 24 });
  assert.equal(r.pass, true);
});

test("LEG-A freshness: 25h-old audit -> FAIL with rerun pointer (stale data != pass)", () => {
  const stale = { ...auditPass, generatedAt: "2026-06-11T11:00:00Z" }; // 25h old
  const r = evalLegA(stale, { requireFreshness: true, nowMs: NOW, maxAgeH: 24 });
  assert.equal(r.pass, false);
  assert.match(r.detail, /STALE/);
  assert.match(r.detail, /audit-ai-synergy/);
});

test("LEG-A freshness: missing/garbage generatedAt -> FAIL (freshness unprovable, R12)", () => {
  const r1 = evalLegA(auditPass, { requireFreshness: true, nowMs: NOW }); // fixture has no generatedAt
  assert.equal(r1.pass, false);
  assert.match(r1.detail, /unprovable/i);
  const r2 = evalLegA({ ...auditPass, generatedAt: "not-a-date" }, { requireFreshness: true, nowMs: NOW });
  assert.equal(r2.pass, false);
});

test("LEG-A freshness: maxAgeH=0 disables the check (back-compat escape) and default call stays hermetic", () => {
  // knob 0: an ancient audit still passes on structure alone
  const ancient = { ...auditPass, generatedAt: "2020-01-01T00:00:00Z" };
  assert.equal(evalLegA(ancient, { requireFreshness: true, nowMs: NOW, maxAgeH: 0 }).pass, true);
  // default (no opts): fixtures without generatedAt are unaffected -- pure path unchanged
  assert.equal(evalLegA(auditPass).pass, true);
});

test("DISK-PATH WIRING (scrutiny P1): runGateFromDisk itself enforces freshness -- stale fixture FAILS, fresh passes with observable evidence", () => {
  // The load-bearing line is `legAOpts: { requireFreshness: true }` inside
  // runGateFromDisk -- deleting it leaves every pure test green. ARTIFACTS is a
  // mutable exported object: redirect the audit to a temp fixture and run the
  // REAL disk path (legs B/C/D read live artifacts; assertions are LEG-A-scoped).
  const orig = ARTIFACTS.audit;
  const tmp = path.join(os.tmpdir(), `aisyn-audit-fixture-${process.pid}.json`);
  const legAOf = (r) => Object.entries(r.legs).find(([k]) => k.startsWith("A "))[1];
  try {
    // 48h-stale but structurally perfect: structure-only semantics would PASS this.
    fs.writeFileSync(tmp, JSON.stringify({ ...auditPass, generatedAt: new Date(Date.now() - 48 * 3_600_000).toISOString() }));
    ARTIFACTS.audit = tmp;
    const stale = legAOf(runGateFromDisk());
    assert.equal(stale.pass, false, "structurally-perfect but 48h-stale audit MUST fail LEG-A on the real disk path");
    assert.match(stale.detail, /STALE/);
    // Same structure, fresh -> passes AND the detail proves freshness was checked.
    fs.writeFileSync(tmp, JSON.stringify({ ...auditPass, generatedAt: new Date().toISOString() }));
    const fresh = legAOf(runGateFromDisk());
    assert.equal(fresh.pass, true);
    assert.match(fresh.detail, /fresh=/, "PASS detail must carry the freshness evidence (silent-removal canary)");
  } finally {
    ARTIFACTS.audit = orig;
    try { fs.unlinkSync(tmp); } catch { /* best-effort */ }
  }
});

test("AUDIT_MAX_AGE_H env knob (subprocess): whitespace-only -> default 24 (NOT silent-disable), '0' -> disables, garbage -> default", () => {
  const modHref = new URL("./ai-systems-synergy-goal-gate.mjs", import.meta.url).href;
  const probe = (val) => {
    const r = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `import(${JSON.stringify(modHref)}).then(m => console.log(m.AUDIT_MAX_AGE_H));`],
      { encoding: "utf8", timeout: 15000, env: { ...process.env, PRISM_AISYN_GATE_MAX_AGE_H: val } }
    );
    return (r.stdout || "").trim();
  };
  assert.equal(probe("   "), "24", "whitespace Number()s to 0 -- must default, not disable (scrutiny P2)");
  assert.equal(probe("0"), "0", "explicit 0 is the documented disable escape");
  assert.equal(probe("banana"), "24", "garbage falls back to default");
});

test("LEG-A freshness COMPOSITION: a stale audit fails the WHOLE gate via legAOpts (load-bearing)", () => {
  const stale = { ...auditPass, generatedAt: "2026-06-10T11:00:00Z" }; // 49h old
  const r = evalGoalGate({
    auditJson: stale, loraText: loraPass, nnEvalJson: nnEvalPass, cagCoverage: cagPass,
    legAOpts: { requireFreshness: true, nowMs: NOW, maxAgeH: 24 },
  });
  assert.equal(r.pass, false, "stale LEG-A must fail the composed goal verdict");
  const fresh = evalGoalGate({
    auditJson: freshAudit, loraText: loraPass, nnEvalJson: nnEvalPass, cagCoverage: cagPass,
    legAOpts: { requireFreshness: true, nowMs: NOW, maxAgeH: 24 },
  });
  assert.equal(fresh.pass, true, "same data fresh must pass (the check itself is the only delta)");
});

// LEG-B
test("LEG-B: 1138 rows / 34 galaxies -> pass (trainingReady)", () => {
  const r = evalLegB(loraPass);
  assert.equal(r.pass, true);
  assert.match(r.detail, /rows=1138/);
});

test(`LEG-B: below the ${LORA_READY_FLOOR}-row floor -> FAIL (not trainingReady)`, () => {
  const few = Array.from({ length: 500 }, (_, i) => JSON.stringify({ galaxy: `g${i % 34}` })).join("\n");
  assert.equal(evalLegB(few).pass, false);
});

test("LEG-B: enough rows but only 10 galaxies -> FAIL (not all-galaxy)", () => {
  const narrow = Array.from({ length: 1200 }, (_, i) => JSON.stringify({ galaxy: `g${i % 10}` })).join("\n");
  assert.equal(evalLegB(narrow).pass, false);
});

test("LEG-B: empty dataset -> FAIL LOUD (R12)", () => {
  assert.equal(evalLegB("").pass, false);
});

// LEG-C (the field-path regression this gate exists to pin)
test("LEG-C: auroc=0.8084 + a selective tau clears both gates -> pass (deploy-ready-selective)", () => {
  const r = evalLegC(nnEvalPass);
  assert.equal(r.pass, true);
  assert.match(r.detail, /auroc=0.8084/);
  assert.match(r.detail, /best tau=0.5/);
});

test("LEG-C: full-coverage residual surfaced as OUT-of-scope (india data leg), not a gate fail", () => {
  const r = evalLegC(nnEvalPass);
  assert.equal(r.pass, true); // selective passes...
  assert.equal(r.residual.fullCoveragePass, false); // ...even though full-coverage gate does not
  assert.match(r.residual.note, /ref-pool growth|india/i);
});

test("LEG-C: auroc below 0.78 -> FAIL even if a tau clears", () => {
  const low = { metrics: { auroc: 0.5 }, selective: nnEvalPass.selective, grade: { pass: false } };
  assert.equal(evalLegC(low).pass, false);
  assert.ok(GNN_AUROC_FLOOR === 0.78);
});

test("LEG-C: good auroc but NO selective tau clears both gates -> FAIL (not deployable)", () => {
  const noDeploy = { metrics: { auroc: 0.9 }, selective: { curve: [{ tau: 0.4, brierClears: true, macroF1Clears: false }] }, grade: { pass: false } };
  assert.equal(evalLegC(noDeploy).pass, false);
});

test("LEG-C: adversarial -- auroc at the WRONG path (top-level, not metrics.auroc) -> FAIL, not falsely pass", () => {
  // This pins the 2026-06-11 reader bug: top-level `auroc` must NOT be read; only metrics.auroc.
  const wrongPath = { auroc: 0.9, selective: nnEvalPass.selective, grade: { pass: false } };
  assert.equal(evalLegC(wrongPath).pass, false);
});

// LEG-D
test("LEG-D: 100% coverage over 500 sessions -> pass (>= 95% floor)", () => {
  const r = evalLegD(cagPass);
  assert.equal(r.pass, true);
  assert.match(r.detail, /coverage=100\.0%/);
});

test(`LEG-D: below the ${CAG_COVERAGE_FLOOR * 100}% floor -> FAIL`, () => {
  const r = evalLegD({ sessions: 100, sourceCount: 9, overallPresenceRate: 0.80, sources: [] });
  assert.equal(r.pass, false);
});

test("LEG-D: no sessions / missing report -> FAIL LOUD (no data != pass, R12)", () => {
  assert.equal(evalLegD({ sessions: 0, overallPresenceRate: 1.0 }).pass, false);
  assert.equal(evalLegD(null).pass, false);
});

// composed gate
test("evalGoalGate: all four legs pass -> L=PASS", () => {
  const r = evalGoalGate({ auditJson: auditPass, loraText: loraPass, nnEvalJson: nnEvalPass, cagCoverage: cagPass });
  assert.equal(r.pass, true);
  assert.equal(Object.values(r.legs).every((l) => l.pass), true);
});

test("evalGoalGate: missing CAG coverage alone -> L=FAIL (LEG-D is load-bearing, fails loud)", () => {
  const r = evalGoalGate({ auditJson: auditPass, loraText: loraPass, nnEvalJson: nnEvalPass });
  assert.equal(r.pass, false, "no cagCoverage -> D fails -> gate fails");
});

test("evalGoalGate: any leg failing -> L=FAIL (AND semantics)", () => {
  const r = evalGoalGate({ auditJson: auditPass, loraText: "", nnEvalJson: nnEvalPass });
  assert.equal(r.pass, false);
});

test("evalGoalGate: all artifacts missing -> L=FAIL LOUD (never green on absent data, R12)", () => {
  const r = evalGoalGate({});
  assert.equal(r.pass, false);
});

// -- U-LEGBC-FRESHNESS (slot:zulu 2026-06-12, unblocked by operator "do everything now") --
// R9: stale data must not green the goal on ANY time-decaying leg. LEG-B keys on
// the artifact MTIME (jsonl carries no timestamp); LEG-C on NN-EVAL assessedAt.
// Freshness stays OPT-IN so the 27 pre-existing hermetic fixtures are untouched.

const FRESH_LORA = Array.from({ length: 1000 }, (_, i) => JSON.stringify({ galaxy: `g${i % 34}`, instruction: "x", output: "y" })).join("\n");

test("LEG-B freshness: fresh mtime passes WITH evidence; stale mtime FAILS naming the knob; unprovable (null mtime) FAILS", () => {
  const now = Date.parse("2026-06-12T20:00:00Z");
  const fresh = evalLegB(FRESH_LORA, 34, { requireFreshness: true, nowMs: now, mtimeMs: now - 16 * 3.6e6, maxAgeH: 48 });
  assert.equal(fresh.pass, true);
  assert.match(fresh.detail, /fresh=16\.0h<=48h/, "PASS-path evidence proves enforcement ran");
  const stale = evalLegB(FRESH_LORA, 34, { requireFreshness: true, nowMs: now, mtimeMs: now - 50 * 3.6e6, maxAgeH: 48 });
  assert.equal(stale.pass, false);
  assert.match(stale.detail, /STALE.*PRISM_AISYN_LORA_MAX_AGE_H/);
  const unprovable = evalLegB(FRESH_LORA, 34, { requireFreshness: true, nowMs: now, mtimeMs: null });
  assert.equal(unprovable.pass, false, "no mtime = freshness unprovable = fail, not skip (R12)");
});

test("LEG-B freshness: maxAgeH=0 deliberately disables; default opts (hermetic callers) unchanged", () => {
  const now = Date.now();
  const r = evalLegB(FRESH_LORA, 34, { requireFreshness: true, nowMs: now, mtimeMs: now - 999 * 3.6e6, maxAgeH: 0 });
  assert.equal(r.pass, true, "explicit 0 is the documented disable escape");
  assert.equal(evalLegB(FRESH_LORA, 34).pass, true, "no opts -> no freshness demand (back-compat)");
});

test("LEG-C freshness: fresh assessedAt passes with evidence; stale FAILS; missing assessedAt FAILS when required", () => {
  const now = Date.parse("2026-06-12T20:00:00Z");
  const nn = {
    assessedAt: new Date(now - 6.5 * 86_400_000).toISOString(),
    metrics: { auroc: 0.8084 },
    selective: { curve: [{ tau: 0.5, coverage: 0.468, brier: 0.1, macroF1: 0.59, brierClears: true, macroF1Clears: true }] },
  };
  const fresh = evalLegC(nn, { requireFreshness: true, nowMs: now, maxAgeD: 21 });
  assert.equal(fresh.pass, true);
  assert.match(fresh.detail, /fresh=6\.5d<=21d/);
  const stale = evalLegC({ ...nn, assessedAt: new Date(now - 30 * 86_400_000).toISOString() }, { requireFreshness: true, nowMs: now, maxAgeD: 21 });
  assert.equal(stale.pass, false);
  assert.match(stale.detail, /STALE.*PRISM_AISYN_NNEVAL_MAX_AGE_D/);
  const noTs = evalLegC({ metrics: nn.metrics, selective: nn.selective }, { requireFreshness: true, nowMs: now });
  assert.equal(noTs.pass, false, "missing assessedAt = unprovable = fail (R12)");
  assert.equal(evalLegC(nn).pass, true, "no opts -> hermetic back-compat preserved");
});
