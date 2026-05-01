import { useEffect, useMemo, useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';
import { sfQuick } from '../api/speedfeed';

interface Param {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  baseline: number;
  guidance: string;
}

interface Impact {
  label: string;
  baseline: number;
  current: number;
  unit: string;
  direction: 'up' | 'down' | 'same';
  sentiment: 'good' | 'bad' | 'neutral';
}

type ScenarioPreset = {
  key: string;
  label: string;
  posture: string;
  values: Record<string, number>;
};

const PARAMS: readonly Param[] = [
  {
    name: 'Vc',
    label: 'Cutting Speed',
    unit: 'm/min',
    min: 50,
    max: 400,
    step: 5,
    baseline: 200,
    guidance: 'Higher speed raises productivity but can compress tool life fast.',
  },
  {
    name: 'fz',
    label: 'Feed per Tooth',
    unit: 'mm/tooth',
    min: 0.02,
    max: 0.5,
    step: 0.01,
    baseline: 0.1,
    guidance: 'Chip load is where stability, finish, and horsepower posture start to separate.',
  },
  {
    name: 'ap',
    label: 'Axial Depth',
    unit: 'mm',
    min: 0.5,
    max: 10,
    step: 0.1,
    baseline: 3.0,
    guidance: 'Axial depth changes force, tool engagement, and wall deflection quickly.',
  },
  {
    name: 'ae',
    label: 'Radial Width',
    unit: 'mm',
    min: 1,
    max: 25,
    step: 0.5,
    baseline: 12.5,
    guidance: 'Radial width moves the needle on load, heat concentration, and finish posture.',
  },
] as const;

const BASELINE_VALUES = PARAMS.reduce<Record<string, number>>((acc, param) => {
  acc[param.name] = param.baseline;
  return acc;
}, {});

const SCENARIOS: readonly ScenarioPreset[] = [
  {
    key: 'balanced',
    label: 'Balanced Baseline',
    posture: 'Keeps throughput and tool life near the centerline for general-purpose production.',
    values: BASELINE_VALUES,
  },
  {
    key: 'throughput',
    label: 'Throughput Push',
    posture: 'Leans into stock removal and shorter cycle time while accepting more stress.',
    values: { Vc: 285, fz: 0.16, ap: 4.5, ae: 16 },
  },
  {
    key: 'finish',
    label: 'Finish Protection',
    posture: 'Backs off aggression to protect finish, tool life, and process stability.',
    values: { Vc: 170, fz: 0.07, ap: 1.8, ae: 7.5 },
  },
  {
    key: 'tool-life',
    label: 'Tool-Life Hold',
    posture: 'Favors repeatability and lower wear for costly material or long-run consistency.',
    values: { Vc: 155, fz: 0.08, ap: 2.2, ae: 9.5 },
  },
] as const;

const CUSTOM_SCENARIO: ScenarioPreset = {
  key: 'custom',
  label: 'Custom Tuning',
  posture: 'Manual slider changes are active. Use the impacts to decide whether the drift is worth keeping.',
  values: BASELINE_VALUES,
};

function computeImpacts(values: Record<string, number>): Impact[] {
  const base = BASELINE_VALUES;

  const mrrBase = base.Vc * base.fz * base.ap * base.ae;
  const mrrCur = values.Vc * values.fz * values.ap * values.ae;

  const tlBase = Math.pow(300 / base.Vc, 4) * (1 / base.fz) * (1 / Math.sqrt(base.ap));
  const tlCur = Math.pow(300 / values.Vc, 4) * (1 / values.fz) * (1 / Math.sqrt(values.ap));

  const powerBase = (base.Vc * base.fz * base.ap * 1800) / 60000;
  const powerCur = (values.Vc * values.fz * values.ap * 1800) / 60000;

  const ctBase = 1 / mrrBase;
  const ctCur = 1 / mrrCur;
  const toolChangesBase = 1 / (tlBase > 0 ? tlBase : 1);
  const toolChangesCur = 1 / (tlCur > 0 ? tlCur : 1);
  const costBase = ctBase * 90 + toolChangesBase * 25;
  const costCur = ctCur * 90 + toolChangesCur * 25;

  const safetyBase = 0.88;
  const aggrFactor =
    (values.Vc / base.Vc) * (values.fz / base.fz) * (values.ap / base.ap) * (values.ae / base.ae);
  const safetyCur = Math.min(1.0, Math.max(0.3, safetyBase / Math.pow(aggrFactor, 0.15)));

  function dir(cur: number, baseline: number): 'up' | 'down' | 'same' {
    const pct = ((cur - baseline) / baseline) * 100;
    if (Math.abs(pct) < 1) return 'same';
    return cur > baseline ? 'up' : 'down';
  }

  return [
    {
      label: 'Material Removal Rate',
      baseline: mrrBase,
      current: mrrCur,
      unit: 'relative',
      direction: dir(mrrCur, mrrBase),
      sentiment: mrrCur >= mrrBase ? 'good' : 'bad',
    },
    {
      label: 'Tool Life',
      baseline: tlBase,
      current: tlCur,
      unit: 'relative',
      direction: dir(tlCur, tlBase),
      sentiment: tlCur >= tlBase ? 'good' : 'bad',
    },
    {
      label: 'Spindle Power',
      baseline: powerBase,
      current: powerCur,
      unit: 'kW',
      direction: dir(powerCur, powerBase),
      sentiment: powerCur <= powerBase * 1.1 ? 'good' : 'bad',
    },
    {
      label: 'Cost per Part',
      baseline: costBase,
      current: costCur,
      unit: 'relative',
      direction: dir(costCur, costBase),
      sentiment: costCur <= costBase ? 'good' : 'bad',
    },
    {
      label: 'Safety Score',
      baseline: safetyBase,
      current: safetyCur,
      unit: '',
      direction: dir(safetyCur, safetyBase),
      sentiment: safetyCur >= 0.85 ? 'good' : safetyCur >= 0.7 ? 'neutral' : 'bad',
    },
  ];
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function ImpactRow({ impact }: { impact: Impact }) {
  const pctChange = ((impact.current - impact.baseline) / impact.baseline) * 100;
  const arrow = impact.direction === 'up' ? '↑' : impact.direction === 'down' ? '↓' : '→';
  const color =
    impact.sentiment === 'good'
      ? 'text-emerald-200'
      : impact.sentiment === 'bad'
        ? 'text-rose-200'
        : 'text-amber-100';
  const shell =
    impact.sentiment === 'good'
      ? 'border-emerald-300/18 bg-emerald-300/[0.05]'
      : impact.sentiment === 'bad'
        ? 'border-rose-300/18 bg-rose-400/[0.05]'
        : 'border-amber-300/18 bg-amber-300/[0.05]';

  return (
    <div className={`flex items-center justify-between gap-4 rounded-[22px] border px-4 py-4 ${shell}`}>
      <div>
        <div className="text-sm font-semibold text-slate-50">{impact.label}</div>
        <div className="mt-1 text-xs text-slate-400">
          Baseline {impact.baseline.toFixed(impact.unit === 'kW' ? 2 : 1)}
          {impact.unit ? ` ${impact.unit}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {impact.label === 'Safety Score' ? (
          <SafetyBadge score={impact.current} />
        ) : (
          <div className={`text-sm font-semibold ${color}`}>
            {arrow} {Math.abs(pctChange).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

export function WhatIfPage() {
  const [values, setValues] = useState<Record<string, number>>(BASELINE_VALUES);
  const [activeScenario, setActiveScenario] = useState<string>('balanced');
  const [backendNote, setBackendNote] = useState<string | null>(null);

  // Backend validation: call sfQuick to compare local simulation with physics engine
  useEffect(() => {
    let cancelled = false;
    sfQuick({
      material: 'steel',
      operation: 'face',
      tool_diameter_mm: 25,
      doc_mm: values.ap,
      woc_mm: values.ae,
    })
      .then((res) => {
        if (cancelled) return;
        const result = res?.result as Record<string, unknown> | undefined;
        if (result?.Vc_rec) {
          setBackendNote(`Backend recommends Vc=${result.Vc_rec} m/min for this depth/width.`);
        } else {
          setBackendNote(null);
        }
      })
      .catch(() => {
        if (!cancelled) setBackendNote(null);
      });
    return () => { cancelled = true; };
  }, [values.ap, values.ae]);

  const impacts = useMemo(() => computeImpacts(values), [values]);
  const safetyImpact = impacts.find((item) => item.label === 'Safety Score') ?? impacts[0];
  const mrrImpact = impacts.find((item) => item.label === 'Material Removal Rate') ?? impacts[0];
  const costImpact = impacts.find((item) => item.label === 'Cost per Part') ?? impacts[0];

  const baselineDelta = useMemo(() => {
    const changed = PARAMS.filter((param) => values[param.name] !== param.baseline).length;
    return `${changed}/${PARAMS.length}`;
  }, [values]);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((scenario) => scenario.key === activeScenario) ?? CUSTOM_SCENARIO,
    [activeScenario],
  );

  function handleReset() {
    setValues(BASELINE_VALUES);
    setActiveScenario('balanced');
  }

  function applyScenario(scenario: ScenarioPreset) {
    setValues(scenario.values);
    setActiveScenario(scenario.key);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-indigo-300/12 bg-[linear-gradient(135deg,rgba(9,14,25,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(18,17,41,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-indigo-300/16 bg-indigo-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-100">
              Scenario lab
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                What-If Analysis
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Explore how parameter changes shift productivity, power, cost, and safety before anyone edits the program.
                This should feel like a process-engineering lab, not a stack of default sliders.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Active Scenario"
                value={selectedScenario.label}
                hint={selectedScenario.posture}
                accent="from-indigo-400/22 via-indigo-300/8 to-transparent"
              />
              <SummaryTile
                label="Baseline Drift"
                value={baselineDelta}
                hint="Parameters currently offset from the baseline recipe."
                accent="from-sky-400/22 via-sky-300/8 to-transparent"
              />
              <SummaryTile
                label="Safety Posture"
                value={`${(safetyImpact.current * 100).toFixed(0)}%`}
                hint="The faster this drops, the more careful the recovery plan should be."
                accent="from-rose-400/20 via-rose-300/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Scenario brief</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xl font-semibold text-slate-50">{selectedScenario.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedScenario.posture}</div>
              </div>
              {backendNote && (
                <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Backend validation</div>
                  <div className="mt-1 text-sm text-cyan-200/80">{backendNote}</div>
                </div>
              )}
              <div className="rounded-[22px] border border-indigo-300/12 bg-indigo-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100">Tradeoff snapshot</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  MRR is currently {mrrImpact.direction === 'same' ? 'holding near' : mrrImpact.direction === 'up' ? 'above' : 'below'} baseline while cost posture is {costImpact.direction === 'down' ? 'improving' : costImpact.direction === 'up' ? 'getting more expensive' : 'stable'}.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Use case</div>
                  <div className="mt-2 text-sm text-slate-300">Great for pre-run tuning, process reviews, and operator what-if coaching.</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operator note</div>
                  <div className="mt-2 text-sm text-slate-300">If safety drops faster than cycle time improves, the recipe likely isn’t worth the risk.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Scenario presets</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Parameter strategy</div>
              <div className="mt-1 text-sm text-slate-400">
                Start with a preset, then tune the parameters one by one to understand the tradeoffs.
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-indigo-300/22 hover:text-indigo-100"
            >
              Reset to Baseline
            </button>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SCENARIOS.map((scenario) => {
              const active = activeScenario === scenario.key;
              return (
                <button
                  key={scenario.key}
                  type="button"
                  onClick={() => applyScenario(scenario)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ${
                    active
                      ? 'border-indigo-300/24 bg-indigo-300/[0.08] shadow-[0_18px_40px_rgba(129,140,248,0.12)]'
                      : 'border-white/8 bg-white/[0.03] hover:border-indigo-300/18 hover:bg-white/[0.045]'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-50">{scenario.label}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">{scenario.posture}</div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4">
            {PARAMS.map((param) => {
              const current = values[param.name];
              const pct = ((current - param.baseline) / param.baseline) * 100;

              return (
                <div key={param.name} className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <label htmlFor={`wi-${param.name}`} className="text-base font-semibold text-slate-50">
                        {param.label}
                      </label>
                      <div className="mt-1 max-w-3xl text-sm text-slate-400">{param.guidance}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-slate-100">
                      {current}
                      {param.unit ? ` ${param.unit}` : ''}
                      {Math.abs(pct) > 0.5 ? (
                        <span className={`ml-2 text-xs ${pct > 0 ? 'text-amber-200' : 'text-sky-200'}`}>
                          ({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <input
                    id={`wi-${param.name}`}
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={current}
                    onChange={(event) => {
                      setValues((prev) => ({
                        ...prev,
                        [param.name]: parseFloat(event.target.value),
                      }));
                      setActiveScenario('custom');
                    }}
                    className="w-full accent-indigo-300"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{param.min}</span>
                    <span className="font-medium text-indigo-200">baseline: {param.baseline}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Impact analysis</div>
            <div className="mt-2 text-xl font-semibold text-slate-50">Live process response</div>
            <div className="mt-1 text-sm text-slate-400">
              Watch how throughput, tool life, power, cost, and safety move together as the recipe changes.
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <SummaryTile
              label="MRR"
              value={mrrImpact.direction === 'same' ? 'Flat' : mrrImpact.direction === 'up' ? 'Higher' : 'Lower'}
              hint="Material removal rate compared to baseline."
              accent="from-emerald-400/20 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Cost posture"
              value={costImpact.direction === 'down' ? 'Better' : costImpact.direction === 'up' ? 'Higher' : 'Stable'}
              hint="Whether cost per part is drifting favorably."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </div>

          <div className="space-y-3">
            {impacts.map((impact) => (
              <ImpactRow key={impact.label} impact={impact} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
