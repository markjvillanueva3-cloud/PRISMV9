import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPipelines, matchAgents } from "./rgs-pipeline-rules.mjs";

test("pdf/document text -> /pdf-learn", () => {
  assert.ok(matchPipelines({ title:"Ingest vendor PDF catalog", description:"parse document" }).some(x=>x.skill==="/pdf-learn"));
});

test("new engine+skill+hook -> /forge-triple", () => {
  assert.ok(matchPipelines({ title:"Create FooEngine + skill + hook", description:"" }).some(x=>x.skill==="/forge-triple"));
});

test("unwired/dispatcher wiring -> /wire-unwired", () => {
  assert.ok(matchPipelines({ title:"Wire BarEngine to dispatcher", description:"needs wiring" }).some(x=>x.skill==="/wire-unwired"));
});

test("physics/kienzle unit -> physics-reviewer agent", () => {
  assert.ok(matchAgents({ title:"Kienzle force model fix", description:"cutting force" }).includes("physics-reviewer"));
});

test("CONTRAPOSITIVE: pure-docs unit does NOT map to /forge-triple", () => {
  assert.equal(matchPipelines({ title:"Update README wording", description:"docs only" }).some(x=>x.skill==="/forge-triple"), false);
});

test("every unit gets >=1 pipeline (generic fallback when no keyword hits)", () => {
  assert.ok(matchPipelines({ title:"zxqv", description:"" }).length >= 1);
});

test("test/coverage unit -> test-team pipeline", () => {
  assert.ok(matchPipelines({ title:"Add vitest coverage for X", description:"test" }).some(x=>x.skill==="test-team"));
});

test("matchAgents returns [] for a plain unit with no review-triggering keywords", () => {
  assert.deepEqual(matchAgents({ title:"Update README wording", description:"docs" }), []);
});
