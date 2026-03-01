import { useEffect } from "react";
import { useErpPredictive } from "../../hooks/useErp";
import type { ErpMaintenanceAlert } from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<string, { badge: string; bar: string }> = {
  low: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    bar: "bg-slate-400",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  high: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    bar: "bg-orange-500",
  },
  critical: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    bar: "bg-red-500",
  },
};

const RISK_ORDER = ["critical", "high", "medium", "low"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictiveMaintenance() {
  const predictive = useErpPredictive();

  useEffect(() => {
    predictive.execute({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (predictive.loading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <Spinner size="sm" />
        <span className="text-xs text-slate-500">Loading maintenance data...</span>
      </div>
    );
  }

  if (predictive.error) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {predictive.error}
        <button
          type="button"
          onClick={() => predictive.execute({})}
          className="ml-2 text-primary-600 hover:underline dark:text-primary-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!predictive.data) return null;

  const { alerts, machines_at_risk, next_maintenance_due } = predictive.data;

  // Sort by risk severity
  const sorted = [...alerts].sort(
    (a, b) => RISK_ORDER.indexOf(a.risk_level) - RISK_ORDER.indexOf(b.risk_level),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Summary header */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
        </span>
        {machines_at_risk > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {machines_at_risk} machine{machines_at_risk !== 1 ? "s" : ""} at risk
          </span>
        )}
        {next_maintenance_due && (
          <span className="text-slate-500">
            Next due: {formatDate(next_maintenance_due)}
          </span>
        )}
      </div>

      {/* Alert cards */}
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No maintenance alerts — all machines healthy
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((alert, i) => (
            <AlertCard key={`${alert.machine}-${alert.component}-${i}`} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert Card
// ---------------------------------------------------------------------------

function AlertCard({ alert }: { alert: ErpMaintenanceAlert }) {
  const colors = RISK_COLORS[alert.risk_level] ?? RISK_COLORS.low;
  const daysUntil = daysUntilDate(alert.predicted_failure_date);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {alert.machine}
        </h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
          {alert.risk_level}
        </span>
      </div>

      {/* Component + failure prediction */}
      <div className="mb-2 text-xs">
        <div className="text-slate-600 dark:text-slate-400">
          Component: <span className="font-medium text-slate-700 dark:text-slate-300">{alert.component}</span>
        </div>
        <div className="mt-0.5 text-slate-500">
          Predicted failure: {formatDate(alert.predicted_failure_date)}
          {daysUntil !== null && (
            <span className={`ml-1 font-medium ${daysUntil <= 7 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
              ({daysUntil}d)
            </span>
          )}
        </div>
      </div>

      {/* Risk bar */}
      <div className="mb-2">
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full ${colors.bar}`}
            style={{
              width: `${
                alert.risk_level === "critical" ? 100
                : alert.risk_level === "high" ? 75
                : alert.risk_level === "medium" ? 50
                : 25
              }%`,
            }}
          />
        </div>
      </div>

      {/* Action + downtime */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-[10px] text-slate-500 dark:text-slate-400">
          {alert.recommended_action}
        </p>
        <span className="shrink-0 text-[10px] text-slate-400">
          ~{alert.estimated_downtime_hours}h downtime
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntilDate(iso: string): number | null {
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return null;
  return Math.max(0, Math.ceil((ts - Date.now()) / 86_400_000));
}
