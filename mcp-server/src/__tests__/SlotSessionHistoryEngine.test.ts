/**
 * SlotSessionHistoryEngine.test.ts — U-SR01 tests
 *
 * SLOT-RECOVERY-MS0/U-SR01 (2026-05-25, slot:golf)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §14
 *
 * Discipline: every assertion checks a SPECIFIC value the SUT produced from
 * REAL behavior. No `.toBeTruthy/.toBeDefined/.toBeNull/.toBeUndefined`,
 * no synthetic for-loops, no `as any`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, appendFileSync, readFileSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import {
  SlotSessionHistoryEngine,
  SLOT_NAMES,
  SCHEMA_VERSION,
  DEFAULT_RESUME_MAX_AGE_HOURS,
  slotSessionHistoryEngine,
  _resetSlotSessionHistoryEngineForTests,
  type SessionStartEvent,
  type HeartbeatEvent,
  type SessionEndEvent,
} from "../engines/SlotSessionHistoryEngine.js";

let tmpBase: string;
let engine: SlotSessionHistoryEngine;

beforeEach(() => {
  tmpBase = mkdtempSync(join(tmpdir(), "slot-session-test-"));
  engine = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 30 });
  delete process.env.PRISM_SLOT_NO_RESUME;
});

afterEach(() => {
  try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* tmp gc */ }
  _resetSlotSessionHistoryEngineForTests();
  delete process.env.PRISM_SLOT_NO_RESUME;
});

// ─── Constants ──────────────────────────────────────────────────────────

describe("constants", () => {
  it("SLOT_NAMES contains the 26 canonical NATO slots in stable order", () => {
    expect(SLOT_NAMES.length).toBe(26);
    expect(SLOT_NAMES[0]).toBe("alpha");
    expect(SLOT_NAMES[5]).toBe("foxtrot");
    expect(SLOT_NAMES[6]).toBe("golf");
    expect(SLOT_NAMES[12]).toBe("mike");
    expect(SLOT_NAMES[13]).toBe("november");
    expect(SLOT_NAMES[25]).toBe("zulu");
    const distinctNames = new Set(SLOT_NAMES);
    expect(distinctNames.size).toBe(26);
  });

  it("SCHEMA_VERSION is 1.0.0 and DEFAULT_RESUME_MAX_AGE_HOURS is 24", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(DEFAULT_RESUME_MAX_AGE_HOURS).toBe(24);
  });
});

// ─── recordSessionStart ─────────────────────────────────────────────────

