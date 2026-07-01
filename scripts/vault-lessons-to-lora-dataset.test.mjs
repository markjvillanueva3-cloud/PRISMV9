// scripts/vault-lessons-to-lora-dataset.test.mjs
// Real reference-value tests (R9): each pins the concrete extraction/quality
// behaviour that would FAIL if the lessons->LoRA feeder regressed. The headline
// invariant is NON-DEGENERACY: input must never equal output (a copy-the-input
// pair teaches nothing / is harmful).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseLearningEntry,
  stripLessonNoise,
  stripTrailingNoise,
  isHighSignalLesson,
  splitSymptomDiagnosis,
  instructionForLesson,
  lessonToAlpaca,
  dedupPairs,
  MIN_LESSON_CHARS,
} from "./vault-lessons-to-lora-dataset.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "vault-lessons-to-lora-dataset.mjs");

// A realistic code-tribal learning .md (the auto-distilled shape).
const REAL_LEARNING = `# SCOPE-MS0/U-FOO -- [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE-MS0]/U-FOO (slot:alpha): fix a silent data-loss

**Commit:** \`abc123\` - **By:** someone - **At:** 2026-06-17

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE-MS0]/U-FOO (slot:alpha): fix a silent data-loss

## Body
\`\`\`
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE-MS0]/U-FOO (slot:alpha): the writer clobbered the index on a parse error. Root cause: a fail-OPEN catch returned an empty object, so the next write spliced 1 entry over the 30k-entry base. The fix: fail LOUD when the file exists but will not load, and add a clobber-guard that refuses a >50% shrink.
\`\`\`

## Files touched (1)
- scripts/foo.mjs | 3 +++

## Verification
**Scrutiny ledger**: arms A B C
`;

// -- parseLearningEntry --
test("parseLearningEntry: extracts title + Subject + Body (multi-line body, not truncated to line 1)", () => {
  const e = parseLearningEntry(REAL_LEARNING);
  assert.ok(e.title.includes("SCOPE-MS0/U-FOO"), "title from the # heading");
  assert.ok(e.subject.includes("fix a silent data-loss"), "subject section captured");
  // The bug the slice-parser fixed: a multiline `$` lookahead truncated body to line 1.
  assert.ok(e.body.includes("Root cause"), "body includes the root-cause narrative");
  assert.ok(e.body.includes("fail LOUD"), "body captured PAST the first line (multi-line)");
  assert.ok(!e.body.includes("Files touched"), "body stops at the next ## heading");
});
test("parseLearningEntry: empty / non-string -> empty fields (fail-soft)", () => {
  assert.deepEqual(parseLearningEntry(""), { title: "", subject: "", body: "" });
  assert.deepEqual(parseLearningEntry(null), { title: "", subject: "", body: "" });
});

