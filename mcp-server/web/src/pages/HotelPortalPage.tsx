/**
 * HotelPortalPage — phone-first employee + manager portal frontend.
 *
 * Backs the hotel engine stack (iter15-iter25) via /api/v1/hotel-portal REST.
 * Mobile-responsive (CSS grid, single-column under 768px) so the same component
 * renders on web + iOS Safari + Android Chrome. The JSON contracts are
 * React-Native compatible — same payloads can drive a future native shell.
 *
 * Three modes:
 *   1. Employee view  — daily digest (top-3 actions, shifts, PTO balance, nudges)
 *   2. Manager view   — team rollup (pending approvals, coverage gaps, top-priorities)
 *   3. Simulation     — operator regression sweep button (E2E iter25 harness)
 *
 * @milestone HOTEL/U-HOTEL-PORTAL-FRONTEND (2026-05-25, slot:hotel iter26 /yolo)
 */
import React, { useState, useEffect, useCallback } from "react";

type ViewMode = "employee" | "manager" | "simulation" | "executive" | "qc" | "shipping" | "po" | "timeclock";

interface InspectionReportPayload {
  inspection_id: string;
  report_type: "fai" | "in_process" | "final" | "incoming";
  part_number: string;
  lot_number: string;
  job_id: string;
  characteristics: ReadonlyArray<{
    characteristic_id: string;
    nominal: number;
    upper_tolerance: number;
    lower_tolerance: number;
    measured: number;
    unit: string;
    deviation: number;
    in_spec: boolean;
    severity: "none" | "minor" | "major" | "critical";
    safety_critical: boolean;
  }>;
  pass_count: number;
  fail_count: number;
  conditional_count: number;
  overall_disposition: "pass" | "fail" | "conditional";
  ncr_required: boolean;
  ncr_severity: "none" | "minor" | "major" | "critical";
  cofc_eligible: boolean;
  generated_at: string;
}

interface ExecutiveSummaryPayload {
  week_ending_date: string;
  headcount: number;
  role_distribution: Record<string, number>;
  team_avg_composite: number;
  payroll_total_cents: number;
  payroll_reconciliation_ok: boolean;
  pto_hours_used_this_week: number;
  pto_hours_balance_total: number;
  total_open_ncrs: number;
  open_ncrs_by_severity: { critical: number; major: number; minor: number };
  vendor_tier_mix: { preferred: number; approved: number; probation: number; disqualified: number };
  complaints_this_week: number;
  complaints_critical_this_week: number;
  red_flags: ReadonlyArray<{
    level: "warn" | "critical";
    domain: "hr" | "qa" | "finance" | "vendor" | "customer";
    metric: string;
    value: string;
    threshold: string;
  }>;
  generated_at: string;
}

interface DigestPayload {
  employee_id: string;
  as_of_date: string;
  role: string | null;
  tier: string | null;
  readiness_label: string | null;
  pto: {
    vacation_hours: number;
    sick_hours: number;
    personal_hours: number;
    pending_request_count: number;
    approved_upcoming_count: number;
  };
  top_actions: Array<{
    rank: number;
    kind: string;
    urgency: "info" | "warn" | "critical";
    headline: string;
  }>;
  shifts_today_tomorrow: Array<{
    date: string;
    shift: string;
    machine_serial: string;
  }>;
}

interface DashboardPayload {
  manager_employee_id: string;
  team_rollup: {
    n_reports: number;
    avg_composite: number;
    top_performer: { employee_id: string; score: number } | null;
    ready_for_promotion: string[];
    needs_attention: Array<{ employee_id: string; dim: string }>;
    pct_with_today_shift: number;
  };
  top_priorities: Array<{
    rank: number;
    kind: string;
    urgency: "info" | "warn" | "critical";
    headline: string;
  }>;
}

const API_BASE = "/api/v1/hotel-portal";

const URGENCY_COLORS = {
  info: "#3b82f6",     // blue
  warn: "#f59e0b",     // amber
  critical: "#ef4444", // red
};

async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.result as T;
}

