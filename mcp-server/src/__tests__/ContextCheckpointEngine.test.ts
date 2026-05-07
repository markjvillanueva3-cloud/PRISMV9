/**
 * Tests for ContextCheckpointEngine — AI-MAX-ROADMAP U-AIMAX08.
 *
 * Covers: edit counters, threshold detection at 15/25/35, snapshot
 * creation + size cap, recovery fidelity ≥ 95%, schema validation,
 * failure modes, adversarial inputs, dispatcher round-trip.
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  contextCheckpointEngine,
  CONTEXT_CHECKPOINT_SCHEMA_VERSION,
  DEFAULT_EDIT_THRESHOLDS,
  MAX_CHECKPOINT_BYTES,
  MAX_CHECKPOINTS_PER_SESSION,
  type CheckpointSnapshot,
  type FileInFlight,
} from "../engines/ContextCheckpointEngine.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

// ---------------------------------------------------------------
// Dispatcher harness
// ---------------------------------------------------------------
type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): Promise<Handler> {
  return new Promise((resolve) => {
    const fakeServer = {
      tool(_n: string, _d: string, _s: any, fn: Handler) {
        resolve(fn);
      },
    };
    registerContextDispatcher(fakeServer);
  });
}

async function call(h: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await h({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

function sampleCheckpointInput(sessionId: string, overrides: Record<string, any> = {}) {
  return {
    sessionId,
    summary: "Building ContextCheckpointEngine + dispatcher wiring",
    pendingTasks: ["Task #20: tests", "Task #21: commit"],
    filesInFlight: [
      {
        path: "src/engines/ContextCheckpointEngine.ts",
        role: "editing",
        status: "in_progress",
      },
    ] as FileInFlight[],
    recentDecisions: [
      "Chose in-memory store with size-cap + FIFO prune",
      "Fidelity = fraction of required fields populated",
    ],
    memoryAnchors: ["cwd=H:/prism", "branch=work/cad-complete-ms0"],
    handoffDirective: "Write tests for ContextCheckpointEngine covering thresholds + recovery",
    ...overrides,
  };
}

// ---------------------------------------------------------------
// Edit tracking + thresholds
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — edit tracking + thresholds", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("recordEdit increments counter from zero", () => {
    const s1 = contextCheckpointEngine.recordEdit("s1");
    const s2 = contextCheckpointEngine.recordEdit("s1");
    expect(s1.editCount).toBe(1);
    expect(s2.editCount).toBe(2);
  });

  it("shouldCheckpoint returns null before first threshold", () => {
    for (let i = 0; i < 14; i += 1) contextCheckpointEngine.recordEdit("s1");
    expect(contextCheckpointEngine.shouldCheckpoint("s1")).toBeNull();
  });

  it("shouldCheckpoint fires at 15 (first threshold)", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("s1");
    expect(contextCheckpointEngine.shouldCheckpoint("s1")).toBe(15);
  });

  it("shouldCheckpoint fires at 25 (second threshold) after checkpoint at 15", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("s1");
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    for (let i = 0; i < 10; i += 1) contextCheckpointEngine.recordEdit("s1");
    expect(contextCheckpointEngine.shouldCheckpoint("s1")).toBe(25);
  });

  it("shouldCheckpoint fires at 35 (third threshold)", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("s1");
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    for (let i = 0; i < 10; i += 1) contextCheckpointEngine.recordEdit("s1");
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    for (let i = 0; i < 10; i += 1) contextCheckpointEngine.recordEdit("s1");
    expect(contextCheckpointEngine.shouldCheckpoint("s1")).toBe(35);
  });

  it("thresholds do not re-fire at the same level", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("s1");
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    // Still at edit 15 — should NOT re-fire 15.
    expect(contextCheckpointEngine.shouldCheckpoint("s1")).toBeNull();
  });

  it("sessions are independent", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("A");
    expect(contextCheckpointEngine.shouldCheckpoint("A")).toBe(15);
    expect(contextCheckpointEngine.shouldCheckpoint("B")).toBeNull();
  });
});

// ---------------------------------------------------------------
// Checkpoint creation
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — createCheckpoint", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("produces schema-versioned snapshot with all fields", () => {
    contextCheckpointEngine.recordEdit("s1");
    const snap = contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    expect(snap.schemaVersion).toBe(CONTEXT_CHECKPOINT_SCHEMA_VERSION);
    expect(snap.sessionId).toBe("s1");
    expect(snap.editCount).toBe(1);
    expect(snap.summary.length).toBeGreaterThan(0);
    expect(snap.handoffDirective.length).toBeGreaterThan(0);
  });

  it("rejects missing sessionId", () => {
    expect(() =>
      contextCheckpointEngine.createCheckpoint({
        sessionId: "",
        summary: "x",
        handoffDirective: "y",
      }),
    ).toThrow(/sessionId/);
  });

  it("rejects non-string summary", () => {
    expect(() =>
      contextCheckpointEngine.createCheckpoint({
        sessionId: "s1",
        summary: 42 as any,
        handoffDirective: "y",
      }),
    ).toThrow(/summary/);
  });

  it("rejects non-string handoffDirective", () => {
    expect(() =>
      contextCheckpointEngine.createCheckpoint({
        sessionId: "s1",
        summary: "x",
        handoffDirective: null as any,
      }),
    ).toThrow(/handoffDirective/);
  });

  it("rejects snapshot larger than maxBytes (1 MB)", () => {
    const huge = "x".repeat(2_000_000);
    expect(() =>
      contextCheckpointEngine.createCheckpoint({
        sessionId: "s1",
        summary: huge,
        handoffDirective: "go",
      }),
    ).toThrow(/too large/);
  });

  it("prunes to MAX_CHECKPOINTS_PER_SESSION (10)", () => {
    for (let i = 0; i < 15; i += 1) {
      contextCheckpointEngine.recordEdit("s1");
      contextCheckpointEngine.createCheckpoint(
        sampleCheckpointInput("s1", { summary: `snapshot ${i}` }),
      );
    }
    const list = contextCheckpointEngine.listCheckpoints("s1");
    expect(list.length).toBe(MAX_CHECKPOINTS_PER_SESSION);
    // FIFO: oldest snapshots should be gone
    expect(list[0].summary).not.toMatch(/snapshot 0/);
    expect(list[list.length - 1].summary).toMatch(/snapshot 14/);
  });
});

// ---------------------------------------------------------------
// Recovery — the 95% fidelity gate
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — recoverState fidelity", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("full-content checkpoint recovers at fidelity 1.0 (passed=true)", () => {
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    const r = contextCheckpointEngine.recoverState("s1")!;
    expect(r.fidelity).toBeCloseTo(1, 6);
    expect(r.passed).toBe(true);
    expect(r.missingFields).toHaveLength(0);
  });

  it("meets ≥ 95% fidelity exit-criterion from U-AIMAX08", () => {
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    const r = contextCheckpointEngine.recoverState("s1")!;
    expect(r.fidelity).toBeGreaterThanOrEqual(0.95);
  });

  it("empty-arrays checkpoint fails richContent (fidelity < 1)", () => {
    contextCheckpointEngine.createCheckpoint({
      sessionId: "s2",
      summary: "bare",
      handoffDirective: "onward",
      pendingTasks: [],
      filesInFlight: [],
      recentDecisions: [],
      memoryAnchors: [],
    });
    const r = contextCheckpointEngine.recoverState("s2")!;
    expect(r.missingFields).toContain("richContent");
    expect(r.fidelity).toBeLessThan(1);
  });

  it("returns null when no checkpoint exists for session", () => {
    expect(contextCheckpointEngine.recoverState("never-seen")).toBeNull();
  });

  it("recovers latest checkpoint when multiple exist", () => {
    contextCheckpointEngine.createCheckpoint(
      sampleCheckpointInput("s1", { summary: "old" }),
    );
    contextCheckpointEngine.createCheckpoint(
      sampleCheckpointInput("s1", { summary: "new" }),
    );
    const r = contextCheckpointEngine.recoverState("s1")!;
    expect(r.snapshot.summary).toBe("new");
  });
});

// ---------------------------------------------------------------
// Serialization + schema validation
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — serialize / deserialize", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("serialize → deserialize round-trips exactly", () => {
    const snap = contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    const json = contextCheckpointEngine.serialize(snap);
    const back = contextCheckpointEngine.deserialize(json);
    expect(back).toEqual(snap);
  });

  it("deserialize rejects schemaVersion mismatch", () => {
    const bad = JSON.stringify({
      schemaVersion: 99,
      sessionId: "x",
      checkpointId: "y",
      editCount: 0,
      createdAt: "2026-04-20T00:00:00Z",
      summary: "x",
      pendingTasks: [],
      filesInFlight: [],
      recentDecisions: [],
      memoryAnchors: [],
      handoffDirective: "z",
    });
    expect(() => contextCheckpointEngine.deserialize(bad)).toThrow(/schemaVersion/);
  });

  it("deserialize rejects missing required field", () => {
    const bad = JSON.stringify({
      schemaVersion: CONTEXT_CHECKPOINT_SCHEMA_VERSION,
      sessionId: "x",
      // missing most fields
    });
    expect(() => contextCheckpointEngine.deserialize(bad)).toThrow(/missing/);
  });

  it("deserialize rejects invalid JSON", () => {
    expect(() => contextCheckpointEngine.deserialize("{not json")).toThrow(/invalid JSON/);
  });

  it("ingestExternal accepts valid snapshot", () => {
    const snap = contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("sender"));
    contextCheckpointEngine.reset();
    const ingested = contextCheckpointEngine.ingestExternal(snap);
    expect(ingested.checkpointId).toBe(snap.checkpointId);
    expect(contextCheckpointEngine.latestCheckpoint("sender")).toBeTruthy();
  });

  it("ingestExternal rejects schema mismatch", () => {
    const bad = { ...sampleCheckpointInput("x"), schemaVersion: 42 } as any;
    expect(() => contextCheckpointEngine.ingestExternal(bad)).toThrow(/schemaVersion/);
  });
});

// ---------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — setConfig", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("accepts custom ascending thresholds", () => {
    const cfg = contextCheckpointEngine.setConfig({ thresholds: [5, 10, 20] });
    expect(cfg.thresholds).toEqual([5, 10, 20]);
  });

  it("rejects empty thresholds", () => {
    expect(() => contextCheckpointEngine.setConfig({ thresholds: [] })).toThrow(/non-empty/);
  });

  it("rejects non-ascending thresholds", () => {
    expect(() =>
      contextCheckpointEngine.setConfig({ thresholds: [30, 20, 10] }),
    ).toThrow(/ascending/);
  });

  it("rejects non-integer threshold", () => {
    expect(() =>
      contextCheckpointEngine.setConfig({ thresholds: [5.5] }),
    ).toThrow(/positive integer/);
  });

  it("rejects maxBytes < 1024", () => {
    expect(() => contextCheckpointEngine.setConfig({ maxBytes: 500 })).toThrow(/maxBytes/);
  });

  it("rejects maxCheckpointsPerSession < 1", () => {
    expect(() =>
      contextCheckpointEngine.setConfig({ maxCheckpointsPerSession: 0 }),
    ).toThrow(/maxCheckpointsPerSession/);
  });

  it("defaults match public constants", () => {
    const cfg = contextCheckpointEngine.getConfig();
    expect(cfg.thresholds).toEqual([...DEFAULT_EDIT_THRESHOLDS]);
    expect(cfg.maxBytes).toBe(MAX_CHECKPOINT_BYTES);
    expect(cfg.maxCheckpointsPerSession).toBe(MAX_CHECKPOINTS_PER_SESSION);
  });
});

// ---------------------------------------------------------------
// Adversarial
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — adversarial", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("very long sessionId (1000 chars) still works", () => {
    const sid = "s".repeat(1000);
    const snap = contextCheckpointEngine.createCheckpoint(sampleCheckpointInput(sid));
    expect(snap.sessionId).toBe(sid);
  });

  it("recordEdit with empty sessionId throws", () => {
    expect(() => contextCheckpointEngine.recordEdit("")).toThrow(/sessionId/);
  });

  it("resetEdits clears counter but keeps checkpoints", () => {
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit("s1");
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("s1"));
    contextCheckpointEngine.resetEdits("s1");
    expect(contextCheckpointEngine.getEditState("s1")).toBeNull();
    expect(contextCheckpointEngine.latestCheckpoint("s1")).not.toBeNull();
  });

  it("totalCheckpoints aggregates across sessions", () => {
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("a"));
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("b"));
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput("c"));
    expect(contextCheckpointEngine.totalCheckpoints()).toBe(3);
    expect(contextCheckpointEngine.knownSessions().sort()).toEqual(["a", "b", "c"]);
  });

  it("createCheckpoint at exactly 1MB-minus-epsilon succeeds", () => {
    // Size the payload so the serialized form is just under the cap.
    // Leave headroom for schema keys + dates + sessionId.
    const big = "x".repeat(900_000);
    const snap = contextCheckpointEngine.createCheckpoint({
      sessionId: "s1",
      summary: big,
      handoffDirective: "ok",
    });
    expect(snap.summary.length).toBe(900_000);
  });
});

// ---------------------------------------------------------------
// Dispatcher round-trip
// ---------------------------------------------------------------
describe("contextDispatcher checkpoint_* (U-AIMAX08 wiring)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer();
  });

  beforeEach(() => contextCheckpointEngine.reset());

  it("checkpoint_record_edit returns incremented state", async () => {
    const r = await call(handler, "checkpoint_record_edit", { sessionId: "ds1" });
    expect(r.success).toBe(true);
    expect(r.data.editCount).toBe(1);
  });

  it("checkpoint_record_edit rejects missing sessionId", async () => {
    const r = await call(handler, "checkpoint_record_edit", {});
    expect(r.error).toMatch(/sessionId/);
  });

  it("checkpoint_should reports false before first threshold", async () => {
    for (let i = 0; i < 10; i += 1) {
      await call(handler, "checkpoint_record_edit", { sessionId: "ds2" });
    }
    const r = await call(handler, "checkpoint_should", { sessionId: "ds2" });
    expect(r.data.shouldCheckpoint).toBe(false);
    expect(r.data.threshold).toBeNull();
  });

  it("checkpoint_should reports true at 15 edits", async () => {
    for (let i = 0; i < 15; i += 1) {
      await call(handler, "checkpoint_record_edit", { sessionId: "ds3" });
    }
    const r = await call(handler, "checkpoint_should", { sessionId: "ds3" });
    expect(r.data.shouldCheckpoint).toBe(true);
    expect(r.data.threshold).toBe(15);
  });

  it("checkpoint_create round-trips snapshot", async () => {
    const r = await call(handler, "checkpoint_create", sampleCheckpointInput("ds4"));
    expect(r.success).toBe(true);
    expect(r.data.schemaVersion).toBe(CONTEXT_CHECKPOINT_SCHEMA_VERSION);
  });

  it("checkpoint_create rejects missing summary", async () => {
    const r = await call(handler, "checkpoint_create", {
      sessionId: "ds5",
      handoffDirective: "x",
    });
    expect(r.error).toMatch(/summary/);
  });

  it("checkpoint_create rejects oversized payload", async () => {
    const r = await call(handler, "checkpoint_create", {
      sessionId: "ds6",
      summary: "x".repeat(2_000_000),
      handoffDirective: "x",
    });
    expect(r.error).toMatch(/too large/);
  });

  it("checkpoint_latest returns null when nothing stored", async () => {
    const r = await call(handler, "checkpoint_latest", { sessionId: "never" });
    expect(r.data.found).toBe(false);
  });

  it("checkpoint_list returns all snapshots", async () => {
    await call(handler, "checkpoint_create", sampleCheckpointInput("ds7", { summary: "one" }));
    await call(handler, "checkpoint_create", sampleCheckpointInput("ds7", { summary: "two" }));
    const r = await call(handler, "checkpoint_list", { sessionId: "ds7" });
    expect(r.data.count).toBe(2);
  });

  it("checkpoint_recover reports fidelity + passed", async () => {
    await call(handler, "checkpoint_create", sampleCheckpointInput("ds8"));
    const r = await call(handler, "checkpoint_recover", { sessionId: "ds8" });
    expect(r.data.fidelity).toBeGreaterThanOrEqual(0.95);
    expect(r.data.passed).toBe(true);
  });

  it("checkpoint_ingest accepts valid snapshot", async () => {
    const created = await call(handler, "checkpoint_create", sampleCheckpointInput("source"));
    contextCheckpointEngine.reset();
    const r = await call(handler, "checkpoint_ingest", { snapshot: created.data });
    expect(r.success).toBe(true);
  });

  it("checkpoint_ingest rejects schema mismatch", async () => {
    const bad = { ...sampleCheckpointInput("x"), schemaVersion: 99 };
    const r = await call(handler, "checkpoint_ingest", { snapshot: bad });
    expect(r.error).toMatch(/schemaVersion/);
  });

  it("checkpoint_config get returns defaults", async () => {
    const r = await call(handler, "checkpoint_config", {});
    expect(r.data.config.thresholds).toEqual([...DEFAULT_EDIT_THRESHOLDS]);
  });

  it("checkpoint_config set updates thresholds", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [5, 10, 20] } });
    expect(r.data.config.thresholds).toEqual([5, 10, 20]);
    // restore
    contextCheckpointEngine.setConfig({ thresholds: [...DEFAULT_EDIT_THRESHOLDS] });
  });

  it("checkpoint_config rejects non-ascending thresholds", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [30, 20, 10] } });
    expect(r.error).toMatch(/ascending/);
  });
});

// ---------------------------------------------------------------
// End-to-end scenario: edit → threshold → checkpoint → recover
// ---------------------------------------------------------------
describe("ContextCheckpointEngine — end-to-end workflow", () => {
  beforeEach(() => contextCheckpointEngine.reset());

  it("full cycle: 15 edits → threshold → checkpoint → recover ≥ 95% fidelity", () => {
    const sid = "e2e1";
    // 15 edits
    for (let i = 0; i < 15; i += 1) contextCheckpointEngine.recordEdit(sid);
    const threshold = contextCheckpointEngine.shouldCheckpoint(sid);
    expect(threshold).toBe(15);

    // Create checkpoint
    contextCheckpointEngine.createCheckpoint(sampleCheckpointInput(sid));

    // Threshold should now be consumed
    expect(contextCheckpointEngine.shouldCheckpoint(sid)).toBeNull();

    // Simulate post-compact: reset edits, recover state
    contextCheckpointEngine.resetEdits(sid);
    const rec = contextCheckpointEngine.recoverState(sid)!;
    expect(rec.passed).toBe(true);
    expect(rec.fidelity).toBeGreaterThanOrEqual(0.95);
    expect(rec.snapshot.pendingTasks.length).toBeGreaterThan(0);
    expect(rec.snapshot.handoffDirective.length).toBeGreaterThan(0);
  });

  it("threshold sequence 15 → 25 → 35 fires exactly once each", () => {
    const sid = "e2e2";
    const fired: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      contextCheckpointEngine.recordEdit(sid);
      const t = contextCheckpointEngine.shouldCheckpoint(sid);
      if (t !== null) {
        fired.push(t);
        contextCheckpointEngine.createCheckpoint(
          sampleCheckpointInput(sid, { summary: `at edit ${i + 1}` }),
        );
      }
    }
    expect(fired).toEqual([15, 25, 35]);
  });
});
