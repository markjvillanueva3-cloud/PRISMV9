/**
 * LocalHookAggregatorEngine — LOCAL-LLM-MS0 U-LLM-AGG01
 *
 * Aggregates and summarizes outputs from 17 disabled advisory hooks.
 * Runs all checks locally via Qwen, returns condensed summary.
 *
 * Replaces individually-fired hooks that each injected ~200 tokens:
 *   - naming-convention-enforcer → naming checks
 *   - type-safety-checker → type checks
 *   - complexity-gate → complexity checks
 *   - magic-number-detector → magic number checks
 *   - async-pattern-checker → async pattern checks
 *   - performance-pattern-detector → performance checks
 *   - consistent-return-checker → return consistency
 *   - api-contract-enforcer → API pattern checks
 *
 * Token savings: 17 hooks × ~200 tokens = 3400 → ~100 token summary = 97% reduction
 *
 * @module engines/LocalHookAggregatorEngine
 * @milestone LOCAL-LLM-MS0 Session 6
 */

import { z } from "zod";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const AGGREGATOR_MODEL = process.env.OLLAMA_AGGREGATOR_MODEL || "qwen2.5-coder:32b";
const TIMEOUT_MS = 15_000;

export const HookAggregatorInputSchema = z.object({
  code: z.string().min(1, "Code cannot be empty"),
  filePath: z.string().optional(),
  hookTypes: z.array(z.enum([
    "naming",
    "types",
    "complexity",
    "magic",
    "async",
    "performance",
    "returns",
    "api",
    "all",
  ])).default(["all"]),
  maxIssues: z.number().int().min(1).max(20).default(5),
});

export type HookAggregatorInput = z.input<typeof HookAggregatorInputSchema>;

export interface AggregatedIssue {
  hookType: string;
  severity: "error" | "warning" | "info";
  line?: number;
  message: string;
  suggestion?: string;
}

export interface AggregatorResult {
  passed: boolean;
  issues: AggregatedIssue[];
  summary: string;
  hooksChecked: string[];
  issueCount: number;
  ollamaUsed: boolean;
  latencyMs: number;
}

// Check patterns for each hook type
const HOOK_PATTERNS: Record<string, Array<{
  id: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
}>> = {
  naming: [
    { id: "class-not-pascal", pattern: /class\s+([a-z][a-zA-Z0-9]*)\s*[{<]/g, message: "Class should be PascalCase", suggestion: "Rename to PascalCase", severity: "warning" },
    { id: "interface-not-pascal", pattern: /interface\s+([a-z][a-zA-Z0-9]*)/g, message: "Interface should be PascalCase", suggestion: "Rename to PascalCase", severity: "warning" },
    { id: "enum-not-pascal", pattern: /enum\s+([a-z][a-zA-Z0-9]*)/g, message: "Enum should be PascalCase", suggestion: "Rename to PascalCase", severity: "warning" },
    { id: "single-letter", pattern: /(?:let|const|var)\s+([^ijknxyz])\s*[=:]/g, message: "Avoid single-letter variables", suggestion: "Use descriptive name", severity: "info" },
  ],
  types: [
    { id: "any-type", pattern: /:\s*any\b/g, message: "Avoid 'any' type", suggestion: "Use specific type or unknown", severity: "warning" },
    { id: "double-assertion", pattern: /as\s+\w+\s+as\s+\w+/g, message: "Double type assertion", suggestion: "Refactor to avoid double assertion", severity: "warning" },
    { id: "non-null-chain", pattern: /\w+!!\.|\w+!\./g, message: "Excessive non-null assertions", suggestion: "Add proper null checks", severity: "warning" },
  ],
  complexity: [
    { id: "long-function", pattern: /(?:function|=>)\s*[^{]*\{[^}]{2500,}\}/gs, message: "Function exceeds 50 lines", suggestion: "Split into smaller functions", severity: "warning" },
    { id: "deep-nesting", pattern: /\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{/g, message: "Nesting exceeds 4 levels", suggestion: "Extract nested logic", severity: "warning" },
  ],
  magic: [
    { id: "magic-number", pattern: /(?<![0-9.])[2-9]\d{2,}(?![0-9.])/g, message: "Magic number detected", suggestion: "Extract to named constant", severity: "info" },
  ],
  async: [
    { id: "await-in-loop", pattern: /for\s*\([^)]*\)\s*\{[^}]*await\s/gs, message: "Await in loop", suggestion: "Use Promise.all for parallel execution", severity: "warning" },
    { id: "floating-promise", pattern: /(?<!await\s)(?<!return\s)\w+\([^)]*\)\s*;(?=\s*\/\/|\s*$)/g, message: "Possibly floating promise", suggestion: "Add await or void", severity: "info" },
  ],
  performance: [
    { id: "nested-loop-same", pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/gs, message: "Nested loops O(n²)", suggestion: "Consider using Map/Set for O(n)", severity: "warning" },
    { id: "spread-in-reduce", pattern: /\.reduce\([^)]*\.\.\./g, message: "Spread in reduce creates copies", suggestion: "Use Object.assign or push", severity: "warning" },
    { id: "new-in-loop", pattern: /for\s*\([^)]*\)\s*\{[^}]*new\s+(RegExp|Date)\(/gs, message: "Object creation in loop", suggestion: "Move creation outside loop", severity: "info" },
  ],
  returns: [
    { id: "unreachable", pattern: /return[^;]*;\s*[a-zA-Z]/g, message: "Code after return is unreachable", suggestion: "Remove unreachable code", severity: "error" },
    { id: "mixed-return", pattern: /return\s*;[^}]*return\s+\w/g, message: "Mixed explicit/implicit returns", suggestion: "Use consistent return style", severity: "warning" },
  ],
  api: [
    { id: "no-error-code", pattern: /res\.json\(\s*\{(?![^}]*error|[^}]*code)/g, message: "API response missing error indicator", suggestion: "Include success/error field", severity: "info" },
  ],
};

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return false;
    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.some(m => m.name.includes("qwen")) ?? false;
  } catch {
    return false;
  }
}

