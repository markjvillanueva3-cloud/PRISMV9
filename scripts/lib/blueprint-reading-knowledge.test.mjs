// scripts/lib/blueprint-reading-knowledge.test.mjs
//
// U-XRAY-READING-KNOWLEDGE -- reference-value + invariant tests for the curated reading-knowledge bundle
// and its integration into the live VLM prompt. The load-bearing property is BOUNDEDNESS (no prompt
// bloat) + BYTE-IDENTICAL base prompt when no guidance is injected (zero regression on the proven path).
// Run: node scripts/lib/blueprint-reading-knowledge.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  READING_GUIDANCE,
  DEFAULT_MAX_ITEMS,
  DEFAULT_MAX_CHARS,
  selectReadingGuidanceEntries,
  buildReadingGuidanceBlock,
} from "./blueprint-reading-knowledge.mjs";
import { buildVisionPrompt } from "./ollama-vision-extract-lib.mjs";

const idsOf = (entries) => entries.map((e) => e.id);

test("bundle integrity: unique ids, valid priority, non-empty ASCII text, kinds array", () => {
  const ids = READING_GUIDANCE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique (dedup key)");
  for (const e of READING_GUIDANCE) {
    assert.ok([1, 2, 3].includes(e.priority), `priority of ${e.id} must be 1..3`);
    assert.ok(typeof e.text === "string" && e.text.length > 0, `${e.id} text non-empty`);
    assert.ok(/^[\x00-\x7F]*$/.test(e.text), `${e.id} text must be ASCII (PS 5.1 / grep safe)`);
    assert.ok(Array.isArray(e.kinds), `${e.id} kinds is an array`);
    assert.ok(typeof e.source === "string" && e.source.length > 0, `${e.id} carries provenance`);
  }
});

test("always-entries are selected regardless of part class / target kinds", () => {
  const got = idsOf(selectReadingGuidanceEntries({}));
  // runout-misread (p1), customer-convention (p1), material (p2) are always:true high-signal
  assert.ok(got.includes("gdt-runout-misread"), "runout misread is always present");
  assert.ok(got.includes("customer-convention"), "customer convention is always present");
});

test("general print (no targetKinds) surfaces per-callout guidance, but an explicit targetKinds filters it", () => {
  // the LIVE ensemble call passes only partClass + wireEdm (no targetKinds) -> all callout tips relevant.
  // Use a generous char budget here to isolate the SELECTION semantics from the (separately-tested) cap.
  const general = idsOf(selectReadingGuidanceEntries({ partClass: "generic", maxItems: 20, maxChars: 5000 }));
  assert.ok(general.includes("read-diameter") && general.includes("read-thread"), "general print fires per-callout entries");
  // a caller that NARROWS to specific kinds gets focused guidance (per-callout entries off-target are dropped)
  const narrow = idsOf(selectReadingGuidanceEntries({ partClass: "generic", targetKinds: ["material"], maxItems: 20, maxChars: 5000 }));
  assert.ok(!narrow.includes("read-thread"), "explicit targetKinds excludes the off-target thread entry");
  assert.ok(narrow.includes("read-material"), "always-entry (material) survives the narrow filter");
});

test("kind match: a thread target pulls in the thread entry; absent it is excluded", () => {
  const withThread = idsOf(selectReadingGuidanceEntries({ targetKinds: ["thread", "hole"], maxItems: 20 }));
  assert.ok(withThread.includes("read-thread"), "thread target -> read-thread included");

  const noThread = idsOf(selectReadingGuidanceEntries({ targetKinds: ["surface_finish_only"], maxItems: 20, partClass: "plate" }));
  assert.ok(!noThread.includes("read-thread"), "no thread context -> read-thread excluded");
});

test("part-class tokens count toward relevance (bore -> diameter entry)", () => {
  const got = idsOf(selectReadingGuidanceEntries({ partClass: "stepped bore bushing", maxItems: 20 }));
  assert.ok(got.includes("read-diameter"), "bore part-class -> read-diameter (kinds includes 'bore')");
});

test("priority ordering: p1 entries precede p3 entries", () => {
  const got = idsOf(selectReadingGuidanceEntries({ targetKinds: ["linear", "runout"], maxItems: 20 }));
  const iRunout = got.indexOf("gdt-runout-misread"); // priority 1
  const iLinear = got.indexOf("read-linear");        // priority 3
  assert.ok(iRunout >= 0 && iLinear >= 0, "both present");
  assert.ok(iRunout < iLinear, "priority-1 sorts before priority-3");
});

test("maxItems caps the selection count", () => {
  const got = selectReadingGuidanceEntries({ targetKinds: READING_GUIDANCE.flatMap((e) => e.kinds), maxItems: 3 });
  assert.equal(got.length, 3, "exactly maxItems entries");
});

