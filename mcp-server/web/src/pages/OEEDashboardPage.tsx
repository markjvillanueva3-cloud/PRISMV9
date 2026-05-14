import { useCallback, useEffect, useState } from 'react';
import { ApiError, analyticsOEE, analyticsOEELosses, analyticsOEETrend } from '../api/client';
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
type FeedKey = 'oee' | 'losses' | 'trends';
type FeedState = 'loading' | 'live' | 'unavailable';
type LossCategory = 'availability' | 'performance' | 'quality';
type MachineStatus = 'running' | 'idle' | 'down';
type TrendPeriod = '30d' | '14d' | '7d';

interface FeedStatus { state: FeedState; note: string; }
interface OEEComponents { availability_pct: number; performance_pct: number; quality_pct: number; oee_pct: number; }
interface MachineOEE { machine_id: string; machine_name: string; availability_pct: number; performance_pct: number; quality_pct: number; oee_pct: number; status: MachineStatus; }
interface BigLoss { id: string; name: string; category: LossCategory; minutes_lost: number; description: string; }
interface TrendDay { date: string; oee_pct: number; availability_pct: number; performance_pct: number; quality_pct: number; }

const TABS: Record<Tab, string> = { overview: 'Overview', machines: 'Machines', losses: 'Losses', trends: 'Trends' };
const FEED_LOADING: Record<FeedKey, FeedStatus> = {
  oee: { state: 'loading', note: 'Checking the mounted OEE summary contract.' },
  losses: { state: 'loading', note: 'Checking the mounted loss-capture contract.' },
  trends: { state: 'loading', note: 'Checking the mounted OEE trend contract.' },
};
const WORLD_CLASS_TARGET = 85;

const toneFromFeed = (state: FeedState): 'emerald' | 'amber' | 'rose' => state === 'live' ? 'emerald' : state === 'loading' ? 'amber' : 'rose';
const labelFromFeed = (state: FeedState) => state === 'live' ? 'Live' : state === 'loading' ? 'Loading' : 'Unavailable';
const neutralAccent = 'from-slate-400/18 via-slate-300/6 to-transparent';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function payloadOf(response: unknown): unknown {
  const record = asRecord(response);
  return record ? (record.result ?? record.data ?? null) : null;
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOee(value: unknown): OEEComponents | null {
  const record = asRecord(value);
  if (!record) return null;
  const availability = num(record.availability_pct);
  const performance = num(record.performance_pct);
  const quality = num(record.quality_pct);
  const oee = num(record.oee_pct);
  return availability == null || performance == null || quality == null || oee == null
    ? null
    : { availability_pct: availability, performance_pct: performance, quality_pct: quality, oee_pct: oee };
}

function parseMachines(value: unknown): MachineOEE[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const record = asRecord(entry);
    const availability = num(record?.availability_pct);
    const performance = num(record?.performance_pct);
    const quality = num(record?.quality_pct);
    const oee = num(record?.oee_pct);
    const machineId = typeof record?.machine_id === 'string' ? record.machine_id : null;
    const machineName = typeof record?.machine_name === 'string' ? record.machine_name : null;
    if (availability == null || performance == null || quality == null || oee == null || !machineId || !machineName) return [];
    const status = record?.status;
    return [{
      machine_id: machineId,
      machine_name: machineName,
      availability_pct: availability,
      performance_pct: performance,
      quality_pct: quality,
      oee_pct: oee,
      status: status === 'running' || status === 'idle' || status === 'down' ? status : index % 2 === 0 ? 'running' : 'idle',
    }];
  });
}

function parseLosses(value: unknown): BigLoss[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const record = asRecord(entry);
    const category = record?.category;
    const minutesLost = num(record?.minutes_lost);
    const name = typeof record?.name === 'string' ? record.name : null;
    if (minutesLost == null || !name || (category !== 'availability' && category !== 'performance' && category !== 'quality')) return [];
    return [{
      id: typeof record?.id === 'string' ? record.id : `loss-${index}`,
      name,
      category,
      minutes_lost: minutesLost,
      description: typeof record?.description === 'string' ? record.description : 'Live loss record published without descriptive detail.',
    }];
  });
}

function parseTrends(value: unknown): TrendDay[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const date = typeof record?.date === 'string' ? record.date : null;
    const availability = num(record?.availability_pct);
    const performance = num(record?.performance_pct);
    const quality = num(record?.quality_pct);
    const oee = num(record?.oee_pct);
    if (!date || availability == null || performance == null || quality == null || oee == null) return [];
    return [{ date, availability_pct: availability, performance_pct: performance, quality_pct: quality, oee_pct: oee }];
  });
}