function runRegexChecks(code: string, hookTypes: string[]): AggregatedIssue[] {
  const issues: AggregatedIssue[] = [];
  const typesToCheck = hookTypes.includes("all")
    ? Object.keys(HOOK_PATTERNS)
    : hookTypes;

  for (const hookType of typesToCheck) {
    const patterns = HOOK_PATTERNS[hookType];
    if (!patterns) continue;

    for (const rule of patterns) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = regex.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split("\n").length;
        issues.push({
          hookType,
          severity: rule.severity,
          line: lineNumber,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    }
  }

  return issues;
}

async function runOllamaAggregation(
  code: string,
  regexIssues: AggregatedIssue[],
  maxIssues: number
): Promise<{ summary: string; additionalIssues: AggregatedIssue[] }> {
  const prompt = `You are a code review assistant. Analyze this code and provide a concise summary of issues.

CODE:
\`\`\`
${code.slice(0, 3000)}
\`\`\`

REGEX-DETECTED ISSUES:
${JSON.stringify(regexIssues.slice(0, 10), null, 2)}

Provide:
1. A one-sentence summary of the most important issues (max 100 chars)
2. Up to ${maxIssues} additional issues not caught by regex (JSON array)

Format your response as JSON:
{
  "summary": "Brief summary of top issues",
  "additionalIssues": [{"hookType": "...", "severity": "warning", "message": "...", "suggestion": "..."}]
}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AGGREGATOR_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 500 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return { summary: summarizeIssues(regexIssues), additionalIssues: [] };
    }

    const data = await response.json() as { response?: string };
    if (!data.response) {
      return { summary: summarizeIssues(regexIssues), additionalIssues: [] };
    }

    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { summary: summarizeIssues(regexIssues), additionalIssues: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      additionalIssues?: AggregatedIssue[];
    };

    return {
      summary: parsed.summary || summarizeIssues(regexIssues),
      additionalIssues: Array.isArray(parsed.additionalIssues) ? parsed.additionalIssues : [],
    };
  } catch {
    return { summary: summarizeIssues(regexIssues), additionalIssues: [] };
  }
}

function summarizeIssues(issues: AggregatedIssue[]): string {
  if (issues.length === 0) return "No issues found";
  const errors = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warning").length;
  const infos = issues.filter(i => i.severity === "info").length;
  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors > 1 ? "s" : ""}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
  if (infos > 0) parts.push(`${infos} info`);
  return parts.join(", ") || "No issues found";
}

/**
 * LocalHookAggregatorEngine — Aggregates disabled hook checks via Qwen
 */
export class LocalHookAggregatorEngine {
  /**
   * Run all hook checks and return aggregated summary
   */
  static async aggregate(input: HookAggregatorInput): Promise<AggregatorResult> {
    const startTime = Date.now();
    const parsed = HookAggregatorInputSchema.parse(input);
    const { code, hookTypes, maxIssues } = parsed;

    const hooksChecked = hookTypes.includes("all")
      ? Object.keys(HOOK_PATTERNS)
      : hookTypes.filter(h => h !== "all");

    // Run regex checks first (fast, always works)
    const regexIssues = runRegexChecks(code, hooksChecked);

    // Try Ollama for enhanced analysis
    const ollamaAvailable = await isOllamaAvailable();
    let summary: string;
    let allIssues: AggregatedIssue[];

    if (ollamaAvailable) {
      const ollamaResult = await runOllamaAggregation(code, regexIssues, maxIssues);
      summary = ollamaResult.summary;
      allIssues = [...regexIssues, ...ollamaResult.additionalIssues];
    } else {
      summary = summarizeIssues(regexIssues);
      allIssues = regexIssues;
    }

    // Sort: errors first, then warnings, then info
    allIssues.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    // Limit to maxIssues
    const limitedIssues = allIssues.slice(0, maxIssues);

    return {
      passed: limitedIssues.filter(i => i.severity === "error").length === 0,
      issues: limitedIssues,
      summary,
      hooksChecked,
      issueCount: allIssues.length,
      ollamaUsed: ollamaAvailable,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get a condensed one-liner for hook injection
   */
  static async getCondensedOutput(input: HookAggregatorInput): Promise<string> {
    const result = await this.aggregate(input);
    if (result.passed && result.issueCount === 0) {
      return "";
    }
    return `⚠️ ${result.summary}${result.issueCount > result.issues.length ? ` (+${result.issueCount - result.issues.length} more)` : ""}`;
  }
}

export const localHookAggregatorEngine = LocalHookAggregatorEngine;
export default LocalHookAggregatorEngine;
