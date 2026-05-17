/**
 * rgs-complexity.test.mjs — U-COMPLEXITY-FALLBACK coverage.
 *
 * Each cascade signal in isolation + boundary tests + adversarial + the
 * back-compat invariant that explicit-effort units hash identically to MS0
 * (so sourceHash checkpoints don't invalidate fleet-wide on this swap).
 */
import { test } from "node:test";
import assert from "node:assert";
import {
  complexityFor,
  EFFORT_THRESHOLDS,
  DESC_LEN_THRESHOLDS,
} from "./rgs-complexity.mjs";

// ────────────────────────────────────────────────────────────────
// Tier — explicit effort (MS0 back-compat path)
// ────────────────────────────────────────────────────────────────

test("effort: 0 < x < 30 min → S", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: 15 }).tier, "S");
});
test("effort: 30..119 → M", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: 30 }).tier, "M");
  assert.strictEqual(complexityFor({ title: "x", effort: 119 }).tier, "M");
});
test("effort: 120..479 → L", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: 120 }).tier, "L");
  assert.strictEqual(complexityFor({ title: "x", effort: 479 }).tier, "L");
});
test("effort: ≥480 → XL", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: 480 }).tier, "XL");
  assert.strictEqual(complexityFor({ title: "x", effort: 9999 }).tier, "XL");
});

// ────────────────────────────────────────────────────────────────
// Tier — alt effort schemas (estimated_hours / estimated_minutes)
// ────────────────────────────────────────────────────────────────

test("estimated_hours: 0.4h → 24min → S", () => {
  assert.strictEqual(complexityFor({ title: "x", estimated_hours: 0.4 }).tier, "S");
});
test("estimated_hours: 4h → 240min → L", () => {
  assert.strictEqual(complexityFor({ title: "x", estimated_hours: 4 }).tier, "L");
});
test("estimated_minutes: 90 → M", () => {
  assert.strictEqual(complexityFor({ title: "x", estimated_minutes: 90 }).tier, "M");
});
test("effort wins over estimated_hours when both present", () => {
  // unit has effort=10 (S) AND estimated_hours=10 (600min → XL). Effort wins.
  assert.strictEqual(complexityFor({ title: "x", effort: 10, estimated_hours: 10 }).tier, "S");
});

// ────────────────────────────────────────────────────────────────
// Tier — title-keyword fallback (no effort signal)
// ────────────────────────────────────────────────────────────────

test("kw S: typo / rename / cleanup / audit / review", () => {
  assert.strictEqual(complexityFor({ title: "fix typo in CLAUDE.md" }).tier, "S");
  assert.strictEqual(complexityFor({ title: "rename foo to bar" }).tier, "S");
  assert.strictEqual(complexityFor({ title: "cleanup orphan helpers" }).tier, "S");
  assert.strictEqual(complexityFor({ title: "audit hook wiring" }).tier, "S");
  assert.strictEqual(complexityFor({ title: "review session diff" }).tier, "S");
});
test("kw L: rewrite / redesign / overhaul", () => {
  assert.strictEqual(complexityFor({ title: "rewrite of MillEngine" }).tier, "L");
  assert.strictEqual(complexityFor({ title: "redesign tribal graph" }).tier, "L");
  assert.strictEqual(complexityFor({ title: "overhaul dispatcher layer" }).tier, "L");
});
test("kw XL: new system / ground-up / greenfield", () => {
  assert.strictEqual(complexityFor({ title: "new system for CAD↔CAM bridge" }).tier, "XL");
  assert.strictEqual(complexityFor({ title: "build out from scratch" }).tier, "XL");
  assert.strictEqual(complexityFor({ title: "greenfield WEDM planner" }).tier, "XL");
});
test("kw precedence: XL > L > S (XL pattern wins when overlapping)", () => {
  // 'new system' is XL; 'rewrite' is L; 'audit' is S — all present, XL wins.
  assert.strictEqual(complexityFor({ title: "new system rewrite audit" }).tier, "XL");
});

