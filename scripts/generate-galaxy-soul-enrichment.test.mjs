/**
 * generate-galaxy-soul-enrichment.test.mjs -- reference tests for the local-GPU soul-enrichment
 * generator. The load-bearing logic is parseEnrichment: it sanitizes a local-LLM response into
 * a clean {domainFilter, refuses[], specialistBody} (kebab refuses, pipe filter, bounded body),
 * fail-soft. R9. Run: node --test scripts/generate-galaxy-soul-enrichment.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnrichment, buildEnrichPrompt, enumerateGalaxies } from "./generate-galaxy-soul-enrichment.mjs";

test("parseEnrichment: clean response -> sanitized fields", () => {
  const e = parseEnrichment(
    '{"galaxy":"compliance-safety","domainFilter":"S(x)|alarm|gate|compliance","refuses":["approving output below the S(x) gate","softening an alarm severity"],"specialistBody":"Obsesses over the safety gate. Speaks in S(x) and sigma. Never ships below five-sigma."}',
    "compliance-safety"
  );
  assert.equal(e.galaxy, "compliance-safety");
  // domainFilter strips regex-special chars (parens) -> clean keyword alternation; "s(x)"->"sx"
  assert.equal(e.domainFilter, "sx|alarm|gate|compliance");
  assert.equal(e.refuses.length, 2);
  assert.equal(e.refuses[0], "approving-output-below-the-S(x)-gate"); // spaces->dashes, () kept
  assert.ok(e.specialistBody.startsWith("Obsesses over the safety gate"));
});

test("parseEnrichment: a comma-joined refuses string is SPLIT, not fused (regression)", () => {
  // The bug: qwen returned refuses as ["a, b, c, d"]; stripping commas fused them into one blob.
  const e = parseEnrichment('{"galaxy":"x","domainFilter":"a|b","refuses":["reach for claude-flow, parallel fan-out saturates api, spawn second reaper, skip slot claim"],"specialistBody":"b"}', "x");
  assert.equal(e.refuses.length, 4);
  assert.equal(e.refuses[0], "reach-for-claude-flow");
  assert.equal(e.refuses[1], "parallel-fan-out-saturates-api");
  assert.equal(e.refuses[3], "skip-slot-claim");
});

test("parseEnrichment: refuses given as a bare string (not array) still split", () => {
  const e = parseEnrichment('{"galaxy":"x","domainFilter":"a","refuses":"dont-do-x; never-skip-y","specialistBody":"b"}', "x");
  assert.deepEqual(e.refuses, ["dont-do-x", "never-skip-y"]);
});

test("parseEnrichment: caps refuses at 6 and body at 400 chars", () => {
  const many = Array.from({ length: 10 }, (_, i) => `refuse number ${i}`);
  const e = parseEnrichment(JSON.stringify({ galaxy: "x", domainFilter: "a|b", refuses: many, specialistBody: "z".repeat(900) }), "x");
  assert.equal(e.refuses.length, 6);
  assert.ok(e.specialistBody.length <= 400);
});

test("parseEnrichment: domainFilter is normalized (strips junk, collapses pipes)", () => {
  const e = parseEnrichment('{"galaxy":"x","domainFilter":"  Mill | End Mill || Flute! ","refuses":["a"],"specialistBody":"b"}', "x");
  // spaces removed inside tokens, '!' stripped, double pipes collapsed, no leading/trailing pipe
  assert.equal(e.domainFilter, "mill|endmill|flute");
});

test("parseEnrichment: prose-wrapped JSON still parses (shared extractor)", () => {
  const e = parseEnrichment('Here is the soul:\n{"galaxy":"x","domainFilter":"a|b","refuses":["dont-do-x"],"specialistBody":"body"}\nDone.', "x");
  assert.equal(e.domainFilter, "a|b");
  assert.equal(e.refuses[0], "dont-do-x");
});

test("parseEnrichment: no JSON -> parseError, never throws", () => {
  assert.equal(parseEnrichment("the model refused", "x").parseError, "no-json");
  assert.equal(parseEnrichment("", "x").parseError, "no-json");
});

test("parseEnrichment: object present but all fields empty -> empty-fields error", () => {
  assert.equal(parseEnrichment('{"galaxy":"x","domainFilter":"","refuses":[],"specialistBody":""}', "x").parseError, "empty-fields");
});

test("buildEnrichPrompt: grounds in the galaxy + both doctrine files + JSON-only", () => {
  const p = buildEnrichPrompt("wedm", "wedm claude doctrine", "wedm memory brain");
  assert.ok(p.includes("GALAXY: wedm"));
  assert.ok(p.includes("wedm claude doctrine"));
  assert.ok(p.includes("wedm memory brain"));
  assert.ok(p.includes("domainFilter") && p.includes("refuses") && p.includes("specialistBody"));
  assert.ok(/ONLY one JSON object/i.test(p));
});

test("enumerateGalaxies: live FS, >=30 sorted galaxy names", () => {
  const gs = enumerateGalaxies();
  assert.ok(gs.length >= 30, `got ${gs.length}`);
  assert.ok(gs.includes("wedm") && gs.includes("quoting"));
  assert.deepEqual(gs, [...gs].sort());
});
