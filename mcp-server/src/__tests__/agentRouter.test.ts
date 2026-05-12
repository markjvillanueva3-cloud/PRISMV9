/**
 * agentRouter (REST) Test Suite
 * ==============================
 *
 * AGENT-MS5 U-AGT16 — Validates the /api/v1/agent/* REST endpoints using
 * an ephemeral Node HTTP server on a random port + built-in fetch. No
 * supertest dependency required.
 *
 * @milestone AGENT-MS5
 * @unit U-AGT16
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express, { type Express } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createAgentRouter } from "../routes/agent.js";

// ── Test harness: real HTTP server on port 0 ───────────────────────────

async function startServer(configure: (app: Express) => void): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json());
  configure(app);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;

  return {
    url,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function fakeCallTool(responses: Record<string, any>) {
  return async (toolName: string, action: string, params: any = {}) => {
    const key = `${toolName}:${action}`;
    const data = responses[key] ?? {
      success: true,
      data: { echo: { toolName, action, params } },
    };
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  };
}

function capturingCallTool() {
  const captured: Array<{ toolName: string; action: string; params: any }> = [];
  const fn = async (toolName: string, action: string, params: any = {}) => {
    captured.push({ toolName, action, params });
    return {
      content: [
        { type: "text", text: JSON.stringify({ success: true, data: {} }) },
      ],
    };
  };
  return { fn, captured };
}

// ── Tests ──────────────────────────────────────────────────────────────

let harness: { url: string; close: () => Promise<void> } | null = null;

afterEach(async () => {
  if (harness) {
    await harness.close();
    harness = null;
  }
});

describe("agentRouter", () => {
  // ── POST /chat ───────────────────────────────────────────────────────

  describe("POST /chat", () => {
    it("returns 200 + unwrapped result for valid input", async () => {
      const callTool = fakeCallTool({
        "prism_agent:chat": {
          success: true,
          data: { id: "resp_1", finalAnswer: "Speed = 1200 RPM" },
        },
      });
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.success).toBe(true);
      expect(body.result.data.id).toBe("resp_1");
    });

    it("rejects request with no text field (400 from requireFields)", async () => {
      const callTool = fakeCallTool({});
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([400, 422]).toContain(res.status);
    });

    it("passes context + config through to the dispatcher", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "hi",
          context: { sessionId: "s1" },
          config: { verbose: true },
        }),
      });
      expect(captured.length).toBeGreaterThan(0);
      expect(captured[0]!.params.text).toBe("hi");
      expect(captured[0]!.params.context.sessionId).toBe("s1");
      expect(captured[0]!.params.config.verbose).toBe(true);
    });
  });

  // ── GET /stream (SSE) ────────────────────────────────────────────────

  describe("GET /stream", () => {
    it("emits SSE events for start/phase/complete", async () => {
      const callTool = fakeCallTool({
        "prism_agent:chat": {
          success: true,
          data: {
            id: "r1",
            phases: ["observe", "think", "act"],
            finalAnswer: "ok",
          },
        },
      });
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/stream?text=hello`);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      const body = await res.text();
      expect(body).toContain("event: start");
      expect(body).toContain("event: phase");
      expect(body).toContain("event: complete");
    });

    it("returns 400 for missing text query param", async () => {
      const callTool = fakeCallTool({});
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/stream`);
      expect(res.status).toBe(400);
    });
  });

  // ── GET /capabilities ────────────────────────────────────────────────

  describe("GET /capabilities", () => {
    it("defaults op to 'stats' when none provided", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/capabilities`);
      expect(captured[0]!.params.op).toBe("stats");
    });

    it("forwards query params (op, query, limit) to dispatcher", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/capabilities?op=search&query=lathe&limit=5`);
      expect(captured[0]!.params.op).toBe("search");
      expect(captured[0]!.params.query).toBe("lathe");
      expect(captured[0]!.params.limit).toBe(5);
    });
  });

  // ── POST /memory ─────────────────────────────────────────────────────

  describe("POST /memory", () => {
    it("requires op field (400)", async () => {
      const callTool = fakeCallTool({});
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "no op here" }),
      });
      expect([400, 422]).toContain(res.status);
    });

    it("forwards op + params to memory action", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      const res = await fetch(`${harness.url}/agent/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "remember_fact",
          content: "test content",
          tags: ["test"],
        }),
      });
      expect(res.status).toBe(200);
      expect(captured[0]!.action).toBe("memory");
      expect(captured[0]!.params.op).toBe("remember_fact");
    });
  });

  // ── POST /context ────────────────────────────────────────────────────

  describe("POST /context", () => {
    it("routes op=create → context_create action", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "create" }),
      });
      expect(captured[0]!.action).toBe("context_create");
    });

    it("routes op=add → context_add action", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "add",
          context_id: "c1",
          context: {},
          type: "user_message",
          content: "hi",
        }),
      });
      expect(captured[0]!.action).toBe("context_add");
    });

    it("routes op=compact → context_compact action", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      await fetch(`${harness.url}/agent/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "compact", context: {} }),
      });
      expect(captured[0]!.action).toBe("context_compact");
    });

    it("rejects invalid op with 400", async () => {
      const callTool = fakeCallTool({});
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "nope" }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /self-awareness ─────────────────────────────────────────────

  describe("POST /self-awareness", () => {
    it("forwards body to self_awareness action", async () => {
      const { fn, captured } = capturingCallTool();
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(fn));
      });

      const res = await fetch(`${harness.url}/agent/self-awareness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          model_id: "m",
          session_id: "s",
        }),
      });
      expect(res.status).toBe(200);
      expect(captured[0]!.action).toBe("self_awareness");
      expect(captured[0]!.params.name).toBe("Test");
    });
  });

  // ── GET /stats ───────────────────────────────────────────────────────

  describe("GET /stats", () => {
    it("returns aggregate stats", async () => {
      const callTool = fakeCallTool({
        "prism_agent:stats": {
          success: true,
          data: { capabilities: {}, engines_inventory: {} },
        },
      });
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/stats`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.success).toBe(true);
    });
  });

  // ── envelope unwrapping ──────────────────────────────────────────────

  describe("envelope unwrapping", () => {
    it("peels MCP envelope so clients see {success, data} directly", async () => {
      const callTool = fakeCallTool({
        "prism_agent:chat": {
          success: true,
          data: { finalAnswer: "peel test" },
        },
      });
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hi" }),
      });
      const body = await res.json();
      expect(body.result.data.finalAnswer).toBe("peel test");
    });

    it("handles malformed envelope gracefully", async () => {
      const callTool = async () => ({
        content: [{ type: "text", text: "not json" }],
      });
      harness = await startServer((app) => {
        app.use("/agent", createAgentRouter(callTool));
      });

      const res = await fetch(`${harness.url}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hi" }),
      });
      const body = await res.json();
      expect(body.result.success).toBe(false);
      expect(body.result.error).toContain("Invalid");
    });
  });
});
