/**
 * HookRuleMatcherEngine — Matches tool calls against hookify rules
 *
 * Evaluates a tool call against the set of defined hookify rules
 * (block, warn, rewrite) and returns matching rules with actions.
 * Used to pre-check if a tool call will be blocked before executing.
 *
 * Token savings: Prevents wasted tool calls by pre-checking rules.
 * ~100-500 tokens per avoided blocked call.
 *
 * @version 1.0.0
 */

export type RuleType = "block" | "warn" | "rewrite" | "autofire";

export interface HookRule {
  name: string;
  type: RuleType;
  event: string;
  tool?: string;
  condition: string;
  message: string;
}

export interface RuleMatch {
  rule: HookRule;
  matched: boolean;
  action: RuleType;
  message: string;
}

export class HookRuleMatcherEngine {
  private rules: HookRule[] = [];

  /**
   * Load rules from parsed hookify definitions.
   */
  loadRules(rules: HookRule[]): void {
    this.rules = rules;
  }

  /**
   * Add a single rule.
   */
  addRule(rule: HookRule): void {
    this.rules.push(rule);
  }

  /**
   * Match a tool call against all rules.
   */
  match(tool: string, params: Record<string, unknown>): RuleMatch[] {
    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      if (rule.event !== "PreToolUse") continue;
      if (rule.tool && rule.tool !== tool) continue;

      // Simple keyword matching against condition
      const matched = this.evaluateCondition(rule.condition, tool, params);
      if (matched) {
        matches.push({
          rule,
          matched: true,
          action: rule.type,
          message: rule.message,
        });
      }
    }

    return matches;
  }

  /**
   * Quick check: will this call be blocked?
   */
  willBlock(tool: string, params: Record<string, unknown>): boolean {
    return this.match(tool, params).some(m => m.action === "block");
  }

  /**
   * Quick check: will this call trigger warnings?
   */
  getWarnings(tool: string, params: Record<string, unknown>): string[] {
    return this.match(tool, params)
      .filter(m => m.action === "warn")
      .map(m => m.message);
  }

  /**
   * Get all rules for a specific tool.
   */
  rulesForTool(tool: string): HookRule[] {
    return this.rules.filter(r => r.tool === tool || !r.tool);
  }

  /**
   * Count rules by type.
   */
  counts(): Record<RuleType, number> {
    const result: Record<RuleType, number> = { block: 0, warn: 0, rewrite: 0, autofire: 0 };
    for (const r of this.rules) {
      result[r.type] = (result[r.type] || 0) + 1;
    }
    return result;
  }

  /**
   * One-liner summary.
   */
  oneLiner(): string {
    const c = this.counts();
    return `${this.rules.length} rules: ${c.block} block, ${c.warn} warn, ${c.rewrite} rewrite, ${c.autofire} autofire`;
  }

  private evaluateCondition(condition: string, tool: string, params: Record<string, unknown>): boolean {
    const lower = condition.toLowerCase();
    const filePath = ((params.file_path || params.path || "") as string).toLowerCase();
    const command = ((params.command || "") as string).toLowerCase();
    const pattern = ((params.pattern || "") as string).toLowerCase();

    // Check file_path conditions
    if (lower.includes("file_path") && filePath) {
      if (lower.includes("endswith") || lower.includes("ends with")) {
        const match = lower.match(/ends?\s*with\s+"([^"]+)"/);
        if (match && filePath.endsWith(match[1])) return true;
      }
      if (lower.includes("contains")) {
        const match = lower.match(/contains\s+"([^"]+)"/);
        if (match && filePath.includes(match[1])) return true;
      }
    }

    // Check command conditions
    if (lower.includes("command") && command) {
      if (lower.includes("matches")) {
        const match = lower.match(/matches\s+"([^"]+)"/);
        if (match) {
          try {
            const regex = new RegExp(match[1], "i");
            if (regex.test(command)) return true;
          } catch {
            if (command.includes(match[1])) return true;
          }
        }
      }
    }

    // Check pattern conditions
    if (lower.includes("pattern") && pattern) {
      if (lower.includes("is")) {
        const match = lower.match(/pattern\s+is\s+"([^"]+)"/);
        if (match && pattern === match[1].toLowerCase()) return true;
      }
    }

    return false;
  }
}

export const hookRuleMatcherEngine = new HookRuleMatcherEngine();