// ────────────────────────────────────────────────────────────────
// Tier — description-length proxy (no effort + no keyword)
// ────────────────────────────────────────────────────────────────

test("desc length: <80 chars → S", () => {
  assert.strictEqual(complexityFor({ title: "neutral", description: "short" }).tier, "S");
});
test("desc length: 80..199 chars → M", () => {
  const desc = "x".repeat(150);
  assert.strictEqual(complexityFor({ title: "neutral", description: desc }).tier, "M");
});
test("desc length: 200..499 chars → L", () => {
  const desc = "x".repeat(300);
  assert.strictEqual(complexityFor({ title: "neutral", description: desc }).tier, "L");
});
test("desc length: ≥500 chars → XL", () => {
  const desc = "x".repeat(600);
  assert.strictEqual(complexityFor({ title: "neutral", description: desc }).tier, "XL");
});
test("desc length: empty desc → M (default-floor preserved)", () => {
  assert.strictEqual(complexityFor({ title: "neutral", description: "" }).tier, "M");
});

// ────────────────────────────────────────────────────────────────
// Tier — boundaries (cascade transitions)
// ────────────────────────────────────────────────────────────────

test("boundary: effort exactly at S_MAX_MIN (30) → M (< not ≤)", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: EFFORT_THRESHOLDS.S_MAX_MIN }).tier, "M");
});
test("boundary: desc length exactly at S_MAX (80) → M (< not ≤)", () => {
  const desc = "x".repeat(DESC_LEN_THRESHOLDS.S_MAX);
  assert.strictEqual(complexityFor({ title: "neutral", description: desc }).tier, "M");
});
test("cascade priority: explicit effort > kw > desc-length", () => {
  // effort 480 (XL) wins despite title='audit' (kw → S) and short desc.
  assert.strictEqual(complexityFor({ title: "audit thing", description: "x", effort: 480 }).tier, "XL");
  // No effort + 'audit' kw wins over long desc that would otherwise be XL.
  const longDesc = "x".repeat(600);
  assert.strictEqual(complexityFor({ title: "audit thing", description: longDesc }).tier, "S");
});

// ────────────────────────────────────────────────────────────────
// Verdict — expanded INTEGRATE coverage
// ────────────────────────────────────────────────────────────────

test("verdict: 'integrate' kw (MS0-compat)", () => {
  assert.strictEqual(complexityFor({ title: "integrate FooEngine" }).verdict, "integrate");
});
test("verdict: 'reuse' kw (MS0-compat)", () => {
  assert.strictEqual(complexityFor({ title: "reuse existing BarEngine" }).verdict, "integrate");
});
test("verdict: 'wire' kw (MS0-compat)", () => {
  assert.strictEqual(complexityFor({ title: "wire MyEngine into dispatcher" }).verdict, "integrate");
});
test("verdict: 'doc-fix' kw (new — was BUILD under MS0)", () => {
  assert.strictEqual(complexityFor({ title: "doc-fix CLAUDE.md staleness" }).verdict, "integrate");
});
test("verdict: 'audit' kw (new)", () => {
  assert.strictEqual(complexityFor({ title: "audit dispatcher wiring" }).verdict, "integrate");
});
test("verdict: 'rename' kw (new)", () => {
  assert.strictEqual(complexityFor({ title: "rename mill module to milling" }).verdict, "integrate");
});
test("verdict: 'cleanup' kw (new)", () => {
  assert.strictEqual(complexityFor({ title: "cleanup orphan helpers" }).verdict, "integrate");
});
test("verdict: default → 'build'", () => {
  assert.strictEqual(complexityFor({ title: "implement new feature" }).verdict, "build");
});
test("verdict: 'design' alone → 'build' (design is build-shape, not integrate)", () => {
  assert.strictEqual(complexityFor({ title: "design CAD↔CAM bridge" }).verdict, "build");
});
test("verdict: matches against title OR description", () => {
  assert.strictEqual(
    complexityFor({ title: "do thing", description: "wire EngineX to dispatcher" }).verdict,
    "integrate",
  );
});

