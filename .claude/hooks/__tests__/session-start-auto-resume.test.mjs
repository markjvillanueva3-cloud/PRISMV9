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
  buildBootResumeContext,
  buildSlotWrapperDirective,
  extractResume,
  extractMemorySeed,
  ageMinutesFromFrontmatter,
  stableIdFromSession,
  slotForWindowId,
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

describe("SLOT_NAMES — canonical 26-slot fleet", () => {
  test("includes all 26 NATO phonetic slots (alpha..zulu)", () => {
    // SLOT-RECLAIM (2026-05-19): realigned 10→13→26. The canonical
    // chat-slots.mjs SLOT_NAMES is the full NATO alphabet (alpha..zulu); the
    // hook's hardcoded copy and this test had drifted (10 → 13). Realigned to
    // 26 so november..zulu pass SLOT_NAMES.has() membership checks.
    const expected = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
                      "golf", "hotel", "india", "juliett", "kilo", "lima",
                      "mike", "november", "oscar", "papa", "quebec", "romeo",
                      "sierra", "tango", "uniform", "victor", "whiskey",
                      "xray", "yankee", "zulu"];
    for (const name of expected) assert.equal(SLOT_NAMES.has(name), true, `missing slot ${name}`);
    assert.equal(SLOT_NAMES.size, expected.length, "exact size match");
  });

  test("rejects non-canonical names operators may type (misspellings, format errors)", () => {
    // "juliet" is the common misspelling of "juliett" (NATO double-T).
    assert.equal(SLOT_NAMES.has("juliet"), false);
    // chat-slots.mjs uses "xray" — the hyphenated "x-ray" is NOT canonical.
    assert.equal(SLOT_NAMES.has("x-ray"), false);
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
    // SLOT-RECLAIM (2026-05-19): regex realigned. extractResume emits a
    // Unicode-ellipsis marker "…[truncated — full RESUME in handoff file]";
    // the stale test matched three ASCII dots "...[truncated" and never did.
    assert.match(out, /\[truncated — full RESUME in handoff file\]/);
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

  test("all canonical 26 slots accepted as prefix in fallback path", () => {
    // SLOT-RECLAIM (2026-05-19): realigned to the full 26-slot NATO fleet.
    for (const slot of ["alpha","bravo","charlie","delta","echo","foxtrot",
                        "golf","hotel","india","juliett","kilo","lima","mike",
                        "november","oscar","papa","quebec","romeo","sierra",
                        "tango","uniform","victor","whiskey","xray","yankee",
                        "zulu"]) {
      const fm = `slot: \ntopic: ${slot}-suffix\n`;
      const r = parseSlotAndTopic(fm);
      assert.equal(r.slot, slot, `${slot} should lift`);
      assert.equal(r.topic, "suffix");
    }
  });

  test("non-canonical prefix rejected (juliet-misspelled, x-ray-hyphenated, fixture)", () => {
    // SLOT-RECLAIM (2026-05-19): kilo/lima/mike are now CANONICAL (26-slot
    // fleet) — they MUST lift. Replaced with genuinely non-canonical prefixes:
    // a misspelling, the hyphenated form of "xray", and a non-NATO word.
    for (const bad of ["juliet", "x-ray", "fixture"]) {
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

// ─── buildBootResumeContext — SESSION-CONTINUITY-MS0 full-restart boot ────────
//
// Covers the pure builder behind main()'s `startup` branch: the full-terminal-
// restart resume path where the launcher passes PRISM_BOOT_SLOT. main() wraps
// this with an env read + a getHandoffBySlot subprocess; end-to-end stdin
// invocation is exercised by _smoke-auto-resume.mjs.

describe("buildBootResumeContext — SESSION-CONTINUITY-MS0", () => {
  // A handoff is "fresh" when written_at is recent, "stale" when older than
  // MAX_AGE_MIN (default 720 = 12h, F5 2026-06-08; was 240/4h). Dynamic
  // timestamps so the freshness boundary is exercised regardless of when the
  // suite runs.
  const freshHandoff = (slot, resumeBody = "Resume the work - finish U-SC01.") => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    return `---
slot: ${slot}
topic: ${slot}-test-topic
written_at: ${recent}
status: active
---

## STATE
prior state

## RESUME

${resumeBody}

## CONTEXT
`;
  };
  const staleHandoff = (slot) => {
    const old = new Date(Date.now() - 24 * 60 * 60_000).toISOString(); // 24h ago — stale under the 12h default
    return `---
slot: ${slot}
written_at: ${old}
---

## RESUME

stale body that must not be auto-resumed
`;
  };

  test("happy: fresh handoff + canonical slot → resume block with slot + /checkin", () => {
    const out = buildBootResumeContext({
      content: freshHandoff("bravo"), slot: "bravo", file: "HANDOFF-x-bravo-y.md",
    });
    assert.ok(out, "non-null");
    assert.match(out, /AUTO-RESUME on fleet boot/);
    assert.match(out, /slot `bravo`/);
    assert.match(out, /finish U-SC01/, "resume body included verbatim");
    assert.match(out, /\/startup-bravo \/loop \[10m\] \/goal/, "names the slot's auto-start sequence");
    assert.match(out, /HANDOFF-x-bravo-y\.md/, "handoff file name surfaced");
  });

  test("stale handoff (older than maxAgeMin) → null", () => {
    const out = buildBootResumeContext({
      content: staleHandoff("bravo"), slot: "bravo", file: "h.md",
    });
    assert.equal(out, null, "a 24h handoff is stale under the 12h default → must not auto-resume");
  });

  test("default window is now 12h (F5) — a 10h handoff resumes by DEFAULT (no explicit maxAgeMin)", () => {
    // Regression guard for the 240→720 bump: a 10h-old handoff was stale under
    // the old 4h default but is FRESH under the new 12h default. New-PC GPU/OCR
    // bakes routinely exceed 4h — this is the silent-resume-loss F5 fixes.
    const tenHoursOld = new Date(Date.now() - 10 * 60 * 60_000).toISOString();
    const content = `---\nslot: bravo\nwritten_at: ${tenHoursOld}\n---\n\n## RESUME\n\nresume body within the 12h window\n`;
    const out = buildBootResumeContext({ content, slot: "bravo" });
    assert.ok(out, "a 10h handoff must resume under the new 12h default");
    assert.match(out, /AUTO-RESUME on fleet boot/);
  });

  test("custom maxAgeMin honored — a 24h handoff resumes within a 48h window", () => {
    const out = buildBootResumeContext({
      content: staleHandoff("bravo"), slot: "bravo", maxAgeMin: 48 * 60,
    });
    assert.ok(out, "within the widened window the handoff resumes");
  });

  test("fresh handoff with no RESUME section → null", () => {
    const noResume = `---\nslot: bravo\nwritten_at: ${new Date().toISOString()}\n---\n\n## STATE\nonly state\n`;
    assert.equal(buildBootResumeContext({ content: noResume, slot: "bravo" }), null);
  });

  test("non-canonical slot → null (never resume on a misspelled/blank/uppercase slot)", () => {
    assert.equal(buildBootResumeContext({ content: freshHandoff("juliet"), slot: "juliet" }), null);
    assert.equal(buildBootResumeContext({ content: freshHandoff("bravo"), slot: "" }), null);
    assert.equal(buildBootResumeContext({ content: freshHandoff("bravo"), slot: "ALPHA" }), null);
  });

  test("null / non-string content → null (adversarial)", () => {
    assert.equal(buildBootResumeContext({ content: null, slot: "bravo" }), null);
    assert.equal(buildBootResumeContext({ content: 42, slot: "bravo" }), null);
    assert.equal(buildBootResumeContext(), null);
    assert.equal(buildBootResumeContext({}), null);
  });

  test("handoff with no written_at (age unknown) still resumes — age null is not stale", () => {
    const noTs = `---\nslot: bravo\n---\n\n## RESUME\n\nbody with no timestamp at all\n`;
    const out = buildBootResumeContext({ content: noTs, slot: "bravo" });
    assert.ok(out, "a missing written_at must not block resume");
    assert.match(out, /age unknown/);
  });

  test("missing file param → '?' placeholder, never throws", () => {
    const out = buildBootResumeContext({ content: freshHandoff("echo"), slot: "echo" });
    assert.ok(out);
    assert.match(out, /Handoff: \? \(age/);
  });

  test("all 26 canonical slots produce a resume block naming their auto-start sequence", () => {
    for (const slot of SLOT_NAMES) {
      const out = buildBootResumeContext({ content: freshHandoff(slot), slot });
      assert.ok(out, `${slot} must resume`);
      assert.match(out, new RegExp(`/startup-${slot} /loop \\[10m\\] /goal`), `${slot} auto-start named`);
    }
  });
});

// ─── extractMemorySeed (HIGHVALUE-DISCOVERY #2) ──────────────────────────────
describe("extractMemorySeed", () => {
  test("extracts the MEMORY_SEED section body", () => {
    const c = "## RESUME\nDo the work.\n\n## MEMORY_SEED\n- err X fixed abc123\n- tribal: never inline constants\n";
    assert.equal(extractMemorySeed(c), "- err X fixed abc123\n- tribal: never inline constants");
  });
  test("null when no MEMORY_SEED section", () => {
    assert.equal(extractMemorySeed("## RESUME\nbody here long enough"), null);
    assert.equal(extractMemorySeed("# Handoff\n\nnothing"), null);
  });
  test("null on empty/too-short seed body (sentinel preserved)", () => {
    assert.equal(extractMemorySeed("## MEMORY_SEED\n\n\n## NEXT\nx"), null);
    assert.equal(extractMemorySeed("## MEMORY_SEED\n  \n## RESUME\nx"), null);
  });
  test("guards non-string input", () => {
    assert.equal(extractMemorySeed(null), null);
    assert.equal(extractMemorySeed(undefined), null);
    assert.equal(extractMemorySeed(42), null);
  });
  test("caps an oversized seed body", () => {
    const huge = "## MEMORY_SEED\n" + "z".repeat(5000) + "\n";
    const out = extractMemorySeed(huge);
    assert.ok(out.length <= 2100, "capped near 2000 bytes");
    assert.match(out, /truncated/);
  });
  test("does not disturb extractResume on the same content (both sections coexist)", () => {
    const c = "## RESUME\nResume directive body.\n\n## MEMORY_SEED\n- seed line one here\n";
    assert.equal(extractResume(c), "Resume directive body.");
    assert.equal(extractMemorySeed(c), "- seed line one here");
  });
  test("boot resume block includes the seed when present, omits it when absent", () => {
    const slot = [...SLOT_NAMES][0];
    // No frontmatter → age null → not stale; RESUME present → resumable.
    const withSeed = "## RESUME\nResume directive body long enough.\n\n## MEMORY_SEED\n- distilled signal alpha\n";
    const out = buildBootResumeContext({ content: withSeed, slot });
    assert.ok(out, "resumable");
    assert.match(out, /Memory seed/, "seed block present");
    assert.match(out, /distilled signal alpha/, "seed body present");
    const noSeed = buildBootResumeContext({ content: "## RESUME\nResume directive body long enough.\n", slot });
    assert.ok(noSeed && !/Memory seed/.test(noSeed), "no seed → no seed block");
  });
});

// ─── buildSlotWrapperDirective (2026-06-10 AUTO-START) ───────────────────────
// The post-/compact NEXT-ACTION directive. Default flips the slot to re-enter
// the full autonomous sequence; loopGoal:false reverts to the heartbeat. R9 —
// assert the exact emitted command for BOTH branches so a regression that drops
// the /loop /goal auto-start (the operator's ask) fails the test.
describe("buildSlotWrapperDirective", () => {
  test("default (loopGoal on) emits /startup-<slot> /loop [10m] /goal", () => {
    const out = buildSlotWrapperDirective("alpha", "compact");
    assert.match(out, /\/startup-alpha \/loop \[10m\] \/goal/, "auto-start sequence");
    assert.doesNotMatch(out, /^\/checkin-alpha$/m, "not the bare heartbeat");
    assert.match(out, /NEXT ACTION/, "framed as the next action");
    assert.match(out, /100%/, "carries the 100%-completion build doctrine");
  });

  test("explicit loopGoal:true is identical to the default", () => {
    assert.equal(
      buildSlotWrapperDirective("bravo", "compact", { loopGoal: true }),
      buildSlotWrapperDirective("bravo", "compact"),
    );
  });

  test("loopGoal:false reverts to the /checkin-<slot> heartbeat (knob OFF)", () => {
    const out = buildSlotWrapperDirective("bravo", "compact", { loopGoal: false });
    assert.match(out, /\/checkin-bravo/, "heartbeat wrapper");
    assert.doesNotMatch(out, /\/loop \[10m\] \/goal/, "no auto-start loop when reverted");
  });

  test("clear vs compact source only changes prose, not the command", () => {
    const c = buildSlotWrapperDirective("delta", "clear");
    assert.match(c, /\/startup-delta \/loop \[10m\] \/goal/, "same auto-start on /clear");
  });

  test("non-canonical / empty slot → '' (caller falls back to buildCheckinDirective)", () => {
    assert.equal(buildSlotWrapperDirective("", "compact"), "");
    assert.equal(buildSlotWrapperDirective("not-a-slot", "compact"), "");
    assert.equal(buildSlotWrapperDirective("ALPHA", "compact"), "", "uppercase is non-canonical");
  });

  test("all 26 canonical slots emit their own slot-keyed auto-start", () => {
    for (const slot of SLOT_NAMES) {
      const out = buildSlotWrapperDirective(slot, "compact");
      assert.match(out, new RegExp(`/startup-${slot} /loop \\[10m\\] /goal`), `${slot} auto-start`);
    }
  });
});

// U-PSPIN-WINDOW-TIER (2026-06-18, slot:alpha): the terminal-scoped resolution
// that runs BEFORE the family-latest fleet-global fallthrough so a post-/clear
// session resumes THIS terminal's slot, never a random peer's newest handoff.
describe("slotForWindowId -- terminal-scoped slot resolution (before family-latest)", () => {
  const SLOTS = new Set(["alpha", "bravo", "charlie", "papa"]);
  const state = {
    slots: {
      alpha: { chatId: "claude-aaa", terminalWindowId: "tw-wt-AAA" },
      papa: { chatId: "claude-ppp", terminalWindowId: "tw-wt-PPP" },
      bravo: null, // an empty slot must be skipped without throwing
    },
  };

  test("returns the slot whose terminalWindowId matches", () => {
    assert.equal(slotForWindowId("tw-wt-PPP", state, SLOTS), "papa");
    assert.equal(slotForWindowId("tw-wt-AAA", state, SLOTS), "alpha");
  });

  test("returns null when no slot matches the windowId (NOT a fleet-wide guess)", () => {
    assert.equal(slotForWindowId("tw-wt-NONE", state, SLOTS), null);
  });

  test("returns null for empty/non-string windowId", () => {
    assert.equal(slotForWindowId("", state, SLOTS), null);
    assert.equal(slotForWindowId(null, state, SLOTS), null);
    assert.equal(slotForWindowId(undefined, state, SLOTS), null);
  });

  test("ignores a matching windowId on a non-canonical slot name", () => {
    const weird = { slots: { zzz: { terminalWindowId: "tw-wt-Z" } } };
    assert.equal(slotForWindowId("tw-wt-Z", weird, SLOTS), null);
  });

  test("fail-soft on malformed / missing state", () => {
    assert.equal(slotForWindowId("tw-wt-AAA", null, SLOTS), null);
    assert.equal(slotForWindowId("tw-wt-AAA", {}, SLOTS), null);
    assert.equal(slotForWindowId("tw-wt-AAA", { slots: "nope" }, SLOTS), null);
  });

  test("skips null slot entries without throwing", () => {
    assert.equal(slotForWindowId("tw-wt-AAA", state, SLOTS), "alpha");
  });

  test("defaults to the real SLOT_NAMES when slotNames omitted", () => {
    const realState = { slots: { alpha: { terminalWindowId: "tw-wt-REAL" } } };
    assert.equal(slotForWindowId("tw-wt-REAL", realState), "alpha");
  });
});
