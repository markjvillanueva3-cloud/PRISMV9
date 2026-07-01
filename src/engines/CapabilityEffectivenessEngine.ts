/**
 * CapabilityEffectivenessEngine — MXU-MS9 + MS10
 *
 * E2E validation and usage effectiveness tracking:
 *   1. E2E validation — test each pillar's full chain works
 *   2. Token benchmarks — measure token cost per capability
 *   3. Usage tracking — which capabilities get used vs ignored
 *   4. Effectiveness scoring — does the capability deliver value?
 *   5. Improvement suggestions — how to increase adoption
 *
 * Sources:
 *   - MXU-MS9: E2E Validation + Token Benchmarks
 *   - MXU-MS10: Bundle Effectiveness + Continuous Improvement
 */

import type { PillarId } from "./ProductPillarEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationTest {
  id: string;
  pillar: PillarId;
  name: string;
  action: string;
  input: Record<string, unknown>;
  expected_fields: string[];
}

export interface ValidationResult {
  test_id: string;
  pillar: PillarId;
  pass: boolean;
  duration_ms: number;
  output_fields_present: string[];
  missing_fields: string[];
  error?: string;
}

export interface ValidationSuite {
  timestamp: string;
  total_tests: number;
  passed: number;
  failed: number;
  pass_rate: number;
  results: ValidationResult[];
  by_pillar: Array<{ pillar: PillarId; tests: number; passed: number; pass_rate: number }>;
}

export interface UsageEvent {
  capability_id: string;
  pillar: PillarId;
  timestamp: string;
  tokens_consumed: number;
  success: boolean;
  user_satisfaction?: number;
}

export interface EffectivenessScore {
  capability_id: string;
  pillar: PillarId;
  usage_count: number;
  success_rate: number;
  avg_tokens: number;
  avg_satisfaction: number;
  effectiveness: "high" | "medium" | "low" | "unused";
  recommendation: string;
}

export interface EffectivenessReport {
  timestamp: string;
  total_capabilities: number;
  total_usage_events: number;
  active_capabilities: number;
  unused_capabilities: number;
  avg_success_rate: number;
  avg_tokens_per_use: number;
  by_pillar: Array<{ pillar: PillarId; uses: number; success_rate: number }>;
  top_used: EffectivenessScore[];
  underperforming: EffectivenessScore[];
  improvement_suggestions: string[];
}

export interface TokenBenchmark {
  capability_id: string;
  min_tokens: number;
  avg_tokens: number;
  max_tokens: number;
  p95_tokens: number;
  samples: number;
}

// ============================================================================
// VALIDATION TEST SUITE
// ============================================================================

const VALIDATION_TESTS: ValidationTest[] = [
  { id: "v-sf-01", pillar: "calculator", name: "Speed/feed for steel + 12mm endmill", action: "sf_autopilot_run", input: { material: "steel", tool_diameter_mm: 12, operation: "roughing" }, expected_fields: ["output", "material", "tool", "machine", "safety_score"] },
  { id: "v-sf-02", pillar: "calculator", name: "Speed/feed for aluminum + small tool", action: "sf_autopilot_run", input: { material: "aluminum", tool_diameter_mm: 6, flute_count: 2 }, expected_fields: ["output", "material"] },
  { id: "v-pp-01", pillar: "postprocessor", name: "PPG for Fanuc controller", action: "pp_autopilot_run", input: { controller: "Fanuc", operation_type: "milling" }, expected_fields: ["dialect", "config", "program_header"] },
  { id: "v-pp-02", pillar: "postprocessor", name: "PPG for Haas controller", action: "pp_autopilot_run", input: { controller: "Haas" }, expected_fields: ["dialect", "config"] },
  { id: "v-qt-01", pillar: "quote", name: "Basic quote for aluminum bracket", action: "quote_autopilot_run", input: { part_name: "Bracket", material: "aluminum", features: ["pocket", "hole"], batch_sizes: [10, 100] }, expected_fields: ["quantity_breaks", "base_cycle_time_min"] },
  { id: "v-bg-01", pillar: "automation", name: "Build guard chain", action: "build_guard_chain", input: { edited_files: ["src/engines/Test.ts"], tsc_output: "", available_tests: [], edit_state: { session_edits: 0, edits_since_test: 0, edits_since_review: 0, edited_files: [], engines_written: [], test_files_written: [], last_edit_timestamp: "" } }, expected_fields: ["overall_status", "steps", "recommendations"] },
  { id: "v-cx-01", pillar: "automation", name: "Context pressure check", action: "context_pressure", input: { tokens_used: 500000 }, expected_fields: ["pressure_level", "utilization_pct", "should_compact"] },
  { id: "v-cp-01", pillar: "automation", name: "Copilot suggestion", action: "copilot_suggest", input: { task_description: "compute cutting force" }, expected_fields: ["reuse_suggestions", "duplication_check"] },
];

