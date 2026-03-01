import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLearningProgress, useLearningRecommend } from "../hooks/useLearning";
import type { LearningDomain, ModuleProgress, RecommendedModule } from "../types/learning";

const DOMAIN_LABELS: Record<LearningDomain, string> = {
  cad: "CAD",
  cam: "CAM",
  shop_practice: "Shop Practice",
  machine_operation: "Machine Operation",
};

const DOMAIN_COLORS: Record<LearningDomain, string> = {
  cad: "#3b82f6",
  cam: "#10b981",
  shop_practice: "#f59e0b",
  machine_operation: "#8b5cf6",
};

function RadarChartSVG({ scores }: { scores: Record<LearningDomain, number> }) {
  const domains = Object.keys(scores) as LearningDomain[];
  const cx = 100, cy = 100, r = 80;
  const angleStep = (2 * Math.PI) / domains.length;

  const points = domains.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = (scores[d] ?? 0) / 100;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[280px] mx-auto">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={domains
            .map((_, i) => {
              const a = i * angleStep - Math.PI / 2;
              return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />
      ))}
      {domains.map((_, i) => {
        const a = i * angleStep - Math.PI / 2;
        return (
          <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e2e8f0" strokeWidth="0.5" />
        );
      })}
      <polygon points={polygon} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />
      {domains.map((d, i) => {
        const a = i * angleStep - Math.PI / 2;
        const lx = cx + (r + 18) * Math.cos(a);
        const ly = cy + (r + 18) * Math.sin(a);
        return (
          <text key={d} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-slate-600">
            {DOMAIN_LABELS[d]}
          </text>
        );
      })}
    </svg>
  );
}

function ProgressBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-500">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white group"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </button>
  );
}

function RecommendedCard({ rec }: { rec: RecommendedModule }) {
  const priorityColors = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[rec.priority]}`}>{rec.priority}</span>
        <span className="text-xs text-slate-400">{rec.match_score}% match</span>
      </div>
      <h4 className="font-medium text-slate-800 text-sm">{rec.module.title}</h4>
      <p className="text-xs text-slate-500 mt-1">{rec.reason}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
        <span>{DOMAIN_LABELS[rec.module.domain]}</span>
        <span>&middot;</span>
        <span>{rec.module.duration_minutes}min</span>
        <span>&middot;</span>
        <span className="capitalize">{rec.module.difficulty}</span>
      </div>
    </div>
  );
}

export default function LearningDashboard() {
  const navigate = useNavigate();
  const progress = useLearningProgress();
  const recommend = useLearningRecommend();

  useEffect(() => {
    progress.execute({ action: "get" });
    recommend.execute({ limit: 4 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — one-time fetch on mount

  const domainScores: Record<LearningDomain, number> = progress.data?.domain_progress ?? {
    cad: 0, cam: 0, shop_practice: 0, machine_operation: 0,
  };

  const recentModules = (progress.data?.modules ?? [])
    .filter((m: ModuleProgress) => m.status === "in_progress")
    .slice(0, 3);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Track your CNC manufacturing knowledge</p>
        </div>
        {progress.data && (
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{Math.round(progress.data.overall_completion_pct)}%</div>
            <div className="text-xs text-slate-500">Overall Progress</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skill Radar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Skill Profile</h2>
          {progress.loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
          ) : (
            <RadarChartSVG scores={domainScores} />
          )}
        </div>

        {/* Domain Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Domain Progress</h2>
          {(Object.entries(DOMAIN_LABELS) as [LearningDomain, string][]).map(([domain, label]) => (
            <ProgressBar key={domain} label={label} value={domainScores[domain] ?? 0} color={DOMAIN_COLORS[domain]} />
          ))}
          {progress.data && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-sm text-slate-500">
              <span>{progress.data.streak_days} day streak</span>
              <span>{progress.data.total_time_hours.toFixed(1)}h total</span>
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Achievements</h2>
          {progress.data?.achievements.length ? (
            <div className="space-y-2">
              {progress.data.achievements.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-xl">{a.icon || "🏆"}</span>
                  <div>
                    <div className="text-sm font-medium text-slate-700">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center py-8">Complete modules to earn achievements</div>
          )}
        </div>
      </div>

      {/* In Progress Modules */}
      {recentModules.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">In Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentModules.map((m: ModuleProgress) => (
              <div key={m.module_id} className="p-3 rounded-lg border border-slate-100">
                <div className="font-medium text-sm text-slate-800">{m.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${m.completion_pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(m.completion_pct)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommend.data?.recommendations.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Recommended Next</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommend.data.recommendations.map((rec: RecommendedModule) => (
              <RecommendedCard key={rec.module.id} rec={rec} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard title="Take Assessment" description="Evaluate your current skill levels" icon="📋" onClick={() => navigate("/learning/assessment")} />
          <QuickActionCard title="Browse Knowledge" description="Search manufacturing knowledge base" icon="🔍" onClick={() => navigate("/learning/knowledge")} />
          <QuickActionCard title="Select Material" description="Find the right material for your job" icon="🧱" onClick={() => navigate("/learning/material")} />
          <QuickActionCard title="Digital Twin" description="Monitor machine status live" icon="🏭" onClick={() => navigate("/learning/twin")} />
        </div>
      </div>

      {progress.error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{progress.error}</div>}
    </div>
  );
}
