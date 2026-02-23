/**
 * AdaptiveLearningEngine — R20-MS3
 *
 * Usage pattern learning engine that tracks action invocations, identifies
 * common workflows, learns material-specific parameter preferences, and
 * provides improved recommendations based on historical usage.
 *
 * Actions:
 *   al_learn     — record a usage event (action, params, outcome)
 *   al_recommend — get recommendations based on learned patterns
 *   al_evaluate  — evaluate current learning model quality
 *   al_history   — view usage history and patterns
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface UsageEvent {
  id: string;
  timestamp: string;
  action: string;
  material?: string;
  operation?: string;
  parameters: Record<string, number>;
  outcome: "success" | "failure" | "partial";
  quality_score?: number; // 0-100
  cost_score?: number;    // 0-100
  notes?: string;
}

interface PatternEntry {
  action: string;
  material: string;
  count: number;
  avg_quality: number;
  avg_cost: number;
  best_params: Record<string, number>;
  worst_params: Record<string, number>;
  success_rate: number;
}

interface MaterialProfile {
  material: string;
  total_events: number;
  most_used_actions: { action: string; count: number }[];
  avg_cutting_speed: number;
  avg_feed: number;
  avg_depth: number;
  success_rate: number;
  avg_quality: number;
}

// ── In-Memory Learning Store ───────────────────────────────────────────────

const usageHistory: UsageEvent[] = [];
const patternCache: Map<string, PatternEntry> = new Map();
let eventCounter = 1;

// ── Helper Functions ───────────────────────────────────────────────────────

function patternKey(action: string, material: string): string {
  return `${action}::${material}`;
}

function updatePatternCache(event: UsageEvent): void {
  const mat = event.material ?? "unknown";
  const key = patternKey(event.action, mat);
  const existing = patternCache.get(key);

  if (existing) {
    existing.count++;
    if (event.quality_score !== undefined) {
      existing.avg_quality = (existing.avg_quality * (existing.count - 1) + event.quality_score) / existing.count;
    }
    if (event.cost_score !== undefined) {
      existing.avg_cost = (existing.avg_cost * (existing.count - 1) + event.cost_score) / existing.count;
    }

    // Track success rate
    const successCount = usageHistory.filter(e =>
      e.action === event.action && (e.material ?? "unknown") === mat && e.outcome === "success"
    ).length;
    existing.success_rate = existing.count > 0 ? successCount / existing.count : 0;

    // Update best/worst params based on quality
    if (event.outcome === "success" && event.quality_score !== undefined) {
      if (event.quality_score > existing.avg_quality) {
        existing.best_params = { ...event.parameters };
      }
      if (event.quality_score < existing.avg_quality && Object.keys(existing.worst_params).length === 0) {
        existing.worst_params = { ...event.parameters };
      }
    }
  } else {
    patternCache.set(key, {
      action: event.action,
      material: mat,
      count: 1,
      avg_quality: event.quality_score ?? 50,
      avg_cost: event.cost_score ?? 50,
      best_params: event.outcome === "success" ? { ...event.parameters } : {},
      worst_params: event.outcome === "failure" ? { ...event.parameters } : {},
      success_rate: event.outcome === "success" ? 1 : 0,
    });
  }
}

function getMaterialProfile(material: string): MaterialProfile {
  const events = usageHistory.filter(e => e.material === material);

  // Count actions
  const actionCounts: Record<string, number> = {};
  for (const e of events) {
    actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
  }
  const sortedActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([action, count]) => ({ action, count }));

  // Average parameters
  const speeds = events.map(e => e.parameters.cutting_speed_m_min).filter(v => v !== undefined);
  const feeds = events.map(e => e.parameters.feed_per_tooth_mm).filter(v => v !== undefined);
  const depths = events.map(e => e.parameters.depth_of_cut_mm).filter(v => v !== undefined);
  const qualities = events.map(e => e.quality_score).filter((v): v is number => v !== undefined);
  const successes = events.filter(e => e.outcome === "success").length;

  return {
    material,
    total_events: events.length,
    most_used_actions: sortedActions.slice(0, 5),
    avg_cutting_speed: speeds.length > 0 ? round2(speeds.reduce((s, v) => s + v, 0) / speeds.length) : 0,
    avg_feed: feeds.length > 0 ? round3(feeds.reduce((s, v) => s + v, 0) / feeds.length) : 0,
    avg_depth: depths.length > 0 ? round2(depths.reduce((s, v) => s + v, 0) / depths.length) : 0,
    success_rate: events.length > 0 ? round2(successes / events.length) : 0,
    avg_quality: qualities.length > 0 ? round2(qualities.reduce((s, v) => s + v, 0) / qualities.length) : 0,
  };
}

function generateRecommendations(
  material: string,
  action?: string,
  priority?: string,
): { source: string; confidence: number; parameters: Record<string, number>; rationale: string }[] {
  const recommendations: { source: string; confidence: number; parameters: Record<string, number>; rationale: string }[] = [];

  // Pattern-based recommendations
  const patterns = [...patternCache.values()].filter(p =>
    p.material === material && (action ? p.action === action : true) && p.count >= 2
  );

  for (const p of patterns.sort((a, b) => b.avg_quality - a.avg_quality).slice(0, 3)) {
    if (Object.keys(p.best_params).length > 0) {
      recommendations.push({
        source: "learned_pattern",
        confidence: Math.min(0.9, 0.5 + p.count * 0.05),
        parameters: p.best_params,
        rationale: `Best parameters from ${p.count} uses of ${p.action} on ${p.material} (avg quality: ${round2(p.avg_quality)})`,
      });
    }
  }

  // Material profile-based recommendation
  const profile = getMaterialProfile(material);
  if (profile.total_events >= 3) {
    const params: Record<string, number> = {};
    if (profile.avg_cutting_speed > 0) params.cutting_speed_m_min = profile.avg_cutting_speed;
    if (profile.avg_feed > 0) params.feed_per_tooth_mm = profile.avg_feed;
    if (profile.avg_depth > 0) params.depth_of_cut_mm = profile.avg_depth;

    if (Object.keys(params).length > 0) {
      recommendations.push({
        source: "material_profile",
        confidence: Math.min(0.85, 0.4 + profile.total_events * 0.03),
        parameters: params,
        rationale: `Average of ${profile.total_events} events for ${material} (success rate: ${round2(profile.success_rate * 100)}%)`,
      });
    }
  }

  // Priority-adjusted recommendation
  if (priority && recommendations.length > 0) {
    const adjusted = { ...recommendations[0] };
    adjusted.source = "priority_adjusted";
    const adjParams = { ...adjusted.parameters };

    if (priority === "quality" && adjParams.feed_per_tooth_mm) {
      adjParams.feed_per_tooth_mm = round3(adjParams.feed_per_tooth_mm * 0.8);
      adjusted.rationale = "Quality priority: reduced feed by 20% from learned best";
    } else if (priority === "productivity" && adjParams.cutting_speed_m_min) {
      adjParams.cutting_speed_m_min = round2(adjParams.cutting_speed_m_min * 1.15);
      adjusted.rationale = "Productivity priority: increased speed by 15% from learned best";
    } else if (priority === "cost") {
      if (adjParams.cutting_speed_m_min) adjParams.cutting_speed_m_min = round2(adjParams.cutting_speed_m_min * 0.85);
      adjusted.rationale = "Cost priority: reduced speed by 15% for tool life extension";
    }

    adjusted.parameters = adjParams;
    adjusted.confidence = Math.max(0.3, adjusted.confidence - 0.1);
    recommendations.push(adjusted);
  }

  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);
  return recommendations;
}

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

// ── Action Handlers ────────────────────────────────────────────────────────

function alLearn(params: Record<string, unknown>): unknown {
  const event: UsageEvent = {
    id: `UE${String(eventCounter++).padStart(5, "0")}`,
    timestamp: new Date().toISOString(),
    action: String(params.action ?? "unknown"),
    material: params.material ? String(params.material) : undefined,
    operation: params.operation ? String(params.operation) : undefined,
    parameters: {},
    outcome: (params.outcome as UsageEvent["outcome"]) ?? "success",
    quality_score: params.quality_score !== undefined ? Number(params.quality_score) : undefined,
    cost_score: params.cost_score !== undefined ? Number(params.cost_score) : undefined,
    notes: params.notes ? String(params.notes) : undefined,
  };

  // Extract numeric parameters
  const paramKeys = ["cutting_speed_m_min", "feed_per_tooth_mm", "depth_of_cut_mm",
    "width_of_cut_mm", "spindle_rpm", "tool_diameter_mm"];
  for (const k of paramKeys) {
    if (params[k] !== undefined) event.parameters[k] = Number(params[k]);
  }

  usageHistory.push(event);
  updatePatternCache(event);

  // Cap history at 10000 events
  if (usageHistory.length > 10000) usageHistory.splice(0, usageHistory.length - 10000);

  return {
    event_id: event.id,
    status: "recorded",
    action: event.action,
    material: event.material,
    outcome: event.outcome,
    total_events: usageHistory.length,
    patterns_tracked: patternCache.size,
  };
}

function alRecommend(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const action = params.action ? String(params.action) : undefined;
  const priority = params.priority ? String(params.priority) : undefined;

  const recommendations = generateRecommendations(material, action, priority);
  const profile = getMaterialProfile(material);

  return {
    material,
    action_filter: action ?? "all",
    priority: priority ?? "balanced",
    total_recommendations: recommendations.length,
    recommendations,
    material_profile: profile.total_events > 0 ? {
      total_events: profile.total_events,
      success_rate: profile.success_rate,
      avg_quality: profile.avg_quality,
    } : null,
    learning_status: usageHistory.length === 0
      ? "no_data — use al_learn to record usage events"
      : usageHistory.length < 10
        ? "learning — insufficient data for high confidence"
        : "active — recommendations based on learned patterns",
  };
}

function alEvaluate(params: Record<string, unknown>): unknown {
  const totalEvents = usageHistory.length;
  const totalPatterns = patternCache.size;

  // Materials covered
  const materials = [...new Set(usageHistory.map(e => e.material).filter(Boolean))];

  // Actions covered
  const actions = [...new Set(usageHistory.map(e => e.action))];

  // Success rate
  const successes = usageHistory.filter(e => e.outcome === "success").length;
  const failures = usageHistory.filter(e => e.outcome === "failure").length;

  // Quality distribution
  const qualities = usageHistory.map(e => e.quality_score).filter((v): v is number => v !== undefined);
  const avgQuality = qualities.length > 0 ? round2(qualities.reduce((s, v) => s + v, 0) / qualities.length) : 0;

  // Pattern confidence
  const patternConfidences = [...patternCache.values()].map(p => Math.min(0.9, 0.5 + p.count * 0.05));
  const avgConfidence = patternConfidences.length > 0
    ? round2(patternConfidences.reduce((s, v) => s + v, 0) / patternConfidences.length) : 0;

  // High-confidence patterns (count >= 5)
  const highConfPatterns = [...patternCache.values()].filter(p => p.count >= 5);

  return {
    model_status: totalEvents === 0 ? "empty" : totalEvents < 10 ? "learning" : totalEvents < 50 ? "developing" : "mature",
    total_events: totalEvents,
    total_patterns: totalPatterns,
    materials_covered: materials.length,
    materials,
    actions_covered: actions.length,
    actions,
    outcome_distribution: {
      success: successes,
      failure: failures,
      partial: totalEvents - successes - failures,
      success_rate: totalEvents > 0 ? round2(successes / totalEvents) : 0,
    },
    quality_metrics: {
      events_with_quality: qualities.length,
      average_quality: avgQuality,
      min_quality: qualities.length > 0 ? Math.min(...qualities) : 0,
      max_quality: qualities.length > 0 ? Math.max(...qualities) : 0,
    },
    pattern_metrics: {
      total_patterns: totalPatterns,
      high_confidence_patterns: highConfPatterns.length,
      average_confidence: avgConfidence,
      most_learned: [...patternCache.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(p => ({ action: p.action, material: p.material, count: p.count, quality: round2(p.avg_quality) })),
    },
    data_sufficiency: {
      overall: totalEvents >= 50 ? "sufficient" : totalEvents >= 10 ? "partial" : "insufficient",
      per_material: Object.fromEntries(materials.map(m => {
        const count = usageHistory.filter(e => e.material === m).length;
        return [m, count >= 10 ? "sufficient" : count >= 3 ? "partial" : "insufficient"];
      })),
    },
  };
}

function alHistory(params: Record<string, unknown>): unknown {
  const material = params.material ? String(params.material) : undefined;
  const action = params.action ? String(params.action) : undefined;
  const limit = Number(params.limit ?? 20);

  let filtered = [...usageHistory];
  if (material) filtered = filtered.filter(e => e.material === material);
  if (action) filtered = filtered.filter(e => e.action === action);

  // Get recent events
  const recent = filtered.slice(-limit).reverse();

  // Usage frequency by hour/day
  const dailyCounts: Record<string, number> = {};
  for (const e of filtered) {
    const day = e.timestamp.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }

  // Most common workflows (sequences of actions)
  const workflows: Record<string, number> = {};
  for (let i = 0; i < filtered.length - 1; i++) {
    const pair = `${filtered[i].action} → ${filtered[i + 1].action}`;
    workflows[pair] = (workflows[pair] ?? 0) + 1;
  }
  const commonWorkflows = Object.entries(workflows)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([workflow, count]) => ({ workflow, count }));

  return {
    filter: { material, action },
    total_events: filtered.length,
    recent_events: recent.map(e => ({
      id: e.id,
      action: e.action,
      material: e.material,
      outcome: e.outcome,
      quality_score: e.quality_score,
      timestamp: e.timestamp,
    })),
    daily_activity: dailyCounts,
    common_workflows: commonWorkflows,
    material_profiles: material
      ? [getMaterialProfile(material)]
      : [...new Set(usageHistory.map(e => e.material).filter(Boolean))].map(m => getMaterialProfile(m!)),
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeAdaptiveLearningAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "al_learn":     return alLearn(params);
    case "al_recommend": return alRecommend(params);
    case "al_evaluate":  return alEvaluate(params);
    case "al_history":   return alHistory(params);
    default:
      throw new Error(`AdaptiveLearningEngine: unknown action "${action}"`);
  }
}
