import { useEffect, useMemo, useState } from 'react';
import { analyticsAccuracy, analyticsCalibration, analyticsConversion, ApiError } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { CalibrationSuggestion, QuoteAccuracy, QuoteConversion } from '../api/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  ActionButton,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'accuracy' | 'conversion' | 'calibration';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  accuracy: {
    label: 'Accuracy',
    detail: 'Track estimate variance by category so calibration decisions stay anchored in real quote history.',
  },
  conversion: {
    label: 'Win/Loss',
    detail: 'Read the pipeline in terms of revenue quality, not just total quotes sent.',
  },
  calibration: {
    label: 'Calibration',
    detail: 'Use guided pricing adjustments instead of hand-tuning quoting margins in the dark.',
  },
};

function varianceTone(value: number): string {
  if (value <= -5) return 'text-sky-200';
  if (value < 5) return 'text-emerald-200';
  if (value < 12) return 'text-amber-200';
  return 'text-rose-200';
}

const CHART_TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' };

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeQuoteAccuracy(raw: unknown): QuoteAccuracy | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const categories = Array.isArray(data.categories)
    ? data.categories.map((entry) => {
        const category = entry as Record<string, unknown>;
        return {
          category: String(category.category ?? 'uncategorized'),
          avg_variance: asNumber(category.avg_variance),
          count: asNumber(category.count),
        };
      })
    : Object.entries((data.by_category ?? {}) as Record<string, unknown>).map(([category, entry]) => {
        const record = entry as Record<string, unknown>;
        return {
          category,
          avg_variance: asNumber(record.avg_variance_pct),
          count: asNumber(record.count),
        };
      });

  const hasFlatShape =
    typeof data.avg_variance_pct === 'number' &&
    typeof data.over_estimated_pct === 'number' &&
    typeof data.under_estimated_pct === 'number' &&
    Array.isArray(data.categories);

  if (hasFlatShape) {
    return {
      total_quotes: asNumber(data.total_quotes),
      avg_variance_pct: asNumber(data.avg_variance_pct),
      over_estimated_pct: asNumber(data.over_estimated_pct),
      under_estimated_pct: asNumber(data.under_estimated_pct),
      categories,
    };
  }

  const costAccuracy = (data.cost_accuracy ?? {}) as Record<string, unknown>;
  const totalQuotes = asNumber(data.total_quotes);

  return {
    total_quotes: totalQuotes,
    avg_variance_pct: asNumber(costAccuracy.avg_variance_pct),
    over_estimated_pct: totalQuotes > 0 ? (asNumber(costAccuracy.over_estimated_count) / totalQuotes) * 100 : 0,
    under_estimated_pct: totalQuotes > 0 ? (asNumber(costAccuracy.under_estimated_count) / totalQuotes) * 100 : 0,
    categories,
  };
}

function normalizeQuoteConversion(raw: unknown): QuoteConversion | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  return {
    total_quotes: asNumber(data.total_quotes),
    won: asNumber(data.won),
    lost: asNumber(data.lost),
    pending: asNumber(data.pending),
    win_rate: asNumber(data.win_rate, asNumber(data.win_rate_pct)),
    avg_won_value: asNumber(data.avg_won_value),
    avg_lost_value: asNumber(data.avg_lost_value),
  };
}

function normalizeCalibrationSuggestions(raw: unknown): CalibrationSuggestion[] {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { suggestions?: unknown[] } | null)?.suggestions)
      ? ((raw as { suggestions: unknown[] }).suggestions)
      : [];

  return source.map((entry, index) => {
    const suggestion = (entry ?? {}) as Record<string, unknown>;
    return {
      category: String(suggestion.category ?? `group-${index + 1}`),
      adjustment_pct: asNumber(
        suggestion.adjustment_pct,
        asNumber(suggestion.adjustment_percent, asNumber(suggestion.adjustment)),
      ),
      reason: String(suggestion.reason ?? 'Review the backing quote sample before applying this move.'),
      confidence: asNumber(suggestion.confidence),
    };
  });
}

