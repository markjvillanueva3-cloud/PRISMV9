// scripts/extract-operator-prompts.test.mjs
// Tests for U-PROMPT-EXTRACT pure functions. Real reference-value asserts (R9):
// each pins the exact extraction/classification/aggregation behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPrompt, parsePromptText, normalizePrompt, buildRouteMap } from "./extract-operator-prompts.mjs";

// ---- extractPrompt (transcript-line level) ---------------------------------
test("extractPrompt: string-content user turn -> prompt", () => {
  const r = extractPrompt({ type: "user", message: { role: "user", content: "build the widget engine" } });
  assert.equal(r.text, "build the widget engine");
  assert.equal(r.command, null);
});
test("extractPrompt: array-content (tool_result) -> null", () => {
  const r = extractPrompt({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "x" }] } });
  assert.equal(r, null);
});
test("extractPrompt: non-user / missing message -> null", () => {
  assert.equal(extractPrompt({ type: "assistant", message: { content: "hi" } }), null);
  assert.equal(extractPrompt({ type: "user" }), null);
  assert.equal(extractPrompt(null), null);
});

// ---- parsePromptText (the core extractor) ----------------------------------
test("parse: free-text prompt", () => {
  const r = parsePromptText("golf is busy, you do the pull please");
  assert.equal(r.text, "golf is busy, you do the pull please");
  assert.equal(r.command, null);
});
test("parse: slash command with args -> command + args become the directive", () => {
  const r = parsePromptText("<command-message>checkin-alpha</command-message> <command-name>/checkin-alpha</command-name> <command-args>reorient to alpha tasks</command-args>");
  assert.equal(r.command, "checkin-alpha");
  assert.equal(r.args, "reorient to alpha tasks");
  assert.equal(r.text, "reorient to alpha tasks");
});
test("parse: command with namespace + no args -> command kept, text empty", () => {
  const r = parsePromptText("<command-name>/analysis:token-usage</command-name>");
  assert.equal(r.command, "analysis:token-usage");
  assert.equal(r.text, "");
});
test("parse: strips an appended <system-reminder> block, keeps human part", () => {
  const r = parsePromptText("do the thing\n<system-reminder>\nbig injected block\n</system-reminder>");
  assert.equal(r.text, "do the thing");
});
test("parse: local-command-stdout-only turn -> null (not a human prompt)", () => {
  assert.equal(parsePromptText("<local-command-stdout>Resume cancelled</local-command-stdout>"), null);
});
test("parse: empty / pure-ceremony -> null", () => {
  assert.equal(parsePromptText("   "), null);
  assert.equal(parsePromptText(""), null);
  assert.equal(parsePromptText(42), null);
});

// ---- normalizePrompt (dedup) -----------------------------------------------
test("normalize: collapses ws + lowercases + drops volatile ids", () => {
  assert.equal(normalizePrompt("Build   The Widget"), "build the widget");
  assert.equal(normalizePrompt("resume claude-ad9c3041 now"), "resume now"); // id removed, ws collapsed
  const uuid = "ad9c3041-c806-4424-9eed-fea97a4fc64b";
  assert.equal(normalizePrompt(`session ${uuid}`).includes(uuid), false);
});
test("normalize: two prompts differing only by an id normalize equal (dedup)", () => {
  assert.equal(
    normalizePrompt("resume claude-aaaaaaaa"),
    normalizePrompt("resume claude-bbbbbbbb"),
  );
});

// ---- buildRouteMap (aggregate) ---------------------------------------------
test("buildRouteMap: counts by class, attaches route, sorts by frequency", () => {
  const prompts = [
    { text: "build an engine", command: "forge-triple", taskClass: "build" },
    { text: "build another", command: "dedup", taskClass: "build" },
    { text: "scrutinize the diff", command: "scrutinize", taskClass: "review" },
  ];
  const m = buildRouteMap(prompts);
  assert.equal(m.total, 3);
  assert.equal(m.classes[0].taskClass, "build");   // most frequent first
  assert.equal(m.classes[0].count, 2);
  assert.equal(m.classes[0].pct, 66.7);
  assert.ok(m.classes[0].route && Array.isArray(m.classes[0].route.substrateLadder), "route attached from policy");
  assert.deepEqual(m.topCommandFamilies[0], { command: "forge-triple", count: 1 });
  // every one of the 12 classes is present (zero-count ones too)
  assert.equal(m.classes.length, 12);
});
test("buildRouteMap: empty input -> total 0, classes still present", () => {
  const m = buildRouteMap([]);
  assert.equal(m.total, 0);
  assert.equal(m.classes.length, 12);
  assert.equal(m.classes[0].count, 0);
});
test("buildRouteMap: caps examples per class", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ text: `build thing number ${i}`, command: null, taskClass: "build" }));
  const m = buildRouteMap(many);
  const build = m.classes.find((c) => c.taskClass === "build");
  assert.ok(build.examples.length <= 8);
});
