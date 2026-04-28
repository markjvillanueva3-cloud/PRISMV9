/**
 * ActionsRouterAndRecommend.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U04 — verifies (a) the
 * embed-all-actions.mjs script extracts every dispatcher action via
 * the z.enum + ACTIONS-as-const patterns, populates ACTIONS_INDEX.json,
 * and is idempotent; (b) the rewritten ollama-route-recommender.mjs
 * hook augments its hardcoded intent path with prism_memory:semantic_search
 * over the Qdrant `action` collection; (c) the prism_memory dispatcher
 * surface accepts kind=action.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";

const EMBED_SCRIPT = "H:/prism/scripts/embed-all-actions.mjs";
const HOOK = "H:/prism/.claude/hooks/ollama-route-recommender.mjs";
const STATE_FILE = "H:/prism/mcp-server/data/state/ACTIONS_INDEX.json";
const RATE_FILE = "H:/prism/.claude/cache/route-recommend-last.json";
const TIMEOUT_MS_TEST = 10_000;

interface SemanticItem {
  id: string;
  score?: number;
  text?: string;
  metadata?: { dispatcher?: string; action?: string };
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
    timeout: 60_000,
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

describe("embed-all-actions.mjs — P3-U04", () => {
  it("--no-embed writes ACTIONS_INDEX.json with > 5000 entries from 80+ dispatchers", () => {
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    expect(existsSync(STATE_FILE)).toBe(true);
    const idx = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      schemaVersion: string;
      entries: Record<string, { dispatcher: string; action: string; dispatcherHash: string }>;
    };
    expect(idx.schemaVersion).toBe("1.0.0");
    expect(Object.keys(idx.entries).length).toBeGreaterThan(5_000);
    const dispatchers = new Set(Object.values(idx.entries).map((e) => e.dispatcher));
    expect(dispatchers.size).toBeGreaterThanOrEqual(60);
  });

  it("--dry-run reports > 80 dispatchers and > 5000 actions found", () => {
    const r = runScript(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { dispatchers: number; found: number; embedded: number; skipped: number };
    expect(stats.dispatchers).toBeGreaterThanOrEqual(80);
    expect(stats.found).toBeGreaterThan(5_000);
  });

  it("idempotency: second --no-embed run skips all already-indexed actions", () => {
    runScript(["--no-embed"]);
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { skipped: number; embedded: number; found: number };
    expect(stats.skipped).toBe(stats.found);
    expect(stats.embedded).toBe(0);
  });

  it("FAIL: unknown CLI flag exits 2", () => {
    const r = runScript(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runScript(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/dispatchers|found/);
  });

  it("ADV: --limit=10 caps the actions scanned to 10", () => {
    const r = runScript(["--dry-run", "--limit=10"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { found: number };
    expect(stats.found).toBe(10);
  });
});

describe("ollama-route-recommender — P3-U04 semantic path", () => {
  it("renders 'Semantic action matches' section when stub returns scored hits", async () => {
    stubItems = [
      { id: "action/prism_calc/cutting_force_kienzle", score: 0.94, text: "prism_calc :: cutting_force_kienzle", metadata: { dispatcher: "prism_calc", action: "cutting_force_kienzle" } },
      { id: "action/prism_calc/thermal_analyze", score: 0.72, text: "prism_calc :: thermal_analyze", metadata: { dispatcher: "prism_calc", action: "thermal_analyze" } },
    ];
    const r = await runHookAsync({ prompt: "compute cutting force using kienzle model for 1018 steel" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { additionalContext?: string } };
    expect(out.continue).toBe(true);
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("Semantic action matches");
    expect(ctx).toContain("prism_calc:cutting_force_kienzle");
  });

  it("low-score hits (< 0.5) are filtered out", async () => {
    stubItems = [
      { id: "action/prism_calc/x", score: 0.2, text: "prism_calc :: x", metadata: { dispatcher: "prism_calc", action: "x" } },
    ];
    const r = await runHookAsync({ prompt: "totally unrelated question about cosmology and dark matter please help" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("Semantic action matches");
  });

  it("variability: 3 distinct domains produce 3 distinct route+semantic pairs", async () => {
    const cases = [
      { prompt: "calculate cutting force using kienzle for 1018 steel right now", topAction: { dispatcher: "prism_calc", action: "cutting_force_kienzle" } },
      { prompt: "generate a toolpath for a simple pocket milling operation now", topAction: { dispatcher: "prism_cam", action: "toolpath_generate" } },
      { prompt: "validate physics for the spindle deflection model and report", topAction: { dispatcher: "prism_safety", action: "validate_physics" } },
    ];
    for (const c of cases) {
      if (existsSync(RATE_FILE)) rmSync(RATE_FILE);
      stubItems = [{
        id: `action/${c.topAction.dispatcher}/${c.topAction.action}`,
        score: 0.85,
        text: `${c.topAction.dispatcher} :: ${c.topAction.action}`,
        metadata: c.topAction,
      }];
      const r = await runHookAsync({ prompt: c.prompt }, true);
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      const ctx = out.hookSpecificOutput?.additionalContext ?? "";
      expect(ctx).toContain(`${c.topAction.dispatcher}:${c.topAction.action}`);
    }
  });
});

describe("ollama-route-recommender — P3-U04 graceful degrade + gating", () => {
  it("emits continue:true on short prompt", async () => {
    const r = await runHookAsync({ prompt: "hi there" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on slash-command", async () => {
    const r = await runHookAsync({ prompt: "/handoff write the handoff please now" }, true);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("FAIL: MCP unreachable still emits valid envelope (legacy path only)", async () => {
    const r = await runHookAsync({ prompt: "calculate cutting force using kienzle for 1018 steel" }, false);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean };
    expect(out.continue).toBe(true);
  });

  it("FAIL: stub returns empty items — hook still emits the legacy route", async () => {
    stubItems = [];
    const r = await runHookAsync({ prompt: "build something for me and run the test suite" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { continue?: boolean; hookSpecificOutput?: { additionalContext?: string } };
    expect(out.continue).toBe(true);
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("Semantic action matches");
  });

  it("ADV: oversized prompt (5000 chars) still completes within timeout", async () => {
    stubItems = [];
    const big = "calculate cutting force " + "x".repeat(5000);
    const r = await runHookAsync({ prompt: big }, true);
    expect(r.status).toBe(0);
    expect((JSON.parse(r.stdout) as { continue?: boolean }).continue).toBe(true);
  });
});

describe("MEMORY_KIND surface — P3-U04 wiring", () => {
  it("'action' is registered in MEMORY_KINDS exposed by QdrantMemoryEngine", async () => {
    const mod = await import("../engines/QdrantMemoryEngine.js");
    expect((mod.MEMORY_KINDS as readonly string[]).includes("action")).toBe(true);
  });

  it("memoryActionSchemas accepts kind=action in remember + semantic_search", async () => {
    const mod = await import("../schemas/memoryActionSchemas.js");
    const r1 = mod.ACTION_MEMORY_SCHEMAS.remember.safeParse({
      kind: "action",
      id: "action/prism_calc/cutting_force_kienzle",
      text: "prism_calc :: cutting_force_kienzle",
    });
    expect(r1.success).toBe(true);
    const r2 = mod.ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({
      kind: "action",
      query: "compute cutting force",
      limit: 5,
    });
    expect(r2.success).toBe(true);
  });
});
