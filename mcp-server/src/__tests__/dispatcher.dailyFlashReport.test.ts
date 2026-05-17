/**
 * dispatcher.dailyFlashReport.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-DR (DailyFlashReportEngine).
 *
 * Drives 1 pure-read aggregator action through real `prism_dev`.
 * emailFlashReport DEFERRED — currently a console.log stub AND a
 * send-impersonation class (LLM-callable email-send is a spoof/spam
 * surface even when impl is real).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { dailyFlashReportEngine } from "../engines/DailyFlashReportEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-DR — Zod schemas", () => {
  it("dr_generate_flash_report requires date + requested_by + caps both at 32/256 chars", () => {
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({ date: "2026-05-17" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({
      date: "2026-05-17", requested_by: "operator-1",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({
      date: "x".repeat(33), requested_by: "operator-1",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({
      date: "2026-05-17", requested_by: "x".repeat(257),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dr_generate_flash_report"].safeParse({
      date: "", requested_by: "operator-1",
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DR — prism_dev :: dr_generate_flash_report", () => {
  it("returns full report with all required aggregator fields + count parity", async () => {
    const r = await invokeHandler(devHandler, "dr_generate_flash_report", {
      date: "2026-05-17", requested_by: "system",
    });
    expect(r.date).toBe("2026-05-17");
    expect(r.requested_by).toBe("system");
    const report = (r as { report: { date: string; generated_by: string; jobs_completed: unknown[]; jobs_in_progress: unknown[]; scrap_rate_pct: number; labor_utilization_pct: number; top_downtime_causes: unknown[] } }).report;
    expect(report.date).toBe("2026-05-17");
    expect(report.generated_by).toBe("system");
    expect(typeof report.scrap_rate_pct).toBe("number");
    expect(typeof report.labor_utilization_pct).toBe("number");
    expect(report.scrap_rate_pct).toBeGreaterThanOrEqual(0);
    expect(report.labor_utilization_pct).toBeGreaterThanOrEqual(0);
    // slim-stripped empties handled via nullish-coalesce
    const completed = report.jobs_completed ?? [];
    const inProgress = report.jobs_in_progress ?? [];
    const downtime = report.top_downtime_causes ?? [];
    expect((r as { completed_count?: number }).completed_count ?? 0).toBe(completed.length);
    expect((r as { in_progress_count?: number }).in_progress_count ?? 0).toBe(inProgress.length);
    expect((r as { downtime_cause_count?: number }).downtime_cause_count ?? 0).toBe(downtime.length);
  });

  it("VARIABILITY — 3 distinct date/requester combos all produce well-formed reports", async () => {
    const combos = [
      { date: "2026-05-15", requested_by: "system" },
      { date: "2026-05-16", requested_by: "operator-1" },
      { date: "2026-05-17", requested_by: "shift-lead" },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "dr_generate_flash_report", c);
      expect(r.date).toBe(c.date);
      const report = (r as { report: { date: string } }).report;
      expect(report.date).toBe(c.date);
    }
  });

  it("ROUTING PROOF — wire report.date + scrap_rate_pct equal engine-direct generateFlashReport()", async () => {
    const args = { date: "2026-05-17", requested_by: "routing-proof" };
    const r = await invokeHandler(devHandler, "dr_generate_flash_report", args);
    const wire = (r as { report: { date: string; scrap_rate_pct: number; labor_utilization_pct: number; jobs_completed: unknown[]; jobs_in_progress: unknown[] } }).report;
    const direct = dailyFlashReportEngine.generateFlashReport(args.date, args.requested_by);
    expect(wire.date).toBe(direct.date);
    expect(wire.scrap_rate_pct).toBeCloseTo(direct.scrap_rate_pct, 6);
    expect(wire.labor_utilization_pct).toBeCloseTo(direct.labor_utilization_pct, 6);
    // arrays slim-stripped when empty
    expect((wire.jobs_completed ?? []).length).toBe(direct.jobs_completed.length);
    expect((wire.jobs_in_progress ?? []).length).toBe(direct.jobs_in_progress.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DR — error envelope", () => {
  it("dr_generate_flash_report without requested_by → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dr_generate_flash_report", { date: "2026-05-17" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("dr_generate_flash_report with empty date → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dr_generate_flash_report", {
      date: "", requested_by: "system",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("dr_generate_flash_report with oversize date (>32 chars) → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dr_generate_flash_report", {
      date: "x".repeat(64), requested_by: "system",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