describe("recordSessionStart writes a session-start event with every field", () => {
  it("populates every field from the input and the file contains the parsed event", () => {
    const result = engine.recordSessionStart({
      slot: "foxtrot",
      sessionId: "sid-1",
      chatId: "claude-abc",
      terminalWindowId: "tw-wt-xxx",
      branch: "slot/foxtrot",
      topic: "foxtrot-work",
      directive: "ship U-SR01",
      transcriptPath: "C:/path/to/sid-1.jsonl",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.crashInferred).toBe(false);

    // Read raw file content to prove the event was actually persisted.
    const raw = readFileSync(join(tmpBase, "foxtrot.jsonl"), "utf-8");
    const parsed = JSON.parse(raw.trim()) as SessionStartEvent;
    expect(parsed.eventType).toBe("session-start");
    expect(parsed.sessionId).toBe("sid-1");
    expect(parsed.chatId).toBe("claude-abc");
    expect(parsed.host).toBe(hostname());
    expect(parsed.terminalWindowId).toBe("tw-wt-xxx");
    expect(parsed.branch).toBe("slot/foxtrot");
    expect(parsed.topic).toBe("foxtrot-work");
    expect(parsed.directive).toBe("ship U-SR01");
    expect(parsed.transcriptPath).toBe("C:/path/to/sid-1.jsonl");
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.ts.length).toBeGreaterThan(20);
  });

  it("explicitly stamps optional fields with null when omitted", () => {
    engine.recordSessionStart({
      slot: "alpha",
      sessionId: "sid-defaults",
      chatId: "c-x",
    });
    const raw = readFileSync(join(tmpBase, "alpha.jsonl"), "utf-8");
    const parsed = JSON.parse(raw.trim()) as SessionStartEvent;
    // Use JSON shape — null vs missing matters for the consumer (system-viz).
    expect(parsed.terminalWindowId).toBe(null);
    expect(parsed.branch).toBe(null);
    expect(parsed.topic).toBe(null);
    expect(parsed.directive).toBe(null);
    expect(parsed.transcriptPath).toBe(null);
    expect(parsed.host).toBe(hostname());
  });

  it("rejects unknown slot with the exact 'unknown slot:' error", () => {
    const result = engine.recordSessionStart({
      // @ts-expect-error — negative-input test: slot is not in NatoSlot union
      slot: "fictionalslot",
      sessionId: "sid-1",
      chatId: "claude-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("unknown slot: fictionalslot");
  });

  it("rejects empty sessionId with the exact 'sessionId required' error", () => {
    const result = engine.recordSessionStart({
      slot: "alpha",
      sessionId: "",
      chatId: "claude-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("sessionId required");
  });

  it("rejects empty chatId with the exact 'chatId required' error", () => {
    const result = engine.recordSessionStart({
      slot: "alpha",
      sessionId: "sid-1",
      chatId: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("chatId required");
  });
});

// ─── recordHeartbeat ────────────────────────────────────────────────────

describe("recordHeartbeat appends a heartbeat event", () => {
  it("preserves every loop-state field on disk", () => {
    engine.recordSessionStart({ slot: "golf", sessionId: "sid-2", chatId: "claude-xyz" });
    const result = engine.recordHeartbeat({
      slot: "golf",
      sessionId: "sid-2",
      directive: "ship U-SR01",
      currentGoal: "engine + tests",
      transcriptSizeBytes: 12345,
      transcriptMtimeMs: 1716660000000,
      loopIter: 1,
      loopTarget: 17,
    });
    expect(result.ok).toBe(true);

    const lines = readFileSync(join(tmpBase, "golf.jsonl"), "utf-8")
      .split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(2);
    const beat = JSON.parse(lines[1]) as HeartbeatEvent;
    expect(beat.eventType).toBe("heartbeat");
    expect(beat.directive).toBe("ship U-SR01");
    expect(beat.currentGoal).toBe("engine + tests");
    expect(beat.transcriptSizeBytes).toBe(12345);
    expect(beat.transcriptMtimeMs).toBe(1716660000000);
    expect(beat.loopIter).toBe(1);
    expect(beat.loopTarget).toBe(17);
    expect(beat.exitState).toBe("running");
  });

  it("rejects empty sessionId with explicit error", () => {
    const result = engine.recordHeartbeat({ slot: "alpha", sessionId: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("sessionId required");
  });
});

// ─── recordSessionEnd ───────────────────────────────────────────────────

describe("recordSessionEnd handles every valid exitState", () => {
  it("accepts exitState='clean'", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "s1", chatId: "c" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "s1", exitState: "clean" });
    const e = engine.readAll("alpha")[1] as SessionEndEvent;
    expect(e.exitState).toBe("clean");
  });

  it("accepts exitState='precompact'", () => {
    engine.recordSessionStart({ slot: "bravo", sessionId: "s2", chatId: "c" });
    engine.recordSessionEnd({ slot: "bravo", sessionId: "s2", exitState: "precompact" });
    const e = engine.readAll("bravo")[1] as SessionEndEvent;
    expect(e.exitState).toBe("precompact");
  });

  it("accepts exitState='stop'", () => {
    engine.recordSessionStart({ slot: "charlie", sessionId: "s3", chatId: "c" });
    engine.recordSessionEnd({ slot: "charlie", sessionId: "s3", exitState: "stop" });
    const e = engine.readAll("charlie")[1] as SessionEndEvent;
    expect(e.exitState).toBe("stop");
  });

  it("accepts exitState='crash-inferred'", () => {
    engine.recordSessionStart({ slot: "delta", sessionId: "s4", chatId: "c" });
    engine.recordSessionEnd({ slot: "delta", sessionId: "s4", exitState: "crash-inferred" });
    const e = engine.readAll("delta")[1] as SessionEndEvent;
    expect(e.exitState).toBe("crash-inferred");
  });

  it("truncates finalResume to exactly 500 characters when longer", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-x", chatId: "c" });
    engine.recordSessionEnd({
      slot: "alpha",
      sessionId: "sid-x",
      exitState: "stop",
      finalResume: "a".repeat(2000),
    });
    const end = engine.readAll("alpha")[1] as SessionEndEvent;
    expect(end.finalResume).toBe("a".repeat(500));
  });

  it("preserves a short finalResume byte-for-byte", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordSessionEnd({
      slot: "alpha",
      sessionId: "sid",
      exitState: "clean",
      finalResume: "short message",
    });
    const end = engine.readAll("alpha")[1] as SessionEndEvent;
    expect(end.finalResume).toBe("short message");
  });

  it("rejects invalid exitState with the exact error message", () => {
    const result = engine.recordSessionEnd({
      slot: "alpha",
      sessionId: "sid-1",
      // @ts-expect-error — negative-input test: invalid exitState
      exitState: "wat",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("invalid exitState: wat");
  });
});

// ─── Crash-inferred invariant ───────────────────────────────────────────

describe("crash-inferred invariant — the central design", () => {
  it("session-start after a clean session-end does NOT synthesize a crash-inferred close", () => {
    engine.recordSessionStart({ slot: "echo", sessionId: "sid-A", chatId: "claude-A" });
    engine.recordSessionEnd({ slot: "echo", sessionId: "sid-A", exitState: "clean" });
    const result = engine.recordSessionStart({ slot: "echo", sessionId: "sid-B", chatId: "claude-B" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.crashInferred).toBe(false);
    const entries = engine.readAll("echo");
    expect(entries.length).toBe(3);
    expect(entries[0].eventType).toBe("session-start");
    expect(entries[1].eventType).toBe("session-end");
    expect(entries[2].eventType).toBe("session-start");
  });

  it("session-start after a heartbeat tail synthesizes a crash-inferred close for the prior session", () => {
    engine.recordSessionStart({ slot: "kilo", sessionId: "sid-A", chatId: "claude-A" });
    engine.recordHeartbeat({
      slot: "kilo",
      sessionId: "sid-A",
      directive: "Building U-X",
      loopIter: 3,
      loopTarget: 10,
    });
    const result = engine.recordSessionStart({ slot: "kilo", sessionId: "sid-B", chatId: "claude-B" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.crashInferred).toBe(true);

    const entries = engine.readAll("kilo");
    expect(entries.length).toBe(4);
    expect(entries[2].eventType).toBe("session-end");
    const closed = entries[2] as SessionEndEvent;
    expect(closed.exitState).toBe("crash-inferred");
    expect(closed.sessionId).toBe("sid-A");
    expect(closed.directive).toBe("Building U-X");
    expect(closed.loopIter).toBe(3);
    expect(closed.loopTarget).toBe(10);
  });

  it("session-start after a bare session-start tail synthesizes a crash-inferred close", () => {
    engine.recordSessionStart({ slot: "lima", sessionId: "sid-A", chatId: "claude-A" });
    const result = engine.recordSessionStart({ slot: "lima", sessionId: "sid-B", chatId: "claude-B" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.crashInferred).toBe(true);
    const entries = engine.readAll("lima");
    expect(entries.length).toBe(3);
    expect(entries[1].eventType).toBe("session-end");
    const closed = entries[1] as SessionEndEvent;
    expect(closed.exitState).toBe("crash-inferred");
    expect(closed.sessionId).toBe("sid-A");
  });

  it("duplicate session-start with SAME sessionId is harmless — no crash-inferred", () => {
    engine.recordSessionStart({ slot: "delta", sessionId: "sid-X", chatId: "claude-X" });
    const result = engine.recordSessionStart({ slot: "delta", sessionId: "sid-X", chatId: "claude-X" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.crashInferred).toBe(false);
    const entries = engine.readAll("delta");
    expect(entries.length).toBe(2);
    expect(entries[0].eventType).toBe("session-start");
    expect(entries[1].eventType).toBe("session-start");
  });

  it("crash-inferred carries forward transcriptSizeBytes from the prior heartbeat", () => {
    engine.recordSessionStart({ slot: "mike", sessionId: "sid-A", chatId: "claude-A" });
    engine.recordHeartbeat({
      slot: "mike",
      sessionId: "sid-A",
      directive: "shipping QUOTING-PIPELINE",
      loopIter: 7,
      loopTarget: 10,
      transcriptSizeBytes: 1234567,
    });
    engine.recordSessionStart({ slot: "mike", sessionId: "sid-B", chatId: "claude-B" });
    const entries = engine.readAll("mike");
    const crashEvent = entries[2] as SessionEndEvent;
    expect(crashEvent.exitState).toBe("crash-inferred");
    expect(crashEvent.directive).toBe("shipping QUOTING-PIPELINE");
    expect(crashEvent.loopIter).toBe(7);
    expect(crashEvent.loopTarget).toBe(10);
    expect(crashEvent.transcriptSizeBytes).toBe(1234567);
  });
});

// ─── isResumeEligible — 7-condition matrix ──────────────────────────────

describe("isResumeEligible — Condition 1: env override", () => {
  it("PRISM_SLOT_NO_RESUME=1 returns eligible=false with exact reason", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    process.env.PRISM_SLOT_NO_RESUME = "1";
    const r = engine.isResumeEligible("alpha");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("env-PRISM_SLOT_NO_RESUME-set");
  });
});

describe("isResumeEligible — Condition 2: caller fresh override", () => {
  it("opts.fresh=true returns eligible=false with caller-opts-fresh reason", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    const r = engine.isResumeEligible("alpha", { fresh: true });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("caller-opts-fresh");
  });
});

describe("isResumeEligible — Condition 3: empty sidecar", () => {
  it("a slot with no history returns eligible=false with no-history reason", () => {
    const r = engine.isResumeEligible("zulu");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("no-history");
    expect("sessionId" in r).toBe(false);
  });
});

describe("isResumeEligible — Condition 4: transcript file missing", () => {
  it("non-existent transcriptPath returns eligible=false with transcript-gcd reason and the sessionId", () => {
    engine.recordSessionStart({
      slot: "alpha",
      sessionId: "sid-tx",
      chatId: "c",
      transcriptPath: "/tmp/this/does/not/exist.jsonl",
    });
    const r = engine.isResumeEligible("alpha");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("transcript-gcd");
    expect(r.sessionId).toBe("sid-tx");
  });

  it("transcriptPath=null skips the transcript-existence check and returns eligible=true", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    const r = engine.isResumeEligible("alpha");
    expect(r.eligible).toBe(true);
    expect(r.sessionId).toBe("sid");
  });
});

describe("isResumeEligible — Condition 5: age", () => {
  it("age > default 24h returns eligible=false with too-old reason", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    const r = engine.isResumeEligible("alpha", {
      now: Date.now() + 25 * 60 * 60 * 1000,
      transcriptExistsCheck: () => true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("too-old");
    expect(r.ageHours).toBeGreaterThan(24);
    expect(r.ageHours).toBeLessThan(26);
  });

  it("custom maxAgeHours overrides the default — 1h cap blocks a 2h-old session", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    const r = engine.isResumeEligible("alpha", {
      now: Date.now() + 2 * 60 * 60 * 1000,
      maxAgeHours: 1,
      transcriptExistsCheck: () => true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("too-old");
    expect(r.ageHours).toBeGreaterThan(1);
    expect(r.ageHours).toBeLessThan(3);
  });
});

describe("isResumeEligible — Condition 6: corrupt tail", () => {
  it("an unparseable trailing line returns eligible=false with corrupt-tail reason", () => {
    engine.recordSessionStart({ slot: "bravo", sessionId: "sid", chatId: "c" });
    const file = join(tmpBase, "bravo.jsonl");
    appendFileSync(file, "this is not json\n");
    const r = engine.isResumeEligible("bravo", { transcriptExistsCheck: () => true });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("corrupt-tail");
  });
});

describe("isResumeEligible — Condition 7: eligible paths", () => {
  it("clean session-end returns eligible=true with cleanExit=true", () => {
    engine.recordSessionStart({ slot: "charlie", sessionId: "sid-clean", chatId: "c" });
    engine.recordSessionEnd({ slot: "charlie", sessionId: "sid-clean", exitState: "clean" });
    const r = engine.isResumeEligible("charlie", { transcriptExistsCheck: () => true });
    expect(r.eligible).toBe(true);
    expect(r.sessionId).toBe("sid-clean");
    expect(r.cleanExit).toBe(true);
    expect(r.reason).toBe("ok");
  });

  it("post-crash-inferred fresh session-start is eligible with cleanExit=false", () => {
    engine.recordSessionStart({ slot: "delta", sessionId: "sid-X", chatId: "c" });
    engine.recordHeartbeat({ slot: "delta", sessionId: "sid-X" });
    engine.recordSessionStart({ slot: "delta", sessionId: "sid-Y", chatId: "c2" });
    const r = engine.isResumeEligible("delta", { transcriptExistsCheck: () => true });
    expect(r.eligible).toBe(true);
    expect(r.sessionId).toBe("sid-Y");
    expect(r.cleanExit).toBe(false);
    expect(r.reason).toBe("ok");
  });
});

// ─── Prune retention ────────────────────────────────────────────────────

describe("pruneSlot retention", () => {
  it("after 12 writes with retention=5, file contains exactly the last 5 entries by sessionId", () => {
    const e = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 5 });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-1" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-2" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-3" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-4" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-5" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-6" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-7" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-8" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-9" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-10" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-11" });
    const entries = e.readAll("alpha");
    expect(entries.length).toBe(5);
    expect(entries[0].sessionId).toBe("sid-7");
    expect(entries[1].sessionId).toBe("sid-8");
    expect(entries[2].sessionId).toBe("sid-9");
    expect(entries[3].sessionId).toBe("sid-10");
    expect(entries[4].sessionId).toBe("sid-11");
  });

  it("pruneSlot returns the count of entries that were removed", () => {
    const e = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 100 });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-1" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-2" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-3" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-4" });
    const result = e.pruneSlot("alpha", 3);
    expect(result.pruned).toBe(2);
    expect(e.readAll("alpha").length).toBe(3);
  });

  it("pruneSlot is a no-op when entry count is already at or below the keep-last threshold", () => {
    const e = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 100 });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-1" });
    e.recordHeartbeat({ slot: "alpha", sessionId: "sid-2" });
    const result = e.pruneSlot("alpha", 100);
    expect(result.pruned).toBe(0);
    expect(e.readAll("alpha").length).toBe(3);
  });
});

