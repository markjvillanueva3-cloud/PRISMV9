/**
 * audit-galaxy-soul-claude-quality.test.mjs -- reference tests for the local-GPU soul/CLAUDE.md
 * quality auditor (AI-SYNERGY-AUDIT-MS0, slot:charlie). The load-bearing logic is parseGrade:
 * a fail-soft extractor of the first balanced JSON object from a (possibly prose-wrapped,
 * code-fenced, truncated) local-LLM response. R9: a real intent test -- it must survive the
 * messy output a 32B/120B local model actually emits, never throw, and clamp grades to 0..1.
 *
 * Run: node --test scripts/audit-galaxy-soul-claude-quality.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGrade, buildGradePrompt, enumerateGalaxies } from "./audit-galaxy-soul-claude-quality.mjs";

const GOOD = '{"galaxy":"mill","soulGrade":0.8,"claudeGrade":0.9,"isStubSoul":false,"isStubClaude":false,"coherent":true,"soulVerdict":"specific machining identity","claudeVerdict":"rich doctrine","topIssues":[]}';

test("parseGrade: clean JSON -> full grade", () => {
  const g = parseGrade(GOOD, "mill");
  assert.equal(g.galaxy, "mill");
  assert.equal(g.soulGrade, 0.8);
  assert.equal(g.claudeGrade, 0.9);
  assert.equal(g.isStubSoul, false);
  assert.equal(g.coherent, true);
  assert.deepEqual(g.topIssues, []);
});

test("parseGrade: code-fenced JSON -> stripped + parsed", () => {
  const g = parseGrade("```json\n" + GOOD + "\n```", "mill");
  assert.equal(g.soulGrade, 0.8);
});

test("parseGrade: prose around JSON -> extracts the object", () => {
  const g = parseGrade(`Here is my assessment of the galaxy:\n${GOOD}\nHope that helps!`, "mill");
  assert.equal(g.claudeGrade, 0.9);
  assert.equal(g.soulVerdict, "specific machining identity");
});

test("parseGrade: braces inside string values do not break extraction", () => {
  const tricky = '{"galaxy":"cad","soulGrade":0.5,"claudeGrade":0.5,"soulVerdict":"uses {placeholder} text","topIssues":["has a } brace"]}';
  const g = parseGrade(tricky, "cad");
  assert.equal(g.soulGrade, 0.5);
  assert.equal(g.topIssues[0], "has a } brace");
});

test("parseGrade: out-of-range grades are clamped to 0..1", () => {
  const g = parseGrade('{"galaxy":"x","soulGrade":1.4,"claudeGrade":-0.3}', "x");
  assert.equal(g.soulGrade, 1);
  assert.equal(g.claudeGrade, 0);
});

test("parseGrade: non-numeric grade -> null (not NaN), never throws", () => {
  const g = parseGrade('{"galaxy":"x","soulGrade":"high","claudeGrade":null}', "x");
  assert.equal(g.soulGrade, null);
  assert.equal(g.claudeGrade, null);
});

test("parseGrade: empty / no-json / unterminated -> parseError, no throw", () => {
  assert.equal(parseGrade("", "a").parseError, "empty");
  assert.equal(parseGrade("the model refused to answer", "b").parseError, "no-json");
  assert.equal(parseGrade('{"galaxy":"c","soulGrade":0.5', "c").parseError, "unterminated");
});

test("parseGrade: malformed JSON -> json parseError, never throws", () => {
  const g = parseGrade('{"galaxy":"d", soulGrade: 0.5,}', "d"); // unquoted key + trailing comma
  assert.equal(g.parseError, "json");
  assert.equal(g.soulGrade, null);
});

test("buildGradePrompt: includes the galaxy name + both file markers + JSON-only instruction", () => {
  const p = buildGradePrompt("wedm", "soul body", "claude body");
  assert.ok(p.includes("GALAXY: wedm"));
  assert.ok(p.includes("=== SOUL.md ==="));
  assert.ok(p.includes("=== CLAUDE.md"));
  assert.ok(p.includes("soul body") && p.includes("claude body"));
  assert.ok(/ONLY a single JSON object/i.test(p));
});

test("buildGradePrompt: missing files render as (missing), never undefined", () => {
  const p = buildGradePrompt("x", "", "");
  assert.ok(p.includes("(missing)"));
  assert.ok(!p.includes("undefined"));
});

test("enumerateGalaxies: returns a non-empty sorted list of real galaxy names (live FS)", () => {
  const gs = enumerateGalaxies();
  assert.ok(Array.isArray(gs) && gs.length >= 30, `expected >=30 galaxies, got ${gs.length}`);
  assert.ok(gs.every((g) => typeof g === "string" && !g.startsWith(".")));
  assert.ok(gs.includes("mill") && gs.includes("quoting"));
  assert.deepEqual(gs, [...gs].sort()); // sorted
});
