// TOKEN-AWARENESS-MS0 / U-TA06 — engine + dispatcher integration tests.
// Real-data oracle: writes a synthetic sidecar, calls the engine directly.
// The dispatcher cases are integration-tested via `registerContextDispatcher`
// fixture that captures the handler closure so we can invoke the same code
// path MCP clients use (no `as any` shortcuts, no hermetic-only mocks).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { tokenAwarenessEngine } from "../engines/TokenAwarenessEngine.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SIDECAR_DIR = `${PRISM_ROOT}/state/shared`;
const TEST_SLOT = "ta-engine-test";
const SIDECAR_PATH = path.join(SIDECAR_DIR, `token-budget-${TEST_SLOT}.json`);

interface SidecarShape {
  schemaVersion: string;
  capturedAt: string;
  sources: Record<string, boolean>;
  ctx: { tokens: number; maxTokens: number; pct: number };
  quota: unknown;
  cumulative: unknown;
  offload: unknown;
  zone: string;
  worstPct: number;
  worstSource: string;
  stale: boolean;
  ageMs: number;
  action: string;
  reasoning: string;
  slot: string;
  sessionId: string;
  host: string;
  hook: string;
}

function makeState(overrides: Partial<SidecarShape> = {}): SidecarShape {
  return {
    schemaVersion: "1.0.0",
    capturedAt: new Date().toISOString(),
    sources: { statusline: true, rateLimits: false, transcript: false, offload: false },
    ctx: { tokens: 100_000, maxTokens: 1_000_000, pct: 0.1 },
    quota: null,
    cumulative: null,
    offload: null,
    zone: "GREEN",
    worstPct: 0.1,
    worstSource: "ctx",
    stale: false,
    ageMs: 0,
    action: "proceed",
    reasoning: "context within budget",
    slot: TEST_SLOT,
    sessionId: "test-session",
    host: "test-host",
    hook: "token-awareness-sidecar",
    ...overrides,
  };
}

function writeSidecar(state: SidecarShape): void {
  fs.mkdirSync(SIDECAR_DIR, { recursive: true });
  fs.writeFileSync(SIDECAR_PATH, JSON.stringify(state));
}

// ────────────────────────────────────────────────────────────────────────────
// MCP fixture — captures the tool handler so we can invoke the same code path
// MCP clients use. Mirrors what claude-flow + mcp-sdk tests do across PRISM.
// ────────────────────────────────────────────────────────────────────────────
type HandlerFn = (args: { action: string; params?: unknown }) => Promise<unknown>;

interface CapturedHandlers {
  [toolName: string]: HandlerFn;
}

interface MockServer {
  tool: (name: string, description: string, schema: unknown, handler: HandlerFn) => void;
}

function makeMockServer(): { server: MockServer; handlers: CapturedHandlers } {
  const handlers: CapturedHandlers = {};
  const server: MockServer = {
    tool(name, _description, _schema, handler) {
      handlers[name] = handler;
    },
  };
  return { server, handlers };
}

async function callDispatcher(action: string, params: Record<string, unknown>): Promise<unknown> {
  const { server, handlers } = makeMockServer();
  registerContextDispatcher(server as Parameters<typeof registerContextDispatcher>[0]);
  const handler = handlers["prism_context"];
  if (!handler) throw new Error("prism_context tool was not registered");
  return handler({ action, params });
}

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const obj = result as { content?: Array<{ text?: string }> };
    if (obj.content && Array.isArray(obj.content)) {
      return obj.content.map((c) => c.text || "").join("");
    }
  }
  return JSON.stringify(result);
}

