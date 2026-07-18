// scripts/lib/self-compact-confirm-lib.test.mjs
// Tests for U-SELFCOMPACT-CONFIRM. Real fixtures, no stubs (R9): every assert
// pins a concrete behaviour that would fail if the correlation logic regressed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseLedger, isSendRecord, isConfirmRecord, sendKey,
  lineHasBoundaryMarker, parseBoundaryLine, extractBoundaries,
  findFirstBoundaryAtOrAfter, correlate, summarize,
  encodeProjectKey, defaultTranscriptPath, readBoundariesFromFile, runConfirm,
  shortHex, resolveTranscriptPath,
  DEFAULT_CONFIRM_WINDOW_MS,
} from "./self-compact-confirm-lib.mjs";

const SEND = (over = {}) => ({ ts: "2026-06-14T10:00:00.000Z", slot: "alpha", sessionId: "S1", action: "send", sent: { ok: true, chars: 8 }, ...over });
const BOUNDARY_LINE = (over = {}) => JSON.stringify({ type: "system", subtype: "compact_boundary", timestamp: "2026-06-14T10:05:00.000Z", sessionId: "S1", compactMetadata: { trigger: "manual", preTokens: 500000, postTokens: 16000 }, ...over });

// ─── parseLedger ────────────────────────────────────────────────────────────
test("parseLedger: parses valid lines, skips torn/empty", () => {
  const text = `${JSON.stringify(SEND())}\n\nNOT JSON\n${JSON.stringify({ action: "fallback" })}\n`;
  const recs = parseLedger(text);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].action, "send");
  assert.equal(recs[1].action, "fallback");
});
test("parseLedger: empty / non-string -> []", () => {
  assert.deepEqual(parseLedger(""), []);
  assert.deepEqual(parseLedger(null), []);
  assert.deepEqual(parseLedger(undefined), []);
});

// ─── record predicates ────────────────────────────────────────────────────────
test("isSendRecord: only ok sends", () => {
  assert.equal(isSendRecord(SEND()), true);
  assert.equal(isSendRecord(SEND({ sent: { ok: false, error: "x" } })), false);
  assert.equal(isSendRecord({ action: "fallback" }), false);
  assert.equal(isSendRecord(null), false);
});
test("isConfirmRecord + sendKey", () => {
  assert.equal(isConfirmRecord({ action: "confirm" }), true);
  assert.equal(isConfirmRecord(SEND()), false);
  assert.equal(sendKey(SEND()), "S1::2026-06-14T10:00:00.000Z");
});

// ─── boundary parsing ─────────────────────────────────────────────────────────
test("lineHasBoundaryMarker: current + legacy markers", () => {
  assert.equal(lineHasBoundaryMarker(BOUNDARY_LINE()), true);
  assert.equal(lineHasBoundaryMarker('{"isCompactSummary":true,"timestamp":"x"}'), true);
  assert.equal(lineHasBoundaryMarker('{"type":"assistant","content":"hi"}'), false);
  assert.equal(lineHasBoundaryMarker(123), false);
});
test("parseBoundaryLine: extracts ts/trigger/tokens (current format)", () => {
  const b = parseBoundaryLine(BOUNDARY_LINE());
  assert.equal(b.ts, "2026-06-14T10:05:00.000Z");
  assert.equal(b.sessionId, "S1");
  assert.equal(b.trigger, "manual");
  assert.equal(b.preTokens, 500000);
  assert.equal(b.format, "compact_boundary");
});
test("parseBoundaryLine: legacy isCompactSummary", () => {
  const b = parseBoundaryLine(JSON.stringify({ isCompactSummary: true, timestamp: "2026-06-14T10:05:00.000Z", sessionId: "S1" }));
  assert.equal(b.format, "isCompactSummary");
  assert.equal(b.trigger, "legacy");
});
test("parseBoundaryLine: marker substring inside non-boundary content -> null", () => {
  // A user/assistant message that merely QUOTES the marker text must not parse as a boundary.
  const line = JSON.stringify({ type: "assistant", content: 'discussing "subtype":"compact_boundary" formats' });
  assert.equal(parseBoundaryLine(line), null);
});
test("extractBoundaries: keeps only valid-ts boundaries", () => {
  const lines = [
    BOUNDARY_LINE(),
    '{"type":"assistant","content":"x"}',
    JSON.stringify({ subtype: "compact_boundary" }), // no timestamp -> dropped
    "torn{json",
  ];
  const bs = extractBoundaries(lines);
  assert.equal(bs.length, 1);
  assert.equal(bs[0].ts, "2026-06-14T10:05:00.000Z");
});

