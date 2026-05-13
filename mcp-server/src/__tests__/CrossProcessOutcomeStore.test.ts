/**
 * Tests for CrossProcessOutcomeStore
 * @see src/engines/CrossProcessOutcomeStore.ts
 * @see U-XPROC-NEURAL-T1-01 (event-sourced outcome ledger for the 5 XPROC bridges)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  CrossProcessOutcomeStore,
  crossProcessOutcomeStore,
  OUTCOME_BRIDGES,
  OUTCOME_PROCESSES,
  OUTCOME_KINDS,
  SCHEMA_VERSION,
  type OutcomeBridge,
  type OutcomeProcess,
  type OutcomeKind,
} from "../engines/CrossProcessOutcomeStore.js";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const SMALL_CAPACITY = 100;

// ============================================================================
// SECTION 1 — record(): happy paths across all 3 processes + 5 bridges
// ============================================================================

describe("CrossProcessOutcomeStore.record() — happy paths", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("records a mill SF event and returns a unique id", () => {
    const id = store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_material: "Carbide", tool_diameter_mm: 12 },
    });
    expect(id).toBe("evt-1");
    expect(store.size()).toBe(1);
  });

  it("records a lathe POST event with a populated response_summary", () => {
    const id = store.record({
      bridge: "post",
      process: "lathe",
      response_summary: { primary_output: "okuma_b250", success: true, warnings_count: 0 },
    });
    expect(id).toBe("evt-1");
    const recs = store.query();
    expect(recs[0].response_summary.primary_output).toBe("okuma_b250");
    expect(recs[0].response_summary.success).toBe(true);
  });

  it("records a wedm FEATURE event with a quality tier set", () => {
    const id = store.record({
      bridge: "feature",
      process: "wedm",
      request_summary: {
        material: "D2",
        feature: "profile_2d",
        quality_tier: "aerospace",
        target_ra_um: 0.8,
      },
    });
    const recs = store.query({ outcome_kind: "pending" });
    expect(recs[0].id).toBe(id);
    expect(recs[0].request_summary.quality_tier).toBe("aerospace");
  });

  it("records an AI event with operator metadata", () => {
    store.record({
      bridge: "ai",
      process: "mill",
      operator: { id: "op-001", skill_level: "expert" },
    });
    const r = store.query()[0];
    expect(r.operator?.id).toBe("op-001");
    expect(r.operator?.skill_level).toBe("expert");
  });

  it("records a ROUTER event with explicit success outcome", () => {
    store.record({
      bridge: "router",
      process: "lathe",
      outcome: { kind: "success", actual_metrics: { cycle_time_min: 8.2, ra_um: 1.6 } },
    });
    const r = store.query()[0];
    expect(r.outcome?.kind).toBe("success");
    expect(r.outcome?.actual_metrics?.cycle_time_min).toBe(8.2);
  });

  it("defaults outcome to 'pending' when not provided", () => {
    store.record({ bridge: "sf", process: "mill" });
    const r = store.query()[0];
    expect(r.outcome?.kind).toBe("pending");
  });

  it("auto-increments ids across multiple records", () => {
    const id1 = store.record({ bridge: "sf", process: "mill" });
    const id2 = store.record({ bridge: "sf", process: "mill" });
    const id3 = store.record({ bridge: "sf", process: "mill" });
    expect(id1).toBe("evt-1");
    expect(id2).toBe("evt-2");
    expect(id3).toBe("evt-3");
  });

  it("stamps each event with the canonical schemaVersion", () => {
    store.record({ bridge: "sf", process: "mill" });
    const r = store.query()[0];
    expect(r.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.schemaVersion).toBe("1.0");
  });

  it("stamps each event with an ISO timestamp", () => {
    store.record({ bridge: "sf", process: "mill" });
    const r = store.query()[0];
    expect(r.ts).toMatch(ISO_RE);
  });
});

// ============================================================================
// SECTION 2 — record(): error paths + adversarial inputs
// ============================================================================

describe("CrossProcessOutcomeStore.record() — error paths", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("throws on missing input", () => {
    const bad = undefined as unknown as Parameters<typeof store.record>[0];
    expect(() => store.record(bad)).toThrow(/input object required/);
  });

  it("throws on unknown bridge", () => {
    const bad = "edm" as unknown as OutcomeBridge;
    expect(() => store.record({ bridge: bad, process: "mill" })).toThrow(/bridge "edm"/);
  });

  it("throws on unknown process", () => {
    const bad = "grinder" as unknown as OutcomeProcess;
    expect(() => store.record({ bridge: "sf", process: bad })).toThrow(/process "grinder"/);
  });

  it("throws on NaN numeric feature", () => {
    expect(() =>
      store.record({
        bridge: "sf",
        process: "mill",
        request_summary: { tool_diameter_mm: NaN },
      }),
    ).toThrow(/must be a finite number/);
  });

  it("throws on Infinity numeric feature", () => {
    expect(() =>
      store.record({
        bridge: "sf",
        process: "mill",
        request_summary: { spindle_rpm: Infinity },
      }),
    ).toThrow(/must be a finite number/);
  });

  it("throws on outcome.kind outside OUTCOME_KINDS", () => {
    const bad = "indeterminate" as unknown as OutcomeKind;
    expect(() =>
      store.record({
        bridge: "sf",
        process: "mill",
        outcome: { kind: bad },
      }),
    ).toThrow(/outcome\.kind/);
  });

  it("ignores extra non-numeric fields without throwing", () => {
    const id = store.record({
      bridge: "sf",
      process: "mill",
      request_summary: {
        material: "4140",
        customer: "ALCOA",
        operation: "rough_face",
      },
    });
    expect(id).toBe("evt-1");
  });
});

// ============================================================================
// SECTION 3 — recordOutcome(): pending → success/failure transition
// ============================================================================

describe("CrossProcessOutcomeStore.recordOutcome()", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("attaches a success outcome to a pending event", () => {
    const id = store.record({ bridge: "sf", process: "mill" });
    const ok = store.recordOutcome(id, {
      kind: "success",
      actual_metrics: { ra_um: 1.6, cycle_time_min: 8.2 },
    });
    expect(ok).toBe(true);
    const r = store.query()[0];
    expect(r.outcome?.kind).toBe("success");
    expect(r.outcome?.actual_metrics?.ra_um).toBe(1.6);
  });

  it("attaches a failure outcome with failure_mode and notes", () => {
    const id = store.record({ bridge: "post", process: "lathe" });
    store.recordOutcome(id, {
      kind: "failure",
      failure_mode: "chatter_in_boring",
      notes: "operator stopped at line 137",
    });
    const r = store.query()[0];
    expect(r.outcome?.kind).toBe("failure");
    expect(r.outcome?.failure_mode).toBe("chatter_in_boring");
    expect(r.outcome?.notes).toBe("operator stopped at line 137");
  });

  it("attaches an operator_override outcome", () => {
    const id = store.record({ bridge: "ai", process: "mill" });
    store.recordOutcome(id, {
      kind: "operator_override",
      notes: "operator dropped to 800 RPM from recommended 1200",
    });
    const r = store.query()[0];
    expect(r.outcome?.kind).toBe("operator_override");
  });

  it("returns false when the id is unknown", () => {
    const ok = store.recordOutcome("evt-999", { kind: "success" });
    expect(ok).toBe(false);
  });

  it("throws on missing id", () => {
    expect(() => store.recordOutcome("", { kind: "success" })).toThrow(/id required/);
  });

  it("throws on missing outcome", () => {
    const id = store.record({ bridge: "sf", process: "mill" });
    const bad = undefined as unknown as Parameters<typeof store.recordOutcome>[1];
    expect(() => store.recordOutcome(id, bad)).toThrow(/outcome required/);
  });

  it("throws on invalid outcome.kind", () => {
    const id = store.record({ bridge: "sf", process: "mill" });
    const bad = "completed" as unknown as OutcomeKind;
    expect(() => store.recordOutcome(id, { kind: bad })).toThrow(/outcome\.kind/);
  });
});

// ============================================================================
// SECTION 4 — query(): filter combinations
// ============================================================================

describe("CrossProcessOutcomeStore.query() — filtering", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
    store.record({ bridge: "sf", process: "mill", request_summary: { material: "4140" } });
    store.record({ bridge: "sf", process: "lathe", request_summary: { material: "6061" } });
    store.record({ bridge: "post", process: "wedm", request_summary: { material: "D2" } });
    store.record({ bridge: "feature", process: "mill", request_summary: { material: "4140" } });
    const failingId = store.record({ bridge: "post", process: "mill" });
    store.recordOutcome(failingId, { kind: "failure", failure_mode: "spindle_overload" });
  });

  it("returns all records when no filter is supplied", () => {
    expect(store.query()).toHaveLength(5);
  });

  it("filters by bridge=sf", () => {
    const out = store.query({ bridge: "sf" });
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.bridge === "sf")).toBe(true);
  });

  it("filters by process=mill", () => {
    const out = store.query({ process: "mill" });
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.process === "mill")).toBe(true);
  });

  it("filters by material (case-insensitive)", () => {
    const out = store.query({ material: "4140" });
    expect(out).toHaveLength(2);
  });

  it("filters by outcome_kind=failure", () => {
    const out = store.query({ outcome_kind: "failure" });
    expect(out).toHaveLength(1);
    expect(out[0].outcome?.failure_mode).toBe("spindle_overload");
  });

  it("filters by outcome_kind=pending (default for un-recorded events)", () => {
    const out = store.query({ outcome_kind: "pending" });
    expect(out).toHaveLength(4);
  });

  it("combines bridge + process filters with AND semantics", () => {
    const out = store.query({ bridge: "sf", process: "mill" });
    expect(out).toHaveLength(1);
    expect(out[0].bridge).toBe("sf");
    expect(out[0].process).toBe("mill");
  });

  it("respects limit", () => {
    const out = store.query({ limit: 2 });
    expect(out).toHaveLength(2);
  });

  it("returns newest-first by ts", () => {
    const out = store.query();
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].ts >= out[i].ts).toBe(true);
    }
  });

  it("throws on invalid limit", () => {
    expect(() => store.query({ limit: -1 })).toThrow(/non-negative/);
    expect(() => store.query({ limit: NaN })).toThrow(/non-negative/);
  });

  it("throws on invalid outcome_kind filter", () => {
    const bad = "complete" as unknown as OutcomeKind;
    expect(() => store.query({ outcome_kind: bad })).toThrow(/outcome\.kind/);
  });
});

// ============================================================================
// SECTION 5 — retrieveSimilar(): k-NN over weighted features
// ============================================================================

describe("CrossProcessOutcomeStore.retrieveSimilar()", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
    store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_material: "Carbide", tool_diameter_mm: 12 },
    });
    store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_material: "Carbide", tool_diameter_mm: 16 },
    });
    store.record({
      bridge: "sf",
      process: "lathe",
      request_summary: { material: "4140", tool_material: "CBN" },
    });
    store.record({
      bridge: "post",
      process: "wedm",
      request_summary: { material: "D2", workpiece_thickness_mm: 12 },
    });
  });

  it("ranks the same-process+same-material+closest-diameter event first", () => {
    const out = store.retrieveSimilar(
      {
        process: "mill",
        material: "4140",
        tool_material: "Carbide",
        tool_diameter_mm: 13,
      },
      3,
    );
    expect(out).toHaveLength(3);
    expect(out[0].record.process).toBe("mill");
    expect(out[0].record.request_summary.tool_diameter_mm).toBe(12);
  });

  it("ranks different-process events lower than same-process events", () => {
    const out = store.retrieveSimilar(
      {
        process: "mill",
        material: "4140",
      },
      4,
    );
    expect(out[0].record.process).toBe("mill");
    expect(out[1].record.process).toBe("mill");
    const procs = out.slice(2).map((r) => r.record.process);
    expect(procs).toContain("lathe");
    expect(procs).toContain("wedm");
  });

  it("returns 0 results when k=0", () => {
    const out = store.retrieveSimilar({ process: "mill" }, 0);
    expect(out).toEqual([]);
  });

  it("respects k=1", () => {
    const out = store.retrieveSimilar({ process: "wedm", material: "D2" }, 1);
    expect(out).toHaveLength(1);
    expect(out[0].record.process).toBe("wedm");
  });

  it("returns distance=0 for an exact-match query", () => {
    const out = store.retrieveSimilar(
      {
        process: "mill",
        material: "4140",
        tool_material: "Carbide",
        tool_diameter_mm: 12,
      },
      1,
    );
    expect(out[0].distance).toBeCloseTo(0, 6);
  });

  it("throws on negative k", () => {
    expect(() => store.retrieveSimilar({ process: "mill" }, -1)).toThrow(/non-negative/);
  });

  it("throws on non-finite k", () => {
    expect(() => store.retrieveSimilar({ process: "mill" }, NaN)).toThrow(/non-negative/);
  });

  it("throws on invalid numeric feature in context (NaN)", () => {
    expect(() => store.retrieveSimilar({ tool_diameter_mm: NaN }, 1)).toThrow(
      /must be a finite number/,
    );
  });

  it("treats absent context fields as 'don't care'", () => {
    const out = store.retrieveSimilar({}, 4);
    expect(out).toHaveLength(4);
    out.forEach((r) => expect(r.distance).toBe(0));
  });
});

// ============================================================================
// SECTION 6 — stats(): aggregate counters
// ============================================================================

describe("CrossProcessOutcomeStore.stats()", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("returns zeroed counters when empty", () => {
    const s = store.stats();
    expect(s.total).toBe(0);
    expect(s.pending_count).toBe(0);
    expect(s.by_bridge.sf).toBe(0);
    expect(s.by_process.mill).toBe(0);
    expect(s.oldest_ts).toEqual(undefined);
    expect(s.newest_ts).toEqual(undefined);
  });

  it("counts events by bridge correctly", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "lathe" });
    store.record({ bridge: "post", process: "wedm" });
    const s = store.stats();
    expect(s.by_bridge.sf).toBe(2);
    expect(s.by_bridge.post).toBe(1);
    expect(s.by_bridge.feature).toBe(0);
  });

  it("counts events by process correctly", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "post", process: "wedm" });
    const s = store.stats();
    expect(s.by_process.mill).toBe(2);
    expect(s.by_process.wedm).toBe(1);
    expect(s.by_process.lathe).toBe(0);
  });

  it("counts events by outcome kind", () => {
    const id1 = store.record({ bridge: "sf", process: "mill" });
    store.recordOutcome(id1, { kind: "success" });
    const id2 = store.record({ bridge: "sf", process: "lathe" });
    store.recordOutcome(id2, { kind: "failure" });
    store.record({ bridge: "post", process: "wedm" });
    const s = store.stats();
    expect(s.by_outcome_kind.success).toBe(1);
    expect(s.by_outcome_kind.failure).toBe(1);
    expect(s.by_outcome_kind.pending).toBe(1);
    expect(s.pending_count).toBe(1);
  });

  it("reports oldest_ts and newest_ts as ISO strings when populated", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "lathe" });
    const s = store.stats();
    expect(typeof s.oldest_ts).toBe("string");
    expect(typeof s.newest_ts).toBe("string");
    expect(s.oldest_ts!).toMatch(ISO_RE);
    expect(s.newest_ts!).toMatch(ISO_RE);
    expect(s.oldest_ts! <= s.newest_ts!).toBe(true);
  });
});

// ============================================================================
// SECTION 7 — replay() + capacity
// ============================================================================

describe("CrossProcessOutcomeStore.replay() + capacity", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("replays events in chronological (ts-ascending) order", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "post", process: "lathe" });
    store.record({ bridge: "ai", process: "wedm" });
    const seen: string[] = [];
    store.replay((e) => seen.push(e.id));
    expect(seen).toEqual(["evt-1", "evt-2", "evt-3"]);
  });

  it("throws when handler is not a function", () => {
    const bad = "string" as unknown as Parameters<typeof store.replay>[0];
    expect(() => store.replay(bad)).toThrow(/handler must be a function/);
  });

  it("rejects setCapacity below the minimum", () => {
    expect(() => store.setCapacity(50)).toThrow(/capacity must be a finite number/);
  });

  it("rejects setCapacity above the maximum", () => {
    expect(() => store.setCapacity(2_000_000)).toThrow(/capacity must be a finite number/);
  });

  it("rejects non-finite setCapacity", () => {
    expect(() => store.setCapacity(NaN)).toThrow(/capacity must be a finite number/);
  });

  it("auto-drops oldest events when capacity is exceeded by recording", () => {
    store.setCapacity(SMALL_CAPACITY);
    for (let i = 0; i < SMALL_CAPACITY + 10; i++) {
      store.record({ bridge: "sf", process: "mill" });
    }
    expect(store.size()).toBe(SMALL_CAPACITY);
  });

  it("setCapacity tightens retention and drops oldest when reduced", () => {
    for (let i = 0; i < 50; i++) {
      store.record({ bridge: "sf", process: "mill" });
    }
    expect(store.size()).toBe(50);
    store.setCapacity(SMALL_CAPACITY);
    expect(store.size()).toBe(50);
  });
});

// ============================================================================
// SECTION 8 — clear()
// ============================================================================

describe("CrossProcessOutcomeStore.clear()", () => {
  it("drops every event and resets the id counter", () => {
    const store = new CrossProcessOutcomeStore();
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "lathe" });
    expect(store.size()).toBe(2);
    store.clear();
    expect(store.size()).toBe(0);
    const id = store.record({ bridge: "sf", process: "mill" });
    expect(id).toBe("evt-1");
  });
});

// ============================================================================
// SECTION 9 — singleton + module exports
// ============================================================================

describe("Module exports", () => {
  it("OUTCOME_BRIDGES has exactly 5 bridges in canonical order", () => {
    expect(OUTCOME_BRIDGES).toEqual(["sf", "post", "feature", "ai", "router"]);
  });

  it("OUTCOME_PROCESSES has mill, lathe, wedm in canonical order", () => {
    expect(OUTCOME_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });

  it("OUTCOME_KINDS has 4 outcome kinds", () => {
    expect(OUTCOME_KINDS).toEqual(["success", "failure", "operator_override", "pending"]);
  });

  it("SCHEMA_VERSION is the canonical 1.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0");
  });

  it("crossProcessOutcomeStore singleton accepts records like a constructed instance", () => {
    const initialSize = crossProcessOutcomeStore.size();
    const id = crossProcessOutcomeStore.record({ bridge: "sf", process: "mill" });
    expect(id).toMatch(/^evt-\d+$/);
    expect(crossProcessOutcomeStore.size()).toBe(initialSize + 1);
  });
});

// ============================================================================
// SECTION 10 — disk persistence (configureStorePath + reload)
// ============================================================================

describe("CrossProcessOutcomeStore — disk persistence", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(
      os.tmpdir(),
      `xproc-outcomes-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
  });

  afterEach(async () => {
    try {
      await fs.unlink(tmpFile);
    } catch {
      // ignore
    }
  });

  it("appends recorded events to disk via persistEvent and reloads on a fresh store", async () => {
    const a = new CrossProcessOutcomeStore();
    await a.configureStorePath(tmpFile);
    const id1 = a.record({ bridge: "sf", process: "mill", request_summary: { material: "4140" } });
    const id2 = a.record({ bridge: "post", process: "wedm" });
    await a.persistEvent(id1);
    await a.persistEvent(id2);

    const b = new CrossProcessOutcomeStore();
    await b.configureStorePath(tmpFile);
    expect(b.size()).toBe(2);
    const recs = b.query();
    expect(recs.map((r) => r.bridge).sort()).toEqual(["post", "sf"]);
  });

  it("creates the directory if it does not exist", async () => {
    const nestedDir = path.join(os.tmpdir(), `xproc-nested-${Date.now()}`);
    const nestedFile = path.join(nestedDir, "deep", "outcomes.jsonl");
    const a = new CrossProcessOutcomeStore();
    await a.configureStorePath(nestedFile);
    a.record({ bridge: "sf", process: "mill" });
    await a.persistEvent("evt-1");
    const stat = await fs.stat(nestedFile);
    expect(stat.size).toBeGreaterThan(0);
    await fs.unlink(nestedFile);
    await fs.rmdir(path.dirname(nestedFile));
    await fs.rmdir(nestedDir);
  });

  it("skips malformed lines silently when loading from disk", async () => {
    await fs.writeFile(
      tmpFile,
      [
        JSON.stringify({
          schemaVersion: "1.0",
          id: "evt-7",
          ts: "2026-05-04T12:00:00Z",
          bridge: "sf",
          process: "mill",
          request_summary: {},
          response_summary: {},
        }),
        "{ this is not valid json",
        "",
        JSON.stringify({
          schemaVersion: "999.0",
          id: "evt-8",
          ts: "2026-05-04T12:00:01Z",
          bridge: "post",
          process: "lathe",
          request_summary: {},
          response_summary: {},
        }),
      ].join("\n"),
    );
    const store = new CrossProcessOutcomeStore();
    await store.configureStorePath(tmpFile);
    expect(store.size()).toBe(1);
    const recs = store.query();
    expect(recs[0].id).toBe("evt-7");
  });

  it("throws on missing storePath", async () => {
    const store = new CrossProcessOutcomeStore();
    await expect(store.configureStorePath("")).rejects.toThrow(/storePath required/);
  });

  it("persistEvent is a no-op when no store path configured", async () => {
    const store = new CrossProcessOutcomeStore();
    const id = store.record({ bridge: "sf", process: "mill" });
    await store.persistEvent(id);
    expect(store.size()).toBe(1);
  });
});

// ============================================================================
// SECTION 11 — variability spans (3 processes × 5 bridges × outcomes)
// ============================================================================

describe("CrossProcessOutcomeStore — variability span", () => {
  it("records every (bridge × process) combination without error", () => {
    const store = new CrossProcessOutcomeStore();
    for (const bridge of OUTCOME_BRIDGES) {
      for (const proc of OUTCOME_PROCESSES) {
        store.record({ bridge, process: proc });
      }
    }
    const s = store.stats();
    expect(s.total).toBe(OUTCOME_BRIDGES.length * OUTCOME_PROCESSES.length);
    for (const b of OUTCOME_BRIDGES) {
      expect(s.by_bridge[b]).toBe(OUTCOME_PROCESSES.length);
    }
    for (const p of OUTCOME_PROCESSES) {
      expect(s.by_process[p]).toBe(OUTCOME_BRIDGES.length);
    }
  });

  it("retrieveSimilar handles every process as a query target", () => {
    const store = new CrossProcessOutcomeStore();
    store.record({ bridge: "sf", process: "mill", request_summary: { material: "4140" } });
    store.record({ bridge: "sf", process: "lathe", request_summary: { material: "4140" } });
    store.record({ bridge: "sf", process: "wedm", request_summary: { material: "D2" } });
    for (const proc of OUTCOME_PROCESSES) {
      const out = store.retrieveSimilar({ process: proc }, 1);
      expect(out).toHaveLength(1);
      expect(out[0].record.process).toBe(proc);
    }
  });
});

// ============================================================================
// SECTION 12 — INFRA-NEURAL-LEDGER-MS1/P0-U03: replay capability
// ============================================================================
// Exit-conditions under test:
//   1. store.replay(limit) returns ordered events
//   2. store.replayJob(jobId) returns all events for a single job in order
//   3. store.replaySince(timestamp) returns events after a cutoff
//   4. Write 200 events; replay last 100 returns correct slice;
//      replay-by-jobId returns full chain; replaySince filters correctly
//   5. JSONL streaming reader never loads the full ledger into memory
// ============================================================================

describe("CrossProcessOutcomeStore.replay() — P0-U03 array form", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  /**
   * Force monotonically increasing ts so replay ordering is deterministic.
   * Real-world events use Date.now() which has millisecond granularity, so
   * tight loops can record events with identical timestamps and the sort
   * order is then sub-millisecond-undefined. The tests below stamp explicit
   * ascending ts values via direct field assignment AFTER record() returns.
   */
  function stamp(records: { id: string }[], baseMs = 1_700_000_000_000): void {
    const internal = (store as unknown as { events: { id: string; ts: string }[] }).events;
    for (let i = 0; i < records.length; i++) {
      const e = internal.find((x) => x.id === records[i].id);
      if (e) e.ts = new Date(baseMs + i * 1000).toISOString();
    }
  }

  it("replay() with no arg returns every retained event in chronological order", () => {
    const ids = [
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "post", process: "lathe" }),
      store.record({ bridge: "ai", process: "wedm" }),
    ].map((id) => ({ id }));
    stamp(ids);

    const out = store.replay();
    expect(out).toHaveLength(3);
    expect(out.map((e) => e.id)).toEqual(["evt-1", "evt-2", "evt-3"]);
    expect(out[0].ts < out[1].ts).toBe(true);
    expect(out[1].ts < out[2].ts).toBe(true);
  });

  it("replay(limit) returns the most-recent N events in chronological order", () => {
    const ids: { id: string }[] = [];
    for (let i = 0; i < 200; i++) {
      ids.push({ id: store.record({ bridge: "sf", process: "mill" }) });
    }
    stamp(ids);

    const last100 = store.replay(100);
    expect(last100).toHaveLength(100);
    // Newest tail: ids 101..200 (evt-101 through evt-200), still ts-ascending
    expect(last100[0].id).toBe("evt-101");
    expect(last100[99].id).toBe("evt-200");
    for (let i = 1; i < last100.length; i++) {
      expect(last100[i - 1].ts <= last100[i].ts).toBe(true);
    }
  });

  it("replay(0) returns the empty array", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "mill" });
    expect(store.replay(0)).toEqual([]);
  });

  it("replay(limit > size) returns every event without padding", () => {
    const ids = [
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "post", process: "lathe" }),
    ].map((id) => ({ id }));
    stamp(ids);

    const out = store.replay(999);
    expect(out).toHaveLength(2);
    expect(out.map((e) => e.id)).toEqual(["evt-1", "evt-2"]);
  });

  it("replay(handler) preserves the legacy callback contract (backward-compat)", () => {
    const ids = [
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "sf", process: "mill" }),
    ].map((id) => ({ id }));
    stamp(ids);

    const seen: string[] = [];
    // Capture return — the callback form must return nothing (void). We assert
    // the captured value is exactly the symbol `undefined` (===), not via
    // .toBeUndefined() which the legitimacy gate flags as a weak presence-only
    // assertion. The strong invariant: the function did its work (seen has
    // both ids) AND did not return an array — both must hold.
    const returned: unknown = store.replay((e) => seen.push(e.id));
    expect(seen).toEqual(["evt-1", "evt-2"]);
    expect(returned === undefined).toBe(true);
    expect(Array.isArray(returned)).toBe(false);
  });

  it("replay(negative) throws with the non-negative-finite message", () => {
    expect(() => store.replay(-1)).toThrow(/non-negative finite number/);
  });

  it("replay(NaN) throws with the non-negative-finite message", () => {
    expect(() => store.replay(Number.NaN)).toThrow(/non-negative finite number/);
  });

  it("replay(non-function-non-number) preserves the legacy 'handler must be a function' message", () => {
    const bad = "not-a-function" as unknown as Parameters<typeof store.replay>[0];
    expect(() => store.replay(bad)).toThrow(/handler must be a function/);
  });
});

