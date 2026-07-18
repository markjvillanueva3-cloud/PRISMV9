/**
 * ToolRedirectEngine — Suggests more efficient tool alternatives
 *
 * Given a tool call and its parameters, recommends a cheaper alternative
 * when available. Powers the hook-level redirect hints.
 *
 * Token savings: 200-2000 tokens per redirect by using the optimal
 * tool for each operation.
 *
 * @version 1.0.0
 */

export interface RedirectSuggestion {
  original: string;
  suggested: string;
  reason: string;
  savingsEstimate: number; // tokens
  confidence: "high" | "medium" | "low";
}

interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export class ToolRedirectEngine {

  /**
   * Evaluate a tool call and suggest a better alternative if one exists.
   */
  evaluate(call: ToolCall): RedirectSuggestion | null {
    const { tool, params } = call;

    // Bash → dedicated tool redirects
    if (tool === "Bash") {
      return this.evaluateBash(params.command as string);
    }

    // Agent for simple queries → direct tools
    if (tool === "Agent") {
      return this.evaluateAgent(params.prompt as string);
    }

    // Read of known-large files → Grep
    if (tool === "Read") {
      return this.evaluateRead(params.file_path as string, params);
    }

    // Glob with very specific pattern → Read
    if (tool === "Glob") {
      return this.evaluateGlob(params.pattern as string);
    }

    // WebFetch for docs → context7
    if (tool === "WebFetch") {
      return this.evaluateWebFetch(params.url as string);
    }

    return null;
  }

  private evaluateBash(command?: string): RedirectSuggestion | null {
    if (!command) return null;

    const redirects: Array<{ pattern: RegExp; tool: string; reason: string; savings: number }> = [
      { pattern: /^\s*(cat|head|tail)\s/, tool: "Read", reason: "Read tool is cheaper than shell cat/head/tail", savings: 200 },
      { pattern: /^\s*(grep|rg)\s/, tool: "Grep", reason: "Grep tool avoids shell overhead and has better output control", savings: 300 },
      { pattern: /^\s*find\s/, tool: "Glob", reason: "Glob is faster and cheaper than shell find", savings: 200 },
      { pattern: /^\s*sed\s+-i/, tool: "Edit", reason: "Edit tool provides safer file modification with undo", savings: 100 },
      { pattern: /^\s*(echo|printf)\s.*>/, tool: "Write", reason: "Write tool is safer for file creation", savings: 100 },
      { pattern: /^\s*wc\s+-l/, tool: "Grep (count mode)", reason: "Grep count mode avoids shell overhead", savings: 150 },
      { pattern: /^\s*ls\s/, tool: "Glob", reason: "Glob provides file listing without shell overhead", savings: 150 },
    ];

    for (const { pattern, tool, reason, savings } of redirects) {
      if (pattern.test(command)) {
        return {
          original: "Bash",
          suggested: tool,
          reason,
          savingsEstimate: savings,
          confidence: "high",
        };
      }
    }

    return null;
  }

  private evaluateAgent(prompt?: string): RedirectSuggestion | null {
    if (!prompt || prompt.length > 120) return null;

    const lower = prompt.toLowerCase();

    // Simple file search
    if (/^(find|locate|where is)\s+\S+\s*(file|\.ts|\.js)?$/i.test(prompt.trim())) {
      return {
        original: "Agent",
        suggested: "Glob",
        reason: "Simple file search doesn't need Agent overhead",
        savingsEstimate: 1500,
        confidence: "high",
      };
    }

    // Simple grep
    if (/^(search|find|grep)\s+(for\s+)?\S+\s+in\s/i.test(prompt.trim())) {
      return {
        original: "Agent",
        suggested: "Grep",
        reason: "Simple content search doesn't need Agent overhead",
        savingsEstimate: 1500,
        confidence: "high",
      };
    }

    // Read file
    if (/^(read|show|display|what'?s in)\s+\S+/i.test(prompt.trim()) && lower.includes(".")) {
      return {
        original: "Agent",
        suggested: "Read",
        reason: "Reading a single file doesn't need Agent overhead",
        savingsEstimate: 1500,
        confidence: "medium",
      };
    }

    return null;
  }

  private evaluateRead(filePath?: string, params?: Record<string, unknown>): RedirectSuggestion | null {
    if (!filePath) return null;

    // Large known files without offset/limit
    const largeFiles = [
      "index.ts", "catalog.ts", "machine-profiles", "sgs-tool", "osg-tool",
      "guhring-tool", "big-daishowa", "workholding", "MASTER_INDEX",
    ];

    const hasLimit = params && (params.limit || params.offset);
    if (!hasLimit && largeFiles.some(f => filePath.includes(f))) {
      return {
        original: "Read",
        suggested: "Grep or Read with offset/limit",
        reason: "This file is large. Use Grep to find specific content, or Read with offset/limit",
        savingsEstimate: 800,
        confidence: "medium",
      };
    }

    return null;
  }

  private evaluateGlob(pattern?: string): RedirectSuggestion | null {
    if (!pattern) return null;

    // Exact filename — just Read it
    if (!pattern.includes("*") && !pattern.includes("?") && pattern.includes(".")) {
      return {
        original: "Glob",
        suggested: "Read",
        reason: "For a specific file path, Read is direct — no Glob search needed",
        savingsEstimate: 100,
        confidence: "high",
      };
    }

    return null;
  }

  private evaluateWebFetch(url?: string): RedirectSuggestion | null {
    if (!url) return null;

    const docDomains = [
      "docs.python.org", "developer.mozilla.org", "nodejs.org/api",
      "react.dev", "nextjs.org/docs", "typescriptlang.org",
      "vitejs.dev", "vitest.dev", "expressjs.com", "zod.dev",
    ];

    if (docDomains.some(d => url.includes(d))) {
      return {
        original: "WebFetch",
        suggested: "context7 MCP",
        reason: "Documentation sites are better served by context7 — more focused, less noise",
        savingsEstimate: 2000,
        confidence: "high",
      };
    }

    return null;
  }

  /**
   * Batch evaluate multiple calls.
   */
  evaluateAll(calls: ToolCall[]): RedirectSuggestion[] {
    return calls.map(c => this.evaluate(c)).filter((s): s is RedirectSuggestion => s !== null);
  }

  /**
   * Get summary of total potential savings.
   */
  totalSavings(suggestions: RedirectSuggestion[]): number {
    return suggestions.reduce((sum, s) => sum + s.savingsEstimate, 0);
  }
}

export const toolRedirectEngine = new ToolRedirectEngine();
