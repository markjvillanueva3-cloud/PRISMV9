/**
 * orchestrationDispatcher operator_dashboard_orchestrate wiring (U-OPDASH-ORCH-WIRE).
 *
 * Dark-facade fix: the case probed run/orchestrate/analyze (none existed on
 * OperatorDashboardOrchestratorEngine) -> always "method not callable". Added
 * the real orchestrate(input), which composes getStatus + getAlerts +
 * getShiftSummary FAIL-SOFT per section (the engine's documented
 * degrade-gracefully contract) and self-validates the core live signals
 * (machine_id non-empty + finite current_rpm/feed/load_pct, else throws).
 *
 * Real-path test: registers the dispatcher, captures the handler, invokes
 * through it (proves orchestrate() runs, not the dark fallback).
 */
import { describe, it, expect } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; },
  };
  registerOrchestrationDispatcher(server);
  if (!handler) throw new Error("registerOrchestrationDispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = (await handler!({ action, params })) as { content?: Array<{ text?: string }> };
    const text = res?.content?.[0]?.text ?? "null";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { _raw: text }; }
  };
}

type Alert = { severity: "info" | "warning" | "critical"; source: string; message: string };
type OrchestrateResult = {
  machine_id: string;
  overall_risk: "GREEN" | "YELLOW" | "RED";
  status: { overall_risk: string; alerts: Alert[]; spindle: { health: string } } | null;
  alerts: { alerts: Alert[]; alert_count: number } | null;
  shift_summary: { operation_count: number; utilization_pct: number } | null;
  sections_available: string[];
  sections_failed: string[];
  errors: Record<string, string>;
};

// A high-load live signal that deterministically produces a CRITICAL spindle alert
// (load>95 -> critical health) AND a WARNING chatter alert (risk>60) -> a mixed-severity
// dashboard so the severity filter has something real to filter.
const HOT = { machine_id: "VMC-01", current_rpm: 12000, current_feed: 3000, current_load_pct: 96 };

describe("orchestrationDispatcher operator_dashboard_orchestrate -- dark-action fix (real orchestrate)", () => {
  it("status+alerts (no shift) -> real composed dashboard, NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", { ...HOT });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as OrchestrateResult;
    expect(d.machine_id).toBe("VMC-01");
    expect(d.sections_available).toContain("status");
    expect(d.sections_available).toContain("alerts");
    // NOTE: responseSlimmer prunes empty arrays/null -> an empty sections_failed
    // arrives as undefined. Treat absent as empty (no section failed).
    expect(d.sections_failed ?? []).toEqual([]);
    expect(d.status).not.toBeNull();
    expect(d.status!.spindle.health).toBe("critical"); // load 96 -> overload
    expect(d.overall_risk).toBe("RED");                 // mirrors status.overall_risk
    expect(d.overall_risk).toBe(d.status!.overall_risk);
    // default min_severity "info" -> the alerts view equals the full status alert set
    expect(d.alerts!.alert_count).toBe(d.status!.alerts.length);
    expect(d.alerts!.alert_count).toBeGreaterThanOrEqual(2); // critical spindle + warning chatter
  });

  it("min_severity filters the alerts section without dropping status alerts", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", { ...HOT, min_severity: "critical" });
    expect(r.success).toBe(true);
    const d = r.data as OrchestrateResult;
    const total = d.status!.alerts.length;
    expect(total).toBeGreaterThanOrEqual(2);
    // filtered view is strictly smaller (warnings dropped) and contains ONLY criticals
    expect(d.alerts!.alert_count).toBeLessThan(total);
    expect(d.alerts!.alerts.every(a => a.severity === "critical")).toBe(true);
  });

  it("shift context adds the shift_summary section (operation_count matches input)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", {
      ...HOT,
      shift_hours: 8,
      operations: [
        { rpm: 8000, feed: 2000, duration_min: 120, load_pct: 70 },
        { rpm: 10000, feed: 2500, duration_min: 90, load_pct: 85 },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as OrchestrateResult;
    expect(d.sections_available).toContain("shift_summary");
    expect(d.shift_summary).not.toBeNull();
    expect(d.shift_summary!.operation_count).toBe(2);
    expect(d.shift_summary!.utilization_pct).toBeGreaterThan(0); // 210 cut min / 480 shift min
  });

  it("fail-soft: a section that throws is recorded, the others still report", async () => {
    const invoke = makeInvoke();
    // operations is an array (passes the gate) but its element is null -> getShiftSummary
    // throws reading op.duration_min -> orchestrate catches it PER SECTION.
    const r = await invoke("operator_dashboard_orchestrate", { ...HOT, shift_hours: 8, operations: [null] });
    expect(r.success).toBe(true); // the whole call does NOT fail
    const d = r.data as OrchestrateResult;
    expect(d.sections_failed).toContain("shift_summary");
    expect(typeof d.errors.shift_summary).toBe("string");
    expect(d.shift_summary ?? null).toBeNull(); // slimmer prunes null -> absent
    // status + alerts are unaffected -> graceful degradation, not total failure
    expect(d.sections_available).toContain("status");
    expect(d.status).not.toBeNull();
  });

  it("shift gate: operations without shift_hours -> section skipped, not failed", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", {
      ...HOT,
      operations: [{ rpm: 8000, feed: 2000, duration_min: 60 }],
    });
    expect(r.success).toBe(true);
    const d = r.data as OrchestrateResult;
    expect(d.shift_summary ?? null).toBeNull();
    expect(d.sections_available).not.toContain("shift_summary");
    expect(d.sections_failed ?? []).not.toContain("shift_summary"); // skipped (incomplete context), not an error
  });

  it("robustness: an unknown min_severity coerces to 'info' (never silently drops all alerts)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", { ...HOT, min_severity: "bogus" });
    expect(r.success).toBe(true);
    const d = r.data as OrchestrateResult;
    // a garbage severity must NOT blank the alerts view -- it falls back to "info" (all)
    expect(d.alerts!.alert_count).toBe(d.status!.alerts.length);
    expect(d.alerts!.alert_count).toBeGreaterThanOrEqual(2);
  });

  it("self-validation: missing machine_id is rejected", async () => {
    const invoke = makeInvoke();
    const r = await invoke("operator_dashboard_orchestrate", { current_rpm: 1000, current_feed: 500, current_load_pct: 50 });
    expect(r.success).toBe(false);
  });

  it("self-validation: a non-finite live signal is rejected (would silently NaN the dashboard)", async () => {
    const invoke = makeInvoke();
    const r1 = await invoke("operator_dashboard_orchestrate", { machine_id: "VMC-01", current_rpm: "fast", current_feed: 500, current_load_pct: 50 });
    expect(r1.success).toBe(false);
    const r2 = await invoke("operator_dashboard_orchestrate", { machine_id: "VMC-01", current_rpm: 1000, current_feed: 500, current_load_pct: Number.NaN });
    expect(r2.success).toBe(false);
  });
});