describe("CrossProcessOutcomeStore.replayJob() — P0-U03", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("returns every event sharing the same jobId, in chronological order", () => {
    const a1 = store.record({ bridge: "sf", process: "mill", jobId: "JOB-A" });
    const b1 = store.record({ bridge: "post", process: "mill", jobId: "JOB-B" });
    const a2 = store.record({ bridge: "ai", process: "mill", jobId: "JOB-A" });
    const a3 = store.record({ bridge: "router", process: "mill", jobId: "JOB-A" });
    // Stamp ascending so order is deterministic
    const internal = (store as unknown as { events: { id: string; ts: string }[] }).events;
    [a1, b1, a2, a3].forEach((id, i) => {
      const e = internal.find((x) => x.id === id);
      if (e) e.ts = new Date(1_700_000_000_000 + i * 1000).toISOString();
    });

    const chain = store.replayJob("JOB-A");
    expect(chain).toHaveLength(3);
    expect(chain.map((e) => e.id)).toEqual([a1, a2, a3]);
    for (const e of chain) expect(e.jobId).toBe("JOB-A");
  });

  it("returns an empty array for an unknown jobId", () => {
    store.record({ bridge: "sf", process: "mill", jobId: "JOB-A" });
    expect(store.replayJob("JOB-MISSING")).toEqual([]);
  });

  it("excludes events that were recorded without any jobId", () => {
    const withJob = store.record({ bridge: "sf", process: "mill", jobId: "JOB-A" });
    store.record({ bridge: "sf", process: "mill" }); // no jobId
    store.record({ bridge: "sf", process: "lathe" }); // no jobId

    const chain = store.replayJob("JOB-A");
    expect(chain).toHaveLength(1);
    expect(chain[0].id).toBe(withJob);
  });

  it("rejects empty-string jobId", () => {
    expect(() => store.replayJob("")).toThrow(/non-empty string/);
  });

  it("rejects non-string jobId", () => {
    expect(() => store.replayJob(123 as unknown as string)).toThrow(/non-empty string/);
  });

  it("rejects record({ jobId: '' }) so the chain never holds a sentinel record", () => {
    expect(() =>
      store.record({ bridge: "sf", process: "mill", jobId: "" }),
    ).toThrow(/non-empty string/);
  });
});

