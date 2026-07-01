/**
 * JMDieFleetScanStatusPanel — JM-DIE-FLEET-SCAN-MS0 / U-FS04
 *
 * User-facing surface for the "every single file accounted for" guarantee.
 * Calls prism_quoting:jm_die_scan_ledger_stats on mount + refresh; renders
 * total files, per-source counts, per-kind counts, and parse-error count.
 *
 * Per web/CLAUDE.md Calculator Studio design language: dark layered surface,
 * single dominant accent (cyan for "scanned/healthy"), status chips for the
 * per-source / per-kind breakdown, no soft pastels.
 *
 * Per R12 fail-loud: a dispatcher error renders the reason string, never an
 * empty silent panel.
 *
 * @author slot:charlie /goal-16 iter1, 2026-05-24
 */
import React, { useState, useEffect, useCallback } from "react";

interface LedgerStats {
  ok?: boolean;
  total_rows?: number;
  unique_paths?: number;
  by_source?: Record<string, number>;
  by_kind?: Record<string, number>;
  parse_errors?: number;
  ledger_path?: string;
  reason?: string;
}

async function fetchLedgerStats(): Promise<LedgerStats> {
  try {
    const resp = await fetch("/api/mcp/quoting", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "jm_die_scan_ledger_stats", params: {} }),
    });
    if (!resp.ok) {
      return { reason: `http-${resp.status}-${resp.statusText}` };
    }
    return (await resp.json()) as LedgerStats;
  } catch (err) {
    return { reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Test seam — the integration test substitutes a fake here. */
export const __testHooks = { fetchLedgerStats };

const SOURCE_LABELS: Record<string, string> = {
  "program-analysis": "Program analysis",
  "financial-baseline": "Financial baseline",
  "fleet-scan-batch": "Fleet scan",
  "seed": "Seed",
};
const KIND_LABELS: Record<string, string> = {
  "cnc-program": "CNC program",
  "docustrata": "Docustrata",
  "other": "CAD / binary / other",
};

export const JMDieFleetScanStatusPanel: React.FC = () => {
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await __testHooks.fetchLedgerStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      data-testid="jmdie-fleet-scan-status"
      style={{
        marginTop: 24,
        padding: 16,
        background: "rgba(2,6,23,0.78)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        color: "#e2e8f0",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", margin: 0, color: "#67e8f9" }}>
          JM Die Fleet Scan — Coverage
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          data-testid="jmdie-fleet-scan-refresh"
          disabled={loading}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            background: "rgba(103,232,249,0.12)",
            border: "1px solid rgba(103,232,249,0.4)",
            borderRadius: 4,
            color: "#67e8f9",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {stats?.reason && (
        <p data-testid="jmdie-fleet-scan-error" style={{ color: "#f87171", margin: 0, fontSize: 13 }}>
          Scan ledger unreachable: {stats.reason}
        </p>
      )}

      {stats && !stats.reason && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Metric label="Files inventoried" value={stats.unique_paths ?? 0} accent="#34d399" />
            <Metric label="Ledger rows" value={stats.total_rows ?? 0} accent="#67e8f9" />
          </div>

          <CountsBlock title="By source" labels={SOURCE_LABELS} counts={stats.by_source ?? {}} />
          <CountsBlock title="By kind" labels={KIND_LABELS} counts={stats.by_kind ?? {}} />

          {(stats.parse_errors ?? 0) > 0 && (
            <p data-testid="jmdie-fleet-scan-parse-errors" style={{ color: "#fbbf24", fontSize: 12, marginTop: 8 }}>
              ⚠ {stats.parse_errors} ledger row(s) failed to parse — investigate {stats.ledger_path}
            </p>
          )}
        </>
      )}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: number; accent: string }> = ({ label, value, accent }) => (
  <div style={{ padding: 10, background: "rgba(148,163,184,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }}>
    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>
      {value.toLocaleString()}
    </div>
  </div>
);

const CountsBlock: React.FC<{ title: string; labels: Record<string, string>; counts: Record<string, number> }> = ({ title, labels, counts }) => {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {entries.length === 0 ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
        ) : (
          entries.map(([key, count]) => (
            <span
              key={key}
              data-testid={`jmdie-fleet-scan-${title.toLowerCase().replace(/\s+/g, "-")}-${key}`}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "rgba(103,232,249,0.08)",
                border: "1px solid rgba(103,232,249,0.25)",
                borderRadius: 999,
                color: "#cbd5e1",
              }}
            >
              {labels[key] ?? key}: <strong style={{ color: "#67e8f9" }}>{count.toLocaleString()}</strong>
            </span>
          ))
        )}
      </div>
    </div>
  );
};
