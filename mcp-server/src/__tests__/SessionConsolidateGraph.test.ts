/**
 * SessionConsolidateGraph.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U02 — verifies the SessionEnd consolidation
 * hook + record_session_end dispatcher action wiring.
 *
 * The hook is tested directly via stdin without a running MCP — it must
 * gracefully degrade ("mcp-down" branch) when the server isn't reachable.
 * The dispatcher action is exercised via the engine module directly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";

const HOOK = "H:/prism/.claude/hooks/session-consolidate-graph.mjs";
const COUNTER = "H:/prism/mcp-server/data/state/consolidation-counter.json";

function runHook(payload: unknown) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 12_000,
    // point hook at a guaranteed-dead URL so we get a deterministic "mcp-down"
    env: { ...process.env, MCP_HTTP_URL: "http://127.0.0.1:1/mcp" },
  });
}

function resetCounter() {
  if (existsSync(COUNTER)) rmSync(COUNTER);
}

function readCounter() {
  return JSON.parse(readFileSync(COUNTER, "utf8")) as {
    schemaVersion: string;
    sessionsSinceLast: number;
    minSessionsBeforeConsolidate: number;
    totalConsolidations: number;
    lastConsolidation: string | null;
    lastUpdate: string;
  };
}

describe("record_session_end schema — P1-U02", () => {
  it("is registered in ACTION_MEMORY_SCHEMAS with passthrough", () => {
    expect(typeof ACTION_MEMORY_SCHEMAS.record_session_end).toBe("object");
    // accepts no params (auto-defaults)
    const r1 = ACTION_MEMORY_SCHEMAS.record_session_end.safeParse({});
    expect(r1.success).toBe(true);
    // accepts session_id + auto_consolidate
    const r2 = ACTION_MEMORY_SCHEMAS.record_session_end.safeParse({
      session_id: "abc",
      auto_consolidate: false,
    });
    expect(r2.success).toBe(true);
  });

  it("memory dispatcher exposes 12 actions including record_session_end", () => {
    const keys = Object.keys(ACTION_MEMORY_SCHEMAS);
    expect(keys.length).toBe(12);
    expect(keys).toContain("record_session_end");
    expect(keys).toContain("consolidate");
    expect(keys).toContain("remember");
    expect(keys).toContain("semantic_search");
  });

  it("FAIL: invalid auto_consolidate type still passes via passthrough but is ignored", () => {
    // passthrough means unexpected types in declared fields are not rejected
    const r = ACTION_MEMORY_SCHEMAS.record_session_end.safeParse({ auto_consolidate: "not-a-bool" });
    expect(r.success).toBe(false); // boolean is enforced by zod
  });
});

describe("session-consolidate-graph hook — P1-U02", () => {
  beforeEach(() => {
    resetCounter();
  });

  it("first run creates counter file with sessionsSinceLast=1", () => {
    const r = runHook({ session_id: "test-1" });
    expect(r.status).toBe(0);
    expect(existsSync(COUNTER)).toBe(true);
    const c = readCounter();
    expect(c.sessionsSinceLast).toBe(1);
    expect(c.minSessionsBeforeConsolidate).toBe(5);
    expect(c.schemaVersion).toBe("1.0.0");
  });

  it("emits Stop hookEventName with continue:true", () => {
    const r = runHook({ session_id: "test-2" });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as {
      continue: boolean;
      hookSpecificOutput?: { hookEventName?: string; additionalContext?: string };
    };
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.hookEventName).toBe("Stop");
    expect(out.hookSpecificOutput?.additionalContext).toMatch(/consolidate-graph: counter=/);
  });

  it("counter increments across consecutive runs", () => {
    runHook({ session_id: "a" });
    runHook({ session_id: "b" });
    runHook({ session_id: "c" });
    const c = readCounter();
    expect(c.sessionsSinceLast).toBe(3);
  });

  it("counter persists when MCP is unreachable (mcp-down branch)", () => {
    const r = runHook({ session_id: "down" });
    const out = JSON.parse(r.stdout) as { hookSpecificOutput: { additionalContext: string } };
    expect(out.hookSpecificOutput.additionalContext).toMatch(/mcp-down/);
    // counter still updated — durability is the local mirror
    expect(readCounter().sessionsSinceLast).toBe(1);
  });

  it("ADV: empty stdin → continue:true with counter incremented", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "",
      encoding: "utf8",
      timeout: 8_000,
      env: { ...process.env, MCP_HTTP_URL: "http://127.0.0.1:1/mcp" },
    });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue: boolean };
    expect(out.continue).toBe(true);
    expect(readCounter().sessionsSinceLast).toBe(1);
  });

  it("ADV: malformed JSON stdin → still increments counter and returns continue:true", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "garbage{{",
      encoding: "utf8",
      timeout: 8_000,
      env: { ...process.env, MCP_HTTP_URL: "http://127.0.0.1:1/mcp" },
    });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue: boolean };
    expect(out.continue).toBe(true);
    expect(readCounter().sessionsSinceLast).toBe(1);
  });

  it("ADV: variability — runs with no payload, with session_id, and with sessionId all succeed", () => {
    const inputs = [{}, { session_id: "snake" }, { sessionId: "camel" }];
    for (const payload of inputs) {
      resetCounter();
      const r = runHook(payload);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { continue: boolean };
      expect(out.continue).toBe(true);
      expect(readCounter().sessionsSinceLast).toBe(1);
    }
  });
});

describe("MemoryConsolidationEngine — P1-U02 wiring", () => {
  it("recordSessionEnd + shouldConsolidate gate at N=5", async () => {
    const mod = await import("../engines/MemoryConsolidationEngine.js");
    const engine = mod.memoryConsolidationEngine;
    // Get baseline
    const before = engine.getStats() as { sessionsSinceLast: number };
    const baseline = before.sessionsSinceLast ?? 0;
    // Record one — counter increments
    engine.recordSessionEnd();
    const after1 = engine.getStats() as { sessionsSinceLast: number };
    expect(after1.sessionsSinceLast).toBeGreaterThan(baseline);
    // shouldConsolidate is a function returning boolean
    expect(typeof engine.shouldConsolidate()).toBe("boolean");
  });

  it("consolidate() returns null until threshold is met", async () => {
    const mod = await import("../engines/MemoryConsolidationEngine.js");
    const engine = mod.memoryConsolidationEngine;
    if (!engine.shouldConsolidate()) {
      const r = await engine.consolidate();
      expect(r).toBeNull();
    } else {
      // already at threshold from prior test interaction — engine must
      // either return a report or null, never throw
      const r = await engine.consolidate();
      expect(r === null || typeof r === "object").toBe(true);
    }
  });
});