// ─── findFirstBoundaryAtOrAfter ───────────────────────────────────────────────
test("findFirstBoundaryAtOrAfter: after = match, before = no match", () => {
  const after = { ts: "2026-06-14T10:05:00.000Z" };
  const before = { ts: "2026-06-14T09:55:00.000Z" };
  assert.equal(findFirstBoundaryAtOrAfter([after], "2026-06-14T10:00:00.000Z").ts, after.ts);
  assert.equal(findFirstBoundaryAtOrAfter([before], "2026-06-14T10:00:00.000Z"), null);
});
test("findFirstBoundaryAtOrAfter: equal ts counts (>=)", () => {
  assert.ok(findFirstBoundaryAtOrAfter([{ ts: "2026-06-14T10:00:00.000Z" }], "2026-06-14T10:00:00.000Z"));
});
test("findFirstBoundaryAtOrAfter: respects window", () => {
  const far = { ts: "2026-06-14T12:00:00.000Z" }; // +2h
  assert.equal(findFirstBoundaryAtOrAfter([far], "2026-06-14T10:00:00.000Z", 60 * 60 * 1000), null);
  assert.ok(findFirstBoundaryAtOrAfter([far], "2026-06-14T10:00:00.000Z", 3 * 60 * 60 * 1000));
});
test("findFirstBoundaryAtOrAfter: picks NEAREST qualifying", () => {
  const b1 = { ts: "2026-06-14T10:30:00.000Z" };
  const b2 = { ts: "2026-06-14T10:05:00.000Z" };
  assert.equal(findFirstBoundaryAtOrAfter([b1, b2], "2026-06-14T10:00:00.000Z").ts, b2.ts);
});

// ─── correlate ────────────────────────────────────────────────────────────────
test("correlate: send -> confirmed with latency + trigger", () => {
  const rows = correlate([SEND()], { S1: [{ ts: "2026-06-14T10:05:00.000Z", trigger: "manual" }] });
  assert.equal(rows[0].confirmed, true);
  assert.equal(rows[0].latencyMs, 5 * 60 * 1000);
  assert.equal(rows[0].trigger, "manual");
  assert.equal(rows[0].reason, "boundary-confirmed");
});
test("correlate: no boundary -> unconfirmed", () => {
  const rows = correlate([SEND()], { S1: [] });
  assert.equal(rows[0].confirmed, false);
  assert.equal(rows[0].reason, "no-boundary-after-send");
});
test("correlate: boundary before send -> unconfirmed", () => {
  const rows = correlate([SEND()], { S1: [{ ts: "2026-06-14T09:00:00.000Z" }] });
  assert.equal(rows[0].confirmed, false);
});
test("correlate: wrong-session boundary not matched", () => {
  const rows = correlate([SEND()], { S2: [{ ts: "2026-06-14T10:05:00.000Z" }] });
  assert.equal(rows[0].confirmed, false);
});
test("correlate: missing sessionId on send -> reason no-sessionId", () => {
  const rows = correlate([SEND({ sessionId: null })], {});
  assert.equal(rows[0].confirmed, false);
  assert.equal(rows[0].reason, "no-sessionId-on-send");
});
test("correlate: multi-send partial confirmation", () => {
  const sends = [SEND({ ts: "2026-06-14T10:00:00.000Z" }), SEND({ ts: "2026-06-14T13:00:00.000Z" })];
  const rows = correlate(sends, { S1: [{ ts: "2026-06-14T10:05:00.000Z", trigger: "manual" }] });
  assert.equal(rows[0].confirmed, true);
  assert.equal(rows[1].confirmed, false); // 13:00 send, no boundary within window after it
});

