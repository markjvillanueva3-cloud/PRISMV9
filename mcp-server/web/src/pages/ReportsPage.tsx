import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  reportingDashboard,
  reportingFinancial,
  reportingPareto,
  reportingProduction,
  reportingQuality,
  reportingTrend,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  formatJsonPreview,
  formatMoney,
  payloadOf,
} from './recovery/recoveryUtils';

function previewValue(value: unknown) {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return formatJsonPreview(value);
}

export function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('throughput');
  const [paretoType, setParetoType] = useState('scrap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [productionRecords, setProductionRecords] = useState<Record<string, unknown>[]>([]);
  const [qualityRecords, setQualityRecords] = useState<Record<string, unknown>[]>([]);
  const [financialRecords, setFinancialRecords] = useState<Record<string, unknown>[]>([]);
  const [trendPoints, setTrendPoints] = useState<Record<string, unknown>[]>([]);
  const [paretoItems, setParetoItems] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        dashboardResponse,
        productionResponse,
        qualityResponse,
        financialResponse,
        trendResponse,
        paretoResponse,
      ] = await Promise.all([
        reportingDashboard(),
        reportingProduction({ period }),
        reportingQuality({ period }),
        reportingFinancial({ period }),
        reportingTrend({ metric, periods: 6 }),
        reportingPareto({ type: paretoType, period }),
      ]);

      setDashboard(asRecord(payloadOf(dashboardResponse)) ?? asRecord(dashboardResponse));
      setProductionRecords(arrayFromPayload(productionResponse, ['records', 'production', 'items']));
      setQualityRecords(arrayFromPayload(qualityResponse, ['records', 'quality', 'items']));
      setFinancialRecords(arrayFromPayload(financialResponse, ['records', 'financial', 'items']));
      setTrendPoints(arrayFromPayload(trendResponse, ['data', 'records', 'items']));
      setParetoItems(arrayFromPayload(paretoResponse, ['data', 'records', 'items', 'causes']));
    } catch (issue) {
      setDashboard(null);
      setProductionRecords([]);
      setQualityRecords([]);
      setFinancialRecords([]);
      setTrendPoints([]);
      setParetoItems([]);
      setError(errorMessage(issue, 'The reporting desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, [metric, paretoType, period]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const dashboardHighlights = dashboard ? Object.entries(dashboard).slice(0, 6) : [];
  const productionThroughput = productionRecords.reduce((sum, entry) => sum + (firstNumber(entry, ['parts', 'count', 'completed']) ?? 0), 0);
  const financialExposure = financialRecords.reduce((sum, entry) => sum + (firstNumber(entry, ['value', 'amount', 'variance']) ?? 0), 0);

  const metrics = useMemo(() => ([
    {
      label: 'Production Records',
      value: String(productionRecords.length),
      hint: `${period} period view`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Quality Records',
      value: String(qualityRecords.length),
      hint: `${paretoItems.length} Pareto drivers`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Financial Exposure',
      value: formatMoney(financialExposure),
      hint: `${financialRecords.length} financial rows`,
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [financialExposure, financialRecords.length, paretoItems.length, period, productionRecords.length, qualityRecords.length]);

  const aiContext = useMemo(() => ({
    workspace: 'reports',
    appw_stage: 'APPW-MS0 reporting intelligence',
    period,
    metric,
    pareto_type: paretoType,
    dashboard,
    production: productionRecords,
    quality: qualityRecords,
    financial: financialRecords,
    trend: trendPoints,
    pareto: paretoItems,
  }), [dashboard, financialRecords, metric, paretoItems, paretoType, period, productionRecords, qualityRecords, trendPoints]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Executive reporting"
      title="Reports"
      description="The APPW reporting desk has been rebuilt onto a stable front-end scaffold so leaders can read production, quality, and financial posture while Kienzle AI reasons across the mounted reporting routes."
      surfaces={['deskCounts', 'commerce']}
      metrics={metrics}
      aiSummary="Kienzle AI can read the mounted reporting payloads, translate the trend and Pareto signals, and recommend what leadership should act on next."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'ops-brief',
          label: 'Summarize the operating picture',
          query: `Summarize the ${period} reporting posture with emphasis on ${metric} and the top ${paretoType} drivers.`,
        },
        {
          id: 'lead-actions',
          label: 'Recommend next actions',
          query: 'Given the current reporting payloads, what are the next actions for operations, quality, and finance leaders?',
        },
      ]}
    >
      <PanelCard title="Reporting posture" subtitle="Mounted against the dashboard, production, quality, financial, trend, and Pareto routes.">
        <div className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <Field label="Period">
            <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
            </Select>
          </Field>
          <Field label="Trend Metric">
            <Select value={metric} onChange={(event) => setMetric(event.target.value)}>
              <option value="throughput">Throughput</option>
              <option value="margin">Margin</option>
              <option value="quality">Quality</option>
              <option value="delivery">Delivery</option>
            </Select>
          </Field>
          <Field label="Pareto Focus">
            <Select value={paretoType} onChange={(event) => setParetoType(event.target.value)}>
              <option value="scrap">Scrap</option>
              <option value="downtime">Downtime</option>
              <option value="late_jobs">Late jobs</option>
              <option value="quality">Quality</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <ActionButton onClick={() => void loadDesk()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh desk'}
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`Trend ${trendPoints.length}`} tone="sky" />
          <StatusPill label={`Pareto ${paretoItems.length}`} tone={paretoItems.length > 0 ? 'amber' : 'slate'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard title="Dashboard highlights" subtitle="Top-level signals exposed by the mounted reporting dashboard.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboardHighlights.length > 0 ? dashboardHighlights.map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{key.replace(/_/g, ' ')}</div>
              <div className="mt-2 text-sm text-slate-200">{previewValue(value)}</div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
              No dashboard highlights were exposed in the current payload.
            </div>
          )}
        </div>
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Trend and Pareto" subtitle="Where the reporting desk says the next variance is coming from.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Trend points</div>
              <div className="mt-1 text-slate-400">{trendPoints.length} points mounted for {metric}.</div>
              <div className="mt-3 space-y-2">
                {trendPoints.length > 0 ? trendPoints.slice(0, 5).map((entry, index) => (
                  <div key={`${index}-${metric}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                    <div className="font-semibold text-slate-100">Point {index + 1}</div>
                    <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-slate-400">
                    No trend points were returned.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Pareto drivers</div>
              <div className="mt-1 text-slate-400">{paretoItems.length} mounted items for {paretoType}.</div>
              <div className="mt-3 space-y-2">
                {paretoItems.length > 0 ? paretoItems.slice(0, 5).map((entry, index) => (
                  <div key={`${index}-${paretoType}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                    <div className="font-semibold text-slate-100">Driver {index + 1}</div>
                    <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-slate-400">
                    No Pareto drivers were returned.
                  </div>
                )}
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Domain rollups" subtitle="Production, quality, and financial rows exposed by the reporting routes.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Production</div>
              <div className="mt-1 text-slate-400">{productionRecords.length} rows | {productionThroughput.toLocaleString()} reported throughput</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Quality</div>
              <div className="mt-1 text-slate-400">{qualityRecords.length} rows mounted for review.</div>
              <div className="mt-2 text-xs text-slate-500">
                {qualityRecords.length > 0 ? formatJsonPreview(qualityRecords[0]) : 'No quality row preview available.'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Financial</div>
              <div className="mt-1 text-slate-400">{financialRecords.length} rows | exposure {formatMoney(financialExposure)}</div>
              <div className="mt-2 text-xs text-slate-500">
                {financialRecords.length > 0 ? formatJsonPreview(financialRecords[0]) : 'No financial row preview available.'}
              </div>
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default ReportsPage;
