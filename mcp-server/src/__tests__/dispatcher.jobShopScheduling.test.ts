/**
 * dispatcher.jobShopScheduling.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-JSS (JobShopSchedulingEngine).
 *
 * 4 pure-compute scheduling actions through real `prism_dev`:
 *   jss_single_machine, jss_johnson, jss_job_shop, jss_critical_path
 *
 * Engine-pair test pre-exists at batch3-engines.test.ts (and other suites).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { jobShopSchedulingEngine } from "../engines/JobShopSchedulingEngine.js";

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

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — Zod schemas", () => {
  it("jss_single_machine accepts empty jobs array (engine handles gracefully)", () => {
    expect(ACTION_DEV_SCHEMAS["jss_single_machine"].safeParse({ jobs: [] }).success).toBe(true);
  });

  it("jss_single_machine rejects bad rule enum", () => {
    expect(ACTION_DEV_SCHEMAS["jss_single_machine"].safeParse({
      jobs: [{ id: "x", processingTime: 5 }], rule: "INVALID",
    }).success).toBe(false);
  });

  it("jss_single_machine caps jobs at 1000 (DoS)", () => {
    const huge = new Array(1001).fill({ id: "x", processingTime: 5 });
    expect(ACTION_DEV_SCHEMAS["jss_single_machine"].safeParse({ jobs: huge }).success).toBe(false);
  });

  it("jss_johnson requires both machine times per job", () => {
    expect(ACTION_DEV_SCHEMAS["jss_johnson"].safeParse({
      jobs: [{ id: "x", machine1Time: 5 }],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["jss_johnson"].safeParse({
      jobs: [{ id: "x", machine1Time: 5, machine2Time: 3 }],
    }).success).toBe(true);
  });

  it("jss_job_shop requires ≥ 1 machine", () => {
    expect(ACTION_DEV_SCHEMAS["jss_job_shop"].safeParse({
      jobs: [], machines: [],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["jss_job_shop"].safeParse({
      jobs: [], machines: [{ id: "M1" }],
    }).success).toBe(true);
  });

  it("jss_critical_path requires ≥ 1 activity", () => {
    expect(ACTION_DEV_SCHEMAS["jss_critical_path"].safeParse({ activities: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["jss_critical_path"].safeParse({
      activities: [{ id: "A", duration: 5 }],
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — prism_dev :: jss_single_machine", () => {
  // SPT rule: shortest-processing-time first minimizes mean flow time.
  // 3 jobs (5, 2, 8) → SPT order should be [J2, J1, J3] (durations 2, 5, 8).
  // Makespan = sum = 15 regardless of rule. SPT minimizes flow time.
  const THREE_JOBS = [
    { id: "J1", processingTime: 5 },
    { id: "J2", processingTime: 2 },
    { id: "J3", processingTime: 8 },
  ];

  it("makespan equals sum of processing times (invariant across all rules)", async () => {
    for (const rule of ["FIFO", "SPT", "LPT", "EDD"]) {
      const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: THREE_JOBS, rule });
      expect(r.makespan).toBe(15); // 5+2+8
    }
  });

  it("SPT rule sequences shortest job first", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: THREE_JOBS, rule: "SPT" });
    const res = (r as { result: { schedule: Array<{ jobId: string }> } }).result;
    expect(res.schedule[0].jobId).toBe("J2"); // shortest (2)
    expect(res.schedule[2].jobId).toBe("J3"); // longest (8)
  });

  it("LPT rule sequences longest job first", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: THREE_JOBS, rule: "LPT" });
    const res = (r as { result: { schedule: Array<{ jobId: string }> } }).result;
    expect(res.schedule[0].jobId).toBe("J3"); // longest (8)
    expect(res.schedule[2].jobId).toBe("J2"); // shortest (2)
  });

  it("VARIABILITY — 4 dispatch rules all return valid schedules with 3 entries", async () => {
    for (const rule of ["FIFO", "SPT", "LPT", "EDD"]) {
      const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: THREE_JOBS, rule });
      expect(r.schedule_count).toBe(3);
      expect(r.makespan).toBe(15);
    }
  });

  it("empty jobs returns makespan=0, schedule_count=0", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: [], rule: "SPT" });
    expect(r.makespan).toBe(0);
    expect(r.schedule_count).toBe(0);
  });

  it("ROUTING PROOF — wire makespan equals engine-direct scheduleSingleMachine()", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", { jobs: THREE_JOBS, rule: "SPT" });
    const direct = jobShopSchedulingEngine.scheduleSingleMachine(THREE_JOBS, "SPT");
    expect(r.makespan).toBe(direct.makespan);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — prism_dev :: jss_johnson", () => {
  // Johnson's algorithm produces optimal makespan for 2-machine flow shop.
  // Classic textbook problem: 5 jobs.
  const JOHNSON_JOBS = [
    { id: "J1", machine1Time: 3, machine2Time: 5 },
    { id: "J2", machine1Time: 7, machine2Time: 2 },
    { id: "J3", machine1Time: 4, machine2Time: 6 },
    { id: "J4", machine1Time: 5, machine2Time: 4 },
    { id: "J5", machine1Time: 6, machine2Time: 3 },
  ];

  it("returns sequence + makespan for 5-job flow shop", async () => {
    const r = await invokeHandler(devHandler, "jss_johnson", { jobs: JOHNSON_JOBS });
    expect(r.sequence_length).toBe(5);
    expect((r.makespan as number)).toBeGreaterThan(0);
  });

  it("makespan ≥ max(sum M1, sum M2) — lower-bound invariant", async () => {
    const r = await invokeHandler(devHandler, "jss_johnson", { jobs: JOHNSON_JOBS });
    const sumM1 = JOHNSON_JOBS.reduce((s, j) => s + j.machine1Time, 0); // 25
    const sumM2 = JOHNSON_JOBS.reduce((s, j) => s + j.machine2Time, 0); // 20
    expect((r.makespan as number)).toBeGreaterThanOrEqual(Math.max(sumM1, sumM2));
  });

  it("ROUTING PROOF — wire sequence_length equals engine-direct johnsonsAlgorithm()", async () => {
    const r = await invokeHandler(devHandler, "jss_johnson", { jobs: JOHNSON_JOBS });
    const direct = jobShopSchedulingEngine.johnsonsAlgorithm(JOHNSON_JOBS);
    expect(r.sequence_length).toBe(direct.sequence.length);
    expect(r.makespan).toBe(direct.makespan);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — prism_dev :: jss_job_shop", () => {
  const JOB_SHOP_INPUT = {
    jobs: [
      { id: "J1", operations: [{ machine: "M1", processingTime: 3 }, { machine: "M2", processingTime: 2 }] },
      { id: "J2", operations: [{ machine: "M2", processingTime: 4 }, { machine: "M1", processingTime: 1 }] },
    ],
    machines: [{ id: "M1" }, { id: "M2" }],
    rule: "SPT" as const,
  };

  it("returns schedule + makespan + completion counts", async () => {
    const r = await invokeHandler(devHandler, "jss_job_shop", JOB_SHOP_INPUT);
    expect((r.total_operations as number)).toBe(4); // 2 jobs × 2 ops
    expect(r.is_complete).toBe(true);
    expect((r.makespan as number)).toBeGreaterThan(0);
    expect(r.completed_operations).toBe(4);
  });

  it("ROUTING PROOF — wire makespan equals engine-direct scheduleJobShop()", async () => {
    const r = await invokeHandler(devHandler, "jss_job_shop", JOB_SHOP_INPUT);
    const direct = jobShopSchedulingEngine.scheduleJobShop(JOB_SHOP_INPUT.jobs, JOB_SHOP_INPUT.machines, JOB_SHOP_INPUT.rule);
    expect(r.makespan).toBe(direct.makespan);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — prism_dev :: jss_critical_path", () => {
  // Classic CPM textbook example:
  //   A(3) → B(4) → D(2)
  //          C(5) → D
  // Critical path: A→C→D = 3+5+2 = 10
  const CPM_ACTIVITIES = [
    { id: "A", duration: 3 },
    { id: "B", duration: 4, predecessors: ["A"] },
    { id: "C", duration: 5, predecessors: ["A"] },
    { id: "D", duration: 2, predecessors: ["B", "C"] },
  ];

  it("returns success=true + projectDuration=10 + critical path A,C,D", async () => {
    const r = await invokeHandler(devHandler, "jss_critical_path", { activities: CPM_ACTIVITIES });
    expect(r.success).toBe(true);
    expect(r.project_duration).toBe(10);
    expect((r.critical_path_length as number)).toBeGreaterThanOrEqual(2);
    const res = (r as { result: { criticalPath?: string[] } }).result;
    expect(res.criticalPath).toContain("A");
    expect(res.criticalPath).toContain("C");
    expect(res.criticalPath).toContain("D");
  });

  it("ROUTING PROOF — wire projectDuration equals engine-direct criticalPathMethod()", async () => {
    const r = await invokeHandler(devHandler, "jss_critical_path", { activities: CPM_ACTIVITIES });
    const direct = jobShopSchedulingEngine.criticalPathMethod(CPM_ACTIVITIES);
    expect(r.project_duration).toBe(direct.projectDuration);
  });

  it("VARIABILITY — single-activity network returns projectDuration=duration", async () => {
    const r = await invokeHandler(devHandler, "jss_critical_path", {
      activities: [{ id: "ONLY", duration: 7 }],
    });
    expect(r.success).toBe(true);
    expect(r.project_duration).toBe(7);
  });

  it("VARIABILITY — parallel-only network (no deps) returns max duration", async () => {
    const r = await invokeHandler(devHandler, "jss_critical_path", {
      activities: [
        { id: "X", duration: 3 },
        { id: "Y", duration: 7 },
        { id: "Z", duration: 5 },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.project_duration).toBe(7); // max of parallel activities
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JSS — error envelope", () => {
  it("jss_single_machine with bad rule → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", {
      jobs: [{ id: "x", processingTime: 5 }], rule: "INVALID",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("jss_single_machine with negative processingTime → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "jss_single_machine", {
      jobs: [{ id: "x", processingTime: -5 }],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("jss_job_shop with empty machines → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "jss_job_shop", {
      jobs: [{ id: "J1", operations: [{ machine: "M1", processingTime: 5 }] }],
      machines: [],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("jss_critical_path with empty activities → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "jss_critical_path", { activities: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
