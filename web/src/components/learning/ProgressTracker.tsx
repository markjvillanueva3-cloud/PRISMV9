import { useEffect } from "react";
import { useLearningProgress } from "../../hooks/useLearning";
import type { LearningDomain, ModuleProgress, Achievement } from "../../types/learning";

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
        fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
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
        <div className="text-center py-12 text-slate-400">Loading progress...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Progress Tracker</h1>
      <p className="text-slate-500 text-sm mb-6">Your learning journey at a glance</p>

      {data && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing value={data.overall_completion_pct} size={72} />
                <span className="absolute text-lg font-bold text-slate-800">
                  {Math.round(data.overall_completion_pct)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2">Overall</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-amber-500">{data.streak_days}</div>
              <div className="text-xs text-slate-500">Day Streak</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-blue-600">{data.total_time_hours.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Hours Learned</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-green-600">{data.achievements.length}</div>
              <div className="text-xs text-slate-500">Achievements</div>
            </div>
          </div>

          {/* Domain completion bars */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="font-semibold text-slate-800 mb-4">Domain Completion</h2>
            {(Object.entries(DOMAIN_LABELS) as [LearningDomain, string][]).map(([dom, label]) => {
              const pct = data.domain_progress[dom] ?? 0;
              return (
                <div key={dom} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="text-slate-500">{Math.round(pct)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="font-semibold text-slate-800 mb-3">Activity</h2>
            <Sparkline
              data={data.modules.map((m: ModuleProgress) => m.time_spent_minutes)}
              color="#3b82f6"
            />
            <div className="text-xs text-slate-400 mt-1">
              Minutes per module (recent activity)
            </div>
          </div>

          {/* Module list */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="font-semibold text-slate-800 mb-3">Modules</h2>
            <div className="space-y-2">
              {data.modules.map((m: ModuleProgress) => {
                const statusColors = {
                  not_started: "bg-slate-100 text-slate-500",
                  in_progress: "bg-blue-100 text-blue-700",
                  completed: "bg-green-100 text-green-700",
                };
                return (
                  <div key={m.module_id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.title}</div>
                      <div className="text-xs text-slate-400">
                        {DOMAIN_LABELS[m.domain]} &middot; {m.time_spent_minutes}min
                        {m.score != null && <> &middot; Score: {m.score}%</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Achievements</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.achievements.map((a: Achievement) => (
                  <div key={a.id}
                    className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 text-center"
                  >
                    <div className="text-2xl mb-1">{a.icon || "🏆"}</div>
                    <div className="text-sm font-medium text-slate-800">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.description}</div>
                    <div className="text-xs text-slate-400 mt-1">
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
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{progress.error}</div>
      )}
    </div>
  );
}
