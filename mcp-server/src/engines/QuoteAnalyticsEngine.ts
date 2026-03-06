/**
 * QuoteAnalyticsEngine — Quote accuracy tracking, win/loss analytics,
 * feedback loop for estimation improvement, and estimator scoring.
 *
 * Tracks: quoted vs actual costs, quote conversion rates, margin accuracy,
 * cycle time accuracy, material usage accuracy, and win/loss reasons.
 */

// ─── Types ───────────────────────────────────────────────────

export interface QuoteRecord {
  quote_id: string;
  part_name: string;
  part_number?: string;
  customer: string;
  material: string;
  complexity: string;
  quantity: number;
  date_quoted: string;
  valid_until: string;

  // Quoted values
  quoted_unit_price: number;
  quoted_total: number;
  quoted_margin_pct: number;
  quoted_lead_days: number;
  quoted_cost_breakdown: {
    material: number;
    machining: number;
    setup: number;
    tooling: number;
    programming: number;
    inspection: number;
    secondary_ops: number;
    overhead: number;
    total: number;
  };
  quoted_cycle_time_min: number;

  // Outcome
  status: "pending" | "won" | "lost" | "expired" | "revised";
  outcome_date?: string;
  loss_reason?: LossReason;
  loss_notes?: string;
  competing_price?: number;

  // Actuals (filled after job completion)
  actual_cost_breakdown?: {
    material: number;
    machining: number;
    setup: number;
    tooling: number;
    programming: number;
    inspection: number;
    secondary_ops: number;
    overhead: number;
    total: number;
  };
  actual_cycle_time_min?: number;
  actual_lead_days?: number;
  actual_margin_pct?: number;

  // Estimator
  estimator?: string;
}

export type LossReason =
  | "price_too_high" | "lead_time_too_long" | "competitor_won"
  | "spec_mismatch" | "customer_cancelled" | "no_response" | "other";

export interface AccuracyMetrics {
  total_quotes: number;
  quotes_with_actuals: number;

  cost_accuracy: {
    avg_variance_pct: number;
    median_variance_pct: number;
    within_5pct: number;
    within_10pct: number;
    over_estimated_count: number;
    under_estimated_count: number;
    worst_overestimate: { quote_id: string; variance_pct: number } | null;
    worst_underestimate: { quote_id: string; variance_pct: number } | null;
  };

  cycle_time_accuracy: {
    avg_variance_pct: number;
    within_10pct: number;
    quotes_measured: number;
  };

  margin_accuracy: {
    avg_quoted_margin: number;
    avg_actual_margin: number;
    margin_erosion_pct: number;
  };

  by_category: Record<string, { avg_variance_pct: number; count: number }>;
}

export interface ConversionMetrics {
  total_quotes: number;
  won: number;
  lost: number;
  pending: number;
  expired: number;
  revised: number;
  win_rate_pct: number;
  avg_response_days: number;
  loss_reasons: Record<string, number>;
  by_customer: Array<{ customer: string; quotes: number; won: number; win_rate: number }>;
  by_material: Array<{ material: string; quotes: number; won: number; win_rate: number }>;
  by_complexity: Array<{ complexity: string; quotes: number; won: number; win_rate: number }>;
}

export interface EstimatorScore {
  estimator: string;
  total_quotes: number;
  quotes_with_actuals: number;
  avg_cost_variance_pct: number;
  avg_cycle_time_variance_pct: number;
  win_rate_pct: number;
  accuracy_score: number; // 0-100
}

export interface CalibrationSuggestion {
  category: string;
  current_bias: string;   // "over-estimating" | "under-estimating" | "accurate"
  avg_variance_pct: number;
  suggestion: string;
  sample_size: number;
}

// ─── Engine ──────────────────────────────────────────────────

class QuoteAnalyticsEngine {
  private quotes: Map<string, QuoteRecord> = new Map();

  /** Record a new quote. */
  recordQuote(record: QuoteRecord): QuoteRecord {
    this.quotes.set(record.quote_id, record);
    return record;
  }

  /** Update quote outcome (won/lost/expired). */
  updateOutcome(
    quoteId: string,
    status: QuoteRecord["status"],
    details?: {
      loss_reason?: LossReason;
      loss_notes?: string;
      competing_price?: number;
      outcome_date?: string;
    },
  ): QuoteRecord {
    const q = this.quotes.get(quoteId);
    if (!q) throw new Error(`Quote ${quoteId} not found`);
    q.status = status;
    q.outcome_date = details?.outcome_date ?? new Date().toISOString().slice(0, 10);
    if (details?.loss_reason) q.loss_reason = details.loss_reason;
    if (details?.loss_notes) q.loss_notes = details.loss_notes;
    if (details?.competing_price != null) q.competing_price = details.competing_price;
    return q;
  }

