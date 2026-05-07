/**
 * TeachingNoGoEngine — U-FORE-13 (PSAU-FORESIGHT)
 * =================================================
 *
 * Every NO-GO verdict carries a minimal_fix, root_cause, learn_link,
 * and unblock_command so the developer is never blocked-and-left.
 *
 * Default output is compact (≤200 tokens). Pass `detailed: true` to
 * expand the full reasoning trace.
 */

export type Verdict = "go" | "no_go" | "proceed_with_warning";

export interface NoGoInput {
  verdict: Verdict;
  rootCause?: string;
  failingCheck?: string;
  context?: Record<string, unknown>;
  detailed?: boolean;
}

export interface NoGoResponse {
  verdict: Verdict;
  rootCause: string;
  minimalFix: string;
  learnLink: string;
  unblockCommand: string;
  details?: string;
}

const FIX_LIBRARY: Record<string, {
  minimalFix: string;
  learnLink: string;
  unblockCommand: string;
}> = {
  missing_rollback: {
    minimalFix: "Add a rollback plan to your build input (e.g. 'git revert HEAD' or 'rm -f <path>').",
    learnLink: "docs/rollback-plans.md",
    unblockCommand: "prism_dev:rollback_plan { unitId: '<your-unit-id>', steps: [...] }",
  },
  inline_physics_constant: {
    minimalFix: "Import the constant from src/physics/constants.ts instead of inlining a literal.",
    learnLink: "docs/physics-constants.md",
    unblockCommand: "grep -n kc1_1 mcp-server/src/physics/constants.ts",
  },
  sx_gate_violation: {
    minimalFix: "Raise S(x) ≥ 0.70 — check force/thermal margin and workholding adequacy.",
    learnLink: "docs/safety-gate.md",
    unblockCommand: "prism_omega:auto_score { material: '<iso>', machine: '<id>' }",
  },
  duplicate_engine: {
    minimalFix: "Use the existing engine. Call duplicationGuardEngine.mustCheckBeforeCreating() for details.",
    learnLink: "docs/duplication-guard.md",
    unblockCommand: "prism_dev:knowledge_gap_scan { query: { intent: '<your-intent>' } }",
  },
  missing_tests: {
    minimalFix: "Create src/__tests__/<EngineName>.test.ts with ≥10 real assertions.",
    learnLink: "docs/test-legitimacy.md",
    unblockCommand: "grep -r 'describe(' mcp-server/src/__tests__ | head -3",
  },
  type_errors: {
    minimalFix: "Run tsc --noEmit and fix the reported errors — don't cast to any.",
    learnLink: "docs/type-safety.md",
    unblockCommand: "npx tsc --noEmit 2>&1 | head -20",
  },
  context_overflow: {
    minimalFix: "Run /compact now or /handoff — current session won't fit the remaining plan.",
    learnLink: "docs/context-budget.md",
    unblockCommand: "prism_dev:context_budget_forecast { input: { currentTokens, remainingSteps } }",
  },
  wiring_incomplete: {
    minimalFix: "Add the engine's action name to the dispatcher's ACTIONS enum + matching case handler.",
    learnLink: "docs/dispatcher-wiring.md",
    unblockCommand: "prism_dev:integration_foresight { spec: { name: '<YourEngine>' } }",
  },
};

const DEFAULT_FIX = {
  minimalFix: "Review the root cause and fix before retrying.",
  learnLink: "docs/troubleshooting.md",
  unblockCommand: "prism_dev:gap_predict { artifact: { filePath, content } }",
};

export class TeachingNoGoEngine {
  readonly name = "TeachingNoGoEngine";

  /**
   * Attach teaching metadata to a NO-GO verdict.
   *
   * @param input  {verdict, rootCause, failingCheck, ...}.
   * @returns  Response with minimalFix + learnLink + unblockCommand.
   */
  respond(input: NoGoInput): NoGoResponse {
    this.assertInput(input);
    const fix = this.lookupFix(input.failingCheck);
    const resp: NoGoResponse = {
      verdict: input.verdict,
      rootCause: input.rootCause ?? "Not specified by caller",
      minimalFix: fix.minimalFix,
      learnLink: fix.learnLink,
      unblockCommand: fix.unblockCommand,
    };
    if (input.detailed) {
      resp.details = this.renderDetails(input, fix);
    }
    return resp;
  }

  /**
   * Render a compact one-liner suitable for the default /foresight output.
   */
  renderCompact(resp: NoGoResponse): string {
    const icon = resp.verdict === "go"
      ? "🟢"
      : resp.verdict === "proceed_with_warning"
        ? "🟡"
        : "🔴";
    return `${icon} ${resp.verdict.toUpperCase()} — ${resp.rootCause}. Fix: ${resp.minimalFix}`;
  }

  /**
   * List every failing-check id the engine knows how to teach.
   */
  supportedChecks(): string[] {
    return Object.keys(FIX_LIBRARY);
  }

  private lookupFix(failingCheck: string | undefined) {
    if (!failingCheck) return DEFAULT_FIX;
    return FIX_LIBRARY[failingCheck] ?? DEFAULT_FIX;
  }

  private renderDetails(input: NoGoInput, fix: typeof DEFAULT_FIX): string {
    const lines: string[] = [];
    lines.push(`Root cause: ${input.rootCause ?? "(none provided)"}`);
    lines.push(`Failing check: ${input.failingCheck ?? "(none)"}`);
    lines.push(`Minimal fix: ${fix.minimalFix}`);
    lines.push(`Learn more: ${fix.learnLink}`);
    lines.push(`Unblock command: ${fix.unblockCommand}`);
    if (input.context) {
      lines.push(`Context: ${JSON.stringify(input.context).slice(0, 200)}`);
    }
    return lines.join("\n");
  }

  private assertInput(input: unknown): asserts input is NoGoInput {
    if (!input || typeof input !== "object") {
      throw new Error("TeachingNoGoEngine.respond: input must be an object");
    }
    const rec = input as Partial<NoGoInput>;
    if (rec.verdict !== "go" && rec.verdict !== "no_go" && rec.verdict !== "proceed_with_warning") {
      throw new Error("TeachingNoGoEngine.respond: verdict must be 'go' | 'no_go' | 'proceed_with_warning'");
    }
  }
}

export const teachingNoGoEngine = new TeachingNoGoEngine();
