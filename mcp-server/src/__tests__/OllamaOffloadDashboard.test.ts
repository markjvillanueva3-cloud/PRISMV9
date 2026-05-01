/**
 * OllamaOffloadDashboard.test.ts
 *
 * Verifies INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03 deliverables:
 *  1. Stats schema is v2.0.0 with the expected top-level keys
 *  2. Dashboard CLI prints structured human + JSON output
 *  3. --window=Nh filter is honored (only events inside the window count)
 *  4. --reset zeros counters and clears recent events
 *  5. Advisory surfaces actionable warnings on degenerate states
 *  6. The committed stats file under mcp-server/data/state/ is reset (totals zeroed)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// __tests__ → src → mcp-server → repo-root → scripts/...
const SCRIPT_PATH = resolve(HERE, "..", "..", "..", "scripts", "ollama-offload-dashboard.mjs");
const COMMITTED_STATS = resolve(HERE, "..", "..", "data", "state", "ollama-offload-stats.json");

interface DashboardJsonOut {
  schemaVersion: string;
  resetAt: string;
  totals: { offloaded: number; keptOnClaude: number; tokensSaved: number; tokensSpent: number };
  window: { hours: number; totalEvents: number; byDecision: { offload: number; keep: number; suggest: number }; tokensSaved: number; tokensSpent: number };
  perHook: Array<{ hook: string; fired: number; offloaded: number; kept: number }>;
  advisory: string[];
}

function runScript(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [SCRIPT_PATH, ...args], { encoding: "utf8", timeout: 5_000 });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function makeTmpStats(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "prism-offload-stats-"));
  const path = join(dir, "ollama-offload-stats.json");
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const NOW = Date.now();
const ONE_HOUR_MS = 60 * 60 * 1000;

function seededStats(opts: { recentEvents: Array<{ ts: string; hook: string; decision: string; tokensSaved?: number; tokensSpent?: number }>; perHook?: Record<string, { fired: number; offloaded: number; kept: number; suggested?: number }>; totals?: { offloaded: number; keptOnClaude: number; tokensSaved: number; tokensSpent: number } }): unknown {
  return {
    schemaVersion: "2.0.0",
    resetAt: new Date(NOW - 30 * 24 * ONE_HOUR_MS).toISOString(),
    totals: opts.totals ?? { offloaded: 12, keptOnClaude: 4, tokensSaved: 9_500, tokensSpent: 1_200 },
    perHook: opts.perHook ?? {},
    recentEvents: opts.recentEvents,
    config: { maxRecentEvents: 1000, rollingWindowHours: 24, milestone: "INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03" },
  };
}

describe("ollama-offload-stats.json — committed file is v2.0.0 and zeroed by P0-U03", () => {
  it("has the expected schema version and shape", () => {
    expect(existsSync(COMMITTED_STATS)).toBe(true);
    const raw = readFileSync(COMMITTED_STATS, "utf8");
    const parsed = JSON.parse(raw) as DashboardJsonOut;
    expect(parsed.schemaVersion).toBe("2.0.0");
    expect(parsed.totals.offloaded).toBe(0);
    expect(parsed.totals.keptOnClaude).toBe(0);
    expect(parsed.totals.tokensSaved).toBe(0);
    expect(parsed.totals.tokensSpent).toBe(0);
    expect(Array.isArray((parsed as unknown as { recentEvents: unknown[] }).recentEvents)).toBe(true);
    expect((parsed as unknown as { recentEvents: unknown[] }).recentEvents.length).toBe(0);
    expect(typeof (parsed as unknown as { perHook: object }).perHook).toBe("object");
  });
});

describe("ollama-offload-dashboard CLI — JSON output", () => {
  it("emits structured JSON with totals + window + perHook + advisory", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        totals: { offloaded: 9, keptOnClaude: 3, tokensSaved: 5_000, tokensSpent: 800 },
        perHook: {
          "ollama-auto-router": { fired: 7, offloaded: 6, kept: 1, suggested: 0 },
          "code-explainer-bridge": { fired: 5, offloaded: 3, kept: 2, suggested: 0 },
        },
        recentEvents: [
          { ts: new Date(NOW - 1 * ONE_HOUR_MS).toISOString(), hook: "ollama-auto-router", decision: "offload", tokensSaved: 1_500 },
          { ts: new Date(NOW - 5 * ONE_HOUR_MS).toISOString(), hook: "ollama-auto-router", decision: "offload", tokensSaved: 800 },
          { ts: new Date(NOW - 30 * ONE_HOUR_MS).toISOString(), hook: "ollama-auto-router", decision: "keep" }, // outside default 24h
        ],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--json"]);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout) as DashboardJsonOut;
      expect(parsed.schemaVersion).toBe("2.0.0");
      expect(parsed.totals.offloaded).toBe(9);
      expect(parsed.totals.tokensSaved).toBe(5_000);
      expect(parsed.window.hours).toBe(24);
      expect(parsed.window.totalEvents).toBe(2); // only 2 events in last 24h
      expect(parsed.window.byDecision.offload).toBe(2);
      expect(parsed.window.tokensSaved).toBe(2_300); // 1500 + 800
      expect(parsed.perHook).toHaveLength(2);
      expect(parsed.perHook[0].hook).toBe("ollama-auto-router"); // sorted by fired desc
      expect(parsed.perHook[0].fired).toBe(7);
    } finally {
      tmp.cleanup();
    }
  });

  it("--window=48h widens the rolling window so older events count", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        recentEvents: [
          { ts: new Date(NOW - 2 * ONE_HOUR_MS).toISOString(), hook: "h1", decision: "offload", tokensSaved: 100 },
          { ts: new Date(NOW - 36 * ONE_HOUR_MS).toISOString(), hook: "h1", decision: "offload", tokensSaved: 100 },
        ],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");

      const r24 = runScript([`--path=${tmp.path}`, "--json"]);
      const r48 = runScript([`--path=${tmp.path}`, "--json", "--window=48h"]);
      expect(r24.status).toBe(0);
      expect(r48.status).toBe(0);
      const p24 = JSON.parse(r24.stdout) as DashboardJsonOut;
      const p48 = JSON.parse(r48.stdout) as DashboardJsonOut;
      expect(p24.window.totalEvents).toBe(1);
      expect(p48.window.totalEvents).toBe(2);
      expect(p48.window.tokensSaved).toBe(200);
    } finally {
      tmp.cleanup();
    }
  });

  it("--reset zeros totals + clears recentEvents in the target file", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({ recentEvents: [{ ts: new Date().toISOString(), hook: "h1", decision: "offload" }] });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--reset", "--json"]);
      expect(r.status).toBe(0);
      const ack = JSON.parse(r.stdout) as { ok: boolean; action: string; schemaVersion: string };
      expect(ack.ok).toBe(true);
      expect(ack.action).toBe("reset");
      expect(ack.schemaVersion).toBe("2.0.0");
      const post = JSON.parse(readFileSync(tmp.path, "utf8")) as DashboardJsonOut;
      expect(post.totals.offloaded).toBe(0);
      expect(post.totals.keptOnClaude).toBe(0);
      expect(post.totals.tokensSaved).toBe(0);
      expect(post.totals.tokensSpent).toBe(0);
      expect((post as unknown as { recentEvents: unknown[] }).recentEvents).toEqual([]);
    } finally {
      tmp.cleanup();
    }
  });
});

describe("ollama-offload-dashboard — advisory surface", () => {
  it("flags [empty] when totals are all zero", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        totals: { offloaded: 0, keptOnClaude: 0, tokensSaved: 0, tokensSpent: 0 },
        recentEvents: [],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--json"]);
      const parsed = JSON.parse(r.stdout) as DashboardJsonOut;
      expect(parsed.advisory.some((a) => a.startsWith("[empty]"))).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  it("flags [no-offload] when only keptOnClaude is positive", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        totals: { offloaded: 0, keptOnClaude: 30, tokensSaved: 0, tokensSpent: 60_000 },
        recentEvents: [],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--json"]);
      const parsed = JSON.parse(r.stdout) as DashboardJsonOut;
      expect(parsed.advisory.some((a) => a.startsWith("[no-offload]"))).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  it("flags [low-rate] when offload ratio under 30%", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        totals: { offloaded: 5, keptOnClaude: 95, tokensSaved: 1_000, tokensSpent: 50_000 },
        recentEvents: [{ ts: new Date(NOW - 1 * ONE_HOUR_MS).toISOString(), hook: "h", decision: "offload" }],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--json"]);
      const parsed = JSON.parse(r.stdout) as DashboardJsonOut;
      expect(parsed.advisory.some((a) => a.startsWith("[low-rate]"))).toBe(true);
    } finally {
      tmp.cleanup();
    }
  });

  it("returns no advisory when telemetry is healthy (offload ratio > 30%)", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({
        totals: { offloaded: 70, keptOnClaude: 30, tokensSaved: 10_000, tokensSpent: 1_000 },
        recentEvents: [{ ts: new Date(NOW - 1 * ONE_HOUR_MS).toISOString(), hook: "h", decision: "offload", tokensSaved: 200 }],
      });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`, "--json"]);
      const parsed = JSON.parse(r.stdout) as DashboardJsonOut;
      expect(parsed.advisory).toEqual([]);
    } finally {
      tmp.cleanup();
    }
  });
});

describe("ollama-offload-dashboard — human output", () => {
  it("default human output contains every section header", () => {
    const tmp = makeTmpStats();
    try {
      const stats = seededStats({ recentEvents: [] });
      writeFileSync(tmp.path, JSON.stringify(stats), "utf8");
      const r = runScript([`--path=${tmp.path}`]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("Ollama Offload Dashboard");
      expect(r.stdout).toContain("TOTALS");
      expect(r.stdout).toContain("ACTIVITY");
      expect(r.stdout).toContain("PER-HOOK FIRE COUNTS");
      expect(r.stdout).toContain("ADVISORY");
    } finally {
      tmp.cleanup();
    }
  });
});
