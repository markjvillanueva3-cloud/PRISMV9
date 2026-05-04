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
import { fileURLToPath } from "node:url";

// P4-U01-FOLLOWUP-2: resolve script + hook paths relative to THIS test's
// location so the tests exercise the worktree's own copies (not whatever
// version happens to live in canonical H:/prism). The chunker + hook still
// read/write under H:/prism via their internal hardcoded paths — that's the
// canonical knowledge vault, shared across all worktrees by design.
const CHUNKER = fileURLToPath(new URL("../../../scripts/chunk-gsd-vault.mjs", import.meta.url));
const HOOK = fileURLToPath(new URL("../../../.claude/hooks/gsd-section-retrieve.mjs", import.meta.url));
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

// P4-U01-FOLLOWUP-2: dispatcher static-source assertions ensure the
// `prism_memory:remember` action is wired (z.enum + switch case +
// qdrantMemoryEngine.remember call). The cherry-picked test only validated
// the Zod schema; without these, a missing dispatcher case would cause a
// silent runtime "Invalid enum value" on the chunker's first live embed.
describe("memoryDispatcher remember wiring — P4-U01-FOLLOWUP-2", () => {
  it("z.enum action list includes 'remember'", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../tools/dispatchers/memoryDispatcher.ts", import.meta.url);
    const src = await readFile(url, "utf8");
    const enumMatch = src.match(/action:\s*z\.enum\(\[([\s\S]*?)\]\)/);
    expect(enumMatch).not.toBeNull();
    const enumBody = enumMatch![1];
    expect(enumBody).toContain('"remember"');
    expect(enumBody).toContain('"semantic_search"');
    // 14 actions total post-FOLLOWUP-2: 9 graph/consolidation + 3 pressure + 2 vector
    const actionCount = (enumBody.match(/"[a-z_]+"/g) ?? []).length;
    expect(actionCount).toBe(14);
  });

  it("switch has case 'remember' that calls qdrantMemoryEngine.remember", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../tools/dispatchers/memoryDispatcher.ts", import.meta.url);
    const src = await readFile(url, "utf8");
    expect(src).toMatch(/case\s+"remember":/);
    expect(src).toMatch(/qdrantMemoryEngine\.remember\(\s*\{\s*kind\s*,\s*id\s*,\s*text\s*,\s*metadata\s*\}/);
    // Validates that all 4 schema fields flow from params to the engine call
    // — drift from the Zod schema in memoryActionSchemas.ts gets caught.
  });

  it("default 'available' array advertises 'remember'", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../tools/dispatchers/memoryDispatcher.ts", import.meta.url);
    const src = await readFile(url, "utf8");
    const m = src.match(/available:\s*\[([^\]]+)\]/);
    expect(m).not.toBeNull();
    const list = m![1];
    expect(list).toContain("'remember'");
    expect(list).toContain("'semantic_search'");
    const itemCount = (list.match(/'[a-z_]+'/g) ?? []).length;
    expect(itemCount).toBe(14);
  });
});

