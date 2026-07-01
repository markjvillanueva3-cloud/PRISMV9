/**
 * FLEET-REAPER-MS3/U-FR-MS3-C — per-chat-tree proactive compact advisory tests.
 *
 * 16 cases:
 *   1   clean → no advisories
 *   2   single tree over threshold → one advisory + sweepRecord
 *   3   cooldown blocks 2nd emission within window
 *   4   cooldown CLEARS on drop + resume (the key "re-bloat" semantic)
 *   5   multi-tree iteration: 3 trees, 2 over → 2 advisories
 *   6   slot label resolution: named slot surfaces in advisory.slot
 *   7   tree-with-no-slot falls back to `tree-<PID>` (matches MS1 graceful degradation)
 *   8   PRISM_FM_CHAT_ADVISORY_DISABLE=1 returns zero advisories
 *   9   PRISM_FM_CHAT_THRESHOLD_MB clamps to range [256..16384]
 *   10  PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC clamps to range [60..86400]
 *   11  advisory body format is deterministic (operator-recognizable text)
 *   12  multi-sweep coexistence: trees that come/go don't cross-contaminate
 *   13  ledger reader: missing file returns []
 *   14  ledger reader: malformed JSON line is fail-soft skipped
 *   15  LEGACY PARITY: disabled returns no advisories AND no sweepRecord emissions —
 *       byte-identical to pre-MS3 (only the existing system-wide advisory paths fire)
 *   16  REAL-DATA E2E: tmpdir + synthetic perTree across 4 sweeps mirrors the spec
 *       scenario (emit → cooldown-suppress → drop+resume → re-emit)
 *
 * Test-runner: node:test (matches MS2 pattern).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  evaluateChatTreeAdvisories,
  readChatAdvisoryLedger,
  appendChatAdvisorySweepRecord,
  CHAT_ADVISORY_DEFAULT_THRESHOLD_MB,
  CHAT_ADVISORY_DEFAULT_COOLDOWN_SEC,
} from "../fleet-memory-monitor.mjs";

const MB = 1024 * 1024;
const GB = 1024 * MB;
function mkTree({ anchorPid = 1000, rssGb = 1, slotLabel = null } = {}) {
  return {
    anchorPid,
    anchorRssBytes: 100 * MB,
    rssBytes: Math.round(rssGb * GB),
    count: 1,
    procs: [anchorPid],
    slotLabel,
  };
}

// 1
test("evaluate: clean perTree (all under threshold) → zero advisories", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 1.0 }) },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  assert.equal(r.advisories.length, 0);
  assert.deepEqual(r.sweepRecord.keysOver, []);
  assert.deepEqual(r.sweepRecord.emitted, []);
});

// 2
test("evaluate: single tree over threshold (default 2 GB) → 1 advisory", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-100": mkTree({ anchorPid: 100, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  assert.equal(r.advisories.length, 1);
  const a = r.advisories[0];
  assert.equal(a.key, "alpha");
  assert.equal(a.slot, "alpha");
  assert.equal(a.anchorPid, 100);
  assert.equal(a.rssMb, Math.round(2.5 * 1024));
  assert.equal(a.thresholdMb, 2048);
  assert.equal(a.tsMs, 1_000_000);
  assert.deepEqual(r.sweepRecord.keysOver, ["alpha"]);
  assert.deepEqual(r.sweepRecord.emitted, ["alpha"]);
});

// 3
test("evaluate: cooldown blocks 2nd emission within cooldown window", () => {
  const t0 = 1_000_000;
  const ledger = [{ tsMs: t0, ts: new Date(t0).toISOString(), keysOver: ["alpha"], emitted: ["alpha"] }];
  // 5 min later, still over — cooldown is 1800s = 30 min
  const r = evaluateChatTreeAdvisories(
    { "tree-100": mkTree({ anchorPid: 100, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger, nowMs: t0 + 5 * 60 * 1000, env: {} },
  );
  assert.equal(r.advisories.length, 0, "should suppress during cooldown");
  assert.deepEqual(r.sweepRecord.keysOver, ["alpha"]);
  assert.deepEqual(r.sweepRecord.emitted, []);
});

// 4
test("evaluate: cooldown CLEARS on drop+resume (re-bloat fires fresh)", () => {
  const t0 = 1_000_000;
  const ledger = [
    { tsMs: t0, ts: new Date(t0).toISOString(), keysOver: ["alpha"], emitted: ["alpha"] },
    // intermediate sweep: alpha DROPPED below threshold
    { tsMs: t0 + 5 * 60 * 1000, ts: new Date(t0 + 5 * 60 * 1000).toISOString(), keysOver: [], emitted: [] },
  ];
  // 10 min after initial emission alpha re-bloats — well within 30-min cooldown
  const r = evaluateChatTreeAdvisories(
    { "tree-100": mkTree({ anchorPid: 100, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger, nowMs: t0 + 10 * 60 * 1000, env: {} },
  );
  assert.equal(r.advisories.length, 1, "drop should clear cooldown");
  assert.equal(r.advisories[0].reason, "drop-clear");
});

// 5
test("evaluate: multi-tree, 2 of 3 over → 2 advisories (independent per-tree)", () => {
  const r = evaluateChatTreeAdvisories(
    {
      "tree-1": mkTree({ anchorPid: 1, rssGb: 0.5, slotLabel: "alpha" }), // under
      "tree-2": mkTree({ anchorPid: 2, rssGb: 3.0, slotLabel: "bravo" }), // over
      "tree-3": mkTree({ anchorPid: 3, rssGb: 4.0, slotLabel: "charlie" }), // over
    },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  assert.equal(r.advisories.length, 2);
  const keys = r.advisories.map(a => a.key).sort();
  assert.deepEqual(keys, ["bravo", "charlie"]);
});

// 6
test("evaluate: named slot surfaces in advisory.slot field", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-100": mkTree({ anchorPid: 100, rssGb: 2.5, slotLabel: "delta" }) },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  assert.equal(r.advisories[0].slot, "delta");
  assert.equal(r.advisories[0].key, "delta");
});

// 7
test("evaluate: tree-with-no-slot falls back to `tree-<PID>` key (MS1 parity)", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-999": mkTree({ anchorPid: 999, rssGb: 2.5, slotLabel: null }) },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  assert.equal(r.advisories[0].slot, null);
  assert.equal(r.advisories[0].key, "tree-999");
  assert.equal(r.advisories[0].treeKey, "tree-999");
});

// 8
test("evaluate: PRISM_FM_CHAT_ADVISORY_DISABLE=1 returns zero advisories", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 5.0, slotLabel: "alpha" }) },
    { ledger: [], nowMs: 1_000_000, env: { PRISM_FM_CHAT_ADVISORY_DISABLE: "1" } },
  );
  assert.equal(r.advisories.length, 0);
  assert.equal(r.disabled, true);
  // keysOver still surfaced so the ledger still tracks state (drop detection works
  // even with advisories disabled, in case operator re-enables mid-incident)
  assert.deepEqual(r.sweepRecord.keysOver, ["alpha"]);
});

// 9
test("evaluate: PRISM_FM_CHAT_THRESHOLD_MB clamps to [256, 16384]", () => {
  // Way out of range — clamps high to 16384
  let r = evaluateChatTreeAdvisories(
    { "t": mkTree({ rssGb: 20, slotLabel: "a" }) },
    { ledger: [], nowMs: 0, env: { PRISM_FM_CHAT_THRESHOLD_MB: "999999" } },
  );
  assert.equal(r.thresholdMb, 16384);

  // Below floor — clamps low to 256
  r = evaluateChatTreeAdvisories(
    { "t": mkTree({ rssGb: 0.5, slotLabel: "a" }) },
    { ledger: [], nowMs: 0, env: { PRISM_FM_CHAT_THRESHOLD_MB: "1" } },
  );
  assert.equal(r.thresholdMb, 256);
  // 0.5 GB = 512 MB > 256 MB → should emit
  assert.equal(r.advisories.length, 1);

  // Garbage non-numeric → falls back to default (2048)
  r = evaluateChatTreeAdvisories(
    { "t": mkTree({ rssGb: 1.5, slotLabel: "a" }) },
    { ledger: [], nowMs: 0, env: { PRISM_FM_CHAT_THRESHOLD_MB: "NaN-banana" } },
  );
  assert.equal(r.thresholdMb, CHAT_ADVISORY_DEFAULT_THRESHOLD_MB);
});

// 10
test("evaluate: PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC clamps to [60, 86400]", () => {
  let r = evaluateChatTreeAdvisories({}, { ledger: [], nowMs: 0, env: { PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC: "1" } });
  assert.equal(r.cooldownSec, 60);
  r = evaluateChatTreeAdvisories({}, { ledger: [], nowMs: 0, env: { PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC: "999999" } });
  assert.equal(r.cooldownSec, 86400);
  r = evaluateChatTreeAdvisories({}, { ledger: [], nowMs: 0, env: {} });
  assert.equal(r.cooldownSec, CHAT_ADVISORY_DEFAULT_COOLDOWN_SEC);
});

// 11
test("evaluate: advisory body format is deterministic + operator-recognizable", () => {
  const r = evaluateChatTreeAdvisories(
    { "tree-100": mkTree({ anchorPid: 100, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger: [], nowMs: 1_000_000, env: {} },
  );
  const body = r.advisories[0].body;
  // Must mention RSS, threshold, and recommend /compact (operator action)
  assert.ok(body.includes("2.50 GB"), `expected "2.50 GB" in: ${body}`);
  assert.ok(body.includes("2.00 GB") || body.includes("threshold 2 GB") || body.includes("2.0 GB"), `expected threshold mention in: ${body}`);
  assert.ok(body.toLowerCase().includes("/compact"), `expected "/compact" in: ${body}`);
});

// 12
test("evaluate: multi-sweep coexistence — a tree fully cycles without cross-contamination", () => {
  // Sweep 1: emit alpha
  let ledger = [];
  let r1 = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger, nowMs: 1000, env: {} },
  );
  ledger = [r1.sweepRecord];
  assert.deepEqual(r1.sweepRecord.emitted, ["alpha"]);

  // Sweep 2: bravo emerges; alpha gone. Alpha shouldn't block bravo.
  let r2 = evaluateChatTreeAdvisories(
    { "tree-2": mkTree({ anchorPid: 2, rssGb: 3.0, slotLabel: "bravo" }) },
    { ledger, nowMs: 2000, env: {} },
  );
  assert.deepEqual(r2.sweepRecord.emitted, ["bravo"]);
  assert.deepEqual(r2.sweepRecord.keysOver, ["bravo"]);
});

// 13
test("readChatAdvisoryLedger: missing file returns []", () => {
  const tmp = mkdtempSync(join(tmpdir(), "fmm-cadv-"));
  const path = join(tmp, "nonexistent.jsonl");
  const r = readChatAdvisoryLedger(path);
  assert.deepEqual(r, []);
});

// 14
test("readChatAdvisoryLedger: malformed JSON lines fail-soft (skipped, valid lines kept)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "fmm-cadv-"));
  const path = join(tmp, "ledger.jsonl");
  const valid = JSON.stringify({ tsMs: 1, keysOver: ["a"], emitted: [] });
  writeFileSync(path, valid + "\n" + "{ not json\n" + valid + "\n", "utf8");
  const r = readChatAdvisoryLedger(path);
  assert.equal(r.length, 2);
  assert.equal(r[0].tsMs, 1);
  assert.equal(r[1].tsMs, 1);
});

// 15 — LEGACY PARITY
test("LEGACY PARITY: disabled → zero advisories + sweepRecord.emitted empty (pre-MS3 byte-identical advisory flow)", () => {
  const r = evaluateChatTreeAdvisories(
    {
      "tree-1": mkTree({ anchorPid: 1, rssGb: 3.0, slotLabel: "alpha" }),
      "tree-2": mkTree({ anchorPid: 2, rssGb: 5.0, slotLabel: "bravo" }),
    },
    { ledger: [], nowMs: 1_000_000, env: { PRISM_FM_CHAT_ADVISORY_DISABLE: "1" } },
  );
  assert.equal(r.advisories.length, 0);
  assert.deepEqual(r.sweepRecord.emitted, []);
  // sweepRecord.keysOver IS still populated — needed for drop-detection if
  // operator re-enables mid-incident. Pre-MS3 had no per-chat advisory at
  // all, so this is purely additive observable state — the existing
  // appendChatBus + decideAdvisory paths (sytem-wide advisory) are
  // untouched and remain byte-identical.
});

// 16 — REAL-DATA E2E spanning 4 sweeps over a real tmp ledger file
test("REAL-DATA E2E: 4-sweep scenario (emit → cooldown-suppress → drop+resume → re-emit)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "fmm-cadv-e2e-"));
  const path = join(tmp, "advisories.jsonl");

  // Sweep A (t=0): alpha at 2.5 GB → emit
  let ledger = readChatAdvisoryLedger(path);
  let r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger, nowMs: 0, env: {} },
  );
  assert.equal(r.advisories.length, 1, "sweep A: should emit");
  appendChatAdvisorySweepRecord(r.sweepRecord, path);

  // Sweep B (t=+5min): alpha still 2.5 GB → cooldown suppresses
  ledger = readChatAdvisoryLedger(path);
  r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 2.5, slotLabel: "alpha" }) },
    { ledger, nowMs: 5 * 60 * 1000, env: {} },
  );
  assert.equal(r.advisories.length, 0, "sweep B: cooldown should suppress");
  appendChatAdvisorySweepRecord(r.sweepRecord, path);

  // Sweep C (t=+10min): alpha dropped to 1 GB (e.g., user /compact-ed) → no advisory, drop logged
  ledger = readChatAdvisoryLedger(path);
  r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 1.0, slotLabel: "alpha" }) },
    { ledger, nowMs: 10 * 60 * 1000, env: {} },
  );
  assert.equal(r.advisories.length, 0, "sweep C: under threshold, no advisory");
  assert.deepEqual(r.sweepRecord.keysOver, [], "sweep C: keysOver records the drop");
  appendChatAdvisorySweepRecord(r.sweepRecord, path);

  // Sweep D (t=+15min): alpha re-bloated to 3 GB → SHOULD emit (drop cleared cooldown)
  ledger = readChatAdvisoryLedger(path);
  r = evaluateChatTreeAdvisories(
    { "tree-1": mkTree({ anchorPid: 1, rssGb: 3.0, slotLabel: "alpha" }) },
    { ledger, nowMs: 15 * 60 * 1000, env: {} },
  );
  assert.equal(r.advisories.length, 1, "sweep D: drop should clear cooldown, re-emit");
  assert.equal(r.advisories[0].reason, "drop-clear");
  appendChatAdvisorySweepRecord(r.sweepRecord, path);

  // Verify the ledger file is JSONL with one line per sweep
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n").filter(Boolean);
  assert.equal(lines.length, 4);
  assert.ok(existsSync(path));
});
