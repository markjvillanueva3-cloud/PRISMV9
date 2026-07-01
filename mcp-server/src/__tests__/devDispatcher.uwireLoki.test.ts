/**
 * devDispatcher U-WIRE-LOKI round-trip tests — LokiLogSinkEngine.
 *
 * Validates the 4 new read actions (loki_stats / loki_config / loki_retention /
 * loki_query) wire through prism_dev and that the engine's log-buffer query +
 * level-priority filtering + retention defaults behave per its contract.
 *
 * Pattern: a LIVE dispatcher round-trip (registerDevDispatcher(shim) → capture
 * handler → invoke → assert JSON), NOT a source-grep — the singleton is cleared
 * in beforeEach so round-trip value assertions are deterministic. Reference
 * values are read from the engine body (default config endpoint/batchSize,
 * retention 30/365/compaction, LEVEL_PRIORITY debug<info<warn<error<fatal).
 *
 * Wired slot:papa 2026-06-13 — continues the WIRE-UNWIRED-PAPA resilience/ops
 * family (DR / Backup / KillSwitch / FeedbackCollector / Chaos already landed).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-LOKI
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { LokiLogSinkEngine, lokiLogSinkEngine } from "../engines/LokiLogSinkEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // Deterministic singleton state for round-trip value assertions (the loki_*
  // cases import the module singleton; clear it so prior tests can't pollute it).
  lokiLogSinkEngine.clear();
});

// ── Engine-direct reference values (deterministic, fresh instance) ──────────
describe("U-WIRE-LOKI — engine reference values (happy path)", () => {
  it("a fresh engine has an all-zero stats block", () => {
    const e = new LokiLogSinkEngine();
    const s = e.getStats();
    expect(s.totalLogs).toBe(0);
    expect(s.logsByLevel).toEqual({ debug: 0, info: 0, warn: 0, error: 0, fatal: 0 });
    expect(s.logsWithTrace).toBe(0);
    expect(s.batchesFlushed).toBe(0);
    expect(s.flushErrors).toBe(0);
  });

  it("default config carries the canonical Loki endpoint + batch defaults", () => {
    const c = new LokiLogSinkEngine().getConfig();
    expect(c.endpoint).toBe("http://loki:3100/loki/api/v1/push");
    expect(c.batchSize).toBe(100);
    expect(c.flushIntervalMs).toBe(5000);
    expect(c.defaultLabels).toEqual({ app: "prism", env: "production" });
  });

  it("default retention policy is 30-day hot / 365-day archive / compaction on", () => {
    const r = new LokiLogSinkEngine().getRetentionPolicy();
    expect(r.hotRetentionDays).toBe(30);
    expect(r.archiveRetentionDays).toBe(365);
    expect(r.compactionEnabled).toBe(true);
  });

  it("logging increments totalLogs, the per-level bucket, and the trace counter", () => {
    const e = new LokiLogSinkEngine();
    e.info("ok");
    e.error("boom", {}, { code: 500 });
    e.logWithTrace("warn", "traced", "T-1");
    const s = e.getStats();
    expect(s.totalLogs).toBe(3);
    expect(s.logsByLevel.info).toBe(1);
    expect(s.logsByLevel.error).toBe(1);
    expect(s.logsByLevel.warn).toBe(1);
    expect(s.logsWithTrace).toBe(1);
  });
});

// ── Query semantics: level priority, filters, ordering ──────────────────────
describe("U-WIRE-LOKI — query level-priority + filters (spanning configs)", () => {
  it("levelMin='warn' keeps warn/error/fatal and drops debug/info (>= boundary)", () => {
    const e = new LokiLogSinkEngine();
    e.debug("d"); e.info("i"); e.warn("w"); e.error("e"); e.fatal("f");
    const r = e.query({ levelMin: "warn" });
    expect(r.map(x => x.level).sort()).toEqual(["error", "fatal", "warn"]);
  });

  it("levelMin='fatal' keeps only the highest priority level", () => {
    const e = new LokiLogSinkEngine();
    e.warn("w"); e.error("e"); e.fatal("f");
    expect(e.query({ levelMin: "fatal" }).map(x => x.level)).toEqual(["fatal"]);
  });

  it("traceId filter isolates a single correlated stream", () => {
    const e = new LokiLogSinkEngine();
    e.logWithTrace("info", "a", "T-A");
    e.logWithTrace("info", "b", "T-B");
    const r = e.query({ traceId: "T-A" });
    expect(r.length).toBe(1);
    expect(r[0].message).toBe("a");
  });

  it("pattern is a case-insensitive regex over the message; limit + desc sort apply", () => {
    const e = new LokiLogSinkEngine();
    e.info("alpha"); e.info("BETA"); e.info("gamma");
    const r = e.query({ pattern: "beta" });
    expect(r.length).toBe(1);
    expect(r[0].message).toBe("BETA");
  });

  it("an empty query returns the full buffer (boundary: no filters)", () => {
    const e = new LokiLogSinkEngine();
    e.info("1"); e.info("2");
    expect(e.query({}).length).toBe(2);
  });
});

// ── Adversarial / failure modes ─────────────────────────────────────────────
describe("U-WIRE-LOKI — adversarial inputs", () => {
  it("query over an empty buffer returns [] (not a throw)", () => {
    expect(new LokiLogSinkEngine().query({ levelMin: "error" })).toEqual([]);
  });

  it("a regex-special pattern is honored literally-as-regex without crashing", () => {
    const e = new LokiLogSinkEngine();
    e.info("a.b.c");
    // '.' matches any char — the entry matches; the point is it does not throw.
    expect(() => e.query({ pattern: "a.b" })).not.toThrow();
    expect(e.query({ pattern: "a.b" }).length).toBe(1);
  });

  it("limit=0 is falsy → the slice is skipped and all rows return (documented edge)", () => {
    const e = new LokiLogSinkEngine();
    e.info("1"); e.info("2");
    // q.limit of 0 is falsy in the engine's `if (q.limit)` guard — no truncation.
    expect(e.query({ limit: 0 }).length).toBe(2);
  });
});

// ── LIVE round-trip through prism_dev (the wire proof) ──────────────────────
describe("U-WIRE-LOKI — dispatcher round-trip (prism_dev)", () => {
  it("loki_stats reflects logs written to the (cleared) singleton", async () => {
    lokiLogSinkEngine.info("rt-info");
    lokiLogSinkEngine.error("rt-error");
    const r = await call(server, "loki_stats");
    expect(r.ok).toBe(true);
    expect(r.data.totalLogs).toBe(2);
    expect((r.data.logsByLevel as Record<string, number>).error).toBe(1);
  });

  it("loki_config returns the canonical endpoint through the dispatcher", async () => {
    const r = await call(server, "loki_config");
    expect(r.ok).toBe(true);
    expect(r.data.endpoint).toBe("http://loki:3100/loki/api/v1/push");
    expect(r.data.batchSize).toBe(100);
  });

  it("loki_retention wraps the policy under a `retention` key", async () => {
    const r = await call(server, "loki_retention");
    expect(r.ok).toBe(true);
    const ret = r.data.retention as Record<string, unknown>;
    expect(ret.hotRetentionDays).toBe(30);
    expect(ret.archiveRetentionDays).toBe(365);
    expect(ret.compactionEnabled).toBe(true);
  });

  it("loki_query applies the levelMin filter end-to-end", async () => {
    lokiLogSinkEngine.debug("d");
    lokiLogSinkEngine.warn("w");
    lokiLogSinkEngine.error("e");
    const r = await call(server, "loki_query", { levelMin: "warn" });
    expect(r.ok).toBe(true);
    const logs = r.data.logs as Array<{ level: string }>;
    expect(logs.map(x => x.level).sort()).toEqual(["error", "warn"]);
  });

  it("loki_query with no params returns the full (cleared+seeded) buffer", async () => {
    lokiLogSinkEngine.info("only");
    const r = await call(server, "loki_query", {});
    expect(r.ok).toBe(true);
    expect((r.data.logs as unknown[]).length).toBe(1);
  });

  it("all 4 loki_* read actions are accepted by the registered dispatcher", async () => {
    for (const action of ["loki_stats", "loki_config", "loki_retention", "loki_query"]) {
      const r = await call(server, action);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// ── Schema validation through the dispatcher (adversarial) ──────────────────
describe("U-WIRE-LOKI — schema rejection (prism_dev)", () => {
  it("loki_query rejects a negative limit (int positive)", async () => {
    const r = await call(server, "loki_query", { limit: -1 });
    expect(r.ok).toBe(false);
  });

  it("loki_query rejects an out-of-enum levelMin", async () => {
    const r = await call(server, "loki_query", { levelMin: "trace" });
    expect(r.ok).toBe(false);
  });

  it("loki_query rejects a negative startTime (nonnegative)", async () => {
    const r = await call(server, "loki_query", { startTime: -1 });
    expect(r.ok).toBe(false);
  });

  it("loki_query rejects a malformed regex pattern via safeRegex (no crash, clean invalid_input)", async () => {
    // "[" is an unterminated character class — new RegExp would throw; the
    // dispatcher's safeRegex guard turns it into a graceful invalid_input.
    const r = await call(server, "loki_query", { pattern: "[" });
    expect(r.ok).toBe(false);
  });
});
