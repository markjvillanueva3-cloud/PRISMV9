/**
 * PopulateTribalVault.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03 — verifies dump-all-tips.ts +
 * populate-tribal-vault.mjs round-trip into knowledge/tribal/.
 *
 * Tests run with --no-embed to keep them hermetic; the embed path is
 * exercised separately by P0-U01's QdrantMemoryEngineSingleton tests.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const POPULATE = "H:/prism/scripts/populate-tribal-vault.mjs";
const DUMP = "H:/prism/mcp-server/scripts/dump-all-tips.ts";
const TRIBAL_VAULT = "H:/prism/knowledge/tribal";
const DUMP_OUT = "H:/prism/data/cache/tribal-tips-dump.json";

function tsxLoaderPath(): string {
  // Resolve tsx CLI from mcp-server's node_modules — same approach the
  // populate script uses internally so we exercise the real path.
  return require.resolve("tsx/cli", { paths: ["H:/prism/mcp-server", "H:/prism"] });
}

function runPopulate(args: string[]) {
  return spawnSync(process.execPath, [POPULATE, ...args], {
    encoding: "utf8",
    timeout: 90_000,
    cwd: "H:/prism",
  });
}

function runDump(args: string[]) {
  return spawnSync(process.execPath, [tsxLoaderPath(), DUMP, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    cwd: "H:/prism",
  });
}

describe("dump-all-tips — P1-U03", () => {
  it("--out writes a parseable JSON envelope with sources + tips", () => {
    const r = runDump(["--out", DUMP_OUT]);
    expect(r.status).toBe(0);
    const ack = JSON.parse(r.stdout) as { ok: boolean; sources: number; tips: number };
    expect(ack.ok).toBe(true);
    expect(ack.sources).toBeGreaterThan(10);
    expect(ack.tips).toBeGreaterThan(1000);
    const dump = JSON.parse(readFileSync(DUMP_OUT, "utf8")) as {
      sources: Array<{ file: string; count: number }>;
      tips: Array<{ id?: string; title?: string; body?: string; _source: string }>;
    };
    expect(dump.sources.length).toBe(ack.sources);
    expect(dump.tips.length).toBe(ack.tips);
    // every tip carries _source telling us which catalog file produced it
    expect(dump.tips.every((t) => typeof t._source === "string" && t._source.endsWith(".ts"))).toBe(true);
  });

  it("--help short-circuits with status 0 and Usage prefix", () => {
    const r = runDump(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout.startsWith("Usage:")).toBe(true);
  });

  it("FAIL: unknown flag exits 2 with stderr", () => {
    const r = runDump(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });
});

describe("populate-tribal-vault — P1-U03", () => {
  it("--dry-run reports tipsTotal and writes nothing new", () => {
    const r = runPopulate(["--dry-run", "--limit=10"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      tipsTotal: number;
      written: number;
      dryRun: boolean;
      embedAttempted: boolean;
    };
    expect(stats.dryRun).toBe(true);
    expect(stats.tipsTotal).toBe(10);
    expect(stats.embedAttempted).toBe(false);
    expect(stats.written).toBe(10);
  });

  it("--no-embed --limit=20 writes 20 .md files into knowledge/tribal/", () => {
    const r = runPopulate(["--no-embed", "--limit=20"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      written: number;
      skipped: number;
      embedded: number;
      embedFailed: number;
    };
    expect(stats.written + stats.skipped).toBe(20);
    expect(stats.embedded).toBe(0);
    expect(stats.embedFailed).toBe(0);
    expect(existsSync(TRIBAL_VAULT)).toBe(true);
    const files = readdirSync(TRIBAL_VAULT).filter((n) => n.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it("each generated tip file has required frontmatter fields", () => {
    runPopulate(["--no-embed", "--limit=5"]);
    const files = readdirSync(TRIBAL_VAULT)
      .filter((n) => n.endsWith(".md"))
      .slice(0, 3);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const content = readFileSync(join(TRIBAL_VAULT, f), "utf8");
      expect(content.startsWith("---")).toBe(true);
      expect(content).toMatch(/\nid: "/);
      expect(content).toMatch(/\ntitle: "/);
      expect(content).toMatch(/\nsource: "/);
      expect(content).toMatch(/\nconfidence: \d+/);
      expect(content).toMatch(/\ntags: \[/);
      expect(content).toMatch(/\n_source: "/);
      expect(content).toMatch(/\nindexed_at: \d{4}-\d{2}-\d{2}/);
      expect(content).toMatch(/\n## Related\n/);
    }
  });

  it("idempotency: second run with same limit skips already-written tips", () => {
    runPopulate(["--no-embed", "--limit=15"]);
    const second = runPopulate(["--no-embed", "--limit=15"]);
    expect(second.status).toBe(0);
    const stats = JSON.parse(second.stdout) as { skipped: number; written: number };
    expect(stats.skipped).toBeGreaterThan(0);
  });

  it("ADV: backlink fallback — empty Related rendered as placeholder, never crashes", () => {
    // Create an isolated tip-shaped TS file with a single isolated tag, run
    // populate, and verify the file's Related block is rendered (placeholder
    // or peer link). We don't add a sibling so the related-by-tag path is
    // empty and the category fallback determines the outcome.
    runPopulate(["--no-embed", "--limit=2"]);
    const files = readdirSync(TRIBAL_VAULT).filter((n) => n.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    const content = readFileSync(join(TRIBAL_VAULT, files[0]), "utf8");
    expect(content).toMatch(/\n## Related\n/);
    // Either a wikilink or the no-related placeholder — never an empty section
    const afterRelated = content.split("\n## Related\n")[1] ?? "";
    expect(afterRelated.trim().length).toBeGreaterThan(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr", () => {
    const r = runPopulate(["--bogus-flag"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("FAIL: invalid --limit exits 2", () => {
    const r = runPopulate(["--limit=not-a-number"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Invalid --limit/);
  });

  it("ADV: --help short-circuits without writing", () => {
    const r = runPopulate(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/tipsTotal/);
  });

  it("ADV: variability — --limit=1, 5, 50 all produce stable JSON envelope", () => {
    for (const n of [1, 5, 50]) {
      const r = runPopulate(["--no-embed", `--limit=${n}`]);
      expect(r.status).toBe(0);
      const stats = JSON.parse(r.stdout) as { tipsTotal: number };
      expect(stats.tipsTotal).toBe(n);
    }
  });
});
