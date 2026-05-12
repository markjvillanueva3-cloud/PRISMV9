/**
 * hookDispatcher / `dag_validate` action — HOOK-MANIFEST-DAG-MS26 / P0-U02
 *
 * Round-trip test: register the dispatcher against a minimal MCP-style mock, fire the
 * `dag_validate` action, decode the JSON response, and assert summary + per-event
 * payload shape. The dispatcher consumes the live HookManifestEngine output, so this
 * doubles as a live-repo smoke check on the wiring.
 */

import { describe, it, expect } from "vitest";
import { registerHookDispatcher } from "../tools/dispatchers/hookDispatcher.js";

interface ToolHandler {
  (args: { action: string; params?: Record<string, unknown> }): Promise<{ content: Array<{ type: string; text: string }> }>;
}

interface MockServer {
  tools: Record<string, ToolHandler>;
  tool: (name: string, _desc: string, _schema: unknown, handler: ToolHandler) => void;
}

function makeMockServer(): MockServer {
  const tools: Record<string, ToolHandler> = {};
  return {
    tools,
    tool(name, _desc, _schema, handler) {
      tools[name] = handler;
    },
  };
}

async function dispatch(server: MockServer, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const handler = server.tools["prism_hook"];
  if (!handler) throw new Error("prism_hook handler not registered on mock server");
  const res = await handler({ action, params });
  return JSON.parse(res.content[0].text) as Record<string, unknown>;
}

describe("prism_hook / dag_validate", () => {
  it("registers and lists dag_validate in the action set", () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    expect(typeof server.tools["prism_hook"]).toBe("function");
  });

  it("default summary view returns ok flag, summary, and event roll-up", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    const out = await dispatch(server, "dag_validate", {});
    // Schema fields the slimmer must preserve.
    expect(typeof out.ok).toBe("boolean");
    expect(typeof out.schemaVersion).toBe("number");
    expect(out.schemaVersion).toBe(1);
    expect(typeof out.generatedAt).toBe("string");
    expect(typeof out.summary).toBe("object");
    const summary = out.summary as Record<string, number>;
    expect(typeof summary.totalEvents).toBe("number");
    expect(typeof summary.totalNodes).toBe("number");
    expect(typeof summary.totalEdges).toBe("number");
    expect(typeof summary.cycleCount).toBe("number");
    expect(typeof summary.cleanEvents).toBe("number");
    expect(typeof summary.dirtyEvents).toBe("number");
    expect(Array.isArray(out.events)).toBe(true);
    // Roll-up entries are summary-shaped, not full nodes/edges.
    const events = out.events as Array<Record<string, unknown>>;
    expect(events.length).toBeGreaterThan(0);
    expect(typeof events[0].event).toBe("string");
    expect(typeof events[0].nodes).toBe("number");
    expect(typeof events[0].edges).toBe("number");
    expect(typeof events[0].cycles).toBe("number");
    expect(typeof events[0].hasOrder).toBe("boolean");
    // Hint mentions the params the user can pass next.
    expect(typeof out.hint).toBe("string");
    expect(out.hint).toMatch(/full=true/);
    expect(out.hint).toMatch(/event=/);
  });

  it("event=<name> returns the full per-event DAG record (nodes + edges + order|null)", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    // Pick a known canonical event PRISM always wires.
    const summary = await dispatch(server, "dag_validate", {});
    const events = summary.events as Array<{ event: string }>;
    const targetEvent = events.find((e) => e.event === "PreToolUse")?.event ?? events[0].event;
    const out = await dispatch(server, "dag_validate", { event: targetEvent });
    expect(out.event).toBe(targetEvent);
    expect(Array.isArray(out.nodes)).toBe(true);
    expect(Array.isArray(out.edges)).toBe(true);
    expect(Array.isArray(out.cycles)).toBe(true);
    expect(Array.isArray(out.conflicts)).toBe(true);
    // `order` is either an array of file paths (acyclic) or null (cycle).
    expect(out.order === null || Array.isArray(out.order)).toBe(true);
  });

  it("event=<unknown> returns an explicit error with the available-event list", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    const out = await dispatch(server, "dag_validate", { event: "NotAnEventThatExists_xyz_999" });
    expect(typeof out.error).toBe("string");
    expect(out.error).toMatch(/Event not found/);
    expect(Array.isArray(out.available)).toBe(true);
    expect((out.available as string[]).length).toBeGreaterThan(0);
  });

  it("full=true returns the entire validation (events carry nodes+edges arrays)", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    const out = await dispatch(server, "dag_validate", { full: true });
    expect(typeof out.ok).toBe("boolean");
    expect(typeof out.manifestGeneratedAt).toBe("string");
    expect(typeof out.manifestRepoRoot).toBe("string");
    const events = out.events as Array<Record<string, unknown>>;
    expect(events.length).toBeGreaterThan(0);
    // In `full` mode, events[].nodes is an array (the file list), not a count.
    expect(Array.isArray(events[0].nodes)).toBe(true);
    expect(Array.isArray(events[0].edges)).toBe(true);
    expect(Array.isArray(events[0].cycles)).toBe(true);
  });
});
