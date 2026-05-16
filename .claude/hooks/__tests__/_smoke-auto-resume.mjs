#!/usr/bin/env node
// One-off smoke driver — plain assertions, no node:test runner.
// Run: node .claude/hooks/__tests__/_smoke-auto-resume.mjs
import assert from "node:assert/strict";
import {
  SLOT_NAMES, parseSlotAndTopic, buildCheckinDirective,
  extractResume, ageMinutesFromFrontmatter, stableIdFromSession,
} from "../session-start-auto-resume.mjs";

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); console.log("ok", name); pass++; } catch (e) { console.log("FAIL", name, "::", e.message); fail++; } }

t("SLOT_NAMES has 10 canonical NATO entries", () => {
  for (const n of ["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett"]) {
    assert.equal(SLOT_NAMES.has(n), true, "missing " + n);
  }
  assert.equal(SLOT_NAMES.size, 10);
});

t("SLOT_NAMES rejects kilo / juliet misspelling", () => {
  assert.equal(SLOT_NAMES.has("kilo"), false);
  assert.equal(SLOT_NAMES.has("juliet"), false);
});

t("stableIdFromSession happy", () => {
  assert.equal(stableIdFromSession("549c9f4f-854a-47df-aad4-1783f66f881c"), "claude-549c9f4f");
});

t("stableIdFromSession uppercase normalized", () => {
  assert.equal(stableIdFromSession("DEADBEEF-X"), "claude-deadbeef");
});

t("stableIdFromSession null/empty", () => {
  assert.equal(stableIdFromSession(null), null);
  assert.equal(stableIdFromSession(""), null);
  assert.equal(stableIdFromSession(42), null);
});

t("stableIdFromSession short hex", () => {
  assert.equal(stableIdFromSession("abc"), null);
});

t("extractResume happy", () => {
  const c = "## RESUME\n\nDo the thing\n\n## CONTEXT\nx";
  const r = extractResume(c);
  assert.match(r, /Do the thing/);
});

t("extractResume empty body", () => {
  assert.equal(extractResume("## RESUME\n\n\n## NEXT\nx"), null);
});

t("extractResume null", () => {
  assert.equal(extractResume(null), null);
  assert.equal(extractResume(undefined), null);
  assert.equal(extractResume(42), null);
});

t("extractResume truncates >6000 bytes", () => {
  const huge = "## RESUME\n\n" + "x".repeat(10000) + "\n\n## NEXT\nf";
  const out = extractResume(huge);
  assert.ok(out.length <= 6100);
  assert.match(out, /truncated/);
});

t("ageMinutesFromFrontmatter happy", () => {
  const ts = new Date(Date.now() - 10 * 60_000).toISOString();
  const age = ageMinutesFromFrontmatter("written_at: " + ts + "\n");
  assert.ok(age >= 9.5 && age <= 10.5, "age=" + age);
});

t("ageMinutesFromFrontmatter null on garbage", () => {
  assert.equal(ageMinutesFromFrontmatter("foo: bar"), null);
  assert.equal(ageMinutesFromFrontmatter(""), null);
  assert.equal(ageMinutesFromFrontmatter("written_at: nope"), null);
});

// ── Gap 3 ──
t("parseSlotAndTopic happy (explicit)", () => {
  const c = "slot: charlie\ntopic: obsidian-pipeline-loop\n";
  assert.deepEqual(parseSlotAndTopic(c), { slot: "charlie", topic: "obsidian-pipeline-loop" });
});

t("parseSlotAndTopic blank slot lifts NATO prefix from topic", () => {
  const c = "slot:\ntopic: charlie-obsidian-pipeline-loop\n";
  assert.deepEqual(parseSlotAndTopic(c), { slot: "charlie", topic: "obsidian-pipeline-loop" });
});

t("parseSlotAndTopic blank slot rejects non-NATO prefix", () => {
  const c = "slot:\ntopic: fixture-design-loop\n";
  assert.deepEqual(parseSlotAndTopic(c), { slot: "", topic: "fixture-design-loop" });
});

t("parseSlotAndTopic uppercase slot normalized", () => {
  const c = "slot: CHARLIE\ntopic: x-y\n";
  assert.equal(parseSlotAndTopic(c).slot, "charlie");
});

t("parseSlotAndTopic all 10 NATO slots lift correctly", () => {
  for (const slot of ["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett"]) {
    const c = `slot:\ntopic: ${slot}-suffix\n`;
    const r = parseSlotAndTopic(c);
    assert.equal(r.slot, slot, slot);
    assert.equal(r.topic, "suffix");
  }
});

t("parseSlotAndTopic rejects misspellings (kilo, juliet)", () => {
  for (const bad of ["kilo","juliet","lima","mike"]) {
    const r = parseSlotAndTopic(`slot:\ntopic: ${bad}-x\n`);
    assert.equal(r.slot, "");
    assert.equal(r.topic, `${bad}-x`);
  }
});

t("parseSlotAndTopic null/empty/non-string", () => {
  assert.deepEqual(parseSlotAndTopic(null), { slot: "", topic: "" });
  assert.deepEqual(parseSlotAndTopic(""), { slot: "", topic: "" });
  assert.deepEqual(parseSlotAndTopic(42), { slot: "", topic: "" });
});

t("buildCheckinDirective happy", () => {
  const out = buildCheckinDirective({ slot: "charlie", topic: "obsidian-pipeline-loop" });
  assert.match(out, /\/checkin --topic charlie-obsidian-pipeline-loop/);
  assert.match(out, /NEXT ACTION/);
  assert.match(out, /re-claims the slot heartbeat/);
});

t("buildCheckinDirective empty when missing", () => {
  assert.equal(buildCheckinDirective({ slot: "", topic: "x" }), "");
  assert.equal(buildCheckinDirective({ slot: "alpha", topic: "" }), "");
  assert.equal(buildCheckinDirective({}), "");
  assert.equal(buildCheckinDirective(), "");
});

t("buildCheckinDirective preserves kebab-case dashes", () => {
  const out = buildCheckinDirective({ slot: "india", topic: "a-b-c-d" });
  assert.match(out, /\/checkin --topic india-a-b-c-d/);
});

t("integration: parseSlotAndTopic → buildCheckinDirective round-trip both paths", () => {
  const explicit = parseSlotAndTopic("slot: charlie\ntopic: obsidian-pipeline-loop\n");
  const fallback = parseSlotAndTopic("slot:\ntopic: charlie-obsidian-pipeline-loop\n");
  assert.equal(buildCheckinDirective(explicit), buildCheckinDirective(fallback));
});

console.log(`\nPASS=${pass}  FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
