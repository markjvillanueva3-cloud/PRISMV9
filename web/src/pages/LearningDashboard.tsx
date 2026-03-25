import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLearningProgress, useLearningRecommend } from "../hooks/useLearning";
import type { LearningDomain, ModuleProgress, RecommendedModule } from "../types/learning";
import {
  ClipboardCheck,
  Search,
  Gem,
  Radio,
  BookOpen,
  GraduationCap,
  Trophy,
  Flame,
  Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Static course catalog (matches MCP server academy/)
// ---------------------------------------------------------------------------

const COURSES = [
  { id: "course-0a", title: "Shop Math for Machinists", level: "Novice", modules: 8, hours: 6, color: "from-emerald-600 to-emerald-800" },
  { id: "course-0b", title: "Hand Tools & Measurement", level: "Novice", modules: 6, hours: 4, color: "from-emerald-600 to-emerald-800" },
  { id: "course-0c", title: "Blueprint Reading", level: "Novice", modules: 8, hours: 6, color: "from-emerald-600 to-emerald-800" },
  { id: "course-1", title: "Manufacturing Fundamentals", level: "Novice", modules: 12, hours: 8, color: "from-blue-600 to-blue-800" },
  { id: "course-2", title: "Speed & Feed Mastery", level: "Intermediate", modules: 10, hours: 6, color: "from-amber-600 to-amber-800" },
  { id: "course-3", title: "G-Code Programming", level: "Intermediate", modules: 10, hours: 8, color: "from-amber-600 to-amber-800" },
  { id: "course-4", title: "Milling Operations", level: "Intermediate", modules: 10, hours: 8, color: "from-amber-600 to-amber-800" },
  { id: "course-5", title: "Turning Operations", level: "Intermediate", modules: 8, hours: 6, color: "from-amber-600 to-amber-800" },
  { id: "course-6", title: "CAM System Mastery", level: "Advanced", modules: 18, hours: 12, color: "from-purple-600 to-purple-800" },
  { id: "course-7", title: "Material Science", level: "Advanced", modules: 8, hours: 6, color: "from-purple-600 to-purple-800" },
  { id: "course-8", title: "5-Axis Machining", level: "Advanced", modules: 8, hours: 8, color: "from-purple-600 to-purple-800" },
  { id: "course-9", title: "Process Optimization", level: "Advanced", modules: 8, hours: 6, color: "from-purple-600 to-purple-800" },
  { id: "course-10", title: "Troubleshooting", level: "Master", modules: 10, hours: 8, color: "from-red-600 to-red-800" },
  { id: "course-11", title: "Shop Economics", level: "Master", modules: 6, hours: 4, color: "from-red-600 to-red-800" },
  { id: "course-12", title: "Career Development", level: "Professional", modules: 4, hours: 3, color: "from-slate-600 to-slate-800" },
];

const LEVEL_ORDER = ["Novice", "Intermediate", "Advanced", "Master", "Professional"];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RadarChartSVG({ scores }: { scores: Record<LearningDomain, number> }) {
  const domains = Object.keys(scores) as LearningDomain[];
  const cx = 100,
    cy = 100,
    r = 80;
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
          stroke="rgba(148,163,184,0.2)"
          strokeWidth="0.5"
        />
      ))}
      {domains.map((_, i) => {
        const a = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(148,163,184,0.2)"
            strokeWidth="0.5"
          />
        );
      })}
      <polygon points={polygon} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {domains.map((d, i) => {
        const a = i * angleStep - Math.PI / 2;
        const lx = cx + (r + 18) * Math.cos(a);
        const ly = cy + (r + 18) * Math.sin(a);
        return (
          <text
            key={d}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[11px] fill-slate-400"
          >
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
        <span className="text-slate-200 font-medium">{label}</span>
        <span className="text-slate-400">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  Icon,
  onClick,
}: {
  title: string;
  description: string;
  Icon: typeof ClipboardCheck;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm
        hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-px
        active:translate-y-0 active:shadow-sm active:scale-[0.98]
        transition-all duration-150 group"
    >
      <Icon size={24} className="text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
      <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
    </button>
  );
}

function RecommendedCard({ rec }: { rec: RecommendedModule }) {
  const priorityColors = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-green-500/20 text-green-400",
  };
  return (
    <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[rec.priority]}`}>
          {rec.priority}
        </span>
        <span className="text-xs text-slate-500">{rec.match_score}% match</span>
      </div>
      <h4 className="font-medium text-slate-200 text-sm">{rec.module.title}</h4>
      <p className="text-xs text-slate-400 mt-1">{rec.reason}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>{DOMAIN_LABELS[rec.module.domain]}</span>
        <span>&middot;</span>
        <span>{rec.module.duration_minutes}min</span>
        <span>&middot;</span>
        <span className="capitalize">{rec.module.difficulty}</span>
      </div>
    </div>
  );
}

function CourseCard({
  course,
}: {
  course: (typeof COURSES)[number];
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-700/60 bg-gradient-to-br ${course.color} p-4
        hover:shadow-lg hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
        transition-all duration-150 cursor-pointer group`}
    >
      <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/30 text-white/80 font-medium">
        {course.level}
      </div>
      <BookOpen size={20} className="text-white/70 mb-2" />
      <h3 className="font-semibold text-white text-sm leading-tight">{course.title}</h3>
      <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
        <span>{course.modules} modules</span>
        <span>&middot;</span>
        <span>{course.hours}h</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LearningDashboard() {
  const navigate = useNavigate();
  const progress = useLearningProgress();
  const recommend = useLearningRecommend();

  useEffect(() => {
    progress.execute({ action: "get" });
    recommend.execute({ limit: 4 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const domainScores: Record<LearningDomain, number> = progress.data?.domain_progress ?? {
    cad: 0,
    cam: 0,
    shop_practice: 0,
    machine_operation: 0,
  };

  const recentModules = (progress.data?.modules ?? [])
    .filter((m: ModuleProgress) => m.status === "in_progress")
    .slice(0, 3);

  // Group courses by level
  const coursesByLevel = LEVEL_ORDER.map((level) => ({
    level,
    courses: COURSES.filter((c) => c.level === level),
  })).filter((g) => g.courses.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            <GraduationCap size={28} className="inline-block mr-2 -mt-1 text-blue-400" />
            Training Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track your CNC manufacturing knowledge</p>
        </div>
        {progress.data && (
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">
              {Math.round(progress.data.overall_completion_pct)}%
            </div>
            <div className="text-xs text-slate-500">Overall Progress</div>
          </div>
        )}
      </div>

      {/* Stats + Radar + Achievements row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skill Radar */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 shadow-lg shadow-black/20">
          <h2 className="font-semibold text-slate-200 mb-3">Skill Profile</h2>
          {progress.loading ? (
            <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
          ) : (
            <RadarChartSVG scores={domainScores} />
          )}
        </div>

        {/* Domain Progress */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 shadow-lg shadow-black/20">
          <h2 className="font-semibold text-slate-200 mb-4">Domain Progress</h2>
          {(Object.entries(DOMAIN_LABELS) as [LearningDomain, string][]).map(([domain, label]) => (
            <ProgressBar
              key={domain}
              label={label}
              value={domainScores[domain] ?? 0}
              color={DOMAIN_COLORS[domain]}
            />
          ))}
          {progress.data && (
            <div className="mt-4 pt-3 border-t border-slate-700/40 flex justify-between text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Flame size={14} className="text-orange-400" />
                {progress.data.streak_days} day streak
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {progress.data.total_time_hours.toFixed(1)}h total
              </span>
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 shadow-lg shadow-black/20">
          <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            Achievements
          </h2>
          {progress.data?.achievements.length ? (
            <div className="space-y-2">
              {progress.data.achievements.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/40"
                >
                  <Trophy size={18} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">
              Complete modules to earn achievements
            </div>
          )}
        </div>
      </div>

      {/* In Progress Modules */}
      {recentModules.length > 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 shadow-lg shadow-black/20">
          <h2 className="font-semibold text-slate-200 mb-3">In Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentModules.map((m: ModuleProgress) => (
              <div
                key={m.module_id}
                className="p-3 rounded-lg border border-slate-700/40 bg-slate-900/50"
              >
                <div className="font-medium text-sm text-slate-200">{m.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${m.completion_pct}%` }}
                    />
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
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-5 shadow-lg shadow-black/20">
          <h2 className="font-semibold text-slate-200 mb-3">Recommended Next</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommend.data.recommendations.map((rec: RecommendedModule) => (
              <RecommendedCard key={rec.module.id} rec={rec} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Course Catalog */}
      <div>
        <h2 className="font-semibold text-slate-200 mb-4 text-lg flex items-center gap-2">
          <BookOpen size={20} className="text-blue-400" />
          Course Catalog
        </h2>
        {coursesByLevel.map((group) => (
          <div key={group.level} className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {group.level}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-slate-200 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard
            title="Take Assessment"
            description="Evaluate your current skill levels"
            Icon={ClipboardCheck}
            onClick={() => navigate("/learning/assessment")}
          />
          <QuickActionCard
            title="Browse Knowledge"
            description="Search manufacturing knowledge base"
            Icon={Search}
            onClick={() => navigate("/learning/knowledge")}
          />
          <QuickActionCard
            title="Select Material"
            description="Find the right material for your job"
            Icon={Gem}
            onClick={() => navigate("/learning/material")}
          />
          <QuickActionCard
            title="Digital Twin"
            description="Monitor machine status live"
            Icon={Radio}
            onClick={() => navigate("/learning/twin")}
          />
        </div>
      </div>

      {progress.error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          {progress.error}
        </div>
      )}
    </div>
  );
}
