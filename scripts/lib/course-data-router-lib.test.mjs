// course-data-router-lib.test.mjs — node:test (scripts/ infra)
// 28 tests covering pure routing rules, dedup, validators, ledger build, and
// 1 real-data E2E (per RGS-TOOL-MS1 lesson: hermetic-only is insufficient —
// must hit the live candidate file once to catch schema-drift class bugs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  SCHEMA_VERSION,
  DECISIONS,
  THRESHOLDS,
  normalizeNameTokens,
  tokenMatchScore,
  findBestMatch,
  routeAsset,
  routeCandidate,
  buildLedger,
  validateAsset,
  validateCandidate,
  validateDecision,
} from "./course-data-router-lib.mjs";

// ─── normalizeNameTokens ───────────────────────────────────────────────

test("normalizeNameTokens strips Engine/Model/Method suffixes", () => {
  assert.deepEqual(normalizeNameTokens("OperatorSplittingMethod"), ["operator", "splitting"]);
  assert.deepEqual(normalizeNameTokens("KienzleForceModel"), ["kienzle", "force"]);
  assert.deepEqual(normalizeNameTokens("BayesianToolLifeEngine"), ["bayesian", "tool", "life"]);
});

test("normalizeNameTokens handles hyphens/underscores/dots/slashes uniformly", () => {
  assert.deepEqual(normalizeNameTokens("operator-splitting"), ["operator", "splitting"]);
  assert.deepEqual(normalizeNameTokens("operator_splitting"), ["operator", "splitting"]);
  assert.deepEqual(normalizeNameTokens("operator.splitting"), ["operator", "splitting"]);
  assert.deepEqual(normalizeNameTokens("operator splitting"), ["operator", "splitting"]);
});

test("normalizeNameTokens drops 1-char tokens (noise)", () => {
  assert.deepEqual(normalizeNameTokens("a-b-cd"), ["cd"]);
});

test("normalizeNameTokens returns [] for empty/invalid input (R12 fail-loud surrogate)", () => {
  assert.deepEqual(normalizeNameTokens(""), []);
  assert.deepEqual(normalizeNameTokens(null), []);
  assert.deepEqual(normalizeNameTokens(undefined), []);
  assert.deepEqual(normalizeNameTokens(42), []);
});

// ─── tokenMatchScore ───────────────────────────────────────────────────

test("tokenMatchScore returns 1.0 on exact overlap", () => {
  assert.equal(tokenMatchScore(["operator", "splitting"], ["operator", "splitting"]), 1);
});

test("tokenMatchScore returns 1.0 on candidate-subset match (coverage-of-candidate metric)", () => {
  // "operator-splitting" (cand 2 tokens) vs "operator-splitting-method" (3 tokens)
  // → 2/2 = 1.0 (NOT Jaccard 2/3). This is intentional — candidate-subset is
  // the load-bearing dedup signal.
  assert.equal(tokenMatchScore(["operator", "splitting"], ["operator", "splitting", "method"]), 1);
});

test("tokenMatchScore returns 0 on disjoint", () => {
  assert.equal(tokenMatchScore(["alpha"], ["beta", "gamma"]), 0);
});

test("tokenMatchScore returns 0 on empty input", () => {
  assert.equal(tokenMatchScore([], ["beta"]), 0);
  assert.equal(tokenMatchScore(["alpha"], []), 0);
});

// ─── findBestMatch ─────────────────────────────────────────────────────

test("findBestMatch returns null when no match above threshold", () => {
  const result = findBestMatch("operator-splitting", ["alphabet", "gamma-ray"]);
  assert.equal(result, null);
});

test("findBestMatch returns best-scoring match", () => {
  const result = findBestMatch("operator-splitting-method", [
    "OperatorSplittingMethod",
    "OperatorSomething",
  ]);
  assert.ok(result);
  assert.equal(result.name, "OperatorSplittingMethod");
  assert.ok(result.score >= THRESHOLDS.DEDUP_MATCH_SCORE);
});

test("findBestMatch handles null candidate name (no crash)", () => {
  assert.equal(findBestMatch(null, ["alpha"]), null);
  assert.equal(findBestMatch("operator", null), null);
});

// ─── routeAsset — per-kind contract pins ───────────────────────────────

test("routeAsset technique → TRIBAL-SHIPPED Lane A (Phase 1 invariant)", () => {
  const d = routeAsset(
    { kind: "technique", name: "monte-carlo-integration" },
    { mfgRelevance: 0.4, prismDomains: ["thermal"], courseId: "10.34" },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "TRIBAL-SHIPPED");
  assert.equal(d.lane, "A");
  assert.equal(d.targetNodeType, "knowledge");
  assert.match(d.targetSurface, /mit-ocw-course-tips\.json/);
});

test("routeAsset algorithm match → DUPLICATE Lane B", () => {
  const d = routeAsset(
    { kind: "algorithm", name: "OperatorSplitting" },
    { mfgRelevance: 0.8 },
    { algorithms: ["OperatorSplittingMethod", "Unrelated"], engines: [] },
  );
  assert.equal(d.decision, "DUPLICATE");
  assert.equal(d.lane, "B");
  assert.equal(d.targetNodeType, "algorithm");
  assert.ok(d.prismMatch);
  assert.ok(d.prismMatch.score >= THRESHOLDS.DEDUP_MATCH_SCORE);
});