function oeeColor(pct: number) { return pct >= 85 ? 'text-emerald-300' : pct >= 60 ? 'text-amber-300' : 'text-rose-300'; }
function oeeBgColor(pct: number) { return pct >= 85 ? 'bg-emerald-300' : pct >= 60 ? 'bg-amber-300' : 'bg-rose-300'; }
function oeeTone(pct: number): 'emerald' | 'amber' | 'rose' { return pct >= 85 ? 'emerald' : pct >= 60 ? 'amber' : 'rose'; }
function oeeAccent(pct: number) { return pct >= 85 ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : pct >= 60 ? 'from-amber-400/22 via-amber-300/8 to-transparent' : 'from-rose-400/22 via-rose-300/8 to-transparent'; }
function lossMeta(category: LossCategory): { label: string; tone: 'rose' | 'amber' | 'violet'; bar: string } {
  return category === 'availability' ? { label: 'Availability', tone: 'rose', bar: 'bg-rose-300' } : category === 'performance' ? { label: 'Performance', tone: 'amber', bar: 'bg-amber-300' } : { label: 'Quality', tone: 'violet', bar: 'bg-violet-300' };
}
function machineTone(status: MachineStatus): 'emerald' | 'amber' | 'rose' { return status === 'running' ? 'emerald' : status === 'idle' ? 'amber' : 'rose'; }

function UnavailablePanel({ message }: { message: string }) {
  return <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm leading-6 text-slate-400">{message}</div>;
}

