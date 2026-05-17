// SLOT-DRIFT-FIX-MS0/U-SDF01 — regression tests
// Run: node --test H:/prism/.claude/hooks/__tests__/slot-drift-fix.test.mjs
//
// User-reported 2026-05-17 (slot bravo claude-339c8ff7):
//   "chats randomly exit out of the chat slot then another chat claims that
//    slot in between sessions"
//
// Root cause was a two-source bug:
//   (B1) WRITER per-agent-handoff.mjs emitted `slot: ` (empty value) when
//        chat-slots.json lookup found no match for identity.instance.
//   (B2) PARSER session-start-terminal-pin.mjs used /^slot:\s*([^\n]*)$/m.
//        `\s*` matches `\n` greedily, so on an empty `slot:` line `\s*`
//        consumed the trailing newline and `[^\n]*` captured the NEXT
//        line ("written_at: 2026-05-17T..."). The drift detector then
//        reported "prior session held `written_at: ...`" and cascaded
//        to spurious force-take prompts -> real peer chats stole slots.
//
// Fix:
//   - Parser regex: `\s*` -> `[ \t]*` (same-line whitespace only).
//   - Writer: omit `slot:` field entirely when resolvedSlot is empty.
//
// These tests verify BOTH fixes are in place. They will FAIL if either
// regression returns.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// PARSER fix verification (session-start-terminal-pin.mjs:114)
// ---------------------------------------------------------------------------

const PARSER_FILE = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
  "../session-start-terminal-pin.mjs",
);

test("PARSER: regex must use [ \\t]* not \\s* (same-line whitespace only)", () => {
  const src = fs.readFileSync(PARSER_FILE, "utf-8");
  // The fixed regex appears verbatim:
  assert.match(src, /\/\^slot:\[ \\t\]\*\(\[\^\\n\]\*\)\$\/m/,
    "parser must use /^slot:[ \\t]*([^\\n]*)$/m — same-line whitespace");
  assert.match(src, /\/\^topic:\[ \\t\]\*\(\[\^\\n\]\*\)\$\/m/,
    "parser must use /^topic:[ \\t]*([^\\n]*)$/m — same-line whitespace");
  // The buggy form must NOT appear:
  assert.doesNotMatch(src, /\/\^slot:\\s\*\(\[\^\\n\]\*\)\$\/m/,
    "parser must NOT use the buggy \\s* greedy form for slot:");
  assert.doesNotMatch(src, /\/\^topic:\\s\*\(\[\^\\n\]\*\)\$\/m/,
    "parser must NOT use the buggy \\s* greedy form for topic:");
});

test("PARSER: behavioral — empty slot:\\nwritten_at: must yield empty, not the timestamp", () => {
  // Reproduce the exact pathological frontmatter we hit in production:
  const sample =
    "---\n" +
    "session: claude-339c8ff7\n" +
    "topic: bravo-cad-fusion-live-ms0\n" +
    "slot: \n" +
    "written_at: 2026-05-17T00:35:04.979Z\n" +
    "machine: DESKTOP-N7MI1VB\n" +
    "---\n";
  // The FIXED regex captures empty string for an empty slot value:
  const fixed = sample.match(/^slot:[ \t]*([^\n]*)$/m);
  assert.equal(fixed[1], "",
    "empty slot value must be captured as empty string");
  // The BUGGY regex captures the next line's content — demonstrate the failure mode:
  const buggy = sample.match(/^slot:\s*([^\n]*)$/m);
  assert.equal(buggy[1], "written_at: 2026-05-17T00:35:04.979Z",
    "buggy regex must demonstrably capture the next line (proves the test guards against regression)");
});

test("PARSER: behavioral — slot: bravo still captures bravo (filled case unchanged)", () => {
  const sample =
    "---\n" +
    "session: claude-339c8ff7\n" +
    "slot: bravo\n" +
    "written_at: 2026-05-17T00:35:04.979Z\n" +
    "---\n";
  const m = sample.match(/^slot:[ \t]*([^\n]*)$/m);
  assert.equal(m[1], "bravo", "filled slot field must still capture correctly");
});

