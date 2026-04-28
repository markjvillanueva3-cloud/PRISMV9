/**
 * GsdRouterAndRetrieve.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01 — verifies (a) the
 * chunk-gsd-vault.mjs script splits the three GSD source files by
 * `## ` headers, writes one .md per section to knowledge/gsd/ with
 * frontmatter, and is idempotent; and (b) the
 * gsd-section-retrieve.mjs UserPromptSubmit hook gates on GSD
 * keywords, queries Qdrant `gsd` collection via
 * prism_memory:semantic_search, and renders top-3 hits.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";

const CHUNKER = "H:/prism/scripts/chunk-gsd-vault.mjs";
const HOOK = "H:/prism/.claude/hooks/gsd-section-retrieve.mjs";
const VAULT = "H:/prism/knowledge/gsd";
const RATE_FILE = "H:/prism/.claude/cache/gsd-section-retrieve-last.json";
const TIMEOUT_MS_TEST = 8_000;

interface SemanticItem {
  id: string;
  score?: number;
  text?: string;
  metadata?: { source?: string; section?: string };
}

let stubServer: ReturnType<typeof createServer> | null = null;
let stubPort = 0;
let stubItems: SemanticItem[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    stubServer = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify({ ok: true, items: stubItems, count: stubItems.length }) }] },
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
  stubItems = [];
});

function runChunker(args: string[]) {
  return spawnSync(process.execPath, [CHUNKER, ...args], {
    encoding: "utf8",
    timeout: 30_000,
    cwd: "H:/prism",
  });
}

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

describe("chunk-gsd-vault.mjs — P4-U01", () => {
  it("--no-embed splits 3 GSD sources into >20 chunks under knowledge/gsd/", () => {
    const r = runChunker(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      bySource: Array<{ source: string; exists: boolean; chunks: number }>;
      totalChunks: number;
    };
    expect(stats.totalChunks).toBeGreaterThan(20);
    const sourceNames = stats.bySource.map((s) => s.source);
    expect(sourceNames).toContain("gsd_quick");
    expect(sourceNames).toContain("dev_protocol");
    expect(existsSync(VAULT)).toBe(true);
    const files = readdirSync(VAULT).filter((n) => n.endsWith(".md"));
    expect(files.length).toBeGreaterThan(20);
  });

  it("each chunk file has the required frontmatter fields", () => {
    runChunker(["--no-embed"]);
    const files = readdirSync(VAULT).filter((n) => n.endsWith(".md")).slice(0, 3);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const content = readFileSync(`${VAULT}/${f}`, "utf8");
      expect(content.startsWith("---")).toBe(true);
      expect(content).toMatch(/\nsource: (gsd_quick|dev_protocol|gsd_micro)/);
      expect(content).toMatch(/\nsection: /);
      expect(content).toMatch(/\nslug: /);
      expect(content).toMatch(/\nindexed_at: \d{4}-\d{2}-\d{2}/);
    }
  });

  it("idempotency: second --no-embed run reports skipped > 0", () => {
    runChunker(["--no-embed"]);
    const r = runChunker(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { totalSkipped: number; totalMirrored: number };
    expect(stats.totalSkipped).toBeGreaterThan(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr message", () => {
    const r = runChunker(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runChunker(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/totalChunks/);
  });

  it("ADV: --dry-run reports stats but writes no files (no skipped change)", () => {
    runChunker(["--no-embed"]);
    const baseFiles = readdirSync(VAULT).filter((n) => n.endsWith(".md")).length;
    const r = runChunker(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { dryRun: boolean };
    expect(stats.dryRun).toBe(true);
    const afterFiles = readdirSync(VAULT).filter((n) => n.endsWith(".md")).length;
    expect(afterFiles).toBe(baseFiles);
  });
});

describe("gsd-section-retrieve hook — P4-U01", () => {
  it("emits continue:true on prompt without GSD keywords", async () => {
    const r = await runHookAsync({ prompt: "what is the weather forecast in tokyo today" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on slash command (no injection)", async () => {
    const r = await runHookAsync({ prompt: "/handoff write the gsd handoff please" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on prompt under 15 chars", async () => {
    const r = await runHookAsync({ prompt: "gsd?" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("renders 'GSD top sections' when stub returns scored hits and prompt has GSD keyword", async () => {
    stubItems = [
      { id: "gsd/dev_protocol/buffer-equation", score: 0.91, text: "dev_protocol GSD — Buffer Equation\n\n## Buffer Equation\n\nThe buffer equation defines...", metadata: { source: "dev_protocol", section: "Buffer Equation" } },
      { id: "gsd/gsd_quick/evidence", score: 0.78, text: "gsd_quick GSD — Evidence\n\n## Evidence\n\nAlways gather evidence...", metadata: { source: "gsd_quick", section: "Evidence" } },
    ];
    const r = await runHookAsync({ prompt: "explain the gsd buffer equation in dev protocol" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("GSD top sections");
    expect(ctx).toContain("Buffer Equation");
    expect(ctx).toContain("[dev_protocol]");
  });

  it("variability: 3 distinct GSD-trigger prompts all reach the semantic path", async () => {
    const prompts = [
      "explain the gsd dev protocol buffer rules now",
      "what evidence does the gsd protocol require",
      "how do gates work in phase 0 of the gsd workflow",
    ];
    stubItems = [{ id: "gsd/test/x", score: 0.7, text: "x", metadata: { source: "test", section: "X" } }];
    for (const p of prompts) {
      if (existsSync(RATE_FILE)) rmSync(RATE_FILE);
      const r = await runHookAsync({ prompt: p }, true);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      const ctx = out.hookSpecificOutput?.additionalContext ?? "";
      expect(ctx).toContain("GSD top sections");
    }
  });

  it("rate limit: second invocation within 30s window returns continue:true (no injection)", async () => {
    stubItems = [{ id: "gsd/test/x", score: 0.7, text: "x", metadata: { source: "test", section: "X" } }];
    const r1 = await runHookAsync({ prompt: "the gsd buffer equation needs explanation" }, true);
    expect(r1.status).toBe(0);
    const r2 = await runHookAsync({ prompt: "how does the gsd evidence protocol work" }, true);
    expect(r2.status).toBe(0);
    expect(r2.stdout.trim()).toBe('{"continue":true}');
  });

  it("FAIL: MCP unreachable still emits continue:true (no crash)", async () => {
    const r = await runHookAsync({ prompt: "explain the gsd buffer equation in detail" }, false);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout) as { continue?: boolean }).continue).toBe(true);
  });

  it("ADV: low-score hits (< 0.5) are filtered out", async () => {
    stubItems = [{ id: "gsd/test/y", score: 0.3, text: "weak", metadata: { source: "test", section: "Y" } }];
    const r = await runHookAsync({ prompt: "do you know about the gsd evidence protocol" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("GSD top sections");
  });
});

describe("MEMORY_KIND surface — P4-U01 wiring", () => {
  it("'gsd' is registered in MEMORY_KINDS", async () => {
    const mod = await import("../engines/QdrantMemoryEngine.js");
    expect((mod.MEMORY_KINDS as readonly string[]).includes("gsd")).toBe(true);
  });

  it("memoryActionSchemas accepts kind=gsd in remember and semantic_search", async () => {
    const mod = await import("../schemas/memoryActionSchemas.js");
    const r1 = mod.ACTION_MEMORY_SCHEMAS.remember.safeParse({
      kind: "gsd",
      id: "gsd/test/x",
      text: "test",
    });
    expect(r1.success).toBe(true);
    const r2 = mod.ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({
      kind: "gsd",
      query: "buffer equation",
      limit: 3,
    });
    expect(r2.success).toBe(true);
  });
});
