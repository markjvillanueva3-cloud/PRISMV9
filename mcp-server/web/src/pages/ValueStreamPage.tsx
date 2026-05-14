import { useCallback, useState } from 'react';
import {
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type Tab = 'map' | 'metrics' | 'waste';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  map: {
    label: 'Process Map',
    detail: 'End-to-end value stream from raw material receipt through shipping, with WIP and wait-time visibility.',
  },
  metrics: {
    label: 'Metrics',
    detail: 'Lead time, value-added ratio, takt time, and setup breakdown against production targets.',
  },
  waste: {
    label: 'Waste Analysis',
    detail: 'The seven wastes of lean manufacturing mapped to actual shop-floor observations and countermeasures.',
  },
};

/* ------------------------------------------------------------------ */
/*  Seed data                                                         */
/* ------------------------------------------------------------------ */

interface ProcessStep {
  id: string;
  name: string;
  operator: string;
  actualTime_min: number;
  estimatedTime_min: number;
  wipBetween: number; // WIP count before this step (0 for first)
  waitTime_min: number; // queue / wait time before this step
}

const PROCESS_STEPS: ProcessStep[] = [
  { id: 'raw',        name: 'Raw Material',  operator: 'Receiving',    actualTime_min: 15,  estimatedTime_min: 10,  wipBetween: 0,  waitTime_min: 0 },
  { id: 'setup',      name: 'Setup',         operator: 'J. Martinez', actualTime_min: 45,  estimatedTime_min: 30,  wipBetween: 12, waitTime_min: 120 },
  { id: 'machining',  name: 'Machining',     operator: 'R. Chen',     actualTime_min: 180, estimatedTime_min: 160, wipBetween: 6,  waitTime_min: 90 },
  { id: 'inspection', name: 'Inspection',    operator: 'K. Okafor',   actualTime_min: 30,  estimatedTime_min: 25,  wipBetween: 8,  waitTime_min: 60 },
  { id: 'shipping',   name: 'Shipping',      operator: 'Logistics',   actualTime_min: 20,  estimatedTime_min: 15,  wipBetween: 3,  waitTime_min: 45 },
];

const TOTAL_CYCLE_MIN = PROCESS_STEPS.reduce((s, p) => s + p.actualTime_min, 0);
const TOTAL_WAIT_MIN = PROCESS_STEPS.reduce((s, p) => s + p.waitTime_min, 0);
const TOTAL_LEAD_MIN = TOTAL_CYCLE_MIN + TOTAL_WAIT_MIN;
const VA_RATIO = TOTAL_CYCLE_MIN / TOTAL_LEAD_MIN;
const TAKT_DEMAND_PER_DAY = 12;
const AVAILABLE_MIN_PER_DAY = 480; // single shift
const TAKT_TIME_MIN = AVAILABLE_MIN_PER_DAY / TAKT_DEMAND_PER_DAY;

interface MetricTile {
  label: string;
  value: string;
  target: string;
  ok: boolean;
}

const METRIC_TILES: MetricTile[] = [
  { label: 'Total Lead Time',       value: `${(TOTAL_LEAD_MIN / 60).toFixed(1)} hr`,  target: '< 8.0 hr',  ok: TOTAL_LEAD_MIN / 60 < 8 },
  { label: 'Cycle Time (VA)',       value: `${TOTAL_CYCLE_MIN} min`,                   target: '< 270 min', ok: TOTAL_CYCLE_MIN < 270 },
  { label: 'Wait / Queue Time',     value: `${TOTAL_WAIT_MIN} min`,                    target: '< 180 min', ok: TOTAL_WAIT_MIN < 180 },
  { label: 'Value-Added Ratio',     value: `${(VA_RATIO * 100).toFixed(1)}%`,          target: '> 25%',     ok: VA_RATIO > 0.25 },
  { label: 'Takt Time',             value: `${TAKT_TIME_MIN.toFixed(1)} min`,          target: '--',        ok: true },
  { label: 'Demand / Day',          value: `${TAKT_DEMAND_PER_DAY} parts`,             target: '>= 12',     ok: TAKT_DEMAND_PER_DAY >= 12 },
];

