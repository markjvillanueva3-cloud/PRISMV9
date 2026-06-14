// .claude/hooks/__tests__/ollama-nav-enforce-inject.test.mjs
// U-OLLAMA-NAV-ENFORCE (2026-06-09, slot:alpha): the dormant ollama-prism-bridge
// (local-LLM codebase navigation, ~0 Claude tokens) must auto-surface on a
// HIGH-CONFIDENCE nav question -- a nav-verb AND a codebase-noun -- and must NOT
// fire on a manufacturing-domain question, a slash-command, a long directive
// paste, or a prompt already routing to ollama. These tests lock the intent
// gate (the load-bearing precision mechanism) + the command-safety sanitizer +
// the stable dedup key.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyNavIntent,
  sanitizeForCommand,
  navQuestionKey,
  buildNavSuggestion,
  MAX_QUESTION_CHARS,
  BRIDGE_TOOL_MODEL,
} from "../ollama-nav-enforce-inject.mjs";

// ── happy path: the three canonical /ollama-bridge use-cases all fire ──────
test("classifyNavIntent: fires on real multi-step codebase questions (verb + noun)", () => {
  const a = classifyNavIntent("where is cutting force computed, and what dispatcher exposes it?");
  assert.equal(a.isNav, true, "where-is + computed/dispatcher must fire");
  assert.ok(a.verb && a.noun, "captures the matched verb + noun");

  const b = classifyNavIntent("how does the slot-claim system work -- which files?");
  assert.equal(b.isNav, true, "how-does + files must fire");

  const c = classifyNavIntent("what engine handles Kienzle calibration and what wires to it?");
  assert.equal(c.isNav, true, "what-wires + engine must fire");

  // A source-file extension is itself a codebase signal even with no noun word.
  const d = classifyNavIntent("what calls parseVisionResponse in ollama-vision-extract-lib.mjs?");
  assert.equal(d.isNav, true, "code-extension counts as the codebase signal");
});

// ── the KEY precision case: a domain question must NOT fire (no quality loss) ──
test("classifyNavIntent: does NOT fire on a manufacturing-domain question", () => {
  const r = classifyNavIntent("how does a lathe work?");
  assert.equal(r.isNav, false, "domain question has a nav-verb but no codebase-noun");
  assert.equal(r.reason, "no-codebase-noun");
});

// ── failure modes ─────────────────────────────────────────────────────────
test("classifyNavIntent: rejects slash-commands, long directive pastes, already-routing, and noun/verb-only", () => {
  assert.equal(classifyNavIntent("/startup-alpha where is the engine").isNav, false, "slash-command skipped");
  assert.equal(classifyNavIntent("/startup-alpha where is the engine").reason, "slash-command");

  // A long directive paste (the operator's own standing /goal contains
  // 'navigating the codebase') must NOT self-trigger.
  const longDirective = "navigate the engine ".repeat(80); // > 1200 chars
  assert.ok(longDirective.length > 1200);
  assert.equal(classifyNavIntent(longDirective).isNav, false, "long paste skipped");
  assert.equal(classifyNavIntent(longDirective).reason, "too-long-directive-paste");

  assert.equal(
    classifyNavIntent("run node scripts/ollama-prism-bridge.mjs to find the engine").isNav,
    false,
    "already routing to the bridge -> do not nudge",
  );
  assert.equal(classifyNavIntent("where is it located?").isNav, false, "nav-verb but no codebase-noun");
  assert.equal(classifyNavIntent("the engine is well documented").isNav, false, "codebase-noun but no nav-verb");
});

test("classifyNavIntent: rejects empty / non-string input without throwing", () => {
  for (const bad of ["", "   ", null, undefined, 42, {}, []]) {
    const r = classifyNavIntent(bad);
    assert.equal(r.isNav, false, `bad input ${JSON.stringify(bad)} -> not nav`);
  }
});

// ── adversarial: command-injection-shaped questions are sanitized ──────────
test("sanitizeForCommand: strips quote/backtick/$ and newlines so the command line can't break", () => {
  const dirty = 'where is "foo"\nand `bar` and $BAZ computed?';
  const clean = sanitizeForCommand(dirty);
  assert.ok(!clean.includes('"'), "no double-quote survives (would break the wrapping quotes)");
  assert.ok(!clean.includes("`"), "no backtick survives");
  assert.ok(!clean.includes("$"), "no dollar survives");
  assert.ok(!/\n/.test(clean), "newlines collapsed to single line");
});

test("sanitizeForCommand: caps overly long questions", () => {
  const long = "where is " + "x".repeat(500) + " computed";
  const clean = sanitizeForCommand(long);
  assert.ok(clean.length <= MAX_QUESTION_CHARS + 3, "capped to MAX + ellipsis");
  assert.ok(clean.endsWith("..."), "marks the truncation");
});

// ── dedup key: stable, normalization-insensitive, distinct per question ────
test("navQuestionKey: stable + normalization-insensitive + distinct", () => {
  const k1 = navQuestionKey("Where is the Engine computed?");
  const k2 = navQuestionKey("  where   is the engine COMPUTED?  ");
  assert.equal(k1, k2, "case + whitespace normalized to the same key (dedup holds)");
  const k3 = navQuestionKey("how does the dispatcher wire up?");
  assert.notEqual(k1, k3, "a different question gets a different key (still fires)");
  assert.ok(/^nav:[0-9a-z]+$/.test(k1), "key has the nav: namespace prefix");
});

// ── suggestion render: ready-to-run command + sanitized question + knob ────
test("buildNavSuggestion: emits the runnable bridge command with a sanitized question", () => {
  const cls = classifyNavIntent('where is "force" computed in the engine?');
  assert.equal(cls.isNav, true);
  const s = buildNavSuggestion(cls);
  assert.ok(s.includes("node scripts/ollama-prism-bridge.mjs"), "names the bridge command");
  // No-quality-loss guarantee: the suggested command MUST pin a tool-capable
  // model. The bridge default (qwen2.5-coder:32b) does not native-tool-call, so
  // routing to it without --model returns garbage (live-verified 2026-06-09).
  assert.ok(s.includes(`--model ${BRIDGE_TOOL_MODEL}`), "pins a tool-capable model (no-quality-loss)");
  assert.ok(/gpt-oss|mistral|llama|qwen3/.test(BRIDGE_TOOL_MODEL), "the pinned model is a known tool-capable family, not the broken 32b coder default");
  assert.ok(s.includes("PRISM_OLLAMA_NAV_ENFORCE_DISABLE=1"), "documents the disable knob");
  assert.ok(s.includes(cls.verb) && s.includes(cls.noun), "explains why it fired");
  // The embedded question is sanitized: on the COMMAND line specifically, the
  // only double-quotes are the two wrapping the argument (the inner quote from
  // 'where is "force"...' must have been stripped, else the shell command breaks).
  const cmdLine = s.split("\n").find((l) => l.includes("ollama-prism-bridge.mjs"));
  assert.ok(cmdLine, "the suggestion has a command line");
  const dq = (cmdLine.match(/"/g) || []).length;
  assert.equal(dq, 2, "exactly the two command-arg-wrapping quotes -- inner quote was stripped");
});
