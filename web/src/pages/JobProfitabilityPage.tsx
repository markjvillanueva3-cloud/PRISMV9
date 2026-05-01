import { useState } from 'react';
import {
  actualCostForecast,
  actualCostMarginAlerts,
  financialBreakeven,
  getJobProfitability,
  ApiError,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { ActualVsEstimate, BreakevenResult, CostForecast, JobProfitability, MarginAlert } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'profitability' | 'forecast' | 'alerts' | 'breakeven';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  profitability: { label: 'Job analysis', detail: 'Estimated vs actual cost posture for a single live job.' },
  forecast: { label: 'Forecast', detail: 'Forward-looking cost and margin posture over the next periods.' },
  alerts: { label: 'Margin alerts', detail: 'Low-margin and negative-margin jobs needing attention.' },
  breakeven: { label: 'Breakeven', detail: 'Unit and revenue threshold modeling for the current pricing posture.' },
};

function varianceTone(percent: number): string {
  if (percent <= -10) return 'text-emerald-300';
  if (percent <= 5) return 'text-slate-200';
  if (percent <= 15) return 'text-amber-200';
  return 'text-rose-200';
}

export function JobProfitabilityPage() {
  const [tab, setTab] = useState<Tab>('profitability');
  const [jobId, setJobId] = useState('');
  const [profitability, setProfitability] = useState<JobProfitability | null>(null);
  const [variances, setVariances] = useState<ActualVsEstimate[]>([]);
  const [forecasts, setForecasts] = useState<CostForecast[]>([]);
  const [marginAlerts, setMarginAlerts] = useState<MarginAlert[]>([]);
  const [breakeven, setBreakeven] = useState<BreakevenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTab = TAB_CONFIG[tab];

  async function handleAnalyze() {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getJobProfitability({ job_id: jobId });
      const data = (response.result as { profitability: JobProfitability; variances: ActualVsEstimate[] }) ?? null;
      setProfitability(data?.profitability ?? null);
      setVariances(data?.variances ?? []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Profitability analysis failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadForecast() {
    setLoading(true);
    setError(null);
    try {
      const response = await actualCostForecast({ periods: 6 });
      const next = (response.result as any)?.forecasts ?? (response.result as any) ?? [];
      setForecasts(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Forecast load failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    try {
      const response = await actualCostMarginAlerts({ threshold_pct: 15 });
      const next = (response.result as any)?.alerts ?? (response.result as any) ?? [];
      setMarginAlerts(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Margin alert load failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadBreakeven() {
    setLoading(true);
    setError(null);
    try {
      const response = await financialBreakeven({
        fixed_costs: 50000,
        unit_price: 150,
        variable_cost_per_unit: 85,
      });
      setBreakeven((response.result as unknown as BreakevenResult) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Breakeven load failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Commercial intelligence"
        title="Job Profitability"
        description="Compare estimate posture against real cost, watch margin drift, and stage breakeven decisions from a single commercial review desk."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Current margin"
              value={profitability ? `${profitability.margin_percent.toFixed(1)}%` : 'Standby'}
              hint="Live gross margin from the last job analysis."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Alert posture"
              value={String(marginAlerts.length)}
              hint="Jobs currently breaching or trending toward the floor."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this desk to move from estimate review into margin protection and breakeven planning without switching between disconnected finance widgets.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('profitability')}>Analyze job</ActionButton>
              <ActionButton tone="emerald" onClick={() => { setTab('alerts'); void loadAlerts(); }}>
                Load alerts
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton
            key={key}
            active={tab === key}
            onClick={() => {
              setTab(key);
              if (key === 'forecast') void loadForecast();
              if (key === 'alerts') void loadAlerts();
              if (key === 'breakeven') void loadBreakeven();
            }}
          >
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing profitability workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'profitability' ? handleAnalyze : undefined} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)]">
        <div className="space-y-6">
          {tab === 'profitability' ? (
            <>
              <PanelCard title="Run job analysis" subtitle="Load a job and keep estimate-vs-actual posture in one focused lane.">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label="Job ID">
                    <Input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="JOB-2026-001" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleAnalyze}>Analyze job</ActionButton>
                  </div>
                </div>
              </PanelCard>

              {profitability ? (
                <>
                  <PanelCard title="Margin summary" subtitle="Revenue, cost, profit, and margin staged above the deeper variance board.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile label="Revenue" value={`$${profitability.revenue.toFixed(2)}`} hint="Quoted or realized revenue on the job." />
                      <SummaryTile label="Total cost" value={`$${profitability.total_cost.toFixed(2)}`} hint="Aggregated actual cost." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                      <SummaryTile label="Profit" value={`$${profitability.profit.toFixed(2)}`} hint="Contribution after cost." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
                      <SummaryTile label="Margin" value={`${profitability.margin_percent.toFixed(1)}%`} hint="Current gross margin posture." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                    </div>
                  </PanelCard>

                  <PanelCard title="Cost breakdown" subtitle="See which categories are carrying the job before opening the variance table.">
                    <div className="space-y-3">
                      {profitability.cost_breakdown.map((item) => {
                        const percent = profitability.total_cost > 0 ? (item.amount / profitability.total_cost) * 100 : 0;
                        return (
                          <div key={item.category} className="grid grid-cols-[128px_minmax(0,1fr)_96px] items-center gap-3">
                            <div className="text-sm text-slate-300">{item.category}</div>
                            <div className="h-4 overflow-hidden rounded-full bg-white/8">
                              <div className="h-4 rounded-full bg-cyan-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                            </div>
                            <div className="text-right text-sm font-mono text-slate-100">${item.amount.toFixed(2)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </PanelCard>

                  <PanelCard title="Estimate vs actual variance" subtitle="Read variance as an operating signal, not just an accounting table.">
                    <div className="space-y-3">
                      {variances.length > 0 ? (
                        variances.map((entry) => (
                          <div key={entry.category} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="text-sm font-semibold text-slate-50">{entry.category}</div>
                              <div className={`text-sm font-mono font-semibold ${varianceTone(entry.variance_percent)}`}>
                                {entry.variance_percent >= 0 ? '+' : ''}
                                {entry.variance_percent.toFixed(1)}%
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                              <div>
                                <span className="text-slate-500">Estimated:</span> ${entry.estimated.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-slate-500">Actual:</span> ${entry.actual.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-slate-500">Variance:</span> {entry.variance >= 0 ? '+' : ''}${entry.variance.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                          Run a job analysis to stage the variance board.
                        </div>
                      )}
                    </div>
                  </PanelCard>
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'forecast' ? (
            <PanelCard title="Cost forecast" subtitle="Forward-looking margin posture for the next reporting periods.">
              <div className="space-y-3">
                {forecasts.length > 0 ? (
                  forecasts.map((forecast) => (
                    <div key={forecast.period} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{forecast.period}</div>
                        <div className="text-sm text-slate-300">{forecast.trend}</div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Projected cost:</span> ${forecast.projected_cost.toLocaleString()}
                        </div>
                        <div>
                          <span className="text-slate-500">Projected revenue:</span> ${forecast.projected_revenue.toLocaleString()}
                        </div>
                        <div>
                          <span className="text-slate-500">Projected margin:</span> {forecast.projected_margin_pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    Load the forecast lane to stage upcoming cost and margin periods.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'alerts' ? (
            <PanelCard title="Margin alerts" subtitle="Low-margin and negative-margin jobs surfaced as action-oriented cards.">
              <div className="space-y-3">
                {marginAlerts.length > 0 ? (
                  marginAlerts.map((alert) => (
                    <div key={`${alert.job_id}-${alert.alert_type}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{alert.job_id}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{alert.customer}</div>
                        </div>
                        <div className={`text-sm font-semibold ${varianceTone(alert.current_margin_pct - alert.threshold_pct)}`}>
                          {alert.current_margin_pct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{alert.recommendation}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No margin alerts are currently staged.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'breakeven' ? (
            <PanelCard title="Breakeven study" subtitle="Keep unit threshold and safety margin visible while testing pricing posture.">
              {breakeven ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Breakeven units" value={breakeven.breakeven_units.toFixed(0)} hint="Units needed to cover fixed and variable cost." />
                  <SummaryTile label="Breakeven revenue" value={`$${breakeven.breakeven_revenue.toLocaleString()}`} hint="Revenue threshold to hit zero profit." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                  <SummaryTile label="Margin of safety" value={`${breakeven.margin_of_safety_pct.toFixed(1)}%`} hint="Buffer before the current pricing posture breaks." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
                  <SummaryTile label="Contribution" value={`$${breakeven.contribution_margin.toFixed(2)}`} hint="Contribution margin per unit." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  Open the breakeven lane to stage the current pricing model.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Commercial review brief" subtitle="Keep the goal of the current lane visible while you drill into one job or one pricing posture.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>Run a live job analysis first so the forecast and alert lanes stay grounded in a real cost posture.</li>
                  <li>Keep alert review close to breakeven testing when pricing or scope changes are on the table.</li>
                  <li>Use the cost breakdown before chasing variance details so the biggest commercial risks pop first.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