  /** Record actual costs after job completion. */
  recordActuals(
    quoteId: string,
    actuals: {
      cost_breakdown: QuoteRecord["actual_cost_breakdown"];
      cycle_time_min?: number;
      lead_days?: number;
    },
  ): QuoteRecord {
    const q = this.quotes.get(quoteId);
    if (!q) throw new Error(`Quote ${quoteId} not found`);
    q.actual_cost_breakdown = actuals.cost_breakdown;
    if (actuals.cycle_time_min != null) q.actual_cycle_time_min = actuals.cycle_time_min;
    if (actuals.lead_days != null) q.actual_lead_days = actuals.lead_days;

    // Calculate actual margin
    if (q.actual_cost_breakdown && q.quoted_total > 0) {
      q.actual_margin_pct = round2(
        ((q.quoted_total - q.actual_cost_breakdown.total * q.quantity) / q.quoted_total) * 100,
      );
    }
    return q;
  }

  /** Get accuracy metrics across all quotes with actuals. */
  accuracyMetrics(filters?: { material?: string; complexity?: string; estimator?: string }): AccuracyMetrics {
    let records = Array.from(this.quotes.values()).filter(q => q.actual_cost_breakdown);
    if (filters?.material) records = records.filter(q => q.material === filters.material);
    if (filters?.complexity) records = records.filter(q => q.complexity === filters.complexity);
    if (filters?.estimator) records = records.filter(q => q.estimator === filters.estimator);

    if (records.length === 0) {
      return {
        total_quotes: this.quotes.size,
        quotes_with_actuals: 0,
        cost_accuracy: {
          avg_variance_pct: 0, median_variance_pct: 0,
          within_5pct: 0, within_10pct: 0,
          over_estimated_count: 0, under_estimated_count: 0,
          worst_overestimate: null, worst_underestimate: null,
        },
        cycle_time_accuracy: { avg_variance_pct: 0, within_10pct: 0, quotes_measured: 0 },
        margin_accuracy: { avg_quoted_margin: 0, avg_actual_margin: 0, margin_erosion_pct: 0 },
        by_category: {},
      };
    }

    // Cost variance
    const variances = records.map(q => {
      const quotedTotal = q.quoted_cost_breakdown.total;
      const actualTotal = q.actual_cost_breakdown!.total;
      return {
        quote_id: q.quote_id,
        variance_pct: quotedTotal > 0 ? ((quotedTotal - actualTotal) / quotedTotal) * 100 : 0,
      };
    });

    const sorted = [...variances].sort((a, b) => a.variance_pct - b.variance_pct);
    const avgVar = variances.reduce((s, v) => s + v.variance_pct, 0) / variances.length;
    const medianVar = sorted[Math.floor(sorted.length / 2)].variance_pct;

    // Category-level accuracy
    const categories = ["material", "machining", "setup", "tooling", "programming", "inspection", "secondary_ops", "overhead"] as const;
    const byCat: Record<string, { total_var: number; count: number }> = {};
    for (const q of records) {
      for (const cat of categories) {
        const quoted = q.quoted_cost_breakdown[cat];
        const actual = q.actual_cost_breakdown![cat];
        if (quoted > 0) {
          if (!byCat[cat]) byCat[cat] = { total_var: 0, count: 0 };
          byCat[cat].total_var += ((quoted - actual) / quoted) * 100;
          byCat[cat].count++;
        }
      }
    }

    // Cycle time
    const ctRecords = records.filter(q => q.actual_cycle_time_min != null);
    const ctVars = ctRecords.map(q => {
      return q.quoted_cycle_time_min > 0
        ? ((q.quoted_cycle_time_min - q.actual_cycle_time_min!) / q.quoted_cycle_time_min) * 100
        : 0;
    });

    // Margin
    const marginRecords = records.filter(q => q.actual_margin_pct != null);
    const avgQuotedMargin = marginRecords.length > 0
      ? marginRecords.reduce((s, q) => s + q.quoted_margin_pct, 0) / marginRecords.length : 0;
    const avgActualMargin = marginRecords.length > 0
      ? marginRecords.reduce((s, q) => s + (q.actual_margin_pct ?? 0), 0) / marginRecords.length : 0;

    return {
      total_quotes: this.quotes.size,
      quotes_with_actuals: records.length,
      cost_accuracy: {
        avg_variance_pct: round2(avgVar),
        median_variance_pct: round2(medianVar),
        within_5pct: variances.filter(v => Math.abs(v.variance_pct) <= 5).length,
        within_10pct: variances.filter(v => Math.abs(v.variance_pct) <= 10).length,
        over_estimated_count: variances.filter(v => v.variance_pct > 0).length,
        under_estimated_count: variances.filter(v => v.variance_pct < 0).length,
        worst_overestimate: sorted.length > 0
          ? { quote_id: sorted[sorted.length - 1].quote_id, variance_pct: round2(sorted[sorted.length - 1].variance_pct) }
          : null,
        worst_underestimate: sorted.length > 0
          ? { quote_id: sorted[0].quote_id, variance_pct: round2(sorted[0].variance_pct) }
          : null,
      },
      cycle_time_accuracy: {
        avg_variance_pct: ctVars.length > 0 ? round2(ctVars.reduce((s, v) => s + v, 0) / ctVars.length) : 0,
        within_10pct: ctVars.filter(v => Math.abs(v) <= 10).length,
        quotes_measured: ctRecords.length,
      },
      margin_accuracy: {
        avg_quoted_margin: round2(avgQuotedMargin),
        avg_actual_margin: round2(avgActualMargin),
        margin_erosion_pct: round2(avgQuotedMargin - avgActualMargin),
      },
      by_category: Object.fromEntries(
        Object.entries(byCat).map(([k, v]) => [k, { avg_variance_pct: round2(v.total_var / v.count), count: v.count }]),
      ),
    };
  }