function VarianceByCategoryChart({ categories }: { categories: QuoteAccuracy['categories'] }) {
  const data = categories.map((c) => ({
    name: c.category,
    variance: c.avg_variance,
    count: c.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Variance']} />
        <Bar dataKey="variance" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.variance >= 0 ? '#fcd34d' : '#7dd3fc'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WinLossPieChart({ conversion }: { conversion: QuoteConversion }) {
  const data = [
    { name: 'Won', value: conversion.won, fill: '#4ade80' },
    { name: 'Pending', value: conversion.pending, fill: '#fcd34d' },
    { name: 'Lost', value: conversion.lost, fill: '#fb7185' },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CalibrationBarChart({ calibrations }: { calibrations: CalibrationSuggestion[] }) {
  const data = calibrations.map((c) => ({
    name: c.category,
    adjustment: c.adjustment_pct,
    confidence: Math.round(c.confidence * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 60 }}>
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'adjustment' ? `${v.toFixed(1)}%` : `${v}%`, name === 'adjustment' ? 'Adjustment' : 'Confidence']} />
        <Bar dataKey="adjustment" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.adjustment >= 0 ? '#fcd34d' : '#7dd3fc'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Unwrap MCP tool response: result may be raw object or { type:"text", text:"<json>" } */
function unwrapMcpResult(result: unknown): unknown {
  if (result && typeof result === 'object' && 'text' in result && typeof (result as { text: string }).text === 'string') {
    try { return JSON.parse((result as { text: string }).text); } catch { return result; }
  }
  return result;
}

export function QuoteAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('accuracy');
  const [accuracy, setAccuracy] = useState<QuoteAccuracy | null>(null);
  const [conversion, setConversion] = useState<QuoteConversion | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = TAB_CONFIG[tab];

  const calibrationConfidence = useMemo(() => {
    if (calibrations.length === 0) return 'Standby';
    const average = calibrations.reduce((sum, item) => sum + item.confidence, 0) / calibrations.length;
    return `${(average * 100).toFixed(0)}%`;
  }, [calibrations]);

  async function loadAccuracy() {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsAccuracy();
      setAccuracy(normalizeQuoteAccuracy(unwrapMcpResult(response.result)));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  async function loadConversion() {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsConversion();
      setConversion(normalizeQuoteConversion(unwrapMcpResult(response.result)));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  async function loadCalibration() {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsCalibration();
      setCalibrations(normalizeCalibrationSuggestions(unwrapMcpResult(response.result)));
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'accuracy') void loadAccuracy();
    if (tab === 'conversion') void loadConversion();
    if (tab === 'calibration') void loadCalibration();
  }, [tab]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Commercial calibration"
        title="Quote Analytics"
        description="Keep estimate accuracy, win posture, and calibration guidance in one commercial intelligence desk instead of scattering them across thin admin widgets."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="Quotes sampled"
              value={accuracy ? String(accuracy.total_quotes) : 'Standby'}
              hint="Historical quote depth behind the current accuracy model."
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Calibration confidence"
              value={calibrationConfidence}
              hint="Average confidence behind the current suggested pricing adjustments."
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Read this page like a quoting control room: first see what missed, then see what converted, then decide whether the quoting model actually needs to move.
            </div>
            <div className="grid gap-2">
              <ActionButton
                onClick={() => {
                  setTab('accuracy');
                  void loadAccuracy();
                }}
              >
                Refresh accuracy
              </ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('conversion');
                  void loadConversion();
                }}
              >
                Refresh win/loss
              </ActionButton>
              <ActionButton
                tone="amber"
                onClick={() => {
                  setTab('calibration');
                  void loadCalibration();
                }}
              >
                Load calibration
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing quote analytics..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'accuracy' ? loadAccuracy : tab === 'conversion' ? loadConversion : loadCalibration} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <div className="space-y-6">
          {tab === 'accuracy' ? (
            <>
              <PanelCard title="Accuracy posture" subtitle="Use variance trends to spot where the quoting model is drifting by process or cost family.">
                {accuracy ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryTile label="Total quotes" value={String(accuracy.total_quotes)} hint="Historical quotes in the current sample." />
                    <SummaryTile
                      label="Average variance"
                      value={`${accuracy.avg_variance_pct > 0 ? '+' : ''}${accuracy.avg_variance_pct.toFixed(1)}%`}
                      hint="Overall direction of estimate drift."
                      accent="from-amber-300/22 via-amber-200/8 to-transparent"
                    />
                    <SummaryTile
                      label="Over-estimated"
                      value={`${accuracy.over_estimated_pct.toFixed(0)}%`}
                      hint="Quotes priced above realized need."
                      accent="from-sky-400/22 via-sky-300/8 to-transparent"
                    />
                    <SummaryTile
                      label="Under-estimated"
                      value={`${accuracy.under_estimated_pct.toFixed(0)}%`}
                      hint="Quotes priced below the true commercial load."
                      accent="from-rose-400/22 via-rose-300/8 to-transparent"
                    />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No accuracy sample is currently staged.
                  </div>
                )}
              </PanelCard>

              {accuracy && Array.isArray(accuracy.categories) && accuracy.categories.length > 0 ? (
                <PanelCard title="Variance distribution" subtitle="Visual drift by category — amber bars over-estimate, blue bars under-estimate.">
                  <VarianceByCategoryChart categories={accuracy.categories} />
                </PanelCard>
              ) : null}

              <PanelCard title="Variance by category" subtitle="Treat each category like a dial you can tune instead of one blended margin number.">
                {accuracy && Array.isArray(accuracy.categories) && accuracy.categories.length > 0 ? (
                  <div className="space-y-3">
                    {accuracy.categories.map((category) => {
                      const width = Math.min(Math.abs(category.avg_variance) * 2, 100);
                      return (
                        <div key={category.category} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold capitalize text-slate-50">{category.category}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{category.count} quotes sampled</div>
                            </div>
                            <div className={`text-sm font-mono font-semibold ${varianceTone(category.avg_variance)}`}>
                              {category.avg_variance > 0 ? '+' : ''}
                              {category.avg_variance.toFixed(1)}%
                            </div>
                          </div>
                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={`h-3 rounded-full ${category.avg_variance >= 0 ? 'bg-amber-300' : 'bg-sky-300'}`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    Category-level drift will appear here once accuracy history is loaded.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'conversion' ? (
            <>
              <PanelCard title="Pipeline posture" subtitle="Conversion rate matters, but revenue quality and quote backlog matter just as much.">
                {conversion ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryTile label="Win rate" value={`${conversion.win_rate}%`} hint="Percent of quotes converted to work." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
                    <SummaryTile label="Won" value={String(conversion.won)} hint="Jobs won in the sampled window." />
                    <SummaryTile label="Lost" value={String(conversion.lost)} hint="Quotes lost or abandoned." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
                    <SummaryTile label="Pending" value={String(conversion.pending)} hint="Quotes still alive in the commercial queue." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No conversion sample is currently staged.
                  </div>
                )}
              </PanelCard>

              {conversion ? (
                <PanelCard title="Quote pipeline" subtitle="Visual breakdown of won, pending, and lost quotes in the current sample.">
                  <WinLossPieChart conversion={conversion} />
                </PanelCard>
              ) : null}

              <PanelCard title="Revenue quality" subtitle="Check whether wins are coming from healthy-value jobs or only from lower-complexity work.">
                {conversion ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Average won value</div>
                        <div className="mt-3 text-3xl font-semibold text-emerald-100">${conversion.avg_won_value.toLocaleString()}</div>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Average lost value</div>
                        <div className="mt-3 text-3xl font-semibold text-rose-100">${conversion.avg_lost_value.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                      <div className="flex h-8">
                        {conversion.total_quotes > 0 ? (
                          <>
                            <div
                              className="flex items-center justify-center bg-emerald-300 text-xs font-semibold text-slate-950"
                              style={{ width: `${(conversion.won / conversion.total_quotes) * 100}%` }}
                            >
                              Won
                            </div>
                            <div
                              className="flex items-center justify-center bg-amber-300 text-xs font-semibold text-slate-950"
                              style={{ width: `${(conversion.pending / conversion.total_quotes) * 100}%` }}
                            >
                              Pending
                            </div>
                            <div
                              className="flex items-center justify-center bg-rose-300 text-xs font-semibold text-slate-950"
                              style={{ width: `${(conversion.lost / conversion.total_quotes) * 100}%` }}
                            >
                              Lost
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    Load the win/loss lane to stage the current quote pipeline.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'calibration' ? (
            <>
            {calibrations.length > 0 ? (
              <PanelCard title="Adjustment map" subtitle="Visual summary of suggested pricing moves by category.">
                <CalibrationBarChart calibrations={calibrations} />
              </PanelCard>
            ) : null}
            <PanelCard title="Calibration suggestions" subtitle="Suggested pricing moves are grouped here with enough context to decide whether to update the quote model.">
              {calibrations.length > 0 ? (
                <div className="space-y-3">
                  {calibrations.map((suggestion, index) => (
                    <div key={`${suggestion.category}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold capitalize text-slate-50">{suggestion.category}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Commercial calibration</div>
                        </div>
                        <div className={`text-sm font-mono font-semibold ${varianceTone(suggestion.adjustment_pct)}`}>
                          {suggestion.adjustment_pct > 0 ? '+' : ''}
                          {suggestion.adjustment_pct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{suggestion.reason}</div>
                      <div className="mt-4 flex items-center justify-between">
                        <StatusPill label={`Confidence ${(suggestion.confidence * 100).toFixed(0)}%`} tone="violet" />
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Apply only after reviewing the matching variance lane</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-8 text-sm text-emerald-100">
                  No calibration adjustments are currently recommended. The present quote model is within the acceptable accuracy band.
                </div>
              )}
            </PanelCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Review brief" subtitle="Keep the current commercial goal visible so the lane decisions stay grounded.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Working order</div>
                <ul className="mt-3 space-y-2">
                  <li>Review accuracy before changing pricing so you know which category is actually drifting.</li>
                  <li>Use the win/loss lane to see whether bad conversion is a pricing problem or a mix problem.</li>
                  <li>Only apply calibration when the suggested move lines up with both accuracy drift and conversion quality.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