test("maxChars bounds the block but never drops the first (highest-priority) entry", () => {
  const tiny = selectReadingGuidanceEntries({ targetKinds: ["linear", "runout", "thread", "radius"], maxItems: 20, maxChars: 10 });
  assert.equal(tiny.length, 1, "char cap of 10 keeps exactly the first highest-priority entry");
  // the first kept entry must be a priority-1 always entry (runout-misread or customer-convention), not a p3
  assert.ok([1].includes(tiny[0].priority), "the one kept entry is priority-1");

  const block = buildReadingGuidanceBlock({ targetKinds: READING_GUIDANCE.flatMap((e) => e.kinds), maxChars: 500 });
  // block length is roughly bounded by maxChars + the header line (allow header overhead)
  assert.ok(block.length <= 500 + 120, `block length ${block.length} stays near the char budget`);
});

test("defaults are sane and bounded (no prompt-bloat by default)", () => {
  assert.ok(DEFAULT_MAX_ITEMS >= 4 && DEFAULT_MAX_ITEMS <= 12, "default item cap is modest");
  assert.ok(DEFAULT_MAX_CHARS >= 600 && DEFAULT_MAX_CHARS <= 1600, "default char budget is modest");
  const full = buildReadingGuidanceBlock({ targetKinds: READING_GUIDANCE.flatMap((e) => e.kinds) });
  assert.ok(full.length <= DEFAULT_MAX_CHARS + 160, "default full block stays within budget + header");
});

test("buildReadingGuidanceBlock: header + one bullet per selected entry", () => {
  const block = buildReadingGuidanceBlock({ targetKinds: ["thread"], maxItems: 20 });
  const lines = block.split("\n");
  assert.match(lines[0], /^DOMAIN READING GUIDANCE/, "starts with the header");
  const bullets = lines.slice(1);
  assert.ok(bullets.length >= 1, "has at least one bullet");
  assert.ok(bullets.every((l) => l.startsWith("- ")), "every guidance line is a bullet");
  assert.equal(bullets.length, selectReadingGuidanceEntries({ targetKinds: ["thread"], maxItems: 20 }).length, "one bullet per selected entry");
});

test("edge inputs: null/undefined are safe and still yield the always entries", () => {
  assert.ok(selectReadingGuidanceEntries(undefined).length > 0, "undefined opts -> always entries");
  assert.ok(selectReadingGuidanceEntries({ partClass: null, targetKinds: null }).length > 0, "null fields safe");
  assert.equal(typeof buildReadingGuidanceBlock({}), "string", "always returns a string");
});

// ---- integration with the live prompt builder (the zero-regression guarantee) ----

test("buildVisionPrompt is BYTE-IDENTICAL when no reading guidance is supplied", () => {
  const base = buildVisionPrompt("die");
  assert.equal(buildVisionPrompt("die", {}), base, "empty opts == bare call");
  assert.equal(buildVisionPrompt("die", { readingGuidance: "" }), base, "empty string == bare call");
  assert.equal(buildVisionPrompt("die", { readingGuidance: "   " }), base, "whitespace-only == bare call");
  assert.ok(!base.includes("DOMAIN READING GUIDANCE"), "base prompt carries no guidance header");
});

test("buildVisionPrompt APPENDS the guidance block verbatim when supplied (opt-in)", () => {
  const block = buildReadingGuidanceBlock({ partClass: "punch", targetKinds: ["diameter", "thread"], maxItems: 20 });
  const prompt = buildVisionPrompt("punch", { partClass: "punch", readingGuidance: block });
  assert.ok(prompt.includes(block), "the exact block appears in the prompt");
  assert.ok(prompt.includes("DOMAIN READING GUIDANCE"), "guidance header present");
  // the proven base content is preserved (no replacement of the schema/rules)
  assert.ok(prompt.includes("Return ONLY the JSON object"), "base JSON instruction preserved");
  assert.ok(prompt.includes('"gdt"'), "base schema preserved");
});

test("wireEdm + readingGuidance compose without disturbing the wireEdm block", () => {
  const block = buildReadingGuidanceBlock({ wireEdm: true, partClass: "die", maxItems: 20 });
  const wOnly = buildVisionPrompt("die", { wireEdm: true });
  const wBoth = buildVisionPrompt("die", { wireEdm: true, readingGuidance: block });
  assert.ok(wBoth.startsWith(wOnly), "the wireEdm prompt is a prefix -> reading guidance only ever APPENDS");
  assert.ok(wBoth.includes("WIRE EDM"), "wireEdm block intact");
  assert.ok(wBoth.includes("DOMAIN READING GUIDANCE"), "guidance appended after");
});
