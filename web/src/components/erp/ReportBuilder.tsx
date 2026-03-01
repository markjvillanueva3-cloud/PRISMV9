import { useState } from "react";
import {
  useErpCapacity,
  useErpBottleneck,
  useErpOee,
} from "../../hooks/useErp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricType = "capacity" | "bottleneck" | "oee";
type ChartType = "bar" | "line" | "table";
type TimeRange = "day" | "week" | "month";

const METRICS: { value: MetricType; label: string }[] = [
  { value: "capacity", label: "Capacity Utilization" },
  { value: "bottleneck", label: "Bottleneck Analysis" },
  { value: "oee", label: "OEE Metrics" },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "table", label: "Table" },
];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportBuilder() {
  const [metric, setMetric] = useState<MetricType>("capacity");
  const [chart, setChart] = useState<ChartType>("bar");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [generated, setGenerated] = useState(false);

  const capacity = useErpCapacity();
  const bottleneck = useErpBottleneck();
  const oee = useErpOee();

  const loading = capacity.loading || bottleneck.loading || oee.loading;

  const handleGenerate = async () => {
    switch (metric) {
      case "capacity":
        await capacity.execute({ time_range: timeRange });
        break;
      case "bottleneck":
        await bottleneck.execute({ time_range: timeRange });
        break;
      case "oee":
        await oee.execute({ time_range: timeRange });
        break;
    }
    setGenerated(true);
  };

  const handleExportCsv = () => {
    let csv = "";
    if (metric === "capacity" && capacity.data) {
      csv = "Machine,Utilization %,Available Hours,Scheduled Hours,Idle Hours\n";
      for (const m of capacity.data.machines) {
        csv += `${m.machine},${m.utilization_pct},${m.available_hours},${m.scheduled_hours},${m.idle_hours}\n`;
      }
    } else if (metric === "bottleneck" && bottleneck.data) {
      csv = "Machine,Severity,Utilization %,Queue Depth,Avg Wait Min,Recommendation\n";
      for (const b of bottleneck.data.bottlenecks) {
        csv += `${b.machine},${b.severity},${b.utilization_pct},${b.queue_depth},${b.avg_wait_min},"${b.recommendation}"\n`;
      }
    } else if (metric === "oee" && oee.data) {
      csv = "Machine,OEE,Availability,Performance,Quality,Downtime Min,Rejects\n";
      for (const m of oee.data.metrics) {
        csv += `${m.machine},${m.oee},${m.availability},${m.performance},${m.quality},${m.downtime_min},${m.reject_count}\n`;
      }
    }

    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${metric}-${timeRange}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Config row */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Metric</span>
          <select
            value={metric}
            onChange={(e) => { setMetric(e.target.value as MetricType); setGenerated(false); }}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Time Range</span>
          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value as TimeRange); setGenerated(false); }}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {TIME_RANGES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Chart Type</span>
          <div className="flex items-center gap-1">
            {CHART_TYPES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setChart(c.value)}
                className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  chart === c.value
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="rounded-md bg-primary-600 px-4 py-1.5 text-xs font-medium
            text-white hover:bg-primary-700 disabled:opacity-40"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Loading data...</span>
        </div>
      )}

      {/* Report preview */}
      {generated && !loading && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {METRICS.find((m) => m.value === metric)?.label} — {timeRange}
            </h3>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded border border-slate-300 px-2 py-1 text-[10px]
                text-slate-600 hover:bg-slate-50 dark:border-slate-600
                dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>

          {/* Capacity chart/table */}
          {metric === "capacity" && capacity.data && (
            chart === "table" ? (
              <DataTable
                headers={["Machine", "Utilization", "Available", "Scheduled", "Idle"]}
                rows={capacity.data.machines.map((m) => [
                  m.machine,
                  `${m.utilization_pct.toFixed(1)}%`,
                  `${m.available_hours.toFixed(1)}h`,
                  `${m.scheduled_hours.toFixed(1)}h`,
                  `${m.idle_hours.toFixed(1)}h`,
                ])}
              />
            ) : (
              <BarChart
                items={capacity.data.machines.map((m) => ({
                  label: m.machine,
                  value: m.utilization_pct,
                  max: 100,
                }))}
                unit="%"
              />
            )
          )}

          {/* Bottleneck table */}
          {metric === "bottleneck" && bottleneck.data && (
            <DataTable
              headers={["Machine", "Severity", "Utilization", "Queue", "Wait"]}
              rows={bottleneck.data.bottlenecks.map((b) => [
                b.machine,
                b.severity,
                `${b.utilization_pct.toFixed(0)}%`,
                String(b.queue_depth),
                `${b.avg_wait_min.toFixed(0)}min`,
              ])}
            />
          )}

          {/* OEE chart/table */}
          {metric === "oee" && oee.data && (
            chart === "table" ? (
              <DataTable
                headers={["Machine", "OEE", "Avail", "Perf", "Quality"]}
                rows={oee.data.metrics.map((m) => [
                  m.machine,
                  `${m.oee.toFixed(0)}%`,
                  `${(m.availability * 100).toFixed(0)}%`,
                  `${(m.performance * 100).toFixed(0)}%`,
                  `${(m.quality * 100).toFixed(0)}%`,
                ])}
              />
            ) : (
              <BarChart
                items={oee.data.metrics.map((m) => ({
                  label: m.machine,
                  value: m.oee,
                  max: 100,
                }))}
                unit="%"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple visual components
// ---------------------------------------------------------------------------

function BarChart({
  items,
  unit,
}: {
  items: { label: string; value: number; max: number }[];
  unit: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-24 truncate text-xs text-slate-700 dark:text-slate-300">
            {item.label}
          </span>
          <div className="flex-1">
            <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded bg-primary-500"
                style={{ width: `${(item.value / item.max) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-12 text-right text-xs text-slate-600 dark:text-slate-400">
            {item.value.toFixed(1)}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {headers.map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-medium text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 text-slate-700 dark:text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
