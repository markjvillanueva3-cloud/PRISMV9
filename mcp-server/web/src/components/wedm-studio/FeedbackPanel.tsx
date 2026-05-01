/**
 * FeedbackPanel.tsx — MS-P1-LEARN-LOOP U-P1-LL-05
 *
 * Learning loop panel for the Wire EDM Studio:
 * - Submit job outcome feedback
 * - View/approve/reject pending tip candidates
 * - Display learning statistics
 * - Trigger neural fusion updates
 */

import { useState, useEffect, useCallback } from "react";
import {
  learningApi,
  type FeedbackSubmission,
  type GeneratedTip,
  type CombinedLearningStats,
} from "../../api/wedmCoordination";

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackPanelProps {
  defaultJobId?: string;
  defaultMaterial?: string;
  defaultThickness?: number;
}

// ============================================================================
// STYLES
// ============================================================================

const STAT_COLORS = {
  success: "text-emerald-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
  muted: "text-slate-400",
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ label, value, color = "info" }: { label: string; value: string | number; color?: keyof typeof STAT_COLORS }) {
  return (
    <div className="bg-slate-800/60 rounded px-3 py-2 flex flex-col">
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-mono ${STAT_COLORS[color]}`}>{value}</span>
    </div>
  );
}

function PendingTipCard({
  tip,
  onApprove,
  onReject,
  loading,
}: {
  tip: GeneratedTip;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-slate-200">{tip.text}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {tip.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs text-cyan-400 font-mono">{Math.round(tip.confidence * 100)}%</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={loading}
          className="flex-1 px-2 py-1 text-xs bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-400 rounded transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className="flex-1 px-2 py-1 text-xs bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 text-red-400 rounded transition-colors disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FeedbackPanel({ defaultJobId, defaultMaterial, defaultThickness }: FeedbackPanelProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "review" | "stats">("stats");
  const [stats, setStats] = useState<CombinedLearningStats | null>(null);
  const [pendingTips, setPendingTips] = useState<GeneratedTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Feedback form state
  const [form, setForm] = useState<Partial<FeedbackSubmission>>({
    job_id: defaultJobId ?? "",
    dispatcher: "edm",
    action: "wire_settings",
    success: true,
    material: defaultMaterial ?? "",
    thickness_mm: defaultThickness,
    predicted: {},
    actual: {},
    corrections: [],
    operator_notes: "",
    confidence: 0.9,
  });

  // Load stats and pending tips
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tipsRes] = await Promise.all([
        learningApi.getLearningStats(),
        learningApi.getPendingTips(20),
      ]);
      if (statsRes.ok) setStats(statsRes.data);
      if (tipsRes.ok) setPendingTips(tipsRes.data);
    } catch {
      setError("Failed to load learning data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Submit feedback
  const handleSubmit = async () => {
    if (!form.job_id || !form.action) {
      setError("Job ID and action are required");
      return;
    }
    setLoading(true);
    setError(null);
    setSubmitSuccess(null);
    try {
      const result = await learningApi.submitFeedback(form as FeedbackSubmission);
      if (result.ok) {
        setSubmitSuccess(`Feedback submitted: ${result.data.feedback_id}`);
        setForm((f) => ({ ...f, job_id: "", operator_notes: "" }));
        loadData();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  // Approve tip
  const handleApprove = async (tipId: string) => {
    setLoading(true);
    try {
      const result = await learningApi.approveTip(tipId);
      if (result.ok) {
        setPendingTips((tips) => tips.filter((t) => t.id !== tipId));
        loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Reject tip
  const handleReject = async (tipId: string) => {
    setLoading(true);
    try {
      const result = await learningApi.rejectTip(tipId);
      if (result.ok) {
        setPendingTips((tips) => tips.filter((t) => t.id !== tipId));
        loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Process tip candidates
  const handleProcessTips = async () => {
    setLoading(true);
    try {
      await learningApi.processTips(50, 0.85);
      loadData();
    } finally {
      setLoading(false);
    }
  };

  // Update fusion weights
  const handleUpdateFusion = async () => {
    setLoading(true);
    try {
      await learningApi.updateFusion();
      loadData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-slate-700/50 pb-2">
        {(["stats", "review", "submit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-xs rounded-t transition-colors ${
              activeTab === tab
                ? "bg-slate-700/50 text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Success Display */}
      {submitSuccess && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-2 rounded">
          {submitSuccess}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-3">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide">Feedback Ingestion</h4>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Total Feedback" value={stats.ingestion.totalFeedback} />
            <StatCard label="Success Rate" value={`${stats.ingestion.totalFeedback > 0 ? Math.round((stats.ingestion.successfulJobs / stats.ingestion.totalFeedback) * 100) : 0}%`} color="success" />
            <StatCard label="Corrections" value={stats.ingestion.correctionsReceived} color="warning" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Avg Pred Error" value={`${stats.ingestion.avgPredictionError.toFixed(1)}%`} color="warning" />
            <StatCard label="Ground Truth" value={stats.ingestion.groundTruthPoints} />
            <StatCard label="Tip Candidates" value={stats.ingestion.pendingTipCandidates} />
          </div>

          <h4 className="text-xs text-slate-500 uppercase tracking-wide pt-2">Tribal Learning</h4>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Tips Generated" value={stats.learning.tipsGenerated} />
            <StatCard label="Auto-Approved" value={stats.learning.autoApproved} color="success" />
            <StatCard label="Pending Review" value={stats.learning.pendingReviewCount} color="warning" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Manual Approved" value={stats.learning.manuallyApproved} color="success" />
            <StatCard label="Rejected" value={stats.learning.rejected} color="muted" />
            <StatCard label="Corpus Size" value={stats.learning.learnedCorpusSize} color="info" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleProcessTips}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-xs bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/30 text-cyan-400 rounded transition-colors disabled:opacity-50"
            >
              Process Tip Candidates
            </button>
            <button
              onClick={handleUpdateFusion}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-xs bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-400 rounded transition-colors disabled:opacity-50"
            >
              Update Fusion Weights
            </button>
          </div>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-slate-500 uppercase tracking-wide">Pending Tips ({pendingTips.length})</h4>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
            >
              Refresh
            </button>
          </div>
          {pendingTips.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No tips pending review</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {pendingTips.map((tip) => (
                <PendingTipCard
                  key={tip.id}
                  tip={tip}
                  onApprove={() => handleApprove(tip.id)}
                  onReject={() => handleReject(tip.id)}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Tab */}
      {activeTab === "submit" && (
        <div className="space-y-3">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide">Submit Job Feedback</h4>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Job ID</label>
              <input
                type="text"
                value={form.job_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                placeholder="JOB-001"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Action</label>
              <select
                value={form.action ?? "wire_settings"}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="wire_settings">wire_settings</option>
                <option value="cutting_params">cutting_params</option>
                <option value="toolpath_optimize">toolpath_optimize</option>
                <option value="multipass">multipass</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Material</label>
              <input
                type="text"
                value={form.material ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                placeholder="D2"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Thickness (mm)</label>
              <input
                type="number"
                value={form.thickness_mm ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, thickness_mm: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                placeholder="25"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.success ?? true}
                onChange={(e) => setForm((f) => ({ ...f, success: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              Job Successful
            </label>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Operator Notes</label>
            <textarea
              value={form.operator_notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, operator_notes: e.target.value }))}
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Any observations, corrections, or tips from this job..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.job_id}
            className="w-full px-3 py-2 text-xs bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/40 text-emerald-400 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
