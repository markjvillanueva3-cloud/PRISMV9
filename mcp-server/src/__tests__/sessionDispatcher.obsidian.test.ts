/**
 * sessionDispatcher.obsidian.test.ts
 *
 * Round-trips the 3 ZULU-OBSIDIAN-LIVE-MS0 actions through the REAL
 * prism_session dispatcher handler (not the engine directly) to prove the
 * wiring: action name in the enum → switch case → ObsidianRestBridgeEngine →
 * fail-soft result surfaced in the MCP content envelope. With no vault and no
 * key, every action must return ok:false reason:"no-key" — never throw.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

/** Mock MCP server that captures the registered prism_session handler. */
function captureHandler(): Handler {
  let handler: Handler | undefined;
  const server = {
    tool: (_name: string, _desc: string, _schema: unknown, h: Handler) => {
      handler = h;
    },
  };
  registerSessionDispatcher(server);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return handler;
}

/** Pull the JSON result object out of the MCP text-content envelope. */
async function call(handler: Handler, action: string, params?: Record<string, unknown>): Promise<any> {
  const res = await handler({ action, params });
  const text = res?.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

const KEY = "PRISM_OBSIDIAN_API_KEY";
let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env[KEY];
  delete process.env[KEY]; // no vault configured → fail-soft no-key
});
afterEach(() => {
  if (savedKey === undefined) delete process.env[KEY];
  else process.env[KEY] = savedKey;
});

describe("prism_session obsidian_* wiring (ZULU-OBSIDIAN-LIVE-MS0)", () => {
  it("obsidian_status routes to the engine and surfaces fail-soft no-key (no throw)", async () => {
    const handler = captureHandler();
    const out = await call(handler, "obsidian_status");
    expect(out.success).toBe(true); // dispatcher envelope ok
    expect(out.result.ok).toBe(false); // engine fail-soft
    expect(out.result.reason).toBe("no-key");
    expect(out.result.data.live).toBe(false);
  });

  it("obsidian_read routes with a path param and surfaces fail-soft no-key", async () => {
    const handler = captureHandler();
    const out = await call(handler, "obsidian_read", { path: "memories/x.md" });
    expect(out.success).toBe(true);
    expect(out.result.ok).toBe(false);
    expect(out.result.reason).toBe("no-key");
  });

  it("obsidian_search routes with a query param and surfaces fail-soft no-key", async () => {
    const handler = captureHandler();
    const out = await call(handler, "obsidian_search", { query: "kienzle" });
    expect(out.success).toBe(true);
    expect(out.result.ok).toBe(false);
    expect(out.result.reason).toBe("no-key");
  });
});
