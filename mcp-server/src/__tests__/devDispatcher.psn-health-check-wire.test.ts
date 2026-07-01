/**
 * devDispatcher × PSNHealthCheckEngine wire
 * ([WIRING]/U-WIRE-PSN-HEALTH-CHECK, slot:romeo).
 *
 * PSNHealthCheckEngine (pure static 11-leg PSN-leg health classifier) was BUILT but UNWIRED —
 * verified GENUINE_ORPHAN (self-contained static methods) via scripts/classify-engine-reachability.mjs.
 * This wires `psn_health_check` into prism_dev: caller supplies per-leg signal inputs → engine
 * classifies all 11 legs → report.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import).
 * ANTI-STUB: the engine ALWAYS returns exactly 11 legs; empty input → all 11 "unknown". A no-op
 * case returning {} fails legs.length===11. Real classification is asserted via spanning leg inputs
 * (green/amber/red) — reference values from the engine's documented thresholds.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-PSN-HEALTH-CHECK
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  // A successful PSNHealthReport carries a `summary` object + `legs` array; an error envelope does not.
  if (!parsed.summary || typeof parsed.summary !== "object") return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × PSNHealthCheck wire (U-WIRE-PSN-HEALTH-CHECK)", () => {
  it("empty inputs → all 11 legs render 'unknown' (anti-stub: always 11 legs)", async () => {
    const r = await call(server, "psn_health_check", { inputs: {} });
    expect(r.ok).toBe(true);
    expect(r.data.schema_version).toBe("psn-health-1.0.0");
    const legs = r.data.legs as Array<{ id: number; status: string }>;
    expect(legs).toHaveLength(11);                       // engine maps ALL 11 legs
    expect(legs.every((l) => l.status === "unknown")).toBe(true);
    const summary = r.data.summary as Record<string, number>;
    expect(summary.unknown).toBe(11);
    expect(summary.green ?? 0).toBe(0);
    expect(String(r.data.summary_line)).toMatch(/unknown=11/);
  });

  it("spanning leg inputs classify green/amber/red by the engine's thresholds (variability + reference values)", async () => {
    const r = await call(server, "psn_health_check", {
      inputs: {
        obsidian: { memoryCount: 100, lastMemoryAgeMin: 30 },   // green: has memories, fresh (<24h)
        wiki: { entryCount: 0, brokenLinkPct: 0 },              // red: wiki empty
        memories: { indexSizeLines: 200, truncated: true },    // amber: truncated
      },
    });
    expect(r.ok).toBe(true);
    const summary = r.data.summary as Record<string, number>;
    expect(summary.green).toBe(1);
    expect(summary.amber).toBe(1);
    expect(summary.red).toBe(1);
    expect(summary.unknown).toBe(8);   // the other 8 legs had no input
    const legs = r.data.legs as Array<{ name: string; status: string }>;
    expect(legs.find((l) => /obsidian/i.test(l.name))?.status).toBe("green");
    expect(legs.find((l) => /wiki/i.test(l.name))?.status).toBe("red");
    expect(legs.find((l) => /memories/i.test(l.name))?.status).toBe("amber");
  });

  it("invalid per-leg input is rejected as a structured error, not a crash (adversarial)", async () => {
    // memoryCount must be a nonnegative int — the engine's LegInputsSchema.parse throws, the case catches.
    const r = await call(server, "psn_health_check", { inputs: { obsidian: { memoryCount: -5, lastMemoryAgeMin: 10 } } });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/invalid_leg_inputs|invalid|nonnegative|expected/);
  });

  it("psn_health_check action is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "psn_health_check", { inputs: {} });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  });
});