test("routeAsset algorithm above-threshold no-match → FORGE-QUEUE Lane C", () => {
  const d = routeAsset(
    { kind: "algorithm", name: "NovelCourseAlgorithm" },
    { mfgRelevance: 0.7 },
    { algorithms: ["KienzleForceModel"], engines: [] },
  );
  assert.equal(d.decision, "FORGE-QUEUE");
  assert.equal(d.lane, "C");
  assert.match(d.recommendedAction, /forge-triple algorithm:NovelCourseAlgorithm/);
});

test("routeAsset algorithm below-threshold no-match → DISCARD", () => {
  const d = routeAsset(
    { kind: "algorithm", name: "LowRelevanceThing" },
    { mfgRelevance: 0.1 },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "DISCARD");
  assert.equal(d.lane, null);
});

test("routeAsset formula ALWAYS forge-queue (NEVER inline constants doctrine)", () => {
  // Even with high relevance, formula goes to forge-queue — physics-reviewer
  // gates the canonical-constants axis (CLAUDE.md §SAFETY).
  const d = routeAsset(
    { kind: "formula", name: "specific-cutting-force" },
    { mfgRelevance: 0.95 },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "FORGE-QUEUE");
  assert.equal(d.lane, "C");
  assert.equal(d.targetNodeType, "formula");
  assert.match(d.recommendedAction, /physics-reviewer/);
  assert.match(d.recommendedAction, /constants\.ts/);
});

test("routeAsset formula below floor → DISCARD", () => {
  const d = routeAsset(
    { kind: "formula", name: "esoteric-thing" },
    { mfgRelevance: 0.05 },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "DISCARD");
});

test("routeAsset engine match → DUPLICATE Lane B", () => {
  const d = routeAsset(
    { kind: "engine", name: "KienzleForce" },
    { mfgRelevance: 0.8 },
    { algorithms: [], engines: ["KienzleForceEngine", "OtherEngine"] },
  );
  assert.equal(d.decision, "DUPLICATE");
  assert.equal(d.lane, "B");
});

test("routeAsset engine threshold > algorithm threshold (engine doctrine pin)", () => {
  // 0.55 is above ALGO floor (0.5) but BELOW ENGINE floor (0.6). Engine path
  // must DISCARD at this level even though algorithm path would FORGE-QUEUE.
  const d = routeAsset(
    { kind: "engine", name: "BorderlineNewEngine" },
    { mfgRelevance: 0.55 },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "DISCARD");
  assert.equal(d.lane, null);
});

test("routeAsset unknown kind → DISCARD with audit trail (R12 fail-loud)", () => {
  // Unknown kind doesn't crash — emits DISCARD with explicit "unknown kind"
  // rationale so schema drift surfaces in the ledger.
  const d = routeAsset(
    { kind: "wildcard-future-kind", name: "x" },
    { mfgRelevance: 0.9 },
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "DISCARD");
  assert.match(d.rationale, /Unknown asset\.kind/);
});

test("routeAsset missing mfgRelevance defaults to 0 → DISCARD for algorithm", () => {
  const d = routeAsset(
    { kind: "algorithm", name: "thing" },
    {},
    { algorithms: [], engines: [] },
  );
  assert.equal(d.decision, "DISCARD");
});

// ─── routeCandidate ────────────────────────────────────────────────────

test("routeCandidate routes ALL candidateAssets", () => {
  const out = routeCandidate(
    {
      courseId: "10.34",
      nodeId: "course:mit-ocw:10.34-fall-2015",
      courseTitle: "Numerical Methods",
      mfgRelevance: 0.7,
      candidateAssets: [
        { kind: "algorithm", name: "operator-splitting" },
        { kind: "technique", name: "monte-carlo" },
        { kind: "formula", name: "navier-stokes" },
      ],
    },
    { algorithms: [], engines: [] },
  );
  assert.equal(out.decisionCount, 3);
  assert.equal(out.decisions.length, 3);
  assert.equal(out.decisions[0].kind, "algorithm");
  assert.equal(out.decisions[1].kind, "technique");
  assert.equal(out.decisions[2].kind, "formula");
});

test("routeCandidate empty candidateAssets → decisionCount 0 (not crash)", () => {
  const out = routeCandidate(
    { courseId: "x", candidateAssets: [] },
    { algorithms: [], engines: [] },
  );
  assert.equal(out.decisionCount, 0);
  assert.deepEqual(out.decisions, []);
});

// ─── buildLedger ───────────────────────────────────────────────────────

