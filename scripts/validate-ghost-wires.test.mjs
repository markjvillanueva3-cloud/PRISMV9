// scripts/validate-ghost-wires.test.mjs
//
// Tests for G3 ghost-wire validator. Uses node --test runner.
//
// Coverage requirements (from SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-GHOST-WIRE-VALIDATE):
//   ≥3 failure modes  + ≥2 adversarial cases.
//
// Run: node --test scripts/validate-ghost-wires.test.mjs
//
// Authored 2026-05-21 sierra (claude-e6145e8b).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validate,
  classifyGhostWire,
  dispNodeIdToBasename,
  buildDispatcherIndex,
  STATUS_CONFIRMED,
  STATUS_REFUTED,
  STATUS_PENDING,
  REFUTED_AFTER_DAYS,
  STREAMING_READ_THRESHOLD_BYTES,
} from "./validate-ghost-wires.mjs";

// Frozen reference epoch — avoids real-clock skew in CI.
const NOW = Date.parse("2026-05-21T00:00:00Z");
const ONE_DAY_MS = 86_400_000;

// ---------- failure-mode 1: non-object graph throws ----------
test("validate() throws TypeError on non-object graph", () => {
  assert.throws(
    () => validate({ graph: null, dispatcherIndex: new Map(), dispatcherReader: () => "", now: NOW }),
    TypeError
  );
  assert.throws(
    () => validate({ graph: "not-an-object", dispatcherIndex: new Map(), dispatcherReader: () => "", now: NOW }),
    TypeError
  );
});

// ---------- failure-mode 2: malformed engineName → refuted ----------
test("classifyGhostWire returns refuted/malformed-engine-name on empty/whitespace label", () => {
  const r1 = classifyGhostWire({ engineName: "", proposedAt: new Date(NOW).toISOString(), dispatcherText: "anything", now: NOW });
  assert.equal(r1.status, STATUS_REFUTED);
  assert.equal(r1.reason, "malformed-engine-name");

  const r2 = classifyGhostWire({ engineName: "   ", proposedAt: new Date(NOW).toISOString(), dispatcherText: "anything", now: NOW });
  assert.equal(r2.status, STATUS_REFUTED);
  assert.equal(r2.reason, "malformed-engine-name");

  // Non-string also degrades gracefully.
  const r3 = classifyGhostWire({ engineName: null, proposedAt: new Date(NOW).toISOString(), dispatcherText: "anything", now: NOW });
  assert.equal(r3.status, STATUS_REFUTED);
});

// ---------- failure-mode 3: unresolvable dispatcher → pending dispatcher-unreadable ----------
test("classifyGhostWire returns pending/dispatcher-unreadable when dispatcherText is null", () => {
  const r = classifyGhostWire({
    engineName: "SomeEngine",
    proposedAt: new Date(NOW).toISOString(),
    dispatcherText: null,
    now: NOW,
  });
  assert.equal(r.status, STATUS_PENDING);
  assert.equal(r.reason, "dispatcher-unreadable");
});

// ---------- adversarial 1: word-boundary — MillEngine MUST NOT match WindMillEngine ----------
test("classifyGhostWire uses word boundaries — MillEngine must NOT match WindMillEngine", () => {
  // Only contains substring, NOT the whole token.
  const dispatcherWithLongerToken = `
    import { WindMillEngine } from "../engines/WindMillEngine.js";
    export const dispatcher = { actions: ["wind_mill_action"] };
  `;
  const r = classifyGhostWire({
    engineName: "MillEngine",
    proposedAt: new Date(NOW).toISOString(),
    dispatcherText: dispatcherWithLongerToken,
    now: NOW,
  });
  assert.equal(r.status, STATUS_PENDING, "should NOT confirm on substring match");
  assert.equal(r.reason, "no-reference-yet");

  // Sanity: same dispatcher with the actual MillEngine token DOES confirm.
  const dispatcherWithExactToken = `import { MillEngine } from "../engines/MillEngine.js";`;
  const r2 = classifyGhostWire({
    engineName: "MillEngine",
    proposedAt: new Date(NOW).toISOString(),
    dispatcherText: dispatcherWithExactToken,
    now: NOW,
  });
  assert.equal(r2.status, STATUS_CONFIRMED);
});

// ---------- adversarial 2: clock skew — future proposed_at clamped daysOpen=0 ----------
test("classifyGhostWire clamps daysOpen=0 on future proposed_at (clock skew)", () => {
  const futureProposedAt = new Date(NOW + 7 * ONE_DAY_MS).toISOString(); // 7 days in the future
  const r = classifyGhostWire({
    engineName: "FutureEngine",
    proposedAt: futureProposedAt,
    dispatcherText: "no reference here",
    now: NOW,
  });
  assert.equal(r.daysOpen, 0, "future timestamp must clamp to 0 days open, not negative");
  assert.equal(r.status, STATUS_PENDING, "future proposed_at should surface as pending, not auto-confirm");
});

