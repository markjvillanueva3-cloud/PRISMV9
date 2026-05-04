/**
 * TaskClassifierEngine — rules-based prompt classifier for auto-consensus routing.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / AUTO-CONSENSUS.
 *
 * Pure function from prompt text + optional cwd → {taskType, consensusWorthy, reason}.
 * Used by ModelRouterEngine + the auto-consensus UserPromptSubmit hook to decide
 * whether to fan out a task to multi-model consensus or keep it single-model.
 *
 * Task types:
 *   - plan          high-level planning, architecture, design decisions
 *   - build         implementation of new features, multi-file changes
 *   - bug           debugging, root-cause investigation, fixing failures
 *   - error         error handling, exception design, recovery strategies
 *   - review        code review, PR review, validation of existing work
 *   - test          test writing, test scrutiny, coverage analysis
 *   - gap           gap analysis, missing-coverage detection, audit
 *   - validate      final pre-ship validation, build scrutiny
 *   - reason        deep reasoning, complex analysis, multi-step proof
 *   - safety        safety/physics/manufacturing-domain (PRISM-specific)
 *   - trivial       typo fix, lookup, simple question, status check
 *
 * Consensus-worthy: every type EXCEPT trivial. The user's mandate is multi-model
 * coverage on every non-trivial dev task; only trivial gets single-model.
 *
 * @module engines/TaskClassifierEngine
 */

export type TaskType =
  | "plan" | "build" | "bug" | "error" | "review" | "test"
  | "gap" | "validate" | "reason" | "safety" | "trivial";

export interface ClassifierInput {
  prompt: string;
  cwd?: string;
  promptTokens?: number;
}

export interface ClassifierResult {
  taskType: TaskType;
  consensusWorthy: boolean;
  reason: string;
  matchedRules: string[];
}

interface Rule {
  taskType: TaskType;
  pattern: RegExp;
  weight: number;
  consensusWorthy: boolean;
  source: string;
}

