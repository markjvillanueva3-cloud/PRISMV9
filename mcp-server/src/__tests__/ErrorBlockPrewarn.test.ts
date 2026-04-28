/**
 * ErrorBlockPrewarn.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U04 — verifies the refactored
 * error-block-prewarn hook: it (a) still emits continue:true when no
 * past errors match, (b) renders a warning with vector neighbors when
 * the Qdrant query returns hits, (c) gracefully degrades to the local
 * pattern path when MCP is unreachable, and (d) never blocks.
 *
 * The test spins up an in-process HTTP stub on localhost:0 so we can
 * exercise the prism_guard:error_ledger_recall_similar path
 * deterministically — without depending on a live Qdrant or PRISM
 * server.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";

const HOOK = "H:/prism/.claude/hooks/error-block-prewarn.mjs";
const TIMEOUT_MS_TEST = 6_000;

interface StubHit {
  id: string;
  score?: number;
  signature?: string;
  source?: string;
  ts?: string;
}

let stubServer: ReturnType<typeof createServer> | null = null;
let stubPort = 0;
let stubMode: "hits" | "empty" | "error" = "empty";
let stubHits: StubHit[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    stubServer = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        if (stubMode === "error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }
        const payload = stubMode === "hits"
          ? { hits: stubHits, count: stubHits.length }
          : { hits: [], count: 0 };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
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

// Async spawn so the parent event loop stays free to service the stub
// HTTP server while the child hook runs (otherwise spawnSync blocks).
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
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

describe("error-block-prewarn — P2-U04 baseline behavior", () => {
  it("emits continue:true on empty stdin (no payload)", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "",
      encoding: "utf8",
      timeout: 4_000,
      env: { ...process.env, MCP_HTTP_URL: `http://127.0.0.1:1/mcp` },
    });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });

  it("emits continue:true on payload without tool", async () => {
    const r = await runHookAsync({ tool_input: { command: "x" } }, false);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout || "{}") as { continue?: boolean }).continue).toBe(true);
  });

  it("emits continue:true on malformed JSON stdin", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "garbage{{",
      encoding: "utf8",
      timeout: 4_000,
      env: { ...process.env, MCP_HTTP_URL: `http://127.0.0.1:1/mcp` },
    });
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout) as { continue?: boolean }).continue).toBe(true);
  });
});

describe("error-block-prewarn — P2-U04 vector neighbor injection", () => {
  it("renders 'Vector-similar past errors' section when Qdrant returns hits", async () => {
    stubMode = "hits";
    stubHits = [
      { id: "e-1", score: 0.92, signature: "Edit :: ts :: TS2322 Type mismatch", source: "hook_block", ts: "2026-04-26T12:00:00Z" },
      { id: "e-2", score: 0.81, signature: "Edit :: ts :: TS7053 implicit any", source: "learner", ts: "2026-04-25T08:00:00Z" },
    ];
    const r = await runHookAsync({
      tool_name: "Edit",
      tool_input: { file_path: "src/x.ts", content: "expect(true).toBeTruthy()" },
    }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { additionalContext?: string } };
    expect(out.continue).toBe(true);
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("Vector-similar past errors (Qdrant)");
    expect(ctx).toContain("TS2322 Type mismatch");
    expect(ctx).toContain("[hook_block]");
  });

  it("variability — renders different signatures for 3 distinct payloads", async () => {
    stubMode = "hits";
    const payloads = [
      { tool_name: "Edit", tool_input: { file_path: "a.ts", content: "TODO finish me" } },
      { tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } },
      { tool_name: "Write", tool_input: { file_path: "b.test.ts", content: "expect(false).toBeFalsy()" } },
    ];
    const sigs = ["A1", "B1", "C1"];
    for (let i = 0; i < payloads.length; i++) {
      stubHits = [{ id: `var-${i}`, score: 0.7, signature: `seen-${sigs[i]}`, source: "learner" }];
      const r = await runHookAsync(payloads[i], true);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      const ctx = out.hookSpecificOutput?.additionalContext ?? "";
      expect(ctx).toContain(`seen-${sigs[i]}`);
    }
  });

  it("emits continue:true with no warning when stub returns empty hits", async () => {
    stubMode = "empty";
    stubHits = [];
    const r = await runHookAsync({
      tool_name: "Edit",
      tool_input: { file_path: "src/clean.ts", content: "const x = 1;" },
    }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { additionalContext?: string } };
    expect(out.continue).toBe(true);
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("Vector-similar past errors");
  });
});

describe("error-block-prewarn — P2-U04 graceful degrade", () => {
  it("FAIL: MCP unreachable still emits continue:true (local path only)", async () => {
    const r = await runHookAsync({
      tool_name: "Edit",
      tool_input: { file_path: "src/x.ts", content: "TODO add docs" },
    }, false);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout || "{}") as { continue?: boolean }).continue).toBe(true);
  });

  it("FAIL: stub returns HTTP 500 — hook degrades gracefully", async () => {
    stubMode = "error";
    const r = await runHookAsync({
      tool_name: "Edit",
      tool_input: { file_path: "src/x.ts", content: "expect(false).toBeFalsy()" },
    }, true);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout || "{}") as { continue?: boolean }).continue).toBe(true);
  });

  it("ADV: large content payload (>10KB) still completes within timeout", async () => {
    stubMode = "empty";
    const big = "x".repeat(15_000);
    const r = await runHookAsync({
      tool_name: "Edit",
      tool_input: { file_path: "src/big.ts", content: big },
    }, true);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout || "{}") as { continue?: boolean }).continue).toBe(true);
  });

  it("ADV: empty content + missing file_path still completes (signature falls back)", async () => {
    stubMode = "empty";
    const r = await runHookAsync({
      tool_name: "Bash",
      tool_input: {},
    }, true);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout || "{}") as { continue?: boolean }).continue).toBe(true);
  });
});
