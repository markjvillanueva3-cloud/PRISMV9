import { useState } from 'react';
import { ppgFeatureSelect, ApiError } from '../api/client';

const CONTROLLERS = ['fanuc', 'haas', 'siemens', 'heidenhain', 'mazak', 'okuma'] as const;
const ISO_GROUPS = ['P', 'M', 'K', 'N', 'S', 'H'] as const;
const COMPLEXITIES = ['simple', 'moderate', 'complex'] as const;

type Feature = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  score: number;
  reason: string;
  gcode_impact: string;
  time_impact_pct: number;
  risk_level: string;
  interactions: string[];
};

type FeatureResult = {
  selected_features: Feature[];
  rejected_features: Feature[];
  feature_interactions: Array<{
    features: [string, string];
    type: string;
    resolution: string;
  }>;
  controller_config: {
    controller: string;
    safe_start_block: string;
    smoothing_mode: string;
    five_axis_mode: string;
    decimal_places: number;
  };
  estimated_improvement: {
    cycle_time_pct: number;
    surface_quality_pct: number;
    tool_life_pct: number;
    safety_score: number;
  };
  confidence: number;
  rationale: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  hsm: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  safety: 'bg-rose-900/40 text-rose-300 border-rose-700',
  tool_management: 'bg-amber-900/40 text-amber-300 border-amber-700',
  measurement: 'bg-violet-900/40 text-violet-300 border-violet-700',
  coolant: 'bg-blue-900/40 text-blue-300 border-blue-700',
  multi_axis: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  feed_optimization: 'bg-orange-900/40 text-orange-300 border-orange-700',
  cam_specific: 'bg-slate-700/40 text-slate-300 border-slate-600',
};

