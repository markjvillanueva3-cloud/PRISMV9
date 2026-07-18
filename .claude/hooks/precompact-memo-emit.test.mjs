/**
 * precompact-memo-emit.test.mjs — tests for the pure rendering/parsing core of
 * the compaction→memo emitter. node:test.
 *
 * Covers buildSessionTrace (commit-log parsing), renderMemo (first-compact vs
 * same-day append), nextCompactIndex (section counting). Happy + ≥3 failure +
 * ≥2 adversarial per R9.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildSessionTrace, renderMemo, nextCompactIndex, buildVerdict } from "./precompact-memo-emit.mjs";

// --- buildVerdict -- PreCompact output contract (regression lock) -----------
// PreCompact has NO `hookSpecificOutput` contract; the earlier shape
// { hookSpecificOutput: { hookEventName: "PreCompact", additionalContext } }
// was rejected by the harness ("Invalid input") on every /compact fleet-wide.
// The message must ride the top-level `systemMessage` field instead.

test("buildVerdict: with a message -> { continue:true, systemMessage } and NO hookSpecificOutput (regression lock)", () => {
  const v = buildVerdict("trace written -> reference_session_alpha_2026-06-22.md");
  assert.equal(v.continue, true);
  assert.equal(v.systemMessage, "trace written -> reference_session_alpha_2026-06-22.md");
  // The bug: PreCompact rejects hookSpecificOutput. It must never appear.
  assert.equal("hookSpecificOutput" in v, false, "PreCompact verdict must NOT carry hookSpecificOutput");
});

test("buildVerdict: no message -> bare { continue:true } only (no empty systemMessage)", () => {
  const v = buildVerdict();
  assert.deepEqual(v, { continue: true });
  assert.equal("systemMessage" in v, false);
  assert.equal("hookSpecificOutput" in v, false);
});

test("buildVerdict: adversarial -- empty-string message is falsy -> bare continue, never an empty systemMessage", () => {
  const v = buildVerdict("");
  assert.deepEqual(v, { continue: true });
});

test("buildVerdict: failure-mode -- output is JSON-serializable and only uses allowed PreCompact top-level keys", () => {
  // The harness validates against a fixed top-level key set for PreCompact.
  const ALLOWED = new Set([
    "continue", "suppressOutput", "stopReason", "decision", "reason",
    "systemMessage", "terminalSequence", "permissionDecision",
  ]);
  for (const v of [buildVerdict(), buildVerdict("hello")]) {
    const round = JSON.parse(JSON.stringify(v));   // must serialize cleanly
    for (const k of Object.keys(round)) {
      assert.ok(ALLOWED.has(k), `key "${k}" is not an allowed PreCompact top-level field`);
    }
  }
});

test("buildVerdict: always continues -- a PreCompact hook must never block /compact", () => {
  assert.equal(buildVerdict().continue, true);
  assert.equal(buildVerdict("x").continue, true);
  assert.notEqual(buildVerdict("x").decision, "block");
});

// ─── buildSessionTrace — commit-log parsing ─────────────────────────────────

test("buildSessionTrace: parses `%h %s` lines into commits (happy path)", () => {
  const t = buildSessionTrace({
    branch: "cad-fusion-live-ms0",
    logRaw: "1a5c7f8 [MAIN] U-LEARN-REVIVE01: actuator\n0c2250f1 [MAIN] U-LEARN-REVIVE01-FIX: scrutiny fix",
    loopTask: "accelerate obsidian learning",
  });
  assert.equal(t.branch, "cad-fusion-live-ms0");
  assert.equal(t.commits.length, 2);
  assert.equal(t.commits[0].sha, "1a5c7f8");
  assert.match(t.commits[0].subject, /U-LEARN-REVIVE01: actuator/);
  assert.equal(t.loopTask, "accelerate obsidian learning");
});

test("buildSessionTrace: failure-mode — empty/null/whitespace logRaw → zero commits, no throw", () => {
  assert.equal(buildSessionTrace({ logRaw: "" }).commits.length, 0);
  assert.equal(buildSessionTrace({ logRaw: null }).commits.length, 0);
  assert.equal(buildSessionTrace({ logRaw: "\n  \n\n" }).commits.length, 0);
  assert.equal(buildSessionTrace({}).branch, "(unknown)");
  assert.equal(buildSessionTrace({}).loopTask, null);
});

test("buildSessionTrace: caps at MAX_COMMITS (12) — a long session does not bloat the memo", () => {
  const lines = Array.from({ length: 30 }, (_, i) => `abc${String(i).padStart(4, "0")} commit ${i}`).join("\n");
  const t = buildSessionTrace({ logRaw: lines });
  assert.equal(t.commits.length, 12);
});

test("buildSessionTrace: adversarial — a non-sha line (no leading hex) is skipped, not crashed on", () => {
  const t = buildSessionTrace({ logRaw: "not-a-sha some subject\nzzz also bad\nabc1234 real commit" });
  // Only the real hex-sha line survives; the garbage lines are dropped.
  assert.equal(t.commits.length, 1);
  assert.equal(t.commits[0].sha, "abc1234");
});

test("buildSessionTrace: adversarial — an over-long subject is truncated with an ellipsis", () => {
  const longSubject = "x".repeat(300);
  const t = buildSessionTrace({ logRaw: `abc1234 ${longSubject}` });
  assert.ok(t.commits[0].subject.length <= 160);
  assert.ok(t.commits[0].subject.endsWith("…"));
});

test("buildSessionTrace: slot filter — prefers this slot's own commits on a shared tree", () => {
  // Shared-tree log interleaves papa + peer (romeo/juliett) commits.
  const logRaw = [
    "521d5f6 [MAIN] U-CATALOG (slot:romeo): corpus loader",
    "0c2250f [MAIN] U-LEARN-REVIVE01-FIX (slot:papa): scrutiny fix",
    "a9a50f4 [MAIN] U-GCNC01 (slot:juliett): holder catalog",
    "1a5c7f8 [MAIN] U-LEARN-REVIVE01 (slot:papa): actuator",
  ].join("\n");
  const t = buildSessionTrace({ logRaw, slot: "papa" });
  assert.equal(t.slotScoped, true, "slot marker matched → scoped");
  assert.equal(t.commits.length, 2, "only papa's 2 commits, not the 4 fleet commits");
  assert.ok(t.commits.every((c) => c.subject.includes("(slot:papa)")));
});

test("buildSessionTrace: slot filter — FALLS BACK to all commits when this slot's marker never appears (no empty memo)", () => {
  const logRaw = "521d5f6 [MAIN] U-X (slot:romeo): a\na9a50f4 [MAIN] U-Y (slot:juliett): b";
  const t = buildSessionTrace({ logRaw, slot: "papa" });
  assert.equal(t.slotScoped, false, "no papa marker → not scoped");
  assert.equal(t.commits.length, 2, "fall back to all rather than emit an empty trace");
});

// ─── nextCompactIndex — section counting ────────────────────────────────────

test("nextCompactIndex: no prior body → 1 (first compact)", () => {
  assert.equal(nextCompactIndex(null), 1);
  assert.equal(nextCompactIndex(""), 1);
});

test("nextCompactIndex: counts existing `## compact N` sections → next index", () => {
  const body = "# Session\n\n## compact 1 — t1\n- a\n\n## compact 2 — t2\n- b\n";
  assert.equal(nextCompactIndex(body), 3);
});

test("nextCompactIndex: adversarial — 'compact' in prose (not a heading) is NOT counted", () => {
  const body = "# Session\n\nwe ran /compact and the compact loop\n## compact 1 — t1\n- a\n";
  // Only the `## compact 1` heading counts; the inline prose 'compact' does not.
  assert.equal(nextCompactIndex(body), 2);
});

// ─── renderMemo — first compact vs same-day append ──────────────────────────

const TRACE = {
  branch: "cad-fusion-live-ms0",
  commits: [{ sha: "1a5c7f8", subject: "U-LEARN-REVIVE01: actuator" }],
  loopTask: "accelerate obsidian learning",
};

test("renderMemo: first compact → full frontmatter with metadata.type reference (feed routes on this)", () => {
  const md = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: TRACE, compactN: 1, priorBody: null });
  // Frontmatter the stop-obsidian-memory-feed reads to route into memories/reference/.
  assert.match(md, /^---/);
  assert.match(md, /name: reference-session-papa-2026-06-08/);
  assert.match(md, /aliases: reference_session_papa_2026_06_08/);
  assert.match(md, /metadata:\n {2}type: reference/);
  assert.match(md, /## compact 1 — 2026-06-08T16:00:00\.000Z/);
  assert.match(md, /`1a5c7f8` U-LEARN-REVIVE01: actuator/);
  assert.match(md, /loop: accelerate obsidian learning/);
});

test("renderMemo: same-day re-compact APPENDS a delta section, never clobbers the prior body", () => {
  const first = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: TRACE, compactN: 1, priorBody: null });
  const trace2 = { branch: "cad-fusion-live-ms0", commits: [{ sha: "0c2250f1", subject: "U-LEARN-REVIVE01-FIX: scrutiny" }], loopTask: null };
  const second = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T18:30:00.000Z", trace: trace2, compactN: 2, priorBody: first });
  // The prior frontmatter + compact-1 content is preserved verbatim (no clobber).
  assert.ok(second.includes(first.trim()), "prior body must be retained in full");
  // A new compact-2 section is appended.
  assert.match(second, /## compact 2 — 2026-06-08T18:30:00\.000Z/);
  assert.match(second, /`0c2250f1` U-LEARN-REVIVE01-FIX: scrutiny/);
  // Exactly one frontmatter block (append must not re-emit the header).
  assert.equal((second.match(/^---$/gm) || []).length, 2, "still exactly one frontmatter (open+close), no duplicate header");
});

test("renderMemo: P1-2 — same-day append is a DELTA, excludes commits already in the prior body (no re-list bloat)", () => {
  // compact 1 recorded 1a5c7f8. compact 2's 12h window re-fetches it PLUS a new one.
  const first = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: TRACE, compactN: 1, priorBody: null });
  const trace2 = { branch: "cad-fusion-live-ms0", commits: [
    { sha: "1a5c7f8", subject: "U-LEARN-REVIVE01: actuator" },      // already in compact 1
    { sha: "0c2250f1", subject: "U-LEARN-REVIVE01-FIX: scrutiny" }, // genuinely new
  ], loopTask: null };
  const second = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T18:30:00.000Z", trace: trace2, compactN: 2, priorBody: first });
  // compact-2 must list ONLY the new sha, not re-list 1a5c7f8.
  const compact2 = second.slice(second.indexOf("## compact 2"));
  assert.match(compact2, /`0c2250f1`/, "the new commit appears in compact 2");
  assert.ok(!compact2.includes("`1a5c7f8`"), "the already-recorded commit is NOT re-listed in compact 2");
});

test("renderMemo: P1-2 — same-day append with ONLY already-seen commits shows the 'no new commits' placeholder", () => {
  const first = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: TRACE, compactN: 1, priorBody: null });
  // compact 2's window returns the SAME single commit already in compact 1.
  const second = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T18:30:00.000Z", trace: TRACE, compactN: 2, priorBody: first });
  const compact2 = second.slice(second.indexOf("## compact 2"));
  assert.match(compact2, /no new commits since the prior compact/);
  assert.ok(!compact2.includes("`1a5c7f8`"), "no commit re-listed when the window is all-seen");
});

test("renderMemo: failure-mode — zero commits renders an honest placeholder, not an empty section", () => {
  const emptyTrace = { branch: "main", commits: [], loopTask: "some task" };
  const md = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: emptyTrace, compactN: 1, priorBody: null });
  assert.match(md, /no commits captured this session/);
});

test("renderMemo: adversarial — same-day append with zero new commits shows an explicit 'no new commits' line, not a blank", () => {
  const first = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T16:00:00.000Z", trace: TRACE, compactN: 1, priorBody: null });
  const emptyTrace = { branch: "cad-fusion-live-ms0", commits: [], loopTask: null };
  const second = renderMemo({ slot: "papa", dateStr: "2026-06-08", nowIso: "2026-06-08T18:30:00.000Z", trace: emptyTrace, compactN: 2, priorBody: first });
  assert.match(second, /no new commits since the prior compact/);
});
