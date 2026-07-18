// scripts/external-knowledge-harness.test.mjs
// Run: node scripts/external-knowledge-harness.test.mjs
//
// Hermetic: the Hermes call, the lib import, and the ledger append are all
// dependency-injected, so these tests prove the deterministic pipeline
// (prompt-build -> parse -> dedup -> stage) + the load-bearing SAFETY invariants
// (never fires, never edits a lib, cap-bounded, fail-soft) with NO proxy + NO spend.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDomainPrompt,
  SYSTEM_CONTRACT,
  parseCandidates,
  dedupeCandidates,
  loadDomainCorpus,
  runHarness,
  LEDGER,
} from "./external-knowledge-harness.mjs";

const CAM = { key: "cam", slot: "kilo", lib: "scripts/lib/cam-approach-knowledge.mjs" };

// ---- parseCandidates ----

test("parseCandidates: parses the RULE|SOURCE|CLASS|WHY pipe format, strips numbering + bold", () => {
  const text = [
    "1. Jerk-limited corner deceleration via S-curve | Altintas Manufacturing Automation 2e Ch9 | numeric-threshold | PRISM lacks jerk constraint",
    "2) **Chord-tolerance linearization Ds<=sqrt(8Rd)** | Zeid Ch7 | categorical | no chord rule",
  ].join("\n");
  const c = parseCandidates(text);
  assert.equal(c.length, 2);
  assert.match(c[0].rule, /Jerk-limited corner/);
  assert.equal(c[0].source, "Altintas Manufacturing Automation 2e Ch9");
  assert.equal(c[0].cls, "numeric-threshold");
  assert.ok(!c[1].rule.includes("**"), "markdown bold stripped");
  assert.equal(c[1].cls, "categorical");
});

test("parseCandidates: rejects fragments + non-pipe lines; null/empty-safe", () => {
  assert.deepEqual(parseCandidates(""), []);
  assert.deepEqual(parseCandidates(null), []);
  assert.deepEqual(parseCandidates("Here are some ideas:\n(no structure)"), []);
  // a too-short rule before the first pipe is rejected
  assert.deepEqual(parseCandidates("x | src | categorical | why"), []);
});

test("parseCandidates: normalizes an unrecognized class to 'unspecified'", () => {
  const c = parseCandidates("Some genuine rule text here | Source Ch1 | | why");
  assert.equal(c.length, 1);
  assert.equal(c[0].cls, "unspecified");
});

test("parseCandidates: rejects an echoed FORMAT/HEADER line (weak-model prompt parrot)", () => {
  // the exact garbage a live Ollama-fallback answer produced 2026-07-01
  const echoed = [
    "Format: Numbered list, one line per item: RULE | SOURCE | CLASS | WHY-NEW",
    "1. RULE | SOURCE | CLASS | WHY-NEW",
    "Output only a numbered list | none | categorical | n/a",
    "2. A genuine net-new rule about servo bandwidth limits | Altintas Ch2 | numeric-threshold | new",
  ].join("\n");
  const c = parseCandidates(echoed);
  assert.equal(c.length, 1, "only the genuine candidate survives; all 3 header/format echoes dropped");
  assert.match(c[0].rule, /servo bandwidth/);
});

// ---- dedupeCandidates ----

const CORPUS = { gateNames: ["chip_thinning_compensation", "trochoidal_engagement_control"], gapTexts: ["5-axis singularity angle threshold not located", "internal-corner engagement-spike triggers"] };

test("dedupeCandidates: keeps net-new, drops corpus-overlapping, respects cap", () => {
  const cands = [
    { rule: "Servo-bandwidth feed cap bounds achievable feed on fine geometry", source: "Altintas Ch2", cls: "numeric-threshold" },
    { rule: "internal-corner engagement-spike trochoidal trigger threshold", source: "x", cls: "numeric-threshold" }, // overlaps corpus heavily
    { rule: "Jerk-limited corner deceleration S-curve profile at direction change", source: "Altintas Ch9", cls: "numeric-threshold" },
    { rule: "Chord tolerance linearization maximum segment length formula", source: "Zeid Ch7", cls: "categorical" },
  ];
  const { kept, dropped } = dedupeCandidates(cands, CORPUS, { cap: 2 });
  assert.equal(kept.length, 2, "cap honored");
  assert.ok(dropped.some((d) => /overlap/.test(d.why)), "the corpus-overlapping candidate was dropped");
  // the kept ones are the net-new servo + jerk (not the engagement-spike dup)
  assert.ok(!kept.some((k) => /engagement-spike/.test(k.rule)), "corpus dup not kept");
});

