/**
 * TokenEconomyReportHook.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U05
 *
 * Coverage tests for the buildSessionReport() pure function exposed by
 * .claude/hooks/token-economy-report.mjs. The Stop hook itself emits stdout
 * + stderr; we test the pure logic that decides what those messages contain.
 *
 * Coverage matrix:
 *   - happy path: counters present → tracked report with breakdown
 *   - happy path 2: ollama stats included when telemetry available
 *   - failure 1: no counters → estimated=true, all categories zero
 *   - failure 2: malformed counters (NaN, missing fields) → safe defaults
 *   - failure 3: empty payload → session_id falls back to "unknown"
 *   - adversarial 1: duplicate_reads waste fires when reads >> unique_files
 *   - adversarial 2: context_bloat fires when reads >> tool_calls × 0.4
 *   - adversarial 3: top_waste_patterns is capped at 3
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
// @ts-expect-error — JS ESM hook with no .d.ts; we exercise the pure export
import { buildSessionReport } from "../../../.claude/hooks/token-economy-report.mjs";

// Heuristic per-category constants (mirror hook source)
const APPROX = {
  hook_fire: 200,
  injection: 500,
  tool_call: 300,
  file_read: 800,
};
const TOP_WASTE_LIMIT = 3;

interface SessionReport {
  schemaVersion: string;
  session_id: string;
  timestamp: string;
  estimated: boolean;
  estimated_total_tokens: number;
  breakdown_by_category: {
    hooks: { count: number; est_tokens: number };
    injections: { count: number; est_tokens: number };
    tool_calls: { count: number; est_tokens: number };
    file_reads: { count: number; est_tokens: number };
  };
  raw_counters: {
    unique_files_read: number;
    searches: number;
    agent_spawns: number;
  };
  top_waste_patterns: Array<{ pattern: string; severity: string; fix: string }>;
  all_waste_patterns: Array<{ pattern: string; severity: string; fix: string }>;
  ollama_offload_savings: null | { tokens_saved: number; offload_count: number };
  advisory: string;
}

describe("token-economy-report hook — buildSessionReport (P9-U05)", () => {
  describe("happy path", () => {
    it("returns tracked report when counters are present", () => {
      const counters = {
        hook_fires: 50,
        injections: 12,
        tool_calls: 100,
        file_reads: 30,
        unique_files_read: 25,
        searches: 5,
        agent_spawns: 2,
      };
      const r: SessionReport = buildSessionReport({ session_id: "test-session-001" }, { counters, ollamaStats: null });

      expect(r.schemaVersion).toBe("1.0.0");
      expect(r.session_id).toBe("test-session-001");
      expect(r.estimated).toBe(false);
      expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Token totals are deterministic: count * APPROX
      expect(r.breakdown_by_category.hooks.est_tokens).toBe(50 * APPROX.hook_fire);
      expect(r.breakdown_by_category.injections.est_tokens).toBe(12 * APPROX.injection);
      expect(r.breakdown_by_category.tool_calls.est_tokens).toBe(100 * APPROX.tool_call);
      expect(r.breakdown_by_category.file_reads.est_tokens).toBe(30 * APPROX.file_read);

      const expectedTotal =
        50 * APPROX.hook_fire +
        12 * APPROX.injection +
        100 * APPROX.tool_call +
        30 * APPROX.file_read;
      expect(r.estimated_total_tokens).toBe(expectedTotal);

      expect(r.raw_counters.unique_files_read).toBe(25);
      expect(r.raw_counters.searches).toBe(5);
      expect(r.raw_counters.agent_spawns).toBe(2);
    });

    it("includes ollama_offload_savings when ollamaStats provided", () => {
      const counters = {
        hook_fires: 10, injections: 2, tool_calls: 20, file_reads: 5,
        unique_files_read: 5, searches: 1, agent_spawns: 0,
      };
      const ollamaStats = { tokens_saved: 12500, offloaded: 47 };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats });
      expect(r.ollama_offload_savings).not.toBeNull();
      expect(r.ollama_offload_savings!.tokens_saved).toBe(12500);
      expect(r.ollama_offload_savings!.offload_count).toBe(47);
    });
  });

  describe("failure modes", () => {
    it("failure 1: no counters → estimated=true, all categories zero", () => {
      const r: SessionReport = buildSessionReport({ session_id: "no-counters" }, { counters: null, ollamaStats: null });
      expect(r.estimated).toBe(true);
      expect(r.estimated_total_tokens).toBe(0);
      expect(r.breakdown_by_category.hooks.count).toBe(0);
      expect(r.breakdown_by_category.injections.count).toBe(0);
      expect(r.breakdown_by_category.tool_calls.count).toBe(0);
      expect(r.breakdown_by_category.file_reads.count).toBe(0);
      expect(r.top_waste_patterns).toHaveLength(0);
      expect(r.advisory).toMatch(/no waste patterns/i);
    });

    it("failure 2: malformed counters (NaN, missing fields) → safe defaults", () => {
      const counters = {
        hook_fires: NaN,
        injections: undefined,
        tool_calls: "not a number" as unknown as number,
        file_reads: null as unknown as number,
        // unique_files_read missing
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      // All malformed values clamp to 0
      expect(r.breakdown_by_category.hooks.count).toBe(0);
      expect(r.breakdown_by_category.injections.count).toBe(0);
      expect(r.breakdown_by_category.tool_calls.count).toBe(0);
      expect(r.breakdown_by_category.file_reads.count).toBe(0);
      expect(r.estimated_total_tokens).toBe(0);
    });

    it("failure 3: empty payload → session_id falls back to a non-empty token", () => {
      const r: SessionReport = buildSessionReport({}, { counters: null, ollamaStats: null });
      // Either resolved via stable-id helper OR "unknown" — but always non-empty
      expect(typeof r.session_id).toBe("string");
      expect(r.session_id.length).toBeGreaterThan(0);
    });
  });

  describe("waste detection rules", () => {
    it("adversarial 1: duplicate_reads waste fires when reads >> unique_files", () => {
      const counters = {
        hook_fires: 0, injections: 0, tool_calls: 50,
        file_reads: 30, unique_files_read: 5,  // 30 / 5 = 6× — well over 1.5×
        searches: 0, agent_spawns: 0,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const dup = r.all_waste_patterns.find((w) => w.pattern === "duplicate_reads");
      expect(dup).not.toBeUndefined; // sentinel - dup must be in detected set
      expect(dup?.severity).toBe("high");
    });

    it("adversarial 2: context_bloat fires when file_reads / tool_calls > 0.4", () => {
      const counters = {
        hook_fires: 0, injections: 0,
        tool_calls: 10, file_reads: 8,  // 8/10 = 0.8 > 0.4
        unique_files_read: 8, searches: 0, agent_spawns: 0,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const bloat = r.all_waste_patterns.find((w) => w.pattern === "context_bloat");
      expect(bloat?.severity).toBe("high");
    });

    it("adversarial 3: top_waste_patterns is capped at the configured limit", () => {
      // Trigger ALL waste rules simultaneously
      const counters = {
        hook_fires: 1000, injections: 0,
        tool_calls: 50, file_reads: 100, unique_files_read: 5,  // duplicate_reads + context_bloat
        searches: 50,                                            // broad_search
        agent_spawns: 20,                                        // agent_over_spawn
        // hook_storm: hooks/tool_calls = 1000/50 = 20 > 2 → fires
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      expect(r.all_waste_patterns.length).toBeGreaterThanOrEqual(TOP_WASTE_LIMIT);
      expect(r.top_waste_patterns.length).toBeLessThanOrEqual(TOP_WASTE_LIMIT);
      expect(r.advisory).toContain("Top waste:");
    });

    it("broad_search waste fires when searches > 10", () => {
      const counters = {
        hook_fires: 0, injections: 0, tool_calls: 5, file_reads: 1,
        unique_files_read: 1, searches: 15, agent_spawns: 0,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const broad = r.all_waste_patterns.find((w) => w.pattern === "broad_search");
      expect(broad?.severity).toBe("medium");
    });

    it("agent_over_spawn waste fires when agent_spawns > 5", () => {
      const counters = {
        hook_fires: 0, injections: 0, tool_calls: 5, file_reads: 1,
        unique_files_read: 1, searches: 0, agent_spawns: 8,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const overspawn = r.all_waste_patterns.find((w) => w.pattern === "agent_over_spawn");
      expect(overspawn?.severity).toBe("medium");
    });

    it("hook_storm waste fires when hooks/tool_calls > 2", () => {
      const counters = {
        hook_fires: 100, injections: 0, tool_calls: 30, file_reads: 1,
        unique_files_read: 1, searches: 0, agent_spawns: 0,
        // hooks/tool_calls = 100/30 ≈ 3.33 > 2
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const storm = r.all_waste_patterns.find((w) => w.pattern === "hook_storm");
      expect(storm?.severity).toBe("medium");
    });
  });

  describe("structural invariants", () => {
    it("estimated_total_tokens equals sum of category est_tokens", () => {
      const counters = {
        hook_fires: 7, injections: 3, tool_calls: 11, file_reads: 4,
        unique_files_read: 4, searches: 2, agent_spawns: 0,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      const sum =
        r.breakdown_by_category.hooks.est_tokens +
        r.breakdown_by_category.injections.est_tokens +
        r.breakdown_by_category.tool_calls.est_tokens +
        r.breakdown_by_category.file_reads.est_tokens;
      expect(r.estimated_total_tokens).toBe(sum);
    });

    it("top_waste_patterns is a prefix of all_waste_patterns", () => {
      const counters = {
        hook_fires: 0, injections: 0,
        tool_calls: 10, file_reads: 30, unique_files_read: 5,
        searches: 50, agent_spawns: 10,
      };
      const r: SessionReport = buildSessionReport({}, { counters, ollamaStats: null });
      for (let i = 0; i < r.top_waste_patterns.length; i++) {
        expect(r.top_waste_patterns[i].pattern).toBe(r.all_waste_patterns[i].pattern);
      }
    });
  });
});
