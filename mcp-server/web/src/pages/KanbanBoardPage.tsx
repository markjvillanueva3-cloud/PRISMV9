import { useCallback, useEffect, useMemo, useState } from 'react';
import { getKanbanBoard, updateKanbanCard } from '../api/client';
import {
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'board' | 'heijunka' | 'settings';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  board: {
    label: 'Board',
    detail: 'Kanban columns with WIP limits, job cards, and priority indicators for the full production flow.',
  },
  heijunka: {
    label: 'Heijunka',
    detail: 'Level-loaded machine schedule showing work distribution balance across all available machines.',
  },
  settings: {
    label: 'Settings',
    detail: 'Configure WIP limits, priority rules, and column visibility for the kanban board.',
  },
};

/* ------------------------------------------------------------------ */
/*  Column / card types                                               */
/* ------------------------------------------------------------------ */

type ColumnId = 'queued' | 'setup' | 'running' | 'inspection' | 'complete' | 'shipped';
type Priority = 'rush' | 'normal' | 'low';

interface KanbanColumn {
  id: ColumnId;
  label: string;
  wipLimit: number;
  visible: boolean;
}

interface JobCard {
  id: string;
  partName: string;
  machine: string;
  operator: string;
  priority: Priority;
  column: ColumnId;
  dueDate: string;
}

const PRIORITY_TONE: Record<Priority, 'rose' | 'sky' | 'slate'> = {
  rush: 'rose',
  normal: 'sky',
  low: 'slate',
};

const COLUMN_ORDER: ColumnId[] = ['queued', 'setup', 'running', 'inspection', 'complete', 'shipped'];

const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: 'queued',     label: 'Queued',     wipLimit: 5, visible: true },
  { id: 'setup',      label: 'Setup',      wipLimit: 2, visible: true },
  { id: 'running',    label: 'Running',    wipLimit: 3, visible: true },
  { id: 'inspection', label: 'Inspection', wipLimit: 2, visible: true },
  { id: 'complete',   label: 'Complete',   wipLimit: 6, visible: true },
  { id: 'shipped',    label: 'Shipped',    wipLimit: 10, visible: true },
];

const INITIAL_JOBS: JobCard[] = [
  { id: 'JOB-4001', partName: 'Turbine Blade',   machine: 'DMU-80', operator: 'R. Chen',     priority: 'rush',   column: 'queued',     dueDate: '2026-04-05' },
  { id: 'JOB-4002', partName: 'Hydraulic Body',   machine: 'VF-2SS', operator: 'J. Martinez', priority: 'normal', column: 'queued',     dueDate: '2026-04-08' },
  { id: 'JOB-4003', partName: 'Bearing Housing',  machine: 'NLX-2500', operator: 'K. Okafor', priority: 'normal', column: 'setup',      dueDate: '2026-04-07' },
  { id: 'JOB-4004', partName: 'Impeller',         machine: 'DMU-80', operator: 'R. Chen',     priority: 'rush',   column: 'running',    dueDate: '2026-04-04' },
  { id: 'JOB-4005', partName: 'Valve Seat',       machine: 'VF-2SS', operator: 'T. Kim',      priority: 'low',    column: 'running',    dueDate: '2026-04-10' },
  { id: 'JOB-4006', partName: 'Spindle Nut',      machine: 'NLX-2500', operator: 'K. Okafor', priority: 'normal', column: 'running',    dueDate: '2026-04-06' },
  { id: 'JOB-4007', partName: 'Manifold Block',   machine: 'VF-2SS', operator: 'J. Martinez', priority: 'normal', column: 'inspection', dueDate: '2026-04-06' },
  { id: 'JOB-4008', partName: 'Gear Blank',       machine: 'NLX-2500', operator: 'T. Kim',    priority: 'low',    column: 'complete',   dueDate: '2026-04-03' },
  { id: 'JOB-4009', partName: 'Nozzle Insert',    machine: 'DMU-80', operator: 'R. Chen',     priority: 'rush',   column: 'queued',     dueDate: '2026-04-04' },
  { id: 'JOB-4010', partName: 'Bracket Assy',     machine: 'VF-2SS', operator: 'J. Martinez', priority: 'normal', column: 'shipped',    dueDate: '2026-04-02' },
];

/* ------------------------------------------------------------------ */
/*  Heijunka seed data                                                */
/* ------------------------------------------------------------------ */