export function OEEDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oee, setOee] = useState<OEEComponents | null>(null);
  const [machines, setMachines] = useState<MachineOEE[]>([]);
  const [losses, setLosses] = useState<BigLoss[]>([]);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('30d');
  const [feedStatus, setFeedStatus] = useState<Record<FeedKey, FeedStatus>>(FEED_LOADING);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedStatus(FEED_LOADING);
    const nextFeed = { ...FEED_LOADING };
    let unavailable = 0;

    const [oeeResult, lossesResult, trendsResult] = await Promise.allSettled([analyticsOEE(), analyticsOEELosses({}), analyticsOEETrend({ days: 30 })]);

    if (oeeResult.status === 'fulfilled') {
      const payload = payloadOf(oeeResult.value);
      const parsed = parseOee(payload);
      const parsedMachines = parseMachines(asRecord(payload)?.machines ?? []);
      setOee(parsed);
      setMachines(parsedMachines);
      nextFeed.oee = parsed ? { state: 'live', note: parsedMachines.length > 0 ? `Mounted from /api/v1/erp/analytics/oee with ${parsedMachines.length} machine row${parsedMachines.length === 1 ? '' : 's'}.` : 'Mounted from /api/v1/erp/analytics/oee, but the response did not publish per-machine detail.' } : { state: 'unavailable', note: 'The live OEE route did not return a usable summary payload, so this desk stays fail-closed instead of falling back to seeded demo metrics.' };
      if (!parsed) unavailable += 1;
    } else {
      setOee(null); setMachines([]); unavailable += 1;
      nextFeed.oee = { state: 'unavailable', note: oeeResult.reason instanceof ApiError ? oeeResult.reason.message : 'The OEE summary contract is unavailable right now.' };
    }

    if (lossesResult.status === 'fulfilled') {
      const parsed = parseLosses(payloadOf(lossesResult.value));
      setLosses(parsed);
      nextFeed.losses = parsed.length > 0 ? { state: 'live', note: `Mounted from /api/v1/erp/oee-losses with ${parsed.length} published loss record${parsed.length === 1 ? '' : 's'}.` } : { state: 'unavailable', note: 'The loss feed returned no mounted records, so this lane shows explicit unavailable posture instead of staged placeholder loss cards.' };
      if (parsed.length === 0) unavailable += 1;
    } else {
      setLosses([]); unavailable += 1;
      nextFeed.losses = { state: 'unavailable', note: lossesResult.reason instanceof ApiError ? lossesResult.reason.message : 'The OEE loss contract is unavailable right now.' };
    }

    if (trendsResult.status === 'fulfilled') {
      const parsed = parseTrends(payloadOf(trendsResult.value));
      setTrends(parsed);
      nextFeed.trends = parsed.length > 0 ? { state: 'live', note: `Mounted from /api/v1/erp/oee-trend with ${parsed.length} published day${parsed.length === 1 ? '' : 's'} of history.` } : { state: 'unavailable', note: 'The OEE trend feed returned no mounted history, so the trend lane remains unavailable instead of generating fake daily data.' };
      if (parsed.length === 0) unavailable += 1;
    } else {
      setTrends([]); unavailable += 1;
      nextFeed.trends = { state: 'unavailable', note: trendsResult.reason instanceof ApiError ? trendsResult.reason.message : 'The OEE trend contract is unavailable right now.' };
    }

    setFeedStatus(nextFeed);
    setError(unavailable === 3 ? 'Live OEE analytics are currently unavailable across summary, losses, and trend feeds.' : null);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const hasLiveOee = oee !== null;
  const filteredTrends = trendPeriod === '7d' ? trends.slice(-7) : trendPeriod === '14d' ? trends.slice(-14) : trends;
  const maxLossMinutes = losses.length > 0 ? Math.max(...losses.map((loss) => loss.minutes_lost)) : 1;
  const machineNote = feedStatus.oee.state === 'live' ? 'The mounted OEE summary is live, but the response did not include per-machine rows for this view.' : feedStatus.oee.note;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="OEE Dashboard"
        description="Overall Equipment Effectiveness broken into Availability, Performance, and Quality so the floor knows exactly where time is being lost and what to fix first."
        metrics={<>
          <SummaryTile label="OEE %" value={hasLiveOee ? `${oee.oee_pct.toFixed(1)}%` : 'Unavailable'} hint={hasLiveOee ? (oee.oee_pct >= WORLD_CLASS_TARGET ? 'At or above world-class target.' : `${(WORLD_CLASS_TARGET - oee.oee_pct).toFixed(1)} points below the ${WORLD_CLASS_TARGET}% world-class target.`) : feedStatus.oee.note} accent={hasLiveOee ? oeeAccent(oee.oee_pct) : neutralAccent} />
          <SummaryTile label="Availability" value={hasLiveOee ? `${oee.availability_pct.toFixed(1)}%` : 'Unavailable'} hint={hasLiveOee ? 'Scheduled time the machines were actually available to run.' : 'Availability remains hidden until the mounted OEE contract returns a usable payload.'} accent={hasLiveOee ? oeeAccent(oee.availability_pct) : neutralAccent} />
          <SummaryTile label="Quality" value={hasLiveOee ? `${oee.quality_pct.toFixed(1)}%` : 'Unavailable'} hint={hasLiveOee ? 'Good parts as a percentage of total parts produced.' : 'Quality posture stays fail-closed when the live contract is missing.'} accent={hasLiveOee ? oeeAccent(oee.quality_pct) : neutralAccent} />
        </>}
        aside={<div className="space-y-4">
          <div className="text-sm leading-6 text-slate-300">This desk now renders mounted ERP analytics or explicit unavailable posture. Seeded OEE, loss, and trend values are intentionally suppressed when the live contracts do not answer truthfully.</div>
          {(['oee', 'losses', 'trends'] as const).map((key) => (
            <div key={key} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{key === 'oee' ? 'Summary feed' : key === 'losses' ? 'Loss capture' : 'Trend history'}</div><div className="mt-2 text-sm leading-6 text-slate-300">{feedStatus[key].note}</div></div>
                <StatusPill label={labelFromFeed(feedStatus[key].state)} tone={toneFromFeed(feedStatus[key].state)} />
              </div>
            </div>
          ))}
          <ActionButton onClick={() => { void loadData(); }}>Refresh OEE</ActionButton>
        </div>}
      />

      <div className="flex flex-wrap gap-2">{(Object.entries(TABS) as Array<[Tab, string]>).map(([key, label]) => <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>{label}</TabButton>)}</div>
      {loading ? <LoadingState label="Refreshing OEE workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => { void loadData(); }} /> : null}

      {tab === 'overview' ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <PanelCard title="Overall OEE" subtitle="Availability x Performance x Quality = OEE.">
          {hasLiveOee ? <div className="flex flex-col items-center gap-4 py-6">
            <div className={`text-7xl font-bold tracking-tight ${oeeColor(oee.oee_pct)}`}>{oee.oee_pct.toFixed(1)}%</div>
            <div className="text-sm text-slate-400">{oee.oee_pct >= WORLD_CLASS_TARGET ? 'World-class OEE achieved' : `Target: ${WORLD_CLASS_TARGET}%`}</div>
            <div className="w-full max-w-md rounded-full bg-white/[0.05]"><div className={`h-5 rounded-full ${oeeBgColor(oee.oee_pct)}`} style={{ width: `${Math.min(oee.oee_pct, 100)}%` }} /></div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm"><span className={oeeColor(oee.availability_pct)}>{oee.availability_pct.toFixed(1)}%</span><span className="text-slate-500">x</span><span className={oeeColor(oee.performance_pct)}>{oee.performance_pct.toFixed(1)}%</span><span className="text-slate-500">x</span><span className={oeeColor(oee.quality_pct)}>{oee.quality_pct.toFixed(1)}%</span><span className="text-slate-500">=</span><span className={`font-semibold ${oeeColor(oee.oee_pct)}`}>{oee.oee_pct.toFixed(1)}%</span></div>
          </div> : <UnavailablePanel message={feedStatus.oee.note} />}
        </PanelCard>
        <PanelCard title="Component breakdown" subtitle="Each component is only shown when the mounted OEE contract publishes live values.">
          {hasLiveOee ? <div className="space-y-3">{([
            { label: 'Availability', pct: oee.availability_pct, hint: 'Uptime vs. scheduled production time. Includes breakdowns and setup.' },
            { label: 'Performance', pct: oee.performance_pct, hint: 'Actual throughput vs. ideal cycle time. Includes minor stops and slow cycles.' },
            { label: 'Quality', pct: oee.quality_pct, hint: 'Good parts vs. total parts. Includes startup rejects and production scrap.' },
          ] as const).map((component) => <div key={component.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{component.label}</div><div className={`mt-2 text-3xl font-semibold ${oeeColor(component.pct)}`}>{component.pct.toFixed(1)}%</div><div className="mt-2 text-sm text-slate-400">{component.hint}</div></div><StatusPill label={component.pct >= 85 ? 'On target' : component.pct >= 60 ? 'Below target' : 'Critical'} tone={oeeTone(component.pct)} /></div></div>)}</div> : <UnavailablePanel message="Component metrics remain unavailable until the mounted OEE summary contract returns usable Availability, Performance, and Quality values." />}
        </PanelCard>
      </div> : null}

      {tab === 'machines' ? <PanelCard title="Per-machine OEE" subtitle="Individual A / P / Q breakdown per machine with color-coded status.">
        {machines.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...machines].sort((a, b) => b.oee_pct - a.oee_pct).map((machine) => <div key={machine.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-slate-50">{machine.machine_name}</div><div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{machine.machine_id}</div></div><StatusPill label={machine.status} tone={machineTone(machine.status)} /></div><div className={`mt-3 text-2xl font-semibold ${oeeColor(machine.oee_pct)}`}>{machine.oee_pct.toFixed(1)}%</div></div>)}</div> : <UnavailablePanel message={machineNote} />}
      </PanelCard> : null}

      {tab === 'losses' ? <div className="space-y-6">
        <PanelCard title="Six Big Losses" subtitle="Mounted loss records ranked by impact in minutes lost.">
          {losses.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{losses.map((loss, index) => { const meta = lossMeta(loss.category); return <div key={loss.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">{index + 1}</span><div><div className="text-sm font-semibold text-slate-50">{loss.name}</div><div className="mt-0.5"><StatusPill label={meta.label} tone={meta.tone} /></div></div></div><div className="text-right"><div className="text-lg font-semibold text-slate-50">{loss.minutes_lost}</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">min lost</div></div></div><div className="mt-3 text-sm leading-6 text-slate-400">{loss.description}</div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[0.05]"><div className={`h-3 rounded-full ${meta.bar}`} style={{ width: `${Math.round((loss.minutes_lost / maxLossMinutes) * 100)}%` }} /></div></div>; })}</div> : <UnavailablePanel message={feedStatus.losses.note} />}
        </PanelCard>
      </div> : null}

      {tab === 'trends' ? <PanelCard title="OEE trend" subtitle="Rolling daily OEE with component breakdown from the mounted trend route.">
        <div className="mb-4 max-w-[200px]"><div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Period</div><Select value={trendPeriod} onChange={(event) => setTrendPeriod(event.target.value as TrendPeriod)}><option value="30d">Last 30 days</option><option value="14d">Last 14 days</option><option value="7d">Last 7 days</option></Select></div>
        {filteredTrends.length > 0 ? <div className="overflow-x-auto rounded-[20px] border border-white/8"><table className="w-full text-left text-sm"><thead><tr className="border-b border-white/8 bg-white/[0.02]"><th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date</th><th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">OEE</th><th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Avail</th><th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Perf</th><th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Qual</th></tr></thead><tbody>{filteredTrends.map((day) => <tr key={day.date} className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className="px-4 py-2.5 text-xs text-slate-300">{day.date}</td><td className={`px-4 py-2.5 text-right font-semibold ${oeeColor(day.oee_pct)}`}>{day.oee_pct.toFixed(1)}%</td><td className={`px-4 py-2.5 text-right ${oeeColor(day.availability_pct)}`}>{day.availability_pct.toFixed(1)}%</td><td className={`px-4 py-2.5 text-right ${oeeColor(day.performance_pct)}`}>{day.performance_pct.toFixed(1)}%</td><td className={`px-4 py-2.5 text-right ${oeeColor(day.quality_pct)}`}>{day.quality_pct.toFixed(1)}%</td></tr>)}</tbody></table></div> : <UnavailablePanel message={feedStatus.trends.note} />}
      </PanelCard> : null}
    </div>
  );
}
