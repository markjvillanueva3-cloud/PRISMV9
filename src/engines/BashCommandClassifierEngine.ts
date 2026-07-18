/**
 * BashCommandClassifierEngine — Classifies bash commands and suggests token-efficient alternatives
 *
 * Given a bash command string, identifies the category, estimates output token cost,
 * and recommends the optimal replacement (dedicated tool, script, or skill).
 * Powers the /bash-optimize skill with structured analysis.
 *
 * Token savings: 2-5K tokens/session by redirecting bash calls to compact alternatives.
 *
 * @version 1.0.0
 */

export type BashCategory =
  | "search"       // grep, rg, find
  | "read"         // cat, head, tail, less
  | "edit"         // sed, awk
  | "write"        // echo >, printf >, cat <<
  | "build"        // esbuild, tsc, webpack, vite
  | "test"         // vitest, jest, pytest
  | "git"          // git status, diff, log, commit
  | "install"      // npm install, pip install
  | "count"        // wc -l, grep -c, pattern counting
  | "inspect"      // ls, du, file, stat
  | "process"      // ps, kill, docker
  | "compound"     // cd && ..., chained commands
  | "script"       // running a .sh or .py script
  | "other";

export interface BashClassification {
  command: string;
  category: BashCategory;
  estimatedOutputTokens: number;
  alternative: Alternative | null;
  wasteRisk: "none" | "low" | "medium" | "high";
  reason: string;
}

export interface Alternative {
  type: "tool" | "script" | "skill" | "hook";
  name: string;
  usage: string;
  tokenSavings: number;
}

export interface BashSessionReport {
  commands: BashClassification[];
  totalEstimatedTokens: number;
  totalSaveable: number;
  topCategories: Array<{ category: BashCategory; count: number; tokens: number }>;
  recommendations: string[];
}

// Command patterns → categories with output size estimates (tokens)
const PATTERNS: Array<{
  regex: RegExp;
  category: BashCategory;
  outputEstimate: number;
  alternative: Alternative | null;
}> = [
  // Search patterns
  {
    regex: /(?:^|&&\s*)(grep|rg)\s+(-[a-zA-Z]+\s+)*[^\|]+\|\s*wc\s+-l/,
    category: "count",
    outputEstimate: 50,
    alternative: { type: "script", name: "prism-scan.sh", usage: "bash ~/.claude/hooks/lib/prism-scan.sh \"<pattern>\" [scope]", tokenSavings: 200 },
  },
  {
    regex: /(?:^|&&\s*)(grep|rg)\s+(-[a-zA-Z]+\s+)*.*-c\s.*\|\s*sort/,
    category: "count",
    outputEstimate: 400,
    alternative: { type: "script", name: "prism-scan.sh detail", usage: "bash ~/.claude/hooks/lib/prism-scan.sh \"<pattern>\" detail", tokenSavings: 300 },
  },
  {
    regex: /^(grep|rg)\s/,
    category: "search",
    outputEstimate: 800,
    alternative: { type: "tool", name: "Grep", usage: "Use Grep tool with pattern and path", tokenSavings: 500 },
  },
  {
    regex: /(?:^|&&\s*)(grep|rg)\s/,
    category: "search",
    outputEstimate: 800,
    alternative: { type: "tool", name: "Grep", usage: "Use Grep tool with pattern and path", tokenSavings: 400 },
  },
  // Read patterns
  {
    regex: /^(cat|head|tail|less|more)\s/,
    category: "read",
    outputEstimate: 2000,
    alternative: { type: "tool", name: "Read", usage: "Use Read tool with file_path", tokenSavings: 200 },
  },
  // Edit patterns
  {
    regex: /^(sed|awk)\s/,
    category: "edit",
    outputEstimate: 500,
    alternative: { type: "tool", name: "Edit", usage: "Use Edit tool with old_string/new_string", tokenSavings: 300 },
  },
  // Build patterns
  {
    regex: /esbuild\s.*--bundle/,
    category: "build",
    outputEstimate: 500,
    alternative: { type: "script", name: "prism-build.sh", usage: "bash ~/.claude/hooks/lib/prism-build.sh", tokenSavings: 300 },
  },
  {
    regex: /(?:^|&&\s*)npx\s+tsc\s+--noEmit/,
    category: "build",
    outputEstimate: 1000,
    alternative: null,
  },
  // Test patterns
  {
    regex: /(?:^|&&\s*)npx\s+vitest\s+run/,
    category: "test",
    outputEstimate: 2000,
    alternative: { type: "skill", name: "/test", usage: "/test [file]", tokenSavings: 1000 },
  },
  {
    regex: /(?:^|&&\s*)(pytest|jest|npm\s+test)/,
    category: "test",
    outputEstimate: 2000,
    alternative: null,
  },
  // Git patterns
  {
    regex: /^git\s+(status|diff|log|show)/,
    category: "git",
    outputEstimate: 800,
    alternative: null,
  },
  // Install patterns
  {
    regex: /^(npm\s+(install|ci)|pip3?\s+install)/,
    category: "install",
    outputEstimate: 1500,
    alternative: null,
  },
  // Inspect patterns
  {
    regex: /^(ls|du|file|stat|wc)\s/,
    category: "inspect",
    outputEstimate: 300,
    alternative: null,
  },
  // Script patterns
  {
    regex: /\.(sh|py)\b/,
    category: "script",
    outputEstimate: 500,
    alternative: null,
  },
  // Find patterns
  {
    regex: /^find\s/,
    category: "search",
    outputEstimate: 1000,
    alternative: { type: "tool", name: "Glob", usage: "Use Glob tool with pattern", tokenSavings: 600 },
  },
];

