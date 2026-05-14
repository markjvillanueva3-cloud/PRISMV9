/**
 * AIReasoningTab — Combined AI reasoning display for WEDM Studio
 * MS-P1-FRONT-WIRE U-P1-FW-06
 *
 * Combines ReasoningTraceDashboard and BlackboardPanel into a single
 * tabbed interface that can be shown alongside the wizard steps.
 * PRISM dark theme with collapsible sections.
 */

import { useState } from "react";
import ReasoningTraceDashboard from "./ReasoningTraceDashboard";
import BlackboardPanel from "./BlackboardPanel";
import { useCoordination } from "../../hooks/useCoordination";

type TabId = "traces" | "blackboard" | "overview";

export default function AIReasoningTab() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [expanded, setExpanded] = useState(true);
  const { snapshot, loading, error, refresh, lastRefreshAt } = useCoordination({
    autoRefresh: true,
    refreshIntervalMs: 10000,
  });

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "traces", label: "Traces" },
    { id: "blackboard", label: "Blackboard" },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-700 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-sm font-medium">AI Reasoning</span>
          {snapshot && (
            <span className="text-slate-500 text-xs">
              {snapshot.ledger.totalTraces} traces | {snapshot.blackboard.activeEntries} entries
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshAt && (
            <span className="text-slate-500 text-[10px]">
              {lastRefreshAt.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              refresh();
            }}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <span className="text-slate-400">{expanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3">
            {loading && !snapshot && (
              <div className="text-slate-400 text-sm animate-pulse">Loading...</div>
            )}
            {error && (
              <div className="text-red-400 text-sm" role="alert">
                Error: {error}
              </div>
            )}

            {activeTab === "overview" && snapshot && <OverviewPanel snapshot={snapshot} />}
            {activeTab === "traces" && <ReasoningTraceDashboard autoRefresh={false} maxEntries={50} />}
            {activeTab === "blackboard" && <BlackboardPanel autoRefresh={false} />}
          </div>
        </>
      )}
    </div>
  );
}

function OverviewPanel({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useCoordination>["snapshot"]> }) {
  const { ledger, blackboard, bridge, dispatch } = snapshot;

  return (
    <div className="space-y-4">
      {/* Key metrics grid */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <MetricCard
          label="Coordinations"
          value={dispatch.totalCoordinations.toString()}
          subtext={`${dispatch.avgCoordLatencyMs}ms avg`}
          color="cyan"
        />
        <MetricCard
          label="Awareness"
          value={`${ledger.awarenessAdoption}%`}
          subtext={`${ledger.totalTraces} traces`}
          color="violet"
        />
        <MetricCard
          label="Error Rate"
          value={`${ledger.errorRate}%`}
          subtext={dispatch.coordinationFailures > 0 ? `${dispatch.coordinationFailures} failures` : "No failures"}
          color={ledger.errorRate > 5 ? "red" : "emerald"}
        />
        <MetricCard
          label="Blackboard"
          value={blackboard.activeEntries.toString()}
          subtext={`${blackboard.namespaceCount} namespaces`}
          color="amber"
        />
      </div>

      {/* Top actions */}
      {ledger.topActions.length > 0 && (
        <div>
          <div className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Top Actions</div>
          <div className="flex flex-wrap gap-1.5">
            {ledger.topActions.map((a) => (
              <span
                key={a.action}
                className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] rounded border border-slate-700"
              >
                {a.action} <span className="text-slate-500">×{a.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Health indicators */}
      <div className="flex gap-4 text-xs">
        <HealthIndicator
          label="Silent"
          value={ledger.silentMinutes}
          unit="min"
          status={ledger.silentMinutes > 5 ? "warning" : "ok"}
        />
        <HealthIndicator
          label="Bridge Latency"
          value={bridge.avgLatencyMs}
          unit="ms"
          status={bridge.avgLatencyMs > 50 ? "warning" : "ok"}
        />
        <HealthIndicator
          label="Tips/Call"
          value={bridge.avgTipsIngested}
          unit=""
          status="info"
        />
        <HealthIndicator
          label="Decisions"
          value={dispatch.decisionsPosted}
          unit=""
          status="info"
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
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
      <div className="font-mono font-medium text-lg">{value}</div>
      <div className="text-slate-500 text-[10px]">{subtext}</div>
    </div>
  );
}

function HealthIndicator({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  status: "ok" | "warning" | "info";
}) {
  const statusColors = {
    ok: "text-emerald-400",
    warning: "text-amber-400",
    info: "text-slate-400",
  };
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-mono ${statusColors[status]}`}>
        {typeof value === "number" ? Math.round(value * 100) / 100 : value}
        {unit}
      </span>
    </div>
  );
}
