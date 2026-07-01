/**
 * LocalCommitMessageEngine — LOCAL-LLM-MS0 U-LLM-CMT01
 *
 * Generates git commit messages via local Qwen model.
 * Zero Claude tokens for routine commit message generation.
 *
 * Features:
 * - Analyzes git diff to understand changes
 * - Generates conventional commit messages
 * - Follows project commit format: [SCOPE]/U-ID: title
 * - Falls back to template-based generation if Ollama unavailable
 *
 * Token savings: Commit messages typically cost 200-500 Claude tokens → 0
 *
 * @module engines/LocalCommitMessageEngine
 * @milestone LOCAL-LLM-MS0 Session 6
 */

import { z } from "zod";
import { execSync } from "node:child_process";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COMMIT_MODEL = process.env.OLLAMA_COMMIT_MODEL || "qwen2.5-coder:32b";
const TIMEOUT_MS = 15_000;

export const CommitInputSchema = z.object({
  diff: z.string().optional().describe("Git diff to analyze (auto-fetched if not provided)"),
  scope: z.string().optional().describe("Commit scope (e.g., 'LOCAL-LLM-MS0')"),
  unitId: z.string().optional().describe("Unit ID (e.g., 'U-LLM-CMT01')"),
  type: z.enum([
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "chore",
    "build",
    "ci",
  ]).optional().describe("Conventional commit type"),
  maxLength: z.number().int().min(20).max(200).default(72),
  includeBody: z.boolean().default(false).describe("Include detailed body"),
  staged: z.boolean().default(true).describe("Use staged changes (--cached)"),
});

export type CommitInput = z.input<typeof CommitInputSchema>;

export interface CommitSuggestion {
  subject: string;
  body?: string;
  type: string;
  scope?: string;
  breaking: boolean;
  confidence: number;
  alternatives: string[];
  ollamaUsed: boolean;
  latencyMs: number;
}

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

function getGitDiff(staged: boolean): string {
  try {
    const cmd = staged ? "git diff --cached" : "git diff";
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 100 * 1024 }).trim();
  } catch {
    return "";
  }
}

