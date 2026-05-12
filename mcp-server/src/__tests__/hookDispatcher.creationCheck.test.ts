/**
 * hookDispatcher / `creation_check` action — HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE
 *
 * Round-trip test: register the dispatcher against a minimal MCP-style mock, fire the
 * `creation_check` action against the live HookManifest, decode JSON, and assert the
 * documented summary and full-payload shapes.
 *
 * The dispatcher reads the live HookManifestEngine output, so this doubles as a live-repo
 * smoke check on the wiring.
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
  // Dispatcher returns MCP content-wrapped success responses; the schema-validation
  // middleware returns the raw `dispatcherError` object directly (no content[]).
  // Handle both.
  if (res && typeof res === "object" && Array.isArray((res as { content?: unknown }).content)) {
    const text = (res as { content: Array<{ text: string }> }).content[0]?.text ?? "{}";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res as unknown as Record<string, unknown>;
}

describe("prism_hook / creation_check", () => {
  it("rejects a call with no proposedName via the Zod-schema validation middleware", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    const out = await dispatch(server, "creation_check", {});
    // The validateActionParams middleware short-circuits before the case statement —
    // its error path returns { success:false, error:"...", action, dispatcher } directly.
    expect(out.success).toBe(false);
    expect(typeof out.error).toBe("string");
    expect(out.error).toMatch(/proposedName/);
    expect(out.action).toBe("creation_check");
    expect(out.dispatcher).toBe("prism_hook");
  });

  it("default summary view returns shouldProceed, recommendation, matchCount, topMatch", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    // Pick a clearly-unique name so the live manifest can't accidentally collide.
    const out = await dispatch(server, "creation_check", {
      proposedName: "totally-novel-hook-zzz-9999.mjs",
      description: "",
    });
    expect(out.schemaVersion).toBe(1);
    expect(out.shouldProceed).toBe(true);
    expect(out.recommendation).toBe("proceed");
    expect(out.matchCount).toBe(0);
    expect(out.topMatch).toBeNull();
    expect(typeof out.hint).toBe("string");
    expect(out.hint).toMatch(/full=true/);
  });

  it("exact-name collision against a real live hook recommends skip", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    // The firewall we shipped earlier in this session — guaranteed to be in the manifest.
    const out = await dispatch(server, "creation_check", {
      proposedName: "hook-cross-worktree-block.mjs",
    });
    expect(out.shouldProceed).toBe(false);
    expect(out.recommendation).toBe("skip");
    expect(out.matchCount).toBeGreaterThanOrEqual(1);
    const top = out.topMatch as Record<string, unknown>;
    expect(top?.id).toBe("hook-cross-worktree-block");
    expect((top?.reasons as string[]).includes("exact-name")).toBe(true);
  });

  it("signature collision recommends extend (uses hook-cross-worktree-block's exact matcher)", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    // The cross-worktree firewall shipped earlier this session uses this exact matcher —
    // guaranteed present in the live manifest, so the (event, matcher) signature collides.
    const out = await dispatch(server, "creation_check", {
      proposedName: "uniquely-named-edit-monitor-zzz.mjs",
      description: "",
      event: "PreToolUse",
      matcher: "^(Edit|Write|MultiEdit|NotebookEdit)$",
    });
    expect(out.shouldProceed).toBe(false);
    expect(out.recommendation).toBe("extend");
    expect(out.matchCount).toBeGreaterThanOrEqual(1);
    const top = out.topMatch as Record<string, unknown>;
    expect((top?.reasons as string[]).includes("signature-match")).toBe(true);
  });

  it("full=true returns the entire matches array with all match dimensions", async () => {
    const server = makeMockServer();
    registerHookDispatcher(server as unknown as Parameters<typeof registerHookDispatcher>[0]);
    const out = await dispatch(server, "creation_check", {
      proposedName: "hook-cross-worktree-block.mjs",
      full: true,
    });
    expect(Array.isArray(out.matches)).toBe(true);
    expect((out.matches as unknown[]).length).toBeGreaterThanOrEqual(1);
    const match0 = (out.matches as Array<Record<string, unknown>>)[0];
    expect(typeof match0.id).toBe("string");
    expect(typeof match0.file).toBe("string");
    expect(typeof match0.score).toBe("number");
    expect(Array.isArray(match0.reasons)).toBe(true);
    expect(typeof match0.detail).toBe("string");
  });
});