  /** Get quote conversion / win-loss metrics. */
  conversionMetrics(): ConversionMetrics {
    const all = Array.from(this.quotes.values());
    const won = all.filter(q => q.status === "won");
    const lost = all.filter(q => q.status === "lost");
    const pending = all.filter(q => q.status === "pending");
    const expired = all.filter(q => q.status === "expired");
    const revised = all.filter(q => q.status === "revised");

    const decided = won.length + lost.length;
    const winRate = decided > 0 ? (won.length / decided) * 100 : 0;

    // Loss reasons
    const reasons: Record<string, number> = {};
    for (const q of lost) {
      const r = q.loss_reason ?? "no_response";
      reasons[r] = (reasons[r] ?? 0) + 1;
    }

    // By customer
    const custMap = new Map<string, { quotes: number; won: number }>();
    for (const q of all) {
      const entry = custMap.get(q.customer) ?? { quotes: 0, won: 0 };
      entry.quotes++;
      if (q.status === "won") entry.won++;
      custMap.set(q.customer, entry);
    }

    // By material
    const matMap = new Map<string, { quotes: number; won: number }>();
    for (const q of all) {
      const entry = matMap.get(q.material) ?? { quotes: 0, won: 0 };
      entry.quotes++;
      if (q.status === "won") entry.won++;
      matMap.set(q.material, entry);
    }

    // By complexity
    const compMap = new Map<string, { quotes: number; won: number }>();
    for (const q of all) {
      const entry = compMap.get(q.complexity) ?? { quotes: 0, won: 0 };
      entry.quotes++;
      if (q.status === "won") entry.won++;
      compMap.set(q.complexity, entry);
    }

    // Avg response days
    const responseDays = all
      .filter(q => q.outcome_date)
      .map(q => {
        const quoted = new Date(q.date_quoted).getTime();
        const outcome = new Date(q.outcome_date!).getTime();
        return Math.max(0, (outcome - quoted) / 86400000);
      });
    const avgResponse = responseDays.length > 0
      ? responseDays.reduce((s, d) => s + d, 0) / responseDays.length : 0;

    return {
      total_quotes: all.length,
      won: won.length,
      lost: lost.length,
      pending: pending.length,
      expired: expired.length,
      revised: revised.length,
      win_rate_pct: round2(winRate),
      avg_response_days: round2(avgResponse),
      loss_reasons: reasons,
      by_customer: Array.from(custMap.entries()).map(([customer, d]) => ({
        customer, quotes: d.quotes, won: d.won,
        win_rate: round2(d.quotes > 0 ? (d.won / d.quotes) * 100 : 0),
      })).sort((a, b) => b.quotes - a.quotes),
      by_material: Array.from(matMap.entries()).map(([material, d]) => ({
        material, quotes: d.quotes, won: d.won,
        win_rate: round2(d.quotes > 0 ? (d.won / d.quotes) * 100 : 0),
      })).sort((a, b) => b.quotes - a.quotes),
      by_complexity: Array.from(compMap.entries()).map(([complexity, d]) => ({
        complexity, quotes: d.quotes, won: d.won,
        win_rate: round2(d.quotes > 0 ? (d.won / d.quotes) * 100 : 0),
      })),
    };
  }

