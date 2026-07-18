import { useCallback, useState } from 'react';
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
// ---------------------------------------------------------------------------

const SEED_SUGGESTIONS: Suggestion[] = [
  {
    id: 'SUG-001',
    operator: 'Mike Torres',
    machine: 'VF-2SS #3',
    department: 'Milling',
    date: '2026-03-28',
    text: 'Move tool presetter closer to VF-2SS cells. Currently walking 40 ft round-trip per setup — adds 3 min per job.',
    status: 'implemented',
    estimatedSavings: 4200,
  },
  {
    id: 'SUG-002',
    operator: 'Sarah Chen',
    machine: 'ST-20Y',
    department: 'Turning',
    date: '2026-03-30',
    text: 'Add coolant pressure gauge on ST-20Y. We keep guessing and burning through inserts on Inconel jobs.',
    status: 'reviewing',
  },
  {
    id: 'SUG-003',
    operator: 'James Walker',
    machine: 'EDM Roboform 350',
    department: 'EDM',
    date: '2026-04-01',
    text: 'Standardize electrode holders across all sinkers — right now 3 different systems means 15 min adapter swaps.',
    status: 'new',
  },
  {
    id: 'SUG-004',
    operator: 'Ana Reyes',
    machine: 'DMU 50',
    department: '5-Axis',
    date: '2026-03-25',
    text: 'Pre-stage fixture plates for repeat jobs on a shadow board near DMU 50. Cuts first-op setup by ~20 min.',
    status: 'implemented',
    estimatedSavings: 8400,
  },
  {
    id: 'SUG-005',
    operator: 'Dave Kim',
    machine: 'VF-4',
    department: 'Milling',
    date: '2026-04-02',
    text: 'Color-code vise jaws by jaw width — operators grab wrong set at least once per shift.',
    status: 'new',
  },
  {
    id: 'SUG-006',
    operator: 'Lisa Patel',
    machine: 'ST-30',
    department: 'Turning',
    date: '2026-03-20',
    text: 'Barfeed alarm speaker too quiet — operators miss the alert and lose 10 min per event.',
    status: 'deferred',
  },
];

const SEED_PROJECTS: KaizenProject[] = [
  {
    id: 'KZN-001',
    title: '5S Milling Cell Reorganization',
    team: ['Mike Torres', 'Ana Reyes', 'Dave Kim'],
    startDate: '2026-02-15',
    endDate: '2026-03-15',
    scope: 'Milling department floor layout, tool storage, and material staging areas',
    status: 'complete',
    metricBefore: '22 min avg setup',
    metricAfter: '14 min avg setup',
    metricLabel: 'Setup Time',
  },
  {
    id: 'KZN-002',
    title: 'Turning Cell Quick-Change Tooling',
    team: ['Sarah Chen', 'Lisa Patel'],
    startDate: '2026-03-10',
    endDate: '2026-04-30',
    scope: 'Standardize quick-change toolholders on ST-20Y and ST-30 lathes',
    status: 'active',
    metricBefore: '18 min tool change',
    metricAfter: '6 min target',
    metricLabel: 'Tool Change Time',
  },
  {
    id: 'KZN-003',
    title: 'EDM Electrode Standardization',
    team: ['James Walker'],
    startDate: '2026-04-15',
    endDate: '2026-05-30',
    scope: 'Unify electrode holder systems across all sinker EDM machines',
    status: 'planning',
    metricBefore: '15 min adapter swap',
    metricAfter: '0 min target',
    metricLabel: 'Adapter Swap Time',
  },
];

const SEED_CONTRIBUTORS: Contributor[] = [
  { id: 'EMP-010', name: 'Mike Torres', department: 'Milling', submitted: 12, implemented: 7, badges: ['Top Contributor', 'Quick Win Champion'] },
  { id: 'EMP-022', name: 'Ana Reyes', department: '5-Axis', submitted: 9, implemented: 6, badges: ['Cost Saver'] },
  { id: 'EMP-015', name: 'Sarah Chen', department: 'Turning', submitted: 8, implemented: 4, badges: ['Safety First'] },
  { id: 'EMP-031', name: 'James Walker', department: 'EDM', submitted: 5, implemented: 2, badges: [] },
  { id: 'EMP-044', name: 'Dave Kim', department: 'Milling', submitted: 4, implemented: 1, badges: [] },
  { id: 'EMP-019', name: 'Lisa Patel', department: 'Turning', submitted: 3, implemented: 1, badges: [] },
];

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>(SEED_SUGGESTIONS);
  const [projects] = useState<KaizenProject[]>(SEED_PROJECTS);
  const [contributors] = useState<Contributor[]>(SEED_CONTRIBUTORS);
  const [machineFilter, setMachineFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

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