// ────────────────────────────────────────────────────────────────
// Adversarial inputs
// ────────────────────────────────────────────────────────────────

test("adversarial: undefined unit → default M/build", () => {
  const r = complexityFor(undefined);
  assert.strictEqual(r.tier, "M");
  assert.strictEqual(r.verdict, "build");
});
test("adversarial: null unit → default M/build", () => {
  const r = complexityFor(null);
  assert.strictEqual(r.tier, "M");
  assert.strictEqual(r.verdict, "build");
});
test("adversarial: empty {} → M/build (default-floor)", () => {
  const r = complexityFor({});
  assert.strictEqual(r.tier, "M");
  assert.strictEqual(r.verdict, "build");
});
test("adversarial: NaN effort → fall through to default", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: NaN }).tier, "M");
});
test("adversarial: Infinity effort → fall through (Number.isFinite filters)", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: Infinity }).tier, "M");
});
test("adversarial: negative effort → fall through", () => {
  assert.strictEqual(complexityFor({ title: "x", effort: -5 }).tier, "M");
});
test("adversarial: effort=0 explicitly → fall through (matches MS0 default-M but via cascade now)", () => {
  // MS0 sent effort=0 → tier=M via the `(typeof === 'number' && >0) ? effort : 120` default.
  // The new cascade sends effort=0 → fall through to kw → desc-len → default M.
  // Unit with empty title+desc → M (matches MS0).
  assert.strictEqual(complexityFor({ title: "", description: "", effort: 0 }).tier, "M");
});
test("adversarial: huge title → no ReDoS, returns within 5ms", () => {
  const huge = "x".repeat(100_000);
  const start = process.hrtime.bigint();
  const r = complexityFor({ title: huge, description: "" });
  const elapsedNs = Number(process.hrtime.bigint() - start);
  assert.ok(r.tier, "should still return a tier");
  assert.ok(elapsedNs < 5_000_000, `ReDoS guard: ${(elapsedNs / 1e6).toFixed(2)}ms`);
});
test("adversarial: title with regex metacharacters", () => {
  const r = complexityFor({ title: "fix [.*+?$^{}|()] regex injection attempt" });
  assert.ok(r.tier, "should still return a tier");
});
test("adversarial: unicode title", () => {
  const r = complexityFor({ title: "rename 弦 to string" });
  assert.strictEqual(r.tier, "S"); // 'rename' kw still wins
  assert.strictEqual(r.verdict, "integrate");
});

// ────────────────────────────────────────────────────────────────
// MS0 back-compat — explicit-effort units hash identically
// ────────────────────────────────────────────────────────────────

test("MS0 back-compat: effort=15 still S+build (would not invalidate sourceHash)", () => {
  // The 4 MS0 effort thresholds (30,120,480) are preserved exactly. Units
  // that had effort set when their sourceHash was checkpointed will produce
  // the same {tier,verdict} → same hash → no stampede re-plan.
  assert.deepStrictEqual(
    complexityFor({ title: "fix bug", description: "...", effort: 15 }),
    { tier: "S", verdict: "build" },
  );
  assert.deepStrictEqual(
    complexityFor({ title: "wire engine", description: "...", effort: 60 }),
    { tier: "M", verdict: "integrate" },
  );
  assert.deepStrictEqual(
    complexityFor({ title: "ship thing", description: "...", effort: 300 }),
    { tier: "L", verdict: "build" },
  );
  assert.deepStrictEqual(
    complexityFor({ title: "rewrite engine", description: "...", effort: 600 }),
    { tier: "XL", verdict: "build" },
  );
});