  /** Score estimator accuracy. */
  estimatorScores(): EstimatorScore[] {
    const estimatorMap = new Map<string, QuoteRecord[]>();
    for (const q of this.quotes.values()) {
      if (!q.estimator) continue;
      const list = estimatorMap.get(q.estimator) ?? [];
      list.push(q);
      estimatorMap.set(q.estimator, list);
    }

    return Array.from(estimatorMap.entries()).map(([estimator, quotes]) => {
      const withActuals = quotes.filter(q => q.actual_cost_breakdown);
      const costVars = withActuals.map(q => {
        const qt = q.quoted_cost_breakdown.total;
        return qt > 0 ? Math.abs((qt - q.actual_cost_breakdown!.total) / qt) * 100 : 0;
      });
      const ctVars = withActuals
        .filter(q => q.actual_cycle_time_min != null && q.quoted_cycle_time_min > 0)
        .map(q => Math.abs((q.quoted_cycle_time_min - q.actual_cycle_time_min!) / q.quoted_cycle_time_min) * 100);

      const decided = quotes.filter(q => q.status === "won" || q.status === "lost");
      const wonCount = quotes.filter(q => q.status === "won").length;
      const winRate = decided.length > 0 ? (wonCount / decided.length) * 100 : 0;

      const avgCostVar = costVars.length > 0 ? costVars.reduce((s, v) => s + v, 0) / costVars.length : 0;
      const avgCtVar = ctVars.length > 0 ? ctVars.reduce((s, v) => s + v, 0) / ctVars.length : 0;

      // Accuracy score: penalize variance, reward win rate
      const accuracyScore = Math.max(0, Math.min(100,
        100 - avgCostVar * 2 - avgCtVar + winRate * 0.3,
      ));

      return {
        estimator,
        total_quotes: quotes.length,
        quotes_with_actuals: withActuals.length,
        avg_cost_variance_pct: round2(avgCostVar),
        avg_cycle_time_variance_pct: round2(avgCtVar),
        win_rate_pct: round2(winRate),
        accuracy_score: round2(accuracyScore),
      };
    }).sort((a, b) => b.accuracy_score - a.accuracy_score);
  }

  /** Generate calibration suggestions based on historical bias. */
  calibrationSuggestions(): CalibrationSuggestion[] {
    const metrics = this.accuracyMetrics();
    const suggestions: CalibrationSuggestion[] = [];

    for (const [cat, data] of Object.entries(metrics.by_category)) {
      if (data.count < 3) continue; // need minimum sample
      const bias = data.avg_variance_pct > 5 ? "over-estimating"
        : data.avg_variance_pct < -5 ? "under-estimating" : "accurate";

      if (bias !== "accurate") {
        const adjustment = bias === "over-estimating"
          ? `Reduce ${cat} estimates by ~${Math.abs(data.avg_variance_pct).toFixed(0)}%`
          : `Increase ${cat} estimates by ~${Math.abs(data.avg_variance_pct).toFixed(0)}%`;

        suggestions.push({
          category: cat,
          current_bias: bias,
          avg_variance_pct: data.avg_variance_pct,
          suggestion: adjustment,
          sample_size: data.count,
        });
      }
    }

    // Overall margin erosion suggestion
    if (metrics.margin_accuracy.margin_erosion_pct > 3) {
      suggestions.push({
        category: "overall_margin",
        current_bias: "under-estimating",
        avg_variance_pct: -metrics.margin_accuracy.margin_erosion_pct,
        suggestion: `Actual margins are ${metrics.margin_accuracy.margin_erosion_pct.toFixed(1)}% below quoted. Increase target margin or tighten cost estimates.`,
        sample_size: metrics.quotes_with_actuals,
      });
    }

    return suggestions;
  }

  /** Find similar past quotes for estimation reference. */
  findSimilar(input: {
    material?: string;
    complexity?: string;
    quantity_range?: { min: number; max: number };
  }): QuoteRecord[] {
    let results = Array.from(this.quotes.values());
    if (input.material) results = results.filter(q => q.material === input.material);
    if (input.complexity) results = results.filter(q => q.complexity === input.complexity);
    if (input.quantity_range) {
      results = results.filter(q =>
        q.quantity >= input.quantity_range!.min && q.quantity <= input.quantity_range!.max,
      );
    }
    // Prefer won quotes with actuals
    return results.sort((a, b) => {
      const scoreA = (a.status === "won" ? 2 : 0) + (a.actual_cost_breakdown ? 1 : 0);
      const scoreB = (b.status === "won" ? 2 : 0) + (b.actual_cost_breakdown ? 1 : 0);
      return scoreB - scoreA;
    }).slice(0, 10);
  }

  /** Get a specific quote. */
  getQuote(quoteId: string): QuoteRecord | undefined {
    return this.quotes.get(quoteId);
  }

  /** List all quotes with optional status filter. */
  listQuotes(status?: QuoteRecord["status"]): QuoteRecord[] {
    const all = Array.from(this.quotes.values());
    return status ? all.filter(q => q.status === status) : all;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const quoteAnalyticsEngine = new QuoteAnalyticsEngine();
export { QuoteAnalyticsEngine };
