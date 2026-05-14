/**
 * BIZ-MS4 U-BIZ29: Sales Pipeline Dashboard
 * Weighted forecast, stage breakdown, conversion funnel.
 */
import { useEffect, useState } from 'react';
import { pipelineForecast, pipelineStages } from '../api/client';
import { PanelCard, StatusPill, SummaryTile, WorkspaceHero } from '../components/workspace/WorkspacePrimitives';

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  weighted_value: number;
  probability_pct: number;
}

interface Forecast {
  pipeline_value: number;
  conversion_rate: number;
  forecast_30d: number;
  forecast_90d: number;
  backlog_value: number;
}

function money(v: number): string { return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }

const stageTone: Record<string, 'slate' | 'sky' | 'amber' | 'emerald' | 'rose'> = {
  prospect: 'slate', qualification: 'sky', proposal: 'amber', negotiation: 'amber', closed_won: 'emerald', closed_lost: 'rose',
};

export default function SalesPipelinePage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    pipelineForecast().then((r) => setForecast((r as any).data ?? (r as any).result ?? null)).catch(() => {});
    pipelineStages().then((r) => setStages(((r as any).data ?? (r as any).result ?? []) as PipelineStage[])).catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Revenue pipeline"
        title="Sales Pipeline"
        description="Weighted forecast, stage breakdown, and conversion funnel for active opportunities."
        metrics={<>
          <SummaryTile label="Pipeline Value" value={forecast ? money(forecast.pipeline_value) : '-'} />
          <SummaryTile label="30-Day Forecast" value={forecast ? money(forecast.forecast_30d) : '-'} accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          <SummaryTile label="Conversion" value={forecast ? `${(forecast.conversion_rate * 100).toFixed(0)}%` : '-'} accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
        </>}
      />
      <PanelCard title="Pipeline Stages" subtitle="Opportunities by stage with weighted value.">
        {stages.length > 0 ? (
          <div className="space-y-3">
            {stages.map((s) => (
              <div key={s.stage} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <StatusPill label={s.stage.replace(/_/g, ' ')} tone={stageTone[s.stage] ?? 'slate'} />
                  <span className="text-sm text-slate-300">{s.count} opportunities</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-slate-100">{money(s.value)}</div>
                  <div className="text-xs text-slate-500">Weighted: {money(s.weighted_value)} ({s.probability_pct}%)</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No pipeline data. Wire QuoteAnalyticsEngine for live pipeline.</div>
        )}
      </PanelCard>
    </div>
  );
}