const SETUP_BREAKDOWN = PROCESS_STEPS.map((s) => ({
  name: s.name,
  setup_min: s.actualTime_min - s.estimatedTime_min + Math.round(s.waitTime_min * 0.15),
  cycle_min: s.estimatedTime_min,
}));

interface WasteItem {
  id: number;
  category: string;
  acronym: string;
  instances: string;
  impactMin: number;
  countermeasure: string;
}

const WASTES: WasteItem[] = [
  { id: 1, category: 'Transport',       acronym: 'T', instances: 'Parts moved between buildings for inspection',          impactMin: 35,  countermeasure: 'Co-locate CMM next to machining cell' },
  { id: 2, category: 'Inventory',       acronym: 'I', instances: '12 units queued before setup, 8 before inspection',     impactMin: 120, countermeasure: 'Reduce batch size from 12 to 4; pull-based replenishment' },
  { id: 3, category: 'Motion',          acronym: 'M', instances: 'Operator walks 40 ft to tool crib for each setup',      impactMin: 18,  countermeasure: 'Shadow board at machine with top-10 tools' },
  { id: 4, category: 'Waiting',         acronym: 'W', instances: '90 min queue before machining; 60 min before inspect',  impactMin: 150, countermeasure: 'Single-piece flow with FIFO lane; stagger breaks' },
  { id: 5, category: 'Overproduction',  acronym: 'O', instances: 'Running 15% extra to cover expected scrap',             impactMin: 42,  countermeasure: 'Root-cause scrap; reduce buffer to 5%' },
  { id: 6, category: 'Overprocessing',  acronym: 'P', instances: 'Deburring edges that do not appear on print',           impactMin: 22,  countermeasure: 'Review print requirements; update work instructions' },
  { id: 7, category: 'Defects',         acronym: 'D', instances: '3% first-pass reject rate at inspection',               impactMin: 55,  countermeasure: 'In-process probing after roughing; SPC on critical dims' },
];

