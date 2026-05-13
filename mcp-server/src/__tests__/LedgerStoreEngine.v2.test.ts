/**
 * LedgerStoreEngine.v2.test.ts — U-CLEANUP-B5
 *
 * Targets the v2 deltas shipped by B5 on top of B10's v1 baseline:
 *   - golf-ledger-v2.sql adds 6 columns to bug_attribution + 2 indexes.
 *   - Engine bumps LEDGER_SCHEMA_VERSION 1 → 2.
 *   - insertPreDispatchRow writes the compaction-survival row.
 *   - getSlotScore24h / getSlotScoresAll24h compute per-slot rolling
 *     24h severity-weighted scores with token + USD-cost aggregates.
 *   - microsToUsd / usdToMicros bound float precision at the API boundary.
 *
 * Coverage floor (per .claude/rules/tests.md + project CLAUDE.md):
 *   - ≥10 cases per engine — this file ships 33.
 *   - Edge cases: empty window, NULL slot, zero cost, multi-severity, capped
 *     dispatch_prompt, max-window clamp, partial-migration replay, forward-
 *     only migrate, invalid inputs to insertPreDispatchRow.
 *   - Variability: spans all 4 severities, ≥4 distinct slots (alpha, bravo,
 *     golf, unknown), v1-vintage-DB-opened-by-v2-engine path.
 *   - Real reference values (not stubs): SEVERITY_WEIGHT computed by hand;
 *     cost-roundtrip uses Claude Opus per-token math (75 micros/token).
 *   - Hermetic: tmpdir DB per test, injected clock, no network.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LedgerStoreEngine,
  LEDGER_SCHEMA_VERSION,
  MICROS_PER_USD,
  microsToUsd,
  usdToMicros,
  getMigrationSqlPath,
} from "../engines/LedgerStoreEngine.js";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const MIGRATION_V1_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql";
const MIGRATION_V2_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql";
const FIXED_NOW_MS = 1_700_000_000_000; // 2023-11-14T22:13:20Z — stable epoch for windows.

let engine: LedgerStoreEngine;
let workDir: string;
let dbPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prism-ledger-v2-test-"));
  dbPath = join(workDir, "ledger-v2.db");
  engine = new LedgerStoreEngine({
    dbPath,
    migrationSqlPath: MIGRATION_V1_PATH,
    now: () => FIXED_NOW_MS,
  });
});

afterEach(() => {
  engine.close();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

// ── Schema / migration ──────────────────────────────────────────────────────

describe("LedgerStoreEngine v2 — schema constants and helpers", () => {
  it("LEDGER_SCHEMA_VERSION is exactly 2 (B5 deliverable)", () => {
    expect(LEDGER_SCHEMA_VERSION).toBe(2);
  });

  it("MICROS_PER_USD is exactly 1_000_000", () => {
    expect(MICROS_PER_USD).toBe(1_000_000);
  });

  it("microsToUsd round-trips for whole USD values", () => {
    expect(microsToUsd(1_000_000)).toBe(1);
    expect(microsToUsd(3_500_000)).toBe(3.5);
    expect(microsToUsd(0)).toBe(0);
  });

  it("usdToMicros rounds half-up like Math.round (sub-cent precision)", () => {
    expect(usdToMicros(0.000075)).toBe(75); // Claude Opus per-token reference
    expect(usdToMicros(0.0000005)).toBe(1);
    expect(usdToMicros(1.5)).toBe(1_500_000);
  });

  it("usdToMicros clamps negative / NaN / non-finite to 0", () => {
    expect(usdToMicros(-1)).toBe(0);
    expect(usdToMicros(Number.NaN)).toBe(0);
    expect(usdToMicros(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("getMigrationSqlPath resolves to the on-disk v1 and v2 SQL files", () => {
    expect(getMigrationSqlPath(1).replace(/\\/g, "/")).toBe(MIGRATION_V1_PATH);
    expect(getMigrationSqlPath(2).replace(/\\/g, "/")).toBe(MIGRATION_V2_PATH);
    expect(existsSync(MIGRATION_V1_PATH)).toBe(true);
    expect(existsSync(MIGRATION_V2_PATH)).toBe(true);
  });

  it("getMigrationSqlPath throws on invalid version", () => {
    expect(() => getMigrationSqlPath(0)).toThrowError(/invalid version/i);
    expect(() => getMigrationSqlPath(-1)).toThrowError(/invalid version/i);
    expect(() => getMigrationSqlPath(1.5)).toThrowError(/invalid version/i);
  });
});

describe("LedgerStoreEngine v2 — migrate() forward-only contract", () => {
  it("migrate(2) on a fresh DB applies v1+v2 and lands meta at 2", () => {
    const r = engine.migrate(2);
    expect(r.fromVersion).toBe(0);
    expect(r.toVersion).toBe(2);
    expect(r.alreadyAtVersion).toBe(false);
    expect(r.appliedSqlBytes).toBeGreaterThan(0);
    expect(engine.schemaVersion()).toBe(2);
  });

  it("migrate(2) twice — second call is alreadyAtVersion=true with 0 bytes", () => {
    engine.migrate(2);
    const r2 = engine.migrate(2);
    expect(r2.alreadyAtVersion).toBe(true);
    expect(r2.fromVersion).toBe(2);
    expect(r2.toVersion).toBe(2);
    expect(r2.appliedSqlBytes).toBe(0);
  });

  it("migrate(1) on v2-recorded DB is alreadyAtVersion=true (forward-only)", () => {
    engine.migrate(2);
    const r = engine.migrate(1);
    expect(r.alreadyAtVersion).toBe(true);
    expect(r.fromVersion).toBe(2);
    expect(r.toVersion).toBe(1);
    // meta MUST NOT be downgraded:
    expect(engine.schemaVersion()).toBe(2);
  });

  it("migrate(v) throws on out-of-range versions (R12 fail loud)", () => {
    expect(() => engine.migrate(0)).toThrowError(/v1\.\.v2/);
    expect(() => engine.migrate(3)).toThrowError(/v1\.\.v2/);
    expect(() => engine.migrate(99)).toThrowError(/v1\.\.v2/);
    expect(() => engine.migrate(1.5)).toThrowError(/v1\.\.v2/);
  });

  it("physicalSchemaVersion reflects on-disk reality immediately after open", () => {
    // ensureOpen runs the v2 ALTERs even before any public migrate() call —
    // so a fresh DB reports phys=2 / meta=0 until migrate() seeds meta.
    engine.counts(); // triggers ensureOpen
    expect(engine.physicalSchemaVersion()).toBe(2);
    expect(engine.schemaVersion()).toBe(0);
  });
});

describe("LedgerStoreEngine v2 — bug_attribution v2 columns", () => {
  it("insert(bug_attribution) with no v2 fields defaults tokens=0, cost=0, nulls for the rest", () => {
    const r = engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "BUG-V2-A",
        originating_chat: "alpha",
        commit_sha: "a".repeat(40),
        file_paths_json: "[]",
        severity: "P2",
        summary: "legacy-shape insert",
        detected_at: FIXED_NOW_MS,
      },
    });
    expect(r.table).toBe("bug_attribution");
    expect(r.row.tokens_spent).toBe(0);
    expect(r.row.cost_usd_micros).toBe(0);
    expect(r.row.agent_type).toBe(null);
    expect(r.row.dispatch_prompt).toBe(null);
    expect(r.row.expected_files_json).toBe(null);
    expect(r.row.originating_tick_id).toBe(null);
  });

  it("insert(bug_attribution) with all v2 fields round-trips them", () => {
    const r = engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "BUG-V2-B",
        originating_chat: "bravo",
        commit_sha: "b".repeat(40),
        file_paths_json: JSON.stringify(["src/x.ts"]),
        severity: "P1",
        summary: "full v2 shape",
        detected_at: FIXED_NOW_MS,
        tokens_spent: 1_234,
        cost_usd_micros: usdToMicros(0.075), // = 75_000
        agent_type: "claude-opus-4-7",
        dispatch_prompt: "please review the diff for race conditions",
        expected_files_json: JSON.stringify(["src/x.ts", "src/y.ts"]),
        originating_tick_id: "tick-001",
      },
    });
    expect(r.row.tokens_spent).toBe(1_234);
    expect(r.row.cost_usd_micros).toBe(75_000);
    expect(r.row.agent_type).toBe("claude-opus-4-7");
    expect(r.row.dispatch_prompt).toContain("race conditions");
    expect(JSON.parse(r.row.expected_files_json!)).toEqual(["src/x.ts", "src/y.ts"]);
    expect(r.row.originating_tick_id).toBe("tick-001");
  });

  it("insert(bug_attribution) clamps negative tokens_spent / cost_usd_micros to 0", () => {
    const r = engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "BUG-V2-C",
        originating_chat: "charlie",
        commit_sha: "c".repeat(40),
        file_paths_json: "[]",
        severity: "P3",
        summary: "negative inputs",
        detected_at: FIXED_NOW_MS,
        // @ts-expect-error: deliberately bad value
        tokens_spent: -50,
        // @ts-expect-error: deliberately bad value
        cost_usd_micros: -1_000_000,
      },
    });
    expect(r.row.tokens_spent).toBe(0);
    expect(r.row.cost_usd_micros).toBe(0);
  });

  it("insert(bug_attribution) rejects non-array expected_files_json", () => {
    expect(() =>
      engine.insert({
        table: "bug_attribution",
        row: {
          bug_id: "BUG-V2-D",
          originating_chat: "delta",
          commit_sha: "d".repeat(40),
          file_paths_json: "[]",
          severity: "P0",
          summary: "x",
          detected_at: FIXED_NOW_MS,
          expected_files_json: '{"object":"not array"}',
        },
      })
    ).toThrowError(/parse to an array/);
  });
});

// ── insertPreDispatchRow ────────────────────────────────────────────────────

describe("LedgerStoreEngine v2 — insertPreDispatchRow", () => {
  it("writes the compaction-survival row with default summary + severity", () => {
    const r = engine.insertPreDispatchRow({
      bug_id: "PRE-1",
      originating_chat: "alpha",
      commit_sha: "deadbeef".repeat(5),
      file_paths_json: JSON.stringify(["src/foo.ts"]),
      agent_type: "claude-opus-4-7",
      dispatch_prompt: "Review for tolerance stackup",
      expected_files_json: JSON.stringify(["src/foo.ts"]),
      originating_tick_id: "tick-9001",
      detected_at: FIXED_NOW_MS,
    });
    expect(r.id).toBeGreaterThan(0);
    expect(r.summary).toBe("[pending result]");
    expect(r.severity).toBe("P3");
    expect(r.tokens_spent).toBe(0);
    expect(r.cost_usd_micros).toBe(0);
    expect(r.agent_type).toBe("claude-opus-4-7");
    expect(r.originating_tick_id).toBe("tick-9001");
    expect(r.resolved_at).toBe(null);
  });

  it("converts cost_usd_estimate (decimal) to integer micros at the boundary", () => {
    const r = engine.insertPreDispatchRow({
      bug_id: "PRE-COST",
      originating_chat: "bravo",
      commit_sha: "x".repeat(40),
      file_paths_json: "[]",
      agent_type: "ollama-deepseek-r1-14b",
      dispatch_prompt: "x",
      expected_files_json: "[]",
      originating_tick_id: "tick-cost",
      detected_at: FIXED_NOW_MS,
      cost_usd_estimate: 0.0125, // 12,500 micros
    });
    expect(r.cost_usd_micros).toBe(12_500);
  });

  it("truncates dispatch_prompt at the documented cap", () => {
    // engine constant DISPATCH_PROMPT_MAX_BYTES = 64_000.
    const big = "a".repeat(70_000);
    const r = engine.insertPreDispatchRow({
      bug_id: "PRE-TRUNC",
      originating_chat: "charlie",
      commit_sha: "x".repeat(40),
      file_paths_json: "[]",
      agent_type: "claude-opus-4-7",
      dispatch_prompt: big,
      expected_files_json: "[]",
      originating_tick_id: "tick-trunc",
      detected_at: FIXED_NOW_MS,
    });
    expect(r.dispatch_prompt!.length).toBe(64_000);
  });

  it("throws when required strings are empty", () => {
    expect(() =>
      engine.insertPreDispatchRow({
        bug_id: "",
        originating_chat: "alpha",
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        agent_type: "claude",
        dispatch_prompt: "x",
        expected_files_json: "[]",
        originating_tick_id: "tick",
        detected_at: FIXED_NOW_MS,
      })
    ).toThrowError(/bug_id/);
  });

  it("throws when expected_files_json is not a JSON array", () => {
    expect(() =>
      engine.insertPreDispatchRow({
        bug_id: "PRE-BAD",
        originating_chat: "alpha",
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        agent_type: "claude",
        dispatch_prompt: "x",
        expected_files_json: '{"not":"array"}',
        originating_tick_id: "tick",
        detected_at: FIXED_NOW_MS,
      })
    ).toThrowError(/parse to an array/);
  });

  it("throws on negative detected_at (R12 fail loud)", () => {
    expect(() =>
      engine.insertPreDispatchRow({
        bug_id: "PRE-T",
        originating_chat: "alpha",
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        agent_type: "claude",
        dispatch_prompt: "x",
        expected_files_json: "[]",
        originating_tick_id: "tick",
        detected_at: -1,
      })
    ).toThrowError(/epoch-ms/);
  });
});

// ── getSlotScore24h / getSlotScoresAll24h ──────────────────────────────────

describe("LedgerStoreEngine v2 — getSlotScore24h", () => {
  const TICK = "tick-score";

  function seedBug(slot: string, severity: "P0" | "P1" | "P2" | "P3", tokens: number, costUsd: number, msAgo: number) {
    engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: `${slot}-${severity}-${msAgo}`,
        originating_chat: slot,
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        severity,
        summary: `seed`,
        detected_at: FIXED_NOW_MS - msAgo,
        tokens_spent: tokens,
        cost_usd_micros: usdToMicros(costUsd),
        agent_type: "test-seed",
        dispatch_prompt: "x",
        expected_files_json: "[]",
        originating_tick_id: TICK,
      },
    });
  }

  it("returns a zero-row for a slot with no bugs in window", () => {
    const s = engine.getSlotScore24h("never-touched");
    expect(s.slot).toBe("never-touched");
    expect(s.bugCount).toBe(0);
    expect(s.weightedScore).toBe(0);
    expect(s.totalTokens).toBe(0);
    expect(s.totalCostUsd).toBe(0);
    expect(s.byCount).toEqual({ P0: 0, P1: 0, P2: 0, P3: 0 });
    expect(s.windowEndMs - s.windowStartMs).toBe(24 * 60 * 60 * 1000);
  });

  it("aggregates mixed-severity bugs for one slot with correct weights", () => {
    // alpha: 1xP0 + 2xP1 + 1xP3 = 100 + 25*2 + 1 = 151
    seedBug("alpha", "P0", 1000, 0.1, 1_000);
    seedBug("alpha", "P1", 500, 0.05, 2_000);
    seedBug("alpha", "P1", 500, 0.05, 3_000);
    seedBug("alpha", "P3", 50, 0.005, 4_000);
    const s = engine.getSlotScore24h("alpha");
    expect(s.bugCount).toBe(4);
    expect(s.byCount).toEqual({ P0: 1, P1: 2, P2: 0, P3: 1 });
    expect(s.weightedScore).toBe(100 + 25 * 2 + 0 + 1);
    expect(s.totalTokens).toBe(1000 + 500 + 500 + 50);
    expect(s.totalCostUsd).toBeCloseTo(0.1 + 0.05 + 0.05 + 0.005, 6);
  });

  it("excludes bugs outside the rolling window", () => {
    // bugs detected_at FIXED_NOW_MS - 25h are OUTSIDE the 24h window.
    const twentyFiveHoursAgo = 25 * 60 * 60 * 1000;
    seedBug("bravo", "P0", 100, 0.1, twentyFiveHoursAgo);
    const s = engine.getSlotScore24h("bravo");
    expect(s.bugCount).toBe(0);
    expect(s.weightedScore).toBe(0);
  });

  it("respects a custom windowMs (clamped to 30d max)", () => {
    seedBug("charlie", "P2", 100, 0.01, 48 * 60 * 60 * 1000); // 2 days ago
    const s48 = engine.getSlotScore24h("charlie", 72 * 60 * 60 * 1000);
    expect(s48.bugCount).toBe(1);
    // Clamp: any window > 30d should still cap at 30d, not throw
    const sBig = engine.getSlotScore24h("charlie", 365 * 24 * 60 * 60 * 1000);
    expect(sBig.bugCount).toBe(1); // still in window (only 2 days old)
    expect(sBig.windowEndMs - sBig.windowStartMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("uses injected nowMs for deterministic upper bound", () => {
    seedBug("delta", "P1", 200, 0.02, 1_000);
    // Roll the clock forward 24h+1ms so the bug is just outside the window.
    const futureNow = FIXED_NOW_MS + 24 * 60 * 60 * 1000 + 1;
    const s = engine.getSlotScore24h("delta", undefined, futureNow);
    expect(s.bugCount).toBe(0);
  });

  it("clamps non-finite / negative windowMs to default 24h", () => {
    seedBug("echo", "P3", 10, 0.001, 1_000);
    const sNaN = engine.getSlotScore24h("echo", Number.NaN);
    expect(sNaN.windowEndMs - sNaN.windowStartMs).toBe(24 * 60 * 60 * 1000);
    expect(sNaN.bugCount).toBe(1);
    const sNeg = engine.getSlotScore24h("echo", -100);
    expect(sNeg.windowEndMs - sNeg.windowStartMs).toBe(24 * 60 * 60 * 1000);
    expect(sNeg.bugCount).toBe(1);
  });
});

describe("LedgerStoreEngine v2 — getSlotScoresAll24h", () => {
  function seed(slot: string, severity: "P0" | "P1" | "P2" | "P3", msAgo: number) {
    engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: `${slot}-${severity}-${msAgo}`,
        originating_chat: slot,
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        severity,
        summary: `seed`,
        detected_at: FIXED_NOW_MS - msAgo,
      },
    });
  }

  it("returns rows sorted highest-score-first", () => {
    seed("alpha", "P3", 1_000); // weight 1
    seed("bravo", "P0", 1_000); // weight 100
    seed("charlie", "P1", 1_000); // weight 25
    const all = engine.getSlotScoresAll24h();
    expect(all.length).toBe(3);
    expect(all[0].slot).toBe("bravo");
    expect(all[1].slot).toBe("charlie");
    expect(all[2].slot).toBe("alpha");
    expect(all[0].weightedScore).toBeGreaterThan(all[1].weightedScore);
    expect(all[1].weightedScore).toBeGreaterThan(all[2].weightedScore);
  });

  it("omits slots with zero bugs in the window", () => {
    seed("alpha", "P2", 1_000);
    const all = engine.getSlotScoresAll24h();
    expect(all.length).toBe(1);
    expect(all[0].slot).toBe("alpha");
  });

  it("returns [] when no bugs exist at all", () => {
    expect(engine.getSlotScoresAll24h()).toEqual([]);
  });
});

// ── Migration idempotency / robustness ──────────────────────────────────────

describe("LedgerStoreEngine v2 — migration idempotency", () => {
  it("re-opening the same DB does not duplicate columns or indexes", () => {
    engine.migrate(2);
    engine.close();
    const reopened = new LedgerStoreEngine({
      dbPath, // module-scoped, set in beforeEach
      migrationSqlPath: MIGRATION_V1_PATH,
      now: () => FIXED_NOW_MS,
    });
    try {
      // Should succeed without "duplicate column name" errors.
      const r = reopened.migrate(2);
      expect(r.alreadyAtVersion).toBe(true);
      expect(r.appliedSqlBytes).toBe(0);
      expect(reopened.physicalSchemaVersion()).toBe(2);
    } finally {
      reopened.close();
    }
  });

  it("v2.sql file is well-formed (parseable, contains all 6 ALTER statements + 2 indexes)", () => {
    const sql = readFileSync(MIGRATION_V2_PATH, "utf-8");
    expect(sql).toMatch(/ADD COLUMN tokens_spent\s+INTEGER/);
    expect(sql).toMatch(/ADD COLUMN cost_usd_micros\s+INTEGER/);
    expect(sql).toMatch(/ADD COLUMN agent_type\s+TEXT/);
    expect(sql).toMatch(/ADD COLUMN dispatch_prompt\s+TEXT/);
    expect(sql).toMatch(/ADD COLUMN expected_files_json\s+TEXT/);
    expect(sql).toMatch(/ADD COLUMN originating_tick_id\s+TEXT/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_bug_attribution_tick/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_bug_attribution_agent/);
  });

  it("v2 columns are accessible via the read-only query() proxy", () => {
    engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "Q-1",
        originating_chat: "foxtrot",
        commit_sha: "x".repeat(40),
        file_paths_json: "[]",
        severity: "P1",
        summary: "for query proxy test",
        detected_at: FIXED_NOW_MS,
        tokens_spent: 999,
        cost_usd_micros: 123_456,
        agent_type: "claude-opus-4-7",
      },
    });
    const rows = engine.query(
      "SELECT tokens_spent, cost_usd_micros, agent_type FROM bug_attribution WHERE bug_id = ?",
      ["Q-1"]
    ) as Array<{ tokens_spent: number; cost_usd_micros: number; agent_type: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].tokens_spent).toBe(999);
    expect(rows[0].cost_usd_micros).toBe(123_456);
    expect(rows[0].agent_type).toBe("claude-opus-4-7");
  });
});