test("dedupeCandidates: drops an intra-run near-duplicate", () => {
  const cands = [
    { rule: "Wright learning curve unit cost repeat lot reduction formula", source: "NASA CEH", cls: "numeric-threshold" },
    { rule: "Wright learning curve repeat lot unit cost reduction model", source: "NASA CEH Ch7", cls: "numeric-threshold" },
  ];
  const { kept, dropped } = dedupeCandidates(cands, { gateNames: [], gapTexts: [] }, { cap: 5 });
  assert.equal(kept.length, 1, "the second near-identical candidate is dropped");
  assert.ok(dropped.some((d) => d.why === "intra-run-dup"));
});

// ---- buildDomainPrompt ----

test("buildDomainPrompt: names covered gates + gap heads (user msg); contract lives in SYSTEM_CONTRACT", () => {
  const p = buildDomainPrompt(CAM, CORPUS);
  assert.match(p, /already FIRES/);
  assert.match(p, /trochoidal_engagement_control/);
  assert.match(p, /already TRACKS/);
  // the format/copyright contract moved to the SYSTEM message (the one-user-message
  // v1 made the model echo the covered-lists back -- live catch 2026-07-01)
  assert.match(SYSTEM_CONTRACT, /NEVER reproduce copyrighted prose/);
  assert.match(SYSTEM_CONTRACT, /RULE \| SOURCE/);
  assert.match(SYSTEM_CONTRACT, /no restating of the input/);
  assert.ok(!/RULE \| SOURCE/.test(p), "format spec no longer duplicated in the user msg");
});

// ---- loadDomainCorpus (DI'd import, fail-soft) ----

test("loadDomainCorpus: reads GATES keys + *_UNVERIFIED_GAPS from the injected module", async () => {
  const importImpl = async () => ({
    _internals: { GATES: { a: {}, b: {} } },
    CAM_UNVERIFIED_GAPS: ["gap one text", "gap two text"],
  });
  const c = await loadDomainCorpus(CAM, importImpl);
  assert.deepEqual(c.gateNames, ["a", "b"]);
  assert.equal(c.gapTexts.length, 2);
  assert.equal(c.ok, true);
});

test("loadDomainCorpus: fail-soft on a broken import (empties, ok:false, never throws)", async () => {
  const importImpl = async () => { throw new Error("boom"); };
  const c = await loadDomainCorpus(CAM, importImpl);
  assert.deepEqual(c.gateNames, []);
  assert.deepEqual(c.gapTexts, []);
  assert.equal(c.ok, false);
  assert.match(c.error, /boom/);
});

test("loadDomainCorpus: binds the GOTCHAS registry (lathe naming) not just GATES", async () => {
  const importImpl = async () => ({ _internals: { GOTCHAS: { g1: {}, g2: {}, g3: {} } }, LATHE_UNVERIFIED_GAPS: [] });
  const c = await loadDomainCorpus({ key: "lathe", lib: "x" }, importImpl);
  assert.deepEqual(c.gateNames, ["g1", "g2", "g3"]);
});

// ---- runHarness (full pipeline, all I/O injected) ----

function fakeImport() {
  return async () => ({ _internals: { GATES: { existing_gate: {} } }, CAM_UNVERIFIED_GAPS: ["known trochoidal engagement gap"] });
}
const FAKE_ANSWER =
  "1. Servo-bandwidth feed cap bounds fine-geometry feed | Altintas Ch2 | numeric-threshold | new\n" +
  "2. Jerk-limited corner deceleration S-curve at direction change | Altintas Ch9 | numeric-threshold | new\n" +
  "3. Chord tolerance segment length Ds<=sqrt(8Rd) linearization | Zeid Ch7 | categorical | new";

