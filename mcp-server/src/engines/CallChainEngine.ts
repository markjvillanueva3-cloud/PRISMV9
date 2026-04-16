/**
 * CallChainEngine — Tool call chain analysis and optimization
 *
 * Tracks sequences of tool calls and identifies common anti-patterns
 * that waste tokens. Provides real-time chain analysis and
 * suggests optimized alternatives.
 *
 * Token savings: Catches multi-step waste patterns before they complete.
 *
 * @version 1.0.0
 */

export interface ChainLink {
  tool: string;
  target: string; // file path, pattern, URL, etc.
  timestamp: number;
}

export interface ChainAntiPattern {
  name: string;
  chain: string[]; // e.g., ["Glob", "Read", "Grep"]
  description: string;
  alternative: string;
  tokenWaste: number;
}

// Known anti-patterns in tool call sequences
const ANTI_PATTERNS: ChainAntiPattern[] = [
  {
    name: "glob-read-grep",
    chain: ["Glob", "Read", "Grep"],
    description: "Found files with Glob, read them, then grepped — could grep directly",
    alternative: "Use Grep with path and glob params to search directly without intermediate Read",
    tokenWaste: 3000,
  },
  {
    name: "read-edit-read",
    chain: ["Read", "Edit", "Read"],
    description: "Read a file, edited it, then read it again — you know the content from the edit",
    alternative: "After Edit, use the known content. Don't re-read the file",
    tokenWaste: 2000,
  },
  {
    name: "grep-read-edit",
    chain: ["Grep", "Read", "Edit"],
    description: "Grepped, then read full file, then edited — Grep already showed the relevant section",
    alternative: "After Grep finds the location, Edit directly with the old_string from Grep output",
    tokenWaste: 2000,
  },
  {
    name: "read-read-read",
    chain: ["Read", "Read", "Read"],
    description: "Three consecutive reads — batch these in parallel or use Agent for exploration",
    alternative: "Issue multiple Read calls in a single parallel batch",
    tokenWaste: 400, // just overhead savings
  },
  {
    name: "toolsearch-toolsearch",
    chain: ["ToolSearch", "ToolSearch"],
    description: "Multiple ToolSearch calls — load all needed tools in one select: call",
    alternative: "Use select:Tool1,Tool2,Tool3 to load multiple tools at once",
    tokenWaste: 300,
  },
  {
    name: "write-read-same",
    chain: ["Write", "Read"],
    description: "Wrote a file then immediately read it — you just provided the content",
    alternative: "Use the content you just wrote. No need to read it back",
    tokenWaste: 2500,
  },
  {
    name: "bash-bash-bash",
    chain: ["Bash", "Bash", "Bash"],
    description: "Three sequential Bash calls — chain with && or run in parallel",
    alternative: "Combine independent commands with && or run them in parallel",
    tokenWaste: 600,
  },
  {
    name: "glob-glob-glob",
    chain: ["Glob", "Glob", "Glob"],
    description: "Three sequential Glob calls — combine patterns with brace expansion",
    alternative: "Use **/*.{ts,tsx,js} or run multiple Globs in parallel",
    tokenWaste: 400,
  },
];

export class CallChainEngine {
  private chain: ChainLink[] = [];
  private readonly maxChain = 30;
  private detected: ChainAntiPattern[] = [];

  /**
   * Add a link to the chain.
   */
  add(tool: string, target = ""): ChainAntiPattern | null {
    this.chain.push({ tool, target, timestamp: Date.now() });
    if (this.chain.length > this.maxChain) {
      this.chain = this.chain.slice(-this.maxChain);
    }
    return this.checkLatest();
  }

  /**
   * Check if the latest chain segment matches an anti-pattern.
   */
  private checkLatest(): ChainAntiPattern | null {
    for (const pattern of ANTI_PATTERNS) {
      const len = pattern.chain.length;
      if (this.chain.length < len) continue;

      const recent = this.chain.slice(-len);
      const matches = recent.every((link, i) => link.tool === pattern.chain[i]);

      if (matches) {
        // Check for same-target patterns
        if (pattern.name === "read-edit-read" || pattern.name === "write-read-same") {
          const targets = recent.map(l => l.target);
          if (targets[0] !== targets[targets.length - 1]) continue;
        }

        // Check time window (all within 60s)
        const span = recent[len - 1].timestamp - recent[0].timestamp;
        if (span > 60_000) continue;

        this.detected.push(pattern);
        return pattern;
      }
    }
    return null;
  }

  /**
   * Get all detected anti-patterns.
   */
  getDetected(): ChainAntiPattern[] {
    return [...this.detected];
  }

  /**
   * Get the current chain as a compact string.
   */
  getChainString(last = 10): string {
    return this.chain
      .slice(-last)
      .map(l => l.tool)
      .join(" → ");
  }

  /**
   * Get summary of detected patterns.
   */
  getSummary(): string {
    if (this.detected.length === 0) return "No anti-patterns detected.";
    const total = this.detected.reduce((s, p) => s + p.tokenWaste, 0);
    const lines = this.detected.map(p =>
      `- ${p.name}: ${p.description} (~${p.tokenWaste} tokens)`
    );
    return `${this.detected.length} anti-pattern(s) detected (~${total} tokens wasted):\n${lines.join("\n")}`;
  }

  /**
   * Get optimization suggestions for the current chain.
   */
  suggest(): string[] {
    const suggestions: string[] = [];
    const recent = this.chain.slice(-10).map(l => l.tool);

    // Count tool types
    const counts: Record<string, number> = {};
    for (const tool of recent) {
      counts[tool] = (counts[tool] || 0) + 1;
    }

    if ((counts["Read"] || 0) >= 3) {
      suggestions.push("High Read count — issue multiple Read calls in parallel");
    }
    if ((counts["Grep"] || 0) >= 3) {
      suggestions.push("High Grep count — consider a single broader pattern or Agent for exploration");
    }
    if ((counts["Bash"] || 0) >= 3) {
      suggestions.push("High Bash count — chain commands with && or use parallel calls");
    }

    return suggestions;
  }

  /**
   * Reset chain and detected patterns.
   */
  reset(): void {
    this.chain = [];
    this.detected = [];
  }
}

export const callChainEngine = new CallChainEngine();