// ─── Corrupt-tail tolerance in readAll ──────────────────────────────────

describe("readAll skips corrupt lines", () => {
  it("a garbage line between two valid events is filtered out", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-good", chatId: "c" });
    const file = join(tmpBase, "alpha.jsonl");
    appendFileSync(file, "not json garbage\n");
    appendFileSync(file, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      eventType: "heartbeat",
      ts: new Date().toISOString(),
      slot: "alpha",
      sessionId: "sid-good",
      exitState: "running",
      directive: null,
      currentGoal: null,
      transcriptSizeBytes: null,
      transcriptMtimeMs: null,
      loopIter: null,
      loopTarget: null,
    }) + "\n");

    const entries = engine.readAll("alpha");
    expect(entries.length).toBe(2);
    expect(entries[0].eventType).toBe("session-start");
    expect(entries[1].eventType).toBe("heartbeat");
  });

  it("readAll for an unknown slot name returns an empty array", () => {
    // @ts-expect-error — negative-input test
    expect(engine.readAll("imaginary")).toStrictEqual([]);
  });

  it("readAll filters entries whose slot field does not match the canonical name", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-A", chatId: "c" });
    const file = join(tmpBase, "alpha.jsonl");
    appendFileSync(file, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      eventType: "heartbeat",
      ts: new Date().toISOString(),
      slot: "not-a-slot",
      sessionId: "sid-B",
      exitState: "running",
    }) + "\n");
    const entries = engine.readAll("alpha");
    expect(entries.length).toBe(1);
    expect(entries[0].sessionId).toBe("sid-A");
  });
});

