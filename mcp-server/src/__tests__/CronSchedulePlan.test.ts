/**
 * CronSchedulePlan — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U03.
 *
 * Pure-function tests for scripts/lib/cron-schedule-plan.mjs. Asserts:
 *   1. parseSchedule accepts the four documented grammars (daily/hourly/
 *      weekly/monthly) and rejects malformed input.
 *   2. validateTask checks id format, required fields, args type, schedule
 *      legality.
 *   3. planForBox partitions tasks into runnable/skipped/errors based on
 *      script presence (using injected fs adapter — no disk touch).
 *   4. summarisePlan aggregates counts + by-kind breakdown.
 *   5. DEFAULT_TASKS itself is internally consistent (every task validates,
 *      every schedule parses, no id collisions).
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/lib/cron-schedule-plan.mjs");

// Load the .mjs planner module inside beforeAll so vite's transform
// doesn't try to statically analyse the dynamic import target.
let DEFAULT_TASKS: any, validateTask: any, parseSchedule: any, planForBox: any, summarisePlan: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  DEFAULT_TASKS = mod.DEFAULT_TASKS;
  validateTask = mod.validateTask;
  parseSchedule = mod.parseSchedule;
  planForBox = mod.planForBox;
  summarisePlan = mod.summarisePlan;
});

describe("P11-U03 parseSchedule grammar", () => {
  it("'hourly' is valid with no extra tokens", () => {
    const r = parseSchedule("hourly");
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("hourly");
  });

  it("'hourly extra' is rejected", () => {
    const r = parseSchedule("hourly extra");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("no args");
  });

  it("'daily 02:30' is valid", () => {
    const r = parseSchedule("daily 02:30");
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("daily");
    expect(r.time).toBe("02:30");
  });

  it("'daily 24:00' rejected (HH must be 00-23)", () => {
    const r = parseSchedule("daily 24:00");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("HH:MM");
  });

  it("'daily 9:30' rejected (zero-pad required)", () => {
    const r = parseSchedule("daily 9:30");
    expect(r.valid).toBe(false);
  });

  it("'weekly mon 03:00' is valid; lowercases dow", () => {
    const r = parseSchedule("weekly MON 03:00");
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("weekly");
    expect(r.dow).toBe("mon");
    expect(r.time).toBe("03:00");
  });

  it("'weekly funday 03:00' rejected (unknown dow)", () => {
    const r = parseSchedule("weekly funday 03:00");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("day-of-week");
  });

  it("'monthly 15 04:00' is valid", () => {
    const r = parseSchedule("monthly 15 04:00");
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("monthly");
    expect(r.dom).toBe(15);
  });

  it("'monthly 30 04:00' rejected (dom > 28 to dodge feb edge)", () => {
    const r = parseSchedule("monthly 30 04:00");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("1..28");
  });

  it("'monthly 0 04:00' rejected (dom < 1)", () => {
    const r = parseSchedule("monthly 0 04:00");
    expect(r.valid).toBe(false);
  });

  it("empty string rejected", () => {
    const r = parseSchedule("");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("non-empty");
  });

  it("non-string input rejected", () => {
    const r = parseSchedule(undefined as any);
    expect(r.valid).toBe(false);
  });

  it("unknown kind rejected", () => {
    const r = parseSchedule("yearly jan-01 00:00");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("unknown");
  });
});

describe("P11-U03 validateTask", () => {
  const valid = {
    id: "prism-test-task",
    schedule: "daily 02:00",
    script: "scripts/foo.mjs",
    purpose: "Smoke test",
    args: [],
  };

  it("accepts a fully-formed task", () => {
    expect(validateTask(valid)).toBeNull();
  });

  it("rejects task with missing id", () => {
    const r = validateTask({ ...valid, id: undefined as any });
    expect(r).not.toBeNull();
    expect(r).toContain("id");
  });

  it("rejects id with uppercase", () => {
    const r = validateTask({ ...valid, id: "PrismTask" });
    expect(r).not.toBeNull();
    expect(r).toContain("kebab-case");
  });

  it("rejects id starting with digit", () => {
    const r = validateTask({ ...valid, id: "1-task" });
    expect(r).not.toBeNull();
  });

  it("rejects task without script", () => {
    const r = validateTask({ ...valid, script: "" });
    expect(r).not.toBeNull();
    expect(r).toContain("script");
  });

  it("rejects task without purpose", () => {
    const r = validateTask({ ...valid, purpose: "" });
    expect(r).not.toBeNull();
    expect(r).toContain("purpose");
  });

  it("rejects task with non-array args", () => {
    const r = validateTask({ ...valid, args: "not-an-array" as any });
    expect(r).not.toBeNull();
    expect(r).toContain("args");
  });

  it("rejects task with malformed schedule", () => {
    const r = validateTask({ ...valid, schedule: "every other tuesday" });
    expect(r).not.toBeNull();
    expect(r).toContain("schedule invalid");
  });

  it("rejects null task", () => {
    expect(validateTask(null)).toContain("object");
  });
});

describe("P11-U03 planForBox", () => {
  // Use path.resolve for the fixture root so the test works on Windows
  // (where path.resolve("/repo", ...) prepends a drive letter) and POSIX.
  const REPO = path.resolve("/repo");

  function makeFsAdapter(existingPaths: string[]) {
    const norm = new Set(existingPaths.map((p) => p.replace(/\\/g, "/")));
    return {
      existsSync: (p: string) => norm.has(p.replace(/\\/g, "/")),
    };
  }

  function abs(rel: string): string {
    return path.resolve(REPO, rel).replace(/\\/g, "/");
  }

  const tasks = [
    { id: "task-a", schedule: "daily 02:00", script: "scripts/a.mjs", purpose: "A", args: [] },
    { id: "task-b", schedule: "hourly", script: "scripts/b.mjs", purpose: "B", args: [] },
    { id: "task-c", schedule: "daily 03:00", script: "scripts/c.mjs", purpose: "C", args: [] },
    { id: "BAD-id", schedule: "daily 04:00", script: "scripts/d.mjs", purpose: "D" },
  ];

  it("partitions runnable/skipped/errors correctly", () => {
    const adapter = makeFsAdapter([abs("scripts/a.mjs"), abs("scripts/c.mjs")]);
    const plan = planForBox(tasks, REPO, adapter);
    expect(plan.runnable.length).toBe(2);
    expect(plan.runnable.map((t: any) => t.id).sort()).toEqual(["task-a", "task-c"]);
    expect(plan.skipped.length).toBe(1);
    expect(plan.skipped[0].id).toBe("task-b");
    expect(plan.errors.length).toBe(1);
    // BAD-id task has uppercase characters in id — validateTask rejects it,
    // and planForBox preserves the original id in the error record.
    expect(plan.errors[0].id).toBe("BAD-id");
    expect(plan.errors[0].reason).toContain("kebab-case");
  });

  it("attaches absolute scriptAbs and parsedSchedule to runnable tasks", () => {
    const adapter = makeFsAdapter([abs("scripts/a.mjs")]);
    const plan = planForBox([tasks[0]], REPO, adapter);
    expect(plan.runnable.length).toBe(1);
    expect(plan.runnable[0].scriptAbs.replace(/\\/g, "/")).toBe(abs("scripts/a.mjs"));
    expect(plan.runnable[0].parsedSchedule.kind).toBe("daily");
    expect(plan.runnable[0].parsedSchedule.time).toBe("02:00");
  });

  it("returns all-skipped when no script is present", () => {
    const adapter = makeFsAdapter([]);
    const plan = planForBox([tasks[0], tasks[1]], REPO, adapter);
    expect(plan.runnable.length).toBe(0);
    expect(plan.skipped.length).toBe(2);
    expect(plan.skipped[0].reason).toContain("not present");
  });
});

describe("P11-U03 summarisePlan", () => {
  it("aggregates by kind, counts runnable/skipped/errors", () => {
    const plan = {
      runnable: [
        { id: "a", parsedSchedule: { kind: "daily" } },
        { id: "b", parsedSchedule: { kind: "daily" } },
        { id: "c", parsedSchedule: { kind: "hourly" } },
        { id: "d", parsedSchedule: { kind: "weekly" } },
      ],
      skipped: [{ id: "x" }, { id: "y" }],
      errors: [{ id: "z", reason: "err" }],
    };
    const s = summarisePlan(plan);
    expect(s.runnable).toBe(4);
    expect(s.skipped).toBe(2);
    expect(s.errors).toBe(1);
    expect(s.byKind).toEqual({ daily: 2, hourly: 1, weekly: 1 });
  });

  it("empty plan → zeros", () => {
    const s = summarisePlan({ runnable: [], skipped: [], errors: [] });
    expect(s.runnable).toBe(0);
    expect(s.skipped).toBe(0);
    expect(s.errors).toBe(0);
    expect(Object.keys(s.byKind).length).toBe(0);
  });
});

describe("P11-U03 DEFAULT_TASKS internal consistency", () => {
  it("DEFAULT_TASKS exports a non-empty array", () => {
    expect(Array.isArray(DEFAULT_TASKS)).toBe(true);
    expect(DEFAULT_TASKS.length).toBeGreaterThan(0);
  });

  it("every default task validates", () => {
    for (const t of DEFAULT_TASKS) {
      const err = validateTask(t);
      expect(err).toBeNull();
    }
  });

  it("every default schedule parses to valid kind", () => {
    for (const t of DEFAULT_TASKS) {
      const sched = parseSchedule(t.schedule);
      expect(sched.valid).toBe(true);
      expect(["daily", "hourly", "weekly", "monthly"]).toContain(sched.kind);
    }
  });

  it("no id collisions across DEFAULT_TASKS", () => {
    const ids = DEFAULT_TASKS.map((t: any) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default task has a kebab-case id starting with 'prism-'", () => {
    for (const t of DEFAULT_TASKS) {
      expect(t.id).toMatch(/^prism-[a-z0-9-]+$/);
    }
  });
});