const RISK_COLORS: Record<string, string> = {
  none: 'text-emerald-400',
  low: 'text-cyan-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

export function FeatureTogglePage() {
  const [controller, setController] = useState<string>('fanuc');
  const [isoGroup, setIsoGroup] = useState<string>('P');
  const [complexity, setComplexity] = useState<string>('moderate');
  const [toleranceMm, setToleranceMm] = useState(0.05);
  const [axisCount, setAxisCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FeatureResult | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  async function runSelection() {
    setLoading(true);
    setError('');
    try {
      const resp = await ppgFeatureSelect({
        controller,
        iso_group: isoGroup,
        complexity,
        tolerance_mm: toleranceMm,
        axis_count: axisCount,
        max_rpm: 12000,
        has_probing: true,
        has_tsc: axisCount >= 4,
        has_rigid_tapping: true,
        max_depth_mm: 30,
        estimated_cycle_time_min: 20,
        surface_finish_target_um: toleranceMm < 0.02 ? 0.8 : 3.2,
      });
      const data = (resp as any).data ?? resp;
      setResult(data as FeatureResult);
      setOverrides({});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleFeature(id: string, currentEnabled: boolean) {
    setOverrides(prev => ({ ...prev, [id]: !currentEnabled }));
  }

  function getEffectiveEnabled(feature: Feature) {
    return overrides[feature.id] ?? feature.enabled;
  }

  const allFeatures = result
    ? [...result.selected_features, ...result.rejected_features].sort((a, b) => b.score - a.score)
    : [];

  const enabledCount = allFeatures.filter(f => getEffectiveEnabled(f)).length;
  const imp = result?.estimated_improvement;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Auto-Selection</h1>
        <p className="text-sm text-slate-400 mt-1">
          PostSelectionEngine evaluates 24 features for your job context and auto-recommends the optimal set.
        </p>
      </div>

      {/* Job Context Form */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Job Context</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Controller</span>
            <select value={controller} onChange={e => setController(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
              {CONTROLLERS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">ISO Group</span>
            <select value={isoGroup} onChange={e => setIsoGroup(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
              {ISO_GROUPS.map(g => <option key={g} value={g}>{g} — {g === 'P' ? 'Steel' : g === 'M' ? 'Stainless' : g === 'K' ? 'Cast Iron' : g === 'N' ? 'Non-Ferrous' : g === 'S' ? 'Super Alloy' : 'Hardened'}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Complexity</span>
            <select value={complexity} onChange={e => setComplexity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
              {COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Tolerance (mm)</span>
            <input type="number" step="0.001" min="0.001" max="1"
              value={toleranceMm} onChange={e => setToleranceMm(+e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Axes</span>
            <select value={axisCount} onChange={e => setAxisCount(+e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
              <option value={3}>3-axis</option>
              <option value={4}>4-axis</option>
              <option value={5}>5-axis</option>
            </select>
          </label>
        </div>
        <button onClick={runSelection} disabled={loading}
          className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white text-sm font-medium rounded transition-colors">
          {loading ? 'Analyzing...' : 'Evaluate Features'}
        </button>
      </div>

      {error && <div className="text-rose-400 text-sm bg-rose-900/20 border border-rose-800 rounded p-3">{error}</div>}

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-xs text-slate-400">Features Selected</div>
              <div className="text-2xl font-bold text-cyan-400">{enabledCount}</div>
              <div className="text-xs text-slate-500">of {allFeatures.length}</div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-xs text-slate-400">Cycle Time</div>
              <div className={`text-2xl font-bold ${(imp?.cycle_time_pct ?? 0) < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {imp?.cycle_time_pct != null ? `${imp.cycle_time_pct > 0 ? '+' : ''}${imp.cycle_time_pct.toFixed(1)}%` : '--'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-xs text-slate-400">Surface Quality</div>
              <div className="text-2xl font-bold text-violet-400">
                {imp?.surface_quality_pct != null ? `+${imp.surface_quality_pct.toFixed(1)}%` : '--'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-xs text-slate-400">Tool Life</div>
              <div className="text-2xl font-bold text-amber-400">
                {imp?.tool_life_pct != null ? `+${imp.tool_life_pct.toFixed(1)}%` : '--'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="text-xs text-slate-400">Confidence</div>
              <div className="text-2xl font-bold text-white">{(result.confidence * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Rationale</h3>
            <p className="text-sm text-slate-400">{result.rationale}</p>
          </div>

          {/* Feature Grid */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">All Features ({allFeatures.length})</h3>
            <div className="grid gap-2">
              {allFeatures.map(feature => {
                const enabled = getEffectiveEnabled(feature);
                const catColor = CATEGORY_COLORS[feature.category] ?? CATEGORY_COLORS.cam_specific;
                const riskColor = RISK_COLORS[feature.risk_level] ?? RISK_COLORS.none;
                return (
                  <div key={feature.id}
                    className={`bg-slate-800 rounded-lg border p-4 flex items-center gap-4 transition-colors ${
                      enabled ? 'border-cyan-700/50' : 'border-slate-700/50 opacity-60'
                    }`}>
                    {/* Toggle */}
                    <button onClick={() => toggleFeature(feature.id, enabled)}
                      className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                        enabled ? 'bg-cyan-600' : 'bg-slate-600'
                      }`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        enabled ? 'left-[18px]' : 'left-0.5'
                      }`} />
                    </button>

                    {/* Score bar */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-lg font-bold text-white">{feature.score}</div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-0.5">
                        <div className="h-full rounded-full bg-cyan-500 transition-all"
                          style={{ width: `${feature.score}%` }} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">{feature.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catColor}`}>
                          {feature.category.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-medium ${riskColor}`}>
                          {feature.risk_level !== 'none' ? feature.risk_level.toUpperCase() + ' RISK' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{feature.reason}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">{feature.gcode_impact}</div>
                    </div>

                    {/* Time impact */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-sm font-medium ${
                        feature.time_impact_pct < 0 ? 'text-emerald-400' : feature.time_impact_pct > 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {feature.time_impact_pct > 0 ? '+' : ''}{feature.time_impact_pct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-500">cycle time</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Interactions */}
          {result.feature_interactions.length > 0 && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Feature Interactions</h3>
              <div className="space-y-2">
                {result.feature_interactions.map((int, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      int.type === 'synergy' ? 'bg-emerald-900/40 text-emerald-300' :
                      int.type === 'conflict' ? 'bg-rose-900/40 text-rose-300' :
                      'bg-amber-900/40 text-amber-300'
                    }`}>{int.type}</span>
                    <span className="text-white">{int.features[0]}</span>
                    <span className="text-slate-500">&harr;</span>
                    <span className="text-white">{int.features[1]}</span>
                    <span className="text-slate-400 text-xs">— {int.resolution}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controller Config */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Controller Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Controller:</span>{' '}
                <span className="text-white">{result.controller_config.controller}</span>
              </div>
              <div>
                <span className="text-slate-400">Smoothing:</span>{' '}
                <span className="text-white">{result.controller_config.smoothing_mode}</span>
              </div>
              <div>
                <span className="text-slate-400">5-Axis:</span>{' '}
                <span className="text-white">{result.controller_config.five_axis_mode}</span>
              </div>
              <div>
                <span className="text-slate-400">Decimals:</span>{' '}
                <span className="text-white">{result.controller_config.decimal_places}</span>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-slate-400">Safe Start:</span>{' '}
                <span className="text-white font-mono text-xs">{result.controller_config.safe_start_block}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