test("PARSER: behavioral — slot field omitted entirely yields no match (writer-fix path)", () => {
  // Writer fix path: when resolvedSlot is empty, the field is OMITTED.
  // Parser must therefore find no match at all, yielding null (which the
  // drift detector treats as 'no prior slot known' and short-circuits).
  const sample =
    "---\n" +
    "session: claude-339c8ff7\n" +
    "topic: bravo-html-stack\n" +
    "written_at: 2026-05-17T00:35:04.979Z\n" +
    "machine: DESKTOP-N7MI1VB\n" +
    "---\n";
  const m = sample.match(/^slot:[ \t]*([^\n]*)$/m);
  assert.equal(m, null, "omitted slot field must yield no regex match");
});

// ---------------------------------------------------------------------------
// WRITER fix verification (per-agent-handoff.mjs:474)
// ---------------------------------------------------------------------------

const WRITER_FILE = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
  "../../helpers/per-agent-handoff.mjs",
);

test("WRITER: frontmatter must conditionally include slot: only when resolvedSlot is truthy", () => {
  const src = fs.readFileSync(WRITER_FILE, "utf-8");
  // The fixed form appears verbatim:
  assert.match(
    src,
    /\.\.\.\(resolvedSlot \? \[`slot: \$\{resolvedSlot\}`\] : \[\]\)/,
    "writer must use spread-if-truthy: ...(resolvedSlot ? [`slot: ${resolvedSlot}`] : [])",
  );
  // The unconditional form must NOT appear directly in the frontmatter array:
  // (We allow it inside the spread expression itself, but not as a bare line.)
  const lines = src.split("\n");
  const badBareEmit = lines.find(
    (ln) => /^\s*`slot: \$\{resolvedSlot\}`,\s*$/.test(ln),
  );
  assert.equal(
    badBareEmit,
    undefined,
    "writer must NOT unconditionally emit `slot: ${resolvedSlot}`,",
  );
});

// ---------------------------------------------------------------------------
// End-to-end semantic test: a handoff written by the fixed writer must be
// correctly parsed by the fixed parser without producing a false-positive
// drift warning.
// ---------------------------------------------------------------------------

test("E2E: fixed writer output + fixed parser produces null slot when slot is unknown", () => {
  // Simulate what the fixed writer would emit when resolvedSlot is empty
  // (i.e., the field is omitted entirely):
  const frontmatterOmitted = [
    "---",
    "session: claude-339c8ff7",
    "topic: bravo-cad-fusion-live-ms0",
    // slot: line omitted
    "written_at: 2026-05-17T00:35:04.979Z",
    "machine: DESKTOP-N7MI1VB",
    "family: Claude",
    "session_key: claude-339c8ff7",
    "status: active",
    "---",
    "",
  ].join("\n");
  const m = frontmatterOmitted.match(/^slot:[ \t]*([^\n]*)$/m);
  const slot = m ? (m[1].trim().toLowerCase() || null) : null;
  assert.equal(slot, null,
    "omitted-slot handoff must yield slot=null so drift detector short-circuits (no false force-take prompt)");
});

test("E2E: fixed writer output for filled slot still round-trips correctly", () => {
  const frontmatterFilled = [
    "---",
    "session: claude-339c8ff7",
    "topic: bravo-html-stack",
    "slot: bravo",
    "written_at: 2026-05-17T00:35:04.979Z",
    "machine: DESKTOP-N7MI1VB",
    "---",
    "",
  ].join("\n");
  const m = frontmatterFilled.match(/^slot:[ \t]*([^\n]*)$/m);
  const slot = m ? (m[1].trim().toLowerCase() || null) : null;
  assert.equal(slot, "bravo", "filled slot must round-trip correctly");
});