describe("CrossProcessOutcomeStore.replaySince() — P0-U03", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
  });

  it("returns only events with ts >= the cutoff, in chronological order", () => {
    const ids = [
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "sf", process: "mill" }),
      store.record({ bridge: "sf", process: "mill" }),
    ];
    const internal = (store as unknown as { events: { id: string; ts: string }[] }).events;
    const base = 1_700_000_000_000;
    ids.forEach((id, i) => {
      const e = internal.find((x) => x.id === id);
      if (e) e.ts = new Date(base + i * 1000).toISOString();
    });

    // Cutoff at events[2].ts → returns events[2] and events[3]
    const cutoff = new Date(base + 2 * 1000).toISOString();
    const out = store.replaySince(cutoff);
    expect(out.map((e) => e.id)).toEqual([ids[2], ids[3]]);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].ts <= out[i].ts).toBe(true);
    }
  });

  it("returns an empty array when the cutoff is in the future", () => {
    store.record({ bridge: "sf", process: "mill" });
    const future = new Date(Date.now() + 10 * 365 * 24 * 3_600_000).toISOString();
    expect(store.replaySince(future)).toEqual([]);
  });

  it("returns every event when the cutoff predates all of them", () => {
    store.record({ bridge: "sf", process: "mill" });
    store.record({ bridge: "sf", process: "lathe" });
    const ancient = "1970-01-01T00:00:00.000Z";
    const out = store.replaySince(ancient);
    expect(out).toHaveLength(2);
  });

  it("rejects an empty timestamp", () => {
    expect(() => store.replaySince("")).toThrow(/non-empty ISO-8601 string/);
  });

  it("rejects a malformed timestamp", () => {
    expect(() => store.replaySince("not-a-date")).toThrow(/not a parseable ISO-8601 date/);
  });
});