const RULES: ReadonlyArray<Rule> = Object.freeze([
  // Safety / physics — highest priority (PRISM-specific)
  { taskType: "safety",   pattern: /\bkienzle|taylor\s+(?:tool\s+life|equation)|cutting\s+force|deflection\s+limit|s\s*\(\s*x\s*\)|safety\s+gate|physics\s+constant|deflection\s+limit|thermal\s+budget\b/i, weight: 100, consensusWorthy: true, source: "safety/physics keywords" },

  // Planning — strategic/architectural
  { taskType: "plan",     pattern: /\b(?:plan|design|architect|architecture|roadmap|strategy|approach)\b/i, weight: 50, consensusWorthy: true, source: "planning keywords" },
  { taskType: "plan",     pattern: /\bhow\s+(?:should|do|would)\s+(?:we|i)\b/i, weight: 40, consensusWorthy: true, source: "exploratory how" },
  { taskType: "plan",     pattern: /\bbest\s+(?:way|approach|practice)\b/i, weight: 40, consensusWorthy: true, source: "best-X seeking" },

  // Bug hunting / debugging
  { taskType: "bug",      pattern: /\b(?:debug|debugging|root\s+cause|why\s+(?:is|does|did|isn't|doesn't))\b/i, weight: 50, consensusWorthy: true, source: "debug keywords" },
  { taskType: "bug",      pattern: /\b(?:not\s+working|broken|fails?|failing|crash(?:es|ing|ed)?|hangs?|hanging)\b/i, weight: 45, consensusWorthy: true, source: "failure-state keywords" },
  { taskType: "bug",      pattern: /\b(?:bug|defect|regression|flaky)\b/i, weight: 50, consensusWorthy: true, source: "bug noun" },

  // Error fixing / handling
  { taskType: "error",    pattern: /\b(?:exception|error\s+(?:handling|recovery)|catch\s+block|graceful\s+(?:fall|degrade))\b/i, weight: 50, consensusWorthy: true, source: "error-handling design" },
  { taskType: "error",    pattern: /\b(?:retry|backoff|circuit\s+breaker|fallback)\b/i, weight: 40, consensusWorthy: true, source: "resilience patterns" },

  // Review
  { taskType: "review",   pattern: /\b(?:review|audit|scrutini[sz]e|check\s+if|verify|critique|assess)\b/i, weight: 50, consensusWorthy: true, source: "review keywords" },
  { taskType: "review",   pattern: /\b(?:pr\s+review|code\s+review|second\s+opinion)\b/i, weight: 60, consensusWorthy: true, source: "review noun" },

  // Test
  { taskType: "test",     pattern: /\b(?:write\s+(?:a\s+)?test|test\s+(?:case|scenario|coverage)|missing\s+test|test\s+gap)\b/i, weight: 50, consensusWorthy: true, source: "test-creation/scrutiny" },
  { taskType: "test",     pattern: /\b(?:vitest|jest|pytest|mocha|playwright)\b/i, weight: 30, consensusWorthy: true, source: "test runner mention" },

  // Gap analysis
  { taskType: "gap",      pattern: /\b(?:gap\s+analysis|missing\s+(?:cover(?:age)?|engine|hook|skill)|orphan(?:ed)?|unwired|dead\s+code)\b/i, weight: 60, consensusWorthy: true, source: "gap/orphan keywords" },
  { taskType: "gap",      pattern: /\bwhat(?:'s)?\s+missing\b/i, weight: 50, consensusWorthy: true, source: "what's-missing" },

  // Validation
  { taskType: "validate", pattern: /\b(?:validate|validation|pre.?ship|release\s+(?:check|gate)|final\s+(?:check|review)|production.?ready)\b/i, weight: 60, consensusWorthy: true, source: "validation keywords" },

  // Build / coding
  { taskType: "build",    pattern: /\b(?:implement|build\s+(?:a|an|the|new)|add\s+(?:a|an|new|support|feature)|create\s+(?:a|an|new))\b/i, weight: 40, consensusWorthy: true, source: "build/implement" },
  { taskType: "build",    pattern: /\brefactor\b/i, weight: 45, consensusWorthy: true, source: "refactor" },
  { taskType: "build",    pattern: /\bmulti.?file\b/i, weight: 40, consensusWorthy: true, source: "multi-file" },

  // Deep reasoning
  { taskType: "reason",   pattern: /\b(?:think\s+(?:through|deeply|carefully)|reason\s+about|chain[- ]of[- ]thought|deep\s+(?:learning|reasoning|analysis))\b/i, weight: 55, consensusWorthy: true, source: "deep-reasoning keywords" },
  { taskType: "reason",   pattern: /\b(?:why\s+would|what\s+if|tradeoff|trade.?off|implications?)\b/i, weight: 30, consensusWorthy: true, source: "exploratory why/what-if" },

  // Trivial — explicitly NOT consensus-worthy. These run last (lower weight).
  { taskType: "trivial",  pattern: /^\s*(?:what|where|when|who|is|are|does|do|can|should)\b[^\n]{0,80}\?\s*$/i, weight: 60, consensusWorthy: false, source: "single-sentence question" },
  { taskType: "trivial",  pattern: /\btypo\b|\bone[- ]?liner\b|\bjust\s+(?:rename|change)\b/i, weight: 60, consensusWorthy: false, source: "trivial edit" },
  { taskType: "trivial",  pattern: /\b(?:status|check|show|list|read)\s+\w+/i, weight: 25, consensusWorthy: false, source: "status/lookup verb" },
]);

// Skip patterns — explicit user opt-out tokens
const SKIP_PATTERNS = [
  /\[no-consensus\]/i,
  /\[skip-consensus\]/i,
  /\[trivial\]/i,
];

// Min prompt length — below this we never trigger consensus
const MIN_CONSENSUS_PROMPT_LEN = 20;

export class TaskClassifierEngine {
  classify(input: ClassifierInput): ClassifierResult {
    this.validate(input);
    const prompt = input.prompt.trim();

    // Hard opt-out
    for (const p of SKIP_PATTERNS) {
      if (p.test(prompt)) {
        return { taskType: "trivial", consensusWorthy: false, reason: "explicit opt-out token", matchedRules: ["opt-out"] };
      }
    }

    // Too short
    if (prompt.length < MIN_CONSENSUS_PROMPT_LEN) {
      return { taskType: "trivial", consensusWorthy: false, reason: `prompt too short (${prompt.length} < ${MIN_CONSENSUS_PROMPT_LEN})`, matchedRules: ["min-len"] };
    }

    // Score per task type
    const scores = new Map<TaskType, { total: number; rules: string[] }>();
    for (const rule of RULES) {
      if (rule.pattern.test(prompt)) {
        const cur = scores.get(rule.taskType) ?? { total: 0, rules: [] };
        cur.total += rule.weight;
        cur.rules.push(`${rule.taskType}:${rule.source}`);
        scores.set(rule.taskType, cur);
      }
    }

    if (scores.size === 0) {
      // No rules matched → treat as low-stakes "build" (the user's vision is consensus on every dev task,
      // but this default catches free-form prompts that don't match any keyword)
      return {
        taskType: "build",
        consensusWorthy: true,
        reason: "no specific rule matched; defaulting to consensus-worthy build",
        matchedRules: ["default-build"],
      };
    }

    // Trivial rules only win when NO substantive rule matched. If any
    // consensus-worthy rule fired, drop trivial from contention so a
    // single-sentence-shape doesn't override real signal.
    const hasSubstantive = [...scores.entries()].some(([t]) => t !== "trivial");
    if (hasSubstantive) scores.delete("trivial");

    // Pick highest-score task type.
    let winner: TaskType = "trivial";
    let winnerScore = -1;
    let winnerRules: string[] = [];
    for (const [t, s] of scores) {
      if (s.total > winnerScore) {
        winner = t;
        winnerScore = s.total;
        winnerRules = s.rules;
      }
    }

    const winnerRule = RULES.find((r) => r.taskType === winner)!;
    return {
      taskType: winner,
      consensusWorthy: winnerRule.consensusWorthy,
      reason: `top match: ${winner} (score=${winnerScore})`,
      matchedRules: winnerRules,
    };
  }

  // ---- internals ----

  private validate(input: ClassifierInput): void {
    if (!input || typeof input !== "object") throw new Error("ClassifierInput required");
    if (typeof input.prompt !== "string") throw new Error("prompt must be a string");
  }
}

export const taskClassifierEngine = new TaskClassifierEngine();
