/**
 * WireEdmCostBreakdownPanel — Wire EDM cost estimation and breakdown.
 * Shows: wire cost, machine time, power, consumables, labor, per-pass progression.
 * Wire: prism_edm:wedm_estimate_cost
 */

import { useState, useCallback } from 'react';

interface PassCost {
  pass: number;
  type: string;
  time_min: number;
  wire_m: number;
  wire_cost_usd: number;
  machine_cost_usd: number;
  cumulative_usd: number;
}

interface CostResult {
  wire_cost_usd: number;
  wire_length_m: number;
  wire_weight_kg: number;
  machine_time_hrs: number;
  machine_cost_usd: number;
  power_cost_usd: number;
  consumables_usd: number;
  labor_cost_usd: number;
  dielectric_cost_usd: number;
  total_per_part_usd: number;
  per_pass: PassCost[];
  breakdown: Array<{ category: string; amount: number; pct: number }>;
  quantity_breaks: Array<{ qty: number; unit_cost: number }>;
}

// Wire cost per meter by type
const WIRE_COST: Record<string, number> = {
  'brass_0.25': 0.02, 'brass_0.20': 0.03, 'brass_0.10': 0.06,
  'coated_0.25': 0.04, 'coated_0.20': 0.05, 'moly_0.18': 0.15,
};

// Wire weight: kg per km by diameter
const WIRE_WEIGHT: Record<number, number> = {
  0.25: 0.35, 0.20: 0.22, 0.10: 0.056, 0.18: 0.23,
};

function estimateCost(
  material: string, thickness_mm: number, profile_length_mm: number,
  wire_type: string, num_passes: number, machine_rate_usd_hr: number,
): CostResult {
  const wire_dia = parseFloat(wire_type.split('_')[1] ?? '0.25') || 0.25;
  const wire_cost_per_m = WIRE_COST[wire_type] ?? 0.03;
  const wire_kg_per_km = WIRE_WEIGHT[wire_dia] ?? 0.35;

  // Cutting speed by pass type (mm/min) — scales inversely with thickness
  const thickness_factor = 25 / Math.max(5, thickness_mm);
  const base_speed = material === 'aluminum' ? 8 : material === 'copper' ? 7 : 4;
  const rough_speed = base_speed * thickness_factor;

  // Wire feed speed (m/min)
  const wire_speed = wire_dia >= 0.25 ? 10 : wire_dia >= 0.20 ? 8 : 5;

  // Per-pass cost progression
  const per_pass: PassCost[] = [];
  let total_time = 0;
  let total_wire = 0;
  let cumulative = 0;

  for (let p = 1; p <= num_passes; p++) {
    const is_rough = p === 1;
    const speed = is_rough ? rough_speed : rough_speed * (1.5 + (p - 2) * 0.3);
    const time_min = profile_length_mm / speed;
    const wire_m = wire_speed * time_min;
    const wire_c = wire_m * wire_cost_per_m;
    const machine_c = (time_min / 60) * machine_rate_usd_hr;
    cumulative += wire_c + machine_c;
    total_time += time_min;
    total_wire += wire_m;

    per_pass.push({
      pass: p,
      type: is_rough ? 'Rough' : `Skim ${p - 1}`,
      time_min, wire_m,
      wire_cost_usd: wire_c,
      machine_cost_usd: machine_c,
      cumulative_usd: cumulative,
    });
  }

  const wire_cost = total_wire * wire_cost_per_m;
  const wire_weight = (total_wire / 1000) * wire_kg_per_km;
  const machine_time_hrs = total_time / 60;
  const machine_cost = machine_time_hrs * machine_rate_usd_hr;

  // Setup time (30 min) + threading per contour
  const setup_cost = (0.5) * machine_rate_usd_hr;

  // Power: ~5 kW average, $0.12/kWh
  const power_cost = machine_time_hrs * 5 * 0.12;

  // Consumables: filters, guides, DI water
  const consumables = machine_time_hrs * 2.5;

  // Dielectric (DI water): $0.50/hr
  const dielectric = machine_time_hrs * 0.5;

  // Labor: assume 20% attendance
  const labor = machine_time_hrs * 0.2 * 35;

  const total = wire_cost + machine_cost + setup_cost + power_cost + consumables + dielectric + labor;

  const breakdown = [
    { category: 'Machine time', amount: machine_cost + setup_cost, pct: 0 },
    { category: 'Wire electrode', amount: wire_cost, pct: 0 },
    { category: 'Power', amount: power_cost, pct: 0 },
    { category: 'Consumables', amount: consumables, pct: 0 },
    { category: 'Dielectric', amount: dielectric, pct: 0 },
    { category: 'Labor', amount: labor, pct: 0 },
  ];
  for (const b of breakdown) b.pct = (b.amount / total) * 100;

  // Quantity breaks: setup amortized
  const quantity_breaks = [1, 5, 10, 25, 50, 100].map(qty => ({
    qty,
    unit_cost: (total - setup_cost) + setup_cost / qty,
  }));

  return {
    wire_cost_usd: wire_cost,
    wire_length_m: total_wire,
    wire_weight_kg: wire_weight,
    machine_time_hrs,
    machine_cost_usd: machine_cost + setup_cost,
    power_cost_usd: power_cost,
    consumables_usd: consumables,
    labor_cost_usd: labor,
    dielectric_cost_usd: dielectric,
    total_per_part_usd: total,
    per_pass,
    breakdown,
    quantity_breaks,
  };
}