// ─── summarize ────────────────────────────────────────────────────────────────
test("summarize: counts, firstConfirmedAt, bySlot", () => {
  const corr = [
    { ts: "t", slot: "alpha", confirmed: true, boundaryTs: "2026-06-14T10:05:00.000Z" },
    { ts: "t", slot: "alpha", confirmed: false, boundaryTs: null },
    { ts: "t", slot: "bravo", confirmed: true, boundaryTs: "2026-06-14T09:00:00.000Z" },
  ];
  const s = summarize(corr);
  assert.equal(s.sent, 3);
  assert.equal(s.confirmed, 2);
  assert.equal(s.unconfirmed, 1);
  assert.equal(s.firstConfirmedAt, "2026-06-14T09:00:00.000Z");
  assert.deepEqual(s.bySlot.alpha, { sent: 2, confirmed: 1 });
  assert.deepEqual(s.bySlot.bravo, { sent: 1, confirmed: 1 });
});

// ─── path encoding ────────────────────────────────────────────────────────────
test("encodeProjectKey: H:/prism -> H--prism", () => {
  assert.equal(encodeProjectKey("H:/prism"), "H--prism");
  assert.equal(encodeProjectKey("H:\\prism"), "H--prism");
});
test("defaultTranscriptPath: composes <home>/.claude/projects/<key>/<sid>.jsonl", () => {
  const p = defaultTranscriptPath("ABC", { homedir: "/home/u", cwd: "H:/prism" });
  assert.equal(p.replace(/\\/g, "/"), "/home/u/.claude/projects/H--prism/ABC.jsonl");
});

// ─── shortHex + resolveTranscriptPath (P0: short-id-in-ledger vs full-UUID transcript) ───
test("shortHex: handles full UUID, claude-<8hex>, bare 8hex", () => {
  assert.equal(shortHex("ad9c3041-c806-4424-9eed-fea97a4fc64b"), "ad9c3041");
  assert.equal(shortHex("claude-ad9c3041"), "ad9c3041");
  assert.equal(shortHex("AD9C3041"), "ad9c3041");
  assert.equal(shortHex("nothex!!"), null);
  assert.equal(shortHex(null), null);
});
test("resolveTranscriptPath: exact full-UUID path when it exists", () => {
  const p = resolveTranscriptPath("ad9c3041-c806-4424-9eed-fea97a4fc64b", {
    homedir: "/h", cwd: "H:/prism", exists: () => true, readdir: () => { throw new Error("should not list"); },
  });
  assert.equal(p.replace(/\\/g, "/"), "/h/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b.jsonl");
});
test("resolveTranscriptPath: SHORT claude-<8hex> id maps to the full-UUID transcript by prefix (THE P0 fix)", () => {
  const p = resolveTranscriptPath("claude-ad9c3041", {
    homedir: "/h", cwd: "H:/prism",
    exists: () => false, // exact short path absent
    readdir: () => ["ad9c3041-c806-4424-9eed-fea97a4fc64b.jsonl", "other-session.jsonl"],
  });
  assert.equal(p.replace(/\\/g, "/"), "/h/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b.jsonl");
});
test("resolveTranscriptPath: no prefix match -> exact (fail-soft) ; unreadable dir -> exact", () => {
  const opts = { homedir: "/h", cwd: "H:/prism", exists: () => false, readdir: () => ["zzz.jsonl"] };
  assert.ok(resolveTranscriptPath("claude-ad9c3041", opts).includes("claude-ad9c3041.jsonl"));
  const opts2 = { homedir: "/h", cwd: "H:/prism", exists: () => false, readdir: () => { throw new Error("ENOENT"); } };
  assert.ok(resolveTranscriptPath("claude-ad9c3041", opts2).includes("claude-ad9c3041.jsonl"));
});
test("runConfirm: SHORT ledger id confirms against a FULL-UUID transcript end-to-end (P0 regression)", async () => {
  const ledger = JSON.stringify(SEND({ sessionId: "claude-ad9c3041" })) + "\n";
  let resolvedSid = null;
  const { summary, newConfirms } = await runConfirm({
    ledgerPath: "x",
    readText: () => ledger,
    // simulate the real resolver mapping short->full, then reading the full transcript's boundary
    transcriptPathFor: (sid) => resolveTranscriptPath(sid, {
      homedir: "/h", cwd: "H:/prism", exists: () => false,
      readdir: () => ["ad9c3041-c806-4424-9eed-fea97a4fc64b.jsonl"],
    }),
    readBoundaries: async (p) => { resolvedSid = p; return [{ ts: "2026-06-14T10:05:00.000Z", sessionId: "ad9c3041-c806-4424-9eed-fea97a4fc64b", trigger: "manual" }]; },
  });
  assert.ok(resolvedSid.replace(/\\/g, "/").endsWith("ad9c3041-c806-4424-9eed-fea97a4fc64b.jsonl"), "short id resolved to full-UUID transcript");
  assert.equal(summary.confirmed, 1);
  assert.equal(newConfirms[0].forKey, "claude-ad9c3041::2026-06-14T10:00:00.000Z");
});

