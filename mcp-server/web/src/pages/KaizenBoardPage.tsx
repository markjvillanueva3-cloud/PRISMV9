import { useCallback, useEffect, useState } from 'react';
import { kaizenSuggestions, kaizenUpdateStatus } from '../api/client';
import {
  Field,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'suggestions' | 'projects' | 'impact' | 'contributors';

type SuggestionStatus = 'new' | 'reviewing' | 'implemented' | 'deferred';

interface Suggestion {
  id: string;
  operator: string;
  machine: string;
  department: string;
  date: string;
  text: string;
  status: SuggestionStatus;
  estimatedSavings?: number;
}

type ProjectStatus = 'planning' | 'active' | 'complete';

interface KaizenProject {
  id: string;
  title: string;
  team: string[];
  startDate: string;
  endDate: string;
  scope: string;
  status: ProjectStatus;
  metricBefore: string;
  metricAfter: string;
  metricLabel: string;
}

interface Contributor {
  id: string;
  name: string;
  department: string;
  submitted: number;
  implemented: number;
  badges: string[];
}

// ---------------------------------------------------------------------------
// Seed data
// Seed data removed — all data now sourced from API calls.
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<SuggestionStatus, 'sky' | 'amber' | 'emerald' | 'slate'> = {
  new: 'sky',
  reviewing: 'amber',
  implemented: 'emerald',
  deferred: 'slate',
};

const PROJECT_TONE: Record<ProjectStatus, 'amber' | 'sky' | 'emerald'> = {
  planning: 'amber',
  active: 'sky',
  complete: 'emerald',
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function uniqueValues<T>(items: T[], key: (item: T) => string): string[] {
  return [...new Set(items.map(key))].sort();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KaizenBoardPage() {
  const [tab, setTab] = useState<Tab>('suggestions');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [machineFilter, setMachineFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Load suggestions from API, fall back to seed data
  useEffect(() => {
    setLoading(true);
    kaizenSuggestions()
      .then((res) => {
        const data = (res as any).data ?? (res as any).result ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data.map((s: any) => ({
            id: s.id ?? s.suggestion_id ?? String(Math.random()),
            operator: s.submitted_by ?? s.operator ?? 'Unknown',
            machine: s.machine_id ?? s.machine ?? '',
            department: s.department ?? '',
            date: s.submitted_at ?? s.date ?? new Date().toISOString(),
            text: s.improvement_note ?? s.text ?? '',
            status: s.status ?? 'new',
            estimatedSavings: s.estimated_savings ?? s.estimatedSavings,
          })));
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  // Derive projects from implemented suggestions
  const projects: KaizenProject[] = suggestions
    .filter((s) => s.status === 'implemented' && s.estimatedSavings)
    .map((s) => ({
      id: s.id,
      title: s.text.slice(0, 60),
      team: [s.operator],
      startDate: s.date,
      endDate: s.date,
      scope: s.machine || s.department,
      status: 'complete' as ProjectStatus,
      savings: s.estimatedSavings ?? 0,
    }));

  // Derive contributors from live data
  const contributors: Contributor[] = (() => {
    const map = new Map<string, { submitted: number; implemented: number }>();
    for (const s of suggestions) {
      const key = s.operator;
      const c = map.get(key) ?? { submitted: 0, implemented: 0 };
      c.submitted++;
      if (s.status === 'implemented') c.implemented++;
      map.set(key, c);
    }
    return [...map.entries()]
      .map(([name, counts]) => ({ name, suggestionsCount: counts.submitted, implementedCount: counts.implemented, department: '' }))
      .sort((a, b) => b.implementedCount - a.implementedCount || b.suggestionsCount - a.suggestionsCount);
  })();

  // Derived metrics
  const totalSuggestions = suggestions.length;
  const implementedCount = suggestions.filter((s) => s.status === 'implemented').length;
  const totalSavings = suggestions.reduce((sum, s) => sum + (s.estimatedSavings ?? 0), 0);

  const machines = uniqueValues(suggestions, (s) => s.machine);
  const departments = uniqueValues(suggestions, (s) => s.department);

  const filteredSuggestions = suggestions.filter((s) => {
    if (machineFilter && s.machine !== machineFilter) return false;
    if (deptFilter && s.department !== deptFilter) return false;
    return true;
  });

  const implementedSuggestions = suggestions.filter((s) => s.status === 'implemented' && s.estimatedSavings);

  const handleStatusChange = useCallback(
    (id: string, newStatus: SuggestionStatus) => {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
    },
    [],
  );

  // Sort contributors by implemented desc, then submitted desc
  const rankedContributors = [...contributors].sort(
    (a, b) => b.implemented - a.implemented || b.submitted - a.submitted,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Hero */}
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="Kaizen Board"
        description="Continuous improvement driven by the people closest to the work. Submit suggestions, track kaizen events, and measure the impact of shop-floor ideas."
        metrics={
          <>
            <SummaryTile
              label="Total Suggestions"
              value={String(totalSuggestions)}
              hint={`${suggestions.filter((s) => s.status === 'new').length} new, ${suggestions.filter((s) => s.status === 'reviewing').length} reviewing`}
              accent="from-sky-400/22 via-sky-300/10 to-transparent"
            />
            <SummaryTile
              label="Implemented"
              value={String(implementedCount)}
              hint={`${Math.round((implementedCount / Math.max(totalSuggestions, 1)) * 100)}% implementation rate`}
              accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
            />
            <SummaryTile
              label="Est. Savings"
              value={formatCurrency(totalSavings)}
              hint="Annualized from implemented suggestions"
              accent="from-amber-400/22 via-amber-300/10 to-transparent"
            />
          </>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['suggestions', 'projects', 'impact', 'contributors'] as const).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === 'suggestions' ? 'Suggestions' : t === 'projects' ? 'Kaizen Projects' : t === 'impact' ? 'Impact' : 'Contributors'}
          </TabButton>
        ))}
      </div>

      {/* ====== Suggestions Tab ====== */}
      {tab === 'suggestions' && (
        <PanelCard title="Suggestion Inbox" subtitle="Operator improvement ideas from the shop floor">
          {/* Filters */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Machine">
              <Select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}>
                <option value="">All Machines</option>
                {machines.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Department">
              <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Suggestion cards */}
          <div className="space-y-3">
            {filteredSuggestions.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No suggestions match the current filters.</p>
            )}
            {filteredSuggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{s.operator}</span>
                      <span className="text-xs text-slate-500">{s.machine}</span>
                      <span className="text-xs text-slate-600">{s.department}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{s.text}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-slate-500">{s.id}</span>
                      <span className="text-xs text-slate-500">{s.date}</span>
                      {s.estimatedSavings ? (
                        <span className="text-xs font-medium text-emerald-300">
                          {formatCurrency(s.estimatedSavings)}/yr est.
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill label={s.status} tone={STATUS_TONE[s.status]} />
                    <Select
                      value={s.status}
                      onChange={(e) => handleStatusChange(s.id, e.target.value as SuggestionStatus)}
                      className="!w-auto !rounded-xl !py-1.5 !text-xs"
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="implemented">Implemented</option>
                      <option value="deferred">Deferred</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {/* ====== Projects Tab ====== */}
      {tab === 'projects' && (
        <PanelCard title="Kaizen Events" subtitle="Focused improvement projects with measurable outcomes">
          <div className="space-y-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-100">{p.title}</h3>
                      <StatusPill label={p.status} tone={PROJECT_TONE[p.status]} />
                    </div>
                    <p className="text-sm text-slate-400">{p.scope}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Team: {p.team.join(', ')}</span>
                      <span>{p.startDate} to {p.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Before / After metrics */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Before</div>
                    <div className="mt-1 text-lg font-semibold text-rose-300">{p.metricBefore}</div>
                    <div className="text-xs text-slate-500">{p.metricLabel}</div>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-2xl text-slate-600">&rarr;</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">After</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-300">{p.metricAfter}</div>
                    <div className="text-xs text-slate-500">{p.metricLabel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {/* ====== Impact Tab ====== */}
      {tab === 'impact' && (
        <div className="space-y-6">
          <PanelCard title="Impact Summary" subtitle="Measurable results from implemented improvements">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Suggestions Implemented"
                value={String(implementedCount)}
                hint={`Out of ${totalSuggestions} total`}
                accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
              />
              <SummaryTile
                label="Total Est. Savings"
                value={formatCurrency(totalSavings)}
                hint="Annualized from implemented ideas"
                accent="from-amber-400/22 via-amber-300/10 to-transparent"
              />
              <SummaryTile
                label="Avg. ROI per Suggestion"
                value={implementedSuggestions.length > 0
                  ? formatCurrency(Math.round(totalSavings / implementedSuggestions.length))
                  : '--'}
                hint="Average annual savings per implemented item"
                accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
              />
            </div>
          </PanelCard>

          <PanelCard title="Implemented Improvements" subtitle="Before and after metrics with estimated savings">
            <div className="space-y-3">
              {implementedSuggestions.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">No implemented suggestions with savings data yet.</p>
              )}
              {implementedSuggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{s.operator}</span>
                        <span className="text-xs text-slate-500">{s.machine}</span>
                      </div>
                      <p className="text-sm text-slate-300">{s.text}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-emerald-300">
                        {formatCurrency(s.estimatedSavings!)}/yr
                      </div>
                      <div className="text-xs text-slate-500">Estimated annual savings</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* ROI summary row */}
              {implementedSuggestions.length > 0 && (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Total Annual Savings</span>
                    <span className="text-xl font-bold text-emerald-300">{formatCurrency(totalSavings)}</span>
                  </div>
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      )}

      {/* ====== Contributors Tab ====== */}
      {tab === 'contributors' && (
        <PanelCard title="Contributor Leaderboard" subtitle="Recognizing operators who drive continuous improvement">
          <div className="space-y-3">
            {rankedContributors.map((c, index) => (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                {/* Rank */}
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  index === 0
                    ? 'bg-amber-300/20 text-amber-200'
                    : index === 1
                      ? 'bg-slate-300/20 text-slate-200'
                      : index === 2
                        ? 'bg-orange-300/20 text-orange-200'
                        : 'bg-white/[0.06] text-slate-400'
                }`}>
                  #{index + 1}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.department}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {c.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 text-[10px] font-semibold text-cyan-200"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-shrink-0 gap-6 text-center">
                  <div>
                    <div className="text-lg font-semibold text-slate-100">{c.submitted}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Submitted</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-emerald-300">{c.implemented}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Implemented</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-300">
                      {c.submitted > 0 ? Math.round((c.implemented / c.submitted) * 100) : 0}%
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Hit Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
    </div>
  );
}