test("runHarness: happy path stages capped, well-shaped, UNVERIFIED records", async () => {
  const appended = [];
  const r = await runHarness({
    domains: [CAM],
    cap: 2,
    importImpl: fakeImport(),
    askImpl: async () => FAKE_ANSWER,
    appendImpl: (recs) => appended.push(...recs),
    nowIso: "2026-07-01T00:00:00Z",
  });
  assert.equal(r.staged.length, 2, "cap=2 honored across 3 parsed candidates");
  assert.equal(appended.length, 2, "appendImpl is the sole writer");
  for (const rec of r.staged) {
    assert.equal(rec.status, "staged-unverified", "SAFETY: every record is UNVERIFIED");
    assert.match(rec.note, /NEVER auto-fires/, "SAFETY: record carries the never-fire invariant");
    assert.ok(rec.source && rec.rule && rec.class, "cited + classed");
    assert.equal(rec.domain, "cam");
    assert.equal(rec.stagedAt, "2026-07-01T00:00:00Z");
  }
  assert.equal(r.ledger, LEDGER);
});

test("runHarness: SAFETY -- a staged record can never represent a fired gate", async () => {
  const r = await runHarness({
    domains: [CAM], cap: 5, importImpl: fakeImport(),
    askImpl: async () => FAKE_ANSWER, appendImpl: () => {}, nowIso: "t",
  });
  for (const rec of r.staged) {
    // the record has no field that any firing path reads (confidence:"verified" / fires / gate id)
    assert.ok(!("confidence" in rec), "no confidence:verified -> cannot be read as a fired gate");
    assert.notEqual(rec.status, "verified");
  }
});

test("runHarness: dry-run makes NO ask + NO append, reports the plan", async () => {
  let asked = 0, appended = 0;
  const r = await runHarness({
    domains: [CAM], dryRun: true, importImpl: fakeImport(),
    askImpl: async () => { asked++; return FAKE_ANSWER; },
    appendImpl: () => { appended++; },
  });
  assert.equal(asked, 0, "no ask in dry-run");
  assert.equal(appended, 0, "no append in dry-run");
  assert.equal(r.staged.length, 0);
  assert.equal(r.summary[0].dryRun, true);
  assert.ok(r.summary[0].promptChars > 0);
});

test("runHarness: ask failure retries then SKIPS the domain (R12), others unaffected", async () => {
  let calls = 0;
  const r = await runHarness({
    domains: [CAM, { key: "post", slot: "echo", lib: "y" }],
    importImpl: fakeImport(),
    askImpl: async (_p) => { calls++; if (calls <= 3) throw new Error("503 rate limit"); return FAKE_ANSWER; },
    appendImpl: () => {}, nowIso: "t", retries: 2,
  });
  // cam: 3 attempts all fail (retries=2 -> 3 tries) -> skipped; post: 4th call succeeds -> staged
  const cam = r.summary.find((s) => s.domain === "cam");
  const post = r.summary.find((s) => s.domain === "post");
  assert.equal(cam.skipped, true, "cam skipped after exhausting retries");
  assert.match(cam.reason, /ask failed/);
  assert.ok(post.staged > 0, "post still processed after cam's failure (fail-soft per domain)");
});

test("runHarness: CROSS-RUN dedup -- a rule already in the ledger is not re-staged", async () => {
  const r = await runHarness({
    domains: [CAM], cap: 5, importImpl: fakeImport(),
    askImpl: async () => FAKE_ANSWER,
    // the ledger already holds last week's servo-bandwidth candidate
    ledgerRulesImpl: () => ["Servo-bandwidth feed cap bounds fine-geometry feed on small features"],
    appendImpl: () => {}, nowIso: "t",
  });
  assert.ok(r.staged.length >= 1, "other candidates still stage");
  assert.ok(!r.staged.some((x) => /Servo-bandwidth/.test(x.rule)), "prior-ledger candidate NOT re-staged");
});

test("runHarness: a broken lib import degrades to an empty corpus, still asks + stages", async () => {
  const r = await runHarness({
    domains: [CAM], importImpl: async () => { throw new Error("no lib"); },
    askImpl: async () => FAKE_ANSWER, appendImpl: () => {}, cap: 2, nowIso: "t",
  });
  // empty corpus -> nothing to dedup against -> all net-new, capped at 2
  assert.equal(r.staged.length, 2);
});
