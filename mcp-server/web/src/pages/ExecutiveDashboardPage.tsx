import { useCallback, useEffect, useState } from 'react';
import { ApiError, glIncomeStatement, operationsKPIs } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  PanelCard,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type FeedKey = 'finance' | 'operations';
type FeedState = 'loading' | 'live' | 'unavailable';

interface FeedStatus {
  state: FeedState;
  note: string;
}

interface PLSummary {
  revenue: number;
  cogs: number;
  gross_margin_pct: number;
  operating_expenses: number;
  ebitda: number;
  net_income: number;
}

interface OpsKPIs {
  oee_avg_pct: number;
  on_time_delivery_pct: number;
  scrap_rate_pct: number;
  jobs_completed_mtd: number;
  jobs_in_progress: number;
  headcount_active: number;
}

const FEED_LOADING: Record<FeedKey, FeedStatus> = {
  finance: {
    state: 'loading',
    note: 'Checking the mounted ledger summary contract.',
  },
  operations: {
    state: 'loading',
    note: 'Checking the mounted operations KPI contract.',
  },
};

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

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

function parsePLSummary(value: unknown): PLSummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const revenue = num(record.total_revenue ?? record.revenue);
  const operatingExpenses = num(record.total_expenses ?? record.operating_expenses);
  const cogs = num(record.cogs ?? record.total_cogs) ?? 0;
  const netIncome = num(record.net_income);
  const grossMarginPercent = num(record.gross_margin_pct);

  if (revenue == null || operatingExpenses == null) {
    return null;
  }

  const resolvedNetIncome = netIncome ?? revenue - operatingExpenses;
  const resolvedGrossMarginPercent = grossMarginPercent ?? (revenue > 0 ? (resolvedNetIncome / revenue) * 100 : 0);

  return {
    revenue,
    cogs,
    gross_margin_pct: resolvedGrossMarginPercent,
    operating_expenses: operatingExpenses,
    ebitda: resolvedNetIncome,
    net_income: resolvedNetIncome,
  };
}

function parseOperationsSummary(value: unknown): OpsKPIs | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const oee = num(record.oee_avg_pct);
  const onTimeDelivery = num(record.on_time_delivery_pct);
  const scrapRate = num(record.scrap_rate_pct);
  const jobsCompleted = num(record.jobs_completed_mtd);
  const jobsInProgress = num(record.jobs_in_progress);
  const headcount = num(record.headcount_active);

  if (
    oee == null
    || onTimeDelivery == null
    || scrapRate == null
    || jobsCompleted == null
    || jobsInProgress == null
    || headcount == null
  ) {
    return null;
  }

  return {
    oee_avg_pct: oee,
    on_time_delivery_pct: onTimeDelivery,
    scrap_rate_pct: scrapRate,
    jobs_completed_mtd: jobsCompleted,
    jobs_in_progress: jobsInProgress,
    headcount_active: headcount,
  };
}

function feedTone(state: FeedState): 'emerald' | 'amber' | 'rose' {
  if (state === 'live') return 'emerald';
  if (state === 'loading') return 'amber';
  return 'rose';
}

function feedLabel(state: FeedState) {
  if (state === 'live') return 'Live';
  if (state === 'loading') return 'Loading';
  return 'Unavailable';
}

function UnavailablePanel({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm leading-6 text-slate-400">
      {message}
    </div>
  );
}