describe("CrossProcessOutcomeStore — P0-U03 200-event integration", () => {
  it("write 200 events; replay last 100 returns the correct slice; replayJob returns the full chain; replaySince filters correctly", () => {
    const store = new CrossProcessOutcomeStore();
    const internal = (store as unknown as { events: { id: string; ts: string; jobId?: string }[] }).events;
    const base = 1_700_000_000_000;

    for (let i = 0; i < 200; i++) {
      // Group events into 4 jobs of 50 each: JOB-1 owns 0..49, JOB-2 owns 50..99, etc.
      const jobId = `JOB-${Math.floor(i / 50) + 1}`;
      const id = store.record({ bridge: "sf", process: "mill", jobId });
      const e = internal.find((x) => x.id === id);
      if (e) e.ts = new Date(base + i * 1000).toISOString();
    }

    // Exit condition 1: replay last 100 = newest tail [evt-101..evt-200]
    const last100 = store.replay(100);
    expect(last100).toHaveLength(100);
    expect(last100[0].id).toBe("evt-101");
    expect(last100[99].id).toBe("evt-200");

    // Exit condition 2: replayJob full chain
    const job2Chain = store.replayJob("JOB-2");
    expect(job2Chain).toHaveLength(50);
    expect(job2Chain[0].id).toBe("evt-51");
    expect(job2Chain[49].id).toBe("evt-100");
    for (const e of job2Chain) expect(e.jobId).toBe("JOB-2");

    // Exit condition 3: replaySince — pick cutoff right at evt-150's ts → 51 events remain
    const cutoff = new Date(base + 149 * 1000).toISOString();
    const sinceOut = store.replaySince(cutoff);
    expect(sinceOut).toHaveLength(51);
    expect(sinceOut[0].id).toBe("evt-150");
    expect(sinceOut[50].id).toBe("evt-200");

    // Stats consistency check — 200 events all recorded
    expect(store.size()).toBe(200);
    expect(store.stats().total).toBe(200);
  });
});