// 2026-05-26 (slot golf, tsc-fix): test-only stub exports — buildCostInput / mapCostResponse
// / CostPanelInputs are referenced by WireEdmCostBreakdownPanel.test.tsx but were never
// extracted from the component's inline calculator (~lines 60-141 above). Fail-loud per R12 —
// the test runtime will explicitly throw NOT_IMPLEMENTED, surfacing the helper-extraction debt
// for a future U-WEB-WIREDM-EXTRACT-HELPERS milestone rather than hiding it under tsc errors.
// `any` rather than Record<string,unknown> on purpose — the test file accesses concrete
// fields on these objects (`.thickness`, `.profile_length_mm`, etc.). Tight typing here
// cascaded into +45 TS2339 errors in the test file. Stub intent is "fail at runtime, not at
// type-check"; `any` honors that — tests get type-permissive access AND a thrown stub body.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CostPanelInputs = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCostInput(..._args: any[]): any {
  throw new Error('NOT_IMPLEMENTED: buildCostInput was never extracted from WireEdmCostBreakdownPanel — see U-WEB-WIREDM-EXTRACT-HELPERS');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCostResponse(..._args: any[]): any {
  throw new Error('NOT_IMPLEMENTED: mapCostResponse was never extracted from WireEdmCostBreakdownPanel — see U-WEB-WIREDM-EXTRACT-HELPERS');
}

