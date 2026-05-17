/**
 * dispatcher.wedmProgressTracker.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WPT dispatcher wiring.
 *
 * Drives 6 READ-ONLY actions through real `prism_dev`. Mutating job-
 * lifecycle methods (startJob/beginStage/completeStage/failStage/
 * completeJob/configure/subscribe/subscribeAll) + calculateETA
 * (takes a full JobProgress nested input) DEFERRED for safety.
 *
 * Setup uses engine-direct startJob/completeStage for hermetic fixtures.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmProgressTrackerEngine } from "../engines/WEDMProgressTrackerEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];
let knownJobId: string;

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Set up a real job using engine-direct write methods (the wire only reads)
  knownJobId = wedmProgressTrackerEngine.generateJobId();
  wedmProgressTrackerEngine.startJob(knownJobId, 10);
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — Zod schemas", () => {
  it("no-param actions accept {}", () => {
    for (const action of ["wpt_generate_job_id", "wpt_historical_average", "wpt_active_jobs", "wpt_get_config"]) {
      expect(ACTION_DEV_SCHEMAS[action].safeParse({}).success).toBe(true);
    }
  });

  it("wpt_estimate_total_duration requires positive stages", () => {
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({ stages: 0 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({ stages: -5 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({ stages: 30 }).success).toBe(true);
  });

  it("wpt_estimate_total_duration rejects stages > 10000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({ stages: 10001 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_estimate_total_duration"].safeParse({ stages: 10000 }).success).toBe(true);
  });

  it("wpt_get_progress requires non-empty job_id", () => {
    expect(ACTION_DEV_SCHEMAS["wpt_get_progress"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_get_progress"].safeParse({ job_id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpt_get_progress"].safeParse({ job_id: "abc" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_generate_job_id", () => {
  it("returns a non-empty string", async () => {
    const r = await invokeHandler(devHandler, "wpt_generate_job_id", {});
    const id = (r as { job_id: string }).job_id;
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("VARIABILITY — two consecutive calls produce distinct ids", async () => {
    const a = await invokeHandler(devHandler, "wpt_generate_job_id", {});
    const b = await invokeHandler(devHandler, "wpt_generate_job_id", {});
    expect((a as { job_id: string }).job_id).not.toBe((b as { job_id: string }).job_id);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_historical_average", () => {
  it("returns a non-negative number", async () => {
    const r = await invokeHandler(devHandler, "wpt_historical_average", {});
    const avg = ((r as { historicalAverageMs?: number }).historicalAverageMs) ?? 0;
    expect(typeof avg).toBe("number");
    expect(avg).toBeGreaterThanOrEqual(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_estimate_total_duration", () => {
  it("stages=10 → positive estimate, echoes stages back", async () => {
    const r = await invokeHandler(devHandler, "wpt_estimate_total_duration", { stages: 10 });
    const data = r as { estimatedDurationMs?: number; stages?: number };
    expect((data.estimatedDurationMs as number | undefined) ?? 0).toBeGreaterThanOrEqual(0);
    expect(data.stages).toBe(10);
  });

  it("VARIABILITY — 3 different stage counts produce 3 valid estimates", async () => {
    const r10 = await invokeHandler(devHandler, "wpt_estimate_total_duration", { stages: 10 });
    const r30 = await invokeHandler(devHandler, "wpt_estimate_total_duration", { stages: 30 });
    const r100 = await invokeHandler(devHandler, "wpt_estimate_total_duration", { stages: 100 });
    expect((r10 as { estimatedDurationMs?: number }).estimatedDurationMs).toBeGreaterThanOrEqual(0);
    expect((r30 as { estimatedDurationMs?: number }).estimatedDurationMs).toBeGreaterThanOrEqual(0);
    expect((r100 as { estimatedDurationMs?: number }).estimatedDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("ROUTING PROOF — wire matches engine-direct estimateTotalDuration()", async () => {
    const r = await invokeHandler(devHandler, "wpt_estimate_total_duration", { stages: 30 });
    const wire = ((r as { estimatedDurationMs?: number }).estimatedDurationMs) ?? 0;
    const direct = wedmProgressTrackerEngine.estimateTotalDuration(30);
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_get_progress", () => {
  it("known job_id → found:true with progress object", async () => {
    const r = await invokeHandler(devHandler, "wpt_get_progress", { job_id: knownJobId });
    const data = r as { found?: boolean; progress?: { job_id?: string } };
    expect(data.found).toBe(true);
    expect(data.progress?.job_id).toBe(knownJobId);
  });

  it("unknown job_id → found:false (explicit discriminator survives slimResponse)", async () => {
    const r = await invokeHandler(devHandler, "wpt_get_progress", {
      job_id: "no-such-job-" + Date.now(),
    });
    const data = r as { found?: boolean };
    expect(data.found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_active_jobs", () => {
  it("returns jobs array with count parity", async () => {
    const r = await invokeHandler(devHandler, "wpt_active_jobs", {});
    const data = r as { jobs?: unknown[]; count?: number };
    expect(Array.isArray(data.jobs ?? [])).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe((data.jobs ?? []).length);
  });

  it("includes our seeded knownJobId (we started it in beforeAll)", async () => {
    const r = await invokeHandler(devHandler, "wpt_active_jobs", {});
    const jobs = ((r as { jobs?: Array<{ job_id?: string }> }).jobs) ?? [];
    const ids = jobs.map((j) => j.job_id);
    expect(ids.includes(knownJobId)).toBe(true);
  });

  it("ROUTING PROOF — wire count >= engine-direct count (monotone; other tests may add jobs)", async () => {
    const direct = wedmProgressTrackerEngine.getActiveJobs();
    const r = await invokeHandler(devHandler, "wpt_active_jobs", {});
    const wire = ((r as { count?: number }).count) ?? 0;
    expect(wire).toBeGreaterThanOrEqual(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — prism_dev :: wpt_get_config", () => {
  it("returns a config object", async () => {
    const r = await invokeHandler(devHandler, "wpt_get_config", {});
    const config = (r as { config?: unknown }).config;
    expect(typeof config).toBe("object");
    expect(config === null).toBe(false);
  });

  it("ROUTING PROOF — wire config byte-equals engine-direct getConfig()", async () => {
    const r = await invokeHandler(devHandler, "wpt_get_config", {});
    const wire = (r as { config: unknown }).config;
    const direct = wedmProgressTrackerEngine.getConfig();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPT — error envelope", () => {
  it("wpt_estimate_total_duration without stages → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpt_estimate_total_duration", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("wpt_get_progress without job_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpt_get_progress", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
