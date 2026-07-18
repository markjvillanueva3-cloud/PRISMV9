// Tests for xray-blueprint-domain-inject.mjs (U-PSGB-XRAY /goal compile+wire).
// Run: node --test .claude/hooks/xray-blueprint-domain-inject.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSlotIsXray, shouldInject, buildContext } from "./xray-blueprint-domain-inject.mjs";

const SID = "e9b75754-b179-40b0-b0fb-7007d65b2056";
const CHAT = "claude-e9b75754"; // claude-<first8>
const objMap = JSON.stringify({ slots: { xray: { state: { chatId: CHAT } } } });
const flat = JSON.stringify({ xray: { chatId: CHAT } });
const arr = JSON.stringify({ slots: [{ name: "xray", state: { chatId: CHAT } }] });

test("activeSlotIsXray — object-map shape matches", () => {
  assert.equal(activeSlotIsXray(SID, objMap), true);
});
test("activeSlotIsXray — flat shape matches", () => {
  assert.equal(activeSlotIsXray(SID, flat), true);
});
test("activeSlotIsXray — array shape matches", () => {
  assert.equal(activeSlotIsXray(SID, arr), true);
});
test("activeSlotIsXray — wrong chatId does NOT match", () => {
  assert.equal(activeSlotIsXray(SID, JSON.stringify({ slots: { xray: { state: { chatId: "claude-deadbeef" } } } })), false);
});
test("activeSlotIsXray — slot owned by a different session does NOT match", () => {
  assert.equal(activeSlotIsXray("00000000-aaaa", objMap), false);
});
test("activeSlotIsXray — missing xray slot → false", () => {
  assert.equal(activeSlotIsXray(SID, JSON.stringify({ slots: { delta: { state: { chatId: CHAT } } } })), false);
});
test("activeSlotIsXray — malformed JSON → false (never throws)", () => {
  assert.equal(activeSlotIsXray(SID, "{not json"), false);
});
test("activeSlotIsXray — empty/non-string sid → false", () => {
  assert.equal(activeSlotIsXray("", objMap), false);
  assert.equal(activeSlotIsXray(null, objMap), false);
});

test("shouldInject — blueprint keyword fires regardless of slot", () => {
  assert.equal(shouldInject("please extract this blueprint pdf", "x", "{}"), true);
});
test("shouldInject — ocr/gd&t/step keywords fire", () => {
  assert.equal(shouldInject("run OCR on it", "x", "{}"), true);
  assert.equal(shouldInject("parse the GD&T callouts", "x", "{}"), true);
  assert.equal(shouldInject("parse the STEP file", "x", "{}"), true);
});
test("shouldInject — no keyword but xray slot active → true", () => {
  assert.equal(shouldInject("hello unrelated text", SID, objMap), true);
});
test("shouldInject — no keyword and not xray → false", () => {
  assert.equal(shouldInject("hello unrelated text", "00000000-aaaa", objMap), false);
});

test("buildContext — has awareness header + knowledge-index pointer", () => {
  const c = buildContext();
  assert.match(c, /xray blueprint-vision domain awareness/);
  assert.match(c, /\[\[blueprint-vision-knowledge-index\]\]/);
});
test("buildContext — surfaces the verified 0.70 floor, NOT the phantom 0.85/0.95/0.99 as fact", () => {
  const c = buildContext();
  assert.match(c, /0\.70/);
  // the seed tiers may appear only inside a 'NOT seed's' disclaimer, never as a standalone gate
  assert.match(c, /NOT seed's 0\.85\/0\.95\/0\.99/);
});
test("buildContext — names the juliett fast-search store + R8 no-re-OCR", () => {
  const c = buildContext();
  assert.match(c, /jm-die-database/);
  assert.match(c, /R8/);
  assert.match(c, /NEVER re-OCR/);
});
test("buildContext — flags the alpha-seed phantom-engine hazard", () => {
  const c = buildContext();
  assert.match(c, /21 PHANTOM/);
  assert.match(c, /BlueprintVisionOCREngine/);
});
