import { useCallback, useEffect, useState } from 'react';
import { ApiError, analyticsOEE, whoClockedIn } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'overview' | 'machines' | 'losses' | 'trends';

const TAB_CONFIG: Record<Tab, { label: string }> = {
  overview: { label: 'Overview' },
  machines: { label: 'Machines' },
  losses: { label: 'Losses' },
  trends: { label: 'Trends' },
};

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface OEEComponents {
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  oee_pct: number;
}

interface MachineOEE {
  machine_id: string;
  machine_name: string;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  oee_pct: number;
  status: 'running' | 'idle' | 'down';
}

interface BigLoss {
  id: string;
  name: string;
  category: 'availability' | 'performance' | 'quality';
  minutes_lost: number;
  description: string;
}

interface TrendDay {
  date: string;
  oee_pct: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
}

// ---------------------------------------------------------------------------
// Realistic seed data
// ---------------------------------------------------------------------------

const SEED_OEE: OEEComponents = {
  availability_pct: 88.2,
  performance_pct: 79.5,
  quality_pct: 96.1,
  oee_pct: 67.4,
};

const SEED_MACHINES: MachineOEE[] = [
  { machine_id: 'VF-2SS', machine_name: 'Haas VF-2SS', availability_pct: 92.1, performance_pct: 84.3, quality_pct: 97.8, oee_pct: 75.9, status: 'running' },
  { machine_id: 'VF-4SS', machine_name: 'Haas VF-4SS', availability_pct: 89.5, performance_pct: 78.2, quality_pct: 96.4, oee_pct: 67.4, status: 'running' },
  { machine_id: 'UMC-750', machine_name: 'Haas UMC-750', availability_pct: 85.3, performance_pct: 82.1, quality_pct: 95.0, oee_pct: 66.5, status: 'running' },
  { machine_id: 'ST-20Y', machine_name: 'Haas ST-20Y', availability_pct: 91.0, performance_pct: 76.4, quality_pct: 97.2, oee_pct: 67.6, status: 'idle' },
  { machine_id: 'FA-20S', machine_name: 'Mitsubishi FA-20S', availability_pct: 78.6, performance_pct: 81.0, quality_pct: 98.2, oee_pct: 62.5, status: 'running' },
  { machine_id: 'GS-300', machine_name: 'Okuma GS-300', availability_pct: 94.2, performance_pct: 72.8, quality_pct: 93.5, oee_pct: 64.1, status: 'down' },
  { machine_id: 'DMU-50', machine_name: 'DMG MORI DMU 50', availability_pct: 87.1, performance_pct: 85.6, quality_pct: 96.9, oee_pct: 72.2, status: 'running' },
];

const SEED_LOSSES: BigLoss[] = [
  { id: 'breakdown', name: 'Breakdowns', category: 'availability', minutes_lost: 480, description: 'Unplanned machine-down events requiring maintenance intervention.' },
  { id: 'setup', name: 'Setup / Adjustment', category: 'availability', minutes_lost: 360, description: 'Setup, changeover, and first-piece qualification time.' },
  { id: 'minor-stops', name: 'Minor Stops', category: 'performance', minutes_lost: 290, description: 'Short interruptions under 5 minutes: jams, sensor trips, manual interventions.' },
  { id: 'reduced-speed', name: 'Reduced Speed', category: 'performance', minutes_lost: 410, description: 'Running below ideal cycle time due to worn tooling, poor fixturing, or conservative feeds.' },
  { id: 'startup-rejects', name: 'Startup Rejects', category: 'quality', minutes_lost: 120, description: 'First articles and warm-up parts that fail inspection.' },
  { id: 'production-rejects', name: 'Production Rejects', category: 'quality', minutes_lost: 85, description: 'In-process scrap and rework during steady-state production.' },
];

function generateTrendData(): TrendDay[] {
  const days: TrendDay[] = [];
  const baseDate = new Date(2026, 2, 5); // March 5, 2026
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const avail = 84 + Math.round(Math.random() * 12 * 10) / 10;
    const perf = 74 + Math.round(Math.random() * 14 * 10) / 10;
    const qual = 92 + Math.round(Math.random() * 7 * 10) / 10;
    days.push({
      date: d.toISOString().slice(0, 10),
      availability_pct: Math.min(avail, 99.9),
      performance_pct: Math.min(perf, 99.9),
      quality_pct: Math.min(qual, 99.9),
      oee_pct: Math.round((avail / 100) * (perf / 100) * (qual / 100) * 1000) / 10,
    });
  }
  return days;
}

const SEED_TRENDS = generateTrendData();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORLD_CLASS_TARGET = 85;

