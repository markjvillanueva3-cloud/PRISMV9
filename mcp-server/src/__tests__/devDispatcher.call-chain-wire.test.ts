/**
 * devDispatcher × CallChainEngine wire — orphan-rescue wiring (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: CallChainEngine was an orphan — built (196 LoC, stateful
 * singleton with 5 anti-patterns + 60s time-window matching, existing engine
 * tests at __tests__/call-chain-engine.test.ts) but with no dispatcher
 * reference. The existing tool_call_* actions wrap a DIFFERENT engine
 * (ToolCallParallelizationEngine, parallel-batch tracker), not this one.
 *
 * After this wire: 6 new prism_dev actions surface CallChainEngine's public API:
 *   tool_chain_record · tool_chain_detected · tool_chain_string ·
 *   tool_chain_summary · tool_chain_suggest · tool_chain_reset.
 *
 * Anti-patterns this engine detects (60s window, must repeat as a sequence):
 *   - glob-read-grep   ("Glob","Read","Grep")
 *   - read-edit-read   ("Read","Edit","Read")  ← requires same target on 1st+last
 *   - grep-read-edit   ("Grep","Read","Edit")
 *   - write-read-same  (write, then read of same path)
 *   - bash-bash-bash   (3 consecutive Bash, suggests &&-chaining)
 *
 * Engine is a SINGLETON with internal state — each test calls tool_chain_reset
 * first so state is hermetic.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-CALL-CHAIN
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  // Engine returns shape with `success: true` + payload; ResponseSlim may also include `error`
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(async () => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // Engine is a singleton — reset so each test starts clean.
  await call(server, "tool_chain_reset");
});

describe("devDispatcher × CallChainEngine wire (U-ORPHAN-RESCUE-CALL-CHAIN)", () => {
  // ── basic record + chain string ────────────────────────────────────────
  it("tool_chain_record returns null detection for a single call (no pattern yet)", async () => {
    const r = await call(server, "tool_chain_record", { tool: "Read", target: "a.ts" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    // slimResponse contract: when engine returns detected=null, the field is stripped
    // entirely. Either absence or explicit null both mean "no anti-pattern". Asserting
    // BOTH branches makes the test fail loudly if the slim contract changes OR if the
    // engine starts spuriously detecting something on a 1-call chain.
    expect(r.data.detected === null || r.data.detected === undefined).toBe(true);
    expect(r.data.chain).toBe("Read");
  });

  it("tool_chain_string formats arrow-separated chain", async () => {
    await call(server, "tool_chain_record", { tool: "Glob", target: "*.ts" });
    await call(server, "tool_chain_record", { tool: "Read", target: "x.ts" });
    const r = await call(server, "tool_chain_string", { last: 5 });
    expect(r.ok).toBe(true);
    // Engine's getChainString uses ASCII arrow per the source ("Tool → Tool" — unicode → from line 145)
    expect(r.data.chain).toBe("Glob → Read");
  });

  // ── anti-pattern: glob-read-grep ───────────────────────────────────────
  it("glob→read→grep sequence triggers anti-pattern on the 3rd call", async () => {
    const a = await call(server, "tool_chain_record", { tool: "Glob",  target: "*.ts" });
    const b = await call(server, "tool_chain_record", { tool: "Read",  target: "x.ts" });
    const c = await call(server, "tool_chain_record", { tool: "Grep",  target: "foo" });
    // First two calls: engine returns detected=null; slimResponse drops the field
    // entirely. Either undefined or null is the documented "no detection" signal.
    expect(a.data.detected === null || a.data.detected === undefined).toBe(true);
    expect(b.data.detected === null || b.data.detected === undefined).toBe(true);
    // Third call: engine returns the actual ChainAntiPattern object
    expect((c.data.detected as Record<string, unknown>)?.name).toBe("glob-read-grep");
    expect((c.data.detected as Record<string, unknown>)?.tokenWaste).toBe(3000);
  });

  // ── anti-pattern: read-edit-read on SAME target only ───────────────────
  it("read→edit→read with SAME target triggers; with DIFFERENT target does NOT", async () => {
    // SAME target — should detect
    await call(server, "tool_chain_record", { tool: "Read", target: "foo.ts" });
    await call(server, "tool_chain_record", { tool: "Edit", target: "foo.ts" });
    const hit = await call(server, "tool_chain_record", { tool: "Read", target: "foo.ts" });
    expect((hit.data.detected as Record<string, unknown>)?.name).toBe("read-edit-read");

    await call(server, "tool_chain_reset");

    // DIFFERENT target — must NOT detect (targets[0] !== targets[last] guard)
    await call(server, "tool_chain_record", { tool: "Read", target: "foo.ts" });
    await call(server, "tool_chain_record", { tool: "Edit", target: "foo.ts" });
    const miss = await call(server, "tool_chain_record", { tool: "Read", target: "bar.ts" });
    expect(miss.data.detected === null || miss.data.detected === undefined).toBe(true);
  });

  // ── anti-pattern: grep-read-edit ───────────────────────────────────────
  it("grep→read→edit triggers grep-read-edit anti-pattern", async () => {
    await call(server, "tool_chain_record", { tool: "Grep", target: "needle" });
    await call(server, "tool_chain_record", { tool: "Read", target: "file.ts" });
    const c = await call(server, "tool_chain_record", { tool: "Edit", target: "file.ts" });
    expect((c.data.detected as Record<string, unknown>)?.name).toBe("grep-read-edit");
  });

  // ── tool_chain_detected returns all detections cumulatively ─────────────
  it("tool_chain_detected returns every detection accumulated so far", async () => {
    // Trigger glob-read-grep
    await call(server, "tool_chain_record", { tool: "Glob", target: "*.ts" });
    await call(server, "tool_chain_record", { tool: "Read", target: "x.ts" });
    await call(server, "tool_chain_record", { tool: "Grep", target: "foo" });
    // Trigger grep-read-edit (Grep is already last from above)
    await call(server, "tool_chain_record", { tool: "Read", target: "y.ts" });
    await call(server, "tool_chain_record", { tool: "Edit", target: "y.ts" });
    const r = await call(server, "tool_chain_detected");
    expect(r.ok).toBe(true);
    const names = (r.data.detected as Array<{ name: string }>).map(p => p.name).sort();
    expect(names).toEqual(["glob-read-grep", "grep-read-edit"]);
  });

  // ── tool_chain_summary — human-readable rollup ─────────────────────────
  it("tool_chain_summary shows 'No anti-patterns detected.' for clean chain", async () => {
    await call(server, "tool_chain_record", { tool: "Read", target: "a.ts" });
    const r = await call(server, "tool_chain_summary");
    expect(r.ok).toBe(true);
    expect(r.data.summary).toBe("No anti-patterns detected.");
  });

  it("tool_chain_summary aggregates detected patterns and reports total token waste", async () => {
    await call(server, "tool_chain_record", { tool: "Glob", target: "*.ts" });
    await call(server, "tool_chain_record", { tool: "Read", target: "x.ts" });
    await call(server, "tool_chain_record", { tool: "Grep", target: "foo" }); // glob-read-grep (3000)
    const r = await call(server, "tool_chain_summary");
    expect(r.ok).toBe(true);
    const summary = r.data.summary as string;
    expect(summary).toContain("1 anti-pattern(s) detected");
    expect(summary).toContain("~3000 tokens wasted");
    expect(summary).toContain("glob-read-grep");
  });

  // ── tool_chain_suggest — heuristic count thresholds ────────────────────
  it("tool_chain_suggest flags 3+ Reads in last 10 calls", async () => {
    for (let i = 0; i < 3; i++) {
      await call(server, "tool_chain_record", { tool: "Read", target: `f${i}.ts` });
    }
    const r = await call(server, "tool_chain_suggest");
    expect(r.ok).toBe(true);
    const sugg = r.data.suggestions as string[];
    expect(sugg.some(s => s.includes("Read"))).toBe(true);
  });

  it("tool_chain_suggest flags 3+ Bash calls suggesting && chaining", async () => {
    for (let i = 0; i < 3; i++) {
      await call(server, "tool_chain_record", { tool: "Bash", target: `cmd${i}` });
    }
    const r = await call(server, "tool_chain_suggest");
    const sugg = r.data.suggestions as string[];
    expect(sugg.some(s => s.toLowerCase().includes("bash"))).toBe(true);
  });

  it("tool_chain_suggest returns empty array for a varied / low-count chain", async () => {
    await call(server, "tool_chain_record", { tool: "Read",  target: "a.ts" });
    await call(server, "tool_chain_record", { tool: "Edit",  target: "a.ts" });
    const r = await call(server, "tool_chain_suggest");
    // slimResponse strips empty arrays — absence + explicit-empty both mean "no suggestions"
    const sugg = (r.data.suggestions ?? []) as string[];
    expect(sugg.length).toBe(0);
  });

  // ── tool_chain_reset — wipes both chain and detected ───────────────────
  it("tool_chain_reset clears chain string and detected list", async () => {
    await call(server, "tool_chain_record", { tool: "Glob", target: "*.ts" });
    await call(server, "tool_chain_record", { tool: "Read", target: "x.ts" });
    await call(server, "tool_chain_record", { tool: "Grep", target: "foo" }); // detected
    const before = await call(server, "tool_chain_detected");
    expect((before.data.detected as Array<unknown>).length).toBe(1);

    const reset = await call(server, "tool_chain_reset");
    expect(reset.ok).toBe(true);
    expect(reset.data.reset).toBe(true);

    const afterDetected = await call(server, "tool_chain_detected");
    // After reset, engine returns detected=[]; slimResponse strips empty arrays.
    // Documented contract: absent field OR length=0 array both encode "empty".
    const detectedAfter = (afterDetected.data.detected ?? []) as Array<unknown>;
    expect(detectedAfter.length).toBe(0);
    const afterString = await call(server, "tool_chain_string");
    // Empty string is preserved by slimResponse (only empty arrays are dropped).
    expect(afterString.data.chain).toBe("");
  });

  // ── schema validation (Zod) ────────────────────────────────────────────
  it("schema rejects tool_chain_record with empty tool name", async () => {
    const r = await call(server, "tool_chain_record", { tool: "", target: "x" });
    expect(r.ok).toBe(false);
  });

  it("schema rejects tool_chain_string with last=0 (must be positive)", async () => {
    const r = await call(server, "tool_chain_string", { last: 0 });
    expect(r.ok).toBe(false);
  });

  // ── Action presence — all 6 wired actions accepted by registered enum ──
  it("all 6 tool_chain_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["tool_chain_record",   { tool: "Read", target: "x.ts" }],
      ["tool_chain_detected", {}],
      ["tool_chain_string",   { last: 5 }],
      ["tool_chain_summary",  {}],
      ["tool_chain_suggest",  {}],
      ["tool_chain_reset",    {}],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
