/**
 * PostProcessorTelemetryEngine — PP-MS11/U-PP47
 *
 * Tracks the PPG conversion funnel:
 *   page_view → machine_select → feature_toggle → generate → validate → download
 *
 * Provides funnel metrics and per-step conversion rates for the business dashboard.
 */

// ── Types ────────────────────────────────────────────────────

export type PPGFunnelStep =
  | "page_view"
  | "machine_select"
  | "feature_toggle"
  | "generate"
  | "validate"
  | "prove_out"
  | "download";

export interface PPGTelemetryEvent {
  step: PPGFunnelStep;
  timestamp: number;
  session_id: string;
  metadata?: Record<string, unknown>;
}

export interface PPGFunnelMetrics {
  total_sessions: number;
  step_counts: Record<PPGFunnelStep, number>;
  conversion_rates: Record<string, number>;
  avg_time_to_download_ms: number | null;
  most_popular_controller: string | null;
  most_popular_machine: string | null;
}

// ── Constants ────────────────────────────────────────────────

const FUNNEL_ORDER: PPGFunnelStep[] = [
  "page_view",
  "machine_select",
  "feature_toggle",
  "generate",
  "validate",
  "prove_out",
  "download",
];

// ── Engine ───────────────────────────────────────────────────

class PostProcessorTelemetryEngine {
  private events: PPGTelemetryEvent[] = [];
  private controllerCounts = new Map<string, number>();
  private machineCounts = new Map<string, number>();

  /** Record a funnel event */
  record(event: PPGTelemetryEvent): { ok: true; event_count: number } {
    this.events.push(event);

    // Track popular controllers/machines from metadata
    if (event.metadata?.controller && typeof event.metadata.controller === "string") {
      const c = event.metadata.controller;
      this.controllerCounts.set(c, (this.controllerCounts.get(c) ?? 0) + 1);
    }
    if (event.metadata?.machine && typeof event.metadata.machine === "string") {
      const m = event.metadata.machine;
      this.machineCounts.set(m, (this.machineCounts.get(m) ?? 0) + 1);
    }

    return { ok: true, event_count: this.events.length };
  }

  /** Get funnel metrics */
  funnel(params?: { since_ms?: number }): PPGFunnelMetrics {
    const since = params?.since_ms ?? 0;
    const filtered = since > 0
      ? this.events.filter((e) => e.timestamp >= since)
      : this.events;

    // Count unique sessions per step
    const stepSessions = new Map<PPGFunnelStep, Set<string>>();
    for (const step of FUNNEL_ORDER) {
      stepSessions.set(step, new Set());
    }
    for (const e of filtered) {
      stepSessions.get(e.step)?.add(e.session_id);
    }

    const stepCounts: Record<PPGFunnelStep, number> = {} as any;
    for (const step of FUNNEL_ORDER) {
      stepCounts[step] = stepSessions.get(step)?.size ?? 0;
    }

    // Conversion rates between adjacent steps
    const conversionRates: Record<string, number> = {};
    for (let i = 0; i < FUNNEL_ORDER.length - 1; i++) {
      const from = FUNNEL_ORDER[i];
      const to = FUNNEL_ORDER[i + 1];
      const fromCount = stepCounts[from];
      const toCount = stepCounts[to];
      conversionRates[`${from}_to_${to}`] = fromCount > 0 ? toCount / fromCount : 0;
    }
    // Overall conversion
    const views = stepCounts.page_view;
    const downloads = stepCounts.download;
    conversionRates["overall"] = views > 0 ? downloads / views : 0;

    // Average time from page_view to download per session
    const sessionFirstView = new Map<string, number>();
    const sessionDownload = new Map<string, number>();
    for (const e of filtered) {
      if (e.step === "page_view") {
        const existing = sessionFirstView.get(e.session_id);
        if (!existing || e.timestamp < existing) {
          sessionFirstView.set(e.session_id, e.timestamp);
        }
      }
      if (e.step === "download") {
        const existing = sessionDownload.get(e.session_id);
        if (!existing || e.timestamp > existing) {
          sessionDownload.set(e.session_id, e.timestamp);
        }
      }
    }
    let totalTimeMs = 0;
    let completedSessions = 0;
    for (const [sid, viewTime] of sessionFirstView) {
      const dlTime = sessionDownload.get(sid);
      if (dlTime && dlTime > viewTime) {
        totalTimeMs += dlTime - viewTime;
        completedSessions++;
      }
    }

    // Most popular
    const topController = this.topEntry(this.controllerCounts);
    const topMachine = this.topEntry(this.machineCounts);

    const allSessions = new Set(filtered.map((e) => e.session_id));

    return {
      total_sessions: allSessions.size,
      step_counts: stepCounts,
      conversion_rates: conversionRates,
      avg_time_to_download_ms: completedSessions > 0 ? Math.round(totalTimeMs / completedSessions) : null,
      most_popular_controller: topController,
      most_popular_machine: topMachine,
    };
  }

  /** Get raw event count */
  eventCount(): number {
    return this.events.length;
  }

  /** Reset telemetry data (for testing) */
  reset(): void {
    this.events = [];
    this.controllerCounts.clear();
    this.machineCounts.clear();
  }

  /** Process dispatcher action */
  async process(params: Record<string, unknown>): Promise<unknown> {
    const action = params.action as string;
    switch (action) {
      case "record_event":
        return this.record({
          step: params.step as PPGFunnelStep,
          timestamp: (params.timestamp as number) ?? Date.now(),
          session_id: (params.session_id as string) ?? "unknown",
          metadata: params.metadata as Record<string, unknown> | undefined,
        });
      case "funnel_metrics":
        return this.funnel({ since_ms: params.since_ms as number | undefined });
      case "event_count":
        return { count: this.eventCount() };
      case "reset":
        this.reset();
        return { ok: true };
      default:
        return { error: `Unknown telemetry action: ${action}` };
    }
  }

  private topEntry(map: Map<string, number>): string | null {
    let top: string | null = null;
    let max = 0;
    for (const [key, count] of map) {
      if (count > max) {
        max = count;
        top = key;
      }
    }
    return top;
  }
}

export const postProcessorTelemetryEngine = new PostProcessorTelemetryEngine();