// ---------- adversarial 3: REFUTED_AFTER_DAYS threshold ----------
test("classifyGhostWire transitions pending → refuted at the REFUTED_AFTER_DAYS boundary", () => {
  // 29 days old, no reference → still pending.
  const proposed29d = new Date(NOW - 29 * ONE_DAY_MS).toISOString();
  const r29 = classifyGhostWire({
    engineName: "StaleEngine",
    proposedAt: proposed29d,
    dispatcherText: "unrelated text",
    now: NOW,
  });
  assert.equal(r29.status, STATUS_PENDING);

  // 31 days old, no reference → refuted.
  const proposed31d = new Date(NOW - 31 * ONE_DAY_MS).toISOString();
  const r31 = classifyGhostWire({
    engineName: "StaleEngine",
    proposedAt: proposed31d,
    dispatcherText: "unrelated text",
    now: NOW,
  });
  assert.equal(r31.status, STATUS_REFUTED);
  assert.equal(r31.reason, `no-reference-after-${REFUTED_AFTER_DAYS}d`);
});

// ---------- dispNodeIdToBasename — malformed inputs ----------
test("dispNodeIdToBasename returns null on malformed inputs (R12 fail-loud)", () => {
  assert.equal(dispNodeIdToBasename(null), null);
  assert.equal(dispNodeIdToBasename(""), null);
  assert.equal(dispNodeIdToBasename("not-disp-prefix"), null);
  assert.equal(dispNodeIdToBasename("disp."), null);
  assert.equal(dispNodeIdToBasename("disp.has space"), null);
  assert.equal(dispNodeIdToBasename("disp.has-dash"), null);
  // Valid case.
  assert.equal(dispNodeIdToBasename("disp.calcdispatcher"), "calcdispatcher");
});

// ---------- buildDispatcherIndex — case-insensitive + skip tests + skip non-ts ----------
test("buildDispatcherIndex builds case-insensitive map, skips tests and non-ts files", () => {
  const fakeList = () => [
    "calcDispatcher.ts",
    "camDispatcher.ts",
    "calcDispatcher.test.ts",  // must skip
    "README.md",               // must skip
    "DispatcherBase.ts",
  ];
  const idx = buildDispatcherIndex("/fake/dir", fakeList);
  assert.equal(idx.size, 3);
  assert.equal(idx.get("calcdispatcher"), "calcDispatcher.ts");
  assert.equal(idx.get("camdispatcher"), "camDispatcher.ts");
  assert.equal(idx.get("dispatcherbase"), "DispatcherBase.ts");
  // Missing entries.
  assert.equal(idx.get("nonexistent"), undefined);
});

test("buildDispatcherIndex returns empty Map on read failure (no throw)", () => {
  const failingList = () => { throw new Error("ENOENT"); };
  const idx = buildDispatcherIndex("/missing", failingList);
  assert.equal(idx.size, 0);
});

