/**
 * session-start-auto-resume.test.mjs — AUTOCOMPACT-AUTONOMOUS-MS0 / U-AAM01-GAP3-REAPPLY
 *
 * Verifies the Gap 3 patch on `.claude/hooks/session-start-auto-resume.mjs`:
 * after the resume body, the hook must append a `/checkin --topic <slot>-<topic>`
 * NEXT-ACTION directive so the post-/compact chat re-claims its slot heartbeat
 * BEFORE following the resume body. Without this, the compact-release window
 * (opened by precompact-release-slot.mjs) silently lapses the slot binding.
 *
 * Tests are pure functional — the hook's main() spawns a sibling helper which
 * we don't exercise here; instead the exports are invoked directly. End-to-end
 * stdin-driven invocation is covered by a separate smoke test wired in the
 * gap3 commit.
 *
 * Framework: node:test (matches existing PRISM hook test pattern; vitest harness
 * has a pre-existing infra bug in helpers/).
 *
 * @milestone AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01-GAP3-REAPPLY
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SLOT_NAMES,
  parseSlotAndTopic,
  buildCheckinDirective,
  extractResume,
  ageMinutesFromFrontmatter,
  stableIdFromSession,
} from "../session-start-auto-resume.mjs";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_FRONTMATTER_WITH_SLOT = `---
session: claude-549c9f4f
topic: obsidian-pipeline-loop
slot: charlie
written_at: 2026-05-16T00:34:02.465Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-549c9f4f
status: active
---

# HANDOFF: claude-549c9f4f

## RESUME

Continue work on OBSIDIAN-INTELLIGENCE-MS3/A2 follow-up units. Re-apply Gap 3
on session-start-auto-resume.mjs. Commit precompact-release-slot.mjs.

## CONTEXT

(filler)
`;

const VALID_FRONTMATTER_SLOT_BLANK_TOPIC_PREFIXED = `---
session: claude-549c9f4f
topic: charlie-obsidian-pipeline-loop
slot:
written_at: 2026-05-16T00:34:02.465Z
machine: DESKTOP-N7MI1VB
status: active
---

## RESUME

(filler resume body)
`;

const TOPIC_WITHOUT_SLOT_PREFIX = `---
topic: fixture-design-loop
slot:
written_at: 2026-05-16T00:34:02.465Z
---

## RESUME

(filler)
`;

const NO_FRONTMATTER = `# HANDOFF: claude-xxxxxxxx\n## RESUME\n\nbody body body\n`;

const VALID_UUID = "549c9f4f-854a-47df-aad4-1783f66f881c";

// ─── SLOT_NAMES catalog ──────────────────────────────────────────────────────

describe("SLOT_NAMES — canonical 10-slot fleet", () => {
  test("includes all 9 NATO work slots + golf hygiene", () => {
    const expected = ["alpha", "bravo", "charlie", "delta", "echo",
                      "foxtrot", "golf", "hotel", "india", "juliett"];
    for (const name of expected) assert.equal(SLOT_NAMES.has(name), true, `missing slot ${name}`);
    assert.equal(SLOT_NAMES.size, expected.length, "exact size match");
  });

  test("rejects non-canonical names operators may type (kilo, juliet, none)", () => {
    // "kilo" is the operator's repeated mis-type — must NOT be canonical.
    assert.equal(SLOT_NAMES.has("kilo"), false);
    // "juliet" is the common misspelling of "juliett" (NATO double-T).
    assert.equal(SLOT_NAMES.has("juliet"), false);
    // empty + uppercase + numeric all rejected.
    assert.equal(SLOT_NAMES.has(""), false);
    assert.equal(SLOT_NAMES.has("ALPHA"), false);
    assert.equal(SLOT_NAMES.has("1"), false);
  });
});

// ─── stableIdFromSession ─────────────────────────────────────────────────────

describe("stableIdFromSession", () => {
  test("happy: full UUID → claude-<first8hex>", () => {
    assert.equal(stableIdFromSession(VALID_UUID), "claude-549c9f4f");
  });

  test("uppercase hex normalized to lowercase", () => {
    assert.equal(stableIdFromSession("549C9F4F-854A-47DF-AAD4-1783F66F881C"),
                 "claude-549c9f4f");
  });

  test("returns null for null/undefined/empty/non-string", () => {
    assert.equal(stableIdFromSession(null), null);
    assert.equal(stableIdFromSession(undefined), null);
    assert.equal(stableIdFromSession(""), null);
    assert.equal(stableIdFromSession(12345), null);
    assert.equal(stableIdFromSession({}), null);
  });

  test("returns null when fewer than 8 hex chars available", () => {
    assert.equal(stableIdFromSession("abc"), null);
    assert.equal(stableIdFromSession("g-g-g-g-g-g-g"), null);  // no hex at all
  });

  test("adversarial: NUL bytes + control chars stripped via hex filter", () => {
    // The replace(/[^0-9a-f]/gi) drops everything except hex — NUL byte gone,
    // 8 hex chars still recoverable.
    assert.equal(stableIdFromSession("\x00\x01abcdef12\x7frest"),
                 "claude-abcdef12");
  });
});

// ─── extractResume ───────────────────────────────────────────────────────────

describe("extractResume", () => {
  test("happy: pulls body between '## RESUME' and next section", () => {
    const body = extractResume(VALID_FRONTMATTER_WITH_SLOT);
    assert.ok(body);
    assert.match(body, /Continue work on OBSIDIAN-INTELLIGENCE-MS3/);
    assert.ok(!body.includes("## CONTEXT"), "next section excluded");
  });

  test("returns null when no RESUME section exists", () => {
    assert.equal(extractResume("# Handoff\n\nNo resume here"), null);
  });

  test("returns null for empty/whitespace-only resume body", () => {
    assert.equal(extractResume("## RESUME\n\n\n## CONTEXT\nbody"), null);
    assert.equal(extractResume("## RESUME\n   \n## NEXT\nbody"), null);
  });

  test("returns null for null / non-string input (adversarial)", () => {
    assert.equal(extractResume(null), null);
    assert.equal(extractResume(undefined), null);
    assert.equal(extractResume(42), null);
    assert.equal(extractResume(["a", "b"]), null);
  });

  test("truncates resume bodies over 6000 bytes with marker", () => {
    const huge = "## RESUME\n\n" + "x".repeat(10000) + "\n\n## NEXT\nfiller";
    const out = extractResume(huge);
    assert.ok(out);
    assert.ok(out.length <= 6000 + 100, `length ${out.length} should be near 6000`);
    assert.match(out, /\.\.\.\[truncated/);
  });
});

// ─── ageMinutesFromFrontmatter ───────────────────────────────────────────────

describe("ageMinutesFromFrontmatter", () => {
  test("happy: parses ISO timestamp + returns minutes-since", () => {
    const past = new Date(Date.now() - 10 * 60_000).toISOString();
    const fm = `written_at: ${past}\n`;
    const age = ageMinutesFromFrontmatter(fm);
    assert.ok(age >= 9.5 && age <= 10.5, `age ${age} should be ~10`);
  });

  test("quoted timestamps accepted (single + double quotes)", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    assert.ok(ageMinutesFromFrontmatter(`written_at: "${past}"\n`));
    assert.ok(ageMinutesFromFrontmatter(`written_at: '${past}'\n`));
  });

  test("returns null when no written_at field", () => {
    assert.equal(ageMinutesFromFrontmatter("foo: bar"), null);
    assert.equal(ageMinutesFromFrontmatter(""), null);
    assert.equal(ageMinutesFromFrontmatter(null), null);
  });

  test("returns null for unparseable timestamp (NaN guard)", () => {
    assert.equal(ageMinutesFromFrontmatter("written_at: not-a-date"), null);
    assert.equal(ageMinutesFromFrontmatter("written_at: 2026-99-99"), null);
  });

  test("future timestamps produce negative age (no clamp)", () => {
    // Operator setting clock incorrectly shouldn't cause a hook crash —
    // a negative age is honest and the caller can handle it.
    const future = new Date(Date.now() + 60_000).toISOString();
    const age = ageMinutesFromFrontmatter(`written_at: ${future}\n`);
    assert.ok(age != null && age < 0, "future timestamp = negative age");
  });
});

// ─── parseSlotAndTopic — Gap 3 NEW ───────────────────────────────────────────

describe("parseSlotAndTopic — Gap 3", () => {
  test("happy: explicit slot + topic both in frontmatter", () => {
    const r = parseSlotAndTopic(VALID_FRONTMATTER_WITH_SLOT);
    assert.deepEqual(r, { slot: "charlie", topic: "obsidian-pipeline-loop" });
  });

  test("fallback: slot blank, lifts NATO prefix from topic field", () => {
    const r = parseSlotAndTopic(VALID_FRONTMATTER_SLOT_BLANK_TOPIC_PREFIXED);
    // topic="charlie-obsidian-pipeline-loop", slot blank → lift charlie
    assert.deepEqual(r, { slot: "charlie", topic: "obsidian-pipeline-loop" });
  });

  test("fallback REJECTS non-NATO prefix (doesn't lift 'fixture' as slot)", () => {
    const r = parseSlotAndTopic(TOPIC_WITHOUT_SLOT_PREFIX);
    assert.equal(r.slot, "", "non-canonical prefix not lifted");
    assert.equal(r.topic, "fixture-design-loop", "topic preserved unchanged");
  });

  test("uppercase slot field normalized to lowercase", () => {
    const fm = "slot: CHARLIE\ntopic: x-y\n";
    assert.equal(parseSlotAndTopic(fm).slot, "charlie");
  });

  test("all canonical 10 slots accepted as prefix in fallback path", () => {
    for (const slot of ["alpha","bravo","charlie","delta","echo",
                        "foxtrot","golf","hotel","india","juliett"]) {
      const fm = `slot: \ntopic: ${slot}-suffix\n`;
      const r = parseSlotAndTopic(fm);
      assert.equal(r.slot, slot, `${slot} should lift`);
      assert.equal(r.topic, "suffix");
    }
  });

  test("non-canonical prefix rejected (kilo, lima, mike, juliet-misspelled)", () => {
    for (const bad of ["kilo", "lima", "mike", "juliet"]) {
      const fm = `slot: \ntopic: ${bad}-x\n`;
      const r = parseSlotAndTopic(fm);
      assert.equal(r.slot, "", `${bad} prefix must NOT be lifted`);
      assert.equal(r.topic, `${bad}-x`, `${bad} topic preserved verbatim`);
    }
  });

  test("returns empty pair for null/undefined/empty/non-string input", () => {
    assert.deepEqual(parseSlotAndTopic(null), { slot: "", topic: "" });
    assert.deepEqual(parseSlotAndTopic(undefined), { slot: "", topic: "" });
    assert.deepEqual(parseSlotAndTopic(""), { slot: "", topic: "" });
    assert.deepEqual(parseSlotAndTopic(42), { slot: "", topic: "" });
    assert.deepEqual(parseSlotAndTopic({}), { slot: "", topic: "" });
  });

  test("returns empty pair when no frontmatter present", () => {
    assert.deepEqual(parseSlotAndTopic(NO_FRONTMATTER), { slot: "", topic: "" });
  });

  test("topic-only (no slot, no NATO prefix) returns {slot:'', topic:<topic>}", () => {
    const fm = "topic: random-thing\n";
    assert.deepEqual(parseSlotAndTopic(fm), { slot: "", topic: "random-thing" });
  });

  test("topic with single segment (no dash) doesn't lift slot from itself", () => {
    const fm = "slot: \ntopic: nodash\n";
    assert.deepEqual(parseSlotAndTopic(fm), { slot: "", topic: "nodash" });
  });
});

// ─── buildCheckinDirective — Gap 3 NEW ───────────────────────────────────────

describe("buildCheckinDirective — Gap 3", () => {
  test("happy: emits markdown block with /checkin --topic <slot>-<topic>", () => {
    const out = buildCheckinDirective({ slot: "charlie", topic: "obsidian-pipeline-loop" });
    assert.ok(out, "non-empty");
    assert.match(out, /NEXT ACTION/);
    assert.match(out, /\/checkin --topic charlie-obsidian-pipeline-loop/);
    assert.match(out, /re-claims the slot heartbeat/);
  });

  test("returns empty string when slot is missing", () => {
    assert.equal(buildCheckinDirective({ slot: "", topic: "x" }), "");
    assert.equal(buildCheckinDirective({ topic: "x" }), "");
  });

  test("returns empty string when topic is missing", () => {
    assert.equal(buildCheckinDirective({ slot: "alpha", topic: "" }), "");
    assert.equal(buildCheckinDirective({ slot: "alpha" }), "");
  });

  test("returns empty string when both fields missing", () => {
    assert.equal(buildCheckinDirective({}), "");
    assert.equal(buildCheckinDirective(), "");
  });

  test("topic preserves dashes (kebab-case) verbatim in arg", () => {
    const out = buildCheckinDirective({ slot: "india", topic: "a-b-c-d" });
    assert.match(out, /\/checkin --topic india-a-b-c-d/);
  });

  test("integration: parseSlotAndTopic → buildCheckinDirective round-trip", () => {
    // Real-world case: handoff with slot-prefixed topic + blank slot field.
    const parsed = parseSlotAndTopic(VALID_FRONTMATTER_SLOT_BLANK_TOPIC_PREFIXED);
    const directive = buildCheckinDirective(parsed);
    assert.match(directive, /\/checkin --topic charlie-obsidian-pipeline-loop/);
  });

  test("integration: explicit-slot handoff produces same arg as fallback-lifted", () => {
    const explicit = parseSlotAndTopic(VALID_FRONTMATTER_WITH_SLOT);
    const fallback = parseSlotAndTopic(VALID_FRONTMATTER_SLOT_BLANK_TOPIC_PREFIXED);
    assert.equal(
      buildCheckinDirective(explicit),
      buildCheckinDirective(fallback),
      "both paths must yield identical /checkin invocation",
    );
  });
});