export class BashCommandClassifierEngine {
  private history: BashClassification[] = [];

  /**
   * Classify a bash command string.
   */
  classify(command: string): BashClassification {
    const trimmed = command.trim();
    const isCompound = /&&|;\s*\w/.test(trimmed);

    // Find first matching pattern
    for (const p of PATTERNS) {
      if (p.regex.test(trimmed)) {
        const result: BashClassification = {
          command: trimmed.length > 80 ? trimmed.slice(0, 77) + "..." : trimmed,
          category: isCompound && p.category !== "count" ? "compound" : p.category,
          estimatedOutputTokens: p.outputEstimate,
          alternative: p.alternative,
          wasteRisk: p.alternative ? (p.alternative.tokenSavings > 400 ? "high" : "medium") : "none",
          reason: p.alternative
            ? `Use ${p.alternative.name} instead — saves ~${p.alternative.tokenSavings} tokens`
            : `No better alternative available`,
        };
        this.history.push(result);
        return result;
      }
    }

    // No pattern matched
    const result: BashClassification = {
      command: trimmed.length > 80 ? trimmed.slice(0, 77) + "..." : trimmed,
      category: isCompound ? "compound" : "other",
      estimatedOutputTokens: 500,
      alternative: null,
      wasteRisk: "none",
      reason: "Standard bash command, no alternative needed",
    };
    this.history.push(result);
    return result;
  }

  /**
   * Generate a session report from all classified commands.
   */
  report(): BashSessionReport {
    const catMap = new Map<BashCategory, { count: number; tokens: number }>();
    let totalTokens = 0;
    let totalSaveable = 0;

    for (const c of this.history) {
      totalTokens += c.estimatedOutputTokens;
      if (c.alternative) totalSaveable += c.alternative.tokenSavings;
      const entry = catMap.get(c.category) || { count: 0, tokens: 0 };
      entry.count++;
      entry.tokens += c.estimatedOutputTokens;
      catMap.set(c.category, entry);
    }

    const topCategories = [...catMap.entries()]
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.tokens - a.tokens);

    const recommendations: string[] = [];
    const withAlts = this.history.filter(c => c.alternative);
    if (withAlts.length > 0) {
      const grouped = new Map<string, number>();
      for (const c of withAlts) {
        const key = c.alternative!.name;
        grouped.set(key, (grouped.get(key) || 0) + c.alternative!.tokenSavings);
      }
      for (const [name, savings] of [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
        recommendations.push(`Switch to ${name} — saves ~${savings} tokens total`);
      }
    }

    return {
      commands: this.history,
      totalEstimatedTokens: totalTokens,
      totalSaveable,
      topCategories,
      recommendations,
    };
  }

  /**
   * Reset session history.
   */
  reset(): void {
    this.history = [];
  }

  /**
   * Get count of tracked commands.
   */
  get count(): number {
    return this.history.length;
  }
}

/** Singleton instance */
export const bashCommandClassifierEngine = new BashCommandClassifierEngine();
