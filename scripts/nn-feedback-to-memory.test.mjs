#!/usr/bin/env node
/**
 * Tests for nn-feedback-to-memory.mjs (ECHO-UNDONE H4 / U-NEURAL-FEEDBACK-LOOP).
 * Run: node --test scripts/nn-feedback-to-memory.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLedger,
  isNoteworthy,
  roundId,
  tsSlug,
  renderMemoryEntry,
  computeNewEntries,
} from "./nn-feedback-to-memory.mjs";

const skipRound = {
  schemaVersion: 1, ts: "2026-05-20T00:35:56.198Z", action: "skip", ok: true,
  drift: { retrain: false, reason: "no significant drift" },
  fingerprint: { nodeCount: 243687, edgeCount: 646986, ghostCount: 0 },
  trained: false, trainExitCode: null, assessment: null, promote: null, promoted: false, errors: [],
};
const promotedRound = {
  schemaVersion: 1, ts: "2026-05-21T03:10:00.000Z", action: "promoted", ok: true,
  drift: { retrain: true, reason: "nodes +12.0%; baseline age 170h >= 168h" },
  fingerprint: { nodeCount: 250000, edgeCount: 700000, ghostCount: 14 },
  trained: true, trainExitCode: 0,
  assessment: { metrics: { auroc: 0.812, macroF1: 0.581, brier: 0.121 } },
  promote: { promote: true }, promoted: true, errors: [],
};
const failedRound = {
  schemaVersion: 1, ts: "2026-05-22T09:00:00.000Z", action: "not-promoted", ok: true,
  drift: { retrain: true, reason: "significant drift" },
  fingerprint: { nodeCount: 251000, edgeCount: 701000, ghostCount: 20 },
  trained: true, trainExitCode: 0,
  assessment: { metrics: { auroc: 0.61, macroF1: 0.40, brier: 0.30 } },
  promote: { promote: false }, promoted: false, errors: ["AUROC below gate"],
};

// ───────────────────────── parseLedger ─────────────────────────

test("parseLedger: parses one object per line, skips torn/blank lines", () => {
  const text = JSON.stringify(skipRound) + "\n\n  \n" + JSON.stringify(promotedRound) + "\n{bad json";
  const rounds = parseLedger(text);
  assert.equal(rounds.length, 2, "2 valid, blank + torn skipped");
  assert.equal(rounds[0].ts, skipRound.ts);
  assert.equal(rounds[1].ts, promotedRound.ts);
});

test("parseLedger: drops objects without a ts string", () => {
  assert.equal(parseLedger('{"action":"skip"}\n{"ts":123}').length, 0);
});

test("parseLedger: empty/null → []", () => {
  assert.deepEqual(parseLedger(""), []);
  assert.deepEqual(parseLedger(null), []);
});

// ───────────────────────── isNoteworthy ─────────────────────────

test("isNoteworthy: only trained rounds count", () => {
  assert.equal(isNoteworthy(skipRound), false, "skip round ignored");
  assert.equal(isNoteworthy(promotedRound), true);
  assert.equal(isNoteworthy(failedRound), true, "a failed-gate retrain is still a signal");
  assert.equal(isNoteworthy(null), false);
  assert.equal(isNoteworthy({ trained: "true" }), false, "string 'true' is not boolean true");
});

// ───────────────────────── tsSlug / roundId ─────────────────────────

test("tsSlug: ISO ts → date-hhmm slug", () => {
  assert.equal(tsSlug("2026-05-21T03:10:00.000Z"), "2026-05-21-0310");
  assert.equal(tsSlug("garbage"), "unknown");
});

test("roundId: ts is the id", () => {
  assert.equal(roundId(promotedRound), promotedRound.ts);
  assert.equal(roundId({}), null);
});

// ───────────────────────── renderMemoryEntry ─────────────────────────

test("renderMemoryEntry: promoted round — frontmatter + concrete metrics", () => {
  const e = renderMemoryEntry(promotedRound);
  assert.equal(e.filename, "reference_nn_retrain_2026_05_21_0310.md");
  assert.equal(e.name, "nn-retrain-2026-05-21-0310");
  assert.equal(e.roundTs, promotedRound.ts);
  assert.ok(e.markdown.startsWith("---\nname: nn-retrain-2026-05-21-0310\n"), "frontmatter");
  assert.ok(e.markdown.includes("metadata:\n  type: reference"), "type:reference");
  // verifiable signal: the actual metrics must appear, not placeholders
  assert.ok(e.markdown.includes("AUROC 0.8120"), "auroc rendered");
  assert.ok(e.markdown.includes("macroF1 0.5810"), "macroF1 rendered");
  assert.ok(e.markdown.includes("Brier 0.1210"), "brier rendered");
  assert.ok(e.markdown.includes("PROMOTED"), "verdict");
  assert.ok(e.markdown.includes("250000 nodes"), "fingerprint");
});

test("renderMemoryEntry: failed round — not-promoted verdict + errors surfaced", () => {
  const e = renderMemoryEntry(failedRound);
  assert.ok(e.markdown.includes("NOT PROMOTED"));
  assert.ok(e.markdown.includes("not-promoted"));
  assert.ok(e.markdown.includes("AUROC below gate"), "error surfaced");
});

test("renderMemoryEntry: missing metrics → n/a, never crashes", () => {
  const r = { ts: "2026-05-23T01:02:03.000Z", trained: true, action: "eval-failed", assessment: null };
  const e = renderMemoryEntry(r);
  assert.ok(e.markdown.includes("AUROC n/a"));
  assert.ok(e.markdown.includes("macroF1 n/a"));
  assert.ok(e.markdown.includes("Brier n/a"));
});

test("renderMemoryEntry: deterministic — same round twice is identical", () => {
  assert.equal(renderMemoryEntry(promotedRound).markdown, renderMemoryEntry(promotedRound).markdown);
});

test("renderMemoryEntry: newline in action/ts cannot break YAML frontmatter", () => {
  // R12: the ledger is appended by an independent process — a torn/hostile
  // `action` or `ts` must not corrupt the memory file's frontmatter.
  const hostile = {
    ts: "2026-05-24T05:06:07.000Z\nmalicious: true",
    trained: true, action: "promoted\ninjected: pwned",
    fingerprint: { nodeCount: 1, edgeCount: 1, ghostCount: 0 },
    assessment: { metrics: { auroc: 0.8, macroF1: 0.6, brier: 0.1 } },
    promoted: true, drift: { reason: "x\ny" }, errors: [],
  };
  const e = renderMemoryEntry(hostile);
  const fm = e.markdown.split("---")[1];   // the frontmatter block
  const fmLines = fm.split("\n").map((l) => l.trim());
  // The real attack is a newline turning the payload into its own YAML KEY
  // line. oneLine() collapses newlines, so the payload can only ever sit
  // mid-value (harmless — YAML does not treat `word:` mid-line as a key).
  assert.ok(!fmLines.includes("malicious: true"), "ts newline did not become a YAML key line");
  assert.ok(!fmLines.includes("injected: pwned"), "action newline did not become a YAML key line");
  const descLines = fmLines.filter((l) => l.startsWith("description:"));
  assert.equal(descLines.length, 1, "exactly one description: line — value stayed single-line");
});

// ───────────────────────── computeNewEntries ─────────────────────────

test("computeNewEntries: skips non-trained + already-captured rounds", () => {
  const rounds = [skipRound, promotedRound, failedRound];
  const all = computeNewEntries(rounds, new Set());
  assert.equal(all.length, 2, "skip round excluded, 2 trained rounds");
  assert.deepEqual(all.map((e) => e.roundTs), [promotedRound.ts, failedRound.ts], "oldest-first");

  const partial = computeNewEntries(rounds, new Set([promotedRound.ts]));
  assert.equal(partial.length, 1, "captured round excluded");
  assert.equal(partial[0].roundTs, failedRound.ts);

  assert.equal(computeNewEntries(rounds, new Set([promotedRound.ts, failedRound.ts])).length, 0,
    "all captured → none");
});

test("computeNewEntries: dedupes a round id repeated within one ledger", () => {
  const dup = computeNewEntries([promotedRound, { ...promotedRound }], new Set());
  assert.equal(dup.length, 1, "same ts not emitted twice");
});

test("computeNewEntries: empty/garbage → []", () => {
  assert.deepEqual(computeNewEntries([], new Set()), []);
  assert.deepEqual(computeNewEntries(null, new Set()), []);
  assert.deepEqual(computeNewEntries([skipRound], new Set()), [], "only skip rounds → nothing");
});

test("computeNewEntries: idempotency — second pass after capture yields nothing", () => {
  const rounds = [skipRound, promotedRound];
  const first = computeNewEntries(rounds, new Set());
  const capturedAfterFirst = new Set(first.map((e) => e.roundTs));
  const second = computeNewEntries(rounds, capturedAfterFirst);
  assert.equal(second.length, 0, "re-run captures nothing — the loop is idempotent");
});
