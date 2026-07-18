/**
 * StopConditionEngine — Tool call stop/skip decision engine
 *
 * Evaluates whether a pending tool call should be stopped, skipped,
 * or warned about based on context state, budget, and usage patterns.
 * Designed to power hook scripts with structured decision-making.
 *
 * Token savings: Prevents wasteful tool calls before they execute.
 *
 * @version 1.0.0
 */

export type StopDecision = "allow" | "warn" | "block";

export interface StopEvaluation {
  decision: StopDecision;
  reason: string;
  saving: number; // estimated tokens saved if blocked
  alternative?: string;
}

export interface ContextState {
  totalTokensUsed: number;
  maxBudget: number;
  recentFiles: string[]; // files read/edited in last N minutes
  recentGreps: string[]; // grep patterns run recently
  toolCallCount: number;
  sessionAgeMinutes: number;
}

interface StopRule {
  name: string;
  evaluate: (tool: string, params: Record<string, unknown>, ctx: ContextState) => StopEvaluation | null;
}

const RULES: StopRule[] = [
  {
    name: "budget-critical",
    evaluate: (_tool, _params, ctx) => {
      const pct = (ctx.totalTokensUsed / ctx.maxBudget) * 100;
      if (pct >= 95) {
        return {
          decision: "block",
          reason: `Budget at ${Math.round(pct)}% — context overflow imminent`,
          saving: 2000,
          alternative: "Run /compact immediately. Only essential operations allowed.",
        };
      }
      if (pct >= 85) {
        return {
          decision: "warn",
          reason: `Budget at ${Math.round(pct)}% — conserve tokens`,
          saving: 0,
          alternative: "Use compact outputs. Avoid full file reads.",
        };
      }
      return null;
    },
  },
  {
    name: "redundant-read",
    evaluate: (tool, params, ctx) => {
      if (tool !== "Read") return null;
      const fp = String(params.file_path || "");
      if (fp && ctx.recentFiles.includes(fp)) {
        return {
          decision: "block",
          reason: `File '${fp.split("/").pop()}' already in context from recent read/edit`,
          saving: 2000,
          alternative: "Use the content already in context.",
        };
      }
      return null;
    },
  },
  {
    name: "redundant-grep",
    evaluate: (tool, params, ctx) => {
      if (tool !== "Grep") return null;
      const pattern = String(params.pattern || "");
      const path = String(params.path || "");
      const key = `${pattern}|${path}`;
      if (pattern && ctx.recentGreps.includes(key)) {
        return {
          decision: "block",
          reason: `Grep '${pattern}' on '${path || "cwd"}' already ran recently`,
          saving: 500,
          alternative: "Use the previous search results.",
        };
      }
      return null;
    },
  },
  {
    name: "large-unbounded-read",
    evaluate: (tool, params, _ctx) => {
      if (tool !== "Read") return null;
      const fp = String(params.file_path || "");
      const hasLimit = "limit" in params || "offset" in params;
      if (!hasLimit && fp) {
        // Check known-large file patterns
        const large = [
          "index.ts", "package-lock.json", "yarn.lock",
          ".min.js", ".min.css", ".map",
        ];
        if (large.some(p => fp.endsWith(p))) {
          return {
            decision: "warn",
            reason: `Reading potentially large file '${fp.split("/").pop()}' without limit`,
            saving: 3000,
            alternative: "Add offset/limit params or use Grep for specific content.",
          };
        }
      }
      return null;
    },
  },
  {
    name: "high-frequency-calls",
    evaluate: (_tool, _params, ctx) => {
      if (ctx.toolCallCount > 100 && ctx.sessionAgeMinutes < 10) {
        return {
          decision: "warn",
          reason: `${ctx.toolCallCount} tool calls in ${ctx.sessionAgeMinutes}min — unusually high frequency`,
          saving: 0,
          alternative: "Consider batching operations or using more targeted queries.",
        };
      }
      return null;
    },
  },
  {
    name: "wasteful-tools",
    evaluate: (tool, params, _ctx) => {
      // Agent for trivial tasks
      if (tool === "Agent") {
        const prompt = String(params.prompt || params.query || params.task || "");
        if (prompt.length < 50 && prompt.split(" ").length < 8) {
          return {
            decision: "warn",
            reason: "Short Agent query — direct tool call would be 2-5x cheaper",
            saving: 1000,
            alternative: "Use Read/Grep/Glob directly instead of spawning a sub-agent.",
          };
        }
      }
      // WebFetch when content might be cached
      if (tool === "WebFetch") {
        const url = String(params.url || "");
        if (url.includes("github.com") && url.includes("/blob/")) {
          return {
            decision: "warn",
            reason: "Fetching GitHub blob — use Read tool if file is local",
            saving: 1500,
            alternative: "Check if this file exists locally first.",
          };
        }
      }
      return null;
    },
  },
];

export class StopConditionEngine {

  /**
   * Evaluate whether a tool call should proceed.
   */
  evaluate(
    tool: string,
    params: Record<string, unknown>,
    ctx: ContextState,
  ): StopEvaluation {
    // Run all rules, return highest-severity match
    let worstDecision: StopEvaluation = {
      decision: "allow",
      reason: "No stop conditions triggered",
      saving: 0,
    };

    const severity = { allow: 0, warn: 1, block: 2 };

    for (const rule of RULES) {
      const result = rule.evaluate(tool, params, ctx);
      if (result && severity[result.decision] > severity[worstDecision.decision]) {
        worstDecision = result;
      }
    }

    return worstDecision;
  }

  /**
   * Quick check — returns true if the call should be blocked.
   */
  shouldBlock(
    tool: string,
    params: Record<string, unknown>,
    ctx: ContextState,
  ): boolean {
    return this.evaluate(tool, params, ctx).decision === "block";
  }

  /**
   * Get all applicable rules for a tool call (not just the worst).
   */
  evaluateAll(
    tool: string,
    params: Record<string, unknown>,
    ctx: ContextState,
  ): StopEvaluation[] {
    const results: StopEvaluation[] = [];
    for (const rule of RULES) {
      const result = rule.evaluate(tool, params, ctx);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * Get rule names.
   */
  getRuleNames(): string[] {
    return RULES.map(r => r.name);
  }

  /**
   * Estimate total savings from a set of stop evaluations.
   */
  totalSavings(evaluations: StopEvaluation[]): number {
    return evaluations.reduce((sum, e) => sum + e.saving, 0);
  }
}

export const stopConditionEngine = new StopConditionEngine();
