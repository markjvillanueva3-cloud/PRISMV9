/**
 * L8-P1-MS2 P0-U04: Learning Path View
 * Personalized learning path as vertical timeline with module cards.
 */
import { useEffect } from 'react';
import { useLearningPlan, useRecommend } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { LearningModule } from '../../types/learning';

const STATUS_STYLES: Record<LearningModule['status'], { bg: string; text: string; dot: string }> = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  available: { bg: 'bg-white', text: 'text-gray-700', dot: 'bg-gray-300' },
  locked: { bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-200' },
};

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export function LearningPath() {
  const { plan, loading: planLoading, error: planError, generatePlan } = useLearningPlan();
  const { recommendations, fetchRecommendations } = useRecommend();

  useEffect(() => {
    generatePlan({});
    fetchRecommendations({ count: 5 });
  }, [generatePlan, fetchRecommendations]);

  if (planLoading) return <LoadingState label="Generating your learning path..." />;
  if (planError) return <ErrorState message={planError} onRetry={() => generatePlan({})} />;

  const recommendedIds = new Set(recommendations?.map(r => r.id) ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning Path</h1>
        {plan && (
          <p className="text-sm text-gray-500 mt-1">
            {plan.title} &middot; {plan.estimated_hours}h estimated
          </p>
        )}
      </div>

      {plan && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {plan.modules.map((mod, i) => {
              const style = STATUS_STYLES[mod.status];
              const isCurrent = mod.id === plan.current_module_id;
              const isRecommended = recommendedIds.has(mod.id);

              return (
                <div key={mod.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-white ${style.dot} ${
                    isCurrent ? 'ring-2 ring-blue-300' : ''
                  }`} />

                  <div className={`${style.bg} rounded-lg border border-gray-200 p-4 ${
                    isCurrent ? 'ring-1 ring-blue-300' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                          <span className={`font-medium ${style.text}`}>{mod.title}</span>
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                              Current
                            </span>
                          )}
                          {isRecommended && !isCurrent && (
                            <span className="text-xs px-2 py-0.5 bg-prism-100 text-prism-700 rounded-full font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_BADGE[mod.difficulty] ?? ''}`}>
                          {mod.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">{mod.duration_min} min</span>
                      </div>
                    </div>

                    {mod.status === 'in_progress' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{mod.completion_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${mod.completion_pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {mod.prerequisites.length > 0 && mod.status === 'locked' && (
                      <div className="mt-2 text-xs text-gray-400">
                        Requires: {mod.prerequisites.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