// ---------- validate() end-to-end with injected readers ----------
test("validate() classifies a mixed batch and emits overlay + outcomes", () => {
  const proposed10d = new Date(NOW - 10 * ONE_DAY_MS).toISOString(); // pending range
  const proposed40d = new Date(NOW - 40 * ONE_DAY_MS).toISOString(); // refuted range
  const graph = {
    nodes: [
      // Confirmed: dispatcher references engine name.
      {
        id: "ghost.unwired.MillEngine",
        kind: "ghost.unwired-engine",
        label: "MillEngine",
        proposed_at: proposed10d,
        proposed_wiring: "prism_calc",
        confidence: 0.8,
        reason: "name-suffix",
      },
      // Refuted: 40d old, no reference.
      {
        id: "ghost.unwired.OldGhostEngine",
        kind: "ghost.unwired-engine",
        label: "OldGhostEngine",
        proposed_at: proposed40d,
        proposed_wiring: "prism_calc",
        confidence: 0.6,
      },
      // Pending: 10d old, no reference.
      {
        id: "ghost.unwired.RecentEngine",
        kind: "ghost.unwired-engine",
        label: "RecentEngine",
        proposed_at: proposed10d,
        proposed_wiring: "prism_calc",
        confidence: 0.7,
      },
      // Non-ghost node — must be ignored.
      { id: "eng.SomeEngine", kind: "engine", label: "SomeEngine" },
    ],
  };
  const dispatcherIndex = new Map([["calcdispatcher", "calcDispatcher.ts"]]);
  // Only MillEngine appears as a token; the other two ghost engine names must
  // not appear anywhere in this string (not even in comments) or the
  // word-boundary regex will correctly classify them as confirmed too.
  const dispatcherReader = () => `import { MillEngine } from "../engines/mill.js";`;
  const result = validate({ graph, dispatcherIndex, dispatcherReader, now: NOW });

  assert.equal(result.outcomes.length, 3, "non-ghost node skipped");
  assert.equal(result.counts.confirmed, 1);
  assert.equal(result.counts.refuted, 1);
  assert.equal(result.counts.pending, 1);

  assert.equal(result.augmentation.kind, "ghost-wire-validation");
  // annotations is an object keyed by ghost node id (overlay convention,
  // matches wiringOverlay / staleness in merge-augmentations.mjs).
  assert.equal(Object.keys(result.augmentation.annotations).length, 3);
  assert.equal(result.augmentation.edges.length, 3);
  // Each annotation has the three overlay fields.
  for (const stamp of Object.values(result.augmentation.annotations)) {
    assert.ok(stamp.ghost_wire_status);
    assert.ok(stamp.ghost_wire_reason);
    assert.equal(typeof stamp.ghost_wire_days_open, "number");
  }

  // Intensity check — confirmed > refuted > pending.
  const byStatus = Object.fromEntries(result.augmentation.edges.map((e) => [e.status, e.intensity]));
  assert.ok(byStatus.confirmed > byStatus.refuted);
  assert.ok(byStatus.refuted > byStatus.pending);
});

test("validate() handles dispatcherReader throwing per ghost without aborting the sweep", () => {
  const graph = {
    nodes: [
      {
        id: "ghost.unwired.X",
        kind: "ghost.unwired-engine",
        label: "X",
        proposed_at: new Date(NOW).toISOString(),
        proposed_wiring: "prism_calc",
      },
      {
        id: "ghost.unwired.Y",
        kind: "ghost.unwired-engine",
        label: "Y",
        proposed_at: new Date(NOW).toISOString(),
        proposed_wiring: "prism_calc",
      },
    ],
  };
  const dispatcherIndex = new Map([["calcdispatcher", "calcDispatcher.ts"]]);
  let calls = 0;
  const dispatcherReader = () => {
    calls += 1;
    if (calls === 1) throw new Error("EBUSY simulated");
    return "Y matches here";  // Y will confirm
  };
  const result = validate({ graph, dispatcherIndex, dispatcherReader, now: NOW });
  assert.equal(result.outcomes.length, 2, "both ghosts still classified");
  // First ghost → pending (dispatcher-unreadable from throw).
  // Second ghost → confirmed (Y was in the text).
  const statuses = result.outcomes.map((o) => o.validation.status).sort();
  assert.deepEqual(statuses, [STATUS_CONFIRMED, STATUS_PENDING]);
});

// ---------- streaming-fallback threshold (VIZ-STREAMING-IO regression guard) ----------
// system-graph.json crossed Node's 0x1fffffe8 (~512MB) UTF-8 string limit on
// 2026-05-27, crashing runCli's readFileSync. Fix: size-gate at 256MB to the
// canonical readGraphStreaming() pattern (mirrors system-viz-ghost-report.mjs:50).
// If anyone bumps the threshold up over 512MB they'll re-introduce the crash —
// this test pins the value as a regression guard, NOT as an arbitrary number.
test("STREAMING_READ_THRESHOLD_BYTES pinned to canonical 256MB (regression guard)", () => {
  // Pinned at half the Node UTF-8 string-limit (~512MB) so we cross to
  // streaming WELL before the readFileSync ceiling. Same constant the
  // sibling ghost-report script uses.
  const CANONICAL = 256 * 1024 * 1024;
  assert.equal(STREAMING_READ_THRESHOLD_BYTES, CANONICAL,
    "must match scripts/system-viz-ghost-report.mjs:50 threshold");
  // Sanity bounds: anything > 512MB silently re-introduces the crash on
  // every machine with the larger graph; anything < 64MB needlessly
  // streams small graphs and pays the streaming-parser overhead tax.
  assert.ok(STREAMING_READ_THRESHOLD_BYTES <= 512 * 1024 * 1024,
    "threshold above 512MB will re-introduce the readFileSync string-limit crash");
  assert.ok(STREAMING_READ_THRESHOLD_BYTES >= 64 * 1024 * 1024,
    "threshold below 64MB wastes streaming-parser overhead on small graphs");
});
