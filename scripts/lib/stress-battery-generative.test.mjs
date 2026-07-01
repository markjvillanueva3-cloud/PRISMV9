// scripts/lib/stress-battery-generative.test.mjs
//
// Proves the GENERATIVE battery's reference-overlap metric (coversFacts) is REAL -- it passes
// only when every required fact-group is present and fails when a key fact is dropped (the
// failure mode that matters for a generative offload). Pure -> no model/network.

import test from "node:test";
import assert from "node:assert/strict";
import { coversFacts, BATTERY } from "./stress-battery-generative.mjs";

test("coversFacts: passes when EVERY fact-group has a synonym present", () => {
  assert.equal(
    coversFacts("server started on port 3100 with 312 engines", [["3100"], ["312", "engines"], ["start", "up"]]),
    true,
  );
});

test("coversFacts: FAILS when one fact-group is missing (a dropped key fact)", () => {
  assert.equal(coversFacts("server started on port 3100", [["3100"], ["312", "engines"]]), false);
});

test("coversFacts: a group is satisfied by ANY one of its synonyms", () => {
  assert.equal(coversFacts("the cut produced zero scrap", [["scrap", "no scrap", "zero scrap"]]), true);
});

test("coversFacts: case-insensitive matching", () => {
  assert.equal(coversFacts("PORT 3100 READY", [["port"], ["ready", "up"]]), true);
});

test("coversFacts: empty output -> false", () => {
  assert.equal(coversFacts("", [["x"]]), false);
});

test("coversFacts: empty / invalid group list -> false (no vacuous pass)", () => {
  assert.equal(coversFacts("anything", []), false);
  assert.equal(coversFacts("anything", undefined), false);
});

test("BATTERY: every task is stratified + has cases + prompt + verify", () => {
  for (const t of BATTERY) {
    assert.ok(["easy", "medium", "hard"].includes(t.difficulty), `${t.id} has a difficulty`);
    assert.ok(Array.isArray(t.cases) && t.cases.length > 0, `${t.id} has cases`);
    assert.equal(typeof t.prompt, "function", `${t.id} prompt is a fn`);
    assert.equal(typeof t.verify, "function", `${t.id} verify is a fn`);
  }
});

test("BATTERY: covers summarize + explain across all 3 difficulties", () => {
  const modes = new Set(BATTERY.map((t) => t.category));
  const diffs = new Set(BATTERY.map((t) => t.difficulty));
  assert.ok(modes.has("generative-summarize") && modes.has("generative-explain"));
  assert.deepEqual([...diffs].sort(), ["easy", "hard", "medium"]);
});

test("BATTERY: each task's own verify grades its synthetic good/bad answers (end-to-end metric)", () => {
  for (const t of BATTERY) {
    for (const c of t.cases) {
      const good = c.must.map((g) => g[0]).join(" ; ");
      const bad = c.must.slice(0, -1).map((g) => g[0]).join(" ; ") || "(none)";
      assert.equal(t.verify(good, c), true, `${t.id} good answer should PASS`);
      assert.equal(t.verify(bad, c), false, `${t.id} fact-dropping answer should FAIL`);
    }
  }
});
