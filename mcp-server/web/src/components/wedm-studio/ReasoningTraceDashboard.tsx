/**
 * ReasoningTraceDashboard — Live reasoning trace display for WEDM coordination
 * MS-P1-FRONT-WIRE U-P1-FW-03
 *
 * Shows recent ledger entries with stats (topActions, errorRate, awarenessAdoption).
 * Auto-refreshes via polling. PRISM dark theme with glow accents.
 */

import { useState, useEffect, useCallback } from "react";
import {
  coordinationApi,
  type ReasoningTraceEntry,
  type LedgerStats,
} from "../../api/wedmCoordination";

interface ReasoningTraceDashboardProps {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  maxEntries?: number;
}

export default function ReasoningTraceDashboard({
  autoRefresh = true,
  refreshIntervalMs = 5000,
  maxEntries = 25,
}: ReasoningTraceDashboardProps) {
  const [entries, setEntries] = useState<ReasoningTraceEntry[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [recentRes, statsRes] = await Promise.all([
        coordinationApi.getLedgerRecent(maxEntries),
        coordinationApi.getLedgerStats(),
      ]);
      if (recentRes.ok) setEntries(recentRes.data);
      if (statsRes.ok) setStats(statsRes.data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [maxEntries]);

  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, refresh]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (loading) {
    return (
      <div className="p-4 text-slate-400 text-sm animate-pulse">
        Loading reasoning traces...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 text-xs">
          <StatCard
            label="Total Traces"
            value={stats.totalTraces.toLocaleString()}
            color="cyan"
          />
          <StatCard
            label="Error Rate"
            value={`${stats.errorRate}%`}
            color={stats.errorRate > 5 ? "red" : "emerald"}
          />
          <StatCard
            label="Awareness Adoption"
            value={`${stats.awarenessAdoption}%`}
            color="violet"
          />
          <StatCard
            label="Silent Minutes"
            value={stats.silentMinutes.toString()}
            color={stats.silentMinutes > 5 ? "amber" : "cyan"}
          />
        </div>
      )}

      {/* Top actions */}
      {stats && stats.topActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.topActions.slice(0, 5).map((a) => (
            <span
              key={a.action}
              className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded-full border border-slate-600"
            >
              {a.action} <span className="text-slate-500">×{a.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Trace entries */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-slate-500 text-sm p-2">No traces recorded yet.</div>
        ) : (
          entries.map((entry) => (
            <TraceRow key={entry.id} entry={entry} formatTime={formatTime} />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "emerald" | "violet" | "amber" | "red";
}) {
  const colorMap = {
    cyan: "border-cyan-500/30 text-cyan-400",
    emerald: "border-emerald-500/30 text-emerald-400",
    violet: "border-violet-500/30 text-violet-400",
    amber: "border-amber-500/30 text-amber-400",
    red: "border-red-500/30 text-red-400",
  };
  return (
    <div className={`p-2 rounded bg-slate-800/60 border ${colorMap[color]}`}>
      <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}

function TraceRow({
  entry,
  formatTime,
}: {
  entry: ReasoningTraceEntry;
  formatTime: (iso: string) => string;
}) {
  const hasError = !!entry.error;
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
        hasError ? "bg-red-900/20 text-red-300" : "bg-slate-800/40 text-slate-300"
      }`}
    >
      <span className="text-slate-500 font-mono w-16">{formatTime(entry.at)}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          entry.awareness_used ? "bg-cyan-800/50 text-cyan-300" : "bg-slate-700 text-slate-400"
        }`}
      >
        {entry.dispatcher}
      </span>
      <span className="truncate flex-1">{entry.action}</span>
      {entry.duration_ms !== undefined && (
        <span className="text-slate-500 font-mono">{entry.duration_ms}ms</span>
      )}
      {entry.confidence !== undefined && (
        <span className="text-violet-400 font-mono">{Math.round(entry.confidence * 100)}%</span>
      )}
    </div>
  );
}
