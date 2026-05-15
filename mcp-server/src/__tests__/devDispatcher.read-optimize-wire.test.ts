/**
 * devDispatcher × ReadOptimizerEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: ReadOptimizerEngine was an orphan — built (186 LoC, 4 pure
 * methods, existing tests at __tests__/read-optimizer-engine.test.ts) but no
 * dispatcher reference.
 *
 * After this wire: 4 new prism_dev actions:
 *   read_optimize_recommend    — single-file strategy
 *   read_optimize_oneliner     — compact one-line recommendation string
 *   read_optimize_batch        — strategy[] for many files
 *   read_optimize_batch_cost   — {total, optimized, savings} for many files
 *
 * Engine reads real filesystem (fs.statSync) — non-existent paths return
 * strategy="full" with reason="File not found on disk". This contract is
 * stable and the tests assert against it.
 *
 * Skip patterns (engine source): node_modules, .git/objects, dist, .min.js,
 * .min.css, .map, package-lock.json, yarn.lock, pnpm-lock.yaml.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-READ-OPT
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
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × ReadOptimizerEngine wire (U-ORPHAN-RESCUE-READ-OPT)", () => {
  // ── skip patterns ──────────────────────────────────────────────────────
  it("recommend — node_modules path → strategy 'skip' (zero tokens)", async () => {
    const r = await call(server, "read_optimize_recommend", { file_path: "/project/node_modules/foo/index.js" });
    expect(r.ok).toBe(true);
    expect((r.data.recommendation as Record<string, unknown>).strategy).toBe("skip");
    expect((r.data.recommendation as Record<string, unknown>).estimatedTokens).toBe(0);
  });

  it("recommend — package-lock.json → strategy 'skip'", async () => {
    const r = await call(server, "read_optimize_recommend", { file_path: "/project/package-lock.json" });
    expect((r.data.recommendation as Record<string, unknown>).strategy).toBe("skip");
  });

  it("recommend — .min.js → strategy 'skip'", async () => {
    const r = await call(server, "read_optimize_recommend", { file_path: "/dist/bundle.min.js" });
    expect((r.data.recommendation as Record<string, unknown>).strategy).toBe("skip");
  });

  // ── non-existent path fallback ─────────────────────────────────────────
  it("recommend — non-existent path → strategy 'full' (engine documented fallback)", async () => {
    const r = await call(server, "read_optimize_recommend", { file_path: "/definitely/not/a/real/path/zzz.ts" });
    expect(r.ok).toBe(true);
    const rec = r.data.recommendation as Record<string, unknown>;
    expect(rec.strategy).toBe("full");
    expect(rec.reason).toBe("File not found on disk");
    // Documented constant cost when file missing
    expect(rec.estimatedTokens).toBe(500);
  });

  // ── known-large file routing (intent → grep, no intent → digest) ───────
  it("recommend — known-large file 'osg-tool-catalog.ts' with intent → grep", async () => {
    const r = await call(server, "read_optimize_recommend", {
      file_path: "H:/prism/mcp-server/src/data/osg-tool-catalog.ts",
      intent: "M10",
    });
    const rec = r.data.recommendation as Record<string, unknown>;
    expect(rec.strategy).toBe("grep");
    // Engine sets pattern param to the intent when grep is chosen
    expect((rec.params as Record<string, unknown>)?.pattern).toBe("M10");
  });

  it("recommend — known-large file WITHOUT intent → digest", async () => {
    const r = await call(server, "read_optimize_recommend", {
      file_path: "H:/prism/mcp-server/src/data/sandvik-tool-catalog.ts",
    });
    const rec = r.data.recommendation as Record<string, unknown>;
    expect(rec.strategy).toBe("digest");
  });

  // ── oneLiner format ────────────────────────────────────────────────────
  it("oneliner — returns 'STRATEGY: reason (~N tokens)' format", async () => {
    const r = await call(server, "read_optimize_oneliner", { file_path: "/project/node_modules/x/y.js" });
    expect(r.ok).toBe(true);
    const line = r.data.line as string;
    // Engine source line 148: `${rec.strategy.toUpperCase()}: ${rec.reason} (~${rec.estimatedTokens} tokens)`
    expect(line).toContain("SKIP:");
    expect(line).toContain("(~0 tokens)");
  });

  // ── batch recommend ────────────────────────────────────────────────────
  it("batch — recommends per file and preserves basename", async () => {
    const files = [
      "/project/node_modules/a.js",
      "/project/package-lock.json",
      "/definitely/not/real.ts",
    ];
    const r = await call(server, "read_optimize_batch", { files });
    expect(r.ok).toBe(true);
    const recs = r.data.recommendations as Array<Record<string, unknown>>;
    expect(recs.length).toBe(3);
    expect(recs[0].file).toBe("a.js");
    expect(recs[0].strategy).toBe("skip");
    expect(recs[1].file).toBe("package-lock.json");
    expect(recs[1].strategy).toBe("skip");
    expect(recs[2].file).toBe("real.ts");
    expect(recs[2].strategy).toBe("full");
  });

  // ── batch cost ─────────────────────────────────────────────────────────
  it("batch_cost — returns {total, optimized, savings} non-negative", async () => {
    const files = [
      "/project/node_modules/skip-this.js",          // skip → 0
      "/definitely/not/real.ts",                      // not found → optimized 500
    ];
    const r = await call(server, "read_optimize_batch_cost", { files });
    expect(r.ok).toBe(true);
    const cost = r.data.cost as Record<string, number>;
    expect(typeof cost.total).toBe("number");
    expect(typeof cost.optimized).toBe("number");
    expect(typeof cost.savings).toBe("number");
    expect(cost.savings).toBeGreaterThanOrEqual(0);
    // savings = max(0, total - optimized) — must satisfy the engine's invariant
    expect(cost.savings).toBe(Math.max(0, cost.total - cost.optimized));
  });

  // ── schema validation ─────────────────────────────────────────────────
  it("schema rejects empty file_path on recommend", async () => {
    const r = await call(server, "read_optimize_recommend", { file_path: "" });
    expect(r.ok).toBe(false);
  });

  it("schema rejects empty files array on batch", async () => {
    const r = await call(server, "read_optimize_batch", { files: [] });
    expect(r.ok).toBe(false);
  });

  it("schema rejects files.length > 500 on batch_cost (hard cap)", async () => {
    const files = Array.from({ length: 501 }, (_, i) => `/x${i}.ts`);
    const r = await call(server, "read_optimize_batch_cost", { files });
    expect(r.ok).toBe(false);
  });

  // ── all 4 actions accepted by registered enum ─────────────────────────
  it("all 4 read_optimize_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["read_optimize_recommend",  { file_path: "/x.ts" }],
      ["read_optimize_oneliner",   { file_path: "/x.ts" }],
      ["read_optimize_batch",      { files: ["/x.ts"] }],
      ["read_optimize_batch_cost", { files: ["/x.ts"] }],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
