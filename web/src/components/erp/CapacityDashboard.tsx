import { useState, useEffect, useMemo } from "react";
import {
  useErpCapacity,
  useErpBottleneck,
  useErpOee,
} from "../../hooks/useErp";
import type {
  ErpMachineCapacity,
  ErpBottleneck,
  ErpOeeMetric,
} from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TimeRange = "day" | "week" | "month";
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CapacityDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("day");

  const capacity = useErpCapacity();
  const bottleneck = useErpBottleneck();
  const oee = useErpOee();

  // Fetch all analytics on mount and when time range changes
  useEffect(() => {
    capacity.execute({ time_range: timeRange });
    bottleneck.execute({ time_range: timeRange });
    oee.execute({ time_range: timeRange });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loading = capacity.loading || bottleneck.loading || oee.loading;
  const error = capacity.error || bottleneck.error || oee.error;

  return (
    <div className="flex flex-col gap-4">
      {/* Time range selector */}
      <div className="flex items-center gap-1" role="tablist" aria-label="Time range">
        {TIME_RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="tab"
            aria-selected={timeRange === r.value}
            onClick={() => setTimeRange(r.value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              timeRange === r.value
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Loading analytics...</span>
        </div>
      )}

      {/* Capacity utilization */}
      {capacity.data && (
        <CapacityPanel
          machines={capacity.data.machines}
          overallPct={capacity.data.overall_utilization_pct}
          totalHours={capacity.data.total_available_hours}
        />
      )}

      {/* Bottlenecks */}
      {bottleneck.data && bottleneck.data.bottlenecks.length > 0 && (
        <BottleneckPanel
          bottlenecks={bottleneck.data.bottlenecks}
          criticalCount={bottleneck.data.critical_count}
        />
      )}

      {/* OEE gauges */}
      {oee.data && (
        <OeePanel metrics={oee.data.metrics} plantOee={oee.data.plant_oee} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capacity Panel — bar chart per machine
// ---------------------------------------------------------------------------

function CapacityPanel({
  machines,
  overallPct,
  totalHours,
}: {
  machines: ErpMachineCapacity[];
  overallPct: number;
  totalHours: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Capacity Utilization
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>Overall: {overallPct.toFixed(1)}%</span>
          <span>{totalHours.toFixed(0)}h available</span>
        </div>
      </div>

      <div className="space-y-2">
        {machines.map((m) => (
          <div key={m.machine} className="flex items-center gap-3">
            <span className="w-24 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {m.machine}
            </span>
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    m.utilization_pct >= 90
                      ? "bg-red-500"
                      : m.utilization_pct >= 70
                        ? "bg-amber-500"
                        : "bg-primary-500"
                  }`}
                  style={{ width: `${Math.min(m.utilization_pct, 100)}%` }}
                />
              </div>
            </div>
            <span className="w-10 text-right text-[10px] text-slate-500">
              {m.utilization_pct.toFixed(0)}%
            </span>
            <span className="w-16 text-right text-[10px] text-slate-400">
              {m.idle_hours.toFixed(1)}h idle
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottleneck Panel
// ---------------------------------------------------------------------------

function BottleneckPanel({
  bottlenecks,
  criticalCount,
}: {
  bottlenecks: ErpBottleneck[];
  criticalCount: number;
}) {
  const sorted = useMemo(() => {
    const order = ["critical", "high", "medium", "low"];
    return [...bottlenecks].sort(
      (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
    );
  }, [bottlenecks]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Bottlenecks
        </h3>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {criticalCount} critical
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {sorted.map((b) => (
          <div
            key={b.machine}
            className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/50"
          >
            <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[b.severity]}`}>
              {b.severity}
            </span>
            <div className="flex-1 text-xs">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {b.machine}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {b.utilization_pct.toFixed(0)}% util | Queue: {b.queue_depth} | Avg wait: {b.avg_wait_min.toFixed(0)}min
              </div>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {b.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OEE Panel — gauge-style display
// ---------------------------------------------------------------------------

function OeePanel({
  metrics,
  plantOee,
}: {
  metrics: ErpOeeMetric[];
  plantOee: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          OEE — Overall Equipment Effectiveness
        </h3>
        <OeeValue value={plantOee} label="Plant" large />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.machine}
            className="rounded-md border border-slate-100 p-3 dark:border-slate-700"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {m.machine}
              </span>
              <OeeValue value={m.oee} />
            </div>

            {/* A/P/Q bars */}
            <div className="space-y-1">
              <MiniBar label="Availability" value={m.availability} />
              <MiniBar label="Performance" value={m.performance} />
              <MiniBar label="Quality" value={m.quality} />
            </div>

            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
              <span>{m.downtime_min}min down</span>
              <span>{m.reject_count} rejects</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function OeeValue({ value, label, large }: { value: number; label?: string; large?: boolean }) {
  const color =
    value >= 85
      ? "text-green-600 dark:text-green-400"
      : value >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="text-right">
      {label && <div className="text-[10px] text-slate-500">{label}</div>}
      <div className={`${large ? "text-lg" : "text-sm"} font-bold ${color}`}>
        {value.toFixed(0)}%
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 text-[10px] text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-primary-400"
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] text-slate-500">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