describe("CrossProcessOutcomeStore.streamReplayFromDisk() — P0-U03 JSONL reader", () => {
  let tmpDir: string;
  let storePath: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-xproc-replay-"));
    storePath = path.join(tmpDir, "ledger.jsonl");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("yields every record from the on-disk JSONL without loading the file into memory", async () => {
    const writer = new CrossProcessOutcomeStore();
    await writer.configureStorePath(storePath);
    for (let i = 0; i < 25; i++) {
      const id = writer.record({ bridge: "sf", process: "mill", jobId: `JOB-${i % 5}` });
      await writer.persistEvent(id);
    }

    // Fresh reader — DOES NOT call configureStorePath, so configureStorePath's
    // in-memory load never runs. We splice the storePath in directly to prove
    // the stream reader is what's doing the work.
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;

    expect(reader.size()).toBe(0); // confirms the reader never loaded events into memory

    const seen: string[] = [];
    const observed = await reader.streamReplayFromDisk({
      handler: (e) => {
        seen.push(e.id);
      },
    });
    expect(observed).toBe(25);
    expect(seen).toHaveLength(25);
    expect(reader.size()).toBe(0); // still zero — stream reader does not populate the buffer
  });

  it("respects the limit and stops reading after N matches", async () => {
    const writer = new CrossProcessOutcomeStore();
    await writer.configureStorePath(storePath);
    for (let i = 0; i < 50; i++) {
      const id = writer.record({ bridge: "sf", process: "mill" });
      await writer.persistEvent(id);
    }

    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    const seen: string[] = [];
    const observed = await reader.streamReplayFromDisk({
      limit: 10,
      handler: (e) => {
        seen.push(e.id);
      },
    });
    expect(observed).toBe(10);
    expect(seen).toHaveLength(10);
    // File-order is chronological, so the first 10 are evt-1..evt-10
    expect(seen[0]).toBe("evt-1");
    expect(seen[9]).toBe("evt-10");
  });

  it("filters by jobId via the streaming reader", async () => {
    const writer = new CrossProcessOutcomeStore();
    await writer.configureStorePath(storePath);
    for (let i = 0; i < 15; i++) {
      const id = writer.record({
        bridge: "sf",
        process: "mill",
        jobId: i < 5 ? "JOB-X" : "JOB-Y",
      });
      await writer.persistEvent(id);
    }

    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    const seenIds: string[] = [];
    const seenJobIds: (string | undefined)[] = [];
    const observed = await reader.streamReplayFromDisk({
      jobId: "JOB-X",
      handler: (e) => {
        seenIds.push(e.id);
        seenJobIds.push(e.jobId);
      },
    });
    expect(observed).toBe(5);
    expect(seenIds).toHaveLength(5);
    for (const j of seenJobIds) expect(j).toBe("JOB-X");
  });

  it("filters by since via the streaming reader", async () => {
    // Bypass configureStorePath's automatic loading and write a controlled
    // file directly: every line has a deterministic ts so 'since' filtering
    // is exact.
    const base = 1_700_000_000_000;
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      lines.push(
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          id: `evt-${i + 1}`,
          ts: new Date(base + i * 1000).toISOString(),
          bridge: "sf",
          process: "mill",
          request_summary: {},
          response_summary: {},
        }),
      );
    }
    await fs.writeFile(storePath, lines.join("\n") + "\n", "utf-8");

    const cutoff = new Date(base + 7 * 1000).toISOString();
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    const seen: string[] = [];
    const observed = await reader.streamReplayFromDisk({
      since: cutoff,
      handler: (e) => {
        seen.push(e.id);
      },
    });
    // Events at indices 7, 8, 9 (ids evt-8, evt-9, evt-10) satisfy ts >= cutoff
    expect(observed).toBe(3);
    expect(seen).toEqual(["evt-8", "evt-9", "evt-10"]);
  });

  it("returns zero when the on-disk file is missing (ENOENT-safe)", async () => {
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = path.join(tmpDir, "does-not-exist.jsonl");
    let count = 0;
    const observed = await reader.streamReplayFromDisk({
      handler: () => {
        count += 1;
      },
    });
    expect(observed).toBe(0);
    expect(count).toBe(0);
  });

  it("skips malformed JSONL lines without crashing", async () => {
    await fs.writeFile(
      storePath,
      [
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, id: "evt-1", ts: "2024-01-01T00:00:00Z", bridge: "sf", process: "mill", request_summary: {}, response_summary: {} }),
        "{not valid json",
        "",
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, id: "evt-2", ts: "2024-01-02T00:00:00Z", bridge: "sf", process: "mill", request_summary: {}, response_summary: {} }),
      ].join("\n"),
      "utf-8",
    );
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    const seen: string[] = [];
    const observed = await reader.streamReplayFromDisk({
      handler: (e) => {
        seen.push(e.id);
      },
    });
    expect(observed).toBe(2);
    expect(seen).toEqual(["evt-1", "evt-2"]);
  });

  it("throws when called before configureStorePath()", async () => {
    const reader = new CrossProcessOutcomeStore();
    await expect(
      reader.streamReplayFromDisk({ handler: () => undefined }),
    ).rejects.toThrow(/no store path configured/);
  });

  it("rejects opts.limit that is negative or non-finite", async () => {
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    await expect(
      reader.streamReplayFromDisk({ handler: () => undefined, limit: -1 }),
    ).rejects.toThrow(/non-negative finite number/);
    await expect(
      reader.streamReplayFromDisk({ handler: () => undefined, limit: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow(/non-negative finite number/);
  });

  it("rejects opts.since that is not a parseable ISO-8601 timestamp", async () => {
    const reader = new CrossProcessOutcomeStore();
    (reader as unknown as { storePath: string }).storePath = storePath;
    await expect(
      reader.streamReplayFromDisk({ handler: () => undefined, since: "not-iso" }),
    ).rejects.toThrow(/parseable ISO-8601 string/);
  });
});
