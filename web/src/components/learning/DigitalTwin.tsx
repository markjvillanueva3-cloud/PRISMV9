import { useState, useEffect, useCallback } from "react";
import { useDigitalTwin } from "../../hooks/useLearning";
import type { TwinStatus, TwinAlert, TwinHistoryPoint } from "../../types/learning";

const STATE_COLORS: Record<string, string> = {
  idle: "bg-slate-100 text-slate-600",
  running: "bg-green-100 text-green-700",
  alarm: "bg-red-100 text-red-700",
  maintenance: "bg-amber-100 text-amber-700",
};

function Gauge({ label, value, max, unit, warning }: {
  label: string; value: number; max: number; unit: string; warning?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const color = warning ? "#ef4444" : pct > 80 ? "#f59e0b" : "#10b981";
  return (
    <div className="p-3 bg-slate-50 rounded-lg text-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="relative w-16 h-16 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-800">
            {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          </span>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-1">{unit}</div>
    </div>
  );
}

function AlertRow({ alert }: { alert: TwinAlert }) {
  const sevColors = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`p-2.5 rounded-lg border text-sm ${sevColors[alert.severity]}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{alert.severity}</span>
        <span className="text-xs opacity-70">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="text-xs mt-0.5">{alert.message}</div>
      <div className="text-xs opacity-70 mt-0.5">
        {alert.parameter}: {alert.value} (threshold: {alert.threshold})
      </div>
    </div>
  );
}

function HistoryChart({ points }: { points: TwinHistoryPoint[] }) {
  if (points.length < 2) return null;
  const w = 400, h = 100, pad = 20;
  const maxRPM = Math.max(...points.map((p) => p.spindle_rpm), 1);
  const maxLoad = Math.max(...points.map((p) => p.spindle_load_pct), 1);

  const rpmLine = points.map((p, i) =>
    `${pad + (i / (points.length - 1)) * (w - 2 * pad)},${h - pad - ((p.spindle_rpm / maxRPM) * (h - 2 * pad))}`
  ).join(" ");

  const loadLine = points.map((p, i) =>
    `${pad + (i / (points.length - 1)) * (w - 2 * pad)},${h - pad - ((p.spindle_load_pct / maxLoad) * (h - 2 * pad))}`
  ).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <polyline points={rpmLine} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <polyline points={loadLine} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <text x={w - pad} y={12} textAnchor="end" className="text-[8px] fill-blue-500">RPM</text>
      <text x={w - pad} y={22} textAnchor="end" className="text-[8px] fill-amber-500">Load%</text>
    </svg>
  );
}

export default function DigitalTwin() {
  const twin = useDigitalTwin();
  const { execute: twinExecute } = twin;
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStatus = useCallback(() => {
    twinExecute({ action: "status" });
  }, [twinExecute]);

  const fetchHistory = useCallback(() => {
    twinExecute({ action: "history" });
  }, [twinExecute]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const status: TwinStatus | undefined = twin.data?.status;
  const history: TwinHistoryPoint[] = twin.data?.history ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digital Twin</h1>
          <p className="text-slate-500 text-sm mt-1">
            Live machine monitoring and simulation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchStatus}
            disabled={twin.loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
              hover:bg-blue-700 disabled:opacity-50"
          >
            {twin.loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {status && (
        <>
          {/* Machine header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800 text-lg">
                  {status.machine_name}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  ID: {status.machine_id}
                  {status.program_name && <> &middot; Program: {status.program_name}</>}
                  &middot; Uptime: {status.uptime_hours.toFixed(1)}h
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${STATE_COLORS[status.state] ?? ""}`}>
                {status.state}
              </span>
            </div>
          </div>

          {/* Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Gauge label="Spindle" value={status.spindle_rpm} max={24000} unit="RPM" />
            <Gauge label="Feed Rate" value={status.feed_rate} max={15000} unit="mm/min" />
            <Gauge label="X Position" value={Math.abs(status.position.x)} max={1000} unit="mm" />
            <Gauge label="Y Position" value={Math.abs(status.position.y)} max={500} unit="mm" />
            <Gauge label="Z Position" value={Math.abs(status.position.z)} max={500} unit="mm" />
          </div>

          {/* Position display */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Current Position</h3>
            <div className="grid grid-cols-3 gap-4 font-mono text-sm">
              <div>
                <span className="text-slate-400">X:</span>{" "}
                <span className="text-slate-800 font-bold">{status.position.x.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-400">Y:</span>{" "}
                <span className="text-slate-800 font-bold">{status.position.y.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-400">Z:</span>{" "}
                <span className="text-slate-800 font-bold">{status.position.z.toFixed(3)}</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Tool: T{status.tool_number}
            </div>
          </div>

          {/* Alerts */}
          {status.alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Alerts ({status.alerts.length})
              </h3>
              <div className="space-y-2">
                {status.alerts.map((a: TwinAlert) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* History section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700">History</h3>
          <button
            onClick={fetchHistory}
            disabled={twin.loading}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Load History
          </button>
        </div>
        {history.length > 0 ? (
          <HistoryChart points={history} />
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            Click &quot;Load History&quot; to view spindle RPM and load trends
          </div>
        )}
      </div>

      {twin.error && (
        <div className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg">
          {twin.error}
        </div>
      )}
    </div>
  );
}
