// Tests for weekly-synth-llm.mjs — the optional local-LLM per-galaxy theme pass
// for the weekly memory synthesis. Real assertions on prompt content, theme
// cleaning, largest-group selection + minGroup gate, and fail-open (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGroupPrompt, cleanTheme, synthesizeGroups } from "./weekly-synth-llm.mjs";

const entries = (...heads) => heads.map((h, i) => ({ name: `m${i}.md`, head: h }));

// ── buildGroupPrompt ───────────────────────────────────────────────────────
test("buildGroupPrompt: names the galaxy, lists titles, carries the NONE escape", () => {
  const p = buildGroupPrompt("mill", entries("Kienzle force fix", "Spindle load guard"));
  assert.ok(p.includes('"mill"'), "galaxy named");
  assert.ok(p.includes("Kienzle force fix") && p.includes("Spindle load guard"), "titles listed");
  assert.ok(/reply exactly: NONE/.test(p), "NONE escape present");
  assert.ok(/WEEK'S THEME/.test(p), "theme instruction present");
});
test("buildGroupPrompt: falls back to name when a head is missing; empty group is safe", () => {
  const p = buildGroupPrompt("cad", [{ name: "reference_step_roundtrip.md" }]);
  assert.ok(p.includes("reference_step_roundtrip"), "name used when head absent");
  assert.ok(typeof buildGroupPrompt("x", []) === "string", "empty group → still a string");
});

// ── cleanTheme ──────────────────────────────────────────────────────────────
test("cleanTheme: keeps a 1-2 sentence theme, collapsing newlines", () => {
  assert.equal(cleanTheme("The week advanced OCR parsing.\nTwo bugs were fixed."),
    "The week advanced OCR parsing. Two bugs were fixed.");
});
test("cleanTheme: NONE / empty → dropped; wrapping quotes stripped", () => {
  assert.equal(cleanTheme("NONE"), "");
  assert.equal(cleanTheme("none, no theme"), "");
  assert.equal(cleanTheme(""), "");
  assert.equal(cleanTheme(null), "");
  assert.equal(cleanTheme('"A tight theme."'), "A tight theme.");
});
test("cleanTheme: over-maxWords (rambled) dropped at the boundary", () => {
  const long = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ");
  assert.equal(cleanTheme(long, 50), "");
  assert.equal(cleanTheme("four short words only", 50), "four short words only");
});

// ── synthesizeGroups ─────────────────────────────────────────────────────────
test("synthesizeGroups: no callFn → empty themes map", async () => {
  const themes = await synthesizeGroups({ mill: entries("a", "b", "c") }, {});
  assert.equal(themes.size, 0);
});

test("synthesizeGroups: themes the largest groups first, gated by minGroup + maxGroups", async () => {
  const groups = {
    mill: entries("a", "b", "c", "d"),   // 4 — themed
    cad: entries("e", "f", "g"),         // 3 — themed (== minGroup)
    tiny: entries("h", "i"),             // 2 — below minGroup, skipped
  };
  const seen = [];
  const callFn = async (prompt) => { seen.push(prompt.match(/"(\w+)"/)[1]); return `Theme for that domain.`; };
  const themes = await synthesizeGroups(groups, { callFn, minGroup: 3, maxGroups: 5 });
  assert.deepEqual(seen, ["mill", "cad"], "largest-first, tiny (below minGroup) skipped");
  assert.equal(themes.get("mill"), "Theme for that domain.");
  assert.equal(themes.get("cad"), "Theme for that domain.");
  assert.equal(themes.has("tiny"), false);
});

test("synthesizeGroups: maxGroups caps how many groups call the model", async () => {
  const groups = { a: entries("1", "2", "3"), b: entries("4", "5", "6"), c: entries("7", "8", "9") };
  let calls = 0;
  const themes = await synthesizeGroups(groups, { callFn: async () => { calls++; return "T."; }, minGroup: 3, maxGroups: 2 });
  assert.equal(calls, 2, "only top-2 groups themed");
  assert.equal(themes.size, 2);
});

test("synthesizeGroups: 'NONE' reply → that group gets no theme", async () => {
  const themes = await synthesizeGroups({ mill: entries("a", "b", "c") }, { callFn: async () => "NONE", minGroup: 3 });
  assert.equal(themes.size, 0);
});

test("synthesizeGroups: fail-open — a throwing callFn yields no themes, never throws", async () => {
  const themes = await synthesizeGroups({ mill: entries("a", "b", "c") }, { callFn: async () => { throw new Error("down"); }, minGroup: 3 });
  assert.equal(themes.size, 0);
});
