/**
 * AutonomyPanel.tsx — MS-P1-AUTONOMY U-P1-AUT-03
 *
 * Displays autonomy level status and controls:
 * - Current level with visual indicator (L0-L5)
 * - Health metrics affecting level gating
 * - Promotion eligibility with requirements
 * - Promote/demote controls
 * - Degrade warnings
 */

import { useState, useEffect, useCallback } from "react";
import {
  autonomyApi,
  type AutonomyStatusSnapshot,
  type AutonomyLevel,
} from "../../api/wedmCoordination";

// ============================================================================
// LEVEL METADATA
// ============================================================================

const LEVEL_COLORS: Record<AutonomyLevel, string> = {
  0: "text-slate-400 border-slate-500/30 bg-slate-800/50",
  1: "text-cyan-400 border-cyan-500/30 bg-cyan-900/20",
  2: "text-emerald-400 border-emerald-500/30 bg-emerald-900/20",
  3: "text-amber-400 border-amber-500/30 bg-amber-900/20",
  4: "text-violet-400 border-violet-500/30 bg-violet-900/20",
  5: "text-rose-400 border-rose-500/30 bg-rose-900/20",
};

const LEVEL_ICONS: Record<AutonomyLevel, string> = {
  0: "🔧", // Manual
  1: "💡", // Assisted
  2: "⚙️", // Semi-auto
  3: "👁️", // Supervised
  4: "🤖", // Full auto
  5: "🧠", // Self-improving
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LevelIndicator({ level, name }: { level: AutonomyLevel; name: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${LEVEL_COLORS[level]}`}>
      <span className="text-2xl">{LEVEL_ICONS[level]}</span>
      <div>
        <div className="text-sm font-medium">Level {level}</div>
        <div className="text-lg font-bold">{name}</div>
      </div>
    </div>
  );
}

function HealthMetric({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  status: "good" | "warning" | "bad" | "neutral";
}) {
  const statusColors = {
    good: "text-emerald-400",
    warning: "text-amber-400",
    bad: "text-red-400",
    neutral: "text-slate-400",
  };
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono ${statusColors[status]}`}>
        {typeof value === "number" ? value.toFixed(1) : value}
        {unit}
      </span>
    </div>
  );
}

function CapabilityBadge({ name, enabled }: { name: string; enabled: boolean }) {
  const displayName = name.replace(/_/g, " ");
  return (
    <span
      className={`px-2 py-0.5 text-[10px] rounded ${
        enabled
          ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30"
          : "bg-slate-800/50 text-slate-500 border border-slate-700/30"
      }`}
    >
      {enabled ? "✓" : "✗"} {displayName}
    </span>
  );
}

