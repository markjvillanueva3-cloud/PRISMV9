// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA04 — drift-detect tests (hermetic).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STALE_LOOP_TICK_MS,
  DEFAULT_TOPIC_DRIFT_LOOKBACK,
  DRIFT_KINDS,
  detectStaleLoopTick,
  extractCommitScope,
  detectTopicDrift,
  summarizeDrift,
} from "../../scripts/lib/zebra-drift-detect.mjs";

const T0 = Date.parse("2026-05-20T18:00:00Z");
const FRESH = new Date(T0 - 60 * 1000).toISOString();           // 1m ago
const STALE = new Date(T0 - 30 * 60 * 1000).toISOString();      // 30m ago

describe("constants", () => {
  it("DEFAULT_STALE_LOOP_TICK_MS is 15 min", () => {
    assert.equal(DEFAULT_STALE_LOOP_TICK_MS, 15 * 60 * 1000);
  });
  it("DEFAULT_TOPIC_DRIFT_LOOKBACK is 5", () => {
    assert.equal(DEFAULT_TOPIC_DRIFT_LOOKBACK, 5);
  });
  it("DRIFT_KINDS is frozen", () => {
    assert.equal(Object.isFrozen(DRIFT_KINDS), true);
  });
});

describe("detectStaleLoopTick", () => {
  it("no drift when loopState is missing", () => {
    assert.equal(detectStaleLoopTick(null).drift, false);
    assert.equal(detectStaleLoopTick(undefined).drift, false);
    assert.equal(detectStaleLoopTick("nope").drift, false);
  });
  it("no drift when status not running", () => {
    const r = detectStaleLoopTick({ status: "completed", lastTickAt: STALE }, { now: T0 });
    assert.equal(r.drift, false);
    assert.match(r.reason, /loop-status-completed/);
  });
  it("no drift when lastTickAt unparseable", () => {
    const r = detectStaleLoopTick({ status: "running", lastTickAt: "garbage" }, { now: T0 });
    assert.equal(r.drift, false);
    assert.equal(r.reason, "lastTickAt-unparseable");
  });
  it("no drift when tick fresh", () => {
    const r = detectStaleLoopTick({ status: "running", lastTickAt: FRESH }, { now: T0 });
    assert.equal(r.drift, false);
    assert.equal(r.reason, "tick-fresh");
  });
  it("drift when tick exceeds threshold", () => {
    const r = detectStaleLoopTick(
      { status: "running", lastTickAt: STALE, goal: "ship ZEBRA-MS0" },
      { now: T0 },
    );
    assert.equal(r.drift, true);
    assert.equal(r.kind, "stale-loop-tick");
    assert.equal(r.goal, "ship ZEBRA-MS0");
    assert.match(r.reason, /loop-tick-stale:/);
  });
  it("honors custom staleMs threshold", () => {
    const r = detectStaleLoopTick(
      { status: "running", lastTickAt: new Date(T0 - 5 * 60 * 1000).toISOString() },
      { now: T0, staleMs: 60 * 1000 },
    );
    assert.equal(r.drift, true);
  });
});

describe("extractCommitScope", () => {
  it("returns null on non-string", () => {
    assert.equal(extractCommitScope(null), null);
    assert.equal(extractCommitScope(42), null);
  });
  it("returns null when no brackets present", () => {
    assert.equal(extractCommitScope("just text"), null);
  });
  it("extracts the first SCOPE tag", () => {
    assert.equal(extractCommitScope("[ZEBRA-MS0]/U-Z02: title"), "ZEBRA-MS0");
  });
  it("skips a leading [MAIN] lane tag", () => {
    assert.equal(extractCommitScope("[MAIN] [ZEBRA-MS0]/U-Z02: title"), "ZEBRA-MS0");
  });
  it("returns null if only [MAIN] is present", () => {
    assert.equal(extractCommitScope("[MAIN] no scope: title"), null);
  });
});

