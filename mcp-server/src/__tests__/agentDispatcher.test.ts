/**
 * agentDispatcher Test Suite
 * ===========================
 *
 * AGENT-MS5 U-AGT17 — Validates the prism_agent MCP dispatcher surface.
 * Uses a minimal mock MCP server that captures the tool registration and
 * then invokes the handler directly — no real MCP transport required.
 *
 * @milestone AGENT-MS5
 * @unit U-AGT17
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAgentDispatcher,
  AGENT_DISPATCHER_ACTIONS,
} from "../tools/dispatchers/agentDispatcher.js";

// ── Mock MCP Server ────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: any) => Promise<any>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: any) {
    this.tools.push({ name, description, schema, handler });
  }
}

// Helper: call the agent handler and parse the JSON response
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, any> = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  const text = raw.content[0].text;
  return JSON.parse(text);
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerAgentDispatcher(server);
});

describe("agentDispatcher", () => {
  // ── Registration ─────────────────────────────────────────────────────

  describe("registration", () => {
    it("registers exactly one tool on the server", () => {
      expect(server.tools.length).toBe(1);
    });

    it("registers under the name prism_agent", () => {
      expect(server.tools[0]!.name).toBe("prism_agent");
    });

    it("exports all 8 actions", () => {
      expect(AGENT_DISPATCHER_ACTIONS.length).toBe(8);
    });

    it("includes chat, memory, capabilities, self_awareness, stats actions", () => {
      const actions = AGENT_DISPATCHER_ACTIONS as readonly string[];
      expect(actions).toContain("chat");
      expect(actions).toContain("memory");
      expect(actions).toContain("capabilities");
      expect(actions).toContain("self_awareness");
      expect(actions).toContain("stats");
    });
  });

  // ── chat ─────────────────────────────────────────────────────────────

  describe("action: chat", () => {
    it("rejects missing text param", async () => {
      const result = await call(server, "chat", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("text");
    });

    it("runs the agentic loop on valid text", async () => {
      const result = await call(server, "chat", {
        text: "calculate speed and feed for 4140",
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
    });
  });

  // ── context_create / add / compact ────────────────────────────────────

  describe("context lifecycle", () => {
    it("creates a new context", async () => {
      const result = await call(server, "context_create", { max_tokens: 500 });
      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
      expect(result.data.maxTokens).toBe(500);
      expect(result.data.items).toEqual([]);
    });

    it("adds an item to an existing context", async () => {
      const created = await call(server, "context_create", { max_tokens: 500 });
      const ctx = created.data;
      const result = await call(server, "context_add", {
        context_id: ctx.id,
        context: ctx,
        type: "user_message",
        content: "hello agent",
      });
      expect(result.success).toBe(true);
      expect(result.data.item.content).toBe("hello agent");
      expect(result.data.context.items.length).toBe(1);
    });

    it("compacts a context with too many items", async () => {
      const created = await call(server, "context_create", { max_tokens: 50 });
      let ctx = created.data;
      for (let i = 0; i < 20; i++) {
        const res = await call(server, "context_add", {
          context_id: ctx.id,
          context: ctx,
          type: "user_message",
          content: `long message ${i} with enough content to consume tokens`,
        });
        ctx = res.data.context;
      }
      const result = await call(server, "context_compact", {
        context: ctx,
        strategy: "aggressive",
      });
      expect(result.success).toBe(true);
      expect(result.data.result.success).toBe(true);
    });

    it("rejects context_add without context object", async () => {
      const result = await call(server, "context_add", {
        context_id: "ctx_1",
        type: "user_message",
        content: "hi",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── memory ────────────────────────────────────────────────────────────

  describe("action: memory", () => {
    it("remember_fact stores a new fact", async () => {
      const result = await call(server, "memory", {
        op: "remember_fact",
        content: "LB3000 max RPM is 5000",
        tags: ["lathe", "okuma"],
      });
      expect(result.success).toBe(true);
      expect(result.data.type).toBe("fact");
    });

    it("query returns registered memories", async () => {
      await call(server, "memory", {
        op: "remember_fact",
        content: "Test memory for query",
        tags: ["test_query"],
      });
      const result = await call(server, "memory", {
        op: "query",
        tags: ["test_query"],
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("stats returns memory statistics", async () => {
      const result = await call(server, "memory", { op: "stats" });
      expect(result.success).toBe(true);
    });

    it("rejects unknown memory op", async () => {
      const result = await call(server, "memory", { op: "not_a_real_op" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown memory op");
    });

    it("remember_correction requires incorrect + correct", async () => {
      const result = await call(server, "memory", {
        op: "remember_correction",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── capabilities ─────────────────────────────────────────────────────

  describe("action: capabilities", () => {
    it("search returns actions by query", async () => {
      const result = await call(server, "capabilities", {
        op: "search",
        query: "lathe",
        limit: 5,
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("search target=both returns actions + engines", async () => {
      const result = await call(server, "capabilities", {
        op: "search",
        query: "force",
        target: "both",
        limit: 3,
      });
      expect(result.success).toBe(true);
      expect(result.data.actions).toBeDefined();
      expect(result.data.engines).toBeDefined();
    });

    it("stats returns both action and engine statistics", async () => {
      const result = await call(server, "capabilities", { op: "stats" });
      expect(result.success).toBe(true);
      expect(result.data.actions).toBeDefined();
      expect(result.data.engines).toBeDefined();
    });

    it("rejects unknown capabilities op", async () => {
      const result = await call(server, "capabilities", { op: "not_real" });
      expect(result.success).toBe(false);
    });
  });

  // ── self_awareness ───────────────────────────────────────────────────

  describe("action: self_awareness", () => {
    it("builds a self-awareness model from live engine stats", async () => {
      const result = await call(server, "self_awareness", {
        name: "Test-Agent",
        model_id: "test-model",
        session_id: "test-session",
      });
      expect(result.success).toBe(true);
      expect(result.data.model.identity.name).toBe("Test-Agent");
      expect(result.data.model.capabilities.dispatcher_count).toBeGreaterThan(0);
    });

    it("returns compact serialization when requested", async () => {
      const result = await call(server, "self_awareness", {
        name: "Test-Agent",
        model_id: "test-model",
        session_id: "test-session",
        compact: true,
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.compact).toBe("string");
      expect(result.data.compact.length).toBeLessThan(2048);
    });
  });

  // ── stats ────────────────────────────────────────────────────────────

  describe("action: stats", () => {
    it("aggregates stats across capability, engine, memory, learning, loop", async () => {
      const result = await call(server, "stats");
      expect(result.success).toBe(true);
      expect(result.data.capabilities).toBeDefined();
      expect(result.data.engines_inventory).toBeDefined();
      expect(result.data.memory).toBeDefined();
      expect(result.data.learning).toBeDefined();
      expect(result.data.agentic_loop).toBeDefined();
    });
  });

  // ── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("surfaces thrown errors as { success: false, error: ... }", async () => {
      // Trigger error by passing invalid op to capabilities
      const result = await call(server, "capabilities", { op: "by_tool" });
      expect(result.success).toBe(false);
    });
  });
});