test("buildLedger produces frozen-time-deterministic output", () => {
  const candidates = [
    {
      courseId: "10.34",
      nodeId: "course:mit-ocw:10.34",
      candidateAssets: [
        { kind: "technique", name: "monte-carlo" },
        { kind: "formula", name: "navier-stokes" },
      ],
      mfgRelevance: 0.7,
    },
  ];
  const a = buildLedger(candidates, { algorithms: [], engines: [] }, { frozenTime: "2026-05-17T00:00:00Z" });
  const b = buildLedger(candidates, { algorithms: [], engines: [] }, { frozenTime: "2026-05-17T00:00:00Z" });
  assert.equal(a.generatedAt, b.generatedAt);
  assert.equal(a.generatedAt, "2026-05-17T00:00:00Z");
  // Roll-ups must agree
  assert.deepEqual(a.summary, b.summary);
});

test("buildLedger summary roll-ups are accurate", () => {
  // Two candidates exercise distinct lanes:
  //  - hi-relevance candidate (0.7): tech→TRIBAL-SHIPPED, formula→FORGE-QUEUE, algo→FORGE-QUEUE
  //  - lo-relevance candidate (0.1): algo→DISCARD (below 0.5 algo floor)
  // Candidate-level mfgRelevance is uniform per-asset — DISCARD path requires
  // a separate candidate with a low relevance score (not per-asset).
  const ledger = buildLedger(
    [
      {
        courseId: "hi",
        candidateAssets: [
          { kind: "technique", name: "t1" },
          { kind: "formula", name: "f1" },
          { kind: "algorithm", name: "a1" },
        ],
        mfgRelevance: 0.7,
      },
      {
        courseId: "lo",
        candidateAssets: [{ kind: "algorithm", name: "discard-me" }],
        mfgRelevance: 0.1,
      },
    ],
    { algorithms: [], engines: [] },
    { frozenTime: "2026-05-17T00:00:00Z" },
  );
  assert.equal(ledger.summary.assetCount, 4);
  assert.equal(ledger.summary.byDecision["TRIBAL-SHIPPED"], 1);
  assert.equal(ledger.summary.byDecision["FORGE-QUEUE"], 2);
  assert.equal(ledger.summary.byDecision["DISCARD"], 1);
  assert.equal(ledger.summary.byLane.A, 1);
  assert.equal(ledger.summary.byLane.C, 2);
  assert.equal(ledger.summary.byLane.none, 1);
});

test("buildLedger marks advisoryOnly + mustHumanVerify (doctrine pin)", () => {
  const l = buildLedger([], { algorithms: [], engines: [] }, { frozenTime: "x" });
  assert.equal(l.advisoryOnly, true);
  assert.equal(l.mustHumanVerify, true);
  assert.equal(l.schemaVersion, SCHEMA_VERSION);
  assert.match(l.caveat, /ADVISORY/);
});

// ─── validators (R12) ──────────────────────────────────────────────────

test("validateAsset throws on missing kind/name", () => {
  assert.throws(() => validateAsset(null), /must be object/);
  assert.throws(() => validateAsset({}), /kind must be string/);
  assert.throws(() => validateAsset({ kind: "algorithm" }), /name/);
  assert.throws(() => validateAsset({ kind: "algorithm", name: "" }), /name/);
});

test("validateCandidate throws on missing candidateAssets array", () => {
  assert.throws(() => validateCandidate(null), /must be object/);
  assert.throws(() => validateCandidate({}), /candidateAssets must be array/);
  assert.throws(() => validateCandidate({ candidateAssets: null }), /array/);
});

test("validateDecision recognizes enum", () => {
  assert.equal(validateDecision("FORGE-QUEUE"), true);
  assert.equal(validateDecision("DUPLICATE"), true);
  assert.equal(validateDecision("NOT-A-DECISION"), false);
  assert.equal(validateDecision(null), false);
});

// ─── 1 real-data E2E (RGS-TOOL-MS1 lesson: hermetic fakes hide schema seam bugs) ─

test("E2E: routes live course-content-candidates.jsonl without throwing", () => {
  const file = "H:/prism/state/shared/tribal-graph/course-content-candidates.jsonl";
  if (!existsSync(file)) {
    // Data file optional in fresh checkouts — skip explicitly (R12 — don't
    // silently pass; emit a visible note).
    console.log(`[skip] real-data E2E — ${file} not present`);
    return;
  }
  const lines = readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  const candidates = lines.map((l) => JSON.parse(l));
  assert.ok(candidates.length > 0, "must have at least 1 candidate");
  // Use empty inventory (worst case: zero dedup hits → every algo above
  // threshold goes to FORGE-QUEUE) — proves the router survives the live
  // schema and emits structurally-valid decisions.
  const ledger = buildLedger(candidates, { algorithms: [], engines: [] }, {
    frozenTime: "2026-05-17T00:00:00Z",
  });
  assert.equal(ledger.summary.candidateCount, candidates.length);
  assert.ok(ledger.summary.assetCount > 0, "live data must produce >0 routed assets");
  // Every decision must use a valid enum value (catches a typo'd literal).
  for (const item of ledger.items) {
    for (const d of item.decisions) {
      assert.ok(DECISIONS.includes(d.decision), `bad decision: ${d.decision}`);
      assert.ok(
        d.lane === null || ["A", "B", "C"].includes(d.lane),
        `bad lane: ${d.lane}`,
      );
    }
  }
});