const TOTAL_WASTE_MIN = WASTES.reduce((s, w) => s + w.impactMin, 0);

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ValueStreamPage() {
  const [tab, setTab] = useState<Tab>('map');
  const [expandedWaste, setExpandedWaste] = useState<number | null>(null);

  const toggleWaste = useCallback((id: number) => {
    setExpandedWaste((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      {/* Hero */}
      <WorkspaceHero
        eyebrow="Manufacturing Excellence"
        title="Value Stream Map"
        description="Visualize the end-to-end flow from raw material to shipped part, identify non-value-added time, and drive continuous improvement across every operation."
        metrics={
          <>
            <SummaryTile
              label="Lead Time"
              value={`${(TOTAL_LEAD_MIN / 60).toFixed(1)} hr`}
              hint="Order received to first part shipped."
            />
            <SummaryTile
              label="VA Ratio"
              value={`${(VA_RATIO * 100).toFixed(1)}%`}
              hint={VA_RATIO > 0.25 ? 'Above 25% target.' : 'Below 25% target -- improvement needed.'}
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Takt Time"
              value={`${TAKT_TIME_MIN.toFixed(0)} min`}
              hint={`${TAKT_DEMAND_PER_DAY} parts/day demand against ${AVAILABLE_MIN_PER_DAY} min available.`}
              accent="from-amber-400/22 via-amber-300/8 to-transparent"
            />
          </>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, cfg]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {cfg.label}
          </TabButton>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  MAP TAB                                                      */}
      {/* ============================================================ */}
      {tab === 'map' ? (
        <div className="space-y-6">
          <PanelCard title="Process flow" subtitle="Each box is an operation with actual time vs. estimated time and operator. WIP triangles show inventory sitting between steps.">
            {/* Horizontal scroll wrapper for narrow viewports */}
            <div className="overflow-x-auto">
              <div className="flex items-start gap-0 py-2" style={{ minWidth: '900px' }}>
                {PROCESS_STEPS.map((step, idx) => (
                  <div key={step.id} className="flex items-start">
                    {/* WIP indicator between stages */}
                    {idx > 0 && step.wipBetween > 0 ? (
                      <div className="flex flex-col items-center justify-center px-2" style={{ minWidth: '64px' }}>
                        {/* Arrow */}
                        <div className="mb-2 text-lg text-slate-500">&#8594;</div>
                        {/* Triangle + WIP count */}
                        <div className="flex flex-col items-center">
                          <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-amber-400/70" />
                          <div className="mt-1 text-xs font-semibold text-amber-300">{step.wipBetween}</div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">WIP</div>
                        </div>
                        {/* Wait time */}
                        <div className="mt-2 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                          {step.waitTime_min}m wait
                        </div>
                      </div>
                    ) : idx > 0 ? (
                      <div className="flex items-center justify-center px-3">
                        <div className="text-lg text-slate-500">&#8594;</div>
                      </div>
                    ) : null}

                    {/* Process box */}
                    <div className="flex-shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4" style={{ width: '160px' }}>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{`Step ${idx + 1}`}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-50">{step.name}</div>
                      <div className="mt-3 space-y-1 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Actual</span>
                          <span className="font-mono text-slate-200">{step.actualTime_min}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est.</span>
                          <span className="font-mono text-slate-300">{step.estimatedTime_min}m</span>
                        </div>
                        {step.actualTime_min > step.estimatedTime_min ? (
                          <div className="flex justify-between text-rose-300">
                            <span>Delta</span>
                            <span className="font-mono">+{step.actualTime_min - step.estimatedTime_min}m</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 border-t border-white/8 pt-2 text-[11px] text-slate-400">{step.operator}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>

          {/* Timeline summary bar */}
          <PanelCard title="Time composition" subtitle="Visual breakdown of value-added cycle time vs. non-value-added wait time.">
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-cyan-400/60" />
                  <span>Cycle (VA)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-rose-400/60" />
                  <span>Wait (NVA)</span>
                </div>
              </div>
              <div className="flex h-8 overflow-hidden rounded-full">
                <div
                  className="flex items-center justify-center bg-cyan-400/30 text-[10px] font-semibold text-cyan-100"
                  style={{ width: `${(TOTAL_CYCLE_MIN / TOTAL_LEAD_MIN) * 100}%` }}
                >
                  {TOTAL_CYCLE_MIN}m
                </div>
                <div
                  className="flex items-center justify-center bg-rose-400/30 text-[10px] font-semibold text-rose-100"
                  style={{ width: `${(TOTAL_WAIT_MIN / TOTAL_LEAD_MIN) * 100}%` }}
                >
                  {TOTAL_WAIT_MIN}m
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Total lead time: <span className="font-mono text-slate-200">{TOTAL_LEAD_MIN} min</span> ({(TOTAL_LEAD_MIN / 60).toFixed(1)} hr)
              </div>
            </div>
          </PanelCard>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  METRICS TAB                                                  */}
      {/* ============================================================ */}
      {tab === 'metrics' ? (
        <div className="space-y-6">
          <PanelCard title="Key performance metrics" subtitle="Compare actual performance against lean manufacturing targets.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {METRIC_TILES.map((m) => (
                <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{m.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-50">{m.value}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusPill label={m.ok ? 'On target' : 'Below target'} tone={m.ok ? 'emerald' : 'rose'} />
                    <span className="text-xs text-slate-400">Target: {m.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Lead time waterfall" subtitle="Order received to first part shipped, broken into value-added and wait components per operation.">
            <div className="space-y-3">
              {PROCESS_STEPS.map((step) => {
                const totalStep = step.actualTime_min + step.waitTime_min;
                const pctOfLead = (totalStep / TOTAL_LEAD_MIN) * 100;
                const cyclePct = totalStep > 0 ? (step.actualTime_min / totalStep) * 100 : 0;
                return (
                  <div key={step.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{step.name}</span>
                      <span className="font-mono text-slate-400">{totalStep}m ({pctOfLead.toFixed(0)}%)</span>
                    </div>
                    <div className="flex h-5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div className="bg-cyan-400/40" style={{ width: `${cyclePct}%` }} />
                      <div className="bg-rose-400/30" style={{ width: `${100 - cyclePct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </PanelCard>

          <PanelCard title="Setup time breakdown" subtitle="Setup overhead per operation compared to pure cycle time.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">Operation</th>
                    <th className="pb-3 pr-4 font-semibold">Cycle (min)</th>
                    <th className="pb-3 pr-4 font-semibold">Setup overhead (min)</th>
                    <th className="pb-3 font-semibold">Setup %</th>
                  </tr>
                </thead>
                <tbody>
                  {SETUP_BREAKDOWN.map((row) => {
                    const total = row.cycle_min + row.setup_min;
                    const setupPct = total > 0 ? (row.setup_min / total) * 100 : 0;
                    return (
                      <tr key={row.name} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-slate-200">{row.name}</td>
                        <td className="py-3 pr-4 font-mono text-slate-300">{row.cycle_min}</td>
                        <td className="py-3 pr-4 font-mono text-slate-300">{row.setup_min}</td>
                        <td className="py-3">
                          <StatusPill label={`${setupPct.toFixed(0)}%`} tone={setupPct > 30 ? 'rose' : setupPct > 15 ? 'amber' : 'emerald'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  WASTE TAB                                                    */}
      {/* ============================================================ */}
      {tab === 'waste' ? (
        <div className="space-y-6">
          <PanelCard title="Seven wastes of lean manufacturing" subtitle="Identify, quantify, and countermeasure the non-value-added activities found on the shop floor.">
            <div className="mb-4 flex items-center gap-4 text-xs text-slate-400">
              <span>Total waste impact: <span className="font-mono font-semibold text-rose-300">{TOTAL_WASTE_MIN} min</span></span>
              <span>({((TOTAL_WASTE_MIN / TOTAL_LEAD_MIN) * 100).toFixed(0)}% of lead time)</span>
            </div>

            <div className="space-y-3">
              {WASTES.map((w) => {
                const isExpanded = expandedWaste === w.id;
                const pctOfTotal = (w.impactMin / TOTAL_WASTE_MIN) * 100;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWaste(w.id)}
                    className="w-full text-left"
                  >
                    <div className={`rounded-2xl border px-4 py-4 transition ${isExpanded ? 'border-rose-300/20 bg-rose-400/[0.06]' : 'border-white/8 bg-white/[0.03] hover:border-white/14'}`}>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-400/12 text-xs font-bold text-rose-200">
                            {w.acronym}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{w.id}. {w.category}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{w.instances}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-sm font-semibold text-rose-300">{w.impactMin} min</span>
                          <span className="text-[10px] text-slate-500">{pctOfTotal.toFixed(0)}% of waste</span>
                        </div>
                      </div>

                      {/* Impact bar */}
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-2 rounded-full bg-rose-400/50" style={{ width: `${pctOfTotal}%` }} />
                      </div>

                      {/* Expanded countermeasure */}
                      {isExpanded ? (
                        <div className="mt-4 rounded-xl border border-emerald-300/16 bg-emerald-300/[0.05] px-4 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Suggested countermeasure</div>
                          <div className="mt-1 text-sm text-emerald-100">{w.countermeasure}</div>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </PanelCard>

          {/* NVA highlight summary */}
          <PanelCard title="Non-value-added time summary" subtitle="Aggregate view of time that does not transform the part. Highlighted in rose.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.06] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">Total NVA</div>
                <div className="mt-2 text-2xl font-semibold text-rose-100">{TOTAL_WAIT_MIN + TOTAL_WASTE_MIN} min</div>
                <div className="mt-1 text-xs text-rose-200/60">Wait + waste combined</div>
              </div>
              <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.06] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">Wait Time</div>
                <div className="mt-2 text-2xl font-semibold text-rose-100">{TOTAL_WAIT_MIN} min</div>
                <div className="mt-1 text-xs text-rose-200/60">Queue between operations</div>
              </div>
              <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.06] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">Waste Impact</div>
                <div className="mt-2 text-2xl font-semibold text-rose-100">{TOTAL_WASTE_MIN} min</div>
                <div className="mt-1 text-xs text-rose-200/60">Across 7 categories</div>
              </div>
              <div className="rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">Value-Added</div>
                <div className="mt-2 text-2xl font-semibold text-cyan-100">{TOTAL_CYCLE_MIN} min</div>
                <div className="mt-1 text-xs text-cyan-200/60">Transforms the part</div>
              </div>
            </div>
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}
