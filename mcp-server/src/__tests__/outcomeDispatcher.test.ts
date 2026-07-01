/**
 * outcomeDispatcher.test.ts
 *
 * Round-trip tests for every prism_outcome action group.
 * Strategy: mount the dispatcher on a minimal fake MCP server, invoke
 * each action through the registered handler, and assert the response
 * carries typed, non-stub data (real engine return shapes).
 *
 * All tests are hermetic — no network, no external process, no shared
 * mutable state across tests (each test resets bridge state where needed).
 *
 * Engine tests in src/__tests__/ per CLAUDE.md §feedback_engine_tests_in_tests_dir.
 */

import { describe, it, expect, afterEach } from "vitest";
import { registerOutcomeDispatcher } from "../tools/dispatchers/outcomeDispatcher.js";

// ─── Minimal fake MCP server ──────────────────────────────────────────────────

type ToolHandler = (params: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

interface FakeTool {
  name: string;
  description: string;
  handler: ToolHandler;
}

function makeFakeServer() {
  const tools: FakeTool[] = [];
  return {
    tool(name: string, description: string, _schema: unknown, handler: ToolHandler) {
      tools.push({ name, description, handler });
    },
    async invoke(action: string, params: Record<string, unknown> = {}) {
      const t = tools.find((x) => x.name === "prism_outcome");
      if (!t) throw new Error("prism_outcome not registered");
      const raw = await t.handler({ action, params });
      const text = raw.content[0]?.text ?? "{}";
      return JSON.parse(text) as Record<string, unknown>;
    },
    getToolNames(): string[] {
      return tools.map((t) => t.name);
    },
    getToolDescription(): string {
      return tools.find((t) => t.name === "prism_outcome")?.description ?? "";
    },
  };
}

// ─── Shared server instance ───────────────────────────────────────────────────

const SERVER = makeFakeServer();
registerOutcomeDispatcher(SERVER);

// ─── Registration sanity ──────────────────────────────────────────────────────

describe("prism_outcome registration", () => {
  it("registers exactly one tool named prism_outcome", () => {
    const names = SERVER.getToolNames();
    expect(names).toContain("prism_outcome");
    expect(names.filter((n) => n === "prism_outcome").length).toBe(1);
  });

  it("tool description is non-empty and mentions 'outcome'", () => {
    const desc = SERVER.getToolDescription();
    expect(desc.length).toBeGreaterThan(20);
    expect(desc.toLowerCase()).toContain("outcome");
  });

  it("rejects an unknown action with ok:false", async () => {
    const result = await SERVER.invoke("not_a_real_action");
    expect(result.ok).toBe(false);
    // The MCP framework z.enum guard returns invalid_params when wired properly;
    // in the hermetic fake server the switch default fires unknown_action instead.
    // Either value confirms rejection — the invariant is ok===false.
    expect(["invalid_params", "unknown_action"]).toContain(result.error);
  });
});

// ─── Capture Bus ──────────────────────────────────────────────────────────────

describe("capture_bus_record", () => {
  it("records a valid bus event and returns event_id + lineage_id strings", async () => {
    const result = await SERVER.invoke("capture_bus_record", {
      domain: "mill",
      kind: "cycle_complete",
      source: "prism_outcome_test",
      severity: "info",
      confidence: 0.9,
    });
    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.event_id).toBe("string");
    expect((result.event_id as string).length).toBeGreaterThan(0);
    expect(typeof result.lineage_id).toBe("string");
  });

  it("returns ok:false + error:invalid_params when required fields are missing", async () => {
    const result = await SERVER.invoke("capture_bus_record", {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_params");
  });
});

describe("capture_bus_query", () => {
  it("returns events array and truncated boolean", async () => {
    const result = await SERVER.invoke("capture_bus_query", {
      domain: "mill",
      limit: 5,
    });
    expect(Array.isArray(result.events)).toBe(true);
    expect(typeof result.truncated).toBe("boolean");
  });
});

describe("capture_bus_stats", () => {
  it("returns ok:true with domains record, retry_queue_size, root_dir", async () => {
    const result = await SERVER.invoke("capture_bus_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.retry_queue_size).toBe("number");
    expect(stats.retry_queue_size as number).toBeGreaterThanOrEqual(0);
    expect(typeof stats.domains).toBe("object");
    expect(typeof stats.root_dir).toBe("string");
    expect((stats.root_dir as string).length).toBeGreaterThan(0);
  });
});

describe("capture_bus_flush", () => {
  it("returns ok:true with flushed + remaining that sum >= 0", async () => {
    const result = await SERVER.invoke("capture_bus_flush");
    expect(result.ok).toBe(true);
    expect(typeof result.flushed).toBe("number");
    expect(typeof result.remaining).toBe("number");
    expect((result.flushed as number) + (result.remaining as number)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Per-program Outcome Tracking ─────────────────────────────────────────────

describe("outcome_log", () => {
  it("logs a valid outcome and returns seq=number, schemaVersion=1, programId matches", async () => {
    const result = await SERVER.invoke("outcome_log", {
      programId: "TEST-PROG-LOG-001",
      outcome: "good",
      machineId: "VM-1",
      metrics: { cycleTimeSec: 42.5 },
    });
    expect(typeof result.seq).toBe("number");
    expect(result.schemaVersion).toBe(1);
    expect(result.programId).toBe("TEST-PROG-LOG-001");
    expect(result.outcome).toBe("good");
  });

  it("rejects invalid outcome kind with ok:false + error:invalid_params", async () => {
    const result = await SERVER.invoke("outcome_log", {
      programId: "P1",
      outcome: "not_a_kind",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_params");
  });
});

describe("outcome_query", () => {
  it("returns ok:true and records array", async () => {
    const result = await SERVER.invoke("outcome_query", {
      programId: "TEST-PROG-LOG-001",
      limit: 10,
    });
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.records)).toBe(true);
  });
});

describe("outcome_for_program", () => {
  it("returns records in ascending seq order for a known program", async () => {
    const prog = "FOR-PROG-SEQ-TEST";
    await SERVER.invoke("outcome_log", { programId: prog, outcome: "good" });
    await SERVER.invoke("outcome_log", { programId: prog, outcome: "adjusted" });

    const result = await SERVER.invoke("outcome_for_program", { programId: prog });
    expect(result.ok).toBe(true);
    const records = result.records as Array<{ seq: number }>;
    expect(records.length).toBeGreaterThanOrEqual(2);
    // forProgram() sorts ascending by seq — algebraic invariant
    for (let i = 1; i < records.length; i++) {
      expect(records[i].seq).toBeGreaterThan(records[i - 1].seq);
    }
  });

  it("rejects missing programId with ok:false + error:invalid_params", async () => {
    const result = await SERVER.invoke("outcome_for_program", {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_params");
  });
});

describe("outcome_stats", () => {
  it("returns goodRate + scrapRate in [0,1] summing to <= 1", async () => {
    await SERVER.invoke("outcome_log", {
      programId: "STATS-TEST-PROG",
      outcome: "scrap",
    });
    const result = await SERVER.invoke("outcome_stats", {
      programId: "STATS-TEST-PROG",
    });
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.total).toBe("number");
    expect(stats.total as number).toBeGreaterThan(0);
    const goodRate = stats.goodRate as number;
    const scrapRate = stats.scrapRate as number;
    expect(goodRate).toBeGreaterThanOrEqual(0);
    expect(scrapRate).toBeGreaterThanOrEqual(0);
    // Algebraic invariant: goodRate + scrapRate <= 1.0
    expect(goodRate + scrapRate).toBeLessThanOrEqual(1 + 1e-10);
  });
});

// ─── Outcome Trace ────────────────────────────────────────────────────────────

describe("outcome_trace_record", () => {
  it("returns experience_id string + edges_created array + warnings array", async () => {
    // StateRefSchema: { feature_store?, inline?, context? }
    // ActionRecordSchema: { engine_name, baseline?, adapted?, ... }
    // RewardComponentSchema: { objective (enum), raw_value, sign_convention, weight? }
    const result = await SERVER.invoke("outcome_trace_record", {
      lineage_id: "lin-test-001",
      domain: "mill",
      prediction_id: "pred-001",
      outcome_event_id: "ev-001",
      state: { inline: { spindle_rpm: 5000, feed_mm_min: 800 } },
      action_record: { engine_name: "SpeedFeedOrchestratorEngine", adapted: { vc: 120, fz: 0.12 } },
      reward_components: [{ objective: "quality_ra", raw_value: 0.8, sign_convention: "maximize", weight: 1.0 }],
      terminal: true,
    });
    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.experience_id).toBe("string");
    expect(Array.isArray(result.edges_created)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("returns ok:false + error:invalid_params when required fields are absent", async () => {
    const result = await SERVER.invoke("outcome_trace_record", { lineage_id: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_params");
  });
});

// ─── Outcome Publish Adapter ──────────────────────────────────────────────────

describe("outcome_publish", () => {
  it("rejects missing bridge + process with ok:false", async () => {
    const result = await SERVER.invoke("outcome_publish", {
      request_summary: { foo: "bar" },
    });
    expect(result.ok).toBe(false);
    expect(["invalid_params", "invalid_input"]).toContain(result.error);
  });

  it("returns typed result object (never throws) for a plausible payload", async () => {
    const result = await SERVER.invoke("outcome_publish", {
      bridge: "mill_sf",
      process: "mill",
      request_summary: { operation: "roughing", material: "steel" },
    });
    expect(typeof result.ok).toBe("boolean");
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(typeof result.message).toBe("string");
    } else {
      expect(typeof result.id).toBe("string");
    }
  });
});

describe("outcome_adapter_stats", () => {
  it("returns ok:true with non-negative total_published + total_rejected", async () => {
    const result = await SERVER.invoke("outcome_adapter_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.total_published).toBe("number");
    expect(typeof stats.total_rejected).toBe("number");
    expect(stats.total_published as number).toBeGreaterThanOrEqual(0);
    expect(stats.total_rejected as number).toBeGreaterThanOrEqual(0);
  });
});

// ─── Replay Buffer Bridge ─────────────────────────────────────────────────────

describe("replay lifecycle", () => {
  afterEach(async () => {
    await SERVER.invoke("replay_unsubscribe");
  });

  it("subscribe → status:subscribed=true → unsubscribe → status:subscribed=false", async () => {
    const sub = await SERVER.invoke("replay_subscribe");
    expect(sub.ok).toBe(true);
    expect(sub.alreadySubscribed).toBe(false);

    const statusOn = await SERVER.invoke("replay_status");
    expect(statusOn.ok).toBe(true);
    expect(statusOn.subscribed).toBe(true);

    const unsub = await SERVER.invoke("replay_unsubscribe");
    expect(unsub.ok).toBe(true);
    expect(unsub.wasSubscribed).toBe(true);

    const statusOff = await SERVER.invoke("replay_status");
    expect(statusOff.ok).toBe(true);
    expect(statusOff.subscribed).toBe(false);
  });

  it("subscribe is idempotent: second call returns alreadySubscribed=true", async () => {
    await SERVER.invoke("replay_subscribe");
    const second = await SERVER.invoke("replay_subscribe");
    expect(second.ok).toBe(true);
    expect(second.alreadySubscribed).toBe(true);
  });
});

describe("replay_configure", () => {
  it("sets errorPolicy=failure_or_override and ringCapacity=500 and reflects them", async () => {
    const result = await SERVER.invoke("replay_configure", {
      errorPolicy: "failure_or_override",
      ringCapacity: 500,
    });
    expect(result.ok).toBe(true);
    const config = result.config as Record<string, unknown>;
    expect(config.errorPolicy).toBe("failure_or_override");
    expect(config.ringCapacity).toBe(500);
  });

  it("rejects invalid errorPolicy value with ok:false", async () => {
    const result = await SERVER.invoke("replay_configure", { errorPolicy: "everything" });
    expect(result.ok).toBe(false);
  });
});

describe("replay_stats", () => {
  it("returns subscribed boolean, non-negative event counters, and ring_buffer_size >= 0", async () => {
    const result = await SERVER.invoke("replay_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.subscribed).toBe("boolean");
    expect(stats.total_events_seen as number).toBeGreaterThanOrEqual(0);
    expect(stats.ring_buffer_size as number).toBeGreaterThanOrEqual(0);
    // ring_buffer_size <= total_added_to_ring (can't have more episodes than were added)
    expect(stats.ring_buffer_size as number).toBeLessThanOrEqual(
      (stats.total_added_to_ring as number) + 1,
    );
  });
});

describe("replay_sample_stratified", () => {
  it("returns ok:true with response object for n=0", async () => {
    const result = await SERVER.invoke("replay_sample_stratified", { n: 0 });
    expect(result.ok).toBe(true);
    expect(typeof result.response).toBe("object");
    expect(result.response).not.toBeNull();
  });
});

// ─── RL Bridge ────────────────────────────────────────────────────────────────

describe("rl_bridge lifecycle", () => {
  afterEach(async () => {
    await SERVER.invoke("rl_bridge_reset");
  });

  it("subscribe → status:subscribed=true → unsubscribe → status:subscribed=false", async () => {
    const sub = await SERVER.invoke("rl_bridge_subscribe");
    expect(sub.ok).toBe(true);

    const statusOn = await SERVER.invoke("rl_bridge_status");
    expect(statusOn.ok).toBe(true);
    expect(statusOn.subscribed).toBe(true);

    const unsub = await SERVER.invoke("rl_bridge_unsubscribe");
    expect(unsub.ok).toBe(true);
    expect(unsub.wasSubscribed).toBe(true);

    const statusOff = await SERVER.invoke("rl_bridge_status");
    expect(statusOff.ok).toBe(true);
    expect(statusOff.subscribed).toBe(false);
  });
});

describe("rl_bridge_constants", () => {
  it("ACTION_SPACE=25 (5 speed×5 feed tiers), bin edge arrays have 4 entries each", async () => {
    const result = await SERVER.invoke("rl_bridge_constants");
    expect(result.ok).toBe(true);
    const c = result.constants as Record<string, unknown>;
    // Algebraic invariant: ACTION_SPACE = (len(SPEED_BIN_EDGES)+1) * (len(FEED_BIN_EDGES)+1)
    const speedEdges = c.SPEED_BIN_EDGES as number[];
    const feedEdges = c.FEED_BIN_EDGES as number[];
    expect(speedEdges.length).toBe(4);
    expect(feedEdges.length).toBe(4);
    expect(c.ACTION_SPACE).toBe((speedEdges.length + 1) * (feedEdges.length + 1));
    expect(c.ACTION_SPACE).toBe(25);
  });
});

describe("rl_bridge_stats", () => {
  it("total_processed <= total_events_seen (algebraic invariant)", async () => {
    const result = await SERVER.invoke("rl_bridge_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.subscribed).toBe("boolean");
    expect(stats.total_processed as number).toBeLessThanOrEqual(
      stats.total_events_seen as number,
    );
    expect(typeof stats.failures).toBe("object");
  });
});

describe("rl_bridge_configure", () => {
  afterEach(async () => {
    await SERVER.invoke("rl_bridge_reset");
  });

  it("applyKindPrior=false is reflected in returned config", async () => {
    const result = await SERVER.invoke("rl_bridge_configure", { applyKindPrior: false });
    expect(result.ok).toBe(true);
    const config = result.config as Record<string, unknown>;
    expect(config.applyKindPrior).toBe(false);
  });
});

describe("rl_bridge_replay", () => {
  it("replayed + skipped === scanned (algebraic invariant)", async () => {
    const result = await SERVER.invoke("rl_bridge_replay", { limit: 10 });
    expect(result.ok).toBe(true);
    expect(typeof result.scanned).toBe("number");
    expect(typeof result.replayed).toBe("number");
    expect(typeof result.skipped).toBe("number");
    expect((result.replayed as number) + (result.skipped as number)).toBe(result.scanned);
  });

  it("rejects process='grinder' (not in enum) with ok:false", async () => {
    const result = await SERVER.invoke("rl_bridge_replay", { process: "grinder" });
    expect(result.ok).toBe(false);
  });
});

describe("rl_bridge_reset", () => {
  it("returns ok:true, reset:true and leaves bridge unsubscribed", async () => {
    await SERVER.invoke("rl_bridge_subscribe");
    const result = await SERVER.invoke("rl_bridge_reset");
    expect(result.ok).toBe(true);
    expect(result.reset).toBe(true);

    const status = await SERVER.invoke("rl_bridge_status");
    expect(status.subscribed).toBe(false);
  });
});

// ─── Drift + Calibration Bridge ───────────────────────────────────────────────

describe("drift lifecycle", () => {
  afterEach(async () => {
    await SERVER.invoke("drift_unsubscribe");
  });

  it("subscribe → status:subscribed=true; unsubscribe → wasSubscribed=true", async () => {
    await SERVER.invoke("drift_subscribe");
    const status = await SERVER.invoke("drift_status");
    expect(status.ok).toBe(true);
    expect(status.subscribed).toBe(true);

    const unsub = await SERVER.invoke("drift_unsubscribe");
    expect(unsub.ok).toBe(true);
    expect(unsub.wasSubscribed).toBe(true);
  });

  it("unsubscribe when not subscribed returns wasSubscribed=false", async () => {
    const result = await SERVER.invoke("drift_unsubscribe");
    expect(result.ok).toBe(true);
    expect(result.wasSubscribed).toBe(false);
  });
});

describe("drift_configure", () => {
  it("reflects minDriftConfidenceForRetrain=0.7 and cooldownMs=30000", async () => {
    const result = await SERVER.invoke("drift_configure", {
      minDriftConfidenceForRetrain: 0.7,
      cooldownMs: 30_000,
    });
    expect(result.ok).toBe(true);
    const config = result.config as Record<string, unknown>;
    expect(config.minDriftConfidenceForRetrain).toBe(0.7);
    expect(config.cooldownMs).toBe(30_000);
  });
});

describe("drift_stats", () => {
  it("returns typed counter fields with non-negative values", async () => {
    const result = await SERVER.invoke("drift_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.subscribed).toBe("boolean");
    expect(stats.total_events_seen as number).toBeGreaterThanOrEqual(0);
    expect(stats.total_drift_observes as number).toBeGreaterThanOrEqual(0);
    // drift_observes <= total_events_seen
    expect(stats.total_drift_observes as number).toBeLessThanOrEqual(
      (stats.total_events_seen as number) + 1,
    );
  });
});

// ─── Episodic Memory Bridge ───────────────────────────────────────────────────

describe("episodic lifecycle", () => {
  afterEach(async () => {
    await SERVER.invoke("episodic_unsubscribe");
  });

  it("subscribe → status:subscribed=true; unsubscribe → wasSubscribed=true", async () => {
    await SERVER.invoke("episodic_subscribe");
    const status = await SERVER.invoke("episodic_status");
    expect(status.ok).toBe(true);
    expect(status.subscribed).toBe(true);

    const unsub = await SERVER.invoke("episodic_unsubscribe");
    expect(unsub.ok).toBe(true);
    expect(unsub.wasSubscribed).toBe(true);
  });
});

describe("episodic_configure", () => {
  it("reflects defaultDecision=vetoed and maxFeatureCount=32", async () => {
    const result = await SERVER.invoke("episodic_configure", {
      defaultDecision: "vetoed",
      maxFeatureCount: 32,
    });
    expect(result.ok).toBe(true);
    const config = result.config as Record<string, unknown>;
    expect(config.defaultDecision).toBe("vetoed");
    expect(config.maxFeatureCount).toBe(32);
  });

  it("rejects invalid defaultDecision with ok:false", async () => {
    const result = await SERVER.invoke("episodic_configure", {
      defaultDecision: "unknown_decision",
    });
    expect(result.ok).toBe(false);
  });
});

describe("episodic_stats", () => {
  it("total_stored <= total_events_seen (algebraic invariant)", async () => {
    const result = await SERVER.invoke("episodic_stats");
    expect(result.ok).toBe(true);
    const stats = result.stats as Record<string, unknown>;
    expect(typeof stats.subscribed).toBe("boolean");
    expect(stats.total_events_seen as number).toBeGreaterThanOrEqual(0);
    expect(stats.total_stored as number).toBeGreaterThanOrEqual(0);
    expect(stats.total_stored as number).toBeLessThanOrEqual(
      stats.total_events_seen as number,
    );
  });
});