// ─── getAllSlotsState ───────────────────────────────────────────────────

describe("getAllSlotsState liveness classification", () => {
  it("returns 26 cards keyed by slot name", () => {
    const state = engine.getAllSlotsState();
    expect(Object.keys(state).length).toBe(26);
    expect(state.alpha.slot).toBe("alpha");
    expect(state.golf.slot).toBe("golf");
    expect(state.zulu.slot).toBe("zulu");
  });

  it("an empty sidecar produces status='idle' for alpha + zulu", () => {
    const state = engine.getAllSlotsState();
    expect(state.alpha.status).toBe("idle");
    expect(state.zulu.status).toBe("idle");
    expect(state.alpha.lastEventType).toBe(null);
    expect(state.zulu.lastEventType).toBe(null);
  });

  it("a fresh heartbeat produces status='alive' with the loop state captured", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({
      slot: "alpha",
      sessionId: "sid",
      directive: "d-1",
      currentGoal: "g-1",
      loopIter: 1,
      loopTarget: 5,
    });
    const state = engine.getAllSlotsState();
    expect(state.alpha.status).toBe("alive");
    expect(state.alpha.sessionId).toBe("sid");
    expect(state.alpha.chatId).toBe("c");
    expect(state.alpha.directive).toBe("d-1");
    expect(state.alpha.currentGoal).toBe("g-1");
    expect(state.alpha.loopIter).toBe(1);
    expect(state.alpha.loopTarget).toBe(5);
    expect(state.alpha.lastEventType).toBe("heartbeat");
    expect(state.alpha.lastExitState).toBe("running");
  });

  it("a 3-minute-old heartbeat is classified stale", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    const state = engine.getAllSlotsState(Date.now() + 3 * 60 * 1000);
    expect(state.alpha.status).toBe("stale");
  });

  it("an 11-minute-old heartbeat is classified crashed", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    const state = engine.getAllSlotsState(Date.now() + 11 * 60 * 1000);
    expect(state.alpha.status).toBe("crashed");
  });

  it("a session-end tail is classified idle with the exitState surfaced", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid", exitState: "clean" });
    const state = engine.getAllSlotsState();
    expect(state.alpha.status).toBe("idle");
    expect(state.alpha.lastExitState).toBe("clean");
    expect(state.alpha.lastEventType).toBe("session-end");
  });
});

