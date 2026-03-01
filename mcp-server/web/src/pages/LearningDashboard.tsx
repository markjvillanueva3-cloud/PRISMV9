/**
 * L8-P1-MS2 P0-U02: Learning Dashboard
 * Main landing page at /learning with domain progress, stats, and quick actions.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress, useRecommend } from '../hooks/useLearning';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import type { LearningDomain } from '../types/learning';

const DOMAIN_LABELS: Record<LearningDomain, string> = {
  CAD: 'CAD Design',
  CAM: 'CAM Programming',
  ShopPractice: 'Shop Practice',
  MachineOperation: 'Machine Operation',
};

const DOMAIN_COLORS: Record<LearningDomain, string> = {
  CAD: 'bg-blue-500',
  CAM: 'bg-emerald-500',
  ShopPractice: 'bg-amber-500',
  MachineOperation: 'bg-violet-500',
};

export function LearningDashboard() {
  const navigate = useNavigate();
  const { progress, loading: pLoading, error: pError, fetchProgress } = useProgress();
  const { recommendations, loading: rLoading, fetchRecommendations } = useRecommend();

  useEffect(() => {
    fetchProgress({});
    fetchRecommendations({ count: 3 });
  }, [fetchProgress, fetchRecommendations]);

  if (pLoading) return <LoadingState label="Loading learning dashboard..." />;
  if (pError) return <ErrorState message={pError} onRetry={() => fetchProgress({})} />;

  const domains: LearningDomain[] = ['CAD', 'CAM', 'ShopPractice', 'MachineOperation'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your manufacturing knowledge journey</p>
        </div>
        <button
          onClick={() => navigate('/learning/assessment')}
          className="px-4 py-2 bg-prism-600 text-white rounded-lg text-sm font-medium hover:bg-prism-700 transition-colors"
        >
          Take Assessment
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Modules Complete"
          value={progress ? `${progress.modules_completed}/${progress.modules_total}` : '\u2014'}
        />
        <StatCard
          label="Total Hours"
          value={progress ? `${progress.total_hours.toFixed(1)}h` : '\u2014'}
        />
        <StatCard
          label="Current Streak"
          value={progress ? `${progress.current_streak_days}d` : '\u2014'}
        />
        <StatCard
          label="Badges Earned"
          value={progress ? `${progress.badges.filter(b => b.earned_at).length}` : '\u2014'}
        />
      </div>

      {/* Domain Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills by Domain</h2>
        <div className="space-y-3">
          {domains.map(domain => {
            const pct = progress?.domain_progress[domain] ?? 0;
            return (
              <div key={domain}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{DOMAIN_LABELS[domain]}</span>
                  <span className="text-gray-500">{pct}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${DOMAIN_COLORS[domain]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          title="Knowledge Search"
          description="Search manufacturing knowledge base"
          onClick={() => navigate('/learning/knowledge')}
        />
        <ActionCard
          title="Selection Wizards"
          description="Material, tool, and machine selection"
          onClick={() => navigate('/learning/material-wizard')}
        />
        <ActionCard
          title="Digital Twin"
          description="Live machine monitoring and status"
          onClick={() => navigate('/learning/twin')}
        />
      </div>

      {/* Recommended Next */}
      {!rLoading && recommendations && recommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended Next</h2>
          <div className="space-y-2">
            {recommendations.map(mod => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{mod.title}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full text-white ${DOMAIN_COLORS[mod.domain]}`}>
                    {mod.domain}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {mod.duration_min} min &middot; {mod.difficulty}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function ActionCard({ title, description, onClick }: {
  title: string; description: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-prism-400 hover:shadow-sm transition-all"
    >
      <div className="font-medium text-gray-900">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{description}</div>
    </button>
  );
}