// ============================================================================
// ENGINE
// ============================================================================

export class CapabilityEffectivenessEngine {

  private usageLog: UsageEvent[] = [];

  // ── E2E Validation ─────────────────────────────────────────

  /**
   * Get the validation test suite.
   */
  getValidationTests(): ValidationTest[] {
    return [...VALIDATION_TESTS];
  }

  /**
   * Validate a single test result against expected fields.
   */
  validateResult(test: ValidationTest, output: Record<string, unknown>, durationMs: number): ValidationResult {
    const presentFields = Object.keys(output);
    const missing = test.expected_fields.filter(f => !presentFields.includes(f));

    return {
      test_id: test.id,
      pillar: test.pillar,
      pass: missing.length === 0 && !output.error,
      duration_ms: durationMs,
      output_fields_present: presentFields.slice(0, 10),
      missing_fields: missing,
      error: output.error ? String(output.error) : undefined,
    };
  }

  /**
   * Aggregate validation results into a suite report.
   */
  aggregateValidation(results: ValidationResult[]): ValidationSuite {
    const passed = results.filter(r => r.pass).length;

    const byPillar = new Map<PillarId, { tests: number; passed: number }>();
    for (const r of results) {
      const existing = byPillar.get(r.pillar) || { tests: 0, passed: 0 };
      existing.tests++;
      if (r.pass) existing.passed++;
      byPillar.set(r.pillar, existing);
    }

    return {
      timestamp: new Date().toISOString(),
      total_tests: results.length,
      passed,
      failed: results.length - passed,
      pass_rate: results.length > 0 ? parseFloat(((passed / results.length) * 100).toFixed(1)) : 0,
      results,
      by_pillar: Array.from(byPillar.entries()).map(([pillar, data]) => ({
        pillar,
        tests: data.tests,
        passed: data.passed,
        pass_rate: parseFloat(((data.passed / data.tests) * 100).toFixed(1)),
      })),
    };
  }

  // ── Usage Tracking ─────────────────────────────────────────

  /**
   * Record a capability usage event.
   */
  recordUsage(event: UsageEvent): void {
    this.usageLog.push(event);
  }

  /**
   * Get effectiveness score for a capability.
   */
  scoreCapability(capabilityId: string): EffectivenessScore {
    const events = this.usageLog.filter(e => e.capability_id === capabilityId);

    if (events.length === 0) {
      return {
        capability_id: capabilityId,
        pillar: "calculator",
        usage_count: 0,
        success_rate: 0,
        avg_tokens: 0,
        avg_satisfaction: 0,
        effectiveness: "unused",
        recommendation: "No usage data — promote this capability to users",
      };
    }

    const successes = events.filter(e => e.success).length;
    const successRate = successes / events.length;
    const avgTokens = events.reduce((s, e) => s + e.tokens_consumed, 0) / events.length;
    const withSat = events.filter(e => e.user_satisfaction !== undefined);
    const avgSat = withSat.length > 0
      ? withSat.reduce((s, e) => s + (e.user_satisfaction || 0), 0) / withSat.length
      : 0;

    let effectiveness: EffectivenessScore["effectiveness"];
    if (successRate > 0.8 && events.length >= 5) effectiveness = "high";
    else if (successRate > 0.5 || events.length >= 3) effectiveness = "medium";
    else effectiveness = "low";

    let recommendation: string;
    if (successRate < 0.5) recommendation = "High failure rate — investigate root cause";
    else if (avgTokens > 50000) recommendation = "High token cost — optimize for efficiency";
    else if (events.length < 3) recommendation = "Low usage — improve discoverability";
    else recommendation = "Performing well";

    return {
      capability_id: capabilityId,
      pillar: events[0].pillar,
      usage_count: events.length,
      success_rate: parseFloat(successRate.toFixed(2)),
      avg_tokens: Math.round(avgTokens),
      avg_satisfaction: parseFloat(avgSat.toFixed(1)),
      effectiveness,
      recommendation,
    };
  }

