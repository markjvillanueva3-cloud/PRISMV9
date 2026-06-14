/**
 * L8-P1-MS2 P0-U02: Learning Dashboard
 * Main landing page at /learning with domain progress, stats, and quick actions.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress, useRecommend } from '../hooks/useLearning';
import { useLearningCourseRegistry } from '../hooks/useLearningCourseRegistry';
import { useCourses } from '../hooks/useCourses';
import { useStudentId } from '../hooks/useStudentId';
import { SPECIALIZATION_TRACKS, TOTAL_DURATION_MIN, TOTAL_LESSONS } from '../data/academy';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import type { LearningCourseSearchResult, LearningDomain, LearningProgressionCourse } from '../types/learning';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { LearningImprovementRecord, LearningSignalCaptureRecord, PlatformLearningSnapshot } from '../features/operating-system/contracts';

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
  const operatingSystem = useOperatingSystem();
  const {
    progress,
    loading: pLoading,
    error: pError,
    errorCause: pErrorCause,
    fetchProgress,
  } = useProgress();
  const { recommendations, loading: rLoading, fetchRecommendations } = useRecommend();
  const { stats: academyStats } = useCourses(useStudentId());
  const courseRegistry = useLearningCourseRegistry();
  const [learningSnapshot, setLearningSnapshot] = useState<PlatformLearningSnapshot | null>(null);

  useEffect(() => {
    fetchProgress({});
    fetchRecommendations({ count: 3 });
    let active = true;
    operatingSystem
      .getPlatformLearningSnapshot()
      .then((snapshot) => {
        if (active) {
          setLearningSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (active) {
          setLearningSnapshot(null);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchProgress, fetchRecommendations, operatingSystem]);

  if (pLoading) {
    return (
      <LoadingState
        label="Loading learning dashboard..."
        detail="Pulling progress, recommendations, and live course posture into the learning shell."
        variant="panel"
      />
    );
  }
  if (pError) {
    return (
      <ErrorState
        error={pErrorCause ?? pError}
        message={pError}
        onRetry={() => fetchProgress({})}
      />
    );
  }

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

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Career tracks</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Train toward a real shop role</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              The academy now includes role-based tracks for 3-axis milling, turning, 5-axis, mill-turn/swiss, and process leadership.
            </p>
          </div>
          <button
            onClick={() => navigate('/learning/academy')}
            className="rounded-2xl border border-prism-200 bg-prism-50 px-4 py-2 text-sm font-medium text-prism-700 hover:border-prism-400"
          >
            Open academy planner
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {SPECIALIZATION_TRACKS.map(track => (
            <button
              key={track.id}
              onClick={() => navigate('/learning/academy')}
              className={`rounded-3xl bg-gradient-to-br ${track.color} p-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{track.kicker}</div>
              <div className="mt-2 text-lg font-semibold">{track.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/85">{track.target_role}</div>
            </button>
          ))}
        </div>
      </div>

      <SurfaceStatusNotice
        title="Learning convergence"
        surfaces={['learning']}
      />

      {learningSnapshot ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Learning system</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Shop-specific learning with network lift</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Every shop should get smarter from its own work first, while privacy-safe shared outcomes improve the full PRISM platform over time.
              </p>
            </div>
            <div className="rounded-2xl border border-prism-200 bg-prism-50 px-4 py-2 text-sm font-medium text-prism-700">
              {learningSnapshot.shopProfile.adaptationScore} local fit
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.8fr)]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Tenant intelligence</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{learningSnapshot.shopProfile.shopLabel}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{learningSnapshot.shopProfile.specialization}</div>
              <div className="mt-4 space-y-3">
                {learningSnapshot.shopProfile.captures.map((capture) => (
                  <LearningCaptureCard key={capture.id} record={capture} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Network intelligence</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {learningSnapshot.networkProfile.participatingShops}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {learningSnapshot.networkProfile.safeSharePolicy}
              </div>
              <div className="mt-4 space-y-3">
                {learningSnapshot.networkProfile.captures.map((capture) => (
                  <LearningCaptureCard key={capture.id} record={capture} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-prism-200 bg-prism-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-prism-700">Policy note</div>
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  {learningSnapshot.shopProfile.policyNote}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Rollout actions</div>
                <div className="mt-4 space-y-3">
                  {learningSnapshot.rolloutActions.map((action) => (
                    <div key={action} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <LearningImprovementList
              title="What this shop should get better at automatically"
              items={learningSnapshot.shopProfile.improvements}
            />
            <LearningImprovementList
              title="What the full network should get better at automatically"
              items={learningSnapshot.networkProfile.improvements}
            />
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mounted course progression</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Live course registry and enrollments</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              The academy lesson tree is still richer than the mounted backend course model, so PRISM now layers live published-course and enrollment signals on top of the static curriculum instead of pretending the two models are identical.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
              courseRegistry.status === 'live'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : courseRegistry.status === 'live-fallback'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              {courseRegistry.status === 'live'
                ? 'Live registry'
                : courseRegistry.status === 'live-fallback'
                  ? 'Live + fallback'
                  : 'Fallback only'}
            </span>
            <button
              onClick={() => {
                void courseRegistry.refresh();
              }}
              className="rounded-2xl border border-prism-200 bg-prism-50 px-4 py-2 text-sm font-medium text-prism-700 hover:border-prism-400"
            >
              Refresh registry
            </button>
          </div>
        </div>

        {courseRegistry.loading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <LiveLearningStatCard label="Published courses" value="..." />
            <LiveLearningStatCard label="Enrolled" value="..." />
            <LiveLearningStatCard label="In progress" value="..." />
            <LiveLearningStatCard label="Completed" value="..." />
          </div>
        ) : courseRegistry.catalog || courseRegistry.summary ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <LiveLearningStatCard
                label="Published courses"
                value={`${courseRegistry.catalog?.total ?? courseRegistry.catalog?.courses.length ?? 0}`}
              />
              <LiveLearningStatCard
                label="Enrolled"
                value={`${courseRegistry.summary?.total_enrolled ?? 0}`}
              />
              <LiveLearningStatCard
                label="In progress"
                value={`${courseRegistry.summary?.in_progress ?? 0}`}
              />
              <LiveLearningStatCard
                label="Completed"
                value={`${courseRegistry.summary?.completed ?? 0}`}
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Published registry</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">Mounted learning routes in use</div>
                  </div>
                  <button
                    onClick={() => navigate('/learning/academy')}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  >
                    Open academy
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {(courseRegistry.catalog?.courses ?? []).slice(0, 3).map((course) => (
                    <LiveCourseCard key={course.id} course={course} />
                  ))}
                  {courseRegistry.catalog?.courses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                      No published backend courses yet. The static academy is still carrying the deeper lesson experience while mounted course authoring catches up.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Enrollment summary</div>
                  <div className="mt-3 space-y-3">
                    {(courseRegistry.summary?.enrollments ?? []).slice(0, 3).map((enrollment) => (
                      <div key={enrollment.course_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-900">{enrollment.course_title}</div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{enrollment.status}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">{enrollment.progress_pct}% progress</div>
                      </div>
                    ))}
                    {courseRegistry.summary?.enrollments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                        No live enrollments yet for <span className="font-medium text-slate-700">{courseRegistry.userId}</span>.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-prism-200 bg-prism-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-prism-700">Facet coverage</div>
                  <div className="mt-3 space-y-3">
                    <FacetRow
                      label="Machines"
                      values={pickTopFacetValues(courseRegistry.catalog?.facets, 'machine_types')}
                    />
                    <FacetRow
                      label="Materials"
                      values={pickTopFacetValues(courseRegistry.catalog?.facets, 'materials')}
                    />
                    <FacetRow
                      label="CAM"
                      values={pickTopFacetValues(courseRegistry.catalog?.facets, 'cam_systems')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {courseRegistry.error ? (
              <div className="mt-4">
                <ErrorState
                  title="Mounted course registry degraded"
                  error={courseRegistry.errorCause ?? courseRegistry.error}
                  message={courseRegistry.error}
                  onRetry={() => {
                    void courseRegistry.refresh();
                  }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Mounted course routes did not return data in this session, so the static academy remains the working source of truth until backend course authoring is populated.
          </div>
        )}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/learning/academy')}
          className="bg-white rounded-lg border border-prism-200 p-4 text-left hover:border-prism-400 hover:shadow-sm transition-all ring-1 ring-prism-100"
        >
          <div className="font-medium text-prism-700">📚 Academy</div>
          <div className="text-sm text-gray-500 mt-1">
            {academyStats.coursesTotal} courses · {TOTAL_LESSONS} lessons · {Math.round(TOTAL_DURATION_MIN / 60)}h path
          </div>
          <div className="text-xs text-prism-600 mt-2 font-medium">
            From absolute beginner through 5-axis, mill-turn, and process optimization
          </div>
        </button>
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

function LearningCaptureCard({ record }: { record: LearningSignalCaptureRecord }) {
  const tone: Record<LearningSignalCaptureRecord['status'], string> = {
    live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warming: 'border-amber-200 bg-amber-50 text-amber-700',
    planned: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">{record.label}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{record.detail}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone[record.status]}`}>
          {record.status}
        </span>
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {record.scope} · {record.coverage}
      </div>
    </div>
  );
}

function LearningImprovementList({
  title,
  items,
}: {
  title: string;
  items: LearningImprovementRecord[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">{item.title}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.source}</div>
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
            <div className="mt-3 text-sm font-medium text-prism-700">{item.impact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function pickTopFacetValues(
  facets: LearningCourseSearchResult['facets'] | undefined,
  key: keyof LearningCourseSearchResult['facets'],
) {
  const values = facets?.[key];
  if (!values) {
    return [];
  }

  return Object.entries(values)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => `${label} (${count})`);
}

function LiveLearningStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function LiveCourseCard({ course }: { course: LearningProgressionCourse }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">{course.title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{course.description || 'Mounted course route with gated progression and media support.'}</div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {course.difficulty}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
        <span className="rounded-full bg-prism-50 px-2.5 py-1 text-prism-700">{course.domain}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.modules.length} modules</span>
        {course.machine_type ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.machine_type}</span> : null}
        {course.cam_system ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.cam_system}</span> : null}
      </div>
    </div>
  );
}

function FacetRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-prism-700">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length > 0 ? values.map((value) => (
          <span key={`${label}-${value}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {value}
          </span>
        )) : (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
            No live facets yet
          </span>
        )}
      </div>
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
