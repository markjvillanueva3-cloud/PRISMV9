/**
 * OllamaObsidianRag.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U05 — verifies the
 * ollama-obsidian-rag UserPromptSubmit hook: trigger keyword
 * detection, vault scan, semantic_search MCP integration, rate
 * limiting, and graceful degrade when Ollama or MCP is unreachable.
 *
 * Uses async spawn + an in-process HTTP stub so the parent event
 * loop can service the child's fetch (matches the P2-U04 pattern).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createServer } from "node:http";

const HOOK = "H:/prism/.claude/hooks/ollama-obsidian-rag.mjs";
const RATE_FILE = "H:/prism/.claude/cache/obsidian-rag-last.json";
const TIMEOUT_MS_TEST = 10_000;

interface SemanticItem {
  id: string;
  kind?: string;
  text?: string;
  score?: number;
}

let stubServer: ReturnType<typeof createServer> | null = null;
let stubPort = 0;
let stubItemsByKind: Record<string, SemanticItem[]> = {};

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    stubServer = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        let kind = "note";
        try {
          const parsed = JSON.parse(body);
          kind = parsed?.params?.arguments?.params?.kind ?? "note";
        } catch { /* fallthrough */ }
        const items = stubItemsByKind[kind] ?? [];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify({ ok: true, items, count: items.length }) }] },
        }));
      });
    });
    stubServer.listen(0, "127.0.0.1", () => {
      const addr = stubServer!.address();
      if (typeof addr === "object" && addr) stubPort = addr.port;
      resolve();
    });
    stubServer.on("error", reject);
  });
});

afterAll(async () => {
  if (stubServer) await new Promise<void>((r) => stubServer!.close(() => r()));
});

beforeEach(() => {
  if (existsSync(RATE_FILE)) rmSync(RATE_FILE);
  stubItemsByKind = {};
});

function runHookAsync(payload: unknown, useStub: boolean): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const url = useStub ? `http://127.0.0.1:${stubPort}/mcp` : "http://127.0.0.1:1/mcp";
    const child = spawn(process.execPath, [HOOK], {
      env: { ...process.env, MCP_HTTP_URL: url },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    const timer = setTimeout(() => { child.kill(); resolve({ status: null, stdout, stderr }); }, TIMEOUT_MS_TEST);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
    child.stdin.write(typeof payload === "string" ? payload : JSON.stringify(payload));
    child.stdin.end();
  });
}

describe("ollama-obsidian-rag — P3-U05 trigger gating", () => {
  it("emits continue:true on empty stdin", async () => {
    const r = await runHookAsync("", false);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on malformed JSON stdin", async () => {
    const r = await runHookAsync("not-json{{", false);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on slash command (does not query memory)", async () => {
    const r = await runHookAsync({ prompt: "/handoff" }, false);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on prompt under 15 chars", async () => {
    const r = await runHookAsync({ prompt: "hi" }, false);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true when prompt has no memory keywords", async () => {
    const r = await runHookAsync({ prompt: "what is the weather forecast in tokyo today" }, false);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });
});

describe("ollama-obsidian-rag — P3-U05 memory recall path", () => {
  it("on memory keyword + reachable MCP, returns valid JSON envelope (continue:true)", async () => {
    stubItemsByKind = {
      rule: [{ id: "rule-1", kind: "rule", text: "Never inline Kienzle constants — import from physics/constants", score: 0.91 }],
      note: [{ id: "note-1", kind: "note", text: "We discussed feedrate optimization last session", score: 0.88 }],
      tip: [],
    };
    const r = await runHookAsync({ prompt: "do you remember the last time we discussed feedrate optimization?" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { hookEventName?: string; additionalContext?: string } };
    expect(out.continue).toBe(true);
    // Either Memory Recall (Ollama answered) or Memory Found (Ollama down) — both are valid happy outcomes
    if (out.hookSpecificOutput?.additionalContext) {
      const ctx = out.hookSpecificOutput.additionalContext;
      const hasInjection = ctx.includes("Memory Recall") || ctx.includes("Memory Found");
      expect(hasInjection).toBe(true);
    }
  });

  it("variability: 3 distinct memory-trigger prompts all process without crashing", async () => {
    const prompts = [
      "remember the previous feed rate setting?",
      "what was your preference for tribal knowledge format?",
      "why did you choose this approach last time?",
    ];
    for (const p of prompts) {
      if (existsSync(RATE_FILE)) rmSync(RATE_FILE);
      const r = await runHookAsync({ prompt: p }, true);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { continue?: boolean };
      expect(out.continue).toBe(true);
    }
  });

  it("rate limit: second invocation within window short-circuits to continue:true (no injection)", async () => {
    stubItemsByKind = { rule: [], note: [{ id: "note-x", kind: "note", text: "x", score: 0.5 }], tip: [] };
    // First call records the rate timestamp
    const r1 = await runHookAsync({ prompt: "remember our last decision about feedrate?" }, true);
    expect(r1.status).toBe(0);
    // Second call within 45s window must not produce an injection
    const r2 = await runHookAsync({ prompt: "and what did you say about preferences?" }, true);
    expect(r2.status).toBe(0);
    expect(r2.stdout.trim()).toBe('{"continue":true}');
  });
});

describe("ollama-obsidian-rag — P3-U05 graceful degrade", () => {
  it("FAIL: MCP unreachable still emits continue:true (vault scan only)", async () => {
    const r = await runHookAsync({ prompt: "do you remember the previous tribal knowledge tip?" }, false);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });

  it("FAIL: stub returns empty items for every kind — hook still completes cleanly", async () => {
    stubItemsByKind = { rule: [], note: [], tip: [] };
    const r = await runHookAsync({ prompt: "recall the last user preference we recorded" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });

  it("ADV: oversized prompt (5000 chars) still processes and returns continue:true", async () => {
    const big = "remember " + "x".repeat(5000);
    const r = await runHookAsync({ prompt: big }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });
});

describe("ollama-obsidian-rag — P3-U05 wiring", () => {
  it("hook is registered in .claude/settings.json under UserPromptSubmit", () => {
    const settings = JSON.parse(require("node:fs").readFileSync("H:/prism/.claude/settings.json", "utf8")) as {
      hooks?: Record<string, unknown>;
    };
    const stringified = JSON.stringify(settings);
    expect(stringified).toContain("ollama-obsidian-rag.mjs");
  });
});