function RequirementItem({ text, passed }: { text: string; passed: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${passed ? "text-emerald-400" : "text-slate-400"}`}>
      <span>{passed ? "✓" : "○"}</span>
      <span>{text}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AutonomyPanel() {
  const [status, setStatus] = useState<AutonomyStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await autonomyApi.getStatus();
      if (result.ok) {
        setStatus(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load autonomy status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handlePromote = async () => {
    setLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const result = await autonomyApi.promote("operator", "UI promotion request");
      if (result.ok && result.data.success) {
        setActionMessage(`Promoted to L${result.data.newLevel}`);
        loadStatus();
      } else {
        setError(result.ok ? result.data.error : result.error);
      }
    } catch {
      setError("Failed to promote");
    } finally {
      setLoading(false);
    }
  };

  const handleDemote = async () => {
    setLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const result = await autonomyApi.demote("operator", "UI demotion request");
      if (result.ok) {
        setActionMessage(`Demoted to L${result.data.to}`);
        loadStatus();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to demote");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDegrade = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const result = await autonomyApi.autoDegrade();
      if (result.ok) {
        if (result.data.degraded) {
          setActionMessage(`Auto-degraded from L${result.data.from} to L${result.data.to}`);
        } else {
          setActionMessage("No degrade needed");
        }
        loadStatus();
      }
    } catch {
      setError("Failed to check degrade");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="text-slate-400 text-sm p-4">
        {loading ? "Loading autonomy status..." : error || "No status available"}
      </div>
    );
  }

  const metrics = status.metrics;

  return (
    <div className="space-y-4">
      {/* Level Indicator */}
      <LevelIndicator level={status.currentLevel} name={status.levelName} />

      {/* Human Role */}
      <div className="text-xs text-slate-400 italic">{status.humanRole}</div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-2 rounded">
          {actionMessage}
        </div>
      )}

      {/* Degrade Warnings */}
      {status.degradeWarnings.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-500/30 rounded p-2">
          <div className="text-[10px] text-amber-400 uppercase tracking-wide mb-1">Degrade Warnings</div>
          {status.degradeWarnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-300">{w}</div>
          ))}
        </div>
      )}

      {/* Health Metrics */}
      <div className="bg-slate-800/40 rounded p-3 space-y-1.5">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Substrate Health</div>
        <HealthMetric
          label="Error Rate"
          value={metrics.errorRate}
          unit="%"
          status={metrics.errorRate < 5 ? "good" : metrics.errorRate < 10 ? "warning" : "bad"}
        />
        <HealthMetric
          label="Awareness Adoption"
          value={metrics.awarenessAdoption}
          unit="%"
          status={metrics.awarenessAdoption > 70 ? "good" : metrics.awarenessAdoption > 50 ? "warning" : "bad"}
        />
        <HealthMetric
          label="Silent Minutes"
          value={metrics.silentMinutes}
          unit="min"
          status={metrics.silentMinutes < 5 ? "good" : metrics.silentMinutes < 10 ? "warning" : "bad"}
        />
        <HealthMetric
          label="Coordinations"
          value={metrics.coordinations}
          unit=""
          status="neutral"
        />
        <HealthMetric
          label="Bridge Latency"
          value={metrics.bridgeLatencyMs}
          unit="ms"
          status={metrics.bridgeLatencyMs < 50 ? "good" : "warning"}
        />
        <HealthMetric
          label="Feedback Count"
          value={metrics.feedbackTotal}
          unit=""
          status="neutral"
        />
      </div>

      {/* Capabilities */}
      <div className="bg-slate-800/40 rounded p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Current Capabilities</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(status.capabilities).map(([cap, enabled]) => (
            <CapabilityBadge key={cap} name={cap} enabled={enabled} />
          ))}
        </div>
      </div>

      {/* Promotion Requirements */}
      {status.nextLevelRequirements && (
        <div className="bg-slate-800/40 rounded p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">
            Next Level Requirements (L{status.currentLevel + 1})
          </div>
          <div className="space-y-1">
            <RequirementItem
              text={`Error rate ≤ ${status.nextLevelRequirements.maxErrorRate}%`}
              passed={metrics.errorRate <= status.nextLevelRequirements.maxErrorRate}
            />
            <RequirementItem
              text={`Awareness ≥ ${status.nextLevelRequirements.minAwarenessAdoption}%`}
              passed={metrics.awarenessAdoption >= status.nextLevelRequirements.minAwarenessAdoption}
            />
            <RequirementItem
              text={`Silent ≤ ${status.nextLevelRequirements.maxSilentMinutes}min`}
              passed={metrics.silentMinutes <= status.nextLevelRequirements.maxSilentMinutes}
            />
            {status.nextLevelRequirements.minCoordinations !== undefined && (
              <RequirementItem
                text={`Coordinations ≥ ${status.nextLevelRequirements.minCoordinations}`}
                passed={metrics.coordinations >= status.nextLevelRequirements.minCoordinations}
              />
            )}
            {status.nextLevelRequirements.minFeedbackCount !== undefined && (
              <RequirementItem
                text={`Feedback ≥ ${status.nextLevelRequirements.minFeedbackCount}`}
                passed={metrics.feedbackTotal >= status.nextLevelRequirements.minFeedbackCount}
              />
            )}
            {status.nextLevelRequirements.requiresCounterSign && (
              <RequirementItem text="Counter-sign required" passed={false} />
            )}
          </div>
        </div>
      )}

      {/* Promotion Blockers */}
      {!status.eligibleForPromotion && status.promotionBlockers.length > 0 && (
        <div className="text-xs text-slate-400">
          <span className="text-slate-500">Blocked: </span>
          {status.promotionBlockers.slice(0, 2).join("; ")}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handlePromote}
          disabled={loading || !status.eligibleForPromotion || status.currentLevel >= 5}
          className="flex-1 px-3 py-2 text-xs bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ▲ Promote
        </button>
        <button
          onClick={handleDemote}
          disabled={loading || status.currentLevel <= 0}
          className="flex-1 px-3 py-2 text-xs bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 text-amber-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ▼ Demote
        </button>
        <button
          onClick={handleAutoDegrade}
          disabled={loading}
          className="px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-700/80 border border-slate-600/30 text-slate-300 rounded transition-colors disabled:opacity-50"
          title="Check and apply automatic degrade if needed"
        >
          Check
        </button>
      </div>
    </div>
  );
}
