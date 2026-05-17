/**
 * dispatcher.operatingSystemCoordination.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-OSC (OperatingSystemCoordinationEngine).
 *
 * 2 pure-read static methods through real `prism_dev`:
 *   osc_list_hot_jobs                → static listHotJobs()
 *   osc_build_messages_workspace     → static buildMessagesWorkspace(input?)
 *
 * DEFERRED:
 *   - setHotJob(record): mutates module-scope `hotJobs` array.
 *     LLM-callable would let any chat thrash peer chats' hot-job
 *     priority queue.
 *   - clearHotJob(jobId): same risk class (peer queue mutation).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { OperatingSystemCoordinationEngine } from "../engines/OperatingSystemCoordinationEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-OSC — Zod schemas", () => {
  it("osc_list_hot_jobs accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["osc_list_hot_jobs"].safeParse({}).success).toBe(true);
  });

  it("osc_build_messages_workspace accepts {} (all fields optional)", () => {
    expect(ACTION_DEV_SCHEMAS["osc_build_messages_workspace"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["osc_build_messages_workspace"].safeParse({
      profileId: "machinist-1", email: "operator@shop.local", threadId: null,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["osc_build_messages_workspace"].safeParse({
      email: null, threadId: null,
    }).success).toBe(true);
  });

  it("osc_build_messages_workspace rejects oversize profileId/email (DoS bound 128/256)", () => {
    expect(ACTION_DEV_SCHEMAS["osc_build_messages_workspace"].safeParse({
      profileId: "x".repeat(129),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["osc_build_messages_workspace"].safeParse({
      email: "x".repeat(257),
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-OSC — prism_dev :: osc_list_hot_jobs", () => {
  it("returns jobs array + count parity", async () => {
    const r = await invokeHandler(devHandler, "osc_list_hot_jobs", {});
    const jobs = (r.jobs as unknown[] | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(jobs.length);
  });

  it("ROUTING PROOF — wire count equals engine-direct listHotJobs().length", async () => {
    const r = await invokeHandler(devHandler, "osc_list_hot_jobs", {});
    const direct = OperatingSystemCoordinationEngine.listHotJobs();
    expect((r.count as number | undefined) ?? 0).toBe(direct.length);
  });

  it("idempotent — back-to-back calls produce identical count (read-only contract)", async () => {
    const r1 = await invokeHandler(devHandler, "osc_list_hot_jobs", {});
    const r2 = await invokeHandler(devHandler, "osc_list_hot_jobs", {});
    expect((r1.count as number | undefined) ?? 0).toBe((r2.count as number | undefined) ?? 0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-OSC — prism_dev :: osc_build_messages_workspace", () => {
  it("default invocation returns workspace with all 4 count discriminators populated", async () => {
    const r = await invokeHandler(devHandler, "osc_build_messages_workspace", {});
    const ws = (r as { workspace: { summary: string; identityLabel: string; activeMailbox: string; channels: unknown[]; threads: unknown[]; selectedThreadId: string; selectedThreadEntries: unknown[]; actionLabels: unknown; linkedRecords: unknown[] } }).workspace;
    expect(ws.summary.length).toBeGreaterThan(0);
    expect(ws.identityLabel.length).toBeGreaterThan(0);
    expect(ws.activeMailbox.length).toBeGreaterThan(0);
    expect(ws.channels.length).toBeGreaterThan(0);
    expect(ws.threads.length).toBeGreaterThan(0);
    expect(ws.selectedThreadId.length).toBeGreaterThan(0);
    // counts on wire envelope match the workspace fields
    expect((r.channel_count as number | undefined) ?? 0).toBe(ws.channels.length);
    expect((r.thread_count as number | undefined) ?? 0).toBe(ws.threads.length);
    expect((r.entry_count as number | undefined) ?? 0).toBe(ws.selectedThreadEntries.length);
    expect((r.linked_record_count as number | undefined) ?? 0).toBe(ws.linkedRecords.length);
  });

  it("VARIABILITY — 4 distinct profile scopes all produce well-formed workspaces", async () => {
    const profiles = ["admin", "machinist", "inspector", "planner"];
    for (const pid of profiles) {
      const r = await invokeHandler(devHandler, "osc_build_messages_workspace", { profileId: pid });
      const ws = (r as { workspace: { summary: string; threads: unknown[] } }).workspace;
      expect(ws.summary.length).toBeGreaterThan(0);
      expect(ws.threads.length).toBeGreaterThan(0);
    }
  });

  it("invalid threadId falls back to first thread (engine line 555-557 fallback)", async () => {
    const r = await invokeHandler(devHandler, "osc_build_messages_workspace", {
      threadId: "no-such-thread-zzzz",
    });
    const ws = (r as { workspace: { threads: { id: string }[]; selectedThreadId: string } }).workspace;
    // Fallback: selectedThreadId must equal first thread's id when input
    // threadId doesn't appear in the scope's thread list.
    expect(ws.selectedThreadId).toBe(ws.threads[0]?.id);
  });

  it("ROUTING PROOF — wire workspace.selectedThreadId equals engine-direct buildMessagesWorkspace() value", async () => {
    const args = { profileId: "machinist-1" };
    const r = await invokeHandler(devHandler, "osc_build_messages_workspace", args);
    const wire = (r as { workspace: { selectedThreadId: string; summary: string } }).workspace;
    const direct = OperatingSystemCoordinationEngine.buildMessagesWorkspace(args);
    expect(wire.selectedThreadId).toBe(direct.selectedThreadId);
    expect(wire.summary).toBe(direct.summary);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-OSC — error envelope", () => {
  it("osc_build_messages_workspace with oversize profileId → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "osc_build_messages_workspace", {
      profileId: "x".repeat(999),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("osc_build_messages_workspace with oversize email → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "osc_build_messages_workspace", {
      email: "x".repeat(999),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