export function ExecutiveDashboardPage() {
  const [pl, setPL] = useState<PLSummary | null>(null);
  const [ops, setOps] = useState<OpsKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedStatus, setFeedStatus] = useState<Record<FeedKey, FeedStatus>>(FEED_LOADING);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedStatus(FEED_LOADING);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);
    const nextFeedStatus = { ...FEED_LOADING };
    let unavailableCount = 0;

    const [financeResult, operationsResult] = await Promise.allSettled([
      glIncomeStatement({ period_start: periodStart, period_end: periodEnd }),
      operationsKPIs(),
    ]);

    if (financeResult.status === 'fulfilled') {
      const parsed = parsePLSummary(payloadOf(financeResult.value));
      setPL(parsed);
      nextFeedStatus.finance = parsed
        ? {
          state: 'live',
          note: `Mounted from /api/v1/erp/gl-income-statement for ${periodStart} through ${periodEnd}.`,
        }
        : {
          state: 'unavailable',
          note: 'The live ledger route returned no usable month-to-date summary, so the finance lane stays unavailable instead of staging placeholder numbers.',
        };
      if (!parsed) {
        unavailableCount += 1;
      }
    } else {
      setPL(null);
      unavailableCount += 1;
      nextFeedStatus.finance = {
        state: 'unavailable',
        note: financeResult.reason instanceof ApiError
          ? financeResult.reason.message
          : 'The ledger summary contract is unavailable right now.',
      };
    }

    if (operationsResult.status === 'fulfilled') {
      const parsed = parseOperationsSummary(payloadOf(operationsResult.value));
      setOps(parsed);
      nextFeedStatus.operations = parsed
        ? {
          state: 'live',
          note: 'Mounted from /api/v1/erp/operations-kpis with current OEE, delivery, scrap, and workforce posture.',
        }
        : {
          state: 'unavailable',
          note: 'The operations KPI route returned no usable leadership snapshot, so this desk suppresses generic fallback KPIs.',
        };
      if (!parsed) {
        unavailableCount += 1;
      }
    } else {
      setOps(null);
      unavailableCount += 1;
      nextFeedStatus.operations = {
        state: 'unavailable',
        note: operationsResult.reason instanceof ApiError
          ? operationsResult.reason.message
          : 'The operations KPI contract is unavailable right now.',
      };
    }

    setFeedStatus(nextFeedStatus);
    setError(
      unavailableCount === 2
        ? 'Executive finance and operations feeds are both unavailable right now.'
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Executive view"
        title="Executive Dashboard"
        description="Financial and operational KPIs for leadership review. Revenue, margins, OEE, delivery, and workforce at a glance."
        metrics={
          <>
            <SummaryTile
              label="Revenue MTD"
              value={pl ? money(pl.revenue) : 'Unavailable'}
              hint={pl ? 'Month-to-date top-line revenue from the mounted ledger route.' : feedStatus.finance.note}
            />
            <SummaryTile
              label="Gross Margin"
              value={pl ? pct(pl.gross_margin_pct) : 'Unavailable'}
              hint={pl ? 'Revenue minus cost posture from the live P&L summary.' : 'Gross margin stays hidden until the mounted ledger route returns a usable summary.'}
              accent={pl ? 'from-emerald-400/22 via-emerald-300/10 to-transparent' : 'from-slate-400/18 via-slate-300/6 to-transparent'}
            />
            <SummaryTile
              label="Ops Snapshot"
              value={ops ? pct(ops.oee_avg_pct) : 'Unavailable'}
              hint={ops ? 'Average OEE from the mounted operations KPI snapshot.' : feedStatus.operations.note}
              accent={ops ? 'from-cyan-400/22 via-cyan-300/10 to-transparent' : 'from-slate-400/18 via-slate-300/6 to-transparent'}
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              This desk now renders the mounted executive feeds or explicit unavailable posture. Leadership numbers are no longer implied through raw browser fetches or silent null fallback.
            </div>
            {([
              { key: 'finance' as const, label: 'Finance feed' },
              { key: 'operations' as const, label: 'Operations feed' },
            ]).map((item) => (
              <div key={item.key} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{feedStatus[item.key].note}</div>
                  </div>
                  <StatusPill label={feedLabel(feedStatus[item.key].state)} tone={feedTone(feedStatus[item.key].state)} />
                </div>
              </div>
            ))}
            <ActionButton onClick={() => { void loadData(); }}>Refresh executive feeds</ActionButton>
          </div>
        }
      />

      {loading ? <LoadingState label="Refreshing executive dashboard..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => { void loadData(); }} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="P&L Summary (MTD)" subtitle="Current month revenue, expense, and net posture from the live ledger route.">
          {pl ? (
            <div className="grid gap-3">
              {[
                { label: 'Revenue', value: money(pl.revenue) },
                { label: 'COGS', value: money(pl.cogs) },
                { label: 'Gross Margin', value: pct(pl.gross_margin_pct) },
                { label: 'Operating Expenses', value: money(pl.operating_expenses) },
                { label: 'EBITDA', value: money(pl.ebitda) },
                { label: 'Net Income', value: money(pl.net_income) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2.5">
                  <span className="text-sm text-slate-400">{row.label}</span>
                  <span className="font-mono text-sm font-semibold text-slate-100">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <UnavailablePanel message={feedStatus.finance.note} />
          )}
        </PanelCard>

        <PanelCard title="Operations KPIs" subtitle="Manufacturing performance at a glance from the mounted operations route.">
          {ops ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="OEE Average" value={pct(ops.oee_avg_pct)} hint="Overall equipment effectiveness." accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
              <SummaryTile label="On-Time Delivery" value={pct(ops.on_time_delivery_pct)} hint="Jobs delivered by due date." accent="from-sky-400/22 via-sky-300/10 to-transparent" />
              <SummaryTile label="Scrap Rate" value={pct(ops.scrap_rate_pct)} hint="Parts scrapped vs produced." accent="from-amber-400/22 via-amber-300/10 to-transparent" />
              <SummaryTile label="Jobs Completed" value={String(ops.jobs_completed_mtd)} hint="Month-to-date completed jobs." />
              <SummaryTile label="In Progress" value={String(ops.jobs_in_progress)} hint="Jobs currently active." accent="from-violet-400/22 via-violet-300/10 to-transparent" />
              <SummaryTile label="Headcount" value={String(ops.headcount_active)} hint="Active employees on roster." accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
            </div>
          ) : (
            <UnavailablePanel message={feedStatus.operations.note} />
          )}
        </PanelCard>
      </div>
    </div>
  );
}