// -- stripLessonNoise --
test("stripLessonNoise: strips the [TAGS] [SCOPE]/U-ID (slot:x): prefix AND code fences", () => {
  const raw = "```\n[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE-MS0]/U-FOO (slot:alpha): the actual lesson body.\n```";
  const out = stripLessonNoise(raw);
  assert.equal(out, "the actual lesson body.", "prefix + fences gone, narrative kept");
  assert.ok(!out.includes("[MAIN]") && !out.includes("slot:"), "no process boilerplate leaks");
});
test("stripLessonNoise: bare (unbracketed) scope prefix also stripped; non-prefixed text untouched", () => {
  assert.equal(stripLessonNoise("SCOPE/U-BAR (slot:india): real text"), "real text");
  assert.equal(stripLessonNoise("a plain sentence with no prefix"), "a plain sentence with no prefix");
});
test("stripLessonNoise: SLOT-LESS prefix [MAIN] [SCOPE]/U-ID: text is stripped (scrutiny arm-A P1 regression)", () => {
  // ~971 corpus learnings use this slot-less shape; a mandatory (slot:) group
  // would leak the boilerplate into 34% of pairs. This test FAILS against the
  // pre-fix regex.
  assert.equal(stripLessonNoise("[MAIN] [SCOPE-MS0]/U-FOO: slot-less prefix text"), "slot-less prefix text");
  assert.equal(stripLessonNoise("[MAIN-FORCE] [X]/U-Y (slot:alpha, taking over for lima): trailing-paren text"), "trailing-paren text");
});
test("stripLessonNoise: DOTTED version-style U-id is stripped (3-of-3 arm-A P1 regression)", () => {
  // "/U-H1.0-BUNDLE-AWARE" -- the `.` in the id aborted the pre-fix charset and
  // leaked the whole prefix into the training input (row 13 of the live dataset).
  assert.equal(stripLessonNoise("[LIMA] [BACKEND-DEV-LOOP]/U-H1.0-BUNDLE-AWARE: dotted-id lesson body"), "dotted-id lesson body");
});
test("stripLessonNoise: NON-U unit id (P0.3-style) is stripped; bare /path is NOT (anchor guard)", () => {
  // "[HOOKS-AUTOMATION-V2]/P0.3-B-followup:" -- id is not "U-" prefixed (3-of-3 follow-up leak row 55).
  assert.equal(stripLessonNoise("[HOOKS-AUTOMATION-V2]/P0.3-B-followup: harden fileSuffix"), "harden fileSuffix");
  // A real narrative that merely starts with "/word: " has NO bracket/scope anchor -> left intact.
  assert.equal(stripLessonNoise("/usr/local/bin: the path was wrong"), "/usr/local/bin: the path was wrong");
});

// -- isHighSignalLesson --
test("isHighSignalLesson: accepts a long failure-marked narrative, rejects short / unmarked", () => {
  const good = "x".repeat(MIN_LESSON_CHARS) + " root cause: y. the fix: z.";
  assert.equal(isHighSignalLesson(good), true);
  assert.equal(isHighSignalLesson("root cause: too short"), false, "below MIN_LESSON_CHARS");
  const longButRoutine = "added an optional field to the metadata interface. ".repeat(8);
  assert.equal(isHighSignalLesson(longButRoutine), false, "long but no failure-signal marker -> rejected");
});

// -- splitSymptomDiagnosis (the non-degeneracy core) --
test("splitSymptomDiagnosis: splits symptom | (root cause + fix), both substantial", () => {
  const narrative = "the writer clobbered the index on a parse error and dropped 30k entries silently. Root cause: a fail-OPEN catch returned empty. The fix: fail loud + a clobber-guard refusing a >50% shrink.";
  const s = splitSymptomDiagnosis(narrative);
  assert.ok(s, "a clean split exists");
  assert.ok(s.symptom.includes("clobbered the index"), "symptom is the pre-marker narrative");
  assert.ok(s.diagnosis.startsWith("Root cause"), "diagnosis starts at the marker");
  assert.ok(!s.symptom.includes("Root cause"), "marker text is NOT in the symptom");
});
test("splitSymptomDiagnosis: null when no marker, or when either side too thin", () => {
  assert.equal(splitSymptomDiagnosis("a narrative with no diagnosis marker at all here"), null);
  assert.equal(splitSymptomDiagnosis("root cause: immediate"), null, "no symptom preamble -> null");
  assert.equal(splitSymptomDiagnosis(null), null);
});

// -- lessonToAlpaca (NON-DEGENERACY invariant) --
test("lessonToAlpaca: produces a non-degenerate symptom->diagnosis pair from a real learning", () => {
  const pair = lessonToAlpaca(parseLearningEntry(REAL_LEARNING));
  assert.ok(pair, "a pair is produced");
  assert.notEqual(pair.input.trim(), pair.output.trim(), "INVARIANT: input != output (no echo pair)");
  assert.ok(pair.output.includes("Root cause"), "output carries the diagnosis");
  assert.ok(!pair.input.includes("Root cause"), "input is the symptom only");
  assert.ok(!pair.output.includes("[MAIN]"), "process boilerplate stripped from output");
  assert.ok(typeof pair.instruction === "string" && pair.instruction.length > 10);
});
test("lessonToAlpaca: null on a low-signal or unsplittable entry", () => {
  assert.equal(lessonToAlpaca(parseLearningEntry("# t\n\n## Body\n```\nadded a field, routine.\n```\n")), null);
  assert.equal(lessonToAlpaca(null), null);
  assert.equal(lessonToAlpaca({}), null);
});

