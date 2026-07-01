// Tests for cad-knowledge-synth.mjs pure helpers (U-DELTA-CAD-KNOWLEDGE-SYNTH, slot:delta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSynthPrompt, slugifyTip, parseHermesTips, FOCUS_AREAS } from "./cad-knowledge-synth.mjs";

test("buildSynthPrompt: includes the focus + the count, asks for plain numbered lines", () => {
  const p = buildSynthPrompt("fillet conventions", 4);
  assert.match(p, /fillet conventions/);
  assert.match(p, /4 concise/);
  assert.match(p, /plain numbered lines/);
  assert.match(p, /CadQuery/);
});
test("buildSynthPrompt: clamps n to [1,8]; default 4 on bad input", () => {
  assert.match(buildSynthPrompt("x", 99), /8 concise/);
  assert.match(buildSynthPrompt("x", 0), /4 concise/);
  assert.match(buildSynthPrompt("x", "bad"), /4 concise/);
});

test("slugifyTip: deterministic id (content-hash) + readable slug; same tip -> same id (cron-stable dedup)", () => {
  const a = slugifyTip("For mounting brackets, use a 2x2 hole array inset 1.5x diameter from edges.");
  const b = slugifyTip("For mounting brackets, use a 2x2 hole array inset 1.5x diameter from edges.");
  assert.equal(a.id, b.id, "same text -> same id (no Date/random)");
  assert.match(a.id, /^hermes-synth-[0-9a-f]{8}$/);
  assert.notEqual(a.id, slugifyTip("different tip").id);
  assert.ok(a.slug.length <= 60 && a.slug.includes("mounting"));
});

test("parseHermesTips: parses numbered/bulleted lines into CADTribalTip-shaped objects with provenance", () => {
  const text = "1. First heuristic about holes.\n2) Second heuristic about fillets.\n- Third with a dash bullet.";
  const tips = parseHermesTips(text, { focus: "features", model: "grok-4.3" });
  assert.equal(tips.length, 3);
  assert.equal(tips[0].kind, "design-rule");
  assert.equal(tips[0].domain, "cad");
  assert.match(tips[0].source, /hermes\/grok-4\.3 synth: features/);
  assert.match(tips[0].tip, /First heuristic/);
  assert.ok(tips[0].id && tips[0].slug);
});
test("parseHermesTips: joins wrapped continuation lines into one tip", () => {
  const text = "1. A long heuristic that wraps\n   onto a second line.\n2. Another one.";
  const tips = parseHermesTips(text);
  assert.equal(tips.length, 2);
  assert.match(tips[0].tip, /wraps onto a second line/);
});
test("parseHermesTips: dedupes identical lines; drops fragments; empty/null -> [] (never fabricates)", () => {
  const dup = parseHermesTips("1. Same exact tip here please.\n2. Same exact tip here please.");
  assert.equal(dup.length, 1, "content-hash dedup");
  assert.equal(parseHermesTips("1. short").length, 0, "fragment <12 chars dropped");
  assert.deepEqual(parseHermesTips(""), []);
  assert.deepEqual(parseHermesTips(null), []);
});

test("FOCUS_AREAS: covers modeling, design/DFM, assemblies, engineering (the operator's domain mandate)", () => {
  assert.ok(FOCUS_AREAS.length >= 10);
  const joined = FOCUS_AREAS.join(" | ").toLowerCase();
  for (const need of ["hole", "fillet", "tolerance", "assembly", "fastener", "material", "gd&t"]) {
    assert.ok(joined.includes(need), `focus areas should cover "${need}"`);
  }
});
