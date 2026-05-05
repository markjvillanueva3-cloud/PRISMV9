/**
 * ConsensusDashboardRendererEngine — render the Dashboard payload as
 * markdown for terminal/cron use.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DASHBOARD-CLI.
 *
 * Why this exists
 * ---------------
 * U-CONSENSUS-DASHBOARD ships a structured dashboard payload, but raw
 * JSON is not scannable in a terminal. Operators want to glance at the
 * dashboard and immediately see: which vendors are best per task, where
 * are my gaps, what should I run next.
 *
 * Pure rendering: takes a Dashboard object, returns a markdown string.
 * No I/O, no data fetching — the CLI script (consensus-dashboard.mjs)
 * pairs this with `consensusPerformanceDashboardEngine.compute()` to
 * produce a print-and-exit one-liner.
 *
 * Three sections:
 *   1. Header — generated timestamp, paths, totals, coverage summary
 *   2. Per-task ranking tables — rank | vendor | EMA | n | last
 *   3. Suggested probes — priority | vendor | task | reason
 *   4. Recent trend — feed line count, reward distribution
 *
 * @module engines/ConsensusDashboardRendererEngine
 */

import type {
  Dashboard,
  PerTaskTypeView,
  SuggestedProbe,
  FeedTrend,
} from "./ConsensusPerformanceDashboardEngine.js";

export interface RenderOpts {
  /** Cap on probe rows shown. Default 10. */
  probesLimit?: number;
  /** If false, suppress the trend section entirely. Default true. */
  showTrend?: boolean;
  /** If false, suppress the probes section entirely. Default true. */
  showProbes?: boolean;
  /** Title shown at the top of the rendered page. Default "Consensus Dashboard". */
  title?: string;
}

const DEFAULT_PROBES_LIMIT = 10;
const DEFAULT_TITLE = "Consensus Dashboard";

export class ConsensusDashboardRendererEngine {
  /**
   * Render the entire dashboard. Returns a single markdown string.
   * Always emits a trailing newline for clean terminal printing.
   */
  render(dashboard: Dashboard, opts: RenderOpts = {}): string {
    const probesLimit = opts.probesLimit ?? DEFAULT_PROBES_LIMIT;
    const showTrend = opts.showTrend !== false;
    const showProbes = opts.showProbes !== false;
    const title = opts.title ?? DEFAULT_TITLE;

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(...this.renderHeader(dashboard));
    lines.push("");
    lines.push(...this.renderPerTaskTables(dashboard.perTaskType));
    if (showProbes) {
      lines.push("");
      lines.push(...this.renderProbes(dashboard.suggestedProbes, probesLimit));
    }
    if (showTrend) {
      lines.push("");
      lines.push(...this.renderTrend(dashboard.trend));
    }
    lines.push("");
    return lines.join("\n");
  }

  /** Render only the per-task ranking tables (used by callers that compose). */
  renderPerTaskTables(perTaskType: Record<string, PerTaskTypeView>): string[] {
    const lines: string[] = [];
    lines.push("## Per-task vendor ranking");
    const keys = Object.keys(perTaskType).sort();
    if (keys.length === 0) {
      lines.push("");
      lines.push("_No task types in dashboard._");
      return lines;
    }
    for (const taskType of keys) {
      const view = perTaskType[taskType];
      lines.push("");
      lines.push(`### ${taskType}`);
      lines.push("");
      const totals = `${view.totalObservations} observations` +
        ` · covered=${view.coverage.covered.length}` +
        ` · sparse=${view.coverage.sparse.length}` +
        ` · missing=${view.coverage.missing.length}`;
      lines.push(`_${totals}_`);
      lines.push("");
      if (view.vendors.length === 0) {
        lines.push("_No covered vendors yet._");
        if (view.coverage.missing.length > 0) {
          lines.push("");
          lines.push(`Missing: ${view.coverage.missing.join(", ")}`);
        }
        continue;
      }
      lines.push("| Rank | Vendor | EMA | n | Last updated |");
      lines.push("|-----:|--------|----:|--:|--------------|");
      for (const v of view.vendors) {
        const last = v.lastUpdated ?? "—";
        lines.push(`| ${v.rank} | ${v.vendor} | ${v.ema.toFixed(4)} | ${v.n} | ${last} |`);
      }
      if (view.coverage.missing.length > 0 || view.coverage.sparse.length > 0) {
        const gaps: string[] = [];
        if (view.coverage.missing.length > 0) gaps.push(`missing: ${view.coverage.missing.join(", ")}`);
        if (view.coverage.sparse.length > 0) gaps.push(`sparse (n<3): ${view.coverage.sparse.join(", ")}`);
        lines.push("");
        lines.push(`_Gaps — ${gaps.join(" · ")}_`);
      }
    }
    return lines;
  }

