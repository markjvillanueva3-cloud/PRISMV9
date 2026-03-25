import { useEffect } from "react";
import { useLearningProgress } from "../../hooks/useLearning";
import type { LearningDomain, ModuleProgress, Achievement } from "../../types/learning";
import { Trophy, Flame, Clock, Target } from "lucide-react";

const DOMAIN_LABELS: Record<LearningDomain, string> = {
  cad: "CAD", cam: "CAM",
  shop_practice: "Shop Practice", machine_operation: "Machine Operation",
};

const DOMAIN_COLORS: Record<LearningDomain, string> = {
  cad: "#3b82f6", cam: "#10b981",
  shop_practice: "#f59e0b", machine_operation: "#8b5cf6",
};

function ProgressRing({ value, size = 64, stroke = 6, color = "#3b82f6" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(71,85,105,0.5)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

function Sparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120, h = 32;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - (v / max) * h}`
  ).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function ProgressTracker() {
  const progress = useLearningProgress();

  useEffect(() => {
    progress.execute({ action: "get" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — one-time fetch on mount

  const data = progress.data;

  if (progress.loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-slate-500">Loading progress...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1 flex items-center gap-2">
        <Target size={24} className="text-blue-400" />
        Progress Tracker
      </h1>
      <p className="text-slate-400 text-sm mb-6">Your learning journey at a glance</p>

      {data && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-4 text-center">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing value={data.overall_completion_pct} size={72} />
                <span className="absolute text-lg font-bold text-slate-100">
                  {Math.round(data.overall_completion_pct)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2">Overall</div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
              <Flame size={20} className="text-orange-400 mb-1" />
              <div className="text-3xl font-bold text-amber-400">{data.streak_days}</div>
              <div className="text-xs text-slate-500">Day Streak</div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
              <Clock size={20} className="text-blue-400 mb-1" />
              <div className="text-3xl font-bold text-blue-400">{data.total_time_hours.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Hours Learned</div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
              <Trophy size={20} className="text-green-400 mb-1" />
              <div className="text-3xl font-bold text-green-400">{data.achievements.length}</div>
              <div className="text-xs text-slate-500">Achievements</div>
            </div>
          </div>

          {/* Domain completion bars */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 mb-6">
            <h2 className="font-semibold text-slate-200 mb-4">Domain Completion</h2>
            {(Object.entries(DOMAIN_LABELS) as [LearningDomain, string][]).map(([dom, label]) => {
              const pct = data.domain_progress[dom] ?? 0;
              return (
                <div key={dom} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-200">{label}</span>
                    <span className="text-slate-400">{Math.round(pct)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: DOMAIN_COLORS[dom] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time chart placeholder */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 mb-6">
            <h2 className="font-semibold text-slate-200 mb-3">Activity</h2>
            <Sparkline
              data={data.modules.map((m: ModuleProgress) => m.time_spent_minutes)}
              color="#3b82f6"
            />
            <div className="text-xs text-slate-500 mt-1">
              Minutes per module (recent activity)
            </div>
          </div>

          {/* Module list */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 mb-6">
            <h2 className="font-semibold text-slate-200 mb-3">Modules</h2>
            <div className="space-y-2">
              {data.modules.map((m: ModuleProgress) => {
                const statusColors = {
                  not_started: "bg-slate-700 text-slate-400",
                  in_progress: "bg-blue-500/20 text-blue-400",
                  completed: "bg-green-500/20 text-green-400",
                };
                return (
                  <div key={m.module_id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/40 bg-slate-900/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{m.title}</div>
                      <div className="text-xs text-slate-500">
                        {DOMAIN_LABELS[m.domain]} &middot; {m.time_spent_minutes}min
                        {m.score != null && <> &middot; Score: {m.score}%</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${m.completion_pct}%` }}
                        />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[m.status]}`}>
                        {m.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements gallery */}
          {data.achievements.length > 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5">
              <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" />
                Achievements
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.achievements.map((a: Achievement) => (
                  <div key={a.id}
                    className="p-3 rounded-lg bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/20 text-center"
                  >
                    <Trophy size={20} className="text-amber-400 mx-auto mb-1" />
                    <div className="text-sm font-medium text-slate-200">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(a.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {progress.error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{progress.error}</div>
      )}
    </div>
  );
}