describe("detectTopicDrift", () => {
  const commits = (...subjects) => subjects.map(s => ({ subject: s }));

  it("no drift when slotEntry missing", () => {
    assert.equal(detectTopicDrift(null, commits()).drift, false);
  });
  it("no drift when topic is empty", () => {
    const r = detectTopicDrift({ topic: "" }, commits("[FOO]/x: y"));
    assert.equal(r.drift, false);
    assert.equal(r.reason, "no-topic-advertised");
  });
  it("no drift when recentCommits empty/missing", () => {
    assert.equal(detectTopicDrift({ topic: "bravo-work" }, []).drift, false);
    assert.equal(detectTopicDrift({ topic: "bravo-work" }, null).drift, false);
  });
  it("matches case-insensitively, scope-in-topic substring", () => {
    const r = detectTopicDrift(
      { topic: "bravo-zebra-orchestrator-ms0" },
      commits("[MAIN] [ZEBRA-ORCHESTRATOR-MS0]/U-Z02: body"),
    );
    assert.equal(r.drift, false);
    assert.equal(r.reason, "topic-matches-recent");
  });
  it("matches when topic-in-scope substring", () => {
    const r = detectTopicDrift(
      { topic: "MS0" },
      commits("[MAIN] [ZEBRA-MS0]/U-Z02: body"),
    );
    assert.equal(r.drift, false);
  });
  it("drift when no scope in window matches topic", () => {
    const r = detectTopicDrift(
      { topic: "zebra-orchestrator-ms0" },
      commits(
        "[MAIN] [CAMX-MS0.3]/U-CAMX22: body",
        "[MAIN] [HM-TRAINING]/U-HMT01: body",
        "[MAIN] [SPEEDFEED]/T01: body",
      ),
    );
    assert.equal(r.drift, true);
    assert.equal(r.kind, "topic-drift");
    assert.match(r.reason, /topic-no-match:/);
    assert.deepEqual(r.seenScopes.sort(), ["CAMX-MS0.3", "HM-TRAINING", "SPEEDFEED"].sort());
  });
  it("respects custom lookback (only first N commits)", () => {
    const r = detectTopicDrift(
      { topic: "ZEBRA" },
      commits(
        "[MAIN] [OTHER-MS0]/U-O1: x",
        "[MAIN] [ZEBRA-MS0]/U-Z02: y",
      ),
      { lookback: 1 },
    );
    assert.equal(r.drift, true); // only first commit considered, doesn't match
  });
  it("no drift when SCOPE extraction yields no scopes", () => {
    const r = detectTopicDrift(
      { topic: "zebra" },
      commits("free-text no brackets", "[MAIN] still only lane"),
    );
    assert.equal(r.drift, false);
    assert.equal(r.reason, "no-scopes-extracted");
  });
});

describe("summarizeDrift", () => {
  it("returns no-drift when neither signal fires", () => {
    const r = summarizeDrift(
      { status: "running", lastTickAt: FRESH },
      { topic: "zebra" },
      [{ subject: "[MAIN] [ZEBRA-MS0]/U-Z02: x" }],
      { now: T0 },
    );
    assert.equal(r.drift, false);
  });
  it("stale loop wins over topic drift", () => {
    const r = summarizeDrift(
      { status: "running", lastTickAt: STALE, goal: "g" },
      { topic: "zebra-ms0" },
      [{ subject: "[MAIN] [SOMETHING-ELSE]/U-X01: x" }],
      { now: T0 },
    );
    assert.equal(r.drift, true);
    assert.equal(r.kind, "stale-loop-tick");
  });
  it("falls through to topic drift when loop is healthy", () => {
    const r = summarizeDrift(
      { status: "running", lastTickAt: FRESH },
      { topic: "zebra-ms0" },
      [{ subject: "[MAIN] [SOMETHING-ELSE]/U-X01: x" }],
      { now: T0 },
    );
    assert.equal(r.drift, true);
    assert.equal(r.kind, "topic-drift");
  });
});
