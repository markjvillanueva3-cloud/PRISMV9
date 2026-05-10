/**
 * sessionDispatcher.handoff.test.ts — PRISM-STAB-MS0/U-B1 smoke (2026-05-09).
 * Mock-MCP-server pattern (see agentDispatcher.test.ts) — happy path only.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import * as fs from "fs";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

const SID = "claude-b1smoketst";
const TOPIC = "smoke";
const FILE = `H:/prism/state/shared/handoffs/HANDOFF-${SID}-${TOPIC}.md`;

class MockMCPServer {
  tools: Array<{ name: string; handler: (args: any) => Promise<any> }> = [];
  tool(name: string, _description: string, _schema: unknown, handler: any) {
    this.tools.push({ name, handler });
  }
  // some dispatchers use registerTool instead of tool — accept both
  registerTool(name: string, _meta: any, handler: any) {
    this.tools.push({ name, handler });
  }
}

async function call(server: MockMCPServer, action: string, params: any = {}) {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  const text = raw.content?.[0]?.text ?? raw.structuredContent ?? "";
  try { return typeof text === "string" ? JSON.parse(text) : text; }
  catch { return text; }
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerSessionDispatcher(server as any);
});
afterEach(() => { try { fs.unlinkSync(FILE); } catch { /* ok */ } });

describe("sessionDispatcher: handoff_write/read smoke (U-B1)", () => {
  it("write then read round-trips with frontmatter", async () => {
    const w = await call(server, "handoff_write", {
      session_id: SID,
      topic: TOPIC,
      body: "## STATE\nb1 smoke ok\n",
      machine: "TESTHOST",
    });
    expect(w.success).toBe(true);
    expect(w.file).toBe(FILE);
    expect(fs.existsSync(FILE)).toBe(true);

    const r = await call(server, "handoff_read", { session_id: SID, topic: TOPIC });
    expect(r.success).toBe(true);
    expect(r.content).toContain("b1 smoke ok");
    expect(r.content).toContain(`session: ${SID}`);
    expect(r.content).toContain("writer: prism_session.handoff_write");
  });
});