// ─── detectCrashedSlot ──────────────────────────────────────────────────

describe("detectCrashedSlot", () => {
  it("reports crashed=false on a clean session-end tail", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid", exitState: "clean" });
    const r = engine.detectCrashedSlot("alpha");
    expect(r.crashed).toBe(false);
    expect(r.lastEventType).toBe("session-end");
    expect(r.sessionId).toBe("sid");
  });

  it("reports crashed=true for a stale heartbeat tail (15 minutes old)", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    const r = engine.detectCrashedSlot("alpha", Date.now() + 15 * 60 * 1000);
    expect(r.crashed).toBe(true);
    expect(r.lastEventType).toBe("heartbeat");
  });

  it("reports crashed=true for a crash-inferred session-end tail", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid", exitState: "crash-inferred" });
    const r = engine.detectCrashedSlot("alpha");
    expect(r.crashed).toBe(true);
    expect(r.lastEventType).toBe("session-end");
  });

  it("an empty slot reports crashed=false with sentinel fields", () => {
    const r = engine.detectCrashedSlot("zulu");
    expect(r.crashed).toBe(false);
    expect(r.lastEventType).toBe(null);
    expect(r.sessionId).toBe(null);
    expect(r.ageMs).toBe(null);
  });
});

// ─── Singleton ──────────────────────────────────────────────────────────