interface HeijunkaSlot {
  machine: string;
  slots: Array<{ label: string; priority: Priority } | null>;
}

const TIME_SLOTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00'];

const HEIJUNKA_DATA: HeijunkaSlot[] = [
  {
    machine: 'DMU-80',
    slots: [
      { label: 'JOB-4004', priority: 'rush' },
      { label: 'JOB-4004', priority: 'rush' },
      { label: 'JOB-4001', priority: 'rush' },
      { label: 'JOB-4001', priority: 'rush' },
      { label: 'JOB-4009', priority: 'rush' },
      { label: 'JOB-4009', priority: 'rush' },
    ],
  },
  {
    machine: 'VF-2SS',
    slots: [
      { label: 'JOB-4005', priority: 'low' },
      { label: 'JOB-4005', priority: 'low' },
      { label: 'JOB-4002', priority: 'normal' },
      null,
      null,
      { label: 'JOB-4002', priority: 'normal' },
    ],
  },
  {
    machine: 'NLX-2500',
    slots: [
      { label: 'JOB-4003', priority: 'normal' },
      { label: 'JOB-4006', priority: 'normal' },
      { label: 'JOB-4006', priority: 'normal' },
      { label: 'JOB-4006', priority: 'normal' },
      null,
      null,
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Priority rules                                                    */
/* ------------------------------------------------------------------ */

const PRIORITY_RULES = [
  { rule: 'Rush jobs always pull before Normal or Low within the same column.', tone: 'rose' as const },
  { rule: 'If a column hits its WIP limit, no new cards may enter until one exits.', tone: 'amber' as const },
  { rule: 'Jobs past due date are auto-promoted to Rush priority.', tone: 'rose' as const },
  { rule: 'Shipped column has no WIP enforcement -- it is a completion log.', tone: 'slate' as const },
  { rule: 'Inspection column WIP limit is deliberately low to force fast quality turnaround.', tone: 'sky' as const },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function KanbanBoardPage() {
  const [tab, setTab] = useState<Tab>('board');
  const [jobs, setJobs] = useState<JobCard[]>(INITIAL_JOBS);
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_COLUMNS);

  // Load real kanban data from API, fall back to seed
  useEffect(() => {
    getKanbanBoard()
      .then((res) => {
        const data = (res as any).data ?? (res as any).result;
        if (data?.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
          setJobs(data.jobs);
        }
        if (data?.columns && Array.isArray(data.columns) && data.columns.length > 0) {
          setColumns(data.columns);
        }
      })
      .catch(() => { /* keep default seed data until backend is connected */ });
  }, []);

  /* Derived counts */
  const jobsByColumn = useMemo(() => {
    const map: Record<ColumnId, JobCard[]> = { queued: [], setup: [], running: [], inspection: [], complete: [], shipped: [] };
    for (const job of jobs) {
      map[job.column].push(job);
    }
    return map;
  }, [jobs]);

  const activeJobs = useMemo(() => jobs.filter((j) => j.column !== 'complete' && j.column !== 'shipped').length, [jobs]);
  const wipTotal = useMemo(() => jobs.filter((j) => j.column !== 'shipped').length, [jobs]);
  const overdueCount = useMemo(() => {
    const today = '2026-04-03';
    return jobs.filter((j) => j.dueDate < today && j.column !== 'complete' && j.column !== 'shipped').length;
  }, [jobs]);

  /* Move card to next column */
  const advanceJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        const currentIdx = COLUMN_ORDER.indexOf(j.column);
        if (currentIdx < 0 || currentIdx >= COLUMN_ORDER.length - 1) return j;
        return { ...j, column: COLUMN_ORDER[currentIdx + 1] };
      }),
    );
  }, []);

  /* Move card to previous column */
  const regressJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        const currentIdx = COLUMN_ORDER.indexOf(j.column);
        if (currentIdx <= 0) return j;
        return { ...j, column: COLUMN_ORDER[currentIdx - 1] };
      }),
    );
  }, []);

  /* WIP limit helpers */
  const columnMap = useMemo(() => {
    const m: Record<string, KanbanColumn> = {};
    for (const c of columns) m[c.id] = c;
    return m;
  }, [columns]);

  function wipHeaderClass(colId: ColumnId): string {
    const col = columnMap[colId];
    if (!col) return '';
    const count = jobsByColumn[colId].length;
    if (count > col.wipLimit) return 'border-rose-300/30 bg-rose-400/12 text-rose-100';
    if (count === col.wipLimit) return 'border-amber-300/30 bg-amber-300/12 text-amber-100';
    return 'border-white/10 bg-white/[0.03] text-slate-200';
  }

  function updateWipLimit(colId: ColumnId, value: number) {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, wipLimit: Math.max(1, value) } : c)));
  }

  function toggleColumnVisibility(colId: ColumnId) {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, visible: !c.visible } : c)));
  }

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      {/* Hero */}
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="Job Kanban Board"
        description="Pull-based production control with WIP limits, priority sequencing, and heijunka leveling to keep the shop floor flowing without overloading any single work center."
        metrics={
          <>
            <SummaryTile
              label="Active Jobs"
              value={String(activeJobs)}
              hint="Jobs currently in Queued through Inspection."
            />
            <SummaryTile
              label="WIP Total"
              value={String(wipTotal)}
              hint="All jobs not yet shipped."
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Overdue"
              value={String(overdueCount)}
              hint={overdueCount > 0 ? 'Jobs past due date still in production.' : 'No overdue jobs detected.'}
              accent="from-rose-400/22 via-rose-300/8 to-transparent"
            />
          </>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, cfg]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {cfg.label}
          </TabButton>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  BOARD TAB                                                    */}
      {/* ============================================================ */}
      {tab === 'board' ? (
        <PanelCard title="Production kanban" subtitle="Cards flow left to right. Click arrows to move jobs between columns. Column headers warn when WIP limits are reached.">
          <div className="overflow-x-auto">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(200px, 1fr))`,
                minWidth: `${visibleColumns.length * 210}px`,
              }}
            >
              {visibleColumns.map((col) => {
                const colJobs = jobsByColumn[col.id];
                const headerCls = wipHeaderClass(col.id);
                return (
                  <div key={col.id} className="flex flex-col gap-2">
                    {/* Column header */}
                    <div className={`rounded-2xl border px-3 py-3 ${headerCls}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{col.label}</span>
                        <span className="text-xs font-mono">
                          {colJobs.length}/{col.wipLimit}
                        </span>
                      </div>
                      {colJobs.length > col.wipLimit ? (
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-rose-300">Over WIP limit</div>
                      ) : colJobs.length === col.wipLimit ? (
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300">At WIP limit</div>
                      ) : null}
                    </div>

                    {/* Job cards */}
                    {colJobs.length > 0 ? (
                      colJobs.map((job) => (
                        <div key={job.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-mono text-slate-400">{job.id}</div>
                            <StatusPill label={job.priority} tone={PRIORITY_TONE[job.priority]} />
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-50">{job.partName}</div>
                          <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                            <div>{job.machine}</div>
                            <div>{job.operator}</div>
                            <div className="font-mono">{job.dueDate}</div>
                          </div>
                          {/* Move buttons */}
                          <div className="mt-3 flex gap-1">
                            {COLUMN_ORDER.indexOf(job.column) > 0 ? (
                              <button
                                type="button"
                                onClick={() => regressJob(job.id)}
                                className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1 text-xs text-slate-300 transition hover:bg-white/[0.08]"
                                title="Move back"
                              >
                                &#8592;
                              </button>
                            ) : null}
                            {COLUMN_ORDER.indexOf(job.column) < COLUMN_ORDER.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => advanceJob(job.id)}
                                className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1 text-xs text-slate-300 transition hover:bg-white/[0.08]"
                                title="Move forward"
                              >
                                &#8594;
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-6 text-center text-xs text-slate-500">
                        Empty
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </PanelCard>
      ) : null}

      {/* ============================================================ */}
      {/*  HEIJUNKA TAB                                                 */}
      {/* ============================================================ */}
      {tab === 'heijunka' ? (
        <div className="space-y-6">
          <PanelCard title="Heijunka board" subtitle="Level-loaded view showing work distribution across machines. Empty slots indicate capacity available; heavily loaded rows signal imbalance.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Machine</th>
                    {TIME_SLOTS.map((slot) => (
                      <th key={slot} className="pb-3 pr-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {slot}
                      </th>
                    ))}
                    <th className="pb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {HEIJUNKA_DATA.map((row) => {
                    const filledSlots = row.slots.filter((s) => s !== null).length;
                    const loadPct = (filledSlots / row.slots.length) * 100;
                    const isOverloaded = loadPct >= 90;
                    const isLight = loadPct < 50;
                    return (
                      <tr key={row.machine} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-semibold text-slate-200">{row.machine}</td>
                        {row.slots.map((slot, i) => (
                          <td key={`${row.machine}-${i}`} className="py-3 pr-2 text-center">
                            {slot ? (
                              <div
                                className={`mx-auto inline-block rounded-lg px-2 py-1 text-[10px] font-semibold ${
                                  slot.priority === 'rush'
                                    ? 'bg-rose-400/16 text-rose-200'
                                    : slot.priority === 'normal'
                                      ? 'bg-cyan-400/16 text-cyan-200'
                                      : 'bg-slate-400/16 text-slate-300'
                                }`}
                              >
                                {slot.label}
                              </div>
                            ) : (
                              <div className="mx-auto inline-block rounded-lg border border-dashed border-white/8 px-2 py-1 text-[10px] text-slate-600">
                                --
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-3 text-center">
                          <StatusPill
                            label={`${loadPct.toFixed(0)}%`}
                            tone={isOverloaded ? 'rose' : isLight ? 'amber' : 'emerald'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PanelCard>

          <PanelCard title="Balance analysis" subtitle="Compare machine loading to detect imbalance. An evenly loaded shop finishes jobs predictably.">
            <div className="space-y-3">
              {HEIJUNKA_DATA.map((row) => {
                const filledSlots = row.slots.filter((s) => s !== null).length;
                const loadPct = (filledSlots / row.slots.length) * 100;
                const isOverloaded = loadPct >= 90;
                const isLight = loadPct < 50;
                return (
                  <div key={row.machine}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{row.machine}</span>
                      <span className={`font-mono ${isOverloaded ? 'text-rose-300' : isLight ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {filledSlots}/{row.slots.length} slots ({loadPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-4 rounded-full ${isOverloaded ? 'bg-rose-400/50' : isLight ? 'bg-amber-400/40' : 'bg-emerald-400/40'}`}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                    {isOverloaded ? (
                      <div className="mt-1 text-[10px] text-rose-300">Overloaded -- consider offloading rush jobs or adding a shift.</div>
                    ) : isLight ? (
                      <div className="mt-1 text-[10px] text-amber-300">Under-utilized -- candidate for additional work or maintenance window.</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </PanelCard>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  SETTINGS TAB                                                 */}
      {/* ============================================================ */}
      {tab === 'settings' ? (
        <div className="space-y-6">
          <PanelCard title="WIP limits" subtitle="Set the maximum number of jobs allowed in each column before the header turns amber (at limit) or rose (over limit).">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {columns.map((col) => (
                <div key={col.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <Field label={col.label}>
                    <Input
                      type="number"
                      min={1}
                      value={col.wipLimit}
                      onChange={(e) => updateWipLimit(col.id, parseInt(e.target.value, 10) || 1)}
                    />
                  </Field>
                  <div className="mt-2 text-xs text-slate-400">
                    Current: {jobsByColumn[col.id].length} job{jobsByColumn[col.id].length === 1 ? '' : 's'}
                    {jobsByColumn[col.id].length > col.wipLimit ? (
                      <span className="ml-1 text-rose-300">(over limit)</span>
                    ) : jobsByColumn[col.id].length === col.wipLimit ? (
                      <span className="ml-1 text-amber-300">(at limit)</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Priority rules" subtitle="Active priority and flow rules governing card movement on the board.">
            <div className="space-y-2">
              {PRIORITY_RULES.map((pr, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <StatusPill label={`Rule ${idx + 1}`} tone={pr.tone} />
                  <span className="text-sm text-slate-300">{pr.rule}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Column visibility" subtitle="Toggle columns on or off. Hidden columns retain their jobs but are not rendered on the board.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {columns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumnVisibility(col.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    col.visible
                      ? 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100'
                      : 'border-white/8 bg-white/[0.03] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{col.label}</span>
                    <StatusPill label={col.visible ? 'Visible' : 'Hidden'} tone={col.visible ? 'emerald' : 'slate'} />
                  </div>
                  <div className="mt-1 text-xs font-normal text-slate-400">
                    {jobsByColumn[col.id].length} job{jobsByColumn[col.id].length === 1 ? '' : 's'} | WIP limit: {col.wipLimit}
                  </div>
                </button>
              ))}
            </div>
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}