  /** Render the suggested probes table. */
  renderProbes(probes: readonly SuggestedProbe[], limit: number = DEFAULT_PROBES_LIMIT): string[] {
    const lines: string[] = [];
    lines.push("## Suggested probes");
    lines.push("");
    if (probes.length === 0) {
      lines.push("_No probes suggested — all combos calibrated._");
      return lines;
    }
    const cap = Math.max(1, limit);
    const shown = probes.slice(0, cap);
    lines.push("| Priority | Vendor | Task | Reason |");
    lines.push("|---------:|--------|------|--------|");
    for (const p of shown) {
      lines.push(`| ${p.priority.toFixed(3)} | ${p.vendor} | ${p.taskType} | ${p.reason} |`);
    }
    if (probes.length > cap) {
      lines.push("");
      lines.push(`_…and ${probes.length - cap} more (limit=${cap})._`);
    }
    return lines;
  }

  /** Render the recent-trend block. */
  renderTrend(trend: FeedTrend): string[] {
    const lines: string[] = [];
    lines.push("## Recent feed trend");
    lines.push("");
    if (trend.feedLines === 0) {
      lines.push("_Feed empty — no consensus runs recorded yet._");
      return lines;
    }
    lines.push(`- Feed lines: **${trend.feedLines}** total · scanned **${trend.scannedLines}**`);
    if (trend.recentRewards) {
      const r = trend.recentRewards;
      lines.push(
        `- Reward distribution (n=${r.count}): mean=**${r.mean.toFixed(4)}** · p50=${r.p50.toFixed(4)} · p90=${r.p90.toFixed(4)}`,
      );
    } else {
      lines.push("- _No reward signal in scanned window._");
    }
    const taskKeys = Object.keys(trend.rewardByTaskType).sort();
    if (taskKeys.length > 0) {
      lines.push("");
      lines.push("| Task | Mean reward | n |");
      lines.push("|------|-----------:|--:|");
      for (const t of taskKeys) {
        const b = trend.rewardByTaskType[t];
        lines.push(`| ${t} | ${b.mean.toFixed(4)} | ${b.n} |`);
      }
    }
    return lines;
  }

  /** Render the header block. */
  renderHeader(dashboard: Dashboard): string[] {
    const lines: string[] = [];
    lines.push(`_Generated: ${dashboard.generatedAt}_`);
    lines.push("");
    lines.push(`- Perf state: \`${dashboard.perfStatePath}\``);
    lines.push(`- Feed: \`${dashboard.feedPath}\``);
    const o = dashboard.overall;
    lines.push(
      `- Vendors: **${o.totalVendors}** · Task types: **${o.totalTaskTypes}** · Total observations: **${o.totalObservations}**`,
    );
    lines.push(
      `- Coverage: **${o.coverage.fullyCovered}** fully · ${o.coverage.partial} partial · ${o.coverage.uncovered} uncovered`,
    );
    if (o.coldStartCombos.length > 0) {
      const missing = o.coldStartCombos.filter((c) => c.reason === "missing").length;
      const sparse = o.coldStartCombos.filter((c) => c.reason === "sparse").length;
      const stale = o.coldStartCombos.filter((c) => c.reason === "stale").length;
      lines.push(
        `- Cold-start combos: ${o.coldStartCombos.length} _(missing=${missing} · sparse=${sparse} · stale=${stale})_`,
      );
    } else {
      lines.push("- Cold-start combos: **0** ✓");
    }
    return lines;
  }
}

export const consensusDashboardRendererEngine = new ConsensusDashboardRendererEngine();
