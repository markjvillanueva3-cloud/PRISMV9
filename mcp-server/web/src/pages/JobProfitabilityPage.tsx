import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  actualCostForecast,
  actualCostMarginAlerts,
  getJobProfitability,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  firstText,
  formatJsonPreview,
  formatMoney,
  formatPercent,
  payloadOf,
} from './recovery/recoveryUtils';

export function JobProfitabilityPage() {
  const [jobId, setJobId] = useState('JOB-4821');
  const [periods, setPeriods] = useState('6');
  const [thresholdPct, setThresholdPct] = useState('12');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profitability, setProfitability] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [forecasts, setForecasts] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profitabilityResponse, alertResponse, forecastResponse] = await Promise.all([
        getJobProfitability({ job_id: jobId }),
        actualCostMarginAlerts({ threshold_pct: Number(thresholdPct) || 12 }),
        actualCostForecast({ periods: Number(periods) || 6 }),
      ]);

      setProfitability(asRecord(payloadOf(profitabilityResponse)));
      setAlerts(arrayFromPayload(alertResponse, ['alerts', 'items', 'jobs']));
      setForecasts(arrayFromPayload(forecastResponse, ['forecasts', 'items', 'periods']));
    } catch (issue) {
      setProfitability(null);
      setAlerts([]);
      setForecasts([]);
      setError(errorMessage(issue, 'The profitability desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, [jobId, periods, thresholdPct]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const marginPercent = firstNumber(profitability ?? {}, ['margin_percent']);
  const profit = firstNumber(profitability ?? {}, ['profit']);
  const revenue = firstNumber(profitability ?? {}, ['revenue']);
  const costBreakdown = Array.isArray(profitability?.cost_breakdown)
    ? profitability.cost_breakdown.flatMap((entry) => {
      const record = asRecord(entry);
      return record ? [record] : [];
    })
    : [];

  const metrics = useMemo(() => ([
    {
      label: 'Margin',
      value: formatPercent(marginPercent),
      hint: jobId,
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Profit',
      value: formatMoney(profit),
      hint: `Revenue ${formatMoney(revenue)}`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Margin Alerts',
      value: String(alerts.length),
      hint: `${thresholdPct}% threshold`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Forecast Periods',
      value: String(forecasts.length),
      hint: `${periods} period outlook`,
      accent: 'from-violet-400/22 via-violet-300/10 to-transparent',
    },
  ]), [alerts.length, forecasts.length, jobId, marginPercent, periods, profit, revenue, thresholdPct]);

  const aiContext = useMemo(() => ({
    workspace: 'job-profitability',
    appw_stage: 'APPW-MS0 finance posture',
    job_id: jobId,
    threshold_pct: Number(thresholdPct) || 12,
    forecast_periods: Number(periods) || 6,
    profitability,
    alerts,
    forecasts,
  }), [alerts, forecasts, jobId, periods, profitability, thresholdPct]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Finance intelligence"
      title="Job Profitability"
      description="This APPW desk was rebuilt as a source-aware profitability surface so leads can review margin posture, forecast drift, and alert thresholds without routing into corrupted frontend code."
      surfaces={['commerce', 'jobDesk']}
      metrics={metrics}
      aiSummary="Kienzle AI can translate current job margin posture, forecast drift, and alert thresholds into plain-language action for estimating, operations, and leadership."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'margin-brief',
          label: 'Summarize job margin risk',
          query: `Summarize the current profitability posture for ${jobId} and tell the lead what to do next.`,
        },
        {
          id: 'forecast-review',
          label: 'Explain forecast drift',
          query: `Explain the likely cost drift and forecast risk for ${jobId} over the next ${periods} periods.`,
        },
        {
          id: 'alert-tuning',
          label: 'Tune the alert threshold',
          query: `Given the current alert count and margin posture, should the profitability alert threshold stay at ${thresholdPct}%?`,
        },
      ]}
    >
      <PanelCard
        title="Live profitability posture"
        subtitle="Mounted against the ERP profitability, forecast, and margin-alert routes."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Job ID">
              <Input value={jobId} onChange={(event) => setJobId(event.target.value)} />
            </Field>
            <Field label="Forecast Periods">
              <Input value={periods} onChange={(event) => setPeriods(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Alert Threshold %">
              <Input value={thresholdPct} onChange={(event) => setThresholdPct(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <div className="flex items-end">
            <ActionButton onClick={() => void loadDesk()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh desk'}
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`Alerts ${alerts.length}`} tone={alerts.length > 0 ? 'amber' : 'sky'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard
        title="Cost stack"
        subtitle="Revenue and cost breakdown from the mounted profitability response."
      >
        <div className="grid gap-3">
          {costBreakdown.length > 0 ? costBreakdown.map((entry, index) => (
            <div key={`${firstText(entry, ['category'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">{firstText(entry, ['category']) || 'Unlabeled cost bucket'}</div>
              <div className="mt-1 text-slate-400">{formatMoney(firstNumber(entry, ['amount']))}</div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
              No cost buckets were exposed in the current response.
            </div>
          )}
        </div>
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard
          title="Margin alerts"
          subtitle="Jobs that crossed the mounted profitability threshold."
        >
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['job_id', 'jobId'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['job_id', 'jobId', 'customer']) || `Alert ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">
                  {firstText(entry, ['message', 'reason']) || formatJsonPreview(entry)}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No margin alerts are mounted for the current threshold.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard
          title="Forecast outlook"
          subtitle="Forward-looking cost forecast periods from the mounted route."
        >
          <div className="space-y-3">
            {forecasts.length > 0 ? forecasts.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['period'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['period']) || `Period ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">
                  Cost {formatMoney(firstNumber(entry, ['projected_cost']))} | Margin {formatPercent(firstNumber(entry, ['projected_margin_pct']))}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                Forecast periods are not available in the current response.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default JobProfitabilityPage;