function getGitStatus(): string {
  try {
    return execSync("git status --porcelain", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function analyzeDiff(diff: string): {
  filesChanged: string[];
  additions: number;
  deletions: number;
  primaryType: string;
  summary: string;
} {
  const lines = diff.split("\n");
  const filesChanged: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      if (match) filesChanged.push(match[1]);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  // Determine primary type based on files
  let primaryType = "chore";
  const fileStr = filesChanged.join(" ").toLowerCase();

  if (fileStr.includes("test")) primaryType = "test";
  else if (fileStr.includes("readme") || fileStr.includes("docs") || fileStr.includes(".md")) primaryType = "docs";
  else if (fileStr.includes("package.json") || fileStr.includes("tsconfig") || fileStr.includes("esbuild")) primaryType = "build";
  else if (fileStr.includes(".yml") || fileStr.includes(".yaml") || fileStr.includes("workflow")) primaryType = "ci";
  else if (fileStr.includes("engine")) primaryType = "feat";
  else if (fileStr.includes("fix") || deletions > additions * 2) primaryType = "fix";
  else if (additions > 50) primaryType = "feat";
  else if (additions > 0 && deletions > 0 && Math.abs(additions - deletions) < 10) primaryType = "refactor";

  const summary = `${filesChanged.length} file(s): +${additions}/-${deletions}`;

  return { filesChanged, additions, deletions, primaryType, summary };
}

function generateFallbackMessage(
  diff: string,
  scope: string | undefined,
  unitId: string | undefined,
  type: string | undefined
): CommitSuggestion {
  const analysis = analyzeDiff(diff);
  const commitType = type || analysis.primaryType;

  let subject: string;
  const topFiles = analysis.filesChanged.slice(0, 3);

  if (topFiles.length === 0) {
    subject = `${commitType}: update files`;
  } else if (topFiles.length === 1) {
    const fileName = topFiles[0].split("/").pop()?.replace(/\.(ts|js|tsx|jsx|md)$/, "") || "file";
    subject = `${commitType}: update ${fileName}`;
  } else {
    const commonDir = topFiles[0].split("/").slice(0, -1).join("/");
    subject = commonDir
      ? `${commitType}: update ${commonDir.split("/").pop()} module`
      : `${commitType}: update ${topFiles.length} files`;
  }

  // Apply PRISM format if scope/unitId provided
  if (scope && unitId) {
    subject = `[${scope}] ${unitId}: ${subject.replace(/^\w+:\s*/, "")}`;
  } else if (scope) {
    subject = `[${scope}] ${subject}`;
  }

  return {
    subject: subject.slice(0, 72),
    type: commitType,
    scope,
    breaking: false,
    confidence: 0.5,
    alternatives: [
      `${commitType}: ${analysis.summary}`,
      `${commitType}(${topFiles[0]?.split("/").pop() || "files"}): changes`,
    ],
    ollamaUsed: false,
    latencyMs: 0,
  };
}

async function generateOllamaMessage(
  diff: string,
  scope: string | undefined,
  unitId: string | undefined,
  type: string | undefined,
  maxLength: number,
  includeBody: boolean
): Promise<CommitSuggestion> {
  const analysis = analyzeDiff(diff);

  // Truncate diff to reasonable size for prompt
  const truncatedDiff = diff.length > 3000 ? diff.slice(0, 3000) + "\n... (truncated)" : diff;

  const formatInstruction = scope && unitId
    ? `Use format: [${scope}] ${unitId}: <description>`
    : scope
    ? `Use format: [${scope}] <type>: <description>`
    : "Use conventional commit format: <type>(<scope>): <description>";

  const prompt = `Generate a git commit message for this diff. Be concise.

${formatInstruction}

FILES CHANGED: ${analysis.filesChanged.join(", ")}
STATS: +${analysis.additions}/-${analysis.deletions} lines

DIFF:
\`\`\`
${truncatedDiff}
\`\`\`

Rules:
- Subject line max ${maxLength} chars
- ${type ? `Use type: ${type}` : "Determine appropriate type (feat/fix/docs/refactor/test/chore)"}
- Focus on WHAT changed, not HOW
- Be specific but concise
${includeBody ? "- Include a body paragraph explaining WHY" : "- No body needed"}

Respond with JSON:
{
  "subject": "commit subject line",
  ${includeBody ? '"body": "detailed explanation",' : ""}
  "type": "feat|fix|docs|refactor|test|chore|build|ci",
  "breaking": false,
  "confidence": 0.9,
  "alternatives": ["alt1", "alt2"]
}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: COMMIT_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 300 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return generateFallbackMessage(diff, scope, unitId, type);
    }

    const data = await response.json() as { response?: string };
    if (!data.response) {
      return generateFallbackMessage(diff, scope, unitId, type);
    }

    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackMessage(diff, scope, unitId, type);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      subject?: string;
      body?: string;
      type?: string;
      breaking?: boolean;
      confidence?: number;
      alternatives?: string[];
    };

    let subject = parsed.subject || generateFallbackMessage(diff, scope, unitId, type).subject;

    // Ensure subject follows format if scope/unitId provided
    if (scope && unitId && !subject.startsWith(`[${scope}]`)) {
      subject = `[${scope}] ${unitId}: ${subject.replace(/^\[?\w+\]?\s*\w*:\s*/, "")}`;
    }

    return {
      subject: subject.slice(0, maxLength),
      body: includeBody ? parsed.body : undefined,
      type: parsed.type || type || analysis.primaryType,
      scope,
      breaking: parsed.breaking || false,
      confidence: parsed.confidence || 0.8,
      alternatives: parsed.alternatives || [],
      ollamaUsed: true,
      latencyMs: 0,
    };
  } catch {
    return generateFallbackMessage(diff, scope, unitId, type);
  }
}

/**
 * LocalCommitMessageEngine — Generate commits via local Qwen
 */
export class LocalCommitMessageEngine {
  /**
   * Generate a commit message suggestion
   */
  static async suggest(input: CommitInput): Promise<CommitSuggestion> {
    const startTime = Date.now();
    const parsed = CommitInputSchema.parse(input);
    const { scope, unitId, type, maxLength, includeBody, staged } = parsed;

    // Get diff if not provided
    const diff = parsed.diff || getGitDiff(staged);
    if (!diff) {
      return {
        subject: "chore: no changes detected",
        type: "chore",
        breaking: false,
        confidence: 0,
        alternatives: [],
        ollamaUsed: false,
        latencyMs: Date.now() - startTime,
      };
    }

    const ollamaAvailable = await isOllamaAvailable();
    let result: CommitSuggestion;

    if (ollamaAvailable) {
      result = await generateOllamaMessage(diff, scope, unitId, type, maxLength, includeBody);
    } else {
      result = generateFallbackMessage(diff, scope, unitId, type);
    }

    result.latencyMs = Date.now() - startTime;
    return result;
  }

  /**
   * Get just the subject line for quick use
   */
  static async getSubject(input: CommitInput): Promise<string> {
    const result = await this.suggest(input);
    return result.subject;
  }

  /**
   * Analyze the current git state
   */
  static analyze(): {
    hasStagedChanges: boolean;
    hasUnstagedChanges: boolean;
    stagedDiff: string;
    unstagedDiff: string;
    status: string;
  } {
    const status = getGitStatus();
    const stagedDiff = getGitDiff(true);
    const unstagedDiff = getGitDiff(false);

    return {
      hasStagedChanges: stagedDiff.length > 0,
      hasUnstagedChanges: unstagedDiff.length > 0,
      stagedDiff,
      unstagedDiff,
      status,
    };
  }

  /**
   * Health check for commit message generation
   */
  static async healthCheck(): Promise<{
    ollamaAvailable: boolean;
    gitAvailable: boolean;
    inGitRepo: boolean;
  }> {
    let gitAvailable = false;
    let inGitRepo = false;

    try {
      execSync("git --version", { encoding: "utf-8" });
      gitAvailable = true;
      execSync("git rev-parse --git-dir", { encoding: "utf-8" });
      inGitRepo = true;
    } catch {
      // Git not available or not in repo
    }

    const ollamaAvailable = await isOllamaAvailable();

    return {
      ollamaAvailable,
      gitAvailable,
      inGitRepo,
    };
  }
}

export const localCommitMessageEngine = LocalCommitMessageEngine;
export default LocalCommitMessageEngine;