describe("singleton accessor", () => {
  it("two calls return the same instance reference", () => {
    const a = slotSessionHistoryEngine();
    const b = slotSessionHistoryEngine();
    expect(a).toBe(b);
  });

  it("_resetSlotSessionHistoryEngineForTests forces the next call to return a new instance", () => {
    const a = slotSessionHistoryEngine();
    _resetSlotSessionHistoryEngineForTests();
    const b = slotSessionHistoryEngine();
    expect(a).not.toBe(b);
  });
});

// ─── getLatestSessionEnd ────────────────────────────────────────────────

describe("getLatestSessionEnd", () => {
  it("returns null when only session-start + heartbeat exist", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    const last = engine.getLatestSessionEnd("alpha");
    expect(last).toBe(null);
  });

  it("returns the most recent session-end and not an earlier one", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-1", chatId: "c1" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid-1", exitState: "clean" });
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-2", chatId: "c2" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid-2", exitState: "precompact" });
    const last = engine.getLatestSessionEnd("alpha");
    expect(last?.sessionId).toBe("sid-2");
    expect(last?.exitState).toBe("precompact");
  });
});

// ─── Multi-slot isolation ───────────────────────────────────────────────

describe("multi-slot isolation", () => {
  it("writes to alpha and bravo do not commingle in either file", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid-A", chatId: "cA" });
    engine.recordSessionStart({ slot: "bravo", sessionId: "sid-B", chatId: "cB" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-A" });

    expect(engine.readAll("alpha").length).toBe(2);
    expect(engine.readAll("bravo").length).toBe(1);
    expect(engine.readAll("alpha")[0].sessionId).toBe("sid-A");
    expect(engine.readAll("bravo")[0].sessionId).toBe("sid-B");
  });

  it("getAllSlotsState shows alpha=alive while zulu=idle when each has different state", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    engine.recordSessionStart({ slot: "zulu", sessionId: "sid-z", chatId: "cz" });
    engine.recordSessionEnd({ slot: "zulu", sessionId: "sid-z", exitState: "clean" });

    const state = engine.getAllSlotsState();
    expect(state.alpha.status).toBe("alive");
    expect(state.zulu.status).toBe("idle");
    expect(state.bravo.status).toBe("idle");
    expect(state.alpha.sessionId).toBe("sid");
    expect(state.zulu.sessionId).toBe("sid-z");
  });
});

