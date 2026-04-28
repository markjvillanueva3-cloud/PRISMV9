/**
 * OllamaSkillSuggesterAndEmbed.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U01 — verifies (a) the
 * embed-all-skills.mjs script walks both project and global skill
 * directories, builds a sha-keyed index, and is idempotent across
 * reruns; and (b) the rewritten ollama-skill-suggester.mjs hook
 * augments its hardcoded pattern path with prism_memory:semantic_search
 * over the Qdrant `skill` collection, gracefully degrading when MCP
 * is unreachable.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";

const EMBED_SCRIPT = "H:/prism/scripts/embed-all-skills.mjs";
const HOOK = "H:/prism/.claude/hooks/ollama-skill-suggester.mjs";
const INDEX_FILE = "H:/prism/mcp-server/data/state/SKILLS_INDEX.json";
const RATE_FILE = "H:/prism/.claude/cache/skill-suggester-last.json";
const TIMEOUT_MS_TEST = 10_000;

interface SemanticItem {
  id: string;
  kind?: string;
  text?: string;
  score?: number;
  metadata?: Record<string, unknown>;
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

function runScript(args: string[]) {
  return spawnSync(process.execPath, [EMBED_SCRIPT, ...args], {
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

describe("embed-all-skills.mjs — P3-U01", () => {
  it("--dry-run discovers project + global skill directories with totalFound > 100", () => {
    const r = runScript(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      scopes: Array<{ scope: string; found: number }>;
      totalFound: number;
      dryRun: boolean;
    };
    expect(stats.dryRun).toBe(true);
    expect(stats.totalFound).toBeGreaterThan(100);
    const scopeNames = stats.scopes.map((s) => s.scope);
    expect(scopeNames).toContain("project");
    expect(scopeNames).toContain("global");
  });

  it("--no-embed populates the SKILLS_INDEX.json file", () => {
    if (existsSync(INDEX_FILE)) rmSync(INDEX_FILE);
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    expect(existsSync(INDEX_FILE)).toBe(true);
    const idx = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as { schemaVersion: string; hashes: Record<string, string> };
    expect(idx.schemaVersion).toBe("1.0.0");
    expect(Object.keys(idx.hashes).length).toBeGreaterThan(100);
  });

  it("idempotency: second --no-embed run skips all already-indexed skills", () => {
    runScript(["--no-embed"]);
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { totalEmbedded: number; totalSkipped: number; totalFound: number };
    expect(stats.totalSkipped).toBe(stats.totalFound);
    expect(stats.totalEmbedded).toBe(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr", () => {
    const r = runScript(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runScript(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/totalFound/);
  });
});

describe("ollama-skill-suggester — P3-U01 semantic path", () => {
  it("emits continue:true on short prompt (< 30 chars)", async () => {
    const r = await runHookAsync({ prompt: "hi" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on slash-command prompt", async () => {
    const r = await runHookAsync({ prompt: "/handoff please write the handoff now" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("renders 'Top semantic skill matches' section when stub returns scored hits", async () => {
    stubItems = [
      { id: "skill/project/forge-triple", kind: "skill", text: "/forge-triple\n\nbuild engine + skill + hook together", score: 0.93, metadata: { name: "/forge-triple" } },
      { id: "skill/project/forge", kind: "skill", text: "/forge\n\nfull brainstorm to execute", score: 0.71, metadata: { name: "/forge" } },
    ];
    const r = await runHookAsync({ prompt: "i need to build a new engine and wire it with tests and a hook" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { additionalContext?: string } };
    expect(out.continue).toBe(true);
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("Top semantic skill matches");
    expect(ctx).toContain("/forge-triple");
  });

  it("low-score hits (< 0.5) are filtered out", async () => {
    stubItems = [
      { id: "skill/project/x", kind: "skill", text: "/x\n\nlow signal", score: 0.2 },
    ];
    const r = await runHookAsync({ prompt: "completely unrelated prompt about cosmology and astrophysics" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("Top semantic skill matches");
  });

  it("variability: 3 distinct prompt domains all complete and return continue:true", async () => {
    stubItems = [{ id: "skill/project/y", kind: "skill", text: "/y\n\ngeneric", score: 0.75, metadata: { name: "/y" } }];
    const prompts = [
      "build a new engine with tests and dispatcher wiring please",
      "search and replace tribal knowledge in the codebase right now",
      "i want to debug a chatter issue across the lathe operations",
    ];
    for (const p of prompts) {
      if (existsSync(RATE_FILE)) rmSync(RATE_FILE);
      const r = await runHookAsync({ prompt: p }, true);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { continue?: boolean };
      expect(out.continue).toBe(true);
    }
  });
});

describe("ollama-skill-suggester — P3-U01 graceful degrade", () => {
  it("FAIL: MCP unreachable still emits continue:true (pattern path only)", async () => {
    const r = await runHookAsync({ prompt: "build engine then test the whole thing please" }, false);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });

  it("FAIL: stub returns empty items — hook returns continue:true with no semantic section", async () => {
    stubItems = [];
    const r = await runHookAsync({ prompt: "this is some perfectly normal long prompt about things that need attention" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("Top semantic skill matches");
  });

  it("ADV: large prompt (>5KB) processes within timeout", async () => {
    const big = "i want to do something repeatedly: " + "x".repeat(5000);
    stubItems = [];
    const r = await runHookAsync({ prompt: big }, true);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout) as { continue?: boolean }).continue).toBe(true);
  });
});

describe("MEMORY_KIND surface — P3-U01 wiring", () => {
  it("'skill' is registered in MEMORY_KINDS exposed by QdrantMemoryEngine", async () => {
    const mod = await import("../engines/QdrantMemoryEngine.js");
    expect((mod.MEMORY_KINDS as readonly string[]).includes("skill")).toBe(true);
  });

  it("memoryActionSchemas accepts kind=skill in remember + semantic_search", async () => {
    const mod = await import("../schemas/memoryActionSchemas.js");
    const r1 = mod.ACTION_MEMORY_SCHEMAS.remember.safeParse({
      kind: "skill",
      id: "skill/project/test",
      text: "/test\n\ntest skill",
    });
    expect(r1.success).toBe(true);
    const r2 = mod.ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({
      kind: "skill",
      query: "build engine",
      limit: 5,
    });
    expect(r2.success).toBe(true);
  });
});