function oeeColor(pct: number): string {
  if (pct >= 85) return 'text-emerald-300';
  if (pct >= 60) return 'text-amber-300';
  return 'text-rose-300';
}

function oeeBgColor(pct: number): string {
  if (pct >= 85) return 'bg-emerald-300';
  if (pct >= 60) return 'bg-amber-300';
  return 'bg-rose-300';
}

function oeeTone(pct: number): 'emerald' | 'amber' | 'rose' {
  if (pct >= 85) return 'emerald';
  if (pct >= 60) return 'amber';
  return 'rose';
}

function oeeTileAccent(pct: number): string {
  if (pct >= 85) return 'from-emerald-400/22 via-emerald-300/8 to-transparent';
  if (pct >= 60) return 'from-amber-400/22 via-amber-300/8 to-transparent';
  return 'from-rose-400/22 via-rose-300/8 to-transparent';
}

function lossCategory(cat: BigLoss['category']): { label: string; tone: 'rose' | 'amber' | 'violet' } {
  switch (cat) {
    case 'availability': return { label: 'Availability', tone: 'rose' };
    case 'performance': return { label: 'Performance', tone: 'amber' };
    case 'quality': return { label: 'Quality', tone: 'violet' };
  }
}

function machineStatusTone(status: MachineOEE['status']): 'emerald' | 'amber' | 'rose' {
  switch (status) {
    case 'running': return 'emerald';
    case 'idle': return 'amber';
    case 'down': return 'rose';
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function OEEDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [oee, setOEE] = useState<OEEComponents>(SEED_OEE);
  const [machines, setMachines] = useState<MachineOEE[]>(SEED_MACHINES);
  const [losses] = useState<BigLoss[]>(SEED_LOSSES);
  const [trends] = useState<TrendDay[]>(SEED_TRENDS);
  const [trendPeriod, setTrendPeriod] = useState<'30d' | '14d' | '7d'>('30d');

  // Derived
  const maxLossMinutes = losses.length > 0 ? Math.max(...losses.map((l) => l.minutes_lost)) : 1;
  const filteredTrends = trendPeriod === '7d'
    ? trends.slice(-7)
    : trendPeriod === '14d'
      ? trends.slice(-14)
      : trends;

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oeeRes, _clockedRes] = await Promise.all([
        analyticsOEE(),
        whoClockedIn(),
      ]);

      const rawOEE = oeeRes.result as Partial<OEEComponents> & { machines?: MachineOEE[] } | null;
      if (rawOEE) {
        if (
          typeof rawOEE.oee_pct === 'number' &&
          typeof rawOEE.availability_pct === 'number' &&
          typeof rawOEE.performance_pct === 'number' &&
          typeof rawOEE.quality_pct === 'number'
        ) {
          setOEE({
            oee_pct: rawOEE.oee_pct,
            availability_pct: rawOEE.availability_pct,
            performance_pct: rawOEE.performance_pct,
            quality_pct: rawOEE.quality_pct,
          });
        }
        if (rawOEE.machines && rawOEE.machines.length > 0) {
          setMachines(rawOEE.machines);
        }
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load OEE data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="OEE Dashboard"
        description="Overall Equipment Effectiveness broken into Availability, Performance, and Quality so the floor knows exactly where time is being lost and what to fix first."
        metrics={
          <>
            <SummaryTile
              label="OEE %"
              value={`${oee.oee_pct.toFixed(1)}%`}
              hint={oee.oee_pct >= WORLD_CLASS_TARGET ? 'At or above world-class target.' : `${(WORLD_CLASS_TARGET - oee.oee_pct).toFixed(1)} points below the ${WORLD_CLASS_TARGET}% world-class target.`}
              accent={oeeTileAccent(oee.oee_pct)}
            />
            <SummaryTile
              label="Availability"
              value={`${oee.availability_pct.toFixed(1)}%`}
              hint="Scheduled time the machines were actually available to run."
              accent={oeeTileAccent(oee.availability_pct)}
            />
            <SummaryTile
              label="Quality"
              value={`${oee.quality_pct.toFixed(1)}%`}
              hint="Good parts as a percentage of total parts produced."
              accent={oeeTileAccent(oee.quality_pct)}
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              OEE = Availability x Performance x Quality. World-class manufacturing targets 85% OEE. This dashboard identifies which of the three components is dragging the number down.
            </div>
            <ActionButton onClick={loadData}>Refresh OEE</ActionButton>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing OEE data..." /> : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            {/* Big OEE gauge */}
            <PanelCard title="Overall OEE" subtitle="Availability x Performance x Quality = OEE.">
              <div className="flex flex-col items-center py-6">
                {/* Numeric gauge */}
                <div className={`text-7xl font-bold tracking-tight ${oeeColor(oee.oee_pct)}`}>
                  {oee.oee_pct.toFixed(1)}%
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {oee.oee_pct >= WORLD_CLASS_TARGET
                    ? 'World-class OEE achieved'
                    : `Target: ${WORLD_CLASS_TARGET}%`}
                </div>

                {/* Visual bar */}
                <div className="mt-6 w-full max-w-md">
                  <div className="relative h-5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-5 rounded-full transition-all ${oeeBgColor(oee.oee_pct)}`}
                      style={{ width: `${Math.min(oee.oee_pct, 100)}%` }}
                    />
                    {/* World-class marker */}
                    <div
                      className="absolute top-0 h-5 w-0.5 bg-white/40"
                      style={{ left: `${WORLD_CLASS_TARGET}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span>0%</span>
                    <span>{WORLD_CLASS_TARGET}% target</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Formula breakdown */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span className={oeeColor(oee.availability_pct)}>{oee.availability_pct.toFixed(1)}%</span>
                  <span className="text-slate-500">x</span>
                  <span className={oeeColor(oee.performance_pct)}>{oee.performance_pct.toFixed(1)}%</span>
                  <span className="text-slate-500">x</span>
                  <span className={oeeColor(oee.quality_pct)}>{oee.quality_pct.toFixed(1)}%</span>
                  <span className="text-slate-500">=</span>
                  <span className={`font-semibold ${oeeColor(oee.oee_pct)}`}>{oee.oee_pct.toFixed(1)}%</span>
                </div>
              </div>
            </PanelCard>
          </div>

          {/* Right column — component tiles */}
          <div className="space-y-6">
            <PanelCard title="Component breakdown" subtitle="Each component individually color-coded against the 85% world-class threshold.">
              <div className="space-y-3">
                {([
                  { label: 'Availability', pct: oee.availability_pct, hint: 'Uptime vs. scheduled production time. Includes breakdowns and setup.' },
                  { label: 'Performance', pct: oee.performance_pct, hint: 'Actual throughput vs. ideal cycle time. Includes minor stops and slow cycles.' },
                  { label: 'Quality', pct: oee.quality_pct, hint: 'Good parts vs. total parts. Includes startup rejects and production scrap.' },
                ] as const).map((comp) => (
                  <div key={comp.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{comp.label}</div>
                        <div className={`mt-2 text-3xl font-semibold ${oeeColor(comp.pct)}`}>{comp.pct.toFixed(1)}%</div>
                        <div className="mt-2 text-sm text-slate-400">{comp.hint}</div>
                      </div>
                      <StatusPill
                        label={comp.pct >= 85 ? 'On target' : comp.pct >= 60 ? 'Below target' : 'Critical'}
                        tone={oeeTone(comp.pct)}
                      />
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-2 rounded-full transition-all ${oeeBgColor(comp.pct)}`}
                        style={{ width: `${Math.min(comp.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {/* ===== MACHINES TAB ===== */}
      {tab === 'machines' ? (
        <div className="space-y-6">
          <PanelCard title="Per-machine OEE" subtitle="Individual A / P / Q breakdown per machine with color-coded status.">
            {machines.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...machines].sort((a, b) => b.oee_pct - a.oee_pct).map((m) => (
                  <div key={m.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{m.machine_name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{m.machine_id}</div>
                      </div>
                      <StatusPill label={m.status} tone={machineStatusTone(m.status)} />
                    </div>

                    {/* OEE value */}
                    <div className={`mt-3 text-2xl font-semibold ${oeeColor(m.oee_pct)}`}>
                      {m.oee_pct.toFixed(1)}%
                      <span className="ml-1 text-xs font-normal text-slate-500">OEE</span>
                    </div>

                    {/* A / P / Q breakdown */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {([
                        { label: 'A', pct: m.availability_pct },
                        { label: 'P', pct: m.performance_pct },
                        { label: 'Q', pct: m.quality_pct },
                      ] as const).map((c) => (
                        <div key={c.label} className="text-center">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{c.label}</div>
                          <div className={`mt-1 text-sm font-semibold ${oeeColor(c.pct)}`}>{c.pct.toFixed(1)}%</div>
                          <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className={`h-1.5 rounded-full ${oeeBgColor(c.pct)}`}
                              style={{ width: `${Math.min(c.pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                No machine OEE data available.
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}

      {/* ===== LOSSES TAB ===== */}
      {tab === 'losses' ? (
        <div className="space-y-6">
          <PanelCard title="Six Big Losses" subtitle="The TPM framework's six loss categories ranked by impact in minutes lost.">
            {losses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {losses.map((loss, idx) => {
                  const cat = lossCategory(loss.category);
                  const barPct = Math.round((loss.minutes_lost / maxLossMinutes) * 100);
                  return (
                    <div key={loss.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{loss.name}</div>
                            <div className="mt-0.5">
                              <StatusPill label={cat.label} tone={cat.tone} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-50">{loss.minutes_lost}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">min lost</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-400">{loss.description}</div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            loss.category === 'availability' ? 'bg-rose-300'
                              : loss.category === 'performance' ? 'bg-amber-300'
                                : 'bg-violet-300'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-8 text-sm text-emerald-100">
                No loss data recorded for the current period.
              </div>
            )}
          </PanelCard>

          {/* Loss category summary */}
          <PanelCard title="Loss category totals" subtitle="Aggregate minutes lost per OEE component.">
            <div className="grid gap-3 sm:grid-cols-3">
              {(['availability', 'performance', 'quality'] as const).map((cat) => {
                const catLosses = losses.filter((l) => l.category === cat);
                const totalMin = catLosses.reduce((s, l) => s + l.minutes_lost, 0);
                const info = lossCategory(cat);
                return (
                  <SummaryTile
                    key={cat}
                    label={info.label}
                    value={`${totalMin} min`}
                    hint={`${catLosses.length} loss type${catLosses.length === 1 ? '' : 's'} contributing to ${info.label.toLowerCase()} drag.`}
                    accent={
                      cat === 'availability' ? 'from-rose-400/22 via-rose-300/8 to-transparent'
                        : cat === 'performance' ? 'from-amber-400/22 via-amber-300/8 to-transparent'
                          : 'from-violet-400/22 via-violet-300/8 to-transparent'
                    }
                  />
                );
              })}
            </div>
          </PanelCard>
        </div>
      ) : null}

      {/* ===== TRENDS TAB ===== */}
      {tab === 'trends' ? (
        <div className="space-y-6">
          <PanelCard title="OEE trend" subtitle="Rolling daily OEE with component breakdown. Displayed as a table since no charting library is wired.">
            <div className="mb-4 max-w-[200px]">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Period</div>
              <Select value={trendPeriod} onChange={(e) => setTrendPeriod(e.target.value as '30d' | '14d' | '7d')}>
                <option value="30d">Last 30 days</option>
                <option value="14d">Last 14 days</option>
                <option value="7d">Last 7 days</option>
              </Select>
            </div>

            {filteredTrends.length > 0 ? (
              <div className="overflow-x-auto rounded-[20px] border border-white/8">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.02]">
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">OEE</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Avail</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Perf</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Qual</th>
                      <th className="hidden px-4 py-3 sm:table-cell">
                        <span className="sr-only">Bar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrends.map((day) => (
                      <tr key={day.date} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-xs text-slate-300">{day.date}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${oeeColor(day.oee_pct)}`}>{day.oee_pct.toFixed(1)}%</td>
                        <td className={`px-4 py-2.5 text-right ${oeeColor(day.availability_pct)}`}>{day.availability_pct.toFixed(1)}%</td>
                        <td className={`px-4 py-2.5 text-right ${oeeColor(day.performance_pct)}`}>{day.performance_pct.toFixed(1)}%</td>
                        <td className={`px-4 py-2.5 text-right ${oeeColor(day.quality_pct)}`}>{day.quality_pct.toFixed(1)}%</td>
                        <td className="hidden w-32 px-4 py-2.5 sm:table-cell">
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className={`h-2 rounded-full ${oeeBgColor(day.oee_pct)}`}
                              style={{ width: `${Math.min(day.oee_pct, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                No trend data available for the selected period.
              </div>
            )}

            {/* Period averages */}
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {(() => {
                const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
                const avgOEE = avg(filteredTrends.map((d) => d.oee_pct));
                const avgA = avg(filteredTrends.map((d) => d.availability_pct));
                const avgP = avg(filteredTrends.map((d) => d.performance_pct));
                const avgQ = avg(filteredTrends.map((d) => d.quality_pct));
                return (
                  <>
                    <SummaryTile label="Avg OEE" value={`${avgOEE.toFixed(1)}%`} hint={`${filteredTrends.length}-day rolling average.`} accent={oeeTileAccent(avgOEE)} />
                    <SummaryTile label="Avg availability" value={`${avgA.toFixed(1)}%`} hint="Average availability over the period." accent={oeeTileAccent(avgA)} />
                    <SummaryTile label="Avg performance" value={`${avgP.toFixed(1)}%`} hint="Average performance over the period." accent={oeeTileAccent(avgP)} />
                    <SummaryTile label="Avg quality" value={`${avgQ.toFixed(1)}%`} hint="Average quality over the period." accent={oeeTileAccent(avgQ)} />
                  </>
                );
              })()}
            </div>
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}