// ────────────────────────────────────────────────────────────────────────────
// Engine direct tests
// ────────────────────────────────────────────────────────────────────────────
describe("TokenAwarenessEngine — direct engine API", () => {
  beforeEach(() => {
    if (fs.existsSync(SIDECAR_PATH)) fs.unlinkSync(SIDECAR_PATH);
  });
  afterEach(() => {
    if (fs.existsSync(SIDECAR_PATH)) fs.unlinkSync(SIDECAR_PATH);
  });

  it("getState — missing sidecar returns null", () => {
    expect(tokenAwarenessEngine.getState({ slot: TEST_SLOT })).toBeNull();
  });

  it("getState — fresh sidecar returns full state with correct zone", () => {
    writeSidecar(makeState({ zone: "YELLOW", worstPct: 0.7 }));
    const s = tokenAwarenessEngine.getState({ slot: TEST_SLOT });
    expect(s?.zone).toBe("YELLOW");
    expect(s?.worstPct).toBe(0.7);
    expect(s?.stale).toBe(false);
    expect(s?.schemaVersion).toBe("1.0.0");
  });

  it("getState — stale sidecar bumps GREEN zone to YELLOW with stale flag", () => {
    const oldIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    writeSidecar(makeState({ capturedAt: oldIso, zone: "GREEN" }));
    const s = tokenAwarenessEngine.getState({ slot: TEST_SLOT });
    expect(s?.stale).toBe(true);
    expect(s?.zone).toBe("YELLOW");
  });

  it("getState — stale RED stays RED (never downgrade — R12)", () => {
    const oldIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    writeSidecar(makeState({ capturedAt: oldIso, zone: "RED", worstPct: 0.88 }));
    const s = tokenAwarenessEngine.getState({ slot: TEST_SLOT });
    expect(s?.stale).toBe(true);
    expect(s?.zone).toBe("RED");
  });

  it("getZone — emits compact summary for RED state", () => {
    writeSidecar(makeState({ zone: "RED", worstPct: 0.88, action: "compact", reasoning: "near hard limit" }));
    const z = tokenAwarenessEngine.getZone({ slot: TEST_SLOT });
    expect(z?.zone).toBe("RED");
    expect(z?.worstPct).toBe(0.88);
    expect(z?.action).toBe("compact");
    expect(z?.reasoning).toBe("near hard limit");
    expect(z?.stale).toBe(false);
  });

  it("getZone — missing sidecar returns null (not a stub)", () => {
    expect(tokenAwarenessEngine.getZone({ slot: TEST_SLOT })).toBeNull();
  });

  it("shouldCompact — GREEN returns false", () => {
    writeSidecar(makeState({ zone: "GREEN" }));
    const d = tokenAwarenessEngine.shouldCompact({ slot: TEST_SLOT });
    expect(d.shouldCompact).toBe(false);
    expect(d.zone).toBe("GREEN");
  });

  it("shouldCompact — RED returns true", () => {
    writeSidecar(makeState({ zone: "RED", worstPct: 0.88, reasoning: "compact now" }));
    const d = tokenAwarenessEngine.shouldCompact({ slot: TEST_SLOT });
    expect(d.shouldCompact).toBe(true);
    expect(d.zone).toBe("RED");
    expect(d.worstPct).toBe(0.88);
  });

  it("shouldCompact — CRITICAL returns true", () => {
    writeSidecar(makeState({ zone: "CRITICAL", worstPct: 0.97 }));
    const d = tokenAwarenessEngine.shouldCompact({ slot: TEST_SLOT });
    expect(d.shouldCompact).toBe(true);
    expect(d.zone).toBe("CRITICAL");
  });

  it("shouldCompact — missing sidecar returns false (advisory only when data present)", () => {
    const d = tokenAwarenessEngine.shouldCompact({ slot: TEST_SLOT });
    expect(d.shouldCompact).toBe(false);
    expect(d.reason).toMatch(/inactive/);
  });

  it("recommendAction — RED emits compact action", () => {
    writeSidecar(makeState({ zone: "RED", action: "compact", reasoning: "near limit" }));
    const r = tokenAwarenessEngine.recommendAction({ slot: TEST_SLOT });
    expect(r.action).toBe("compact");
    expect(r.zone).toBe("RED");
  });

  it("getHistory — fresh sidecar appears in fleet view with correct fields", () => {
    writeSidecar(makeState({ zone: "YELLOW", worstPct: 0.7 }));
    const history = tokenAwarenessEngine.getHistory();
    const us = history.find((h) => h.slot === TEST_SLOT);
    expect(us?.zone).toBe("YELLOW");
    expect(us?.worstPct).toBe(0.7);
    expect(us?.stale).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher round-trip integration — uses the SAME registerContextDispatcher
// code path the live MCP server uses. No `as any` shortcuts.
// ────────────────────────────────────────────────────────────────────────────
describe("contextDispatcher — round-trip integration for token_awareness_*", () => {
  beforeEach(() => {
    if (fs.existsSync(SIDECAR_PATH)) fs.unlinkSync(SIDECAR_PATH);
  });
  afterEach(() => {
    if (fs.existsSync(SIDECAR_PATH)) fs.unlinkSync(SIDECAR_PATH);
  });

  it("token_awareness_state returns the engine's getState() payload", async () => {
    writeSidecar(makeState({ zone: "RED", worstPct: 0.88 }));
    const result = await callDispatcher("token_awareness_state", { slot: TEST_SLOT });
    const text = extractText(result);
    expect(text).toContain("RED");
    expect(text).toContain("0.88");
  });

  it("token_awareness_zone returns the compact summary", async () => {
    writeSidecar(makeState({ zone: "YELLOW", worstPct: 0.7, action: "wrap-up" }));
    const result = await callDispatcher("token_awareness_zone", { slot: TEST_SLOT });
    const text = extractText(result);
    expect(text).toContain("YELLOW");
    expect(text).toContain("wrap-up");
  });

  it("token_awareness_should_compact returns shouldCompact:true on RED", async () => {
    writeSidecar(makeState({ zone: "RED", worstPct: 0.88 }));
    const result = await callDispatcher("token_awareness_should_compact", { slot: TEST_SLOT });
    const text = extractText(result);
    expect(text).toContain("shouldCompact");
    expect(text).toContain("true");
  });

  it("token_awareness_should_compact returns shouldCompact:false on GREEN", async () => {
    writeSidecar(makeState({ zone: "GREEN", worstPct: 0.1 }));
    const result = await callDispatcher("token_awareness_should_compact", { slot: TEST_SLOT });
    const text = extractText(result);
    expect(text).toContain("false");
  });

  it("token_awareness_recommend returns the engine's recommendation", async () => {
    writeSidecar(makeState({ zone: "CRITICAL", action: "stop-and-compact", reasoning: "at hard limit" }));
    const result = await callDispatcher("token_awareness_recommend", { slot: TEST_SLOT });
    const text = extractText(result);
    expect(text).toContain("stop-and-compact");
    expect(text).toContain("CRITICAL");
  });

  it("token_awareness_history returns slots array with test slot present", async () => {
    writeSidecar(makeState({ zone: "YELLOW", worstPct: 0.7 }));
    const result = await callDispatcher("token_awareness_history", {});
    const text = extractText(result);
    expect(text).toContain("slots");
    expect(text).toContain(TEST_SLOT);
    expect(text).toContain("YELLOW");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Anti-regression — fail-on-revert if the dispatcher wiring is removed.
// ────────────────────────────────────────────────────────────────────────────
describe("regression: token_awareness_* wiring must not silently disappear", () => {
  it("dispatcher source contains all 5 token_awareness_* actions", () => {
    const src = fs.readFileSync(
      path.join(PRISM_ROOT, "mcp-server/src/tools/dispatchers/contextDispatcher.ts"),
      "utf8",
    );
    expect(src).toMatch(/"token_awareness_state"/);
    expect(src).toMatch(/"token_awareness_zone"/);
    expect(src).toMatch(/"token_awareness_should_compact"/);
    expect(src).toMatch(/"token_awareness_recommend"/);
    expect(src).toMatch(/"token_awareness_history"/);
    // 2 references each (z.enum + case) ≥ 10 mentions total
    const matches = src.match(/"token_awareness_\w+"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });

  it("schema file declares all 5 token_awareness_* zod schemas", () => {
    const src = fs.readFileSync(
      path.join(PRISM_ROOT, "mcp-server/src/schemas/contextActionSchemas.ts"),
      "utf8",
    );
    expect(src).toMatch(/token_awareness_state:/);
    expect(src).toMatch(/token_awareness_zone:/);
    expect(src).toMatch(/token_awareness_should_compact:/);
    expect(src).toMatch(/token_awareness_recommend:/);
    expect(src).toMatch(/token_awareness_history:/);
  });
});
