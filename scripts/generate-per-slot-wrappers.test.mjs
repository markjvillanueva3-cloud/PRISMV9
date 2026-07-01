// generate-per-slot-wrappers.test.mjs — drift-guard for the slot expansion.
// Run: node --test H:/prism/scripts/generate-per-slot-wrappers.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SLOT_NAMES as CHAT_SLOTS_NAMES } from "../.claude/helpers/chat-slots.mjs";

// Extract the SLOT_NAMES array literal from the generator source.
// (The generator's SLOT_NAMES is a private const; we can't import without
// running the script. Parsing is safer for a drift-guard test.)
function extractGeneratorSlotNames() {
  const src = readFileSync("H:/prism/scripts/generate-per-slot-wrappers.mjs", "utf8");
  // Locate `const SLOT_NAMES = [` and read until the matching `];`
  const start = src.indexOf("const SLOT_NAMES");
  assert.ok(start > 0, "generator must declare const SLOT_NAMES");
  const arrStart = src.indexOf("[", start);
  const arrEnd = src.indexOf("];", arrStart);
  const arrBody = src.slice(arrStart + 1, arrEnd);
  return arrBody.split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s && /^[a-z]+$/.test(s));
}

test("SLOT_NAMES drift-guard: generator + chat-slots.mjs must declare identical arrays", () => {
  const generatorNames = extractGeneratorSlotNames();
  assert.deepEqual(
    generatorNames,
    CHAT_SLOTS_NAMES,
    `generator SLOT_NAMES drifted from chat-slots.mjs SLOT_NAMES.\n  generator: ${JSON.stringify(generatorNames)}\n  chat-slots: ${JSON.stringify(CHAT_SLOTS_NAMES)}\nKeep them in sync — both must declare the full NATO alphabet.`
  );
});

test("SLOT_NAMES: contains the full NATO alphabet (alpha..zulu, 26 entries)", () => {
  const expected = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett",
    "kilo", "lima", "mike", "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
    "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
  ];
  assert.deepEqual(CHAT_SLOTS_NAMES, expected);
  assert.equal(CHAT_SLOTS_NAMES.length, 26);
});

test("Per-slot wrappers present for all 26 slots × 4 commands (precompact, handoff, startup, checkin)", () => {
  const commands = ["precompact", "handoff", "startup", "checkin"];
  const missing = [];
  for (const slot of CHAT_SLOTS_NAMES) {
    for (const cmd of commands) {
      const p = `H:/prism/.claude/commands/${cmd}-${slot}.md`;
      if (!existsSync(p)) missing.push(`${cmd}-${slot}.md`);
    }
  }
  assert.deepEqual(missing, [], `Missing wrappers: ${missing.join(", ")}\nRun: node H:/prism/scripts/generate-per-slot-wrappers.mjs`);
});

test("Each new /checkin-<nato> wrapper references the correct slot name + topic", () => {
  // Spot-check 3 of the new ones
  for (const slot of ["november", "tango", "zulu"]) {
    const p = `H:/prism/.claude/commands/checkin-${slot}.md`;
    assert.ok(existsSync(p), `checkin-${slot}.md must exist`);
    const body = readFileSync(p, "utf8");
    assert.match(body, new RegExp(`\\b${slot}\\b`), `checkin-${slot}.md must mention "${slot}"`);
    assert.match(body, new RegExp(`${slot}-work`), `checkin-${slot}.md must bind topic "${slot}-work"`);
  }
});
