import { test } from "node:test";
import assert from "node:assert/strict";
import { SCRUTINY_SOULS, parseSoulVerdict, mergeSoulReviews, renderSoulBanner } from "./scrutiny-souls.mjs";

test("SCRUTINY_SOULS: 5 distinct souls, each with a non-empty distinct system prompt", () => {
  assert.equal(SCRUTINY_SOULS.length, 5);
  const ids = SCRUTINY_SOULS.map((s) => s.id);
  assert.deepEqual([...new Set(ids)], ids, "ids are unique");
  const systems = SCRUTINY_SOULS.map((s) => s.system);
  assert.deepEqual([...new Set(systems)], systems, "system prompts are DISTINCT (real diversity, not N copies)");
  for (const s of SCRUTINY_SOULS) {
    assert.ok(s.id && s.name && s.system.length > 60, `${s.id} is fully populated`);
  }
  assert.ok(ids.includes("correctness-hawk") && ids.includes("security-skeptic") && ids.includes("test-integrity"));
});

test("parseSoulVerdict: canonical VERDICT line -> pass/fail; last wins; missing -> unknown", () => {
  assert.equal(parseSoulVerdict("looks fine.\nVERDICT: PASS").verdict, "pass");
  assert.equal(parseSoulVerdict("off-by-one at x.ts:9\nVERDICT: FAIL").verdict, "fail");
  // last occurrence wins (a model that restates)
  assert.equal(parseSoulVerdict("VERDICT: PASS\n...actually\nVERDICT: FAIL").verdict, "fail");
  assert.equal(parseSoulVerdict("verdict: pass").verdict, "pass", "case-insensitive");
  // bare FAIL token (model dropped the prefix) still counts as fail; bare ambiguous -> unknown
  assert.equal(parseSoulVerdict("this is a FAIL").verdict, "fail");
  assert.equal(parseSoulVerdict("no verdict token here").verdict, "unknown");
  assert.equal(parseSoulVerdict("").verdict, "unknown");
  assert.equal(parseSoulVerdict(null).verdict, "unknown");
});

test("mergeSoulReviews: clean when all-pass; concerns on a FAIL; degraded when <2 answered", () => {
  const ok = (soul, verdict, findings = "") => ({ soul, name: soul, ok: true, verdict, findings });
  // all pass -> clean
  const clean = mergeSoulReviews([ok("a", "pass"), ok("b", "pass"), ok("c", "pass")]);
  assert.equal(clean.grade, "clean");
  assert.equal(clean.fails, 0);
  assert.equal(clean.advisory, true);
  // a FAIL -> concerns + the fail soul's findings surface
  const concerns = mergeSoulReviews([ok("a", "pass"), ok("b", "fail", "secret leak at z.ts:3"), ok("c", "pass")]);
  assert.equal(concerns.grade, "concerns");
  assert.equal(concerns.fails, 1);
  assert.equal(concerns.failSouls[0].soul, "b");
  assert.match(concerns.failSouls[0].findings, /secret leak/);
  // <2 souls reached the lane (Hermes down) -> degraded (arm not trustworthy this run), never blocks
  const degraded = mergeSoulReviews([ok("a", "pass"), { soul: "b", name: "b", ok: false, verdict: "unknown", findings: "" }]);
  assert.equal(degraded.grade, "degraded");
  assert.equal(degraded.answered, 1);
  // empty -> degraded, no throw
  assert.equal(mergeSoulReviews([]).grade, "degraded");
  assert.equal(mergeSoulReviews(null).grade, "degraded");
});

test("renderSoulBanner: always advisory, never claims to affect the gate", () => {
  const b = renderSoulBanner(mergeSoulReviews([{ soul: "a", name: "a", ok: true, verdict: "fail", findings: "x" }, { soul: "b", name: "b", ok: true, verdict: "pass", findings: "" }]));
  assert.match(b, /ADVISORY/);
  assert.match(b, /does NOT affect the 3-of-3/);
  assert.match(renderSoulBanner(null), /no result/);
});
