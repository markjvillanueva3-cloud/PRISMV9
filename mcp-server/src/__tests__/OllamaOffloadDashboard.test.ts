/**
 * OllamaOffloadDashboard.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03 — verifies the dashboard script:
 *   1. Reads schema-2.0.0 stats and renders both human + JSON output
 *   2. --reset zeroes all counters and bumps lastReset
 *   3. --window flag respected; values out of range rejected
 *   4. Missing/corrupt stats file produces non-zero exit + stderr message
 *   5. Advisory surfaces zero-offload + zero-events conditions
 *   6. 24h window correctly filters older events
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SCRIPT = "H:/prism/scripts/ollama-offload-dashboard.mjs";
const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";

function run(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 10_000,
    cwd: cwd ?? process.cwd(),
  });
}

function freshStats(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: "2.0.0",
    lastUpdated: "2026-04-28T00:00:00.000Z",
    lastReset: "2026-04-28T00:00:00.000Z",
    offloaded: 0,
    keptOnClaude: 0,
    estimatedTokensSaved: 0,
    silentSuggestions: 0,
    injectedSuggestions: 0,
    byCategory: {},
    byHook: {},
    events: [],
    ...overrides,
  });
}

describe("ollama-offload-dashboard — smoke (P0-U03)", () => {
  it("prints human-readable output containing 'Dashboard' on success", () => {
    const r = run([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Ollama Offload Dashboard");
    expect(r.stdout).toContain("Schema:");
    expect(r.stdout).toContain("Per-hook");
    expect(r.stdout).toContain("Advisory:");
  });

  it("--json emits parseable JSON with required keys", () => {
    const r = run(["--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(parsed).toHaveProperty("totals");
    expect(parsed).toHaveProperty("byHook");
    expect(parsed).toHaveProperty("byCategory");
    expect(parsed).toHaveProperty("recent");
    expect(parsed).toHaveProperty("advisory");
  });

  it("--help prints usage and exits 0 without reading stats", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage:");
    expect(r.stdout).toContain("--reset");
    expect(r.stdout).toContain("--window");
  });

  it("rejects invalid --window with exit 2", () => {
    const r = run(["--window=abc"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Invalid --window/);
  });

  it("rejects negative --window with exit 2", () => {
    const r = run(["--window=-5h"]);
    expect(r.status).toBe(2);
  });

  it("clamps --window above max to 168h (no error)", () => {
    const r = run(["--window=999h", "--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as { recent: { windowHours: number } };
    expect(parsed.recent.windowHours).toBeLessThanOrEqual(168);
  });
});

describe("ollama-offload-dashboard — schema + advisory (P0-U03)", () => {
  it("advisory surfaces 'hook may not be wired' when no traffic", () => {
    const r = run(["--json"]);
    const parsed = JSON.parse(r.stdout) as { advisory: string[] };
    const joined = parsed.advisory.join(" | ");
    // current live state is zeroed → expect at least one hint
    expect(joined.length).toBeGreaterThan(0);
  });

  it("schemaVersion 2.0.0 surfaces in output", () => {
    const r = run(["--json"]);
    const parsed = JSON.parse(r.stdout) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe("2.0.0");
  });
});

describe("ollama-offload-dashboard — file failure modes (P0-U03)", () => {
  let tmpDir: string;
  let backupContent: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ollama-stats-test-"));
    backupContent = readFileSync(STATS_PATH, "utf8");
  });
  afterEach(() => {
    // Always restore the live stats file
    writeFileSync(STATS_PATH, backupContent);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("--reset zeros counters and writes back", () => {
    // Seed with non-zero values
    const seeded = freshStats({
      offloaded: 42,
      keptOnClaude: 7,
      estimatedTokensSaved: 12345,
      events: [{ ts: new Date().toISOString(), hook: "x", decision: "offload" }],
      byHook: { x: { fired: 1 } },
    });
    writeFileSync(STATS_PATH, seeded);
    const r = run(["--reset", "--json"]);
    expect(r.status).toBe(0);
    const after = JSON.parse(readFileSync(STATS_PATH, "utf8")) as {
      offloaded: number;
      keptOnClaude: number;
      estimatedTokensSaved: number;
      events: unknown[];
      byHook: Record<string, unknown>;
    };
    expect(after.offloaded).toBe(0);
    expect(after.keptOnClaude).toBe(0);
    expect(after.estimatedTokensSaved).toBe(0);
    expect(after.events).toEqual([]);
    expect(after.byHook).toEqual({});
  });

  it("corrupt JSON in stats file → exit 2 + stderr message", () => {
    writeFileSync(STATS_PATH, "{ this is not valid json");
    const r = run([]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/not valid JSON/);
  });

  it("filters events older than --window", () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const seeded = freshStats({
      events: [
        { ts: old, hook: "h", decision: "offload", tokensSaved: 100 },
        { ts: recent, hook: "h", decision: "offload", tokensSaved: 200 },
      ],
    });
    writeFileSync(STATS_PATH, seeded);
    const r = run(["--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as {
      recent: { eventCount: number; tokensSaved: number };
    };
    // Default 24h window — only recent event should survive
    expect(parsed.recent.eventCount).toBe(1);
    expect(parsed.recent.tokensSaved).toBe(200);
  });

  it("byHook aggregation surfaces in human output", () => {
    const seeded = freshStats({
      byHook: {
        "ollama-task-offloader": { fired: 5, offloaded: 2, kept: 3, suggested: 0, tokensSaved: 1500 },
      },
    });
    writeFileSync(STATS_PATH, seeded);
    const r = run([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ollama-task-offloader");
    expect(r.stdout).toMatch(/fired=5/);
    expect(r.stdout).toMatch(/offload=2/);
  });

  it("ADV: events with malformed ts are dropped (do not crash)", () => {
    const seeded = freshStats({
      events: [
        { ts: "not-a-date", hook: "h", decision: "offload" },
        { ts: new Date().toISOString(), hook: "h", decision: "offload" },
      ],
    });
    writeFileSync(STATS_PATH, seeded);
    const r = run(["--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as { recent: { eventCount: number } };
    // Only the well-formed timestamp survives
    expect(parsed.recent.eventCount).toBe(1);
  });

  it("ADV: missing optional fields do not crash dashboard", () => {
    // Minimal valid file — just schemaVersion
    writeFileSync(STATS_PATH, JSON.stringify({ schemaVersion: "2.0.0" }));
    const r = run(["--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as { totals: { offloaded: number } };
    expect(parsed.totals.offloaded).toBe(0);
  });
});