// ─── Schema-version stamping ────────────────────────────────────────────

describe("schema versioning", () => {
  it("session-start, heartbeat, and session-end all stamp schemaVersion=1.0.0", () => {
    engine.recordSessionStart({ slot: "alpha", sessionId: "sid", chatId: "c" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid" });
    engine.recordSessionEnd({ slot: "alpha", sessionId: "sid", exitState: "clean" });
    const entries = engine.readAll("alpha");
    expect(entries[0].schemaVersion).toBe("1.0.0");
    expect(entries[1].schemaVersion).toBe("1.0.0");
    expect(entries[2].schemaVersion).toBe("1.0.0");
  });
});

// ─── getHistoryForSlot ──────────────────────────────────────────────────

describe("getHistoryForSlot", () => {
  it("returns the latest N entries when count >= N", () => {
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-1" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-2" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-3" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-4" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-5" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-6" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-7" });
    const hist = engine.getHistoryForSlot("alpha", 3);
    expect(hist.length).toBe(3);
    expect(hist[0].sessionId).toBe("sid-5");
    expect(hist[1].sessionId).toBe("sid-6");
    expect(hist[2].sessionId).toBe("sid-7");
  });

  it("returns all entries when N exceeds the count", () => {
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-1" });
    const hist = engine.getHistoryForSlot("alpha", 10);
    expect(hist.length).toBe(2);
    expect(hist[0].sessionId).toBe("sid-0");
    expect(hist[1].sessionId).toBe("sid-1");
  });

  it("limit=0 returns an empty array", () => {
    engine.recordHeartbeat({ slot: "alpha", sessionId: "sid-0" });
    expect(engine.getHistoryForSlot("alpha", 0)).toStrictEqual([]);
  });
});
