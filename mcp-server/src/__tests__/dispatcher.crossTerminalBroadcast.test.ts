/**
 * dispatcher.crossTerminalBroadcast.test.ts — round-trip integration for
 * COORD-MS0/U-COORD08 dispatcher wiring.
 *
 * Drives the 2 broadcast actions through the real prism_context dispatcher:
 *   - prism_context:cross_terminal_broadcast        (write — operator message)
 *   - prism_context:cross_terminal_broadcast_recent (read  — last N events)
 *
 * @milestone COORD-MS0 / U-COORD08
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";
import { crossTerminalBroadcastEngine } from "../engines/CrossTerminalBroadcastEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, h: CapturedTool["handler"]) {
      tools.push({ name, handler: h });
    },
  };
}

async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    return JSON.parse(arr[0]?.text ?? "{}") as Record<string, unknown>;
  }
  return res;
}

let contextHandler: CapturedTool["handler"];

beforeAll(() => {
  const s = makeStubServer();
  registerContextDispatcher(s as unknown as Parameters<typeof registerContextDispatcher>[0]);
  const t = s.tools.find((x) => x.name === "prism_context");
  if (!t) throw new Error("prism_context not registered");
  contextHandler = t.handler;
});

beforeEach(() => {
  // Isolated channel per test so we don't pollute other tests or the live channel.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-broadcast-disp-"));
  crossTerminalBroadcastEngine._setBroadcastPath(path.join(tmpDir, "BROADCAST_CHANNEL.jsonl"));
});

describe("prism_context :: cross_terminal_broadcast", () => {
  it("happy path: send operator message returns ok=true with delivery confirmation", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "Starting work on engines — please coordinate",
      msgType: "info",
    });
    expect(r.ok).toBe(true);
    const event = r.event as { type: string; payload?: { content?: string; msgType?: string } };
    expect(event.type).toBe("operator_message");
    expect(event.payload?.content).toBe("Starting work on engines — please coordinate");
    expect(event.payload?.msgType).toBe("info");
    expect(r.recent_event_count).toBeGreaterThanOrEqual(1);
  });

  it("accepts `message` alias for `content` (skill compatibility)", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      message: "via message alias",
      msgType: "warning",
    });
    expect(r.ok).toBe(true);
    const event = r.event as { payload?: { content?: string; msgType?: string } };
    expect(event.payload?.content).toBe("via message alias");
    expect(event.payload?.msgType).toBe("warning");
  });

  it("accepts snake_case `msg_type` alias", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "snake case",
      msg_type: "request",
    });
    expect(r.ok).toBe(true);
    const event = r.event as { payload?: { msgType?: string } };
    expect(event.payload?.msgType).toBe("request");
  });

  it("defaults msgType to 'info' when omitted", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "no type specified",
    });
    expect(r.ok).toBe(true);
    const event = r.event as { payload?: { msgType?: string } };
    expect(event.payload?.msgType).toBe("info");
  });

  it("empty content returns ok=false with error=empty_message", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("empty_message");
  });

  it("whitespace-only content returns ok=false with error=empty_message", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "   \t  ",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("empty_message");
  });

  it("invalid msgType returns ok=false with error=invalid_message_type", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "hello",
      msgType: "shout",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_message_type");
  });
});

describe("prism_context :: cross_terminal_broadcast_recent", () => {
  it("returns count=0 when channel has no entries yet", async () => {
    const r = await invoke(contextHandler, "cross_terminal_broadcast_recent", {});
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
    // Note: dispatcher response wrapper may strip empty arrays — assert the
    // canonical count contract rather than the array shape.
    const events = (r.events as unknown[] | undefined) ?? [];
    expect(events.length).toBe(0);
  });

  it("returns events written by cross_terminal_broadcast in chronological order", async () => {
    await invoke(contextHandler, "cross_terminal_broadcast", { content: "first", msgType: "info" });
    await invoke(contextHandler, "cross_terminal_broadcast", { content: "second", msgType: "warning" });
    await invoke(contextHandler, "cross_terminal_broadcast", { content: "third", msgType: "request" });
    const r = await invoke(contextHandler, "cross_terminal_broadcast_recent", {});
    expect(r.ok).toBe(true);
    expect(r.count).toBe(3);
    const events = r.events as Array<{ payload?: { content?: string; msgType?: string } }>;
    expect(events[0].payload?.content).toBe("first");
    expect(events[1].payload?.content).toBe("second");
    expect(events[2].payload?.content).toBe("third");
  });

  it("respects limit option (returns last-N tail)", async () => {
    for (let i = 0; i < 5; i++) {
      await invoke(contextHandler, "cross_terminal_broadcast", {
        content: `msg-${i}`,
        msgType: "info",
      });
    }
    const r = await invoke(contextHandler, "cross_terminal_broadcast_recent", { limit: 2 });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(2);
    const events = r.events as Array<{ payload?: { content?: string } }>;
    expect(events[0].payload?.content).toBe("msg-3");
    expect(events[1].payload?.content).toBe("msg-4");
  });
});

describe("write+read round trip", () => {
  it("broadcast then immediately read returns the same event", async () => {
    const writeRes = await invoke(contextHandler, "cross_terminal_broadcast", {
      content: "round-trip-test",
      msgType: "info",
    });
    expect(writeRes.ok).toBe(true);
    const readRes = await invoke(contextHandler, "cross_terminal_broadcast_recent", { limit: 10 });
    expect(readRes.ok).toBe(true);
    expect(readRes.count).toBe(1);
    const events = readRes.events as Array<{ type: string; payload?: { content?: string } }>;
    expect(events[0].type).toBe("operator_message");
    expect(events[0].payload?.content).toBe("round-trip-test");
  });
});