// -- instructionForLesson (variety so the instruction field is not ignored) --
test("instructionForLesson: content-keyed phrasing (not one constant)", () => {
  const a = instructionForLesson("Root cause: foo");
  const b = instructionForLesson("a silent regression was the failure mode");
  // "lesson:" WITHOUT a failure-mode word (failure markers correctly take
  // precedence -- a "fail loud" lesson IS a failure-mode lesson).
  const c = instructionForLesson("lesson: prefer composition over inheritance");
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.ok([a, b, c].every((s) => typeof s === "string" && s.length > 10));
});

// -- dedupPairs --
test("dedupPairs: collapses identical outputs, keeps distinct, ignores malformed", () => {
  const pairs = [
    { instruction: "i", input: "a", output: "SAME lesson body" },
    { instruction: "i", input: "b", output: "same   LESSON body" }, // normalizes equal
    { instruction: "i", input: "c", output: "different lesson" },
    { instruction: "i", input: "d" }, // no output -> skipped
  ];
  const out = dedupPairs(pairs);
  assert.equal(out.length, 2, "one dup collapsed, malformed skipped");
  assert.deepEqual(out.map((p) => p.input), ["a", "c"], "first occurrence kept, order preserved");
});

// -- stripTrailingNoise (scrutiny arm-B P1: lessons must not end on test tallies) --
test("stripTrailingNoise: removes trailing TESTS/scrutiny/memory tails, keeps the lesson", () => {
  const t = "Root cause: a fail-open catch. The fix: fail loud.\n\nTESTS: 17/17 pass. Memory reference_x. 3-of-3 PASS.";
  const out = stripTrailingNoise(t);
  assert.ok(out.startsWith("Root cause"), "lesson kept");
  assert.ok(!/TESTS|17\/17|3-of-3|Memory/i.test(out), "process tail stripped");
  assert.equal(stripTrailingNoise("no tail here, just a lesson."), "no tail here, just a lesson.");
});

// -- write path: NO inline __meta__ row reaches the JSONL (scrutiny arm-B P0 regression) --
test("--out writes pairs ONLY (no __meta__ poison row) + a .meta.json sidecar", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lessons-lora-"));
  const outPath = path.join(dir, "out.jsonl");
  try {
    const res = spawnSync(process.execPath, [SCRIPT, "--out", outPath, "--limit", "120"], { encoding: "utf8" });
    assert.equal(res.status, 0, `script exited 0 (stderr: ${res.stderr})`);
    const rows = fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.ok(rows.length > 0, "wrote at least one pair");
    // THE P0 INVARIANT: no row may be the synthetic meta row -- it would train the
    // adapter to emit a stats blob for the literal instruction "__meta__".
    assert.equal(rows.filter((r) => r.instruction === "__meta__").length, 0, "no __meta__ training row");
    for (const r of rows) {
      assert.ok(typeof r.instruction === "string" && r.instruction.length > 0, "valid instruction");
      assert.ok(typeof r.output === "string" && r.output.length > 0, "valid output");
      assert.notEqual(r.input.trim(), r.output.trim(), "non-degenerate");
      // Only a LEADING prefix is boilerplate; a mid-narrative "[MAIN-FORCE]"
      // mention is legitimate content (the lesson is ABOUT that mechanism).
      assert.ok(!/^\s*\[MAIN(-FORCE)?\]/.test(r.input) && !/^\s*\[MAIN(-FORCE)?\]/.test(r.output), "no leading [MAIN] prefix leak");
    }
    // The stats live in a sidecar, NOT the training file.
    assert.ok(fs.existsSync(outPath.replace(/\.jsonl$/, "") + ".meta.json"), ".meta.json sidecar written");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
