/**
 * L8-P1-MS2 P0-U05: Progress Tracker
 * Per-domain completion bars, daily time chart, badges, streak counter.
 */
import { useEffect } from 'react';
import { useProgress } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { LearningDomain, Badge } from '../../types/learning';

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

export function ProgressTracker() {
  const { progress, loading, error, fetchProgress } = useProgress();

  useEffect(() => {
    fetchProgress({});
  }, [fetchProgress]);

  if (loading) return <LoadingState label="Loading progress..." />;
  if (error) return <ErrorState message={error} onRetry={() => fetchProgress({})} />;
  if (!progress) return null;

  const domains: LearningDomain[] = ['CAD', 'CAM', 'ShopPractice', 'MachineOperation'];
  const earnedBadges = progress.badges.filter(b => b.earned_at);
  const lockedBadges = progress.badges.filter(b => !b.earned_at);

  // Simple daily chart from last 7 entries
  const recent = progress.daily_history.slice(-7);
  const maxMin = Math.max(...recent.map(e => e.minutes_spent), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            {progress.modules_completed}/{progress.modules_total} modules &middot; {progress.total_hours.toFixed(1)}h total
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-prism-600">{progress.current_streak_days}</div>
          <div className="text-xs text-gray-500">day streak</div>
        </div>
      </div>

      {/* Domain Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Progress</h2>
        <div className="space-y-3">
          {domains.map(domain => {
            const pct = progress.domain_progress[domain] ?? 0;
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

      {/* Daily Activity (Simple bar chart) */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h2>
        <div className="flex items-end gap-2 h-32">
          {recent.map((entry, i) => {
            const height = (entry.minutes_spent / maxMin) * 100;
            const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{entry.minutes_spent}m</span>
                <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-prism-500 rounded-t transition-all"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Badges ({earnedBadges.length}/{progress.badges.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {earnedBadges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} earned />
          ))}
          {lockedBadges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} earned={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ badge, earned }: { badge: Badge; earned: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${
      earned ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-50'
    }`}>
      <div className="text-2xl mb-1">{badge.icon}</div>
      <div className="text-xs font-medium text-gray-900">{badge.name}</div>
      <div className="text-xs text-gray-500 mt-0.5">{badge.description}</div>
    </div>
  );
}
