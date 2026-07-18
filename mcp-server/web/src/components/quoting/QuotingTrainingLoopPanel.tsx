/**
 * QuotingTrainingLoopPanel — JM-DIE-QUOTE-TRAINING-MS0 / U-QT02
 *
 * Operator-visible surface for the quoting accuracy training loop. Shows MAE,
 * RMSE, MAPE, signed bias direction + top-5 per-customer bias rows + a
 * "Run new cycle" button that hits jm_die_training_loop_run.
 *
 * Pinned to MobileCameraQuotePage. Calculator-Studio dark theme.
 *
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */
import React, { useState, useCallback } from "react";

interface BiasRow {
  customer: string;
  record_count: number;
  mean_pct_error: number;
  mean_abs_pct_error: number;
  systematic_direction: "over-predicting" | "under-predicting" | "balanced";
}

interface AccuracyReport {
  ok?: boolean;
  total_records?: number;
  total_predicted?: number;
  total_skipped?: number;
  metrics?: {
    mae_usd: number;
    rmse_usd: number;
    mape_pct: number;
    mean_signed_pct_error: number;
  };
  per_customer_bias?: BiasRow[];
  psi_delta_fed_count?: number;
  reason?: string;
}

interface RunResponse extends AccuracyReport {
  reason?: string;
}

async function runTrainingCycle(records: unknown[]): Promise<RunResponse> {
  try {
    const resp = await fetch("/api/mcp/quoting", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "jm_die_training_loop_run", params: { records, feedPsnAutonomy: true } }),
    });
    if (!resp.ok) return { reason: `http-${resp.status}-${resp.statusText}` };
    return (await resp.json()) as RunResponse;
  } catch (err) {
    return { reason: err instanceof Error ? err.message : String(err) };
  }
}

export const __testHooks = { runTrainingCycle };

const DEMO_RECORDS = [
  { customer: "ACCURATE", part_id: "778", doc_date: "2024-06-15", actual_revenue_usd: 142.50, estimated_time_in_cut_s: 600, estimated_material_spend_usd: 75, machine_rate_usd_per_hr: 95 },
  { customer: "ITW", part_id: "9095", doc_date: "2024-07-22", actual_revenue_usd: 178.30, estimated_time_in_cut_s: 720, estimated_material_spend_usd: 80, machine_rate_usd_per_hr: 95 },
  { customer: "OPTIMAS", part_id: "X-123", doc_date: "2024-09-01", actual_revenue_usd: 95.10, estimated_time_in_cut_s: 400, estimated_material_spend_usd: 50, machine_rate_usd_per_hr: 95 },
];

export const QuotingTrainingLoopPanel: React.FC = () => {
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runCycle = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await __testHooks.runTrainingCycle(DEMO_RECORDS));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section
      data-testid="qt-training-loop-panel"
      style={{
        marginTop: 16,
        padding: 16,
        background: "rgba(2,6,23,0.78)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        color: "#e2e8f0",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", margin: 0, color: "#fbbf24" }}>
          Quoting Accuracy — Training Loop
        </h2>
        <button
          type="button"
          onClick={() => void runCycle()}
          disabled={loading}
          data-testid="qt-run-cycle"
          style={{
            padding: "4px 12px",
            fontSize: 12,
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.5)",
            borderRadius: 4,
            color: "#fbbf24",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Running…" : "Run new cycle"}
        </button>
      </header>

      {!report && (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          Click "Run new cycle" to measure FMV accuracy against the {DEMO_RECORDS.length} demo baseline records. Real cycle uses the full 500-record financial baseline.
        </p>
      )}

      {report?.reason && (
        <p data-testid="qt-error" style={{ color: "#f87171", margin: 0, fontSize: 13 }}>
          Training cycle failed: {report.reason}
        </p>
      )}

      {report && !report.reason && report.metrics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <Metric label="MAE" value={`$${report.metrics.mae_usd.toFixed(2)}`} accent="#fbbf24" testId="qt-metric-mae" />
            <Metric label="RMSE" value={`$${report.metrics.rmse_usd.toFixed(2)}`} accent="#fbbf24" testId="qt-metric-rmse" />
            <Metric label="MAPE" value={`${report.metrics.mape_pct.toFixed(1)}%`} accent="#f97316" testId="qt-metric-mape" />
            <Metric label="Signed bias" value={`${report.metrics.mean_signed_pct_error > 0 ? "+" : ""}${report.metrics.mean_signed_pct_error.toFixed(1)}%`} accent={Math.abs(report.metrics.mean_signed_pct_error) > 5 ? "#f87171" : "#34d399"} testId="qt-metric-bias" />
          </div>

          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
            {report.total_predicted ?? 0} / {report.total_records ?? 0} records predicted ({report.total_skipped ?? 0} skipped)
            {(report.psi_delta_fed_count ?? 0) > 0 && (
              <span style={{ marginLeft: 8, color: "#a78bfa" }}>· {report.psi_delta_fed_count} psi_delta signals fed to PSN</span>
            )}
          </div>

          <div data-testid="qt-customer-bias" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Per-customer bias (top {Math.min(5, (report.per_customer_bias ?? []).length)})
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(report.per_customer_bias ?? []).slice(0, 5).map((b) => {
                const tone = b.systematic_direction === "balanced" ? "#34d399"
                  : b.systematic_direction === "over-predicting" ? "#f87171" : "#fbbf24";
                return (
                  <li
                    key={b.customer}
                    data-testid={`qt-bias-row-${b.customer}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      background: "rgba(148,163,184,0.04)",
                      borderLeft: `2px solid ${tone}`,
                      marginBottom: 2,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "#cbd5e1" }}>{b.customer} ({b.record_count})</span>
                    <span style={{ color: tone }}>
                      {b.mean_pct_error > 0 ? "+" : ""}{b.mean_pct_error.toFixed(1)}% · {b.systematic_direction}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; accent: string; testId: string }> = ({ label, value, accent, testId }) => (
  <div data-testid={testId} style={{ padding: 8, background: "rgba(148,163,184,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
    <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
);