// P4-U01-FOLLOWUP-2: hook prefers structural metadata.body_preview over
// positional text.split(2). Both paths (preferred + fallback) are asserted.
describe("gsd-section-retrieve snippet contract — P4-U01-FOLLOWUP-2", () => {
  it("prefers metadata.body_preview when present", async () => {
    stubItems = [
      {
        id: "gsd/dev_protocol/structural-snippet",
        score: 0.85,
        // text payload is intentionally weird — the hook should NOT parse it
        // because metadata.body_preview is present and structural.
        text: "TOTALLY UNRELATED HEADER PAYLOAD\nthis line should never appear in snippet",
        metadata: {
          source: "dev_protocol",
          section: "Structural Snippet",
          body_preview: "STRUCTURAL_PREVIEW_MARKER body content from chunker metadata field",
        },
      },
    ];
    const r = await runHookAsync({ prompt: "tell me about gsd dev protocol structural snippet behavior" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("STRUCTURAL_PREVIEW_MARKER");
    expect(ctx).not.toContain("UNRELATED HEADER PAYLOAD");
    expect(ctx).not.toContain("this line should never appear");
  });

  it("falls back to text.split when body_preview missing (legacy embeds)", async () => {
    stubItems = [
      {
        id: "gsd/legacy/x",
        score: 0.78,
        // legacy shape: ${source} GSD — ${heading}\n\n${body}
        text: "gsd_quick GSD — Legacy\n\nLEGACY_BODY_MARKER older embedding body line one",
        metadata: { source: "gsd_quick", section: "Legacy" }, // NO body_preview
      },
    ];
    const r = await runHookAsync({ prompt: "explain the gsd legacy buffer equation evidence" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("LEGACY_BODY_MARKER");
    expect(ctx).toContain("[gsd_quick]");
    expect(ctx).toContain("**Legacy**");
  });

  it("treats body_preview wrong type as missing and falls through to text.split", async () => {
    stubItems = [
      {
        id: "gsd/wrong-type/x",
        score: 0.82,
        text: "gsd_micro GSD — Wrong Type\n\nFALLBACK_OK body when metadata field has wrong type",
        // Adversarial: body_preview is a number, not a string — must be ignored
        metadata: { source: "gsd_micro", section: "Wrong Type", body_preview: 42 as unknown as string },
      },
    ];
    const r = await runHookAsync({ prompt: "gsd evidence buffer equation phase 1 protocol" }, true);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("FALLBACK_OK");
    expect(ctx).not.toContain("42");
  });
});

// P4-U01-FOLLOWUP-2: chunker emits body_preview in the metadata payload sent
// to prism_memory:remember. Static source-contract test — runtime capture
// against live chunker is fragile because the chunker's idempotent skip
// short-circuits when on-disk chunks match generated content (and the
// chunker has hardcoded H:/prism paths so we can't easily fixture). Asserting
// the script source structurally locks the contract: any drift from the
// body_preview emission triggers a test failure that stays close to the
// behavior change. Combined with the hook test (preferring body_preview)
// the whole producer→Qdrant→consumer loop is covered.
describe("chunk-gsd-vault body_preview contract — P4-U01-FOLLOWUP-2", () => {
  it("script source computes body_preview from ch.body (whitespace-collapsed, ≤200 chars)", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../../../scripts/chunk-gsd-vault.mjs", import.meta.url);
    const src = await readFile(url, "utf8");
    // The exact derivation: collapse all whitespace runs to single spaces,
    // trim, slice to 200 chars. Drift in any of these breaks the contract.
    expect(src).toMatch(/const\s+bodyPreview\s*=\s*ch\.body\.replace\(\s*\/\\s\+\/g\s*,\s*"\s"\s*\)\.trim\(\)\.slice\(0,\s*200\)/);
  });

  it("script source emits body_preview in tryEmbed metadata alongside source/section/slug", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../../../scripts/chunk-gsd-vault.mjs", import.meta.url);
    const src = await readFile(url, "utf8");
    // tryEmbed call must include all 4 metadata fields. Use a multiline match
    // anchored at tryEmbed( and require body_preview after source/section/slug.
    const tryEmbedMatch = src.match(/tryEmbed\(\s*id\s*,\s*text\s*,\s*\{([\s\S]*?)\}\s*\)/);
    expect(tryEmbedMatch).not.toBeNull();
    const metadataBody = tryEmbedMatch![1];
    expect(metadataBody).toMatch(/source\s*:\s*spec\.label/);
    expect(metadataBody).toMatch(/section\s*:\s*ch\.heading/);
    expect(metadataBody).toMatch(/slug\s*,?/);
    expect(metadataBody).toMatch(/body_preview\s*:\s*bodyPreview/);
  });

  it("script source still uses kind=gsd in tryEmbed (P4-U01 invariant)", async () => {
    const { readFile } = await import("node:fs/promises");
    const url = new URL("../../../scripts/chunk-gsd-vault.mjs", import.meta.url);
    const src = await readFile(url, "utf8");
    expect(src).toMatch(/action:\s*"remember"/);
    expect(src).toMatch(/kind:\s*"gsd"/);
  });
});
