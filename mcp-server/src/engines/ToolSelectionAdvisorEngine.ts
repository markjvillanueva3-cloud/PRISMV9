/**
 * ToolSelectionAdvisorEngine - Recommends cheapest tool for intent
 *
 * Maps common intents (find file, search content, check existence, etc.)
 * to the most token-efficient tool. Prevents using expensive tools
 * (Agent, WebFetch) when cheaper alternatives exist.
 *
 * @version 1.0.0
 */

export interface ToolAdvice {
  recommended: string;
  alternatives: string[];
  estimatedTokens: number;
  reason: string;
}

export type Intent =
  | "find-file"
  | "search-content"
  | "read-file"
  | "read-section"
  | "check-exists"
  | "list-directory"
  | "count-matches"
  | "edit-file"
  | "run-command"
  | "fetch-docs"
  | "explore-codebase";

const INTENT_MAP: Record<Intent, ToolAdvice> = {
  "find-file": {
    recommended: "Glob",
    alternatives: ["Grep (files_with_matches)", "Bash (find)"],
    estimatedTokens: 100,
    reason: "Glob is cheapest for file discovery (~100 tokens)",
  },
  "search-content": {
    recommended: "Grep",
    alternatives: ["Read + manual scan", "Agent (explore)"],
    estimatedTokens: 200,
    reason: "Grep targets specific patterns (~200 tokens)",
  },
  "read-file": {
    recommended: "Read",
    alternatives: ["Bash (cat)", "Agent"],
    estimatedTokens: 500,
    reason: "Read is the dedicated file reading tool",
  },
  "read-section": {
    recommended: "Read (with offset/limit)",
    alternatives: ["Grep (with context)", "Read (full file)"],
    estimatedTokens: 200,
    reason: "Read with offset/limit reads only needed section",
  },
  "check-exists": {
    recommended: "Glob",
    alternatives: ["Bash (test -f)", "Read (will error if missing)"],
    estimatedTokens: 50,
    reason: "Glob with exact path is cheapest existence check",
  },
  "list-directory": {
    recommended: "Glob",
    alternatives: ["Bash (ls)", "Read"],
    estimatedTokens: 100,
    reason: "Glob lists files without verbose metadata",
  },
  "count-matches": {
    recommended: "Grep (count mode)",
    alternatives: ["Bash (grep -c)", "Grep (content) + count"],
    estimatedTokens: 50,
    reason: "Grep count mode returns just numbers",
  },
  "edit-file": {
    recommended: "Edit",
    alternatives: ["Write (full rewrite)", "Bash (sed)"],
    estimatedTokens: 300,
    reason: "Edit sends only the diff, not full file content",
  },
  "run-command": {
    recommended: "Bash",
    alternatives: [],
    estimatedTokens: 400,
    reason: "Bash is the only option for shell commands",
  },
  "fetch-docs": {
    recommended: "context7",
    alternatives: ["WebFetch", "WebSearch + WebFetch"],
    estimatedTokens: 500,
    reason: "context7 has pre-indexed library docs, cheaper than web",
  },
  "explore-codebase": {
    recommended: "Grep + Glob",
    alternatives: ["Agent (explore)", "Read multiple files"],
    estimatedTokens: 300,
    reason: "Targeted Grep+Glob is cheaper than Agent subagent",
  },
};

export class ToolSelectionAdvisorEngine {
  private adviceLog: Array<{ intent: Intent; recommended: string; timestamp: number }> = [];

  /**
   * Get advice for an intent.
   */
  advise(intent: Intent): ToolAdvice {
    const advice = INTENT_MAP[intent];
    this.adviceLog.push({
      intent,
      recommended: advice.recommended,
      timestamp: Date.now(),
    });
    return advice;
  }

  /**
   * Detect intent from a natural language query.
   */
  detectIntent(query: string): Intent | null {
    const q = query.toLowerCase();
    if (q.includes("find file") || q.includes("where is") || q.includes("locate"))
      return "find-file";
    if (q.includes("search") || q.includes("grep") || q.includes("look for"))
      return "search-content";
    if (q.includes("read") || q.includes("show me") || q.includes("contents of"))
      return "read-file";
    if (q.includes("section") || q.includes("lines") || q.includes("part of"))
      return "read-section";
    if (q.includes("exist") || q.includes("is there"))
      return "check-exists";
    if (q.includes("list") || q.includes("directory") || q.includes("files in"))
      return "list-directory";
    if (q.includes("count") || q.includes("how many"))
      return "count-matches";
    if (q.includes("edit") || q.includes("change") || q.includes("modify") || q.includes("replace"))
      return "edit-file";
    if (q.includes("run") || q.includes("execute") || q.includes("command"))
      return "run-command";
    if (q.includes("docs") || q.includes("documentation") || q.includes("api"))
      return "fetch-docs";
    if (q.includes("explore") || q.includes("understand") || q.includes("architecture"))
      return "explore-codebase";
    return null;
  }

  /**
   * Check if a tool choice is optimal for the detected intent.
   */
  isOptimal(tool: string, intent: Intent): boolean {
    const advice = INTENT_MAP[intent];
    return advice.recommended.startsWith(tool);
  }

  /**
   * Get a cheaper alternative if one exists.
   */
  suggestCheaper(tool: string): string | null {
    const cheaper: Record<string, string> = {
      Agent: "Grep + Glob (targeted search)",
      WebFetch: "context7 (pre-indexed docs)",
      WebSearch: "context7 (library documentation)",
      Bash: "Read/Grep/Glob (dedicated tools)",
    };
    return cheaper[tool] ?? null;
  }

  /**
   * Get statistics on advice given.
   */
  stats(): { totalAdvice: number; topIntents: Array<{ intent: string; count: number }> } {
    const counts = new Map<string, number>();
    for (const entry of this.adviceLog) {
      counts.set(entry.intent, (counts.get(entry.intent) ?? 0) + 1);
    }
    const topIntents = Array.from(counts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);

    return { totalAdvice: this.adviceLog.length, topIntents };
  }

  /**
   * Reset log.
   */
  reset(): void {
    this.adviceLog = [];
  }
}

export const toolSelectionAdvisorEngine = new ToolSelectionAdvisorEngine();
