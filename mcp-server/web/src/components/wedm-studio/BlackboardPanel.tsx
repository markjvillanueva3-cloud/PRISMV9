/**
 * BlackboardPanel — Blackboard state viewer for WEDM coordination
 * MS-P1-FRONT-WIRE U-P1-FW-04
 *
 * Displays observations, hypotheses, and decisions from the shared blackboard.
 * Supports namespace filtering. PRISM dark theme with tag color coding.
 */

import { useState, useEffect, useCallback } from "react";
import {
  coordinationApi,
  type BlackboardEntry,
  type BlackboardStats,
  type BlackboardTag,
} from "../../api/wedmCoordination";

interface BlackboardPanelProps {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  defaultPrefix?: string;
}

const TAG_COLORS: Record<BlackboardTag, string> = {
  observation: "bg-cyan-800/50 text-cyan-300 border-cyan-600/30",
  hypothesis: "bg-violet-800/50 text-violet-300 border-violet-600/30",
  constraint: "bg-amber-800/50 text-amber-300 border-amber-600/30",
  decision: "bg-emerald-800/50 text-emerald-300 border-emerald-600/30",
  warning: "bg-red-800/50 text-red-300 border-red-600/30",
  recommendation: "bg-blue-800/50 text-blue-300 border-blue-600/30",
  intermediate: "bg-slate-700/50 text-slate-300 border-slate-600/30",
};

export default function BlackboardPanel({
  autoRefresh = true,
  refreshIntervalMs = 5000,
  defaultPrefix = "wedm",
}: BlackboardPanelProps) {
  const [entries, setEntries] = useState<BlackboardEntry[]>([]);
  const [stats, setStats] = useState<BlackboardStats | null>(null);
  const [prefix, setPrefix] = useState(defaultPrefix);
  const [tagFilter, setTagFilter] = useState<BlackboardTag | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [entriesRes, statsRes] = await Promise.all([
        coordinationApi.queryBlackboard(prefix, tagFilter || undefined),
        coordinationApi.getBlackboardStats(),
      ]);
      if (entriesRes.ok) setEntries(entriesRes.data);
      if (statsRes.ok) setStats(statsRes.data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [prefix, tagFilter]);

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

  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value ? "true" : "false";
    return JSON.stringify(value);
  };

  if (loading) {
    return (
      <div className="p-4 text-slate-400 text-sm animate-pulse">
        Loading blackboard...
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
          <StatCard label="Active" value={stats.activeEntries.toString()} color="emerald" />
          <StatCard label="Namespaces" value={stats.namespaceCount.toString()} color="cyan" />
          <StatCard label="Subscribers" value={stats.subscribers.toString()} color="violet" />
          <StatCard
            label="Post Rate"
            value={`${stats.recentPostRate_per_min}/min`}
            color="amber"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Namespace prefix..."
          className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value as BlackboardTag | "")}
          className="px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All tags</option>
          <option value="observation">observation</option>
          <option value="hypothesis">hypothesis</option>
          <option value="decision">decision</option>
          <option value="warning">warning</option>
          <option value="constraint">constraint</option>
          <option value="recommendation">recommendation</option>
        </select>
        <button
          onClick={refresh}
          className="px-2 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-slate-500 text-sm p-2">No entries match "{prefix}".</div>
        ) : (
          entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} formatTime={formatTime} formatValue={formatValue} />
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
  color: "cyan" | "emerald" | "violet" | "amber";
}) {
  const colorMap = {
    cyan: "border-cyan-500/30 text-cyan-400",
    emerald: "border-emerald-500/30 text-emerald-400",
    violet: "border-violet-500/30 text-violet-400",
    amber: "border-amber-500/30 text-amber-400",
  };
  return (
    <div className={`p-2 rounded bg-slate-800/60 border ${colorMap[color]}`}>
      <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}

function EntryRow({
  entry,
  formatTime,
  formatValue,
}: {
  entry: BlackboardEntry;
  formatTime: (iso: string) => string;
  formatValue: (v: unknown) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const tagClass = TAG_COLORS[entry.tag];

  return (
    <div
      className="bg-slate-800/40 rounded border border-slate-700/50 text-xs cursor-pointer hover:bg-slate-800/60 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="text-slate-500 font-mono w-16">{formatTime(entry.at)}</span>
        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${tagClass}`}>
          {entry.tag}
        </span>
        <span className="text-slate-400 truncate">{entry.namespace}</span>
        <span className="text-slate-300 font-medium truncate">{entry.key}</span>
        {entry.confidence !== undefined && (
          <span className="text-violet-400 font-mono ml-auto">{Math.round(entry.confidence * 100)}%</span>
        )}
      </div>
      {expanded && (
        <div className="px-2 pb-2 pt-1 border-t border-slate-700/50">
          <div className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap break-all">
            {formatValue(entry.value)}
          </div>
          <div className="text-slate-500 text-[10px] mt-1">
            Source: {entry.source} | Version: {entry.version} | Expires: {formatTime(entry.expiresAt)}
          </div>
        </div>
      )}
    </div>
  );
}