export function HotelPortalPage() {
  const [mode, setMode] = useState<ViewMode>("employee");
  const [employeeId, setEmployeeId] = useState("EMP-JMD-005");
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [simReport, setSimReport] = useState<any | null>(null);
  const [execSummary, setExecSummary] = useState<ExecutiveSummaryPayload | null>(null);
  const [inspection, setInspection] = useState<InspectionReportPayload | null>(null);
  const [shippingMatch, setShippingMatch] = useState<any | null>(null);
  const [poStatus, setPoStatus] = useState<any | null>(null);
  const [timeclockSummary, setTimeclockSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDigest = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Build a digest payload by composing PTO balance + role-catalog with synthesized fields
      const ptoBalance = await fetch(`${API_BASE}/pto/balance/${employeeId}`)
        .then((r) => r.json()).then((j) => j.result);
      const digestInput = {
        employee_id: employeeId,
        as_of_date: new Date().toISOString().slice(0, 10),
        role: "machinist",
        tier: "intermediate",
        readiness_label: "developing",
        shifts_today_tomorrow: [
          { date: new Date().toISOString().slice(0, 10), shift: "day", machine_serial: "HAAS-VF2-001" },
        ],
        pto: {
          vacation_hours: ptoBalance?.vacation_hours ?? 0,
          sick_hours: ptoBalance?.sick_hours ?? 0,
          personal_hours: ptoBalance?.personal_hours ?? 0,
          pending_request_count: 0,
          approved_upcoming_count: 0,
        },
        required_courses: [],
        safety_reminders: [],
        nudges: [],
        payroll_snapshot: null,
      };
      const result = await postJSON<DigestPayload>("/digest", digestInput);
      setDigest(result);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await postJSON<DashboardPayload>("/dashboard", {
        manager_employee_id: "EMP-JMD-002",
        as_of_date: new Date().toISOString().slice(0, 10),
        direct_reports: [
          {
            employee_id: "EMP-JMD-005",
            role: "machinist",
            composite_score: 0.82,
            readiness_label: "ready",
            has_today_shift: true,
            needs_attention_dims: [],
          },
          {
            employee_id: "EMP-JMD-006",
            role: "machinist",
            composite_score: 0.61,
            readiness_label: "developing",
            has_today_shift: true,
            needs_attention_dims: ["quality"],
          },
          {
            employee_id: "EMP-JMD-009",
            role: "operator",
            composite_score: 0.48,
            readiness_label: "early",
            has_today_shift: false,
            needs_attention_dims: ["throughput", "safety"],
          },
        ],
        pending_pto_requests: [],
        team_coverage_gaps: [],
        overdue_action_items: [],
      });
      setDashboard(result);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExecutive = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Compose a representative week — operator can wire real upstream inputs later.
      const today = new Date();
      const weekEndingISO = today.toISOString().slice(0, 10);
      const result = await postJSON<ExecutiveSummaryPayload>("/executive-summary", {
        week_ending_date: weekEndingISO,
        headcount: 12,
        role_distribution: { machinist: 4, operator: 3, programmer: 2, qa_lead: 1, foreman: 1, owner: 1 },
        team_avg_composite: 0.78,
        payroll_total_cents: 4_800_000,
        payroll_reconciliation_ok: true,
        pto_hours_used_this_week: 32,
        pto_hours_balance_total: 1240,
        open_ncrs_critical: 0,
        open_ncrs_major: 2,
        open_ncrs_minor: 5,
        vendor_tier_mix: { preferred: 4, approved: 8, probation: 1, disqualified: 0 },
        complaints_this_week: 1,
        complaints_critical_this_week: 0,
      });
      setExecSummary(result);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInspection = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await postJSON<InspectionReportPayload>("/inspection-report", {
        inspection_id: `INSP-DEMO-${Date.now()}`,
        report_type: "final",
        part_number: "PN-12345",
        lot_number: "LOT-2026-DEMO",
        job_id: "JOB-9001",
        inspector_employee_id: "EMP-QC-01",
        inspection_date: today,
        characteristics: [
          { characteristic_id: "OD-1", nominal: 10.000, upper_tolerance: 0.05, lower_tolerance: -0.05, measured: 10.012, unit: "mm" },
          { characteristic_id: "ID-1", nominal: 5.000, upper_tolerance: 0.02, lower_tolerance: -0.02, measured: 5.005, unit: "mm", safety_critical: true },
          { characteristic_id: "RA-1", nominal: 1.6, upper_tolerance: 0.4, lower_tolerance: -0.4, measured: 1.55, unit: "ra_um" },
        ],
      });
      setInspection(result);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShipping = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const inbound = await postJSON<any>("/shipping-receiving/inbound", {
        receipt_id: `RCV-DEMO-${Date.now()}`,
        po_number: "PO-DEMO-001", vendor_id: "VND-ALCOA",
        part_number: "PN-12345", lot_number: "LOT-DEMO-1",
        qty_received: 100, qty_damaged: 0, uom: "ea",
        carrier: "FedEx", receipt_date: new Date().toISOString().slice(0, 10),
        receiver_employee_id: "EMP-RCV-01",
      });
      const match = await postJSON<any>("/shipping-receiving/three-way-match", {
        po_line: { po_number: "PO-DEMO-001", part_number: "PN-12345", qty_ordered: 100, unit_price_cents: 250, uom: "ea" },
        receipt: inbound,
        invoice_line: { invoice_number: "INV-DEMO-001", po_number: "PO-DEMO-001", part_number: "PN-12345", qty_invoiced: 100, unit_price_cents: 250, uom: "ea" },
      });
      setShippingMatch(match);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPO = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const po = await postJSON<any>("/po/create", {
        po_number: `PO-DEMO-${Date.now()}`,
        vendor_id: "VND-ALCOA",
        buyer_employee_id: "EMP-BUY-01",
        approver_employee_id: "EMP-MGR-01",
        po_date: new Date().toISOString().slice(0, 10),
        currency: "USD",
        lines: [
          { line_id: "L1", part_number: "PN-12345", qty_ordered: 100, unit_price_cents: 250, uom: "ea", promise_date: "2026-06-15" },
          { line_id: "L2", part_number: "PN-67890", qty_ordered: 50, unit_price_cents: 1000, uom: "lb", promise_date: "2026-06-15" },
        ],
      });
      const status = await postJSON<any>("/po/status", { po });
      setPoStatus({ po, status });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTimeclock = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Demo: 8h shift today
      const isoAgo = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
      const punches = [
        { punch_id: "P-DEMO-1", employee_id: employeeId, kind: "clock_in", timestamp: isoAgo(8 * 60) },
        { punch_id: "P-DEMO-2", employee_id: employeeId, kind: "start_break", timestamp: isoAgo(4 * 60) },
        { punch_id: "P-DEMO-3", employee_id: employeeId, kind: "end_break", timestamp: isoAgo(3.5 * 60) },
        { punch_id: "P-DEMO-4", employee_id: employeeId, kind: "clock_out", timestamp: isoAgo(0) },
      ];
      const summary = await postJSON<any>("/timeclock/summary", {
        employee_id: employeeId,
        date: new Date().toISOString().slice(0, 10),
        punches,
        week_to_date_minutes: 32 * 60, // pretend 32h already this week
      });
      setTimeclockSummary(summary);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const runSimulation = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await postJSON<any>("/simulation/run", { seed: 42, days: 30 });
      setSimReport(result);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "employee") loadDigest();
    else if (mode === "manager") loadDashboard();
    else if (mode === "executive") loadExecutive();
    else if (mode === "qc") loadInspection();
    else if (mode === "shipping") loadShipping();
    else if (mode === "po") loadPO();
    else if (mode === "timeclock") loadTimeclock();
  }, [mode, loadDigest, loadDashboard, loadExecutive, loadInspection, loadShipping, loadPO, loadTimeclock]);

  return (
    <div style={{
      maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <h1 style={{ fontSize: "clamp(20px, 4vw, 28px)", marginBottom: 12 }}>
        Hotel Portal — JM Die Shop
      </h1>

      <nav style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["employee", "manager", "executive", "qc", "shipping", "po", "timeclock", "simulation"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "10px 18px",
              minHeight: 44, // iOS HIG tap target
              border: "1px solid #ccc",
              borderRadius: 8,
              background: mode === m ? "#2563eb" : "#fff",
              color: mode === m ? "#fff" : "#000",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </nav>

      {error && (
        <div style={{
          padding: 12, background: "#fee", border: "1px solid #ef4444", borderRadius: 8, marginBottom: 12,
        }}>
          Error: {error}
        </div>
      )}

      {loading && <div style={{ padding: 12 }}>Loading…</div>}

      {mode === "employee" && digest && (
        <section>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Employee ID</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onBlur={loadDigest}
              style={{
                padding: 10, fontSize: 16, borderRadius: 6, border: "1px solid #ccc",
                minHeight: 44, width: "100%", maxWidth: 320,
              }}
            />
          </div>

          <h2 style={{ fontSize: 18 }}>Today's Priorities</h2>
          {digest.top_actions.length === 0 ? (
            <p style={{ color: "#666" }}>Nothing urgent. ✓</p>
          ) : (
            <ol style={{ paddingLeft: 0, listStyle: "none" }}>
              {digest.top_actions.map((a) => (
                <li
                  key={a.rank}
                  style={{
                    padding: 12,
                    borderLeft: `4px solid ${URGENCY_COLORS[a.urgency]}`,
                    background: "#f9fafb",
                    marginBottom: 8,
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: URGENCY_COLORS[a.urgency] }}>
                    #{a.rank} [{a.urgency.toUpperCase()}] — {a.kind}
                  </div>
                  <div style={{ marginTop: 4 }}>{a.headline}</div>
                </li>
              ))}
            </ol>
          )}

          <h2 style={{ fontSize: 18, marginTop: 16 }}>PTO Balance</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}>
            <PTOTile label="Vacation" hours={digest.pto.vacation_hours} color="#2563eb" />
            <PTOTile label="Sick" hours={digest.pto.sick_hours} color="#f59e0b" />
            <PTOTile label="Personal" hours={digest.pto.personal_hours} color="#10b981" />
          </div>

          <h2 style={{ fontSize: 18, marginTop: 16 }}>Upcoming Shifts</h2>
          <ul style={{ paddingLeft: 16 }}>
            {digest.shifts_today_tomorrow.map((s, i) => (
              <li key={i}>{s.date} — {s.shift} shift on {s.machine_serial}</li>
            ))}
          </ul>
        </section>
      )}

      {mode === "manager" && dashboard && (
        <section>
          <h2 style={{ fontSize: 18 }}>Team Rollup ({dashboard.team_rollup.n_reports} reports)</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}>
            <RollupTile
              label="Avg Composite"
              value={`${(dashboard.team_rollup.avg_composite * 100).toFixed(0)}%`}
            />
            <RollupTile
              label="With Today's Shift"
              value={`${(dashboard.team_rollup.pct_with_today_shift * 100).toFixed(0)}%`}
            />
            <RollupTile
              label="Top Performer"
              value={dashboard.team_rollup.top_performer?.employee_id ?? "—"}
            />
            <RollupTile
              label="Ready for Promotion"
              value={String(dashboard.team_rollup.ready_for_promotion.length)}
            />
          </div>

          <h2 style={{ fontSize: 18, marginTop: 16 }}>Top Priorities</h2>
          {dashboard.top_priorities.length === 0 ? (
            <p style={{ color: "#666" }}>Team is humming. ✓</p>
          ) : (
            <ol style={{ paddingLeft: 0, listStyle: "none" }}>
              {dashboard.top_priorities.map((p) => (
                <li
                  key={p.rank}
                  style={{
                    padding: 12,
                    borderLeft: `4px solid ${URGENCY_COLORS[p.urgency]}`,
                    background: "#f9fafb",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, color: URGENCY_COLORS[p.urgency] }}>
                    #{p.rank} [{p.urgency.toUpperCase()}] — {p.kind}
                  </div>
                  <div style={{ marginTop: 4 }}>{p.headline}</div>
                </li>
              ))}
            </ol>
          )}

          {dashboard.team_rollup.needs_attention.length > 0 && (
            <>
              <h2 style={{ fontSize: 18, marginTop: 16 }}>Needs Attention</h2>
              <ul>
                {dashboard.team_rollup.needs_attention.map((n, i) => (
                  <li key={i}>{n.employee_id} — {n.dim}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {mode === "executive" && execSummary && (
        <section>
          <h2 style={{ fontSize: 18 }}>
            Week of {execSummary.week_ending_date} — Executive Summary
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            <RollupTile label="Headcount" value={String(execSummary.headcount)} />
            <RollupTile
              label="Team Avg"
              value={`${(execSummary.team_avg_composite * 100).toFixed(0)}%`}
            />
            <RollupTile
              label="Payroll (week)"
              value={`$${(execSummary.payroll_total_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <RollupTile
              label="Payroll Reconciled"
              value={execSummary.payroll_reconciliation_ok ? "✓ OK" : "✗ FAIL"}
            />
            <RollupTile label="Open NCRs" value={String(execSummary.total_open_ncrs)} />
            <RollupTile
              label="Critical NCRs"
              value={String(execSummary.open_ncrs_by_severity.critical)}
            />
            <RollupTile
              label="Complaints (week)"
              value={String(execSummary.complaints_this_week)}
            />
            <RollupTile
              label="Disqualified Vendors"
              value={String(execSummary.vendor_tier_mix.disqualified)}
            />
          </div>

          <h2 style={{ fontSize: 18, marginTop: 16 }}>
            Red Flags ({execSummary.red_flags.length})
          </h2>
          {execSummary.red_flags.length === 0 ? (
            <p style={{ color: "#10b981", fontWeight: 600 }}>All clear — no red flags this week. ✓</p>
          ) : (
            <ol style={{ paddingLeft: 0, listStyle: "none" }}>
              {execSummary.red_flags.map((f, i) => (
                <li
                  key={i}
                  style={{
                    padding: 12,
                    borderLeft: `4px solid ${URGENCY_COLORS[f.level === "critical" ? "critical" : "warn"]}`,
                    background: "#f9fafb",
                    marginBottom: 8,
                    borderRadius: 4,
                  }}
                >
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    color: URGENCY_COLORS[f.level === "critical" ? "critical" : "warn"],
                  }}>
                    [{f.level.toUpperCase()}] {f.domain.toUpperCase()} — {f.metric}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    value: <strong>{f.value}</strong> · threshold: {f.threshold}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <h2 style={{ fontSize: 18, marginTop: 16 }}>Role Distribution</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}>
            {Object.entries(execSummary.role_distribution).map(([role, count]) => (
              <div key={role} style={{
                padding: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
              }}>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{role}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{count}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === "qc" && inspection && (
        <section>
          <h2 style={{ fontSize: 18 }}>
            Inspection {inspection.inspection_id} — {inspection.report_type.toUpperCase()}
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            <RollupTile label="Part" value={inspection.part_number} />
            <RollupTile label="Lot" value={inspection.lot_number} />
            <RollupTile
              label="Disposition"
              value={inspection.overall_disposition.toUpperCase()}
            />
            <RollupTile label="Pass" value={String(inspection.pass_count)} />
            <RollupTile label="Conditional" value={String(inspection.conditional_count)} />
            <RollupTile label="Fail" value={String(inspection.fail_count)} />
            <RollupTile label="NCR Required" value={inspection.ncr_required ? "YES" : "NO"} />
            <RollupTile label="CofC Eligible" value={inspection.cofc_eligible ? "✓ YES" : "✗ NO"} />
          </div>

          <h2 style={{ fontSize: 18, marginTop: 16 }}>Characteristics</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>Nominal</th>
                  <th style={{ padding: 8 }}>Tol</th>
                  <th style={{ padding: 8 }}>Measured</th>
                  <th style={{ padding: 8 }}>Deviation</th>
                  <th style={{ padding: 8 }}>Unit</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inspection.characteristics.map((c) => (
                  <tr key={c.characteristic_id} style={{
                    borderTop: "1px solid #e5e7eb",
                    background: c.in_spec ? "transparent" : "#fef2f2",
                  }}>
                    <td style={{ padding: 8 }}>
                      {c.characteristic_id}
                      {c.safety_critical && <span style={{ color: "#ef4444", marginLeft: 4 }}>⚠</span>}
                    </td>
                    <td style={{ padding: 8 }}>{c.nominal.toFixed(4)}</td>
                    <td style={{ padding: 8 }}>
                      +{c.upper_tolerance.toFixed(3)} / {c.lower_tolerance.toFixed(3)}
                    </td>
                    <td style={{ padding: 8 }}>{c.measured.toFixed(4)}</td>
                    <td style={{ padding: 8 }}>{c.deviation.toFixed(4)}</td>
                    <td style={{ padding: 8 }}>{c.unit}</td>
                    <td style={{
                      padding: 8, fontWeight: 600,
                      color: c.in_spec ? "#10b981"
                        : c.severity === "critical" ? "#ef4444"
                        : c.severity === "major" ? "#f59e0b"
                        : "#f59e0b",
                    }}>
                      {c.in_spec ? "✓ IN SPEC" : c.severity.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inspection.ncr_required && (
            <div style={{
              marginTop: 16, padding: 12,
              background: "#fef2f2", border: `2px solid ${URGENCY_COLORS.critical}`, borderRadius: 8,
            }}>
              <strong style={{ color: URGENCY_COLORS.critical }}>
                NCR Required — severity: {inspection.ncr_severity.toUpperCase()}
              </strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                File a Non-Conformance Report citing inspection {inspection.inspection_id}.
                Linked via NonConformanceAndCorrectiveActionEngine (iter23).
              </div>
            </div>
          )}
        </section>
      )}

      {mode === "shipping" && shippingMatch && (
        <section>
          <h2 style={{ fontSize: 18 }}>3-Way Match (PO ↔ Receipt ↔ Invoice)</h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12,
          }}>
            <RollupTile label="PO" value={shippingMatch.po_number} />
            <RollupTile label="Status" value={shippingMatch.status.toUpperCase()} />
            <RollupTile label="Reconciles" value={shippingMatch.reconciles ? "✓ YES" : "✗ NO"} />
            <RollupTile label="Qty Ordered" value={String(shippingMatch.qty_ordered)} />
            <RollupTile label="Qty Received" value={String(shippingMatch.qty_received ?? "—")} />
            <RollupTile label="Qty Invoiced" value={String(shippingMatch.qty_invoiced ?? "—")} />
            <RollupTile label="PO Extension" value={`$${(shippingMatch.price_extension_po_cents / 100).toFixed(2)}`} />
            <RollupTile label="Invoice Extension" value={shippingMatch.price_extension_invoice_cents != null ? `$${(shippingMatch.price_extension_invoice_cents / 100).toFixed(2)}` : "—"} />
          </div>
          {shippingMatch.discrepancies?.length > 0 && (
            <>
              <h3 style={{ fontSize: 16, marginTop: 16 }}>Discrepancies</h3>
              <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                {shippingMatch.discrepancies.map((d: any, i: number) => (
                  <li key={i} style={{
                    padding: 12,
                    borderLeft: `4px solid ${d.severity === "critical" ? URGENCY_COLORS.critical : URGENCY_COLORS.warn}`,
                    background: "#f9fafb", marginBottom: 8, borderRadius: 4,
                  }}>
                    <strong style={{ color: d.severity === "critical" ? URGENCY_COLORS.critical : URGENCY_COLORS.warn }}>
                      [{d.severity.toUpperCase()}] {d.class}
                    </strong>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      value: {d.value} · threshold: {d.threshold}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {mode === "po" && poStatus && (
        <section>
          <h2 style={{ fontSize: 18 }}>Purchase Order {poStatus.po.po_number}</h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16,
          }}>
            <RollupTile label="State" value={poStatus.po.state.toUpperCase()} />
            <RollupTile label="Vendor" value={poStatus.po.vendor_id} />
            <RollupTile label="Currency" value={poStatus.po.currency} />
            <RollupTile label="Total" value={`$${(poStatus.po.total_extension_cents / 100).toFixed(2)}`} />
            <RollupTile label="Lines" value={String(poStatus.status.line_count)} />
            <RollupTile label="% Received" value={`${(poStatus.status.pct_received * 100).toFixed(0)}%`} />
            <RollupTile label="Cancellable" value={poStatus.status.cancellable ? "YES" : "NO"} />
            <RollupTile label="Receivable" value={poStatus.status.receivable ? "YES" : "NO"} />
          </div>

          <h3 style={{ fontSize: 16, marginTop: 16 }}>Line Items</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Line</th>
                  <th style={{ padding: 8 }}>Part</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Unit Price</th>
                  <th style={{ padding: 8 }}>Extension</th>
                  <th style={{ padding: 8 }}>Promise</th>
                </tr>
              </thead>
              <tbody>
                {poStatus.po.lines.map((l: any) => (
                  <tr key={l.line_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}>{l.line_id}</td>
                    <td style={{ padding: 8 }}>{l.part_number}</td>
                    <td style={{ padding: 8 }}>{l.qty_ordered} {l.uom}</td>
                    <td style={{ padding: 8 }}>${(l.unit_price_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>${(l.line_extension_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{l.promise_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === "timeclock" && timeclockSummary && (
        <section>
          <h2 style={{ fontSize: 18 }}>Time Clock — {timeclockSummary.employee_id}</h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16,
          }}>
            <RollupTile label="Date" value={timeclockSummary.date} />
            <RollupTile label="Worked" value={`${(timeclockSummary.worked_minutes / 60).toFixed(2)}h`} />
            <RollupTile label="Break" value={`${timeclockSummary.break_minutes}min`} />
            <RollupTile label="Shifts" value={String(timeclockSummary.shift_count)} />
            <RollupTile label="Current State" value={timeclockSummary.current_state.replace("_", " ").toUpperCase()} />
          </div>

          {timeclockSummary.flags?.length > 0 && (
            <>
              <h3 style={{ fontSize: 16, marginTop: 16 }}>Flags ({timeclockSummary.flags.length})</h3>
              <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                {timeclockSummary.flags.map((f: any, i: number) => (
                  <li key={i} style={{
                    padding: 12,
                    borderLeft: `4px solid ${f.severity === "critical" ? URGENCY_COLORS.critical : URGENCY_COLORS.warn}`,
                    background: "#f9fafb", marginBottom: 8, borderRadius: 4,
                  }}>
                    <strong style={{ color: f.severity === "critical" ? URGENCY_COLORS.critical : URGENCY_COLORS.warn }}>
                      [{f.severity.toUpperCase()}] {f.kind.replace(/_/g, " ")}
                    </strong>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{f.detail}</div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 style={{ fontSize: 16, marginTop: 16 }}>Punches ({timeclockSummary.punches.length})</h3>
          <ul style={{ paddingLeft: 16, fontSize: 13 }}>
            {timeclockSummary.punches.map((p: any) => (
              <li key={p.punch_id}>
                {p.kind} @ {new Date(p.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      {mode === "simulation" && (
        <section>
          <p>Run an E2E 30-day synergy regression against the JM Die roster.</p>
          <button
            onClick={runSimulation}
            disabled={loading}
            style={{
              padding: "12px 24px", minHeight: 44, borderRadius: 8,
              background: "#2563eb", color: "#fff", border: "none",
              fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Running…" : "Run Simulation (seed=42, 30d)"}
          </button>

          {simReport && (
            <pre style={{
              marginTop: 16, padding: 16, background: "#1e293b", color: "#e2e8f0",
              borderRadius: 8, overflow: "auto", fontSize: 12,
            }}>
{JSON.stringify(simReport, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

function PTOTile({ label, hours, color }: { label: string; hours: number; color: string }) {
  return (
    <div style={{
      padding: 14, border: `2px solid ${color}`, borderRadius: 8, background: "#fff",
    }}>
      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{hours.toFixed(1)}h</div>
      <div style={{ fontSize: 11, color: "#666" }}>{(hours / 8).toFixed(1)} days</div>
    </div>
  );
}

function RollupTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: 14, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff",
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default HotelPortalPage;