// ─── readBoundariesFromFile (real temp fixture) ───────────────────────────────
test("readBoundariesFromFile: streams a real file, finds boundary past a HUGE non-marker line (adversarial)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scc-"));
  const fp = path.join(dir, "t.jsonl");
  const hugeLine = JSON.stringify({ type: "assistant", content: "x".repeat(2_000_000) }); // 2MB non-marker line
  fs.writeFileSync(fp, [
    '{"type":"user","content":"hi"}',
    hugeLine,
    BOUNDARY_LINE(),
    "torn{not-json",
  ].join("\n") + "\n");
  try {
    const bs = await readBoundariesFromFile(fp);
    assert.equal(bs.length, 1);
    assert.equal(bs[0].ts, "2026-06-14T10:05:00.000Z");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("readBoundariesFromFile: missing file -> []", async () => {
  assert.deepEqual(await readBoundariesFromFile("H:/prism/__no_such_transcript__.jsonl"), []);
});

// ─── runConfirm (full orchestration, injected I/O) ────────────────────────────
test("runConfirm: confirms a real send end-to-end + emits idempotent confirm", async () => {
  const ledger = [SEND()].map((r) => JSON.stringify(r)).join("\n") + "\n";
  const { summary, newConfirms } = await runConfirm({
    ledgerPath: "x",
    readText: () => ledger,
    transcriptPathFor: (sid) => `/fake/${sid}.jsonl`,
    readBoundaries: async () => [{ ts: "2026-06-14T10:05:00.000Z", sessionId: "S1", trigger: "manual" }],
  });
  assert.equal(summary.sent, 1);
  assert.equal(summary.confirmed, 1);
  assert.equal(newConfirms.length, 1);
  assert.equal(newConfirms[0].action, "confirm");
  assert.equal(newConfirms[0].forKey, "S1::2026-06-14T10:00:00.000Z");
  assert.equal(newConfirms[0].trigger, "manual");
});
test("runConfirm: idempotent -- already-confirmed send emits no new confirm", async () => {
  const recs = [SEND(), { action: "confirm", forKey: "S1::2026-06-14T10:00:00.000Z" }];
  const ledger = recs.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const { summary, newConfirms } = await runConfirm({
    ledgerPath: "x",
    readText: () => ledger,
    readBoundaries: async () => [{ ts: "2026-06-14T10:05:00.000Z", sessionId: "S1" }],
  });
  assert.equal(summary.confirmed, 1);
  assert.equal(newConfirms.length, 0); // already recorded
});
test("runConfirm: unconfirmed send -> no confirm, summary reflects it", async () => {
  const ledger = JSON.stringify(SEND()) + "\n";
  const { summary, newConfirms } = await runConfirm({
    ledgerPath: "x", readText: () => ledger, readBoundaries: async () => [],
  });
  assert.equal(summary.confirmed, 0);
  assert.equal(summary.unconfirmed, 1);
  assert.equal(newConfirms.length, 0);
});
test("DEFAULT_CONFIRM_WINDOW_MS is 60 min", () => {
  assert.equal(DEFAULT_CONFIRM_WINDOW_MS, 60 * 60 * 1000);
});