export function WireEdmCostBreakdownPanel() {
  const [material, setMaterial] = useState('D2');
  const [thickness, setThickness] = useState(25);
  const [profileLength, setProfileLength] = useState(200);
  const [wireType, setWireType] = useState('brass_0.25');
  const [numPasses, setNumPasses] = useState(4);
  const [machineRate, setMachineRate] = useState(85);
  const [result, setResult] = useState<CostResult | null>(null);

  const calculate = useCallback(() => {
    setResult(estimateCost(material, thickness, profileLength, wireType, numPasses, machineRate));
  }, [material, thickness, profileLength, wireType, numPasses, machineRate]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';
  const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1';

  const barColor = (category: string) => {
    if (category === 'Machine time') return 'bg-sky-500';
    if (category === 'Wire electrode') return 'bg-purple-500';
    if (category === 'Power') return 'bg-amber-500';
    if (category === 'Labor') return 'bg-emerald-500';
    return 'bg-zinc-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-emerald-400 font-semibold text-sm">Cost Breakdown</span>
        <span className="text-xs text-zinc-500">Wire + machine + consumables</span>
      </div>
      <div className={sec}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Material</label>
            <select className={inp} value={material} onChange={e => setMaterial(e.target.value)}>
              {['D2', 'M2', 'A2', 'tool steel', 'stainless steel', 'titanium', 'aluminum', 'copper', 'tungsten carbide', 'inconel'].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
          </div>
          <div><label className={lbl}>Thickness (mm)</label>
            <input type="number" className={inp} value={thickness} onChange={e => setThickness(Number(e.target.value))} min={1} max={500} /></div>
          <div><label className={lbl}>Profile length (mm)</label>
            <input type="number" className={inp} value={profileLength} onChange={e => setProfileLength(Number(e.target.value))} min={10} max={5000} /></div>
          <div>
            <label className={lbl}>Wire type</label>
            <select className={inp} value={wireType} onChange={e => setWireType(e.target.value)}>
              <option value="brass_0.25">Brass 0.25mm</option>
              <option value="brass_0.20">Brass 0.20mm</option>
              <option value="brass_0.10">Brass 0.10mm (micro)</option>
              <option value="coated_0.25">Coated 0.25mm</option>
              <option value="coated_0.20">Coated 0.20mm</option>
              <option value="moly_0.18">Moly 0.18mm</option>
            </select>
          </div>
          <div><label className={lbl}>Passes</label>
            <input type="number" className={inp} value={numPasses} onChange={e => setNumPasses(Number(e.target.value))} min={1} max={7} /></div>
          <div className="flex items-end">
            <button onClick={calculate} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium text-white">
              Estimate
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Total cost hero */}
          <div className={`${sec} border-emerald-700/40`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className={lbl}>Total per part</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">${result.total_per_part_usd.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className={lbl}>Machine time</div>
                <div className={val}>{result.machine_time_hrs.toFixed(2)} hrs</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className={lbl}>Wire</div><div className={`${val} text-purple-400`}>${result.wire_cost_usd.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500">{result.wire_length_m.toFixed(0)}m / {result.wire_weight_kg.toFixed(3)}kg</div></div>
              <div><div className={lbl}>Power</div><div className={val}>${result.power_cost_usd.toFixed(2)}</div></div>
              <div><div className={lbl}>Consumables</div><div className={val}>${result.consumables_usd.toFixed(2)}</div></div>
            </div>
          </div>

          {/* Cost breakdown bar chart */}
          <div className={sec}>
            <div className="text-xs text-zinc-400 mb-3 uppercase tracking-wide">Cost Drivers</div>
            {result.breakdown.map(b => (
              <div key={b.category} className="mb-2">
                <div className="flex justify-between text-xs text-zinc-300 mb-1">
                  <span>{b.category}</span>
                  <span className="font-mono">${b.amount.toFixed(2)} ({b.pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(b.category)}`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Per-pass cost table */}
          <div className={sec}>
            <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">Per-Pass Progression</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-700">
                  <th className="text-left py-1">Pass</th>
                  <th className="text-right">Time</th>
                  <th className="text-right">Wire</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {result.per_pass.map(p => (
                  <tr key={p.pass} className="border-b border-zinc-800 text-zinc-300">
                    <td className="py-1">{p.type}</td>
                    <td className="text-right font-mono">{p.time_min.toFixed(1)} min</td>
                    <td className="text-right font-mono">{p.wire_m.toFixed(0)} m</td>
                    <td className="text-right font-mono">${(p.wire_cost_usd + p.machine_cost_usd).toFixed(2)}</td>
                    <td className="text-right font-mono text-emerald-400">${p.cumulative_usd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quantity breaks */}
          <div className={sec}>
            <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">Quantity Pricing</div>
            <div className="flex gap-2 flex-wrap">
              {result.quantity_breaks.map(qb => (
                <div key={qb.qty} className="bg-zinc-800 rounded px-3 py-1.5 text-center">
                  <div className="text-[10px] text-zinc-500">{qb.qty} pc{qb.qty > 1 ? 's' : ''}</div>
                  <div className="text-sm font-mono text-zinc-100">${qb.unit_cost.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
