/**
 * Quote Analytics Page — Accuracy, conversion rates, calibration suggestions.
 */
import { useState, useEffect } from 'react';
import { analyticsAccuracy, analyticsConversion, analyticsCalibration, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { QuoteAccuracy, QuoteConversion, CalibrationSuggestion } from '../api/types';

type Tab = 'accuracy' | 'conversion' | 'calibration';

export function QuoteAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('accuracy');
  const [accuracy, setAccuracy] = useState<QuoteAccuracy | null>(null);
  const [conversion, setConversion] = useState<QuoteConversion | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'accuracy': {
          const r = await analyticsAccuracy();
          setAccuracy(r.result as unknown as QuoteAccuracy);
          break;
        }
        case 'conversion': {
          const r = await analyticsConversion();
          setConversion(r.result as unknown as QuoteConversion);
          break;
        }
        case 'calibration': {
          const r = await analyticsCalibration();
          setCalibrations((r.result as any)?.suggestions ?? (r.result as any) ?? []);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'conversion', label: 'Win/Loss' },
    { key: 'calibration', label: 'Calibration' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quote Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track quoting accuracy, conversion rates, and get calibration suggestions.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.key ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading analytics..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {/* Accuracy */}
      {tab === 'accuracy' && accuracy && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Total Quotes</span>
              <span className="text-2xl font-bold">{accuracy.total_quotes}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Avg Variance</span>
              <span className={`text-2xl font-bold ${Math.abs(accuracy.avg_variance_pct) < 10 ? 'text-green-600' : 'text-red-600'}`}>
                {accuracy.avg_variance_pct > 0 ? '+' : ''}{accuracy.avg_variance_pct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Over-Estimated</span>
              <span className="text-2xl font-bold text-orange-600">{accuracy.over_estimated_pct.toFixed(0)}%</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Under-Estimated</span>
              <span className="text-2xl font-bold text-red-600">{accuracy.under_estimated_pct.toFixed(0)}%</span>
            </div>
          </div>

          {accuracy.categories.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-3">Variance by Category</h3>
              <div className="space-y-2">
                {accuracy.categories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize w-40">{c.category}</span>
                    <div className="flex-1 mx-4 bg-gray-200 rounded-full h-3 relative">
                      <div className={`h-3 rounded-full ${c.avg_variance >= 0 ? 'bg-orange-400' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(Math.abs(c.avg_variance), 50)}%`, marginLeft: c.avg_variance < 0 ? 'auto' : '50%' }} />
                    </div>
                    <span className="font-mono w-20 text-right">
                      {c.avg_variance > 0 ? '+' : ''}{c.avg_variance.toFixed(1)}% ({c.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversion */}
      {tab === 'conversion' && conversion && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Win Rate', value: `${conversion.win_rate}%`, color: conversion.win_rate >= 50 ? 'text-green-600' : 'text-red-600' },
              { label: 'Won', value: conversion.won, color: 'text-green-600' },
              { label: 'Lost', value: conversion.lost, color: 'text-red-600' },
              { label: 'Pending', value: conversion.pending, color: 'text-yellow-600' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 block">{c.label}</span>
                <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Avg Won Value</span>
              <span className="text-xl font-bold text-green-600">${conversion.avg_won_value.toLocaleString()}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
              <span className="text-xs text-gray-500 block">Avg Lost Value</span>
              <span className="text-xl font-bold text-red-600">${conversion.avg_lost_value.toLocaleString()}</span>
            </div>
          </div>

          {/* Win/Loss bar */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Pipeline Distribution</h3>
            <div className="flex rounded-full h-6 overflow-hidden">
              {conversion.won > 0 && (
                <div className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(conversion.won / conversion.total_quotes) * 100}%` }}>
                  Won
                </div>
              )}
              {conversion.pending > 0 && (
                <div className="bg-yellow-400 flex items-center justify-center text-xs text-gray-800 font-medium"
                  style={{ width: `${(conversion.pending / conversion.total_quotes) * 100}%` }}>
                  Pending
                </div>
              )}
              {conversion.lost > 0 && (
                <div className="bg-red-400 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(conversion.lost / conversion.total_quotes) * 100}%` }}>
                  Lost
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calibration */}
      {tab === 'calibration' && !loading && (
        <div className="space-y-3">
          {calibrations.length > 0 ? calibrations.map((c, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium capitalize">{c.category}</span>
                <span className={`font-mono font-bold ${c.adjustment_pct > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                  {c.adjustment_pct > 0 ? '+' : ''}{c.adjustment_pct.toFixed(1)}% adjustment
                </span>
              </div>
              <p className="text-sm text-gray-600">{c.reason}</p>
              <div className="mt-1">
                <span className="text-xs text-gray-500">Confidence: {(c.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
              No calibration adjustments needed. Quoting accuracy is within acceptable bounds.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
