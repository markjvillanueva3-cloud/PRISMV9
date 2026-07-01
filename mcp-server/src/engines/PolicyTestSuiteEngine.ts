/**
 * PolicyTestSuiteEngine — U-HAGI09 adversarial / forbidden-action verdict suite.
 *
 * Pure-core curated policy-test runner.  Caller supplies (a) a list of policy
 * test cases — each an `{id, category, input, expectedVerdict}` tuple — and
 * (b) a `runner(input)` callback that returns the actual verdict.  Engine
 * computes pass/fail per case, rolls up by category, returns a deterministic
 * verdict matrix.
 *
 * Curated case classes:
 *   - "forbidden-action"  — physics-constant tampering, safety-threshold weakening,
 *                            peer-claim violation, settings.json gate-softening
 *   - "edge-case"         — empty inputs, oversize, NaN, unicode, timezone
 *   - "jailbreak"         — prompt-injection patterns, refuse_list circumvention
 *   - "robustness"        — distribution-shift inputs, malformed Zod fixtures
 *
 * Pure: no I/O, no spawn.  Caller decides what `runner` does (real dispatcher
 * call, mocked engine, fixture replay).
 *
 * @module engines/PolicyTestSuiteEngine
 */

import { z } from "zod";

export const POLICY_CATEGORIES = ["forbidden-action", "edge-case", "jailbreak", "robustness"] as const;
export type PolicyCategory = typeof POLICY_CATEGORIES[number];

export const POLICY_VERDICTS = ["block", "allow", "warn"] as const;
export type PolicyVerdict = typeof POLICY_VERDICTS[number];

export const PolicyCaseSchema = z.object({
  id: z.string().min(1).max(120),
  category: z.enum(POLICY_CATEGORIES),
  description: z.string().min(1).max(500),
  input: z.unknown(),
  expectedVerdict: z.enum(POLICY_VERDICTS),
});
export type PolicyCase = z.infer<typeof PolicyCaseSchema>;

export interface PolicyCaseResult {
  id: string;
  category: PolicyCategory;
  expected: PolicyVerdict;
  actual: PolicyVerdict | "error";
  passed: boolean;
  durationMs?: number;
  errorMsg?: string;
}

export interface PolicySummary {
  totalCases: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number; // 0..1
  byCategory: Record<PolicyCategory, { total: number; passed: number; failed: number; errors: number }>;
}

export type PolicyRunner = (input: unknown) => PolicyVerdict | Promise<PolicyVerdict>;

export class PolicyTestSuiteEngine {
  static validateCase(c: unknown): PolicyCase { return PolicyCaseSchema.parse(c); }

  static async run(
    cases: readonly PolicyCase[],
    runner: PolicyRunner,
  ): Promise<{ results: PolicyCaseResult[]; summary: PolicySummary }> {
    if (!Array.isArray(cases)) throw new Error("PolicyTestSuite.run: cases must be an array");
    if (typeof runner !== "function") throw new Error("PolicyTestSuite.run: runner must be a function");
    for (const c of cases) PolicyCaseSchema.parse(c);

    const results: PolicyCaseResult[] = [];
    for (const c of cases) {
      const t0 = Date.now();
      try {
        const actual = await Promise.resolve(runner(c.input));
        results.push({
          id: c.id,
          category: c.category,
          expected: c.expectedVerdict,
          actual,
          passed: actual === c.expectedVerdict,
          durationMs: Date.now() - t0,
        });
      } catch (e) {
        results.push({
          id: c.id,
          category: c.category,
          expected: c.expectedVerdict,
          actual: "error",
          passed: false,
          durationMs: Date.now() - t0,
          errorMsg: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const summary = PolicyTestSuiteEngine.summarize(results);
    return { results, summary };
  }

  static summarize(results: readonly PolicyCaseResult[]): PolicySummary {
    const byCategory: Record<PolicyCategory, { total: number; passed: number; failed: number; errors: number }> = {
      "forbidden-action": { total: 0, passed: 0, failed: 0, errors: 0 },
      "edge-case":        { total: 0, passed: 0, failed: 0, errors: 0 },
      "jailbreak":        { total: 0, passed: 0, failed: 0, errors: 0 },
      "robustness":       { total: 0, passed: 0, failed: 0, errors: 0 },
    };
    let passed = 0, failed = 0, errors = 0;
    for (const r of results) {
      byCategory[r.category].total++;
      if (r.actual === "error") {
        errors++; byCategory[r.category].errors++;
      } else if (r.passed) {
        passed++; byCategory[r.category].passed++;
      } else {
        failed++; byCategory[r.category].failed++;
      }
    }
    const total = results.length;
    return {
      totalCases: total,
      passed, failed, errors,
      passRate: total === 0 ? 0 : passed / total,
      byCategory,
    };
  }

  static renderMarkdown(summary: PolicySummary, results?: readonly PolicyCaseResult[]): string {
    const lines = [
      `# Policy Test Suite Summary`,
      ``,
      `Total: ${summary.totalCases} | Passed: ${summary.passed} | Failed: ${summary.failed} | Errors: ${summary.errors} | Pass-rate: ${(summary.passRate * 100).toFixed(1)}%`,
      ``,
      `## By category`,
      ``,
      `| Category | Total | Passed | Failed | Errors |`,
      `| --- | --- | --- | --- | --- |`,
    ];
    for (const cat of POLICY_CATEGORIES) {
      const c = summary.byCategory[cat];
      lines.push(`| ${cat} | ${c.total} | ${c.passed} | ${c.failed} | ${c.errors} |`);
    }
    if (results && results.length > 0) {
      lines.push(``, `## Failures`, ``);
      for (const r of results.filter((x) => !x.passed)) {
        lines.push(`- [${r.category}] \`${r.id}\` expected=${r.expected} actual=${r.actual}${r.errorMsg ? ` (err: ${r.errorMsg})` : ""}`);
      }
    }
    return lines.join("\n");
  }
}

export const policyTestSuiteEngine = PolicyTestSuiteEngine;
