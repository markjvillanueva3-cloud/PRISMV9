import { useEffect } from "react";
import { useLearningPlan, useLearningRecommend } from "../../hooks/useLearning";
import type { LearningModule, RecommendedModule, LearningDomain } from "../../types/learning";

const DOMAIN_COLORS: Record<LearningDomain, string> = {
  cad: "border-blue-400 bg-blue-50",
  cam: "border-green-400 bg-green-50",
  shop_practice: "border-amber-400 bg-amber-50",
  machine_operation: "border-purple-400 bg-purple-50",
};

const DIFF_BADGES: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
};

function ModuleCard({
  mod,
  index,
  isRecommended,
}: {
  mod: LearningModule;
  index: number;
  isRecommended: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            ${isRecommended
              ? "bg-blue-600 text-white ring-2 ring-blue-300"
              : "bg-slate-200 text-slate-600"
            }`}
        >
          {index + 1}
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-4 p-4 rounded-lg border-l-4 transition-all
          ${DOMAIN_COLORS[mod.domain] ?? "border-slate-300 bg-slate-50"}
          ${isRecommended ? "ring-2 ring-blue-200 shadow-sm" : ""}
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-800 text-sm">{mod.title}</h3>
          {isRecommended && (
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
              Next
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-2">{mod.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full ${DIFF_BADGES[mod.difficulty] ?? ""}`}>
            {mod.difficulty}
          </span>
          <span className="text-slate-400">
            {mod.duration_minutes} min
          </span>
          <span className="text-slate-400">
            {mod.domain.replace("_", " ")}
          </span>
        </div>
        {mod.prerequisites.length > 0 && (
          <div className="text-xs text-slate-400 mt-2">
            Prereqs: {mod.prerequisites.join(", ")}
          </div>
        )}
        {mod.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {mod.topics.slice(0, 4).map((t) => (
              <span key={t} className="text-xs bg-white/60 text-slate-500 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearningPath() {
  const plan = useLearningPlan();
  const recommend = useLearningRecommend();

  useEffect(() => {
    plan.execute({ target_level: "advanced" });
    recommend.execute({ limit: 3 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — one-time fetch on mount

  const recommendedIds = new Set(
    (recommend.data?.recommendations ?? []).map(
      (r: RecommendedModule) => r.module.id,
    ),
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Learning Path</h1>
      <p className="text-slate-500 text-sm mb-6">
        Your personalized journey to CNC mastery
      </p>

      {plan.loading && (
        <div className="text-center py-12 text-slate-400">
          Generating your learning path...
        </div>
      )}

      {plan.data && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {plan.data.modules.length}
              </div>
              <div className="text-xs text-slate-500">Modules</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {plan.data.estimated_weeks}
              </div>
              <div className="text-xs text-slate-500">Weeks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {plan.data.total_hours}
              </div>
              <div className="text-xs text-slate-500">Hours</div>
            </div>
          </div>

          {/* Milestones */}
          {plan.data.milestones.length > 0 && (
            <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200">
              <h2 className="font-semibold text-slate-800 mb-2 text-sm">
                Milestones
              </h2>
              <div className="space-y-1">
                {plan.data.milestones.map((m) => (
                  <div key={m.week} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 font-mono text-xs w-16">
                      Week {m.week}
                    </span>
                    <span className="text-slate-700">{m.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module timeline */}
          <div>
            {plan.data.modules.map((mod: LearningModule, i: number) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                index={i}
                isRecommended={recommendedIds.has(mod.id)}
              />
            ))}
          </div>
        </>
      )}

      {plan.error && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
          {plan.error}
        </div>
      )}
    </div>
  );
}