  // ── Effectiveness Report ───────────────────────────────────

  /**
   * Generate full effectiveness report.
   */
  generateReport(knownCapabilityIds: string[]): EffectivenessReport {
    const scores = knownCapabilityIds.map(id => this.scoreCapability(id));
    const active = scores.filter(s => s.usage_count > 0);
    const unused = scores.filter(s => s.usage_count === 0);

    const byPillar = new Map<PillarId, { uses: number; successes: number }>();
    for (const e of this.usageLog) {
      const existing = byPillar.get(e.pillar) || { uses: 0, successes: 0 };
      existing.uses++;
      if (e.success) existing.successes++;
      byPillar.set(e.pillar, existing);
    }

    const suggestions: string[] = [];
    if (unused.length > active.length) {
      suggestions.push(`${unused.length} capabilities unused — run discoverability campaign`);
    }

    const lowPerf = scores.filter(s => s.effectiveness === "low");
    if (lowPerf.length > 0) {
      suggestions.push(`${lowPerf.length} capabilities underperforming — check error logs`);
    }

    const avgSuccess = active.length > 0
      ? active.reduce((s, a) => s + a.success_rate, 0) / active.length
      : 0;

    const avgTokens = this.usageLog.length > 0
      ? this.usageLog.reduce((s, e) => s + e.tokens_consumed, 0) / this.usageLog.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      total_capabilities: knownCapabilityIds.length,
      total_usage_events: this.usageLog.length,
      active_capabilities: active.length,
      unused_capabilities: unused.length,
      avg_success_rate: parseFloat(avgSuccess.toFixed(2)),
      avg_tokens_per_use: Math.round(avgTokens),
      by_pillar: Array.from(byPillar.entries()).map(([pillar, data]) => ({
        pillar,
        uses: data.uses,
        success_rate: parseFloat(((data.successes / data.uses) * 100).toFixed(1)),
      })),
      top_used: scores.filter(s => s.usage_count > 0).sort((a, b) => b.usage_count - a.usage_count).slice(0, 5),
      underperforming: lowPerf,
      improvement_suggestions: suggestions,
    };
  }

  // ── Token Benchmarks ───────────────────────────────────────

  /**
   * Compute token benchmarks for a capability.
   */
  getTokenBenchmark(capabilityId: string): TokenBenchmark {
    const events = this.usageLog.filter(e => e.capability_id === capabilityId);
    if (events.length === 0) {
      return { capability_id: capabilityId, min_tokens: 0, avg_tokens: 0, max_tokens: 0, p95_tokens: 0, samples: 0 };
    }

    const tokens = events.map(e => e.tokens_consumed).sort((a, b) => a - b);
    const p95Idx = Math.floor(tokens.length * 0.95);

    return {
      capability_id: capabilityId,
      min_tokens: tokens[0],
      avg_tokens: Math.round(tokens.reduce((s, t) => s + t, 0) / tokens.length),
      max_tokens: tokens[tokens.length - 1],
      p95_tokens: tokens[Math.min(p95Idx, tokens.length - 1)],
      samples: tokens.length,
    };
  }

  /** Clear usage log (for testing). */
  clearUsageLog(): void {
    this.usageLog = [];
  }

  /** Get usage log. */
  getUsageLog(): UsageEvent[] {
    return [...this.usageLog];
  }
}

export const capabilityEffectivenessEngine = new CapabilityEffectivenessEngine();
