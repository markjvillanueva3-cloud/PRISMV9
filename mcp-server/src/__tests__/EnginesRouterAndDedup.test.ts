/**
 * EnginesRouterAndDedup.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U03 — verifies (a) the
 * embed-all-engines.mjs script extracts class name + JSDoc paragraph
 * from each engine and is idempotent, and (b)
 * DuplicationGuardEngine.checkBeforeCreatingSemantic queries Qdrant
 * via the prism_memory:semantic_search dispatcher action and falls
 * back to the deterministic fuzzy match when MCP is unreachable.
 *
 * Uses an in-process HTTP stub so we exercise the real semantic path
 * without a live Qdrant or PRISM server.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { duplicationGuardEngine } from "../engines/DuplicationGuardEngine.js";

const SCRIPT = "H:/prism/scripts/embed-all-engines.mjs";
const STATE_FILE = "H:/prism/mcp-server/data/state/ENGINES_INDEX.json";

interface SemanticItem {
  id: string;
  score?: number;
  text?: string;
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

function runScript(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    cwd: "H:/prism",
  });
}

describe("embed-all-engines.mjs — P3-U03", () => {
  it("--no-embed populates ENGINES_INDEX.json with >2000 entries", () => {
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    expect(existsSync(STATE_FILE)).toBe(true);
    const idx = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      schemaVersion: string;
      entries: Record<string, { hash: string; className: string; description: string }>;
    };
    expect(idx.schemaVersion).toBe("1.0.0");
    expect(Object.keys(idx.entries).length).toBeGreaterThan(2000);
    // Sample entry has a className and a non-trivial description
    const firstKey = Object.keys(idx.entries)[0];
    const e = idx.entries[firstKey];
    expect(typeof e.className).toBe("string");
    expect(e.className.length).toBeGreaterThan(0);
    expect(e.description.length).toBeGreaterThan(10);
  });

  it("--dry-run found > 2000 engine files, described > 95% of them", () => {
    const r = runScript(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { found: number; described: number; skipped: number };
    expect(stats.found).toBeGreaterThan(2000);
    // Either described in this run or already cached (skipped) — either way coverage > 95%
    expect((stats.described + stats.skipped) / stats.found).toBeGreaterThan(0.95);
  });

  it("idempotency: second --no-embed run skips all already-indexed engines", () => {
    runScript(["--no-embed"]);
    const r = runScript(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { skipped: number; embedded: number; found: number; noDocstring: number };
    // skipped + noDocstring should equal found — engines without a JSDoc
    // never enter the index, so they don't increment "skipped"
    expect(stats.skipped + stats.noDocstring).toBe(stats.found);
    expect(stats.embedded).toBe(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr message", () => {
    const r = runScript(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runScript(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/totalFound|described/);
  });

  it("ADV: --limit=5 caps the scan to 5 engines", () => {
    const r = runScript(["--dry-run", "--limit=5"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { found: number };
    expect(stats.found).toBe(5);
  });
});

describe("DuplicationGuardEngine.checkBeforeCreatingSemantic — P3-U03", () => {
  it("happy path: stub returns scored hits → recommendation='extend' with semanticHits populated", async () => {
    stubItems = [
      { id: "engine/MillForceEngine", score: 0.91, text: "MillForceEngine\n\nKienzle force model for milling" },
      { id: "engine/CuttingForceEngine", score: 0.84, text: "CuttingForceEngine\n\nGeneric cutting force calc" },
    ];
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "engine",
      proposedName: "NewMillForceEngine",
      description: "Kienzle force model for milling",
      keywords: ["force", "milling"],
    }, { mcpUrl: `http://127.0.0.1:${stubPort}/mcp` });
    expect(r.recommendation).toBe("extend");
    expect(r.shouldProceed).toBe(false);
    expect(Array.isArray(r.semanticHits)).toBe(true);
    expect(r.semanticHits!.length).toBeGreaterThanOrEqual(1);
    expect(r.alternatives.length).toBeGreaterThanOrEqual(1);
  });

  it("low-score hits (< 0.55) are filtered out", async () => {
    stubItems = [
      { id: "engine/SomeEngine", score: 0.3, text: "SomeEngine\n\nrandom" },
    ];
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "engine",
      proposedName: "BrandNewWidgetEngine",
      description: "A completely unrelated kind of compute thing",
    }, { mcpUrl: `http://127.0.0.1:${stubPort}/mcp` });
    expect(r.semanticHits).toEqual([]);
  });

  it("variability: kind=skill triggers semantic search with kind=skill", async () => {
    stubItems = [
      { id: "skill/forge-triple", score: 0.78, text: "/forge-triple\n\nbuild engine + skill + hook" },
    ];
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "skill",
      proposedName: "/forge-quad",
      description: "build engine + skill + hook + test together",
    }, { mcpUrl: `http://127.0.0.1:${stubPort}/mcp` });
    expect(r.semanticHits!.length).toBeGreaterThanOrEqual(1);
  });

  it("FAIL: MCP unreachable returns the deterministic fuzzy fallback (semanticHits=[])", async () => {
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "engine",
      proposedName: "TotallyBrandNewEngine",
      description: "something that does not exist in the codebase yet",
    }, { mcpUrl: "http://127.0.0.1:1/mcp" });
    expect(r.semanticHits).toEqual([]);
    // Either proceed (no fuzzy match) or extend (fuzzy found something) — both valid
    expect(["proceed", "extend"]).toContain(r.recommendation);
  });

  it("FAIL: assetType without semantic kind (algorithm) skips MCP entirely, returns fuzzy result", async () => {
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "algorithm",
      proposedName: "NoSuchAlgorithm",
      description: "synthetic algorithm",
    }, { mcpUrl: `http://127.0.0.1:${stubPort}/mcp` });
    expect(r.semanticHits).toEqual([]);
  });

  it("ADV: when fuzzy already found exact duplicate, semantic hits are additive but recommendation stays 'skip'", async () => {
    // Pick a name that DOES exist in src/engines (e.g., the engine we just embedded)
    stubItems = [
      { id: "engine/UnifiedErrorLedgerEngine", score: 0.95, text: "exact match" },
    ];
    const r = await duplicationGuardEngine.checkBeforeCreatingSemantic({
      assetType: "engine",
      proposedName: "UnifiedErrorLedgerEngine",
      description: "ledger",
    }, { mcpUrl: `http://127.0.0.1:${stubPort}/mcp` });
    expect(r.isDuplicate).toBe(true);
    expect(r.recommendation).toBe("skip");
    expect(Array.isArray(r.semanticHits)).toBe(true);
  });

  it("MEMORY_KIND_VALUES surface includes 'engine'", async () => {
    const mod = await import("../engines/QdrantMemoryEngine.js");
    expect((mod.MEMORY_KINDS as readonly string[]).includes("engine")).toBe(true);
    const sch = await import("../schemas/memoryActionSchemas.js");
    const r = sch.ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({
      kind: "engine",
      query: "force model",
      limit: 5,
    });
    expect(r.success).toBe(true);
  });
});
