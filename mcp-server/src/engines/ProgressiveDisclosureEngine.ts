/**
 * ProgressiveDisclosureEngine — U-FORE-13 (PSAU-FORESIGHT)
 * ==========================================================
 *
 * Shapes foresight output so the default is a short top-line
 * (≤200 tokens) and detail is opt-in via `expand: true` or
 * specific section keys.
 *
 * Intent: block-and-teach, never block-and-leave. The /foresight
 * default output must not teach learned helplessness.
 */

export interface ForesightSection {
  key: string;
  title: string;
  tokens: number;
  severity: 1 | 2 | 3 | 4 | 5;
  body: string;
}

export interface DisclosureInput {
  sections: ForesightSection[];
  budget?: number; // default 200 tokens
  expand?: boolean;
  includeKeys?: string[];
  minSeverity?: 1 | 2 | 3 | 4 | 5;
}

export interface DisclosureReport {
  shown: ForesightSection[];
  hiddenCount: number;
  totalTokens: number;
  budget: number;
  truncated: boolean;
  expandHint: string | null;
}

const DEFAULT_BUDGET = 200;

export class ProgressiveDisclosureEngine {
  readonly name = "ProgressiveDisclosureEngine";

  /**
   * Choose which sections to show within a token budget.
   *
   * Default: sections sorted by severity desc, kept until budget exhausted.
   * `expand: true` returns everything. `includeKeys` forces specific keys.
   * `minSeverity` filters out anything below the threshold.
   */
  disclose(input: DisclosureInput): DisclosureReport {
    this.assertInput(input);
    const budget = input.budget ?? DEFAULT_BUDGET;
    const filtered = input.sections.filter((s) =>
      input.minSeverity == null ? true : s.severity >= input.minSeverity
    );

    if (input.expand) {
      const totalTokens = filtered.reduce((sum, s) => sum + Math.max(0, s.tokens), 0);
      return {
        shown: filtered,
        hiddenCount: 0,
        totalTokens,
        budget,
        truncated: false,
        expandHint: null,
      };
    }

    // Sort: forced-include first, then severity desc, then token asc (tiebreaker favors tight info)
    const forced = new Set(input.includeKeys ?? []);
    const sorted = [...filtered].sort((a, b) => {
      const aForced = forced.has(a.key) ? 1 : 0;
      const bForced = forced.has(b.key) ? 1 : 0;
      if (aForced !== bForced) return bForced - aForced;
      if (a.severity !== b.severity) return b.severity - a.severity;
      return a.tokens - b.tokens;
    });

    const shown: ForesightSection[] = [];
    let remaining = budget;
    for (const s of sorted) {
      const cost = Math.max(0, s.tokens);
      if (cost > remaining && !forced.has(s.key)) continue;
      shown.push(s);
      remaining -= cost;
      if (remaining <= 0) break;
    }

    const hiddenCount = filtered.length - shown.length;
    const totalTokens = shown.reduce((sum, s) => sum + Math.max(0, s.tokens), 0);
    const truncated = hiddenCount > 0;
    const expandHint = truncated
      ? `+${hiddenCount} section(s) hidden — pass expand:true to see everything`
      : null;

    return {
      shown,
      hiddenCount,
      totalTokens,
      budget,
      truncated,
      expandHint,
    };
  }

  /**
   * Render the disclosure as a compact string (the /foresight default).
   */
  render(report: DisclosureReport): string {
    const lines: string[] = [];
    for (const s of report.shown) {
      lines.push(`[sev ${s.severity}] ${s.title}`);
      if (s.body) lines.push(`  ${s.body}`);
    }
    if (report.expandHint) lines.push(report.expandHint);
    return lines.join("\n");
  }

  /**
   * Convenience — one-shot disclose + render.
   */
  shape(input: DisclosureInput): string {
    return this.render(this.disclose(input));
  }

  private assertInput(input: unknown): asserts input is DisclosureInput {
    if (!input || typeof input !== "object") {
      throw new Error("ProgressiveDisclosureEngine.disclose: input must be an object");
    }
    const rec = input as Partial<DisclosureInput>;
    if (!Array.isArray(rec.sections)) {
      throw new Error("ProgressiveDisclosureEngine.disclose: sections must be an array");
    }
  }
}

export const progressiveDisclosureEngine = new ProgressiveDisclosureEngine();
