/**
 * R5-MS3: What-If Analysis Page
 *
 * Parameter sensitivity explorer. Adjust cutting parameters
 * with sliders to see real-time impact on tool life, power,
 * cost, and safety.
 *
 * Data source: prism_data.what_if (client-side approximation for offline)
 */
import { useState, useMemo } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';

// ============================================================================
// PARAMETER DEFINITIONS
// ============================================================================

interface Param {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  baseline: number;
}

const PARAMS: Param[] = [
  { name: 'Vc', label: 'Cutting Speed', unit: 'm/min', min: 50, max: 400, step: 5, baseline: 200 },
  { name: 'fz', label: 'Feed per Tooth', unit: 'mm/tooth', min: 0.02, max: 0.5, step: 0.01, baseline: 0.1 },
  { name: 'ap', label: 'Axial Depth', unit: 'mm', min: 0.5, max: 10, step: 0.1, baseline: 3.0 },
  { name: 'ae', label: 'Radial Width', unit: 'mm', min: 1, max: 25, step: 0.5, baseline: 12.5 },
];

// ============================================================================
// IMPACT CALCULATIONS (simplified physics models)
// ============================================================================

interface Impact {
  label: string;
  baseline: number;
  current: number;
  unit: string;
  direction: 'up' | 'down' | 'same';
  sentiment: 'good' | 'bad' | 'neutral';
}

function computeImpacts(values: Record<string, number>): Impact[] {
  const base = { Vc: 200, fz: 0.1, ap: 3.0, ae: 12.5 };

  // MRR = ap * ae * Vf; Vf = n * fz * z; simplified: MRR ~ Vc * fz * ap * ae
  const mrrBase = base.Vc * base.fz * base.ap * base.ae;
  const mrrCur = values.Vc * values.fz * values.ap * values.ae;
  const mrrRatio = mrrCur / mrrBase;

  // Tool life ~ (C/V)^(1/n) * feed_factor * depth_factor
  const tlBase = Math.pow(300 / base.Vc, 4) * (1 / base.fz) * (1 / Math.sqrt(base.ap));
  const tlCur = Math.pow(300 / values.Vc, 4) * (1 / values.fz) * (1 / Math.sqrt(values.ap));
  const tlRatio = tlCur / tlBase;

  // Power ~ Fc * Vc / 60000; Fc ~ kc * fz * ap
  const powerBase = base.Vc * base.fz * base.ap * 1800 / 60000;
  const powerCur = values.Vc * values.fz * values.ap * 1800 / 60000;

  // Cost ~ cycle_time * rate + tool_changes * tool_cost
  const ctBase = 1 / mrrBase; // proportional cycle time
  const ctCur = 1 / mrrCur;
  const toolChangesBase = 1 / (tlBase > 0 ? tlBase : 1);
  const toolChangesCur = 1 / (tlCur > 0 ? tlCur : 1);
  const costBase = ctBase * 90 + toolChangesBase * 25;
  const costCur = ctCur * 90 + toolChangesCur * 25;

  // Safety: lower with aggressive params
  const safetyBase = 0.88;
  const aggrFactor = (values.Vc / base.Vc) * (values.fz / base.fz) * (values.ap / base.ap) * (values.ae / base.ae);
  const safetyCur = Math.min(1.0, Math.max(0.3, safetyBase / Math.pow(aggrFactor, 0.15)));

  function dir(cur: number, base: number): 'up' | 'down' | 'same' {
    const pct = ((cur - base) / base) * 100;
    if (Math.abs(pct) < 1) return 'same';
    return cur > base ? 'up' : 'down';
  }

  return [
    {
      label: 'Material Removal Rate',
      baseline: mrrBase, current: mrrCur, unit: 'relative',
      direction: dir(mrrCur, mrrBase),
      sentiment: mrrCur >= mrrBase ? 'good' : 'bad',
    },
    {
      label: 'Tool Life',
      baseline: tlBase, current: tlCur, unit: 'relative',
      direction: dir(tlCur, tlBase),
      sentiment: tlCur >= tlBase ? 'good' : 'bad',
    },
    {
      label: 'Spindle Power',
      baseline: powerBase, current: powerCur, unit: 'kW',
      direction: dir(powerCur, powerBase),
      sentiment: powerCur <= powerBase * 1.1 ? 'good' : 'bad',
    },
    {
      label: 'Cost per Part',
      baseline: costBase, current: costCur, unit: 'relative',
      direction: dir(costCur, costBase),
      sentiment: costCur <= costBase ? 'good' : 'bad',
    },
    {
      label: 'Safety Score',
      baseline: safetyBase, current: safetyCur, unit: '',
      direction: dir(safetyCur, safetyBase),
      sentiment: safetyCur >= 0.70 ? (safetyCur >= 0.85 ? 'good' : 'neutral') : 'bad',
    },
  ];
}

// ============================================================================
// IMPACT ROW
// ============================================================================

function ImpactRow({ impact }: { impact: Impact }) {
  const pctChange = ((impact.current - impact.baseline) / impact.baseline) * 100;
  const arrow = impact.direction === 'up' ? '\u2191' : impact.direction === 'down' ? '\u2193' : '\u2192';
  const color = impact.sentiment === 'good' ? 'text-green-600' : impact.sentiment === 'bad' ? 'text-red-600' : 'text-amber-600';
  const bg = impact.sentiment === 'good' ? 'bg-green-50' : impact.sentiment === 'bad' ? 'bg-red-50' : 'bg-amber-50';

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded ${bg}`}>
      <span className="text-sm font-medium text-gray-700">{impact.label}</span>
      <div className="flex items-center gap-3">
        {impact.label === 'Safety Score' ? (
          <SafetyBadge score={impact.current} />
        ) : (
          <span className={`text-sm font-bold ${color}`}>
            {arrow} {Math.abs(pctChange).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export function WhatIfPage() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of PARAMS) init[p.name] = p.baseline;
    return init;
  });

  const impacts = useMemo(() => computeImpacts(values), [values]);

  function handleReset() {
    const reset: Record<string, number> = {};
    for (const p of PARAMS) reset[p.name] = p.baseline;
    setValues(reset);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">What-If Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore how parameter changes affect productivity, tool life, cost, and safety.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameter sliders */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Parameters</h2>
            <button
              onClick={handleReset}
              className="text-xs text-prism-600 hover:text-prism-700 font-medium"
            >
              Reset to Baseline
            </button>
          </div>
          <div className="space-y-5">
            {PARAMS.map((p) => {
              const pct = ((values[p.name] - p.baseline) / p.baseline) * 100;
              return (
                <div key={p.name}>
                  <div className="flex justify-between mb-1">
                    <label htmlFor={`wi-${p.name}`} className="text-sm font-medium text-gray-600">
                      {p.label}
                    </label>
                    <span className="text-sm font-mono">
                      {values[p.name]}{p.unit && ` ${p.unit}`}
                      {Math.abs(pct) > 0.5 && (
                        <span className={`ml-1 text-xs ${pct > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                          ({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <input
                    id={`wi-${p.name}`}
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={values[p.name]}
                    onChange={(e) => setValues(prev => ({ ...prev, [p.name]: parseFloat(e.target.value) }))}
                    className="w-full accent-prism-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{p.min}</span>
                    <span className="text-prism-500 font-medium">baseline: {p.baseline}</span>
                    <span>{p.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Impact Analysis</h2>
          <div className="space-y-2">
            {impacts.map((impact) => (
              <ImpactRow key={impact.label} impact={impact} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
